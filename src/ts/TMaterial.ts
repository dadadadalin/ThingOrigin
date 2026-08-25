/**
 * @module
 * @mergeModuleWith <project>
 */

import {
    LinearFilter,
    Mesh,
    MeshBasicMaterial,
    MeshPhysicalMaterial,
    MeshDepthMaterial,
    MeshToonMaterial,
    LineBasicMaterial,
    LineDashedMaterial,
    MeshDistanceMaterial,
    PointsMaterial,
    ShadowMaterial,
    SpriteMaterial,
    RawShaderMaterial,
    ShaderMaterial,
    TextureLoader,
    CubeTextureLoader,
    VideoTexture,
    Texture,
    CubeTexture,
    Color,
    PlaneGeometry,
    RepeatWrapping,
    Vector3,
    DataTexture,
    RGBAFormat,
    Vector2,
    LinearMipmapLinearFilter,
    UnsignedByteType,
    ClampToEdgeWrapping,
    UVMapping,
    MeshLambertMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
    FrontSide,
    DoubleSide,
    MeshBasicMaterialParameters,
    MeshLambertMaterialParameters,
    MeshPhongMaterialParameters,
    MeshStandardMaterialParameters,
    MeshPhysicalMaterialParameters,
    PointsMaterialParameters,
    MeshToonMaterialParameters,
    SpriteMaterialParameters,
    ShadowMaterialParameters,
    MeshDepthMaterialParameters,
    BasicDepthPacking,
    MeshDistanceMaterialParameters,
    LineBasicMaterialParameters,
    LineDashedMaterialParameters,
    ShaderMaterialParameters,
    MeshNormalMaterialParameters,
    MeshNormalMaterial,
    RGBFormat,
    SRGBColorSpace,
    LinearSRGBColorSpace,
    RedFormat,
    WebGLRenderer,
    NoColorSpace
} from 'three'

import { NodeMaterial } from 'three/webgpu'
import * as tsl from 'three/tsl'

/** TSL 工具集类型（供 initNodeMaterial 回调参数标注） */
export type TslApi = typeof tsl

import { Water } from 'three/examples/jsm/objects/Water'
import { WaterMesh } from 'three/examples/jsm/objects/WaterMesh'
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader'
import {
    CubeTextureParams,
    MapType,
    BaseMapParams,
    MaterialMapsParams,
    VideoTextureParams,
    DataTextureParams,
    mapsLoadOrder
} from './TMaterialInterfaces'
import { imageParams } from './scenePrams'
import { ThingOrigin } from '../ThingOrigin'
import { merge } from 'lodash-es'
import { Material } from 'three'

/**
 * 通用材质创建器：通过创建测试实例验证属性有效性
 * @private
 */
class UniversalMaterialCreator {
    // 材质默认参数（仅保留必要的）
    private static materialDefaults = new Map<any, any>([
        [MeshStandardMaterial, { side: FrontSide }],
        [MeshPhysicalMaterial, { side: FrontSide }],
        [MeshPhongMaterial, { side: FrontSide }],
        [MeshLambertMaterial, { side: FrontSide }],
        [MeshBasicMaterial, { side: FrontSide }],
        [MeshToonMaterial, { side: FrontSide }],
        [PointsMaterial, {}],
        [SpriteMaterial, {}],
        [ShadowMaterial, {}],
        [MeshDepthMaterial, { side: FrontSide }],
        [MeshDistanceMaterial, { side: FrontSide }],
        [MeshNormalMaterial, { side: FrontSide }],
        [LineBasicMaterial, {}],
        [LineDashedMaterial, {}],
        [RawShaderMaterial, { side: FrontSide }],
        [ShaderMaterial, { side: FrontSide }]
    ])

