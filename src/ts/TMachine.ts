import { Object3D } from "three";
import { ThingOrigin } from "../ThingOrigin";

export class TMachine {
    constructor() {}

    /**
     * @description 重置6轴机器人关节
     * @author LL
     * @date 2022-05-09
     * @param {Object3D} robot
     * @param {jointsParams[]} joints
     * @param {jointDataParams} jointData
     */
    public resetJoint6(robot: Object3D, joints: jointsParams[], jointData: jointDataParams) {
        for (var i = 0; i < 6; i++) {
            console.log(joints[i]);

            robot.getObjectByName(joints[i].name).rotation[joints[i].axis] = joints[i].reverse * Number(jointData["joint" + i] / 180) * Math.PI;
        }
    }

    /**
     * @description 6轴机器人的孪生动画
     * @author LL
     * @date 2022-05-09
     * @param {Object3D} robot
     * @param {jointsParams[]} joints
     * @param {twinJointsParams[]} jointData
     * @param {number} time
     */
    public twinJoint6(robot: Object3D, joints: jointsParams[], jointData: twinJointsParams[], time: number) {
        for (var i = 0; i < 6; i++) {
            if (jointData[i].preData != jointData[i].curData) {
                ThingOrigin.animate.tweenRotate(robot.getObjectByName(joints[i].name), joints[i].axis, Number(jointData[i].preData), Number(jointData[i]), time);
            }
        }
    }
}
