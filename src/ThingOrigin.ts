/**
 * @module
 * @mergeModuleWith <project>
 */

import { merge, cloneDeep } from 'lodash-es'
import * as TWEEN from '@tweenjs/tween.js'
import { sceneData } from '../public/data/sceneParams'

import {
    AnimationMixer,
    Timer,
    Fog,
    FogExp2,
    Object3D,
    OrthographicCamera,
    PerspectiveCamera,
    ImageUtils
} from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'

import { TAnimate } from './ts/TAnimate'
import { TCamera } from './ts/TCamera'
import { TControl } from './ts/TControl'
import { TCSG } from './ts/TCSG'
import { TCAD } from './ts/TCAD'
import { TEffect } from './ts/TEffect'
import { TEventDispatcher } from './ts/TEventDispatcher'
import { TExplode } from './ts/TExplode'
import { TExporters } from './ts/TExporters'
import { TFont } from './ts/TFont'
import { THelper } from './ts/THelper'
import { TIndexedDB } from './ts/TIndexedDB'
import { TLight } from './ts/TLight'
import { TLine } from './ts/TLine'
import { TMachine } from './ts/TMachine'
import { TMaterial } from './ts/TMaterial'
import { TMarker } from './ts/TMarker'
import { TModel } from './ts/TModel'
import { Tool } from './ts/Tool'
import { TPhysics } from './ts/TPhysics'
import { TRenderer } from './ts/TRenderer'
import { TSnap } from './ts/TSnap'
import { TScene } from './ts/TScene'
import { TGUI } from './ts/TGUI'
import { ThingOriginParams } from './ts/scenePrams'
import { TPhysx } from './ts/TPhysx'
import { TWebGPU } from './ts/TWebGPU'
import { TGenerator } from './ts/TGenerator'

/**
 * ThingOrigin 3D 场景引擎主类
 *
 * 这是一个基于 Three.js 的 3D 场景管理引擎，提供了完整的 3D 场景创建、渲染、交互等功能。
 * 包含相机控制、光照管理、模型加载、动画系统、物理引擎等核心模块。
 *
 * @author LL
 * @version 2.0
 * @since 2021/10/15
 *
 * @example
 * ```typescript
 * // 创建场景实例
 * const container = document.getElementById('scene-container');
 * const scene = new ThingOrigin('TO', container);
 * ```
 */
export class ThingOrigin {
    // ==================== 基础属性 ====================

    /**
     * |属性|说明|
     * |:---:|:---|
     * |场景参数|用于描述整个场景的数据，包括相机、光照、控制器等配置|
     * @category 普通属性
     *  */
    public sceneData: ThingOriginParams

    /**
     * |属性|说明|
     * |:---:|:---|
     * |场景名称|当前场景名称，用于标识当前场景|
     * @category 普通属性
     */
    public sceneName: string

    /**
     * |属性|说明|
     * |:---:|:---|
     * |DOM容器|用于渲染3D场景的DOM容器元素，必须具有宽度和高度|
     * @category 普通属性
     */
    public container: HTMLElement

    /**
     * |属性|说明|
     * |:---:|:---|
     * |模型加载回调函数|当前场景的所有模型加载完成后的回调函数，接收 ThingOrigin 实例|
     * @category 普通属性
     */
    public onAllModelsLoaded: (thingOrigin: ThingOrigin) => ThingOrigin

    /**
     * |属性|说明|
     * |:---:|:---|
     * |渲染器|负责3D场景渲染的渲染器实例|
     * @category 普通属性
     */
    public renderer: TRenderer

    /**
     * |属性|说明|
     * |:---:|:---|
     * |CSS2D渲染器|用于渲染HTML标签和UI元素的CSS2D渲染器|
     * @category 普通属性
     */
    public CSS2DRenderer: CSS2DRenderer

    /**
     * |属性|说明|
     * |:---:|:---|
     * |动画混合器|用于控制和管理动画播放的动画混合器|
     * @category 普通属性
     */
    public mixer: AnimationMixer

    /**
     * |属性|说明|
     * |:---:|:---|
     * |性能监控器|用于显示渲染性能统计的性能监控器|
     * @category 普通属性
     */
    public stats: Stats

    /**
     * |属性|说明|
     * |:---:|:---|
     * |需更新材质|需要手动更新的材质列表，在渲染循环中会更新这些材质的uniform值|
     * @category 普通属性
     */
    public toUpdate = {
        material: [] as any[]
    }

    /**
     * |属性|说明|
     * |:---:|:---|
     * |更新ID|动画帧请求ID，用于取消渲染循环|
     * @category 普通属性
     */
    public updateId: number

    /**
     * 性能优化：跟踪相机是否需要更新
     * @private
     */
    private cameraNeedsUpdate: boolean = false

    /**
     * 性能优化：内部时钟，用于动画更新
     * @private
     */
    private clock: Timer

    /**
     * 性能优化：缓存lookAt模型查找结果
     * @private
     */
    private cachedLookAtModels: Map<string, any> = new Map()

    /**
     * 性能监控：帧时间记录
     * @private
     */
    private frameTimes: number[] = []

