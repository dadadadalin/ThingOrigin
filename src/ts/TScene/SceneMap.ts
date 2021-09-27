import { Clock } from "three";
import TWEEN from "tween.js/src/Tween.js";
import { ThingOrigin } from "../../ThingOrigin";
import { TScene } from "./TScene";

/** 帧循环 */
function animate() {
    ThingOrigin.scenes.scenes.forEach(function (item, key, mapObj) {
        (function (item) {
            ThingOrigin.getScene(key).helper.updateBox();
            ThingOrigin.getScene(key).renderer.render(item, item.camera.camera);
            ThingOrigin.getScene(key).CSS2DRenderer.render(item, item.camera.camera);
            ThingOrigin.getScene(key).controls.updatePointerLock();
            if (ThingOrigin.getScene(key).effectComposer) ThingOrigin.getScene(key).effectComposer.render(new Clock().getDelta());
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
    add(sceneName: string, container: HTMLElement, sceneParams: ThingOriginParams) {
        this.scenes.set(sceneName, new TScene());
        this.scenes.get(sceneName).createScene(container, sceneParams);

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
        this.scenes.get(sceneName).traverse((child) => {
            if (child["geometry"]) {
                child["geometry"].dispose();
                this.scenes.get(sceneName).remove(child["geometry"]);
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
                this.scenes.get(sceneName).remove(child["material"]);
            }
            if (child["texture"]) {
                child["texture"].dispose();
                this.scenes.get(sceneName).remove(child["texture"]);
            }
        });

        this.scenes.get(sceneName).controls.disposeOrbit();
        this.scenes.get(sceneName).controls.disposeDrag();
        this.scenes.get(sceneName).controls.disposePointerLock();
        this.scenes.get(sceneName).controls.disposeRaycaster();
        this.scenes.get(sceneName).controls.disposeTransform();
        this.scenes.get(sceneName).helper.removeAxes();
        this.scenes.get(sceneName).helper.removeBox();
        this.scenes.get(sceneName).helper.removeGrid();

        while (this.scenes.get(sceneName).container.hasChildNodes()) {
            this.scenes.get(sceneName).container.removeChild(this.scenes.get(sceneName).container.firstChild);
        }
        this.scenes.delete(sceneName);
    }
}
