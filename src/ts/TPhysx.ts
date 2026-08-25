/**
 * @module
 * @mergeModuleWith <project>
 */

import PhysX from 'physx-js-webidl'
import { ThingOrigin } from '../ThingOrigin'
import { merge } from 'lodash-es'
import { BoxGeometry, EdgesGeometry, LineSegments, SphereGeometry } from 'three'
import { TIndexedDB } from './TIndexedDB'

/** loadPhysxWasmFile：成功为 { module, success: true }，失败为 false */
/**
 * @group Types
 */
export type LoadPhysxWasmFileResult = { module: Record<string, unknown>; success: true } | false

/** initPhysx 返回值 */
/**
 * @group Types
 */
export type InitPhysxResult = { success: true; PhysXInstance: any; physics: any } | { success: false; error?: unknown }

/**
 * @group Types
 */
export type PhysxContactEventType = 'found' | 'lost'
/**
 * @group Types
 */
export type PhysxContactEventPayload = {
    type: PhysxContactEventType
    actorA: any
    actorB: any
    contacts: any[] | null
}

export class TPhysx {
    private TO: ThingOrigin
    private indexedDB: TIndexedDB

    /** loadPhysxWasmFile 预拉取成功后缓存，供 instantiateWasm 使用 */
    private physxWasmBuffer: ArrayBuffer | null = null

    // 缓存初始化出来的对象
    private PhysXInstance: any
    private physics: any
    private tolerances: any
    private pxScene: any

    // === 新增：用于回调里的状态映射 ===
    private pxActors: Map<number, any> = new Map() // key: actor.ptr, value: 你的 actor 或 three 对象
    private actorEnterCounts: Map<any, number> = new Map()
    private triggerListeners: Map<any, any> = new Map()
    private contactListeners: Set<(payload: PhysxContactEventPayload) => void> = new Set()

    constructor(TO: ThingOrigin) {
        this.TO = TO
        this.indexedDB = new TIndexedDB(TO)
    }
    /**
     * 预加载 physx-js-webidl.wasm：优先经 IndexedDB（与 TFont.loadFont 相同流程：accessInsertModel），
     * 未缓存则下载并写入再读；已缓存则 blob URL fetch 为 ArrayBuffer。再构造 Emscripten Module（instantiateWasm 避免 MIME 问题）。
     * 可通过 `sceneData.params.resource.physxWasmCache` 覆盖 `{ indexedDB: { active, id } }`（id 建议 ≥11，避免与字体 0–10 冲突）。
     * @returns 成功 `{ module, success: true }`，失败 `false`
     * @author MY
     * @since 2026/03/26
     */
    public async loadPhysxWasmFile(): Promise<LoadPhysxWasmFileResult> {
        const wasmUrl =
            this.TO.sceneData.params.resource.serverAddress + this.TO.sceneData.params.resource.physxWasm
        this.physxWasmBuffer = null

        const defaultPhysxCache = {
            indexedDB: {
                active: true,
                /** 与字体缓存区分（TIndexedDB：0–10 为字体），PhysX 默认用 12 */
                id: 12
            }
        }
        const resource = this.TO.sceneData.params.resource as Record<string, unknown>
        const param = merge(defaultPhysxCache, resource.physxWasmCache ?? {})
        console.log('param', param)

        let fetchUrl = wasmUrl
        if (param.indexedDB.active && param.indexedDB.id >= 11) {
            const accessInsetResult = await this.indexedDB.accessInsertModel({
                id: param.indexedDB.id,
                modelName: 'physx-js-webidl',
                base: {
                    modelUrl: wasmUrl
                },
                modelType: 'physxWasm'
            })
            if (accessInsetResult.saved && accessInsetResult.modelUrl) {
                fetchUrl = accessInsetResult.modelUrl
            }
        } else if (param.indexedDB.active && param.indexedDB.id < 11) {
            console.warn('[PhysX] WASM IndexedDB 缓存 id 需 ≥11（与字体缓存区分），已改为直接网络加载')
        }

        try {
            const response = await fetch(fetchUrl)
            if (!response.ok) return false
            this.physxWasmBuffer = await response.arrayBuffer()
        } catch {
            return false
        }

        const module: Record<string, unknown> = {
            locateFile: (path: string, scriptDirectory: string) => {
                if (path.endsWith('.wasm')) return wasmUrl
                return scriptDirectory + path
            },
            instantiateWasm: (
                imports: WebAssembly.Imports,
                successCallback: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void
            ) => {
                const buffer = this.physxWasmBuffer
                if (!buffer) {
                    throw new Error('PhysX WASM 未预加载')
                }
                WebAssembly.instantiate(buffer, imports)
                    .then((result) => successCallback(result.instance, result.module))
                    .catch((e) => {
                        throw new Error(
                            `PhysX WASM 实例化失败: ${e}. 请确认 wasm 与 physx-js-webidl 版本一致。`
                        )
                    })
            }
        }

        return { module, success: true }
    }