    /**
     * 性能监控：是否启用性能监控
     * @private
     */
    private performanceMonitoring: boolean = false

    // ==================== 核心模块 ====================

    /**
     * |模块|说明|
     * |:---:|:---|
     * |相机|管理场景相机和视图的相机模块|
     * @category 核心属性
     */
    public camera: TCamera

    /**
     * |模块|说明|
     * |:---:|:---|
     * |控制器|包含轨道控制器、拖拽控制器、射线控制器、变换控制器等的控制器模块|
     * @category 核心属性
     */
    public controls: TControl

    /**
     * |模块|说明|
     * |:---:|:---|
     * |CAD|处理CAD图纸及模型相关功能的CAD模块|
     * @category 核心属性
     */
    public CAD: TCAD

    /**
     * |模块|说明|
     * |:---:|:---|
     * |图形用户界面控制器|参数实时调整界面|
     * @category 核心属性
     */
    public GUI: TGUI

    /**
     * |模块|说明|
     * |:---:|:---|
     * |工具函数|提供常用的支撑创建及计算工具函数的工具函数模块|
     * @category 核心属性
     */
    public tool: Tool

    /**
     * |模块|说明|
     * |:---:|:---|
     * |文字|用于创建和渲染3D文字的文字模块|
     * @category 核心属性
     */
    public font: TFont

    /**
     * |模块|说明|
     * |:---:|:---|
     * |线条|用于创建线条和路径的线条模块|
     * @category 核心属性
     */
    public line: TLine

    /**
     * |模块|说明|
     * |:---:|:---|
     * |吸附|用于处理模型间吸附功能的吸附模块|
     * @category 核心属性
     */
    public snap: TSnap

    /**
     * |模块|功能|
     * |:---:|:---|
     * |动画|用于制作和控制模型动画的动画模块|
     * @category 核心属性
     */
    public animate: TAnimate

    /**
     * |模块|功能|
     * |:---:|:---|
     * |材质|用于创建和管理材质的材质模块|
     * @category 核心属性
     */
    public material: TMaterial

    /**
     * |模块|功能|
     * |:---:|:---|
     * |本地缓存|用于缓存模型至浏览器IndexedDB的本地缓存模块|
     * @category 核心属性
     */
    public indexedDB: TIndexedDB

    /**
     * |模块|功能|
     * |:---:|:---|
     * |事件分发器|用于处理鼠标点击等交互事件的事件分发器|
     * @category 核心属性
     */
    public eDispatcher: TEventDispatcher

    /**
     * |模块|功能|
     * |:---:|:---|
     * |模型|用于创建和加载基础模型的模型模块|
     * @category 核心属性
     */
    public model: TModel

    /**
     * |模块|功能|
     * |:---:|:---|
     * |场景|管理3D场景对象的场景模块|
     * @category 核心属性
     */
    public scene: TScene

    /**
     * |模块|功能|
     * |:---:|:---|
     * |效果|用于制作模型特效（如辉光、后处理等）的效果模块|
     * @category 核心属性
     */
    public effect: TEffect

    /**
     * |模块|功能|
     * |:---:|:---|
     * |标记|用于给模型添加标记和标签的标记模块|
     * @category 核心属性
     */
    public marker: TMarker

    /**
     * |模块|功能|
     * |:---:|:---|
     * |成品机械|用于控制特定型号机器模型的机械模块|
     * @category 核心属性
     */
    public machine: TMachine

    /**
     * |模块|功能|
     * |:---:|:---|
     * |爆炸图|用于制作模型爆炸图效果的爆炸图模块|
     * @category 核心属性
     */
    public explode: TExplode

    /**
     * |模块|功能|
     * |:---:|:---|
     * |CSG|基于 BVH 的布尔运算（差集/并集/交集等），用于切割、开洞等|
     * @category 核心属性
     */
    public csg: TCSG

    /**
     * |模块|功能|
     * |:---:|:---|
     * |物理|用于处理物理世界和碰撞检测的物理模块|
     * @category 核心属性
     */
    public physics: TPhysics

    /**
     * |模块|功能|
     * |:---:|:---|
     * |PhysX|用于处理PhysX物理世界的物理模块|
     * @category 核心属性
     */
    public physx: TPhysx

    /**
     * |模块|功能|
     * |:---:|:---|
     * |WebGPU|r185 WebGPU 特性：集群光照、TSL 后处理、体积火、物理雾等|
     * @category 核心属性
     */
    public webgpu: TWebGPU

    /**
     * |模块|功能|
     * |:---:|:---|
     * |程序化生成|r185 城市/建筑/Loft 放样生成|
     * @category 核心属性
     */
    public generator: TGenerator

    /**
     * |模块|功能|
     * |:---:|:---|
     * |光源管理|用于控制场景内光源的光源管理模块|
     * @category 核心属性
     */
    public light: TLight

    /**
     * |模块|功能|
     * |:---:|:---|
     * |辅助器|提供坐标轴、网格、包围盒等辅助工具的辅助器模块|
     * @category 核心属性
     */
    public helper: THelper