    /**
     * 创建材质，通过测试实例验证属性有效性
     * @param MaterialClass 材质类构造函数
     * @param userParams 用户传入的参数
     * @returns 创建的材质实例
     */
    public static createMaterial<T extends Material>(
        MaterialClass: new (params?: any) => T,
        userParams: any = {}
    ): T {
        const defaultParams = this.materialDefaults.get(MaterialClass) || {}

        // 创建测试实例以获取有效属性
        const testMaterial = new MaterialClass()
        const validProperties = new Set<string>()

        // 收集所有属性名（包括原型链上的）
        let current: any = testMaterial
        while (current && current !== Object.prototype) {
            Object.keys(current).forEach((key) => {
                if (key !== 'constructor' && typeof current[key] !== 'function') {
                    validProperties.add(key)
                }
            })
            current = Object.getPrototypeOf(current)
        }

        // 过滤用户参数，只保留有效属性
        const filteredParams: any = {}

        Object.keys(userParams).forEach((key) => {
            // 检查是否是有效属性（实例属性或通过 getter/setter 可访问）
            if (validProperties.has(key)) {
                filteredParams[key] = userParams[key]
            } else {
                // 尝试通过 getter 检查属性是否存在（某些属性可能只通过 getter 暴露）
                try {
                    const descriptor = Object.getOwnPropertyDescriptor(
                        Object.getPrototypeOf(testMaterial),
                        key
                    )
                    if (descriptor && (descriptor.get || descriptor.set)) {
                        // 有 getter/setter，说明属性存在
                        filteredParams[key] = userParams[key]
                    } else if (key in testMaterial) {
                        // 直接检查 in 操作符（包括继承的属性）
                        filteredParams[key] = userParams[key]
                    } else {
                        // 开发环境警告
                        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
                            const materialName = MaterialClass.name
                            console.warn(`属性${key}不合法，材质${materialName}不支持`)
                        }
                    }
                } catch {
                    // 如果访问属性时出错，说明可能不存在，跳过
                    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
                        const materialName = MaterialClass.name
                        console.warn(`属性${key}不合法，材质${materialName}不支持`)
                    }
                }
            }
        })

        // 清理测试实例
        testMaterial.dispose()

        // 创建最终材质
        return new MaterialClass({ ...defaultParams, ...filteredParams })
    }

    /**
     * 创建 NodeMaterial：通用属性白名单赋值 + 以 "Node" 结尾的键作为 TSL 节点槽位赋值
     * @param params 用户参数：通用属性 + TSL 节点槽位（键名以 "Node" 结尾）
     */
    public static createNodeMaterial(params: any = {}): NodeMaterial {
        const material = new NodeMaterial()

        // 通用材质属性白名单
        const commonKeys = [
            'transparent',
            'opacity',
            'side',
            'depthWrite',
            'depthTest',
            'blending',
            'toneMapped',
            'visible',
            'alphaTest',
            'colorWrite'
        ]
        for (const k of commonKeys) {
            if (k in params) (material as any)[k] = params[k]
        }

        // Node 槽位：所有以 "Node" 结尾的键直接赋值（colorNode / positionNode / normalNode / outputNode ...）
        for (const k of Object.keys(params)) {
            if (/Node$/.test(k)) (material as any)[k] = params[k]
        }

        return material
    }
}

/**
 * 材质、贴图
 */
export class TMaterial {
    private TO: ThingOrigin
    // 创建纹理加载器
    textureLoader = new TextureLoader()

    // WebGL渲染器引用（用于获取设备能力）
    private renderer?: WebGLRenderer

    /**
     * 性能优化：纹理缓存
     * @private
     */
    private textureCache: Map<string, Texture> = new Map()

    /**
     * 性能优化：材质缓存
     * @private
     */
    private materialCache: Map<string, any> = new Map()

    constructor(TO: ThingOrigin, renderer?: WebGLRenderer) {
        this.TO = TO
        this.renderer = renderer
    }

    /**
     * 设置渲染器引用（用于获取设备能力）
     */
    public setRenderer(renderer: WebGLRenderer): void {
        this.renderer = renderer
    }

    /**
     * 清理纹理缓存
     * @author LL
     * @since 2025/10/14
     * @category 方法
     */
    public clearTextureCache(): void {
        this.textureCache.forEach((texture) => {
            texture.dispose()
        })
        this.textureCache.clear()
        console.log('纹理缓存已清理')
    }

    /**
     * 清理材质缓存
     * @author LL
     * @since 2025/10/14
     * @category 方法
     */
    public clearMaterialCache(): void {
        this.materialCache.forEach((material) => {
            material.dispose()
        })
        this.materialCache.clear()
        console.log('材质缓存已清理')
    }

