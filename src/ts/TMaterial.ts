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
    RawShaderMaterial,ShaderMaterial,
  TextureLoader,
  CubeTextureLoader,
  VideoTexture,
  Texture,
  CanvasTexture,
  CubeTexture,
    DataTexture,
    RGBFormat,TypedArray, PixelFormat, TextureDataType
} from "three";

export class TMaterial {
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
     * @param configParams 物理网格材质配置项
     * @return {*} {MeshPhysicalMaterial} 物理网格材质
     */
    public initPhysicalMaterial(configParams?: object): MeshPhysicalMaterial {
        // 创建默认的材质参数
        const defaultParams = {
            color: 0xffffff,
            map: null,
            metalness: 0.5,
            roughness: 0.5,
            clearcoat: 0.5,
            clearcoatRoughness: 0.5,
            envMapIntensity: 1,
            side: FrontSide
        };
        // 合并默认参数和传递的参数
        const materialParameters = Object.assign({}, defaultParams, configParams);
        return new MeshPhysicalMaterial(materialParameters);
    }

    /**
     * @description 创建点材质
     * @author gj
     * @date 2023/11/10
     * @param configParams 点材质配置项
     * @return {*} {PointsMaterial} 点材质
     */
    public initPointsMaterial(configParams?: object): PointsMaterial {
        // 创建默认的材质参数
        const defaultParams = {
            color: 0x00aa00
        };
        // 合并默认参数和传递的参数
        const materialParameters = Object.assign({}, defaultParams, configParams);
        return new PointsMaterial(materialParameters);
    }

    /**
     * @description 创建卡通材质
     * @author gj
     * @date 2023/11/10
     * @param configParams 卡通材质配置项
     * @return {*} {MeshToonMaterial} 卡通材质
     */
    public initToonMaterial(configParams?: object): MeshToonMaterial {
        // 创建默认的材质参数
        const defaultParams = {
            color: 0x00aa00
        };
        // 合并默认参数和传递的参数
        const materialParameters = Object.assign({}, defaultParams, configParams);
        return new MeshToonMaterial(materialParameters);
    }

    /**
     * @description 创建原始着色器材质
     * @author gj
     * @date 2023/11/13
     * @param configParams 原始着色器材质配置项
     * @return {*} {RawShaderMaterial} 原始着色器材质
     */
     public initRawShaderMaterial(configParams: object): RawShaderMaterial {
        return new RawShaderMaterial(configParams);
    }

