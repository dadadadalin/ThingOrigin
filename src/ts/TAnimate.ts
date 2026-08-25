/**
 * @module
 * @mergeModuleWith <project>
 */

import { Tool } from './Tool'
import { Group, Matrix4, Object3D, Vector3 } from 'three'

import * as TWEEN from '@tweenjs/tween.js'
import { xyz } from './scenePrams'

/**
 * 用于制作模型动画
 */
export class TAnimate {
    private tool: Tool = new Tool()

    /**
     * |属性|说明|
     * |:---:|:---|
     * |运动模式列表|直线、跳动|
     * @author LL
     */
    motionMap = new Map([
        // 线性缓动：匀速运动，无加速减速
        ['linear', TWEEN.Easing.Linear.None],
        // 二次方缓动 - 入出：先加速后减速，速度变化为二次方曲线
        ['Quadratic.InOut', TWEEN.Easing.Quadratic.InOut],
        // 二次方缓动 - 入：持续加速，速度变化为二次方曲线
        ['Quadratic.In', TWEEN.Easing.Quadratic.In],
        // 二次方缓动 - 出：持续减速，速度变化为二次方曲线
        ['Quadratic.Out', TWEEN.Easing.Quadratic.Out],
        // 三次方缓动 - 入出：先加速后减速，速度变化为三次方曲线，比二次方更明显
        ['Cubic.InOut', TWEEN.Easing.Cubic.InOut],
        // 三次方缓动 - 入：持续加速，速度变化为三次方曲线
        ['Cubic.In', TWEEN.Easing.Cubic.In],
        // 三次方缓动 - 出：持续减速，速度变化为三次方曲线
        ['Cubic.Out', TWEEN.Easing.Cubic.Out],
        // 四次方缓动 - 入出：先加速后减速，速度变化为四次方曲线
        ['Quartic.InOut', TWEEN.Easing.Quartic.InOut],
        // 四次方缓动 - 入：持续加速，速度变化为四次方曲线
        ['Quartic.In', TWEEN.Easing.Quartic.In],
        // 四次方缓动 - 出：持续减速，速度变化为四次方曲线
        ['Quartic.Out', TWEEN.Easing.Quartic.Out],
        // 五次方缓动 - 入出：先加速后减速，速度变化为五次方曲线
        ['Quintic.InOut', TWEEN.Easing.Quintic.InOut],
        // 五次方缓动 - 入：持续加速，速度变化为五次方曲线
        ['Quintic.In', TWEEN.Easing.Quintic.In],
        // 五次方缓动 - 出：持续减速，速度变化为五次方曲线
        ['Quintic.Out', TWEEN.Easing.Quintic.Out],
        // 正弦曲线缓动 - 入出：模拟正弦波的先加速后减速，过渡更柔和
        ['Sinusoidal.InOut', TWEEN.Easing.Sinusoidal.InOut],
        // 正弦曲线缓动 - 入：模拟正弦波上升阶段的加速
        ['Sinusoidal.In', TWEEN.Easing.Sinusoidal.In],
        // 正弦曲线缓动 - 出：模拟正弦波下降阶段的减速
        ['Sinusoidal.Out', TWEEN.Easing.Sinusoidal.Out],
        // 指数曲线缓动 - 入出：指数级的先加速后减速，速度变化极快
        ['Exponential.InOut', TWEEN.Easing.Exponential.InOut],
        // 指数曲线缓动 - 入：指数级加速，速度快速提升
        ['Exponential.In', TWEEN.Easing.Exponential.In],
        // 指数曲线缓动 - 出：指数级减速，速度快速降低
        ['Exponential.Out', TWEEN.Easing.Exponential.Out],
        // 圆形曲线缓动 - 入出：基于圆形方程的先加速后减速，过渡更顺滑
        ['Circular.InOut', TWEEN.Easing.Circular.InOut],
        // 圆形曲线缓动 - 入：基于圆形方程的加速
        ['Circular.In', TWEEN.Easing.Circular.In],
        // 圆形曲线缓动 - 出：基于圆形方程的减速
        ['Circular.Out', TWEEN.Easing.Circular.Out],
        // 弹性缓动 - 入出：模拟弹簧先拉伸后回弹的效果，先超出目标再回归
        ['Elastic.InOut', TWEEN.Easing.Elastic.InOut],
        // 弹性缓动 - 入：模拟弹簧拉伸的过程，开始时超出初始位置
        ['Elastic.In', TWEEN.Easing.Elastic.In],
        // 弹性缓动 - 出：模拟弹簧回弹的过程，结束时超出目标位置再回归
        ['Elastic.Out', TWEEN.Easing.Elastic.Out],
        // 回退缓动 - 入出：先稍微回退再前进，最后稍微超出再回归，有"蓄力"感
        ['Back.InOut', TWEEN.Easing.Back.InOut],
        // 回退缓动 - 入：开始时先向后退一点再向前加速
        ['Back.In', TWEEN.Easing.Back.In],
        // 回退缓动 - 出：结束时先超出目标位置再回退到最终位置
        ['Back.Out', TWEEN.Easing.Back.Out],
        // 弹跳缓动 - 出：模拟物体落地弹跳的效果，结束阶段多次回弹
        ['Bounce.Out', TWEEN.Easing.Bounce.Out],
        // 弹跳缓动 - 入：模拟物体抛起弹跳的效果，开始阶段多次回弹
        ['Bounce.In', TWEEN.Easing.Bounce.In],
        // 弹跳缓动 - 入出：结合入和出的弹跳效果，开始和结束都有回弹
        ['Bounce.InOut', TWEEN.Easing.Bounce.InOut]
    ])
    // public setPosition(model: Object3D, position: xyz) {
    //   model.position.set(position.x, position.y, position.z);
    // }

