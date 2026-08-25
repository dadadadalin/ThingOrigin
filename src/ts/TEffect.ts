/**
 * @module
 * @mergeModuleWith <project>
 */

import {
    AdditiveBlending,
    Box3,
    Color,
    DoubleSide,
    Group,
    Layers,
    Mesh,
    Object3D,
    Plane,
    PointLight,
    Sprite,
    Vector2,
    Vector3,
    WebGLRenderTarget,
    HalfFloatType,
    LinearSRGBColorSpace
} from 'three'
import { float, vec3, vec4, Fn, uv, time, mix, smoothstep, length, sin } from 'three/tsl'
import { SpriteNodeMaterial, ClippingGroup } from 'three/webgpu'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass'
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { ThingOrigin } from '../ThingOrigin'

type OutlineHandle = {
    selectedObjects: Object3D[]
    edgeStrength: number
    edgeGlow: number
    edgeThickness: number
    pulsePeriod: number
    usePatternTexture: boolean
    visibleEdgeColor: Color
    hiddenEdgeColor: Color
    setSize?: (w: number, h: number) => void
}

type BreathEntry = {
    /** 该组的呼吸颜色 */
    color: Color
    meshes: {
        mesh: Mesh
        origMats: any[]
        cloneMats: any[]
        /** 每个材质的原始 emissive 颜色（无则 null） */
        origEmissive: (Color | null)[]
        /** 每个材质的原始 emissiveIntensity */
        origEmissiveIntensity: number[]
    }[]
}

/** 交替呼吸任务（运行时） */
type BreathTask = {
    models: Object3D[]
    color: Color
    /** 单次持续秒数；Infinity 表示常驻不切换 */
    duration: number
}

/** 并发呼吸运行时组：独占一个描边槽位，各自独立颜色与倒计时 */
type BreathGroup = {
    models: Object3D[]
    color: Color
    duration: number
    /** 占用的描边槽位索引；-1 表示未申请到 */
    slot: number
    /** 克隆后的呼吸材质条目 */
    entry: BreathEntry
    /** 呼吸脉动累计时间 */
    elapsed: number
    /** 持续时长倒计时 */
    timer: number
}

/** 呼吸输入项（每个任务 = 单个模型，独立颜色与时长） */
/**
 * @group Interfaces
 */
export interface AlternatingBreathTask {
    /** 模型名 */
    modelName: string
    /** 呼吸颜色，如 'red' / '#00ff00' */
    color: string
    /** 该模型持续呼吸的秒数；不传或 <=0 表示常驻闪烁直到取消 */
    duration?: number
}

/**
 * @group Interfaces
 */
export interface FireOptions {
    position?: Vector3 | { x: number; y: number; z: number }
    /** 火焰高度，默认 6 */
    height?: number
    /** 底部半径，默认 2.2 */
    radius?: number
    /** 火焰粒子层数，默认 28 */
    particleCount?: number
    /** 火焰主色，如 '#ff7700'（默认橙红） */
    color?: string
    /** 火焰强度，默认 1，影响粒子亮度与点光源 */
    intensity?: number
}

/**
 * 效果（WebGL 后处理 + WebGPU 场景特效）
 */
export class TEffect {
    private TO: ThingOrigin

    /** 火焰粒子组 */
    public fireGroup: Group | null = null

    private renderTarget: WebGLRenderTarget | null = null

    /**
     * 渲染通道
     */
    public renderPass: RenderPass | null = null

    /**
     * 效果合成器
     */
    public effectComposer: EffectComposer | null = null

    public bloomComposer: EffectComposer | null = null

    public finalComposer: EffectComposer | null = null

    /**
     * 描边槽位池（WebGL 为 OutlinePass；WebGPU 为占位句柄，实际由 TWebGPU 槽位渲染）
     * 每个并发呼吸组独占一个槽，各自独立颜色
     */
    public outlinePasses: (OutlinePass | OutlineHandle)[]

    /** 兼容旧代码：返回首个描边槽位 */
    public get outlinePass(): OutlinePass | OutlineHandle {
        return this.outlinePasses[0]
    }

    /** 默认并发描边槽位上限（可被 sceneData.effectComposer.outlinePass.maxOutlineSlots 覆盖） */
    private static DEFAULT_MAX_SLOTS = 8
    /** 实际并发描边槽位上限（构造时从 sceneData 读取） */
    private maxSlots: number = TEffect.DEFAULT_MAX_SLOTS

    /** 呼吸运行时模式 */
    private breathMode: 'sequential' | 'concurrent' | 'none' = 'none'
    /** 当前并发激活的呼吸组（sequential 模式下恒为 1 个） */
    private breathGroups: BreathGroup[] = []
    /** sequential 模式专用：任务队列与索引 */
    private breathQueue: BreathTask[] = []
    private breathSeqIdx: number = 0
    /** 呼吸参数默认值（可被 sceneData.effectComposer.outlinePass 覆盖） */
    private static BREATH_DEFAULTS = {
        breathSpeed: 4.0,
        emissiveMin: 0.0,
        emissiveMax: 0.2,
        edgeMinRatio: 0.1,
        edgeMaxRatio: 0.28,
        emissiveColorMix: 0.35
    }

