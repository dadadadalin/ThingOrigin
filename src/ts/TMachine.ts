/**
 * @module
 * @mergeModuleWith <project>
 */

import { Object3D, Vector3 } from 'three'
import { cloneDeep } from 'lodash-es'
// @ts-ignore
import machines from '../../public/data/machines.js'
import { ThingOrigin } from '../ThingOrigin'
import { jointDataParams, jointsParams, DataPathConfig } from './TMachinesInterfaces.js'

/**
 * 特定型号设备
 */
export class TMachine {
    private TO: ThingOrigin

    constructor(TO: ThingOrigin) {
        this.TO = TO
    }

    /** 标准轴 x/y/z，可用于 rotation[position] 索引 */
    private isStdAxis(axis: jointsParams['axis']): axis is 'x' | 'y' | 'z' {
        return axis === 'x' || axis === 'y' || axis === 'z'
    }

    /** correct/reverse 换算，setModel 与 twinJoint 共用 */
    private resolveJointValue(animateInfo: jointsParams, rawValue: number): number {
        const correct = animateInfo.correct ? Number(animateInfo.correct) : 0
        const reverse = animateInfo.reverse ? Number(animateInfo.reverse) : 1
        return (rawValue + correct) * reverse
    }

    /**
     * 设置设备姿态
     * @author LL
     * @since 2024/06/14
     * @param {Object3D} robot 设备
     * @param {jointsParams[]} animateInfo 运动信息
     * @param {*} data 运动数据
     * @param {*} data 运动数据
     */
    public setModel(robot: Object3D, animateInfo: jointsParams[], data: any) {
        if (
            !this.checkData([
                { type: 'robot', data: robot },
                { type: 'joint', data: animateInfo },
                { type: 'data', data: data }
            ])
        ) {
            console.error('setModel 失败：数据验证不通过')
            return
        }

        for (const element of animateInfo) {
            const jointObject = robot.getObjectByName(element.modelName)
            const rawValue = this.getDataByPath(data, element)

            if (rawValue === undefined) {
                console.warn(`${element.modelName}：关节数据不存在，无法设置设备姿态`)
                continue
            }

            // const value = this.resolveJointValue(element, rawValue)
            const reverse = element.reverse ? Number(element.reverse) : 1
            const value = rawValue * reverse
            const unit = (element.rotateUnit || element.unit || 'rad') as 'rad' | 'deg'

            switch (element.animateType) {
                case 'move': {
                    const axis =
                        element.axis === 'free'
                            ? this.TO.tool.initVector3ByTwoPoints(element.freeAxis.p1, element.freeAxis.p2)
                            : element.axis
                    this.TO.animate.setMove(jointObject, axis, value)
                    break
                }
                case 'rotate':
                    if (element.axis === 'free') {
                        this.TO.animate.setRotatePivot(
                            jointObject,
                            this.TO.tool.initVector3ByTwoPoints(element.freeAxis.p1, element.freeAxis.p2),
                            element.freeAxis.p1,
                            value,
                            unit,
                            'local'
                        )
                    } else if (element.pivot) {
                        this.TO.animate.setRotatePivot(
                            jointObject,
                            element.axis,
                            element.pivot,
                            value,
                            unit,
                            'local'
                        )
                    } else {
                        this.TO.animate.setRotateAxis(jointObject, element.axis, value, element.correct, unit)
                    }
                    break
                default:
                    console.warn(`未知的动画类型: ${element.animateType}`)
            }
        }
    }

    /**
     * 重置零点姿态（按关节配置轴归零，与 setRotateAxis / setMove 一致）
     * @author LL
     * @since 2026/03/11
     * @param {Object3D} model 设备
     * @param {any} [joints] hierarchy.joints；省略则读 model.userData.hierarchy.joints
     *   项字段：name（或 modelName）、animateType、axis、correct、rotateUnit
     */
    public resetZeroPose(model: Object3D, joints?: any) {
        if (!model) return
        // 新结构扁平 joints；未传则从 userData.hierarchy 读取
        const list = Array.isArray(joints) ? joints : model.userData?.hierarchy?.joints
        if (!Array.isArray(list)) return

        for (let i = 0; i < list.length; i++) {
            const node = list[i]
            // joints 用 name；旧数据用 modelName
            const jointName = node.name || node.modelName
            if (!jointName) continue

            const joint = model.getObjectByName(jointName)
            if (!joint) {
                console.warn(`resetZeroPose：未找到关节 ${jointName}`)
                continue
            }

            const isMove = node.type === 'move' || node.animateType === 'move'
            const axis = node.axis

            if (isMove) {
                // 仅归零配置轴，避免抹掉其它轴向
                if (this.isStdAxis(axis)) {
                    this.TO.animate.setMove(joint, axis, 0)
                } else {
                    joint.position.set(0, 0, 0)
                }
            } else {
                // rotate：关节值 0 + correct（与 setRotateAxis 一致）
                if (this.isStdAxis(axis)) {
                    const unit = (node.rotateUnit || node.unit || 'rad') as 'rad' | 'deg'
                    const correct = node.correct ? Number(node.correct) : 0
                    this.TO.animate.setRotateAxis(joint, axis, 0, correct, unit)
                } else {
                    joint.rotation.set(0, 0, 0)
                }
            }
        }
    }

