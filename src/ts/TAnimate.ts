import { Object3D } from "three";
import TWEEN from "tween.js/src/Tween.js";
import { TScene } from "./TScene/TScene";

export class TAnimate {
    public tScene: TScene;

    constructor(tScene: TScene) {
        this.tScene = tScene;
    }

    /**
     * @description 间补旋转动画(旋转角度)
     * @author LL
     * @param {string} parent 需要模型所属的位置，直接在场景内查找可传'scene'
     * @param {string} value 模型名称
     * @param {string} axis 方向 可传入字符串 'x'/'y'/'z'
     * @param {number} from 从哪个角度开始
     * @param {number} to 到哪个角度停止
     * @param {number} time 完成时间（毫秒）
     */
    public tweenRotate(parent: Object3D | string, value: string, axis: string, from: number, to: number, time: number) {
        let obj;
        if (typeof parent == "string") {
            if (parent == "scene") {
                obj = this.tScene.getObjectByName(value);
            } else {
                obj = this.tScene.getObjectByName(parent).getObjectByName(value);
            }
        } else {
            obj = (parent as Object3D).getObjectByName(value);
        }

        if (!obj) {
            console.warn("旋转动画播放失败，物体不存在");
            return;
        }
        obj.updateWorldMatrix(true, true);
        let coords = { t: from };

        new TWEEN.Tween(coords)
            .to({ t: to }, time)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate(function () {
                if (axis == "x") {
                    obj.rotation.x = (coords.t / 180) * Math.PI;
                } else if (axis == "y") {
                    obj.rotation.y = (coords.t / 180) * Math.PI;
                } else if (axis == "z") {
                    obj.rotation.z = (coords.t / 180) * Math.PI;
                }
            })
            .start();
    }

    /**
     * @description 间补旋转动画(旋转数)
     * @author LL
     * @param {string} property 模型属性名
     * @param {string} value 模型属性值
     * @param {string} axis 方向 可传入字符串 'x'/'y'/'z'
     * @param {number} from 从哪个弧度开始
     * @param {number} to 到哪个弧度停止
     * @param {number} time 完成时间（毫秒）
     */
    public tweenRotation(property: string, value: string, axis: string, from: number, to: number, time: number) {
        let obj = this.tScene.getObjectByProperty(property, value);
        if (!obj) {
            console.warn("旋转动画播放失败，物体不存在");
            return;
        }
        obj.updateWorldMatrix(true, true);
        let coords = { t: from };

        new TWEEN.Tween(coords)
            .to({ t: to }, time)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate(function () {
                if (axis == "x") {
                    obj.rotation.x = coords.t;
                } else if (axis == "y") {
                    obj.rotation.y = coords.t;
                } else if (axis == "z") {
                    obj.rotation.z = coords.t;
                }
            })
            .start();
    }

    /**
     * @description 间补平移动画
     * @author LL
     * @param {string} property 模型属性名
     * @param {string} value 模型属性值
     * @param {string} axis 方向 可传入字符串 'x'/'y'/'z'
     * @param {number} from 从哪个位置开始
     * @param {number} to 到哪个位置停止
     * @param {number} time 完成时间（毫秒）
     */
    public tweenMove(property: string, value: string, axis: string, from: number, to: number, time: number) {
        let obj = this.tScene.getObjectByProperty(property, value);
        if (!obj) {
            console.warn("平移动画播放失败，物体不存在");
            return;
        }
        obj.updateWorldMatrix(true, true);

        let coords = { t: from };

        new TWEEN.Tween(coords)
            .to({ t: to }, time)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate(function () {
                if (axis == "x") {
                    obj.position.x = coords.t;
                } else if (axis == "y") {
                    obj.position.y = coords.t;
                } else if (axis == "z") {
                    obj.position.z = coords.t;
                }
            })
            .start();
    }

    /**
     * @description 展示爆炸图
     * @author LL
     * @date 2021/09/01
     * @param {string} property 模型属性名
     * @param {string} value 模型属性值
     * @param {number} ratio 爆炸图偏移系数
     * @param {number} time 完成时间（毫秒）
     * @returns {*}
     */
    public showExploded(property: string, value: string, ratio: number, time: number) {
        var obj = this.tScene.getObjectByProperty(property, value);

        if (!obj) {
            console.warn("爆炸图展示失败，物体不存在");
            return;
        }

        var a = this.tScene.getChildrenInfo(property, value);
        for (var i = 0; i < a.length; i++) {
            this.tweenMove("uuid", a[i].uuid, "x", a[i].position.x, a[i].position.x * ratio, time);
            this.tweenMove("uuid", a[i].uuid, "y", a[i].position.y, a[i].position.y * ratio, time);
            this.tweenMove("uuid", a[i].uuid, "z", a[i].position.z, a[i].position.z * ratio, time);
        }
    }
}
