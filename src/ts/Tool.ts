/**
 * @module
 * @mergeModuleWith <project>
 */

import {
    Box3,
    Color,
    Matrix4,
    Object3D,
    Sphere,
    Vector3,
    Timer,
    Mesh,
    Matrix3,
    Vector4,
    Euler,
    EulerOrder,
    Quaternion,
    Vector2,
    Group,
    MathUtils
} from 'three'
import { xyz } from './scenePrams'

/**
 * 自定义工具方法
 */
export class Tool {
    /**
     * @description 获取模型局部坐标轴方向
     * @author LL
     * @since 2026/01/04
     * @param obj 模型
     * @returns {*}  {Vector3}
     */
    public getModelLocalAxes(obj: Object3D) {
        if (!obj) return null

        // 更新对象的矩阵，确保获取的是最新的方向
        obj.updateMatrixWorld(true)

        // 从对象的矩阵中提取局部坐标轴方向
        // matrix 的前三列分别代表 x, y, z 轴的方向向量
        const matrix = obj.matrixWorld || obj.matrix

        // 局部 x 轴方向（通常是红色轴）
        const localX = {
            x: matrix.elements[0],
            y: matrix.elements[1],
            z: matrix.elements[2]
        }

        // 局部 y 轴方向（通常是绿色轴）
        const localY = {
            x: matrix.elements[4],
            y: matrix.elements[5],
            z: matrix.elements[6]
        }

        // 局部 z 轴方向（通常是蓝色轴）
        const localZ = {
            x: matrix.elements[8],
            y: matrix.elements[9],
            z: matrix.elements[10]
        }

        return {
            x: new Vector3(localX.x, localX.y, localX.z).normalize(), // 局部 x 轴（通常是旋转轴，对于关节来说）
            y: new Vector3(localY.x, localY.y, localY.z).normalize(), // 局部 y 轴
            z: new Vector3(localZ.x, localZ.y, localZ.z).normalize() // 局部 z 轴
        }
    }

    /**
     * 获取模型JSON数据
     * @author LL
     * @since 2026/03/26
     * @param {Object3D} obj 模型
     * @return {*}  {Object}
     */
    getModelJson(obj: Object3D): Object {
        return obj.toJSON()
    }

    //todo   删除
    /**
     * 将带层级的关节树结构变成扁平化的关节数组
     * @author LL
     * @since 2026/04/24
     * @param {any} joints 关节树结构
     * @return {*}  {any[]}
     */
    getFlattenJoints(joints: any): any[] {
        const result: any[] = []
        const walk = (list: any[]) => {
            if (!Array.isArray(list)) return
            for (const j of list) {
                result.push(j)
                const kids = j.children
                if (Array.isArray(kids) && kids.length) walk(kids)
            }
        }
        walk(joints)
        return result
    }

    /**
     * 获取模型中心点位置
     * @author LL
     * @param {Object3D} obj 模型
     * @return {*}  {Vector3}
     */
    public getModelCenter(obj: Object3D): Vector3 {
        let box = this.getModelBox(obj)
        return box.getCenter(new Vector3())
    }

    /**
     * 获取模型包围盒
     * @author LL
     * @param {Object3D} obj 模型
     * @param {number} [scale=1] 系数：大于 1 放大包围盒尺寸，小于 1 缩小；中心点保持不变
     * @return {*}  {Box3}
     */
    public getModelBox(obj: Object3D, scale: number = 1) {
        const box = new Box3()
        // 通过传入的 object3D 对象来返回当前模型的最小大小，值可以使一个 mesh 也可以使 group
        box.expandByObject(obj)

        if (!scale || scale === 1) return box

        // 保持中心点不变：用原包围盒中心 + 按系数缩放后的尺寸重建 min/max
        const center = box.getCenter(new Vector3())
        const size = box.getSize(new Vector3()).multiplyScalar(scale)
        const half = size.multiplyScalar(0.5)

        const min = new Vector3(center.x - half.x, center.y - half.y, center.z - half.z)
        const max = new Vector3(center.x + half.x, center.y + half.y, center.z + half.z)

        return new Box3(min, max)
    }

    /**
     * 获取模型包围盒尺寸
     * @author LL
     * @since 2024/09/18
     * @param {Object3D} obj
     */
    public getModelSize(obj: Object3D) {
        let box = this.getModelBox(obj)
        return {
            max: box.max,
            min: box.min,
            width: box.max.x - box.min.x,
            height: box.max.y - box.min.y,
            depth: box.max.z - box.min.z,
            center: box.getCenter(new Vector3())
        }
    }

