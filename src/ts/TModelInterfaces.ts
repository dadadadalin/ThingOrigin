/**
 * @module
 * @mergeModuleWith <project>
 */

import { Vector3 } from 'three'
import { rotationXYZ } from './scenePrams'

/**
 * @group Interfaces
 */
export interface prs {
    position: xyz | Vector3
    rotation: xyz | Vector3
    scale: xyz | Vector3
}
/**
 * 模型参数
 * @param author LL
 * @param since 2021/09/16
 * @param param id number 模型id。
 * @param param modelName string 模型名称。
 * @param param base any 模型基础信息，包括modelUrl。
 * @param param visible boolean 是否显示
 * @param param material any 基础模型材质。
 * @param param position xyz 位置。
 * @param param rotation xyz 旋转。
 * @param param scale xyz 缩放。
 * @param param modelType string 模型类型，包括（sphere,cube,cylinder,cone,circle,gltf,glb,fbx,obj,stl,json,zip,text,assemble,lod）
 * @param param loadType 加载类型。
 * @param param selectModel 选中模型名称 （仅 zip 类型有效）, 未指定则弹窗选择
 * @param param userData any 用户自定义数据
 */
/**
 * @group Interfaces
 */
export interface modelInfoParams {
    id?: number
    modelName?: string
    base?: any
    visible?: boolean
    material?: any
    position?: xyz | Vector3
    rotation?: xyz | rotationXYZ | Vector3
    scale?: xyz | Vector3
    modelType?: string
    repairSlotLimit?: number /** FBX 自动补图槽位上限（仅 zip + fbx 生效），默认 500 */
    selectModel?: string /** 选中模型名称 （仅 zip 类型有效）, 未指定则弹窗选择 */
    loadType?: string /** 加载类型 */
    userData?: any /** 用户自定义数据 */
    [key: string]: any
}

/**
 * @group Interfaces
 */
export interface fenceInfoParams extends modelInfoParams {
    base: {
        height: number
        closed: boolean
        children: xyz[] | Vector3[]
    }
    material: {
        type: string
        color: {
            color: string
            opacity: number
        }
        image: {
            repeatX: number
            repeatY: number
            url: string
        }
        doubleSide: boolean
    }
}

/**
 * @group Interfaces
 */
export interface indexedDBmodelInfoParams extends modelInfoParams {
    id: number
}

export interface updateInfoParams {
    modelInfo: modelInfoParams
    update: string
}

interface xyz {
    x: number
    y: number
    z: number
}
