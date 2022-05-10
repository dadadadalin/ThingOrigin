import { Object3D } from "three";
import { ThingOrigin } from "../ThingOrigin";

export class TMachine {
    constructor() {}

    /**
     * @description 重置6轴机器人关节
     * @author LL
     * @date 2022-05-09
     * @param {Object3D} robot 6轴机器人
     * @param {jointsParams[]} joints 关节参数
     * @param {jointDataParams} jointData 关节动作数据
     */
    public resetJoint6(robot: Object3D, joints: jointsParams[], jointData: jointDataParams) {
        for (var i = 0; i < 6; i++) {
            robot.getObjectByName(joints[i].name).rotation[joints[i].axis] = joints[i].reverse * Number(jointData["joint" + (i + 1)] / 180) * Math.PI;
        }
    }

    /**
     * @description
     * @author LL
     * @date 2022-05-09
     * @param {Object3D} robot 6轴机器人
     * @param {jointsParams[]} joints 关节参数
     * @param {jointDataParams} preData 上一次动作数据
     * @param {jointDataParams} curData 当前动作数据
     * @param {number} time 动画时间
     */
    public twinJoint6(robot: Object3D, joints: jointsParams[], preData: jointDataParams, curData: jointDataParams, time: number) {
        for (var i = 0; i < 6; i++) {
            if (preData["joint" + (i + 1)] != curData["joint" + (i + 1)]) {
                ThingOrigin.animate.tweenRotate(
                    robot.getObjectByName(joints[i].name),
                    joints[i].axis,
                    joints[i].reverse * Number(preData["joint" + (i + 1)]),
                    joints[i].reverse * Number(curData["joint" + (i + 1)]),
                    time
                );
            }
        }
    }

    /**
     * @description aobo机器人的关节
     * @author LL
     * @date 2022-05-10
     * @private
     * @static
     */
    private static auboJoints = [
        { name: "对象001", axis: "y", reverse: 1 },
        { name: "对象002", axis: "x", reverse: 1 },
        { name: "对象003", axis: "x", reverse: -1 },
        { name: "对象004", axis: "x", reverse: 1 },
        { name: "AGV2", axis: "y", reverse: 1 },
        { name: "对象005", axis: "x", reverse: 1 },
    ];

    /**
     * @description aobo机器人的孪生动画
     * @author LL
     * @date 2022-05-09
     * @param {Object3D} aubo aobo机器人
     * @param {jointDataParams[]} preData 上一次动作数据
     * @param {jointDataParams[]} curData 当前动作数据
     * @param {number} time 动画时间
     */
    public twinAobo(aubo: Object3D, preData: jointDataParams, curData: jointDataParams, time: number) {
        this.twinJoint6(aubo, TMachine.auboJoints, preData, curData, time);
    }

    /**
     * @description aobo机器人的孪生动画
     * @author LL
     * @date 2022-05-09
     * @param {Object3D} aubo aobo机器人
     * @param {jointDataParams[]} preData 上一次动作数据
     * @param {jointDataParams[]} curData 当前动作数据
     * @param {number} time 动画时间
     */
    public resetAobo(aubo: Object3D, jointData: jointDataParams) {
        this.resetJoint6(aubo, TMachine.auboJoints, jointData);
    }
}
