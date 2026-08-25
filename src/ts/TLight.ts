/**
 * @module
 * @mergeModuleWith <project>
 */

import {
  DirectionalLight,
  Light,
  AmbientLight,
  PointLight,
  Object3D,
  HemisphereLight,
  SpotLight,
  Euler,
  RectAreaLight,
  SpotLightHelper,
  DirectionalLightHelper,
  HemisphereLightHelper,
  PointLightHelper,
  OrthographicCamera,
} from 'three';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib';
RectAreaLightUniformsLib.init();

import { TScene } from './TScene';
import {
  AmbientLightParams,
  DirectionalLightParams,
  HemisphereLightParams,
  PointLightParams,
  RectAreaLightParams,
  SpotLightParams,
} from './TLightInterfaces';
import { merge, cloneDeep } from 'lodash-es';

/**
 * 光源
 */
export class TLight {
  private tScene: TScene;
  private helpers: Map<string, Object3D> = new Map();
  constructor(tScene: TScene) {
    this.tScene = tScene;
  }

  /**
   * 添加平行光
   * @author LL gj
   * @since 2023/10/27
   * @param [params] 灯光参数配置
   * @category 光源
   */
  public addDirectionalLight(params?: DirectionalLightParams): DirectionalLight {
    //合并参数
    const defaultParams: DirectionalLightParams = {
      color: 0xffffff, // 光源颜色，默认为白色
      intensity: 1, // 光源强度，默认为1
      position: { x: 0, y: 10, z: 10 }, // 光源位置
      castShadow: true, // 是否投射阴影，默认为true
      shadowNear: 0.5, // 阴影相机近平面距离
      shadowFar: 500, // 阴影相机远平面距离
      shadowMapSize: 2048, // 阴影贴图尺寸，影响阴影质量
      name: `directionalLight_${Date.now()}`, // 光源名称，自动生成时间戳
    };
    let options = merge(defaultParams, params);

    const light = new DirectionalLight(options.color, options.intensity);

    light.position.set(options.position.x, options.position.y, options.position.z);
    // 处理投射阴影
    light.castShadow = options.castShadow;
    if (options.castShadow) {
      const shadow = light.shadow;
      shadow.mapSize.width = options.shadowMapSize;
      shadow.mapSize.height = options.shadowMapSize;
      // 规格里可能出现 near=0，WebGL 正交阴影相机需略大于 0
      shadow.camera.near = Math.max(Number(options.shadowNear ?? 0.5), 0.01);
      shadow.camera.far = options.shadowFar;
      const cam = shadow.camera as OrthographicCamera;
      if (
        options.shadowCameraLeft !== undefined &&
        options.shadowCameraRight !== undefined &&
        options.shadowCameraTop !== undefined &&
        options.shadowCameraBottom !== undefined
      ) {
        cam.left = options.shadowCameraLeft;
        cam.right = options.shadowCameraRight;
        cam.top = options.shadowCameraTop;
        cam.bottom = options.shadowCameraBottom;
        cam.updateProjectionMatrix();
      }
      if (options.shadowBias !== undefined) shadow.bias = options.shadowBias;
      if (options.shadowNormalBias !== undefined) shadow.normalBias = options.shadowNormalBias;
      if (options.shadowRadius !== undefined) shadow.radius = options.shadowRadius;
    }

    light.name = options.name;
    this.tScene.add(light);

    return light;
  }

  /**
   * 添加环境光
   * @author gj
   * @since 2023/10/27
   * @param params 灯光参数配置
   * @category 光源
   */
  public addAmbientLight(params?: AmbientLightParams): AmbientLight {
    const defaultParams: AmbientLightParams = {
      color: 0xffffff, // 光源颜色，默认为白色
      intensity: 0.5, // 光源强度，默认为0.5
      name: `ambientLight_${Date.now()}`, // 光源名称，自动生成时间戳
    };
    let options = merge(cloneDeep(defaultParams), params);
    const light = new AmbientLight(options.color as number, options.intensity);
    // light.castShadow = true;
    light.name = options.name as string;
    this.tScene.add(light);
    return light;
  }

  /**
   * 添加点光源
   * @author LL gj
   * @since 2023/10/27
   * @param params 灯光参数配置
   * @category 光源
   */
  public addPointLight(params?: PointLightParams): PointLight {
    const defaultParams: PointLightParams = {
      color: 0xffffff, // 光源颜色，默认为白色
      intensity: 1, // 光源强度，默认为1
      distance: 0, // 光源最大照射距离，0表示无限远
      decay: 1, // 光源衰减系数，沿着光照距离的衰减量
      position: { x: 0, y: 10, z: 0 }, // 光源位置
      castShadow: false, // 是否投射阴影，默认为false
      shadowNear: 0.5, // 阴影相机近平面距离
      shadowFar: 500, // 阴影相机远平面距离
      shadowMapSize: 1024, // 阴影贴图尺寸，影响阴影质量
      name: `pointLight_${Date.now()}`, // 光源名称，自动生成时间戳
    };
    let options = merge(cloneDeep(defaultParams), params);

    const light = new PointLight(options.color as number, options.intensity, options.distance, options.decay);

    light.position.set(options.position.x, options.position.y, options.position.z);
    //处理投射阴影
    light.castShadow = options.castShadow as boolean;
    if (options.castShadow) {
      const shadow = light.shadow;
      shadow.camera.near = options.shadowNear as number;
      shadow.camera.far = options.shadowFar as number;
      shadow.mapSize.width = options.shadowMapSize as number;
      shadow.mapSize.height = options.shadowMapSize as number;
    }

    light.name = options.name as string;
    this.tScene.add(light);
    return light;
  }

