import {
  BackSide,
  DoubleSide,
  FrontSide,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  MeshDepthMaterial,
  MeshMatcapMaterial,
  MeshNormalMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshToonMaterial,
  LineBasicMaterial,
  LineDashedMaterial,
  MeshDistanceMaterial,
  PointsMaterial,
  ShadowMaterial,
  RGBFormat,
  SpriteMaterial,
  RawShaderMaterial,
  ShaderMaterial,
  TextureLoader,
  CubeTextureLoader,
  VideoTexture,
  Texture,
  CanvasTexture,
  CubeTexture,
  Color,
  PlaneGeometry,
  RepeatWrapping,
  Vector3,
  IUniform,
  Side,
  DataTexture,
  TypedArray,
  PixelFormat,
  TextureDataType,
} from "three";

import { Water } from "three/examples/jsm/objects/Water";

export class TMaterial {
  initImageTexture(url: string): Texture {
    return new TextureLoader().load(url);
  }

  /**
   * @description 创建精灵材质
   * @author LL
   * @param {string} url
   * @param {string} color
   * @param {boolean} fog
   * @return {*}  {SpriteMaterial}
   */
  public initSpriteMaterial(
    url: string,
    color: string,
    fog: boolean
  ): SpriteMaterial {
    var textureLoader = new TextureLoader();

    var mapB = textureLoader.load(url);
    var materialB = new SpriteMaterial({ map: mapB, color: color, fog: fog });

    return materialB;
  }

  /**
   * @description 生成视频材质
   * @author LL
   * @date 2021/09/02
   * @param {HTMLVideoElement} videoDom
   */
  public initVideoMaterial(videoDom: HTMLVideoElement): VideoTexture {
    var texture = new VideoTexture(videoDom);
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.format = RGBFormat;

    return texture;
  }

  /**
   * @description 图片材质
   * @author LL
   * @date 2022/5/24
   * @param {string} url
   * @returns {*}  {MeshBasicMaterial}
   * @memberof TMaterial
   */
  public initPicMaterial(url: string): MeshBasicMaterial {
    const texture = new TextureLoader().load(url);
    let material = new MeshBasicMaterial();
    material.map = texture;
    return material;
  }

  /**
   * @description 创建物理网格材质
   * @author gj
   * @date 2023/11/09
   * @param color 材质的颜色
   * @param map 颜色贴图
   * @param envMap 环境贴图
   * @param metalness 金属度  非金属材质0.0，金属使用1.0 范围从0.0-1.0
   * @param roughness 粗糙度 0.0表示平滑的镜面反射，1.0表示完全漫反射。默认值为1.0
   * @param clearcoat 表示clear coat层的强度 范围从0.0到1.0m,默认为0.0
   * @param clearcoatRoughness clear coat层的粗糙度，由0.0到1.0。 默认为0.0
   * @param envMapIntensity 通过乘以环境贴图的颜色来缩放环境贴图的效果
   * @param side 定义将要渲染哪一面  正面0，背面1, 双面2 默认为正面
   * @return {*} {MeshPhysicalMaterial} 物理网格材质
   */
  public initPhysicalMaterial(
    color: string | number | Color,
    map?: Texture,
    envMap?: Texture,
    metalness?: number,
    roughness?: number,
    clearcoat?: number,
    clearcoatRoughness?: number,
    envMapIntensity?: number,
    side?: number
  ): MeshPhysicalMaterial {
    return new MeshPhysicalMaterial({
      color: color,
      map: map,
      envMap: envMap,
      metalness: metalness,
      roughness: roughness,
      clearcoat: clearcoat,
      clearcoatRoughness: clearcoatRoughness,
      envMapIntensity: envMapIntensity,
      side:
        side === 0 || side == null
          ? FrontSide
          : side === 1
          ? BackSide
          : DoubleSide,
    });
  }

  /**
   * @description 创建点材质
   * @author gj
   * @date 2023/11/10
   * @param color 材质的颜色
   * @param vertexColors 定义材料是否使用顶点颜色，默认false ---如果该选项设置为true，则color属性失效
   * @param size 设置点的大小 默认值为1.0
   * @param map 颜色贴图
   * @return {*} {PointsMaterial} 点材质
   */
  public initPointsMaterial(
    color: string | number | Color,
    vertexColors: boolean,
    size?: number,
    map?: Texture
  ): PointsMaterial {
    return new PointsMaterial({
      color: color,
      vertexColors: vertexColors,
      size: size,
      map: map,
    });
  }

