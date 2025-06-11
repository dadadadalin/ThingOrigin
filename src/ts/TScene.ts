import {
  AnimationMixer,
  ACESFilmicToneMapping,
  BackSide,
  CineonToneMapping,
  Color,
  CubeTextureLoader,
  EquirectangularReflectionMapping,
  Group,
  LinearToneMapping,
  LoopOnce,
  Mesh,
  NoToneMapping,
  Object3D,
  PMREMGenerator,
  ReinhardToneMapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  Vector3,
  Vector2,
} from "three";
import { ThingOrigin } from "../ThingOrigin";
import _ from "lodash";

import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";

export class TScene extends Scene {
  public TO: ThingOrigin;
  constructor(TO: ThingOrigin) {
    super();
    this.TO = TO;
  }

  // 添加 traverse 方法
  traverse(callback: (node: any) => void) {
    callback(this); // 首先处理当前场景节点
    // 假设 this.children 是一个包含所有子场景节点的数组
    for (const child of this.children) {
      // 确保孩子是场景节点类型
      child.traverse(callback); // 递归遍历每个子节点
    }
  }

  public setBackground() {
    switch (this.TO.sceneData.scene.background.type) {
      case "sky":
        this.initSky({
          top: this.TO.sceneData.scene.background.sky.color.top,
          line: this.TO.sceneData.scene.background.sky.color.line,
          bottom: this.TO.sceneData.scene.background.sky.color.bottom,
        });
        break;
      case "color":
        this.setBackgroundColor({
          color: this.TO.sceneData.scene.background.color.color,
          alpha: this.TO.sceneData.scene.background.color.alpha,
        });
        break;
      case "img":
        this.setBackgroundImg(this.TO.sceneData.scene.background.img.url);
        break;
      case "cubeMap": //环境贴图
        this.setBackgroundCubeMap(this.TO.sceneData.scene.background.cubeMap);
        break;
      default:
        break;
    }
  }

  /**
   * @description 创建天空盒
   * @author LL
   * @date 25/04/2022
   * @param {skyColorsParams} [colors={ top: "#86b6f5", line: "#ffffff", bottom: "#999999" }]
   * @param {skyConfigsParams} [skyConfigs={radius: 4000,widthSegments: 32,heightSegments: 15,skyCenter: [0, 0, 0] }]
   */
  public initSky(
    colors: skyColorsParams = {
      top: "#86b6f5",
      line: "#ffffff",
      bottom: "#999999",
    },
    skyConfigs: skyConfigsParams = {
      radius: 4000,
      widthSegments: 32,
      heightSegments: 15,
      skyCenter: [0, 0, 0],
    }
  ) {
    // note that the camera's far distance should bigger than the radius,
    // otherwise, you cannot see the sky
    const skyGeo = new SphereGeometry(
      skyConfigs.radius,
      skyConfigs.widthSegments,
      skyConfigs.heightSegments
    );
    const skyMat = new ShaderMaterial({
      uniforms: {
        topColor: { value: new Color(colors.top) },
        skylineColor: { value: new Color(colors.line) },
        bottomColor: { value: new Color(colors.bottom) },
        offset: { value: 400 },
        exponent: { value: 0.9 },
        skyCenter: {
          value:
            new Vector3(
              skyConfigs.skyCenter[0],
              skyConfigs.skyCenter[1],
              skyConfigs.skyCenter[2]
            ) || new Vector3(),
        },
      },
      vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
              vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
              vWorldPosition = worldPosition.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }`,
      fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 skylineColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            uniform vec3 skyCenter;
            varying vec3 vWorldPosition;
            void main() {
              vec3 position = vec3(vWorldPosition.x - skyCenter.x, vWorldPosition.y - skyCenter.y, vWorldPosition.z - skyCenter.z);
              float h = normalize( position + offset ).y;
              vec3 color;
              if (h > 0.0) {
                color = mix( skylineColor, topColor, max( pow( max( h, 0.0 ), exponent ), 0.0 ) );
              } else {
                color = mix( skylineColor, bottomColor, max( pow( max( -h, 0.0 ), exponent ), 0.0 ) );
              }
              gl_FragColor = vec4(color , 1.0 );
            }`,
      side: BackSide,
    });

    const sky = new Mesh(skyGeo, skyMat);
    sky.name = "sky";
    sky.userData.selectable = false;

