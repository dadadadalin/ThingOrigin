import * as d3geo from "d3-geo";
import {
  ArrowHelper,
  BoxBufferGeometry,
  BufferGeometry,
  Color,
  ConeBufferGeometry,
  CylinderBufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  FileLoader,
  FontLoader,
  Geometry,
  Group,
  Line,
  LineBasicMaterial,
  MathUtils,
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
  ShapeBufferGeometry,
  SphereBufferGeometry,
  Sprite,
  SpriteMaterial,
  TextGeometry,
  Texture,
  TextureLoader,
  Vector3,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import { ThingOrigin } from "../ThingOrigin";

export class TModel {
  FBXLoader: FBXLoader = new FBXLoader();
  STLLoader: STLLoader = new STLLoader();
  OBJLoader: OBJLoader = new OBJLoader();
  SVGLoader: SVGLoader = new SVGLoader();
  // DRACOLoader: DRACOLoader = new DRACOLoader().setDecoderPath("/static/draco/").preload();
  DRACOLoader: DRACOLoader = new DRACOLoader()
    .setDecoderPath("https://www.gstatic.com/draco/v1/decoders/")
    .preload();
  GLTFLoader: GLTFLoader = new GLTFLoader().setDRACOLoader(this.DRACOLoader);
  ObjectLoader: ObjectLoader = new ObjectLoader();

  constructor() {}

  /**
   * @description 导入模型文件
   * @author LL
   * @date 2021/07/26
   * @param {modelInfo} modelInfo 模型配置参数，位置和放大倍数  例：{position: [0, 0, 0], scale: [1, 1, 1] }
   * @param {string} url  文件读取地址
   * @returns {*}  {Promise<Object3D>}
   */
  public initFileModel(modelInfo: any, url: string): Promise<Object3D> {
    return new Promise((resolve) => {
      switch (modelInfo.type) {
        case "fbx":
          this.FBXLoader.load(url, (fbx: Group) => {
            let model = this.setModelConfig(fbx, modelInfo);
            resolve(model);
          });
          break;
        case "obj":
          this.OBJLoader.load(url, (obj: Object3D) => {
            let model = this.setModelConfig(obj, modelInfo);
            resolve(model);
          });
          break;
        case "stl":
          this.STLLoader.load(url, (geometry: BufferGeometry) => {
            var material = new MeshLambertMaterial(); //材质对象Material
            material.side = DoubleSide;
            var mesh = new Mesh(geometry, material); //网格模型对象Mesh

            let model = this.setModelConfig(mesh, modelInfo);
            resolve(model);
          });
          break;
        case "gltf":
          this.GLTFLoader.load(url, (gltf) => {
            let model = this.setModelConfig(gltf.scene, modelInfo);
            //@ts-ignore
            // gltf.scene = model;
            resolve(gltf as unknown as Object3D);
          });
          break;
        case "json":
          this.ObjectLoader.load(url, (object: Object3D) => {
            let model = this.setModelConfig(object, modelInfo);
            resolve(model);
          });
          break;
      }
    });
  }

  private setModelConfig(model: Object3D, modelInfo: any): Object3D {
    console.log(modelInfo);
    if (modelInfo.scale)
      model.scale.set(modelInfo.scale.x, modelInfo.scale.y, modelInfo.scale.z);
    if (modelInfo.rotation)
      model.rotation.set(
        MathUtils.degToRad(modelInfo.rotation.x),
        MathUtils.degToRad(modelInfo.rotation.y),
        MathUtils.degToRad(modelInfo.rotation.z)
      );
    if (modelInfo.position)
      model.position.set(
        modelInfo.position.x,
        modelInfo.position.y,
        modelInfo.position.z
      );

    model.name = modelInfo.modelName;
    model.userData = Object.assign(modelInfo.userData, { by: "ThingOrigin3D" });

    model.updateMatrixWorld(true);
    return model;
  }

  /**
   * @description 创建平面
   * @author gj
   * @date 2023/11/20
   * @param {string} name 平面几何体名称
   * @param {any} modelInfo 几何通用参数 例：{ base:{width: 10, height: 10, widthSegments: 32,  heightSegments: 32},config：{color: "#f00", position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0]} }
   * @returns {*}  {Object3D}
   */
  public initPlane(name: string, modelInfo: any): Object3D {
    let defaultParams = {
      base: {
        width: 10,
        height: 10,
        widthSegments: 32,
        heightSegments: 32,
      },
      config: {
        color: "#f00",
      },
    };
    let param = Object.assign(defaultParams, modelInfo);
    let plane: PlaneGeometry;
    plane = this.initPlaneGeometry(param.base.width, param.base.height);

    let material: MeshBasicMaterial = new MeshBasicMaterial({
      color: param.config.color,
    });
    const geometryObject = new Mesh(plane, material);
    geometryObject.name = name;
    return this.setModelConfig(geometryObject, param);
  }

  /**
   * @description 创建面板
   * @author LL
   * @date 24/12/2021
   * @param {string} name
   * @param {number[]} face
   * @param {number} distance
   * @param {number} [size]
   * @param {string} [color]
   * @returns {*}  {PlaneHelper}
   */
  public initPlaneHelper(
    name: string,
    face: number[],
    distance: number,
    size?: number,
    color?: string
  ): PlaneHelper {
    const plane = new Plane(new Vector3(face[0], face[1], face[2]), distance);
    const helper = new PlaneHelper(plane, size, new Color(color).getHex());
    helper.name = name;
    return helper;
  }

  /**
   * @description 新建group
   * @author LL
   * @date 2021/10/26
   * @param {string} name
   * @param {any} modelInfo modelInfo={ base:{},config:{position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }]
   * @returns {*}  {Object3D}
   */
  public initGroup(name: string, modelInfo: any): Object3D {
    let defaultParams = {
      base: {},
      config: {
        position: [0, 0, 0],
        scale: [1, 1, 1],
        rotation: [0, 0, 0],
      },
    };
    let param = Object.assign(defaultParams, modelInfo);
    let group = new Group();
    group.name = name;
    return this.setModelConfig(group, param);
  }

  /**
   * @description 添加球体
   * @author LL
   * @date 2021/07/23
   * @param {string} name 新增球体名称
   * @param {any} modelInfo 几何通用参数 modelInfo = { base:{radius: 10, widthSegments: 10, heightSegments: 10},config:{color: "#f00",position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0]}  }   * @param {object} [userData] 填入模型的userData   * @param {object} [userData] 填入模型的userData   * @param {object} [userData] 填入模型的userData
   * @returns {*}  {Object3D}
   */
  public initSphere(modelInfo: any): Object3D {
    let defaultParams = {
      base: {
        radius: 10,
        widthSegments: 15,
        heightSegments: 15,
      },
      config: {
        color: "#f00",
      },
    };
    let param = Object.assign(defaultParams, modelInfo);
    let sphere: SphereBufferGeometry;
    sphere = new SphereBufferGeometry(
      param.base.radius,
      param.base.widthSegments,
      param.base.heightSegments,
      param.base?.phiStart,
      param.base?.phiLength,
      param.base?.thetaStart,
      param.base?.thetaLength
    );

    let material: MeshLambertMaterial = new MeshLambertMaterial({
      color: param.config.color,
    });
    const geometryObject = new Mesh(sphere, material);
    geometryObject.name = param.name;
    return this.setModelConfig(geometryObject, param);
  }

  /**
   * @description 添加几何体
   * @author LL
   * @date 2021/08/19
   * @param {string} name 几何体名称
   * @param {any} modelInfo 几何通用参数 modelInfo = { base:{width: 10, height: 10, depth: 10},config:{color: "#f00",position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0]}  }   * @param {object} [userData] 填入模型的userData   * @param {object} [userData] 填入模型的userData
   * @returns {*}  {Object3D}
   */
  public initCube(modelInfo?: any): Object3D {
    let defaultParams = {
      base: {
        width: 10,
        height: 10,
        depth: 10,
        widthSegments: 1,
        heightSegments: 1,
        depthSegments: 1,
      },
      config: {
        color: "#f00",
      },
    };
    let param = Object.assign(defaultParams, modelInfo);
    let cube: BoxBufferGeometry = new BoxBufferGeometry(
      param.base.width,
      param.base.height,
      param.base.depth,
      param.base.widthSegments,
      param.base.heightSegments,
      param.base.depthSegments
    );

    let material: MeshLambertMaterial = new MeshLambertMaterial({
      color: param.config.color,
    });
    const geometryObject = new Mesh(cube, material);
    geometryObject.name = modelInfo.name;
    return this.setModelConfig(geometryObject, param);
  }
  // public initBox1(
  //   name: string,
  //   cubeParams: cubeParams = { width: 10, height: 10, depth: 10 },
  //   geometryConfigs: geometryConfigs = {
  //     color: "#f00",
  //     position: [0, 0, 0],
  //     scale: [1, 1, 1],
  //     rotation: [0, 0, 0],
  //   },
  //   userData?: object
  // ): Object3D {
  //   let cube: BoxBufferGeometry;
  //   if (cubeParams) {
  //     cube = new BoxBufferGeometry(
  //       cubeParams.width,
  //       cubeParams.height,
  //       cubeParams.depth,
  //       cubeParams.widthSegments,
  //       cubeParams.heightSegments,
  //       cubeParams.depthSegments
  //     );
  //   } else {
  //     cube = new BoxBufferGeometry();
  //   }
  //   let material: MeshLambertMaterial = new MeshLambertMaterial({
  //     color: geometryConfigs.color,
  //   });
  //   const geometryObject = new Mesh(cube, material);
  //   geometryObject.name = name;
  //   return this.setModelConfig(geometryObject, geometryConfigs, userData);
  // }

  /**
   * @description 添加圆锥
   * @author LL
   * @date 2021/08/19
   * @param {string} name 圆锥名称
   * @param {any} modelInfo 几何通用参数 modelInfo = { base:{radius: 10,height: 20,},config:{color: "#f00",position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0]}  }   * @param {object} [userData] 填入模型的userData
   * @returns {*}  {Object3D}
   */
  public initCone(modelInfo: any): Object3D {
    let defaultParams = {
      base: {
        radius: 10,
        height: 20,
      },
      config: {
        color: "#f00",
      },
    };
    let param = Object.assign(defaultParams, modelInfo);

    let cone: ConeBufferGeometry;
    cone = new ConeBufferGeometry(
      param.base?.radius,
      param.base?.height,
      param.base?.radialSegments,
      param.base?.heightSegments,
      param.base?.openEnded,
      param.base?.thetaStart,
      param.base?.thetaLength
    );
    let material: MeshLambertMaterial = new MeshLambertMaterial({
      color: param.config.color,
    });
    const geometryObject = new Mesh(cone, material);
    geometryObject.name = param.name;
    return this.setModelConfig(geometryObject, param);
  }

  /**
   * @description 添加圆柱体
   * @author LL
   * @date 2021/08/19
   * @param {string} name 圆柱体名称
   * @param {any} modelInfo 几何通用参数 modelInfo = { base:{radiusTop: 10,radiusBottom: 10,},config:{color: "#f00",position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0]}  }
   * @returns {*}  {Object3D}
   */
  public initCylinder(modelInfo: any): Object3D {
    let defaultParams = {
      base: {
        radiusTop: 10,
        radiusBottom: 10,
        height: 20,
        radialSegments: 32,
      },
      config: {
        color: "#f00",
      },
    };
    let param = Object.assign(defaultParams, modelInfo);

    let cylinder: CylinderBufferGeometry;
    cylinder = new CylinderBufferGeometry(
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
      color: param.config.color,
    });
    const geometryObject = new Mesh(cylinder, material);
    geometryObject.name = param.name;
    return this.setModelConfig(geometryObject, param);
  }

  /**
   * @description
   * @author LL
   * @date 2022-04-28
   * @param {number[]} p1
   * @param {number[]} p2
   * @param {LineParams} [params={ color: "#f00" }]
   * @returns {*}
   */
  public initLine(
    p1: number[],
    p2: number[],
    params: LineParams = { color: "#f00" }
  ) {
    let lineGeometry = new Geometry();
    let lineMaterial = new LineBasicMaterial({ color: params.color });
    lineGeometry.vertices.push(
      new Vector3(p1[0], p1[1], p1[2]),
      new Vector3(p2[0], p2[1], p2[2])
    );

    return new Line(lineGeometry, lineMaterial);
  }

  /**
   * @description 生成箭头
   * @author LL
   * @date 24/12/2021
   * @param {string} name 箭头名称
   * @param {number[]} dir 指向方向
   * @param {number[]} origin 源头位置
   * @param {number} length 长度
   * @param {number} hex 颜色
   * @param {number} [headLength] 箭头长度
   * @param {number} [headWidth] 箭头宽度
   * @returns {*}  {ArrowHelper}
   */
  public initArrow(
    name: string,
    dir: number[],
    origin: number[],
    length: number,
    hex: string,
    headLength?: number,
    headWidth?: number
  ): ArrowHelper {
    const dirVector3 = new Vector3(dir[0], dir[1], dir[2]);
    dirVector3.normalize();
    const originVector3 = new Vector3(origin[0], origin[1], origin[2]);
    const arrowHelper = new ArrowHelper(
      dirVector3,
      originVector3,
      length,
      new Color(hex).getHex(),
      headLength,
      headWidth
    );
    arrowHelper.name = name;
    return arrowHelper;
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
   * @description 生成点云
   * @author LL
   * @date 2021/08/25
   * @param {string} GroupName 点云组名称
   * @param {pointsData[]} positions 点云位置数组
   * @param {pointConfigsParams} pointConfigs 点云参数
   * @param {object} [userData] 自定义数据
   */
  public initPoints(
    GroupName: string,
    positions: pointsData[],
    pointConfigs: pointConfigsParams,
    userData?: object
  ): Points {
    var geometry = new Geometry(); //声明一个几何体对象Geometry
    for (var i = 0; i < positions.length; i++) {
      //绑定顶点到几何体
      geometry.vertices.push(
        new Vector3(positions[i]["X"], positions[i]["Y"], positions[i]["Z"])
      );
      //如果需要每个点展示不同颜色，需要给每个顶点添加颜色，也可以通过材质设置统一颜色
      // geometry.colors.push(new Color(pointConfigs.color));
    }

    var pointMaterial = ThingOrigin.material.initPointsMaterial(
      pointConfigs.color,
      false,
      pointConfigs.size
    );

    //生成点模型
    var points = new Points(geometry, pointMaterial);
    points.name = GroupName;
    if (userData) points.userData = userData;

    return points;
  }

  /**
   * @description 添加3d文字
   * @author gj LL
   * @date 2021/09/16
   * @param {string} text 文字
   * @param {string} fontUrl 字体json文件地址
   * @param {any} modelInfo 描线文字样式+通用参数 modelInfo={ base:{color: "#f00", size: 100,height: 50 },config:{position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0]}}   * @param {geometryConfigs} geometryConfigs 几何通用参数 [geometryConfigs={ color: "#f00", position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }]
   * @returns {*}  {Promise<Object3D>}
   */
  public initText(
    text: string,
    fontUrl: string,
    modelInfo: any
  ): Promise<Object3D> {
    console.log(fontUrl);
    let defaultParams = {
      base: {
        color: "#f00",
        size: 100,
        height: 50,
        curveSegments: 12,
        bevelEnabled: false,
        bevelThickness: 20,
        bevelSize: 8,
        bevelSegments: 3,
        sideColor: "#fff",
      },
      config: {
        position: [0, 0, 0],
        scale: [1, 1, 1],
        rotation: [0, 0, 0],
      },
    };
    let param = Object.assign(defaultParams, modelInfo);
    const loader = new FontLoader();
    return new Promise((resolve) =>
      loader.load(fontUrl, (font) => {
        const geometry = new TextGeometry(text, {
          font: font,
          size: param.base.size,
          height: param.base.height,
          curveSegments: param.base.curveSegments,
          bevelEnabled: param.base.bevelEnabled,
          bevelThickness: param.base.bevelThickness,
          bevelSize: param.base.bevelSize,
          bevelSegments: param.base.bevelSegments,
        });

        var meshMaterial = [
          new MeshPhongMaterial({ color: param.base.color, flatShading: true }), // front
          new MeshPhongMaterial({ color: param.base.sideColor }), // side
        ];

        const geometryObject = new Mesh(geometry, meshMaterial);
        geometryObject.name = text;

        console.log(fontUrl);
        resolve(this.setModelConfig(geometryObject, param));
      })
    );
  }

  /**
   * @description 字体描线文字
   * @author LL
   * @date 2021/09/17
   * @param {string} text 文字内容
   * @param {string} fontUrl 字体文件
   * @param {any} modelInfo 描线文字样式+通用参数 modelInfo={ base:{color: "#f00", transparent: true, opacity: 0.4, size: 100, },config:{position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0]}}
   * @returns {*}  {Promise<Object3D>}
   */
  public initTextShape(
    text: string,
    fontUrl: string,
    modelInfo: any
  ): Promise<Object3D> {
    let defaultParams = {
      base: {
        color: "#f00",
        transparent: true,
        opacity: 0.4,
        size: 100,
      },
      config: {
        position: [0, 0, 0],
        scale: [1, 1, 1],
        rotation: [0, 0, 0],
      },
    };
    let param = Object.assign(defaultParams, modelInfo);
    const loader = new FontLoader();
    return new Promise((resolve) =>
      loader.load(fontUrl, (font) => {
        var matLite = new MeshBasicMaterial({
          color: param.base.color,
          transparent: param.base.transparent,
          opacity: param.base.opacity,
        });

        var shapes = font.generateShapes(text, param.base.size);
        var geometry = new ShapeBufferGeometry(shapes);
        geometry.computeBoundingBox();

        const geometryObject = new Mesh(geometry, matLite);
        geometryObject.name = text;

        resolve(this.setModelConfig(geometryObject, param));
      })
    );
  }

  /**
   * @description 字体描线文字
   * @author LL
   * @date 2021/09/17
   * @param {string} text 文字内容
   * @param {string} fontUrl 字体文件
   * @param {any} modelInfo 描线文字样式+通用参数 modelInfo={ base:{color: "#f00", size: 100, lineWidth: 2, opacity: 1 },config:{position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0]}}
   * @returns {*}  {Promise<Object3D>}
   */
  public initTextLine(
    text: string,
    fontUrl: string,
    modelInfo: any
  ): Promise<Object3D> {
    let defaultParams = {
      base: {
        color: "#f00",
        size: 100,
        lineWidth: 2,
        opacity: 1,
      },
      config: {
        position: [0, 0, 0],
        scale: [1, 1, 1],
        rotation: [0, 0, 0],
      },
    };
    let param = Object.assign(defaultParams, modelInfo);
    const loader = new FontLoader();
    return new Promise((resolve) =>
      loader.load(fontUrl, (font) => {
        var matDark = new LineBasicMaterial({
          color: param.base.color,
          transparent: true,
          opacity: param.base.opacity,
          linewidth: param.base.lineWidth,
        });

        var shapes = font.generateShapes(text, param.base.size);
        var geometry = new ShapeBufferGeometry(shapes);
        geometry.computeBoundingBox();

        var holeShapes = [];
        for (var i = 0; i < shapes.length; i++) {
          var shape = shapes[i];
          if (shape.holes && shape.holes.length > 0) {
            for (var j = 0; j < shape.holes.length; j++) {
              var hole = shape.holes[j];
              holeShapes.push(hole);
            }
          }
        }
        shapes.push.apply(shapes, holeShapes);

        var lineText = new Object3D();
        lineText.name = text;
        for (var i = 0; i < shapes.length; i++) {
          var shape = shapes[i];

          var points = shape.getPoints();
          var geometry = new BufferGeometry().setFromPoints(points);

          var lineMesh = new Line(geometry, matDark);
          lineText.add(lineMesh);
        }

        resolve(this.setModelConfig(lineText, param));
      })
    );
  }

  /**
   * @description
   * @author LL
   * @date 2021/09/16
   * @param {string} url 地图数据文件地址
   */
  public initMap(url: string): Promise<Object3D> {
    // 加载json文件
    let loader = new FileLoader();

    return new Promise((resolve) => {
      loader.load(url, (data) => {
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
              const lineGeometry = new Geometry();

              for (let i = 0; i < polygon.length; i++) {
                const [x, y] = projection(polygon[i]);
                if (i === 0) {
                  shape.moveTo(x, -y);
                }
                shape.lineTo(x, -y);
                lineGeometry.vertices.push(new Vector3(x, -y, 4.01));
              }

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

        resolve(map);
      });
    });
  }

  /**
   * @description 添加视频面板
   * @author LL
   * @date 2021/09/03
   * @param {number} width 面板宽度
   * @param {number} height 面板高度
   * @param {HTMLVideoElement} dom 视频所在的dom
   */
  public initVideoPlane(
    width: number,
    height: number,
    dom: HTMLVideoElement
  ): Mesh {
    var planeGeometry = new PlaneGeometry(width, height);
    var material = new MeshPhongMaterial();
    material.side = DoubleSide;

    material.map = ThingOrigin.material.initVideoMaterial(dom);
    var mesh = new Mesh(planeGeometry, material);

    return mesh;
  }

  /**
   * @description 精灵图形
   * @author LL
   * @date 2021/08/25
   * @param {string} groupName 精灵组名称
   * @param {object[]} positions 精灵组数据
   * @param {spriteShape} spriteShape 精灵图形参数
   * @param {object} [userData] 用户自定义数据
   */
  public initSpriteShape(
    groupName: string,
    positions: spriteData[],
    spriteShape: spriteShapeParams,
    userData?: object
  ): Group {
    let canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 20;

    let ctx = canvas.getContext("2d");
    if (spriteShape.shape == "sphere") {
      ctx.arc(10, 10, 10, 0, 2 * Math.PI);
    } else if (spriteShape.shape == "triangle") {
      ctx.beginPath();
      ctx.moveTo(10, 15);
      ctx.lineTo(20, 0);
      ctx.lineTo(0, 0);
      ctx.closePath(); //闭合路径
      ctx.lineWidth = 10; //线的边框为10像素
    }
    ctx.fillStyle = spriteShape.color;
    ctx.fill();

    let texture = new Texture(canvas);
    texture.needsUpdate = true; //注意这句不能少
    let material1 = new SpriteMaterial({ map: texture });

    let spriteGroup = new Group();
    spriteGroup.name = groupName;

    for (var i = 0; i < positions.length; i++) {
      var sprite = new Sprite(material1.clone());
      if (positions[i].name) sprite.name = positions[i].name;
      sprite.position.set(positions[i].x, positions[i].y, positions[i].z);
      sprite.scale.set(spriteShape.radius, spriteShape.radius, 1);
      if (userData) sprite.userData = userData;
      spriteGroup.add(sprite);
    }

    return spriteGroup;

    // sprite.position.normalize();
    // sprite.position.multiplyScalar(700);
  }

  /**
   * @description 精灵图片材质
   * @author LL
   * @date 2021/08/25
   * @param {string} groupName 精灵组名称
   * @param {object[]} positions 精灵组位置数据
   * @param {spritePic} spritePic 精灵图片参数
   * @param {object} userData 用户自定义数据
   */
  public initSpritePic(
    groupName: string,
    positions: spriteData[],
    spritePic: spritePicParams,
    userData: object
  ): Group {
    const map = new TextureLoader().load(spritePic.url);
    const material = new SpriteMaterial({ map: map });

    let spriteGroup = new Group();
    spriteGroup.name = groupName;
    for (var i = 0; i < positions.length; i++) {
      var sprite = new Sprite(material.clone());
      if (positions[i].name) sprite.name = positions[i].name;
      sprite.position.set(positions[i].x, positions[i].y, positions[i].z);
      sprite.scale.set(spritePic.size, spritePic.size, 1);
      if (userData) sprite.userData = userData;
      spriteGroup.add(sprite);
    }
    return spriteGroup;
  }
}
