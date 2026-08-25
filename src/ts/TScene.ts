/**
 * @module
 * @mergeModuleWith <project>
 */

import {
    AnimationMixer,
    BackSide,
    Color,
    CubeTextureLoader,
    EquirectangularReflectionMapping,
    LoopOnce,
    Mesh,
    Object3D,
    PMREMGenerator,
    Scene,
    TextureLoader,
    SphereGeometry,
    ShaderMaterial,
    Vector3,
    Vector2,
    Group,
    LoadingManager,
    Frustum,
    Matrix4,
    Camera,
    FogExp2,
    Fog,
    SRGBColorSpace,
    LoopRepeat,
    AnimationAction,
    Material
} from 'three'
import { MeshBasicNodeMaterial, PMREMGenerator as WebGPUPMREMGenerator } from 'three/webgpu'
import {
    Fn,
    color,
    float,
    vec3,
    mix,
    pow,
    max,
    clamp,
    normalize,
    select,
    positionWorld,
    screenUV
} from 'three/tsl'
import { ThingOrigin } from '../ThingOrigin'
import { merge, cloneDeep } from 'lodash-es'

import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment'

import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader'
import { SkyMesh } from 'three/examples/jsm/objects/SkyMesh'
import { TModel } from './TModel'
import { cubeMapParams, EquirectangularReflectionMappingConfigParams, xyz } from './scenePrams'
import { modelInfoParams } from './TModelInterfaces'
import { setModelConfig } from '../private/privateTool'
import { fogParams, environmentParams, backgroundParams } from './scenePrams'

/**
 * 场景
 */
export class TScene extends Scene {
    private TO: ThingOrigin
    private model: TModel
    public ground: Object3D = null

    // 模型加载状态管理属性
    private loadingCount: number = 0
    private loadedCount: number = 0
    private loadingModels: Set<string> = new Set()
    private loadedModels: Set<string> = new Set()
    private loadingStartedAt: number | null = null // 模型加载开始时间
    private loadingTotalElapsedMs: number | null = null
    private loadingReported = false
    /** 批量 loadModel：按入屏+失败计数，不依赖 loadingModels Set */
    private batchLoadTotal = 0
    private onAllLoadedCallback?: () => void
    private onProgressCallback?: (progress: number) => void
    private onErrorCallback?: (error: Error) => void

    // 性能优化：视锥剔除相关属性
    private frustum: Frustum = new Frustum()
    private projScreenMatrix: Matrix4 = new Matrix4()
    private enableFrustumCulling: boolean = false

    // 性能优化：距离剔除相关属性
    private enableDistanceCulling: boolean = false
    private maxRenderDistance: number = 1000 // 最大渲染距离
    private cullingStats = {
        total: 0,
        visible: 0,
        frustumCulled: 0,
        distanceCulled: 0
    }

    constructor(TO: ThingOrigin) {
        super()
        this.TO = TO
        this.model = new TModel(TO)

        // 设置LoadingManager的回调函数
        this.setupLoadingManager()
    }
    // 添加 traverse 方法
    traverse(callback: (node: any) => void) {
        callback(this) // 首先处理当前场景节点
        // 假设 this.children 是一个包含所有子场景节点的数组
        for (const child of this.children) {
            // 确保孩子是场景节点类型
            child.traverse(callback) // 递归遍历每个子节点
        }
    }

    /**
     * 创建地面
     * @author LL
     * @since 2025/07/15
     * @private
     */
    public async setGround(groundInfo?: any) {
        let defaultGroundInfo = {
            active: true,
            base: {
                type: 'rect',
                rect: {
                    width: 10000,
                    height: 10000
                }
            },
            position: {
                x: 0,
                y: -0.001,
                z: 0
            },
            material: {
                type: 'image',
                doubleSide: true,
                color: {
                    color: '#eee',
                    opacity: 1
                },
                image: {
                    url: this.TO.sceneData.params.resource.serverAddress + '/image/download/grass.jpg',
                    repeatX: 300,
                    repeatY: 300
                }
            }
        }

        let ground = merge(defaultGroundInfo, groundInfo)

        // 若未启用地面，直接清理并返回
        if (!ground.active) {
            if (this.ground) {
                this.remove(this.ground)
                this.ground = null as any
            }
            return
        }

        if (this.ground) {
            this.remove(this.ground)
        }

        this.ground = await this.model.initPlane(ground)
        this.ground.name = 'TO-ground'
        this.add(this.ground)
    }

    /**
     * 设置场景背景
     * @author LL
     * @since 2024/06/17
     */
    public setBackground(backgroundParams?: backgroundParams) {
        let defaultBackgroundParams = merge(this.TO.sceneData.scene.background, backgroundParams || {})
        switch (defaultBackgroundParams.type) {
            case 'sky':
                this.initSky(defaultBackgroundParams.sky)
                break
            case 'sky-physical':
                this.initPhysicalSky((defaultBackgroundParams as any).skyPhysical)
                break
            case 'color':
                this.setBackgroundColor({
                    color: defaultBackgroundParams.color.color,
                    alpha: defaultBackgroundParams.color.alpha
                })
                break
            case 'img':
                this.setBackgroundImg(defaultBackgroundParams.img.url)
                break
            case 'cubeMap': //环境贴图
                this.setBackgroundCubeMap(defaultBackgroundParams.cubeMap)
                break
            case 'workshop': //车间
                let workShopInfo = merge(defaultBackgroundParams.workshop, {
                    base: {
                        modelUrl: defaultBackgroundParams.workshop.base.modelUrl
                    }
                })
                this.setWorkshop(workShopInfo)
                break
        }
        this.backgroundIntensity = defaultBackgroundParams.intensity || 1
    }

