/**
 * @module
 * @mergeModuleWith <project>
 */

import { Color, Group, Object3D, Vector3 } from 'three'
import {
    pass,
    fog,
    float,
    vec3,
    Fn,
    positionWorld,
    time,
    mix,
    smoothstep,
    length,
    getNormalFromDepth,
    uv,
    cameraProjectionMatrixInverse,
    uniform
} from 'three/tsl'
import { RenderPipeline, type WebGPURenderer } from 'three/webgpu'
import { ClusteredLighting } from 'three/examples/jsm/lighting/ClusteredLighting.js'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { outline } from 'three/examples/jsm/tsl/display/OutlineNode.js'
import { ssr } from 'three/examples/jsm/tsl/display/SSRNode.js'
import { denoise } from 'three/examples/jsm/tsl/display/DenoiseNode.js'
import { ThingOrigin } from '../ThingOrigin'
import { webgpuFeaturesParams } from './scenePrams'

/** 单条描边管线的可调参数（uniform 化，便于运行时热更新） */
type OutlineState = {
    active: boolean
    selectedObjects: Object3D[]
    edgeStrength: any
    edgeGlow: any
    edgeThickness: any
    pulsePeriod: any
    visibleEdgeColor: any
    hiddenEdgeColor: any
    /** TSL OutlineNode 实例（在 buildRenderPipeline 中创建） */
    node: ReturnType<typeof outline> | null
}

/** 默认并发描边槽位上限（可被 sceneData.effectComposer.outlinePass.maxOutlineSlots 覆盖） */
const DEFAULT_MAX_OUTLINE_SLOTS = 8

/**
 * r185 WebGPU 渲染管线（集群光照、TSL 后处理、物理雾等）
 */
export class TWebGPU {
    private TO: ThingOrigin

    /** WebGPU 渲染管线（替代 EffectComposer） */
    public renderPipeline: RenderPipeline | null = null

    public skinnedCrowdGroup: Group | null = null

    /** 描边槽位池：支持多组并发、各自独立颜色 */
    private outlines: OutlineState[]

    constructor(TO: ThingOrigin) {
        this.TO = TO
        this.outlines = []
        const max = TO.sceneData?.effectComposer?.outlinePass?.maxOutlineSlots ?? DEFAULT_MAX_OUTLINE_SLOTS
        for (let i = 0; i < max; i++) {
            this.outlines.push(this.createOutlineState(new Color(0xffff00), new Color(0x190a05)))
        }
    }

    private createOutlineState(visColor: Color, hidColor: Color): OutlineState {
        return {
            active: false,
            selectedObjects: [],
            edgeStrength: uniform(3),
            edgeGlow: uniform(0),
            edgeThickness: uniform(1),
            pulsePeriod: uniform(0),
            visibleEdgeColor: uniform(visColor),
            hiddenEdgeColor: uniform(hidColor),
            node: null
        }
    }

    /** 从 sceneData.effectComposer.outlinePass 读取初始参数写入所有槽位 uniform */
    private syncOutlineFromSceneData(): void {
        const ec = this.TO.sceneData.effectComposer
        if (!ec) return
        for (const state of this.outlines) this.applyOutlineConfig(state, ec.outlinePass)
    }

    private applyOutlineConfig(state: OutlineState, cfg: any): void {
        if (!cfg) return
        if (cfg.edgeStrength !== undefined) state.edgeStrength.value = cfg.edgeStrength
        if (cfg.edgeGlow !== undefined) state.edgeGlow.value = cfg.edgeGlow
        if (cfg.edgeThickness !== undefined) state.edgeThickness.value = cfg.edgeThickness
        if (cfg.pulsePeriod !== undefined) state.pulsePeriod.value = cfg.pulsePeriod
        if (cfg.visibleEdgeColor !== undefined) state.visibleEdgeColor.value.set(cfg.visibleEdgeColor)
        if (cfg.hiddenEdgeColor !== undefined) state.hiddenEdgeColor.value.set(cfg.hiddenEdgeColor)
    }

    private get wgpu(): WebGPURenderer {
        return this.TO.renderer.renderer as WebGPURenderer
    }

    private get cfg(): webgpuFeaturesParams {
        return this.TO.sceneData.scene.renderQuality?.webgpu ?? {}
    }