    /**
     * |模块|功能|
     * |:---:|:---|
     * |导出|用于导出场景和模型的导出模块|
     * @category 核心属性
     */
    public exporters: TExporters

    // ==================== 构造函数 ====================

    /**
     * 创建 ThingOrigin 实例
     *
     * @param sceneName - 场景名称，用于标识场景
     * @param container - DOM 容器元素，必须具有宽度和高度
     * @param userSceneParam - 可选的用户自定义场景参数
     * @param onAllModelsLoaded - 可选的回调函数，当所有模型加载完成后调用，接收 ThingOrigin 实例
     *
     * @example
     * ```typescript
     * const container = document.getElementById('scene-container');
     * const scene = new ThingOrigin('TO', container, {}, (TO) => {
     *     console.log('模型加载完成，TO实例:', TO);
     * });
     * ```
     */
    constructor(
        sceneName: string,
        container: HTMLElement,
        userSceneParam?: ThingOriginParams,
        onAllModelsLoaded?: (thingOrigin: ThingOrigin) => void
    ) {
        // 抑制 THREE.ImageUtils.getDataURL 的 JPEG 转换警告
        // TGA 等格式转换为 JPEG 是 Three.js 内部优化行为，不影响功能
        this.suppressImageUtilsWarning()

        this.sceneName = sceneName
        this.container = container
        this.onAllModelsLoaded = (thingOrigin: ThingOrigin) => {
            onAllModelsLoaded?.(thingOrigin)
            return this // 返回 ThingOrigin 实例
        }

        let data = cloneDeep(sceneData)
        //处理合并场景数据
        this.sceneData = merge(data, userSceneParam)

        // 初始化内部时钟
        this.clock = new Timer()

        //下面初始化的顺序不要变
        this.indexedDB = new TIndexedDB(this)
        this.camera = new TCamera(this)
        this.controls = new TControl(this)
        this.CAD = new TCAD()
        this.GUI = new TGUI()
        this.tool = new Tool()
        this.font = new TFont(this)
        this.line = new TLine(this)
        this.snap = new TSnap(this)
        this.animate = new TAnimate()
        this.material = new TMaterial(this)
        this.eDispatcher = new TEventDispatcher(this)
        this.model = new TModel(this)
        this.renderer = new TRenderer(this)
        this.scene = new TScene(this)
        this.effect = new TEffect(this)
        this.marker = new TMarker(this)
        this.machine = new TMachine(this)
        this.explode = new TExplode(this)
        this.csg = new TCSG()
        this.physics = new TPhysics(this)
        this.light = new TLight(this.scene)
        this.helper = new THelper(this.scene)
        this.exporters = new TExporters(this.scene, this)
        this.physx = new TPhysx(this)
        this.webgpu = new TWebGPU(this)
        this.generator = new TGenerator(this)

        this.createScene(sceneName, container, userSceneParam, onAllModelsLoaded)
    }

    /**
     * 抑制 THREE.ImageUtils.getDataURL 的 JPEG 转换警告
     * 当加载 TGA、PNG 等非 JPEG 图像时，Three.js 内部会将其转换为 JPEG 格式以提高性能，
     * 这会触发 "Image converted to jpg for performance reasons" 警告。此方法重写 getDataURL
     * 以移除该警告，因为转换行为是 Three.js 的正常优化，不影响功能。
     * @private
     * @author gj
     * @since 2026/04/24
     */
    private suppressImageUtilsWarning(): void {
        const originalGetDataURL = ImageUtils.getDataURL
        ImageUtils.getDataURL = function (
            image: HTMLImageElement | HTMLCanvasElement | ImageBitmap | object
        ): string {
            if (image instanceof HTMLImageElement) {
                const canvas = document.createElementNS(
                    'http://www.w3.org/1999/xhtml',
                    'canvas'
                ) as HTMLCanvasElement
                canvas.width = image.naturalWidth
                canvas.height = image.naturalHeight
                const context = canvas.getContext('2d')!
                context.drawImage(image as CanvasImageSource, 0, 0)
                // 移除原始警告，直接返回 JPEG data URL
                return canvas.toDataURL('image/jpeg', 0.6)
            }
            // 对于其他类型，调用原始方法但不触发警告
            return originalGetDataURL.call(this, image as any)
        }
    }