    /**
     * 设置场景雾效
     * @author gj
     * @since 2025/11/13
     */
    public setFog(fogParams?: fogParams) {
        let defaultFogParams = merge(this.TO.sceneData.scene.fog, fogParams || {})
        console.log('🚀 ~ TScene ~ setFog ~ defaultFogParams:', defaultFogParams)
        if (defaultFogParams.active)
            defaultFogParams.cameraView
                ? (this.fog = new FogExp2(defaultFogParams.color))
                : (this.fog = new Fog(defaultFogParams.color))
    }

    /**
     * 清理当前背景相关对象，确保背景互斥
     * - 移除天空体 `sky`
     * - 移除厂房模型 `TO_workshop`
     * - 清空场景 `background`
     */
    private clearBackgroundArtifacts(type: 'sky' | 'color' | 'img' | 'cubeMap' | 'workshop'): void {
        const sky: Mesh | null = this.getObjectByName('sky') as Mesh
        if (sky) {
            // 如果是屏幕空间模式，清理事件监听器
            if (sky.userData._resizeHandler) {
                window.removeEventListener('resize', sky.userData._resizeHandler)
                delete sky.userData._resizeHandler
            }
            // 清理材质和几何体资源
            if (sky.material && typeof (sky.material as any).dispose === 'function') {
                ;(sky.material as any).dispose()
            }
            if (sky.geometry && typeof sky.geometry.dispose === 'function') {
                sky.geometry.dispose()
            }
            this.remove(sky)
        }

        // 非 workshop 类型时清理已有的厂房模型
        if (type !== 'workshop') {
            const workshop = this.getObjectByProperty('name', 'TO_workshop')
            if (workshop) {
                this.remove(workshop)
            }
        }

        // 释放旧背景纹理占用（Color 无需处理）
        const currentBg: any = this.background as any
        if (currentBg && currentBg.isTexture && typeof currentBg.dispose === 'function') {
            currentBg.dispose()
        }
        this.background = null
    }

    /**
     * 创建天空盒（场景背景互斥，只显示一种）
     * 支持两种渐变模式：
     * 1. 世界空间渐变（默认）：基于世界坐标，随相机旋转而变化
     * 2. 屏幕空间渐变：基于屏幕坐标，始终相对于屏幕保持上白下黑
     * @author LL gj
     * @since 25/04/2022
     * @param skyParams 天空盒参数
     * @param skyParams.params.spaceType - 渐变空间类型：'world'（世界空间，默认）或 'screen'（屏幕空间）
     * @param skyParams.params.radius - 天空盒半径
     * @param skyParams.params.widthSegments - 宽度分段数
     * @param skyParams.params.heightSegments - 高度分段数
     * @param skyParams.params.skyCenter - 天空盒中心点（世界空间模式使用）
     * @param skyParams.color.top - 顶部颜色
     * @param skyParams.color.line - 中间线颜色（世界空间模式使用）
     * @param skyParams.color.bottom - 底部颜色
     * @param skyParams.params.offset - 偏移量（世界空间模式使用，默认400）
     * @param skyParams.params.exponent - 渐变指数（默认0.9，屏幕空间模式建议0.3-0.5）
     */
    public initSky(skyParams: any) {
        // 背景互斥：清空其它背景
        this.clearBackgroundArtifacts('sky')

        // 获取渐变空间类型，默认为世界空间
        const spaceType = skyParams.params?.spaceType || 'world'
        const radius = skyParams.params?.radius || 1000
        const widthSegments = skyParams.params?.widthSegments || 32
        const heightSegments = skyParams.params?.heightSegments || 32
        const offset = skyParams.params?.offset !== undefined ? skyParams.params.offset : 400
        const exponent = skyParams.params?.exponent !== undefined ? skyParams.params.exponent : 0.9

        // 相机距离应该大于天空盒半径，否则无法看到天空
        const skyGeo = new SphereGeometry(radius, widthSegments, heightSegments)

        let skyMat: Material
        if (this.TO?.renderer?.isWebGPU) {
            skyMat = this.createWebGPUSkyMat(skyParams, spaceType, offset, exponent)
        } else {
            skyMat = this.createGLSkyMat(skyParams, spaceType, offset, exponent)
        }

        const sky = new Mesh(skyGeo, skyMat)
        sky.name = 'sky'
        sky.userData.selectable = false

        // 屏幕空间 GL 天空：监听窗口大小变化，更新 resolution uniform
        if (
            spaceType === 'screen' &&
            !this.TO?.renderer?.isWebGPU &&
            skyMat instanceof ShaderMaterial &&
            this.TO?.renderer?.renderer
        ) {
            const updateResolution = () => {
                const renderer = this.TO.renderer.renderer
                if (renderer && skyMat instanceof ShaderMaterial && skyMat.uniforms.resolution) {
                    skyMat.uniforms.resolution.value.set(
                        renderer.domElement.width || window.innerWidth,
                        renderer.domElement.height || window.innerHeight
                    )
                }
            }
            window.addEventListener('resize', updateResolution)
            sky.userData._resizeHandler = updateResolution
            sky.userData._spaceType = 'screen'
        } else {
            sky.userData._spaceType = spaceType === 'screen' ? 'screen' : 'world'
        }

        this.add(sky)
    }