    /** 读取呼吸配置（sceneParams.outlinePass + 默认值） */
    private getBreathCfg() {
        const cfg = this.TO.sceneData?.effectComposer?.outlinePass ?? {}
        const d = TEffect.BREATH_DEFAULTS
        return {
            breathSpeed: cfg.breathSpeed ?? d.breathSpeed,
            emissiveMin: cfg.emissiveMin ?? d.emissiveMin,
            emissiveMax: cfg.emissiveMax ?? d.emissiveMax,
            edgeMinRatio: cfg.edgeMinRatio ?? d.edgeMinRatio,
            edgeMaxRatio: cfg.edgeMaxRatio ?? d.edgeMaxRatio,
            emissiveColorMix: cfg.emissiveColorMix ?? d.emissiveColorMix
        }
    }

    /**
     * 着色器通道
     */
    public effectFXAA: ShaderPass | null = null

    public colorCorrectionPass: ShaderPass | null = null

    /**
     * 虚幻引擎风格泛光通道
     */
    public bloomPass: UnrealBloomPass | null = null

    /**
     * 输出通道
     */
    public outputPass: OutputPass | null = null

    /** 图层系统 */
    public bloomLayer: Layers

    /** 剖切平面（场景级全局） */
    public sceneClipPlane: Plane | null = null

    /** WebGPU 场景级剖切用的 ClippingGroup（r185 WebGPU 忽略 renderer.clippingPlanes，必须用 ClippingGroup） */
    private sceneClipGroup: ClippingGroup | null = null
    /** 被 sceneClipGroup 收纳的子对象原父级，用于 deleteSceneClip 时还原场景图 */
    private sceneClipOrigParents = new Map<Object3D, Object3D | null>()

    /** 每个根模型独立的剖切平面数组，支持多模型并发剖切 */
    private modelClipPlaneMap = new Map<
        Object3D,
        { planes: Plane[]; group?: ClippingGroup | null; origParent?: Object3D | null }
    >()

    static BLOOM_SCENE = 1

    /** 动态读取渲染器模式，避免构造期取到过期值 */
    private get isWebGPU(): boolean {
        return !!this.TO.renderer?.isWebGPU
    }

    /**
     * 获取当前渲染器（兼容 WebGL / WebGPU），用于设置 clippingPlanes / localClippingEnabled
     * WebGPU 模式下 webglRenderer 为 null，需改用统一的 renderer 引用
     */
    private get clipRenderer(): any {
        return this.TO.renderer?.renderer ?? null
    }

    constructor(TO: ThingOrigin) {
        this.TO = TO
        this.maxSlots =
            TO.sceneData?.effectComposer?.outlinePass?.maxOutlineSlots ?? TEffect.DEFAULT_MAX_SLOTS
        this.outlinePasses = []
        for (let i = 0; i < this.maxSlots; i++) {
            this.outlinePasses.push(this.createOutlineHandle())
        }
    }

    /**
     * 创建 Outline 占位句柄，从 sceneData 读取描边参数
     * @returns 占位句柄
     */
    private createOutlineHandle(): OutlineHandle {
        const cfg = this.TO.sceneData.effectComposer.outlinePass
        const handle: OutlineHandle = {
            selectedObjects: [],
            edgeStrength: cfg.edgeStrength,
            edgeGlow: cfg.edgeGlow,
            edgeThickness: cfg.edgeThickness,
            pulsePeriod: cfg.pulsePeriod,
            usePatternTexture: cfg.usePatternTexture,
            visibleEdgeColor: new Color(cfg.visibleEdgeColor),
            hiddenEdgeColor: new Color(cfg.hiddenEdgeColor),
            setSize: () => {}
        }
        return handle
    }

    /**
     * 将占位句柄中的描边参数同步到 TWebGPU 所有槽位的 uniform（WebGPU 模式专用）
     */
    private syncOutlineParams() {
        if (!this.TO.webgpu) return
        const handle = this.outlinePasses[0] as OutlineHandle
        const count = this.TO.webgpu.outlineSlotCount
        for (let i = 0; i < count; i++) {
            this.TO.webgpu.setOutlineParams(i, {
                edgeStrength: handle.edgeStrength,
                edgeGlow: handle.edgeGlow,
                edgeThickness: handle.edgeThickness,
                pulsePeriod: handle.pulsePeriod,
                visibleEdgeColor: handle.visibleEdgeColor,
                hiddenEdgeColor: handle.hiddenEdgeColor
            })
        }
    }