    /**
     * @description 绕着指定轴旋转（动画）
     * @author LL
     * @date 2025/12/31
     * @param model 模型
     * @param axis 旋转轴
     * @param from 开始位置
     * @param to 结束位置
     * @param time 完成时间 (毫秒)
     * @param correct 纠正角度
     * @param unit 角度单位 ('rad' | 'deg')
     * @param mode 缓动模式（默认linear匀速运动）
     * @param onFinish 完成回调
     * @returns {TWEEN.Tween<any>} 返回 Tween 对象
     */
    public rotateAxis(
        model: Object3D,
        axis: Vector3 | xyz | 'x' | 'y' | 'z',
        from: number,
        to: number,
        time: number,
        correct: number = 0,
        unit: 'rad' | 'deg' = 'rad',
        mode: string = 'linear',
        onFinish?: () => void
    ): TWEEN.Tween<any> {
        if (!model) {
            console.warn('旋转轴失败，物体不存在')
            return
        }

        model.updateWorldMatrix(true, true)

        let coords = { t: from }
        return new TWEEN.Tween(coords)
            .to({ t: to }, time)
            .easing(this.motionMap.get(mode))
            .onUpdate(() => {
                let angle = coords.t
                let correctAngle = correct
                if (unit === 'deg') {
                    angle = (angle * Math.PI) / 180
                    correctAngle = (correct * Math.PI) / 180
                }

                if (typeof axis === 'string') {
                    model.rotation[axis] = angle + correctAngle
                } else {
                    const normalizedAxis = new Vector3(axis.x, axis.y, axis.z).normalize()
                    model.quaternion.setFromAxisAngle(normalizedAxis, angle + correctAngle)
                }

                // 更新矩阵
                model.updateMatrixWorld(true)
            })
            .onComplete(() => {
                if (typeof onFinish === 'function') {
                    onFinish()
                }
            })
            .start()
    }