    /**
     * 获取模型的包裹球
     * @author LL
     * @param {Object3D} obj
     * @return {*}  {Sphere}
     */
    public getModelSphere(obj: Object3D): Sphere {
        if (!obj) {
            console.warn('获取包裹球失败，物体不存在')
            return
        }

        let center = this.getModelCenter(obj)

        let box = this.getModelBox(obj)
        let radius = center.distanceTo(new Vector3(box.max.x, box.max.y, box.max.z))

        return new Sphere(center, radius)
    }

    /**
     * 获取模型的子模型信息
     * @author LL
     * @param {Object3D} model 模型
     * @returns {*}  {Object3D[]}
     */
    public getChildrenInfo(model: Object3D): Object3D[] {
        if (!model) {
            console.warn('获取子模型失败，物体不存在')
            return
        }

        let info = []
        model.traverse((child) => {
            let infoData = {
                name: child.name,
                uuid: child.uuid,
                parent: child.parent.uuid,
                type: child.type,
                position: child.position,
                rotation: child.rotation,
                scale: child.scale,
                ownMarker: this.ownMarker(child)
            }
            info.push(infoData)
        })

        info.splice(0, 1)
        return info
    }

    /**
     * 获取模型信息
     * @author LL
     * @since 2021/08/19
     * @param {Object3D} model 模型
     * @returns {*}  {object}
     */
    public getModelInfo(model: Object3D): object {
        if (!model) {
            console.warn('获取信息失败，物体不存在')
            return
        }
        let info = new Object()
        info['name'] = model.name
        info['modelName'] = model.name
        info['position'] = model.position
        info['rotation'] = model.rotation
        info['scale'] = model.scale
        info['type'] = model.type
        info['uuid'] = model.uuid
        info['ownMarker'] = this.ownMarker(model)
        info['visible'] = model.visible
        info['userData'] = model['userData']
        info['box3'] = this.getModelSize(model)
        info['hierarchy'] = model['userData']?.hierarchy
        info['gatewayMachine'] = model['userData']?.gatewayMachine
        info['sim'] = model['userData']?.sim
        info['physics'] = model['userData']?.physics
        info['material'] = model['userData']?.material ?? []

        return info
    }

    /**
     * 获取模型顶点数
     * @author gj
     * @since 2023/5/16
     * @param {Object3D} model 模型
     * @returns {*}  {number} 顶点数
     */
    public getModelVertex(model: Object3D): number {
        if (!model) {
            console.warn('获取信息失败，物体不存在')
            return
        }

        let vertices = 0 //模型顶点
        model.traverseVisible((object) => {
            if ((object as Mesh).isMesh) {
                let geometry = (object as Mesh).geometry
                if (geometry && geometry.isBufferGeometry) {
                    vertices += geometry.attributes.position.count
                }
            }
        })
        return vertices
    }

    /**
     * 获取模型三角面数
     * @author gj
     * @since 2023/5/16
     * @param {Object3D} model 模型
     * @returns {*}  {number} 三角面数
     */
    public getModelFace(model: Object3D): number {
        if (!model) {
            console.warn('获取信息失败，物体不存在')
            return
        }

        let triangles = 0 //模型面数
        model.traverseVisible((object) => {
            if ((object as Mesh).isMesh) {
                let geometry = (object as Mesh).geometry
                if (geometry && geometry.isBufferGeometry) {
                    if (geometry.index) {
                        triangles += geometry.index.array.length / 3
                    }
                }
            }
        })
        return triangles
    }

    /**
     * 计算两点间距离
     * @author LL
     * @param {xyz} start
     * @param {xyz} end
     * @return {*}  {number}
     */
    public getPointDistance(start: xyz, end: xyz): number {
        return new Vector3(start.x, start.y, start.z).distanceTo(new Vector3(end.x, end.y, end.z))
    }

    /**
     * 获取点到线的最小距离
     * @author LL
     * @since 2025/03/26
     * @param {*} point 点位置
     * @param {*} line 线数据
     */
    public getPointLineDistance(
        point: xyz,
        line: {
            start: xyz
            end: xyz
        }
    ): number {
        let lineStart = new Vector3(line.start.x, line.start.y, line.start.z)
        let lineEnd = new Vector3(line.end.x, line.end.y, line.end.z)
        let pointV3 = new Vector3(point.x, point.y, point.z)

        const lineVec = new Vector3().subVectors(lineEnd, lineStart)
        const pointVec = new Vector3().subVectors(pointV3, lineStart)
        const t = pointVec.dot(lineVec) / lineVec.lengthSq()
        const clampedT = Math.max(0, Math.min(1, t))
        const closestPoint = this.initVector3().copy(lineStart).add(lineVec.multiplyScalar(clampedT))
        return pointV3.distanceTo(closestPoint)
    }