    /**
     * 清理所有缓存
     * @author LL
     * @since 2025/10/14
     * @category 方法
     */
    public clearAllCache(): void {
        this.clearTextureCache()
        this.clearMaterialCache()
    }

    /**
     * 获取缓存统计信息
     * @author LL
     * @since 2025/10/14
     * @category 方法
     */
    public getCacheStats(): { textures: number; materials: number } {
        return {
            textures: this.textureCache.size,
            materials: this.materialCache.size
        }
    }

    /**
     * 创建图片材质（带缓存优化）
     * @author LL
     * @since 2025/07/17
     * @param params
     */
    public async initImageMaterial(params: imageParams): Promise<MeshPhongMaterial> {
        const defaultParams = {
            url: this.TO.sceneData.params.resource.serverAddress + '/image/download/logo_icon.png',
            color: '#fff',
            transparent: true,
            repeatX: 1,
            repeatY: 1,
            premultiplyAlpha: false,
            opacity: 1.0,
            alphaTest: 0.1,
            doubleSide: true
        }

        let param = merge(defaultParams, params)

        // 性能优化：生成纹理缓存键
        const textureCacheKey = `${param.url}_${param.repeatX || 1}_${param.repeatY || 1}`

        let texture = this.textureCache.get(textureCacheKey)

        if (!texture) {
            // 缓存中没有，加载新纹理
            texture = await this.textureLoader.loadAsync(param.url)

            // 设置纹理的透明度相关属性
            if (param.premultiplyAlpha !== undefined) {
                texture.premultiplyAlpha = param.premultiplyAlpha
            }

            // 设置包裹方式
            texture.wrapS = param.repeatX > 1 ? RepeatWrapping : ClampToEdgeWrapping
            texture.wrapT = param.repeatY > 1 ? RepeatWrapping : ClampToEdgeWrapping
            texture.repeat.set(param.repeatX, param.repeatY)

            // 正确配置颜色空间
            texture.colorSpace = SRGBColorSpace

            // 优化纹理过滤设置
            this.setTextureFilters(texture)

            // 存入缓存
            this.textureCache.set(textureCacheKey, texture)
        }

        // 创建材质时添加透明度支持
        const material = new MeshPhongMaterial({
            color: param.color,
            map: texture,
            transparent: param.transparent,
            opacity: param.opacity,
            alphaTest: param.alphaTest,
            side: param.doubleSide ? DoubleSide : FrontSide
        })

        return material
    }
    /**
     * 创建基础材质
     * @author my
     * @since 2023/12/12
     * @param [params] 材质参数配置
     */
    public initBasicMaterial(params: Partial<MeshBasicMaterialParameters> = {}): MeshBasicMaterial {
        return UniversalMaterialCreator.createMaterial(MeshBasicMaterial, params)
    }

    /**
     * 创建漫反射材质
     * @remarker 受光照影响
     * @author gj
     * @since 2025/07/09
     * @param [params] 材质参数配置
     */
    public initLambertMaterial(params: Partial<MeshLambertMaterialParameters> = {}): MeshLambertMaterial {
        return UniversalMaterialCreator.createMaterial(MeshLambertMaterial, params)
    }

    /**
     * 创建高光材质（支持高光反射）
     * @author gj
     * @since 2025/07/09
     * @param [params] 材质参数配置
     */
    public initPhongMaterial(params: Partial<MeshPhongMaterialParameters> = {}): MeshPhongMaterial {
        return UniversalMaterialCreator.createMaterial(MeshPhongMaterial, params)
    }
    /**
     * 标准网格材质（PBR标准材质基于物理的渲染）
     * @author gj
     * @since 2025/07/09
     * @param [params] 材质参数配置
     */
    public initStandardMaterial(params: Partial<MeshStandardMaterialParameters> = {}): MeshStandardMaterial {
        return UniversalMaterialCreator.createMaterial(MeshStandardMaterial, params)
    }
    /**
     * 物理网格材质（PBR标准材质基于物理的渲染）
     * @author gj
     * @since 2023/11/10
     * @param [params] 材质参数配置
     */
    public initPhysicalMaterial(params: Partial<MeshPhysicalMaterialParameters> = {}): MeshPhysicalMaterial {
        return UniversalMaterialCreator.createMaterial(MeshPhysicalMaterial, params)
    }
    /**
     * 创建点云材质
     * @author gj
     * @since 2023/11/10
     * @param [params] 材质参数配置
     */
    public initPointsMaterial(params: Partial<PointsMaterialParameters> = {}): PointsMaterial {
        return UniversalMaterialCreator.createMaterial(PointsMaterial, params)
    }

