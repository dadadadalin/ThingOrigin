import { merge, cloneDeep } from "lodash-es";
import * as TWEEN from "@tweenjs/tween.js";
import { sceneData } from "../public/data/sceneParams";

import {
  AnimationMixer,
  Clock,
  Fog,
  FogExp2,
  OrthographicCamera,
  PerspectiveCamera,
} from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";

import { TAnimate } from "./ts/TAnimate";
import { TCamera } from "./ts/TCamera";
import { TControl } from "./ts/TControl";
import { TCAD } from "./ts/TCAD";
import { TEffect } from "./ts/TEffect";
import { TEventDispatcher } from "./ts/TEventDispatcher";
import { TExplode } from "./ts/TExplode";
import { TExporters } from "./ts/TExporters";
import { TFont } from "./ts/TFont";
import { THelper } from "./ts/THelper";
import { TIndexedDB } from "./ts/TIndexedDB";
import { TLight } from "./ts/TLight";
import { TLine } from "./ts/TLine";
import { TMachine } from "./ts/TMachine";
import { TMaterial } from "./ts/TMaterial";
import { TMarker } from "./ts/TMarker";
import { TModel } from "./ts/TModel";
import { Tool } from "./ts/Tool";
import { TPhysics } from "./ts/TPhysics";
import { TRenderer } from "./ts/TRenderer";
import { TSnap } from "./ts/TSnap";
import { TScene } from "./ts/TScene";
import { TGUI } from "./ts/TGUI";

let clock = new Clock();

export class ThingOrigin {
  /**
   * |属性|说明|
   * |:---:|:---|
   * |场景参数|用于描述整个场景的数据|
   * @category 普通属性
   *  */
  public static sceneData: ThingOriginParams;

  /**
   * |属性|说明|
   * |:---:|:---|
   * |模型名称|当前场景名称|
   * @category 普通属性
   */
  public sceneName: string;

  /**
   * |属性|说明|
   * |:---:|:---|
   * |dom容器|用于渲染场景的容器|
   * @category 普通属性
   *  */
  public container: HTMLElement;

  /**
   * |属性|说明|
   * |:---:|:---|
   * |渲染器|当前场景的渲染器|
   * @category 普通属性
   *  */
  public renderer: TRenderer;

  /**
   * |属性|说明|
   * |:---:|:---|
   * |2D渲染器|当前场景的2D渲染器|
   * @category 普通属性
   *  */
  public CSS2DRenderer: CSS2DRenderer;

  /**
   * |属性|说明|
   * |:---:|:---|
   * |动画播放器|用于控制播放动画|
   * @category 普通属性
   *  */
  public mixer: AnimationMixer;

  /**
   * |属性|说明|
   * |:---:|:---|
   * |性能|用于显示当前渲染性能能|
   * @category 普通属性
   *  */
  public stats: Stats;

  /**
   * |模块|说明|
   * |:---:|:---|
   * |相机|相机模块|
   * @category 核心属性
   *  */
  public camera: TCamera;

  /**
   * |模块|说明|
   * |:---:|:---|
   * |控制器|内含轨道控制器、拖拽控制器、射线控制器、变换控制器等|
   * @category 核心属性
   *  */
  public controls: TControl;

  /**
   * |模块|说明|
   * |:---:|:---|
   * |CAD|处理CAD图纸及模型相关功能|
   * @category 核心属性
   *  */
  public CAD: TCAD;

  /**
   * |模块|说明|
   * |:---:|:---|
   * |图形用户界面控制器|参数实时调整界面|
   * @category 核心属性
   * */
  public GUI: TGUI;

  /**
   * |模块|说明|
   * |:---:|:---|
   * |工具函数|常用的支撑创建及计算的工具函数|
   * @category 核心属性
   *  */
  public tool: Tool;

  /**
   * |模块|说明|
   * |:---:|:---|
   * |文字|用于创建文字|
   * @category 核心属性
   *  */
  public font: TFont;

  /**
   * |模块|说明|
   * |:---:|:---|
   * |线条|用于创建线条字|
   * @category 核心属性
   *  */
  public line: TLine;

