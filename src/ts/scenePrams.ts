/**
 * @module
 * @mergeModuleWith <project>
 */

import { modelInfoParams } from './TModelInterfaces';

/** 创建场景参数 */
/**
 * @group Interfaces
 */
export interface ThingOriginParams {
    shadow?: boolean; //是否产生阴影
    scene?: sceneParam;
    camera?: cameraParams;
    lights?: lightParams[];
    controls?: controlsParams;
    modelList?: modelInfoParams[];
    markerList?: markerListParams[];
    helper?: helperParams;
    effectComposer?: effectComposerParams;
    [key: string]: any;
}

interface controlsParams {
    orbit?: orbitParams;
    drag?: dragParams;
    raycaster?: raycasterParams;
    transform?: controlsCommon;
    pointerLock?: pointerLockParams;
}

/**
 * @group Interfaces
 */
export interface xyz {
    x: number;
    y: number;
    z: number;
}

/**
 * @group Interfaces
 */
export interface rotationXYZ {
    _x: number;
    _y: number;
    _z: number;
    [key: string]: any;
}

/**
 * @group Interfaces
 */
export interface markerInfoParams {
    modelName?: string;
    markerName?: string;
    base?: any;
    name?: string;
    id?: number;
    type?: string;
    position?: xyz;
    rotation?: xyz | rotationXYZ;
    scale?: xyz;
    userData?: any;
    configs?: any;
}

interface markerListParams {
    uuid?: string;
    name?: string;
    type?: string;
    modelName?: string;
    position?: xyz;
    configs?: any;
    bg?: string;
    id?: string;
    iframe?: any;
    markerName?: string;
    [key: string]: any;
}

interface helperParams {
    axes?: axesParams;
    view?: viewParams;
    grid?: gridParams;
}

interface controlsCommon {
    active?: boolean;
}
/**
 * @group Interfaces
 */
export interface pointerLockParams {
    speed?: number;
}
export interface raycasterParams {
    active?: boolean;
    events?: raycasterEventParams;
}

/**
 * @group Interfaces
 */
export interface dragParams {
    active?: boolean;
}
export interface orbitParams {
    active?: boolean;
    autoRotate: boolean;
    autoRotateSpeed: number;
    enableDamping: boolean;
    dampingFactor: number;
    minDistance: number;
    maxDistance: number;
    enableZoom?: boolean;
}
/**
 * @group Interfaces
 */
export interface raycasterEventParams {
    click?: boolean;
    mousemove?: boolean;
}

interface axesParams {
    active?: boolean;
    length?: number;
}

interface viewParams {
    active?: boolean;
    width?: number; // ViewHelper 容器宽度（默认 128）
    height?: number; // ViewHelper 容器高度（默认 128）
}

interface gridParams {
    active?: boolean;
    size?: number;
    divisions?: number;
    centerLineColor?: string;
    gridColor?: string;
}

interface sceneParam {
    renderQuality?: renderQualityParam;
    background?: backgroundParams;
    ground?: groundParams;
    environment?: environmentParams;
    stats?: statsParams;
    fog?: fogParams;
}
/**
 * 渲染质量参数
 * @author LL
 * @since 2023/11/06
 * @param {boolean} antialias 抗锯齿
 * @param {boolean} toneMapping 景深
 * @interface renderQualityParam
 */
/**
 * @group Types
 */
export type RendererMode = 'webgl' | 'webgpu' | 'auto';

/** r185 WebGPU 特性开关 */
/**
 * @group Interfaces
 */
export interface webgpuFeaturesParams {
    /** 集群光照（多光源夜景） */
    clusteredLighting?: { active?: boolean; maxLights?: number };
    /** TSL 后处理：泛光 */
    bloom?: { active?: boolean; strength?: number };
    /** 降噪 SSR 屏幕空间反射 */
    ssr?: { active?: boolean; denoise?: boolean };
    /** TSL 物理雾（scene.fogNode） */
    scatteringFog?: {
        active?: boolean;
        color?: string;
        density?: number;
        sunDirection?: xyz;
    };
    /** WebGPU 预乘 Alpha 修正（r185 透明混合） */
    opaqueClear?: boolean;
}

/**
 * @group Interfaces
 */
export interface renderQualityParam {
    alpha?: boolean;
    autoClear?: boolean;
    antialias?: boolean; //
    shadowMap?: shadowMapParams;
    toneMapping?: toneMappingParams;
    logarithmicDepthBuffer?: boolean;
    /** 渲染后端：webgl | webgpu | auto（有 WebGPU 则用 WebGPU） */
    renderer?: RendererMode;
    /** WebGPU r185 特性（仅 renderer 为 webgpu 时生效） */
    webgpu?: webgpuFeaturesParams;
}
interface shadowMapParams {
    enabled: boolean;
}

/**
 * @group Interfaces
 */
