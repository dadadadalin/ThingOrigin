import { Object3D } from "three";
import { TAnimate } from "./TAnimate";
import { Tool } from "./Tool";
import { ThingOrigin } from "../ThingOrigin";

export class TExplode {
  TO: ThingOrigin;

  constructor(TO: ThingOrigin) {
    this.TO = TO;
  }

  /**
   * @description 展示爆炸图
   * @author LL
   * @date 2021/09/01
   * @param {Object3D} model 模型
   * @param {number} ratio 爆炸图偏移系数
   * @param {number} time 完成时间（毫秒）
   * @returns {*}
   */
  explode(model: Object3D, explodeIfo: explodeInfo) {
    if (!model) {
      console.warn("爆炸失败，物体不存在");
      return;
    }

    var a = this.TO.tool.getChildrenInfo(model);
    for (var i = 0; i < a.length; i++) {
      var child = model.getObjectByProperty("uuid", a[i].uuid);
      this.TO.animate.move(
        child,
        "x",
        a[i].position.x,
        a[i].position.x * explodeIfo.ratio,
        explodeIfo.time
      );
      this.TO.animate.move(
        child,
        "y",
        a[i].position.y,
        a[i].position.y * explodeIfo.ratio,
        explodeIfo.time
      );
      this.TO.animate.move(
        child,
        "z",
        a[i].position.z,
        a[i].position.z * explodeIfo.ratio,
        explodeIfo.time
      );
    }
  }

  /**
   * @description 展示爆炸图（流程）
   * @author LL
   * @date 2024/07/10
   * @param {Object3D} origin 目标克隆模型
   * @memberof TExplode
   */
  showExplode(origin: Object3D, explodeInfo: explodeInfo): Object3D {
    let explodeModel = origin.clone();
    this.TO.marker.removeMarker(explodeModel);
    this.TO.scene.add(explodeModel);
    this.TO.effect.initBreath(explodeModel);

    //通过模型包裹球  确定相机位置
    let boundSphere = this.TO.tool.getModelSphere(explodeModel);
    this.TO.camera.camera.position.set(
      0,
      boundSphere.radius * explodeInfo.ratio * 2,
      boundSphere.radius * explodeInfo.ratio * 2
    );
    this.TO.camera.camera.lookAt(boundSphere.center);
    this.explode(explodeModel, explodeInfo);

    return explodeModel;
  }
}
