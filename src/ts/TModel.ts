import * as d3geo from "d3-geo";
import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
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
  PlaneGeometry,
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
  LoadingManager,
  LoaderUtils,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module";
import { TMaterial } from "./TMaterial";
import { merge, cloneDeep } from "lodash-es";
import { TIndexedDB } from "./TIndexedDB";
import { TFont } from "./TFont";
import JSZip from "jszip";
import { ThingOrigin } from "../ThingOrigin";

import { setModelConfig } from "../private/privateTool";

/**
 * 基础模型
 */
export class TModel {
  MANAGER = new LoadingManager();
  FBXLoader: FBXLoader = new FBXLoader();
  STLLoader: STLLoader = new STLLoader();
  OBJLoader: OBJLoader = new OBJLoader();
  SVGLoader: SVGLoader = new SVGLoader();
  ObjectLoader: ObjectLoader = new ObjectLoader();
  GLTFLoader: GLTFLoader = new GLTFLoader(this.MANAGER);
  DRACO_LOADER: DRACOLoader = new DRACOLoader(this.MANAGER);
  KTX2_LOADER: KTX2Loader = new KTX2Loader(this.MANAGER);

  private material: TMaterial = new TMaterial();
  private font: TFont = new TFont();

  /** 本地缓存 */
  public indexedDB: TIndexedDB = new TIndexedDB();

  constructor() {
    console.log("ThingOrigin", ThingOrigin.sceneData);
    this.DRACO_LOADER.setDecoderPath(ThingOrigin.sceneData.params.loader.draco);
    this.KTX2_LOADER.setTranscoderPath(
      ThingOrigin.sceneData.params.loader.ktx2
    );
    this.GLTFLoader.setCrossOrigin("anonymous")
      .setDRACOLoader(this.DRACO_LOADER) //启用对 Draco 压缩几何的支持
      .setKTX2Loader(this.KTX2_LOADER) //启用对 KTX2 压缩纹理的支持
      .setMeshoptDecoder(MeshoptDecoder); //启用对 MeshOpt 压缩模型的支持
  }