    /**
     * PhysX 初始化
     * @author MY
     * @since 2025/12/23
     **/
    public async initPhysx(): Promise<InitPhysxResult> {
        try {
            const loaded = await this.loadPhysxWasmFile()
            if (loaded === false) {
                return {
                    success: false,
                    error: new Error('PhysX WASM 预加载失败，请检查 sceneParams.resource.physxWasm')
                }
            }
            const PhysXInstance = await PhysX(loaded.module)
            const version = PhysXInstance.PHYSICS_VERSION
            console.log(
                'PhysX loaded! Version:',
                ((version >> 24) & 0xff) + '.' + ((version >> 16) & 0xff) + '.' + ((version >> 8) & 0xff)
            )

            // 创建PhysX基础组件
            const allocator = new PhysXInstance.PxDefaultAllocator() // 内存分配器
            const errorCb = new PhysXInstance.PxDefaultErrorCallback() // 错误回调
            const foundation = PhysXInstance.CreateFoundation(version, allocator, errorCb) // 创建Foundation 基础核心

            const tolerances = new PhysXInstance.PxTolerancesScale() //物理仿真精度
            const physics = PhysXInstance.CreatePhysics(version, foundation, tolerances) //创建物理引擎

            // 缓存下来，供其他方法使用
            this.PhysXInstance = PhysXInstance
            this.physics = physics
            this.tolerances = tolerances

            return {
                success: true,
                PhysXInstance,
                physics
            }
        } catch (error) {
            console.error('[PhysX] initPhysx 失败', error)
            return { success: false, error }
        }
    }

    /**
     * 创建Vec3向量
     * @author MY
     * @since 2025/12/25
     * @returns {*}  {Vec3} 向量
     * @param vec3Info
     **/
    public createVec3(vec3Info: any): any {
        let defaultParams = {
            x: 0,
            y: 0,
            z: 0
        }
        let param = merge(defaultParams, vec3Info)
        const vec3 = new this.PhysXInstance.PxVec3(param.x, param.y, param.z)
        return vec3
    }

    // 供外部注册 actor -> 逻辑对象（或 three 对象）的映射
    public registerActorReference(pxActor: any, modelInfo: any) {
        if (!pxActor) return
        this.pxActors.set(pxActor.ptr, { pxActor, modelInfo })
    }

    // 供外部注册触发器监听
    public addTriggerListener(triggerLogicActor: any, listener: any) {
        let entry = this.triggerListeners.get(triggerLogicActor)
        if (!entry) {
            entry = {
                listeners: [],
                actorEnterCounts: new Map<any, number>()
            }
            this.triggerListeners.set(triggerLogicActor, entry)
        }
        entry.listeners.push(listener as never)
    }

    /**
     * 碰撞事件监听（found / lost）
     * @author MY
     * @since 2026/03/31
     * @param listener
     * @returns
     */
    public addContactListener(listener: (payload: PhysxContactEventPayload) => void): () => void {
        this.contactListeners.add(listener)
        return () => this.contactListeners.delete(listener)
    }

    /**
     * 触发碰撞事件
     * @author MY
     * @since 2026/03/31
     * @param payload
     */
    private emitContact(payload: PhysxContactEventPayload) {
        this.contactListeners.forEach((listener) => {
            try {
                listener(payload)
            } catch (error) {
                console.error('[TPhysx] contact listener error', error)
            }
        })
    }

    private triggerCallback = {
        onContactBegin: (collision: any) => {
            this._onContactEnter(collision)
        },
        onContactEnd: (collision: any) => {
            this._onContactExit(collision)
        },
        onContactPersist: (collision) => {
            this._onContactStay(collision)
        }
    }

    private _onContactEnter(collision: any) {
        console.log('[onContactEnter]', collision)
    }
    private _onContactExit(collision: any) {
        console.log('[onContactExit]', collision)
    }
    private _onContactStay(collision: any) {
        console.log('[onContactStay]', collision)
    }

