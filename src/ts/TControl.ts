/**
 * @module
 * @mergeModuleWith <project>
 */

import { Group, Matrix4, Object3D, Raycaster, Timer, Vector2, Vector3 } from 'three'
import { DragControls } from 'three/examples/jsm/controls/DragControls'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'

import { ThingOrigin } from '../ThingOrigin'
import { raycasterEventParams, orbitParams, xyz } from './scenePrams'
import { merge } from 'lodash-es'

/**
 * 控制器
 */
export class TControl {
    private TO: ThingOrigin

    /** 轨道控制器 */
    orbit: OrbitControls
    /** 拖拽控制器 */
    drag: DragControls
    /** 指针锁定控制器 */
    pointerLock: PointerLockControls
    /** 射线投射器 */
    raycaster: Raycaster
    /** 变换控制器 */
    transform: TransformControls
    /** 用于显示变换器的临时虚拟对象 */
    private transformDummy: Object3D
    //todo  check
    private transformCallback: any = (e) => {
        if (this.orbit) {
            // 当设置为false时，控制器将不会响应用户的操作。默认值为true。
            this.orbit.enabled = !e.value
        }
    }

    private unResponseType = ['BoxHelper', 'GridHelper', 'AxesHelper', 'TransformControlsPlane', 'Line']
    private unResponseName = ['sky', 'X', 'Y', 'Z', 'E', 'XY', 'YZ', 'XZ', 'XYZY', 'TO-ground']

    constructor(TO: ThingOrigin) {
        this.TO = TO
        this.speed = this.TO.sceneData.controls.pointerLock.speed //控制器移动速度
    }

    /** r185 Controls 须绑定 canvas，不能用外层 container（否则 setPointerCapture 报错） */
    private get controlDom(): HTMLElement {
        return this.TO.renderer.renderer.domElement
    }

    private dragStartWorldPosition = new Vector3()
    private dragStartParentMatrix = new Matrix4()

    /**
     * 鼠标挪动控制器
     * @author LL
     */
    public initDrag() {
        // 创建过滤后的可拖动对象列表
        const draggableObjects = this.TO.scene.children.filter((obj) => {
            return this.unResponseType.indexOf(obj.type) == -1 && this.unResponseName.indexOf(obj.name) == -1
        })

        this.drag = new DragControls(draggableObjects, this.TO.camera.camera, this.controlDom)

        this.drag.addEventListener('dragstart', this.dragstartListener)
        this.drag.addEventListener('drag', this.dragListener)
        this.drag.addEventListener('dragend', this.dragendListener)
    }

    /**
     * 更新dragControl可拖拽模型范围
     * @author LL
     * @since 2025/03/21
     * @param {string[]} [filterTypes=[]]
     */
    public updateDragObjects(filterTypes: string[] = []) {
        // 创建过滤后的可拖动对象列表
        const draggableObjects = this.TO.scene.children.filter((obj) => {
            return (
                [this.unResponseType, ...filterTypes].indexOf(obj.type) == -1 &&
                this.unResponseName.indexOf(obj.name) == -1
            )
        })

        this.drag.objects = draggableObjects
    }

    /**
     * 拖拽开始事件监听
     * @author LL
     * @since 2025/03/21
     * @private
     * @param {*} event
     */
    private dragstartListener = (event) => {
        const movedObject = event.object

        // 记录初始状态
        movedObject.getWorldPosition(this.dragStartWorldPosition)
        if (movedObject.userData.parent) {
            this.dragStartParentMatrix.copy(
                this.TO.scene.getObjectByName(movedObject.userData.parent).matrixWorld
            )
        }

        if (
            this.unResponseType.indexOf(event.object.type) != -1 ||
            this.unResponseName.indexOf(event.object.name) != -1
        ) {
            return
        }

        this.orbit.enabled = false
    }

    private delta
    /**
     * 拖拽进行中事件监听
     * @author LL
     * @since 2025/03/21
     * @private
     * @param {*} event
     */
    private dragListener = (event) => {
        const movedObject = event.object
        const newWorldPosition = new Vector3()
        movedObject.getWorldPosition(newWorldPosition)

        // 计算世界坐标系下的位移
        this.delta = newWorldPosition.sub(this.dragStartWorldPosition)
    }