    /**
     * 设置旋转姿态（无动画）
     * @author LL
     * @since 2026/06/23
     * @param model 模型
     * @param axis 旋转轴
     * @param value 旋转角度
     * @param correct 纠正角度
     */
    public setRotateAxis(
        model: Object3D,
        axis: Vector3 | xyz | 'x' | 'y' | 'z',
        value: number,
        correct: number = 0,
        unit: 'rad' | 'deg' = 'rad'
    ) {
        if (!model) {
            console.warn('旋转轴失败，物体不存在')
            return
        }

        model.updateWorldMatrix(true, true)

        let angle = value
        let correctAngle = correct
        if (unit === 'deg') {
            angle = (value * Math.PI) / 180
            correctAngle = (correct * Math.PI) / 180
        }

        if (typeof axis === 'string') {
            model.rotation[axis] = angle + correctAngle
        } else {
            model.quaternion.setFromAxisAngle(
                new Vector3(axis.x, axis.y, axis.z).normalize(),
                angle + correctAngle
            )
        }
        model.updateMatrixWorld(true)
    }

    /**
     * 设置模型的旋转中心点
     * @author LL
     * @since 2026/01/04
     * @param object 要设置旋转中心的模型
     * @param pivotPoint 旋转中心点
     * @param coordinateType 坐标类型：'local' 局部坐标，'world' 世界坐标，默认为 'local'
     * @returns 返回包装后的 Group 对象，多次调用会更新旋转中心而不是重新创建
     * @example
     * // 使用局部坐标设置旋转中心（模型底部）
     * animate.setRotationPivot(model, new Vector3(0, -10, 0), 'local')
     * // 使用世界坐标设置旋转中心
     * animate.setRotationPivot(model, new Vector3(100, 0, 200), 'world')
     * // 多次调用更新旋转中心
     * animate.setRotationPivot(model, new Vector3(200, 0, 300), 'world')
     */
    public setRotationPivot(
        model: Object3D,
        pivotPoint?: Vector3,
        coordinateType: 'local' | 'world' = 'local'
    ): Object3D {
        if (!model) {
            console.warn('设置旋转中心失败，物体不存在')
            return model
        }

        // 更新世界矩阵，确保坐标正确
        model.updateMatrixWorld(true)

        // 计算 pivot 点的世界位置
        let worldPivot: Vector3
        if (pivotPoint) {
            if (coordinateType === 'world') {
                // 如果提供了 pivot 点（世界坐标），直接使用
                worldPivot = new Vector3(pivotPoint.x, pivotPoint.y, pivotPoint.z)
            } else {
                // 如果提供了 pivot 点（局部坐标），转换为世界坐标
                const localPivot = new Vector3(pivotPoint.x, pivotPoint.y, pivotPoint.z)
                model.localToWorld(localPivot)
                worldPivot = localPivot
            }
        } else {
            // 如果没有提供，使用模型中心点（已经是世界坐标）
            worldPivot = this.tool.getModelCenter(model)
        }

        // 如果已经包装过，更新 pivotGroup 的位置到新的旋转中心
        if (model.userData._rotationPivotGroup) {
            const pivotGroup = model.userData._rotationPivotGroup
            const parent = pivotGroup.parent

            // 计算新的 pivot 点的局部坐标（相对于原对象）
            const localPivot = new Vector3()
            model.worldToLocal(localPivot.copy(worldPivot))

            // 计算对象位置需要调整的偏移量
            const oldLocalPivot = pivotGroup.userData._pivotPoint || new Vector3()
            const positionOffset = new Vector3(
                oldLocalPivot.x - localPivot.x,
                oldLocalPivot.y - localPivot.y,
                oldLocalPivot.z - localPivot.z
            )
            model.position.add(positionOffset)

            // 更新 pivotGroup 的位置到新的旋转中心
            if (parent) {
                // 将世界坐标的 pivot 点转换到父坐标系
                const parentLocalPivot = new Vector3()
                parent.worldToLocal(parentLocalPivot.copy(worldPivot))
                pivotGroup.position.copy(parentLocalPivot)
            } else {
                // 如果没有父对象，直接使用世界坐标的 pivot 点
                pivotGroup.position.copy(worldPivot)
            }

            // 更新保存的 pivot 点信息
            pivotGroup.userData._pivotPoint = localPivot.clone()
            pivotGroup.userData._worldPivot = worldPivot.clone()

            console.log('更新旋转中心点到:', worldPivot)
            return pivotGroup
        }

        // 首次包装：保存原始父对象和对象的世界位置
        const parent = model.parent
        const originalWorldPosition = new Vector3()
        model.getWorldPosition(originalWorldPosition)

        // 保存 pivot 点的局部坐标（相对于原对象）
        const localPivot = new Vector3()
        model.worldToLocal(localPivot.copy(worldPivot))

        // 创建包装 Group
        const pivotGroup = new Group()
        pivotGroup.name = model.name + '_pivotGroup'

        // 将对象从父对象中移除
        if (parent) {
            parent.remove(model)
        }

        // 调整对象位置，使其相对于 pivot 点偏移
        // 这样当 Group 旋转时，对象会绕 pivot 点旋转
        const originalLocalPosition = model.position.clone()
        model.position.sub(localPivot)

        // 将对象添加到 Group
        pivotGroup.add(model)

        // 设置 Group 的位置，使其位于 pivot 点的世界位置
        if (parent) {
            parent.add(pivotGroup)
            // 将世界坐标的 pivot 点转换到父坐标系
            const parentLocalPivot = new Vector3()
            parent.worldToLocal(parentLocalPivot.copy(worldPivot))
            pivotGroup.position.copy(parentLocalPivot)
        } else {
            // 如果没有父对象，直接使用世界坐标的 pivot 点
            pivotGroup.position.copy(worldPivot)
        }

        // 保存引用，以便后续操作
        model.userData._rotationPivotGroup = pivotGroup
        model.userData._originalLocalPosition = originalLocalPosition
        pivotGroup.userData._originalObject = model
        pivotGroup.userData._pivotPoint = localPivot.clone()
        pivotGroup.userData._worldPivot = worldPivot.clone()

        return pivotGroup
    }