    this.add(sky);
  }

  /**
   * @description 将背景设置为颜色
   * @author LL
   * @date 2023/11/09
   * @memberof TScene
   */
  public setBackgroundColor(bgColor: any) {
    let sky = this.getObjectByName("sky");
    if (sky) {
      this.remove(sky);
    }

    if (bgColor.alpha != 1) {
      this.TO.renderer.renderer.setClearColor(bgColor.color, bgColor.alpha); //default
      this.background = null;
    } else {
      this.background = new Color(bgColor.color);
    }
  }

  /**
   * @description 将背景设置为环境贴图
   * @author LL
   * @date 2023/11/09
   * @param {cubeMapParams} cubeMap
   * @memberof TScene
   */
  public setBackgroundCubeMap(cubeMap: cubeMapParams) {
    const envMap = new CubeTextureLoader().load(cubeMap.url);
    this.background = envMap;
  }

  public setEnvironment() {
    switch (this.TO.sceneData.scene.environment.type) {
      case "roomEnvironment":
        this.setRoomEnvironment();
        break;
      case "EquirectangularReflectionMapping":
        this.setEquirectangularReflectionMapping(
          this.TO.sceneData.scene.environment
            .EquirectangularReflectionMappingConfig
        );
        break;
      default:
        break;
    }
  }

  /**
   * @description 将环境设置为环境光
   * @author LL
   * @date 2023/11/08
   * @memberof TScene
   */
  public setRoomEnvironment() {
    const pmremGenerator = new PMREMGenerator(this.TO.renderer.renderer);

    const envMap = pmremGenerator.fromScene(new RoomEnvironment()).texture;

    this.environment = envMap;
  }

  /**
   * @description 将环境设置为经纬线映射贴图
   * @author gj
   * @date 2023/11/07
   * @param {EquirectangularReflectionMappingConfigParams} config
   * @memberof TScene
   */
  public setEquirectangularReflectionMapping(
    config: EquirectangularReflectionMappingConfigParams
  ) {
    new RGBELoader().load(config.url, (texture) => {
      texture.mapping = EquirectangularReflectionMapping;
      this.environment = texture;
    });
  }

  public setToneMapping() {
    //色调映射
    switch (this.TO.sceneData.scene.renderQuality.toneMapping.type) {
      case "NoToneMapping":
        this.TO.renderer.renderer.toneMapping = NoToneMapping;
        break;
      case "LinearToneMapping":
        this.TO.renderer.renderer.toneMapping = LinearToneMapping;
        break;
      case "ReinhardToneMapping":
        this.TO.renderer.renderer.toneMapping = ReinhardToneMapping;
        break;
      case "CineonToneMapping":
        this.TO.renderer.renderer.toneMapping = CineonToneMapping;
        break;
      case "ACESFilmicToneMapping":
        this.TO.renderer.renderer.toneMapping = ACESFilmicToneMapping;
        break;
    }

    this.TO.renderer.renderer.toneMappingExposure = 1.0;
  }

  /**
   * @description 修改背景图片
   * @author LL
   * @date 2021/08/26
   * @param {string} url
   */
  public setBackgroundImg(url: string) {
    this.background = new TextureLoader().load(url);
  }

  /**
   * @description 删除模型
   * @author gj
   * @param {string} modelName
   */
  public removeModelByName(modelName: string): void {
    let obj = this.getObjectByProperty("name", modelName);
    if (!obj) {
      console.warn("删除模型失败，物体不存在");
      return;
    }

    obj.traverse((child: any) => {
      if (obj.uuid != child.uuid) {
        if (child.isCSS2DObject) {
          this.TO.marker.removeMarker(child.parent);
        }
      }
      //删除模型缓冲区存储顶点数据
      if (child["material"]) {
        //todo  将material 等材质单独成类管理
        if (Array.isArray(child["material"])) {
          for (let i = 0; i < child["material"].length; i++) {
            child["material"][i].dispose();
          }
        } else {
          child["material"].dispose();
        }
      }

      if (child["geometry"]) child["geometry"].dispose();
    });
    obj.parent.remove(obj);
    this.TO.helper.removeBox();
  }

  /**
   * @description 播放模型内置动画(gltf)
   * @author LL
   * @date 2023/10/08
   * @param {GLTF} model 含动画模型
   * @param {(number[] | number)} index 播放动画的下标
   * @param {boolean} loop 是否循环播放
   * @memberof TModel
   */
  public playAnimation(
    model: Object3D,
    index: number[] | number,
    loop: boolean,
    timeScale: number = 1
  ) {
    //@ts-ignore
    this.TO.mixer = new AnimationMixer(model);

    if (this.TO.tool.isArray(index)) {
      console.log("数组类型,要求播放多个动画");
    } else {
      if (model.animations[index as number]) {
        let action = this.TO.mixer.clipAction(
          model.animations[index as number]
        );
        if (loop) {
          action.clampWhenFinished = true; // 防止超出范围
          action.loop = LoopOnce; // 只播放一次
        }
        action.timeScale = timeScale;
        action.play();
      } else {
        console.warn("模型不存在下标为" + index + "的动画");
      }
    }
  }

  /**
   * @description 获取升序模型名称
   * @author LL
   * @date 2024/10/21
   * @param {string} modelName
   * @returns {*}
   * @memberof ThingOrigin
   */
  public getOrderModelName(modelName: string) {
    let id = 1;
    while (this.getObjectByName(modelName + "-" + id)) {
      id++;
    }
    return { modelName: modelName + "-" + id, id: id };
  }

  /**
   * @description 克隆模型
   * @author LL
   * @date 2024/09/10
   * @param {Object3D} model
   * @returns {*}
   * @memberof Tool
   */
  public cloneModel(model: Object3D, modelInfo: modelInfoParams) {
    if (!model) {
      console.warn("克隆模型失败，物体不存在");
      return;
    }

    let cloneModel = model.clone();
    let modelName = this.getOrderModelName(model.name + "-copy").modelName;
    cloneModel.name = modelName;
    //@ts-ignore
    cloneModel.modelName = modelName;
    cloneModel.userData.rootName = modelName;

    let box = this.TO.tool.getModelBox(cloneModel);
    cloneModel.position.x = model.position.x + (box.max.x - box.min.x) * 1.1;

    let cloneInfo = this.TO.tool.getModelInfo(cloneModel);
    let info = _.merge(_.cloneDeep(modelInfo), cloneInfo);

    return { model: cloneModel, info: info };
  }

  /**
   * @description 控制模型显示隐藏
   * @author LL
   * @date 2021/08/16
   * @param {string} name 模型名称
   * @param {boolean} visible 是否可见
   */
  public setVisible(name: string, visible: boolean) {
    let model = this.TO.scene.getObjectByProperty("name", name);
    if (!model) {
      console.warn("物体控制显示隐藏失败，物体不存在");
      return;
    }
    model.visible = visible;
  }

  /**
   * @description 生成模型快照（支持异步、Blob）
   * @author gj
   * @date 2025/06/09
   * @param resolutionScale 分辨率缩放倍数（默认为 1）
   * @returns Promise<Blob | null> 返回一个包含图像数据的Blob对象或null
   */
  public generateSnapshot(resolutionScale: number = 1): Promise<Blob | null> {
      return new Promise((resolve, reject) => {
          // 渲染当前场景
          this.TO.renderer.renderer.render(this.TO.scene, this.TO.camera.camera);

          try {
              const { width, height } = this.TO.renderer.renderer.getSize(new Vector2());
              console.log(width, height);
              const canvasWidth = Math.floor(width * resolutionScale);
              const canvasHeight = Math.floor(height * resolutionScale);

              let tempCanvas: HTMLCanvasElement = document.createElement("canvas");
              tempCanvas.width = canvasWidth;
              tempCanvas.height = canvasHeight;

              const tempContext = tempCanvas.getContext("2d");
              if (!tempContext) {
                  throw new Error("无法获取canvas上下文");
              }

              // 将WebGL内容绘制到临时canvas中
              const webglCanvas = this.TO.renderer.renderer.domElement;
              if (tempCanvas instanceof HTMLCanvasElement) {
                  const destCtx = tempCanvas.getContext("2d");
                  if (destCtx) {
                      destCtx.drawImage(webglCanvas, 0, 0, canvasWidth, canvasHeight);
                  }
              }

              // 使用 toBlob 异步导出图片
              if (tempCanvas instanceof HTMLCanvasElement) {
                  tempCanvas.toBlob(
                      (blob) => {
                          if (blob) {
                              resolve(blob); // 返回Blob对象
                          } else {
                              reject(new Error("生成Blob失败"));
                          }
                      },
                      "image/webp",
                      1
                  );
              } else {
                  reject(new Error("不支持的canvas类型"));
              }

          } catch (error) {
              console.error("生成快照失败:", error);
              reject(error);
          }
      });
    }
}