    // ================== 核心：事件回调类 ==================
    private createSimulationEventCallback(): any {
        // 创建 PhysX 回调实例
        const callback = new this.PhysXInstance.PxSimulationEventCallbackImpl()

        // 预分配碰撞点数组（最大64个）
        const contacts = new this.PhysXInstance.PxArray_PxContactPairPoint(64)

        // 空实现：不用的事件
        callback.onConstraintBreak = (constraints, count) => {}
        callback.onWake = (actors, count) => {}
        callback.onSleep = (actors, count) => {
            console.log('[onSleep]', actors, count)
        }

        // ==============================================
        // 【触发器】onTrigger（进入/离开区域）
        // ==============================================
        callback.onTrigger = (pairsPtr, count) => {
            // 指针包装成 JS 可访问对象
            const pairs = this.PhysXInstance.PxTriggerPairFromPointer(pairsPtr)

            for (let i = 0; i < count; i++) {
                const pair = this.PhysXInstance.NativeArrayHelpers.getTriggerPairAt(pairs, i)

                // 判断：进入触发器
                const isEnter = pair.status === this.PhysXInstance.PxPairFlagEnum.eNOTIFY_TOUCH_FOUND

                // 通过指针映射回你的游戏对象（和 Kotlin 的 pxActors 一样）
                const trigger = this.pxActors.get(pair.triggerActor.ptr)
                const actor = this.pxActors.get(pair.otherActor.ptr)

                if (trigger && actor) {
                    const listener = this.triggerListeners.get(trigger)
                    if (listener) {
                        // 计数：防止重复触发（和 Kotlin 逻辑完全一致）
                        let cnt = this.actorEnterCounts.get(actor) || 0
                        if (isEnter) {
                            cnt++
                            if (cnt === 1) {
                                listener.listeners.forEach((l) => l.onActorEntered(trigger, actor))
                            }
                        } else {
                            cnt--
                            if (cnt === 0) {
                                listener.listeners.forEach((l) => l.onActorExited(trigger, actor))
                            }
                        }
                        this.actorEnterCounts.set(actor, cnt)
                    }
                }
            }
        }

        // ==============================================
        // 【碰撞】onContact（碰撞开始/结束）
        // ==============================================
        callback.onContact = (pairHeaderPtr, pairsPtr, nbPairs) => {
            console.log('onContact00000000000', pairHeaderPtr, pairsPtr, nbPairs)
            // ✅ 正确写法：直接用指针，不需要包装！
            const pairHeader =
                this.PhysXInstance.NativeArrayHelpers.prototype.getContactPairHeaderAt(pairHeaderPtr)
            // console.log('pairHeader', pairHeader)
            const actor0 = pairHeader.get_actors(0)
            const actor1 = pairHeader.get_actors(1)
            // console.log('onContact111111111', actor0, actor1)
            // 获取碰撞双方
            const actorA = this.pxActors.get(actor0.ptr) as any
            const actorB = this.pxActors.get(actor1.ptr) as any
            if (!actorA || !actorB) return
            for (let i = 0; i < nbPairs; i++) {
                const pair = this.PhysXInstance.NativeArrayHelpers.prototype.getContactPairAt(pairsPtr, i)
                const events = pair.events

                // 碰撞开始（碰到第一帧）
                if (events.isSet(this.PhysXInstance.PxPairFlagEnum.eNOTIFY_TOUCH_FOUND)) {
                    let contactPoints = null

                    // 提取碰撞点（位置、法线、冲击力）
                    const numContacts = pair.extractContacts(contacts.begin() as any, 64)
                    if (numContacts > 0) {
                        contactPoints = []
                        for (let p = 0; p < numContacts; p++) {
                            const cp = contacts.get(p) as any
                            contactPoints.push({
                                position: { x: cp.position.x, y: cp.position.y, z: cp.position.z },
                                normal: { x: cp.normal.x, y: cp.normal.y, z: cp.normal.z },
                                impulse: { x: cp.impulse.x, y: cp.impulse.y, z: cp.impulse.z },
                                separation: cp.separation
                            })
                        }
                    }

                    // 触发碰撞开始事件
                    this.fireOnTouchFound(actorA, actorB, contactPoints)
                }
                // 碰撞结束（分开）
                else if (events.isSet(this.PhysXInstance.PxPairFlagEnum.eNOTIFY_TOUCH_LOST)) {
                    this.fireOnTouchLost(actorA, actorB)
                }
            }
        }

        return callback
    }

