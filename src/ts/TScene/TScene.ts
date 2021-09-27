import { Color, Group, Object3D, Scene, TextureLoader, Vector2, WebGLRenderer } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";
import TWEEN from "tween.js/src/Tween.js";
import { TEventDispatcher } from "../controls/TEventDispatcher";
import { TExporters } from "../exporters/TExporters";
import { TCamera } from "../TCamera";
import { TControl } from "../TControl";
import { THelper } from "../THelper";
import { TLight } from "../TLight";
import { ThingOrigin } from "./../../ThingOrigin";

//to
//用一个group来放模型
export class TScene extends Scene {
    /** 光源管理 */
    public light: TLight = new TLight(this);
    /** 当前场景的dom容器 */
    public container: HTMLElement;
    /** 当前渲染使用的相机 */
    public camera: TCamera;
    /** 辅助器 */
    public helper: THelper = new THelper(this);
    /** 交互器 */
    public controls: TControl;
    /** 当前渲染使用的渲染器 */
    public renderer: WebGLRenderer;
    /** 当前渲染2D的渲染器 */
    public CSS2DRenderer: CSS2DRenderer;
    /** 事件捕捉器 */
    public eDispatcher: TEventDispatcher = new TEventDispatcher();
    /** 导出 */
    public exporters: TExporters = new TExporters();
    /** 效果合成器 */
    public effectComposer: EffectComposer;

    private outlinePass: OutlinePass;

    public sceneParam: ThingOriginParams;

    /**
     * @description 修改背景图片
     * @author LL
     * @date 2021/08/26
     * @param {string} url
     */
    public backgroundImg(url: string) {
        this.background = new TextureLoader().load(url);
    }

    /**
     * 创建一个场景
     * @param container dom容器
     * @param rendererParameters renderer配置项
     * @param sceneParams 自定义配置
     */
    public createScene(container: HTMLElement, sceneParams: ThingOriginParams): void {
        this.sceneParam = sceneParams;
        this.container = container;
        this.camera = new TCamera(this, this.container);
        this.camera.position.set(sceneParams.camera.position[0], sceneParams.camera.position[1], sceneParams.camera.position[2]);

        this.initRender(sceneParams);
        this.initLight(sceneParams);
        this.initEffect(sceneParams);
        this.initControl(sceneParams);
        if (sceneParams.models) this.loadModel(sceneParams);
        if (sceneParams.css2d) this.loadCSS2D(sceneParams);
    }

    /**
     * @description 初始化场景渲染器
     * @author LL
     * @date 2021/07/26
     * @private
     * @param {ThingOriginParams} sceneParams
     * @param {WebGLRendererParameters} [rendererParameters]
     */
    private initRender(sceneParams: ThingOriginParams) {
        //渲染器
        this.renderer = new WebGLRenderer(sceneParams.scene.webglrenderer);

        if (sceneParams.scene.webglrenderer.alpha) {
            this.renderer.setClearColor(sceneParams.scene.background.color, sceneParams.scene.background.alpha); //default
        } else {
            this.background = new Color(sceneParams.scene.background.color);
        }

        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        if (sceneParams && sceneParams.shadow) {
            this.renderer.shadowMap.enabled = sceneParams.shadow;
        }
        this.container.appendChild(this.renderer.domElement);

        //2D渲染器
        this.CSS2DRenderer = new CSS2DRenderer();
        this.CSS2DRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.CSS2DRenderer.domElement.style.position = "absolute";
        this.CSS2DRenderer.domElement.style.bottom = "0";
        this.container.appendChild(this.CSS2DRenderer.domElement);
    }

    /**
     * @description 初始化场景光源
     * @author LL
     * @date 2021/07/26
     * @private
     * @param {ThingOriginParams} sceneParams
     */
    private initLight(sceneParams: ThingOriginParams) {
        for (let i = 0; i < sceneParams.lights.length; i++) {
            const light = this.light.addDirectionalLight("light1", undefined, 1);
            light.position.set(sceneParams.lights[i].position[0], sceneParams.lights[i].position[1], sceneParams.lights[i].position[2]);
        }
    }