    /**
     * 每帧驱动呼吸动画（由 ThingOrigin.update 调用）
     *  - concurrent：所有组并发呼吸，各自独立倒计时，到期单独停止
     *  - sequential：同一时刻仅一组激活，到期后切换到队列下一项
     *  每组 emissiveIntensity 在 MIN~MAX 之间 sin 脉动，对应槽位 edgeStrength 同相位脉动
     * @param delta 帧间隔时间（秒）
     */
    public updateBreath(delta: number) {
        if (this.breathGroups.length === 0) return

        if (this.breathMode === 'concurrent') {
            for (let i = this.breathGroups.length - 1; i >= 0; i--) {
                const g = this.breathGroups[i]
                g.elapsed += delta
                g.timer += delta
                if (Number.isFinite(g.duration) && g.timer >= g.duration) {
                    this.disposeGroup(g)
                    this.breathGroups.splice(i, 1)
                    continue
                }
                this.pulseGroup(g)
            }
        } else if (this.breathMode === 'sequential') {
            const g = this.breathGroups[0]
            if (g) {
                g.elapsed += delta
                g.timer += delta
                const cur = this.breathQueue[this.breathSeqIdx]
                if (cur && Number.isFinite(cur.duration) && g.timer >= cur.duration) {
                    // 切换到队列下一项
                    this.disposeGroup(g)
                    this.breathGroups.length = 0
                    this.breathSeqIdx = (this.breathSeqIdx + 1) % this.breathQueue.length
                    const ng = this.buildGroup(this.breathQueue[this.breathSeqIdx])
                    if (ng) this.breathGroups.push(ng)
                } else {
                    this.pulseGroup(g)
                }
            }
        }
    }

    /**
     * 对单个呼吸组施加 sin 脉动（emissive + 描边 edgeStrength）
     * @param g 呼吸组
     */
    private pulseGroup(g: BreathGroup) {
        const cfg = this.getBreathCfg()
        const breath = 0.5 + 0.5 * Math.sin(g.elapsed * cfg.breathSpeed)
        this.applyEmissiveIntensity(g.entry, breath)
        const ratio = cfg.edgeMinRatio + breath * (cfg.edgeMaxRatio - cfg.edgeMinRatio)
        this.applyEdgeStrengthSlot(g.slot, ratio)
    }

    /**
     * 由任务构造一个呼吸组：申请槽位、克隆材质设 emissive、设置槽位选中对象与颜色
     * @param task 呼吸任务
     * @returns 呼吸组；槽位申请失败返回 null
     */
    private buildGroup(task: BreathTask): BreathGroup | null {
        const slot = this.claimSlot()
        if (slot < 0) {
            console.warn('呼吸效果：描边槽位已满，跳过该组')
            return null
        }
        const entries: BreathEntry['meshes'] = []
        for (const m of task.models) {
            const e = this.setupEmissive(m, task.color)
            entries.push(...e.meshes)
        }
        const entry: BreathEntry = { color: task.color, meshes: entries }
        // 描边使用满色，不再预乘透明度；hiddenEdgeColor 用同色暗调
        const edgeColor = task.color.clone()
        const hiddenColor = task.color.clone().multiplyScalar(0.35)
        if (this.isWebGPU) {
            this.TO.webgpu?.setOutlineObjects(slot, task.models)
            this.TO.webgpu?.setOutlineParams(slot, {
                visibleEdgeColor: edgeColor,
                hiddenEdgeColor: hiddenColor
            })
        } else {
            const pass = this.outlinePasses[slot]
            if (pass instanceof OutlinePass) {
                pass.selectedObjects = [...task.models]
                pass.visibleEdgeColor.copy(edgeColor)
                pass.hiddenEdgeColor.copy(hiddenColor)
            }
        }
        return {
            models: task.models,
            color: task.color,
            duration: task.duration,
            slot,
            entry,
            elapsed: 0,
            timer: 0
        }
    }

    /**
     * 释放呼吸组：还原材质、释放描边槽位
     * @param g 呼吸组
     */
    private disposeGroup(g: BreathGroup) {
        this.restoreEmissive(g.entry)
        if (this.isWebGPU) {
            this.TO.webgpu?.setOutlineObjects(g.slot, [])
        } else {
            const pass = this.outlinePasses[g.slot]
            if (pass instanceof OutlinePass) pass.selectedObjects = []
            else (pass as OutlineHandle).selectedObjects = []
        }
    }

    /**
     * 申请一个空闲描边槽位
     * @returns 槽位索引；无空闲返回 -1
     */
    private claimSlot(): number {
        if (this.isWebGPU) return this.TO.webgpu?.claimOutlineSlot() ?? -1
        for (let i = 0; i < this.outlinePasses.length; i++) {
            const p = this.outlinePasses[i]
            const objs = p instanceof OutlinePass ? p.selectedObjects : (p as OutlineHandle).selectedObjects
            if (!objs || objs.length === 0) return i
        }
        return -1
    }

    /**
     * 批量更新呼吸材质的 emissive：在原始 emissive 与呼吸色之间过渡
     * t=0（谷底）保留模型原色不发光；t=1（峰值）完全叠加呼吸色发光
     * @param entry 呼吸材质条目
     * @param t 呼吸比例（0~1）
     */
    private applyEmissiveIntensity(entry: BreathEntry, t: number) {
        const cfg = this.getBreathCfg()
        const intensity = cfg.emissiveMin + t * (cfg.emissiveMax - cfg.emissiveMin)
        const colorMix = t * cfg.emissiveColorMix
        for (const m of entry.meshes) {
            for (let i = 0; i < m.cloneMats.length; i++) {
                const mat = m.cloneMats[i]
                if (!mat || !('emissive' in mat)) continue
                const origE = m.origEmissive[i]
                if (origE) {
                    mat.emissive.copy(origE).lerp(entry.color, colorMix)
                } else {
                    mat.emissive.copy(entry.color).multiplyScalar(colorMix)
                }
                mat.emissiveIntensity = intensity
            }
        }
    }

