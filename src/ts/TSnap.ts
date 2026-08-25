/**
 * @module
 * @mergeModuleWith <project>
 */

import { ThingOrigin } from '../ThingOrigin';
import { TLine } from './TLine';
import { Tool } from './Tool';
import { snapFaceParams, snapLineParams, snapPointParams } from './TSnapInterfaces';

/**
 * 吸附
 */
export class TSnap {
  /** 工具函数 */
  private tool: Tool = new Tool();

  /** 线条模型 */
  private line: TLine;

  constructor(TO: ThingOrigin) {
    this.line = new TLine(TO);
  }

  /**
   * 点吸附
   * @author LL
   * @since 2025/03/24
   * @param {snapPointParams} modelA 模型A及点
   * @param {snapPointParams} modelB 模型B及点
   * @remarkers B模型主动去吸附A模型
   */
  snapPoint(modelA: snapPointParams, modelB: snapPointParams) {
    // 计算偏移量
    const offset = modelA.position.clone().sub(modelB.position);

    // 移动模型（这里以移动modelA为例）
    modelB.model.position.add(offset);
    modelB.model.updateMatrixWorld(true);

    // 可选：如果需要精确对齐，可考虑局部坐标系转换
    // const worldOffset = modelA.localToWorld(offset);
    // modelB.position.copy(worldOffset);
  }

  /**
   * 线吸附
   * @author LL
   * @since 2025/03/26
   * @param {snapLineParams} modelA 模型A及线
   * @param {snapLineParams} modelB 模型B及线
   * @remarkers B模型主动去吸附A模型
   */
  public snapLine(modelA: snapLineParams, modelB: snapLineParams) {
    // 步骤1：计算两个线段的方向向量
    const dirA = this.line.getLineDirection(modelA.line); // 第一个线段方向
    const dirB = this.line.getLineDirection(modelB.line); // 第二个线段方向

    // 步骤2：计算旋转四元数（关键逻辑）
    const targetDir = dirA.clone();
    const currentDir = dirB.clone();

    // 处理方向相反的情况（取反使最小角度旋转）
    if (currentDir.angleTo(targetDir.negate()) < currentDir.angleTo(targetDir)) {
      targetDir.negate();
    }

    // 创建旋转四元数
    const quaternion = this.tool.initQuaternion().setFromUnitVectors(currentDir.normalize(), targetDir.normalize());

    // 步骤3：应用旋转（保持线段位置不变）
    modelB.model.applyQuaternion(quaternion);

    // 可选步骤：位置补偿（保持线段中心点对齐）
    const centerA = this.tool.initBox3().setFromObject(modelA.line).getCenter(this.tool.initVector3());
    const centerB = this.tool.initBox3().setFromObject(modelB.line).getCenter(this.tool.initVector3());
    modelB.model.position.add(centerA.sub(centerB));
  }

  /**
   * 面吸附
   * @author LL
   * @since 2025/03/24
   * @param {snapFaceParams} modelA 模型A及面
   * @param {snapFaceParams} modelB 模型B及面
   * @remarkers B模型主动去吸附A模型
   */
  snapFace(modelA: snapFaceParams, modelB: snapFaceParams) {
    // ===== 1. 法线对齐 =====
    // 获取世界坐标系下的法线（直接使用射线相交结果）
    const sourceNormal = modelA.normal.clone().normalize();
    const targetNormal = modelB.normal.clone().normalize();

    // ===== 2. 计算面中心（世界坐标）=====
    const getFaceWorldCenter = (faceMesh) => {
      const geometry = faceMesh.geometry;
      const posAttr = geometry.attributes.position;
      const center = this.tool.initVector3();

      // 遍历三角面三个顶点
      for (let i = 0; i < 3; i++) {
        const vertex = this.tool.initVector3().fromBufferAttribute(posAttr, i).applyMatrix4(faceMesh.matrixWorld); // 应用完整世界变换
        center.add(vertex);
      }
      return center.divideScalar(3);
    };

    const sourceCenter = getFaceWorldCenter(modelA.face);
    const targetCenter = getFaceWorldCenter(modelB.face);

    // ===== 3. 矩阵变换（四步操作）=====
    // 步骤一：保存原始状态
    const targetPos = modelB.model.position.clone();
    modelB.model.quaternion.clone();
    modelB.model.scale.clone();

    // 步骤二：计算旋转四元数
    const rotateQuat = this.tool.initQuaternion().setFromUnitVectors(targetNormal, sourceNormal);

    // 步骤三：计算位移补偿
    const rotatedTargetCenter = targetCenter
      .clone()
      .sub(targetPos) // 转换到模型本地坐标系
      .applyQuaternion(rotateQuat) // 应用旋转后的坐标
      .add(targetPos); // 转回世界坐标系

    const offset = sourceCenter.clone().sub(rotatedTargetCenter);

    // 步骤四：应用变换
    modelB.model.position.add(offset);
    modelB.model.applyQuaternion(rotateQuat);
  }
}