    /**
     * 真实感物理天空（基于 r185 SkyMesh：Preetham 大气散射 + 太阳圆盘 + 云）
     * @author gj
     * @since 2026/07/20
     * @param skyPhysicalParams 物理天空参数（见 sceneParams.js → background.skyPhysical）
     * @note 统一使用 SkyMesh（NodeMaterial/TSL 实现），仅 WebGPU 渲染器可用；
     *       若场景为 renderer='webgl'，则使用渐变天空 background.type='sky'。
     */
    public initPhysicalSky(skyPhysicalParams: any) {
        // 背景互斥：清空其它背景（复用 'sky' 命名，便于 clearBackgroundArtifacts 统一清理）
        this.clearBackgroundArtifacts('sky')

        const p = skyPhysicalParams || {}
        const scale = p.scale ?? 10000
        const turbidity = p.turbidity ?? 2
        const rayleigh = p.rayleigh ?? 1
        const mieCoefficient = p.mieCoefficient ?? 0.005
        const mieDirectionalG = p.mieDirectionalG ?? 0.8
        const showSunDisc = p.showSunDisc !== false

        // 太阳位置：仰角/方位角（度）→ 球坐标方向向量
        const elevation = p.sun?.elevation ?? 2 // 0=地平线，90=天顶
        const azimuth = p.sun?.azimuth ?? 180 // 0-360，正北=0
        const phi = ((90 - elevation) * Math.PI) / 180
        const theta = (azimuth * Math.PI) / 180
        const sunPosition = new Vector3()
        sunPosition.setFromSphericalCoords(1, phi, theta)

        const sky = new SkyMesh()
        sky.scale.setScalar(scale)
        sky.turbidity.value = turbidity
        sky.rayleigh.value = rayleigh
        sky.mieCoefficient.value = mieCoefficient
        sky.mieDirectionalG.value = mieDirectionalG
        sky.sunPosition.value.copy(sunPosition)
        sky.showSunDisc.value = showSunDisc ? 1 : 0

        // 云（SkyMesh 内置）
        const clouds = p.clouds
        if (clouds && clouds.active !== false) {
            sky.cloudCoverage.value = clouds.coverage ?? 0.4
            sky.cloudDensity.value = clouds.density ?? 0.4
            sky.cloudScale.value = clouds.scale ?? 0.0002
            sky.cloudSpeed.value = clouds.speed ?? 0.0001
            sky.cloudElevation.value = clouds.elevation ?? 0.5
        } else {
            sky.cloudCoverage.value = 0 // 关闭云
        }

        sky.name = 'sky'
        sky.userData.selectable = false
        this.add(sky)
    }

    /** WebGL 渐变天空（ShaderMaterial，仅 WebGL 后端） */
    private createGLSkyMat(
        skyParams: any,
        spaceType: string,
        offset: number,
        exponent: number
    ): ShaderMaterial {
        let vertexShader: string
        let fragmentShader: string
        let uniforms: any

        if (spaceType === 'screen') {
            const renderer = this.TO?.renderer?.renderer
            const resolution = renderer
                ? new Vector2(
                      renderer.domElement.width || window.innerWidth,
                      renderer.domElement.height || window.innerHeight
                  )
                : new Vector2(window.innerWidth, window.innerHeight)

            uniforms = {
                topColor: { value: new Color(skyParams.color.top) },
                bottomColor: { value: new Color(skyParams.color.bottom) },
                offset: { value: skyParams.params?.offset || 0 },
                exponent: { value: exponent },
                resolution: { value: resolution }
            }

            vertexShader = `
                void main() {
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `

            fragmentShader = `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                uniform vec2 resolution;
                void main() {
                    float screenY = gl_FragCoord.y / resolution.y;
                    float t = screenY;
                    t = clamp(t + offset, 0.0, 1.0);
                    t = pow(t, exponent);
                    vec3 color = mix(bottomColor, topColor, t);
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        } else {
            const skyCenter = skyParams.params?.skyCenter
                ? new Vector3(
                      skyParams.params.skyCenter.x,
                      skyParams.params.skyCenter.y,
                      skyParams.params.skyCenter.z
                  )
                : new Vector3()

            uniforms = {
                topColor: { value: new Color(skyParams.color.top) },
                skylineColor: { value: new Color(skyParams.color.line) },
                bottomColor: { value: new Color(skyParams.color.bottom) },
                offset: { value: offset },
                exponent: { value: exponent },
                skyCenter: { value: skyCenter }
            }

            vertexShader = `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `

            fragmentShader = `
                uniform vec3 topColor;
                uniform vec3 skylineColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                uniform vec3 skyCenter;
                varying vec3 vWorldPosition;
                void main() {
                    vec3 position = vec3(vWorldPosition.x - skyCenter.x, vWorldPosition.y - skyCenter.y, vWorldPosition.z - skyCenter.z);
                    float h = normalize(position + offset).y;
                    vec3 color;
                    if (h > 0.0) {
                        color = mix(skylineColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
                    } else {
                        color = mix(skylineColor, bottomColor, max(pow(max(-h, 0.0), exponent), 0.0));
                    }
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        }

        return new ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader,
            side: BackSide,
            depthWrite: false
        })
    }