    /**
     * 获取从当前位置朝向目标位置的角度
     * @author gj
     * @since 2025/09/08
     * @param currentPos 当前位置 {x: number, z: number}
     * @param targetPos 目标位置 {x: number, z: number}
     */
    public getFacingAngle(currentPos: { x: number; z: number }, targetPos: { x: number; z: number }): number {
        const dirX = targetPos.x - currentPos.x
        const dirZ = targetPos.z - currentPos.z
        return Math.atan2(dirX, dirZ)
    }

    /**
     * 标准化角度，确保角度在 [-π, π] 范围内，取最短旋转路径
     * @author gj
     * @since 2025/09/08
     * @param angle 原始角度(弧度)
     */
    public normalizeAngle(angle: number): number {
        while (angle > Math.PI) angle -= 2 * Math.PI
        while (angle < -Math.PI) angle += 2 * Math.PI
        return angle
    }

    /**
     * 获取模型世界坐标位置
     * @author LL
     * @since 2024/09/04
     * @param {Object3D} obj 模型
     * @returns {*}
     */
    public getWorldPosition(obj: Object3D): Vector3 {
        let position = new Vector3()
        obj.getWorldPosition(position)
        return position
    }

    /**
     * @description 获取世界坐标到局部坐标
     * @author LL
     * @since 2026/01/04
     * @param obj 模型
     * @param worldPosition 世界坐标系
     * @returns {*}
     */
    public getWorldToLocalPosition(obj: Object3D, worldPosition: Vector3 | xyz): Vector3 {
        let localCenter = new Vector3(worldPosition.x, worldPosition.y, worldPosition.z)
        return obj.worldToLocal(localCenter.clone())
    }

    /**
     * @description 获取局部坐标到世界坐标
     * @author LL
     * @since 2026/01/05
     * @param obj 模型
     * @param localPosition 局部坐标
     * @returns {*}  {Vector3}
     */
    public getLocalToWorldPosition(obj: Object3D, localPosition: Vector3 | xyz): Vector3 {
        let local = new Vector3(localPosition.x, localPosition.y, localPosition.z)
        return obj.localToWorld(local.clone())
    }

    /**
     * 按包围盒中心设置世界坐标，补偿模型原点偏移
     * @param obj 已加载的模型（需已设置 scale/rotation）
     * @param target 希望物体实际出现的世界坐标
     * @param axes 默认 xz：地面拖放只对齐水平位置，保留原有高度
     */
    public setVisualPosition(obj: Object3D, target: Vector3 | xyz, axes: 'xz' | 'xyz' = 'xz') {
        if (!obj) return

        obj.updateWorldMatrix(true, true)
        const origin = this.getWorldPosition(obj)
        const center = this.getModelSize(obj).center

        const originWorld = new Vector3(
            target.x - (center.x - origin.x),
            axes === 'xyz' ? target.y - (center.y - origin.y) : origin.y,
            target.z - (center.z - origin.z)
        )

        if (obj.parent) {
            obj.parent.worldToLocal(originWorld)
        }
        obj.position.copy(originWorld)
    }

    /**
     * 判断模型是否有2D标记
     * @author LL
     * @since 2024/07/04
     * @param {Object3D} obj 模型
     * @param domId 2D标记id
     */
    public ownMarker(obj: Object3D, domId?: string): boolean {
        let result = false
        obj.traverse((child: any) => {
            if (child.isCSS2DObject) {
                if (!domId || (domId && child.element.id === domId)) {
                    // console.log("child", child.isCSS2DObject);
                    result = true
                }
            }
        })
        return result
    }

    // /**
    //  * 创建属性缓冲区对象
    //  * @author gj
    //  * @since 2023/11/20
    //  * @param array 属性数组 （例如顶点位置向量，面片索引，法向量，颜色值，UV坐标以及任何自定义 attribute ）
    //  * @param itemSize 表示几个为一组
    //  * @param normalized 指明缓存中的数据如何与GLSL代码中的数据对应
    //  * @returns {*}  {BufferAttribute}
    //  */
    // public BufferAttribute(
    //   array: ArrayLike<number>,
    //   itemSize: number,
    //   normalized?: boolean
    // ): BufferAttribute {
    //   return new BufferAttribute(array, itemSize, normalized);
    // }

