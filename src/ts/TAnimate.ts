import {Mesh, Object3D} from "three";
// import { Flow } from "";
// import { Flow } from "three/examples/jsm/modifiers/CurveModifier";
import TWEEN from "tween.js/src/Tween.js";
import { ThingOrigin } from "../ThingOrigin";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";

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
    public rotateAngle(model: Object3D, axis: string, from: number, to: number, time: number) {
        if (!model) {
            console.warn("旋转（角度）失败，物体不存在");
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
    public rotateRadian(model: Object3D, axis: string, from: number, to: number, time: number) {
        if (!model) {
            console.warn("旋转（弧度）失败，物体不存在");
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
    public move(model: Object3D, axis: string, from: number, to: number, time: number) {
        if (!model) {
            console.warn("平移失败，物体不存在");
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
            console.warn("爆炸失败，物体不存在");
            return;
        }

        var a = ThingOrigin.tool.getChildrenInfo(model);
        for (var i = 0; i < a.length; i++) {
            var child = model.getObjectByProperty("uuid", a[i].uuid);
            this.move(child, "x", a[i].position.x, a[i].position.x * ratio, time);
            this.move(child, "y", a[i].position.y, a[i].position.y * ratio, time);
            this.move(child, "z", a[i].position.z, a[i].position.z * ratio, time);
        }
    }

    // public alongPoints(model: Object3D, points: number[][]) {
    //     let flow = new Flow(objectToCurve);
    // }

    /**
     * @description 模型淡入效果
     * @author gj
     * @date 2023/10/25
     * @param {Object3D} model 模型
     * @param {number} time 完成时间（毫秒）
     * @returns  {*}
     */
    public modelFadeIn(model: Object3D, time: number){
        if (!model) {
            console.warn("物体不存在");
            return;
        }
        model.traverse((child) => {
            if (child instanceof Mesh) {
                if (child.material) {
                    new TWEEN.Tween(child.material)
                    .to({ opacity: 1.0 }, time)
                    .start()
                }
            }
        })
       
    }

     /**
     * @description 模型淡出效果
     * @author gj
     * @date 2023/10/25
     * @param {Object3D} model 模型
     * @param {number} time 完成时间（毫秒）
     * @returns  {*}
     */
    public modelFadeOut(model: Object3D, time: number){
        if (!model) {
            console.warn("物体不存在");
            return;
        }
        model.traverse((child) => {
            if (child instanceof Mesh) {
                if (child.material) {
                    new TWEEN.Tween(child.material)
                    .to({ opacity: 0 }, time)
                    .start()
                }
            }
        })
    }

     /**
     * @description 2d元素标签淡入效果
     * @author gj
     * @date 2023/10/25
     * @param {CSS2DObject} tag 2d元素
     * @param {number} time 完成时间（毫秒）
     * @returns  {*}
     */
    public tagFadeIn(tag: CSS2DObject, time: number){
        if (!tag) {
            console.warn("标签元素不存在");
            return;
        }
        let styleOpacity = { opacity: '0.0' };
        new TWEEN.Tween(styleOpacity).to({ opacity: '1.0' }, time)
        .onUpdate(function(){
            //动态更新元素透明度
            tag.element.style.opacity = styleOpacity.opacity;
        })
        .start()
    }

    /**
     * @description 2d元素标签淡出效果
     * @author gj
     * @date 2023/10/25
     * @param {CSS2DObject} tag 2d元素
     * @param {number} time 完成时间（毫秒）
     * @returns  {*}
     */
    public tagFadeOut(tag: CSS2DObject, time: number){
        if (!tag) {
            console.warn("标签元素不存在");
            return;
        }
        let styleOpacity = { opacity: '1.0' };
        new TWEEN.Tween(styleOpacity).to({ opacity: '0.0' }, time)
        .onUpdate(function() {
          //动态更新元素透明度
          tag.element.style.opacity = styleOpacity.opacity;
        })
        .start();
    }

}