    /**
     * @description 初始化场景效果合成器
     * @author LL
     * @date 2021/07/26
     * @private
     * @param {ThingOriginParams} sceneParams
     */
    private initEffect(sceneParams: ThingOriginParams) {
        this.effectComposer = new EffectComposer(this.renderer);
        this.effectComposer.setSize(this.container.clientWidth, this.container.clientHeight);

        var renderPass = new RenderPass(this, this.camera.camera);
        this.effectComposer.addPass(renderPass);

        this.outlinePass = new OutlinePass(new Vector2(this.container.clientWidth, this.container.clientHeight), this, this.camera.camera);

        this.outlinePass.edgeStrength = sceneParams.effectComposer.outlinePass.edgeStrength; //粗
        this.outlinePass.edgeGlow = sceneParams.effectComposer.outlinePass.edgeGlow; //发光
        this.outlinePass.edgeThickness = sceneParams.effectComposer.outlinePass.edgeThickness; //光晕粗
        this.outlinePass.pulsePeriod = sceneParams.effectComposer.outlinePass.pulsePeriod; //闪烁
        this.outlinePass.usePatternTexture = sceneParams.effectComposer.outlinePass.usePatternTexture; //true
        this.outlinePass.visibleEdgeColor.set(sceneParams.effectComposer.outlinePass.visibleEdgeColor);
        this.outlinePass.hiddenEdgeColor.set(sceneParams.effectComposer.outlinePass.hiddenEdgeColor);

        this.effectComposer.addPass(this.outlinePass);
    }

    /**
     * @description 渲染控制器
     * @author LL
     * @date 2021/07/26
     * @private
     * @param {ThingOriginParams} sceneParams
     */
    private initControl(sceneParams: ThingOriginParams) {
        this.controls = new TControl(this);

        // 处理各种控制器
        if (sceneParams.helper.axes.active) {
            this.helper.initAxes(sceneParams.helper.axes.length);
        }
        if (sceneParams.helper.grid.active) {
            this.helper.initGrid(sceneParams.helper.grid.size, sceneParams.helper.grid.divisions);
        }
        if (sceneParams.controls.orbit.active) {
            this.controls.initOrbit();
        }
        if (sceneParams.controls.raycaster.active) {
            this.controls.initRaycaster(sceneParams.controls.raycaster.events);
        }
        if (sceneParams.controls.transform.active) {
            this.controls.initTransform();
        }
    }

    /**
     * @description 加载渲染模型
     * @author LL
     * @date 2021/07/26
     * @private
     * @param {ThingOriginParams} sceneParams
     */
    private loadModel(sceneParams: ThingOriginParams) {
        console.log(sceneParams.models);

        for (let i = 0; i < sceneParams.models.length; i++) {
            let item = sceneParams.models[i];
            if (item["objInfo"].objType == "modelFile") {
                ThingOrigin.model.initFileModel(item["objInfo"].fileType, sceneParams.fileRoot + item["objInfo"].folder + item["objInfo"].fileName).then((model) => {
                    this.add(model);
                });
            } else if (item["objInfo"].objType == "sphere") {
                let sphere = ThingOrigin.model.initSphere(item.name, { radius: item["objInfo"].radius });
                this.add(sphere);
            }
        }
    }

