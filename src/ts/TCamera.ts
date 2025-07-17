import {
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Vector3,
} from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { ThingOrigin } from "../ThingOrigin";

/**
 * 相机
 */
export class TCamera {
  private TO: ThingOrigin;

  /** 透视相机 */
  PerspectiveCamera: PerspectiveCamera;

  /** 正交相机 */
  OrthographicCamera: OrthographicCamera;

  /** 当前相机类型 */
  type: string;

  /** 当前使用的相机 */
  private _camera: PerspectiveCamera | OrthographicCamera;

  /** 相机视角map */
  private _cameraView: Map<string, any> = new Map<string, any>();

  public get camera(): PerspectiveCamera | OrthographicCamera {
    return this._camera;
  }

  public get cameraView(): Map<string, any> {
    return this._cameraView;
  }

  constructor(TO: ThingOrigin) {
    this.TO = TO;

    console.log("TCAmera", ThingOrigin.sceneData);
    //透视相机
    this.PerspectiveCamera = this.initPerspectiveCamera(
      this.TO.container,
      ThingOrigin.sceneData.camera.perspective
    );
    //正交相机
    let frustumSize = 1000;
    this.OrthographicCamera = this.initOrthographicCamera(
      this.TO.container,
      frustumSize,
      ThingOrigin.sceneData.camera.perspective
    );

    this.setCamera("PerspectiveCamera");
    //设置位置
    this.camera.position.set(
      ThingOrigin.sceneData.camera.position.x,
      ThingOrigin.sceneData.camera.position.y,
      ThingOrigin.sceneData.camera.position.z
    );
    this.camera.lookAt(
      ThingOrigin.sceneData.camera.lookAt.x,
      ThingOrigin.sceneData.camera.lookAt.y,
      ThingOrigin.sceneData.camera.lookAt.z
    );
  }

  /**
   * 创建透视相机
   * @author LL
   * @param container 容器
   * @param params 相机参数
   */
  public initPerspectiveCamera(container, params) {
    let aspect = container.clientWidth / container.clientHeight;
    return new PerspectiveCamera(params.fov, aspect, params.near, params.far);
  }

  /**
   * 创建正交相机
   * @author LL
   * @param container 容器
   * @param frustumSize 视锥架大小
   * @param params 相机参数
   */
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
   * @param type 相机类型
   */
  public setCamera(
    type: "PerspectiveCamera" | "OrthographicCamera" = "PerspectiveCamera"
  ) {
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
   * 锁定相机视角
   * @author LL
   * @since 2021/06/29
   * @param {string} direction 方向
   * @param {number} ratio 倍数
   * @param {Object3D} [model] 锁定模型（不传则锁定场景）
   */
  public lockCamera(
    direction: "top" | "bottom" | "left" | "right" | "front" | "back",
    ratio: number = 1.1,
    model?: Object3D
  ) {
    let box = model
      ? this.TO.tool.getModelSphere(model)
      : this.TO.tool.getModelSphere(this.TO.scene);

    switch (direction) {
      case "top":
        this.camera.position.set(
          box.center.x,
          box.radius * ratio,
          box.center.z
        );
        break;
      case "bottom":
        this.camera.position.set(
          box.center.x,
          -box.radius * ratio,
          box.center.z
        );
        break;
      case "left":
        this.camera.position.set(
          -box.radius * ratio,
          box.center.y,
          box.center.z
        );
        break;
      case "right":
        this.camera.position.set(
          box.radius * ratio,
          box.center.y,
          box.center.z
        );
        break;
      case "front":
        this.camera.position.set(
          box.center.x,
          box.center.y,
          box.radius * ratio
        );
        break;
      case "back":
        this.camera.position.set(
          box.center.x,
          box.center.y,
          -box.radius * ratio
        );
        break;
    }
    this.camera.lookAt(box.center);
    this.TO.controls.orbit.target.set(box.center.x, box.center.y, box.center.z);
  }

  /**
   * 相机观察某物体
   * @author LL
   * @param {string} modelName 模型名称
   * @param {number} time 动画时长
   * @param {number} [scaleRadius] 以半径为单位，让相机距离多远观察
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

  /**
   * 聚焦模型
   * @author LL
   * @param model 模型
   */
  public focusOn(model: Object3D) {
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
  }
}
