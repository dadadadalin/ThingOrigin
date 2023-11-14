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
  ObjectLoader,
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
  Plane,
  PlaneGeometry,
  PlaneHelper,
  Points,
  PointsMaterial,
  Shape,
  ShapeBufferGeometry,
  SphereBufferGeometry,
  Sprite,
  SpriteMaterial,
  TextGeometry,
  Texture,
  TextureLoader,
  Vector3,
  RepeatWrapping,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import { ThingOrigin } from "../ThingOrigin";
import { Water } from "three/examples/jsm/objects/Water";

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
   * @param {string} type 模型文件类型 例：'fbx'||'gltf'||'stl'
   * @param {string} url  文件读取地址
   * @param {modelConfigs} modelConfigs 模型配置参数，位置和放大倍数  例：{position: [0, 0, 0], scale: [1, 1, 1] }
   * @returns {*}  {Promise<Object3D>}
   */
  public initFileModel(
    type: string,
    url: string,
    modelConfigs: modelConfigs = {
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    }
  ): Promise<Object3D> {
    return new Promise((resolve) => {
      switch (type) {
        case "fbx":
          this.FBXLoader.load(url, (fbx: Group) => {
            if (modelConfigs) {
              if (modelConfigs.scale)
                fbx.scale.set(
                  modelConfigs.scale[0],
                  modelConfigs.scale[1],
                  modelConfigs.scale[2]
                );
              if (modelConfigs.rotation)
                fbx.rotation.set(
                  MathUtils.degToRad(modelConfigs.rotation[0]),
                  MathUtils.degToRad(modelConfigs.rotation[1]),
                  MathUtils.degToRad(modelConfigs.rotation[2])
                );
              if (modelConfigs.position)
                fbx.position.set(
                  modelConfigs.position[0],
                  modelConfigs.position[1],
                  modelConfigs.position[2]
                );
            }
            fbx.updateMatrixWorld(true);
            resolve(fbx);
          });
          break;
        case "obj":
          this.OBJLoader.load(url, (object: Object3D) => {
            if (modelConfigs) {
              if (modelConfigs.scale)
                object.scale.set(
                  modelConfigs.scale[0],
                  modelConfigs.scale[1],
                  modelConfigs.scale[2]
                );
              if (modelConfigs.rotation)
                object.rotation.set(
                  MathUtils.degToRad(modelConfigs.rotation[0]),
                  MathUtils.degToRad(modelConfigs.rotation[1]),
                  MathUtils.degToRad(modelConfigs.rotation[2])
                );
              if (modelConfigs.position)
                object.position.set(
                  modelConfigs.position[0],
                  modelConfigs.position[1],
                  modelConfigs.position[2]
                );
            }
            object.updateMatrixWorld(true);
            resolve(object);
          });
          break;
        case "stl":
          this.STLLoader.load(url, (geometry: BufferGeometry) => {
            var material = new MeshLambertMaterial(); //材质对象Material
            material.side = DoubleSide;
            var mesh = new Mesh(geometry, material); //网格模型对象Mesh
            if (modelConfigs) {
              if (modelConfigs.scale)
                mesh.scale.set(
                  modelConfigs.scale[0],
                  modelConfigs.scale[1],
                  modelConfigs.scale[2]
                );
              if (modelConfigs.rotation)
                mesh.rotation.set(
                  MathUtils.degToRad(modelConfigs.rotation[0]),
                  MathUtils.degToRad(modelConfigs.rotation[1]),
                  MathUtils.degToRad(modelConfigs.rotation[2])
                );
              if (modelConfigs.position)
                mesh.position.set(
                  modelConfigs.position[0],
                  modelConfigs.position[1],
                  modelConfigs.position[2]
                );
            }
            mesh.updateMatrixWorld(true);
            resolve(mesh);
          });
          break;
        case "gltf":
          // var manager = new LoadingManager();
          // console.log(url.model);

          // var blobs = { "fish.gltf": url.model };

          // const objectURLs = [];
          // manager.setURLModifier((url1) => {
          //     url1 = URL.createObjectURL(blobs);

          //     objectURLs.push(url1);

          //     return url1;
          // });

          // this.GLTFLoader = new GLTFLoader(manager);

          this.GLTFLoader.load(url, (gltf) => {
            if (modelConfigs) {
              if (modelConfigs.scale)
                gltf.scene.scale.set(
                  modelConfigs.scale[0],
                  modelConfigs.scale[1],
                  modelConfigs.scale[2]
                );
              if (modelConfigs.rotation)
                gltf.scene.rotation.set(
                  MathUtils.degToRad(modelConfigs.rotation[0]),
                  MathUtils.degToRad(modelConfigs.rotation[1]),
                  MathUtils.degToRad(modelConfigs.rotation[2])
                );
              if (modelConfigs.position)
                gltf.scene.position.set(
                  modelConfigs.position[0],
                  modelConfigs.position[1],
                  modelConfigs.position[2]
                );
            }
            gltf.scene.updateMatrixWorld(true);
            //@ts-ignore
            resolve(gltf);
          });
          break;
        case "json":
          this.ObjectLoader.load(url, (object: Object3D) => {
            if (modelConfigs) {
              if (modelConfigs.scale)
                object.scale.set(
                  modelConfigs.scale[0],
                  modelConfigs.scale[1],
                  modelConfigs.scale[2]
                );
              if (modelConfigs.rotation)
                object.rotation.set(
                  MathUtils.degToRad(modelConfigs.rotation[0]),
                  MathUtils.degToRad(modelConfigs.rotation[1]),
                  MathUtils.degToRad(modelConfigs.rotation[2])
                );
              if (modelConfigs.position)
                object.position.set(
                  modelConfigs.position[0],
                  modelConfigs.position[1],
                  modelConfigs.position[2]
                );
            }
            object.updateMatrixWorld(true);
            resolve(object);
          });
          break;
      }
    });
  }

  /**
   * @description 新建group
   * @author LL
   * @date 2021/10/26
   * @param {string} name
   * @param {geometryConfigs} [geometryConfigs={ position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }]
   * @param {object} [userData]
   * @returns {*}  {Object3D}
   */
  public initGroup(
    name: string,
    geometryConfigs: geometryConfigs = {
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    },
    userData?: object
  ): Object3D {
    let group = new Group();
    group.name = name;
    return this.setObjectConfigs(group, geometryConfigs, userData);
  }

  /**
   * @description 添加球体
   * @author LL
   * @date 2021/07/23
   * @param {string} name 新增球体名称
   * @param {sphereParams}  [sphereParams] 球体参数 [sphereParams={ radius: 10, widthSegments: 10, heightSegments: 10 }]
   * @param {geometryConfigs} [geometryConfigs] 几何通用参数 [geometryConfigs={ color: "#f00", position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }]
   * @param {object} [userData] 填入模型的userData
   * @returns {*}  {Object3D}
   */
  public initSphere(
    name: string,
    sphereParams: sphereParams = {
      radius: 10,
      widthSegments: 15,
      heightSegments: 15,
    },
    geometryConfigs: geometryConfigs = {
      color: "#f00",
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    },
    userData?: object
  ): Object3D {
    let sphere: SphereBufferGeometry;
    if (sphereParams) {
      sphere = new SphereBufferGeometry(
        sphereParams.radius,
        sphereParams.widthSegments,
        sphereParams.heightSegments,
        sphereParams.phiStart,
        sphereParams.phiLength,
        sphereParams.thetaStart,
        sphereParams.thetaLength
      );
    } else {
      sphere = new SphereBufferGeometry();
    }

    let material: MeshLambertMaterial = new MeshLambertMaterial({
      color: geometryConfigs.color,
    });
    const geometryObject = new Mesh(sphere, material);
    geometryObject.name = name;
    return this.setObjectConfigs(geometryObject, geometryConfigs, userData);
  }

  /**
   * @description 添加几何体
   * @author LL
   * @date 2021/08/19
   * @param {string} name 几何体名称
   * @param {cubeParams} [cubeParams] 几何体参数 [cubeParams={ width: 10, height: 10, depth: 10 }]
   * @param {geometryConfigs} [geometryConfigs] 几何通用参数 [geometryConfigs={ color: "#f00", position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }]
   * @param {object} [userData] 填入模型的userData
   * @returns {*}  {Object3D}
   */
  public initBox(
    name: string,
    cubeParams: cubeParams = { width: 10, height: 10, depth: 10 },
    geometryConfigs: geometryConfigs = {
      color: "#f00",
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    },
    userData?: object
  ): Object3D {
    let cube: BoxBufferGeometry;
    if (cubeParams) {
      cube = new BoxBufferGeometry(
        cubeParams.width,
        cubeParams.height,
        cubeParams.depth,
        cubeParams.widthSegments,
        cubeParams.heightSegments,
        cubeParams.depthSegments
      );
    } else {
      cube = new BoxBufferGeometry();
    }
    let material: MeshLambertMaterial = new MeshLambertMaterial({
      color: geometryConfigs.color,
    });
    const geometryObject = new Mesh(cube, material);
    geometryObject.name = name;
    return this.setObjectConfigs(geometryObject, geometryConfigs, userData);
  }

  /**
   * @description 添加圆锥
   * @author LL
   * @date 2021/08/19
   * @param {string} name 圆锥名称
   * @param {coneParams} [coneParams] 圆锥参数
   * @param {geometryConfigs} [geometryConfigs] 几何通用参数 例：{ color: "#f00", position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }
   * @param {object} [userData] 填入模型的userData
   * @returns {*}  {Object3D}
   */
  public initCone(
    name: string,
    coneParams: coneParams = { radius: 10, height: 20 },
    geometryConfigs: geometryConfigs = {
      color: "#f00",
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    },
    userData?: object
  ): Object3D {
    let cone: ConeBufferGeometry;
    if (coneParams) {
      cone = new ConeBufferGeometry(
        coneParams.radius,
        coneParams.height,
        coneParams.radialSegments,
        coneParams.heightSegments,
        coneParams.openEnded,
        coneParams.thetaStart,
        coneParams.thetaLength
      );
    } else {
      cone = new ConeBufferGeometry();
    }
    let material: MeshLambertMaterial = new MeshLambertMaterial({
      color: geometryConfigs.color,
    });
    const geometryObject = new Mesh(cone, material);
    geometryObject.name = name;
    return this.setObjectConfigs(geometryObject, geometryConfigs, userData);
  }

  /**
   * @description 添加圆柱体
   * @author LL
   * @date 2021/08/19
   * @param {string} name 圆柱体名称
   * @param {cubeParams} [cubeParams]
   * @param {geometryConfigs} [geometryConfigs] 几何通用参数 例：{ color: "#f00", position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }
   * @param {object} [userData] 填入模型的userData
   * @returns {*}  {Object3D}
   */
  public initCylinder(
    name: string,
    cylinderParams: cylinderParams = { radiusTop: 10, radiusBottom: 10 },
    geometryConfigs: geometryConfigs = {
      color: "#f00",
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    },
    userData?: object
  ): Object3D {
    let cylinder: CylinderBufferGeometry;
    if (cylinderParams) {
      cylinder = new CylinderBufferGeometry(
        cylinderParams.radiusTop,
        cylinderParams.radiusBottom,
        cylinderParams.height,
        cylinderParams.radialSegments,
        cylinderParams.heightSegments,
        cylinderParams.openEnded,
        cylinderParams.thetaStart,
        cylinderParams.thetaLength
      );
    } else {
      cylinder = new CylinderBufferGeometry();
    }

    let material: MeshLambertMaterial = new MeshLambertMaterial({
      color: geometryConfigs.color,
    });
    const geometryObject = new Mesh(cylinder, material);
    geometryObject.name = name;
    return this.setObjectConfigs(geometryObject, geometryConfigs, userData);
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

    let line = new Line(lineGeometry, lineMaterial);
    return line;
  }

  /**
   * @description 生成箭头
   * @author LL
   * @date 24/12/2021
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
  public initPlane(
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
   * @description 创建平面缓冲几何体
   * @author LL
   * @date 2023/11/13
   * @param {number} width
   * @param {number} height
   * @returns {*}  {PlaneGeometry}
   * @memberof TModel
   */
  public initPlaneGeometry(width: number, height: number): PlaneGeometry {
    const planeGeometry = new PlaneGeometry(width, height);
    return planeGeometry;
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

    var pointMaterial = new PointsMaterial({
      color: pointConfigs.color, //设置颜色，默认 0xFFFFFF
      vertexColors: false, //定义材料是否使用顶点颜色，默认false ---如果该选项设置为true，则color属性失效
      size: pointConfigs.size, //定义粒子的大小。默认为1.0
    });

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
   * @param {textParams} textStyle 字体样式 [textStyle={ size: 100, height: 50, curveSegments: 12, bevelEnabled: false, bevelThickness: 20, bevelSize: 8, bevelSegments: 3 }]
   * @param {geometryConfigs} geometryConfigs 几何通用参数 [geometryConfigs={ color: "#f00", position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }]
   * @returns {*}  {Promise<Object3D>}
   */
  public initText(
    text: string,
    fontUrl: string,
    textStyle: textParams = {
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
    geometryConfigs: geometryConfigs = {
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    }
  ): Promise<Object3D> {
    const loader = new FontLoader();
    return new Promise((resolve) =>
      loader.load(fontUrl, (font) => {
        const geometry = new TextGeometry(text, {
          font: font,
          size: textStyle.size,
          height: textStyle.height,
          curveSegments: textStyle.curveSegments,
          bevelEnabled: textStyle.bevelEnabled,
          bevelThickness: textStyle.bevelThickness,
          bevelSize: textStyle.bevelSize,
          bevelSegments: textStyle.bevelSegments,
        });

        var meshMaterial = [
          new MeshPhongMaterial({ color: textStyle.color, flatShading: true }), // front
          new MeshPhongMaterial({ color: textStyle.sideColor }), // side
        ];

        const geometryObject = new Mesh(geometry, meshMaterial);
        geometryObject.name = text;

        resolve(
          this.setObjectConfigs(geometryObject, geometryConfigs, {
            fontUrl: fontUrl,
          })
        );
      })
    );
  }

  /**
   * @description 3D形状文字
   * @author LL
   * @date 2021/09/17
   * @param {string} text 文字内容
   * @param {string} fontUrl 字体文件
   * @param {textShapeParams} textStyle 形状文字样式 [textStyle={ color: "#f00", transparent: true, opacity: 0.4, size: 100 }]
   * @param {geometryConfigs} geometryConfigs 几何通用参数 [geometryConfigs={ position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }]
   * @returns {*}  {Promise<Object3D>}
   */
  public initTextShape(
    text: string,
    fontUrl: string,
    textStyle: textShapeParams = {
      color: "#f00",
      transparent: true,
      opacity: 0.4,
      size: 100,
    },
    geometryConfigs: geometryConfigs = {
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    }
  ): Promise<Object3D> {
    const loader = new FontLoader();
    return new Promise((resolve) =>
      loader.load(fontUrl, (font) => {
        var matLite = new MeshBasicMaterial({
          color: textStyle.color,
          transparent: textStyle.transparent,
          opacity: textStyle.opacity,
        });

        var shapes = font.generateShapes(text, textStyle.size);
        var geometry = new ShapeBufferGeometry(shapes);
        geometry.computeBoundingBox();

        const geometryObject = new Mesh(geometry, matLite);
        geometryObject.name = text;

        resolve(
          this.setObjectConfigs(geometryObject, geometryConfigs, {
            fontUrl: fontUrl,
          })
        );
      })
    );
  }

  /**
   * @description 字体描线文字
   * @author LL
   * @date 2021/09/17
   * @param {string} text 文字内容
   * @param {string} fontUrl 字体文件
   * @param {textLineParams} textStyle 描线文字样式 [textStyle={ color: "#f00", size: 100, lineWidth: 2, opacity: 1 }]
   * @param {geometryConfigs} geometryConfigs 几何通用参数 [geometryConfigs={ position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }]
   * @returns {*}  {Promise<Object3D>}
   */
  public initTextLine(
    text: string,
    fontUrl: string,
    textStyle: textLineParams = {
      color: "#f00",
      size: 100,
      lineWidth: 2,
      opacity: 1,
    },
    geometryConfigs: geometryConfigs = {
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    }
  ): Promise<Object3D> {
    const loader = new FontLoader();
    return new Promise((resolve) =>
      loader.load(fontUrl, (font) => {
        var matDark = new LineBasicMaterial({
          color: textStyle.color,
          transparent: true,
          opacity: textStyle.opacity,
          linewidth: textStyle.lineWidth,
        });

        var shapes = font.generateShapes(text, textStyle.size);
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

        resolve(
          this.setObjectConfigs(lineText, geometryConfigs, { fontUrl: fontUrl })
        );
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

  /**
   * @description 处理模型的样式
   * @author LL
   * @date 2021/07/23
   * @private
   * @param {BufferGeometry} geometry
   * @param {geometryConfigs} [geometryConfigs] 几何通用参数 例：{ color: "#f00", position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }
   * @param {object} userData
   * @returns {*}  {Object3D}
   */
  private setObjectConfigs(
    object: Object3D,
    geometryConfigs: geometryConfigs,
    userData?: object
  ): Object3D {
    if (geometryConfigs && geometryConfigs.scale) {
      object.scale.set(
        geometryConfigs.scale[0],
        geometryConfigs.scale[1],
        geometryConfigs.scale[2]
      );
    } else {
      object.scale.set(1, 1, 1);
    }

    if (geometryConfigs && geometryConfigs.position) {
      object.position.set(
        geometryConfigs.position[0],
        geometryConfigs.position[1],
        geometryConfigs.position[2]
      );
    } else {
      object.position.set(0, 0, 0);
    }

    if (geometryConfigs && geometryConfigs.rotation) {
      object.rotation.set(
        geometryConfigs.rotation[0],
        geometryConfigs.rotation[1],
        geometryConfigs.rotation[2]
      );
    } else {
      object.rotation.set(0, 0, 0);
    }

    if (userData) {
      object.userData = userData;
    }

    return object;
  }
}