    /**
     * 拖拽结束事件监听
     * @author LL
     * @since 2025/03/21
     * @private
     * @param {*} event
     */
    private dragendListener = (event) => {
        this.orbit.enabled = true

        const movedObject = event.object

        let parent = this.TO.scene.getObjectByName(movedObject.userData.parent)

        if (movedObject.userData.parent) {
            parent.position.add(this.delta)
            movedObject.position.sub(this.delta)
        }
    }

    /**
     * 销毁drag控制器
     * @author LL
     * @since 2025/03/21
     */
    public disposeDrag() {
        if (this.drag) {
            this.drag.removeEventListener('dragstart', this.dragstartListener)
            this.drag.removeEventListener('dragend', this.dragendListener)
            this.drag.disconnect()
            this.drag.dispose()
            this.drag = null
        }
    }

    /**
     * 创建变换控制器
     * @author LL
     */
    public initTransform() {
        this.transform = new TransformControls(this.TO.camera.camera, this.controlDom)
        this.transform.addEventListener('dragging-changed', this.transformCallback)
        // r169+ TransformControls 不再继承 Object3D，需将 helper 加入场景
        const transformHelper = this.transform.getHelper()
        transformHelper.name = 'transformControls'
        this.TO.scene.add(transformHelper)
    }

    /**
     * @description 设置变换器模式
     * @author LL
     * @param model 模型
     * @param mode 模式
     * @param follow 原点不在几何中心时，将 gizmo 放到包围盒中心并绕该中心变换
     */
    public setTransformMode(
        model: Object3D,
        mode: 'translate' | 'scale' | 'rotate',
        follow: boolean = false
    ) {
        if (!model) {
            console.warn('变换器设置失败，物体不存在')
            return
        }

        if (!this.transform) {
            this.initTransform()
        }

        this.stopTransformFollow()

        if (follow) {
            if (!this.transformDummy) {
                this.transformDummy = new Group()
                this.transformDummy.name = 'transformDummy'
                this.TO.scene.add(this.transformDummy)
            }

            this.transformDummy.position.copy(this.TO.tool.getModelSize(model).center)
            model.getWorldQuaternion(this.transformDummy.quaternion)
            this.transformDummy.scale.set(1, 1, 1)
            this.transformDummy.updateMatrixWorld(true)

            this.transformDummy.userData.followTarget = model
            this.transformDummy.userData.offsetMatrix = new Matrix4()
                .copy(this.transformDummy.matrixWorld)
                .invert()
                .multiply(model.matrixWorld)

            this.transform.attach(this.transformDummy)
            this.transform.addEventListener('objectChange', this.syncTransformFollow)
        } else {
            this.transform.attach(model)
        }

        this.transform.setMode(mode)
    }

    /** dummy 变换后写回真实模型 */
    private syncTransformFollow = () => {
        const dummy = this.transformDummy
        const model = dummy?.userData.followTarget as Object3D
        if (!model?.parent) return

        new Matrix4()
            .copy(model.parent.matrixWorld)
            .invert()
            .multiply(dummy.matrixWorld)
            .multiply(dummy.userData.offsetMatrix)
            .decompose(model.position, model.quaternion, model.scale)
    }

    private stopTransformFollow() {
        this.transform?.removeEventListener('objectChange', this.syncTransformFollow)
        if (this.transformDummy) {
            this.transformDummy.userData.followTarget = null
            this.transformDummy.userData.offsetMatrix = null
        }
    }

    /**
     * 清空变换器
     * @author LL
     * @since 2024/07/22
     */
    public clearTransform() {
        if (this.transform) {
            this.stopTransformFollow()
            this.transform.detach()
        } else {
            console.log('未开启变换器')
        }
    }

    /**
     * 注销变换器
     * @author LL
     */
    public disposeTransform() {
        this.stopTransformFollow()

        if (this.transform) {
            this.TO.scene.remove(this.transform.getHelper())
            this.transform.detach()
            this.transform.dispose()
            this.transform = null
        }

        // 清理虚拟对象
        if (this.transformDummy) {
            this.TO.scene.remove(this.transformDummy)
            this.transformDummy = null
        }
    }

