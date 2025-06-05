import { Tool } from "./Tool";
import { Mesh, Object3D } from "three";
// import { Flow } from "";
// import { Flow } from "three/examples/jsm/modifiers/CurveModifier";
import * as TWEEN from "@tweenjs/tween.js";

export class TAnimate {
  tool: Tool = new Tool();
  // public setPosition(model: Object3D, position: xyz) {
  //   model.position.set(position.x, position.y, position.z);
  // }

  /**
   * @description 间补旋转动画(旋转角度)
   * @author LL
   * @date 26/04/2022
   * @param {Object3D} model 模型
   * @param {string} axis 方向（'x'/'y'/'z'）
   * @param {number} from 起始角度
   * @param {number} to 目标角度
   * @param {number} time 动画时间（毫秒）
   */
  public rotateAngle(
    model: Object3D,
    axis: string,
    from: number,
    to: number,
    time: number
  ): TWEEN.Tween<any> {
    if (!model) {
      console.warn("旋转（角度）失败，物体不存在");
      return;
    }
    model.updateWorldMatrix(true, true);
    let coords = { t: from };

    return new TWEEN.Tween(coords)
      .to({ t: to }, time)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(function () {
        if (axis == "x") {
          model.rotation.x = (coords.t / 180) * Math.PI;
        } else if (axis == "y") {
          model.rotation.y = (coords.t / 180) * Math.PI;
        } else if (axis == "z") {
          model.rotation.z = (coords.t / 180) * Math.PI;
        }
      })
      .start();
  }

  /**
   * @description 间补旋转动画(旋转数)
   * @author LL
   * @param {Object3D} model 模型
   * @param {string} axis 方向 可传入字符串 'x'/'y'/'z'
   * @param {number} from 从哪个弧度开始
   * @param {number} to 到哪个弧度停止
   * @param {number} time 完成时间（毫秒）
   */
  public rotateRadian(
    model: Object3D,
    axis: string,
    from: number,
    to: number,
    time: number
  ): TWEEN.Tween<any> {
    if (!model) {
      console.warn("旋转（弧度）失败，物体不存在");
      return;
    }
    model.updateWorldMatrix(true, true);

    let coords = { t: from };
    return new TWEEN.Tween(coords)
      .to({ t: to }, time)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(function () {
        if (axis == "x") {
          model.rotation.x = coords.t;
        } else if (axis == "y") {
          model.rotation.y = coords.t;
        } else if (axis == "z") {
          model.rotation.z = coords.t;
        }
      })
      .start();
  }

  /**
   * @description 间补平移动画
   * @author LL
   * @param {Object3D} model 模型
   * @param {string} axis 方向 可传入字符串 'x'/'y'/'z'
   * @param {number} from 从哪个位置开始
   * @param {number} to 到哪个位置停止
   * @param {number} time 完成时间（毫秒）
   */
  public move(
    model: Object3D,
    axis: string,
    from: number,
    to: number,
    time: number
  ): TWEEN.Tween<any> {
    if (!model) {
      console.warn("平移失败，物体不存在");
      return;
    }
    model.updateWorldMatrix(true, true);

    let coords = { t: from };

    return new TWEEN.Tween(coords)
      .to({ t: to }, time)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(function () {
        if (axis == "x") {
          model.position.x = coords.t;
        } else if (axis == "y") {
          model.position.y = coords.t;
        } else if (axis == "z") {
          model.position.z = coords.t;
        }
      })
      .start();
  }

  /**
   * @description 模型淡入效果
   * @author gj
   * @date 2023/10/25
   * @param {Object3D} model 模型
   * @param {number} time 完成时间（毫秒）
   * @returns  {*}
   */
  public modelFadeIn(model: Object3D, time: number) {
    if (!model) {
      console.warn("物体不存在");
      return;
    }
    model.traverse((child) => {
      if (child instanceof Mesh) {
        if (child.material) {
          new TWEEN.Tween(child.material).to({ opacity: 1.0 }, time).start();
        }
      }
    });
  }

  /**
   * @description 模型淡出效果
   * @author gj
   * @date 2023/10/25
   * @param {Object3D} model 模型
   * @param {number} time 完成时间（毫秒）
   * @returns  {*}
   */
  public modelFadeOut(model: Object3D, time: number) {
    if (!model) {
      console.warn("物体不存在");
      return;
    }
    model.traverse((child) => {
      if (child instanceof Mesh) {
        if (child.material) {
          new TWEEN.Tween(child.material).to({ opacity: 0 }, time).start();
        }
      }
    });
  }

  /**
   * @description 关联模型
   * @author LL
   * @date 2024/07/02
   * @param {Object3D} parent
   * @param {Object3D} child
   * @param {xyz} scale
   * @memberof TAnimate
   */
  public attachModel(parent: Object3D, child: Object3D, configs?: prs) {
    let defaultParams = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };
    let param = Object.assign(defaultParams, configs);
    if (param.scale) {
      child.scale.set(param.scale.x, param.scale.y, param.scale.z);
    }

    if (parent.userData.sim?.positionOffset) {
      child.position.set(
        parent.userData.sim.positionOffset.x + param.position.x,
        parent.userData.sim.positionOffset.y + param.position.y,
        parent.userData.sim.positionOffset.z + param.position.z
      );
    } else {
      child.position.set(param.position.x, param.position.y, param.position.z);
    }

    if (parent.userData.sim?.rotationOffset) {
      child.rotation.set(
        parent.userData.sim.rotationOffset.x,
        parent.userData.sim.rotationOffset.y,
        parent.userData.sim.rotationOffset.z
      );
    } else {
      child.rotation.set(param.rotation.x, param.rotation.y, param.rotation.z);
    }

    parent.add(child);

    return {
      scale: child.scale,
      position: child.position,
      rotation: child.rotation,
    };
  }

  /**
   * @description 解除关联模型
   * @author LL
   * @date 2024/09/20
   * @param {Object3D} parent
   * @param {Object3D} child
   * @returns {*}
   * @memberof TAnimate
   */
  public removeAttach(parent: Object3D, child: Object3D) {
    let worldPosition = this.tool.initVector3();
    child.getWorldPosition(worldPosition);
    parent.remove(child);

    child.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
    return child;
  }

  /**
   * @description 解除关联模型
   * @author LL
   * @date 2024/08/29
   * @param {Object3D} parent
   * @param {Object3D} child
   * @returns {*}
   * @memberof TAnimate
   */
  public detachModel(parent: Object3D, child: Object3D) {
    let worldPosition = this.tool.initVector3();
    child.getWorldPosition(worldPosition);

    parent.remove(child);
    return {
      position: worldPosition,
    };
  }
}
