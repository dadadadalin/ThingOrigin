interface prs {
  position: xyz;
  rotation: xyz;
  scale: xyz;
}

interface modelInfoParams {
  modelName?: string;
  base?: any;
  material?: any;
  loadType?: string;
  position?: xyz;
  rotation?: xyz | rotationXYZ;
  scale?: xyz;
  modelType?: string;
  modelUrl?: string;
  userData?: any;
  visible?: boolean;
  [key: string]: any;
}

interface updateInfoParams {
  modelInfo: modelInfoParams;
  update: string;
}

/**
 * @description 文字参数
 * @author LL
 * @date 2021/09/16
 * @size number 字体大小，默认值为100。
 * @height number 挤出文本的厚度。默认值为50。
 * @curveSegments number （表示文本的）曲线上点的数量。默认值为12。
 * @bevelEnabled boolean 是否开启斜角，默认为false。
 * @bevelThickness number 文本上斜角的深度，默认值为20。
 * @bevelSize number 斜角与原始文本轮廓之间的延伸距离。默认值为8。
 * @bevelSegments number 斜角的分段数。默认值为3。
 * @sideColor number 文字侧边颜色
 */
interface textParams {
  color: string;
  sideColor?: string;
  size?: number;
  height?: number;
  curveSegments?: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
}

interface textShapeParams {
  color: string;
  transparent: boolean;
  opacity: number;
  size: number;
}

interface textLineParams {
  color: string;
  size: number;
  opacity?: number;
  lineWidth?: number;
}

interface modelInfo {
  modelName: string;
  modelUrl: string;
  position: number[];
  scale: number[];
  rotation: number[];
  saved: boolean;
  userData: object;
}

/**
 * @description 几何体参数
 * @author LL
 * @date 2021/07/23
 * @position number[] 摆放位置 例:[0,0,0]
 * @scale number[] 缩放系数 例:[2,2,2]
 */
interface modelConfigs {
  position?: number[];
  scale?: number[];
  rotation?: number[];
}

/**
 * @description 几何体参数
 * @author LL
 * @date 2021/07/23
 * @color string 颜色 例: '#f00'
 * @position number[] 摆放位置 例:[0,0,0]
 * @scale number[] 缩放系数 例:[2,2,2]
 * @scale rotation[] 缩放系数 例:[0.5,0,0]
 */
interface geometryConfigs {
  color?: string;
  position?: number[];
  scale?: number[];
  rotation?: number[];
}

/**
 * @description 创建球体参数
 * @author LL
 * @date 2021/07/23
 * @radius number 球体半径，默认为1
 * @widthSegments number 水平分段数（沿着经线分段），最小值为3，默认值为32。
 * @heightSegments number 垂直分段数（沿着纬线分段），最小值为2，默认值为16。
 * @phiStart number 指定水平（经线）起始角度，默认值为0。
 * @phiLength number  指定水平（经线）扫描角度的大小，默认值为 Math.PI * 2。
 * @thetaStart number 指定垂直（纬线）起始角度，默认值为0。
 * @thetaLength number 指定垂直（纬线）扫描角度大小，默认值为 Math.PI。
 */
interface sphereParams {
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  phiStart?: number;
  phiLength?: number;
  thetaStart?: number;
  thetaLength?: number;
}

interface xyz {
  x: number;
  y: number;
  z: number;
}

interface materialParams {
  type: string;
  color: string;
}

/**
 * @description
 * @author LL
 * @date 2024/06/03
 * @interface cubeBaseParam
 * @width number X轴上面的宽度，默认值为1。
 * @height number Y轴上面的高度，默认值为1。
 * @depth number Z轴上面的高度，默认值为1。
 * @widthSegments number 宽度的分段数，默认值是1。
 * @heightSegments number 高度的分段数，默认值是1。
 * @depthSegments number 深度的分段数，默认值是1。
 */