  /**
   * |模块|说明|
   * |:---:|:---|
   * |吸附|用于处理两模型间的吸附|
   * @category 核心属性
   *  */
  public snap: TSnap;

  /**
   * |模块|功能|
   * |:---:|:---|
   * |动画|用于制作模型动画|
   * @category 核心属性
   *  */
  public animate: TAnimate;

  /**
   * |模块|功能|
   * |:---:|:---|
   * |材质|用于创建材质|
   * @category 核心属性
   *  */
  public material: TMaterial;
  /**
   * |模块|功能|
   * |:---:|:---|
   * |本地缓存|用于缓存模型至浏览器|
   * @category 核心属性
   *  */
  public indexedDB: TIndexedDB;
  /**
   * |模块|功能|
   * |:---:|:---|
   * |事件捕捉器|用于处理鼠标点击事件|
   * @category 核心属性
   *  */
  public eDispatcher: TEventDispatcher;

  /**
   * |模块|功能|
   * |:---:|:---|
   * |模型|用于创建基础模型|
   * @category 核心属性
   * */
  public model: TModel;
  /**
   * |模块|功能|
   * |:---:|:---|
   * |场景|当前3D场景|
   * @category 核心属性
   *  */
  public scene: TScene;

  /**
   * |模块|功能|
   * |:---:|:---|
   * |效果|用于制作模型效果|
   * @category 核心属性
   *  */
  public effect: TEffect;

  /**
   * |模块|功能|
   * |:---:|:---|
   * |标记|用于给模型添加标记|
   * @category 核心属性
   *  */
  public marker: TMarker;

  /**
   * |模块|功能|
   * |:---:|:---|
   * |成品机械|用于控制特定型号机器模型|
   * @category 核心属性
   *  */
  public machine: TMachine;

  /**
   * |模块|功能|
   * |:---:|:---|
   * |爆炸图|用于制作模型爆炸图|
   * @category 核心属性
   *  */
  public explode: TExplode;

  /**
   * |模块|功能|
   * |:---:|:---|
   * |物理|用于处理物理世界|
   * @category 核心属性
   *  */
  public physics: TPhysics;

  /**
   * |模块|功能|
   * |:---:|:---|
   * |光源管理|用于控制场景内光源|
   * @category 核心属性
   *  */
  public light: TLight;

  /**
   * |模块|功能|
   * |:---:|:---|
   * |辅助器|坐标、网格、包围盒等|
   * @category 核心属性
   *  */
  public helper: THelper;

  /**
   * |模块|功能|
   * |:---:|:---|
   * |导出|用于导出|
   * @category 核心属性
   *  */
  public exporters: TExporters;

  /**
   * |属性|功能|
   * |:---:|:---|
   * |需被手动更新|在循环中更新的材质等|
   * @category 普通属性
   *  */
  public toUpdate = {
    material: [],
  };

  /**
   * |属性     |功能            |
   * |--------|-----------------|
   * |更新id   |每次更新产生新的id|
   * @category 普通属性
   *  */
  public updateId: number;

  /**
   * Creates an instance of ThingOrigin.
   * @author LL
   * @category 构造函数
   * @param sceneName 场景名称
   * @param container 容器
   * @param [userSceneParam] 场景参数
   */
  constructor(
    sceneName: string,
    container: HTMLElement,
    userSceneParam?: ThingOriginParams
  ) {
    this.sceneName = sceneName;
    this.container = container;

    let data = cloneDeep(sceneData);
    //处理合并场景数据
    ThingOrigin.sceneData = merge(data, userSceneParam);

    this.camera = new TCamera(this);
    this.controls = new TControl(this);
    this.CAD = new TCAD();
    this.GUI = new TGUI();
    this.tool = new Tool();
    this.font = new TFont();
    this.line = new TLine();
    this.snap = new TSnap();
    this.animate = new TAnimate();
    this.material = new TMaterial();
    this.indexedDB = new TIndexedDB();
    this.eDispatcher = new TEventDispatcher();
    this.model = new TModel();
    this.renderer = new TRenderer(this);
    this.scene = new TScene(this);
    this.effect = new TEffect(this);
    this.marker = new TMarker(this);
    this.machine = new TMachine(this);
    this.explode = new TExplode(this);
    this.physics = new TPhysics(this);
    this.light = new TLight(this.scene);
    this.helper = new THelper(this.scene);
    this.exporters = new TExporters(this.scene);

    this.createScene(sceneName, container, userSceneParam);
  }