    /**
     * 创建相机轨道控制器
     * @author LL
     */
    public initOrbit(orbitParams?: orbitParams) {
        let defaultParams = merge(this.TO.sceneData.controls.orbit, orbitParams || {})
        this.orbit = new OrbitControls(this.TO.camera.camera, this.controlDom)

        this.orbit.minDistance = defaultParams.minDistance
        this.orbit.maxDistance = defaultParams.maxDistance

        this.orbit.screenSpacePanning = false
        // 控制最大视角
        // this.orbit.maxPolarAngle = Math.PI / 2 - 0.01

        //自动旋转
        if (defaultParams.autoRotate) {
            this.orbit.autoRotate = true
            this.orbit.autoRotateSpeed = defaultParams.autoRotateSpeed
        }

        // 禁止滚轮缩放
        this.orbit.enableZoom = defaultParams.enableZoom ?? true

        //阻尼效果
        if (defaultParams.enableDamping) {
            this.orbit.enableDamping = true
            this.orbit.dampingFactor = defaultParams.dampingFactor
        }

        // 同步更新OrbitControls的target
        this.orbit.target.set(
            this.TO.sceneData.camera.lookAt.x,
            this.TO.sceneData.camera.lookAt.y,
            this.TO.sceneData.camera.lookAt.z
        )
        this.orbit.update() //更新
    }

    /**
     * @description 设置轨道控制器中心点
     * @author LL
     * @since 2026/01/04
     * @param center 中心点
     * @param [cameraOffset] 相机偏移
     */
    public setOrbitCenter = (center: Vector3 | xyz, cameraOffset?: Vector3 | xyz) => {
        this.orbit.target.set(center.x, center.y, center.z)

        if (cameraOffset) {
            this.TO.camera.camera.position.set(
                cameraOffset.x + center.x,
                cameraOffset.y + center.y,
                cameraOffset.z + center.z
            )
        }
        this.TO.camera.camera.lookAt(center.x, center.y, center.z)
        this.orbit.update()
    }

    /**
     * 设置变换器虚拟对象的位置（只显示变换器，不关联实际模型）
     * @author LL
     * @since 2026/01/04
     * @param position 变换器的位置（可选，默认在原点）
     * @param mode 变换模式（可选，默认 'translate'）
     */
    public showTransformDummy(
        position?: Vector3 | xyz,
        mode: 'translate' | 'scale' | 'rotate' = 'translate'
    ) {
        // 如果变换器不存在，先创建
        if (!this.transform) {
            this.initTransform()
        }

        this.stopTransformFollow()

        // 创建或获取临时虚拟对象（TransformControls 需要 attach 对象才能显示）
        if (!this.transformDummy) {
            this.transformDummy = new Group()
            this.transformDummy.name = 'transformDummy'
            this.transformDummy.visible = false
            this.TO.scene.add(this.transformDummy)
        }

        // 设置虚拟对象的位置
        if (position) {
            if (position instanceof Vector3) {
                this.transformDummy.position.copy(position)
            } else {
                this.transformDummy.position.set(position.x, position.y, position.z)
            }
        } else {
            this.transformDummy.position.set(0, 0, 0)
        }

        // 将变换器关联到虚拟对象（这样才会显示）
        this.transform.attach(this.transformDummy)

        // 设置模式
        this.transform.setMode(mode)
    }

    /**
     * 获取变换器虚拟对象的当前位置
     * @author LL
     * @since 2026/01/04
     * @returns {Vector3 | null} 虚拟对象的位置，如果不存在则返回 null
     */
    public getTransformDummyPosition(): Vector3 | null {
        if (!this.transformDummy) {
            return null
        }

        return this.transformDummy.position.clone()
    }

    /**
     * 销毁相机轨道控制器
     * @author LL
     */
    public disposeOrbit() {
        if (this.orbit) {
            this.orbit.dispose()
            this.orbit = null
        }
    }

    private raycasterClick
    private raycasterMousemove

    /**
     * 性能优化：射线检测节流时间间隔（毫秒）
     * @private
     */
    private raycastThrottleDelay: number = 100

    /**
     * 性能优化：节流函数
     * @private
     * @param func 要节流的函数
     * @param delay 延迟时间（毫秒）
     */
    private throttle(func: Function, delay: number) {
        let timeout: NodeJS.Timeout | null = null
        return (...args: any[]) => {
            if (!timeout) {
                timeout = setTimeout(() => {
                    func(...args)
                    timeout = null
                }, delay)
            }
        }
    }

