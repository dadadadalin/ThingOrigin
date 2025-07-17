import {
  LinearFilter,
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
} from "three";

import { Water } from "three/examples/jsm/objects/Water";
import {
  CubeTextureParams,
  MapType,
  BaseMapParams,
  NormalMapParams,
  MaterialMapsParams,
  VideoTextureParams,
  DataTextureParams,
} from "./TMaterialInterfaces";

/**
 * 材质、贴图
 */
export class TMaterial {
  // 创建纹理加载器
  textureLoader = new TextureLoader();

  public async initImageMaterial(params: imageParams) {

    let texture = await this.textureLoader.load(params.url);

    if(params.repeat){
      if(params.repeat.width && params.repeat.width > 1){
        texture.wrapS = RepeatWrapping;
      }
      if(params.repeat.height && params.repeat.height > 1){
        texture.wrapT = RepeatWrapping;
      }
      texture.repeat.set(params.repeat.width, params.repeat.height);
    }

    let material = new MeshPhongMaterial({ color: "#fff", map: texture });

    return material;
  }

  /**
   * 创建基础材质
   * @author my
   * @since 2023/12/12
   * @param [params] 材质参数配置
   */
  public initBasicMaterial(
    params: Partial<MeshBasicMaterialParameters> = {}
  ): MeshBasicMaterial {
    // 定义默认参数
    const defaultParams: MeshBasicMaterialParameters = {
      color: 0xffffff,
      transparent: false,
      opacity: 1.0,
      wireframe: false,
      side: FrontSide,
    };

    // 合并默认参数和用户参数
    const mergedParams = { ...defaultParams, ...params };

    // 创建并返回材质实例
    return new MeshBasicMaterial(mergedParams);
  }
  /**
   * 创建漫反射材质（受光照影响）
   * @author gj
   * @since 2025/07/09
   * @param [params] 材质参数配置
   */
  public initLambertMaterial(
    params: Partial<MeshLambertMaterialParameters> = {}
  ): MeshLambertMaterial {
    const defaultParams: MeshLambertMaterialParameters = {
      color: 0xffffff,
      transparent: false,
      opacity: 1.0,
      side: FrontSide,
      emissive: 0x000000,
      emissiveIntensity: 1,
    };
    return new MeshLambertMaterial({ ...defaultParams, ...params });
  }

  /**
   * 创建高光材质（支持高光反射）
   * @author gj
   * @since 2025/07/09
   * @param [params] 材质参数配置
   */
  public initPhongMaterial(
    params: Partial<MeshPhongMaterialParameters> = {}
  ): MeshPhongMaterial {
    const defaultParams: MeshPhongMaterialParameters = {
      color: 0xffffff,
      transparent: false,
      opacity: 1.0,
      side: FrontSide,
      emissive: 0x000000,
      emissiveIntensity: 1,
      shininess: 30,
    };
    return new MeshPhongMaterial({ ...defaultParams, ...params });
  }
  /**
   * 标准网格材质（PBR标准材质基于物理的渲染）
   * @author gj
   * @since 2025/07/09
   * @param [params] 材质参数配置
   */
  public initStandardMaterial(
    params: Partial<MeshStandardMaterialParameters> = {}
  ): MeshStandardMaterial {
    const defaultParams: MeshStandardMaterialParameters = {
      color: 0xffffff,
      transparent: false,
      opacity: 1.0,
      side: FrontSide,
      emissive: 0x000000,
      emissiveIntensity: 1,
      metalness: 0,
      roughness: 1,
    };
    return new MeshStandardMaterial({ ...defaultParams, ...params });
  }
  /**
   * 物理网格材质（PBR标准材质基于物理的渲染）
   * @author gj
   * @since 2023/11/10
   * @param [params] 材质参数配置
   */
  public initPhysicalMaterial(
    params: Partial<MeshPhysicalMaterialParameters> = {}
  ): MeshPhysicalMaterial {
    const defaultParams: MeshPhysicalMaterialParameters = {
      color: 0xffffff,
      transparent: false,
      opacity: 1.0,
      side: FrontSide,
      emissive: 0x000000,
      emissiveIntensity: 1,
      metalness: 0,
      roughness: 1,
      clearcoat: 0,
      clearcoatRoughness: 0,
    };
    return new MeshPhysicalMaterial({ ...defaultParams, ...params });
  }
  /**
   * 创建点云材质
   * @author gj
   * @since 2023/11/10
   * @param [params] 材质参数配置
   */
  public initPointsMaterial(
    params: Partial<PointsMaterialParameters> = {}
  ): PointsMaterial {
    const defaultParams: PointsMaterialParameters = {
      color: 0xffffff,
      size: 1,
      sizeAttenuation: true,
      transparent: false,
      opacity: 1.0,
    };
    return new PointsMaterial({ ...defaultParams, ...params });
  }