    /**
     * 重置角度旋转
     * @author LL
     * @since 2022-05-09
     * @param {Object3D} robot 设备
     * @param {jointsParams[]} joints 关节参数
     * @param {jointDataParams} jointData 关节动作数据
     */
    public setJointAngle(robot: Object3D, joints: jointsParams[], jointData: jointDataParams) {
        if (
            !this.checkData([
                { type: 'robot', data: robot },
                { type: 'joint', data: joints },
                { type: 'jointData', data: jointData }
            ])
        ) {
            console.error('setJointAngle 失败：数据验证不通过')
            return
        }

        for (let i = 0; i < joints.length; i++) {
            const joint = joints[i]
            const reverse = joint.reverse ? Number(joint.reverse) : 1
            const correct = joint.correct ? Number(joint.correct) : 0
            const value = (this.getDataByPath(jointData, joint) + correct) * reverse
            const jointObject = robot.getObjectByName(joint.modelName)

            if (value === undefined) {
                console.warn(`索引 ${i} 的 '${joint.dataUrl}' 关节数据无效。`)
                continue
            }

            if (this.isStdAxis(joint.axis)) {
                jointObject.rotation[joint.axis] = value
            }
        }
    }

    /**
     * 重置弧度旋转
     * @author LL
     * @since 2022-06-20
     * @param {Object3D} robot 设备
     * @param {jointsParams[]} joints 关节参数
     * @param {jointDataParams} jointData 关节动作数据
     */
    public setJointRadian(robot: Object3D, joints: jointsParams[], jointData: jointDataParams) {
        if (
            !this.checkData([
                { type: 'robot', data: robot },
                { type: 'joint', data: joints },
                { type: 'jointData', data: jointData }
            ])
        ) {
            console.error('setJointRadian 失败：数据验证不通过')
            return
        }

        for (let i = 0; i < joints.length; i++) {
            const joint = joints[i]
            const reverse = joint.reverse ? Number(joint.reverse) : 1
            const correct = joint.correct ? Number(joint.correct) : 0
            const value = (this.getDataByPath(jointData, joint) + correct) * reverse
            const jointObject = robot.getObjectByName(joint.modelName)

            if (value === undefined) {
                console.warn(`索引 ${i} 的 '${joint.dataUrl}' 关节数据无效。`)
                continue
            }

            if (this.isStdAxis(joint.axis)) {
                jointObject.rotation[joint.axis] = value
            }
        }
    }

    /**
     * 重置四元数旋转
     * @author LL
     * @since 2025/09/18
     * @param {Object3D} robot 设备
     * @param {jointsParams[]} joints 关节参数
     * @param {jointDataParams} jointData 关节动作数据
     */
    public setJointQuaternion(robot: Object3D, joints: jointsParams[], jointData: jointDataParams) {
        if (
            !this.checkData([
                { type: 'robot', data: robot },
                { type: 'joint', data: joints },
                { type: 'jointData', data: jointData }
            ])
        ) {
            console.error('setJointQuaternion 失败：数据验证不通过')
            return
        }

        for (let i = 0; i < joints.length; i++) {
            const joint = joints[i]
            const reverse = joint.reverse ? Number(joint.reverse) : 1
            const correct = joint.correct ? Number(joint.correct) : 0
            const value = (this.getDataByPath(jointData, joint) + correct) * reverse
            const jointObject = robot.getObjectByName(joint.modelName)

            if (value === undefined) {
                console.warn(`索引 ${i} 的 '${joint.dataUrl}' 关节数据无效。`)
                continue
            }

            jointObject.quaternion.setFromAxisAngle(
                new Vector3(
                    joint.axis === 'x' ? 1 : 0,
                    joint.axis === 'y' ? 1 : 0,
                    joint.axis === 'z' ? 1 : 0
                ),
                value
            )
        }
    }