    /**
   * 创建场景
   * @category 方法
   * @author LL
   * @since 2021/10/15
   * @param {string} sceneName 场景名称
   * @param {HTMLElement} container dom容器，用于渲染场景
   * @param {ThingOriginParams} [userSceneParam] 场景参数，见({@link ./public/data/sceneParams.ts}）
   * @example
   * ```ts
   * let TO = ThingOrigin.createScene('sceneName',document.getElementById('domID'))
   * ```
   > [!NOTE]
   > 容器必须有宽度和高度
   *
   */
    public createScene = async (
        sceneName: string,
        container: HTMLElement,
        userSceneParam?: ThingOriginParams,
        onAllModelsLoaded?: (thingOrigin: ThingOrigin) => void
    ) => {
        this.sceneName = sceneName
        this.container = container
        this.onAllModelsLoaded = (thingOrigin: ThingOrigin) => {
            onAllModelsLoaded?.(thingOrigin)
            return this // 返回 ThingOrigin 实例
        }

        let data = cloneDeep(sceneData)

        //处理合并场景数据
        this.sceneData = merge(data, userSceneParam)
        // 特定sceneData的配置项处理
        if (userSceneParam?.lights) {
            this.sceneData.lights = userSceneParam.lights
        }
        if (userSceneParam?.modelList?.length > 0) {
            this.sceneData.modelList = userSceneParam.modelList
        }
        if (userSceneParam?.markerList?.length > 0) {
            this.sceneData.markerList = userSceneParam.markerList
        }
        console.log('TO_sceneData', this.sceneData)

        // 渲染器须最先初始化（创建 canvas 供控制器绑定）
        await this.renderer.initRenderer()

        // if (userSceneParam.animationList)
        //   this.sceneData.animationList = userSceneParam.animationList;
        // if (userSceneParam.handleList)
        //   this.sceneData.handleList = userSceneParam.handleList;

        //设置环境
        if (this.sceneData.scene.environment.active) {
            this.scene.setEnvironment()
        }
        //设置背景
        this.scene.setBackground()
        this.scene.setGround(this.sceneData.scene.ground)

        this.initLight()

        if (this.renderer.isWebGPU) {
            await this.webgpu.init()
        } else {
            this.effect.initEffect()
        }

        if (this.sceneData.scene.fog.active) {
            const fogType = this.sceneData.scene.fog.type
            if (this.renderer.isWebGPU && fogType === 'scattering') {
                this.webgpu.applyScatteringFog()
            } else if (this.sceneData.scene.fog.cameraView) {
                this.scene.fog = new FogExp2(this.sceneData.scene.fog.color)
            } else {
                this.scene.fog = new Fog(this.sceneData.scene.fog.color)
            }
        }

        if (this.sceneData.scene.stats.active) this.showStats()

        this.initControl()

        this.update()

        await Promise.all([
            this.model.warmupDecoders(this.renderer.renderer),
            this.font
                .preloadFonts(this.sceneData.modelList)
                .catch((err) => console.warn('字体预加载失败:', err))
        ])

        // 使用批量加载方法，单个模型加载完成就立即渲染
        const loadedModels = await this.model.loadModel(
            this.sceneData.modelList,
            // 单个模型加载完成的回调
            (model, index) => {
                this.scene.add(model)
            },
            // 所有模型加载完成的回调
            (modelGroup, thingOrigin) => {
                // 调用原有的 onAllModelsLoaded 回调，传入 ThingOrigin 实例
                this.onAllModelsLoaded(thingOrigin || this)
                // 返回 ThingOrigin 实例供后续操作
                return thingOrigin || this
            }
        )

        //下面功能必须放到模型批量加载之后，因为要在模型加载完毕后  再去执行
        this.initAttach()
        this.loadMarker()

        // 检查最终加载状态
        // const finalStatus = this.scene.getModelLoadingStatus();
        // console.log('加载状态:', finalStatus)
    }

    /**
     * 场景重新适配窗口大小
     * @category 方法
     * @author LL
     * @example
     * window.addEventListener('resize', TO.resize());
     */
    public resize() {
        // 1. 更新相机投影矩阵
        if (this.camera.camera) {
            if (this.camera.type == 'PerspectiveCamera') {
                ;(this.camera.camera as PerspectiveCamera).aspect =
                    this.container.clientWidth / this.container.clientHeight
                ;(this.camera.camera as PerspectiveCamera).updateProjectionMatrix()
            } else if (this.camera.type == 'OrthographicCamera') {
                ;(this.camera.camera as OrthographicCamera).left = this.container.clientLeft
                ;(this.camera.camera as OrthographicCamera).right =
                    this.container.clientLeft + this.container.clientWidth
                ;(this.camera.camera as OrthographicCamera).top = this.container.clientTop
                ;(this.camera.camera as OrthographicCamera).bottom =
                    this.container.clientTop + this.container.clientHeight
                ;(this.camera.camera as OrthographicCamera).updateProjectionMatrix()
            }
        }

        // 2. 更新主渲染器尺寸
        if (this.renderer && this.renderer.renderer) {
            this.renderer.renderer.setSize(this.container.clientWidth, this.container.clientHeight, true)
        }

        // 3. 更新 CSS2D 渲染器尺寸
        if (this.renderer && this.renderer.CSS2DRenderer) {
            this.renderer.CSS2DRenderer.setSize(this.container.clientWidth, this.container.clientHeight)
        }

        // 4. 更新后处理效果器尺寸
        if (this.effect && this.effect.effectComposer) {
            this.effect.effectComposer.setSize(this.container.clientWidth, this.container.clientHeight)
        }
        if (this.effect && this.effect.outlinePasses) {
            for (const pass of this.effect.outlinePasses) {
                if (pass?.setSize) pass.setSize(this.container.clientWidth, this.container.clientHeight)
            }
        }
        if (this.renderer.isWebGPU && this.webgpu) {
            this.webgpu.setSizeOutline(this.container.clientWidth, this.container.clientHeight)
        }
        if (this.effect && this.effect.effectFXAA) {
            this.effect.effectFXAA.uniforms['resolution'].value.set(
                1 / this.container.clientWidth,
                1 / this.container.clientHeight
            )
        }
        if (this.effect && this.effect.bloomPass) {
            this.effect.bloomPass.setSize(this.container.clientWidth, this.container.clientHeight)
        }
        if (this.effect && this.effect.bloomComposer) {
            this.effect.bloomComposer.setSize(this.container.clientWidth, this.container.clientHeight)
        }
        if (this.effect && this.effect.finalComposer) {
            this.effect.finalComposer.setSize(this.container.clientWidth, this.container.clientHeight)
        }

        // 5. 更新 小窗画中画布局
        if (this.camera && this.camera.pipEnabled) {
            this.camera.layoutPipViews()
        }

        // 6. 更新 ArrayCamera 分屏 viewport / 分隔线
        if (this.camera && this.camera.arraySplitEnabled) {
            this.camera.layoutArrayCamera()
        }

        // // 5. 更新多视图相机尺寸（如果有）
        // if (this.camera.cameraView && this.camera.cameraView.size > 0) {
        //   this.camera.cameraView.forEach((view) => {
        //     const viewCamera = view.camera;
        //     if (viewCamera) {
        //       if (viewCamera.type === 'PerspectiveCamera') {
        //         (viewCamera as PerspectiveCamera).aspect = this.container.clientWidth / this.container.clientHeight;
        //         (viewCamera as PerspectiveCamera).updateProjectionMatrix();
        //       }
        //     }
        //   });
        // }
    }