    /** WebGPU 渐变天空（MeshBasicNodeMaterial + TSL，兼容 NodeBuilder / SSR） */
    private createWebGPUSkyMat(
        skyParams: any,
        spaceType: string,
        offset: number,
        exponent: number
    ): MeshBasicNodeMaterial {
        const skyMat = new MeshBasicNodeMaterial()
        skyMat.side = BackSide
        skyMat.depthWrite = false

        const topCol = color(new Color(skyParams.color.top))
        const lineCol = color(new Color(skyParams.color.line ?? skyParams.color.top))
        const bottomCol = color(new Color(skyParams.color.bottom))
        const exp = float(exponent)

        if (spaceType === 'screen') {
            const off = float(skyParams.params?.offset ?? 0)
            skyMat.colorNode = Fn(() => {
                const t = clamp(screenUV.y.add(off), float(0), float(1))
                return mix(bottomCol, topCol, pow(t, exp))
            })()
        } else {
            const skyCenter = skyParams.params?.skyCenter ?? { x: 0, y: 0, z: 0 }
            const center = vec3(skyCenter.x, skyCenter.y, skyCenter.z)
            const off = float(offset)
            skyMat.colorNode = Fn(() => {
                const pos = positionWorld.sub(center)
                const h = normalize(pos.add(off)).y
                const upper = mix(lineCol, topCol, pow(max(h, float(0)), exp))
                const lower = mix(lineCol, bottomCol, pow(max(h.negate(), float(0)), exp))
                return select(h.greaterThan(float(0)), upper, lower)
            })()
        }

        return skyMat
    }

    /**
     * 设置背景颜色
     * @author LL
     * @since 2023/11/09
     */
    public setBackgroundColor(bgColor: any) {
        // 背景互斥：清空其它背景
        this.clearBackgroundArtifacts('color')

        if (bgColor.alpha != 1) {
            this.TO.renderer.renderer.setClearColor(bgColor.color, bgColor.alpha) //default
            this.background = null
        } else {
            this.background = new Color(bgColor.color)
        }
    }

    /**
     * 设置背景环境贴图
     * @author LL
     * @since 2023/11/09
     * @param {cubeMapParams} cubeMap
     */
    public setBackgroundCubeMap(cubeMap: cubeMapParams) {
        // 背景互斥：清空其它背景
        this.clearBackgroundArtifacts('cubeMap')
        const envMap = new CubeTextureLoader().load(cubeMap.url)
        this.background = envMap
    }