    /**
     * 创建卡通渲染材质（Toon）
     * @author gj
     * @since 2023/11/10
     * @param [params] 材质参数配置
     */
    public initToonMaterial(params: Partial<MeshToonMaterialParameters> = {}): MeshToonMaterial {
        return UniversalMaterialCreator.createMaterial(MeshToonMaterial, params)
    }
    /**
     * 创建Sprite材质
     * @author LL
     * @since 2023/11/10
     * @param [params] 材质参数配置
     */
    public initSpriteMaterial(params: Partial<SpriteMaterialParameters> = {}): SpriteMaterial {
        return UniversalMaterialCreator.createMaterial(SpriteMaterial, params)
    }

    /**
     * 创建阴影材质（用于投射和接收阴影的特殊材质）
     * @author LL
     * @since 2023/11/13
     * @param [params] 材质参数配置
     */
    public initShadowMaterial(params: Partial<ShadowMaterialParameters> = {}): ShadowMaterial {
        return UniversalMaterialCreator.createMaterial(ShadowMaterial, params)
    }

    /**
     * 创建深度材质（基于距离相机的深度渲染的材质）
     * @author my
     * @since 2023/11/13
     * @param [params] 材质参数配置
     */
    public initDepthMaterial(params: Partial<MeshDepthMaterialParameters> = {}): MeshDepthMaterial {
        return UniversalMaterialCreator.createMaterial(MeshDepthMaterial, params)
    }

    /**
     * 创建距离材质（基于到参考点的距离渲染的材质）
     * @author my
     * @since 2023/12/12
     * @param [params] 材质参数配置
     */
    public initDistanceMaterial(params: Partial<MeshDistanceMaterialParameters> = {}): MeshDistanceMaterial {
        return UniversalMaterialCreator.createMaterial(MeshDistanceMaterial, params)
    }
    /**
     * 创建法线网格材质
     * @author gj
     * @since 2025/07/12
     * @param [params] 材质参数配置
     */
    public initNormalMaterial(params: Partial<MeshNormalMaterialParameters> = {}): MeshNormalMaterial {
        return UniversalMaterialCreator.createMaterial(MeshNormalMaterial, params)
    }

    /**
     * 创建线框材质
     * @author my
     * @since 2023/12/08
     * @param [params] 材质参数配置
     */
    public initLineMaterial(params: Partial<LineBasicMaterialParameters> = {}): LineBasicMaterial {
        return UniversalMaterialCreator.createMaterial(LineBasicMaterial, params)
    }

    /**
     * 创建虚线材质
     * @author my
     * @since 2023/12/08
     * @param [params] 材质参数配置
     */
    public initLineDashedMaterial(params: Partial<LineDashedMaterialParameters> = {}): LineDashedMaterial {
        return UniversalMaterialCreator.createMaterial(LineDashedMaterial, params)
    }
    /**
     * 创建自定义着色器材质
     * @author gj
     * @since 2023/11/13
     * @remark 仅支持WebGL渲染器
     * @param [params] 材质参数配置
     */
    public initRawShaderMaterial(params: Partial<ShaderMaterialParameters> = {}): RawShaderMaterial {
        return UniversalMaterialCreator.createMaterial(RawShaderMaterial, params)
    }

    /**
     * 创建Shader材质
     * @author gj
     * @since 2023/11/13
     * @remark 仅支持WebGL渲染器
     * @param [params] 材质参数配置
     */
    public initShaderMaterial(params: Partial<ShaderMaterialParameters> = {}): ShaderMaterial {
        return UniversalMaterialCreator.createMaterial(ShaderMaterial, params)
    }

