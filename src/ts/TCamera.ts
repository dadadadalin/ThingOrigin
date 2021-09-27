import { OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import TWEEN from "tween.js/src/Tween.js";
import { ThingOrigin } from "./../ThingOrigin";
import { TScene } from "./TScene/TScene";

/** 自定义相机的基类，用于 */
export class TCamera {
    tScene: TScene;
    static PerspectiveCamera: number = 0;
    static OrthographicCamera: number = 1;

    type: string;

    /** 当前相机的容器 */
    container: HTMLElement;

    /** 当前使用的相机 */
    private _camera: PerspectiveCamera | OrthographicCamera;

    public get camera(): PerspectiveCamera | OrthographicCamera {
        return this._camera;
    }

    /** 获取相机位置 */
    public get position(): Vector3 {
        return this.camera.position;
    }

    constructor(tScene: TScene, container: HTMLElement) {
        this.tScene = tScene;
        this.container = container;

        this.setCamera();
    }

    /**
     * 设置渲染相机
     * @param num
     */
    public setCamera(num: number = TCamera.PerspectiveCamera) {
        switch (num) {
            case TCamera.PerspectiveCamera:
                //透视相机
                this._camera = new PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 10000);
                this.type = "PerspectiveCamera";
                break;
            case TCamera.OrthographicCamera:
                //正交相机
                this._camera = new OrthographicCamera(
                    this.container.clientLeft,
                    this.container.clientLeft + this.container.clientWidth,
                    this.container.clientTop,
                    this.container.clientTop + this.container.clientHeight,
                    0.1,
                    1000
                );
                this.type = "OrthographicCamera";
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
        switch (direction) {
            case "top":
                this.camera.position.set(0, box.radius * 1.1, 0);
                break;
            case "bottom":
                this.camera.position.set(0, -box.radius * 1.1, 0);
                break;
            case "left":
                this.camera.position.set(-box.radius * 1.1, 0, 0);
                break;
            case "right":
                this.camera.position.set(box.radius * 1.1, 0, 0);
                break;
            case "front":
                this.camera.position.set(0, 0, box.radius * 1.1);
                break;
            case "back":
                this.camera.position.set(0, 0, -box.radius * 1.1);
                break;
        }
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * @description 相机观察某物体
     * @author LL
     * @param {string} uuid
     * @param {number} time
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
