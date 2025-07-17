import { Object3D } from "three";
import { cloneDeep } from "lodash-es";
// @ts-ignore
import machines from "../../public/data/machines.js";
import { ThingOrigin } from "../ThingOrigin";

/**
 * 特定型号设备
 */

export class TMachine {
  private TO: ThingOrigin;

  constructor(TO: ThingOrigin) {
    this.TO = TO;
  }

  /**
   * 设置模型姿态
   * @author LL
   * @since 2024/06/14
   * @param {Object3D} model
   * @param {jointsParams[]} animateInfo
   * @param {*} data
   */
  public setModel(model: Object3D, animateInfo: jointsParams[], data: any) {
    animateInfo.forEach((element) => {
      let m = model.getObjectByName(element.modelName);

      let dataUrl = element.dataUrl.split("root.")[1].split(".");

      switch (element.animateType) {
        case "move":
          m.position[element.axis] =
            this.getData(data, dataUrl) * element.reverse;
          break;
        case "rotate":
          let correct = element.correct ? element.correct : 0;
          let reverse = element.reverse ? element.reverse : 1;

          if (element.rotateUnit == "rad") {
            m.rotation[element.axis] =
              this.getData(data, dataUrl) * reverse + correct;
          } else {
            m.rotation[element.axis] =
              (this.getData(data, dataUrl) * reverse * Math.PI) / 180 + correct;
          }
      }
    });
  }

  private getData = (data, urlList) => {
    if (urlList.length == 1) {
      return Number(data[urlList[0]]);
    } else {
      let data1 = data[urlList[0]];
      let list1 = urlList.slice(1);

      //如果生成的数据格式为{'aa.bb':3}
      if (data1 == undefined) {
        return Number(data[urlList.join(".")]);
      }
      //普通json格式
      else {
        return this.getData(data1, list1);
      }
    }
  };

  /**
   * 设置模型动作
   * @author LL
   * @since 2024/06/14
   * @param {Object3D} model
   * @param {jointsParams[]} animateInfo
   * @param {*} preData
   * @param {*} curData
   * @param {number} time
   */
  public twinModel(
    model: Object3D,
    animateInfo: jointsParams[],
    preData: any,
    curData: any,
    time: number
  ) {
    animateInfo.forEach((element: any) => {
      let m = model.getObjectByName(element.modelName);
      let dataUrl = element.dataUrl.split("root.")[1].split(".");

      switch (element.animateType) {
        case "move":
          this.TO.animate.move(
            m,
            element.axis,
            this.getData(preData, dataUrl) * element.reverse,
            this.getData(curData, dataUrl) * element.reverse,
            time
          );
          break;
        case "rotate":
          let correct = element.correct ? element.correct : 0;
          let reverse = element.reverse ? element.reverse : 1;
          if (element.rotateUnit == "rad") {
            this.TO.animate.rotateRadian(
              m,
              element.axis,
              this.getData(preData, dataUrl) * reverse + correct,
              this.getData(curData, dataUrl) * reverse + correct,
              time
            );
          } else {
            this.TO.animate.rotateAngle(
              m,
              element.axis,
              this.getData(preData, dataUrl) * reverse + correct,
              this.getData(curData, dataUrl) * reverse + correct,
              time
            );
          }
      }
    });
  }

  /**
   * 重置机器人关节(角度)
   * @author LL
   * @since 2022-05-09
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
      console.warn("重置关节角度失败：机器人对象不存在。");
      return;
    }
    if (Object.keys(jointData).length === 0) {
      console.warn(`${robot.name}：关节数据为空，无法重置关节角度。`);
      return;
    }

    joints.forEach((joint, index) => {
      const dataUrl = joint.dataUrl.split("root.")[1];
      const jointValue = jointData[dataUrl];

      if (jointValue !== undefined) {
        const jointObject = robot.getObjectByName(joint.modelName);
        if (jointObject && jointObject.rotation) {
          // 将角度转换为弧度，并应用反转系数
          jointObject.rotation[joint.axis] =
            joint.reverse * (jointValue / 180) * Math.PI;
        } else {
          console.warn(
            `关节对象 '${joint.modelName}' 未找到或缺少 rotation 属性。`
          );
        }
      } else {
        console.warn(`索引 ${index} 的 '${dataUrl}' 关节数据无效。`);
      }
    });
  }

  /**
   * 重置机器人关节(弧度)
   * @author LL
   * @since 2022-06-20
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
      let dataUrl = joints[i].dataUrl.split("root.")[1];
      if (dataUrl in jointData) {
        console.log(
          "重置方法：",
          joints[i].modelName,
          joints[i].axis,
          joints[i].reverse * Number(jointData[dataUrl])
        );
        robot.getObjectByName(joints[i].modelName).rotation[joints[i].axis] =
          joints[i].reverse * Number(jointData[dataUrl]);
      } else {
        console.warn(
          "【" + robot.name + "】数据异常：" + i + "=" + jointData[dataUrl]
        );
      }
    }
  }

  /**
   * 通过欧拉角控制旋转
   * @author LL
   * @since 2024/09/18
   * @param {Object3D} robot
   * @param {jointsParams[]} joints
   * @param {jointDataParams} jointData
   */
  public setJointEuler(
    robot: Object3D,
    joints: jointsParams[],
    jointData: jointDataParams
  ) {
    for (let i = 0; i < joints.length; i++) {
      let jointModel = robot.getObjectByName(joints[i].modelName);

      let xyz: any = {
        x:
          joints[i].axis == "x"
            ? jointData["joint" + (i + 1)] * (Math.PI / 180)
            : undefined,
        y:
          joints[i].axis == "y"
            ? jointData["joint" + (i + 1)] * (Math.PI / 180)
            : undefined,
        z:
          joints[i].axis == "z"
            ? jointData["joint" + (i + 1)] * (Math.PI / 180) * -1
            : undefined,
      };

      jointModel.setRotationFromEuler(
        this.TO.tool.initEuler(xyz.x, xyz.y, xyz.z, "XYZ")
      );
    }
  }

