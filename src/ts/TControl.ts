import { Clock, Matrix4, Object3D, Raycaster, Vector2, Vector3 } from "three";
import { DragControls } from "three/examples/jsm/controls/DragControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import {
  TransformControls,
  TransformControlsMode,
} from "three/examples/jsm/controls/TransformControls";

import { ThingOrigin } from "../ThingOrigin";

export class TControl {
  TO: ThingOrigin;
  orbit: OrbitControls;
  drag: DragControls;
  pointerLock: PointerLockControls;
  raycaster: Raycaster;
  transform: TransformControls;
  transformCallback: any = (e) => {
    if (this.orbit) {
      // 当设置为false时，控制器将不会响应用户的操作。默认值为true。
      this.orbit.enabled = !e.value;
    }
  };

  unResponseType = [
    "BoxHelper",
    "GridHelper",
    "AxesHelper",
    "TransformControlsPlane",
    "Line",
  ];
  unResponseName = ["sky", "X", "Y", "Z", "E", "XY", "YZ", "XZ", "XYZY"];

  constructor(TO: ThingOrigin) {
    this.TO = TO;
    this.speed = TO.sceneData.controls.pointerLock.speed; //控制器移动速度
  }

  private dragStartWorldPosition = new Vector3();
  private dragStartParentMatrix = new Matrix4();

  /**
   * @description 鼠标挪动控制器
   * @author LL
   * @param {Object3D} 可被拖动的物体
   */
  public initDrag() {
    // 创建过滤后的可拖动对象列表
    const draggableObjects = this.TO.scene.children.filter((obj) => {
      return (
        this.unResponseType.indexOf(obj.type) == -1 &&
        this.unResponseName.indexOf(obj.name) == -1
      );
    });

    this.drag = new DragControls(
      draggableObjects,
      this.TO.camera.camera,
      this.TO.container
    );

    this.drag.addEventListener("dragstart", this.dragstartListener);
    this.drag.addEventListener("drag", this.dragListener);
    this.drag.addEventListener("dragend", this.dragendListener);
  }

  /**
   * @description 更新dragCOntrol可拖拽模型范围
   * @author LL
   * @date 2025/03/21
   * @param {string[]} [filterTypes=[]]
   * @memberof TControl
   */
  public updateDragObjects(filterTypes: string[] = []) {
    // 创建过滤后的可拖动对象列表
    const draggableObjects = this.TO.scene.children.filter((obj) => {
      return (
        [this.unResponseType, ...filterTypes].indexOf(obj.type) == -1 &&
        this.unResponseName.indexOf(obj.name) == -1
      );
    });

    this.drag.setObjects(draggableObjects);
  }

  /**
   * @description 拖拽开始事件监听
   * @author LL
   * @date 2025/03/21
   * @private
   * @param {*} event
   * @memberof TControl
   */
  private dragstartListener = (event) => {
    const movedObject = event.object;

    // 记录初始状态
    movedObject.getWorldPosition(this.dragStartWorldPosition);
    if (movedObject.userData.parent) {
      this.dragStartParentMatrix.copy(
        this.TO.scene.getObjectByName(movedObject.userData.parent).matrixWorld
      );
    }

    if (
      this.unResponseType.indexOf(event.object.type) != -1 ||
      this.unResponseName.indexOf(event.object.name) != -1
    ) {
      return;
    }

    this.orbit.enabled = false;
  };

  public delta;
  /**
   * @description 拖拽进行中事件监听
   * @author LL
   * @date 2025/03/21
   * @private
   * @param {*} event
   * @memberof TControl
   */
  private dragListener = (event) => {
    const movedObject = event.object;
    const newWorldPosition = new Vector3();
    movedObject.getWorldPosition(newWorldPosition);

    // 计算世界坐标系下的位移
    this.delta = newWorldPosition.sub(this.dragStartWorldPosition);
  };

  /**
   * @description 拖拽结束事件监听
   * @author LL
   * @date 2025/03/21
   * @private
   * @param {*} event
   * @memberof TControl
   */
  private dragendListener = (event) => {
    this.orbit.enabled = true;

    const movedObject = event.object;

    let parent = this.TO.scene.getObjectByName(movedObject.userData.parent);

    if (movedObject.userData.parent) {
      parent.position.add(this.delta);
      movedObject.position.sub(this.delta);
    }
  };

  /**
   * @description 销毁drag控制器
   * @author LL
   * @date 2025/03/21
   * @memberof TControl
   */
  public disposeDrag() {
    if (this.drag) {
      this.drag.removeEventListener("dragstart", this.dragstartListener);
      this.drag.removeEventListener("dragend", this.dragendListener);
      this.drag.deactivate();
      this.drag.dispose();
      this.drag = null;
    }
  }

  /**
   * @description 创建变换控制器
   * @author LL
   */
  public initTransform() {
    this.transform = new TransformControls(
      this.TO.camera.camera,
      this.TO.container
    );
    this.transform.name = "transformControls";
    this.transform.addEventListener("dragging-changed", this.transformCallback);
    this.TO.scene.add(this.transform);
    //@ts-ignore
    // this.TO.scene.add(this.transform.getHelper());
  }