    /**
     * 创建 NodeMaterial 自定义材质（WebGPU / TSL）
     * @author gj
     * @since 2026/07/27
     * @remark 仅支持 WebGPU 渲染器；通过 TSL 节点构建自定义着色。
     *   推荐回调写法：库内注入 tsl，调用方无需 `import 'three/tsl'`。
     *   通用属性（transparent/opacity/side/depthWrite/depthTest/blending/toneMapped/visible/alphaTest/colorWrite）
     *   在第二参数 opts 中传入；以 "Node" 结尾的键作为 TSL 节点槽位在回调返回值中传入。
     * @param nodesOrParams TSL 回调 `(tsl) => ({ colorNode, positionNode, ... })`，或直接传参对象（高级用法）
     * @param [opts] 通用材质属性（仅回调模式）
     * @example
     * ```ts
     * const mat = TO.material.initNodeMaterial(({ Fn, vec3, time, sin }) => ({
     *   colorNode: Fn(() => vec3(sin(time).add(1).mul(0.5), 0, 0))()
     * }), { transparent: true })
     * ```
     */
    public initNodeMaterial(
        nodesOrParams: ((api: TslApi) => Partial<Record<string, any>>) | Partial<Record<string, any>>,
        opts: Partial<Record<string, any>> = {}
    ): NodeMaterial {
        const params =
            typeof nodesOrParams === 'function' ? { ...opts, ...nodesOrParams(tsl) } : nodesOrParams
        return UniversalMaterialCreator.createNodeMaterial(params)
    }

    /**
    * 给模型设置水波纹材质
    * @author LL gj
    * @since 2023/11/13
    * @param {(Geometry | BufferGeometry)} geometry 模型
    * @param {number} width 反射纹理宽度（仅 WebGL 后端生效，WebGPU 用 resolutionScale）
    * @param {number} height 反射纹理高度（仅 WebGL 后端生效，WebGPU 用 resolutionScale）
    * @param {string} url 法线贴图地址
    * @param {(string | number | Color)} [waterColor] 水颜色
    * @param {Vector3} [sunDirection] 太阳方向
    * @param {(string | number | Color)} [sunColor] 太阳颜色
    > [!NOTE]
    > WebGL 后端用 three 的 Water，WebGPU 后端用 three/webgpu 的 WaterMesh；
    > 需要将色调映射 设置为 NoToneMapping
    *
    */
    public setWaterSkin(
        geometry: PlaneGeometry,
        width: number,
        height: number,
        url: string,
        waterColor?: string | number | Color,
        sunDirection?: Vector3,
        sunColor?: string | number | Color
    ): Mesh {
        const waterNormals = this.textureLoader.load(url, (texture) => {
            texture.wrapS = texture.wrapT = RepeatWrapping
        })

        // WebGPU 后端：Water 仅支持 WebGL，WebGPU 须用 WaterMesh
        if (this.TO.renderer?.isWebGPU) {
            return new WaterMesh(geometry, {
                waterNormals,
                sunDirection,
                sunColor,
                waterColor,
                distortionScale: 20
            })
        }

        // WebGL 后端
        return new Water(geometry, {
            textureWidth: width,
            textureHeight: height,
            waterNormals,
            sunDirection: sunDirection,
            sunColor: sunColor,
            waterColor: waterColor
            //   distortionScale: 0,
        })
    }

    /**
     * 批量创建材质贴图
     * @author gj
     * @since 2025/07/13
     * @param params 贴图参数集合
     */
    public async initTextureMaps(params: MaterialMapsParams): Promise<{ [key in MapType]?: Texture }> {
        const maps: { [key in MapType]?: Texture } = {}
        // 顺序加载贴图
        for (const key of mapsLoadOrder) {
            if (params[key]) {
                try {
                    maps[key] = await this.initTextureMap({
                        ...params[key],
                        mapType: key
                    })
                } catch (error) {
                    console.warn(`加载 ${key} 贴图失败：`, error)
                }
            }
        }

        return maps
    }

