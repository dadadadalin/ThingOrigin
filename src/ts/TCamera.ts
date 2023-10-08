import { OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import TWEEN from "tween.js/src/Tween.js";
import { ThingOrigin } from "./../ThingOrigin";
import { TScene } from "./TScene/TScene";

/** 自定义相机的基类，用于 */
export class TCamera {
    tScene: TScene;
    /** 当前相机的容器 */
    container: HTMLElement;

    PerspectiveCamera: PerspectiveCamera;
    OrthographicCamera: OrthographicCamera;
    type: string;

    /** 当前使用的相机 */
    private _camera: PerspectiveCamera | OrthographicCamera;

    public get camera(): PerspectiveCamera | OrthographicCamera {
        return this._camera;
    }

    /** 获取相机位置 */
    public get position(): Vector3 {
        return this._camera.position;
    }

    constructor(tScene: TScene, container: HTMLElement) {
        this.tScene = tScene;
        this.container = container;

        let aspect = this.container.clientWidth / this.container.clientHeight;
        //透视相机
        this.PerspectiveCamera = new PerspectiveCamera(45, aspect, 0.1, 10000);
        //正交相机
        let frustumSize = 1000;
        this.OrthographicCamera = new OrthographicCamera((frustumSize * aspect) / -2, (frustumSize * aspect) / 2, (frustumSize * aspect) / 2, (frustumSize * aspect) / -2, 0.1, 1000);

        this.setCamera("PerspectiveCamera");
    }

    /**
     * 设置渲染相机
     * @param num
     */
    public setCamera(type: string = "PerspectiveCamera") {
        this.type = type;
        switch (type) {
            case "PerspectiveCamera":
                this._camera = this.PerspectiveCamera;
                break;
            case "OrthographicCamera":
                this._camera = this.OrthographicCamera;
                break;
        }
    }

    /**
     * @description 锁定相机视角
     * @author LL
     * @date 2021/06/29
     * @param {string} direction 方向 'top'||'bottom'||'left'||'right'||'front'||'back'
     */
    public lockCamera(direction: string) {
        let box = ThingOrigin.tool.getObjectSphere(this.tScene);
        let ratio = 1.1;
        switch (direction) {
            case "top":
                this.camera.position.set(0, box.radius * ratio, 0);
                break;
            case "bottom":
                this.camera.position.set(0, -box.radius * ratio, 0);
                break;
            case "left":
                this.camera.position.set(-box.radius * ratio, 0, 0);
                break;
            case "right":
                this.camera.position.set(box.radius * ratio, 0, 0);
                break;
            case "front":
                this.camera.position.set(0, 0, box.radius * ratio);
                break;
            case "back":
                this.camera.position.set(0, 0, -box.radius * ratio);
                break;
        }
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * @description 相机观察某物体
     * @author LL
     * @param {string} uuid 模型uuid
     * @param {number} time 动画时长
     * @param {number} [scaleRadius=1] 以半径为单位，让相机距离多远观察
     */
    public lookAt(uuid: string, time: number, scaleRadius: number = 1) {
        let target = this.tScene.getObjectByProperty("uuid", uuid);
        if (!target) {
            console.warn("相机追踪失败，物体不存在");
            return;
        }
        let targetSphere = ThingOrigin.tool.getObjectSphere(target);

        let start = this.camera.position.clone();
        let direction = { x: this.camera.position.x < 0 ? -1 : 1, y: this.camera.position.y < 0 ? -1 : 1, z: this.camera.position.z < 0 ? -1 : 1 };
        let end = target.position
            .clone()
            .add(new Vector3(targetSphere.radius * scaleRadius * direction.x, targetSphere.radius * scaleRadius * direction.y, targetSphere.radius * scaleRadius * direction.z));

        new TWEEN.Tween(start)
            .to(end, time)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate(() => {
                this.camera.position.set(start.x, start.y, start.z);
                this.camera.lookAt(target.position);
            })
            .start();
    }

}
