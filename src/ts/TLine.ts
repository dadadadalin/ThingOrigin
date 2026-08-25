/**
 * @module
 * @mergeModuleWith <project>
 */

import {
    ArrowHelper,
    BufferGeometry,
    CatmullRomCurve3,
    Color,
    Group,
    Line,
    LineBasicMaterial,
    Object3D,
    Mesh,
    MeshPhongMaterial,
    SphereGeometry,
    TubeGeometry,
    Vector3,
} from 'three'
import { merge } from 'lodash-es'
import { setModelConfig } from '../private/privateTool'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial'
import { Line2 } from 'three/examples/jsm/lines/Line2'
import * as TWEEN from '@tweenjs/tween.js'

import { TMaterial } from './TMaterial'
import { modelInfoParams } from './TModelInterfaces'
import { ThingOrigin } from '../ThingOrigin'
import { RESOURCE_SERVER_BASE } from '../../public/data/sceneParams'

/**
 * 线条模型
 */
export class TLine {
    private TO: ThingOrigin
    /** 材质 */
    private material: TMaterial

    constructor(TO: ThingOrigin) {
        this.TO = TO
        this.material = new TMaterial(TO)
    }

    /**
     * 创建线
     * @author LL
     * @since 2022-04-28
     * @param {modelInfoParams} modelInfo 模型参数
     */
    public initLine(modelInfo?: modelInfoParams): Line {
        let defaultParams = {
            modelName: 'line-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0,
            },
            scale: {
                x: 1,
                y: 1,
                z: 1,
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0,
            },
            base: {
                p1: {
                    x: 0,
                    y: 0,
                    z: 0,
                },
                p2: {
                    x: 10,
                    y: 10,
                    z: 10,
                },
            },
            material: {
                color: '#f00',
            },
        }
        let param = merge(defaultParams, modelInfo)
        let lineMaterial = new LineBasicMaterial({ color: param.material.color })

        let points = []
        points.push(new Vector3(param.base.p1.x, param.base.p1.y, param.base.p1.z))
        points.push(new Vector3(param.base.p2.x, param.base.p2.y, param.base.p2.z))

        let lineGeometry = new BufferGeometry().setFromPoints(points)
        let line = new Line(lineGeometry, lineMaterial)