    /**
     * @description 加载随行框
     * @author LL
     * @date 2021/08/31
     * @private
     * @param {ThingOriginParams} sceneParams
     */
    private loadCSS2D(sceneParams: ThingOriginParams) {
        if (!sceneParams.css2d) return;
        let timer = setInterval(() => {
            let can = true;
            for (let i = 0; i < sceneParams.css2d.length; i++) {
                if (!this.getObjectByProperty("name", sceneParams.css2d[i].name)) {
                    can = false;
                }
            }
            if (can) {
                for (let i = 0; i < sceneParams.css2d.length; i++) {
                    let item = sceneParams.css2d[i];
                    this.addCSS2D("name", item.name, document.getElementById(item.domId));
                }
                clearInterval(timer);
            }
        }, 500);

        // let a = document.getElementById("css2d");
        // console.log(sceneParams.css2d);

        // this.model.addCSS2D("name", sceneParams.css2d[0].name, document.getElementById("css2d2"));
        // this.model.addCSS2D("name", sceneParams.css2d[1].name, document.getElementById("css2d"));
    }

    /**
     * @description 获取模型参数信息
     * @author LL
     * @date 2021/08/19
     * @param {string} property
     * @param {string} value
     * @returns {*}  {object}
     */
    public getObjectInfo(property: string, value: string): object {
        let obj = this.getObjectByProperty(property, value);
        let info = new Object();
        if (!obj) {
            console.warn("获取信息失败，物体不存在");
            return;
        }
        info["name"] = obj.name;
        info["position"] = obj.position;
        info["rotation"] = obj.rotation;
        info["scale"] = obj.scale;
        info["type"] = obj.type;
        info["uuid"] = obj.uuid;
        info["objInfo"] = {
            ownCSS2D: this.ifOwnCSS2D(obj),
        };

        return info;
    }

    /**
     * @description 获取模型的子模型集合
     * @author LL
     * @static
     * @param {string} sceneName
     * @param {string} uuid
     * @return {*}  {Object3D[]}
     */
    public getChildrenInfo(property: string, value: string): Object3D[] {
        let obj = this.getObjectByProperty(property, value);

        if (!obj) {
            console.warn("获取子模型失败，物体不存在");
            return;
        }

        let info = [];
        obj.traverse((child) => {
            let infoData = {
                name: child.name,
                uuid: child.uuid,
                type: child.type,
                position: child.position,
                rotation: child.rotation,
                scale: child.scale,
                ownCSS2D: this.ifOwnCSS2D(child),
            };
            info.push(infoData);
        });

        info.splice(0, 1);
        return info;
    }

    /**
     * @description 判断模型是否有2D元素
     * @author LL
     * @param {Object3D} obj
     * @return {*}  {boolean}
     */
    public ifOwnCSS2D(obj: Object3D): boolean {
        for (let i = 0; i < obj.children.length; i++) {
            if (obj.children[i] instanceof CSS2DObject) {
                return true;
            }
        }
        return false;
    }

    /**
     * @description 克隆模型
     * @author LL
     * @param {string} sceneName
     * @param {string} uuid
     * @param {number[]} position
     * @return {*}  {Group}
     */
    public cloneObject(fromSceneName: string, uuid: string, position: number[]): Group {
        let target = ThingOrigin.getScene(fromSceneName).getObjectByProperty("uuid", uuid);
        if (!target) {
            console.warn("克隆失败失败，物体不存在");
            return;
        }

        let group = new Group();
        let cloneObj = target.clone();
        target.parent.matrixWorld.decompose(group.position, group.quaternion, group.scale);
        group.updateMatrixWorld(true);
        target.matrixWorld.decompose(cloneObj.position, cloneObj.quaternion, cloneObj.scale);
        cloneObj.updateMatrixWorld(true);
        cloneObj.position.set(position[0], position[1], position[2]);
        group.attach(cloneObj);

        return group;
    }

    /**
     * @description 给模型添加呼吸效果
     * @author LL
     * @param {string} uuid
     */
    public initBreath(uuid: string) {
        var breathObj = this.getObjectByProperty("uuid", uuid);
        if (!breathObj) {
            console.warn("呼吸效果添加失败，物体不存在");
            return;
        }
        this.outlinePass.selectedObjects.push(breathObj);
    }

    /**
     * @description 取消呼吸效果
     * @author LL
     */
    public disposeBreath() {
        this.outlinePass.selectedObjects = [];
    }

