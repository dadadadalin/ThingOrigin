import { Object3D } from "three";
import machines from "../../public/static/data/machines.js";
import { ThingOrigin } from "../ThingOrigin";

export class TMachine {
  constructor() {}

  /**
   * @description 重置机器人关节(角度)
   * @author LL
   * @date 2022-05-09
   * @param {Object3D} robot 机器人
   * @param {jointsParams[]} joints 关节参数
   * @param {jointDataParams} jointData 关节动作数据
   */
  public setJointAngle(
    robot: Object3D,
    joints: jointsParams[],
    jointData: jointDataParams
  ) {
    if (!robot) {
      console.warn("重置【" + robot.name + "】（角度）失败，物体不存在");
      return;
    }
    if (JSON.stringify(jointData) == "{}") {
      console.warn(robot.name + "：关节数据为空，无法运行重置角度");
      return;
    }
    for (var i = 0; i < joints.length; i++) {
      let dataUrl = joints[i].dataSource.split("root.")[1];
      if (jointData[dataUrl]) {
        robot.getObjectByName(joints[i].name).rotation[joints[i].axis] =
          joints[i].reverse * Number(jointData[dataUrl] / 180) * Math.PI;
      } else {
        console.warn("重置数据异常：" + i + "=" + jointData[dataUrl]);
      }
    }
  }

  /**
   * @description 重置机器人关节(弧度)
   * @author LL
   * @date 2022-06-20
   * @param {Object3D} robot 机器人
   * @param {jointsParams[]} joints 关节参数
   * @param {jointDataParams} jointData 关节动作数据
   */
  public setJointRadian(
    robot: Object3D,
    joints: jointsParams[],
    jointData: jointDataParams
  ) {
    if (!robot) {
      console.warn("重置【" + robot.name + "】（弧度）失败，物体不存在");
      return;
    }
    if (JSON.stringify(jointData) == "{}") {
      console.warn(robot.name + "：关节数据为空，无法运行重置弧度");
      return;
    }
    for (var i = 0; i < joints.length; i++) {
      let dataUrl = joints[i].dataSource.split("root.")[1];
      if (jointData[dataUrl]) {
        robot.getObjectByName(joints[i].name).rotation[joints[i].axis] =
          joints[i].reverse * Number(jointData[dataUrl]);
      } else {
        console.warn(
          "【" + robot.name + "】数据异常：" + i + "=" + jointData[dataUrl]
        );
      }
    }
  }

  /**
   * @description 模型孪生旋转动画（角度）
   * @author LL
   * @date 2022-05-09
   * @param {Object3D} robot 机器人
   * @param {jointsParams[]} joints 关节参数
   * @param {jointDataParams} preData 上一次动作数据
   * @param {jointDataParams} curData 当前动作数据
   * @param {number} time 动画时间
   */
  public twinAngle(
    robot: Object3D,
    joints: jointsParams[],
    preData: jointDataParams,
    curData: jointDataParams,
    time: number
  ) {
    if (!robot) {
      console.warn("旋转角度失败，物体不存在");
      return;
    }
    for (var i = 0; i < joints.length; i++) {
      let dataUrl = joints[i].dataSource.split("root.")[1];
      if (preData[dataUrl] != undefined && curData[dataUrl] != undefined) {
        if (preData[dataUrl] != curData[dataUrl]) {
          ThingOrigin.animate.rotateAngle(
            robot.getObjectByName(joints[i].name),
            joints[i].axis,
            joints[i].reverse * Number(preData[dataUrl]),
            joints[i].reverse * Number(curData[dataUrl]),
            time
          );
        }
      } else {
        console.warn(
          joints[i].name +
            "数据异常：pre=" +
            preData[dataUrl] +
            ",cur=" +
            curData[dataUrl]
        );
      }
    }
  }

  /**
   * @description 模型孪生旋转动画（弧度）
   * @author LL
   * @date 2022-06-15
   * @param {Object3D} robot 机器人
   * @param {jointsParams[]} joints 关节参数
   * @param {jointDataParams} preData 上一次动作数据
   * @param {jointDataParams} curData 当前动作数据
   * @param {number} time 动画时间
   */
  public twinRadian(
    robot: Object3D,
    joints: jointsParams[],
    preData: jointDataParams,
    curData: jointDataParams,
    time: number
  ) {
    if (!robot) {
      console.warn("旋转弧度失败，物体不存在");
      return;
    }

    for (var i = 0; i < joints.length; i++) {
      let dataUrl = joints[i].dataSource.split("root.")[1];
      if (preData[dataUrl] != undefined && curData[dataUrl] != undefined) {
        if (preData[dataUrl] != curData[dataUrl]) {
          ThingOrigin.animate.rotateRadian(
            robot.getObjectByName(joints[i].name),
            joints[i].axis,
            joints[i].reverse * Number(preData[dataUrl]),
            joints[i].reverse * Number(curData[dataUrl]),
            time
          );
        }
      } else {
        console.warn(
          joints[i].name +
            "数据异常：pre=" +
            preData[dataUrl] +
            ",cur=" +
            curData[dataUrl]
        );
      }
    }
  }

  /**
   * @description aubo机器人的孪生动画
   * @author LL
   * @date 2022-05-09
   * @param {Object3D} aubo aubo机器人
   * @param {jointDataParams} preData 上一次动作数据
   * @param {jointDataParams} curData 当前动作数据
   * @param {number} time 动画时间
   */
  public twinAobo(
    aubo: Object3D,
    preData: jointDataParams,
    curData: jointDataParams,
    time: number
  ) {
    this.twinAngle(aubo, machines.aubo.joints, preData, curData, time);
  }

  /**
   * @description aobo机器人的孪生动画
   * @author LL
   * @date 2022-05-09
   * @param {Object3D} aubo aobo机器人
   * @param {jointDataParams} jointData 关节数据
   */
  public resetAobo(aubo: Object3D, jointData: jointDataParams) {
    this.setJointAngle(aubo, machines.aubo.joints, jointData);
  }
}
