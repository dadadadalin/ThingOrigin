import { Object3D } from "three";
import TWEEN from "tween.js/src/Tween.js";
import { ThingOrigin } from "../ThingOrigin";

export class TAnimate {
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
    public tweenRotate(model: Object3D, axis: string, from: number, to: number, time: number) {
        if (!model) {
            console.warn("旋转动画播放失败，物体不存在");
            return;
        }
        model.updateWorldMatrix(true, true);
        let coords = { t: from };

        new TWEEN.Tween(coords)
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
    public tweenRotation(model: Object3D, axis: string, from: number, to: number, time: number) {
        if (!model) {
            console.warn("旋转动画播放失败，物体不存在");
            return;
        }
        model.updateWorldMatrix(true, true);

        let coords = { t: from };
        new TWEEN.Tween(coords)
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
    public tweenMove(model: Object3D, axis: string, from: number, to: number, time: number) {
        if (!model) {
            console.warn("平移动画播放失败，物体不存在");
            return;
        }
        model.updateWorldMatrix(true, true);

        let coords = { t: from };

        new TWEEN.Tween(coords)
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
     * @description 展示爆炸图
     * @author LL
     * @date 2021/09/01
     * @param {Object3D} model 模型
     * @param {number} ratio 爆炸图偏移系数
     * @param {number} time 完成时间（毫秒）
     * @returns {*}
     */
    public showExploded(model: Object3D, ratio: number, time: number) {
        if (!model) {
            console.warn("爆炸图展示失败，物体不存在");
            return;
        }

        var a = ThingOrigin.tool.getChildrenInfo(model);
        for (var i = 0; i < a.length; i++) {
            var child = model.getObjectByProperty("uuid", a[i].uuid);
            this.tweenMove(child, "x", a[i].position.x, a[i].position.x * ratio, time);
            this.tweenMove(child, "y", a[i].position.y, a[i].position.y * ratio, time);
            this.tweenMove(child, "z", a[i].position.z, a[i].position.z * ratio, time);
        }
    }
}