    /** 初始化 WebGPU 特性（createScene 中在 initRenderer 之后调用） */
    public async init(): Promise<void> {
        if (!this.TO.renderer.isWebGPU || !this.TO.renderer.renderer) return

        const renderer = this.wgpu

        // r185：不透明清屏，避免预乘 Alpha 混合异常
        if (this.cfg.opaqueClear !== false) {
            const bg = this.TO.sceneData.scene.background?.color?.color
            if (bg) {
                renderer.setClearColor(new Color(bg), 1)
            } else {
                renderer.setClearColor(0x1a1a2e, 1)
            }
        }

        if (this.cfg.clusteredLighting?.active) {
            const max = this.cfg.clusteredLighting.maxLights ?? 512
            renderer.lighting = new ClusteredLighting(max)
            console.log('[TWebGPU] 集群光照已启用, maxLights=', max)
        }

        // 从 sceneData.effectComposer.outlinePass(_red) 同步描边参数到 uniform
        this.syncOutlineFromSceneData()

        this.buildRenderPipeline()

        if (this.cfg.scatteringFog?.active) {
            this.applyScatteringFog()
        }
    }

    /** 构建 TSL RenderPipeline（Bloom / 描边 / 降噪 SSR） */
    public buildRenderPipeline(): void {
        if (!this.TO.renderer.isWebGPU) return

        const renderer = this.wgpu
        const scene = this.TO.scene
        const camera = this.TO.camera.camera

        const scenePass = pass(scene, camera)
        const colorNode = scenePass.getTextureNode('output')
        let outputNode: any = colorNode

        // 泛光
        let bloomCfg: any = null
        if (this.cfg.bloom) {
            if (this.cfg.bloom.active !== false) bloomCfg = this.cfg.bloom
        } else if (this.TO.sceneData.effectComposer?.bloomPass) {
            bloomCfg = this.TO.sceneData.effectComposer.bloomPass
        }
        if (bloomCfg) {
            const strength = bloomCfg.strength ?? 0.4
            const radius = bloomCfg.radius ?? 0.4
            const threshold = bloomCfg.threshold ?? 0.98
            outputNode = colorNode.add(bloom(colorNode, strength, radius, threshold))
        }

        // 描边：基于 r185 TSL OutlineNode，等价于 WebGL 的 OutlinePass
        // 采用槽位池，支持多组并发、各自独立颜色；空槽 selectedObjects 为空，OutlineNode 直接 return，开销极低
        // edgeStrength 由 CPU 端每帧写入 uniform（与 emissiveIntensity 同步呼吸）
        for (const state of this.outlines) {
            outputNode = this.appendOutline(outputNode, state, scene, camera)
        }

        if (this.cfg.ssr?.active) {
            const depthNode = scenePass.getTextureNode('depth')
            const normalNode = getNormalFromDepth(uv(), depthNode, cameraProjectionMatrixInverse)
            let reflectNode: any = ssr(colorNode, depthNode, normalNode, {
                stochastic: true,
                camera
            })
            if (this.cfg.ssr.denoise !== false) {
                reflectNode = denoise(reflectNode, depthNode, normalNode, camera)
            }
            outputNode = mix(colorNode, reflectNode, float(0.65))
        }

        if (this.renderPipeline) {
            this.renderPipeline.dispose()
        }
        this.renderPipeline = new RenderPipeline(renderer, outputNode)
    }

    /**
     * 将一条描边状态挂入输出节点：
     *  - 首次调用创建 OutlineNode（其 selectedObjects 引用 state.selectedObjects，后续热更新无需重建管线）
     *  - visibleEdge / hiddenEdge 分别乘以可见边 / 隐藏边颜色，再乘 edgeStrength
     *  - 呼吸脉冲由 CPU 端每帧更新 edgeStrength uniform 驱动（与 emissive 同步）
     */
    private appendOutline(inputNode: any, state: OutlineState, scene: any, camera: any): any {
        if (!state.node) {
            state.node = outline(scene, camera, {
                selectedObjects: state.selectedObjects,
                edgeThickness: state.edgeThickness,
                edgeGlow: state.edgeGlow
            })
        }
        const { visibleEdge, hiddenEdge } = state.node
        const visColor = state.visibleEdgeColor
        const hidColor = state.hiddenEdgeColor
        const outlineColor = visibleEdge.mul(visColor).add(hiddenEdge.mul(hidColor)).mul(state.edgeStrength)
        return inputNode.add(outlineColor)
    }

    /** TSL 大气散射雾（挂到 scene.fogNode） */
    public applyScatteringFog(): void {
        const fogCfg = this.cfg.scatteringFog ?? {}
        const density = fogCfg.density ?? 0.02
        const fogColor = new Color(fogCfg.color ?? '#b8c8e8')
        const sun = fogCfg.sunDirection ?? { x: 0.5, y: 0.8, z: 0.3 }
        const sunDir = new Vector3(sun.x, sun.y, sun.z).normalize()

        const scatteringFogFn = Fn(() => {
            const dist = length(positionWorld).mul(float(density))
            const sunFactor = positionWorld
                .dot(vec3(sunDir.x, sunDir.y, sunDir.z))
                .mul(0.5)
                .add(0.5)
            const fogFactor = smoothstep(float(0), float(1), dist)
            const scatterColor = mix(vec3(fogColor.r, fogColor.g, fogColor.b), vec3(1, 0.9, 0.7), sunFactor)
            return fog(fogFactor, scatterColor)
        })

        ;(this.TO.scene as any).fogNode = scatteringFogFn()
        this.TO.scene.fog = null
        console.log('[TWebGPU] 物理散射雾已启用')
    }