    /**
     * 按呼吸比例更新指定槽位描边 edgeStrength
     * 始终从 sceneData 读取基准值，避免每帧覆写后基准漂移导致强度不断衰减
     * @param slot 描边槽位索引
     * @param ratio 呼吸比例（0~1）
     */
    private applyEdgeStrengthSlot(slot: number, ratio: number) {
        const cfg = this.TO.sceneData.effectComposer.outlinePass
        const base = cfg.edgeStrength || 3
        const val = base * ratio
        if (this.isWebGPU) {
            this.TO.webgpu?.setOutlineParams(slot, { edgeStrength: val })
        } else {
            const pass = this.outlinePasses[slot]
            if (pass instanceof OutlinePass) pass.edgeStrength = val
        }
    }

    /**
     * 给模型材质设置 emissive 并记录原始值。
     * 关键：克隆材质后再改 emissive，避免 clone 出来的模型共享同一材质实例导致串色。
     * 记录每个材质原始 emissive / emissiveIntensity，用于呼吸时在原色与呼吸色之间做透明度过渡，
     * 使模型保留自身颜色、仅叠加一层呼吸色发光，观感更高级。
     * @param model 目标模型
     * @param emissiveColor 呼吸发光颜色
     * @returns 呼吸材质条目（含原始材质、克隆材质与原始 emissive 信息）
     */
    private setupEmissive(model: Object3D, emissiveColor: Color): BreathEntry {
        const meshes: BreathEntry['meshes'] = []
        model.traverse((child: any) => {
            if (child.isMesh !== true) return
            const origMats = Array.isArray(child.material) ? [...child.material] : [child.material]
            const cloneMats: any[] = []
            const newMats: any[] = []
            const origEmissive: (Color | null)[] = []
            const origEmissiveIntensity: number[] = []
            for (const mat of origMats) {
                if (!mat || typeof mat !== 'object') {
                    cloneMats.push(null)
                    newMats.push(mat)
                    origEmissive.push(null)
                    origEmissiveIntensity.push(0)
                    continue
                }
                const clone = mat.clone()
                if ('emissive' in clone) {
                    origEmissive.push(clone.emissive.clone())
                    origEmissiveIntensity.push(clone.emissiveIntensity ?? 0)
                    // 初始处于呼吸谷底：保留原色，不发光
                    clone.emissiveIntensity = this.getBreathCfg().emissiveMin
                } else {
                    origEmissive.push(null)
                    origEmissiveIntensity.push(0)
                }
                cloneMats.push(clone)
                newMats.push(clone)
            }
            child.material = Array.isArray(child.material) ? newMats : newMats[0]
            meshes.push({ mesh: child, origMats, cloneMats, origEmissive, origEmissiveIntensity })
        })
        return { color: emissiveColor, meshes }
    }

    /**
     * 还原材质：把 mesh 的材质换回原始引用，并释放克隆材质
     * @param entry 呼吸材质条目
     */
    private restoreEmissive(entry: BreathEntry) {
        for (const m of entry.meshes) {
            m.mesh.material = Array.isArray(m.mesh.material) ? [...m.origMats] : m.origMats[0]
            for (const clone of m.cloneMats) {
                clone?.dispose?.()
            }
        }
    }