    /**
     * 创建并配置纹理贴图
     * @author gj
     * @since 2025/07/13
     * @param params 贴图参数
     */
    public async initTextureMap(params: BaseMapParams): Promise<Texture> {
        // 生成缓存键
        const cacheKey = `${params.url}_${params.mapType}_${JSON.stringify(params.repeat)}_${JSON.stringify(params.offset)}`

        // 检查缓存
        const cachedTexture = this.textureCache.get(cacheKey)
        if (cachedTexture) {
            return cachedTexture
        }

        // 根据贴图类型设置默认参数
        const defaultParams = this.getDefaultMapParams(params.mapType)

        // 合并参数
        const mergedParams = { ...defaultParams, ...params }

        // 加载纹理（TGA 需使用 TGALoader，避免 TextureLoader 报错）
        const texture = await this.loadTextureByUrl(
            mergedParams.url,
            mergedParams.onProgress as ((event: ProgressEvent) => void) | undefined
        )

        // 配置纹理属性
        this.setTextureProperty(texture, mergedParams)

        // 存入缓存
        this.textureCache.set(cacheKey, texture)

        return texture
    }

    /**
     * 按扩展名选择贴图加载器（支持 .tga）
     */
    private async loadTextureByUrl(
        url: string,
        onProgress?: (event: ProgressEvent) => void
    ): Promise<Texture> {
        const cleanUrl = url.split('?')[0]
        const dotIndex = cleanUrl.lastIndexOf('.')
        const ext = dotIndex >= 0 ? cleanUrl.slice(dotIndex + 1).toLowerCase() : ''

        if (ext === 'tga') {
            const tgaLoader = new TGALoader()
            tgaLoader.setCrossOrigin('anonymous')
            return await tgaLoader.loadAsync(url, onProgress as any)
        }

        return await this.textureLoader.setCrossOrigin('anonymous').loadAsync(url, onProgress)
    }
    /**
     * 配置纹理属性
     */
    private setTextureProperty(texture: Texture, params: BaseMapParams): void {
        // 基础属性
        texture.wrapS = params.wrapS ?? texture.wrapS
        texture.wrapT = params.wrapT ?? texture.wrapT
        texture.magFilter = params.magFilter ?? texture.magFilter
        texture.minFilter = params.minFilter ?? texture.minFilter

        // 颜色空间
        if (params.colorSpace !== undefined) {
            texture.colorSpace = params.colorSpace
        }

        // 各向异性过滤
        if (params.anisotropy !== undefined) {
            texture.anisotropy = params.anisotropy
        } else if (this.renderer?.capabilities.getMaxAnisotropy) {
            const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy()
            texture.anisotropy = Math.min(4, maxAnisotropy)
        }

        // 变换属性
        if (params.repeat !== undefined) {
            if (Array.isArray(params.repeat)) {
                texture.repeat.set(params.repeat[0], params.repeat[1])
            } else {
                texture.repeat.copy(params.repeat)
            }
        }

        if (params.offset !== undefined) {
            if (Array.isArray(params.offset)) {
                texture.offset.set(params.offset[0], params.offset[1])
            } else {
                texture.offset.copy(params.offset)
            }
        }

        // 高级属性
        texture.flipY = params.flipY ?? texture.flipY
        texture.mapping = params.mapping ?? texture.mapping
        texture.generateMipmaps = params.generateMipmaps ?? texture.generateMipmaps
        texture.premultiplyAlpha = params.premultiplyAlpha ?? texture.premultiplyAlpha

        // 格式和类型
        if (params.format !== undefined) texture.format = params.format
        if (params.type !== undefined) texture.type = params.type
    }

    /**
     * 纹理过滤设置
     */
    private setTextureFilters(texture: Texture): void {
        // 生成mipmap
        texture.generateMipmaps = true

        // 正确设置过滤
        texture.minFilter = LinearMipmapLinearFilter // 三线性过滤
        texture.magFilter = LinearFilter

        // 各向异性过滤
        if (this.renderer?.capabilities.getMaxAnisotropy) {
            const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy()
            texture.anisotropy = Math.min(4, maxAnisotropy) // 限制最大值，避免性能问题
        }
    }

