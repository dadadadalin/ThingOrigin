import * as d3geo from "d3-geo";
import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  FileLoader,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  Object3D,
  ObjectLoader,
  Plane,
  PlaneGeometry,
  PlaneHelper,
  Points,
  Shape,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  TextureLoader,
  Vector3,
  BufferAttribute,
  PointsMaterial,
  Quaternion,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import { TMaterial } from "./TMaterial";
import { merge, cloneDeep } from "lodash";
import { TIndexedDB } from "./TIndexedDB";
import { TFont } from "./TFont";

export class TModel {
  FBXLoader: FBXLoader = new FBXLoader();
  STLLoader: STLLoader = new STLLoader();
  OBJLoader: OBJLoader = new OBJLoader();
  SVGLoader: SVGLoader = new SVGLoader();
  // DRACOLoader: DRACOLoader = new DRACOLoader()
  //   .setDecoderPath("/public/draco/")
  //   .preload();
  // GLTFLoader: GLTFLoader = new GLTFLoader().setDRACOLoader(this.DRACOLoader);
  GLTFLoader: GLTFLoader = new GLTFLoader();
  ObjectLoader: ObjectLoader = new ObjectLoader();

  material: TMaterial = new TMaterial();
  font: TFont = new TFont();
  /** 本地缓存 */
  public indexedDB: TIndexedDB = new TIndexedDB();

  constructor() {}

  /**
   * @description 加载渲染模型
   * @author LL
   * @date 2021/07/26
   * @private
   */
  public async loadModel(modelInfo: modelInfoParams): Promise<Object3D> {
    let model;
    switch (modelInfo.modelType) {
      case "sphere":
        let sphere = this.initSphere(modelInfo);
        model = this.setModelConfig(sphere, modelInfo);
        break;
      case "cube":
        let cube = this.initCube(modelInfo);
        model = this.setModelConfig(cube, modelInfo);
        break;
      case "cylinder":
        let cylinder = this.initCylinder(modelInfo);
        model = this.setModelConfig(cylinder, modelInfo);
        break;
      case "cone":
        let cone = this.initCone(modelInfo);
        model = this.setModelConfig(cone, modelInfo);
        break;
      case "circle":
        let circle = this.initCircle(modelInfo);
        model = this.setModelConfig(circle, modelInfo);
        break;
      case "gltf":
      case "glb":
      case "fbx":
      case "obj":
      case "stl":
      case "json":
        let idbInfo = await this.indexedDB.getIDBModelInfo(modelInfo);

        return new Promise((resolve, reject) => {
          this.initFileModel(idbInfo).then((fileModel: any) => {
            let model;
            if (["gltf", "glb"].indexOf(modelInfo.modelType) !== -1) {
              model = fileModel.scene;
              model.animations = fileModel.animations;
              // model.scene.visible = cloneInfo.visible;
              //加载模型自带文字  todo
            } else {
              model = fileModel;
            }
            resolve(this.setModelConfig(model, idbInfo));
          });
        });
        break;
      case "text":
        let textInfo = cloneDeep(modelInfo);

        switch (modelInfo.base.textType) {
          case "text":
            let textModel = await this.font.initText(textInfo);
            model = this.setModelConfig(textModel, modelInfo);
            break;
          case "traceText":
            let textLineModel = await this.font.initTextLine(textInfo);
            model = this.setModelConfig(textLineModel, modelInfo);
            break;
          case "shapeText":
            let textShapeModel = await this.font.initTextShape(textInfo);
            model = this.setModelConfig(textShapeModel, modelInfo);
            break;
        }
        break;
      case "assemble":
        let assemble = await this.initAssemble(modelInfo);
        model = this.setModelConfig(assemble, modelInfo);
        break;
    }
    return model;
  }

