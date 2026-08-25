/**
 * @module
 * @mergeModuleWith <project>
 */

import { BufferGeometry, Euler, Material, Mesh, Object3D, Vector3 } from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import type { Evaluator as EvaluatorType } from 'three-bvh-csg'

/** three-bvh-csg 运行时支持 useWorker，类型定义可能滞后 */
type EvaluatorWithWorker = EvaluatorType & { useWorker?: boolean }

/** 剪刀（刀具）在世界中的位姿：位置必传，旋转、缩放可选（欧拉角为弧度，order 默认 XYZ） */
/**
 * @group Interfaces
 */
export interface CutterWorldPose {
    position: Vector3 | { x: number; y: number; z: number }
    rotation?: Euler | { x: number; y: number; z: number; order?: Euler['order'] }
    scale?: Vector3 | { x: number; y: number; z: number } | number
}

/**
 * 基于 three-bvh-csg 的布尔差集（目标 − 剪刀）。对外以 {@link subtractCutter} 为唯一主入口。
 *
 * @author LL
 * @since 2026/05/13
 */
export class TCSG {
    private evaluator: Evaluator

    constructor() {
        this.evaluator = new Evaluator()
        ;(this.evaluator as EvaluatorWithWorker).useWorker = false
    }

    /**
     * 对被切模型与剪刀模型做差集（目标 − 剪刀），剪刀由 `cutterPose` 指定在世界中的切割位姿。
     *
     * - `target`：被切体，支持含多 Mesh 的 `Object3D`（内部合并到世界空间），或直接传入已合并的 `BufferGeometry`（视为已在世界空间）。
     * - `cutter`：`BufferGeometry` 视为局部空间网格，位姿作用在 Brush 上；`Object3D` 会先 `clone(true)` 再按 `cutterPose` 设根变换后合并烘焙（不修改场景中原对象）。
     * - 返回值：新的 `BufferGeometry`；赋给展示 `Mesh` 后请自行 `dispose` 旧几何。
     */
    public subtractCutter(
        target: Object3D | BufferGeometry,
        cutter: Object3D | BufferGeometry,
        cutterPose: CutterWorldPose
    ): BufferGeometry {
        const mergedTarget = this.toMergedWorldGeometry(target)
        if (!mergedTarget || !mergedTarget.getAttribute('position')) {
            throw new Error('TCSG.subtractCutter: 被切模型无有效三角网格')
        }

        const brushA = new Brush(mergedTarget)
        brushA.updateMatrixWorld(true)

        const brushB = this.buildCutterBrush(cutter, cutterPose)
        if (!brushB.geometry || !brushB.geometry.getAttribute('position')) {
            this.disposeBrush(brushA)
            mergedTarget.dispose()
            throw new Error('TCSG.subtractCutter: 剪刀模型无有效三角网格')
        }
        brushB.updateMatrixWorld(true)

        const out = this.evaluator.evaluate(brushA, brushB, SUBTRACTION)
        const result = out.geometry.clone()

        this.disposeBrush(brushA)
        this.disposeBrush(brushB)
        out.disposeCacheData?.()

        return result
    }

    private toMergedWorldGeometry(target: Object3D | BufferGeometry): BufferGeometry | null {
        if (target instanceof BufferGeometry) {
            return target.clone()
        }
        return this.mergeMeshGeometriesFromObject(target)
    }

    private buildCutterBrush(cutter: Object3D | BufferGeometry, pose: CutterWorldPose): Brush {
        if (cutter instanceof BufferGeometry) {
            const brush = new Brush(cutter.clone())
            this.applyPoseToObject(brush, pose)
            return brush
        }
        const root = cutter.clone(true)
        this.applyPoseToObject(root, pose)
        root.updateMatrixWorld(true)
        const merged = this.mergeMeshGeometriesFromObject(root)
        this.disposeObject3DDeep(root)
        if (!merged) {
            throw new Error('TCSG.subtractCutter: 剪刀 Object3D 中无 Mesh')
        }
        return new Brush(merged)
    }

    private applyPoseToObject(root: Object3D, pose: CutterWorldPose): void {
        const p = pose.position
        if (p instanceof Vector3) root.position.copy(p)
        else root.position.set(p.x, p.y, p.z)

        if (pose.rotation !== undefined) {
            const r = pose.rotation
            if (r instanceof Euler) root.rotation.copy(r)
            else root.rotation.set(r.x, r.y, r.z, r.order ?? 'XYZ')
        } else {
            root.rotation.set(0, 0, 0)
        }

        if (pose.scale !== undefined) {
            const s = pose.scale
            if (typeof s === 'number') root.scale.setScalar(s)
            else if (s instanceof Vector3) root.scale.copy(s)
            else root.scale.set(s.x, s.y, s.z)
        } else {
            root.scale.set(1, 1, 1)
        }
    }

    private mergeMeshGeometriesFromObject(root: Object3D): BufferGeometry | null {
        root.updateMatrixWorld(true)
        const pieces: BufferGeometry[] = []
        root.traverse((child) => {
            const mesh = child as Mesh
            if (!mesh.isMesh || !mesh.geometry) return
            const g = mesh.geometry.clone() as BufferGeometry
            g.applyMatrix4(mesh.matrixWorld)
            pieces.push(g)
        })
        if (!pieces.length) return null
        try {
            const merged = BufferGeometryUtils.mergeGeometries(pieces, false)
            for (const g of pieces) g.dispose()
            return merged
        } catch {
            const merged = pieces[0]
            for (let i = 1; i < pieces.length; i++) pieces[i].dispose()
            return merged
        }
    }

    private disposeBrush(brush: Brush): void {
        brush.geometry?.dispose?.()
        const mats = brush.material
        if (Array.isArray(mats)) mats.forEach((m) => (m as Material)?.dispose?.())
        else (mats as Material | undefined)?.dispose?.()
        brush.disposeCacheData?.()
    }

    private disposeObject3DDeep(obj: Object3D): void {
        obj.traverse((c) => {
            const mesh = c as Mesh
            if (mesh.isMesh) {
                mesh.geometry?.dispose?.()
                const mats = mesh.material
                if (Array.isArray(mats)) mats.forEach((m) => (m as Material)?.dispose?.())
                else (mats as Material | undefined)?.dispose?.()
            }
        })
    }
}