    /**
     * 绕指定中心点旋转模型
     * @author LL
     * @since 2026/01/04
     * @param model 要旋转的模型
     * @param axis 旋转轴 ('x' | 'y' | 'z') 或 Vector3（任意轴）
     * @param pivot 旋转中心点
     * @param from 开始位置
     * @param to 结束位置
     * @param time 完成时间 (毫秒)
     * @param correct 纠正角度
     * @param unit 角度单位 ('rad' | 'deg')
     * @param coordinateType 坐标类型：'local' 表示局部坐标，'world' 表示世界坐标，默认为 'local'
     * @param onFinish 完成回调
     */
    public rotatePivot(
        model: Object3D,
        axis: Vector3 | xyz | 'x' | 'y' | 'z',
        pivot: Vector3,
        from: number,
        to: number,
        time: number,
        correct: number = 0,
        unit: 'rad' | 'deg' = 'rad',
        coordinateType: 'local' | 'world' = 'local',
        onFinish?: () => void
    ) {
        if (!model) {
            console.warn('绕中心点旋转失败，物体不存在')
            return
        }

        let pivotGroup: Object3D
        if (model.userData._rotationPivotGroup) {
            pivotGroup = model.userData._rotationPivotGroup
        } else {
            pivotGroup = this.setRotationPivot(model, pivot, coordinateType)
        }

        this.rotateAxis(pivotGroup, axis, from, to, time, correct, unit, 'linear', onFinish)
    }