    /**
     * 重置欧拉角旋转
     * @author LL
     * @since 2024/09/18
     * @param {Object3D} robot 设备
     * @param {jointsParams[]} joints 关节参数
     * @param {jointDataParams} jointData 关节动作数据
     */
    public setJointEuler(robot: Object3D, joints: jointsParams[], jointData: jointDataParams) {
        if (
            !this.checkData([
                { type: 'robot', data: robot },
                { type: 'joint', data: joints },
                { type: 'jointData', data: jointData }
            ])
        ) {
            console.error('setJointEuler 失败：数据验证不通过')
            return
        }

        for (let i = 0; i < joints.length; i++) {
            const joint = joints[i]
            const reverse = joint.reverse ? Number(joint.reverse) : 1
            const correct = joint.correct ? Number(joint.correct) : 0
            const value = (this.getDataByPath(jointData, joint) + correct) * reverse
            const jointObject = robot.getObjectByName(joint.modelName)

            if (value === undefined) {
                console.warn(`索引 ${i} 的 '${joint.dataUrl}' 关节数据无效。`)
                continue
            }

            const xyz: any = {
                x: joint.axis === 'x' ? value * (Math.PI / 180) : undefined,
                y: joint.axis === 'y' ? value * (Math.PI / 180) : undefined,
                z: joint.axis === 'z' ? value * (Math.PI / 180) : undefined
            }

            jointObject.rotation.set(xyz.x || 0, xyz.y || 0, xyz.z || 0)
        }
    }

    public twinJoint(
        joint: Object3D,
        animateInfo: jointsParams,
        startData: number,
        endData: number,
        time: number,
        onFinish?: () => void
    ) {
        // const startValue = this.resolveJointValue(animateInfo, startData)
        const startValue = startData * (animateInfo.reverse ? Number(animateInfo.reverse) : 1)
        const endValue = endData * (animateInfo.reverse ? Number(animateInfo.reverse) : 1)
        // const endValue = this.resolveJointValue(animateInfo, endData)
        const unit = (animateInfo.rotateUnit || animateInfo.unit || 'rad') as 'rad' | 'deg'

        switch (animateInfo.animateType) {
            case 'move': {
                const axis =
                    animateInfo.axis === 'free'
                        ? this.TO.tool.initVector3ByTwoPoints(
                              animateInfo.freeAxis.p1,
                              animateInfo.freeAxis.p2
                          )
                        : animateInfo.axis
                this.TO.animate.move(joint, axis, startValue, endValue, time, 'linear', onFinish)
                break
            }
            case 'rotate':
                if (animateInfo.axis === 'free') {
                    this.TO.animate.rotatePivot(
                        joint,
                        this.TO.tool.initVector3ByTwoPoints(animateInfo.freeAxis.p1, animateInfo.freeAxis.p2),
                        animateInfo.freeAxis.p1,
                        startValue,
                        endValue,
                        time,
                        animateInfo.correct,
                        unit,
                        'local',
                        onFinish
                    )
                } else if (animateInfo.pivot) {
                    this.TO.animate.rotatePivot(
                        joint,
                        animateInfo.axis,
                        animateInfo.pivot,
                        startValue,
                        endValue,
                        time,
                        animateInfo.correct,
                        unit,
                        'local',
                        onFinish
                    )
                } else {
                    this.TO.animate.rotateAxis(
                        joint,
                        animateInfo.axis,
                        startValue,
                        endValue,
                        time,
                        animateInfo.correct,
                        unit,
                        'linear',
                        onFinish
                    )
                }
                break
            default:
                console.warn(`未知的动画类型: ${animateInfo.animateType}`)
        }
    }

    /**
     * 设置设备动作
     * @author LL
     * @since 2024/06/14
     * @param {Object3D} robot 设备
     * @param {jointsParams[]} animateInfo 运动信息
     * @param {*} startData 初始数据
     * @param {*} endData 结束数据
     * @param {number} time 运动时间（毫秒）
     */
    public twinModel(
        robot: Object3D,
        animateInfo: jointsParams[],
        startData: any,
        endData: any,
        time: number
    ) {
        // 验证输入参数
        if (!robot) {
            console.error('twinModel 失败：robot 参数不能为空')
            return
        }

        let correct = this.checkData([
            { type: 'joint', data: animateInfo },
            { type: 'data', data: startData },
            { type: 'data', data: endData },
            { type: 'time', data: time }
        ])

        if (!correct) {
            console.error('twinModel 失败：数据验证不通过')
            return
        }

        //当前后数据一样的时候 直接跳过
        if (JSON.stringify(startData) === JSON.stringify(endData)) {
            // console.log('startData 和 endData 相同，跳过动画')
            return
        }

        // 所有验证通过，开始执行动画
        animateInfo.forEach((element: jointsParams) => {
            const joint = robot.getObjectByName(element.modelName)
            const rawStart = this.getDataByPath(startData, element)
            const rawEnd = this.getDataByPath(endData, element)

            if (rawStart == undefined || rawEnd == undefined) {
                console.warn(`${element.modelName}：关节数据不存在，无法设置设备姿态`)
                return
            }

            this.twinJoint(joint, element, rawStart, rawEnd, time)
        })
    }