    /**
     * 设置射线检测节流延迟
     * @author LL
     * @since 2025/10/14
     * @param delay 节流延迟时间（毫秒），默认100ms
     * @example
     * TO.controls.setRaycastThrottleDelay(50); // 设置为50ms
     */
    public setRaycastThrottleDelay(delay: number) {
        this.raycastThrottleDelay = delay
    }

    /**
     * 清理控制器资源
     * @author LL
     * @since 2024/12/19
     */
    public dispose(): void {
        // 清理轨道控制器
        if (this.orbit) {
            this.orbit.dispose()
        }

        // 清理拖拽控制器
        if (this.drag) {
            this.drag.removeEventListener('dragstart', this.dragstartListener)
            this.drag.removeEventListener('drag', this.dragListener)
            this.drag.removeEventListener('dragend', this.dragendListener)
            this.drag.disconnect()
            this.drag.dispose()
            this.drag = null
        }

        // 清理变换控制器
        if (this.transform) {
            this.stopTransformFollow()
            this.transform.removeEventListener('dragging-changed', this.transformCallback)
            this.TO.scene.remove(this.transform.getHelper())
            this.transform.detach()
            this.transform.dispose()
            this.transform = null
        }

        // 清理射线投射器
        if (this.raycaster) {
            this.raycaster = null
        }

        // 清理事件监听器
        if (this.raycasterClick) {
            this.TO.container.removeEventListener('pointerdown', this.raycasterClick)
            this.raycasterClick = null
        }

        if (this.raycasterMousemove) {
            this.TO.container.removeEventListener('mousemove', this.raycasterMousemove)
            this.raycasterMousemove = null
        }

        // 清理指针锁定控制器
        if (this.pointerLock) {
            this.pointerLock.disconnect()
            this.pointerLock = null
        }

        // 清理键盘事件监听器
        if (this.pointerKeyDownCallback) {
            document.removeEventListener('keydown', this.pointerKeyDownCallback)
            this.pointerKeyDownCallback = null
        }

        if (this.pointerKeyUpCallback) {
            document.removeEventListener('keyup', this.pointerKeyUpCallback)
            this.pointerKeyUpCallback = null
        }

        console.log('控制器资源已清理')
    }

    /**
     * 创建射线投射器
     * @author LL
     */
    public initRaycaster(params: raycasterEventParams) {
        this.raycaster = new Raycaster()

        // 性能优化：设置射线检测的远近范围，减少检测对象数量
        this.raycaster.near = 0.1
        this.raycaster.far = 1000

        if (params.click) {
            this.raycasterClick = (event) => {
                // 分屏模式下点击视口内交给分屏 OrbitControls，不做射线选中
                if (
                    this.TO.camera.arraySplitEnabled &&
                    this.TO.camera.hitSplitView(event.clientX, event.clientY)
                ) {
                    return
                }

                let mouse = new Vector2()
                let boundingSpace = this.TO.container.getBoundingClientRect()

                // 通过鼠标点击位置,计算出 raycaster 所需点的位置,以屏幕为中心点,范围 -1 到 1
                mouse.x = ((event.clientX - boundingSpace.left) / boundingSpace.width) * 2 - 1
                mouse.y = -((event.clientY - boundingSpace.top) / boundingSpace.height) * 2 + 1

                this.raycaster.setFromCamera(mouse, this.TO.camera.camera)

                let intersects = this.raycaster.intersectObject(this.TO.scene, true)

                var vector = new Vector3() //三维坐标对象
                vector.set(mouse.x, mouse.y, 0.5)
                vector.unproject(this.TO.camera.camera)

                // if (intersects.length > 0) {
                //   var selected = intersects[0]; //取第一个物体
                //   console.log("x坐标:" + selected.point.x);
                //   console.log("y坐标:" + selected.point.y);
                //   console.log("z坐标:" + selected.point.z);
                // }
                if (intersects.length > 0) {
                    console.log('鼠标选中物体', intersects[0].object, intersects)
                    if (intersects[0].object.userData.parent) {
                        console.log(this.TO.scene.getObjectByName(intersects[0].object.userData.parent))
                    }
                }

                //@ts-ignore
                this.TO.eDispatcher.dispatchEvent({
                    type: 'CLICK',
                    mouse: event.button == 0 ? 'left' : 'right',
                    event: intersects,
                    position: vector
                })
            }

            this.TO.container.addEventListener('pointerdown', this.raycasterClick)
        }

        if (params.mousemove) {
            // 性能优化：对mousemove事件进行节流处理，避免过度触发射线检测
            const throttledMousemove = this.throttle((event) => {
                let mouse = new Vector2()
                let boundingSpace = this.TO.container.getBoundingClientRect()

                // 通过鼠标点击位置,计算出 raycaster 所需点的位置,以屏幕为中心点,范围 -1 到 1
                mouse.x = ((event.clientX - boundingSpace.left) / boundingSpace.width) * 2 - 1
                mouse.y = -((event.clientY - boundingSpace.top) / boundingSpace.height) * 2 + 1

                this.raycaster.setFromCamera(mouse, this.TO.camera.camera)

                let intersects = this.raycaster.intersectObject(this.TO.scene, true)

                //@ts-ignore
                this.TO.eDispatcher.dispatchEvent({
                    type: 'MOUSEOVER',
                    event: intersects
                })
            }, this.raycastThrottleDelay)

            this.raycasterMousemove = throttledMousemove
            this.TO.container.addEventListener('mousemove', this.raycasterMousemove)
        }
    }