  /**
   * 创建卡通渲染材质（Toon）
   * @author gj
   * @since 2023/11/10
   * @param [params] 材质参数配置
   */
  public initToonMaterial(
    params: Partial<MeshToonMaterialParameters> = {}
  ): MeshToonMaterial {
    const defaultParams: MeshToonMaterialParameters = {
      color: 0xffffff,
      transparent: false,
      opacity: 1.0,
      side: FrontSide,
      emissive: 0x000000,
      emissiveIntensity: 1,
    };
    return new MeshToonMaterial({ ...defaultParams, ...params });
  }
  /**
   * 创建Sprite材质
   * @author LL
   * @since 2023/11/10
   * @param [params] 材质参数配置
   */
  public initSpriteMaterial(
    params: Partial<SpriteMaterialParameters> = {}
  ): SpriteMaterial {
    const defaultParams: SpriteMaterialParameters = {
      color: 0xffffff,
      transparent: false,
      opacity: 1.0,
      rotation: 0,
      fog: true,
    };
    return new SpriteMaterial({ ...defaultParams, ...params });
  }

  /**
   * 创建阴影材质（用于投射和接收阴影的特殊材质）
   * @author LL
   * @since 2023/11/13
   * @param [params] 材质参数配置
   */
  public initShadowMaterial(
    params: Partial<ShadowMaterialParameters> = {}
  ): ShadowMaterial {
    const defaultParams: ShadowMaterialParameters = {
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
    };
    return new ShadowMaterial({ ...defaultParams, ...params });
  }

  /**
   * 创建深度材质（基于距离相机的深度渲染的材质）
   * @author my
   * @since 2023/11/13
   * @param [params] 材质参数配置
   */
  public initDepthMaterial(
    params: Partial<MeshDepthMaterialParameters> = {}
  ): MeshDepthMaterial {
    const defaultParams: MeshDepthMaterialParameters = {
      depthPacking: BasicDepthPacking,
      wireframe: false,
      side: FrontSide,
    };
    return new MeshDepthMaterial({ ...defaultParams, ...params });
  }

  /**
   * 创建距离材质（基于到参考点的距离渲染的材质）
   * @author my
   * @since 2023/12/12
   * @param [params] 材质参数配置
   */
  public initDistanceMaterial(
    params: Partial<MeshDistanceMaterialParameters> = {}
  ): MeshDistanceMaterial {
    const defaultParams: MeshDistanceMaterialParameters = {
      referencePosition: new Vector3(),
      nearDistance: 0,
      farDistance: 1,
      side: FrontSide,
    };
    return new MeshDistanceMaterial({ ...defaultParams, ...params });
  }
  /**
   * 创建法线网格材质
   * @author gj
   * @since 2025/07/12
   * @param [params] 材质参数配置
   */
  public initNormalMaterial(
    params: Partial<MeshNormalMaterialParameters> = {}
  ): MeshNormalMaterial {
    const defaultParams: MeshNormalMaterialParameters = {
      flatShading: false,
      transparent: false,
      opacity: 1.0,
      wireframe: false,
      side: FrontSide,
    };
    return new MeshNormalMaterial({ ...defaultParams, ...params });
  }

  /**
   * 创建线框材质
   * @author my
   * @since 2023/12/08
   * @param [params] 材质参数配置
   */
  public initLineMaterial(
    params: Partial<LineBasicMaterialParameters> = {}
  ): LineBasicMaterial {
    const defaultParams: LineBasicMaterialParameters = {
      color: 0xffffff,
      linewidth: 1,
      linecap: "round",
      linejoin: "round",
      transparent: false,
      opacity: 1.0,
    };
    return new LineBasicMaterial({ ...defaultParams, ...params });
  }