    /**
     * @description 删除模型
     * @author gj
     * @param {string} uuid
     */
    public removeModel(uuid: string): void {
        let obj = this.getObjectByProperty("uuid", uuid);
        if (!obj) {
            console.warn("删除模型失败，物体不存在");
            return;
        }

        obj.traverse((child) => {
            if (obj.uuid != child.uuid) {
                if (child instanceof CSS2DObject) {
                    this.removeCSS2D(child.uuid);
                }
            }
            //删除模型缓冲区存储顶点数据
            if (child["material"]) {
                //todo  将material 等材质单独成类管理
                if (Array.isArray(child["material"])) {
                    for (let i = 0; i < child["material"].length; i++) {
                        child["material"][i].dispose();
                    }
                } else {
                    child["material"].dispose();
                }
            }

            if (child["geometry"]) child["geometry"].dispose();
        });
        obj.parent.remove(obj);
        this.helper.removeBox();
    }

    /**
     * @description 给模型添加2d元素
     * @author gj
     * @date 2021/08/30
     * @param {string} property 模型属性
     * @param {string} value 属性值
     * @param {HTMLElement} html dom元素
     * @returns {*}  {string}
     */
    public addCSS2D(property: string, value: string, html: HTMLElement): string {
        let obj = this.getObjectByProperty(property, value);
        if (!obj) {
            console.warn("标注添加失败，物体不存在");
            return;
        }

        let CSSLabel = new CSS2DObject(html);
        let sphere = ThingOrigin.tool.getObjectSphere(obj);
        CSSLabel.position.set(sphere.center.x, sphere.center.y + sphere.radius * 1.1, sphere.center.z);
        CSSLabel.element.id = CSSLabel.uuid;
        CSSLabel.userData.modelUUID = value;
        obj.attach(CSSLabel);
        return CSSLabel.uuid;
    }

    /**
     * @description 删除2d元素
     * @author gj
     * @param {string} uuid 模型的uuid
     */
    public removeCSS2D(uuid: string): void {
        let mySelfHtml = document.getElementById(uuid);
        if (mySelfHtml) mySelfHtml.parentElement.removeChild(mySelfHtml);

        this.removeModel(uuid);
    }

    /**
     * @description 控制模型显示隐藏
     * @author LL
     * @date 2021/08/16
     * @param {string} name 模型名称
     * @param {boolean} visible 是否可见
     */
    public setVisible(name: string, visible: boolean) {
        let model = this.getObjectByProperty("name", name);
        if (!model) {
            console.warn("物体控制显示隐藏失败，物体不存在");
            return;
        }
        model.visible = visible;
    }

    /**
     * @description 间补旋转动画(旋转角度)
     * @author LL
     * @param {string} property 模型属性名
     * @param {string} value 模型属性值
     * @param {string} axis 方向 可传入字符串 'x'/'y'/'z'
     * @param {number} from 从哪个角度开始
     * @param {number} to 到哪个角度停止
     * @param {number} time 完成时间（毫秒）
     */
    public tweenRotate(property: string, value: string, axis: string, from: number, to: number, time: number) {
        let obj = this.getObjectByProperty(property, value);
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
        let obj = this.getObjectByProperty(property, value);
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
        let obj = this.getObjectByProperty(property, value);
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
        var obj = this.getObjectByProperty(property, value);

        if (!obj) {
            console.warn("爆炸图展示失败，物体不存在");
            return;
        }

        var a = this.getChildrenInfo(property, value);
        for (var i = 0; i < a.length; i++) {
            this.tweenMove("uuid", a[i].uuid, "x", a[i].position.x, a[i].position.x * ratio, time);
            this.tweenMove("uuid", a[i].uuid, "y", a[i].position.y, a[i].position.y * ratio, time);
            this.tweenMove("uuid", a[i].uuid, "z", a[i].position.z, a[i].position.z * ratio, time);
        }
    }
}