    /** 瞬时绕 pivot 旋转（setModel 用），规则与 rotatePivot 一致 */
    public setRotatePivot(
        model: Object3D,
        axis: Vector3 | xyz | 'x' | 'y' | 'z',
        pivot: Vector3,
        value: number,
        unit: 'rad' | 'deg' = 'rad',
        coordinateType: 'local' | 'world' = 'local'
    ) {
        if (!model) {
            console.warn('绕中心点旋转失败，物体不存在')
            return
        }

        const pivotGroup: Object3D =
            model.userData._rotationPivotGroup || this.setRotationPivot(model, pivot, coordinateType)
        this.setRotateAxis(pivotGroup, axis, value, 0, unit)
    }

    /**
     * 间补平移动画
     * @author LL
     * @param {Object3D} model 模型
     * @param axis 局部坐标轴：'x'|'y'|'z' 或 Vector3/xyz 方向
     * @param {number} from 从哪个位置开始
     * @param {number} to 到哪个位置停止
     * @param {number} time 完成时间（毫秒）
     * @param {string} mode 缓动模式
     * @param {Function} onFinish 完成回调
     */
    public move(
        model: Object3D,
        axis: Vector3 | xyz | 'x' | 'y' | 'z',
        from: number,
        to: number,
        time: number,
        mode: string = 'linear',
        onFinish?: () => void
    ): TWEEN.Tween<any> {
        if (!model) {
            console.warn('平移失败，物体不存在')
            return
        }
        model.updateWorldMatrix(true, true)

        let axisVec
        const coords = { t: from }
        if (axis !== 'x' && axis !== 'y' && axis !== 'z') {
            axisVec = new Vector3()
            axisVec.set(axis.x, axis.y, axis.z).normalize()
        }
        let prevT = from
        return new TWEEN.Tween(coords)
            .to({ t: to }, time)
            .easing(this.motionMap.get(mode))
            .onUpdate(() => {
                if (axis === 'x' || axis === 'y' || axis === 'z') {
                    model.position[axis] = coords.t
                } else {
                    model.translateOnAxis(axisVec, coords.t - prevT)
                    prevT = coords.t
                }
            })
            .onComplete(() => {
                if (typeof onFinish === 'function') {
                    onFinish()
                }
            })
            .start()
    }

    /** 瞬时设定位移（setModel 用），axis 规则与 move 一致 */
    public setMove(model: Object3D, axis: Vector3 | xyz | 'x' | 'y' | 'z', value: number) {
        if (!model) {
            console.warn('平移失败，物体不存在')
            return
        }

        model.updateWorldMatrix(true, true)
        if (typeof axis === 'string') {
            model.position[axis] = value
        } else {
            const axisVec = new Vector3(axis.x, axis.y, axis.z).normalize()
            model.position.copy(axisVec.multiplyScalar(value))
        }
        model.updateMatrixWorld(true)
    }

