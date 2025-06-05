import { AxesHelper, BoxHelper, Color, GridHelper } from "three";
import { TScene } from "./TScene";
import { merge } from "lodash";

export class THelper {
  tScene: TScene;
  grid: GridHelper;
  axes: AxesHelper;
  box: BoxHelper;
  boxList: any[] = [];

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
    let obj: any = this.tScene.getObjectByProperty("uuid", uuid);
    if (!obj) {
      console.warn("包围盒加载失败，物体不存在");
      return;
    }

    this.box = new BoxHelper(obj);
    this.box.name = obj.name + "-boxHelper";
    this.boxList.push(this.box);

    this.tScene.add(this.box);
  }

  /**
   * @description 去掉包围盒
   * @author LL
   */
  public removeBox(modelName?: string) {
    if (modelName) {
      let index = this.boxList.findIndex(
        (item) => item.name === modelName + "-boxHelper"
      );
      if (index != -1) {
        this.tScene.remove(this.boxList[index]);
        this.boxList.splice(index, 1);
      }
    } else {
      this.boxList.forEach((item) => {
        this.tScene.remove(item);
      });
      this.boxList = [];
    }

    // if (this.box) {
    //   this.tScene.remove(this.box);
    //   this.box = null;
    // }
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
   * @param {} gridInfo 坐标格参数
   * @param {number} divisions 坐标格细分次数. 默认为 10.
   * @param {string} colorCenterLine 中线颜色
   * @param {string} colorGrid 坐标格网格线颜色
   */
  public initGrid(gridInfo?: {}) {
    let defaultParams = {
      size: 100,
      divisions: 30,
      colorCenterLine: "#000000",
      colorGrid: "#000000",
    };
    let param = merge(defaultParams, gridInfo);
    this.grid = new GridHelper(
      param.size,
      param.divisions,
      new Color(param.colorCenterLine),
      new Color(param.colorGrid)
    );
    this.grid.name = "gridHelper";
    this.grid.position.y -= 1;
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
}