        return setModelConfig(line, param) as Line
    }

    /**
     * 创建胖线
     * @author LL
     * @since 2024-09-09
     * @param {modelInfoParams} modelInfo 模型参数
     */
    public initFatLine(modelInfo?: modelInfoParams) {
        let defaultParams = {
            modelName: 'fatLine-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0,
            },
            scale: {
                x: 1,
                y: 1,
                z: 1,
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0,
            },
            base: {
                points: [
                    {
                        x: 0,
                        y: 0,
                        z: 0,
                    },
                    {
                        x: 20,
                        y: 20,
                        z: 20,
                    },
                ],
                colors: [
                    {
                        r: 1,
                        g: 0,
                        b: 0,
                    },
                    {
                        r: 1,
                        g: 0,
                        b: 0,
                    },
                ],
            },
            material: {
                lineWidth: 5,
                dash: false,
            },
        }
        let param = merge(defaultParams, modelInfo)

        const geometry = new LineGeometry()

        let p = []

        param.base.points.map((item) => {
            p.push(item.x, item.y, item.z)
        })
        geometry.setPositions(p)

        let c = []
        param.base.colors.map((item) => {
            c.push(item.r, item.g, item.b)
        })
        geometry.setColors(c)

        let matLine = new LineMaterial({
            color: 0xffffff,
            linewidth: param.material.lineWidth, // in world units with size attenuation, pixels otherwise
            vertexColors: true,

            dashed: param.material.dash,
            alphaToCoverage: true,
        })

        let line = new Line2(geometry, matLine)
        line.computeLineDistances()

        return setModelConfig(line, param)
    }

    /**
     * 生成管道
     * @author LL
     * @since 2024/10/22
     * @param {modelInfoParams} [modelInfo] 模型参数
     */
    public async initPipe(modelInfo?: modelInfoParams) {
        let defaultParams = {
            modelName: 'pipe-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0,
            },
            scale: {
                x: 1,
                y: 1,
                z: 1,
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0,
            },
            base: {
                points: [
                    {
                        x: 0,
                        y: 0,
                        z: 0,
                    },
                    {
                        x: 20,
                        y: 20,
                        z: 20,
                    },
                ],
                radius: 1,
                imgUrl: this.TO.sceneData.params.resource.serverAddress + '/image/download/doubleArrow.png',
                repeatX: 'auto',
                repeatY: 4,
            },
            userData: {},
        }
        let param = merge(defaultParams, modelInfo)

        let curveArr = []
        param.base.points.forEach((point) => {
            let v3 = new Vector3(point.x, point.y, point.z)
            curveArr.push(v3)
        })

        const curve = new CatmullRomCurve3(curveArr)

        let wholeLength = curve.getLength()
        // 自动模式下：每 1 单位长度渲染 3 个纹理重复
        let repeatX = param.base.repeatX == 'auto' ? wholeLength * 3 : param.base.repeatX

        // 加载图片材质
        const texture = await this.material.initTextureMap({
            url: param.base.imgUrl,
            mapType: 'map',
            repeat: [repeatX, param.base.repeatY],
        })

        // 创建一个管状几何体，基于曲线
        const tubeGeometry = new TubeGeometry(curve, 64, param.base.radius)

        // 创建材质
        const material = new MeshPhongMaterial({
            map: texture,
            transparent: true,
        })

        // 创建网格对象
        const mesh = new Mesh(tubeGeometry, material)

        param.userData.repeat = {
            x: repeatX,
            y: param.base.repeatY,
        }

        return setModelConfig(mesh, param)
    }

    /**
     * 创建带流向的线
     * @author LL
     * @since 2024/10/21
     * @param {modelInfoParams} [modelInfo] 模型参数
     */
    public async initFlowLine(modelInfo?: modelInfoParams): Promise<Object3D> {
        let defaultParams = {
            modelName: 'flowLine-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0,
            },
            scale: {
                x: 1,
                y: 1,
                z: 1,
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0,
            },
            base: {
                points: [
                    {
                        x: 0,
                        y: 0,
                        z: 0,
                    },
                    {
                        x: 20,
                        y: 20,
                        z: 20,
                    },
                ],
                radius: 1,
                imgUrl: this.TO.sceneData.params.resource.serverAddress + '/image/download/arrow.png',
                speed: 1,
                repeatX: 'auto',
                repeatY: 4,
            },
            userData: {},
        }
        let param = merge(defaultParams, modelInfo)

        let curveArr = []

        param.base.points.forEach((point) => {
            let v3 = new Vector3(point.x, point.y, point.z)
            curveArr.push(v3)
        })
        var curve = new CatmullRomCurve3(curveArr)

        var tubeGeometry = new TubeGeometry(curve, 64, param.base.radius)
        // 使用缩放后的线长做纹理密度和速度换算，避免不同长度/缩放下纹理被拉伸
        const scaleX = Number(param.scale?.x) || 1
        const scaleY = Number(param.scale?.y) || 1
        const scaleZ = Number(param.scale?.z) || 1
        const scaledCurveArr: Vector3[] = []
        param.base.points.forEach((point) => {
            scaledCurveArr.push(new Vector3(point.x * scaleX, point.y * scaleY, point.z * scaleZ))
        })
        const scaledCurve = new CatmullRomCurve3(scaledCurveArr)
        let wholeLength = scaledCurve.getLength()
        // repeatX 与线长成正比：每 1 单位长度渲染 3 个重复
        let repeatX = param.base.repeatX == 'auto' ? wholeLength * 3 : param.base.repeatX
        // 加载图片材质
        let texture = await this.material.initTextureMap({
            url: param.base.imgUrl,
            mapType: 'map',
            repeat: [repeatX, param.base.repeatY],
        })

        // 设置管道纹理偏移数,便于对中
        texture.offset.y = 0.5
        var tubeMaterial = new MeshPhongMaterial({
            map: texture,
            transparent: true,
        })
        var tube = new Mesh(tubeGeometry, tubeMaterial)
        // 使用 requestAnimationFrame + deltaTime，并按线长归一化，确保不同线长下流速一致
        let lastTime = performance.now()
        const animateTexture = (now = performance.now()) => {
            const deltaSeconds = (now - lastTime) / 1000
            lastTime = now
            const speed = Math.max(Number(param.base.speed) || 0, 0)
            const offsetPerSecond = wholeLength > 0 ? (speed * repeatX) / wholeLength : 0
            texture.offset.x -= offsetPerSecond * deltaSeconds
            requestAnimationFrame(animateTexture)
        }
        requestAnimationFrame(animateTexture)

        param.userData.repeat = {
            x: repeatX,
            y: param.base.repeatY,
        }
        return setModelConfig(tube, param)
    }

    /**
     * 生成箭头
     * @author LL
     * @since 24/12/2021
     * @param {modelInfoParams} [modelInfo] 模型参数
     */
    public initArrow(modelInfo?: modelInfoParams): Object3D {
        let defaultParams = {
            modelName: 'arrow-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0,
            },
            scale: {
                x: 1,
                y: 1,
                z: 1,
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0,
            },
            base: {
                start: {
                    x: 0,
                    y: 0,
                    z: 0,
                },
                end: {
                    x: 10,
                    y: 10,
                    z: 10,
                },
                headLength: 3,
                headWidth: 2,
                length: 10,
            },
            material: {
                color: '#f00',
            },
        }
        let param = merge(defaultParams, modelInfo)

        const dirVector3 = new Vector3(param.base.start.x, param.base.start.y, param.base.start.z)
        dirVector3.normalize()
        const originVector3 = new Vector3(param.base.end.x, param.base.end.y, param.base.end.z)
        const arrowHelper = new ArrowHelper(
            dirVector3,
            originVector3,
            param.base.length,
            new Color(param.material.color).getHex(),
            param.base.headLength,
            param.base.headWidth,
        )
        return setModelConfig(arrowHelper, param)
    }

    /**
     * 获取直线段的方向向量(世界坐标)
     * @author LL
     * @since 2025/03/26
     * @param {*} line
     */
    public getLineDirection(line: Line) {
        // 获取几何体顶点数据
        const geometry = line.geometry
        const vertices = geometry.attributes.position.array

        if (vertices.length > 6) {
            console.warn('非直线线段')
            return
        }

        // 提取起点和终点（适用于Line类型的几何体）
        const start = new Vector3(vertices[0], vertices[1], vertices[2])
        const end = new Vector3(vertices[3], vertices[4], vertices[5])

        // 转换为世界坐标
        start.applyMatrix4(line.matrixWorld)
        end.applyMatrix4(line.matrixWorld)

        // 计算方向向量
        return end.clone().sub(start).normalize()
    }

    /**
     * 获取线段中心点（世界坐标）
     * @author LL
     * @since 2025/03/26
     * @param {Line} line
     */
    public getLineCenter(line: Line) {
        line.updateMatrixWorld()
        const geometry = line.geometry
        geometry.computeBoundingBox()
        const center = new Vector3()
        geometry.boundingBox!.getCenter(center)
        return center.applyMatrix4(line.matrixWorld)
    }

    // ==================== 路径可视化相关静态变量 ====================
    private static tweenAnimationStarted: boolean = false
    private static arrowGroups: Map<string, Group> = new Map()
    private static pathTotalLengths: Map<string, number> = new Map()
    private static pathSegmentsData: Map<string, any[]> = new Map()
    private static pathGenerationFlags: Map<string, boolean> = new Map()
    private static pathGenerationParams: Map<
        string,
        {
            arrowSpacing: number
            arrowSpeed: number
            arrowSize: { width: number; height: number }
            arrowUrl: string
            mode?: 'continuous' | 'tiled'
            onFirstArrowComplete?: () => void
        }
    > = new Map()
    private static firstArrowCompleted: Map<string, boolean> = new Map()

    /**
     * 计算路径方向的旋转值
     * @author gj
     * @since 2026/01/05
     * @param {number} dx X方向差值
     * @param {number} dz Z方向差值
     * @returns {Object} 旋转值对象
     */
    private calculatePathRotation(dx: number, dz: number) {
        let rotationX = 0
        let rotationY = 0
        let rotationZ = 0

        if (dx === 0 && dz === 0) {
            return { rotationX, rotationY, rotationZ }
        }

        const angle = Math.atan2(dz, dx)
        rotationX = Math.PI / 2
        rotationY = 0
        rotationZ = angle

        return { rotationX, rotationY, rotationZ }
    }

    /**
     * 创建箭头平面
     * @author gj
     * @since 2026/01/05
     * @param {Object} arrowSize 箭头大小
     * @param {string} arrowUrl 箭头图片URL
     * @returns {Promise<Object3D>} 箭头平面对象
     */
    private async createArrowPlane(
        arrowSize: { width: number; height: number },
        arrowUrl: string,
    ): Promise<Object3D> {
        const plane = await this.TO.model.initPlane({
            base: {
                type: 'rect',
                rect: {
                    width: arrowSize.width,
                    height: arrowSize.height,
                },
            },
            material: {
                type: 'image',
                doubleSide: true,
                image: {
                    url: arrowUrl,
                    repeatX: 1,
                    repeatY: 1,
                },
            },
        })
        return plane
    }

    /**
     * 根据距离更新箭头位置
     * @author gj
     * @since 2026/01/05
     * @param {Object3D} arrow 箭头对象
     * @param {number} distance 距离值
     */
    private updateArrowPosition(arrow: Object3D, distance: number) {
        const pathSegments = (arrow.userData as any).pathSegments
        const totalLength = (arrow.userData as any).totalLength

        if (distance >= totalLength || distance < 0) {
            return
        }

        for (const segment of pathSegments) {
            if (distance >= segment.startDistance && distance <= segment.endDistance) {
                const segmentProgress = (distance - segment.startDistance) / segment.length

                const x = segment.start.x + (segment.end.x - segment.start.x) * segmentProgress
                const y = segment.start.y + 2
                const z = segment.start.z + (segment.end.z - segment.start.z) * segmentProgress

                arrow.position.set(x, y, z)

                const dx = segment.end.x - segment.start.x
                const dz = segment.end.z - segment.start.z

                const { rotationX, rotationY, rotationZ } = this.calculatePathRotation(dx, dz)
                arrow.rotation.set(rotationX, rotationY, rotationZ)
                break
            }
        }
    }

    /**
     * 启动箭头动画（支持完成回调）
     * @author gj
     * @since 2026/01/05
     * @param arrow 箭头对象
     * @param arrowGroup 箭头组
     * @param onComplete 可选完成回调
     */
    private startArrowAnimation(arrow: Object3D, arrowGroup: Group, onComplete?: () => void) {
        const userData = arrow.userData as any
        const speed = userData.speed
        const totalLength = userData.totalLength
        const initialOffset = userData.initialOffset

        if (userData.tween) {
            userData.tween.stop()
            userData.tween = null
        }

        const remainingDistance = totalLength - initialOffset
        if (remainingDistance <= 0) {
            this.destroyArrow(arrow, arrowGroup)
            onComplete?.()
            return
        }

        const duration = (remainingDistance / speed) * 1000
        const tweenData = { distance: initialOffset }

        userData.tween = new TWEEN.Tween(tweenData)
            .to({ distance: totalLength }, duration)
            .easing(TWEEN.Easing.Linear.None)
            .onStart(() => {})
            .onUpdate(() => {
                this.updateArrowPosition(arrow, tweenData.distance)
            })
            .onComplete(() => {
                this.destroyArrow(arrow, arrowGroup)
                onComplete?.()
            })
            .start()
    }

    /**
     * 创建单个箭头
     * @author gj
     * @since 2026/01/05
     * @param pathId 路径ID
     * @param arrowGroup 箭头组
     * @param initialOffset 初始偏移
     * @param pathSegments 路径段数据
     * @param totalLength 总长度
     * @param arrowSpeed 箭头速度
     * @param arrowSize 箭头大小
     * @param arrowUrl 箭头图片URL
     * @param deferAnimation true 时只摆放不启动动画
     * @param isFirstArrow 为 true 时走完路径会触发 path 的 onFirstArrowComplete（仅应有一条）
     * @param onComplete 可选动画完成回调（仅在动画自然结束时触发）
     */
    private async createSingleArrow(
        pathId: string,
        arrowGroup: Group,
        initialOffset: number,
        pathSegments: any[],
        totalLength: number,
        arrowSpeed: number,
        arrowSize: { width: number; height: number },
        arrowUrl: string,
        deferAnimation: boolean = false,
        isFirstArrow: boolean = false,
        onComplete?: () => void,
    ) {
        try {
            const arrow = await this.createArrowPlane(arrowSize, arrowUrl)
            arrow.scale.set(1, 1, 1)

            arrow.userData = {
                name: `arrow_${pathId}_${Date.now()}_${Math.random()}`,
                speed: arrowSpeed,
                initialOffset: initialOffset,
                pathSegments: pathSegments,
                totalLength: totalLength,
                tween: null,
                pathId: pathId,
                ...(isFirstArrow ? { isFirstArrow: true } : {}),
            }

            arrow.rotation.set(0, 0, 0)
            arrowGroup.add(arrow)

            this.updateArrowPosition(arrow, initialOffset)
            if (!deferAnimation) {
                this.startArrowAnimation(arrow, arrowGroup, onComplete)
            } else {
                // 即使 defer，也把 onComplete 存起来，待启动动画时使用
                if (onComplete) {
                    (arrow.userData as any).deferredOnComplete = onComplete
                }
            }
        } catch (error) {
            console.error('创建箭头时出错:', error)
        }
    }

    /**
     * 启动所有延迟箭头的动画（用于 tiled 模式初始化后统一启动）
     */
    private startAllDeferredArrows(arrowGroup: Group, pathId: string) {
        for (const child of arrowGroup.children) {
            const userData = (child as any).userData
            if (userData && userData.pathId === pathId && !userData.tween) {
                const onComplete = userData.deferredOnComplete
                this.startArrowAnimation(child, arrowGroup, onComplete)
                delete userData.deferredOnComplete
            }
        }
    }

    /**
     * tiled 模式实现：一次性铺满整条路径，每个箭头走完全程后自动在起点创建新箭头，实现无缝循环
     */
    private async runTiledMode(pathId: string) {
        const arrowGroup = TLine.arrowGroups.get(pathId)
        if (!arrowGroup) return

        const params = TLine.pathGenerationParams.get(pathId)
        const pathSegments = TLine.pathSegmentsData.get(pathId)
        const totalLength = TLine.pathTotalLengths.get(pathId)
        if (!params || !pathSegments || !totalLength) return

        const { arrowSpacing, arrowSpeed, arrowSize, arrowUrl } = params
        // 计算需要的箭头数量（至少为1）
        const arrowCount = Math.max(1, Math.ceil(totalLength / arrowSpacing))

        // 定义循环创建函数：在起点创建一个新箭头并启动动画，且该新箭头完成时再次调用自身
        const createCyclicArrow = async () => {
            if (!TLine.pathGenerationFlags.get(pathId)) return
            await this.createSingleArrow(
                pathId,
                arrowGroup,
                0,                     // 始终从起点开始
                pathSegments,
                totalLength,
                arrowSpeed,
                arrowSize,
                arrowUrl,
                false,                // 立即启动动画
                false,
                () => createCyclicArrow() // 完成时再次创建
            )
        }

        // 一次性创建所有初始箭头，全部 defer，稍后统一启动
        for (let i = 0; i < arrowCount; i++) {
            if (!TLine.pathGenerationFlags.get(pathId)) return
            const initialOffset = i * arrowSpacing
            if (initialOffset >= totalLength) break
            // 每个箭头完成时都创建新箭头（循环再生）
            await this.createSingleArrow(
                pathId,
                arrowGroup,
                initialOffset,
                pathSegments,
                totalLength,
                arrowSpeed,
                arrowSize,
                arrowUrl,
                true,                 // deferAnimation = true
                i === 0,
                () => createCyclicArrow()
            )
        }

        // 统一启动所有箭头的动画
        this.startAllDeferredArrows(arrowGroup, pathId)
    }

    /**
     * 持续生成箭头的循环（入口）
     */
    private async startContinuousArrowGeneration(pathId: string) {
        const arrowGroup = TLine.arrowGroups.get(pathId)
        if (!arrowGroup) return

        const params = TLine.pathGenerationParams.get(pathId)
        const pathSegments = TLine.pathSegmentsData.get(pathId)
        const totalLength = TLine.pathTotalLengths.get(pathId)
        if (!params || !pathSegments || !totalLength) return

        const mode = params.mode ?? 'continuous'

        if (mode === 'tiled') {
            await this.runTiledMode(pathId)
            return
        }

        // continuous 模式：原有逻辑（逐个生成并循环补箭）
        const { arrowSpacing, arrowSpeed, arrowSize, arrowUrl } = params
        const generationInterval = Math.max(100, (arrowSpacing / arrowSpeed) * 1000)
        const initialBatchCount = Math.max(1, Math.floor(totalLength / arrowSpacing))

        for (let i = 0; i < initialBatchCount; i++) {
            if (!TLine.pathGenerationFlags.get(pathId)) return
            await this.createSingleArrow(
                pathId,
                arrowGroup,
                0,
                pathSegments,
                totalLength,
                arrowSpeed,
                arrowSize,
                arrowUrl,
                false,
                i === 0
            )
            if (i < initialBatchCount - 1) {
                await this.delay(generationInterval)
            }
        }

        while (TLine.pathGenerationFlags.get(pathId)) {
            await this.delay(generationInterval)
            if (!TLine.pathGenerationFlags.get(pathId)) break
            await this.createSingleArrow(
                pathId,
                arrowGroup,
                0,
                pathSegments,
                totalLength,
                arrowSpeed,
                arrowSize,
                arrowUrl,
                false
            )
        }
    }

    /**
     * 销毁箭头（清理资源）
     */
    private destroyArrow(arrow: Object3D, arrowGroup: Group) {
        const userData = arrow.userData as any
        const pathId = userData?.pathId

        if (userData && userData.tween) {
            userData.tween.stop()
            userData.tween = null
        }

        if (arrowGroup && arrowGroup.children) {
            const index = arrowGroup.children.indexOf(arrow)
            if (index > -1) {
                arrowGroup.remove(arrow)
            }
        }

        if (arrow.parent) {
            arrow.parent.remove(arrow)
        }

        if ((arrow as any).geometry && (arrow as any).geometry.dispose) {
            (arrow as any).geometry.dispose()
        }
        if ((arrow as any).material) {
            if (Array.isArray((arrow as any).material)) {
                (arrow as any).material.forEach((mat: any) => {
                    if (mat.dispose) mat.dispose()
                })
            } else if ((arrow as any).material.dispose) {
                (arrow as any).material.dispose()
            }
        }

        // 触发第一个箭头完成回调（如果有）
        if (userData?.isFirstArrow && pathId) {
            const completed = TLine.firstArrowCompleted.get(pathId)
            if (!completed) {
                TLine.firstArrowCompleted.set(pathId, true)
                const params = TLine.pathGenerationParams.get(pathId)
                if (params && params.onFirstArrowComplete) {
                    params.onFirstArrowComplete()
                }
            }
        }
    }

    /**
     * 启动TWEEN动画循环
     */
    private startTweenAnimationLoop() {
        function animate() {
            requestAnimationFrame(animate)
            TWEEN.update()
        }
        animate()
    }

    /**
     * 创建路径点标记
     */
    private createPathMarkers(points: any[]) {
        points.forEach((point, index) => {
            const sphere = this.TO.model.initSphere({
                base: {
                    radius: 0.5,
                    widthSegments: 16,
                    heightSegments: 16,
                },
                material: {
                    color: index === 0 ? 0xff0000 : index === points.length - 1 ? 0x00ff00 : 0xffff00,
                },
            })
            sphere.position.set(point.x, point.y + 0.2, point.z)
            this.TO.scene.add(sphere)
        })
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    /**
     * 计算路径信息
     */
    private calculatePathInfo(points: any[]) {
        let totalLength = 0
        const pathSegments: any[] = []

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i]
            const p2 = points[i + 1]
            const length = Math.sqrt(
                Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2),
            )
            pathSegments.push({
                start: p1,
                end: p2,
                length: length,
                startDistance: totalLength,
                endDistance: totalLength + length,
            })
            totalLength += length
        }

        return { totalLength, pathSegments }
    }

    /**
     * 创建路径可视化
     * @author gj
     * @since 2026/01/05
     * @param {any[]} points 路径点
     * @param {Object} options 选项
     * @returns {Promise<Group | null>} 箭头组
     * @param {boolean} [options.showArrows=true] 是否显示箭头
     * @param {boolean} [options.showMarkers=true] 是否显示路径标记
     * @param {number} [options.arrowSpeed=10] 箭头速度
     * @param {Object} [options.arrowSize={ width: 6, height: 3 }] 箭头大小
     * @param {string} [options.arrowUrl] 箭头图片 URL，默认 `RESOURCE_SERVER_BASE + '/image/download/arrow_yellow.png'`
     * @param {string} [options.pathId='default_path'] 路径ID
     * @param {number} [options.spacing] 箭头间距
     * @param {string} [options.mode='continuous'] 模式
     * @param {() => void} [options.onFirstArrowComplete] 第一波次箭头完成回调
     */
    public async initPath(
        points: any[],
        options: {
            showArrows?: boolean
            showMarkers?: boolean
            arrowSpeed?: number
            arrowSize?: { width: number; height: number }
            arrowUrl?: string
            pathId?: string
            spacing?: number
            mode?: 'continuous' | 'tiled'
            onFirstArrowComplete?: () => void
        } = {},
    ): Promise<Group | null> {
        const defaultParams = {
            showArrows: true,
            showMarkers: true,
            arrowSpeed: 10,
            arrowSize: { width: 6, height: 3 },
            arrowUrl: `${RESOURCE_SERVER_BASE}/image/download/arrow_yellow.png`,
            pathId: 'default_path',
            spacing: undefined,
            mode: 'continuous' as const,
            onFirstArrowComplete: undefined
        }
        const param = merge(defaultParams, options)

        const uniquePathId = param.pathId
        let arrowGroup: Group | null = null

        if (param.showArrows) {
            try {
                const { totalLength, pathSegments } = this.calculatePathInfo(points)

                TLine.pathTotalLengths.set(uniquePathId, totalLength)
                TLine.pathSegmentsData.set(uniquePathId, pathSegments)

                if (TLine.arrowGroups.has(uniquePathId)) {
                    this.removePath(uniquePathId)
                }

                arrowGroup = this.TO.model.initGroup() as Group
                arrowGroup.userData = {
                    pathId: uniquePathId,
                    pathPoints: points,
                }
                arrowGroup.name = `arrowGroup_${uniquePathId}`
                TLine.arrowGroups.set(uniquePathId, arrowGroup)
                this.TO.scene.add(arrowGroup)

                if (!TLine.tweenAnimationStarted) {
                    this.startTweenAnimationLoop()
                    TLine.tweenAnimationStarted = true
                }

                let arrowSpacing: number
                if (param.spacing && param.spacing > 0) {
                    arrowSpacing = param.spacing
                } else {
                    arrowSpacing = Math.max(5, totalLength / 20)
                }

                TLine.pathGenerationParams.set(uniquePathId, {
                    arrowSpacing,
                    arrowSpeed: param.arrowSpeed,
                    arrowSize: param.arrowSize,
                    arrowUrl: param.arrowUrl,
                    mode: param.mode,
                    onFirstArrowComplete: param.onFirstArrowComplete,
                })

                TLine.firstArrowCompleted.set(uniquePathId, false)
                TLine.pathGenerationFlags.set(uniquePathId, true)

                if (param.showMarkers) {
                    this.createPathMarkers(points)
                }

                this.startContinuousArrowGeneration(uniquePathId).catch((error) => {
                    console.error('持续生成箭头时出错:', error)
                })
            } catch (error) {
                console.error('创建动态箭头时出错:', error)
            }
        } else {
            if (param.showMarkers) {
                this.createPathMarkers(points)
            }
        }

        return arrowGroup
    }

    /**
     * 移除路径可视化
     * @author gj
     * @since 2026/01/05
     * @param {Group | string} arrowGroupOrPathId 箭头组或路径ID
     */
    public removePath(arrowGroupOrPathId: Group | string) {
        let arrowGroup: Group | null = null
        let pathId: string | null = null

        if (typeof arrowGroupOrPathId === 'string') {
            pathId = arrowGroupOrPathId
            arrowGroup = TLine.arrowGroups.get(pathId)
        } else if (arrowGroupOrPathId && (arrowGroupOrPathId.userData as any)?.pathId) {
            pathId = (arrowGroupOrPathId.userData as any).pathId
            arrowGroup = arrowGroupOrPathId
        }

        if (pathId) {
            TLine.pathGenerationFlags.set(pathId, false)
        }

        if (arrowGroup) {
            const arrowsToDestroy = [...arrowGroup.children]
            arrowsToDestroy.forEach((arrow: Object3D) => {
                this.destroyArrow(arrow, arrowGroup!)
            })

            if (pathId) {
                TLine.arrowGroups.delete(pathId)
                TLine.pathTotalLengths.delete(pathId)
                TLine.pathSegmentsData.delete(pathId)
                TLine.pathGenerationFlags.delete(pathId)
                TLine.pathGenerationParams.delete(pathId)
                TLine.firstArrowCompleted.delete(pathId)
            }

            this.TO.scene.remove(arrowGroup)

            while (arrowGroup.children.length > 0) {
                arrowGroup.remove(arrowGroup.children[0])
            }
        }
    }

    /**
     * 获取指定路径的箭头数量
     * @author gj
     * @since 2026/01/05
     * @param {string} pathId 路径ID
     * @returns {number} 箭头数量
     */
    public getPathArrowCount(pathId: string): number {
        const arrowGroup = TLine.arrowGroups.get(pathId)
        return arrowGroup ? arrowGroup.children.length : 0
    }

    /**
     * 清空所有路径可视化
     * @author gj
     * @since 2026/01/05
     */
    public clearAllPath() {
        for (const [pathId, arrowGroup] of TLine.arrowGroups) {
            this.removePath(arrowGroup)
        }
        TLine.arrowGroups.clear()
        TLine.pathTotalLengths.clear()
        TLine.pathSegmentsData.clear()
        TLine.pathGenerationFlags.clear()
        TLine.pathGenerationParams.clear()
        TLine.firstArrowCompleted.clear()
    }

    /**
     * 获取所有路径ID
     * @author gj
     * @since 2026/01/05
     * @returns {string[]} 所有路径ID
     */
    public getAllPathIds(): string[] {
        return Array.from(TLine.arrowGroups.keys())
    }
}