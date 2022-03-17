import TWEEN from "tween.js/src/Tween.js";
import { ThingOrigin } from "../../ThingOrigin";
import { TScene } from "./TScene";

// var i = 0;
/** 帧循环 */
function animate() {
    ThingOrigin.scenes.scenes.forEach(function (item, key, mapObj) {
        (function (item) {
            // item.camera.camera.updateProjectionMatrix();
            let cScene = ThingOrigin.getScene(key);
            cScene.renderer.render(item, item.camera.camera);
            cScene.CSS2DRenderer.render(item, item.camera.camera);
            if (cScene.effectComposer) cScene.effectComposer.render();

            // if (i % 20 == 0) {
            if (cScene.helper.box) cScene.helper.updateBox();
            if (cScene.controls.pointerLock) cScene.controls.updatePointerLock();
            cScene.stats.update();
            // }
            // i++;
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
        cScene.renderer.context = null;
        let gl = cScene.renderer.domElement.getContext("webgl");
        gl && gl.getExtension("WEBGL_lose_context").loseContext();

        this.scenes.delete(sceneName);
    }
}