  public async loadSimTexts(info: any, model: any) {
    //是否带有文字
    const textInfo = {
      id: 2002,
      text: "形状文字",
      modelName: "traceText",
      modelType: "text",
      modelSize: null,
      scale: {
        x: 1,
        y: 1,
        z: 1,
      },
      position: {
        x: 0,
        y: 0,
        z: 0,
      },
      rotation: {
        x: 0,
        y: 0,
        z: 0,
      },
      base: {
        fontUrl:
          "http://124.70.30.193:8084/model2/load/Microsoft_YaHei_Light_Regular.json",
        height: 100,
        text: "形状文字",
        textType: "shapeText",
        color: "#f00",
        lineWidth: 2,
        opacity: 1,
        size: 1.5,
      },
      material: null,
      userData: null,
    };
    const accessText = await this.indexedDB.accessModel(textInfo);
    //如果缓存了   直接导入
    if (accessText.info.saved) {
      textInfo.base.fontUrl = accessText.modelUrl;
    } else {
      //未缓存则先缓存再导入
      const insertText = await this.indexedDB.insertModel(textInfo);
      if (insertText.info.saved) {
        textInfo.base.fontUrl = insertText.modelUrl;
      }
    }
    for (const item of info.userData?.sim?.simTexts) {
      Object.assign(textInfo, item);
      textInfo.base.text = item.text;
      this.font.initTextShape(textInfo).then((textModel: any) => {
        //ABB机器人文字绑定在轴上
        if (textInfo.base.text === "夹取") {
          model.traverse((child: any) => {
            if (child.name === "WS30-5") {
              child.attach(textModel);
            }
          });
        } else {
          model.attach(textModel);
        }
      });
    }
  }

  /**
   * @description 导入模型文件
   * @author LL
   * @date 2021/07/26
   * @param {modelInfoParams} modelInfo 模型参数
   * @param {string} url  模型文件地址
   * @memberof TModel
   * @returns {*}  {Promise<Object3D>}
   */
  public initFileModel(modelInfo?: modelInfoParams): Promise<Object3D> {
    let defaultParams = {
      modelType: "gltf",
      modelName: "fileModel-" + new Date().getTime(),
      base: {
        modelUrl: "http://124.70.30.193:8084/model2/loadFileAsId/3011",
      },
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
    };
    let param = merge(defaultParams, modelInfo);

    return new Promise((resolve) => {
      switch (param.modelType) {
        case "fbx":
          this.FBXLoader.load(modelInfo.base.modelUrl, (fbx: Group) => {
            let model = this.setModelConfig(fbx, param);
            resolve(model);
          });
          break;
        case "obj":
          this.OBJLoader.load(modelInfo.base.modelUrl, (obj: Object3D) => {
            let model = this.setModelConfig(obj, param);
            resolve(model);
          });
          break;
        case "stl":
          this.STLLoader.load(
            modelInfo.base.modelUrl,
            (geometry: BufferGeometry) => {
              var material = new MeshLambertMaterial(); //材质对象Material
              material.side = DoubleSide;
              var mesh = new Mesh(geometry, material); //网格模型对象Mesh
              let model = this.setModelConfig(mesh, param);
              resolve(model);
            }
          );
          break;
        case "gltf":
        case "glb":
          this.GLTFLoader.load(modelInfo.base.modelUrl, (gltf) => {
            let model = this.setModelConfig(gltf.scene, param);
            //@ts-ignore
            gltf.scene = model;
            resolve(gltf as unknown as Object3D);
          });
          break;
        case "json":
          this.ObjectLoader.load(
            modelInfo.base.modelUrl,
            (object: Object3D) => {
              let model = this.setModelConfig(object, param);
              resolve(model);
            }
          );
          break;
        default:
          console.warn("未定义模型类型，导入失败");
          resolve(null);
      }
    });
  }
  /**
   * @description 加载组合模型
   * @author LL
   * @date 2021/07/26
   * @param {modelInfoParams} modelInfo 模型参数
   */
  public async initAssemble(modelInfo?: modelInfoParams): Promise<any> {
    let defaultParams = {
      modelName: "assemble-" + new Date().getTime(),
      base: {
        children: [],
      },
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
    };
    let param = merge(defaultParams, modelInfo);

    //1.将组合模型中的内部模型全部缓存起来
    let loadRes = [];
    for (let i = 0; i < param.base.children.length; i++) {
      if (["gltf"].indexOf(param.base.children[i].modelType) != -1) {
        let info = {
          id: param.base.children[i].id,
          modelName: param.base.children[i].name,
          base: {
            modelUrl: param.base.children[i].base.modelUrl,
          },
          modelType: "gltf",
          loadType: "userModel",
          scale: { x: 1, y: 1, z: 1 },
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        };

        let accessInsertRes = await this.indexedDB.accessInsertModel(info);

        if (accessInsertRes.saved) {
          loadRes.push(true);
        } else {
          loadRes.push(false);
        }
      } else {
        loadRes.push(true);
      }
    }

    //2. 全部缓存完成后  在渲染整组模型
    let assemble = null;
    if (loadRes.length == param.base.children.length) {
      console.log("组合内模型全部加载完成", param);
      switch (modelInfo.base.loadType) {
        case "shelf":
          const shelf = await this.initShelf(param);
          assemble = shelf;
          break;
        case "normal":
          assemble = this.initGroup(modelInfo);
          for (const item of modelInfo.base.children) {
            switch (item.modelType) {
              case "sphere":
                let sphere = this.initSphere(item);
                assemble.add(sphere);
                break;
              case "cube":
                let cube = this.initCube(item);
                assemble.add(cube);
                break;
              case "cylinder":
                let cylinder = this.initCylinder(item);
                assemble.add(cylinder);
                break;
              case "cone":
                let cone = this.initCone(item);
                assemble.add(cone);
                break;
              case "circle":
                let circle = this.initCircle(item);
                assemble.add(circle);
                break;
              case "gltf":
                let idbInfo = await this.indexedDB.getIDBModelInfo(item);
                let fileModel: any = await this.initFileModel(idbInfo);
                let model;
                if (item.modelType === "gltf") {
                  model = fileModel.scene;
                  model.animations = fileModel.animations;
                  // model.scene.visible = cloneInfo.visible;
                  // 加载模型自带文字  todo
                } else {
                  model = fileModel;
                }
                assemble.add(model);
                break;
            }
          }
          break;
      }
    }

    return this.setModelConfig(assemble, param);
  }