export interface toneMappingParams {
    type: string;
    typeList: string[];
    exposure: number;
}
/**
 * @group Interfaces
 */
export interface backgroundParams {
    /** 'color' | 'sky' | 'img' | 'cubeMap' | 'workshop'，JSON 导入时为 string */
    type?: string;
    sky?: skyParams;
    color?: colorParams;
    intensity?: number;
    img?: imageParams;
    cubeMap?: cubeMapParams;
    workshop?: modelInfoParams;
}

interface groundParams {
    active?: boolean;
    base?: any;
    position?: xyz;
    material?: groundMaterialParams;
}

interface groundMaterialParams {
    type: string;
    color?: colorParams;
    image?: imageParams;
    doubleSide?: boolean;
}

/**
 * @group Interfaces
 */
export interface environmentParams {
    active: boolean;
    type: string;
    typeList: string[];
    EquirectangularReflectionMappingConfig: EquirectangularReflectionMappingConfigParams;
    HDRConfig?: HDRConfigParams;
    intensity?: number;
}

/**
 * @group Interfaces
 */
export interface EquirectangularReflectionMappingConfigParams {
    url: string;
}

export interface HDRConfigParams {
    background?: boolean;
    url: string;
}

interface skyParams {
    color: skyColorsParams;
    params: skyConfigsParams;
}

interface colorParams {
    alpha?: number; //透明度 取值范围0~1
    color?: string;
    opacity?: number;
}

/**
 * @group Interfaces
 */
export interface imageParams {
    url?: string;
    repeatX?: number;
    repeatY?: number;
    // 透明度相关参数
    transparent?: boolean; // 是否启用透明度
    opacity?: number; // 整体透明度 取值范围0~1
    alphaTest?: number; // alpha测试阈值，小于此值的像素将被丢弃
    premultiplyAlpha?: boolean; // 是否预乘alpha值
}

/**
 * @group Interfaces
 */
export interface cubeMapParams {
    url?: string[];
}

export interface statsParams {
    active?: boolean;
    mode?: number;
}

/**
 * @group Interfaces
 */
export interface fogParams {
    active?: boolean;
    color?: string;
    cameraView?: boolean;
    /** webgl: linear/exp2；webgpu: scattering 大气散射雾 */
    type?: 'linear' | 'exp2' | 'scattering';
    density?: number;
    sunDirection?: xyz;
}

interface cameraParams {
    center?: xyz;
    type?: string;
    position?: xyz;
    lookAt?: xyz;
    perspective?: perspectiveParams;
}

interface perspectiveParams {
    fov: number;
    near: number;
    far: number;
}

interface lightParams {
    name?: string;
    type?: string;
    color?: string;
    castShadow?: boolean;
    intensity?: number;
    distance?: number;
    position?: xyz;
    visible: boolean;
    groundColor?: string; //半球光
    width?: number; //面光
    height?: number; //面光
    rotation?: xyz; //面光
    /** 平行光阴影（见 TLightInterfaces.DirectionLightParams） */
    shadowNear?: number;
    shadowFar?: number;
    shadowMapSize?: number;
    shadowCameraLeft?: number;
    shadowCameraRight?: number;
    shadowCameraTop?: number;
    shadowCameraBottom?: number;
    shadowBias?: number;
    shadowNormalBias?: number;
    shadowRadius?: number;
}

interface effectComposerParams {
    outlinePass?: outlinepassParams;
    outlinePass_red?: outlinepassParams;
    bloomPass?: bloomPassParams;
}

interface outlinepassParams {
    edgeStrength?: number;
    edgeGlow?: number; //发光
    edgeThickness?: number; //光晕粗
    pulsePeriod?: number; //闪烁
    usePatternTexture?: boolean; //true
    visibleEdgeColor?: string;
    hiddenEdgeColor?: string;
    /** 并发描边槽位上限（每个并发呼吸组独占一个槽，各自独立颜色），默认 8 */
    maxOutlineSlots?: number;
    /** 呼吸脉动速度 */
    breathSpeed?: number;
    /** 自发光强度下限 */
    emissiveMin?: number;
    /** 自发光强度上限（过大易洗白模型） */
    emissiveMax?: number;
    /** 描边强度相对 edgeStrength 的下限比例 */
    edgeMinRatio?: number;
    /** 描边强度相对 edgeStrength 的上限比例 */
    edgeMaxRatio?: number;
    /** 呼吸色混入原 emissive 的最大比例（0~1） */
    emissiveColorMix?: number;
}
interface bloomPassParams {
    strength?: number; //泛光的强度
    radius?: number; //泛光散发的半径
    threshold?: number; //泛光的光照强度阈值
}

interface skyColorsParams {
    top?: string;
    line?: string;
    bottom?: string;
}

interface skyConfigsParams {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    skyCenter?: xyz;
}

// export interface AnimationParams {
//     loop: boolean;
// }
