/**
 * @module
 * @mergeModuleWith <project>
 */

import * as TWEEN from '@tweenjs/tween.js';
import { cloneDeep, merge } from 'lodash-es';

import { Object3D } from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { ThingOrigin } from '../ThingOrigin';

import { setModelConfig } from '../private/privateTool';
import { markerInfoParams } from './scenePrams';

/**
 * 2D标记
 */
export class TMarker {
  private TO: ThingOrigin;

  constructor(TO: ThingOrigin) {
    this.TO = TO;
  }

  /**
   * 添加2D标记
   * @author my
   * @since 2024/11/01
   * @param {Object3D} model 模型
   * @param {HTMLElement} html html片段
   * @param {markerInfoParams} markerInfo 标记信息
   * @return {*}  {string}
   */
  public addMarker(model: Object3D, html: HTMLElement | string, markerInfo?: markerInfoParams): Object3D {
    if (!model) {
      console.warn('标注添加失败，物体不存在');
      return;
    }
    let defaultParams = {
      // modelName: markerName.modelName,
      modelName: model.name + '/marker-' + new Date().getTime(),
      modelType: 'marker',
      type: 'text',
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
        relative: 'model', // 标记基于模型还是坐标   model:模型   world:世界坐标
        ratio: 1.1,
        offset: { x: 0, y: 0, z: 0 }, // 偏移量
        intervalY: 40, //y轴间隔，用于多个元素叠加显示
      },
      configs: {
        visible: true,
      },
    };
    //合并用户参数与默认参数
    let param = merge(defaultParams, markerInfo);

    // 创建安全的 DOM 元素（防止 XSS 攻击）(会导致2D元素不随模型运动)
    // const element = this.createSafeElement(html);
    //创建 DOM 元素
    const element = this.createElement(html);

    element.className = 'thingOrigin-marker-' + model.name ; // 自定义样式
    element.id = param.modelName;
    // CSS2D 容器 pointer-events:none，标记自身需恢复可点击
    element.style.pointerEvents = 'auto'
    //不添加到body中的话，新增的元素通过class会找不到或者位于数组第一个而不是期望的追加在末尾
    document.body.appendChild(element);