    /**
     * 设备角度旋转
     * @author LL
     * @since 2022-05-09
     * @param {Object3D} robot 设备
     * @param {jointsParams[]} joints 关节参数
     * @param {jointDataParams} startData 初始数据
     * @param {jointDataParams} endData 结束数据
     * @param {number} time 运动时间（毫秒）
     */
    public twinAngle(
        robot: Object3D,
        joints: jointsParams[],
        startData: jointDataParams,
        endData: jointDataParams,
        time: number
    ) {
        // 数据验证
        let correct = this.checkData([
            { type: 'robot', data: robot },
            { type: 'joint', data: joints },
            { type: 'jointData', data: startData },
            { type: 'jointData', data: endData },
            { type: 'time', data: time }
        ])

        if (!correct) {
            console.error('twinAngle 失败：数据验证不通过')
            return
        }
        for (var i = 0; i < joints.length; i++) {
            let correct = joints[i].correct ? Number(joints[i].correct) : 0
            let reverse = joints[i].reverse ? Number(joints[i].reverse) : 1
            let startValue = (this.getDataByPath(startData, joints[i]) + correct) * reverse
            let endValue = (this.getDataByPath(endData, joints[i]) + correct) * reverse

            if (startValue != undefined && endValue != undefined) {
                if (startValue != endValue) {
                    this.TO.animate.rotateAxis(
                        robot.getObjectByName(joints[i].modelName),
                        joints[i].axis as Vector3 | 'x' | 'y' | 'z',
                        startValue,
                        endValue,
                        time,
                        0, // correct 已并入 start/end
                        'deg'
                    )
                }
            } else {
                console.warn(joints[i].modelName + '数据异常：pre=' + startValue + ',cur=' + endValue)
            }
        }
    }

    /**
     * 设备弧度旋转
     * @author LL
     * @since 2022-06-15
     * @param {Object3D} robot 设备
     * @param {jointsParams[]} joints 关节参数
     * @param {jointDataParams} startData 初始数据
     * @param {jointDataParams} endData 结束数据
     * @param {number} time 运动时间（毫秒）
     */
    public twinRadian(
        robot: Object3D,
        joints: jointsParams[],
        startData: jointDataParams,
        endData: jointDataParams,
        time: number,
        onFinish?: () => void
    ) {
        // 数据验证
        let correct = this.checkData([
            { type: 'robot', data: robot },
            { type: 'joint', data: joints },
            { type: 'jointData', data: startData },
            { type: 'jointData', data: endData },
            { type: 'time', data: time }
        ])

        if (!correct) {
            console.error('twinRadian 失败：数据验证不通过')
            return
        }

        let tweenCount = 0
        let finishedCount = 0
        const done = () => {
            finishedCount++
            if (finishedCount >= tweenCount && typeof onFinish === 'function') {
                onFinish()
            }
        }

        for (var i = 0; i < joints.length; i++) {
            let correct = joints[i].correct ? Number(joints[i].correct) : 0
            let reverse = joints[i].reverse ? Number(joints[i].reverse) : 1
            let startValue = (this.getDataByPath(startData, joints[i]) + correct) * reverse
            let endValue = (this.getDataByPath(endData, joints[i]) + correct) * reverse
            let jointObject = robot.getObjectByName(joints[i].modelName)

            if (startValue != undefined && endValue != undefined) {
                if (startValue != endValue) {
                    tweenCount++
                    this.TO.animate.rotateAxis(
                        jointObject,
                        joints[i].axis as 'x' | 'y' | 'z',
                        startValue,
                        endValue,
                        time,
                        joints[i].correct,
                        'rad',
                        'linear',
                        done
                    )
                }
            } else {
                console.warn(joints[i].modelName + '数据异常：pre=' + startValue + ',cur=' + endValue)
            }
        }

        if (tweenCount === 0 && typeof onFinish === 'function') {
            onFinish()
        }
    }

    /**
     * 播放设备自定义动画
     * @author LL
     * @since 2024/09/24
     * @param {Object3D} robot 设备
     * @param {jointsParams[]} joints 关节说明
     * @param {jointDataParams[]} actions 动作数组
     * @param {number} time 运动时间（毫秒）
     */
    public async playRadian(
        robot: Object3D,
        joints: jointsParams[],
        actions: jointDataParams[],
        time: number
    ) {
        // 数据验证
        let correct = this.checkData([
            { type: 'robot', data: robot },
            { type: 'joint', data: joints },
            { type: 'actions', data: actions },
            { type: 'time', data: time }
        ])

        if (!correct) {
            console.error('playRadian 失败：数据验证不通过')
            return
        }

        // 按顺序调用 twinRadian，等待当前动作完成后再播放下一段
        for (let i = 0; i < actions.length - 1; i++) {
            console.log('动画' + i + '开始')
            await new Promise<void>((resolve) => {
                this.twinRadian(robot, joints, actions[i], actions[i + 1], time, resolve)
            })
        }
    }

    /**
     * Aubo 孪生动画
     * @author LL
     * @since 2022-05-09
     * @param {Object3D} aubo aubo
     * @param {jointDataParams} startData 初始数据
     * @param {jointDataParams} endData 结束数据
     * @param {number} time 运动时间（毫秒）
     */
    public twinAobo(aubo: Object3D, startData: jointDataParams, endData: jointDataParams, time: number) {
        // 数据验证
        let correct = this.checkData([
            { type: 'robot', data: aubo },
            { type: 'jointData', data: startData },
            { type: 'jointData', data: endData },
            { type: 'time', data: time }
        ])

        if (!correct) {
            console.error('twinAobo 失败：数据验证不通过')
            return
        }

        this.twinAngle(aubo, machines.aubo.joints as any, startData, endData, time)
    }

