import { Color, DirectionalLight, Light, AmbientLight } from "three";
import { TScene } from "./TScene/TScene";

/** 自定义光源的基类，用于 */
export class TLight {
  tScene: TScene;
  static AmbientLight: number = 0; //环境光
  static DirectionalLight: number = 1; //平行光
  static HemisphereLight: number = 2; //半球光
  static PointLight: number = 3; //点光源
  static RectAreaLight: number = 4; //平面光光源
  static SpotLight: number = 5; //聚光灯

  private _lights: Map<string, Light> = new Map<string, Light>();

  constructor(tScene: TScene) {
    this.tScene = tScene;
  }

  /**
   * 获取光源列表
   */
  public get lightList(): Light[] {
    return Array.from(this._lights.values());
  }

  // public add

  /**
   * 添加光源
   * @param id 光源的位移标识符
   * @param light 光源
   */
  public addLight(id: string, light: Light) {
    if (this.hasLight(id)) {
      this.delLight(id);
    } else {
      this._lights.set(id, light);
    }
    this.tScene.add(light);
  }

  /**
   * @description 添加平行光
   * @author LL
   * @param {string} name
   * @param {(Color | string | number)} [color]
   * @param {number} [intensity]
   * @return {*}  {DirectionalLight}
   */
  public addDirectionalLight(
    name: string,
    color?: Color | string | number,
    intensity?: number,
    lightConfig = { position: { x: 100, y: 100, z: 100 } }
  ): DirectionalLight {
    const light = new DirectionalLight(color, intensity);
    light.name = name;

    light.position.set(
      lightConfig.position.x,
      lightConfig.position.y,
      lightConfig.position.z
    );
    this.tScene.add(light);
    return light;
  }

  /**
   * @description 添加环境光
   * @author gj
   * @date 2023/10/27
   * @param {(Color | string | number)} [color]
   * @param {number} [intensity]
   * @return {*}
   */
  public addAmbientLight(color?: Color | string | number, intensity?: number) {
    const ambientLight = new AmbientLight(color, intensity);
    this.tScene.add(ambientLight);
  }

  /**
   * 清空所有光源
   */
  public clear() {}

  /**
   * 窗口变动更新光源事件
   * @param container
   */
  public onResize(container: HTMLElement) {}

  /**
   * @description 删除光源
   * @author LL
   */
  delLight(id: string) {
    const light = this.getLight(id);
    this.tScene.remove(light);
    this._lights.delete(id);
  }

  getLight(id: string): Light {
    // 获取光源
    return this._lights.get(id);
  }
  /**
   * 根据光源id查找
   * @param id
   */
  hasLight(id: string): boolean {
    return this._lights.has(id);
  }
}