    /**
     * 标记相机需要更新投影矩阵
     * @category 方法
     * @author LL
     * @since 2025/10/14
     * @example
     * TO.markCameraUpdate();
     */
    public markCameraUpdate() {
        this.cameraNeedsUpdate = true
    }

    /**
     * 更新渲染
     * @author LL
     * @category 方法
     * @example
     * TO.update()
     */
    public update(currentTime: number = 0) {
        // 性能监控：记录帧开始时间
        const frameStartTime = performance.now()

        // 性能优化：使用 Clock 计算时间增量，确保动画平滑
        this.clock.update()
        const delta = this.clock.getDelta()

        if (this.effect) {
            this.effect.updateBreath(delta)
        }

        // 性能优化：只在相机需要更新时才更新投影矩阵
        if (this.cameraNeedsUpdate) {
            this.camera.camera.updateProjectionMatrix()
            this.cameraNeedsUpdate = false
        }

        // 性能优化：减少CSS2D渲染频率，每3帧渲染一次
        if (this.renderer && this.renderer.CSS2DRenderer) {
            this.renderer.CSS2DRenderer.render(this.scene, this.camera.camera)
        }

        if (this.helper.box) this.helper.updateBox()
        if (this.controls.pointerLock) this.controls.updatePointerLock()
        // ViewHelper 动画（点击轴后相机切换）
        if (this.helper.view) this.helper.updateView(delta)

        if (this.stats) this.stats.update()
        if (this.mixer) this.mixer.update(delta)

        // 性能优化：材质uniform更新优化，使用真实的时间增量
        // 减少更新频率，每2帧更新一次
        if (this.toUpdate.material.length > 0) {
            for (let index = 0; index < this.toUpdate.material.length; index++) {
                const material = this.toUpdate.material[index]
                // 守卫：仅 ShaderMaterial 等带 uniforms['time'] 的材质需要手动推进时间；
                // WebGPU 的 NodeMaterial（如 WaterMesh）用 TSL time 节点自动更新，无 uniforms 属性，跳过即可
                const timeUniform = material?.uniforms?.['time']
                if (timeUniform) {
                    timeUniform.value += delta
                }
            }
        }

        // // 性能优化：缓存视图对象查找结果
        // let views = this.camera.cameraView;
        // console.log("🚀 ~ ThingOrigin ~ update ~  this.camera:",  this.camera)
        // if (views.size > 0) {
        //   views.forEach((view) => {
        //     const renderer = this.renderer.rendererView.get(view.name).renderer;
        //     console.log("🚀 ~ ThingOrigin ~ update ~ renderer:", renderer)
        //     const camera = this.camera.cameraView.get(view.name).camera;
        //     console.log("🚀 ~ ThingOrigin ~ update ~ camera:", camera)

        //     // // 性能优化：缓存模型查找结果
        //     // let onModel = this.cachedLookAtModels.get(view.lookAt);
        //     // if (!onModel) {
        //     //   onModel = this.scene.getObjectByProperty('name', view.lookAt);
        //     //   if (onModel) {
        //     //     this.cachedLookAtModels.set(view.lookAt, onModel);
        //     //   }
        //     // }

        //     // if (onModel) {
        //     //   camera.lookAt(onModel.position);
        //     //   camera.position.set(
        //     //     onModel.position.x + view.offset.x,
        //     //     onModel.position.y + view.offset.y,
        //     //     onModel.position.z + view.offset.z
        //     //   );
        //     // } else {
        //     //   camera.lookAt(0, 0, 0);
        //     // }

        //     renderer.render(this, camera);
        //   });
        // }

        // 更新控制器
        if (this.controls.orbit) {
            this.controls.orbit.update()
        }

        // ========== 渲染：分屏优先于 EffectComposer（Composer 固定绑主相机，会吞掉 ArrayCamera 分屏） ==========
        if (!this.renderer.renderer) {
            return
        }
        if (this.camera.arraySplitEnabled) {
            this.camera.syncArrayCameraToMain()
            this.camera.updateSplitOrbits()
            const gl = this.renderer.webglRenderer
            if (gl) this.camera.renderArrayCamera(gl)
        } else if (this.renderer.isWebGPU && this.webgpu.renderPipeline) {
            this.webgpu.render()
        } else if (this.effect && this.effect.effectComposer) {
            // 清除之前的渲染
            this.renderer.renderer.clear()
            // 使用EffectComposer进行渲染（包含HDR和后期效果）
            this.effect.effectComposer.render()
        } else {
            // 备用：普通渲染
            this.renderer.renderer.render(this.scene, this.camera.camera)
        }

        // ViewHelper 使用独立小画布，不碰主场景 viewport / WebGPU pipeline
        if (this.helper.view) this.helper.renderView()

        // 渲染 小窗画中画（scissor + viewport）
        if (this.camera.pipEnabled) {
            const gl = this.renderer.webglRenderer
            if (gl) {
                this.camera.syncPipToMain()
                this.camera.renderPipViews(gl)
            }
        }

        // 性能优化：修复重复渲染问题，effectComposer只渲染一次
        // if (this.effect && this.effect.effectComposer) {
        //     this.effect.effectComposer.render()
        // }

        // 更新TWEEN动画
        TWEEN.update()

        // 性能监控：记录帧时间
        if (this.performanceMonitoring) {
            const frameTime = performance.now() - frameStartTime
            this.frameTimes.push(frameTime)

            // 保持最近100帧的记录
            if (this.frameTimes.length > 100) {
                this.frameTimes.shift()
            }

            if (frameTime > 16.67) {
                console.warn(`[性能警告] 帧时间过长: ${frameTime.toFixed(2)}ms (目标: 16.67ms)`)
            }
        }

        this.updateId = requestAnimationFrame(this.update.bind(this))
    }