  /**
   * @description 创建Group
   * @author LL
   * @date 2021/10/26
   * @param {modelInfoParams} 模型参数
   * @returns {*}  {Object3D}
   */
  public initGroup(modelInfo?: modelInfoParams): Object3D {
    let defaultParams = {
      modelName: "group-" + new Date().getTime(),
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
    };
    let param = merge(defaultParams, modelInfo);
    let group = new Group();
    return this.setModelConfig(group, param);
  }

  /**
   * @description 创建立方体
   * @author LL
   * @date 2021/08/19
   * @param {modelInfoParams} [modelInfo] 模型参数
   * @param {*} [material] 材质
   * @returns {*}  {Object3D}
   * @memberof TModel
   */
  public initCube(modelInfo?: modelInfoParams, material?: any): Object3D {
    let defaultParams = {
      modelName: "cube-" + new Date().getTime(),
      modelType: "cube",
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
        width: 10,
        height: 10,
        depth: 10,
        widthSegments: 1,
        heightSegments: 1,
        depthSegments: 1,
      },
      material: {
        color: "#f00",
        type: "MeshLambertMaterial",
      },
    };
    let param = merge(defaultParams, modelInfo);
    let cube: BoxGeometry = new BoxGeometry(
      param.base.width,
      param.base.height,
      param.base.depth,
      param.base.widthSegments,
      param.base.heightSegments,
      param.base.depthSegments
    );

    if (!material) {
      material = new MeshLambertMaterial({ color: param.material.color });
    }

