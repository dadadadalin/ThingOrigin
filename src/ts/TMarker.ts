import { Group, Object3D } from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
import { ThingOrigin } from "../ThingOrigin";
import * as TWEEN from "@tweenjs/tween.js";
import { all } from "three/examples/jsm/nodes/math/MathNode";
import { merge } from "lodash";

export class TMarker {
  TO: ThingOrigin;

  constructor(TO: ThingOrigin) {
    this.TO = TO;
  }

  /**
   * @description 给模型添加2d元素
   * @author my
   * @date 2024/11/01
   * @param {Object3D} model
   * @param {HTMLElement} html dom元素
   * @param {markerInfoParams} markerInfo 标记信息
   * @return {*}  {string}
   */
  public addMarker(
    model: Object3D | Group,
    html: HTMLElement | string,
    markerInfo?: markerInfoParams
  ): any {
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
    // console.log('defaultParams:', defaultParams)
    //合并用户参数与默认参数
    let param = merge(defaultParams, markerInfo);
    // param.modelName = param.markerName
    // console.log('param:', param)
    //创建2d元素
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
    // console.log('css2dObject:',css2dObject);
    // this.setMarkerPosition(model,css2dObject,param)
    return this.setMarkerPosition(model, css2dObject, param, true);
  }

  /**
   * @description 设置marker元素位置
   * @author MY
   * @date 2024/11/01
   * @param {Object3D} model 挂载模型
   * @param css2dObject 2D元素
   * @param params 参数
   * @param isAttach 是否挂载
   * @returns  {*}
   */
  public setMarkerPosition(
    model: Object3D,
    css2dObject: CSS2DObject,
    params: markerInfoParams,
    isAttach: boolean
  ): any {
    //获取所有标记元素，设置Y轴间隔(标记元素class跟模型绑定)
    let allMarkerDom: any = document.querySelectorAll(
      "." + model.name + "-thingOrigin-marker"
    );
    // console.log('allMarkerDom:', allMarkerDom);
    if (params.base.intervalY !== 0 && allMarkerDom.length > 1) {
      allMarkerDom.forEach((item, index) => {
        if (item.id == css2dObject.element.id) {
          const positionY = index * params.base.intervalY;
          params.position.y += positionY;
          // console.log('positionY:', positionY)
        }
      });
    }

    // let sphere = this.TO.tool.getModelSphere(model);
    // let box = this.TO.tool.getModelSize(model);
    css2dObject.position.set(
      params.position.x,
      params.position.y,
      params.position.z
    );
    // params.position = css2dObject.position
    // this.TO.model.setModelConfig(css2dObject,params)
    // console.log('css2dObject111:',css2dObject);
    // 新增标记元素时需挂载，修改时不需要挂载
    isAttach && model.attach(css2dObject);
    return this.TO.model.setModelConfig(css2dObject, params);
  }

  /**
   * @description 删除marker元素
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
    // console.log('css2dList:', css2dList)

    // if (css2dList.length > 0) {
    //   if (domId){
    //     css2dList.forEach(item => {
    //       if (item.element.id === domId){
    //         model.remove(item)
    //       }else {
    //         this.setMarkerPosition(model, item, {markerName:item.element.id,position:item.position,base:item.userData.base},false)
    //       }
    //     })
    //   }else {
    //     css2dList.forEach(item => {
    //       model.remove(item)
    //     })
    //   }
    //   // if (domId) {
    //   //   css2dList.forEach(item => {
    //   //     if (item.element.id !== domId) {
    //   //       this.addMarker(model, item.element.innerHTML,{markerName:item.element.id,position:item.position,base:item.userData.base})
    //   //     }
    //   //   })
    //   // }
    // } else {
    //   console.log("挂载模型暂无标记元素")
    // }
  }

  /**
   * @description 根据标记名称更新其HTML和其他参数
   * @author MY
   * @date 2024/11/12
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
   * @description 根据挂载模型名称删除marker元素
   * @author LL
   * @date 2024/06/04
   * @param {string} modelName
   * @param domId
   */
  public removeMarkerByModelName(modelName: string, domId?: string): void {
    let model = this.TO.scene.getObjectByName(modelName);
    this.removeMarker(model, domId);
  }

  /**
   * @description 2d元素标签淡入效果
   * @author gj
   * @date 2023/10/25
   * @param {CSS2DObject} tag 2d元素
   * @param {number} time 完成时间（毫秒）
   * @returns  {*}
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
   * @description 2d元素标签淡出效果
   * @author gj
   * @date 2023/10/25
   * @param {CSS2DObject} tag 2d元素
   * @param {number} time 完成时间（毫秒）
   * @returns  {*}
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
