import { Box3, Color, Object3D, Sphere, Vector3 } from "three";

/**
 * 自定义工具方法
 */
export class Tool {
    /**
     * @description 创建Three.js颜色
     * @author LL
     */
    public Color(color: string): Color {
        return new Color(color);
    }

    /**
     * @description 创建向量
     * @author LL
     * @date 2021/08/24
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {*}  {Vector3}
     */
    public vector3(x: number, y: number, z: number): Vector3 {
        return new Vector3(x, y, x);
    }

    /**
     * @description 获取轴向量
     * @author LL
     * @date 25/04/2022
     * @private
     * @param {string} axis
     * @returns {*}  {Vector3}
     */
    public getAxisVector3(axis: string, value: number): Vector3 {
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
     * @description 获取模型中心点位置
     * @author LL
     * @param {Object3D} obj
     * @return {*}  {Vector3}
     */
    public getObjectCenter(obj: Object3D): Vector3 {
        let box = this.getObjectBox(obj);
        let newPosition = new Vector3((box.max.x + box.min.x) / 2, (box.max.y + box.min.y) / 2, (box.max.z + box.min.z) / 2);
        return newPosition;
    }

    /**
     * @description 返回模型的包圍盒
     * @author LL
     * @param {Object3D} obj
     * @return {*}  {Box3}
     */
    public getObjectBox(obj: Object3D): Box3 {
        let box = new Box3();
        //通过传入的object3D对象来返回当前模型的最小大小，值可以使一个mesh也可以使group
        box.expandByObject(obj);

        return box;
    }

    /**
     * @description 返回模型的包裹球
     * @author LL
     * @param {Object3D} obj
     * @return {*}  {Sphere}
     */
    public getObjectSphere(obj: Object3D): Sphere {
        if (!obj) {
            console.warn("获取包裹球失败，物体不存在");
            return;
        }

        let center = this.getObjectCenter(obj);

        let box = this.getObjectBox(obj);
        let radius = center.distanceTo(new Vector3(box.max.x, box.max.y, box.max.z));

        return new Sphere(center, radius);
    }

    /**
     * @description 计算两点间距离
     * @author LL
     * @param {number[]} start
     * @param {number[]} end
     * @return {*}  {number}
     */
    public distance(start: number[], end: number[]): number {
        return new Vector3(start[0], start[1], start[2]).distanceTo(new Vector3(end[0], end[1], end[2]));
    }
}
