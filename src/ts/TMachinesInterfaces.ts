/**
 * @module
 * @mergeModuleWith <project>
 */

import { Vector3 } from 'three'
import { xyz } from './scenePrams'

/**
 * @group Interfaces
 */
export interface jointsParams {
    axis: Vector3 | xyz | 'x' | 'y' | 'z' | 'free'
    freeAxis?: any
    pivot?: any
    unit: 'rad' | 'deg'
    modelName: string
    animateType: string
    rotateUnit?: string
    reverse?: number
    pose?: number
    correct?: number
    dataUrl: string
    simulateRange?: number[]
    formula?: string
    readMode?: 'json' | 'key'
    keySeek_root?: string
}

/**
 * getDataByPath 函数的配置参数
 */
/**
 * @group Interfaces
 */
export interface DataPathConfig {
    axis?: Vector3 | xyz | 'x' | 'y' | 'z' | 'free'
    rotateUnit?: string
    dataUrl: string
    modelName?: string
    reverse?: number
    pose?: number
    readMode?: 'json' | 'key'
    keySeek_root?: string
    animateType?: string
    formula?: string
    correct?: number
}

/**
 * @group Interfaces
 */
export interface jointDataParams {
    joint1: number
    joint2: number
    joint3: number
    joint4: number
    joint5: number
    joint6: number
}
