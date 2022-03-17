/** 创建场景参数 */
interface ThingOriginParams {
    fileRoot: string;
    shadow?: boolean; //是否产生阴影
    scene: sceneParam;
    camera: cameraParams;
    lights: lightParams[];
    controls: controlsParams;
    models: modelParams[];
    css2d: css2dParams[];
    helper: helperParams;
    effectComposer: effectComposerParams;
}

interface controlsParams {
    orbit: controlsCommon;
    raycaster: raycasterParams;
    transform: controlsCommon;
    pointerLock: pointerLockParams;
}

interface xyz {
    x: number;
    y: number;
    z: number;
}

interface modelParams {
    name: string;
    position: xyz;
    rotation: xyz;
    scale: xyz;
    type: string;
    ownCSS2D: boolean;
    fileType: string;
    folder: string;
    fileName: string;
    modelType: string;
}

interface css2dParams {
    uuid: string;
    name: string;
    domTypeIndex: string;
    domId: string;
    css2dBoxUuid: string;
    css2dForm: css2dFormParams[];
}

interface css2dFormParams {
    label: string;
    content: any;
    type: string;
}

interface helperParams {
    axes: axesParams;
    grid: gridParams;
}

interface controlsCommon {
    active: boolean;
}
interface pointerLockParams {
    speed: number;
}
interface raycasterParams {
    active: boolean;
    events: raycasterEventParams;
}
interface raycasterEventParams {
    click: boolean;
    mousemove: boolean;
}

interface axesParams {
    active: boolean;
    length: number;
}

interface gridParams {
    active: boolean;
    size: number;
    divisions: number;
    centerLineColor: string;
    gridColor: string;
}

interface sceneParam {
    webglrenderer: webglrendererParams;
    background: backgroundParams;
    stats: statsParams;
}
interface webglrendererParams {
    gammaFactor: number;
    alpha: boolean;
}
interface backgroundParams {
    type: string;
    sky: skyParams;
    color: colorParams;
    img: imgParams;
}
interface skyParams {
    color: skyColorParams;
    params: skyParams;
}
interface skyColorParams {
    top: string;
    line: string;
    bottom: string;
}
interface skyParams {
    radius: number;
    widthSegments: number;
    heightSegments: number;
    skyCenter: number[];
}
interface colorParams {
    alpha: number; //透明度 取值范围0~1
    color: string;
}

interface imgParams {
    url: string;
}

interface statsParams {
    show: true;
    mode: number;
}

interface cameraParams {
    position: xyz;
    near?: number;
    far?: number;
}

interface lightParams {
    name: string;
    color: string;
    intensity: number;
    position: xyz;
}

interface effectComposerParams {
    outlinePass: outlinepassParams;
}

interface outlinepassParams {
    edgeStrength: number;
    edgeGlow: number; //发光
    edgeThickness: number; //光晕粗
    pulsePeriod: number; //闪烁
    usePatternTexture: boolean; //true
    visibleEdgeColor: string;
    hiddenEdgeColor: string;
}

interface skyColorsParams {
    top: string;
    line: string;
    bottom: string;
}

interface skyConfigsParams {
    radius: number;
    widthSegments: number;
    heightSegments: number;
    skyCenter: number[];
}
