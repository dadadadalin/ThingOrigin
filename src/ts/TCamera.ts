/**
 * @module
 * @mergeModuleWith <project>
 */

import {
    ArrayCamera,
    Camera,
    Color,
    Object3D,
    OrthographicCamera,
    PerspectiveCamera,
    Vector3,
    Vector4,
    WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import * as TWEEN from '@tweenjs/tween.js'
import { ThingOrigin } from '../ThingOrigin'
import { xyz } from './scenePrams'
import {
    CameraAnimationConfig,
    ArrayViewOptions,
    PipView,
    SplitView,
    SplitViewOptions,
    ArraySplitOptions
} from './TCameraInterfaces'

/**
 * 相机
 */
export class TCamera {
    private TO: ThingOrigin

    /** 动画id */
    private animationId: number | null = null

    /** 当前动画的resolve函数 */
    private currentAnimationResolve: (() => void) | null = null

    /** 透视相机 */
    PerspectiveCamera: PerspectiveCamera

    /** 正交相机 */
    OrthographicCamera: OrthographicCamera

    /** 画中画子相机列表（仅作引用持有，真正渲染走 renderArrayViews 的 scissor+viewport） */
    pipCameras: Camera[]

    /** 当前相机类型 */
    type: string

    /** 当前使用的相机 */
    private _camera: PerspectiveCamera | OrthographicCamera

    /** 相机视角map */
    private _cameraView: Map<string, any> = new Map<string, any>()

    /** 小窗画中画 + DOM 框信息 */
    private _pipViews: PipView[] = []

    /** 画中画是否启用 */
    private _pipEnabled = false

    /** ArrayCamera 多分屏 */
    private _splitViews: SplitView[] = []

    /** 分屏专属 ArrayCamera（单次 render 自动分屏） */
    private _splitArrayCam: ArrayCamera | null = null

    /** 分屏网格分隔线 DOM 列表 */
    private _splitDividers: HTMLDivElement[] = []

    /** 分屏配置 */
    private _splitOptions: ArraySplitOptions = {}

    /** 分屏网格列数 */
    private _splitCols = 1

    /** 分屏网格行数 */
    private _splitRows = 1

    /** getSplitPos 复用向量，避免每帧 new */
    private _splitRight = new Vector3()
    private _splitUp = new Vector3()
    private _splitFwd = new Vector3()

    /** 分屏视口 pointerdown（capture） */
    private _splitDownHandler: ((e: PointerEvent) => void) | null = null
    /** 开启分屏前主 OrbitControls 是否启用 */
    private _mainOrbitOn = true

    public get camera(): PerspectiveCamera | OrthographicCamera {
        return this._camera
    }

    public get cameraView(): Map<string, any> {
        return this._cameraView
    }

    /** 获取所有小窗视图（只读） */
    public get pipViews(): readonly PipView[] {
        return this._pipViews
    }

    /** 画中画是否启用 */
    public get pipEnabled(): boolean {
        return this._pipEnabled
    }

    /** ArrayCamera 分屏是否启用 */
    public get arraySplitEnabled(): boolean {
        return this._splitArrayCam !== null
    }

    /** 分屏专属 ArrayCamera（启用后非空） */
    public get splitArrayCamera(): ArrayCamera | null {
        return this._splitArrayCam
    }

    /** 获取所有分屏视图（只读） */
    public get splitViews(): readonly SplitView[] {
        return this._splitViews
    }

    constructor(TO: ThingOrigin) {
        this.TO = TO

        //透视相机
        this.PerspectiveCamera = this.initPerspectiveCamera(
            this.TO.container,
            TO.sceneData.camera.perspective
        )
        //正交相机
        let frustumSize = 1000
        this.OrthographicCamera = this.initOrthographicCamera(
            this.TO.container,
            frustumSize,
            TO.sceneData.camera.perspective
        )

        this.setCamera('PerspectiveCamera')
        //设置位置
        this.camera.position.set(
            TO.sceneData.camera.position.x,
            TO.sceneData.camera.position.y,
            TO.sceneData.camera.position.z
        )
        this.camera.lookAt(
            TO.sceneData.camera.lookAt.x,
            TO.sceneData.camera.lookAt.y,
            TO.sceneData.camera.lookAt.z
        )

        // 主相机作为首个子相机；后续小窗通过 addPipView 注入
        // 画中画子相机列表（仅作引用持有，不参与 renderer.render(scene, arrayCam)）
        this.pipCameras = [this.PerspectiveCamera as Camera]
    }

    /**
     * 创建透视相机
     * @author LL
     * @param container 容器
     * @param params 相机参数
     * @param aspect 可选宽高比，不传则用容器宽高比
     */
    public initPerspectiveCamera(container, params, aspect?: number) {
        const a = aspect ?? container.clientWidth / container.clientHeight
        return new PerspectiveCamera(params.fov, a, params.near, params.far)
    }

    /**
     * 创建正交相机
     * @author LL
     * @param container 容器
     * @param frustumSize 视锥架大小
     * @param params 相机参数
     * @param aspect 可选宽高比，不传则用容器宽高比
     */
    public initOrthographicCamera(container, frustumSize, params, aspect?: number) {
        const a = aspect ?? container.clientWidth / container.clientHeight
        return new OrthographicCamera(
            (frustumSize * a) / -2,
            (frustumSize * a) / 2,
            frustumSize / 2,
            frustumSize / -2,
            params.near,
            params.far
        )
    }

    /**
     * 设置渲染相机
     * @param type 相机类型
     */
    public setCamera(type: 'PerspectiveCamera' | 'OrthographicCamera' = 'PerspectiveCamera') {
        this.type = type
        switch (type) {
            case 'PerspectiveCamera':
                this._camera = this.PerspectiveCamera
                break
            case 'OrthographicCamera':
                this._camera = this.OrthographicCamera
                break
        }
    }

    /**
     * 锁定相机视角
     * @author LL
     * @since 2021/06/29
     * @param {string} direction 方向
     * @param {number} ratio 倍数
     * @param {Object3D} [model] 锁定模型（不传则锁定场景）
     */
    public lockCamera(
        direction: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back',
        ratio: number = 1.1,
        model?: Object3D
    ) {
        let box = model ? this.TO.tool.getModelSphere(model) : this.TO.tool.getModelSphere(this.TO.scene)

        switch (direction) {
            case 'top':
                this.camera.position.set(box.center.x, box.radius * ratio, box.center.z)
                break
            case 'bottom':
                this.camera.position.set(box.center.x, -box.radius * ratio, box.center.z)
                break
            case 'left':
                this.camera.position.set(-box.radius * ratio, box.center.y, box.center.z)
                break
            case 'right':
                this.camera.position.set(box.radius * ratio, box.center.y, box.center.z)
                break
            case 'front':
                this.camera.position.set(box.center.x, box.center.y, box.radius * ratio)
                break
            case 'back':
                this.camera.position.set(box.center.x, box.center.y, -box.radius * ratio)
                break
        }
        this.camera.lookAt(box.center)
        this.TO.controls.orbit.target.set(box.center.x, box.center.y, box.center.z)
        this.TO.controls.orbit.update() //触发更新
    }

    /**
     * 相机观察某物体
     * @author LL
     * @param {string} modelName 模型名称
     * @param {number} time 动画时长
     * @param {number} [scaleRadius] 以半径为单位，让相机距离多远观察
     */
    public lookAt(modelName: string, time: number, scaleRadius: number = 1) {
        let target = this.TO.scene.getObjectByProperty('name', modelName)
        if (!target) {
            console.warn('相机追踪失败，物体不存在')
            return
        }
        let targetSphere = this.TO.tool.getModelSphere(target)

        let start = this.camera.position.clone()
        let direction = {
            x: this.camera.position.x < 0 ? -1 : 1,
            y: this.camera.position.y < 0 ? -1 : 1,
            z: this.camera.position.z < 0 ? -1 : 1
        }
        let end = target.position
            .clone()
            .add(
                new Vector3(
                    targetSphere.radius * scaleRadius * direction.x,
                    targetSphere.radius * scaleRadius * direction.y,
                    targetSphere.radius * scaleRadius * direction.z
                )
            )

        new TWEEN.Tween(start)
            .to(end, time)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate(() => {
                this.camera.position.set(start.x, start.y, start.z)
                this.camera.lookAt(target.position)
            })
            .start()
    }

    /**
     * 聚焦模型
     * @author LL
     * @since 2026/08/17
     * @param model 模型
     * @param ratio 距离系数，越大越远，默认 2
     */
    public focusOn(model: Object3D, ratio: number = 2) {
        if (!model) {
            console.warn('相机追踪失败，物体不存在')
            return
        }

        this.TO.effect.initBreath(model)

        const size = this.TO.tool.getModelSize(model)
        const center = size.center
        const halfSize = Math.max(size.width, size.height, size.depth) / 2

        let distance = halfSize * ratio
        if (this.camera instanceof PerspectiveCamera) {
            const halfFov = (this.camera.fov * Math.PI) / 360
            distance = (halfSize / Math.tan(halfFov)) * ratio
        }

        this.camera.position.copy(center).add(new Vector3(0, 1, 1).normalize().multiplyScalar(distance))
        this.camera.lookAt(center)

        if (this.TO.controls.orbit) {
            this.TO.controls.orbit.target.copy(center)
            this.TO.controls.orbit.update()
        }
    }

    /**
     * 平滑移动相机到指定位置
     * 主相机：不传 pipName，每帧同步 OrbitControls.target
     * 小窗相机：传 pipName 指定小窗名称，每帧同步该 view.lookAt
     * @author gj
     * @since 2025/10/11
     * @param targetPosition 目标位置
     * @param targetLookAt 目标朝向
     * @param duration 动画时长（毫秒）
     * @param onProgress 进度回调函数
     * @param onComplete 完成回调函数
     * @param pipName 小窗名称（不传则操作主相机）
     */
    public toCameraPosition(
        targetPosition: xyz,
        targetLookAt: xyz,
        duration: number = 2000,
        onProgress?: (progress: number) => void,
        onComplete?: () => void,
        pipName?: string
    ): Promise<void> {
        // 分支：小窗相机
        if (pipName !== undefined) {
            const view = this._pipViews.find((v) => v.name === pipName)
            if (!view) {
                console.warn(`toCameraPosition: 小窗 ${pipName} 不存在`)
                return Promise.resolve()
            }
            if (view.animationId) {
                cancelAnimationFrame(view.animationId)
            }
            const pipCamera = view.camera
            const pipStart: xyz = {
                x: pipCamera.position.x,
                y: pipCamera.position.y,
                z: pipCamera.position.z
            }
            // 用当前 view.lookAt 作为起点（始终保存最新）
            const pipStartLookAt: xyz = { ...view.lookAt }
            // 小窗每帧：同步 view.lookAt
            const pipOnFrame = (currentLookAt: xyz) => {
                view.lookAt = { ...currentLookAt }
            }
            return this._animateCameraTo(
                pipCamera,
                pipStart,
                pipStartLookAt,
                targetPosition,
                targetLookAt,
                duration,
                onProgress,
                onComplete,
                { id: null, resolve: null },
                (id) => (view.animationId = id),
                (resolve) => (view.animationResolve = resolve),
                pipOnFrame
            )
        }

        // 分支：主相机
        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
        }
        const camera = this.TO.camera.camera
        const startPosition: xyz = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
        }
        const direction = camera.getWorldDirection(this.TO.tool.initVector3())
        const lookAtDistance = 100
        const startLookAt: xyz = {
            x: camera.position.x + direction.x * lookAtDistance,
            y: camera.position.y + direction.y * lookAtDistance,
            z: camera.position.z + direction.z * lookAtDistance
        }
        // 主相机每帧：同步 OrbitControls target，防止相机飘走
        const onFrame = (currentLookAt: xyz) => {
            if (this.TO.controls.orbit) {
                this.TO.controls.orbit.target.set(currentLookAt.x, currentLookAt.y, currentLookAt.z)
                this.TO.controls.orbit.update()
            }
        }
        return this._animateCameraTo(
            camera,
            startPosition,
            startLookAt,
            targetPosition,
            targetLookAt,
            duration,
            onProgress,
            onComplete,
            { id: null, resolve: null },
            (id) => (this.animationId = id),
            (resolve) => (this.currentAnimationResolve = resolve),
            onFrame
        )
    }

    /**
     * 相机移动动画核心
     * 抽自 toCameraPosition 的共用逻辑：缓动插值、进度回调、提前结束（主相机/小窗共用）
     * @author gj
     * @since 2026/06/26
     * @param camera 目标相机
     * @param startPosition 起点位置
     * @param startLookAt 起点朝向
     * @param targetPosition 终点位置
     * @param targetLookAt 终点朝向
     * @param duration 动画时长
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     * @param animState 调用方持有的动画状态 { id, resolve }，用于 stop
     * @param setId 把当前 raf id 写回调用方
     * @param setResolve 把当前 resolve 写回调用方
     * @param onFrame 每帧应用额外副作用（主相机同步 OrbitControls / 小窗同步 view.lookAt）
     */
    private _animateCameraTo(
        camera: PerspectiveCamera | OrthographicCamera,
        startPosition: xyz,
        startLookAt: xyz,
        targetPosition: xyz,
        targetLookAt: xyz,
        duration: number,
        onProgress?: (progress: number) => void,
        onComplete?: () => void,
        animState: { id: number | null; resolve: (() => void) | null } = { id: null, resolve: null },
        setId: (id: number | null) => void = () => {},
        setResolve: (resolve: (() => void) | null) => void = () => {},
        onFrame?: (currentLookAt: xyz, isLast: boolean) => void
    ): Promise<void> {
        return new Promise((resolve) => {
            // 起点终点完全相同则直接结束
            const samePosition =
                startPosition.x === targetPosition.x &&
                startPosition.y === targetPosition.y &&
                startPosition.z === targetPosition.z
            const sameLookAt =
                startLookAt.x === targetLookAt.x &&
                startLookAt.y === targetLookAt.y &&
                startLookAt.z === targetLookAt.z
            if (samePosition && sameLookAt) {
                if (onProgress) onProgress(1)
                if (onComplete) onComplete()
                resolve()
                return
            }

            animState.resolve = resolve
            setResolve(resolve)

            // 负数抛异常日志，非负且<50也赋值50；≥50则保持原值
            duration < 0
                ? (console.error('动画时长不能小于0'), (duration = 50))
                : (duration = Math.max(duration, 50))

            const startTime = Date.now()

            const animate = () => {
                const elapsed = Date.now() - startTime
                const progress = Math.min(elapsed / duration, 1)
                const easedProgress = this.easeInOutCubic(progress)

                if (onProgress) onProgress(progress)

                if (progress >= 1) {
                    animState.id = null
                    animState.resolve = null
                    setId(null)
                    setResolve(null)
                    // 精确到达目标
                    camera.position.set(targetPosition.x, targetPosition.y, targetPosition.z)
                    camera.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z)
                    camera.updateProjectionMatrix()
                    if (onFrame) onFrame(targetLookAt, true)
                    if (onComplete) onComplete()
                    resolve()
                    return
                }

                const currentPosition: xyz = {
                    x: startPosition.x + (targetPosition.x - startPosition.x) * easedProgress,
                    y: startPosition.y + (targetPosition.y - startPosition.y) * easedProgress,
                    z: startPosition.z + (targetPosition.z - startPosition.z) * easedProgress
                }
                const currentLookAt: xyz = {
                    x: startLookAt.x + (targetLookAt.x - startLookAt.x) * easedProgress,
                    y: startLookAt.y + (targetLookAt.y - startLookAt.y) * easedProgress,
                    z: startLookAt.z + (targetLookAt.z - startLookAt.z) * easedProgress
                }

                camera.position.set(currentPosition.x, currentPosition.y, currentPosition.z)
                camera.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z)
                camera.updateProjectionMatrix()
                if (onFrame) onFrame(currentLookAt, false)

                const rafId = requestAnimationFrame(animate)
                animState.id = rafId
                setId(rafId)
            }

            animate()
        })
    }

    /**
     * 相机路径动画
     * 支持贝塞尔曲线和分段线性两种插值方式
     * @author gj
     * @since 2025/10/17
     * @param config 动画配置
     * @param onProgress 进度回调函数
     * @param onComplete 完成回调函数
     * @example
     * ```typescript
     * // 场景1：展示视频 - 需要流畅的曲线路径，但匀速播放
     * {
     *    interpolationType: "bezier",  // 路径要平滑
     *  easingType: "linear"           // 但速度要匀速（像视频播放）
     * }
     * // 场景2：漫游动画 - 精确经过每个景点，但有自然的加速减速
     *{
     *    interpolationType: "linear",   // 必须精确经过每个点
     *    easingType: "cubic"            // 但速度要有变化（更自然）
     *}
     * // 场景3：电影镜头 - 既要有流畅路径，又要有速度变化
     * {
     *    interpolationType: "bezier",  // 路径平滑
     *   easingType: "cubic"           // 速度有变化（电影感）
     * }
     * ```
     */
    public smoothCameraAnimation(
        config: CameraAnimationConfig,
        onProgress?: (progress: number) => void,
        onComplete?: () => void
    ): Promise<void> {
        return new Promise((resolve) => {
            if (!this.TO || !this.TO.camera || !this.TO.camera.camera) {
                console.error('场景未初始化')
                resolve()
                return
            }

            // 取消之前的动画
            if (this.animationId) {
                cancelAnimationFrame(this.animationId)
            }

            const {
                positions,
                lookAt,
                speed = 3000,
                loop = false,
                easingType = 'nearLinear',
                interpolationType = 'linear'
            } = config

            if (positions.length === 0) {
                console.warn('没有路径点')
                resolve()
                return
            }

            const easingFunction = this.getEasingFunction(easingType)
            let startTime = 0
            const segmentCount = positions.length
            const totalDuration = speed * segmentCount

            // 获取当前相机位置
            const camera = this.TO.camera.camera
            const initialPosition: xyz = {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            }

            /**
             * 相机动画循环函数
             */
            const animate = (timestamp: number) => {
                // 检查动画是否被停止（通过 stopAnimation 方法）
                if (this.animationId === null) {
                    resolve()
                    return
                }

                if (startTime === 0) {
                    startTime = timestamp
                }

                const elapsed = timestamp - startTime

                // 计算全局进度（0 到 1）
                let globalProgress = elapsed / totalDuration

                // 调用进度回调
                if (onProgress) {
                    onProgress(Math.min(globalProgress, 1))
                }

                // 处理循环
                if (loop && globalProgress >= 1) {
                    globalProgress = globalProgress % 1
                    startTime = timestamp - globalProgress * totalDuration
                }

                // 如果完成且不循环
                if (!loop && globalProgress >= 1) {
                    // 确保到达最后一个点
                    const lastPos = positions[positions.length - 1]
                    camera.position.set(lastPos.x, lastPos.y, lastPos.z)
                    camera.lookAt(lookAt.x, lookAt.y, lookAt.z)
                    camera.updateProjectionMatrix()

                    // 同步更新OrbitControls的target
                    if (this.TO.controls.orbit) {
                        this.TO.controls.orbit.target.set(lookAt.x, lookAt.y, lookAt.z)
                        this.TO.controls.orbit.update()
                    }

                    this.animationId = null
                    if (onComplete) {
                        onComplete()
                    }
                    resolve()
                    return
                }

                let currentPosition: xyz

                if (interpolationType === 'bezier') {
                    // 使用贝塞尔曲线插值
                    const easedProgress = easingFunction(globalProgress)
                    currentPosition = this.calculateBezierPosition(positions, easedProgress)
                } else {
                    // 使用分段线性插值
                    // 计算当前所在的段索引和段内进度
                    const exactSegment = globalProgress * segmentCount
                    const segmentIndex = Math.max(0, Math.min(Math.floor(exactSegment), segmentCount - 1))

                    // 计算段内进度（0 到 1）
                    let segmentProgress = Math.max(0, Math.min(exactSegment - segmentIndex, 1))

                    // 当非常接近路径点时（进度 > 0.99），直接使用目标位置
                    if (segmentProgress > 0.99) {
                        segmentProgress = 1
                    }

                    // 确定起始点和结束点
                    let startPos: xyz
                    let endPos: xyz

                    if (segmentIndex === 0) {
                        // 第一段：从初始位置到第一个点
                        startPos = initialPosition
                        endPos = positions[0]
                    } else if (segmentIndex < positions.length) {
                        // 中间段：从前一个点到当前点
                        startPos = positions[segmentIndex - 1]
                        endPos = positions[segmentIndex]
                    } else {
                        // 最后一段：从倒数第二个点到最后一个点
                        startPos = positions[positions.length - 2]
                        endPos = positions[positions.length - 1]
                    }

                    // 当进度为 1 时，直接使用目标位置，确保精确到达路径点
                    if (segmentProgress >= 1) {
                        currentPosition = endPos
                    } else {
                        // 使用缓动函数计算插值
                        const easedProgress = easingFunction(segmentProgress)
                        currentPosition = this.lerpVector(startPos, endPos, easedProgress)
                    }
                }

                // 更新相机位置和朝向
                camera.position.set(currentPosition.x, currentPosition.y, currentPosition.z)
                camera.lookAt(lookAt.x, lookAt.y, lookAt.z)
                camera.updateProjectionMatrix()

                // 同步更新OrbitControls的target，防止相机飘走
                if (this.TO.controls.orbit) {
                    this.TO.controls.orbit.target.set(lookAt.x, lookAt.y, lookAt.z)
                    this.TO.controls.orbit.update()
                }

                // 继续动画循环
                this.animationId = requestAnimationFrame(animate)
            }

            // 启动动画
            this.animationId = requestAnimationFrame(animate)
        })
    }

    /**
     * 停止当前相机动画
     * @author gj
     * @since 2025/10/11
     */
    public stopAnimation(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
        // 如果有待resolve的Promise，立即resolve它，让await不再等待
        if (this.currentAnimationResolve) {
            this.currentAnimationResolve()
            this.currentAnimationResolve = null
        }
    }

    /**
     * 检查是否有动画正在运行
     */
    public isAnimating(): boolean {
        return this.animationId !== null
    }

    /**
     * 获取缓动函数
     * @author gj
     * @since 2025/10/17
     * @param type 缓动函数类型
     * @returns 缓动函数
     */
    private getEasingFunction(
        type: 'linear' | 'nearLinear' | 'smooth' | 'cubic' = 'nearLinear'
    ): (t: number) => number {
        switch (type) {
            case 'linear': //线性匀速
                return (t: number) => t
            case 'nearLinear': //接近匀速，轻微缓动
                return (t: number) => this.nearLinearEase(t)
            case 'smooth': //平滑加速/减速
                return (t: number) => this.smoothEase(t)
            case 'cubic': //先加速后减速
                return (t: number) => this.easeInOutCubic(t)
            default: //默认使用接近匀速，轻微缓动
                return (t: number) => this.nearLinearEase(t)
        }
    }

    /**
     * Easing 函数 - 平滑缓动
     * 使用轻微的正弦缓动，提供平滑的过渡效果
     * @author gj
     * @since 2025/10/17
     * @param t 进度值 0-1
     * @returns 缓动后的值 0-1
     */
    private smoothEase(t: number): number {
        const linear = t
        const eased = -(Math.cos(Math.PI * t) - 1) / 2 // easeInOutSine
        return linear * 0.85 + eased * 0.15
    }

    /**
     * 缓动函数 - 三次贝塞尔曲线
     * 提供平滑的动画过渡效果
     * @author gj
     * @since 2025/10/11
     * @param t 进度
     */
    private easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    /**
     * 计算贝塞尔曲线上的位置
     * 使用三次贝塞尔曲线实现平滑的相机路径
     * @param points 关键路径点数组
     * @param t 插值参数 (0-1)
     * @returns 计算出的位置坐标
     */
    private calculateBezierPosition(points: xyz[], t: number): xyz {
        const n = points.length - 1 // n = 3 (4个点，阶数为3)

        // 如果只有两个点，使用线性插值
        if (n === 1) {
            return {
                x: points[0].x + (points[1].x - points[0].x) * t,
                y: points[0].y + (points[1].y - points[0].y) * t,
                z: points[0].z + (points[1].z - points[0].z) * t
            }
        }

        // 使用德卡斯特里奥算法计算贝塞尔曲线上的点
        let result: xyz = { x: 0, y: 0, z: 0 }

        for (let i = 0; i <= n; i++) {
            // 贝塞尔曲线的核心计算
            const bernstein = this.binomialCoefficient(n, i) * Math.pow(1 - t, n - i) * Math.pow(t, i)
            result.x += points[i].x * bernstein
            result.y += points[i].y * bernstein
            result.z += points[i].z * bernstein
        }

        return result
    }

    /**
     * 计算二项式系数 C(n, k)
     * 二项式系数就像是一个"权重分配器"：是贝塞尔曲线数学公式中的核心组成部分，实现了平滑自然的动画轨迹
     * @param n 总数
     * @param k 选择数
     * @returns 二项式系数
     */
    private binomialCoefficient(n: number, k: number): number {
        if (k > n || k < 0) return 0
        if (k === 0 || k === n) return 1

        let result = 1
        for (let i = 0; i < k; i++) {
            result = (result * (n - i)) / (i + 1)
        }

        return result
    }
    /**
     * Easing 函数 - 几乎线性，最小化端点停顿
     * 使用非常轻微的缓动，主要保持线性速度
     * @param t 进度值 0-1
     * @returns 缓动后的值 0-1
     */
    private nearLinearEase(t: number): number {
        // 使用 95% 线性 + 5% 轻微缓动，几乎完全线性
        // 这样可以保持恒定速度，减少在路径点处的停顿感
        const linear = t
        // 使用非常轻微的二次缓动
        const eased = t * t * (3 - 2 * t) // smoothstep
        return linear * 0.95 + eased * 0.05
    }

    /**
     * 线性插值函数
     * @param start 起始值
     * @param end 结束值
     * @param t 插值系数 0-1
     * @returns 插值后的值
     */
    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t
    }
    /**
     * 向量线性插值
     * @param start 起始向量
     * @param end 结束向量
     * @param t 插值系数 0-1
     * @returns 插值后的向量
     */
    private lerpVector(
        start: { x: number; y: number; z: number },
        end: { x: number; y: number; z: number },
        t: number
    ): { x: number; y: number; z: number } {
        return {
            x: this.lerp(start.x, end.x, t),
            y: this.lerp(start.y, end.y, t),
            z: this.lerp(start.z, end.z, t)
        }
    }

    // ==================== 小窗画中画 ====================

    /**
     * 添加一个画中画小窗
     * scissor + viewport 多次 render
     * @author gj
     * @since 2026/06/29
     * @remark 仅支持webGL渲染器
     * @param options 小窗配置
     */
    public addPipView(options: ArrayViewOptions): PerspectiveCamera | OrthographicCamera {
        const name = options.name?.trim()
        if (!name) {
            console.error('addPipView: name 不能为空')
            return null as never
        }
        if (this._pipViews.some((v) => v.name === name)) {
            console.warn(`addPipView: 已存在同名视图 ${name}`)
            return this._pipViews.find((v) => v.name === name)!.camera
        }

        const width = options.width ?? 200
        const height = options.height ?? 200
        const aspect = width / height || 1
        const cameraType = options.cameraType ?? 'perspective'
        const near = options.near ?? 0.1
        const far = options.far ?? 10000
        let camera: PerspectiveCamera | OrthographicCamera
        if (cameraType === 'orthographic') {
            camera = this.initOrthographicCamera(
                this.TO.container,
                options.frustumSize ?? 100,
                { near, far },
                aspect
            )
        } else {
            camera = this.initPerspectiveCamera(
                this.TO.container,
                { fov: options.fov ?? 50, near, far },
                aspect
            )
        }
        camera.position.set(options.position.x, options.position.y, options.position.z)
        // 防止正上方 lookAt 退化
        if (options.position.y > 0 && options.position.x === 0 && options.position.z === 0) {
            camera.up.set(0, 0, 1)
        }
        camera.lookAt(options.lookAt.x, options.lookAt.y, options.lookAt.z)
        camera.updateProjectionMatrix()

        const showBorder = options.showBorder ?? true
        const clickToSwitch = options.clickToSwitch ?? false
        let el: HTMLDivElement | null = null
        if (showBorder || clickToSwitch) {
            el = document.createElement('div')
            el.dataset.pipName = name
            Object.assign(el.style, {
                position: 'absolute',
                pointerEvents: clickToSwitch ? 'auto' : 'none',
                cursor: clickToSwitch ? 'pointer' : 'default',
                boxSizing: 'border-box',
                zIndex: '10'
            } as Partial<CSSStyleDeclaration>)
            if (showBorder) {
                Object.assign(el.style, {
                    border: '2px solid rgba(255,255,255,0.75)',
                    boxShadow: '0 0 8px rgba(0,0,0,0.7)'
                } as Partial<CSSStyleDeclaration>)
            }
            if (options.label) {
                const span = document.createElement('span')
                span.textContent = options.label
                Object.assign(span.style, {
                    position: 'absolute',
                    left: '6px',
                    bottom: '4px',
                    color: '#fff',
                    fontSize: '12px',
                    textShadow: '0 1px 2px #000',
                    pointerEvents: 'none'
                } as Partial<CSSStyleDeclaration>)
                el.appendChild(span)
            }
            this.TO.container.appendChild(el)
        }

        const view: PipView = {
            name,
            label: options.label ?? '',
            camera,
            anchor: options.anchor ?? 'top-right',
            left: options.left ?? 0,
            top: options.top ?? 0,
            width: options.width ?? 200,
            height: options.height ?? 200,
            padding: options.padding ?? 16,
            background: new Color(options.background ?? 0x102030),
            showBorder,
            clickToSwitch,
            followMain: options.followMain ?? false,
            lookAt: { x: options.lookAt.x, y: options.lookAt.y, z: options.lookAt.z },
            lastSyncedTarget: { x: 0, y: 0, z: 0 },
            clickHandler: null,
            animationId: null,
            animationResolve: null,
            el,
            x: 0,
            y: 0,
            w: 0,
            h: 0
        }
        this._pipViews.push(view)
        this.pipCameras.push(camera)
        this.layoutPipView(view)
        this.bindPipClick(view)
        this._pipEnabled = true
        return camera
    }

    /**
     * 绑定小窗点击事件：将主相机切换到该小窗视角
     * 用 pointerdown 而非 click： raycaster 监听的是 container 的 pointerdown，
     * 用 pointerdown 并 stopPropagation 才能阻止冒泡。
     */
    private bindPipClick(view: PipView): void {
        if (!view.clickToSwitch || !view.el) return
        const handler = (e: PointerEvent) => {
            e.stopPropagation()
            e.preventDefault()
            this.toggleMainToPip(view.name)
        }
        view.el.addEventListener('pointerdown', handler)
        view.clickHandler = handler
    }

    /**
     * 解绑小窗点击事件
     */
    private unbindPipClick(view: PipView): void {
        if (view.el && view.clickHandler) {
            view.el.removeEventListener('pointerdown', view.clickHandler as EventListener)
        }
        view.clickHandler = null
    }

    /**
     * 切换主相机视角到指定小窗
     * 用小窗相机自身的 position 和 lookAt 覆盖主相机，同步 OrbitControls target 并立即 update
     * @author gj
     * @since 2026/06/29
     * @param name 小窗名称
     */
    public toggleMainToPip(name: string): void {
        const view = this._pipViews.find((v) => v.name === name)
        if (!view) {
            console.warn(`toggleMainToPip: 视图 ${name} 不存在`)
            return
        }

        const main = this.camera
        const orbit = this.TO.controls?.orbit
        const target = view.lookAt

        // OrbitControls 开启 damping 时，update() 会用内部缓存的球面坐标重算 camera.position，
        // 直接 set 位置后下一帧会被拉回。临时关闭 damping 让 update 立即同步内部状态。
        const prevDamping = orbit?.enableDamping
        if (orbit) orbit.enableDamping = false

        // 用小窗相机的位置和朝向覆盖主相机
        main.position.copy(view.camera.position)
        main.up.copy(view.camera.up)
        main.lookAt(target.x, target.y, target.z)
        // 同步投影参数：主相机是透视就同步 fov，是正交就同步 frustum
        if (main instanceof PerspectiveCamera && view.camera instanceof PerspectiveCamera) {
            main.fov = view.camera.fov
            main.updateProjectionMatrix()
        } else if (main instanceof OrthographicCamera && view.camera instanceof OrthographicCamera) {
            main.left = view.camera.left
            main.right = view.camera.right
            main.top = view.camera.top
            main.bottom = view.camera.bottom
            main.updateProjectionMatrix()
        }

        // 同步 OrbitControls 的 target 并立即 update，让内部 spherical 与新位置一致
        if (orbit) {
            orbit.target.set(target.x, target.y, target.z)
            orbit.update()
            orbit.enableDamping = !!prevDamping
        }
    }

    /**
     * 移除指定画中画小窗
     * @author gj
     * @since 2026/06/29
     * @param name 小窗名称
     */
    public removePipView(name: string): void {
        const idx = this._pipViews.findIndex((v) => v.name === name)
        if (idx < 0) return
        const view = this._pipViews[idx]
        this.stopPipAnimation(view.name)
        this.unbindPipClick(view)
        view.el?.remove()
        this._pipViews.splice(idx, 1)
        const camIdx = this.pipCameras.indexOf(view.camera)
        if (camIdx > 0) this.pipCameras.splice(camIdx, 1)
        if (this._pipViews.length === 0) this._pipEnabled = false
    }

    /**
     * 清除所有画中画小窗
     * @author gj
     * @since 2026/06/29
     */
    public clearPipViews(): void {
        this._pipViews.forEach((v) => {
            this.stopPipAnimation(v.name)
            this.unbindPipClick(v)
            v.el?.remove()
        })
        this._pipViews = []
        // 仅保留主相机
        this.pipCameras.length = 0
        this.pipCameras.push(this.PerspectiveCamera as Camera)
        this._pipEnabled = false
    }

    /**
     * 更新小窗相机位置 / 朝向 / 布局
     * @author gj
     * @since 2026/06/29
     * @param name 小窗名称
     * @param update 更新信息
     */
    public updatePipView(
        name: string,
        update: {
            position?: xyz
            lookAt?: xyz
            fov?: number
            frustumSize?: number
            anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom'
            left?: number
            top?: number
            width?: number
            height?: number
            padding?: number
        }
    ): void {
        const view = this._pipViews.find((v) => v.name === name)
        if (!view) {
            console.warn(`updatePipView: 视图 ${name} 不存在`)
            return
        }
        if (update.position) {
            view.camera.position.set(update.position.x, update.position.y, update.position.z)
        }
        if (update.lookAt) {
            view.camera.lookAt(update.lookAt.x, update.lookAt.y, update.lookAt.z)
            view.lookAt = { x: update.lookAt.x, y: update.lookAt.y, z: update.lookAt.z }
        }
        // 投影参数按相机类型分别处理
        if (view.camera instanceof PerspectiveCamera && update.fov != null) {
            view.camera.fov = update.fov
        } else if (view.camera instanceof OrthographicCamera && update.frustumSize != null) {
            const aspect = view.width / view.height || 1
            const s = update.frustumSize
            view.camera.left = (s * aspect) / -2
            view.camera.right = (s * aspect) / 2
            view.camera.top = s / 2
            view.camera.bottom = s / -2
        }
        if (update.anchor != null) view.anchor = update.anchor
        if (update.left != null) view.left = update.left
        if (update.top != null) view.top = update.top
        if (update.width != null) view.width = update.width
        if (update.height != null) view.height = update.height
        if (update.padding != null) view.padding = update.padding
        view.camera.updateProjectionMatrix()
        this.layoutPipView(view)
    }

    /**
     * 窗口尺寸变化时重排所有小窗位置和 DOM 尺寸
     */
    public layoutPipViews(): void {
        this._pipViews.forEach((v) => this.layoutPipView(v))
    }

    /**
     * 同步 followMain 小窗到主相机
     * 把小窗 lookAt 更新为 OrbitControls.target（主相机当前关注的目标点），
     * 小窗自身位置不变，仅朝向跟着主相机走，由 ThingOrigin.update 每帧调用
     */
    public syncPipToMain(): void {
        if (!this._pipEnabled) return
        const hasFollow = this._pipViews.some((v) => v.followMain)
        if (!hasFollow) return

        const orbit = this.TO.controls?.orbit
        // 主相机当前关注的目标点：优先用 OrbitControls.target，没有则用主相机正前方 100 处
        let target: xyz
        if (orbit) {
            target = { x: orbit.target.x, y: orbit.target.y, z: orbit.target.z }
        } else {
            const dir = this.camera.getWorldDirection(new Vector3())
            const p = this.camera.position
            target = { x: p.x + dir.x * 100, y: p.y + dir.y * 100, z: p.z + dir.z * 100 }
        }

        for (const view of this._pipViews) {
            if (!view.followMain) continue
            // 动画进行中的小窗跳过跟随，由动画自身控制 lookAt
            if (view.animationId !== null) continue
            // 主相机 target 没变化就不动小窗，避免动画刚结束那一帧把 lookAt 跳走
            const same =
                view.lastSyncedTarget.x === target.x &&
                view.lastSyncedTarget.y === target.y &&
                view.lastSyncedTarget.z === target.z
            if (same) continue
            view.lookAt = { ...target }
            view.lastSyncedTarget = { ...target }
            view.camera.lookAt(target.x, target.y, target.z)
            view.camera.updateProjectionMatrix()
        }
    }

    /**
     * 停止指定小窗的动画
     */
    public stopPipAnimation(name: string): void {
        const view = this._pipViews.find((v) => v.name === name)
        if (!view) return
        if (view.animationId) {
            cancelAnimationFrame(view.animationId)
            view.animationId = null
        }
        if (view.animationResolve) {
            view.animationResolve()
            view.animationResolve = null
        }
    }

    /**
     * 停止所有小窗动画
     */
    public stopAllPipAnimations(): void {
        this._pipViews.forEach((v) => this.stopPipAnimation(v.name))
    }

    /**
     * 查询指定小窗是否正在动画
     */
    public isPipAnimating(name: string): boolean {
        const view = this._pipViews.find((v) => v.name === name)
        return !!view && view.animationId !== null
    }

    /** 计算单个小窗的视口矩形 + DOM 边框位置 */
    private layoutPipView(view: PipView): void {
        const cw = this.TO.container.clientWidth
        const ch = this.TO.container.clientHeight
        const w = view.width
        const h = view.height
        const pad = view.padding
        // three 视口坐标：左下原点
        let x = 0,
            y = 0
        switch (view.anchor) {
            case 'custom':
                // left/top 是相对容器左上角的 CSS 像素
                x = view.left
                y = ch - h - view.top
                break
            case 'top-left':
                x = pad
                y = ch - h - pad
                break
            case 'top-right':
                x = cw - w - pad
                y = ch - h - pad
                break
            case 'bottom-left':
                x = pad
                y = pad
                break
            case 'bottom-right':
            default:
                x = cw - w - pad
                y = pad
                break
        }
        view.x = x
        view.y = y
        view.w = w
        view.h = h

        if (view.el) {
            view.el.style.width = w + 'px'
            view.el.style.height = h + 'px'
            view.el.style.left = x + 'px'
            view.el.style.top = ch - h - y + 'px' // CSS 原点在左上
        }
    }

    /**
     * 渲染所有画中画小窗（由 ThingOrigin.update 在主渲染后调用）
     * 内部使用 scissor + viewport，逐个区域 clear + render，互不污染
     * @author gj
     * @since 2026/06/29
     * @param renderer 渲染器
     */
    public renderPipViews(renderer: WebGLRenderer): void {
        if (!this._pipEnabled || this._pipViews.length === 0) return

        const prevAutoClear = renderer.autoClear
        const prevScissorTest = renderer.getScissorTest()
        const prevClearColor = new Color()
        renderer.getClearColor(prevClearColor)
        const prevClearAlpha = renderer.getClearAlpha()
        // 保存主画布 viewport / scissor box，否则下一帧主渲染会沿用小窗区域
        const prevViewport = new Vector4()
        renderer.getViewport(prevViewport)
        const prevScissor = new Vector4()
        renderer.getScissor(prevScissor)

        renderer.autoClear = false
        renderer.setScissorTest(true)

        for (const view of this._pipViews) {
            renderer.setViewport(view.x, view.y, view.w, view.h)
            renderer.setScissor(view.x, view.y, view.w, view.h)
            renderer.setClearColor(view.background, 1)
            renderer.clear(true, true, true)
            renderer.render(this.TO.scene, view.camera)
        }

        // 恢复主画布状态（含 viewport，否则下一帧主场景会画到小窗区域）
        renderer.setViewport(prevViewport.x, prevViewport.y, prevViewport.z, prevViewport.w)
        renderer.setScissor(prevScissor.x, prevScissor.y, prevScissor.z, prevScissor.w)
        renderer.setScissorTest(prevScissorTest)
        renderer.setClearColor(prevClearColor, prevClearAlpha)
        renderer.autoClear = prevAutoClear
    }

    // ====================  ArrayCamera 多分屏 ====================

    /**
     * 开启 ArrayCamera 多分屏（单次 render 自动分屏）
     * @author gj
     * @since 2026/06/30
     * @param options 分屏配置：views 数量或 cols*rows 决定分屏数
     * @returns ArrayCamera
     * @example
     * // 2x2 四分屏，均跟随主相机
     * createArrayCamera({ cols: 2, rows: 2 })
     * // 3 个自定义视角
     * createArrayCamera({
     *   views: [
     *     { name: 'top', position: {x:0,y:60,z:0}, lookAt: {x:0,y:0,z:0} },
     *     { name: 'side', position: {x:60,y:0,z:0}, lookAt: {x:0,y:0,z:0} },
     *     { name: 'main', followMain: true }
     *   ]
     * })
     */
    public createArrayCamera(options: ArraySplitOptions = {}): ArrayCamera {
        if (this._splitArrayCam) this.clearArrayCamera()

        const defFov = options.fov ?? this.TO.sceneData.camera.perspective.fov ?? 45
        const defNear = options.near ?? this.TO.sceneData.camera.perspective.near ?? 0.1
        const defFar = options.far ?? this.TO.sceneData.camera.perspective.far ?? 10000
        const showDivider = options.showDivider ?? true

        // 确定视图配置列表
        let viewCfgs: SplitViewOptions[]
        if (options.views?.length) {
            viewCfgs = options.views
        } else if (options.cols || options.rows) {
            const grid = this.calcSplitGrid(
                (options.cols ?? 1) * (options.rows ?? 1),
                options.cols,
                options.rows
            )
            viewCfgs = Array.from({ length: grid.cols * grid.rows }, (_, i) => ({
                name: `split-${i}`,
                followMain: true
            }))
        } else {
            // 默认 2 分屏
            viewCfgs = [
                { name: 'split-0', followMain: true },
                { name: 'split-1', followMain: true }
            ]
        }

        const grid = this.calcSplitGrid(viewCfgs.length, options.cols, options.rows)
        this._splitCols = grid.cols
        this._splitRows = grid.rows
        this._splitOptions = { ...options, showDivider }

        const cw = this.TO.container.clientWidth
        const ch = this.TO.container.clientHeight
        const cameras: PerspectiveCamera[] = []
        this._splitViews = []

        for (let i = 0; i < viewCfgs.length; i++) {
            const view = this.createSplitCamera(
                viewCfgs[i],
                i,
                grid.cols,
                grid.rows,
                cw,
                ch,
                defFov,
                defNear,
                defFar
            )
            this._splitViews.push(view)
            cameras.push(view.camera)
        }

        this._splitArrayCam = new ArrayCamera(cameras)
        this.createSplitDivide(grid.cols, grid.rows, cw, ch)
        if (options.splitDrag !== false) {
            this.initSplitOrbits()
            this.bindSplitDrag()
        }
        return this._splitArrayCam
    }

    /** 清除 ArrayCamera 分屏
     * @author gj
     * @since 2026/06/30
     */
    public clearArrayCamera(): void {
        this.unbindSplitDrag()
        for (const view of this._splitViews) {
            view.orbit?.dispose()
        }
        this._splitViews = []
        this._splitArrayCam = null
        this.clearSplitDividers()
        this._splitOptions = {}
        this._splitCols = 1
        this._splitRows = 1
    }

    /**
     * 更新指定分屏视图（位置/朝向/跟随等）
     * @author gj
     * @since 2026/06/30
     * @param name 分屏名称
     * @param update 更新配置
     */
    public updateArrayCamera(
        name: string,
        update: Partial<Pick<SplitViewOptions, 'position' | 'lookAt' | 'offset' | 'followMain' | 'fov'>>
    ): void {
        const view = this._splitViews.find((v) => v.name === name)
        if (!view) {
            console.warn(`updateArrayCamera: 分屏 ${name} 不存在`)
            return
        }
        if (update.offset) view.offset = { ...update.offset }
        if (update.followMain !== undefined) view.followMain = update.followMain
        if (update.fov !== undefined) {
            view.camera.fov = update.fov
            view.camera.updateProjectionMatrix()
        }
        if (update.position) {
            view.camera.position.set(update.position.x, update.position.y, update.position.z)
            view.fixedPos = { ...update.position }
        }
        if (update.lookAt) {
            view.lookAt = { ...update.lookAt }
            view.camera.lookAt(update.lookAt.x, update.lookAt.y, update.lookAt.z)
            view.fixedQuat = this.snapQuat(view.camera)
        }
        view.camera.updateProjectionMatrix()
    }

    /**
     * 同步分屏子相机
     * followMain：复制主相机旋转 + 本地偏移位置（不用 lookAt，避免与 OrbitControls 抖动）
     * 固定视角：还原开启时的位置/旋转快照
     * @author gj
     * @since 2026/06/30
     */
    public syncArrayCameraToMain(): void {
        if (!this._splitArrayCam) return
        const target = this.getMainLookAt()

        for (const view of this._splitViews) {
            if (view.manual) continue
            if (view.followMain) {
                const pos = this.getSplitPos(view.offset)
                view.camera.position.set(pos.x, pos.y, pos.z)
                this.copyMainRot(view.camera)
                view.lookAt = { ...target }
            } else {
                view.camera.position.set(view.fixedPos.x, view.fixedPos.y, view.fixedPos.z)
                view.camera.quaternion.set(
                    view.fixedQuat.x,
                    view.fixedQuat.y,
                    view.fixedQuat.z,
                    view.fixedQuat.w
                )
            }
            view.camera.updateMatrixWorld()
        }
    }

    /**
     * 渲染 ArrayCamera 分屏（由 ThingOrigin.update 调用，替换主相机渲染）
     * @author gj
     * @since 2026/06/30
     * @param renderer 渲染器
     * @returns 是否实际渲染
     */
    public renderArrayCamera(renderer: WebGLRenderer): boolean {
        if (!this._splitArrayCam) return false
        renderer.clear()
        renderer.render(this.TO.scene, this._splitArrayCam)
        return true
    }

    /** 窗口尺寸变化时更新分屏 viewport / 分隔线
     * @author gj
     * @since 2026/06/30
     */
    public layoutArrayCamera(): void {
        if (!this._splitArrayCam) return
        const cw = this.TO.container.clientWidth
        const ch = this.TO.container.clientHeight
        const cols = this._splitCols
        const rows = this._splitRows

        for (const view of this._splitViews) {
            if (view.customVp) {
                const vp = view.camera.viewport!
                view.camera.aspect = vp.z / vp.w
            } else {
                const vp = this.calcSplitViewport(view.col, view.row, cols, rows, cw, ch)
                view.camera.aspect = vp.z / vp.w
                view.camera.viewport = vp
            }
            view.camera.updateProjectionMatrix()
        }

        this.createSplitDivide(cols, rows, cw, ch)
    }

    /** 创建并布局单个分屏相机
     * @param cfg 分屏配置
     * @param index 分屏索引
     * @param cols 网格列数
     * @param rows 网格行数
     * @param cw 容器宽度
     * @param ch 容器高度
     * @param defFov 默认 FOV
     * @param defNear 默认 near
     * @param defFar 默认 far
     * @returns 分屏视图对象
     */
    private createSplitCamera(
        cfg: SplitViewOptions,
        index: number,
        cols: number,
        rows: number,
        cw: number,
        ch: number,
        defFov: number,
        defNear: number,
        defFar: number
    ): SplitView {
        const col = index % cols
        const row = Math.floor(index / cols)
        const vp = cfg.viewport
            ? new Vector4(cfg.viewport.x, cfg.viewport.y, cfg.viewport.w, cfg.viewport.h)
            : this.calcSplitViewport(col, row, cols, rows, cw, ch)
        const aspect = vp.z / vp.w
        const cam = this.initPerspectiveCamera(
            this.TO.container,
            {
                fov: cfg.fov ?? defFov,
                near: cfg.near ?? defNear,
                far: cfg.far ?? defFar
            },
            aspect
        )

        const base = this.camera.position
        const offset = cfg.offset ?? { x: 0, y: 0, z: 0 }
        const lookAt = cfg.lookAt ?? this.getMainLookAt()

        if (cfg.position) {
            cam.position.set(cfg.position.x, cfg.position.y, cfg.position.z)
            cam.lookAt(lookAt.x, lookAt.y, lookAt.z)
        } else if (cfg.followMain) {
            const pos = this.getSplitPos(offset)
            cam.position.set(pos.x, pos.y, pos.z)
            this.copyMainRot(cam)
        } else {
            cam.position.copy(base)
            cam.lookAt(lookAt.x, lookAt.y, lookAt.z)
        }
        cam.viewport = vp

        const fixedPos = { x: cam.position.x, y: cam.position.y, z: cam.position.z }
        const fixedQuat = this.snapQuat(cam)

        const defDrag = this._splitOptions.splitDrag !== false

        return {
            name: cfg.name ?? `split-${index}`,
            label: cfg.label ?? cfg.name ?? `视图${index + 1}`,
            camera: cam,
            offset: { ...offset },
            lookAt: { ...lookAt },
            followMain: cfg.followMain ?? false,
            col,
            row,
            customVp: !!cfg.viewport,
            fixedPos,
            fixedQuat,
            drag: cfg.drag !== false && defDrag,
            manual: false,
            orbit: null
        }
    }

    /** 为各视口创建独立 OrbitControls */
    private initSplitOrbits(): void {
        const main = this.TO.controls?.orbit
        const dom = this.TO.container
        for (const view of this._splitViews) {
            if (!view.drag) continue
            const orbit = new OrbitControls(view.camera, dom)
            orbit.target.set(view.lookAt.x, view.lookAt.y, view.lookAt.z)
            orbit.enabled = false
            if (main) {
                orbit.enableDamping = main.enableDamping
                orbit.dampingFactor = main.dampingFactor
                orbit.minDistance = main.minDistance
                orbit.maxDistance = main.maxDistance
                orbit.enableZoom = main.enableZoom
                orbit.screenSpacePanning = main.screenSpacePanning
            }
            view.orbit = orbit
        }
    }

    /** 根据鼠标位置命中分屏视口（与 calcSplitViewport 同一套坐标） */
    public hitSplitView(clientX: number, clientY: number): SplitView | null {
        if (!this._splitArrayCam) return null
        return this.pickSplitView(clientX, clientY)
    }

    private pickSplitView(clientX: number, clientY: number): SplitView | null {
        const rect = this.TO.container.getBoundingClientRect()
        const x = clientX - rect.left
        const y = rect.height - (clientY - rect.top)
        for (const view of this._splitViews) {
            const vp = view.camera.viewport
            if (!vp) continue
            if (x >= vp.x && x < vp.x + vp.z && y >= vp.y && y < vp.y + vp.w) return view
        }
        return null
    }

    private onSplitPointerDown = (e: PointerEvent): void => {
        if (!this._splitArrayCam) return
        const view = this.pickSplitView(e.clientX, e.clientY)
        if (!view?.drag || !view.orbit) return

        // 不可 stopPropagation：否则 OrbitControls 收不到 pointerdown，拖拽无法开始
        view.manual = true
        view.orbit.target.set(view.lookAt.x, view.lookAt.y, view.lookAt.z)
        view.orbit.update()

        for (const v of this._splitViews) {
            if (v.orbit) v.orbit.enabled = v === view
        }
    }

    private bindSplitDrag(): void {
        this.unbindSplitDrag()
        this._splitDownHandler = this.onSplitPointerDown
        this.TO.container.addEventListener('pointerdown', this._splitDownHandler, true)
        if (this.TO.controls?.orbit) {
            this._mainOrbitOn = this.TO.controls.orbit.enabled
            this.TO.controls.orbit.enabled = false
        }
    }

    private unbindSplitDrag(): void {
        if (this._splitDownHandler) {
            this.TO.container.removeEventListener('pointerdown', this._splitDownHandler, true)
            this._splitDownHandler = null
        }
        if (this.TO.controls?.orbit) {
            this.TO.controls.orbit.enabled = this._mainOrbitOn
        }
    }

    /** 更新分屏 OrbitControls（含拖拽中与阻尼衰减） */
    public updateSplitOrbits(): void {
        for (const view of this._splitViews) {
            if (!view.orbit) continue
            if (!view.orbit.enabled && !view.manual) continue
            view.orbit.update()
            if (view.manual) {
                view.lookAt = {
                    x: view.orbit.target.x,
                    y: view.orbit.target.y,
                    z: view.orbit.target.z
                }
            }
        }
    }

    /** 绘制网格分隔线 */
    private createSplitDivide(cols: number, rows: number, cw: number, ch: number): void {
        this.clearSplitDividers()
        const opts = this._splitOptions
        if (!opts.showDivider) return

        const color = opts.dividerColor ?? 'rgba(255,255,255,0.6)'
        const size = opts.dividerSize ?? 2
        const baseStyle: Partial<CSSStyleDeclaration> = {
            position: 'absolute',
            pointerEvents: 'none',
            background: color,
            zIndex: '20'
        }

        // 竖线：列之间
        for (let c = 1; c < cols; c++) {
            const div = document.createElement('div')
            Object.assign(div.style, baseStyle, {
                left: cw * (c / cols) - size / 2 + 'px',
                top: '0',
                width: size + 'px',
                height: ch + 'px'
            })
            this.TO.container.appendChild(div)
            this._splitDividers.push(div)
        }
        // 横线：行之间（CSS 自上而下，three 行 0 在底部）
        for (let r = 1; r < rows; r++) {
            const div = document.createElement('div')
            Object.assign(div.style, baseStyle, {
                left: '0',
                top: (ch * (rows - r)) / rows - size / 2 + 'px',
                width: cw + 'px',
                height: size + 'px'
            })
            this.TO.container.appendChild(div)
            this._splitDividers.push(div)
        }
    }

    /** 清除分屏网格分隔线 */
    private clearSplitDividers(): void {
        for (const div of this._splitDividers) div.remove()
        this._splitDividers = []
    }

    /**
     * 根据分屏数量推算 cols / rows
     */
    private calcSplitGrid(count: number, cols?: number, rows?: number): { cols: number; rows: number } {
        if (cols && rows) return { cols, rows }
        if (cols) return { cols, rows: Math.ceil(count / cols) }
        if (rows) return { cols: Math.ceil(count / rows), rows }
        if (count <= 1) return { cols: 1, rows: 1 }
        if (count === 2) return { cols: 2, rows: 1 }
        const c = Math.ceil(Math.sqrt(count))
        return { cols: c, rows: Math.ceil(count / c) }
    }

    /**
     * 获取主相机当前 lookAt 目标点
     */
    private getMainLookAt(): xyz {
        const orbit = this.TO.controls?.orbit
        // 如果 OrbitControls 启用，则使用 OrbitControls 的目标点
        if (orbit) {
            return { x: orbit.target.x, y: orbit.target.y, z: orbit.target.z }
        }
        // 如果 OrbitControls 未启用，则使用相机朝向
        const dir = this.camera.getWorldDirection(new Vector3())
        const p = this.camera.position
        // 返回相机位置 + 朝向方向 * 100 的点
        return { x: p.x + dir.x * 100, y: p.y + dir.y * 100, z: p.z + dir.z * 100 }
    }

    /**
     * 根据传入的相机局部偏移量 offset，计算出世界空间下分屏相机的实际坐标
     * 把 offset 的 x(右)、y(上)、z(前) 转换成世界坐标叠加到主相机位置
     * @param offset 相机局部偏移量 {x:左右偏移, y:上下偏移, z:前后偏移}
     * @returns 偏移后相机在世界坐标系中的三维坐标 xyz
     */
    private getSplitPos(offset: xyz): xyz {
        const base = this.camera.position
        // 获取相机当前的四元数（存储相机旋转姿态）
        const q = this.camera.quaternion
        //先初始化本地向右向量(1,0,0)，再乘相机旋转四元数，转为世界空间方向，同理up和fwd
        const right = this._splitRight.set(1, 0, 0).applyQuaternion(q)
        const up = this._splitUp.set(0, 1, 0).applyQuaternion(q)
        const fwd = this._splitFwd.set(0, 0, -1).applyQuaternion(q)
        // 计算偏移后的相机位置：主相机位置 + 世界空间下右、上、前方向 * 偏移量
        return {
            x: base.x + right.x * offset.x + up.x * offset.y + fwd.x * offset.z,
            y: base.y + right.y * offset.x + up.y * offset.y + fwd.y * offset.z,
            z: base.z + right.z * offset.x + up.z * offset.y + fwd.z * offset.z
        }
    }

    /** 复制主相机旋转到子相机（避免 lookAt 与 OrbitControls 姿态不一致导致抖动） */
    private copyMainRot(cam: PerspectiveCamera): void {
        cam.quaternion.copy(this.camera.quaternion)
        cam.up.copy(this.camera.up)
    }

    /** 获取相机四元数 */
    private snapQuat(cam: PerspectiveCamera): { x: number; y: number; z: number; w: number } {
        return { x: cam.quaternion.x, y: cam.quaternion.y, z: cam.quaternion.z, w: cam.quaternion.w }
    }
    /**
     * 按网格索引计算子相机 viewport（three 左下原点）
     * 根据网格索引 col（列）和 row（行），计算出子相机在 viewport 中的位置和大小
     * @param col 网格列索引（0 起）
     * @param row 网格行索引（0=底部行，three 左下原点）
     * @param cols 网格列数
     * @param rows 网格行数
     * @param cw 容器宽度
     * @param ch 容器高度
     * @returns viewport 位置和大小 {x:左, y:上, w:宽, h:高}
     */
    private calcSplitViewport(
        col: number,
        row: number,
        cols: number,
        rows: number,
        cw: number,
        ch: number
    ): Vector4 {
        // 计算每个子相机的宽度（容器宽度 / 列数）和高度（容器高度 / 行数）
        const vw = cw / cols
        const vh = ch / rows
        // 计算子相机在 viewport 中的位置（col * 宽度，row * 高度）
        return new Vector4(col * vw, row * vh, vw, vh)
    }
}
