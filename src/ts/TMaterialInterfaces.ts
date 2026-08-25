/**
 * @module
 * @mergeModuleWith <project>
 */

import * as THREE from 'three';

/**
 * 贴图类型
 */
/**
 * @group Types
 */
export type MapType =
    | 'map'
    | 'normalMap'
    | 'roughnessMap'
    | 'metalnessMap'
    | 'aoMap'
    | 'emissiveMap'
    | 'displacementMap'
    | 'alphaMap'
    | 'bumpMap';

// 定义贴图加载优先级
/**
 * @group Utils
 */
export const mapsLoadOrder: MapType[] = [
    'map', // 基础颜色最先加载
    'normalMap', // 然后是法线
    'roughnessMap', // PBR贴图
    'metalnessMap',
    'aoMap',
    'emissiveMap',
    'displacementMap',
    'alphaMap',
    'bumpMap',
]

/** MapType 到 Three.js 材质贴图属性名的映射（与 mapsLoadOrder 一致） */
/**
 * @group Utils
 */
export const mapTypeToProp: Record<MapType, string> = {
    map: 'map',
    normalMap: 'normalMap',
    roughnessMap: 'roughnessMap',
    metalnessMap: 'metalnessMap',
    aoMap: 'aoMap',
    emissiveMap: 'emissiveMap',
    alphaMap: 'alphaMap',
    displacementMap: 'displacementMap',
    bumpMap: 'bumpMap',
}

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
    loadingManager?: THREE.LoadingManager;

    // 纹理基础设置
    wrapS?: THREE.Wrapping;
    wrapT?: THREE.Wrapping;
    magFilter?: THREE.MagnificationTextureFilter;
    minFilter?: THREE.TextureFilter;
    anisotropy?: number;
    // 纹理变换
    repeat?: THREE.Vector2 | [number, number];
    offset?: THREE.Vector2 | [number, number];
    flipY?: boolean;
    mapping?: THREE.Mapping;

    // 高级纹理设置
    format?: THREE.PixelFormat;
    type?: THREE.TextureDataType;
    encoding?: any;
    generateMipmaps?: boolean;
    premultiplyAlpha?: boolean;
    unpackAlignment?: number;

    //自定义参数
    userData?: any;

    // 特定贴图类型的强度参数
    aoMapIntensity?: number;
    bumpScale?: number;
    roughnessScale?: number;
    metalnessScale?: number;
    displacementScale?: number;
    emissiveIntensity?: number;

    // 加载回调
    onLoad?: (texture: THREE.Texture) => void;
    onProgress?: (event: ProgressEvent) => void;
    onError?: (error: Error) => void;
}

/**
 * 基础贴图参数
 * @param mapType 贴图类型
 * @param url 贴图路径
 */
/**
 * @group Interfaces
 */
export interface BaseMapParams extends MapParams {
    url: string;
    mapType: MapType;
    colorSpace?: any;
}
/**
 * PBR材质贴图参数集合
 * @param map 颜色贴图参数
 * @param normalMap 法线贴图参数
 * @param roughnessMap 粗糙度贴图参数
 * @param metalnessMap 金属度贴图参数
 * @param aoMap 环境ao贴图参数
 * @param emissiveMap 自发光贴图参数
 * @param displacementMap 位移贴图参数
 * @param alphaMap 透明度贴图参数
 * @param bumpMap 凹凸贴图参数
 */
/**
 * @group Interfaces
 */
export interface MaterialMapsParams {
    map?: Omit<BaseMapParams, 'mapType'>; //基础贴图
    normalMap?: Omit<BaseMapParams, 'mapType'>; //通过法线向量模拟表面细节，比 bumpMap 更精确
    roughnessMap?: Omit<BaseMapParams, 'mapType'>; //控制表面粗糙度，影响高光大小和反射清晰度
    metalnessMap?: Omit<BaseMapParams, 'mapType'>; //控制表面金属属性，影响反射和环境映射效果
    aoMap?: Omit<BaseMapParams, 'mapType'>; //环境光遮蔽贴图，增强模型立体感，不影响光照方向
    emissiveMap?: Omit<BaseMapParams, 'mapType'>; //自发光贴图，使物体表面发光，不受光照影响
    displacementMap?: Omit<BaseMapParams, 'mapType'>; //通常用于更强烈的表面变形
    alphaMap?: Omit<BaseMapParams, 'mapType'>; //控制材质透明度，黑色透明，白色不透明，需配合transparent: true使用
    bumpMap?: Omit<BaseMapParams, 'mapType'>; //	通过明暗差异模拟表面凹凸，计算量小于法线贴图
}
/**
 * 立方体贴图参数
 * @param urls - 6个面的贴图路径 [posx, negx, posy, negy, posz, negz]
 * @param pathPrefix - 贴图路径前缀
 */
/**
 * @group Interfaces
 */
export interface CubeTextureParams extends MapParams {
    urls: string[];
    pathPrefix: string;
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
/**
 * @group Interfaces
 */
export interface VideoTextureParams extends MapParams {
    videoDom: HTMLVideoElement;
    loadingManager?: THREE.LoadingManager;

    // 视频设置
    needsUpdate?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    playsinline?: boolean;

    // 色彩空间（视频纹理必须为 sRGB，WebGPU 要求）
    colorSpace?: THREE.ColorSpace;
}

/**
 * 数据纹理参数
 * @param {BufferSource} data - 纹理数据
 * @param {number} width - 纹理宽度
 * @param {number} height - 纹理高度
 * @param {string} format - 纹理格式
 */
/**
 * @group Interfaces
 */
export interface DataTextureParams extends MapParams {
    data: ArrayBufferView | ArrayBufferLike;
    width: number;
    height: number;
    format: THREE.PixelFormat;
}
