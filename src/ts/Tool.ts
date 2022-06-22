import { Box3, Color, Object3D, Sphere, Vector3 } from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";

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
     * @param {string} axis 轴
     * @param {number} [value=1]
     * @returns {*}  {Vector3}
     */
    public getAxisVector3(axis: string, value: number = 1): Vector3 {
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
     * @param {Object3D} obj 模型
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
     * @param {Object3D} obj 模型
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
     * @description
     * @author LL
     * @date 2021/10/15 获取模型的子模型集合
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
                ownCSS2D: this.ifOwnCSS2D(child),
            };
            info.push(infoData);
        });

        info.splice(0, 1);
        return info;
    }

    public getObjectStructure(model: Object3D): Object3D[] {
        var arr = this.getChildrenInfo(model);

        const newArr = [];
        const map = {};
        arr.forEach((item) => {
            if (!item.children) item.children = []; //判断数据是否有子级   没有则进行子级的添加
            map[item.uuid] = item; // 添加对应的映射关系
        });
        arr.forEach((item) => {
            //@ts-ignore
            if (map[item.parent]) {
                //@ts-ignore
                map[item.parent].children.push(item);
            } else {
                newArr.push(item);
            }
        });

        console.log(newArr);

        return newArr;
    }

    private get;

    /**
     * @description 获取模型参数信息
     * @author LL
     * @date 2021/08/19
     * @param {Object3D} model 模型
     * @returns {*}  {object}
     */
    public getObjectInfo(model: Object3D): object {
        let info = new Object();
        if (!model) {
            console.warn("获取信息失败，物体不存在");
            return;
        }
        info["name"] = model.name;
        info["position"] = model.position;
        info["rotation"] = model.rotation;
        info["scale"] = model.scale;
        info["type"] = model.type;
        info["uuid"] = model.uuid;
        info["objInfo"] = {
            ownCSS2D: this.ifOwnCSS2D(model),
        };

        return info;
    }

    /**
     * @description 判断模型是否有2D元素
     * @author LL
     * @param {Object3D} obj
     * @return {*}  {boolean}
     */
    public ifOwnCSS2D(obj: Object3D): boolean {
        for (let i = 0; i < obj.children.length; i++) {
            if (obj.children[i] instanceof CSS2DObject) {
                return true;
            }
        }
        return false;
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