    /**
     * 销毁射线投射器
     * @author LL
     */
    public disposeRaycaster() {
        if (this.raycaster) {
            this.raycaster = null
            this.TO.container.removeEventListener('pointerdown', this.raycasterClick)
            this.TO.container.removeEventListener('mousemove', this.raycasterMousemove)
        }
    }

    private moveForward: boolean = false
    private moveBackward: boolean = false
    private moveLeft: boolean = false
    private moveRight: boolean = false

    private moveUp: boolean = false
    private moveDown: boolean = false

    private clock: Timer = new Timer()
    private speed: number

    private velocity: Vector3 = new Vector3()
    private direction: Vector3 = new Vector3()
    private rotation: Vector3 = new Vector3()

    private pointerKeyDownCallback
    private pointerKeyUpCallback

    /**
     * 漫游控制器
     * @author LL
     */
    public initPointerLock() {
        // 初始化控制器
        // r169+ 直接操作 camera（controls.object），无需再 add 到场景
        this.pointerLock = new PointerLockControls(this.TO.camera.camera, this.controlDom)

        // 绑定鼠标事件
        this.pointerKeyDownCallback = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                    this.moveUp = true
                    break
                case 'KeyW':
                    this.moveForward = true
                    break

                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = true
                    break

                case 'ArrowDown':
                    this.moveDown = true
                    break
                case 'KeyS':
                    this.moveBackward = true
                    break

                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = true
                    break
            }
        }
        this.pointerKeyUpCallback = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                    this.moveUp = false
                    break
                case 'KeyW':
                    this.moveForward = false
                    break

                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = false
                    break

                case 'ArrowDown':
                    this.moveDown = false
                    break
                case 'KeyS':
                    this.moveBackward = false
                    break

                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = false
                    break
            }
        }

        //this.TO.container添加监听事件不生效，改为document
        document.addEventListener('keydown', this.pointerKeyDownCallback, false)
        document.addEventListener('keyup', this.pointerKeyUpCallback, false)

        this.controlDom.requestPointerLock()
    }

    /**
     * 更新漫游控制器
     * @author LL
     */
    public updatePointerLock() {
        if (this.pointerLock && this.pointerLock.isLocked) {
            //获取刷新时间
            var delta = this.clock.getDelta()

            //velocity每次的速度，为了保证有过渡
            this.velocity.x -= this.velocity.x * 10.0 * delta
            // this.velocity.y -= this.velocity.y * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta

            //获取当前按键的方向并获取朝哪个方向移动
            this.direction.x = Number(this.moveLeft) - Number(this.moveRight)
            // this.direction.y = Number(this.moveUp) - Number(this.moveDown);
            this.direction.z = Number(this.moveForward) - Number(this.moveBackward)

            //将法向量的值归一化
            this.direction.normalize()

            if (this.moveForward || this.moveBackward)
                this.velocity.z -= this.direction.z * this.speed * delta
            if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * this.speed * delta

            // 根据速度值移动相机
            const camera = this.pointerLock.object
            camera.translateX(this.velocity.x * delta)
            camera.translateZ(this.velocity.z * delta)
        }
    }

    /**
     * 销毁漫游控制器
     * @author LL
     */
    public disposePointerLock() {
        if (this.pointerLock) {
            this.pointerLock.disconnect()
            this.pointerLock = null
        }
    }
}