    // ===================== 描边（Outline）对外接口 =====================

    public getOutlineState(slot: number): OutlineState {
        return this.outlines[slot]
    }

    /** 槽位总数 */
    public get outlineSlotCount(): number {
        return this.outlines.length
    }

    /**
     * 申请一个空闲描边槽位（selectedObjects 为空即视为空闲）
     * @returns 槽位索引；无空闲返回 -1
     */
    public claimOutlineSlot(): number {
        for (let i = 0; i < this.outlines.length; i++) {
            if (this.outlines[i].selectedObjects.length === 0) return i
        }
        return -1
    }

    /**
     * 设置某槽位描边选中对象（热更新，无需重建管线）
     * @param slot 槽位索引
     * @param objects 选中对象数组；传空数组即释放该槽位
     */
    public setOutlineObjects(slot: number, objects: Object3D[]): void {
        const state = this.outlines[slot]
        if (!state) return
        state.selectedObjects.length = 0
        for (const obj of objects) {
            if (obj) state.selectedObjects.push(obj)
        }
        state.active = state.selectedObjects.length > 0
    }

    /**
     * 热更新某槽位描边参数（uniform 写入，无需重建管线）
     */
    public setOutlineParams(
        slot: number,
        params: {
            edgeStrength?: number
            edgeGlow?: number
            edgeThickness?: number
            pulsePeriod?: number
            visibleEdgeColor?: Color
            hiddenEdgeColor?: Color
        }
    ): void {
        const state = this.outlines[slot]
        if (!state) return
        if (params.edgeStrength !== undefined) state.edgeStrength.value = params.edgeStrength
        if (params.edgeGlow !== undefined) state.edgeGlow.value = params.edgeGlow
        if (params.edgeThickness !== undefined) state.edgeThickness.value = params.edgeThickness
        if (params.pulsePeriod !== undefined) state.pulsePeriod.value = params.pulsePeriod
        if (params.visibleEdgeColor !== undefined) state.visibleEdgeColor.value.copy(params.visibleEdgeColor)
        if (params.hiddenEdgeColor !== undefined) state.hiddenEdgeColor.value.copy(params.hiddenEdgeColor)
    }

    /** 同步渲染尺寸到所有描边槽位渲染目标（窗口 resize 时调用） */
    public setSizeOutline(width: number, height: number): void {
        for (const state of this.outlines) state.node?.setSize?.(width, height)
    }

    /** 释放所有描边槽位资源 */
    public disposeOutlines(): void {
        for (const state of this.outlines) {
            state.node?.dispose?.()
            state.node = null
            state.selectedObjects.length = 0
            state.active = false
        }
    }

    /** 渲染一帧 */
    public render(): void {
        if (this.renderPipeline) {
            this.renderPipeline.render()
        } else if (this.TO.renderer.renderer) {
            this.wgpu.render(this.TO.scene, this.TO.camera.camera)
        }
    }

    /** 独立动画人群（多副本 + 时间偏移） */
    public createSkinnedCrowd(source: Object3D, count = 12, spread = 30): Group {
        this.removeSkinnedCrowd()
        const group = new Group()
        group.name = 'TO_skinned_crowd'

        for (let i = 0; i < count; i++) {
            const clone = source.clone()
            clone.position.set((Math.random() - 0.5) * spread, 0, (Math.random() - 0.5) * spread)
            clone.rotation.y = Math.random() * Math.PI * 2
            clone.userData.animTimeOffset = Math.random() * 3
            group.add(clone)
        }

        this.TO.scene.add(group)
        this.skinnedCrowdGroup = group
        return group
    }

    public removeSkinnedCrowd(): void {
        if (this.skinnedCrowdGroup) {
            this.TO.scene.remove(this.skinnedCrowdGroup)
            this.skinnedCrowdGroup = null
        }
    }

    public dispose(): void {
        this.removeSkinnedCrowd()
        this.disposeOutlines()
        if (this.renderPipeline) {
            this.renderPipeline.dispose()
            this.renderPipeline = null
        }
        if ((this.TO.scene as any).fogNode) {
            ;(this.TO.scene as any).fogNode = null
        }
    }
}