    const geometryObject = new Mesh(cube, material);
    return this.setModelConfig(geometryObject, param);
  }

  /**
   * @description 创建平面
   * @author LL
   * @date 2025/03/26
   * @param {modelInfoParams} [modelInfo]
   * @returns {*}  {Object3D}
   * @memberof TModel
   */
  public initPlane(modelInfo?: modelInfoParams): any {
    let defaultParams = {
      modelName: "plane-" + new Date().getTime(),
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
      normal: {
        x: 0,
        y: 0,
        z: 0,
      },
      base: {
        width: 10,
        height: 10,
        widthSegments: 32,
        heightSegments: 32,
      },
      material: {
        color: "#f00",
        type: "MeshBasicMaterial",
      },
    };
    let param = merge(defaultParams, modelInfo);

    let geometry: PlaneGeometry = this.initPlaneGeometry(
      param.base.width,
      param.base.height
    );

    let material = new MeshBasicMaterial({
      color: param.material.color,
    });
    const plane = new Mesh(geometry, material);

    // 计算旋转四元数（将Z轴对齐到法向量方向）
    const quaternion = new Quaternion();
    const up = new Vector3(0, 0, 1); // 默认平面法向量方向
    const target = new Vector3(param.normal.x, param.normal.y, param.normal.z)
      .clone()
      .normalize(); // 确保法向量是单位向量

    // 设置四元数旋转（从up到target方向）
    quaternion.setFromUnitVectors(up, target);
    plane.setRotationFromQuaternion(quaternion);

    return this.setModelConfig(plane, param);
  }

  /**
   * @description 创建面板
   * @author LL
   * @date 2024/06/03
   * @param {modelInfoParams} modelInfo 模型参数
   * @memberof TModel
   */
  public initPlaneHelper(modelInfo?: modelInfoParams): Object3D {
    let defaultParams = {
      modelName: "planeHelper-" + new Date().getTime(),
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
        face: {
          x: 1,
          y: 0,
          z: 0,
        },
        distance: 0,
        size: 1,
      },
      material: {
        color: "0xffff00",
      },
    };
    let param = merge(defaultParams, modelInfo);
    const plane = new Plane(
      new Vector3(param.base.face.x, param.base.face.y, param.base.face.z),
      param.base.distance
    );
    const helper = new PlaneHelper(
      plane,
      param.base.size,
      new Color(param.material.color).getHex()
    );

    return this.setModelConfig(helper, param);
  }

  /**
   * @description 自动生成货架
   * @author LL
   * @date 2024/09/02
   * @param {modelInfoParams} modelInfo
   * @returns {*}  {Promise<Object3D>}
   * @memberof TModel
   */
  public async initShelf(modelInfo?: modelInfoParams): Promise<Object3D> {
    let defaultParams = {
      modelName: "shelf-" + new Date().getTime(),
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
        rows: 3,
        columns: 4,
        height: 7.9,
        depth: 9,
        width: 9,
        children: [
          {
            name: "shelf-Footer",
            id: 300,
            modelType: "gltf",
            base: {
              modelUrl:
                "http://124.70.30.193:8084/model2/load/ae5636a6-99f4-4780-9e3d-7affeb1c62da/shelf-Footer.gltf",
            },
          },
          {
            name: "shelf-OneSide",
            id: 301,
            modelType: "gltf",
            base: {
              modelUrl:
                "http://124.70.30.193:8084/model2/load/ae5636a6-99f4-4780-9e3d-7affeb1c62da/shelf-OneSide.gltf",
            },
          },
          {
            name: "shelf-ThreeSide",
            id: 302,
            modelType: "gltf",
            base: {
              modelUrl:
                "http://124.70.30.193:8084/model2/load/ae5636a6-99f4-4780-9e3d-7affeb1c62da/shelf-ThreeSide.gltf",
            },
          },
        ],
      },
    };
    let param = merge(defaultParams, modelInfo);

    let footer, threeSide, oneSide;
    for (let i = 0; i < param.base.children.length; i++) {
      await this.initFileModel(param.base.children[i]).then(
        (fileModel: any) => {
          if (param.base.children[i].name == "shelf-Footer") {
            footer = fileModel.scene;
          } else if (param.base.children[i].name == "shelf-ThreeSide") {
            threeSide = fileModel.scene;
          } else if (param.base.children[i].name == "shelf-OneSide") {
            oneSide = fileModel.scene;
          }
        }
      );
    }

    let shelf = this.initGroup();
    let oneRow = this.initGroup();
    let rightSide = this.initGroup();

    for (let i = 0; i < param.base.columns; i++) {
      let threeSideClone = threeSide.clone();
      threeSideClone.name = "threeSide" + (i + 1);
      threeSideClone.position.set(0, i * param.base.height, 0);
      threeSide.name = "shelf-row-column" + (i + 1);
      oneRow.add(threeSideClone);

      let oneSideClone = oneSide.clone();
      oneSideClone.position.set(
        param.base.width * param.base.rows,
        i * param.base.height,
        0
      );
      oneSideClone.name = "shelf-right-column" + (i + 1);
      rightSide.add(oneSideClone);
    }
    rightSide.name = "shelf-right";
    shelf.add(rightSide);
    for (let i = 0; i < param.base.rows; i++) {
      let oneRowClone = oneRow.clone();
      oneRowClone.position.set(param.base.width * i, 0, 0);
      oneRowClone.name = "shelf-row" + (i + 1);
      shelf.add(oneRowClone);
    }

    return this.setModelConfig(shelf, param);
  }

  /**
   * @description 创建球体
   * @author LL
   * @date 2021/07/23
   * @param {modelInfoParams} modelInfo 模型参数
   * @param {*} [material] 材质
   * @returns {*}  {Object3D}
   */
  public initSphere(modelInfo?: modelInfoParams, material?: any): Object3D {
    let defaultParams = {
      modelName: "sphere-" + new Date().getTime(),
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
        radius: 10,
        widthSegments: 15,
        heightSegments: 15,
      },
      material: {
        color: "#f00",
      },
    };
    let param = merge(defaultParams, modelInfo);
    let sphere: SphereGeometry;
    sphere = new SphereGeometry(
      param.base.radius,
      param.base.widthSegments,
      param.base.heightSegments,
      param.base?.phiStart,
      param.base?.phiLength,
      param.base?.thetaStart,
      param.base?.thetaLength
    );

    if (!material) {
      material = new MeshLambertMaterial({
        color: param.material.color,
      });
    }
    const geometryObject = new Mesh(sphere, material);
    return this.setModelConfig(geometryObject, param);
  }

  /**
   * @description 创建圆锥
   * @author LL
   * @date 2021/08/19
   * @param {modelInfoParams} modelInfo 模型参数
   * @returns {*}  {Object3D}
   */
  public initCone(modelInfo?: modelInfoParams): Object3D {
    let defaultParams = {
      modelName: "cone-" + new Date().getTime(),
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
        radius: 10,
        height: 20,
      },
      material: {
        color: "#f00",
      },
    };
    let param = merge(defaultParams, modelInfo);

    let cone: ConeGeometry;
    cone = new ConeGeometry(
      param.base?.radius,
      param.base?.height,
      param.base?.radialSegments,
      param.base?.heightSegments,
      param.base?.openEnded,
      param.base?.thetaStart,
      param.base?.thetaLength
    );
    let material: MeshLambertMaterial = new MeshLambertMaterial({
      color: param.material.color,
    });
    const geometryObject = new Mesh(cone, material);
    geometryObject.name = param.name;
    return this.setModelConfig(geometryObject, param);
  }

  /**
   * @description 创建圆柱体
   * @author LL
   * @date 2021/08/19
   * @param {modelInfoParams} modelInfo 模型参数
   * @returns {*}  {Object3D}
   */
  public initCylinder(modelInfo?: modelInfoParams): Object3D {
    let defaultParams = {
      modelName: "cylinder-" + new Date().getTime(),
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
        radiusTop: 10,
        radiusBottom: 10,
        height: 20,
        radialSegments: 32,
      },
      material: {
        color: "#f00",
      },
    };
    let param = merge(defaultParams, modelInfo);

    let cylinder: CylinderGeometry;
    cylinder = new CylinderGeometry(
      param.base?.radiusTop,
      param.base?.radiusBottom,
      param.base?.height,
      param.base?.radialSegments,
      param.base?.heightSegments,
      param.base?.openEnded,
      param.base?.thetaStart,
      param.base?.thetaLength
    );

    let material: MeshLambertMaterial = new MeshLambertMaterial({
      color: param.material.color,
    });
    const geometryObject = new Mesh(cylinder, material);
    geometryObject.name = param.name;
    return this.setModelConfig(geometryObject, param);
  }

  /**
   * @description 创建平面缓冲几何体
   * @author LL
   * @date 2023/11/13
   * @param {number} width
   * @param {number} height
   * @returns {*}  {PlaneGeometry}
   * @memberof TModel
   */
  public initPlaneGeometry(width?: number, height?: number): PlaneGeometry {
    return new PlaneGeometry(width, height);
  }

  /**
   * @description 创建圆形（平面）
   * @author LL
   * @date 2024/10/18
   * @param {modelInfoParams} [modelInfo] 模型参数
   * @returns {*}  {Mesh}
   * @memberof TModel
   */
  public initCircle(modelInfo?: any): Object3D {
    let defaultParams = {
      modelName: "circle-" + new Date().getTime(),
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
        radius: 5,
        segments: 32,
        thetaStart: 0,
        thetaLength: Math.PI * 2,
      },
      material: {
        color: "#f00",
        doubleSide: true,
      },
    };
    let param = merge(defaultParams, modelInfo);

    let geometry = new CircleGeometry(
      param.base.radius,
      param.base.segments,
      param.base.thetaStart,
      param.base.thetaLength
    );
    let material = new MeshBasicMaterial({ color: param.material.color });
    material.side = DoubleSide;
    let circle = new Mesh(geometry, material);
    return this.setModelConfig(circle, param);
  }

  /**
   * @description 创建地图
   * @author LL
   * @date 2021/09/16
   * @param {modelInfoParams} [modelInfo] 模型参数
   */
  public initMap(modelInfo?: any): Promise<Object3D> {
    let defaultParams = {
      modelName: "map-" + new Date().getTime(),
      base: {
        url: "",
      },
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
    };
    let param = merge(defaultParams, modelInfo);

    // 加载json文件
    let loader = new FileLoader();

    return new Promise((resolve) => {
      loader.load(param.base.url, (data) => {
        let jsonData = JSON.parse(data as string);
        // 建一个空对象存放对象
        var map = new Object3D();

        // 墨卡托投影转换
        const projection = d3geo
          .geoMercator()
          .center([104.0, 37.5])
          .scale(80)
          .translate([0, 0]);

        jsonData.features.forEach((elem) => {
          // 定一个省份3D对象
          const province = new Object3D();
          // 每个的 坐标 数组
          const coordinates = elem.geometry.coordinates;
          // 循环坐标数组
          coordinates.forEach((multiPolygon) => {
            multiPolygon.forEach((polygon) => {
              const shape = new Shape();

              const lineMaterial = new LineBasicMaterial({ color: "white" });

              let points = [];
              for (let i = 0; i < polygon.length; i++) {
                const [x, y] = projection(polygon[i]);
                if (i === 0) {
                  shape.moveTo(x, -y);
                }
                shape.lineTo(x, -y);
                points.push(new Vector3(x, -y, 4.01));
              }
              const lineGeometry = new BufferGeometry().setFromPoints(points);

              const extrudeSettings = {
                depth: 4,
                bevelEnabled: false,
              };

              const geometry = new ExtrudeGeometry(shape, extrudeSettings);
              const material = new MeshBasicMaterial({
                color: "#02A1E2",
                transparent: true,
                opacity: 0.6,
              });
              const material1 = new MeshBasicMaterial({
                color: "#3480C4",
                transparent: true,
                opacity: 0.5,
              });
              const mesh = new Mesh(geometry, [material, material1]);
              const line = new Line(lineGeometry, lineMaterial);
              province.add(mesh);
              province.add(line);
            });
          });

          // 将geo的属性放到省份模型中
          (province as any).properties = elem.properties;
          if (elem.properties.contorid) {
            const [x, y] = projection(elem.properties.contorid);
            (province as any).properties._centroid = [x, y];
          }

          map.add(province);
        });

        resolve(this.setModelConfig(map, param));
      });
    });
  }

  /**
   * @description 添加视频面板
   * @author LL
   * @date 2021/09/03
   * @param {HTMLVideoElement} dom video标签
   * @param {modelInfoParams} [modelInfo] 模型参数
   * @returns {*}  {Object3D}
   * @memberof TModel
   */
  public initVideoPlane(
    dom: HTMLVideoElement,
    modelInfo?: modelInfoParams
  ): Object3D {
    let defaultParams = {
      modelName: "videoPlane-" + new Date().getTime(),
      base: {
        width: 250,
        height: 100,
      },
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
    };
    let param = merge(defaultParams, modelInfo);

    var planeGeometry = new PlaneGeometry(param.base.width, param.base.height);
    var material = new MeshPhongMaterial();
    material.side = DoubleSide;

    material.map = this.material.initVideoMaterial(dom);
    var mesh = new Mesh(planeGeometry, material);

    return this.setModelConfig(mesh, param);
  }

  /**
   * @description 生成点云
   * @author LL
   * @date 2021/08/25
   * @param {modelInfoParams} [modelInfo] 模型参数
   */
  public initPoints(modelInfo?: modelInfoParams): Object3D {
    let defaultParams = {
      modelName: "points-" + new Date().getTime(),
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
        positions: [],
        pointConfigs: {
          color: "#f00",
          size: 1.5,
        },
        offset: {
          x: 0,
          y: 0,
          z: 0,
        },
        scale: 1,
      },
    };

    for (let i = 0; i < 100; i++) {
      defaultParams.base.positions.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 100,
      });
    }

    let param = merge(defaultParams, modelInfo);

    let pointArr = [];
    for (let i = 0; i < param.base.positions.length; i++) {
      pointArr.push(
        new Vector3(
          (param.base.positions[i]["x"] + param.base.offset.x) *
            param.base.scale,
          (param.base.positions[i]["y"] + param.base.offset.y) *
            param.base.scale,
          (param.base.positions[i]["z"] + param.base.offset.z) *
            param.base.scale
        )
      );
    }

    var geometry = new BufferGeometry().setFromPoints(pointArr); //声明一个几何体对象Geometry

    var pointMaterial = this.material.initPointsMaterial(
      param.base.pointConfigs.color,
      false,
      param.base.pointConfigs.size
    );

    //生成点模型
    var points = new Points(geometry, pointMaterial);

    return this.setModelConfig(points, param);
  }

  public initPoints2(modelInfo?: modelInfoParams): Object3D {
    let defaultParams = {
      modelName: "points-" + new Date().getTime(),
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
        positions: [],
        pointConfigs: {
          colorType: "unite", //unite 统一    onself 单个自定义  random 随机
          color: {
            r: 1,
            g: 0,
            b: 0,
          },
          size: 1.5,
        },
        offset: {
          x: 0,
          y: 0,
          z: 0,
        },
        scale: 1,
      },
    };
    let param = merge(defaultParams, modelInfo);

    let positions = new Float32Array(param.base.positions.length * 3);
    let colors = new Float32Array(param.base.positions.length * 3);

    for (let i = 0; i < param.base.positions.length; i++) {
      positions[i * 3] =
        (param.base.positions[i][param.base.property.x] + param.base.offset.x) *
        param.base.scale;
      positions[i * 3 + 1] =
        (param.base.positions[i][param.base.property.y] + param.base.offset.y) *
        param.base.scale;
      positions[i * 3 + 2] =
        (param.base.positions[i][param.base.property.z] + param.base.offset.z) *
        param.base.scale;

      if (param.base.pointConfigs.colorType === "unite") {
        colors[i * 3] = param.base.pointConfigs.color.r;
        colors[i * 3 + 1] = param.base.pointConfigs.color.g;
        colors[i * 3 + 2] = param.base.pointConfigs.color.b;
      } else if (param.base.pointConfigs.colorType === "onself") {
        colors[i * 3] = param.base.pointConfigs[i].r;
        colors[i * 3 + 1] = param.base.pointConfigs[i].g;
        colors[i * 3 + 2] = param.base.pointConfigs[i].b;
      } else if (param.base.pointConfigs.colorType === "random") {
        colors[i * 3] = Math.random();
        colors[i * 3 + 1] = Math.random();
        colors[i * 3 + 2] = Math.random();
      }
    }

    var geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("color", new BufferAttribute(colors, 3));

    const material = new PointsMaterial({
      size: param.base.pointConfigs.size,
      vertexColors: true,
    });
    let points = new Points(geometry, material);

    return this.setModelConfig(points, param);
  }

  /**
   * @description 精灵图形
   * @author LL
   * @date 2021/08/25
   * @param {modelInfoParams} [modelInfo] 模型参数
   */
  public initSpriteShape(modelInfo?: any): Object3D {
    let defaultParams = {
      modelName: "spriteShape-" + new Date().getTime(),
      base: {
        positions: [],
        spriteShape: {
          shape: "sphere", //形状类型 例:'sphere'||'triangle'
          color: "#f00",
          radius: 5,
        },
      },
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
    };
    for (let i = 0; i < 100; i++) {
      defaultParams.base.positions.push({
        name: "sprite" + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 100,
      });
    }
    let param = merge(defaultParams, modelInfo);

    let canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 20;

    let ctx = canvas.getContext("2d");
    if (param.base.spriteShape.shape == "sphere") {
      ctx.arc(10, 10, 10, 0, 2 * Math.PI);
    } else if (param.base.spriteShape.shape == "triangle") {
      ctx.beginPath();
      ctx.moveTo(10, 15);
      ctx.lineTo(20, 0);
      ctx.lineTo(0, 0);
      ctx.closePath(); //闭合路径
      ctx.lineWidth = 10; //线的边框为10像素
    }
    ctx.fillStyle = param.base.spriteShape.color;
    ctx.fill();

    let texture = new Texture(canvas);
    texture.needsUpdate = true; //注意这句不能少
    let material1 = new SpriteMaterial({ map: texture });

    let spriteGroup = new Group();

    for (var i = 0; i < param.base.positions.length; i++) {
      var sprite = new Sprite(material1.clone());
      if (param.base.positions[i].name)
        sprite.name = param.base.positions[i].name;
      sprite.position.set(
        param.base.positions[i].x,
        param.base.positions[i].y,
        param.base.positions[i].z
      );
      sprite.scale.set(
        param.base.spriteShape.radius,
        param.base.spriteShape.radius,
        1
      );
      spriteGroup.add(sprite);
    }

    return this.setModelConfig(spriteGroup, param);

    // sprite.position.normalize();
    // sprite.position.multiplyScalar(700);
  }

  /**
   * @description 精灵图片材质
   * @author LL
   * @date 2021/08/25
   * @param {modelInfoParams} [modelInfo] 模型参数
   */
  public initSpritePic(modelInfo?: modelInfoParams): Object3D {
    let defaultParams = {
      modelName: "spritePic-" + new Date().getTime(),
      base: {
        positions: [],
        spriteShape: {
          url: "",
          size: 10,
        },
      },
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
    };
    for (let i = 0; i < 100; i++) {
      defaultParams.base.positions.push({
        name: "sprite" + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 100,
      });
    }
    let param = merge(defaultParams, modelInfo);

    const map = new TextureLoader().load(param.base.spritePic.url);
    const material = new SpriteMaterial({ map: map });

    let spriteGroup = new Group();
    for (var i = 0; i < param.base.positions.length; i++) {
      var sprite = new Sprite(material.clone());
      if (param.base.positions[i].name)
        sprite.name = param.base.positions[i].name;
      sprite.position.set(
        param.base.positions[i].x,
        param.base.positions[i].y,
        param.base.positions[i].z
      );
      sprite.scale.set(param.base.spritePic.size, param.base.spritePic.size, 1);
      spriteGroup.add(sprite);
    }

    return this.setModelConfig(spriteGroup, param);
  }

  /**
   * @description 统一处理模型
   * @author LL
   * @date 2024/06/20
   * @private
   * @param {Object3D} model
   * @param {modelInfoParams} modelInfo
   * @returns {*}  {Object3D}
   * @memberof TModel
   */
  public setModelConfig(model: Object3D, modelInfo: modelInfoParams): Object3D {
    model.traverse((child) => {
      child.userData = merge(child.userData, {
        parent: modelInfo.modelName,
      });
    });

    //处理缩放
    if (modelInfo.scale)
      model.scale.set(modelInfo.scale.x, modelInfo.scale.y, modelInfo.scale.z);

    if (modelInfo.rotation) {
      //处理旋转
      if ("x" in modelInfo.rotation) {
        model.rotation.set(
          modelInfo.rotation.x,
          modelInfo.rotation.y,
          modelInfo.rotation.z
        );
      } else if ("_x" in modelInfo.rotation) {
        model.rotation.set(
          modelInfo.rotation._x,
          modelInfo.rotation._y,
          modelInfo.rotation._z
        );
      }
    }

    //处理位置
    if (modelInfo.position)
      model.position.set(
        modelInfo.position.x,
        modelInfo.position.y,
        modelInfo.position.z
      );

    model.name = modelInfo.modelName;
    model.userData = merge(modelInfo.userData ? modelInfo.userData : {}, {
      by: "ThingOrigin3D",
      base: modelInfo.base,
      material: modelInfo.material,
      loadType: modelInfo.loadType,
      modelType: modelInfo.modelType,
    });

    model.updateMatrixWorld(true);

    // 放开有很多奇怪问题   模型莫名其妙消失
    //model.visible如果为undefined或者null，就会被设置为true
    model.visible = modelInfo.visible ?? true;
    return model;
  }

  public initBufferGeometry() {
    return new BufferGeometry();
  }

  public initBufferAttribute(array, itemSize) {
    return new BufferAttribute(array, itemSize);
  }

  public initMesh(geometry?, material?) {
    return new Mesh(geometry, material);
  }
}