  /**
   * 创建虚线材质
   * @author my
   * @since 2023/12/08
   * @param [params] 材质参数配置
   */
  public initLineDashedMaterial(
    params: Partial<LineDashedMaterialParameters> = {}
  ): LineDashedMaterial {
    const defaultParams: LineDashedMaterialParameters = {
      color: 0xffffff,
      linewidth: 1,
      scale: 1,
      dashSize: 3,
      gapSize: 1,
      transparent: false,
      opacity: 1.0,
    };
    return new LineDashedMaterial({ ...defaultParams, ...params });
  }
  /**
   * 创建自定义着色器材质
   * @author gj
   * @since 2023/11/13
   * @param [params] 材质参数配置
   */
  public initRawShaderMaterial(
    params: Partial<ShaderMaterialParameters> = {}
  ): RawShaderMaterial {
    const defaultParams: ShaderMaterialParameters = {
      vertexShader: "",
      fragmentShader: "",
      uniforms: {},
      transparent: false,
      side: FrontSide,
    };
    return new RawShaderMaterial({ ...defaultParams, ...params });
  }

  /**
   * 创建Shader材质
   * @author gj
   * @since 2023/11/13
   * @param [params] 材质参数配置
   */
  public initShaderMaterial(
    params: Partial<ShaderMaterialParameters> = {}
  ): ShaderMaterial {
    const defaultParams: ShaderMaterialParameters = {
      vertexShader: "",
      fragmentShader: "",
      uniforms: {},
      transparent: false,
      side: FrontSide,
      wireframe: false,
    };
    return new ShaderMaterial({ ...defaultParams, ...params });
  }

  /**
     * 给模型设置水波纹材质
     * @author LL
     * @since 2023/11/13
     * @param {(Geometry | BufferGeometry)} geometry 模型
     * @param {number} width
     * @param {number} height
     * @param {string} url
     * @param {(string | number | Color)} [waterColor] 水颜色
     * @param {Vector3} [sunDirection] 太阳方向
     * @param {(string | number | Color)} [sunColor] 太阳颜色
     > [!NOTE]
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
  ): Water {
    let water = new Water(geometry, {
      textureWidth: width,
      textureHeight: height,
      waterNormals: this.textureLoader.load(url, function (texture) {
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
   * 创建并配置纹理贴图
   * @author gj
   * @since 2025/07/13
   * @param params 贴图参数
   */
  public initTextureMap(params: BaseMapParams | NormalMapParams): Texture {
    // 根据贴图类型设置默认参数
    const defaultParams = this.getDefaultMapParams(params.mapType);

    // 合并默认参数和用户参数
    const mergedParams = { ...defaultParams, ...params };

    // 创建纹理加载器
    const loader = new TextureLoader(mergedParams.loadingManager);

    // 加载纹理
    const texture = loader.load(
      mergedParams.url,
      mergedParams.onLoad,
      mergedParams.onProgress,
      mergedParams.onError ||
        ((err) => {
          console.error(`未能加载${mergedParams.mapType}映射：`, err);
        })
    );
    // 配置通用纹理属性
    this.configureCommonTextureProperties(texture, mergedParams);
    return texture;
  }

  /**
   * 批量创建材质贴图
   * @author gj
   * @since 2025/07/13
   * @param params 贴图参数集合
   */
  public initTextureMaps(params: MaterialMapsParams): {
    [key in MapType]?: Texture;
  } {
    const maps: { [key in MapType]?: Texture } = {} as any;

    // 为每种贴图类型创建纹理
    if (params.map)
      maps["map"] = this.initTextureMap({ ...params.map, mapType: "map" });
    if (params.normal)
      maps["normal"] = this.initTextureMap({
        ...params.normal,
        mapType: "normal",
        // normalScale: new Vector2(1, 1) 
      });
    if (params.roughness)
      maps["roughness"] = this.initTextureMap({
        ...params.roughness,
        mapType: "roughness",
      });
    if (params.metalness)
      maps["metalness"] = this.initTextureMap({
        ...params.metalness,
        mapType: "metalness",
      });
    if (params.ao)
      maps["ao"] = this.initTextureMap({ ...params.ao, mapType: "ao" });
    if (params.emissive)
      maps["emissive"] = this.initTextureMap({
        ...params.emissive,
        mapType: "emissive",
      });
    if (params.displacement)
      maps["displacement"] = this.initTextureMap({
        ...params.displacement,
        mapType: "displacement",
      });
    if (params.alpha)
      maps["alpha"] = this.initTextureMap({
        ...params.alpha,
        mapType: "alpha",
      });
    if (params.bump)
      maps["bump"] = this.initTextureMap({
        ...params.bump,
        mapType: "bump",
      });

    return maps;
  }