    /**
     * 触发碰撞开始事件
     * @author MY
     * @since 2026/03/31
     * @param actorA 碰撞方A
     * @param actorB 碰撞方B
     * @param contacts 碰撞点
     */
    // 供回调里调用的分发函数（你可以自己实现具体逻辑）
    private fireOnTouchFound(actorA: any, actorB: any, contacts: any[] | null) {
        console.log('[fireOnTouchFound]', actorA, actorB, contacts)
        this.emitContact({ type: 'found', actorA, actorB, contacts })
        // TODO: 根据你的业务，比如发事件给 ThingOrigin / TModel 等
    }

    /**
     * 触发碰撞结束事件
     * @author MY
     * @since 2026/03/31
     * @param actorA 碰撞方A
     * @param actorB 碰撞方B
     */
    private fireOnTouchLost(actorA: any, actorB: any) {
        console.log('[fireOnTouchLost]', actorA, actorB)
        this.emitContact({ type: 'lost', actorA, actorB, contacts: null })
        // TODO: 根据你的业务做处理
    }

    /**
     * 创建物理场景（需先调用 initPhysx）
     * @author MY
     * @since 2025/12/23
     * @returns {*}  {Scene}
     * @param gravityInfo
     **/
    public createScene(gravityInfo: any): any {
        let defaultParams = {
            x: 0, // x轴重力
            y: -9.81, // y轴重力
            z: 0 // z轴重力
        }
        let param = merge(defaultParams, gravityInfo)
        const PhysXInstance = this.PhysXInstance
        const physics = this.physics
        const tolerances = this.tolerances

        if (!PhysXInstance || !physics || !tolerances) {
            throw new Error('PhysX 未初始化，请先调用 initPhysx()')
        }

        // 创建物理场景（带重力）
        const tmpVec = this.createVec3(param)
        const sceneDesc = new PhysXInstance.PxSceneDesc(tolerances) //创建物理场景描述
        console.log('sceneDesc:::::::', sceneDesc)
        //@ts-ignore
        sceneDesc.set_gravity(tmpVec) // 设置重力
        //@ts-ignore
        sceneDesc.set_cpuDispatcher(PhysXInstance.DefaultCpuDispatcherCreate(0)) // CPU 调度器
        // 过滤器--不添加的话会报错！！！！！！
        sceneDesc.set_filterShader(PhysXInstance.DefaultFilterShader())
        sceneDesc.set_simulationEventCallback(this.createSimulationEventCallback()) // 模拟事件回调
        // 5. 场景标志
        // sceneDesc.flags.raise(PhysXInstance.PxSceneFlagEnum.eENABLE_ACTIVE_ACTORS)
        const pxScene = physics.createScene(sceneDesc) // 创建物理场景

        this.pxScene = pxScene
        return pxScene
    }

    /**
     * 创建物理材质
     * @author MY
     * @since 2025/12/24
     * @returns {*}  {Material}
     * @param materialInfo
     **/
    public createMaterial(materialInfo: any): any {
        let defaultParams = {
            staticFriction: 0.2, // 静摩擦力(静止的物体需要多大的力才能开始运动)  (0-1)
            dynamicFriction: 0.2, // 动摩擦力(运动的物体需要多大的力才能停止运动)  (0-1)(通常静摩擦系数≥动摩擦系数)
            restitution: 0.5 // 弹性系数(弹力) (0-1)
        }
        let param = merge(defaultParams, materialInfo)
        const physics = this.physics
        const material = physics.createMaterial(
            param.staticFriction,
            param.dynamicFriction,
            param.restitution
        )
        return material
    }

    /**
     * 创建形状标志
     * @author MY
     * @since 2025/12/24
     * @returns {*}  {ShapeFlags}
     * @param shapeFlagsInfo
     **/
    public createShapeFlags(shapeFlagsInfo: any): any {
        let defaultParams = {
            sceneQueryShape: true, // 场景查询形状(是否可以被场景查询)
            simulationShape: true // 模拟形状(是否可以被模拟) (默认true)
        }
        let param = merge(defaultParams, shapeFlagsInfo)
        // console.log('param-----------------', param)
        const PhysXInstance = this.PhysXInstance
        if (param.sceneQueryShape && param.simulationShape) {
            const shapeFlags = new PhysXInstance.PxShapeFlags(
                PhysXInstance.PxShapeFlagEnum.eSCENE_QUERY_SHAPE |
                    PhysXInstance.PxShapeFlagEnum.eSIMULATION_SHAPE
            )
            return shapeFlags
        } else if (param.sceneQueryShape) {
            return new PhysXInstance.PxShapeFlags(PhysXInstance.PxShapeFlagEnum.eSCENE_QUERY_SHAPE)
        } else if (param.simulationShape) {
            return new PhysXInstance.PxShapeFlags(PhysXInstance.PxShapeFlagEnum.eSIMULATION_SHAPE)
        } else {
            return new PhysXInstance.PxShapeFlags(0)
        }
    }

