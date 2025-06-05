import _ from "lodash";
import {
  AnimationMixer,
  Clock,
  Fog,
  FogExp2,
  Group,
  LoopOnce,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
} from "three";
import { TAnimate } from "./ts/TAnimate";
import { TIndexedDB } from "./ts/TIndexedDB";
import { TMachine } from "./ts/TMachine";
import { TMaterial } from "./ts/TMaterial";
import { TModel } from "./ts/TModel";
import { Tool } from "./ts/Tool";
import { TScene } from "./ts/TScene";
import { TLight } from "./ts/TLight";
import { TGUI } from "./ts/TGUI";
import { THelper } from "./ts/THelper";
import { TCamera } from "./ts/TCamera";
import { TControl } from "./ts/TControl";
import { TRenderer } from "./ts/TRenderer";
import { TEffect } from "./ts/TEffect";
import { TMarker } from "./ts/TMarker";
import { TExplode } from "./ts/TExplode";
import { TEventDispatcher } from "./ts/TEventDispatcher";
import { TExporters } from "./ts/TExporters";
import { TPhysics } from "./ts/TPhysics";

import Stats from "three/examples/jsm/libs/stats.module";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";

import { merge, cloneDeep } from "lodash";

import * as TWEEN from "@tweenjs/tween.js";

import sceneData from "../public/data/sceneParams";
import { TSnap } from "./ts/TSnap";
import { TAction } from "./ts/TAction";
import { TLine } from "./ts/TLine";
import { TFont } from "./ts/TFont";
import { TCAD } from "./ts/TCAD";

let clock = new Clock();

export class ThingOrigin {
  /** 场景名称 */
  public sceneName: string;
  /** 场景参数 */
  public sceneData: ThingOriginParams = sceneData;
  /** 用于存放所有场景 */
  public scene: TScene = new TScene(this);
  /** 工具函数 */
  public tool: Tool = new Tool();
  /** 动画 */
  public animate: TAnimate = new TAnimate();
  /** 材质 */
  public material: TMaterial = new TMaterial();
  /** 模型 */
  public model: TModel = new TModel();
  public font: TFont = new TFont();
  public line: TLine = new TLine();
  /** 成品机器 */
  public machine: TMachine = new TMachine(this);
  /** 当前场景的dom容器 */
  public container: HTMLElement;
  /** 光源管理 */
  public light: TLight = new TLight(this.scene);
  /** 当前渲染使用的相机 */
  public camera: TCamera;
  /** 辅助器 */
  public helper: THelper = new THelper(this.scene);
  /** 交互器 */
  public controls?: TControl;
  /** 当前渲染使用的渲染器 */
  public renderer?: TRenderer;
  /** 当前渲染2D的渲染器 */
  public CSS2DRenderer?: CSS2DRenderer;
  /** 效果 */
  public effect: TEffect = new TEffect(this);
  /** 标记 */
  public marker: TMarker = new TMarker(this);
  /** 爆炸图 */
  public explode: TExplode = new TExplode(this);
  /** GUI */
  public GUI: TGUI = new TGUI();
  /** 动画播放器 */
  public mixer: AnimationMixer;
  /** 事件捕捉器 */
  public eDispatcher: TEventDispatcher = new TEventDispatcher();
  /** 导出 */
  public exporters: TExporters = new TExporters(this.scene);
  /** 物理 */
  public physics: TPhysics = new TPhysics(this);
  /** 吸附 */
  public snap: TSnap = new TSnap();
  /** 吸附 */
  public action: TAction = new TAction();
  /** 性能 */
  public stats: Stats;
  /** 本地缓存 */
  public indexedDB: TIndexedDB = new TIndexedDB();
  public CAD: TCAD = new TCAD();

  /** 需要在循环中更新的内容 */
  public toUpdate = {
    material: [],
  };

  public updateId: any;

  constructor(
    sceneName: string,
    container: HTMLElement,
    userSceneParam?: ThingOriginParams
  ) {
    this.createScene(sceneName, container, userSceneParam);
  }

