import {
  Box3,
  Color,
  Matrix4,
  Object3D,
  Sphere,
  Vector3,
  Clock,
  Mesh,
  Matrix3,
  Vector4,
  Euler,
  EulerOrder,
  Quaternion,
  Vector2,
} from "three";

/**
 * 自定义工具方法
 */
export class Tool {
  /**
   * 创建Three.js颜色
   * @author LL
   */
  public initColor(color?: string): Color {
    return color ? new Color(color) : new Color();
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
    return new Vector2(x, y);
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
    return new Vector3(x, y, z);
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
    return new Vector4(x, y, z, w);
  }

  /**
   * 获取轴向量
   * @author LL
   * @since 2022/04/25
   * @param {string} axis 轴
   * @param {number} [value=1]
   * @returns {*}  {Vector3}
   */
  public initVector3ByAxis(axis: "x" | "y" | "z", value: number = 1): Vector3 {
    let vec3: Vector3;
    if (axis == "x") {
      vec3 = new Vector3(value, 0, 0);
    } else if (axis == "y") {
      vec3 = new Vector3(0, value, 0);
    } else if (axis == "z") {
      vec3 = new Vector3(0, 0, value);
    }

    return vec3;
  }

  /**
   * 创建3x3矩阵
   * @author LL
   * @since 2024/07/19
   */
  public initMatrix3(): Matrix3 {
    return new Matrix3();
  }

  /**
   * 创建4x4矩阵
   * @author gj
   * @since 2023/11/20
   * @returns {*}  {Matrix4}
   */
  public initMatrix4(): Matrix4 {
    return new Matrix4();
  }

  /**
   * 创建Quaternion
   * @author LL
   * @since 2025/03/17
   */
  public initQuaternion() {
    return new Quaternion();
  }

  /**
   * 创建Box3
   * @author LL
   * @since 2025/03/26
   */
  public initBox3() {
    return new Box3();
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
    return new Euler(x, y, z, order);
  }

  /**
   * 获取模型中心点位置
   * @author LL
   * @param {Object3D} obj 模型
   * @return {*}  {Vector3}
   */
  public getModelCenter(obj: Object3D): Vector3 {
    let box = this.getModelBox(obj);
    return box.getCenter(new Vector3());
  }

  /**
   * 获取模型包围盒
   * @author LL
   * @param {Object3D} obj 模型
   * @return {*}  {Box3}
   */
  public getModelBox(obj: Object3D) {
    let box = new Box3();
    //通过传入的object3D对象来返回当前模型的最小大小，值可以使一个mesh也可以使group
    box.expandByObject(obj);

    return box;
  }

  /**
   * 获取模型包围盒尺寸
   * @author LL
   * @since 2024/09/18
   * @param {Object3D} obj
   */
  public getModelSize(obj: Object3D) {
    let box = this.getModelBox(obj);
    return {
      max: box.max,
      min: box.min,
      width: box.max.x - box.min.x,
      height: box.max.y - box.min.y,
      depth: box.max.z - box.min.z,
      center: box.getCenter(new Vector3()),
    };
  }

  /**
   * 获取模型的包裹球
   * @author LL
   * @param {Object3D} obj
   * @return {*}  {Sphere}
   */
  public getModelSphere(obj: Object3D): Sphere {
    if (!obj) {
      console.warn("获取包裹球失败，物体不存在");
      return;
    }

    let center = this.getModelCenter(obj);

    let box = this.getModelBox(obj);
    let radius = center.distanceTo(
      new Vector3(box.max.x, box.max.y, box.max.z)
    );

    return new Sphere(center, radius);
  }

  /**
   * 获取模型的子模型信息
   * @author LL
   * @param {Object3D} model 模型
   * @returns {*}  {Object3D[]}
   */
  public getChildrenInfo(model: Object3D): Object3D[] {
    if (!model) {
      console.warn("获取子模型失败，物体不存在");
      return;
    }

    let info = [];
    model.traverse((child) => {
      let infoData = {
        name: child.name,
        uuid: child.uuid,
        parent: child.parent.uuid,
        type: child.type,
        position: child.position,
        rotation: child.rotation,
        scale: child.scale,
        ownMarker: this.ownMarker(child),
      };
      info.push(infoData);
    });

    info.splice(0, 1);
    return info;
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
      console.warn("获取信息失败，物体不存在");
      return;
    }
    let info = new Object();
    info["name"] = model.name;
    info["modelName"] = model.name;
    info["position"] = model.position;
    info["rotation"] = model.rotation;
    info["scale"] = model.scale;
    info["type"] = model.type;
    info["uuid"] = model.uuid;
    info["ownMarker"] = this.ownMarker(model);
    info["visible"] = model.visible;
    info["userData"] = model["userData"];
    info["box3"] = this.getModelSize(model);