    /**
     * 创建立方体形状
     * @author MY
     * @since 2025/12/24
     * @returns {*}  {Shape}
     * @param boxShapeInfo
     * @param shapeFlags
     * @param material
     **/
    public createBoxShape(boxShapeInfo: any, shapeFlags: any, material: any): any {
        let defaultParams = {
            width: 10, // 宽度
            height: 1, // 高度
            depth: 10 // 长度
        }
        let param = merge(defaultParams, boxShapeInfo)
        const boxGeometryPx = new this.PhysXInstance.PxBoxGeometry(
            param.width / 2,
            param.height / 2,
            param.depth / 2
        ) // 物理尺寸（半长）
        const boxShape = this.physics.createShape(boxGeometryPx, material, true, shapeFlags)
        return boxShape
    }

    /**
     * 创建球体形状
     * @author MY
     * @since 2026/02/02
     * @returns {*}  {Shape}
     * @param sphereShapeInfo
     * @param shapeFlags
     * @param material
     **/
    public createSphereShape(sphereShapeInfo: any, shapeFlags: any, material: any): any {
        let defaultParams = {
            radius: 1 // 半径
        }
        let param = merge(defaultParams, sphereShapeInfo)
        const sphereGeometryPx = new this.PhysXInstance.PxSphereGeometry(param.radius) // 物理尺寸（半长）
        const sphereShape = this.physics.createShape(sphereGeometryPx, material, true, shapeFlags)
        return sphereShape
    }

    /**
     * 创建胶囊体形状
     * PhysX 胶囊默认沿 X 轴；通过 axis 可指定为 Y 或 Z（会设置 shape 的 local pose 旋转）。
     * @author MY
     * @since 2026/03/05
     * @returns {*}  {Shape}
     * @param capsuleShapeInfo.axis - 胶囊轴线方向：'x' | 'y' | 'z'，默认 'y'（与 Y-up 场景一致）
     **/
    public createCapsuleShape(capsuleShapeInfo: any, shapeFlags: any, material: any): any {
        let defaultParams = {
            radius: 0.5, // 半径
            height: 2, // 高度
            axis: 'y' as 'x' | 'y' | 'z' // 胶囊轴线方向，默认 Y 轴（PhysX 原生为 X 轴）
        }
        let param = merge(defaultParams, capsuleShapeInfo)
        const capsuleGeometryPx = new this.PhysXInstance.PxCapsuleGeometry(param.radius, param.height / 2) // 物理尺寸（半长）
        const capsuleShape = this.physics.createShape(capsuleGeometryPx, material, true, shapeFlags)
        if (param.axis !== 'x') {
            const origin = this.createVec3({ x: 0, y: 0, z: 0 })
            // 绕 Z 轴 -90°：PhysX X 轴 -> 世界 Y 轴；绕 Y 轴 +90°：PhysX X 轴 -> 世界 Z 轴
            const halfAngle = Math.PI / 4
            const qx = 0
            const qy = param.axis === 'z' ? Math.sin(halfAngle) : 0
            const qz = param.axis === 'y' ? -Math.sin(halfAngle) : 0
            const qw = Math.cos(halfAngle)
            const quat = new this.PhysXInstance.PxQuat(qx, qy, qz, qw)
            const localPose = new this.PhysXInstance.PxTransform(origin, quat)
            capsuleShape.setLocalPose(localPose)
        }
        return capsuleShape
    }

    /**
     * 创建平面形状（PxPlaneGeometry 为无限大平面，无尺寸参数；法线由附着 actor 的 pose 决定）
     * @param _planeShapeInfo 保留参数以兼容调用方，几何本身无尺寸
     */
    public createPlaneShape(_planeShapeInfo: any, shapeFlags: any, material: any): any {
        const planeGeometryPx = new this.PhysXInstance.PxPlaneGeometry()
        return this.physics.createShape(planeGeometryPx, material, true, shapeFlags)
    }