    /**
     * 设置背景为厂房
     * @author LL
     * @since 2025/07/18
     * @param workShopInfo
     */
    public setWorkshop(workShopInfo?: modelInfoParams) {
        // 背景互斥：清空其它背景
        this.clearBackgroundArtifacts('workshop')

        // 为避免重复，若已存在 TO_workshop 则先移除
        const existingWorkshop = this.getObjectByName('TO_workshop')
        if (existingWorkshop) {
            this.remove(existingWorkshop)
        }

        // 绝对地址直接用；相对路径拼接资源服务器前缀
        const rawModelUrl = workShopInfo?.base?.modelUrl ?? ''
        const modelUrl = /^https?:\/\//i.test(rawModelUrl)
            ? rawModelUrl
            : this.TO.sceneData.params.resource.serverAddress + rawModelUrl

        let defaultParams = {
            id: workShopInfo?.id,
            modelType: workShopInfo?.modelType,
            modelName: 'TO_workshop',
            material: {
                metalness: 0
            },
            base: {
                modelUrl
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            position: {
                x: 0,
                y: -0.01,
                z: 0
            },
            rotation: {
                x: 0,
                y: 1.57,
                z: 0
            }
        }

        // merge 后强制写回解析后的 modelUrl，避免相对路径覆盖拼接结果
        let accessInfo = workShopInfo ? merge(defaultParams, workShopInfo) : defaultParams
        accessInfo.base.modelUrl = modelUrl

        this.model.loadModel(accessInfo).then((model: Object3D) => {
            if (model) this.add(model)
        })
    }

    public setEnvironment(environmentParams?: environmentParams) {
        let defaultEnvironmentParams = merge(this.TO.sceneData.scene.environment, environmentParams || {})
        switch (defaultEnvironmentParams.type) {
            case 'roomEnvironment':
                this.setRoomEnvironment()
                break
            case 'EquirectangularReflectionMapping':
                this.setEquirectangularReflectionMapping(
                    this.TO.sceneData.scene.environment.EquirectangularReflectionMappingConfig
                )
                break
            case 'HDR':
                //加载 HDR 后，用 PMREMGenerator 将其转为 PMREM 格式纹理，再用处理后的纹理
                // 1. 支持 “粗糙度关联反射”（粗糙物体反射模糊，光滑物体反射清晰）；
                // 2. 光照 / 反射更真实，符合物理渲染（PBR）逻辑
                const hdrLoader = new HDRLoader()
                const hdrUrl =
                    '' +
                    this.TO.sceneData.params.resource.serverAddress +
                    this.TO.sceneData.scene.environment.HDRConfig.url
                hdrLoader.load(
                    hdrUrl,
                    (texture) => {
                        texture.mapping = EquirectangularReflectionMapping // HDR纹理设置
                        // 使用 PMREMGenerator 将 HDR 纹理转换为 PMREM 格式（WebGL/WebGPU 均支持）
                        const pmremGenerator = this.createPMREMGenerator()
                        if (!pmremGenerator) {
                            texture.dispose()
                            return
                        }
                        const envMap = pmremGenerator.fromEquirectangular(texture).texture
                        // 设置环境贴图：用于物体的反射和光照
                        this.environment = envMap
                        // 设置背景：将 HDR 显示为场景背景
                        if (this.TO.sceneData.scene.environment.HDRConfig.background) this.background = envMap
                        // 释放原始纹理和 PMREMGenerator 资源
                        texture.dispose()
                        pmremGenerator.dispose()
                        console.log('HDR环境贴图加载完成', hdrUrl)
                    },
                    undefined,
                    (error) => {
                        console.error('HDR环境贴图加载失败:', error)
                    }
                )
                break
            default:
                break
        }
        this.environmentIntensity = defaultEnvironmentParams.intensity || 1
    }

    /**
     * 设置环境光
     * @author LL
     * @since 2023/11/08
     */
    public setRoomEnvironment() {
        const pmremGenerator = this.createPMREMGenerator()
        if (!pmremGenerator) return

        const envMap = pmremGenerator.fromScene(new RoomEnvironment()).texture

        this.environment = envMap
        pmremGenerator.dispose()
    }

    /**
     * 设置环境经纬线映射贴图
     * @author gj
     * @since 2023/11/07
     * @param {EquirectangularReflectionMappingConfigParams} config
     */
    public setEquirectangularReflectionMapping(config: EquirectangularReflectionMappingConfigParams) {
        new HDRLoader().load(config.url, (texture) => {
            texture.mapping = EquirectangularReflectionMapping
            this.environment = texture
        })
    }

    /**
     * 创建与当前渲染后端匹配的 PMREMGenerator
     * - WebGL：使用 three 的 PMREMGenerator（src/extras）
     * - WebGPU：使用 three/webgpu 的 PMREMGenerator（src/renderers/common/extras），接受统一 Renderer
     * 修复 r165→r185：原实现硬依赖 webglRenderer，WebGPU 下环境贴图被静默丢弃，导致 PBR 金属件发黑
     * @returns PMREMGenerator 实例；渲染器不存在时返回 null
     * @author gj
     * @since 2026/07/20
     */
    private createPMREMGenerator(): any {
        const renderer = this.TO.renderer.renderer
        if (!renderer) return null
        return this.TO.renderer.isWebGPU
            ? new WebGPUPMREMGenerator(renderer as any)
            : new PMREMGenerator(renderer as any)
    }

    /**
     * 设置背景图片
     * @author LL
     * @since 2021/08/26
     * @param {string} url
     */
    public setBackgroundImg(url: string) {
        // 背景互斥：清空其它背景
        this.clearBackgroundArtifacts('img')
        this.background = new TextureLoader().load(url)
    }

    /**
     * 克隆模型
     * @author LL
     * @param {Object3D} targetModel 被克隆的模型
     * @param {xyz} position 克隆模型摆放位置
     * @category 方法
     */
    public cloneObject(targetModel: Object3D, position: xyz): Group {
        if (!targetModel) {
            console.warn('克隆失败失败，物体不存在')
            return
        }

        let group = new Group()
        let cloneObj = targetModel.clone()
        targetModel.parent.matrixWorld.decompose(group.position, group.quaternion, group.scale)
        group.updateMatrixWorld(true)
        targetModel.matrixWorld.decompose(cloneObj.position, cloneObj.quaternion, cloneObj.scale)
        cloneObj.updateMatrixWorld(true)
        cloneObj.position.set(position.x, position.y, position.z)
        group.attach(cloneObj)

        return group
    }

    /**
     * 根据模型名称获取模型
     * @author LL
     * @since 2025/06/17
     * @param {string} name 模型名称
     * @param {string} parentName 父级名称
     */
    public getModelByName(name: string, parentName?: string): Object3D | null {
        let model = parentName
            ? this.getObjectByProperty('name', parentName)?.getObjectByProperty('name', name)
            : this.getObjectByProperty('name', name)
        return model
    }

    /**
     * 删除模型（模型名称）
     * @author gj
     * @param {string} name 模型名称
     * @param {string} parentName 父级名称
     */
    public removeModelByName(name: string, parentName?: string): void {
        let obj = parentName
            ? this.getObjectByProperty('name', parentName)?.getObjectByProperty('name', name)
            : this.getObjectByProperty('name', name)
        if (!obj) {
            console.warn('删除模型失败，物体不存在')
            return
        }

        obj.traverse((child: any) => {
            if (obj.uuid != child.uuid) {
                if (child.isCSS2DObject && child.parent) {
                    this.TO.marker.removeMarker(child.parent)
                }
            }
            //删除模型缓冲区存储顶点数据
            if (child['material']) {
                //todo  将material 等材质单独成类管理
                if (Array.isArray(child['material'])) {
                    for (let i = 0; i < child['material'].length; i++) {
                        child['material'][i].dispose()
                    }
                } else {
                    child['material'].dispose()
                }
            }

            if (child['geometry']) child['geometry'].dispose()
        })
        obj.parent.remove(obj)
        this.TO.helper.removeBox()
    }

    /**
     * 播放模型内置动画(gltf)
     * @author LL gj
     * @since 2023/10/08
     * @param {Object3D} model 含动画模型
     * @param {(number[] | number)} index 播放动画的下标
     * @param {boolean} loop 是否循环播放
     * @param {number} timeScale 动画时间缩放倍数
     * @returns {Promise<void>} 动画播放完成时 resolve
     */
    public playAnimation(
        model: Object3D,
        index: number[] | number,
        loop: boolean,
        timeScale: number = 1
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                // 如果已存在混合器，先停止所有动画
                if (this.TO.mixer) {
                    this.TO.mixer.stopAllAction()
                }
                //@ts-ignore
                this.TO.mixer = new AnimationMixer(model)

                const animationsToPlay: AnimationAction[] = []
                let animationsCount = 0

                if (Array.isArray(index)) {
                    console.log('数组类型,要求播放多个动画')
                    // 播放多个动画
                    index.forEach((i) => {
                        if (model.animations[i]) {
                            let action = this.TO.mixer.clipAction(model.animations[i])
                            if (loop) {
                                action.clampWhenFinished = true
                                action.loop = LoopRepeat
                            } else {
                                action.clampWhenFinished = true
                                action.loop = LoopOnce
                                // 为单次播放的动画添加完成监听
                                action.clampWhenFinished = true
                                animationsCount++
                            }
                            action.timeScale = timeScale
                            action.play()
                            animationsToPlay.push(action)
                        } else {
                            console.warn('模型不存在下标为' + i + '的动画')
                        }
                    })
                } else {
                    if (model.animations[index as number]) {
                        let action = this.TO.mixer.clipAction(model.animations[index as number])
                        if (loop) {
                            action.clampWhenFinished = true
                            action.loop = LoopRepeat
                        } else {
                            action.clampWhenFinished = true
                            action.loop = LoopOnce
                            animationsCount = 1
                        }
                        action.timeScale = timeScale
                        action.play()
                        animationsToPlay.push(action)
                    } else {
                        const error = new Error('模型不存在下标为' + index + '的动画')
                        console.warn(error.message)
                        reject(error)
                        return
                    }
                }

                // 如果不需要等待动画完成（循环播放或空动画），立即resolve
                if (loop || animationsCount === 0) {
                    resolve()
                    return
                }

                // 监听动画完成事件
                const onAnimationFinished = () => {
                    animationsCount--
                    if (animationsCount === 0) {
                        this.TO.mixer.removeEventListener('finished', onAnimationFinished)
                        resolve()
                    }
                }

                // 添加完成监听
                this.TO.mixer.addEventListener('finished', onAnimationFinished)
            } catch (error) {
                console.error('播放动画失败:', error)
                reject(error)
            }
        })
    }

    /**
     * 停止模型内置动画(gltf)
     * @author gj
     * @since 2025/11/18
     * @param {Object3D} model 模型对象
     * @param {number} index 动画下标
     * @returns {Promise<void>} 停止成功时 resolve，失败时 reject
     */
    public stopAnimation(model: Object3D, index: number): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.TO.mixer) {
                const error = new Error('未找到动画混合器')
                console.warn(error.message)
                reject(error)
                return
            }

            // 检查动画是否存在
            if (model.animations && model.animations[index]) {
                const clip = model.animations[index]
                const action = this.TO.mixer.existingAction(clip)

                if (action) {
                    action.stop()
                    console.log(`已停止动画: ${index}`)
                    resolve()
                } else {
                    const error = new Error(`未找到下标为 ${index} 的动画动作`)
                    console.warn(error.message)
                    reject(error)
                }
            } else {
                const error = new Error(`模型不存在下标为 ${index} 的动画`)
                console.warn(error.message)
                reject(error)
            }
        })
    }

    /**
     * 获取升序模型名称
     * @author LL
     * @since 2024/10/21
     * @param {string} modelName
     */
    public getOrderModelName(modelName: string) {
        let id = 1
        while (this.getObjectByName(modelName + '-' + id)) {
            id++
        }
        return { modelName: modelName + '-' + id, id: id }
    }

    /**
     * 克隆模型
     * @author LL
     * @since 2024/09/10
     * @param {Object3D} model
     */
    public cloneModel(model: Object3D, modelInfo: modelInfoParams) {
        if (!model) {
            console.warn('克隆模型失败，物体不存在')
            return
        }

        let cloneModel = model.clone()
        let modelName = this.getOrderModelName(model.name + '-copy').modelName
        cloneModel.name = modelName
        //@ts-ignore
        cloneModel.modelName = modelName
        cloneModel.userData.rootName = modelName
        cloneModel.userData.parent = modelName

        let box = this.TO.tool.getModelBox(cloneModel)
        cloneModel.position.x = model.position.x + (box.max.x - box.min.x) * 1.1

        let cloneInfo = this.TO.tool.getModelInfo(cloneModel)
        let info = merge(cloneDeep(modelInfo), cloneInfo)

        return { model: cloneModel, info: info }
    }

    /**
     * 控制模型显示隐藏
     * @author LL
     * @since 2021/08/16
     * @param {string} name 模型名称
     * @param {boolean} visible 是否可见
     */
    public setVisible(name: string, visible: boolean) {
        let model = this.TO.scene.getObjectByProperty('name', name)
        if (!model) {
            console.warn('物体控制显示隐藏失败，物体不存在')
            return
        }
        model.visible = visible
    }

    /**
     * 生成场景截图
     * @author gj
     * @since 2025/06/09
     * @param resolutionScale 分辨率缩放倍数（默认为 1）
     * @returns Promise<Blob | null> 返回一个包含图像数据的Blob对象或null
     */
    public generateSnapshot(resolutionScale: number = 1): Promise<Blob | null> {
        return new Promise((resolve, reject) => {
            // 渲染当前场景
            this.TO.renderer.renderer.render(this.TO.scene, this.TO.camera.camera)

            try {
                const { width, height } = this.TO.renderer.renderer.getSize(new Vector2())
                const canvasWidth = Math.floor(width * resolutionScale)
                const canvasHeight = Math.floor(height * resolutionScale)

                let tempCanvas: HTMLCanvasElement = document.createElement('canvas')
                tempCanvas.width = canvasWidth
                tempCanvas.height = canvasHeight

                const tempContext = tempCanvas.getContext('2d')
                if (!tempContext) {
                    throw new Error('无法获取canvas上下文')
                }

                // 将WebGL内容绘制到临时canvas中
                const webglCanvas = this.TO.renderer.renderer.domElement
                if (tempCanvas instanceof HTMLCanvasElement) {
                    const destCtx = tempCanvas.getContext('2d')
                    if (destCtx) {
                        destCtx.drawImage(webglCanvas as CanvasImageSource, 0, 0, canvasWidth, canvasHeight)
                    }
                }

                // 使用 toBlob 异步导出图片
                if (tempCanvas instanceof HTMLCanvasElement) {
                    tempCanvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob) // 返回Blob对象
                            } else {
                                reject(new Error('生成Blob失败'))
                            }
                        },
                        'image/webp',
                        1
                    )
                } else {
                    reject(new Error('不支持的canvas类型'))
                }
            } catch (error) {
                console.error('生成快照失败:', error)
                reject(error)
            }
        })
    }

    // ==================== 模型加载状态管理 API ====================

    /**
     * 设置LoadingManager的回调函
     * @author gj
     * @since 2025/09/19
     */
    private setupLoadingManager() {
        // 批量完成由 finishModelLoading / completeModelLoadingBatch 统一管理
        this.model.MANAGER.onLoad = () => {}

        // 监听加载进度
        this.model.MANAGER.onProgress = (url: string, itemsLoaded: number, itemsTotal: number) => {
            const progress = itemsTotal > 0 ? (itemsLoaded / itemsTotal) * 100 : 0
            // console.log(`LoadingManager: 当前加载文件 ${url},加载进度 ${progress.toFixed(1)}% (${itemsLoaded}/${itemsTotal})`)
            this.onProgressCallback?.(progress)
        }

        // 监听加载错误
        this.model.MANAGER.onError = (url: string) => {
            console.error(`LoadingManager: 加载失败 ${url}`)
            this.onErrorCallback?.(new Error(`模型加载失败: ${url}`))
        }
    }

    /**
     * 开始加载模型
     * @author gj
     * @since 2025/09/19
     * @param modelName 模型名称
     */
    private startLoading(modelName: string) {
        if (this.loadingCount === 0) {
            this.loadingReported = false
            this.loadedCount = 0
            this.loadedModels.clear()
            this.loadingStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
        }
        this.loadingCount++
        this.loadingModels.add(modelName)
    }

    private finishLoading(modelName: string) {
        if (!this.loadingModels.has(modelName)) return

        this.loadedCount++
        this.loadedModels.add(modelName)
        this.loadingModels.delete(modelName)
        if (this.batchLoadTotal <= 0) {
            this.tryReportAllLoaded()
        }
    }

    /** 批量加载开始（与 resetModelLoadingStatus 配合） */
    public beginBatchLoad(total: number): void {
        this.batchLoadTotal = total
    }

    /**
     * 批量：已入屏 + 已失败 达到总数时立即打印耗时（在 scene.add 后同步调用）
     */
    public onBatchRenderTick(rendered: number, failed: number): void {
        if (this.loadingReported) return
        if (this.batchLoadTotal <= 0) return
        if (rendered + failed < this.batchLoadTotal) return
        this.reportRenderComplete()
    }

    /** 记录并打印「模型全部渲染完成」耗时（不含 IDB 缓存写入） */
    private reportRenderComplete(): void {
        if (this.loadingReported) return
        if (this.loadingCount <= 0) return

        this.loadingReported = true
        this.batchLoadTotal = 0
        if (this.loadingStartedAt !== null) {
            const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
            const elapsedMs = Math.round(endedAt - this.loadingStartedAt)
            this.loadingTotalElapsedMs = elapsedMs
            console.log(`所有模型渲染完成，总耗时: ${elapsedMs}ms (${(elapsedMs / 1000).toFixed(2)}s)`)
        }
        this.onAllLoadedCallback?.()
    }

    private tryReportAllLoaded(): void {
        if (this.loadingReported) return
        if (this.loadingCount <= 0 || this.loadingModels.size > 0) return
        this.reportRenderComplete()
    }

    /**
     * 批量 loadModel 兜底：若有未 finish 的计数项则清理；已上报则跳过
     */
    public completeModelLoadingBatch(): void {
        if (this.loadingReported) return
        if (this.loadingModels.size > 0) {
            console.warn(`[loadModel 批量] 加载计数未对齐，剩余 ${this.loadingModels.size} 项:`, [
                ...this.loadingModels
            ])
            this.loadingModels.clear()
        }
        this.reportRenderComplete()
    }

    /**
     * 开始加载模型
     * @author gj
     * @since 2025/09/19
     * @param modelName 模型名称
     */
    public startModelLoading(modelName: string): void {
        this.startLoading(modelName)
    }

    /**
     * 完成模型加载
     * @author gj
     * @since 2025/09/19
     * @param modelName 模型名称
     */
    public finishModelLoading(modelName: string): void {
        this.finishLoading(modelName)
    }

    /**
     * 设置所有模型加载完成的回调
     * @author gj
     * @since 2025/09/19
     * @param callback 回调函数
     */
    public onAllModelsLoaded(callback: () => void): void {
        this.onAllLoadedCallback = callback
    }

    /**
     * 设置加载进度回调
     * @author gj
     * @since 2025/09/19
     * @param callback 回调函数
     */
    public onModelLoadingProgress(callback: (progress: number) => void): void {
        this.onProgressCallback = callback
    }

    /**
     * 设置加载错误回调
     * @author gj
     * @since 2025/09/19
     * @param callback 回调函数
     */
    public onModelLoadingError(callback: (error: Error) => void): void {
        this.onErrorCallback = callback
    }

    /**
     * 获取模型加载状态
     * @author gj
     * @since 2025/09/19
     */
    public getModelLoadingStatus() {
        return {
            loadingCount: this.loadingCount,
            loadedCount: this.loadedCount,
            loadingModels: Array.from(this.loadingModels),
            loadedModels: Array.from(this.loadedModels),
            isAllLoaded: this.loadingModels.size === 0 && this.loadingCount > 0,
            totalElapsedMs: this.loadingTotalElapsedMs
        }
    }

    /**
     * 重置模型加载状态
     * @author gj
     * @since 2025/09/19
     */
    public resetModelLoadingStatus(): void {
        this.loadingCount = 0
        this.loadedCount = 0
        this.loadingModels.clear()
        this.loadedModels.clear()
        this.loadingStartedAt = null
        this.loadingTotalElapsedMs = null
        this.loadingReported = false
        this.batchLoadTotal = 0
    }

    // ==================== 性能优化：视锥剔除和距离剔除 ====================

    /**
     * 启用视锥剔除
     * @author LL
     * @since 2025/10/14
     * @param enabled 是否启用
     * @example
     * TO.scene.setFrustumCulling(true); // 启用视锥剔除
     */
    public setFrustumCulling(enabled: boolean) {
        this.enableFrustumCulling = enabled
        console.log(`视锥剔除已${enabled ? '启用' : '禁用'}`)
    }

    /**
     * 启用距离剔除
     * @author LL
     * @since 2025/10/14
     * @param enabled 是否启用
     * @param maxDistance 最大渲染距离（默认1000）
     * @example
     * TO.scene.setDistanceCulling(true, 500); // 启用距离剔除，最大距离500
     */
    public setDistanceCulling(enabled: boolean, maxDistance: number = 1000) {
        this.enableDistanceCulling = enabled
        this.maxRenderDistance = maxDistance
        console.log(`距离剔除已${enabled ? '启用' : '禁用'}，最大距离: ${maxDistance}`)
    }

    /**
     * 执行视锥剔除（在渲染循环中调用）
     * @author LL
     * @since 2025/10/14
     * @param camera 当前相机
     * @example
     * TO.scene.performFrustumCulling(TO.camera.camera);
     */
    public performFrustumCulling(camera: Camera) {
        if (!this.enableFrustumCulling) return

        // 更新视锥体
        this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix)

        // 重置统计
        this.cullingStats.total = 0
        this.cullingStats.visible = 0
        this.cullingStats.frustumCulled = 0

        // 遍历场景中的所有对象
        this.traverse((obj) => {
            // 只处理网格对象，跳过辅助对象、光源等
            if (obj.isMesh || obj.isLine || obj.isPoints) {
                this.cullingStats.total++

                // 检查对象是否在视锥体内
                const isInFrustum = this.frustum.intersectsObject(obj)

                if (!isInFrustum) {
                    obj.visible = false
                    this.cullingStats.frustumCulled++
                } else {
                    obj.visible = true
                    this.cullingStats.visible++
                }
            }
        })
    }

    /**
     * 执行距离剔除（在渲染循环中调用）
     * @author LL
     * @since 2025/10/14
     * @param camera 当前相机
     * @example
     * TO.scene.performDistanceCulling(TO.camera.camera);
     */
    public performDistanceCulling(camera: Camera) {
        if (!this.enableDistanceCulling) return

        const cameraPosition = new Vector3()
        camera.getWorldPosition(cameraPosition)

        // 重置统计
        this.cullingStats.distanceCulled = 0

        this.traverse((obj) => {
            // 只处理网格对象
            if (obj.isMesh || obj.isLine || obj.isPoints) {
                const objectPosition = new Vector3()
                obj.getWorldPosition(objectPosition)

                const distance = cameraPosition.distanceTo(objectPosition)

                if (distance > this.maxRenderDistance) {
                    obj.visible = false
                    this.cullingStats.distanceCulled++
                }
            }
        })
    }

    /**
     * 执行所有剔除优化（视锥+距离）
     * @author LL
     * @since 2025/10/14
     * @param camera 当前相机
     * @example
     * // 在渲染循环中调用
     * TO.scene.performCulling(TO.camera.camera);
     */
    public performCulling(camera: Camera) {
        // 先执行视锥剔除
        if (this.enableFrustumCulling) {
            this.performFrustumCulling(camera)
        }

        // 再执行距离剔除（对视锥内的对象进一步筛选）
        if (this.enableDistanceCulling) {
            this.performDistanceCulling(camera)
        }
    }

    /**
     * 获取剔除统计信息
     * @author LL
     * @since 2025/10/14
     * @returns 剔除统计对象
     * @example
     * const stats = TO.scene.getCullingStats();
     * console.log(`总计: ${stats.total}, 可见: ${stats.visible}, 剔除: ${stats.frustumCulled + stats.distanceCulled}`);
     */
    public getCullingStats() {
        return {
            ...this.cullingStats,
            totalCulled: this.cullingStats.frustumCulled + this.cullingStats.distanceCulled,
            cullingRate:
                this.cullingStats.total > 0
                    ? (
                          ((this.cullingStats.frustumCulled + this.cullingStats.distanceCulled) /
                              this.cullingStats.total) *
                          100
                      ).toFixed(1) + '%'
                    : '0%'
        }
    }

    /**
     * 重置所有对象可见性（禁用剔除时使用）
     * @author LL
     * @since 2025/10/14
     * @example
     * TO.scene.resetVisibility();
     */
    public resetVisibility() {
        this.traverse((obj) => {
            if (obj.isMesh || obj.isLine || obj.isPoints) {
                obj.visible = true
            }
        })
        console.log('所有对象可见性已重置')
    }
}