    return info;
  }

  /**
   * 获取模型顶点数
   * @author gj
   * @since 2023/5/16
   * @update LL 24/6/19
   * @param {Object3D} model 模型
   * @returns {*}  {number} 顶点数
   */
  public getModelVertex(model: Object3D): number {
    if (!model) {
      console.warn("获取信息失败，物体不存在");
      return;
    }

    let vertices = 0; //模型顶点
    model.traverseVisible((object) => {
      if ((object as Mesh).isMesh) {
        let geometry = (object as Mesh).geometry;
        if (geometry && geometry.isBufferGeometry) {
          vertices += geometry.attributes.position.count;
        }
      }
    });
    return vertices;
  }

  /**
   * 获取模型三角面数
   * @author gj
   * @since 2023/5/16
   * @update LL 24/6/20
   * @param {Object3D} model 模型
   * @returns {*}  {number} 三角面数
   */
  public getModelFace(model: Object3D): number {
    if (!model) {
      console.warn("获取信息失败，物体不存在");
      return;
    }

    let triangles = 0; //模型面数
    model.traverseVisible((object) => {
      if ((object as Mesh).isMesh) {
        let geometry = (object as Mesh).geometry;
        if (geometry && geometry.isBufferGeometry) {
          if (geometry.index) {
            triangles += geometry.index.array.length / 3;
          }
        }
      }
    });
    return triangles;
  }

  /**
   * 计算两点间距离
   * @author LL
   * @param {xyz} start
   * @param {xyz} end
   * @return {*}  {number}
   */
  public getPointDistance(start: xyz, end: xyz): number {
    return new Vector3(start.x, start.y, start.z).distanceTo(
      new Vector3(end.x, end.y, end.z)
    );
  }

  /**
   * 获取点到线的最小距离
   * @author LL
   * @since 2025/03/26
   * @param {*} point
   * @param {*} lineStart
   * @param {*} lineEnd
   */
  public getPointLineDistance(
    point: xyz,
    line: {
      start: xyz;
      end: xyz;
    }
  ): number {
    let lineStart = new Vector3(line.start.x, line.start.y, line.start.z);
    let lineEnd = new Vector3(line.end.x, line.end.y, line.end.z);
    let pointV3 = new Vector3(point.x, point.y, point.z);

    const lineVec = new Vector3().subVectors(lineEnd, lineStart);
    const pointVec = new Vector3().subVectors(pointV3, lineStart);
    const t = pointVec.dot(lineVec) / lineVec.lengthSq();
    const clampedT = Math.max(0, Math.min(1, t));
    const closestPoint = this.initVector3()
      .copy(lineStart)
      .add(lineVec.multiplyScalar(clampedT));
    return pointV3.distanceTo(closestPoint);
  }

  /**
   * 获取模型世界坐标位置
   * @author LL
   * @since 2024/09/04
   * @param {Object3D} obj 模型
   */
  public getWorldPosition(obj: Object3D): Vector3 {
    let position = new Vector3();
    obj.getWorldPosition(position);
    return position;
  }

  /**
   * 判断模型是否有2D标记
   * @author LL
   * @since 2024/07/04
   * @param {Object3D} obj 模型
   * @param domId 2D标记id
   */
  public ownMarker(obj: Object3D, domId?: string): boolean {
    let result = false;
    obj.traverse((child: any) => {
      if (child.isCSS2DObject) {
        if (!domId || (domId && child.element.id === domId)) {
          // console.log("child", child.isCSS2DObject);
          result = true;
        }
      }
    });
    return result;
  }

  /**
   * 判断是否是数组
   * @author LL
   * @since 08/10/2023
   * @param {*} value
   */
  public isArray(value: any): Boolean {
    return (
      value &&
      typeof value === "object" &&
      typeof value.length === "number" &&
      typeof value.splice === "function" &&
      !value.propertyIsEnumerable("length")
    );
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
   * @returns {*}  {Clock}
   */
  public initClock(): Clock {
    return new Clock();
  }
}
