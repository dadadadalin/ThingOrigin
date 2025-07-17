import { PCFSoftShadowMap, WebGLRenderer } from "three";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";
import { ThingOrigin } from "../ThingOrigin";

/**
 * 渲染器
 */

export class TRenderer {
  TO: ThingOrigin;

  public renderer: WebGLRenderer;
  public rendererView: Map<string, any> = new Map<string, any>();
  public CSS2DRenderer: CSS2DRenderer;

  constructor(TO: ThingOrigin) {
    this.TO = TO;

    //渲染器
    let renderParams: renderQualityParam = {
      logarithmicDepthBuffer:ThingOrigin.sceneData.scene.renderQuality.logarithmicDepthBuffer,
      antialias: ThingOrigin.sceneData.scene.renderQuality.antialias
    };

    this.renderer = new WebGLRenderer(renderParams);

    //性能优化  自动清除
    this.renderer.autoClear = ThingOrigin.sceneData.scene.renderQuality.autoClear;
    this.renderer.setPixelRatio(window.devicePixelRatio * 2);

    // // WebGL 2.0
    // this.renderer.capabilities.antialias = true;

    //渲染器配置
    this.renderer.setSize(
      this.TO.container.clientWidth,
      this.TO.container.clientHeight
    );
    if (
      ThingOrigin.sceneData &&
      ThingOrigin.sceneData.scene.renderQuality.shadowMap.enabled
    ) {
      this.renderer.shadowMap.enabled =
        ThingOrigin.sceneData.scene.renderQuality.shadowMap.enabled;
      this.renderer.shadowMap.type = PCFSoftShadowMap;
    }
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.bottom = "0";
    this.TO.container.appendChild(this.renderer.domElement);

    //2D渲染器
    this.CSS2DRenderer = new CSS2DRenderer();
    this.CSS2DRenderer.setSize(
      this.TO.container.clientWidth,
      this.TO.container.clientHeight
    );
    this.CSS2DRenderer.domElement.id = "CSS2DDom";
    this.CSS2DRenderer.domElement.style.position = "absolute";
    this.CSS2DRenderer.domElement.style.bottom = "0";
    // this.CSS2DRenderer.domElement.id = "markerRender";
    this.TO.container.appendChild(this.CSS2DRenderer.domElement);
  }
}
