import * as TWEEN from "@tweenjs/tween.js";
import { merge } from "lodash-es";

import { Group, Object3D } from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
import { ThingOrigin } from "../ThingOrigin";

import { setModelConfig } from "../private/privateTool";

/**
 * 2D标记
 */
export class TMarker {
  private TO: ThingOrigin;

  constructor(TO: ThingOrigin) {
    this.TO = TO;
  }

  /**
   * 给模型添加2D标记
   * @author my
   * @since 2024/11/01
   * @param {Object3D} model
   * @param {HTMLElement} html dom元素
   * @param {markerInfoParams} markerInfo 标记信息
   * @return {*}  {string}
   */
  public addMarker(
    model: Object3D | Group,
    html: HTMLElement | string,
    markerInfo?: markerInfoParams
  ): Object3D {
    if (!model) {
      console.warn("标注添加失败，物体不存在");
      return;
    }
    let defaultParams = {
      // modelName: markerName.modelName,
      modelName: model.name + "/marker-" + new Date().getTime(),
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
        x: 0,
        y: 0,
        z: 0,
      },
      base: {
        ratio: 1.1,
        offset: { x: 0, y: 0, z: 0 },
        intervalY: 40, //y轴间隔，用于多个元素叠加显示
      },
    };
    //合并用户参数与默认参数
    let param = merge(defaultParams, markerInfo);
    // param.modelName = param.markerName
    //创建2D标记
    let css2dObject: CSS2DObject;
    let element: HTMLElement;
    if (html instanceof HTMLElement) {
      element = html;
    } else {
      let dom = document.createElement("div");
      dom.innerHTML = html;
      element = dom;
    }
    element.className = model.name + "-thingOrigin-marker"; // 自定义样式
    element.id = param.modelName;
    //不添加到body中的话，新增的元素通过class会找不到或者位于数组第一个而不是期望的追加在末尾
    document.body.appendChild(element);
    css2dObject = new CSS2DObject(element);

    css2dObject.userData.modelName = model.name;
    css2dObject.name = param.modelName;
    return this.setMarkerPosition(model, css2dObject, param, true);
  }

  /**
   * 设置marker标记位置
   * @author MY
   * @since 2024/11/01
   * @param {Object3D} model 挂载模型
   * @param css2dObject 2D标记
   * @param params 参数
   * @param isAttach 是否挂载
   */
  public setMarkerPosition(
    model: Object3D,
    css2dObject: CSS2DObject,
    params: markerInfoParams,
    isAttach: boolean
  ): Object3D {
    //获取所有标记元素，设置Y轴间隔(标记元素class跟模型绑定)
    let allMarkerDom: any = document.querySelectorAll(
      "." + model.name + "-thingOrigin-marker"
    );
    if (params.base.intervalY !== 0 && allMarkerDom.length > 1) {
      allMarkerDom.forEach((item, index) => {
        if (item.id == css2dObject.element.id) {
          const positionY = index * params.base.intervalY;
          params.position.y += positionY;
        }
      });
    }

    // let sphere = this.TO.tool.getModelSphere(model);
    // let box = this.TO.tool.getModelSize(model);
    params.position.x += params.base.offset.x;
    params.position.y += params.base.offset.y;
    params.position.z += params.base.offset.z;
    css2dObject.position.set(
      params.position.x,
      params.position.y,
      params.position.z
    );
    // console.log("777777", css2dObject.position);
    // params.position = css2dObject.position
    // setModelConfig(css2dObject,params)
    // 新增标记元素时需挂载，修改时不需要挂载
    isAttach && model.attach(css2dObject);
    return setModelConfig(css2dObject, params);
  }

  /**
   * 删除marker元素
   * @author LL
   * @param {Object3D} model 挂载模型
   * @param domId string marker元素id
   */
  public removeMarker(model: Object3D, domId?: string): void {
    let css2dList = [];
    model.traverse((child: any) => {
      if (child.isCSS2DObject) {
        css2dList.push(child);
      }
    });
    //domId 存在时删除对应元素，修改其他元素位置，否则全部删除
    if (css2dList.length > 0) {
      css2dList.forEach((item, index) => {
        if (domId) {
          if (item.element.id === domId) {
            model.remove(item);
          } else {
            item.position.y -= index * item.userData.base.intervalY;
            this.setMarkerPosition(
              model,
              item,
              {
                modelName: item.element.id,
                position: item.position,
                base: item.userData.base,
              },
              false
            );
          }
        } else {
          model.remove(item);
        }
      });
    } else {
      console.log("挂载模型暂无标记元素");
    }
  }

  /**
   * 根据标记名称更新其HTML和其他参数
   * @author MY
   * @since 2024/11/12
   * @param modelName 挂载模型名称
   * @param html HTML元素
   * @param markerInfo 标记信息
   */
  public setMarkerInfo(modelName: string, html: any, markerInfo: any): void {
    let model = this.TO.scene.getObjectByName(modelName);
    model.traverse((child: any) => {
      if (child.isCSS2DObject && child.element.id == markerInfo.modelName) {
        child.element.innerHTML = html;
        this.setMarkerPosition(model, child, markerInfo, false);
      }
    });
  }

  /**
   * 根据挂载模型名称删除marker元素
   * @author LL
   * @since 2024/06/04
   * @param {string} modelName
   * @param domId
   */
  public removeMarkerByModelName(modelName: string, domId?: string): void {
    let model = this.TO.scene.getObjectByName(modelName);
    this.removeMarker(model, domId);
  }

  /**
   * 2D标记标签淡入效果
   * @author gj
   * @since 2023/10/25
   * @param {CSS2DObject} marker 2D标记
   * @param {number} time 完成时间（毫秒）
   */
  public markerFadeIn(marker: CSS2DObject, time: number) {
    if (!marker) {
      console.warn("标签元素不存在");
      return;
    }
    let styleOpacity = { opacity: "0.0" };
    new TWEEN.Tween(styleOpacity)
      .to({ opacity: "1.0" }, time)
      .onUpdate(function () {
        //动态更新元素透明度
        marker.element.style.opacity = styleOpacity.opacity;
      })
      .start();
  }

  /**
   * 2D标记标签淡出效果
   * @author gj
   * @since 2023/10/25
   * @param {CSS2DObject} marker 2D标记
   * @param {number} time 完成时间（毫秒）
   */
  public markerFadeOut(marker: CSS2DObject, time: number) {
    if (!marker) {
      console.warn("标签元素不存在");
      return;
    }
    let styleOpacity = { opacity: "1.0" };
    new TWEEN.Tween(styleOpacity)
      .to({ opacity: "0.0" }, time)
      .onUpdate(function () {
        //动态更新元素透明度
        marker.element.style.opacity = styleOpacity.opacity;
      })
      .start();
  }
}