  /**
   * 添加半球光
   * @author gj
   * @since 2025/07/11
   * @param params 灯光参数配置
   * @category 光源
   */
  public addHemisphereLight(params?: HemisphereLightParams): HemisphereLight {
    const defaultParams: HemisphereLightParams = {
      skyColor: 0xffffff, // 天空颜色，默认为白色
      groundColor: 0x000000, // 地面颜色，默认为黑色
      intensity: 1, // 光源强度，默认为1
      position: { x: 0, y: 10, z: 0 }, // 光源位置，默认为[0, 10, 0]
      name: `hemisphereLight_${Date.now()}`, // 光源名称，自动生成时间戳
    };

    let options = merge(cloneDeep(defaultParams), params);

    const light = new HemisphereLight(options.skyColor as number, options.groundColor as number, options.intensity);

    light.position.set(options.position.x, options.position.y, options.position.z);

    light.name = options.name as string;
    this.tScene.add(light);
    return light;
  }

  /**
   * 添加平面光光源
   * @author gj
   * @since 2025/07/11
   * @param params 灯光参数配置
   * @category 光源
   */
  public addRectAreaLight(params?: RectAreaLightParams): RectAreaLight {
    const defaultParams: RectAreaLightParams = {
      name: `rectAreaLight_${Date.now()}`, // 光源名称，自动生成时间戳
      color: 0xffffff, // 光源颜色，默认为白色
      intensity: 5, // 光源强度，默认为5
      width: 10, // 光源宽度，默认为10
      height: 10, // 光源高度，默认为10
      position: { x: 0, y: 10, z: 0 }, // 光源位置
      rotation: { x: 0, y: 0, z: 0 }, // 光源旋转角度
    };

    let options = merge(cloneDeep(defaultParams), params);

    // 注意事项:
    // 不支持阴影。
    // 只支持 MeshStandardMaterial 和 MeshPhysicalMaterial 两种材质。
    // 必须在场景中加入 RectAreaLightUniformsLib，并调用 init()。

    // 需要引入 RectAreaLightHelper 和 RectAreaLightUniformsLib
    // import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib';
    // RectAreaLightUniformsLib.init();

    const light = new RectAreaLight(options.color as number, options.intensity, options.width, options.height);

    light.position.set(options.position.x, options.position.y, options.position.z);
    if (options.rotation) {
      light.rotation.set(options.rotation.x, options.rotation.y, options.rotation.z);
    }

    light.name = options.name as string;

    this.tScene.add(light);
    return light;
  }

  /**
   * 添加聚光灯
   * @author gj
   * @since 2025/07/11
   * @param params 灯光参数配置
   * @category 光源
   */
  public addSpotLight(params?: SpotLightParams): SpotLight {
    const defaultParams: SpotLightParams = {
      color: 0xffffff, // 光源颜色，默认为白色
      intensity: 1, // 光源强度，默认为1
      distance: 0, // 光源最大照射距离，0表示无限远
      angle: Math.PI / 3, // 聚光锥角度，默认为60度
      penumbra: 0, // 聚光锥半影衰减百分比，默认为0
      decay: 1, // 光源衰减系数，沿着光照距离的衰减量
      position: { x: 0, y: 10, z: 0 }, // 光源位置
      target: { x: 0, y: 0, z: 0 }, // 光源目标点，默认为原点
      castShadow: false, // 是否投射阴影，默认为false
      shadowNear: 0.5, // 阴影相机近平面距离
      shadowFar: 500, // 阴影相机远平面距离
      shadowMapSize: 1024, // 阴影贴图尺寸，影响阴影质量
      name: `spotLight_${Date.now()}`, // 光源名称，自动生成时间戳
    };

    let options = merge(cloneDeep(defaultParams), params);

    const light = new SpotLight(
      options.color as number,
      options.intensity,
      options.distance,
      options.angle,
      options.penumbra,
      options.decay
    );

    light.position.set(options.position.x, options.position.y, options.position.z);

    //处理投射阴影
    light.castShadow = options.castShadow as boolean;

    if (options.castShadow) {
      const shadow = light.shadow;
      shadow.camera.near = options.shadowNear as number;
      shadow.camera.far = options.shadowFar as number;
      shadow.mapSize.width = options.shadowMapSize as number;
      shadow.mapSize.height = options.shadowMapSize as number;
    }

    light.name = options.name as string;
    this.tScene.add(light);

    // 设置目标点
    if (options.target instanceof Object3D) {
      light.target = options.target;
      this.tScene.add(options.target);
    } else {
      const targetObj = new Object3D();
      targetObj.position.set(
        (options.target as { x: number; y: number; z: number }).x,
        (options.target as { x: number; y: number; z: number }).y,
        (options.target as { x: number; y: number; z: number }).z
      );
      light.target = targetObj;
      this.tScene.add(targetObj);
    }

    return light;
  }