    // /**
    //  * 三角面片
    //  * @author gj
    //  * @since 2023/11/20
    //  * @param a 顶点 A 的索引
    //  * @param b 顶点 B 的索引
    //  * @param c 顶点 C 的索引
    //  * @param normal 面的法向量 - 矢量展示 Face3 的方向 默认值是 (0, 0, 0)
    //  * @param color 面的颜色值
    //  * @param materialIndex 材质队列中与该面相关的材质的索引。默认值为 0
    //  * @returns {*}  {Face3}
    //  */
    // public Face(
    //   a: number,
    //   b: number,
    //   c: number,
    //   normal?: Vector3,
    //   color?: Color,
    //   materialIndex?: number
    // ): Face {
    //   return new Face(a, b, c, normal, color, materialIndex);
    // }

    /**
     * 生成时钟，获取当前时间
     * @author gj
     * @since 2023/11/20
     * @returns {*}  {Timer}
     */
    public initClock(): Timer {
        return new Timer()
    }

    /**
     * @description 角度转弧度
     * @author LL
     * @date 2025/11/18
     * @param deg
     * @returns {*}
     */
    public degToRad(deg: number) {
        return MathUtils.degToRad(deg)
    }

    /**
     * @description 弧度转角度
     * @author LL
     * @date 2025/11/18
     * @param rad
     * @returns {*}
     */
    public radToDeg(rad: number) {
        return MathUtils.radToDeg(rad)
    }

    /**
     * 创建Three.js颜色
     * @author LL
     */
    public initColor(color?: string): Color {
        return color ? new Color(color) : new Color()
    }
    /**
     * 创建Vector2向量
     * @author gj
     * @since 2025/07/10
     * @param {number} x
     * @param {number} y
     * @returns {*}  {Vector2}
     */
    public initVector2(x?: number, y?: number): Vector2 {
        return new Vector2(x, y)
    }

    /**
     * 创建Vector3向量
     * @author LL
     * @since 2021/08/24
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {*}  {Vector3}
     */
    public initVector3(x?: number, y?: number, z?: number): Vector3 {
        return new Vector3(x, y, z)
    }

    /**
     * 获取轴向量
     * @author LL
     * @since 2022/04/25
     * @param {string} axis 轴
     * @param {number} [value=1]
     * @returns {*}  {Vector3}
     */
    public initVector3ByAxis(axis: 'x' | 'y' | 'z', value: number = 1): Vector3 {
        let vec3: Vector3
        if (axis == 'x') {
            vec3 = new Vector3(value, 0, 0)
        } else if (axis == 'y') {
            vec3 = new Vector3(0, value, 0)
        } else if (axis == 'z') {
            vec3 = new Vector3(0, 0, value)
        }

        return vec3
    }

    /**
     * 根据两个点生成方向向量（终点 - 起点，默认归一化为单位向量）
     * @author LL
     * @since 2026/06/02
     * @param {xyz} start 起点
     * @param {xyz} end 终点
     * @param {boolean} [normalize=true] 是否归一化
     * @returns {*}  {Vector3}
     */
    public initVector3ByTwoPoints(start: xyz, end: xyz, normalize: boolean = true): Vector3 {
        const vec = new Vector3(end.x - start.x, end.y - start.y, end.z - start.z)
        if (normalize && vec.lengthSq() > 0) {
            vec.normalize()
        }
        return vec
    }

    /**
     * 创建Vector4向量
     * @author LL
     * @since 2024/07/19
     * @param {number} [x]
     * @param {number} [y]
     * @param {number} [z]
     * @param {number} [w]
     */
    public initVector4(x?: number, y?: number, z?: number, w?: number): Vector4 {
        return new Vector4(x, y, z, w)
    }

    /**
     * 创建3x3矩阵
     * @author LL
     * @since 2024/07/19
     */
    public initMatrix3(): Matrix3 {
        return new Matrix3()
    }

    /**
     * 创建4x4矩阵
     * @author gj
     * @since 2023/11/20
     * @returns {*}  {Matrix4}
     */
    public initMatrix4(): Matrix4 {
        return new Matrix4()
    }

    /**
     * 创建Quaternion
     * @author LL
     * @since 2025/03/17
     */
    public initQuaternion() {
        return new Quaternion()
    }

    /**
     * 创建Box3
     * @author LL
     * @since 2025/03/26
     */
    public initBox3() {
        return new Box3()
    }

    /**
     * 创建Group
     * @author gj
     * @since 2025/03/26
     */
    public initGroup() {
        return new Group()
    }

    /**
     * 创建欧拉角
     * @author LL
     * @since 2024/07/19
     * @param {number} [x]
     * @param {number} [y]
     * @param {number} [z]
     * @param {EulerOrder} [order]
     */
    public initEuler(x?: number, y?: number, z?: number, order?: EulerOrder) {
        return new Euler(x, y, z, order)
    }
}