  /**
   * 模型孪生旋转动画（角度）
   * @author LL
   * @since 2022-05-09
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
      let dataUrl = joints[i].dataUrl.split("root.")[1];
      if (preData[dataUrl] != undefined && curData[dataUrl] != undefined) {
        if (preData[dataUrl] != curData[dataUrl]) {
          this.TO.animate.rotateAngle(
            robot.getObjectByName(joints[i].modelName),
            joints[i].axis as "x" | "y" | "z",
            joints[i].reverse * Number(preData[dataUrl]),
            joints[i].reverse * Number(curData[dataUrl]),
            time
          );
        }
      } else {
        console.warn(
          joints[i].modelName +
            "数据异常：pre=" +
            preData[dataUrl] +
            ",cur=" +
            curData[dataUrl]
        );
      }
    }
  }

  /**
   * 模型孪生旋转动画（弧度）
   * @author LL
   * @since 2022-06-15
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
      let dataUrl = joints[i].dataUrl.split("root.")[1];
      if (preData[dataUrl] != undefined && curData[dataUrl] != undefined) {
        if (preData[dataUrl] != curData[dataUrl]) {
          this.TO.animate.rotateRadian(
            robot.getObjectByName(joints[i].modelName),
            joints[i].axis as "x" | "y" | "z",
            joints[i].reverse * Number(preData[dataUrl]),
            joints[i].reverse * Number(curData[dataUrl]),
            time
          );
        }
      } else {
        console.warn(
          joints[i].modelName +
            "数据异常：pre=" +
            preData[dataUrl] +
            ",cur=" +
            curData[dataUrl]
        );
      }
    }
  }

  /**
   * 播放模型自定义动画
   * @author LL
   * @since 2024/09/24
   * @param {Object3D} robot 机器人模型
   * @param {jointsParams[]} joints 关节说明
   * @param {jointDataParams[]} actions 动作数组
   * @param {number} time 每个动作间隔时间（毫秒）
   */
  public playRadian(
    robot: Object3D,
    joints: jointsParams[],
    actions: jointDataParams[],
    time: number
  ) {
    if (!robot) {
      console.warn("旋转弧度失败，物体不存在");
      return;
    }
    if (actions.length < 2) {
      console.warn("动作数据不足，无法播放");
      return;
    }

    let index = 0;

    let si = setInterval(() => {
      this.twinRadian(robot, joints, actions[index], actions[index + 1], time);
      index++;
      if (index == actions.length - 2) {
        clearInterval(si);
      }
    }, time);
  }

  /**
   * aubo机器人的孪生动画
   * @author LL
   * @since 2022-05-09
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
    this.twinAngle(aubo, machines.aubo.joints as any, preData, curData, time);
  }

  /**
   * aobo机器人的孪生动画
   * @author LL
   * @since 2022-05-09
   * @param {Object3D} aubo aobo机器人
   * @param {jointDataParams} jointData 关节数据
   */
  public resetAobo(aubo: Object3D, jointData: jointDataParams) {
    this.setJointAngle(aubo, machines.aubo.joints as any, jointData);
  }

  /**
   * 获取模型姿态信息
   * @author LL
   * @since 2025/02/21
   */
  public getModelPose(model: Object3D) {
    let hierarchy = model.userData.hierarchy;

    let poseData = [];

    if (hierarchy) {
      for (let i = 0; i < hierarchy.joints.length; i++) {
        let child = model.getObjectByName(hierarchy.joints[i].modelName);
        poseData.push({
          modelName: child.name,
          position: {
            x: child.position.x,
            y: child.position.y,
            z: child.position.z,
          },
          rotation: {
            x: child.rotation.x,
            y: child.rotation.y,
            z: child.rotation.z,
          },
          scale: { x: child.scale.x, y: child.scale.y, z: child.scale.z },
          matrixWorld: cloneDeep(child.matrixWorld),
        });
      }
      return poseData;
    }

    model.traverse((child) => {
      poseData.push({
        modelName: child.name,
        position: {
          x: child.position.x,
          y: child.position.y,
          z: child.position.z,
        },
        rotation: {
          x: child.rotation.x,
          y: child.rotation.y,
          z: child.rotation.z,
        },
        scale: { x: child.scale.x, y: child.scale.y, z: child.scale.z },
        matrixWorld: cloneDeep(child.matrixWorld),
      });
    });

    return poseData;
  }

  /**
   * 设置模型姿态
   * @author LL
   * @since 2025/02/21
   * @param {Object3D} model
   * @param {*} poseData
   */
  public setPose(model: Object3D, poseData: any) {
    for (let i = 0; i < poseData.length; i++) {
      let child = model.getObjectByName(poseData[i].modelName);
      child.position.x = poseData[i].position.x;
      child.position.y = poseData[i].position.y;
      child.position.z = poseData[i].position.z;
      child.rotation.x = poseData[i].rotation.x;
      child.rotation.y = poseData[i].rotation.y;
      child.rotation.z = poseData[i].rotation.z;
    }
  }
}