    const css2dObject = new CSS2DObject(element);
    return this.setMarkerPosition(model, css2dObject, param, true);
  }

  /**
   * 设置标记位置
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
    let allMarkerDom: any = document.querySelectorAll('.' + 'thingOrigin-marker-' + model.name);
    if (params.base.intervalY !== 0 && allMarkerDom.length > 1) {
      allMarkerDom.forEach((item, index) => {
        if (item.id == css2dObject.element.id) {
          const positionY = index * params.base.intervalY;
          params.position.y += positionY;
        }
      });
    }
    if (params.base.relative == 'model') {
      let box = this.TO.tool.getModelSize(model);
      params.position.x = 0;
      params.position.y = 0;
      params.position.z = 0;
      params.position.x += box.center.x + params.base.offset.x;
      params.position.y += box.center.y + box.height / 2 + params.base.offset.y;
      params.position.z += box.center.z + params.base.offset.z;
    } else {
      params.position.x += params.base.offset.x;
      params.position.y += params.base.offset.y;
      params.position.z += params.base.offset.z;
    }
    css2dObject.position.set(params.position.x, params.position.y, params.position.z);
    // params.position = css2dObject.position
    // setModelConfig(css2dObject,params)
    const css2dObjectNew = setModelConfig(css2dObject, params);
    // 新增标记元素时直接挂载，修改时先移除原有的再挂载
    if (isAttach) {
      model.attach(css2dObjectNew);
    } else {
      model.remove(css2dObject);
      model.attach(css2dObjectNew);
    }
    // 自动播放视频标记
    setTimeout(() => {
      if (params.type == 'video') {
        const video = document.getElementById(params.configs.videoId) as HTMLVideoElement | null;
        if (video && params.configs.visible) {
          video.play();
        }
      }
    }, 100);
    // isAttach && model.attach(css2dObjectNew);
    css2dObjectNew.visible = params.configs.visible;
    return css2dObjectNew;
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
                configs: item.userData.configs,
              },
              false
            );
          }
        } else {
          model.remove(item);
        }
      });
    } else {
      console.log('挂载模型暂无标记元素');
    }
  }

  /**
   * 更新标记
   * @author MY
   * @since 2024/11/12
   * @param modelName 挂载模型名称
   * @param html HTML元素(html修改了的话必须传)
   * @param markerInfo 标记信息
   */
  public setMarkerInfo(modelName: string, markerInfo: any,  html?: any): void {
    let model = this.TO.scene.getObjectByName(modelName);
    model.traverse((child: any) => {

      if (child.isCSS2DObject && child.element.id == markerInfo.markerName) {

        html && (child.element.innerHTML = html);

        // TODO 使用安全的创建元素方法
        // 使用统一的创建安全元素方法（防止 XSS 攻击）
        // const newElement = this.createSafeElement(html);

        // // 保留原有的 className 和 id
        // newElement.className = child.element.className;
        // newElement.id = child.element.id;

        // // 替换整个元素
        // child.element.parentNode?.replaceChild(newElement, child.element);
        // child.element = newElement;

        let markerInfoNew = {
          modelName: markerInfo.modelName,
          modelType: 'marker',
          type: child.userData.type,
          position: child.position,
          scale: child.scale,
          rotation: child.rotation,
          base: merge(child.userData.base, markerInfo.base),
          configs: merge( child.userData.configs, markerInfo.configs),
        }

        this.setMarkerPosition(model, child, markerInfoNew, false);
      }
    });
  }

  /**
   * 删除标记
   * @author LL
   * @since 2024/06/04
   * @param {string} modelName
   * @param domId
   * @todo  改名
   */
  public removeMarkerByModelName(modelName: string, domId?: string): void {
    let model = this.TO.scene.getObjectByName(modelName);
    this.removeMarker(model, domId);
  }

  /**
   * 标记淡入
   * @author gj
   * @since 2023/10/25
   * @param {CSS2DObject} marker 2D标记
   * @param {number} time 完成时间（毫秒）
   */
  public markerFadeIn(marker: CSS2DObject, time: number) {
    if (!marker) {
      console.warn('标签元素不存在');
      return;
    }
    let styleOpacity = { opacity: '0.0' };
    new TWEEN.Tween(styleOpacity)
      .to({ opacity: '1.0' }, time)
      .onUpdate(function () {
        //动态更新元素透明度
        marker.element.style.opacity = styleOpacity.opacity;
      })
      .start();
  }

  /**
   * 标记淡出
   * @author gj
   * @since 2023/10/25
   * @param {CSS2DObject} marker 2D标记
   * @param {number} time 完成时间（毫秒）
   */
  public markerFadeOut(marker: CSS2DObject, time: number) {
    if (!marker) {
      console.warn('标签元素不存在');
      return;
    }
    let styleOpacity = { opacity: '1.0' };
    new TWEEN.Tween(styleOpacity)
      .to({ opacity: '0.0' }, time)
      .onUpdate(function () {
        //动态更新元素透明度
        marker.element.style.opacity = styleOpacity.opacity;
      })
      .start();
  }

  /**
   * 创建安全的 DOM 元素
   * @private
   */
  // TODO 防止xss攻击
  private createSafeElement(html: string | HTMLElement): HTMLElement {
    if (html instanceof HTMLElement) {
      // 克隆 HTMLElement 以避免直接引用
      return html.cloneNode(true) as HTMLElement;
    } else {
      const divDom = document.createElement('div');
      divDom.innerHTML = html;
      return this.createSafeElement(divDom);
    }
  }
  /**
     * 创建 DOM 元素
     * @private
     */
  private createElement(html: HTMLElement | string): HTMLElement {
    let element: HTMLElement;
    if (html instanceof HTMLElement) {
      element = html;
    } else {
      let dom = document.createElement('div');
      dom.innerHTML = html;
      element = dom;
    }
    return element;
  }
}