  /**
   * @description 创建卡通材质
   * @author gj
   * @date 2023/11/10
   * @param color 材质的颜色
   * @param emissive 发射（光）颜色
   * @param map 颜色贴图
   * @param gradientMap 卡通着色的渐变贴图
   * @return {*} {MeshToonMaterial} 卡通材质
   */
  public initToonMaterial(
    color: string | number | Color,
    emissive?: string | number | Color,
    map?: Texture,
    gradientMap?: Texture
  ): MeshToonMaterial {
    return new MeshToonMaterial({
      color: color,
      emissive: emissive,
      map: map,
      gradientMap: gradientMap,
    });
  }

  /**
   * @description 创建原始着色器材质
   * @author gj
   * @date 2023/11/13
   * @param vertexShader 顶点着色器的GLSL代码
   * @param fragmentShader 片元着色器的GLSL代码
   * @param uniforms uniforms
   * @param vertexColors 定义是否使用顶点着色。默认为false
   * @param side 定义将要渲染哪一面  正面0，背面1, 双面2 默认为正面
   * @return {*} {RawShaderMaterial} 原始着色器材质
   */
  public initRawShaderMaterial(
    vertexShader: string,
    fragmentShader: string,
    uniforms?: { [p: string]: IUniform },
    vertexColors?: boolean,
    side?: number
  ): RawShaderMaterial {
    return new RawShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms ?? null,
      vertexColors: vertexColors ? vertexColors : false,
      side:
        side === 0 || side == null
          ? FrontSide
          : side === 1
          ? BackSide
          : DoubleSide,
    });
  }

  /**
   * @description 创建着色器材质
   * @author gj
   * @date 2023/11/13
   * @param uniforms uniforms
   * @param vertexShader 顶点着色器的GLSL代码
   * @param fragmentShader 片元着色器的GLSL代码
   * @return {*} {ShaderMaterial} 着色器材质
   */
  public initShaderMaterial(
    uniforms: { [p: string]: IUniform },
    vertexShader: string,
    fragmentShader: string
  ): ShaderMaterial {
    return new ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });
  }

  /**
   * @description 阴影材质; 此材质可以接收阴影，但在其他方面完全透明。
   * @author LL
   * @date 2023/11/13
   * @returns {*}
   * @memberof TMaterial
   */
  public initShadowMaterial(): ShadowMaterial {
    const material = new ShadowMaterial();
    return material;
  }

  /**
   * @description 给模型设置水波纹材质（需要将色调映射 设置为 NoToneMapping）
   * @author LL
   * @date 2023/11/13
   * @param {(Geometry | BufferGeometry)} geometry 模型
   * @param {number} width
   * @param {number} height
   * @param {string} url
   * @param {(string | number | Color)} [waterColor] 水颜色
   * @param {Vector3} [sunDirection] 太阳方向
   * @param {(string | number | Color)} [sunColor] 太阳颜色
   * @returns {*}
   * @memberof TMaterial
   */
  public setWaterSkin(
    geometry: PlaneGeometry,
    width: number,
    height: number,
    url: string,
    waterColor?: string | number | Color,
    sunDirection?: Vector3,
    sunColor?: string | number | Color
  ): Water {
    let water = new Water(geometry, {
      textureWidth: width,
      textureHeight: height,
      waterNormals: new TextureLoader().load(url, function (texture) {
        texture.wrapS = texture.wrapT = RepeatWrapping;
      }),
      sunDirection: sunDirection,
      sunColor: sunColor,
      waterColor: waterColor,
      //   distortionScale: 0,
    });
    return water;
  }

  /**
   * @description 创建基础线条材质
   * @author my
   * @date 2023/12/08
   * @param color 线条材质颜色
   * @param linecap 线条两端样式，可选值为 'butt', 'round' 和 'square'。默认值为 'round'
   * @param linejoin 线连接节点样式，可选值为 'round', 'bevel' 和 'miter'。默认值为 'round'
   * @param map 纹理贴图
   * @return {*} {LineBasicMaterial} 基础线条材质
   */
  public initLineBasicMaterial(
    color: string | number | Color,
    linecap?: string,
    linejoin?: string,
    map?: Texture
  ): LineBasicMaterial {
    return new LineBasicMaterial({
      color: color,
      linecap: linecap,
      linejoin: linejoin,
      //@ts-ignore
      map: map,
    });
  }

  /**
   * @description 创建虚线材质
   * @author my
   * @date 2023/12/08
   * @param color 虚线材质颜色
   * @param scale 虚线材质线条中虚线部分的占比，默认值为1
   * @param dashSize 虚线材质虚线的大小，默认值为3
   * @param gapSize 虚线材质间隙大小，默认值为1
   * @return {*} {LineDashedMaterial} 虚线材质
   */
  public initLineDashedMaterial(
    color: string | number | Color,
    scale?: number,
    dashSize?: number,
    gapSize?: number
  ): LineDashedMaterial {
    return new LineDashedMaterial({
      color: color,
      scale: scale,
      dashSize: dashSize,
      gapSize: gapSize,
    });
  }

  /**
   * @description 创建基础网格材质
   * @author my
   * @date 2023/12/12
   * @param color 基础网格材质颜色
   * @return {*} {MeshBasicMaterial} 基础网格材质
   */
  public initMeshBasicMaterial(
    color: string | number | Color
  ): MeshBasicMaterial {
    return new MeshBasicMaterial({
      color: color,
    });
  }

  /**
   * @description 创建深度网格材质
   * @author my
   * @date 2023/11/13
   * @param alphaMap 灰度纹理贴图
   * @param map 颜色贴图
   * @param wireframe 将几何体渲染为线框。默认为false（即渲染为平滑着色）
   * @return {*} {MeshBasicMaterial} 深度网格材质
   */
  public initMeshDepthMaterial(
    alphaMap?: Texture,
    map?: Texture,
    wireframe?: boolean
  ): MeshDepthMaterial {
    return new MeshDepthMaterial({
      alphaMap: alphaMap,
      map: map,
      wireframe: wireframe,
    });
  }

  /**
   * @description 创建MeshDistanceMaterial
   * @author my
   * @date 2023/12/12
   * @param alphaMap 灰度纹理贴图,默认为null
   * @param map 颜色贴图
   * @return {*} {MeshDistanceMaterial} MeshDistanceMaterial材质
   */
  public initMeshDistanceMaterial(
    alphaMap?: Texture,
    map?: Texture
  ): MeshDistanceMaterial {
    return new MeshDistanceMaterial({
      alphaMap: alphaMap,
      map: map,
    });
  }

  /**
   * @description 从原始数据创建一个纹理贴图
   * @author gj
   * @date 2023/11/10
   * @param data 包含纹理数据的数组或类型化数组
   * @param width 纹理的宽度
   * @param height 纹理的高度
   * @param format 纹理的格式
   * @param type 纹理的数据类型
   * @return {*} {DataTexture} 原始数据纹理贴图
   */
  public initDataTexture(
    data: TypedArray,
    width: number,
    height: number,
    format?: PixelFormat,
    type?: TextureDataType
  ): DataTexture {
    const texture = new DataTexture(data, width, height, format, type);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * @description 创建基础纹理贴图
   * @author gj
   * @date 2023/11/09
   * @param {url} url 图片路径
   * @return {*}  {Texture}  基础纹理贴图
   */
  public initBasicTexture(url: string): Texture {
    return new TextureLoader().load(url);
  }

  /**
   * @description 从Canvas元素中创建纹理贴图
   * @author gj
   * @date 2023/11/09
   * @param {canvasDom} canvasDom 画布元素
   * @return {*}  {CanvasTexture} Canvas纹理贴图
   */
  public initCanvasTexture(canvasDom: HTMLCanvasElement): CanvasTexture {
    return new CanvasTexture(canvasDom);
  }

  /**
   * @description 创建一个由6张图片组成的立方纹理
   * @author gj
   * @date 2023/11/09
   * @param {pathPrefix} pathPrefix 图片路径前缀
   * @param {picNameList} picNameList 图片名称集合
   * @return {*}  {CubeTexture} 立方纹理
   */
  public initCubeTexture(
    pathPrefix: string,
    picNameList: string[]
  ): CubeTexture {
    const loader = new CubeTextureLoader();
    loader.setPath(pathPrefix);
    return loader.load(picNameList);
  }
}