    /**
     * 获取纹理和材质缓存统计信息
     * @author LL
     * @since 2025/10/14
     * @category 方法
     * @returns 缓存统计对象 {textures: number, materials: number}
     * @example
     * const stats = TO.getCacheStats();
     * console.log(`纹理缓存: ${stats.textures}, 材质缓存: ${stats.materials}`);
     */
    public getCacheStats() {
        return this.material.getCacheStats()
    }

    /**
     * 清理纹理和材质缓存
     * @author LL
     * @since 2025/10/14
     * @category 方法
     * @example
     * TO.clearCache(); // 清理所有缓存
     */
    public clearCache() {
        this.material.clearAllCache()
    }

    /**
     * 清理性能优化缓存
     * @author LL
     * @since 2025/10/14
     * @category 方法
     * @example
     * TO.clearPerformanceCache(); // 清理性能缓存
     */
    public clearPerformanceCache() {
        this.cachedLookAtModels.clear()
        console.log('性能优化缓存已清理')
    }

    /**
     * 启用性能监控
     * @author LL
     * @since 2025/10/14
     * @category 方法
     * @example
     * TO.enablePerformanceMonitoring(); // 启用性能监控
     */
    public enablePerformanceMonitoring() {
        this.performanceMonitoring = true
        this.frameTimes = []
        console.log('性能监控已启用')
    }

    /**
     * 禁用性能监控
     * @author LL
     * @since 2025/10/14
     * @category 方法
     * @example
     * TO.disablePerformanceMonitoring(); // 禁用性能监控
     */
    public disablePerformanceMonitoring() {
        this.performanceMonitoring = false
        console.log('性能监控已禁用')
    }

    /**
     * 获取性能统计信息
     * @author LL
     * @since 2025/10/14
     * @category 方法
     * @returns 性能统计对象
     * @example
     * const stats = TO.getPerformanceStats();
     * console.log(`平均帧时间: ${stats.avgFrameTime}ms, FPS: ${stats.fps}`);
     */
    public getPerformanceStats() {
        if (this.frameTimes.length === 0) {
            return { avgFrameTime: 0, fps: 0, maxFrameTime: 0, minFrameTime: 0 }
        }

        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
        const maxFrameTime = Math.max(...this.frameTimes)
        const minFrameTime = Math.min(...this.frameTimes)
        const fps = 1000 / avgFrameTime

        return {
            avgFrameTime: Math.round(avgFrameTime * 100) / 100,
            fps: Math.round(fps * 100) / 100,
            maxFrameTime: Math.round(maxFrameTime * 100) / 100,
            minFrameTime: Math.round(minFrameTime * 100) / 100
        }
    }