  /**
   * 配置通用纹理属性
   */
  private configureCommonTextureProperties(
    texture: Texture,
    params: BaseMapParams
  ) {
    // 配置纹理基础属性
    if (params.wrapS !== undefined) texture.wrapS = params.wrapS;
    if (params.wrapT !== undefined) texture.wrapT = params.wrapT;
    if (params.magFilter !== undefined) texture.magFilter = params.magFilter;
    if (params.minFilter !== undefined) texture.minFilter = params.minFilter;
    if (params.anisotropy !== undefined) texture.anisotropy = params.anisotropy;

    // 配置纹理变换属性
    if (params.repeat !== undefined) {
      if (Array.isArray(params.repeat)) {
        texture.repeat.set(params.repeat[0], params.repeat[1]);
      } else {
        texture.repeat.copy(params.repeat);
      }
    }

    if (params.offset !== undefined) {
      if (Array.isArray(params.offset)) {
        texture.offset.set(params.offset[0], params.offset[1]);
      } else {
        texture.offset.copy(params.offset);
      }
    }

    if (params.flipY !== undefined) texture.flipY = params.flipY;
    if (params.mapping !== undefined) texture.mapping = params.mapping;

    // 配置纹理高级属性
    if (params.format !== undefined) texture.format = params.format;
    if (params.type !== undefined) texture.type = params.type;
    //   if (params.encoding !== undefined) texture.encoding = params.encoding;
    if (params.generateMipmaps !== undefined)
      texture.generateMipmaps = params.generateMipmaps;
    if (params.premultiplyAlpha !== undefined)
      texture.premultiplyAlpha = params.premultiplyAlpha;
    if (params.unpackAlignment !== undefined)
      texture.unpackAlignment = params.unpackAlignment;
  }

  /**
   * 获取特定贴图类型的默认参数
   */
  private getDefaultMapParams(mapType: MapType): BaseMapParams {
    const baseDefaults: BaseMapParams = {
      url: "",
      mapType,
      wrapS: RepeatWrapping,
      wrapT: RepeatWrapping,
      magFilter: LinearFilter,
      minFilter: LinearMipmapLinearFilter,
      anisotropy: 1,
      repeat: new Vector2(1, 1),
      offset: new Vector2(0, 0),
      flipY: true,
      mapping: UVMapping,
      format: RGBFormat,
      type: UnsignedByteType,
      // encoding: mapType === 'map' || mapType === 'emissive' || mapType === 'alpha'
      //   ? sRGBEncoding
      //   : LinearEncoding,
      generateMipmaps: true,
      premultiplyAlpha: false,
      unpackAlignment: 4,

      // 默认强度参数
      aoMapIntensity: 1,
      bumpScale: 1,
      roughnessScale: 1,
      metalnessScale: 1,
      displacementScale: 1,
      emissiveIntensity: 1,
    };
    return baseDefaults;
  }


  /**
   * 加载立方体环境贴图
   * @author gj
   * @since 2025/07/09
   * @param [params] 纹理参数配置
   */
  public initCubeTexture(params: Partial<CubeTextureParams>): CubeTexture {
    const loader = new CubeTextureLoader(params.loadingManager);
    if (params.urls && params.urls.length !== 6) {
      console.warn("CubeTextureParams.urls 必须是长度为 6 的数组。");
    }
    // 构建6个面的纹理路径
    const prefix = params.pathPrefix || "";
    const paths = [
      `${prefix}${params.urls[0]}`,
      `${prefix}${params.urls[1]}`,
      `${prefix}${params.urls[2]}`,
      `${prefix}${params.urls[3]}`,
      `${prefix}${params.urls[4]}`,
      `${prefix}${params.urls[5]}`,
    ];

    // 加载立方体贴图
    const texture = loader.load(
      paths,
      params.onLoad,
      params.onProgress,
      params.onError ||
        ((err) => {
          console.error(`未能加载 cube texture:`, err);
        })
    );

    // 配置纹理属性
    if (params.magFilter !== undefined) texture.magFilter = params.magFilter;
    if (params.minFilter !== undefined) texture.minFilter = params.minFilter;
    if (params.anisotropy !== undefined) texture.anisotropy = params.anisotropy;
    if (params.format !== undefined) texture.format = params.format;
    if (params.type !== undefined) texture.type = params.type;
    //   if (params.encoding !== undefined) texture.encoding = params.encoding;
    if (params.generateMipmaps !== undefined)
      texture.generateMipmaps = params.generateMipmaps;
    if (params.unpackAlignment !== undefined)
      texture.unpackAlignment = params.unpackAlignment;

    return texture;
  }

