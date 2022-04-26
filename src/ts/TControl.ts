import { Clock, Object3D, Raycaster, Vector2, Vector3 } from "three";
import { DragControls } from "three/examples/jsm/controls/DragControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { TScene } from "./TScene/TScene";

export class TControl {
    tScene: TScene;
    orbit: OrbitControls;
    drag: DragControls;
    pointerLock: PointerLockControls;
    raycaster: Raycaster;
    transform: TransformControls;

    constructor(tScene: TScene) {
        this.tScene = tScene;
        console.log(tScene.sceneParam);

        this.speed = tScene.sceneParam.controls.pointerLock.speed; //控制器移动速度
    }

    /**
     * @description 鼠标挪动控制器
     * @author LL
     * @param {Object3D} 可被拖动的物体
     */
    public initDragControls(object: Object3D) {
        this.drag = new DragControls([object], this.tScene.camera.camera, this.tScene.container);
        // ThingOrigin.container.addEventListener("dragstart", function (event) {});
    }

    public disposeDrag() {
        if (this.drag) {
            this.drag.deactivate();
            this.drag.dispose();
            this.drag = null;
        }
    }

    transformCallback;
    /**
     * @description 创建变换控制器
     * @author LL
     */
    public initTransform() {
        this.transform = new TransformControls(this.tScene.camera.camera, this.tScene.container);
        this.transform.name = "transformControls";
        this.transformCallback = (e) => {
            if (this.orbit) {
                // 当设置为false时，控制器将不会响应用户的操作。默认值为true。
                this.orbit.enabled = !e.value;
            }
        };
        this.transform.addEventListener("dragging-changed", this.transformCallback);
        this.tScene.add(this.transform);
    }

    /**
     * @description 设置变换器模式
     * @author LL
     * @param {string} uuid
     * @param {string} mode
     * @return {*}
     */
    public setTransformMode(uuid: string, mode: string) {
        let obj = this.tScene.getObjectByProperty("uuid", uuid);

        if (!obj) {
            console.warn("变换器设置失败，物体不存在");
            return;
        }
        if (!this.transform) {
            this.initTransform();
        }

        this.transform.attach(obj);
        this.transform.setMode(mode);
    }

    /**
     * @description 注销控制器
     * @author LL
     */
    public disposeTransform() {
        if (this.transform) {
            this.tScene.remove(this.transform);
            this.transform.dispose();
            this.transform = null;
        }
    }

    /**
     * @description 相机轨道控制器
     * @author LL
     */
    public initOrbit() {
        this.orbit = new OrbitControls(this.tScene.camera.camera, this.tScene.container);
    }

    public disposeOrbit() {
        if (this.orbit) {
            this.orbit.dispose();
            this.orbit = null;
        }
    }

    raycasterClick;
    raycasterMousemove;
    /**
     * @description 光线投射
     * @author LL
     */
    public initRaycaster(params: raycasterEventParams) {
        this.raycaster = new Raycaster();

        if (params.click) {
            this.raycasterClick = (event) => {
                let mouse = new Vector2();
                let boundingSpace = this.tScene.container.getBoundingClientRect();

                // 通过鼠标点击位置,计算出 raycaster 所需点的位置,以屏幕为中心点,范围 -1 到 1
                mouse.x = ((event.clientX - boundingSpace.left) / boundingSpace.width) * 2 - 1;
                mouse.y = -((event.clientY - boundingSpace.top) / boundingSpace.height) * 2 + 1;

                this.raycaster.setFromCamera(mouse, this.tScene.camera.camera);

                let intersects = this.raycaster.intersectObject(this.tScene, true);

                var vector = new Vector3(); //三维坐标对象
                vector.set(mouse.x, mouse.y, 0.5);
                vector.unproject(this.tScene.camera.camera);

                if (intersects.length > 0) {
                    var selected = intersects[0]; //取第一个物体
                    console.log("x坐标:" + selected.point.x);
                    console.log("y坐标:" + selected.point.y);
                    console.log("z坐标:" + selected.point.z);
                }
                console.log("鼠标选中物体", intersects);

                this.tScene.eDispatcher.dispatchEvent({ type: "CLICK", event: intersects, position: vector });
            };

            this.tScene.container.addEventListener("pointerdown", this.raycasterClick);
        }
        if (params.mousemove) {
            this.raycasterMousemove = (event) => {
                let mouse = new Vector2();
                let boundingSpace = this.tScene.container.getBoundingClientRect();

                // 通过鼠标点击位置,计算出 raycaster 所需点的位置,以屏幕为中心点,范围 -1 到 1
                mouse.x = ((event.clientX - boundingSpace.left) / boundingSpace.width) * 2 - 1;
                mouse.y = -((event.clientY - boundingSpace.top) / boundingSpace.height) * 2 + 1;

                this.raycaster.setFromCamera(mouse, this.tScene.camera.camera);

                let intersects = this.raycaster.intersectObject(this.tScene, true);
                this.tScene.eDispatcher.dispatchEvent({ type: "MOUSEOVER", event: intersects });
            };

            this.tScene.container.addEventListener("mousemove", this.raycasterMousemove);
        }
    }