    /**
     * @description 创建着色器材质
     * @author gj
     * @date 2023/11/13
     * @param configParams 着色器材质配置项
     * @return {*} {ShaderMaterial} 着色器材质
     */
    public initShaderMaterial(configParams: object): ShaderMaterial {
        return new ShaderMaterial(configParams);
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
    public initDataTexture(data: TypedArray, width: number, height: number, format?: PixelFormat, type?: TextureDataType): DataTexture{
        const texture = new DataTexture(data, width, height, format, type );
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
     * @param {pathPrefix} pathPrefix 图片路径地址前缀
     * @param {picNameList} picNameList 图片名称集合
     * @return {*}  {CubeTexture} 立方纹理
     */
    public initCubeTexture(pathPrefix: string, picNameList: string[]): CubeTexture {
        const loader = new CubeTextureLoader();
        loader.setPath( pathPrefix );
        return loader.load(picNameList);
    }

  /**
   * @description 阴影材质; 此材质可以接收阴影，但在其他方面完全透明。
   * @author LL
   * @date 2023/11/13
   * @returns {*}
   * @memberof TMaterial
   */
  public initShadowMaterial() {
    const material = new ShadowMaterial();
    return material;
  }

    /**
     * @description 创建基础线条材质
     * @author my
     * @date 2023/11/13
     * @param configParams 线条材质配置项
     * @return {*} {LineBasicMaterial} 基础线条材质
     */
    public initLineBasicMaterial(configParams?: object): LineBasicMaterial {
        // 创建默认的材质参数
        const defaultParams = {
            color: 0xffffff,
            linewidth: 1,
            linecap: 'round',
            linejoin: 'round',
            map: null,
        };
        // 合并默认参数和传递的参数
        const materialParameters = Object.assign({}, defaultParams, configParams);
        return new LineBasicMaterial(materialParameters);
    }

    /**
     * @description 创建虚线材质
     * @author my
     * @date 2023/11/13
     * @param configParams 虚线材质配置项
     * @return {*} {LineDashedMaterial} 虚线材质
     */
    public initLineDashedMaterial(configParams?: object): LineDashedMaterial {
        // 创建默认的材质参数
        const defaultParams = {
            color: 0xffffff,
            linewidth: 1,
            scale: 1,
            dashSize: 3,
            gapSize: 1,
        };
        // 合并默认参数和传递的参数
        const materialParameters = Object.assign({}, defaultParams, configParams);
        return new LineDashedMaterial(materialParameters);
    }

    /**
     * @description 创建基础网格材质
     * @author my
     * @date 2023/11/13
     * @param configParams 基础网格材质配置项
     * @return {*} {MeshBasicMaterial} 基础网格材质
     */
    public initMeshBasicMaterial(configParams?: object): MeshBasicMaterial {
        // 创建默认的材质参数
        const defaultParams = {
            color: 0xffffff,
        };
        // 合并默认参数和传递的参数
        const materialParameters = Object.assign({}, defaultParams, configParams);
        return new MeshBasicMaterial(materialParameters);
    }

    /**
     * @description 创建深度网格材质
     * @author my
     * @date 2023/11/13
     * @param configParams 深度网格材质配置项
     * @return {*} {MeshBasicMaterial} 深度网格材质
     */
    public initMeshDepthMaterial(configParams?: object): MeshDepthMaterial {
        // 创建默认的材质参数
        const defaultParams = {
            alphaMap: null,
            map: null
        };
        // 合并默认参数和传递的参数
        const materialParameters = Object.assign({}, defaultParams, configParams);
        return new MeshDepthMaterial(materialParameters);
    }

    /**
     * @description 创建MeshDistanceMaterial
     * @author my
     * @date 2023/11/13
     * @param configParams MeshDistanceMaterial配置项
     * @return {*} {MeshDistanceMaterial} MeshDistanceMaterial材质
     */
    public initMeshDistanceMaterial(configParams?: object): MeshDistanceMaterial {
        // 创建默认的材质参数
        const defaultParams = {
            alphaMap: null,
            map: null
        };
        // 合并默认参数和传递的参数
        const materialParameters = Object.assign({}, defaultParams, configParams);
        return new MeshDistanceMaterial(materialParameters);
    }

  // /**
  //  * @description 切换模型材质贴图
  //  * @author gj
  //  * @date 2023/11/3
  //  * @param {string} sceneName 场景名称
  //  * @param {string} uuid 模型uuid
  //  * @param {textureParams} options 材质贴图参数集合
  //  */
  // public changeTextureMap(sceneName: string, uuid: string, options: textureParams): void {
  //     let obj = ThingOrigin.getScene(sceneName).getObjectByProperty("uuid", uuid);
  //     if (!obj) {
  //         console.warn("切换材质贴图失败，物体不存在");
  //         return;
  //     }
  //
  //     //金属材质，漫反射，金属漆，涂料，塑料，绒布，发光，半透明，玻璃，电介质，通用，基础PBR
  //     obj.traverse((child) => {
  //         if (child instanceof Mesh) {
  //             if (child.material) {
  //                 if (child.material instanceof Array) {
  //                     for (let i = 0; i < child.material.length; i++) {
  //                         child.material[i].dispose();
  //                     }
  //                 } else {
  //                     child.material.dispose();
  //                 }
  //             }
  //
  //             let materialObj = {};
  //             for(let key in options){
  //                 if(options.hasOwnProperty(key)){
  //                     if(!['img', 'materialType','side'].includes(key)){
  //                         materialObj[key] = options[key];
  //                     }
  //                     if('side' === key){
  //                         switch(options[key]){
  //                             case 'FrontSide': materialObj[key] =  FrontSide; break;
  //                             case 'BackSide': materialObj[key] =  BackSide; break;
  //                             case 'DoubleSide': materialObj[key] =  DoubleSide; break;
  //                         }
  //                     }
  //                     if(['map','normalMap','roughnessMap','metalnessMap','lightMap','aoMap'].includes(key)){
  //                         materialObj[key] = new TextureLoader().load(options[key])
  //                     }
  //                     if('envMap' === key){
  //                         materialObj[key] =  new CubeTextureLoader().load(options[key]);
  //                     }
  //                 }
  //             }
  //
  //             let keyName = options.materialType;
  //             const modeMap = {
  //                 LineBasicMaterial: () => new LineBasicMaterial({ ...materialObj }), //基础线条材质
  //                 LineDashedMaterial: () => new LineDashedMaterial({ ...materialObj }), //虚线材质
  //                 MeshBasicMaterial: () => new MeshBasicMaterial({ ...materialObj }), //基础网格材质
  //                 MeshDepthMaterial: () => new MeshDepthMaterial({ ...materialObj }), // 深度网格材质
  //                 MeshDistanceMaterial:() => new MeshDistanceMaterial({ ...materialObj }), //距离材质
  //                 MeshLambertMaterial: () => new MeshLambertMaterial({ ...materialObj }), // (Lambert网格)兰伯特材质
  //                 MeshMatcapMaterial: () => new MeshMatcapMaterial({ ...materialObj }), //捕捉材质
  //                 MeshNormalMaterial: () => new MeshNormalMaterial({ ...materialObj }), //法线网格材质
  //                 MeshPhongMaterial: () => new MeshPhongMaterial({ ...materialObj }), //Phong网格材质
  //                 MeshPhysicalMaterial: () => new MeshPhysicalMaterial({ ...materialObj }), //物理网格材质
  //                 MeshStandardMaterial: () => new MeshStandardMaterial({ ...materialObj }), //标准网格材质
  //                 MeshToonMaterial: () => new MeshToonMaterial({ ...materialObj }), //卡通着色材质
  //                 PointsMaterial: () => new PointsMaterial({ ...materialObj }), //点材质
  //                 ShadowMaterial: () => new ShadowMaterial({ ...materialObj }) //阴影材质
  //             }
  //
  //             child.material = modeMap[keyName] ? modeMap[keyName]() : {};
  //         }
  //     });
  // }
}