interface cubeBaseParam {
  width?: number;
  height?: number;
  depth?: number;
  widthSegments?: number;
  heightSegments?: number;
  depthSegments?: number;
}

/**
 * @description 创建圆锥参数
 * @author LL
 * @date 2021/08/19
 * @radius number 圆锥底部的半径，默认值为1。
 * @height number 圆锥的高度，默认值为1。
 * @radialSegments number 圆锥侧面周围的分段数，默认为8。
 * @heightSegments number 圆锥侧面沿着其高度的分段数，默认值为1。
 * @openEnded boolean 指明该圆锥的底面是开放的还是封顶的。默认值为false，即其底面默认是封顶的
 * @thetaStart number 第一个分段的起始角度，默认为0。
 * @thetaLength number 圆锥底面圆扇区的中心角，通常被称为“θ”（西塔）。默认值是2*Pi，这使其成为一个完整的圆锥。
 */
interface coneParams {
  radius?: number;
  height?: number;
  radialSegments?: number;
  heightSegments?: number;
  openEnded?: boolean;
  thetaStart?: number;
  thetaLength?: number;
}

/**
 * @description 创建圆柱体参数
 * @author LL
 * @date 2021/08/19
 * @radiusTop number 圆柱的顶部半径，默认值是1。
 * @radiusBottom number 圆柱的底部半径，默认值是1。
 * @height number 圆柱的高度，默认值是1。
 * @radialSegments number 圆柱侧面周围的分段数，默认为8。
 * @heightSegments number 圆柱侧面沿着其高度的分段数，默认值为1。
 * @openEnded boolean 指明该圆锥的底面是开放的还是封顶的。默认值为false，即其底面默认是封顶的
 * @thetaStart number 第一个分段的起始角度，默认为0
 * @thetaLength number 圆柱底面圆扇区的中心角，通常被称为“θ”（西塔）。默认值是2*Pi，这使其成为一个完整的圆柱。
 */
interface cylinderParams {
  radiusTop?: number;
  radiusBottom?: number;
  height?: number;
  radialSegments?: number;
  heightSegments?: number;
  openEnded?: boolean;
  thetaStart?: number;
  thetaLength?: number;
}

/**
 * @description 创建点参数
 * @author LL
 * @date 2021/08/19
 * @color string 颜色 例:'#f00'
 * @size number 点大小 例: 10
 */
interface pointConfigsParams {
  color: string;
  size: number;
}

/**
 * @description 精灵形状参数
 * @author LL
 * @date 2021/09/16
 * @shape string 形状类型 例:'sphere'||'triangle'
 * @color string 颜色 例:'#f00'
 * @radius number 半径 例:5
 */
interface spriteShapeParams {
  shape: string;
  color: string;
  radius: number;
}

/**
 * @description 精灵图片参数
 * @author LL
 * @date 2021/09/16
 * @url string 图片地址
 * @size number 尺寸大小 例: 10
 */
interface spritePicParams {
  url: string;
  size: number;
}

/**
 * @description 精灵数据格式
 * @author LL
 * @date 2021/09/16
 * @x number
 * @y number
 * @z number
 * @name string
 */
interface spriteData extends xyz {
  name: string;
}

/**
 * @description 点云数据格式
 * @author LL
 * @date 2021/09/16
 * @x number
 * @y number
 * @z number
 */
interface pointsData extends xyz {}

/**
 * @description Line参数
 * @author LL
 * @date 2022-04-28
 * @interface LineParams
 * @color 颜色
 * @lineWidth 线直径长度
 * @linecap 线两端的样式 例:'butt'||'round'||'square'
 * @linejoin 接节点的样式 例:'round'||'bevel'||'miter'
 */
interface LineParams {
  color?: string;
  lineWidth?: number;
  linecap?: string;
  linejoin?: string;
}

interface ArrowParams {
  color?: string;
  headLength?: number;
  headWidth?: number;
}

interface planeParams {
  width?: number;
  height?: number;
  widthSegments?: number;
  heightSegments?: number;
}
