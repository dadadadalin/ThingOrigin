import { log } from "three/examples/jsm/nodes/Nodes";
import {
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  PointLight,
  SpotLight,
  Vector3,
} from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { Tool } from "./Tool";
import { TScene } from "./TScene";
import { ThingOrigin } from "../ThingOrigin";

/** 自定义相机的基类，用于 */
export class TCamera {
  TO: ThingOrigin;
  PerspectiveCamera: PerspectiveCamera;
  OrthographicCamera: OrthographicCamera;
  type: string;
  // tool: Tool = new Tool();

  /** 当前使用的相机 */
  private _camera: PerspectiveCamera | OrthographicCamera;
  private _cameraView: Map<string, any> = new Map<string, any>();

  public get camera(): PerspectiveCamera | OrthographicCamera {
    return this._camera;
  }

  public get cameraView(): Map<string, any> {
    return this._cameraView;
  }

  constructor(TO: ThingOrigin) {
    this.TO = TO;
    //透视相机
    this.PerspectiveCamera = this.initPerspectiveCamera(
      this.TO.container,
      this.TO.sceneData.camera.perspective
    );
    //正交相机
    let frustumSize = 1000;
    this.OrthographicCamera = this.initOrthographicCamera(
      this.TO.container,
      frustumSize,
      this.TO.sceneData.camera.perspective
    );

    this.setCamera("PerspectiveCamera");
    //设置位置
    this.camera.position.set(
      this.TO.sceneData.camera.position.x,
      this.TO.sceneData.camera.position.y,
      this.TO.sceneData.camera.position.z
    );
    this.camera.lookAt(
      this.TO.sceneData.camera.lookAt.x,
      this.TO.sceneData.camera.lookAt.y,
      this.TO.sceneData.camera.lookAt.z
    );

    let views = this.TO.sceneData.views;

    for (let i = 0; i < views.length; ++i) {
      const view = views[i];
      const camera = this.initPerspectiveCamera(this.TO.container, view);
      camera.position.set(view.offset.x, view.offset.y, view.offset.z);
      view.camera = camera;
      let detail = Object.assign({}, view);
      this.cameraView.set(view.name, detail);

      this.TO.scene.add(camera);
    }
  }

  public initPerspectiveCamera(container, params) {
    let aspect = container.clientWidth / container.clientHeight;
    return new PerspectiveCamera(params.fov, aspect, params.near, params.far);
  }

  public initOrthographicCamera(container, frustumSize, params) {
    let aspect = container.clientWidth / container.clientHeight;
    return new OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      (frustumSize * aspect) / -2,
      params.near,
      params.far
    );
  }

  /**
   * 设置渲染相机
   * @param num
   */
  public setCamera(type: string = "PerspectiveCamera") {
    this.type = type;
    switch (type) {
      case "PerspectiveCamera":
        this._camera = this.PerspectiveCamera;
        break;
      case "OrthographicCamera":
        this._camera = this.OrthographicCamera;
        break;
    }
  }

  /**
   * @description 锁定相机视角
   * @author LL
   * @date 2021/06/29
   * @param {string} direction 方向 'top'||'bottom'||'left'||'right'||'front'||'back'
   * @param ratio 倍数
   */
  public lockCamera(direction: string, ratio: number) {
    let box = this.TO.tool.getModelSphere(this.TO.scene);
    // let ratio = 1.1;
    switch (direction) {
      case "top":
        this.camera.position.set(0, box.radius * ratio, 0);
        break;
      case "bottom":
        this.camera.position.set(0, -box.radius * ratio, 0);
        break;
      case "left":
        this.camera.position.set(-box.radius * ratio, 0, 0);
        break;
      case "right":
        this.camera.position.set(box.radius * ratio, 0, 0);
        break;
      case "front":
        this.camera.position.set(0, 0, box.radius * ratio);
        break;
      case "back":
        this.camera.position.set(0, 0, -box.radius * ratio);
        break;
    }
    this.camera.lookAt(0, 0, 0);
    this.TO.controls.orbit.target.set(0, 0, 0);
  }

  /**
   * @description 相机观察某物体
   * @author LL
   * @param {string} modelName 模型名称
   * @param {number} time 动画时长
   * @param {number} [scaleRadius=1] 以半径为单位，让相机距离多远观察
   */
  public lookAt(modelName: string, time: number, scaleRadius: number = 1) {
    let target = this.TO.scene.getObjectByProperty("name", modelName);
    if (!target) {
      console.warn("相机追踪失败，物体不存在");
      return;
    }
    let targetSphere = this.TO.tool.getModelSphere(target);

    let start = this.camera.position.clone();
    let direction = {
      x: this.camera.position.x < 0 ? -1 : 1,
      y: this.camera.position.y < 0 ? -1 : 1,
      z: this.camera.position.z < 0 ? -1 : 1,
    };
    let end = target.position
      .clone()
      .add(
        new Vector3(
          targetSphere.radius * scaleRadius * direction.x,
          targetSphere.radius * scaleRadius * direction.y,
          targetSphere.radius * scaleRadius * direction.z
        )
      );

    new TWEEN.Tween(start)
      .to(end, time)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(() => {
        this.camera.position.set(start.x, start.y, start.z);
        this.camera.lookAt(target.position);
      })
      .start();
  }

  focusOn(model: Object3D) {
    if (!model) {
      console.warn("相机追踪失败，物体不存在");
      return;
    }

    this.TO.effect.initBreath(model);

    let worldPosition = this.TO.tool.getWorldPosition(model);

    //通过模型包裹球  确定相机位置
    let boundSphere = this.TO.tool.getModelSphere(model);
    this.TO.camera.camera.position.set(
      worldPosition.x,
      worldPosition.y + boundSphere.radius * 2,
      worldPosition.z + boundSphere.radius * 2
    );
    this.TO.camera.camera.lookAt(boundSphere.center);
    // this.explode(explodeModel, explodeInfo);
  }
}
