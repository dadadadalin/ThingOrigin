import { merge } from "lodash-es";
import {
  BufferGeometry,
  DoubleSide,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  Object3D,
  ShapeGeometry,
} from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { setModelConfig } from "../private/privateTool";
import { TIndexedDB } from "./TIndexedDB";
import {ThingOrigin} from "../ThingOrigin";

/**
 * 文字
 */

export class TFont {
  public fontLoader = new FontLoader();
  public indexedDB: TIndexedDB = new TIndexedDB();

  public async loadFont(fontInfo?: any) {
    let defaultParams = {
      fontUrl: ThingOrigin.sceneData.params.resource.font_Microsoft,
      fontName: "Microsoft",
      indexedDB: {
        active: true,
        id: 1,
      },
    };
    let param = merge(defaultParams, fontInfo);

    if (param.indexedDB.active) {
      if (param.indexedDB.id < 10) {
        let accessInsetResult = await this.indexedDB.accessInsertModel({
          id: param.indexedDB.id,
          modelName: param.fontName,
          base: {
            modelUrl: param.fontUrl,
          },
          modelType: "font",
        });
        console.log("huncun", accessInsetResult);
        return new Promise((resolve) =>
          this.fontLoader.load(accessInsetResult.modelUrl, (font) => {
            resolve(font);
          })
        );
      } else {
        console.warn("文字缓存失败，请控制缓存id小于10");
      }
    } else {
      console.log("no indexedDB");
      return new Promise((resolve) =>
        this.fontLoader.load(param.fontUrl, (font) => {
          resolve(font);
        })
      );
    }
  }

  /**
   * 创建文字
   * @author gj LL
   * @since 2021/09/16
   * @param {modelInfoParams} [modelInfo] 模型参数
   */
  public initText(modelInfo?: any): Promise<Object3D> {
    let defaultParams = {
      modelName: "text-" + new Date().getTime(),
      modelType: "text",
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
        text: "ThingOrigin 3D",
        fontUrl: ThingOrigin.sceneData.params.resource.font_Microsoft,
        color: "#f00",
        size: 100,
        depth: 10,
        curveSegments: 12,
        textType: "text",
        bevelEnabled: false,
        bevelThickness: 20,
        bevelSize: 8,
        bevelSegments: 3,
        sideColor: "#fff",
      },
    };
    let param = merge(defaultParams, modelInfo);

    return new Promise((resolve) => {
      this.loadFont().then((font: Font) => {
        const geometry = new TextGeometry(param.base.text, {
          font: font,
          size: param.base.size,
          depth: param.base.depth,
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

        resolve(setModelConfig(geometryObject, param));
      });
    });
  }

  /**
   * 创建形状文字
   * @author LL
   * @since 2021/09/17
   * @param {modelInfoParams} [modelInfo] 模型参数
   */
  public initTextShape(modelInfo?: any): Promise<Object3D> {
    let defaultParams = {
      modelName: "textShape-" + new Date().getTime(),
      modelType: "text",
      base: {
        text: "ThingOrigin 3D",
        textType: "shapeText",
        fontUrl: ThingOrigin.sceneData.params.resource.font_Microsoft,
        color: "#f00",
        transparent: true,
        opacity: 0.4,
        size: 100,
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
      this.loadFont().then((font: Font) => {
        var matLite = new MeshBasicMaterial({
          color: param.base.color,
          transparent: param.base.transparent,
          opacity: param.base.opacity,
          side: DoubleSide,
        });
        var shapes = font.generateShapes(param.base.text, param.base.size);
        var geometry = new ShapeGeometry(shapes);
        geometry.computeBoundingBox();
        const geometryObject = new Mesh(geometry, matLite);
        resolve(setModelConfig(geometryObject, param));
      });
    });
  }

  /**
   * 创建描线文字
   * @author LL
   * @since 2021/09/17
   * @param {modelInfoParams} [modelInfo] 模型参数
   */
  public initTextLine(modelInfo?: any): Promise<Object3D> {
    let defaultParams = {
      modelName: "textLine-" + new Date().getTime(),
      modelType: "text",
      base: {
        text: "ThingOrigin 3D",
        textType: "traceText",
        fontUrl: ThingOrigin.sceneData.params.resource.font_Microsoft,
        color: "#f00",
        size: 100,
        lineWidth: 2,
        opacity: 1,
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
      this.loadFont().then((font: Font) => {
        var matDark = new LineBasicMaterial({
          color: param.base.color,
          transparent: true,
          opacity: param.base.opacity,
          linewidth: param.base.lineWidth,
        });

        var shapes = font.generateShapes(param.base.text, param.base.size);
        const geometry = new ShapeGeometry(shapes);
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

        for (var i = 0; i < shapes.length; i++) {
          var shape = shapes[i];

          var points = shape.getPoints();
          const geometry = new BufferGeometry().setFromPoints(points);

          var lineMesh = new Line(geometry, matDark);
          lineText.add(lineMesh);
        }

        resolve(setModelConfig(lineText, param));
      });
    });
  }
}