  /**
   * 创建场景
   * @category 方法
   * @author LL
   * @since 2021/10/15
   * @param {string} sceneName 场景名称
   * @param {HTMLElement} container dom容器，用于渲染场景
   * @param {ThingOriginParams} [userSceneParam] 场景参数，见({@link public/data/sceneParams.default}）
   * @example
   * ```ts
   * let TO = ThingOrigin.createScene('sceneName',document.getElementById('domID'))
   * ```
   > [!NOTE]
   > 容器必须有宽度和高度
   *
   */
  public createScene = async (
    sceneName: string,
    container: HTMLElement,
    userSceneParam?: ThingOriginParams
  ) => {
    this.sceneName = sceneName;
    this.container = container;

    let data = cloneDeep(sceneData);

    //处理合并场景数据
    ThingOrigin.sceneData = merge(data, userSceneParam);
    console.log("sceneData", ThingOrigin.sceneData);

    if (userSceneParam?.lights)
      ThingOrigin.sceneData.lights = userSceneParam.lights;

    if (userSceneParam?.modelList && userSceneParam.modelList.length != 0)
      ThingOrigin.sceneData.modelList = userSceneParam.modelList;

    if (userSceneParam?.markerList && userSceneParam.markerList.length != 0)
      ThingOrigin.sceneData.markerList = userSceneParam.markerList;
    // if (userSceneParam.animationList)
    //   ThingOrigin.sceneData.animationList = userSceneParam.animationList;
    // if (userSceneParam.handleList)
    //   ThingOrigin.sceneData.handleList = userSceneParam.handleList;

    this.initRender();
    this.initLight();
    this.effect.initEffect();

    if (ThingOrigin.sceneData.scene.fog.show)
      ThingOrigin.sceneData.scene.fog.cameraView
        ? (this.scene.fog = new FogExp2(ThingOrigin.sceneData.scene.fog.color))
        : (this.scene.fog = new Fog(ThingOrigin.sceneData.scene.fog.color));

    if (ThingOrigin.sceneData.scene.stats.show) this.showStats();

    if (ThingOrigin.sceneData.markerList.length != 0) this.loadMarker();

    this.initAttach();
    this.initControl();
    this.initGround();

    this.update();

    //加载模型列表
    if (ThingOrigin.sceneData.modelList.length != 0) {
      for (const item of ThingOrigin.sceneData.modelList) {
        let model = await this.model.loadModel(item);
        this.scene.add(model);
      }
    }
  };