    /**
     * Aubo 孪生动画
     * @author LL
     * @since 2022-05-09
     * @param {Object3D} aubo aubo
     * @param {jointDataParams} jointData 关节数据
     */
    public resetAubo(aubo: Object3D, jointData: jointDataParams) {
        // 数据验证
        let correct = this.checkData([
            { type: 'robot', data: aubo },
            { type: 'jointData', data: jointData }
        ])

        if (!correct) {
            console.error('resetAubo 失败：数据验证不通过')
            return
        }

        this.setJointAngle(aubo, machines.aubo.joints as any, jointData)
    }

    /**
     * 获取设备姿态数据
     * @author LL
     * @since 2025/02/21
     */
    public getModelPose(model: Object3D) {
        // 数据验证
        let correct = this.checkData([{ type: 'model', data: model }])

        if (!correct) {
            console.error('getModelPose 失败：数据验证不通过')
            return null
        }

        /** 单节点姿态快照 */
        const snapshot = (obj: Object3D) => ({
            modelName: obj.name,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            matrixWorld: cloneDeep(obj.matrixWorld),
            visible: obj.visible
        })

        let poseData = [snapshot(model)]

        // hierarchy 新结构：{ joints: [{ name, axis, ... }], end, level }
        // 兼容旧结构：数组 / 节点带 modelName + children
        let hierarchy = model.userData.hierarchy
        if (hierarchy) {
            const nodes: any[] = Array.isArray(hierarchy)
                ? hierarchy
                : [...(hierarchy.joints || []), ...(hierarchy.level || [])]

            const collectPose = (list: any[]) => {
                for (const node of list) {
                    // joints 用 name；旧数据用 modelName
                    const modelName = node.name || node.modelName
                    if (modelName) {
                        const child = model.getObjectByName(modelName)
                        if (child) {
                            poseData.push(snapshot(child))
                        } else {
                            console.warn(`getModelPose：未找到关节 ${modelName}`)
                        }
                    }
                    if (node.children?.length) collectPose(node.children)
                }
            }
            collectPose(nodes)
            return poseData
        }

        model.traverse((child) => {
            if (child === model) return // 根节点已在 poseData[0]
            poseData.push(snapshot(child))
        })

        return poseData
    }

    /**
     * 设置设备姿态
     * @author LL
     * @since 2025/02/21
     * @param {Object3D} model
     * @param {*} poseData
     */
    public setPose(model: Object3D, poseData: any) {
        console.log('🚀 ~ :606 ~ poseData:', poseData)
        console.log('🚀 ~ :606 ~ model:', model)
        // 数据验证
        let correct = this.checkData([
            { type: 'model', data: model },
            { type: 'data', data: poseData }
        ])

        if (!correct) {
            console.error('setPose 失败：数据验证不通过')
            return
        }

        for (let i = 0; i < poseData.length; i++) {
            let child = model.getObjectByName(poseData[i].modelName)
            child.position.x = poseData[i].position.x
            child.position.y = poseData[i].position.y
            child.position.z = poseData[i].position.z
            child.rotation.x = poseData[i].rotation.x
            child.rotation.y = poseData[i].rotation.y
            child.rotation.z = poseData[i].rotation.z
            child.visible = poseData[i].visible
        }
    }

    /**
     * 根据数据路径获取数据值
     * 支持路径格式如：'root.stationInfoJson[5].plc_value'
     * @param data 数据对象
     * @param path 数据路径字符串
     * @returns 数据值
     */
    private getDataByPath = (data: any, config: DataPathConfig | jointsParams | string): number => {
        // 兼容旧版本：如果第二个参数是字符串，转换为配置对象
        let pathConfig: DataPathConfig
        if (typeof config === 'string') {
            pathConfig = { dataUrl: config, readMode: 'json' }
        } else {
            pathConfig = config
        }

        if (!data || !pathConfig || !pathConfig.dataUrl) {
            console.warn('getDataByPath: 数据或配置为空')
            return 0
        }

        const readMode = pathConfig.readMode || 'json'

        // 根据 readMode 选择处理方式
        if (readMode === 'key') {
            return this.getDataByKey(data, pathConfig)
        } else {
            return this.getDataByJsonPath(data, pathConfig.dataUrl)
        }
    }

