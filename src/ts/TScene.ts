import {
  AnimationMixer,
  ACESFilmicToneMapping,
  BackSide,
  CineonToneMapping,
  Color,
  CubeTextureLoader,
  EquirectangularReflectionMapping,
  LinearToneMapping,
  LoopOnce,
  Mesh,
  NoToneMapping,
  Object3D,
  PMREMGenerator,
  ReinhardToneMapping,
  Scene,
  TextureLoader,
  SphereGeometry,
  ShaderMaterial,
  Vector3,
  Vector2,
  MathUtils,
  Group,
} from "three";
import { ThingOrigin } from "../ThingOrigin";
import { merge, cloneDeep } from "lodash-es";

import { Sky } from "three/examples/jsm/objects/Sky";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import { TModel } from "./TModel";

/**
 * 场景
 */
export class TScene extends Scene {
  private TO: ThingOrigin;
  private model: TModel = new TModel();
  constructor(TO: ThingOrigin) {
    super();
    this.TO = TO;

    console.log("TScene", ThingOrigin.sceneData);
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

  /**
   * 根据模型名称获取模型
   * @author LL
   * @since 2025/06/17
   * @param {string} name
   */
  public getModelByName(name: string): Object3D | null {
    let model = this.getObjectByProperty("name", name);
    return model;
  }

  /**
   * 设置场景背景
   * @author LL
   * @since 2024/06/17
   */
  public setBackground() {
    switch (ThingOrigin.sceneData.scene.background.type) {
      case "sky":
        this.initSky();
        break;
      case "color":
        this.setBackgroundColor({
          color: ThingOrigin.sceneData.scene.background.color.color,
          alpha: ThingOrigin.sceneData.scene.background.color.alpha,
        });
        break;
      case "img":
        this.setBackgroundImg(ThingOrigin.sceneData.scene.background.img.url);
        break;
      case "cubeMap": //环境贴图
        this.setBackgroundCubeMap(
          ThingOrigin.sceneData.scene.background.cubeMap
        );
        break;
      case "workshop": //车间
        this.setWorkshop(ThingOrigin.sceneData.scene.background.workshop);
        break;
    }
  }

  /**
   * 创建天空盒
   * @author LL
   * @since 25/04/2022
   */
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
      skyCenter: {
        x: 0,
        y: 0,
        z: 0,
      },
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
              skyConfigs.skyCenter.x,
              skyConfigs.skyCenter.y,
              skyConfigs.skyCenter.z
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
   * 设置背景颜色
   * @author LL
   * @since 2023/11/09
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
   * 设置背景环境贴图
   * @author LL
   * @since 2023/11/09
   * @param {cubeMapParams} cubeMap
   */
  public setBackgroundCubeMap(cubeMap: cubeMapParams) {
    const envMap = new CubeTextureLoader().load(cubeMap.url);
    this.background = envMap;
  }

  public setWorkshop(workShopInfo: workshopParams) {
    this.background = null;

    let workshop = this.getObjectByName("TO_workshop");
    if (workshop) {
      this.remove(workshop);
    }

    this.model
      .initFileModel({
        modelType: workShopInfo.modelType,
        modelName: "TO_workshop",
        base: {
          modelUrl: workShopInfo.url,
        },
        scale: {
          x: 15,
          y: 15,
          z: 15,
        },
      })
      .then((model: any) => {
        this.add(model.scene);
      });
  }

  public setEnvironment() {
    switch (ThingOrigin.sceneData.scene.environment.type) {
      case "roomEnvironment":
        this.setRoomEnvironment();
        break;
      case "EquirectangularReflectionMapping":
        this.setEquirectangularReflectionMapping(
          ThingOrigin.sceneData.scene.environment
            .EquirectangularReflectionMappingConfig
        );
        break;
      default:
        break;
    }
  }

  /**
   * 设置环境光
   * @author LL
   * @since 2023/11/08
   */
  public setRoomEnvironment() {
    const pmremGenerator = new PMREMGenerator(this.TO.renderer.renderer);

    const envMap = pmremGenerator.fromScene(new RoomEnvironment()).texture;

    this.environment = envMap;
  }

  /**
   * 设置环境经纬线映射贴图
   * @author gj
   * @since 2023/11/07
   * @param {EquirectangularReflectionMappingConfigParams} config
   */
  public setEquirectangularReflectionMapping(
    config: EquirectangularReflectionMappingConfigParams
  ) {
    new RGBELoader().load(config.url, (texture) => {
      texture.mapping = EquirectangularReflectionMapping;
      this.environment = texture;
    });
  }

  /**
   * 设置色调映射
   * @author LL
   * @since 2025/06/20
   */
  public setToneMapping() {
    //色调映射
    switch (ThingOrigin.sceneData.scene.renderQuality.toneMapping.type) {
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
   * 设置背景图片
   * @author LL
   * @since 2021/08/26
   * @param {string} url
   */
  public setBackgroundImg(url: string) {
    this.background = new TextureLoader().load(url);
  }

  /**
   * 克隆模型
   * @author LL
   * @param {Object3D} targetModel 被克隆的模型
   * @param {xyz} position 克隆模型摆放位置
   * @category 方法
   */
  public cloneObject(targetModel: Object3D, position: xyz): Group {
    if (!targetModel) {
      console.warn("克隆失败失败，物体不存在");
      return;
    }

    let group = new Group();
    let cloneObj = targetModel.clone();
    targetModel.parent.matrixWorld.decompose(
      group.position,
      group.quaternion,
      group.scale
    );
    group.updateMatrixWorld(true);
    targetModel.matrixWorld.decompose(
      cloneObj.position,
      cloneObj.quaternion,
      cloneObj.scale
    );
    cloneObj.updateMatrixWorld(true);
    cloneObj.position.set(position.x, position.y, position.z);
    group.attach(cloneObj);

    return group;
  }

  /**
   * 删除模型（模型名称）
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
   * 播放模型内置动画(gltf)
   * @author LL
   * @since 2023/10/08
   * @param {GLTF} model 含动画模型
   * @param {(number[] | number)} index 播放动画的下标
   * @param {boolean} loop 是否循环播放
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
   * 获取升序模型名称
   * @author LL
   * @since 2024/10/21
   * @param {string} modelName
   */
  public getOrderModelName(modelName: string) {
    let id = 1;
    while (this.getObjectByName(modelName + "-" + id)) {
      id++;
    }
    return { modelName: modelName + "-" + id, id: id };
  }

  /**
   * 克隆模型
   * @author LL
   * @since 2024/09/10
   * @param {Object3D} model
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
    let info = merge(cloneDeep(modelInfo), cloneInfo);

    return { model: cloneModel, info: info };
  }

  /**
   * 控制模型显示隐藏
   * @author LL
   * @since 2021/08/16
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
   * 生成场景截图
   * @author gj
   * @since 2025/06/09
   * @param resolutionScale 分辨率缩放倍数（默认为 1）
   * @returns Promise<Blob | null> 返回一个包含图像数据的Blob对象或null
   */
  public generateSnapshot(resolutionScale: number = 1): Promise<Blob | null> {
    return new Promise((resolve, reject) => {
      // 渲染当前场景
      this.TO.renderer.renderer.render(this.TO.scene, this.TO.camera.camera);

      try {
        const { width, height } = this.TO.renderer.renderer.getSize(
          new Vector2()
        );
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