  /**
   * @description 创建一个场景
   * @author LL
   * @date 2021/10/15
   * @param {HTMLElement} container 用于生成场景的dom容器
   * @param {ThingOriginParams} userSceneParam 场景描述参数（可不传，使用默认参数）
   */
  public createScene = async (
    sceneName: string,
    container: HTMLElement,
    userSceneParam?: ThingOriginParams
  ) => {
    this.sceneName = sceneName;

    let data = cloneDeep(sceneData);

    //处理合并场景数据
    this.sceneData = merge(data, userSceneParam);

    if (userSceneParam?.lights) this.sceneData.lights = userSceneParam.lights;

    console.log("sceneData", this.sceneData);
    if (userSceneParam?.modelList && userSceneParam.modelList.length != 0)
      this.sceneData.modelList = userSceneParam.modelList;

    if (userSceneParam?.markerList && userSceneParam.markerList.length != 0)
      this.sceneData.markerList = userSceneParam.markerList;
    // if (userSceneParam.animationList)
    //   this.sceneData.animationList = userSceneParam.animationList;
    // if (userSceneParam.handleList)
    //   this.sceneData.handleList = userSceneParam.handleList;

    this.container = container;
    this.initCamera();
    this.initRender();
    this.initLight();
    this.effect.initEffect();

    if (this.sceneData.scene.fog.show)
      this.sceneData.scene.fog.cameraView
        ? (this.scene.fog = new FogExp2(this.sceneData.scene.fog.color))
        : (this.scene.fog = new Fog(this.sceneData.scene.fog.color));

    if (this.sceneData.scene.stats.show) this.showStats();

    if (this.sceneData.markerList.length != 0) this.loadMarker();

    this.initAttach();
    this.initControl();

    this.update();

    //加载模型列表
    if (this.sceneData.modelList.length != 0) {
      for (const item of this.sceneData.modelList) {
        let model = await this.model.loadModel(item);
        this.scene.add(model);
      }
    }
  };

  /**
   * @description 场景重新适配窗口大小
   * @author LL
   */
  public onResize() {
    if (this.camera.camera) {
      if (this.camera.type == "PerspectiveCamera") {
        // 重新设置相机宽高比例
        (this.camera.camera as PerspectiveCamera).aspect =
          this.container.clientWidth / this.container.clientHeight;
      } else if (this.camera.type == "OrthographicCamera") {
        (this.camera.camera as OrthographicCamera).left =
          this.container.clientLeft;
        (this.camera.camera as OrthographicCamera).right =
          this.container.clientLeft + this.container.clientWidth;
        (this.camera.camera as OrthographicCamera).top =
          this.container.clientTop;
        (this.camera.camera as OrthographicCamera).bottom =
          this.container.clientTop + this.container.clientHeight;
      }
      // 更新相机投影矩阵
      this.camera.camera.updateProjectionMatrix();
    }

    setTimeout(() => {
      if (this.renderer) {
        this.renderer.renderer.setSize(
          this.container.clientWidth,
          this.container.clientHeight
        );
      }
      if (this.CSS2DRenderer) {
        this.renderer.CSS2DRenderer.setSize(
          this.container.clientWidth,
          this.container.clientHeight
        );
      }
    }, 100);
  }

