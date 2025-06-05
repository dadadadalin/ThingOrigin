/** 创建场景参数 */
interface ThingOriginParams {
  shadow?: boolean; //是否产生阴影
  scene?: sceneParam;
  camera?: cameraParams;
  lights?: lightParams[];
  controls?: controlsParams;
  modelList?: modelInfoParams[];
  markerList?: markerListParams[];
  views?: cameraViewParams[];
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

interface css2dFormParams {
  label?: string;
  content?: any;
  type?: string;
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
  environment?: environmentParams;
  stats?: statsParams;
  fog?: fogParams;
}
/**
 * @description
 * @author LL
 * @date 2023/11/06
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
}
interface shadowMapParams {
  enabled: boolean;
}

interface toneMappingParams {
  type: string;
  typeList: string[];
}
interface backgroundParams {
  type?: string;
  sky?: skyParams;
  color?: colorParams;
  img?: imgParams;
  cubeMap?: cubeMapParams;
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
  color?: skyColorParams;
  params?: skyParams;
}
interface skyColorParams {
  top?: string;
  line?: string;
  bottom?: string;
}
interface skyParams {
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  skyCenter?: number[];
}
interface colorParams {
  alpha?: number; //透明度 取值范围0~1
  color?: string;
}

interface imgParams {
  url?: string;
}

interface cubeMapParams {
  url?: string[];
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

interface cameraViewParams {
  name: string;
  domID?: string;
  background?: string;
  offset?: xyz;
  up?: xyz;
  lookAt?: string;
  camera?: any;
  renderer?: any;
}

interface lightParams {
  type?: string;
  name?: string;
  color?: string;
  intensity?: number;
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
  skyCenter?: number[];
}

interface AnimationParams {
  loop: boolean;
}