  /**
   * 场景重新适配窗口大小
   * @category 方法
   * @author LL
   * @example
   * window.addEventListener('resize', TO.resize());
   */
  public resize() {
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

  /**
   * 更新渲染
   * @author LL
   * @category 方法
   * @example
   * TO.update()
   */
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
    if (this.effect.effectComposer) this.effect.effectComposer.render();
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
   * 销毁场景
   * @author LL
   * @since 2024/07/02
   * @category 方法
   * @example
   * TO.dispose();
   */
  public dispose() {
    console.log("dispose", this.scene);
    this.scene.traverse((child: any) => {
      if (child.isMesh || child.isLine) {
        child.geometry.dispose();
        if (child.material.isMaterial) {
          child.material.dispose();
        } else {
          // 处理数组或材质实例
          for (let i = 0; i < child.material.length; i++) {
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

  /**
   * 初始化场景光源
   * @author LL
   * @since 2021/07/26
   * @category 方法
   * @private
   */
  private initLight() {
    for (let i = 0; i < ThingOrigin.sceneData.lights.length; i++) {
      let lightInfo = ThingOrigin.sceneData.lights[i];
      switch (lightInfo.type.toLocaleLowerCase()) {
        case "directionallight":
          const dirLight = this.light.addDirectionalLight({
            name: lightInfo.name,
            color: lightInfo.color,
            intensity: lightInfo.intensity,
            position: lightInfo.position,
          });
          dirLight.visible = lightInfo.visible;
          break;
        case "ambientlight":
          const ambientLight = this.light.addAmbientLight({
            name: lightInfo.name,
            color: lightInfo.color,
            intensity: lightInfo.intensity,
          });
          ambientLight.visible = lightInfo.visible;
          break;
        case "pointLight":
          const pointLight = this.light.addPointLight({
            name: lightInfo.name,
            color: lightInfo.color,
            intensity: lightInfo.intensity,
            distance: lightInfo.distance,
            position: lightInfo.position,
          });
          pointLight.visible = lightInfo.visible;
          break;
      }
    }
  }

  /**
   * 渲染控制器
   * @author LL
   * @since 2021/07/26
   * @category 方法
   * @private
   */
  private initControl() {
    this.controls = new TControl(this);

    // 处理各种控制器
    if (ThingOrigin.sceneData.helper.axes.active) {
      this.helper.initAxes(ThingOrigin.sceneData.helper.axes.length);
    }
    if (ThingOrigin.sceneData.helper.grid.active) {
      this.helper.initGrid(ThingOrigin.sceneData.helper.grid);
    }
    if (ThingOrigin.sceneData.controls.orbit.active) {
      this.controls.initOrbit();
    }
    if (ThingOrigin.sceneData.controls.raycaster.active) {
      this.controls.initRaycaster(
        ThingOrigin.sceneData.controls.raycaster.events
      );
    }
    if (ThingOrigin.sceneData.controls.transform.active) {
      this.controls.initTransform();
    }
    if (ThingOrigin.sceneData.controls.drag.active) {
      this.controls.initDrag();
    }
  }

  /**
   * 关联模型
   * @author LL
   * @since 2024/07/02
   * @category 方法
   * @private
   */
  private initAttach() {
    ThingOrigin.sceneData.attachList.forEach((attach) => {
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
   * 创建地面
   * @author LL
   * @date 2025/07/15
   * @private
   */
  private async initGround() {
    if (!ThingOrigin.sceneData.scene.ground.active) {
      return;
    }

    let groundInfo = merge(ThingOrigin.sceneData.scene.ground,{position:{
      x: 0,
      y: 0.001,
      z: 0,
      }})

    let ground = await this.model.initPlane(ThingOrigin.sceneData.scene.ground);
    ground.name = "TO-ground";
    this.scene.add(ground);
  }

  /**
   * 添加标记
   * @author LL
   * @since 2024/07/04
   * @private
   * @category 方法
   */
  private loadMarker() {
    ThingOrigin.sceneData.markerList.forEach((item) => {
      let timer = setInterval(() => {
        let model = this.scene.getObjectByProperty("name", item.modelName);

        if (model) {
          clearInterval(timer);
          this.marker.addMarker(model, item.configs.html, {
            modelName: item.markerName,
            position: item.position,
            base: item.base,
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
   * 初始化场景渲染器
   * @author LL
   * @since 2024/06/26
   * @category 方法
   * @private
   */
  private initRender() {
    //设置环境
    this.scene.setEnvironment();

    //设置背景
    this.scene.setBackground();
    this.scene.setToneMapping();
  }

  /**
   * 显示性能监控器
   * @author LL
   * @since 2022/07/28
   * @category 方法
   * @private
   */
  private showStats() {
    this.stats = new Stats();
    this.stats.dom.style.position = "absolute"; // 样式， 坐标
    this.stats.dom.style.left = "0px";
    this.stats.dom.style.top = "0px";
    this.stats.dom.style.zIndex = "100";
    this.container.appendChild(this.stats.dom); // 添加到canvas-frame
    // this.stats.setMode(ThingOrigin.sceneData.scene.stats.mode);
  }
}

console.log(`ThingOrigin2.0.js \n        by - SIA8`);

//@ts-ignore
window["ThingOrigin"] = ThingOrigin;
