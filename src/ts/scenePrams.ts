/** 创建场景参数 */
interface ThingOriginParams {
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

interface xyz {
  x: number;
  y: number;
  z: number;
}

interface rotationXYZ {
  _x: number;
  _y: number;
  _z: number;
  [key: string]: any;
}

interface markerInfoParams {
  modelName?: string;
  markerName?: string;
  base?: any;
  name?: string;
  id?: number;
  position?: xyz;
  rotation?: xyz | rotationXYZ;
  scale?: xyz;
  userData?: any;
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
  grid?: gridParams;
}

interface controlsCommon {
  active?: boolean;
}
interface pointerLockParams {
  speed?: number;
}
interface raycasterParams {
  active?: boolean;
  events?: raycasterEventParams;
}

interface dragParams {
  active?: boolean;
}
interface orbitParams {
  active?: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
  enableDamping: boolean;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
}
interface raycasterEventParams {
  click?: boolean;
  mousemove?: boolean;
}

interface axesParams {
  active?: boolean;
  length?: number;
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
interface renderQualityParam {
  alpha?: boolean;
  autoClear?: boolean;
  antialias?: boolean; //
  shadowMap?: shadowMapParams;
  toneMapping?: toneMappingParams;
  logarithmicDepthBuffer?: boolean;
}
interface shadowMapParams {
  enabled: boolean;
}

interface toneMappingParams {
  type: string;
  typeList: string[];
}
interface backgroundParams {
  type?: "color" | "sky" | "img" | "cubeMap" | "workshop";
  sky?: skyParams;
  color?: colorParams;
  img?: imageParams;
  cubeMap?: cubeMapParams;
  workshop?: workshopParams;
}

interface groundParams {
  active: boolean;
  size: xyz;
  material: groundMaterialParams;
}

interface groundMaterialParams {
  type: string;
  color?: colorParams;
  image?: imageParams;
}

interface environmentParams {
  type: string;
  typeList: string[];
  EquirectangularReflectionMappingConfig: EquirectangularReflectionMappingConfigParams;
}

interface EquirectangularReflectionMappingConfigParams {
  url: string;
}
interface skyParams {
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  skyCenter?: xyz;
}

interface colorParams {
  alpha?: number; //透明度 取值范围0~1
  color?: string;
  opacity?: number;
}

interface imageParams {
  url?: string;
  repeat?: repeatParams;
}

interface repeatParams {
  width: number;
  height: number;
}

interface cubeMapParams {
  url?: string[];
}

interface workshopParams {
  modelType: string;
  url: string;
}

interface statsParams {
  show?: boolean;
  mode?: number;
}

interface fogParams {
  show?: boolean;
  color?: string;
  cameraView?: boolean;
}

interface cameraParams {
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
  type?: string;
  name?: string;
  color?: string;
  intensity?: number;
  distance?: number;
  position?: xyz;
  visible: boolean;
}

interface effectComposerParams {
  outlinePass?: outlinepassParams;
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

interface AnimationParams {
  loop: boolean;
}