  /**
   * 加载渲染模型
   * @author LL
   * @since 2021/07/26
   * @update gj 25/6/10
   * @private
   */
  public async loadModel(modelInfo: modelInfoParams): Promise<Object3D> {
    let model;
    switch (modelInfo.modelType) {
      case "sphere":
        let sphere = this.initSphere(modelInfo);
        model = setModelConfig(sphere, modelInfo);
        break;
      case "cube":
        let cube = this.initCube(modelInfo);
        model = setModelConfig(cube, modelInfo);
        break;
      case "cylinder":
        let cylinder = this.initCylinder(modelInfo);
        model = setModelConfig(cylinder, modelInfo);
        break;
      case "cone":
        let cone = this.initCone(modelInfo);
        model = setModelConfig(cone, modelInfo);
        break;
      case "circle":
        let circle = this.initCircle(modelInfo);
        model = setModelConfig(circle, modelInfo);
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
            resolve(setModelConfig(model, idbInfo));
          });
        });
        break;
      case "zip":
        let zipGltfModel = await this.initZip(modelInfo);
        return new Promise((resolve, reject) => {
          resolve(setModelConfig(zipGltfModel.scene, modelInfo));
        });
        break;
      case "text":
        let textInfo = cloneDeep(modelInfo);

        switch (modelInfo.base.textType) {
          case "text":
            let textModel = await this.font.initText(textInfo);
            model = setModelConfig(textModel, modelInfo);
            break;
          case "traceText":
            let textLineModel = await this.font.initTextLine(textInfo);
            model = setModelConfig(textLineModel, modelInfo);
            break;
          case "shapeText":
            let textShapeModel = await this.font.initTextShape(textInfo);
            model = setModelConfig(textShapeModel, modelInfo);
            break;
        }
        break;
      case "assemble":
        let assemble = await this.initAssemble(modelInfo);
        model = setModelConfig(assemble, modelInfo);
        break;
    }
    return model;
  }

  /**
   * 创建仿真文字
   * @author MY
   * @param info
   * @param model
   */
  public async initSimTexts(info: any, model: any) {
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
        fontUrl: ThingOrigin.sceneData.params.resource.font_Microsoft,
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
   * 导入模型文件
   * @author LL
   * @since 2021/07/26
   * @param {modelInfoParams} modelInfo 模型参数
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

    return new Promise(async (resolve) => {
      switch (param.modelType) {
        case "fbx":
          console.log(this.FBXLoader);
          this.FBXLoader.load(modelInfo.base.modelUrl, (fbx: Group) => {
            let model = setModelConfig(fbx, param);
            resolve(model);
          });
          break;
        case "obj":
          this.OBJLoader.load(modelInfo.base.modelUrl, (obj: Object3D) => {
            let model = setModelConfig(obj, param);
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
              let model = setModelConfig(mesh, param);
              resolve(model);
            }
          );
          break;
        case "gltf":
        case "glb":
          this.GLTFLoader.load(modelInfo.base.modelUrl, (gltf) => {
            let model = setModelConfig(gltf.scene, param);
            //@ts-ignore
            gltf.scene = model;
            resolve(gltf as unknown as Object3D);
          });
          break;
        case "json":
          this.ObjectLoader.load(
            modelInfo.base.modelUrl,
            (object: Object3D) => {
              let model = setModelConfig(object, param);
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
   * 创建压缩包导入模型（gltf/bin/纹理图片）
   * @author gj
   * @since 2025/06/13
   * @param {modelInfoParams} modelInfo 模型参数
   */
  public async initZip(modelInfo?: modelInfoParams): Promise<any> {
    const response = await fetch(modelInfo.base.modelUrl);
    const zipData = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(zipData);
    const fileMap = new Map(); //包含模型所需所有文件的Map对象，键为文件路径，值为文件blob
    // 遍历zip内所有文件
    await Promise.all(
      Object.values(zip.files).map(async (zipEntry: any) => {
        if (zipEntry.dir) return; // 跳过文件夹
        // 读取文件内容为 Blob
        const blob = await zipEntry.async("blob");
        // 给 Blob 添加自定义属性 type, size, name
        Object.defineProperty(blob, "name", {
          value: zipEntry.name,
          writable: false,
          enumerable: true,
          configurable: true,
        });
        fileMap.set(zipEntry.name, blob);
      })
    );
    let rootFile, rootPath;
    Array.from(fileMap).forEach(([path, file]) => {
      if (file.name.match(/\.(gltf|glb)$/)) {
        rootFile = file;
        rootPath = path.replace(file.name, "");
      }
    });

    if (!rootFile) {
      console.error(".gltf 或者 .glb文件没找到");
    }
    // 根据rootFile类型创建文件URL
    const fileURL =
      typeof rootFile === "string" ? rootFile : URL.createObjectURL(rootFile);
    const baseURL = LoaderUtils.extractUrlBase(fileURL);

    return new Promise((resolve, reject) => {
      this.MANAGER.setURLModifier((url) => {
        const normalizedURL =
          rootPath +
          decodeURI(url)
            .replace(baseURL, "")
            .replace(/^(\.?\/)/, "");
        // 如果assetMap中包含当前URL对应的文件，则创建blobURL并返回
        if (fileMap.has(normalizedURL)) {
          const blob = fileMap.get(normalizedURL);
          const blobURL = URL.createObjectURL(blob);
          blobURLs.push(blobURL);
          return blobURL;
        }
        return url;
      });

      const blobURLs = [];
      this.GLTFLoader.load(
        fileURL,
        (gltf) => {
          const scene = gltf.scene || gltf.scenes[0];
          // const clips = gltf.animations || [];//动画
          if (!scene) {
            throw new Error("此模型不包含场景");
          }
          blobURLs.forEach(URL.revokeObjectURL);
          resolve(gltf);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * 创建组合模型
   * @author LL
   * @since 2021/07/26
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

    return setModelConfig(assemble, param);
  }

  /**
   * 创建Group
   * @author LL
   * @since 2021/10/26
   * @param modelInfo [modelInfo] 模型参数
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
    return setModelConfig(group, param);
  }

  /**
   * 创建立方体
   * @author LL
   * @since 2021/08/19
   * @param {modelInfoParams} [modelInfo] 模型参数
   * @param {*} [material] 材质
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
    return setModelConfig(geometryObject, param);
  }

  /**
   * 创建平面
   * @author LL
   * @since 2025/07/16
   * @param {modelInfoParams} [modelInfo]
   */
  public async initPlane(modelInfo?: modelInfoParams): Promise<Object3D> {
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
      rotation: {
        x: -Math.PI / 2,
        y: 0,
        z: 0,
      },
      base: {
        width: 10, //平面在 X 轴方向的宽度
        height: 10, //平面在 Y 轴方向的高度
        widthSegments: 32, //平面在宽度方向上的分段数（细分程度）
        heightSegments: 32, //平面在高度方向上的分段数（细分程度）
        doubleSide: false,
      },
      material: {
        type: "color",
        color: {
          color: "#eee",
          opacity: 1,
        },
        image: {
          url: "/public/image/ground.jpg",
          repeat: {
            width: 1000,
            height: 1000,
          },
        },
      },
    };
    let param = merge(defaultParams, modelInfo);

    let geometry: PlaneGeometry = this.initPlaneGeometry(
      param.base.width,
      param.base.height
    );

    let material;
    switch (param.material.type) {
      case "color":
        material = new MeshBasicMaterial({
          color: param.material.color.color,
          transparent: true,
          opacity: param.material.color.opacity,
        });
        break;
      case "image":
        material = await this.material.initImageMaterial(param.material.image);
        console.log(material);
        break;
    }

    if (param.base.doubleSide) material.side = DoubleSide;

    const plane = new Mesh(geometry, material);

    return setModelConfig(plane, param);
  }

  /**
   * 创建货架
   * 自定义尺寸
   * @author LL
   * @since 2024/09/02
   * @param {modelInfoParams} modelInfo
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
                ThingOrigin.sceneData.params.resource.model +
                "/shelf-Footer.gltf",
            },
          },
          {
            name: "shelf-OneSide",
            id: 301,
            modelType: "gltf",
            base: {
              modelUrl:
                ThingOrigin.sceneData.params.resource.model +
                "/shelf-OneSide.gltf",
            },
          },
          {
            name: "shelf-ThreeSide",
            id: 302,
            modelType: "gltf",
            base: {
              modelUrl:
                ThingOrigin.sceneData.params.resource.model +
                "/shelf-ThreeSide.gltf",
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

    return setModelConfig(shelf, param);
  }

  /**
   * 创建球体
   * @author LL
   * @since 2021/07/23
   * @param {modelInfoParams} modelInfo 模型参数
   * @param {*} [material] 材质（不传使用默认）
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
    return setModelConfig(geometryObject, param);
  }

  /**
   * 创建圆锥
   * @author LL
   * @since 2021/08/19
   * @param {modelInfoParams} modelInfo 模型参数
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
    return setModelConfig(geometryObject, param);
  }

  /**
   * 创建圆柱体
   * @author LL
   * @since 2021/08/19
   * @param {modelInfoParams} modelInfo 模型参数
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
    return setModelConfig(geometryObject, param);
  }

  /**
   * 创建圆形（平面）
   * @author LL
   * @since 2024/10/18
   * @param {modelInfoParams} [modelInfo] 模型参数
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
        radius: 5, //半径
        segments: 32, //圆形的分段数
        thetaStart: 0, //圆弧的起始角度（以弧度为单位）
        thetaLength: Math.PI * 2, //圆弧的角度范围（以弧度为单位）
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
    return setModelConfig(circle, param);
  }

  /**
   * 创建地图
   * @author LL
   * @since 2021/09/16
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

        resolve(setModelConfig(map, param));
      });
    });
  }

  /**
   * 创建视频面板
   * @author LL
   * @since 2021/09/03
   * @param {HTMLVideoElement} dom video标签
   * @param {modelInfoParams} [modelInfo] 模型参数
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

    let planeGeometry: PlaneGeometry = this.initPlaneGeometry(
      param.base.width,
      param.base.height
    );
    var material = new MeshPhongMaterial();
    material.side = DoubleSide;

    material.map = this.material.initVideoTexture({ videoDom: dom });
    var mesh = new Mesh(planeGeometry, material);

    return setModelConfig(mesh, param);
  }

  /**
   * 创建点云
   * @author LL
   * @since 2021/08/25
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

    var pointMaterial = this.material.initPointsMaterial({
      color: param.base.pointConfigs.color,
      size: param.base.pointConfigs.size,
    });

    //生成点模型
    var points = new Points(geometry, pointMaterial);

    return setModelConfig(points, param);
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

    return setModelConfig(points, param);
  }

  /**
   * 创建精灵图形
   * @author LL
   * @since 2021/08/25
   * @param {modelInfoParams} [modelInfo] 模型参数
   */
  public initSpriteShape(modelInfo?: modelInfoParams): Object3D {
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

    return setModelConfig(spriteGroup, param);

    // sprite.position.normalize();
    // sprite.position.multiplyScalar(700);
  }

  /**
   * 创建图片精灵
   * @author LL
   * @since 2021/08/25
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

    return setModelConfig(spriteGroup, param);
  }

  /**
   * 创建平面缓冲几何体
   * @author LL
   * @since 2023/11/13
   * @param {number} width
   * @param {number} height
   */
  public initPlaneGeometry(width?: number, height?: number): PlaneGeometry {
    return new PlaneGeometry(width, height);
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
