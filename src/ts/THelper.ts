import { ArrowHelper, AxesHelper, BoxHelper, Color, GridHelper, Vector3 } from "three";
import { TScene } from "./TScene/TScene";

export class THelper {
    tScene: TScene;
    grid: GridHelper;
    axes: AxesHelper;
    box: BoxHelper;

    constructor(tScene: TScene) {
        this.tScene = tScene;
    }

    /**
     * @description 创建坐标轴
     * @author LL
     * @param {number} [len=50]
     */
    public initAxes(len: number = 50) {
        //辅助工具
        this.axes = new AxesHelper(len);
        this.tScene.add(this.axes);
    }

    /**
     * @description 删除坐标轴
     * @author LL
     */
    public removeAxes() {
        if (this.axes) {
            this.tScene.remove(this.axes);
            this.axes = null;
        }
    }

    /**
     * @description 给模型加上包围盒
     * @author LL
     * @param {string} uuid
     * @returns {*}
     */
    public initBox(uuid: string) {
        let obj = this.tScene.getObjectByProperty("uuid", uuid);
        if (!obj) {
            console.warn("包围盒加载失败，物体不存在");
            return;
        }

        this.box = new BoxHelper(obj);
        this.box.name = "boxHelper";
        this.tScene.add(this.box);
    }

    /**
     * @description 去掉包围盒
     * @author LL
     */
    public removeBox() {
        if (this.box) {
            this.tScene.remove(this.box);
            this.box = null;
        }
    }

    /**
     * @description 更新包围盒
     * @author LL
     */
    public updateBox() {
        if (this.box) {
            this.box.update();
            // let box = this.tScene.getObjectByProperty("type", "BoxHelper");
            // if (box) {
            //     (box as BoxHelper).update();
            // }
        }
    }

    /**
     * @description 创建grid
     * @author LL
     * @param {number} size 坐标格尺寸. 默认为 10
     * @param {number} divisions 坐标格细分次数. 默认为 10.
     * @param {string} colorCenterLine 中线颜色
     * @param {string} colorGrid 坐标格网格线颜色
     */
    public initGrid(size?: number, divisions?: number, colorCenterLine?: string, colorGrid?: string) {
        this.grid = new GridHelper(size, divisions, new Color(colorCenterLine), new Color(colorGrid));
        this.grid.name = "gridHelper";
        this.tScene.add(this.grid);
    }

    /**
     * @description 删除grid
     * @author LL
     * @date 24/12/2021
     * @memberof THelper
     */
    public removeGrid() {
        if (this.grid) {
            this.tScene.remove(this.grid);
            this.grid = null;
        }
    }

    /**
     * @description 生成arrow
     * @author LL
     * @date 24/12/2021
     * @param {number[]} dir 指向方向
     * @param {number[]} origin 源头位置
     * @param {number} length 长度
     * @param {number} hex 颜色
     * @param {number} [headLength]
     * @param {number} [headWidth]
     * @returns {*}  {ArrowHelper}
     */
    public initArrow(name: string, dir: number[], origin: number[], length: number, hex: string, headLength?: number, headWidth?: number) {
        const dirVector3 = new Vector3(dir[0], dir[1], dir[2]);
        dirVector3.normalize();
        const originVector3 = new Vector3(origin[0], origin[1], origin[2]);
        const arrowHelper = new ArrowHelper(dirVector3, originVector3, length, new Color(hex).getHex(), headLength, headWidth);
        arrowHelper.name = name;
        this.tScene.add(arrowHelper);
    }
}
