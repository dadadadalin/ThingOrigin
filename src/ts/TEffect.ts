import { DoubleSide, Mesh, MeshStandardMaterial, Object3D, Plane, Vector2, Vector3 } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
import { ThingOrigin } from "../ThingOrigin";
import { TScene } from "./TScene/TScene";

export class TEffect {
    public tScene: TScene;
    public sceneClipPlane: Plane;
    public localClipPlane: Plane;

    /** 效果合成器 */
    public effectComposer: EffectComposer;
    public outlinePass: OutlinePass;
    private effectFXAA: ShaderPass;

    constructor(tScene: TScene) {
        this.tScene = tScene;
    }

    /**
     * @description 创建场景的剖切
     * @author LL
     * @date 25/04/2022
     * @param {string} axis 剖切轴
     * @param {number} constant 初始剖切位置
     */
    public initSceneClip(axis: string, constant: number) {
        console.log(axis);

        let vec3: Vector3 = ThingOrigin.tool.getAxisVector3(axis);

        this.sceneClipPlane = new Plane(vec3, constant);
        // this.tScene.renderer.clippingPlanes = Object.freeze([]); // GUI sets it to globalPlanes
        this.tScene.renderer.clippingPlanes = [this.sceneClipPlane];
        // this.tScene.renderer.localClippingEnabled = true;
    }

    /**
     * @description 删除场景剖切面
     * @author LL
     * @date 25/04/2022
     */
    public deleteSceneClip() {
        this.sceneClipPlane = null;
        let Empty = Object.freeze([]);
        //@ts-ignore
        this.tScene.renderer.clippingPlanes = Empty;
    }

    /**
     * @description 更新场景剖切面的位置
     * @author LL
     * @date 25/04/2022
     * @param {number} constant
     */
    public updateSceneClip(constant: number) {
        this.sceneClipPlane.constant = constant;
    }

    /**
     * @description 模型剖切
     * @author LL
     * @date 25/04/2022
     * @param {Object3D} model 被剖切的模型
     * @param {string} axis 剖切轴
     * @param {number} constant 剖切面位置
     */
    public initModelClip(model: Object3D, axis: string, constant: number) {
        let vec3: Vector3 = ThingOrigin.tool.getAxisVector3(axis);

        this.localClipPlane = new Plane(vec3, constant);
        this.tScene.renderer.localClippingEnabled = true;

        model.traverse((child) => {
            if (child instanceof Mesh) {
                console.log(child);

                (child as Mesh).material = new MeshStandardMaterial({
                    color: child.material.color,
                    clippingPlanes: [this.localClipPlane],
                    clipShadows: true,
                    shadowSide: DoubleSide,
                });
                (child as Mesh).castShadow = true;
                (child as Mesh).renderOrder = 6;
            }
            //@ts-ignore
            child.clippingPlanes = [this.localClipPlane];
            //@ts-ignore
            child.clipShadows = true;
        });
    }

    /**
     * @description 更新模型剖切面位置
     * @author LL
     * @date 25/04/2022
     * @param {number} constant
     */
    public updateModelClip(constant: number) {
        this.localClipPlane.constant = constant;
    }

    /**
     * @description 删除场景剖切面
     * @author LL
     * @date 25/04/2022
     */
    public deleteModelClip() {
        this.sceneClipPlane = null;
        let Empty = Object.freeze([]);
        //@ts-ignore
        this.tScene.renderer.clippingPlanes = Empty;
    }

    /**
     * @description 初始化场景效果合成器
     * @author LL
     * @date 2021/07/26
     * @private
     * @param {ThingOriginParams} sceneParams 场景参数
     */
    public initEffect(sceneParams: ThingOriginParams) {
        this.effectComposer = new EffectComposer(this.tScene.renderer);
        this.effectComposer.setSize(this.tScene.container.clientWidth, this.tScene.container.clientHeight);

        var renderPass = new RenderPass(this.tScene, this.tScene.camera.camera);
        this.effectComposer.addPass(renderPass);

        this.outlinePass = new OutlinePass(new Vector2(this.tScene.container.clientWidth, this.tScene.container.clientHeight), this.tScene, this.tScene.camera.camera);
        this.outlinePass.edgeStrength = sceneParams.effectComposer.outlinePass.edgeStrength; //粗
        this.outlinePass.edgeGlow = sceneParams.effectComposer.outlinePass.edgeGlow; //发光
        this.outlinePass.edgeThickness = sceneParams.effectComposer.outlinePass.edgeThickness; //光晕粗
        this.outlinePass.pulsePeriod = sceneParams.effectComposer.outlinePass.pulsePeriod; //闪烁
        this.outlinePass.usePatternTexture = sceneParams.effectComposer.outlinePass.usePatternTexture; //true
        this.outlinePass.visibleEdgeColor.set(sceneParams.effectComposer.outlinePass.visibleEdgeColor);
        this.outlinePass.hiddenEdgeColor.set(sceneParams.effectComposer.outlinePass.hiddenEdgeColor);
        this.effectComposer.addPass(this.outlinePass);

        this.effectFXAA = new ShaderPass(FXAAShader);
        this.effectFXAA.uniforms["resolution"].value.set(1 / this.tScene.container.clientWidth, 1 / this.tScene.container.clientHeight);
        this.effectFXAA.renderToScreen = true;
        this.effectComposer.addPass(this.effectFXAA);
    }

    /**
     * @description 给模型添加呼吸效果
     * @author LL
     * @param {string} uuid
     */
    public initBreath(uuid: string) {
        var breathObj = this.tScene.getObjectByProperty("uuid", uuid);
        console.log(breathObj);

        if (breathObj.parent.type != "Object3D") {
            var a = new Object3D();
            a.add();
        }
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
}