    /**
     * 模型透明度动画效果
     * @author gj
     * @since 2023/10/25
     * @param {Object3D} model 模型
     * @param {number} startOpacity 开始透明度（0-1），相对于原始透明度的比例
     * @param {number} endOpacity 结束透明度（0-1），相对于原始透明度的比例
     * @param {number} time 完成时间（毫秒）
     * @param {Function} onFinish 完成回调
     * @example
     * // 淡入：从完全透明到完全不透明
     * TO.animate.modelOpacity(model, 0, 1, 1000);
     * // 淡出：从完全不透明到完全透明
     * TO.animate.modelOpacity(model, 1, 0, 1000);
     * // 从半透明到完全不透明
     * TO.animate.modelOpacity(model, 0.5, 1, 1000);
     */
    public modelOpacity(
        model: Object3D,
        startOpacity: number,
        endOpacity: number,
        time: number,
        onFinish?: () => void
    ) {
        if (!model) {
            console.warn('物体不存在')
            return
        }

        // 限制透明度范围在 0-1
        const start = Math.max(0, Math.min(1, startOpacity))
        const end = Math.max(0, Math.min(1, endOpacity))

        // 记录开始时间
        const startTime = performance.now()
        // 递归处理所有子对象，保存原始透明度并设置初始透明度
        function processObject(obj: Object3D) {
            // 检查是否是 Mesh 对象且有材质
            if (obj.type === 'Mesh' && (obj as any).material) {
                const materials = Array.isArray((obj as any).material)
                    ? (obj as any).material
                    : [(obj as any).material]

                materials.forEach((material: any) => {
                    // 检查材质是否有 opacity 属性（某些材质类型可能没有）
                    if (material && typeof material.opacity !== 'undefined') {
                        // 保存原始透明度
                        if (material.userData.originalOpacity === undefined) {
                            material.userData.originalOpacity =
                                material.opacity !== undefined ? material.opacity : 1
                        }
                        // 确保材质支持透明度
                        material.transparent = true

                        // 设置初始透明度：原始透明度 * 开始透明度比例
                        const originalOpacity = material.userData.originalOpacity || 1
                        material.opacity = originalOpacity * start
                        material.needsUpdate = true
                    }
                })
            }

            // 递归处理子对象
            if (obj.children && obj.children.length > 0) {
                obj.children.forEach((child) => processObject(child))
            }
        }

        // 初始化模型透明度
        processObject(model)

        // 动画函数
        function animate(currentTime: number) {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / time, 1)

            // 递归更新透明度
            function updateOpacity(obj: Object3D, progressValue: number) {
                if (obj.type === 'Mesh' && (obj as any).material) {
                    const materials = Array.isArray((obj as any).material)
                        ? (obj as any).material
                        : [(obj as any).material]

                    materials.forEach((material: any) => {
                        if (material && typeof material.opacity !== 'undefined') {
                            const originalOpacity = material.userData.originalOpacity || 1

                            // 线性插值：从 startOpacity 到 endOpacity
                            // 当前透明度比例 = start + (end - start) * progress
                            const currentOpacityRatio = start + (end - start) * progressValue

                            // 最终透明度 = 原始透明度 * 当前透明度比例
                            material.opacity = originalOpacity * currentOpacityRatio
                            material.needsUpdate = true
                        }
                    })
                }

                if (obj.children && obj.children.length > 0) {
                    obj.children.forEach((child) => updateOpacity(child, progressValue))
                }
            }

            // 更新透明度
            updateOpacity(model, progress)

            // 如果动画未完成，继续请求下一帧
            if (progress < 1) {
                requestAnimationFrame(animate)
            } else {
                // 动画完成，执行回调函数
                if (typeof onFinish === 'function') {
                    onFinish()
                }
            }
        }

