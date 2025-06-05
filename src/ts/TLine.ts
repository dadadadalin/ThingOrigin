import {
  ArrowHelper,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  Object3D,
  RepeatWrapping,
  TextureLoader,
  TubeGeometry,
  Vector3,
} from "three";
import { merge, cloneDeep } from "lodash";
import { setModelConfig } from "../private/privateTool";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { Line2 } from "three/examples/jsm/lines/Line2";

export class TLine {
  constructor() {}

  /**
   * @description 创建线
   * @author LL
   * @date 2022-04-28
   * @param {modelInfoParams} modelInfo 模型参数
   * @returns {*}
   */
  public initLine(modelInfo?: modelInfoParams): Line {
    let defaultParams = {
      modelName: "line-" + new Date().getTime(),
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
        p1: {
          x: 0,
          y: 0,
          z: 0,
        },
        p2: {
          x: 10,
          y: 10,
          z: 10,
        },
      },
      material: {
        color: "#f00",
      },
    };
    let param = merge(defaultParams, modelInfo);
    let lineMaterial = new LineBasicMaterial({ color: param.material.color });

    let points = [];
    points.push(new Vector3(param.base.p1.x, param.base.p1.y, param.base.p1.z));
    points.push(new Vector3(param.base.p2.x, param.base.p2.y, param.base.p2.z));

    let lineGeometry = new BufferGeometry().setFromPoints(points);
    let line = new Line(lineGeometry, lineMaterial);

