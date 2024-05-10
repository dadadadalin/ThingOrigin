import { Object3D, OrthographicCamera, PerspectiveCamera } from "three";
import { TAnimate } from "./ts/TAnimate";
import { TIndexedDB } from "./ts/TIndexedDB";
import { TMachine } from "./ts/TMachine";
import { TMaterial } from "./ts/TMaterial";
import { TModel } from "./ts/TModel";
import { Tool } from "./ts/Tool";
import { TPhysics } from "./ts/TPhysics";
import { SceneMap } from "./ts/TScene/SceneMap";
import { TScene } from "./ts/TScene/TScene";

export class ThingOrigin {
  /** 用于存放所有场景 */
  public static scenes: SceneMap = new SceneMap();
  /** 工具函数 */
  public static tool: Tool = new Tool();
  /** 动画 */
  public static animate: TAnimate = new TAnimate();
  public static material: TMaterial = new TMaterial();
  public static model: TModel = new TModel();
  public static machine: TMachine = new TMachine();
  public static indexedDB: TIndexedDB = new TIndexedDB();
  public static physics: TPhysics = new TPhysics();

  constructor() {}

  /**
   * @description 创建新场景
   * @author LL
   * @date 2021/08/31
   * @static
   * @param {string} sceneName  场景名称
   * @param {HTMLElement} container
   * @param {ThingOriginParams} sceneParams
   */
  public static addScene(
    sceneName: string,
    container: HTMLElement,
    sceneParams?: ThingOriginParams
  ): TScene {
    this.scenes.add(sceneName, container, sceneParams);
    return this.getScene(sceneName);
  }

  /**
   * @description 删除场景
   * @author LL
   * @date 2021/08/31
   * @static
   * @param {string} sceneName 场景名称
   */
  public static disposeScene(sceneName: string) {
    ThingOrigin.scenes.delete(sceneName);
  }

  /**
   * @description 获取场景
   * @author LL
   * @static
   * @param {string} sceneName 场景名称
   * @return {*}  {TScene}
   */
  public static getScene(sceneName: string): TScene {
    if (!this.scenes.scenes.has(sceneName)) {
      console.warn("不存在此场景");
      return;
    }
    return this.scenes.scenes.get(sceneName);
  }

  /**
   * @description
   * @author LL
   * @static
   * @param {string} sceneName 场景名称
   * @param {string} property
   * @param {string} value
   * @return {*}  {Object3D}
   */
  public static getObject(
    sceneName: string,
    property: string,
    value: string
  ): Object3D {
    var obj = ThingOrigin.getScene(sceneName).getObjectByProperty(
      property,
      value
    );
    if (!obj) {
      console.warn("获取模型失败");
      return;
    }
    return obj;
  }

  /**
   * @description 场景重新适配窗口大小
   * @author LL
   * @static
   * @param {string} sceneName 场景名称
   */
  public static onResize(sceneName: string) {
    var scene = ThingOrigin.getScene(sceneName);
    if (scene.camera.camera) {
      if (scene.camera.type == "PerspectiveCamera") {
        // 重新设置相机宽高比例
        (scene.camera.camera as PerspectiveCamera).aspect =
          scene.container.clientWidth / scene.container.clientHeight;
      } else if (scene.camera.type == "OrthographicCamera") {
        (scene.camera.camera as OrthographicCamera).left =
          scene.container.clientLeft;
        (scene.camera.camera as OrthographicCamera).right =
          scene.container.clientLeft + scene.container.clientWidth;
        (scene.camera.camera as OrthographicCamera).top =
          scene.container.clientTop;
        (scene.camera.camera as OrthographicCamera).bottom =
          scene.container.clientTop + scene.container.clientHeight;
      }
      // 更新相机投影矩阵
      scene.camera.camera.updateProjectionMatrix();
    }

    setTimeout(() => {
      if (scene.renderer) {
        scene.renderer.setSize(
          scene.container.clientWidth,
          scene.container.clientHeight
        );
      }
      if (scene.CSS2DRenderer) {
        scene.CSS2DRenderer.setSize(
          scene.container.clientWidth,
          scene.container.clientHeight
        );
      }
    }, 100);
  }
}

window["ThingOrigin"] = ThingOrigin;
