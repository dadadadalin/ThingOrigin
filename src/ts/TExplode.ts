import { Object3D } from "three";
import { ThingOrigin } from "../ThingOrigin";

/**
 * 爆炸图
 */
export class TExplode {
  private TO: ThingOrigin;

  constructor(TO: ThingOrigin) {
    this.TO = TO;
  }

  /**
   * 展示爆炸图
   * @author LL
   * @since 2021/09/01
   * @param {Object3D} model 模型
   * @param {explodeInfo} explodeInfo 爆炸参数
   */
  explode(model: Object3D, explodeInfo: explodeInfo) {
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
        a[i].position.x * explodeInfo.ratio,
        explodeInfo.time
      );
      this.TO.animate.move(
        child,
        "y",
        a[i].position.y,
        a[i].position.y * explodeInfo.ratio,
        explodeInfo.time
      );
      this.TO.animate.move(
        child,
        "z",
        a[i].position.z,
        a[i].position.z * explodeInfo.ratio,
        explodeInfo.time
      );
    }
  }

  /**
   * 展示爆炸图（流程）
   * @author LL
   * @since 2024/07/10
   * @param {Object3D} origin 源模型
   * @param {explodeInfo} explodeInfo 爆炸参数
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