    return setModelConfig(line, param) as Line;
  }

  /**
   * @description 创建胖线
   * @author LL
   * @date 2024-09-09
   * @param {modelInfoParams} modelInfo 模型参数
   * @returns {*}
   */
  public initFatLine(modelInfo?: modelInfoParams) {
    let defaultParams = {
      modelName: "fatLine-" + new Date().getTime(),
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
        points: [
          {
            x: 0,
            y: 0,
            z: 0,
          },
          {
            x: 20,
            y: 20,
            z: 20,
          },
        ],
        colors: [
          {
            r: 1,
            g: 0,
            b: 0,
          },
          {
            r: 1,
            g: 0,
            b: 0,
          },
        ],
      },
      material: {
        lineWidth: 5,
        dash: false,
      },
    };
    let param = merge(defaultParams, modelInfo);

    const geometry = new LineGeometry();

    let p = [];

    param.base.points.map((item) => {
      p.push(item.x, item.y, item.z);
    });
    geometry.setPositions(p);

    let c = [];
    param.base.colors.map((item) => {
      c.push(item.r, item.g, item.b);
    });
    geometry.setColors(c);

    let matLine = new LineMaterial({
      color: 0xffffff,
      linewidth: param.material.lineWidth, // in world units with size attenuation, pixels otherwise
      vertexColors: true,

      dashed: param.material.dash,
      alphaToCoverage: true,
    });

    let line = new Line2(geometry, matLine);
    line.computeLineDistances();

    return setModelConfig(line, param);
  }

  /**
   * @description 生成管道
   * @author LL
   * @date 2024/10/22
   * @param {modelInfoParams} [modelInfo] 模型参数
   * @returns {*}
   * @memberof TModel
   */
  public initPipe(modelInfo?: modelInfoParams) {
    let defaultParams = {
      modelName: "pipe-" + new Date().getTime(),
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
        points: [
          {
            x: 0,
            y: 0,
            z: 0,
          },
          {
            x: 20,
            y: 20,
            z: 20,
          },
        ],
        radius: 5,
        imgUrl: "",
        speed: 100,
      },
      material: {
        lineWidth: 5,
        dash: false,
        imgUrl: "",
      },
    };
    let param = merge(defaultParams, modelInfo);

    let curveArr = [];
    param.base.points.forEach((point, index) => {
      let v3 = new Vector3(point.x, point.y, point.z);
      curveArr.push(v3);
    });

    const curve = new CatmullRomCurve3(curveArr);

    // 创建纹理加载器
    const textureLoader = new TextureLoader();

    // 加载图片材质
    const texture = textureLoader.load(param.material.imgUrl);

    // 设置阵列模式 RepeatWrapping
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    // 设置x方向的重复数(沿着管道路径方向)
    // 设置y方向的重复数(环绕管道方向)
    texture.repeat.x = 10;
    texture.repeat.y = 4;

    // 创建一个管状几何体，基于曲线
    const tubeGeometry = new TubeGeometry(curve, 100, 1, 8, false);

    // 创建材质
    const material = new MeshBasicMaterial({ map: texture });

    // 创建网格对象
    const mesh = new Mesh(tubeGeometry, material);

    return setModelConfig(mesh, param);
  }

  /**
   * @description 创建带流向的线
   * @author LL
   * @date 2024/10/21
   * @param {modelInfoParams} [modelInfo] 模型参数
   * @returns {*}
   * @memberof TModel
   */
  public initFlowLine(modelInfo?: any): Object3D {
    let defaultParams = {
      modelName: "flowLine-" + new Date().getTime(),
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
        points: [
          {
            x: 0,
            y: 0,
            z: 0,
          },
          {
            x: 20,
            y: 20,
            z: 20,
          },
        ],
        radius: 3,
        imgUrl: "",
        speed: 100,
        repeatX: 5,
        repeatY: 4,
      },
      material: {
        lineWidth: 5,
        dash: false,
      },
    };
    let param = merge(defaultParams, modelInfo);

    let curveArr = [];

    param.base.points.forEach((point, index) => {
      let v3 = new Vector3(point.x, point.y, point.z);
      curveArr.push(v3);
    });
    var curve = new CatmullRomCurve3(curveArr);
    /**
     * TubeGeometry(path : Curve, tubularSegments : Integer, radius : Float, radialSegments : Integer, closed : Boolean)
     */
    var tubeGeometry = new TubeGeometry(
      curve,
      100,
      param.base.radius,
      50,
      false
    );
    var textureLoader = new TextureLoader();
    var texture = textureLoader.load(param.base.imgUrl);

    // 设置阵列模式 RepeatWrapping
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    // 设置x方向的重复数(沿着管道路径方向)
    // 设置y方向的重复数(环绕管道方向)
    texture.repeat.x = param.base.repeatX;
    texture.repeat.y = param.base.repeatY;
    // 设置管道纹理偏移数,便于对中
    texture.offset.y = 0.5;
    var tubeMaterial = new MeshPhongMaterial({
      map: texture,
      transparent: true,
    });
    var tube = new Mesh(tubeGeometry, tubeMaterial);
    // 使用加减法可以设置不同的运动方向
    setInterval(() => {
      texture.offset.x -= 0.0076;
    }, param.base.speed);
    return setModelConfig(tube, param);
  }

  /**
   * @description 生成箭头
   * @author LL
   * @date 24/12/2021
   * @param {modelInfoParams} [modelInfo] 模型参数
   * @returns {*}
   */
  public initArrow(modelInfo?: any): Object3D {
    let defaultParams = {
      modelName: "arrow-" + new Date().getTime(),
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
        start: {
          x: 0,
          y: 0,
          z: 0,
        },
        end: {
          x: 10,
          y: 10,
          z: 10,
        },
        headLength: 3,
        headWidth: 2,
        length: 10,
      },
      material: {
        color: "#f00",
      },
    };
    let param = merge(defaultParams, modelInfo);

    const dirVector3 = new Vector3(
      param.base.start.x,
      param.base.start.y,
      param.base.start.z
    );
    dirVector3.normalize();
    const originVector3 = new Vector3(
      param.base.end.x,
      param.base.end.y,
      param.base.end.z
    );
    const arrowHelper = new ArrowHelper(
      dirVector3,
      originVector3,
      param.base.length,
      new Color(param.material.color).getHex(),
      param.base.headLength,
      param.base.headWidth
    );
    return setModelConfig(arrowHelper, param);
  }

  /**
   * @description 获取直线段的方向向量(世界坐标)
   * @author LL
   * @date 2025/03/26
   * @param {*} line
   * @memberof TLine
   */
  public getLineDirection(line: Line) {
    // 获取几何体顶点数据
    const geometry = line.geometry;
    const vertices = geometry.attributes.position.array;

    if (vertices.length > 6) {
      console.warn("非直线线段");
      return;
    }

    // 提取起点和终点（适用于Line类型的几何体）
    const start = new Vector3(vertices[0], vertices[1], vertices[2]);
    const end = new Vector3(vertices[3], vertices[4], vertices[5]);

    // 转换为世界坐标
    start.applyMatrix4(line.matrixWorld);
    end.applyMatrix4(line.matrixWorld);

    // 计算方向向量
    return end.clone().sub(start).normalize();
  }

  /**
   * @description 获取线段中心点（世界坐标）
   * @author LL
   * @date 2025/03/26
   * @param {Line} line
   * @returns {*}
   * @memberof TLine
   */
  public getLineCenter(line: Line) {
    line.updateMatrixWorld();
    const geometry = line.geometry;
    geometry.computeBoundingBox();
    const center = new Vector3();
    geometry.boundingBox!.getCenter(center);
    return center.applyMatrix4(line.matrixWorld);
  }
}