    /**
     * @description 去掉鼠标射线
     * @author LL
     */
    public disposeRaycaster() {
        if (this.raycaster) {
            this.raycaster = null;
            this.tScene.container.removeEventListener("pointerdown", this.raycasterClick);
            this.tScene.container.removeEventListener("mousemove", this.raycasterMousemove);
        }
    }

    public measureing;
    public measureLength() {}

    moveForward: boolean = false;
    moveBackward: boolean = false;
    moveLeft: boolean = false;
    moveRight: boolean = false;

    moveUp: boolean = false;
    moveDown: boolean = false;

    clock: Clock = new Clock();
    speed: number;

    velocity: Vector3 = new Vector3();
    direction: Vector3 = new Vector3();
    rotation: Vector3 = new Vector3();

    pointerKeyDownCallback;
    pointerKeyUpCallback;

    /**
     * @description 漫游控制器
     * @author LL
     */
    public initPointerLock() {
        // 初始化控制器
        this.pointerLock = new PointerLockControls(this.tScene.camera.camera, this.tScene.container);

        // 将控制器添加至场景
        this.tScene.add(this.pointerLock.getObject());

        // 绑定鼠标事件
        this.pointerKeyDownCallback = (event) => {
            switch (event.code) {
                case "ArrowUp":
                    this.moveUp = true;
                    break;
                case "KeyW":
                    this.moveForward = true;
                    break;

                case "ArrowLeft":
                case "KeyA":
                    this.moveLeft = true;
                    break;

                case "ArrowDown":
                    this.moveDown = true;
                    break;
                case "KeyS":
                    this.moveBackward = true;
                    break;

                case "ArrowRight":
                case "KeyD":
                    this.moveRight = true;
                    break;
            }
        };
        this.pointerKeyUpCallback = (event) => {
            switch (event.code) {
                case "ArrowUp":
                    this.moveUp = false;
                    break;
                case "KeyW":
                    this.moveForward = false;
                    break;

                case "ArrowLeft":
                case "KeyA":
                    this.moveLeft = false;
                    break;

                case "ArrowDown":
                    this.moveDown = false;
                    break;
                case "KeyS":
                    this.moveBackward = false;
                    break;

                case "ArrowRight":
                case "KeyD":
                    this.moveRight = false;
                    break;
            }
        };

        this.tScene.container.addEventListener("keydown", this.pointerKeyDownCallback, false);
        this.tScene.container.addEventListener("keyup", this.pointerKeyUpCallback, false);

        this.tScene.container.requestPointerLock();
    }

    public updatePointerLock() {
        if (this.pointerLock && this.pointerLock.isLocked) {
            //获取刷新时间
            var delta = this.clock.getDelta();

            //velocity每次的速度，为了保证有过渡
            this.velocity.x -= this.velocity.x * 10.0 * delta;
            // this.velocity.y -= this.velocity.y * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;

            //获取当前按键的方向并获取朝哪个方向移动
            this.direction.x = Number(this.moveLeft) - Number(this.moveRight);
            // this.direction.y = Number(this.moveUp) - Number(this.moveDown);
            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);

            //将法向量的值归一化
            this.direction.normalize();

            if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * this.speed * delta;
            if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * this.speed * delta;

            //根据速度值移动控制器w
            this.pointerLock.getObject().translateX(this.velocity.x * delta);
            // this.pointerLock.getObject().translateX(this.velocity.y * delta);
            this.pointerLock.getObject().translateZ(this.velocity.z * delta);
        }
    }

    public disposePointerLock() {
        if (this.pointerLock) {
            this.pointerLock.disconnect();
            this.pointerLock = null;
        }
    }
}