    /**
     * 通过 JSON 路径获取数据（原有方式）
     */
    private getDataByJsonPath = (data: any, path: string): number => {
        if (!data || !path) {
            console.warn('getDataByJsonPath: 数据或路径为空')
            return 0
        }

        // 移除 'root.' 前缀
        const cleanPath = path.startsWith('root.') ? path.substring(5) : path

        // 解析路径，处理数组索引
        const pathParts = this.parsePath(cleanPath)

        let current = data

        for (const part of pathParts) {
            if (current === null || current === undefined) {
                console.warn(`getDataByJsonPath: 路径访问失败，当前值为空: ${path}`)
                return 0
            }

            if (typeof part === 'string') {
                current = current[part]
            } else if (typeof part === 'number') {
                if (!Array.isArray(current)) {
                    console.warn(`getDataByJsonPath: 尝试访问数组索引但当前值不是数组: ${path}`)
                    return 0
                }
                current = current[part]
            }
        }

        // 检查是否为数字类型或可转换为数字的字符串
        if (typeof current === 'number') {
            return current
        } else if (typeof current === 'string') {
            const result = Number(current)
            if (isNaN(result)) {
                console.warn(`getDataByJsonPath: 字符串无法转换为数字: ${current}, 路径: ${path}`)
                return 0
            }
            return result
        } else if (typeof current === 'boolean') {
            // 布尔值转换为数字：true -> 1, false -> 0
            return current ? 1 : 0
        } else if (current === null || current === undefined) {
            console.warn(`getDataByJsonPath: 值为 null 或 undefined, 路径: ${path}`)
            return 0
        } else {
            // 尝试强制转换为数字
            const result = Number(current)
            if (isNaN(result)) {
                console.warn(
                    `getDataByJsonPath: 无法转换为数字: ${typeof current}, 值: ${current}, 路径: ${path}`
                )
                return 0
            }
            return result
        }
    }

    /**
     * 通过 key 模式获取数据
     * 1. 使用 keySeek_root 读取数组
     * 2. 从 dataUrl 中提取查找键（括号内的值）
     *    - 如果括号内是 "jointId" 或 "joint_id"，则通过 jointId 字段查找
     *    - 如果括号内是 "modelName" 或 "model_name"，则通过 modelName 字段查找
     *    - 如果括号内是其他内容，默认通过 modelName 字段查找
     * 3. 在数组中查找匹配的对象索引
     * 4. 读取该对象的 value 字段
     */
    private getDataByKey = (data: any, config: DataPathConfig): number => {
        if (!config.keySeek_root || !config.dataUrl) {
            console.warn('getDataByKey: keySeek_root 或 dataUrl 为空')
            return 0
        }

        // 1. 使用 keySeek_root 读取数组
        const cleanPath = config.keySeek_root.startsWith('root.')
            ? config.keySeek_root.substring(5)
            : config.keySeek_root
        const pathParts = this.parsePath(cleanPath)

        let arrayData = data
        for (const part of pathParts) {
            if (arrayData === null || arrayData === undefined) {
                console.warn(`getDataByKey: keySeek_root 路径访问失败: ${config.keySeek_root}`)
                return 0
            }
            if (typeof part === 'string') {
                arrayData = arrayData[part]
            } else if (typeof part === 'number') {
                if (!Array.isArray(arrayData)) {
                    console.warn(`getDataByKey: keySeek_root 指向的不是数组: ${config.keySeek_root}`)
                    return 0
                }
                arrayData = arrayData[part]
            }
        }

        if (!Array.isArray(arrayData)) {
            console.warn(`getDataByKey: keySeek_root 最终值不是数组: ${config.keySeek_root}`)
            return 0
        }

        // 2. 从 dataUrl 中提取查找键（括号内的值）
        // 例如: "WS30-1(modelName) - value" -> 提取 "WS30-1"
        // 例如: "gateway_UR10_01(jointId) - value" -> 提取 "gateway_UR10_01"
        const bracketMatch = config.dataUrl.match(/\(([^)]+)\)/)
        let targetKey: string | undefined
        let searchField: 'modelName' | 'jointId' = 'modelName'

        if (bracketMatch) {
            const bracketContent = bracketMatch[1].toLowerCase()
            const beforeBracket = config.dataUrl.substring(0, bracketMatch.index).trim()

            // 判断括号内是 jointId 还是 modelName
            if (bracketContent === 'jointid' || bracketContent === 'joint_id') {
                // 如果括号内是 jointId，使用括号前的值作为 jointId
                searchField = 'jointId'
                targetKey = beforeBracket
            } else if (bracketContent === 'modelname' || bracketContent === 'model_name') {
                // 如果括号内是 modelName，使用括号前的值作为 modelName
                searchField = 'modelName'
                targetKey = beforeBracket
            } else {
                // 如果括号内是其他内容，默认使用 modelName 逻辑
                searchField = 'modelName'
                if (config.modelName) {
                    targetKey = config.modelName
                } else {
                    targetKey = beforeBracket
                }
            }
        } else if (config.modelName) {
            // 如果 dataUrl 中没有括号，直接使用 config.modelName
            targetKey = config.modelName
            searchField = 'modelName'
        }

