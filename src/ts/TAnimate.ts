import { Tool } from "./Tool";
import { Mesh, Object3D } from "three";

import * as TWEEN from "@tweenjs/tween.js";

/**
 * 用于制作模型动画
 */
export class TAnimate {
  private tool: Tool = new Tool();

  /**
   * |属性|说明|
   * |:---:|:---|
   * |运动模式列表|直线、跳动|
   * @author LL
   */
  motionMap = new Map([
    ["linear", TWEEN.Easing.Linear.None],
    ["bounceOut", TWEEN.Easing.Bounce.Out],
  ]);
  // public setPosition(model: Object3D, position: xyz) {
  //   model.position.set(position.x, position.y, position.z);
  // }

  /**
   * 间补旋转动画(角度)
   * @author LL
   * @since 26/04/2022
   * @param {Object3D} model 模型
   * @param {string} axis 方向
   * @param {number} from 起始角度
   * @param {number} to 目标角度
   * @param {number} time 动画时间（毫秒）
   * @param {string} mode 运动模式 linear:匀速、bounceOut:弹开
   */
  public rotateAngle(
    model: Object3D,
    axis: "x" | "y" | "z",
    from: number,
    to: number,
    time: number,
    mode: string = "linear"
  ): TWEEN.Tween<any> {
    if (!model) {
      console.warn("旋转（角度）失败，物体不存在");
      return;
    }
    model.updateWorldMatrix(true, true);

    let coords = { t: from };

    return new TWEEN.Tween(coords)
      .to({ t: to }, time)
      .easing(this.motionMap.get(mode))
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
   * 间补旋转动画(弧度)
   * @author LL
   * @param {Object3D} model 模型
   * @param {string} axis 方向
   * @param {number} from 从哪个弧度开始
   * @param {number} to 到哪个弧度停止
   * @param {number} time 完成时间（毫秒）
   */
  public rotateRadian(
    model: Object3D,
    axis: "x" | "y" | "z",
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
   * 间补平移动画
   * @author LL
   * @param {Object3D} model 模型
   * @param {string} axis 方向
   * @param {number} from 从哪个位置开始
   * @param {number} to 到哪个位置停止
   * @param {number} time 完成时间（毫秒）
   */
  public move(
    model: Object3D,
    axis: "x" | "y" | "z",
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
   * 模型淡入效果
   * @author gj
   * @since 2023/10/25
   * @param {Object3D} model 模型
   * @param {number} time 完成时间（毫秒）
   */
  public modelFadeIn(model: Object3D, time: number) {
    if (!model) {
      console.warn("物体不存在");
      return;
    }
    // 设置所有材质为透明，以便可以控制透明度
    model.traverse((child: any) => {
      if (child.isMesh) {
        child.material.transparent = true;
        child.material.opacity = 0; // opacity：0 初始值
      }
    });
    model.traverse((child) => {
      if (child instanceof Mesh) {
        if (child.material) {
          new TWEEN.Tween(child.material).to({ opacity: 1.0 }, time).start();
        }
      }
    });
  }

  /**
   * 模型淡出效果
   * @author gj
   * @since 2023/10/25
   * @param {Object3D} model 模型
   * @param {number} time 完成时间（毫秒）
   */
  public modelFadeOut(model: Object3D, time: number) {
    if (!model) {
      console.warn("物体不存在");
      return;
    }
    // 设置所有材质为透明，以便可以控制透明度
    model.traverse((child: any) => {
      if (child.isMesh) {
        child.material.transparent = true;
        child.material.opacity = 1; // opacity：1 初始值
      }
    });
    model.traverse((child) => {
      if (child instanceof Mesh) {
        if (child.material) {
          new TWEEN.Tween(child.material).to({ opacity: 0 }, time).start();
        }
      }
    });
  }

  /**
   * 将child模型关联至parent模型中
   * @author LL
   * @since 2024/07/02
   * @param {Object3D} parent 父模型
   * @param {Object3D} child 子模型
   * @param {prs} [configs] 关联配置项,默认值
   * {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
   * }
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
   * 解除关联（父与子）
   * @author LL
   * @since 2024/09/20
   * @param {Object3D} parent 父模型
   * @param {Object3D} child 子模型
   */
  public removeAttach(parent: Object3D, child: Object3D) {
    let worldPosition = this.tool.initVector3();
    child.getWorldPosition(worldPosition);
    parent.remove(child);

    child.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
    return child;
  }

  /**
   * 解除关联并销毁（父与子）
   * @author LL
   * @since 2024/08/29
   * @param {Object3D} parent 父模型
   * @param {Object3D} child 子模型
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