  /**
   * 添加平行光辅助工具
   * @author gj
   * @since 2025/07/11
   * @param light 平行光
   * @param size 辅助工具大小
   * @param color 辅助工具颜色
   * @category 工具
   */
  public addDirectionalLightHelper(light: DirectionalLight, size: number = 1, color?: number): DirectionalLightHelper {
    if (!light) {
      console.error('光源不存在');
    }
    const helper = new DirectionalLightHelper(light, size, color);
    helper.name = `${light.name}_helper`;
    this.tScene.add(helper);
    this.helpers.set(light.name, helper);
    return helper;
  }

  /**
   * 添加半球光辅助工具
   * @author gj
   * @since 2025/07/11
   * @param light 半球光光源
   * @param size 辅助工具大小
   * @param color 辅助工具颜色
   * @category 光源工具
   */
  public addHemisphereLightHelper(light: HemisphereLight, size: number = 1, color?: number): HemisphereLightHelper {
    if (!light) {
      console.error('光源不存在');
    }
    const helper = new HemisphereLightHelper(light, size, color);
    helper.name = `${light.name}_helper`;
    this.tScene.add(helper);
    this.helpers.set(light.name, helper);
    return helper;
  }

  /**
   * 添加点光源辅助工具
   * @author gj
   * @since 2025/07/11
   * @param light 点光源
   * @param size 辅助工具大小
   * @param color 辅助工具颜色
   * @category 光源工具
   */
  public addPointLightHelper(light: PointLight, size: number = 1, color?: number): PointLightHelper {
    if (!light) {
      console.error('光源不存在');
    }
    const helper = new PointLightHelper(light, size, color);
    helper.name = `${light.name}_helper`;
    this.tScene.add(helper);
    this.helpers.set(light.name, helper);
    return helper;
  }

  /**
   * 添加平面光辅助工具
   * @author gj
   * @since 2025/07/11
   * @param light 平面光
   * @param size 辅助工具大小
   * @param color 辅助工具颜色
   * @category 工具
   */
  public addRectAreaLightHelper(light: RectAreaLight, color?: number): any {
    if (!light) {
      console.error('光源不存在');
    }
    // @ts-ignore
    const helper = new RectAreaLightHelper(light, color);
    helper.name = `${light.name}_helper`;
    this.tScene.add(helper);
    this.helpers.set(light.name, helper);
    return helper;
  }

  /**
   * 添加聚光灯辅助工具
   * @author gj
   * @since 2025/07/11
   * @param light 聚光灯
   * @param size 辅助工具大小
   * @param color 辅助工具颜色
   * @category 工具
   */
  public addSpotLightHelper(light: SpotLight, color?: number): SpotLightHelper {
    if (!light) {
      console.error('光源不存在');
    }
    const helper = new SpotLightHelper(light, color);
    helper.name = `${light.name}_helper`;
    this.tScene.add(helper);
    this.helpers.set(light.name, helper);
    return helper;
  }

  /**
   * 删除光源
   * @author LL gj
   * @since 2025/07/11
   * @param name 光源名称
   * @category 光源
   */
  public removeLight(name: string): boolean {
    const light = this.getLight(name);
    if (light) {
      // 如果有辅助工具，先删除辅助工具
      this.removeLightHelper(name);

      // 如果是聚光灯或平行光，需要同时移除target对象
      if (light instanceof SpotLight || light instanceof DirectionalLight) {
        if (light.target && light.target.parent === this.tScene) {
          this.tScene.remove(light.target);
        }
      }

      this.tScene.remove(light);
      return true;
    }
    return false;
  }
  /**
   * 删除光源辅助工具
   * @author gj
   * @since 2025/07/11
   * @param lightName 光源名称
   * @category 光源
   */
  public removeLightHelper(lightName: string): boolean {
    const helper = this.helpers.get(lightName);
    if (helper) {
      this.tScene.remove(helper);
      this.helpers.delete(lightName);
      return true;
    }
    return false;
  }

  /**
   * 获取光源
   * @author gj
   * @since 2025/07/11
   * @param name 光源名称
   * @category 光源
   */
  public getLight(name: string): Light | undefined {
    return this.tScene.getObjectByName(name) as Light | undefined;
  }
  /**
   * 获取光源辅助工具
   * @author gj
   * @since 2025/07/11
   * @param lightName 光源名称
   * @category 工具
   */
  public getLightHelper(lightName: string): Object3D | undefined {
    return this.helpers.get(lightName);
  }
}