    /**
     * 初始化场景效果合成器
     * 根据渲染器类型（WebGL / WebGPU）分别构建不同的后处理管线：
     *  - WebGL：EffectComposer + OutlinePass + FXAA + UnrealBloomPass + OutputPass
     *  - WebGPU：同步 Bloom/Outline 参数到 TWebGPU 并重建 TSL RenderPipeline
     */
    public initEffect() {
        // 保存各槽位之前选中的物体
        const prevSel: Object3D[][] = this.outlinePasses.map((p) => {
            const objs = p instanceof OutlinePass ? p.selectedObjects : (p as OutlineHandle).selectedObjects
            return [...(objs || [])]
        })

        if (this.isWebGPU) {
            const bloomCfg = this.TO.sceneData.effectComposer.bloomPass
            if (bloomCfg) {
                const webgpu = this.TO.sceneData.renderQuality.webgpu || {}
                if (!webgpu.bloom) webgpu.bloom = {}
                const wgpuBloom = webgpu.bloom
                wgpuBloom.active = true
                wgpuBloom.strength = bloomCfg.strength ?? 0.4
                wgpuBloom.radius = bloomCfg.radius ?? 0.4
                wgpuBloom.threshold = bloomCfg.threshold ?? 0.98
                this.TO.sceneData.renderQuality.webgpu = webgpu
            }

            this.syncOutlineParams()
            if (this.TO.webgpu) this.TO.webgpu.buildRenderPipeline()

            // 恢复各槽位选中对象
            for (let i = 0; i < this.outlinePasses.length; i++) {
                ;(this.outlinePasses[i] as OutlineHandle).selectedObjects = prevSel[i]
                this.TO.webgpu?.setOutlineObjects(i, prevSel[i])
            }

            this.renderTarget = null
            this.renderPass = null
            this.effectComposer = null
            this.bloomComposer = null
            this.finalComposer = null
            this.effectFXAA = null
            this.colorCorrectionPass = null
            this.bloomPass = null
            this.outputPass = null
            console.log('[TEffect] WebGPU 模式：已同步 Bloom/Outline 参数并重建 RenderPipeline')
            return
        }

        // ----- WebGL 模式：原有 EffectComposer 流程 -----
        this.renderTarget = new WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            type: HalfFloatType,
            colorSpace: LinearSRGBColorSpace,
            depthBuffer: true,
            stencilBuffer: false
        })
        this.effectComposer = new EffectComposer(this.TO.renderer.webglRenderer!, this.renderTarget)
        this.effectComposer.setSize(this.TO.container.clientWidth, this.TO.container.clientHeight)

        this.renderPass = new RenderPass(this.TO.scene, this.TO.camera.camera)
        this.effectComposer.addPass(this.renderPass)

        // FXAA
        this.effectFXAA = new ShaderPass(FXAAShader)
        this.effectFXAA.uniforms['resolution'].value.set(
            1 / this.TO.container.clientWidth,
            1 / this.TO.container.clientHeight
        )
        this.effectFXAA.needsSwap = true
        this.effectComposer.addPass(this.effectFXAA)

        // BloomPass
        this.bloomPass = new UnrealBloomPass(
            new Vector2(this.TO.container.clientWidth, this.TO.container.clientHeight),
            0.1,
            0.1,
            0.98
        )
        const bloomCfg = this.TO.sceneData.effectComposer.bloomPass
        this.bloomPass.threshold = bloomCfg.threshold
        this.bloomPass.strength = bloomCfg.strength
        this.bloomPass.radius = bloomCfg.radius
        this.effectComposer.addPass(this.bloomPass)

        // OutputPass（r185 线性工作流：统一应用 toneMapping + sRGB 转换）
        this.outputPass = new OutputPass()
        this.effectComposer.addPass(this.outputPass)

        // OutlinePass 槽位池（支持多组并发、各自独立颜色）
        // 放在 OutputPass 之后：描边在显示空间（已 tone map、已 sRGB 编码）叠加，
        // 不再被 ACES 压暗，观感与升级前 sRGB 管线一致；线性工作流仍留给 Bloom 使用
        const cfgY = this.TO.sceneData.effectComposer.outlinePass
        for (let i = 0; i < this.outlinePasses.length; i++) {
            const pass = new OutlinePass(
                new Vector2(this.TO.container.clientWidth, this.TO.container.clientHeight),
                this.TO.scene,
                this.TO.camera.camera
            )
            pass.edgeStrength = cfgY.edgeStrength
            pass.edgeGlow = cfgY.edgeGlow
            pass.edgeThickness = cfgY.edgeThickness
            pass.pulsePeriod = cfgY.pulsePeriod
            pass.usePatternTexture = cfgY.usePatternTexture
            pass.visibleEdgeColor.set(cfgY.visibleEdgeColor)
            pass.hiddenEdgeColor.set(cfgY.hiddenEdgeColor)
            pass.selectedObjects = prevSel[i]
            this.outlinePasses[i] = pass
            this.effectComposer.addPass(pass)
        }

        // 为了保持接口兼容性，设置其他合成器但不使用
        this.bloomComposer = this.effectComposer
        this.finalComposer = this.effectComposer

        console.log('[TEffect] WebGL 模式：EffectComposer 初始化完成')
    }

    /**
     * 设置渲染尺寸（窗口大小变化时调用）
     * @param width 宽度
     * @param height 高度
     */
    public setSize(width: number, height: number) {
        if (this.isWebGPU) {
            this.TO.webgpu?.setSizeOutline(width, height)
            return
        }
        if (this.effectComposer) {
            this.effectComposer.setSize(width, height)
        }
        if (this.renderTarget) {
            this.renderTarget.setSize(width, height)
        }
        // 更新 FXAA 分辨率
        if (this.effectFXAA) {
            this.effectFXAA.uniforms['resolution'].value.set(1 / width, 1 / height)
        }
        // 更新所有 OutlinePass 槽位尺寸
        for (const pass of this.outlinePasses) {
            if (pass instanceof OutlinePass && pass.setSize) pass.setSize(width, height)
        }
        // 更新 BloomPass 尺寸
        if (this.bloomPass && this.bloomPass.setSize) {
            this.bloomPass.setSize(width, height)
        }
    }

    /**
     * 创建场景级剖切平面
     * WebGL：renderer.clippingPlanes 全局剖切
     * WebGPU：r185 起 WebGPU 忽略 renderer.clippingPlanes，改用 ClippingGroup 包裹场景内容实现全局剖切
     * @param axis 剖切轴向 'x' | 'y' | 'z'
     * @param constant 剖切面距原点的距离
     */
    public initSceneClip(axis: 'x' | 'y' | 'z', constant: number) {
        const vec3: Vector3 = this.TO.tool.initVector3ByAxis(axis, 1)
        if (this.isWebGPU) {
            if (this.sceneClipGroup && this.sceneClipPlane) {
                // 复用：原地更新法向与距离
                this.sceneClipPlane.normal.copy(vec3)
                this.sceneClipPlane.constant = constant
                return
            }
            this.sceneClipPlane = new Plane(vec3, constant)
            const group = new ClippingGroup()
            group.enabled = true
            group.clippingPlanes = [this.sceneClipPlane]
            this.TO.scene.add(group)
            // 把场景中非灯光/相机的顶层对象移入 ClippingGroup（保持世界变换），使其受全局剖切
            const movers = this.TO.scene.children.filter(
                (c) => c !== group && !(c as any).isLight && !(c as any).isCamera
            )
            for (const child of movers) {
                this.sceneClipOrigParents.set(child, child.parent)
                group.attach(child)
            }
            this.sceneClipGroup = group
        } else {
            this.sceneClipPlane = new Plane(vec3, constant)
            if (this.clipRenderer) this.clipRenderer.clippingPlanes = [this.sceneClipPlane]
        }
    }

    /**
     * 更新场景剖切面的位置
     * @param constant 剖切面距原点的新距离
     */
    public updateSceneClip(constant: number) {
        if (this.sceneClipPlane) {
            this.sceneClipPlane.constant = constant
        }
    }

    /**
     * 删除场景剖切面
     */
    public deleteSceneClip() {
        this.sceneClipPlane = null
        if (this.sceneClipGroup) {
            // 还原被收纳的子对象到原父级（保持世界变换）
            for (const [child, parent] of this.sceneClipOrigParents) {
                if (parent) parent.attach(child)
            }
            this.sceneClipOrigParents.clear()
            this.TO.scene.remove(this.sceneClipGroup)
            this.sceneClipGroup = null
        }
        if (this.clipRenderer && !this.isWebGPU) {
            this.clipRenderer.clippingPlanes = []
        }
    }

    /**
     * 对指定模型进行剖切
     * WebGL：材质级 clippingPlanes + renderer.localClippingEnabled
     * WebGPU：ClippingGroup 场景图级剖切（r185 起 WebGPU 忽略 material.clippingPlanes）
     * 若该模型已在剖切中，则直接复用已有 plane 数组原地更新 normal/constant，
     * @param model 目标模型
     * @param options 剖切配置数组，每项含 axis 和 constant
     */
    public initModelClip(model: Object3D, options: any) {
        if (!model) {
            console.warn('剖切失败，物体不存在')
            return
        }
        if (!Array.isArray(options) || options.length === 0) {
            console.warn('剖切失败，options 需为非空数组')
            return
        }

        // 已在剖切中：复用已有 plane 数组原地更新，避免重建 ClippingGroup / 重新 attach
        const existing = this.modelClipPlaneMap.get(model)
        if (existing && existing.planes.length === options.length) {
            options.forEach((option: any, i: number) => {
                const vec3: Vector3 = this.TO.tool.initVector3ByAxis(option.axis, -1)
                existing.planes[i].normal.copy(vec3)
                existing.planes[i].constant = option.constant
            })
            return
        }

        // 首次剖切或 plane 数量变化：清理旧状态再重建
        if (existing) this.deleteModelClip(model)

        const planes: Plane[] = []
        options.forEach((option: any) => {
            const vec3: Vector3 = this.TO.tool.initVector3ByAxis(option.axis, -1)
            planes.push(new Plane(vec3, option.constant))
        })

        if (this.isWebGPU) {
            // WebGPU：用 ClippingGroup 包裹模型，所有后代自动剖切
            const group = new ClippingGroup()
            group.clippingPlanes = planes
            group.enabled = true
            const origParent = model.parent
            this.TO.scene.add(group)
            group.attach(model)
            this.modelClipPlaneMap.set(model, { planes, group, origParent })
        } else {
            // WebGL：材质级剖切
            this.modelClipPlaneMap.set(model, { planes })
            if (this.clipRenderer) this.clipRenderer.localClippingEnabled = true
            model.traverse((child: any) => {
                if (child.type === 'Mesh' && child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material]
                    for (const mat of mats) {
                        if (mat && typeof mat === 'object') {
                            mat.clippingPlanes = planes
                            mat.clipShadows = true
                            mat.shadowSide = DoubleSide
                        }
                    }
                    child.castShadow = true
                    child.renderOrder = 6
                }
            })
        }
    }

    /**
     * 更新指定模型剖切面的 constant
     * @param model 目标模型
     * @param constant 剖切面距原点的新距离
     * @param planeIndex 剖切面索引，默认 0
     */
    public updateModelClip(model: Object3D, constant: number, planeIndex: number = 0) {
        const entry = this.modelClipPlaneMap.get(model)
        if (!entry?.planes?.length || planeIndex < 0 || planeIndex >= entry.planes.length) {
            console.warn('updateModelClip：该模型未剖切或 planeIndex 越界')
            return
        }
        entry.planes[planeIndex].constant = constant
    }

    /**
     * 取消模型剖切
     * @param model 目标模型；不传则取消所有模型的剖切
     */
    public deleteModelClip(model?: Object3D) {
        const clearMeshMaterials = (root: Object3D) => {
            root.traverse((child: any) => {
                if (child.type !== 'Mesh' || !child.material) return
                const mats = Array.isArray(child.material) ? child.material : [child.material]
                for (const mat of mats) {
                    if (mat && typeof mat === 'object') {
                        mat.clippingPlanes = null
                        mat.clipShadows = false
                    }
                }
            })
        }
        const restore = (
            m: Object3D,
            e: { planes: Plane[]; group?: ClippingGroup | null; origParent?: Object3D | null }
        ) => {
            if (e.group) {
                // WebGPU：还原模型到原父级（保持世界变换），移除 ClippingGroup
                if (e.origParent) e.origParent.attach(m)
                this.TO.scene.remove(e.group)
            } else {
                clearMeshMaterials(m)
            }
        }
        if (model) {
            const entry = this.modelClipPlaneMap.get(model)
            if (entry) restore(model, entry)
            this.modelClipPlaneMap.delete(model)
        } else {
            for (const [m, e] of this.modelClipPlaneMap) restore(m, e)
            this.modelClipPlaneMap.clear()
        }
        if (this.clipRenderer && !this.isWebGPU) {
            this.clipRenderer.localClippingEnabled = this.modelClipPlaneMap.size > 0
        }
    }

    /** 默认描边颜色（取自 sceneData.outlinePass.visibleEdgeColor） */
    private defaultOutlineColor(): Color {
        return (this.outlinePasses[0] as OutlineHandle).visibleEdgeColor.clone()
    }

    /**
     * 给模型添加呼吸效果（默认黄色描边，常驻不切换）
     * @param model 目标模型
     */
    public initBreath(model: any) {
        if (!model) {
            console.warn('呼吸效果添加失败，物体不存在')
            return
        }
        this.startConcurrent([{ models: [model], color: this.defaultOutlineColor(), duration: Infinity }])
    }

    /**
     * 给多个模型添加呼吸效果（默认黄色描边，常驻不切换，同组同步呼吸）
     * @param modelList 模型列表，每项含 modelName 字段
     */
    public initMultipleBreath(modelList: any) {
        if (!modelList.length) {
            console.warn('呼吸效果添加失败，模型列表不存在')
            return
        }
        const models: Object3D[] = []
        modelList.forEach((item: any) => {
            const m = this.TO.scene.getObjectByName(item.modelName)
            if (m) models.push(m)
        })
        this.startConcurrent([{ models, color: this.defaultOutlineColor(), duration: Infinity }])
    }

    /**
     * 多模型交替呼吸不同颜色：按 duration 依次切换激活任务（同一时刻仅一组激活）
     * 每个任务对应单个模型，独立颜色与时长
     * 例如隔 3s 立库-1 变红色，再隔 3s ABB机器人-2 变绿色
     * @param tasks 交替呼吸任务列表
     */
    public initAlternatingBreath(tasks: AlternatingBreathTask[]) {
        const queue = this.buildTasks(tasks)
        if (queue.length === 0) return
        this.disposeBreath()
        this.breathMode = 'sequential'
        this.breathQueue = queue
        this.breathSeqIdx = 0
        const g = this.buildGroup(queue[0])
        if (g) this.breathGroups.push(g)
    }

    /**
     * 多模型并发呼吸不同颜色：所有任务同时启动，每个模型独立颜色与时长，到期单独停止
     * 例如 ABB机器人-2 绿色闪 5s、ABB机器人-3 蓝色闪 8s，两者同时闪烁、各自独立停止
     * @param tasks 并发呼吸任务列表（每项单个模型）
     */
    public initConcurrentBreath(tasks: AlternatingBreathTask[]) {
        const list = this.buildTasks(tasks)
        if (list.length === 0) return
        this.startConcurrent(list)
    }

    /**
     * 将输入任务列表解析为运行时 BreathTask 数组（每个任务对应单个模型，独立颜色与时长）
     * @param tasks 输入任务列表
     * @returns 运行时任务数组
     */
    private buildTasks(tasks: AlternatingBreathTask[]): BreathTask[] {
        if (!tasks || tasks.length === 0) {
            console.warn('呼吸效果添加失败，任务列表为空')
            return []
        }
        const queue: BreathTask[] = []
        for (const t of tasks) {
            if (!t.modelName) {
                console.warn('呼吸任务未指定 modelName', t)
                continue
            }
            const m = this.TO.scene.getObjectByName(t.modelName)
            if (!m) {
                console.warn('呼吸效果：模型不存在 -', t.modelName)
                continue
            }
            queue.push({
                models: [m],
                color: new Color(t.color),
                duration: t.duration && t.duration > 0 ? t.duration : Infinity
            })
        }
        return queue
    }

    /**
     * 启动并发呼吸：先清理旧状态，再为每个任务构造一个并发组
     * @param list 运行时任务数组
     */
    private startConcurrent(list: BreathTask[]) {
        this.disposeBreath()
        this.breathMode = 'concurrent'
        for (const task of list) {
            const g = this.buildGroup(task)
            if (g) this.breathGroups.push(g)
        }
    }

    /**
     * 取消呼吸效果，还原所有呼吸组材质并释放描边槽位
     */
    public disposeBreath() {
        for (const g of this.breathGroups) this.disposeGroup(g)
        this.breathGroups = []
        this.breathQueue = []
        this.breathSeqIdx = 0
        this.breathMode = 'none'
    }

    /**
     * 取消发光效果
     * WebGL 模式通过图层控制，WebGPU 模式下 Bloom 为全局后处理无法单独关闭
     * @param model 目标模型
     */
    public disposeBloom(model: Object3D) {
        if (!model) {
            console.warn('发光效果取消失败，物体不存在')
            return
        }
        // WebGL 模式：通过层控制
        if (!this.isWebGPU) {
            model.traverse((child) => {
                if (child instanceof Mesh) {
                    ;(child as Mesh).layers.disable(TEffect.BLOOM_SCENE)
                }
            })
        }
        // WebGPU 模式下，Bloom 是全局后处理，无法单独为某模型关闭，故不做处理
    }

    /**
     * 创建火焰（WebGPU Sprite 粒子 + 点光源）
     * @param options 火焰配置
     * @returns 火焰粒子组
     */
    public createFire(options: FireOptions = {}): Group {
        if (!this.isWebGPU) {
            console.warn('[TEffect] 火焰仅支持 WebGPU 后端')
            return new Group()
        }

        this.removeFire()

        const group = new Group()
        group.name = 'TO_fire'

        const center = new Vector3()
        const pos = options.position
        if (pos) {
            if (pos instanceof Vector3) center.copy(pos)
            else center.set(pos.x, pos.y, pos.z)
        } else {
            center.set(0, 3, 0)
        }

        const fireHeight = options.height ?? 6
        const fireRadius = options.radius ?? 2.2
        const particleCount = options.particleCount ?? 28
        const intensity = options.intensity ?? 1
        const intensityNode = float(intensity)

        const base = new Color(options.color ?? '#ff7700')
        const inner = base.clone().lerp(new Color('#fff8e8'), 0.55)
        const mid = base.clone()
        const outer = base.clone().multiplyScalar(0.28)

        const fireMat = new SpriteNodeMaterial()
        fireMat.transparent = true
        fireMat.depthWrite = false
        fireMat.blending = AdditiveBlending
        fireMat.colorNode = Fn(() => {
            const vUv = uv()
            const d = length(vUv.sub(0.5)).mul(2)
            const alpha = float(1).sub(smoothstep(float(0.15), float(0.95), d))
            const flicker = sin(time.mul(8).add(d.mul(6)))
                .mul(0.18)
                .add(0.82)
            const colInner = vec3(inner.r, inner.g, inner.b)
            const colMid = vec3(mid.r, mid.g, mid.b)
            const colOuter = vec3(outer.r, outer.g, outer.b)
            let col = mix(colInner, colMid, smoothstep(float(0), float(0.75), d))
            col = mix(col, colOuter, smoothstep(float(0.6), float(1), d))
            return vec4(col.mul(flicker).mul(intensityNode), alpha.mul(0.85).mul(intensityNode))
        })()

        for (let i = 0; i < particleCount; i++) {
            const t = i / Math.max(particleCount - 1, 1)
            const y = t * fireHeight
            const spread = fireRadius * (1 - t * 0.82)
            const angle = i * 2.399963 + Math.random() * 0.6
            const r = spread * (0.25 + Math.random() * 0.75)

            const sprite = new Sprite(fireMat)
            sprite.center.set(0.5, 0.15)
            sprite.position.set(center.x + Math.cos(angle) * r, center.y + y, center.z + Math.sin(angle) * r)

            const baseScale = fireRadius * (1.35 - t * 0.55)
            const s = baseScale * (0.55 + Math.random() * 0.45)
            sprite.scale.set(s, s * (1.1 + Math.random() * 0.35), 1)
            sprite.renderOrder = 10
            group.add(sprite)
        }

        const fireLight = new PointLight(base.getHex(), 40 * intensity, 25, 2)
        fireLight.position.set(center.x, center.y + fireHeight * 0.45, center.z)
        fireLight.name = 'TO_fire_light'
        group.add(fireLight)

        this.TO.scene.add(group)
        this.fireGroup = group
        return group
    }

    /**
     * 移除火焰
     */
    public removeFire(): void {
        if (this.fireGroup) {
            this.TO.scene.remove(this.fireGroup)
            this.fireGroup = null
        }
    }
}