  /**
   * 从原始数据创建一个纹理贴图
   * @author gj
   * @since 2025/07/09
   * @param [params] 纹理参数配置
   */
  public initDataTexture(params: DataTextureParams): DataTexture {
    // 定义默认参数
    const defaultParams: Omit<
      DataTextureParams,
      "data" | "width" | "height" | "format"
    > = {
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
      unpackAlignment: 4,
    };

    // 合并用户参数和默认参数
    const mergedParams = { ...defaultParams, ...params };

    // 创建数据纹理
    const texture = new DataTexture(
      mergedParams.data,
      mergedParams.width,
      mergedParams.height,
      mergedParams.format,
      mergedParams.type
    );

    // 配置纹理属性
    texture.magFilter = mergedParams.magFilter;
    texture.minFilter = mergedParams.minFilter;
    texture.anisotropy = mergedParams.anisotropy;
    texture.wrapS = mergedParams.wrapS;
    texture.wrapT = mergedParams.wrapT;

    // 配置纹理变换属性
    if (Array.isArray(mergedParams.repeat)) {
      texture.repeat.set(mergedParams.repeat[0], mergedParams.repeat[1]);
    } else {
      texture.repeat.copy(mergedParams.repeat);
    }

    if (Array.isArray(mergedParams.offset)) {
      texture.offset.set(mergedParams.offset[0], mergedParams.offset[1]);
    } else {
      texture.offset.copy(mergedParams.offset);
    }

    texture.flipY = mergedParams.flipY;
    texture.mapping = mergedParams.mapping;

    // 配置纹理高级属性
    //   texture.encoding = mergedParams.encoding;
    texture.generateMipmaps = mergedParams.generateMipmaps;
    texture.premultiplyAlpha = mergedParams.premultiplyAlpha;
    texture.unpackAlignment = mergedParams.unpackAlignment;

    // 标记纹理需要更新
    texture.needsUpdate = true;

    return texture;
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
      format: RGBFormat,
      type: UnsignedByteType,
      // encoding: sRGBEncoding,
      generateMipmaps: true,
      premultiplyAlpha: false,
      unpackAlignment: 4,
      needsUpdate: true,
      autoplay: true,
      loop: true,
      muted: true,
      playsinline: true,
    };
    // 合并用户参数和默认参数
    const mergedParams = { ...defaultParams, ...params };
    // 创建视频纹理
    const texture = new VideoTexture(mergedParams.videoDom);

    // 配置纹理属性
    texture.wrapS = mergedParams.wrapS;
    texture.wrapT = mergedParams.wrapT;
    texture.magFilter = mergedParams.magFilter;
    texture.minFilter = mergedParams.minFilter;
    texture.anisotropy = mergedParams.anisotropy;

    // 配置纹理变换属性
    if (Array.isArray(mergedParams.repeat)) {
      texture.repeat.set(mergedParams.repeat[0], mergedParams.repeat[1]);
    } else {
      texture.repeat.copy(mergedParams.repeat);
    }

    if (Array.isArray(mergedParams.offset)) {
      texture.offset.set(mergedParams.offset[0], mergedParams.offset[1]);
    } else {
      texture.offset.copy(mergedParams.offset);
    }

    texture.flipY = mergedParams.flipY;
    texture.mapping = mergedParams.mapping;

    // 配置纹理高级属性
    texture.format = mergedParams.format;
    texture.type = mergedParams.type;
    //   texture.encoding = params.encoding;
    texture.generateMipmaps = mergedParams.generateMipmaps;
    texture.premultiplyAlpha = mergedParams.premultiplyAlpha;
    texture.unpackAlignment = mergedParams.unpackAlignment;

    // 设置自动更新
    texture.needsUpdate = mergedParams.needsUpdate;

    return texture;
  }
}