    /**
     * 直接创建物理平面静态刚体（推荐）
     * 使用 PhysX CreatePlane：平面由法线 (nx,ny,nz) 和到原点距离 d 定义，方程 n·x + d = 0。
     * @param planeInfo.nx, ny, nz 法线方向，默认 (0,1,0) 即 Y 轴向上
     * @param planeInfo.d 沿法线到原点距离，默认 0（过原点）
     * @returns PxRigidStatic，需再加入场景
     */
    public createPlaneActor(planeInfo: any, material: any): any {
        const defaultParams = { nx: 0, ny: 1, nz: 0, d: 0 }
        const param = merge(defaultParams, planeInfo)
        const plane = new this.PhysXInstance.PxPlane(param.nx, param.ny, param.nz, param.d)
        return this.PhysXInstance.CreatePlane(this.physics, plane, material)
    }

    /**
     * 创建物理对象
     * @author MY
     * @since 2025/12/25
     * @returns {*}  {Actor}
     * @param actorInfo
     * @param shape
     **/
    public createPhysicsObject(actorInfo: any, shape: any): any {
        let defaultParams = {
            position: this.createVec3({ x: 0, y: 0, z: 0 })
        }
        let param = merge(defaultParams, actorInfo)
        const actor = this.physics.createRigidStatic(this.createVec3(param.position))
        actor.attachShape(shape)
        return actor
    }
    /**
     * 创建物理辅助线
     * @author MY
     * @since 2026/01/20
     * @returns {*}  {Object3D}
     * @param model 模型
     * @param helperInfo 辅助线信息
     **/
    public createHelperObject(model: any, helperInfo: any): any {
        const defaultParams = {
            modelName: 'helper',
            modelType: 'cube',
            position: { x: 0, y: 0, z: 0 },
            quaternion: { x: 0, y: 0, z: 0, w: 1 },
            base: {
                width: 10,
                height: 10,
                depth: 10,
                radius: 1
            }
        }
        let param = merge(defaultParams, helperInfo)
        const objContainer = this.TO.model.initGroup({
            modelName: param.modelName + '-helper'
        })
        objContainer.add(model)
        model.position.set(0, 0, 0)
        model.quaternion.set(0, 0, 0, 1)
        const wireframeMaterial = this.TO.material.initLineMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.6
        })
        let fallbackWireframe = null
        // box--辅助框
        switch (param.modelType) {
            case 'cube':
                fallbackWireframe = new BoxGeometry(param.base.width, param.base.height, param.base.depth)
                break
            case 'sphere':
                fallbackWireframe = new SphereGeometry(param.base.radius)
                break
        }
        const fallbackEdges = new EdgesGeometry(fallbackWireframe)
        const bboxHelper = new LineSegments(fallbackEdges, wireframeMaterial)
        bboxHelper.name = model.name + '-helperLine'
        objContainer.add(bboxHelper)
        objContainer.position.set(param.position.x, param.position.y, param.position.z)
        if (param.quaternion) {
            objContainer.quaternion.set(
                param.quaternion.x,
                param.quaternion.y,
                param.quaternion.z,
                param.quaternion.w
            )
        }
        return objContainer
    }

    /**
     * 更新辅助线框的大小
     * @author MY
     * @since 2026/01/20
     * @param container 包含辅助线框的容器对象
     * @param newSize 新的尺寸 { width, height, depth }
     * @returns {boolean} 是否成功更新
     **/
    public updateHelperObjectSize(
        container: any,
        newSize: { width: number; height: number; depth: number }
    ): boolean {
        if (!container || !container.children) {
            console.warn('容器对象不存在或没有子对象')
            return false
        }

        // 查找容器中的LineSegments（辅助线框）
        const helperLineSegments = container.children.find(
            (child: any) => child.isLineSegments || child.type === 'LineSegments'
        )

        if (!helperLineSegments) {
            console.warn('未找到辅助线框对象')
            return false
        }

        // 保存旧的几何体
        const oldEdgesGeometry = helperLineSegments.geometry

        // 创建新的BoxGeometry和EdgesGeometry
        const newBoxGeometry = new BoxGeometry(newSize.width, newSize.height, newSize.depth)
        const newEdgesGeometry = new EdgesGeometry(newBoxGeometry)

        // 替换几何体
        helperLineSegments.geometry = newEdgesGeometry

        // 释放旧的EdgesGeometry
        // 注意：EdgesGeometry在创建时已经从原始BoxGeometry提取了边缘信息，
        // 创建了新的BufferGeometry，所以只需要释放EdgesGeometry即可
        if (oldEdgesGeometry && typeof oldEdgesGeometry.dispose === 'function') {
            oldEdgesGeometry.dispose()
        }

        // 释放新创建的BoxGeometry
        // 注意：EdgesGeometry已经提取了边缘信息，不再需要原始的BoxGeometry
        newBoxGeometry.dispose()

        console.log('已更新辅助线框大小:', newSize)
        return true
    }

    /**
     * 射线检测
     * @param origin 射线起点 { x, y, z }
     * @param direction 射线方向（需归一化）{ x, y, z }
     * @param maxDistance 最大检测距离
     * @returns 检测结果 { hit: 是否命中, position?: 命中点, normal?: 法线, distance?: 距离, actor?: 命中的Actor }
     * @author MY
     * @since 2026/03/02
     **/
    public raycast(
        origin: { x: number; y: number; z: number },
        direction: { x: number; y: number; z: number },
        maxDistance: number = 1000
    ): {
        hit: boolean
        position?: { x: number; y: number; z: number }
        normal?: { x: number; y: number; z: number }
        distance?: number
        actor?: any
        shape?: any
    } {
        if (!this.pxScene || !this.PhysXInstance) {
            console.warn('PhysX 未初始化或场景未创建')
            return { hit: false }
        }

        const originVec = this.createVec3(origin)
        const dirVec = this.createVec3(direction)
        // PxRaycastBuffer10 有 touch buffer 时，默认所有命中为 touching 而非 blocking，故 hasBlock 恒为 false，结果在 touches 中
        const raycastBuffer = new this.PhysXInstance.PxRaycastBuffer10()
        const hitFlags = new this.PhysXInstance.PxHitFlags(
            this.PhysXInstance.PxHitFlagEnum.ePOSITION | this.PhysXInstance.PxHitFlagEnum.eNORMAL
        )
        // console.log('this.pxScene:::::::', this.pxScene)
        // const pxActors = this.pxScene.getActors()
        const result = {
            hit: false,
            hitActors: [],
            nearestActor: null,
            hitDistance: maxDistance,
            hitPosition: { x: 0, y: 0, z: 0 },
            hitNormal: { x: 0, y: 0, z: 0 }
        }

        if (this.pxScene.raycast(originVec, dirVec, maxDistance, raycastBuffer)) {
            console.log('raycastBuffer.nbAnyHits:::::::', raycastBuffer, raycastBuffer.getNbAnyHits())
            let minDist = maxDistance
            let nearestHit = null
            let nearestActor = null
            for (let i = 0; i < raycastBuffer.getNbAnyHits(); i++) {
                const hit = raycastBuffer.getAnyHit(i)
                console.log('hit:::::::', hit)
                // const actor = pxActors[hit.actor.ptr]
                const actor = hit.actor
                if (actor != null && hit.distance < minDist) {
                    // 命中的 actor 都存起来
                    result.hitActors.push(actor)
                    minDist = hit.distance
                    nearestHit = hit
                    nearestActor = actor
                }
            }
            if (nearestHit !== null) {
                result.nearestActor = nearestActor
                result.hitDistance = minDist
                // PxRaycastHit.position/normal 是 PxVec3，使用 get_x/get_y/get_z 读取
                result.hitPosition.x = nearestHit.position.get_x()
                result.hitPosition.y = nearestHit.position.get_y()
                result.hitPosition.z = nearestHit.position.get_z()
                result.hitNormal.x = nearestHit.normal.get_x()
                result.hitNormal.y = nearestHit.normal.get_y()
                result.hitNormal.z = nearestHit.normal.get_z()
                console.log('result:::::::', result)
                return {
                    hit: result.nearestActor !== null,
                    position: result.hitPosition,
                    normal: result.hitNormal,
                    distance: result.hitDistance,
                    actor: result.nearestActor,
                    shape: nearestHit.shape
                }
            }
        }

        // const hit = this.pxScene.raycast(originVec, dirVec, maxDistance, raycastBuffer)
        // const touch = raycastBuffer.getNbTouches() > 0 ? raycastBuffer.getTouch(0) : null
        // const anyHit = raycastBuffer.getAnyHit()
        // console.log('anyHit:::::::', anyHit)
        // if (hit && touch) {
        //     return {
        //         hit: true,
        //         position: {
        //             x: touch.position.get_x(),
        //             y: touch.position.get_y(),
        //             z: touch.position.get_z(),
        //         },
        //         normal: {
        //             x: touch.normal.get_x(),
        //             y: touch.normal.get_y(),
        //             z: touch.normal.get_z(),
        //         },
        //         distance: touch.distance,
        //         actor: touch.actor,
        //         shape: touch.shape,
        //     }
        // }
        return { hit: false }
    }

    /**
     * 射线检测（带 JS 过滤回调）
     * - 基于已有的 PxRaycastBuffer10，不再直接碰 PxQueryFilterCallbackImpl，避免 WASM 内存越界问题
     * - 遍历所有命中结果，按距离从近到远找到第一个通过 onRaycast 的对象
     */
    public raycastWithFilter(
        origin: { x: number; y: number; z: number },
        direction: { x: number; y: number; z: number },
        maxDistance: number,
        onRaycast: (shapeOrActorId: number) => boolean
    ): {
        hit: boolean
        shapeId?: number
        distance?: number
        position?: { x: number; y: number; z: number }
        normal?: { x: number; y: number; z: number }
    } {
        if (!this.pxScene || !this.PhysXInstance) {
            console.warn('PhysX 未初始化或场景未创建')
            return { hit: false }
        }

        const PhysXInstance = this.PhysXInstance
        const originVec = this.createVec3(origin)
        const dirVec = this.createVec3(direction)

        // 仍然使用 PxRaycastBuffer10，让底层按正常方式写入结果
        const raycastBuffer = new PhysXInstance.PxRaycastBuffer10()

        if (!this.pxScene.raycast(originVec, dirVec, maxDistance, raycastBuffer)) {
            return { hit: false }
        }

        let nearestHit: any = null
        let minDist = maxDistance

        const nbHits = raycastBuffer.getNbAnyHits()
        for (let i = 0; i < nbHits; i++) {
            const hit = raycastBuffer.getAnyHit(i)
            const actor = hit.actor
            const shape = hit.shape
            const id = actor && actor.ptr ? actor.ptr : shape && shape.ptr ? shape.ptr : 0

            if (!onRaycast(id)) {
                continue
            }

            if (hit.distance < minDist) {
                minDist = hit.distance
                nearestHit = hit
            }
        }

        if (!nearestHit) {
            return { hit: false }
        }

        const pxPos = nearestHit.position
        const pxNormal = nearestHit.normal
        const pos = { x: pxPos.get_x(), y: pxPos.get_y(), z: pxPos.get_z() }
        const n = { x: pxNormal.get_x(), y: pxNormal.get_y(), z: pxNormal.get_z() }
        const shape = nearestHit.shape
        const shapeId = shape && shape.ptr ? shape.ptr : 0
        return {
            hit: true,
            shapeId,
            distance: minDist,
            position: pos,
            normal: n
        }
    }

    /**
     * 设置碰撞检测模式
     * @param actor 物理刚体对象
     * @param collisionDetectionMode 碰撞检测模式: Continuous, ContinuousDynamic, ContinuousSpeculative, Discrete
     * @author MY
     * @since 2026/03/18
     **/
    public setCollisionDetectionMode(actor: any, collisionDetectionMode: string): void {
        switch (collisionDetectionMode) {
            case 'Continuous':
                actor.setRigidBodyFlag(this.PhysXInstance.PxRigidBodyFlagEnum.eENABLE_CCD, true)
                break
            case 'ContinuousDynamic':
                actor.setRigidBodyFlag(this.PhysXInstance.PxRigidBodyFlagEnum.eENABLE_CCD, true)
                actor.setRigidBodyFlag(this.PhysXInstance.PxRigidBodyFlagEnum.eENABLE_CCD_FRICTION, true)
                break
            case 'ContinuousSpeculative':
                actor.setRigidBodyFlag(this.PhysXInstance.PxRigidBodyFlagEnum.eENABLE_CCD, true)
                actor.setRigidBodyFlag(this.PhysXInstance.PxRigidBodyFlagEnum.eENABLE_SPECULATIVE_CCD, true)
                break
            case 'Discrete':
                actor.setRigidBodyFlag(this.PhysXInstance.PxRigidBodyFlagEnum.eENABLE_CCD, true)
                actor.setRigidBodyFlag(this.PhysXInstance.PxRigidBodyFlagEnum.eENABLE_CCD_FRICTION, true)
                actor.setRigidBodyFlag(this.PhysXInstance.PxRigidBodyFlagEnum.eENABLE_SPECULATIVE_CCD, false)
                break
        }
    }
}