  public update() {
    this.camera.camera.updateProjectionMatrix();
    // const darkenNonBloomed = (obj) => {
    //   if (obj.isMesh && scene.effect.bloomLayer.test(obj.layers) === false) {
    //     materials[obj.uuid] = obj.material;
    //     obj.material = darkMaterial;
    //   }
    // };
    // const restoreMaterial = (obj) => {
    //   if (materials[obj.uuid]) {
    //     obj.material = materials[obj.uuid];
    //     delete materials[obj.uuid];
    //   }
    // };

    this.renderer.CSS2DRenderer.render(this.scene, this.camera.camera);
    //将不需要辉光的材质设置为黑色
    // this.traverse(darkenNonBloomed);
    //先执行辉光效果器
    if (this.effect.bloomComposer) this.effect.bloomComposer.render();
    //在辉光渲染器执行完之后恢复材质原效果
    // this.traverse(restoreMaterial);
    //执行场景效果器渲染
    if (this.effect.effectComposer) this.effect.effectComposer.render();

    if (this.helper.box) this.helper.updateBox();
    if (this.controls.pointerLock) this.controls.updatePointerLock();
    if (this.stats) this.stats.update();
    if (this.mixer) this.mixer.update(clock.getDelta());

    if (this.toUpdate.material.length > 0) {
      for (let index = 0; index < this.toUpdate.material.length; index++) {
        const material = this.toUpdate.material[index];
        material.uniforms["time"].value += 1.0 / 60.0;
      }
    }

    let views = this.camera.cameraView;

    views.forEach((view) => {
      const renderer = this.renderer.rendererView.get(view.name).renderer;
      const camera = this.camera.cameraView.get(view.name).camera;

      let onModel = this.scene.getObjectByProperty("name", view.lookAt);
      if (onModel) {
        camera.lookAt(onModel.position);
        camera.position.set(
          onModel.position.x + view.offset.x,
          onModel.position.y + view.offset.y,
          onModel.position.z + view.offset.z
        );
      } else {
        camera.lookAt(0, 0, 0);
      }

      renderer.render(this, camera);
    });

    TWEEN.update();
    this.updateId = requestAnimationFrame(this.update.bind(this));
  }

  /**
   * @description 初始化相机
   * @author LL
   * @date 2021/11/03
   * @private
   */
  private initCamera() {
    this.camera = new TCamera(this);
  }

  /**
   * @description 初始化场景光源
   * @author LL
   * @date 2021/07/26
   * @private
   */
  private initLight() {
    for (let i = 0; i < this.sceneData.lights.length; i++) {
      let lightInfo = this.sceneData.lights[i];
      switch (lightInfo.type.toLocaleLowerCase()) {
        case "directionallight":
          const dirLight = this.light.addDirectionalLight(
            lightInfo.name,
            lightInfo.color,
            lightInfo.intensity,
            { position: lightInfo.position }
          );
          dirLight.visible = lightInfo.visible;
          break;
        case "ambientlight":
          const ambientLight = this.light.addAmbientLight(
            lightInfo.name,
            lightInfo.color,
            lightInfo.intensity
          );
          ambientLight.visible = lightInfo.visible;
          break;
      }
    }
  }

  /**
   * @description 渲染控制器
   * @author LL
   * @date 2021/07/26
   * @private
   */
  private initControl() {
    this.controls = new TControl(this);

    // 处理各种控制器
    if (this.sceneData.helper.axes.active) {
      this.helper.initAxes(this.sceneData.helper.axes.length);
    }
    if (this.sceneData.helper.grid.active) {
      this.helper.initGrid(this.sceneData.helper.grid);
    }
    if (this.sceneData.controls.orbit.active) {
      this.controls.initOrbit(this.sceneData.controls.orbit);
    }
    if (this.sceneData.controls.raycaster.active) {
      this.controls.initRaycaster(this.sceneData.controls.raycaster.events);
    }
    if (this.sceneData.controls.transform.active) {
      this.controls.initTransform();
    }
    if (this.sceneData.controls.drag.active) {
      this.controls.initDrag();
    }
  }

  /**
   * @description 关联模型
   * @author LL
   * @date 2024/07/02
   * @private
   * @memberof ThingOrigin
   */
  private initAttach() {
    this.sceneData.attachList.forEach((attach) => {
      let si = setInterval(() => {
        let parent = this.scene.getObjectByProperty("name", attach.parent);
        let child = this.scene.getObjectByProperty("name", attach.child);

        if (parent && child) {
          if (attach.type == "arm&jaw") {
            parent = parent.getObjectByProperty("name", attach.armEnd);
          }
          this.animate.attachModel(parent, child, attach.scale);
          clearInterval(si);
        }
      }, 100);
    });
  }