    /**
     * 获取特定贴图类型的默认参数
     */
    private getDefaultMapParams(mapType: MapType): Partial<BaseMapParams> {
        const baseDefaults: Partial<BaseMapParams> = {
            wrapS: RepeatWrapping,
            wrapT: RepeatWrapping,
            magFilter: LinearFilter,
            minFilter: LinearMipmapLinearFilter,
            anisotropy: 1,
            repeat: new Vector2(1, 1),
            offset: new Vector2(0, 0),
            flipY: true,
            mapping: UVMapping,
            generateMipmaps: true,
            premultiplyAlpha: false,
            unpackAlignment: 4
        }

        // 根据贴图类型设置特定参数
        switch (mapType) {
            case 'map':
            case 'emissiveMap':
                return {
                    ...baseDefaults,
                    format: RGBAFormat,
                    colorSpace: SRGBColorSpace // 颜色贴图使用sRGB
                }

            case 'normalMap':
                return {
                    ...baseDefaults,
                    format: RGBAFormat,
                    colorSpace: NoColorSpace // 法线贴图不需要颜色空间转换
                }

            case 'roughnessMap':
            case 'metalnessMap':
            case 'aoMap':
            case 'alphaMap':
            case 'displacementMap':
            case 'bumpMap':
                return {
                    ...baseDefaults,
                    format: RedFormat, // 单通道贴图使用RedFormat节省内存
                    colorSpace: LinearSRGBColorSpace // PBR贴图使用线性空间
                }

            default:
                return baseDefaults
        }
    }

    /**
     * 加载立方体环境贴图
     * @author gj
     * @since 2025/07/09
     * @param [params] 纹理参数配置
     */
    public initCubeTexture(params: Partial<CubeTextureParams>): CubeTexture {
        const loader = new CubeTextureLoader(params.loadingManager)
        if (params.urls && params.urls.length !== 6) {
            console.warn('CubeTextureParams.urls 必须是长度为 6 的数组。')
        }
        // 构建6个面的纹理路径
        const prefix = params.pathPrefix || ''
        const paths = [
            `${prefix}${params.urls[0]}`,
            `${prefix}${params.urls[1]}`,
            `${prefix}${params.urls[2]}`,
            `${prefix}${params.urls[3]}`,
            `${prefix}${params.urls[4]}`,
            `${prefix}${params.urls[5]}`
        ]

        // 加载立方体贴图
        const texture = loader.load(
            paths,
            params.onLoad,
            params.onProgress,
            params.onError ||
                ((err) => {
                    console.error(`未能加载 cube texture:`, err)
                })
        )

        // 配置纹理属性
        if (params.magFilter !== undefined) texture.magFilter = params.magFilter
        if (params.minFilter !== undefined) texture.minFilter = params.minFilter
        if (params.anisotropy !== undefined) texture.anisotropy = params.anisotropy
        if (params.format !== undefined) texture.format = params.format
        if (params.type !== undefined) texture.type = params.type
        //   if (params.encoding !== undefined) texture.encoding = params.encoding;
        if (params.generateMipmaps !== undefined) texture.generateMipmaps = params.generateMipmaps
        if (params.unpackAlignment !== undefined) texture.unpackAlignment = params.unpackAlignment

        return texture
    }