  /**
   * @description 设置变换器模式
   * @author LL
   * @param {string} name 模型名称
   * @param {string} mode 模式， translate / scale / rotate / ''
   * @return {*}
   */
  public setTransformMode(name: string, mode: TransformControlsMode) {
    let obj = this.TO.scene.getObjectByProperty("name", name);

    if (!obj) {
      console.warn("变换器设置失败，物体不存在");
      return;
    }

    this.transform.attach(obj);
    this.transform.setMode(mode);
  }

  /**
   * @description 清空变换器
   * @author LL
   * @date 2024/07/22
   * @memberof TControl
   */
  public clearTransform() {
    if (this.transform) {
      this.transform.detach();
    } else {
      console.log("未开启变换器");
    }
  }

  /**
   * @description 注销控制器
   * @author LL
   */
  public disposeTransform() {
    if (this.transform) {
      this.TO.scene.remove(this.transform);
      this.transform.detach();
      this.transform.dispose();
      this.transform = null;
    }
  }

  /**
   * @description 相机轨道控制器
   * @author LL
   */
  public initOrbit(params: orbitParams) {
    this.orbit = new OrbitControls(this.TO.camera.camera, this.TO.container);

    this.orbit.minDistance = params.minDistance;
    this.orbit.maxDistance = params.maxDistance;

    if (params.autoRotate) {
      this.orbit.autoRotate = true;
      this.orbit.autoRotateSpeed = params.autoRotateSpeed;
    }
    if (params.enableDamping) {
      this.orbit.enableDamping = true;
      this.orbit.dampingFactor = params.dampingFactor;
    }
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
        let boundingSpace = this.TO.container.getBoundingClientRect();

        // 通过鼠标点击位置,计算出 raycaster 所需点的位置,以屏幕为中心点,范围 -1 到 1
        mouse.x =
          ((event.clientX - boundingSpace.left) / boundingSpace.width) * 2 - 1;
        mouse.y =
          -((event.clientY - boundingSpace.top) / boundingSpace.height) * 2 + 1;

        this.raycaster.setFromCamera(mouse, this.TO.camera.camera);

        let intersects = this.raycaster.intersectObject(this.TO.scene, true);

        var vector = new Vector3(); //三维坐标对象
        vector.set(mouse.x, mouse.y, 0.5);
        vector.unproject(this.TO.camera.camera);

        // if (intersects.length > 0) {
        //   var selected = intersects[0]; //取第一个物体
        //   console.log("x坐标:" + selected.point.x);
        //   console.log("y坐标:" + selected.point.y);
        //   console.log("z坐标:" + selected.point.z);
        // }
        console.log("鼠标选中物体", intersects);

        //@ts-ignore
        this.TO.eDispatcher.dispatchEvent({
          type: "CLICK",
          mouse: event.button == 0 ? "left" : "right",
          event: intersects,
          position: vector,
        });
      };

      this.TO.container.addEventListener("pointerdown", this.raycasterClick);
    }

    if (params.mousemove) {
      this.raycasterMousemove = (event) => {
        let mouse = new Vector2();
        let boundingSpace = this.TO.container.getBoundingClientRect();

        // 通过鼠标点击位置,计算出 raycaster 所需点的位置,以屏幕为中心点,范围 -1 到 1
        mouse.x =
          ((event.clientX - boundingSpace.left) / boundingSpace.width) * 2 - 1;
        mouse.y =
          -((event.clientY - boundingSpace.top) / boundingSpace.height) * 2 + 1;

        this.raycaster.setFromCamera(mouse, this.TO.camera.camera);

        let intersects = this.raycaster.intersectObject(this.TO.scene, true);

        //@ts-ignore
        this.TO.eDispatcher.dispatchEvent({
          type: "MOUSEOVER",
          event: intersects,
        });
      };

      this.TO.container.addEventListener("mousemove", this.raycasterMousemove);
    }
  }

  /**
   * @description 去掉鼠标射线
   * @author LL
   */
  public disposeRaycaster() {
    if (this.raycaster) {
      this.raycaster = null;
      this.TO.container.removeEventListener("pointerdown", this.raycasterClick);
      this.TO.container.removeEventListener(
        "mousemove",
        this.raycasterMousemove
      );
    }
  }

  public measuring: boolean = false;
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
    this.pointerLock = new PointerLockControls(
      this.TO.camera.camera,
      this.TO.container
    );

    // 将控制器添加至场景
    this.TO.scene.add(this.pointerLock.getObject());

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

    //this.TO.container添加监听事件不生效，改为document
    document.addEventListener("keydown", this.pointerKeyDownCallback, false);
    document.addEventListener("keyup", this.pointerKeyUpCallback, false);

    this.TO.container.requestPointerLock();
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

      if (this.moveForward || this.moveBackward)
        this.velocity.z -= this.direction.z * this.speed * delta;
      if (this.moveLeft || this.moveRight)
        this.velocity.x -= this.direction.x * this.speed * delta;

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
