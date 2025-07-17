import {
  AxesHelper,
  BoxHelper,
  Color,
  GridHelper,
  Object3D,
  Plane,
  PlaneHelper,
  Vector3,
} from "three";
import { TScene } from "./TScene";
import { merge } from "lodash-es";
import { setModelConfig } from "../private/privateTool";

/**
 * 辅助器
 */

export class THelper {
  private tScene: TScene;
  grid: GridHelper;
  axes: AxesHelper;
  box: BoxHelper;
  boxList: any[] = [];

  constructor(tScene: TScene) {
    this.tScene = tScene;
  }

  /**
   * 创建坐标轴
   * @author LL
   * @param {number} [len=50]
   */
  public initAxes(len: number = 50) {
    //辅助工具
    this.axes = new AxesHelper(len);
    this.tScene.add(this.axes);
  }

  /**
   * 删除坐标轴
   * @author LL
   */
  public removeAxes() {
    if (this.axes) {
      this.tScene.remove(this.axes);
      this.axes = null;
    }
  }

  /**
   * 给模型加上包围盒
   * @author LL
   * @param {string} uuid
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
   * 去掉包围盒
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
   * 更新包围盒
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
   * 创建grid
   * @author LL
   * @param {{}} [gridInfo] grid参数
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
   * 删除grid
   * @author LL
   * @since 24/12/2021
   */
  public removeGrid() {
    if (this.grid) {
      this.tScene.remove(this.grid);
      this.grid = null;
    }
  }

  /**
   * 创建面板
   * @author LL
   * @since 2024/06/03
   * @param {modelInfoParams} modelInfo 模型参数
   */
  public initPlaneHelper(modelInfo?: modelInfoParams): Object3D {
    let defaultParams = {
      modelName: "planeHelper-" + new Date().getTime(),
      position: {
        x: 0,
        y: 0,
        z: 0,
      },
      scale: {
        x: 1,
        y: 1,
        z: 1,
      },
      rotation: {
        x: -Math.PI / 2,
        y: 0,
        z: 0,
      },
      base: {
        //法向量
        normal: {
          x: 1,
          y: 0,
          z: 0,
        },
        distance: 0, //平面到原点的距离
        size: 1, //大小
      },
      material: {
        color: "0xffff00",
      },
    };
    let param = merge(defaultParams, modelInfo);
    const plane = new Plane(
      new Vector3(
        param.base.normal.x,
        param.base.normal.y,
        param.base.normal.z
      ),
      param.base.distance
    );
    const helper = new PlaneHelper(
      plane,
      param.base.size,
      new Color(param.material.color).getHex()
    );

    return setModelConfig(helper, param);
  }
}