    /**
     * 从原始数据创建一个纹理贴图
     * @author gj
     * @since 2025/07/09
     * @param [params] 纹理参数配置
     */
    public initDataTexture(params: DataTextureParams): DataTexture {
        // 定义默认参数
        const defaultParams: Omit<DataTextureParams, 'data' | 'width' | 'height' | 'format'> = {
            type: UnsignedByteType,
            magFilter: LinearFilter,
            minFilter: LinearMipmapLinearFilter,
            anisotropy: 1,
            wrapS: ClampToEdgeWrapping,
            wrapT: ClampToEdgeWrapping,
            repeat: new Vector2(1, 1),
            offset: new Vector2(0, 0),
            flipY: false,
            mapping: UVMapping,
            // encoding: LinearEncoding,
            generateMipmaps: true,
            premultiplyAlpha: false,
            unpackAlignment: 4
        }

        // 合并用户参数和默认参数
        const mergedParams = { ...defaultParams, ...params }

        // r185 DataTexture 构造函数要求 TypedArray
        const textureData =
            mergedParams.data instanceof ArrayBuffer
                ? new Uint8Array(mergedParams.data)
                : (mergedParams.data as Uint8Array)

        // 创建数据纹理
        const texture = new DataTexture(
            textureData,
            mergedParams.width,
            mergedParams.height,
            mergedParams.format,
            mergedParams.type
        )

        // 配置纹理属性
        texture.magFilter = mergedParams.magFilter
        texture.minFilter = mergedParams.minFilter
        texture.anisotropy = mergedParams.anisotropy
        texture.wrapS = mergedParams.wrapS
        texture.wrapT = mergedParams.wrapT

        // 配置纹理变换属性
        if (Array.isArray(mergedParams.repeat)) {
            texture.repeat.set(mergedParams.repeat[0], mergedParams.repeat[1])
        } else {
            texture.repeat.copy(mergedParams.repeat)
        }

        if (Array.isArray(mergedParams.offset)) {
            texture.offset.set(mergedParams.offset[0], mergedParams.offset[1])
        } else {
            texture.offset.copy(mergedParams.offset)
        }

        texture.flipY = mergedParams.flipY
        texture.mapping = mergedParams.mapping

        // 配置纹理高级属性
        //   texture.encoding = mergedParams.encoding;
        texture.generateMipmaps = mergedParams.generateMipmaps
        texture.premultiplyAlpha = mergedParams.premultiplyAlpha
        texture.unpackAlignment = mergedParams.unpackAlignment

        // 标记纹理需要更新
        texture.needsUpdate = true

        return texture
    }

    /**
     * 生成视频纹理
     * @author LL
     * @since 2021/09/02
     * @param [params] 纹理参数配置
     */
    public initVideoTexture(params: Partial<VideoTextureParams>): VideoTexture {
        // 定义默认参数
        const defaultParams: VideoTextureParams = {
            videoDom: null,
            wrapS: ClampToEdgeWrapping,
            wrapT: ClampToEdgeWrapping,
            magFilter: LinearFilter,
            minFilter: LinearFilter,
            anisotropy: 1,
            repeat: new Vector2(1, 1),
            offset: new Vector2(0, 0),
            flipY: true,
            mapping: UVMapping,
            format: RGBAFormat,
            type: UnsignedByteType,
            colorSpace: SRGBColorSpace, // 视频纹理必须使用 sRGB 色彩空间，否则 WebGPU 报错
            generateMipmaps: true,
            premultiplyAlpha: false,
            unpackAlignment: 4,
            needsUpdate: true,
            autoplay: true,
            loop: true,
            muted: true,
            playsinline: true
        }
        // 合并用户参数和默认参数
        const mergedParams = { ...defaultParams, ...params }
        // 创建视频纹理
        const texture = new VideoTexture(mergedParams.videoDom)

        // 配置纹理属性
        texture.wrapS = mergedParams.wrapS
        texture.wrapT = mergedParams.wrapT
        texture.magFilter = mergedParams.magFilter
        texture.minFilter = mergedParams.minFilter
        texture.anisotropy = mergedParams.anisotropy

        // 配置纹理变换属性
        if (Array.isArray(mergedParams.repeat)) {
            texture.repeat.set(mergedParams.repeat[0], mergedParams.repeat[1])
        } else {
            texture.repeat.copy(mergedParams.repeat)
        }

        if (Array.isArray(mergedParams.offset)) {
            texture.offset.set(mergedParams.offset[0], mergedParams.offset[1])
        } else {
            texture.offset.copy(mergedParams.offset)
        }

        texture.flipY = mergedParams.flipY
        texture.mapping = mergedParams.mapping

        // 配置纹理高级属性
        texture.format = mergedParams.format
        texture.type = mergedParams.type
        texture.colorSpace = mergedParams.colorSpace
        texture.generateMipmaps = mergedParams.generateMipmaps
        texture.premultiplyAlpha = mergedParams.premultiplyAlpha
        texture.unpackAlignment = mergedParams.unpackAlignment

        // 设置自动更新
        texture.needsUpdate = mergedParams.needsUpdate

        return texture
    }
}
