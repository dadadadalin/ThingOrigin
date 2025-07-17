import {
  DoubleSide,
  Layers,
  Mesh,
  Object3D,
  Plane,
  Vector2,
  Vector3,
  ShaderMaterial,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
import { ThingOrigin } from "../ThingOrigin";

/**
 * 效果
 */
export class TEffect {
  private TO: ThingOrigin;

  /**
   * 渲染通道
   *
   * 用于渲染流程与合成器
   */
  public renderPass: RenderPass;

  /**
   * 效果合成器
   *
   * 用于渲染流程与合成器
   */
  public effectComposer: EffectComposer;

  public bloomComposer: EffectComposer;

  public finalComposer: EffectComposer;

  /**
   * 轮廓通道
   *
   * 用于视觉效果通道
   */
  public outlinePass: OutlinePass;

  /**
   * 着色器通道
   *
   * 用于视觉效果通道
   */
  public effectFXAA: ShaderPass;

  /**
   * 虚幻引擎风格泛光通道
   *
   * 用于视觉效果通道
   */
  public bloomPass: UnrealBloomPass;

  /** 图层系统 */
  public bloomLayer: Layers;

  /** 剖切平面 */
  public sceneClipPlane: Plane;
  public localClipPlane = [];

  static BLOOM_SCENE = 1;

  constructor(TO: ThingOrigin) {
    this.TO = TO;
  }

  /**
   * 初始化场景效果合成器
   * @author LL
   * @since 2021/07/26
   * @private
   */
  public initEffect() {
    this.effectComposer = new EffectComposer(this.TO.renderer.renderer);
    this.effectComposer.setSize(
      this.TO.container.clientWidth,
      this.TO.container.clientHeight
    );

    this.renderPass = new RenderPass(this.TO.scene, this.TO.camera.camera);
    this.effectComposer.addPass(this.renderPass);

    this.outlinePass = new OutlinePass(
      new Vector2(
        this.TO.container.clientWidth,
        this.TO.container.clientHeight
      ),
      this.TO.scene,
      this.TO.camera.camera
    );
    this.outlinePass.edgeStrength =
      ThingOrigin.sceneData.effectComposer.outlinePass.edgeStrength; //粗
    this.outlinePass.edgeGlow =
      ThingOrigin.sceneData.effectComposer.outlinePass.edgeGlow; //发光
    this.outlinePass.edgeThickness =
      ThingOrigin.sceneData.effectComposer.outlinePass.edgeThickness; //光晕粗
    this.outlinePass.pulsePeriod =
      ThingOrigin.sceneData.effectComposer.outlinePass.pulsePeriod; //闪烁
    this.outlinePass.usePatternTexture =
      ThingOrigin.sceneData.effectComposer.outlinePass.usePatternTexture; //true
    this.outlinePass.visibleEdgeColor.set(
      ThingOrigin.sceneData.effectComposer.outlinePass.visibleEdgeColor
    );
    this.outlinePass.hiddenEdgeColor.set(
      ThingOrigin.sceneData.effectComposer.outlinePass.hiddenEdgeColor
    );
    this.effectComposer.addPass(this.outlinePass);

    this.effectFXAA = new ShaderPass(FXAAShader);
    this.effectFXAA.uniforms["resolution"].value.set(
      1 / this.TO.container.clientWidth,
      1 / this.TO.container.clientHeight
    );
    this.effectFXAA.needsSwap = true;
    this.effectComposer.addPass(this.effectFXAA);

    //创建辉光效果
    this.bloomPass = new UnrealBloomPass(
      new Vector2(
        this.TO.container.clientWidth,
        this.TO.container.clientHeight
      ),
      1.5,
      0.4,
      0.85
    );
    this.bloomPass.threshold =
      ThingOrigin.sceneData.effectComposer.bloomPass.threshold;
    this.bloomPass.strength =
      ThingOrigin.sceneData.effectComposer.bloomPass.strength;
    this.bloomPass.radius =
      ThingOrigin.sceneData.effectComposer.bloomPass.radius; //炫光的阈值（场景中的光强大于该值才会产生炫光效果）0.85
    this.bloomPass.renderToScreen = true;
    this.bloomComposer = new EffectComposer(this.TO.renderer.renderer);
    this.bloomComposer.addPass(this.renderPass);
    this.bloomComposer.addPass(this.bloomPass);

    this.bloomLayer = new Layers();
    this.bloomLayer.set(TEffect.BLOOM_SCENE);

    const finalPass = new ShaderPass(
      new ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          // bloomTexture: { value: this.bloomComposer.renderTarget2.texture },
        },
        vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
        `,
        fragmentShader: `
        uniform sampler2D baseTexture;
        uniform sampler2D bloomTexture;
        varying vec2 vUv;
        void main() {
          gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
        }uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
          }
        `,
        defines: {},
      }),
      "baseTexture"
    );
    finalPass.needsSwap = true;
    this.finalComposer = new EffectComposer(this.TO.renderer.renderer);
    this.finalComposer.addPass(this.renderPass);
    this.finalComposer.addPass(finalPass);
  }

  /**
   * 创建场景的剖切
   * @author LL
   * @since 25/04/2022
   * @param {string} axis 剖切轴
   * @param {number} constant 初始剖切位置
   */
  public initSceneClip(axis: "x" | "y" | "z", constant: number) {
    let vec3: Vector3 = this.TO.tool.initVector3ByAxis(axis, 1);

    this.sceneClipPlane = new Plane(vec3, constant);
    // this.TO.renderer.clippingPlanes = Object.freeze([]); // GUI sets it to globalPlanes
    this.TO.renderer.renderer.clippingPlanes = [this.sceneClipPlane];
    // this.TO.renderer.localClippingEnabled = true;
  }

  /**
   * 更新场景剖切面的位置
   * @author LL
   * @since 25/04/2022
   * @param {number} constant
   */
  public updateSceneClip(constant: number) {
    // console.log(this.sceneClipPlane);
    this.sceneClipPlane.constant = constant;
  }

  /**
   * 删除场景剖切面
   * @author LL
   * @since 25/04/2022
   */
  public deleteSceneClip() {
    this.sceneClipPlane = null;
    let Empty = Object.freeze([]);
    //@ts-ignore
    this.TO.renderer.clippingPlanes = Empty;
  }

  /**
   * 模型剖切
   * @author LL
   * @since 25/04/2022
   * @param {Object3D} model 被剖切的模型
   * @param {string} options 剖切参数{axis:'x',constant:0}
   */
  public initModelClip(model: Object3D, options: any) {
    if (!model) {
      console.warn("剖切失败，物体不存在");
      return;
    }
    options.forEach((option: any) => {
      let vec3: Vector3 = this.TO.tool.initVector3ByAxis(option.axis, -1);
      this.localClipPlane.push(new Plane(vec3, option.constant));
    });
    this.TO.renderer.renderer.localClippingEnabled = true;
    model.traverse((child: any) => {
      if (child.type == "Mesh") {
        child.material.clippingPlanes = this.localClipPlane;
        child.material.clipShadows = true;
        child.material.shadowSide = DoubleSide;
        child.castShadow = true;
        child.renderOrder = 6;
      }
      child.clippingPlanes = this.localClipPlane;
      child.clipShadows = true;
    });
  }

  /**
   * 更新模型剖切面位置
   * @author LL
   * @since 25/04/2022
   * @param {number} constant
   */
  public updateModelClip(constant: number) {
    this.localClipPlane[0].constant = constant;
  }

  /**
   * 删除场景剖切面
   * @author LL
   * @since 25/04/2022
   */
  public deleteModelClip() {
    this.localClipPlane = [];
    let Empty = Object.freeze([]);
    //@ts-ignore
    this.TO.renderer.clippingPlanes = Empty;
  }

  /**
   * 给模型添加呼吸效果
   * @author LL
   * @param {Object3D} model 模型
   */
  public initBreath(model: any) {
    // var a;
    // if (model.parent.type != "Object3D") {
    //   a = new Object3D();
    //   a.add(model);
    // }
    // console.log(a);
    if (!model) {
      console.warn("呼吸效果添加失败，物体不存在");
      return;
    }
    this.outlinePass.selectedObjects = [model];
  }

  /**
   * 给多个模型添加呼吸效果
   * @author LL
   * @param {any} modelList 模型列表
   */
  public initMultipleBreath(modelList: any) {
    // var a;
    // if (model.parent.type != "Object3D") {
    //   a = new Object3D();
    //   a.add(model);
    // }
    // console.log(a);

    if (!modelList.length) {
      console.warn("呼吸效果添加失败，模型列表不存在");
      return;
    }
    this.disposeBreath();
    let models = [];
    modelList.forEach((item: any) => {
      let model = this.TO.scene.getObjectByName(item.modelName);
      models.push(model);
    });
    this.outlinePass.selectedObjects = models;
  }

  /**
   * 取消呼吸效果
   * @author MY
   */
  public disposeBreath() {
    this.outlinePass.selectedObjects = [];
  }

  // /**
  //  * 给模型添加发光效果
  //  * @author MY
  //  * @param {Object3D} model 模型
  //  */
  // public initBloom(model: Object3D) {
  //   if (!model) {
  //     console.warn("发光效果添加失败，物体不存在");
  //     return;
  //   }
  //   model.traverse((child) => {
  //     if (child instanceof Mesh) {
  //       console.log(child);
  //       (child as Mesh).layers.enable(TEffect.BLOOM_SCENE);
  //     }
  //   });

  //   const darkMaterial = new MeshBasicMaterial({ color: "black" });
  //   const materials = {};
  //   const darkenNonBloomed = (obj) => {
  //     if (obj.isMesh && this.TO.effect.bloomLayer.test(obj.layers) === false) {
  //       materials[obj.uuid] = obj.material;
  //       obj.material = darkMaterial;
  //     }
  //   };
  //   const restoreMaterial = (obj) => {
  //     if (materials[obj.uuid]) {
  //       obj.material = materials[obj.uuid];
  //       delete materials[obj.uuid];
  //     }
  //   };
  //   const render1 = () => {
  //     this.TO.scene.traverse(darkenNonBloomed);
  //     this.TO.effect.bloomComposer.render();
  //     this.TO.scene.traverse(restoreMaterial);
  //     this.TO.effect.finalComposer.render();
  //     requestAnimationFrame(render1);
  //   };
  //   render1();
  // }

  /**
   * 取消发光效果
   * @author MY
   * @param {Object3D} model 模型
   */
  public disposeBloom(model: Object3D) {
    if (!model) {
      console.warn("发光效果取消失败，物体不存在");
      return;
    }
    model.traverse((child) => {
      if (child instanceof Mesh) {
        (child as Mesh).layers.disable(TEffect.BLOOM_SCENE);
      }
    });
  }
}