  /**
   * @description 添加标记
   * @author LL
   * @date 2024/07/04
   * @private
   * @memberof ThingOrigin
   */
  private loadMarker() {
    this.sceneData.markerList.forEach((item) => {
      let timer = setInterval(() => {
        let model = this.scene.getObjectByProperty("name", item.modelName);

        if (model) {
          clearInterval(timer);
          this.marker.addMarker(model, item.configs.html, {
            modelName: item.markerName,
            position: item.position,
            base: item.configs.base,
          });
          // switch (item.type) {
          //   case "text":
          //     this.marker.addMarker(model, item.configs.html,{markerName:item.markerName,base:item.configs.base});
          //     break;
          //   case "interface":
          //     this.marker.addMarker(model, item.configs.html,{markerName:item.markerName,base:item.configs.base});
          // }
        }
      }, 100);
    });
  }

  /**
   * @description 初始化场景渲染器
   * @author LL
   * @date 2024/06/26
   * @private
   */
  public initRender() {
    this.renderer = new TRenderer(this);
    //设置环境
    this.scene.setEnvironment();

    //设置背景
    this.scene.setBackground();
    this.scene.setToneMapping();
  }

  /**
   * @description 显示性能监控器
   * @author LL
   * @date 2022/07/28
   * @private
   */
  private showStats() {
    this.stats = new Stats();
    this.stats.dom.style.position = "absolute"; // 样式， 坐标
    this.stats.dom.style.left = "0px";
    this.stats.dom.style.top = "0px";
    this.stats.dom.style.zIndex = "100";
    this.container.appendChild(this.stats.dom); // 添加到canvas-frame
    // this.stats.setMode(this.sceneData.scene.stats.mode);
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
    loop: boolean
  ) {
    //@ts-ignore
    this.mixer = new AnimationMixer(model);

    if (this.tool.isArray(index)) {
      console.log("数组类型,要求播放多个动画");
    } else {
      if (model.animations[index as number]) {
        let action = this.mixer.clipAction(model.animations[index as number]);
        if (loop) {
          action.clampWhenFinished = true; // 防止超出范围
          action.loop = LoopOnce; // 只播放一次
        }
        action.play();
        return action;
      } else {
        console.warn("模型不存在下标为" + index + "的动画");
      }
    }
  }

  /**
   * @description 克隆模型
   * @author LL
   * @param {Object3D} targetModel
   * @param {zyz} position
   * @return {*}  {Group}
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
   * @description 控制模型显示隐藏
   * @author LL
   * @date 2021/08/16
   * @param {string} name 模型名称
   * @param {boolean} visible 是否可见
   */
  public setVisible(name: string, visible: boolean) {
    let model = this.scene.getObjectByProperty("name", name);
    if (!model) {
      console.warn("物体控制显示隐藏失败，物体不存在");
      return;
    }
    model.visible = visible;
  }

  /**
   * @description 销毁场景
   * @author LL
   * @date 2024/07/02
   * @memberof ThingOrigin
   */
  public dispose() {
    console.log("dispose", this.scene);
    this.scene.traverse((child) => {
      //@ts-ignore
      if (child.isMesh || child.isLine) {
        //@ts-ignore
        child.geometry.dispose();
        //@ts-ignore
        if (child.material.isMaterial) {
          //@ts-ignore
          child.material.dispose();
        } else {
          // 处理数组或材质实例
          //@ts-ignore
          for (let i = 0; i < child.material.length; i++) {
            //@ts-ignore
            child.material[i].dispose();
          }
        }
      }
      // 从场景中移除对象
      this.scene.remove(child);
    });

    this.controls.disposeOrbit();
    this.controls.disposeDrag();
    this.controls.disposePointerLock();
    this.controls.disposeRaycaster();
    this.controls.disposeTransform();
    this.helper.removeAxes();
    this.helper.removeBox();
    this.helper.removeGrid();

    while (this.container.hasChildNodes()) {
      this.container.removeChild(this.container.firstChild);
    }

    this.renderer.renderer.dispose();
    this.renderer.renderer.forceContextLoss();
    // this.renderer.context = null;
    let gl = this.renderer.renderer.domElement.getContext("webgl");
    gl && gl.getExtension("WEBGL_lose_context").loseContext();

    cancelAnimationFrame(this.updateId);
  }
}

console.log(`ThingOrigin2.0.js \n        by - SIA8`);

//@ts-ignore
window["ThingOrigin"] = ThingOrigin;