        // 开始动画
        requestAnimationFrame(animate)
    }

    /**
     * 将两个模型关联在一起（子随父）
     * @author LL
     * @since 2024/07/02
     * @param {Object3D} child 子模型
     * @param {Object3D} parent 父模型
     */
    public attachModel(parent: Object3D, child: Object3D) {
        if (!child || !parent) return

        // 先缓存 child 的世界变换（position/rotation/scale 一起保留）
        child.updateMatrixWorld(true)
        const childWorldMatrix = child.matrixWorld.clone()

        // 确保 parent 的世界矩阵是最新的
        parent.updateMatrixWorld(true)

        // 直接改父级关系，但通过矩阵换算把 local 恢复到“换父后世界坐标不变”
        parent.add(child)

        const inverseParentWorldMatrix = new Matrix4().copy(parent.matrixWorld).invert()
        const newLocalMatrix = new Matrix4().multiplyMatrices(inverseParentWorldMatrix, childWorldMatrix)

        child.matrix.copy(newLocalMatrix)
        child.matrix.decompose(child.position, child.quaternion, child.scale)
        // 同步 Euler，避免后续读取 child.rotation 时不一致
        child.rotation.setFromQuaternion(child.quaternion)

        child.updateMatrixWorld(true)
    }

    /**
     * 将child模型关联至parent模型中（官网版）
     * @author gj
     * @since 2025/11/18
     * @param {Object3D} child 子模型
     * @param {Object3D} parent 父模型
     * @param {Object3D} parent_parent 父模型的父模型（如果没有则传null)
     */
    public attachModel_guanwang(child: Object3D, parent: Object3D, parent_parent?: Object3D) {
        if (parent_parent) {
            if (parent_parent?.userData?.sim?.holdPosition) {
                child.position.set(
                    parent_parent.userData.sim.holdPosition.x +
                        child.userData.sim.holdPosition.x * child.scale.x,
                    parent_parent.userData.sim.holdPosition.y +
                        child.userData.sim.holdPosition.y * child.scale.y,
                    parent_parent.userData.sim.holdPosition.z +
                        child.userData.sim.holdPosition.z * child.scale.z
                )
            } else {
                child.position.set(
                    child.userData.sim.holdPosition.x * child.scale.x,
                    child.userData.sim.holdPosition.y * child.scale.y,
                    child.userData.sim.holdPosition.z * child.scale.z
                )
            }
        } else {
            child.position.set(
                child.userData.sim.holdPosition.x * child.scale.x,
                child.userData.sim.holdPosition.y * child.scale.y,
                child.userData.sim.holdPosition.z * child.scale.z
            )
        }

        if (child.userData?.sim?.rotationOffset) {
            child.rotation.set(
                eval(child.userData.sim.rotationOffset.x),
                eval(child.userData.sim.rotationOffset.y),
                eval(child.userData.sim.rotationOffset.z)
            )
        }

        // 保存子对象的世界缩放
        const worldScale = new Vector3()
        child.getWorldScale(worldScale)

        parent.add(child)

        // 计算父对象的逆世界缩放
        const parentWorldScale = new Vector3()
        parent.getWorldScale(parentWorldScale)
        const inverseParentScale = new Vector3(
            1 / parentWorldScale.x,
            1 / parentWorldScale.y,
            1 / parentWorldScale.z
        )

        // 调整子对象的局部缩放以保持世界缩放不变
        child.scale.x = worldScale.x * inverseParentScale.x
        child.scale.y = worldScale.y * inverseParentScale.y
        child.scale.z = worldScale.z * inverseParentScale.z
    }

    /**
     * 解除关联模型
     * @author LL
     * @since 2024/09/20
     * @param {Object3D} parent 父模型
     * @param {Object3D} child 子模型
     */
    public removeAttach(parent: Object3D, child: Object3D): void {
        if (!parent || !child) return

        // 缓存 child 的世界变换，解除父子关系后用它恢复，保证世界坐标不变
        child.updateMatrixWorld(true)
        const childWorldMatrix = child.matrixWorld.clone()

        // 解除关联后真正“脱离”：把 child 挂到 parent 的最顶层祖先（通常是 scene/world root）
        // 否则挂到 grandparent 仍可能随机械结构一起动，看起来像没脱离。
        let targetParent: Object3D | null = parent
        while (targetParent?.parent) {
            targetParent = targetParent.parent
        }

        parent.remove(child)

        if (targetParent) {
            targetParent.updateMatrixWorld(true)
            targetParent.add(child)

            const inverseTargetParentWorldMatrix = new Matrix4().copy(targetParent.matrixWorld).invert()
            const newLocalMatrix = new Matrix4().multiplyMatrices(
                inverseTargetParentWorldMatrix,
                childWorldMatrix
            )
            child.matrix.copy(newLocalMatrix)
        } else {
            // 理论上 targetParent 不太会是 null，但兜底：让 local 等于原世界矩阵
            child.matrix.copy(childWorldMatrix)
        }

        child.matrix.decompose(child.position, child.quaternion, child.scale)
        child.rotation.setFromQuaternion(child.quaternion)
        child.updateMatrixWorld(true)
    }
}