    /**
     * 销毁场景
     * @author LL
     * @since 2024/07/02
     * @category 方法
     * @example
     * TO.dispose();
     */
    public dispose() {
        console.log('dispose', this.scene)

        // 先收集所有需要删除的对象，避免在遍历时修改
        const objectsToRemove: Object3D[] = []

        // 递归处理材质的纹理释放
        const disposeMaterial = (material: any) => {
            if (!material) return

            // 处理数组材质
            if (Array.isArray(material)) {
                material.forEach(disposeMaterial)
                return
            }

            // 遍历材质的所有属性，查找纹理
            Object.keys(material).forEach((key) => {
                const value = material[key]
                if (value && typeof value === 'object' && value.isTexture) {
                    value.dispose()
                }
                // 处理嵌套对象中的纹理
                if (value && typeof value === 'object' && value.value && value.value.isTexture) {
                    value.value.dispose()
                }
            })

            // 释放材质
            if (material.dispose) {
                material.dispose()
            }
        }

        // 清理 IndexedDB 连接
        if (this.indexedDB) {
            this.indexedDB.closeAllConnections()
        }

        // 清理渲染器资源
        if (this.renderer) {
            this.renderer.dispose()
        }

        // 清理控制器资源
        if (this.controls) {
            this.controls.dispose()
        }

        // 清理 TWEEN 动画
        TWEEN.removeAll()

        // 遍历场景，收集对象并释放资源
        this.scene.traverse((child: any) => {
            // 释放几何体
            if (child.geometry) {
                child.geometry.dispose()
            }

            // 释放材质
            if (child.material) {
                disposeMaterial(child.material)
            }

            // 收集需要移除的对象
            objectsToRemove.push(child)

            // 清理相机相关
            if (child.camera) {
                child.camera = null
            }

            // 清理光源相关
            if (child.light) {
                child.light = null
            }
        })

        // 批量移除对象
        objectsToRemove.forEach((child) => {
            this.scene.remove(child)
        })

        // 清空场景
        this.scene.clear()

        // 清理控制器
        if (this.controls) {
            this.controls.disposeOrbit()
            this.controls.disposeDrag()
            this.controls.disposePointerLock()
            this.controls.disposeRaycaster()
            this.controls.disposeTransform()
        }

        // 清理辅助器
        if (this.helper) {
            this.helper.removeAxes()
            this.helper.removeBox()
            this.helper.removeGrid()
        }

        // 清理后处理效果
        if (this.effect) {
            this.effect.removeFire()
            if (this.effect.effectComposer) {
                this.effect.effectComposer.dispose()
            }
            if (this.effect.bloomComposer) {
                this.effect.bloomComposer.dispose()
            }
            if (this.effect.finalComposer) {
                this.effect.finalComposer.dispose()
            }
        }

        if (this.webgpu) {
            this.webgpu.dispose()
        }
        if (this.generator) {
            this.generator.dispose()
        }

        // 性能优化：清理纹理和材质缓存
        if (this.material) {
            this.material.clearAllCache()
        }

        // 清理 CSS2D 渲染器
        if (this.renderer && this.renderer.CSS2DRenderer) {
            this.renderer.CSS2DRenderer.domElement.remove()
        }

        // 清理 DOM 容器
        while (this.container.hasChildNodes()) {
            this.container.removeChild(this.container.firstChild)
        }

        // 清理渲染器
        if (this.renderer && this.renderer.renderer) {
            this.renderer.renderer.dispose()
            const gl = this.renderer.webglRenderer
            if (gl) {
                gl.forceContextLoss()
                const canvas = gl.domElement
                if (canvas) {
                    const webgl = canvas.getContext('webgl') || canvas.getContext('webgl2')
                    if (webgl) {
                        const loseContext = webgl.getExtension('WEBGL_lose_context')
                        if (loseContext) loseContext.loseContext()
                    }
                }
            }
        }

        // 取消动画帧
        if (this.updateId) {
            cancelAnimationFrame(this.updateId)
        }

        // 清理场景数据（可选）
        this.sceneData = null as any
    }

