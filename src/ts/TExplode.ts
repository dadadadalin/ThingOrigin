/**
 * @module
 * @mergeModuleWith <project>
 */

import { Object3D } from 'three'
import { ThingOrigin } from '../ThingOrigin'
import { explodeInfoParams } from './TExplodeInterfaces'

/**
 * 爆炸图
 */
export class TExplode {
    private TO: ThingOrigin
    private explodeTweens: Map<
        Object3D,
        Array<{ child: Object3D; tweens: Array<any>; originalPos: { x: number; y: number; z: number } }>
    > = new Map()

    constructor(TO: ThingOrigin) {
        this.TO = TO
    }

    /**
     * 展示爆炸图
     * @author LL
     * @since 2021/09/01
     * @param {Object3D} model 模型
     * @param {explodeInfo} explodeInfo 爆炸参数
     * @param {boolean} isClear 是否清除之前的动画引用
     */
    explode(model: Object3D, explodeInfo: explodeInfoParams, isClear: boolean = false): Promise<void> {
        return new Promise((resolve) => {
            if (!model) {
                console.warn('爆炸失败，物体不存在')
                resolve()
                return
            }

            // 清除之前的动画引用
            if (isClear) {
                this.stopExplode(model)
            }

            var a = this.TO.tool.getChildrenInfo(model)
            const modelTweens: Array<{
                child: Object3D
                tweens: Array<any>
                originalPos: { x: number; y: number; z: number }
            }> = []

            const animationPromises: Array<Promise<void>> = []

            for (var i = 0; i < a.length; i++) {
                var child = model.getObjectByProperty('uuid', a[i].uuid)
                if (!child) continue

                // 保存原始位置
                const originalPos = {
                    x: a[i].position.x,
                    y: a[i].position.y,
                    z: a[i].position.z,
                }

                // 为每个方向的动画创建 Promise 并获取 tween 引用
                let tweenX: any = null
                let tweenY: any = null
                let tweenZ: any = null

                const promiseX = new Promise<void>((resolveTween) => {
                    tweenX = this.TO.animate.move(
                        child,
                        'x',
                        a[i].position.x,
                        a[i].position.x * explodeInfo.ratio,
                        explodeInfo.time,
                        'linear',
                        () => resolveTween()
                    )
                    if (!tweenX) {
                        resolveTween()
                    }
                })

                const promiseY = new Promise<void>((resolveTween) => {
                    tweenY = this.TO.animate.move(
                        child,
                        'y',
                        a[i].position.y,
                        a[i].position.y * explodeInfo.ratio,
                        explodeInfo.time,
                        'linear',
                        () => resolveTween()
                    )
                    if (!tweenY) {
                        resolveTween()
                    }
                })

                const promiseZ = new Promise<void>((resolveTween) => {
                    tweenZ = this.TO.animate.move(
                        child,
                        'z',
                        a[i].position.z,
                        a[i].position.z * explodeInfo.ratio,
                        explodeInfo.time,
                        'linear',
                        () => resolveTween()
                    )
                    if (!tweenZ) {
                        resolveTween()
                    }
                })

                // 存储子对象、动画引用和原始位置
                modelTweens.push({
                    child: child,
                    tweens: [tweenX, tweenY, tweenZ],
                    originalPos: originalPos,
                })

                // 将 Promise 添加到数组中
                animationPromises.push(promiseX, promiseY, promiseZ)
            }

            // 将模型的所有动画引用存储到 Map 中
            if (modelTweens.length > 0) {
                this.explodeTweens.set(model, modelTweens)
            }

            // 等待所有动画完成
            if (animationPromises.length > 0) {
                Promise.all(animationPromises).then(() => {
                    resolve()
                })
            } else {
                resolve()
            }
        })
    }

    /**
     * 停止爆炸图
     * @author gj
     * @since 2026/01/14
     * @param {Object3D} model 模型
     */
    stopExplode(model: Object3D) {
        if (!model) {
            console.warn('停止爆炸失败，物体不存在')
            return
        }

        const modelTweens = this.explodeTweens.get(model)
        if (!modelTweens || modelTweens.length === 0) {
            return
        }

        // 停止所有动画并恢复原始位置
        modelTweens.forEach(({ child, tweens, originalPos }) => {
            // 停止所有方向的动画
            tweens.forEach((tween) => {
                if (tween) {
                    tween.stop()
                }
            })

            // 恢复到原始位置
            if (child && originalPos) {
                child.position.set(originalPos.x, originalPos.y, originalPos.z)
            }
        })

        // 清除动画引用
        this.explodeTweens.delete(model)
    }

    /**
     * 展示爆炸图（流程）
     * @author LL
     * @since 2024/07/10
     * @param {Object3D} origin 源模型
     * @param {explodeInfo} explodeInfo 爆炸参数
     */
    showExplode(origin: Object3D, explodeInfo: explodeInfoParams): Object3D {
        let explodeModel = origin.clone()
        this.TO.marker.removeMarker(explodeModel)
        this.TO.scene.add(explodeModel)
        this.TO.effect.initBreath(explodeModel)

        //通过模型包裹球  确定相机位置
        let boundSphere = this.TO.tool.getModelSphere(explodeModel)
        this.TO.camera.camera.position.set(
            0,
            boundSphere.radius * explodeInfo.ratio * 2,
            boundSphere.radius * explodeInfo.ratio * 2
        )
        this.TO.camera.camera.lookAt(boundSphere.center)
        this.explode(explodeModel, explodeInfo)

        return explodeModel
    }
}