        if (!targetKey) {
            console.warn(`getDataByKey: 无法确定目标查找键，dataUrl: ${config.dataUrl}`)
            return 0
        }

        // 3. 在数组中查找匹配的对象索引
        const targetIndex = arrayData.findIndex((item: any) => {
            if (typeof item === 'object' && item !== null) {
                if (searchField === 'jointId') {
                    return item.jointId === targetKey
                } else {
                    return item.modelName === targetKey
                }
            }
            return false
        })

        if (targetIndex === -1) {
            // 数据不存在时静默返回 0，不输出警告（数据不完整是正常情况）
            return 0
        }

        // 4. 读取该对象的 value 字段
        const targetObject = arrayData[targetIndex]
        if (targetObject === null || targetObject === undefined) {
            console.warn(`getDataByKey: 目标对象为空，索引: ${targetIndex}`)
            return 0
        }

        const value = targetObject.value
        if (value === null || value === undefined) {
            console.warn(`getDataByKey: 目标对象的 value 字段为空，${searchField}: ${targetKey}`)
            return 0
        }

        // 转换为数字
        if (typeof value === 'number') {
            return value
        } else if (typeof value === 'string') {
            const result = Number(value)
            if (isNaN(result)) {
                console.warn(`getDataByKey: value 无法转换为数字: ${value}, ${searchField}: ${targetKey}`)
                return 0
            }
            return result
        } else if (typeof value === 'boolean') {
            return value ? 1 : 0
        } else {
            const result = Number(value)
            if (isNaN(result)) {
                console.warn(
                    `getDataByKey: value 无法转换为数字: ${typeof value}, 值: ${value}, ${searchField}: ${targetKey}`
                )
                return 0
            }
            return result
        }
    }

    /**
     * 解析路径字符串，处理数组索引
     * @param path 路径字符串
     * @returns 路径部分数组
     */
    private parsePath(path: string): (string | number)[] {
        const parts: (string | number)[] = []
        let current = ''

        for (let i = 0; i < path.length; i++) {
            const char = path[i]

            if (char === '.') {
                if (current) {
                    parts.push(current)
                    current = ''
                }
            } else if (char === '[') {
                // 开始数组索引
                if (current) {
                    parts.push(current)
                    current = ''
                }
                // 找到结束的 ]
                let indexStr = ''
                i++ // 跳过 '['
                while (i < path.length && path[i] !== ']') {
                    indexStr += path[i]
                    i++
                }
                // 转换为数字
                const index = parseInt(indexStr, 10)
                if (!isNaN(index)) {
                    parts.push(index)
                } else {
                    console.warn(`parsePath: 无效的数组索引: ${indexStr}`)
                }
            } else {
                current += char
            }
        }

        if (current) {
            parts.push(current)
        }

        return parts
    }

    // ==================== Private Methods ====================

    /**
     * 数据验证主方法
     * @param data 验证数据数组
     * @returns 验证是否通过
     */
    private checkData(data: any[]): boolean {
        // 检查传入数据是否为数组
        if (!Array.isArray(data)) {
            console.error('checkData 失败：data 必须是一个数组')
            return false
        }

        // 提取 robot 对象（如果存在）
        let robot: Object3D | undefined
        for (const item of data) {
            if (item.type === 'robot') {
                robot = item.data
                break
            }
        }

        // 遍历每个数据项进行检查
        for (const item of data) {
            if (!item || typeof item !== 'object') {
                console.error('checkData 失败：数据项必须是一个对象')
                return false
            }

            const { type, data: itemData } = item

            // 根据类型进行不同的检查
            switch (type) {
                case 'joint':
                    if (!this.checkJointData(itemData, robot)) {
                        return false
                    }
                    break
                case 'data':
                    if (!this.checkAnimationData(itemData)) {
                        return false
                    }
                    break
                case 'time':
                    if (!this.checkTimeData(itemData)) {
                        return false
                    }
                    break
                case 'robot':
                    if (!this.checkRobotData(itemData)) {
                        return false
                    }
                    break
                case 'model':
                    if (!this.checkModelData(itemData)) {
                        return false
                    }
                    break
                case 'jointData':
                    if (!this.checkJointDataParams(itemData)) {
                        return false
                    }
                    break
                case 'actions':
                    if (!this.checkActionsData(itemData)) {
                        return false
                    }
                    break
                default:
                    console.error(`checkData 失败：未知的数据类型 ${type}`)
                    return false
            }
        }

        return true
    }

    /**
     * 检查关节数据
     * @param animateInfo 关节信息数组
     * @param robot 设备对象（可选）
     * @returns 验证是否通过
     */
    private checkJointData(animateInfo: any, robot?: Object3D): boolean {
        if (!animateInfo || !Array.isArray(animateInfo)) {
            console.error('checkData 失败：animateInfo 必须是一个数组')
            return false
        }

        if (animateInfo.length === 0) {
            console.warn('checkData 警告：animateInfo 数组为空')
            return false
        }

        // 检查每个关节数据的必要字段
        for (let i = 0; i < animateInfo.length; i++) {
            const element = animateInfo[i]

            // 验证必要属性
            const requiredProps = ['modelName', 'animateType', 'axis', 'dataUrl']
            const missingProps = requiredProps.filter((prop) => !element[prop])

            if (missingProps.length > 0) {
                console.error(`checkData 失败：animateInfo[${i}] 缺少必要属性: ${missingProps.join(', ')}`)
                return false
            }

            // 验证 axis 值
            if (!['x', 'y', 'z'].includes(element.axis)) {
                console.error(
                    `checkData 失败：animateInfo[${i}].axis 必须是 'x', 'y' 或 'z'，当前值: ${element.axis}`
                )
                return false
            }

            // 验证 animateType 值
            if (!['move', 'rotate'].includes(element.animateType)) {
                console.error(
                    `checkData 失败：animateInfo[${i}].animateType 必须是 'move' 或 'rotate'，当前值: ${element.animateType}`
                )
                return false
            }

            // 验证模型是否存在（如果提供了 robot 参数）
            if (robot) {
                const m = robot.getObjectByName(element.modelName)
                if (!m) {
                    console.error(`checkData 失败：找不到名为 '${element.modelName}' 的模型对象`)
                    return false
                }
            }

            // 对于旋转动画，验证 rotateUnit
            if (element.animateType === 'rotate') {
                if (element.rotateUnit && !['rad', 'deg'].includes(element.rotateUnit)) {
                    console.error(
                        `checkData 失败：animateInfo[${i}].rotateUnit 必须是 'rad' 或 'deg'，当前值: ${element.rotateUnit}`
                    )
                    return false
                }
            }

            // 验证 reverse 属性（如果存在）
            if (element.reverse !== undefined && typeof element.reverse !== 'number') {
                console.error(`checkData 失败：animateInfo[${i}].reverse 必须是数字类型`)
                return false
            }

            // 验证 correct 属性（如果存在）
            if (element.correct !== undefined && typeof element.correct !== 'number') {
                console.error(`checkData 失败：animateInfo[${i}].correct 必须是数字类型`)
                return false
            }
        }

        return true
    }

    /**
     * 检查动画数据
     * @param data 动画数据对象
     * @returns 验证是否通过
     */
    private checkAnimationData(data: any): boolean {
        if (!data || typeof data !== 'object') {
            console.error('checkData 失败：动画数据必须是一个对象')
            return false
        }

        // 检查数据对象是否为空
        if (Object.keys(data).length === 0) {
            console.warn('checkData 警告：动画数据对象为空')
            return false
        }

        return true
    }

    /**
     * 检查时间数据
     * @param time 时间值
     * @returns 验证是否通过
     */
    private checkTimeData(time: any): boolean {
        if (typeof time !== 'number' || time <= 0) {
            console.warn('time 必须是大于0的数字,当前time值：', time)
            return false
        }
        return true
    }

    /**
     * 检查设备对象
     * @param robot 设备对象
     * @returns 验证是否通过
     */
    private checkRobotData(robot: any): boolean {
        if (!robot || !robot.isObject3D) {
            console.error('checkData 失败：robot 必须是 Object3D 实例')
            return false
        }
        return true
    }

    /**
     * 检查模型对象
     * @param model 模型对象
     * @returns 验证是否通过
     */
    private checkModelData(model: any): boolean {
        if (!model || !model.isObject3D) {
            console.error('checkData 失败：model 必须是 Object3D 实例')
            return false
        }
        return true
    }

    /**
     * 检查关节数据参数
     * @param jointData 关节数据
     * @returns 验证是否通过
     */
    private checkJointDataParams(jointData: any): boolean {
        if (!jointData || typeof jointData !== 'object') {
            console.error('checkData 失败：jointData 必须是一个对象')
            return false
        }

        // 检查必要的关节数据字段
        const requiredFields = ['joint1', 'joint2', 'joint3', 'joint4', 'joint5', 'joint6']
        for (const field of requiredFields) {
            if (jointData[field] === undefined) {
                console.error(`checkData 失败：jointData 缺少必要字段 ${field}`)
                return false
            }
            if (typeof jointData[field] !== 'number') {
                console.error(`checkData 失败：jointData.${field} 必须是数字`)
                return false
            }
        }

        return true
    }

    /**
     * 检查动作数据
     * @param actions 动作数组
     * @returns 验证是否通过
     */
    private checkActionsData(actions: any): boolean {
        if (!actions || !Array.isArray(actions)) {
            console.error('checkData 失败：actions 必须是一个数组')
            return false
        }

        if (actions.length === 0) {
            console.warn('checkData 警告：actions 数组为空')
            return false
        }

        // 检查每个动作数据
        for (const action of actions) {
            if (!this.checkJointDataParams(action)) {
                return false
            }
        }

        return true
    }
}
