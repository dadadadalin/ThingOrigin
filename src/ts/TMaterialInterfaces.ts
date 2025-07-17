import * as THREE from "three"



/**
 * 贴图类型
 */
export type MapType = "map" | "normal" | "roughness" | "metalness" | "ao" | "emissive" | "displacement" | "alpha" | "bump"

/**
 * 贴图参数
 * @param loadingManager 加载管理器
 * @param wrapS 水平环绕模式
 * @param wrapT 垂直环绕模式
 * @param magFilter 放大过滤模式
 * @param minFilter 缩小过滤模式
 * @param anisotropy 各向异性过滤级别
 * @param repeat 纹理重复数
 * @param offset 纹理偏移量
 * @param flipY 是否垂直翻转
 * @param mapping 贴图映射模式
 * @param format 像素格式
 * @param type 纹理数据类型
 * @param generateMipmaps 是否生成mipmaps
 * @param premultiplyAlpha 是否预乘alpha
 * @param unpackAlignment 指定内存中每个像素行起点的对齐要求
 * @param userData 自定义参数
 * @param aoMapIntensity ao贴图强度
 * @param bumpScale 凹凸贴图强度
 * @param roughnessScale 粗糙度贴图强度
 * @param metalnessScale 金属度贴图强度
 * @param displacementScale 位移贴图强度
 * @param emissiveIntensity 自发光贴图强度
 * @param onLoad 加载成功回调
 * @param onProgress 加载进度回调
 * @param onError 加载失败回调
 */
interface MapParams {
    loadingManager?: THREE.LoadingManager

    // 纹理基础设置
    wrapS?: THREE.Wrapping
    wrapT?: THREE.Wrapping
    magFilter?: THREE.MagnificationTextureFilter
    minFilter?: THREE.TextureFilter
    anisotropy?: number
    // 纹理变换
    repeat?: THREE.Vector2 | [number, number]
    offset?: THREE.Vector2 | [number, number]
    flipY?: boolean
    mapping?: THREE.Mapping

    // 高级纹理设置
    format?: THREE.PixelFormat
    type?: THREE.TextureDataType
    encoding?: any;
    generateMipmaps?: boolean
    premultiplyAlpha?: boolean
    unpackAlignment?: number

    //自定义参数
    userData?: any

    // 特定贴图类型的强度参数
    aoMapIntensity?: number
    bumpScale?: number
    roughnessScale?: number
    metalnessScale?: number
    displacementScale?: number
    emissiveIntensity?: number

    // 加载回调
    onLoad?: (texture: THREE.Texture) => void
    onProgress?: (event: ProgressEvent) => void
    onError?: (error: Error) => void
}

/**
 * 基础贴图参数
 * @param mapType 贴图类型
 * @param url 贴图路径
 */
export interface BaseMapParams extends MapParams {
    url: string
    mapType: MapType
}
/**
 * 法线贴图特定参数
 * @param normalScale 法线贴图对材质的影响程度。典型范围是0-1
 */
export interface NormalMapParams extends BaseMapParams {
    normalScale?: THREE.Vector2 | number // 法线强度
}
/**
 * PBR材质贴图参数集合
 * @param map 颜色贴图参数
 * @param normal 法线贴图参数
 * @param roughness 粗糙度贴图参数
 * @param metalness 金属度贴图参数
 * @param ao 环境ao贴图参数
 * @param emissive 自发光贴图参数
 * @param displacement 位移贴图参数
 * @param alpha 透明度贴图参数
 * @param bump 凹凸贴图参数
 */
export interface MaterialMapsParams {
    map?: Omit<BaseMapParams, "mapType"> //基础贴图
    normal?: Omit<NormalMapParams, "mapType"> //通过法线向量模拟表面细节，比 bumpMap 更精确
    roughness?: Omit<BaseMapParams, "mapType"> //控制表面粗糙度，影响高光大小和反射清晰度
    metalness?: Omit<BaseMapParams, "mapType"> //控制表面金属属性，影响反射和环境映射效果
    ao?: Omit<BaseMapParams, "mapType"> //环境光遮蔽贴图，增强模型立体感，不影响光照方向
    emissive?: Omit<BaseMapParams, "mapType"> //自发光贴图，使物体表面发光，不受光照影响
    displacement?: Omit<BaseMapParams, "mapType"> //通常用于更强烈的表面变形
    alpha?: Omit<BaseMapParams, "mapType"> //控制材质透明度，黑色透明，白色不透明，需配合transparent: true使用
    bump?: Omit<BaseMapParams, "mapType"> //	通过明暗差异模拟表面凹凸，计算量小于法线贴图
}
/**
 * 立方体贴图参数
 * @param urls - 6个面的贴图路径 [posx, negx, posy, negy, posz, negz]
 * @param pathPrefix - 贴图路径前缀
 */
export interface CubeTextureParams extends MapParams {
    urls: string[];
    pathPrefix: string ;
}
/**
 * 视频纹理参数
 * @param videoDom 视频元素
 * @param loadingManager 加载管理器
 * @param needsUpdate 是否需要自动更新
 * @param autoplay 是否自动播放
 * @param loop 是否循环播放
 * @param muted 是否静音
 * @param playsinline 是否内联播放
 */
export interface VideoTextureParams extends MapParams {
    videoDom: HTMLVideoElement;
    loadingManager?: THREE.LoadingManager;

    // 视频设置
    needsUpdate?: boolean ;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    playsinline?: boolean ;
}

/**
 * 数据纹理参数
 * @param {BufferSource} data - 纹理数据
 * @param {number} width - 纹理宽度
 * @param {number} height - 纹理高度
 * @param {string} format - 纹理格式
 */
export interface DataTextureParams extends MapParams {
    data: BufferSource;
    width: number ;
    height: number ;
    format: THREE.PixelFormat ;
}
