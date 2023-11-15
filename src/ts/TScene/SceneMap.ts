import {Clock, MeshBasicMaterial} from "three";
import TWEEN from "tween.js/src/Tween.js";
import { ThingOrigin } from "../../ThingOrigin";
import { TScene } from "./TScene";

let clock = new Clock();
const darkMaterial = new MeshBasicMaterial({ color: 'black' });
const materials = {};

/** 帧循环 */
function animate() {
  ThingOrigin.scenes.scenes.forEach(function (item, key, mapObj) {
    (function (item) {
      // item.camera.camera.updateProjectionMatrix();
      const darkenNonBloomed = (obj) => {
        if (obj.isMesh && cScene.effect.bloomLayer.test(obj.layers) === false) {
          materials[obj.uuid] = obj.material;
          obj.material = darkMaterial;
        }
      }
      const restoreMaterial = (obj) => {
        if (materials[obj.uuid]) {
          obj.material = materials[obj.uuid];
          delete materials[obj.uuid];
        }
      }
      let cScene = ThingOrigin.getScene(key);
      cScene.renderer.render(item, item.camera.camera);
      cScene.CSS2DRenderer.render(item, item.camera.camera);
      //将不需要辉光的材质设置为黑色
      cScene.traverse(darkenNonBloomed)
      //先执行辉光效果器
      if (cScene.effect.bloomComposer) cScene.effect.bloomComposer.render();
      //在辉光渲染器执行完之后恢复材质原效果
      cScene.traverse(restoreMaterial)
      //执行场景效果器渲染
      if (cScene.effect.effectComposer) cScene.effect.effectComposer.render();

      if (cScene.helper.box) cScene.helper.updateBox();
      if (cScene.controls.pointerLock) cScene.controls.updatePointerLock();
      if (cScene.stats) cScene.stats.update();
      if (cScene.mixer) cScene.mixer.update(clock.getDelta());

      if (cScene.toUpdate.material.length > 0) {
        for (let index = 0; index < cScene.toUpdate.material.length; index++) {
          const material = cScene.toUpdate.material[index];
          material.uniforms["time"].value += 1.0 / 60.0;
        }
      }
    })(item);
  });

  TWEEN.update();
  requestAnimationFrame(animate);
}

export class SceneMap {
  scenes: Map<string, TScene> = new Map<string, TScene>();

  /**
   * @description 添加新场景
   * @author LL
   * @date 2021/08/20
   * @param {string} sceneName
   * @param {HTMLElement} container
   * @param {ThingOriginParams} sceneParams
   */
  add(
    sceneName: string,
    container: HTMLElement,
    sceneParams?: ThingOriginParams
  ) {
    this.scenes.set(sceneName, new TScene());
    this.scenes.get(sceneName).createScene(sceneName, container, sceneParams);

    if (this.scenes.size == 1) {
      animate();
    }
  }

  /**
   * @description 删除场景
   * @author LL
   * @param {string} sceneName
   */
  delete(sceneName: string) {
    let cScene = this.scenes.get(sceneName);
    cScene.traverse((child) => {
      if (child["geometry"]) {
        child["geometry"].dispose();
        cScene.remove(child["geometry"]);
      }
      if (child["material"]) {
        //todo  与模型处的删除模型代码共用
        if (Array.isArray(child["material"])) {
          for (let i = 0; i < child["material"].length; i++) {
            child["material"][i].dispose();
          }
        } else {
          child["material"].dispose();
        }
        cScene.remove(child["material"]);
      }
      if (child["texture"]) {
        child["texture"].dispose();
        cScene.remove(child["texture"]);
      }
    });

    cScene.controls.disposeOrbit();
    cScene.controls.disposeDrag();
    cScene.controls.disposePointerLock();
    cScene.controls.disposeRaycaster();
    cScene.controls.disposeTransform();
    cScene.helper.removeAxes();
    cScene.helper.removeBox();
    cScene.helper.removeGrid();

    while (cScene.container.hasChildNodes()) {
      cScene.container.removeChild(cScene.container.firstChild);
    }

    cScene.renderer.dispose();
    cScene.renderer.forceContextLoss();
    // cScene.renderer.context = null;
    let gl = cScene.renderer.domElement.getContext("webgl");
    gl && gl.getExtension("WEBGL_lose_context").loseContext();

    this.scenes.delete(sceneName);
  }
}
