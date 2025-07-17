import { EventDispatcher } from "three";
import { Tool } from "./Tool";
import { TModel } from "./TModel";
import { TMaterial } from "./TMaterial";
import { TLine } from "./TLine";

/**
 * 鼠标事件
 */
export class TEventDispatcher extends EventDispatcher {
  /** 工具函数 */
  private tool: Tool = new Tool();
  /** 模型 */
  private model: TModel = new TModel();
  /** 线条模型 */
  private line: TLine = new TLine();
  /** 材质 */
  private material: TMaterial = new TMaterial();

  /**
   * 获取face距离最近的点
   * @author LL
   * @since 2025/03/24
   * @param {*} intersect 鼠标点击获取的模型列表
   * @param {number} radius 半径
   */
  public getIntersectPoint(intersect: any, radius: number) {
    // 获取几何体顶点数据
    const geometry = intersect.object.geometry;
    const positions = geometry.attributes.position.array;

    // 获取三个顶点坐标
    const vertices = [
      this.tool.initVector3().fromArray(positions, intersect.face.a * 3),
      this.tool.initVector3().fromArray(positions, intersect.face.b * 3),
      this.tool.initVector3().fromArray(positions, intersect.face.c * 3),
    ];

    // 转换到世界坐标系（重要！）
    vertices.forEach((v) => v.applyMatrix4(intersect.object.matrixWorld));

    // 计算各顶点到交点的距离
    const distances = vertices.map((v) => v.distanceTo(intersect.point));

    // 找到最近顶点索引
    const closestIndex = distances.indexOf(Math.min(...distances));

    // 对应到原始顶点索引
    const originalIndices = [
      intersect.face.a,
      intersect.face.b,
      intersect.face.c,
    ];
    const closestVertexIndex = originalIndices[closestIndex];

    // 获取实际顶点对象（世界坐标系）
    const closestVertex = vertices[closestIndex];

    let activePoint = this.model.initSphere({
      base: {
        radius: radius,
      },
    });
    activePoint.position.copy(closestVertex);

    return activePoint;
  }

  /**
   * 获取最近的面
   * @author LL
   * @since 2025/03/24
   * @param {*} intersect 鼠标点击获取的模型列表
   */
  public getIntersectFace(intersect: any) {
    const geometry = intersect.object.geometry;
    const face = intersect.face;

    // 获取顶点索引
    const indices = [face.a, face.b, face.c];

    // 存储顶点世界坐标的数组
    const worldPositions = [];

    // 遍历三个顶点
    indices.forEach((vertexIndex) => {
      // 从几何体属性获取局部坐标
      const localPosition = this.tool
        .initVector3()
        .fromBufferAttribute(geometry.attributes.position, vertexIndex);

      // 转换为世界坐标
      const worldPosition = localPosition.applyMatrix4(
        intersect.object.matrixWorld
      );
      worldPositions.push(worldPosition);
    });

    var geometry2 = this.model.initBufferGeometry();
    var vertices = new Float32Array([
      worldPositions[0].x,
      worldPositions[0].y,
      worldPositions[0].z, // 顶点1的x, y, z坐标
      worldPositions[1].x,
      worldPositions[1].y,
      worldPositions[1].z, // 顶点2的x, y, z坐标
      worldPositions[2].x,
      worldPositions[2].y,
      worldPositions[2].z, // 顶点3的x, y, z坐标
    ]);
    geometry2.setAttribute(
      "position",
      this.model.initBufferAttribute(vertices, 3)
    );
    geometry2.setIndex([0, 1, 2]); // 设置三角形的顶点索引，形成一个三角形面（面由三个顶点组成）

    // 材质
    var material = this.material.initBasicMaterial({color:"#00ff00"}); // 绿色材质

    // 网格（几何体和材质的结合）
    let activeFace = this.model.initMesh(geometry2, material);
    activeFace.renderOrder = 9999;
    return activeFace;
  }

  /**
   * 获取最近的线
   * @author LL
   * @since 2025/03/24
   * @param {*} intersect 鼠标点击获取的模型列表
   */
  public getIntersectLine(intersect: any) {
    const face = intersect.face!;
    const mesh = intersect.object;

    // 获取顶点世界坐标
    const geometry = mesh.geometry;
    const vertices = geometry.attributes.position.array;
    const getWorldVertex = (index: number) => {
      const v = this.tool.initVector3(
        vertices[index * 3],
        vertices[index * 3 + 1],
        vertices[index * 3 + 2]
      );
      return v.applyMatrix4(mesh.matrixWorld);
    };

    const vA = getWorldVertex(face.a);
    const vB = getWorldVertex(face.b);
    const vC = getWorldVertex(face.c);

    // 定义三条边
    const edges = [
      { start: vA, end: vB },
      { start: vB, end: vC },
      { start: vC, end: vA },
    ];

    // 计算各边到点击点的距离
    const distances = edges.map((edge) =>
      this.tool.getPointLineDistance(
        { x: intersect.point.x, y: intersect.point.y, z: intersect.point.z },
        {
          start: { x: edge.start.x, y: edge.start.y, z: edge.start.z },
          end: { x: edge.end.x, y: edge.end.y, z: edge.end.z },
        }
      )
    );

    // 获取最近边的索引
    const closestEdgeIndex = distances.indexOf(Math.min(...distances));

    let line = this.line.initLine({
      base: {
        p1: {
          x: edges[closestEdgeIndex].start.x,
          y: edges[closestEdgeIndex].start.y,
          z: edges[closestEdgeIndex].start.z,
        },
        p2: {
          x: edges[closestEdgeIndex].end.x,
          y: edges[closestEdgeIndex].end.y,
          z: edges[closestEdgeIndex].end.z,
        },
      },
    });

    return line;
  }
}
