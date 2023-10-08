import merge from "lodash.merge";
import {
  AnimationMixer,
  BackSide,
  Color,
  Fog,
  FogExp2,
  Group,
  Mesh,
  Object3D,
  Scene,
  ShaderMaterial,
  SphereBufferGeometry,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer";
import sceneData from "../../../public/static/data/sceneParams.js";
import { TEventDispatcher } from "../controls/TEventDispatcher";
import { TExporters } from "../exporters/TExporters";
import { TCamera } from "../TCamera";
import { TControl } from "../TControl";
import { THelper } from "../THelper";
import { TLight } from "../TLight";
import { TTool } from "../TTool";
import { ThingOrigin } from "./../../ThingOrigin";
import { TEffect } from "./../TEffect";

//用一个group来放模型
export class TScene extends Scene {
  /** 光源管理 */
  public light: TLight = new TLight(this);
  /** 当前场景的dom容器 */
  public container: HTMLElement;
  /** 当前渲染使用的相机 */
  public camera: TCamera;
  /** 辅助器 */
  public helper: THelper = new THelper(this);
  /** 交互器 */
  public controls: TControl;
  /** 当前渲染使用的渲染器 */
  public renderer: WebGLRenderer;
  /** 当前渲染2D的渲染器 */
  public CSS2DRenderer: CSS2DRenderer;
  /** 效果 */
  public effect: TEffect = new TEffect(this);

  public tool: TTool = new TTool(this);
  /** 动画播放器 */
  public mixer: AnimationMixer;

  /** 事件捕捉器 */
  public eDispatcher: TEventDispatcher = new TEventDispatcher();
  /** 导出 */
  public exporters: TExporters = new TExporters();

  public sceneParam: ThingOriginParams = sceneData;

  public stats: Stats;

  /**
   * @description 创建一个场景
   * @author LL
   * @date 2021/10/15
   * @param {HTMLElement} container dom容器
   * @param {ThingOriginParams} userSceneParam 场景参数
   */
  public createScene(
    container: HTMLElement,
    userSceneParam?: ThingOriginParams
  ): void {
    this.sceneParam = merge(this.sceneParam, userSceneParam);

    this.container = container;
    this.initCamera(this.sceneParam);
    this.initRender(this.sceneParam);
    this.initLight(this.sceneParam);
    this.effect.initEffect(this.sceneParam);
    this.initControl(this.sceneParam);

    if (this.sceneParam.scene.fog && this.sceneParam.scene.fog.show) {
      if (this.sceneParam.scene.fog.cameraView) {
        this.fog = new FogExp2(this.sceneParam.scene.fog.color);
      } else {
        this.fog = new Fog(this.sceneParam.scene.fog.color);
      }
    }
    if (this.sceneParam.scene.stats.show) this.showStats(this.sceneParam);
    if (this.sceneParam.models) this.loadModel(this.sceneParam);
    if (this.sceneParam.css2d) this.loadCSS2D(this.sceneParam);
  }

  /**
   * @description 初始化相机
   * @author LL
   * @date 2021/11/03
   * @private
   * @param {ThingOriginParams} sceneParams 场景参数
   */
  private initCamera(sceneParams: ThingOriginParams) {
    this.camera = new TCamera(this, this.container);
    this.camera.position.set(
      sceneParams.camera.position.x,
      sceneParams.camera.position.y,
      sceneParams.camera.position.z
    );
  }

  /**
   * @description 初始化场景渲染器
   * @author LL
   * @date 2021/07/26
   * @private
   * @param {ThingOriginParams} sceneParams 场景参数
   */
  private initRender(sceneParams: ThingOriginParams) {
    //渲染器
    this.renderer = new WebGLRenderer(sceneParams.scene.webglrenderer);

    if (sceneParams.scene.background.type == "sky") {
      this.initSky({
        top: sceneParams.scene.background.sky.color.top,
        line: sceneParams.scene.background.sky.color.line,
        bottom: sceneParams.scene.background.sky.color.bottom,
      });
    } else if (sceneParams.scene.background.type == "color") {
      if (sceneParams.scene.webglrenderer.alpha) {
        this.renderer.setClearColor(
          sceneParams.scene.background.color.color,
          sceneParams.scene.background.color.alpha
        ); //default
      } else {
        this.background = new Color(sceneParams.scene.background.color.color);
      }
    }

    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    if (sceneParams && sceneParams.shadow) {
      this.renderer.shadowMap.enabled = sceneParams.shadow;
    }
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.bottom = "0";
    this.container.appendChild(this.renderer.domElement);

    //2D渲染器
    this.CSS2DRenderer = new CSS2DRenderer();
    this.CSS2DRenderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.CSS2DRenderer.domElement.style.position = "absolute";
    this.CSS2DRenderer.domElement.style.bottom = "0";
    this.container.appendChild(this.CSS2DRenderer.domElement);
  }

  /**
   * @description 初始化场景光源
   * @author LL
   * @date 2021/07/26
   * @private
   * @param {ThingOriginParams} sceneParams 场景参数
   */
  private initLight(sceneParams: ThingOriginParams) {
    for (let i = 0; i < sceneParams.lights.length; i++) {
      const light = this.light.addDirectionalLight(
        sceneParams.lights[i].name,
        sceneParams.lights[i].color,
        sceneParams.lights[i].intensity
      );
      light.position.set(
        sceneParams.lights[i].position.x,
        sceneParams.lights[i].position.y,
        sceneParams.lights[i].position.z
      );
    }
  }

  /**
   * @description 渲染控制器
   * @author LL
   * @date 2021/07/26
   * @private
   * @param {ThingOriginParams} sceneParams 场景参数
   */
  private initControl(sceneParams: ThingOriginParams) {
    this.controls = new TControl(this);

    // 处理各种控制器
    if (sceneParams.helper.axes.active) {
      this.helper.initAxes(sceneParams.helper.axes.length);
    }
    if (sceneParams.helper.grid.active) {
      this.helper.initGrid(
        sceneParams.helper.grid.size,
        sceneParams.helper.grid.divisions,
        sceneParams.helper.grid.centerLineColor,
        sceneParams.helper.grid.gridColor
      );
    }
    if (sceneParams.controls.orbit.active) {
      this.controls.initOrbit(sceneParams.controls.orbit);
    }
    if (sceneParams.controls.raycaster.active) {
      this.controls.initRaycaster(sceneParams.controls.raycaster.events);
    }
    if (sceneParams.controls.transform.active) {
      this.controls.initTransform();
    }
  }

  private showStats(sceneParams: ThingOriginParams) {
    // @ts-ignore：
    this.stats = new Stats();
    this.stats.domElement.style.position = "absolute"; // 样式， 坐标
    this.stats.domElement.style.left = "0px";
    this.stats.domElement.style.top = "0px";
    this.stats.domElement.style.zIndex = "100";
    this.container.appendChild(this.stats.domElement); // 添加到canvas-frame
    this.stats.setMode(sceneParams.scene.stats.mode);
  }

  /**
   * @description 加载渲染模型
   * @author LL gj
   * @date 2021/07/26
   * @private
   * @param {ThingOriginParams} sceneParams 场景参数
   */
  private loadModel(sceneParams: ThingOriginParams) {
    for (let i = 0; i < sceneParams.models.length; i++) {
      let item = sceneParams.models[i];
      if (item["objInfo"].objType == "modelFile") {
        //实际模型变量
        let modelConfigs = {
          position: Object.values(item.position),
          rotation: Object.values(item.rotation),
          scale: Object.values(item.scale),
        }
        ThingOrigin.model
          .initFileModel(item["objInfo"].fileType, item["objInfo"].url, modelConfigs)
          .then((model) => {
            //初始元素uuid存在，则使用初始的，否则重新生成
            if(item['uuid']) {
              model.uuid = item['uuid']
            }
            this.add(model);
          });
      } else if (item["objInfo"].objType == "sphere") {
        let sphere = ThingOrigin.model.initSphere(
          item.name,
          {radius: item["objInfo"].radius},
          {
            color: item["objInfo"].color,
            position: [item.position.x, item.position.y, item.position.z],
          }
        );
        this.add(sphere);
      } else if (item["objInfo"].objType == "cube") {
        let cube = ThingOrigin.model.initBox(
          item.name,
          {
            width: item["objInfo"].width,
            height: item["objInfo"].height,
            depth: item["objInfo"].depth,
          },
          {
            color: item["objInfo"].color,
            position: [item.position.x, item.position.y, item.position.z],
          }
        );
        this.add(cube);
      } else if (item["objInfo"].objType == "cylinder") {
        let cylinder = ThingOrigin.model.initCylinder(
          item.name,
          {
            radiusTop: item["objInfo"].radiusTop,
            height: item["objInfo"].height,
            radiusBottom: item["objInfo"].radiusBottom,
          },
          {
            color: item["objInfo"].color,
            position: [item.position.x, item.position.y, item.position.z],
          }
        );
        this.add(cylinder);
      } else if (item["objInfo"].objType == "cone") {
        let cone = ThingOrigin.model.initCone(
          item.name,
          {radius: item["objInfo"].radius, height: item["objInfo"].height},
          {
            color: item["objInfo"].color,
            position: [item.position.x, item.position.y, item.position.z],
          }
        );
        this.add(cone);
      }
    }
  }

  /**
   * @description 播放模型内置动画(gltf)
   * @author LL
   * @date 08/10/2023
   * @param {GLTF} model
   * @param {(number[] | number)} index
   * @memberof TModel
   */
  public playAnimation(model: GLTF, index: number[] | number) {
    this.mixer = new AnimationMixer(model.scene);

    if (ThingOrigin.tool.isArray(index)) {
      console.log("数组类型,要求播放多个动画");
    } else {
      this.mixer.clipAction(model.animations[index as number]).play();
    }
  }

  /**
   * @description 修改背景图片
   * @author LL
   * @date 2021/08/26
   * @param {string} url
   */
  public setBackgroundImg(url: string) {
    this.background = new TextureLoader().load(url);
  }

  /**
   * @description 加载随行框
   * @author LL gj
   * @date 2021/08/31
   * @private
   * @param {ThingOriginParams} sceneParams 场景参数
   */
  private loadCSS2D(sceneParams: ThingOriginParams) {
    if (!sceneParams.css2d) return;
    let timer = setInterval(() => {
      let can = true;
      for (let i = 0; i < sceneParams.css2d.length; i++) {
        if (!this.getObjectByProperty("uuid", sceneParams.css2d[i]['bindModeluuid'])) {
          can = false;
        }
      }
      if (can) {
        for (let i = 0; i < sceneParams.css2d.length; i++) {
          let item = sceneParams.css2d[i];
          let model = this.getObjectByProperty('uuid',item['bindModeluuid']);
          //2d DOM元素如果存在，则加载
          if (document.getElementById(item.domId)) {
            this.addCSS2D(model, document.getElementById(item.domId));
          } else { //否则先生成DOM元素
            let div = document.createElement('div');
            div.id = 'css2d_' + item['bindModeluuid'];
            div.className = 'css2dStyle css2d_' + item.domTypeIndex;
            div.setAttribute('style', 'width:' + item.css2dForm[0].content + 'px');
            div.innerHTML = ` 
            <div class="css2d_title">${item.css2dForm[1].content }</div>
           ${item.css2dForm[2].content }`;
            document.getElementById('WebGL-output').appendChild(div);
            this.addCSS2D(model, document.getElementById('css2d_' + item['bindModeluuid']), item.css2dBoxUuid );
          }
        }
        clearInterval(timer);
      }
    }, 500);

    // let a = document.getElementById("css2d");
    // console.log(sceneParams.css2d);

    // this.model.addCSS2D("name", sceneParams.css2d[0].name, document.getElementById("css2d2"));
    // this.model.addCSS2D("name", sceneParams.css2d[1].name, document.getElementById("css2d"));
  }

  /**
   * @description 创建天空盒
   * @author LL
   * @date 25/04/2022
   * @param {skyColorsParams} [colors={ top: "#86b6f5", line: "#ffffff", bottom: "#999999" }]
   * @param {skyConfigsParams} [skyConfigs={radius: 4000,widthSegments: 32,heightSegments: 15,skyCenter: [0, 0, 0] }]
   */
  public initSky(
    colors: skyColorsParams = {
      top: "#86b6f5",
      line: "#ffffff",
      bottom: "#999999",
    },
    skyConfigs: skyConfigsParams = {
      radius: 4000,
      widthSegments: 32,
      heightSegments: 15,
      skyCenter: [0, 0, 0],
    }
  ) {
    // note that the camera's far distance should bigger than the radius,
    // otherwise, you cannot see the sky
    const skyGeo = new SphereBufferGeometry(
      skyConfigs.radius,
      skyConfigs.widthSegments,
      skyConfigs.heightSegments
    );
    const skyMat = new ShaderMaterial({
      uniforms: {
        topColor: {value: new Color(colors.top)},
        skylineColor: {value: new Color(colors.line)},
        bottomColor: {value: new Color(colors.bottom)},
        offset: {value: 400},
        exponent: {value: 0.9},
        skyCenter: {
          value:
            new Vector3(
              skyConfigs.skyCenter[0],
              skyConfigs.skyCenter[1],
              skyConfigs.skyCenter[2]
            ) || new Vector3(),
        },
      },
      vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
              vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
              vWorldPosition = worldPosition.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }`,
      fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 skylineColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            uniform vec3 skyCenter;
            varying vec3 vWorldPosition;
            void main() {
              vec3 position = vec3(vWorldPosition.x - skyCenter.x, vWorldPosition.y - skyCenter.y, vWorldPosition.z - skyCenter.z);
              float h = normalize( position + offset ).y;
              vec3 color;
              if (h > 0.0) {
                color = mix( skylineColor, topColor, max( pow( max( h, 0.0 ), exponent ), 0.0 ) );
              } else {
                color = mix( skylineColor, bottomColor, max( pow( max( -h, 0.0 ), exponent ), 0.0 ) );
              }
              gl_FragColor = vec4(color , 1.0 );
            }`,
      side: BackSide,
    });

    const sky = new Mesh(skyGeo, skyMat);
    sky.name = "sky";
    sky.userData.selectable = false;

    this.add(sky);
  }

  /**
   * @description 克隆模型
   * @author LL
   * @param {string} sceneName
   * @param {string} uuid
   * @param {number[]} position
   * @return {*}  {Group}
   */
  public cloneObject(
    fromSceneName: string,
    uuid: string,
    position: number[]
  ): Group {
    let target = ThingOrigin.getScene(fromSceneName).getObjectByProperty(
      "uuid",
      uuid
    );
    if (!target) {
      console.warn("克隆失败失败，物体不存在");
      return;
    }

    let group = new Group();
    let cloneObj = target.clone();
    target.parent.matrixWorld.decompose(
      group.position,
      group.quaternion,
      group.scale
    );
    group.updateMatrixWorld(true);
    target.matrixWorld.decompose(
      cloneObj.position,
      cloneObj.quaternion,
      cloneObj.scale
    );
    cloneObj.updateMatrixWorld(true);
    cloneObj.position.set(position[0], position[1], position[2]);
    group.attach(cloneObj);

    return group;
  }

  /**
   * @description 删除模型
   * @author gj
   * @param {string} uuid
   */
  public removeModel(uuid: string): void {
    let obj = this.getObjectByProperty("uuid", uuid);
    if (!obj) {
      console.warn("删除模型失败，物体不存在");
      return;
    }

    obj.traverse((child) => {
      if (obj.uuid != child.uuid) {
        if (child instanceof CSS2DObject) {
          this.removeCSS2D(child.uuid);
        }
      }
      //删除模型缓冲区存储顶点数据
      if (child["material"]) {
        //todo  将material 等材质单独成类管理
        if (Array.isArray(child["material"])) {
          for (let i = 0; i < child["material"].length; i++) {
            child["material"][i].dispose();
          }
        } else {
          child["material"].dispose();
        }
      }

      if (child["geometry"]) child["geometry"].dispose();
    });
    obj.parent.remove(obj);
    this.helper.removeBox();
  }

  /**
   * @description 给模型添加2d元素
   * @author gj
   * @date 2021/08/30
   * @param {Object3D} model
   * @param {HTMLElement} html dom元素
   * @param {number} [ratio=1.1]
   * @param {number[]} [offset=[0,0,0]]
   * @param {string} css2dBoxUuid 初始元素uuid
   * @return {*}  {string}
   */
  public addCSS2D(
    model: Object3D | Group,
    html: HTMLElement,
    css2dBoxUuid?: string,
    ratio: number = 1.1,
    offset: number[] = [0, 0, 0],
  ): string {
    if (!model) {
      console.warn("标注添加失败，物体不存在");
      return;
    }

    // let div = document.createElement("div");
    // div.innerHTML = html;

    let CSSLabel = new CSS2DObject(html);
    console.log("2d元素",CSSLabel);
    //初始元素uuid存在，则使用初始的，否则重新生成
    if(css2dBoxUuid){
      CSSLabel.uuid = css2dBoxUuid;
    }
    let sphere = ThingOrigin.tool.getObjectSphere(model);
    CSSLabel.position.set(
      sphere.center.x + offset[0],
      sphere.center.y + sphere.radius * ratio + offset[1],
      sphere.center.z + offset[2]
    );
    CSSLabel.element.id = CSSLabel.uuid;
    CSSLabel.userData.modelUUID = model.uuid;
    model.attach(CSSLabel);
    return CSSLabel.uuid;
  }

  /**
   * @description 删除2d元素
   * @author gj
   * @param {string} uuid 模型的uuid
   */
  public removeCSS2D(uuid: string): void {
    let mySelfHtml = document.getElementById(uuid);
    if (mySelfHtml) mySelfHtml.parentElement.removeChild(mySelfHtml);

    this.removeModel(uuid);
  }

  /**
   * @description 控制模型显示隐藏
   * @author LL
   * @date 2021/08/16
   * @param {string} name 模型名称
   * @param {boolean} visible 是否可见
   */
  public setVisible(name: string, visible: boolean) {
    let model = this.getObjectByProperty("name", name);
    if (!model) {
      console.warn("物体控制显示隐藏失败，物体不存在");
      return;
    }
    model.visible = visible;
  }
}