    /**
     * 初始化场景光源
     * @author LL
     * @since 2021/07/26
     * @category 方法
     * @private
     */
    private initLight() {
        for (let i = 0; i < this.sceneData.lights.length; i++) {
            let lightInfo = this.sceneData.lights[i]
            switch (lightInfo.type.toLocaleLowerCase()) {
                case 'directionallight':
                    const dirLight = this.light.addDirectionalLight({
                        name: lightInfo.name,
                        color: lightInfo.color,
                        intensity: lightInfo.intensity,
                        position: lightInfo.position,
                        castShadow: lightInfo.castShadow,
                        shadowNear: lightInfo.shadowNear,
                        shadowFar: lightInfo.shadowFar,
                        shadowMapSize: lightInfo.shadowMapSize,
                        shadowCameraLeft: lightInfo.shadowCameraLeft,
                        shadowCameraRight: lightInfo.shadowCameraRight,
                        shadowCameraTop: lightInfo.shadowCameraTop,
                        shadowCameraBottom: lightInfo.shadowCameraBottom,
                        shadowBias: lightInfo.shadowBias,
                        shadowNormalBias: lightInfo.shadowNormalBias,
                        shadowRadius: lightInfo.shadowRadius
                    })
                    dirLight.visible = lightInfo.visible
                    break
                case 'ambientlight':
                    const ambientLight = this.light.addAmbientLight({
                        name: lightInfo.name,
                        color: lightInfo.color,
                        intensity: lightInfo.intensity
                    })
                    ambientLight.visible = lightInfo.visible
                    break
                case 'pointlight':
                    const pointLight = this.light.addPointLight({
                        name: lightInfo.name,
                        color: lightInfo.color,
                        intensity: lightInfo.intensity,
                        distance: lightInfo.distance,
                        position: lightInfo.position
                    })
                    pointLight.visible = lightInfo.visible
                    break
                case 'hemispherelight':
                    const hemisphereLight = this.light.addHemisphereLight({
                        name: lightInfo.name,
                        skyColor: lightInfo.color, // 天空颜色，默认为白色
                        groundColor: lightInfo.groundColor,
                        intensity: lightInfo.intensity, // 光源强度，默认为1
                        position: lightInfo.position
                    })
                    hemisphereLight.visible = lightInfo.visible
                    break
                case 'rectarealight':
                    const rectAreaLight = this.light.addRectAreaLight({
                        name: lightInfo.name, // 光源名称，自动生成时间戳
                        color: lightInfo.color, // 光源颜色，默认为白色
                        intensity: lightInfo.intensity, // 光源强度，默认为5
                        width: lightInfo.width, // 光源宽度，默认为10
                        height: lightInfo.height, // 光源高度，默认为10
                        position: lightInfo.position, // 光源位置
                        rotation: lightInfo.rotation // 光源旋转角度
                    })
                    rectAreaLight.visible = lightInfo.visible
                    break
            }
        }
    }

    /**
     * 渲染控制器
     * @author LL
     * @since 2021/07/26
     * @category 方法
     * @private
     */
    private initControl() {
        this.controls = new TControl(this)

        // 处理各种控制器
        if (this.sceneData.helper.axes.active) {
            this.helper.initAxes(this.sceneData.helper.axes.length)
        }
        if (this.sceneData.helper.view.active) {
            const cfg = this.sceneData.helper.view as { width?: number; height?: number }
            this.helper.initView(this.camera.camera, this.container, {
                width: cfg.width,
                height: cfg.height,
            })
        }
        if (this.sceneData.helper.grid.active) {
            this.helper.initGrid(this.sceneData.helper.grid)
        }
        if (this.sceneData.controls.orbit.active) {
            this.controls.initOrbit()
        }
        // 绑定 ViewHelper.center = OrbitControls.target，实现互相跟随
        if (this.sceneData.helper.view.active && this.helper.view && this.controls.orbit) {
            this.helper.view.center = this.controls.orbit.target
        }
        if (this.sceneData.helper.view.active && this.helper.viewContainer) {
            // 点击叠加层时切换主场景视角，capture 拦截以免被 OrbitControls 抢走
            const onViewMouseDown = (e: MouseEvent) => {
                if (this.helper.view && this.helper.handleViewClick(e)) {
                    e.preventDefault()
                    e.stopPropagation()
                }
            }
            this.helper.viewContainer.addEventListener('mousedown', onViewMouseDown, true)
        }
        if (this.sceneData.controls.raycaster.active) {
            this.controls.initRaycaster(this.sceneData.controls.raycaster.events)
        }
        if (this.sceneData.controls.transform.active) {
            this.controls.initTransform()
        }
        if (this.sceneData.controls.drag.active) {
            this.controls.initDrag()
        }
    }

    /**
     * 关联模型
     * @author LL
     * @since 2024/07/02
     * @category 方法
     * @private
     */
    private initAttach() {
        this.sceneData.attachList.forEach((attach) => {
            let parent = this.scene.getObjectByProperty('name', attach.parent)
            let child = this.scene.getObjectByProperty('name', attach.child)
            if (parent && child) {
                if (attach.type == 'arm&jaw') {
                    parent = parent.getObjectByProperty('name', attach.armEnd)
                }
                this.animate.attachModel(parent, child)
            } else {
                console.error('关联模型失败', attach)
            }
        })
    }

    /**
     * 添加标记
     * @author LL
     * @since 2024/07/04
     * @private
     * @category 方法
     */
    private loadMarker() {
        this.sceneData.markerList.forEach((item: any) => {
            let model = this.scene.getObjectByProperty('name', item.modelName)

            if (model) {
                this.marker.addMarker(model, item.configs.html, {
                    modelName: item.markerName,
                    position: item.position,
                    base: item.base,
                    configs: item.configs
                })
            }
        })
    }

    /**
     * 显示性能监控器
     * @author LL
     * @since 2022/07/28
     * @category 方法
     * @private
     */
    private showStats() {
        this.stats = new Stats()
        this.stats.dom.style.position = 'absolute' // 样式， 坐标
        this.stats.dom.style.left = '0px'
        this.stats.dom.style.top = '0px'
        this.stats.dom.style.zIndex = '100'
        this.container.appendChild(this.stats.dom) // 添加到canvas-frame
        // this.stats.setMode(this.sceneData.scene.stats.mode);
    }
}

//@ts-ignore
window['ThingOrigin'] = ThingOrigin
