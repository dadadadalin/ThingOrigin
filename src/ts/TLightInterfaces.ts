/**
 * @module
 * @mergeModuleWith <project>
 */

import { Euler, Object3D, Vector3 } from "three";
import { xyz } from "./scenePrams";

// 基础光源配置接口
interface BaseLightParams {
  name?: string;
}

// 环境光配置接口
/**
 * @group Interfaces
 */
export interface AmbientLightParams extends BaseLightParams {
  color?: number | string;
  intensity?: number;
}

// 平行光配置接口
/**
 * @group Interfaces
 */
export interface DirectionalLightParams extends BaseLightParams {
  color?: number | string;
  intensity?: number;
  position?: xyz;
  target?: Object3D | { x: number; y: number; z: number };
  castShadow?: boolean; //此属性设置为 true 灯光将投射阴影
  shadowNear?: number;
  shadowFar?: number;
  shadowMapSize?: number;
  /** 正交阴影相机范围（未设置则使用 Three.js 默认小范围） */
  shadowCameraLeft?: number;
  shadowCameraRight?: number;
  shadowCameraTop?: number;
  shadowCameraBottom?: number;
  shadowBias?: number;
  shadowNormalBias?: number;
  shadowRadius?: number;
}

// 半球光配置接口
/**
 * @group Interfaces
 */
export interface HemisphereLightParams extends BaseLightParams {
  skyColor?: number | string;
  groundColor?: number | string;
  intensity?: number;
  position?: xyz;
}

// 点光源配置接口
/**
 * @group Interfaces
 */
export interface PointLightParams extends BaseLightParams {
  color?: number | string;
  intensity?: number;
  distance?: number;
  decay?: number; //沿着光照距离的衰减量。默认值为 2。
  position?: xyz;
  castShadow?: boolean; //此属性设置为 true 灯光将投射阴影
  shadowNear?: number;
  shadowFar?: number;
  shadowMapSize?: number;
}

// 平面光光源配置接口
/**
 * @group Interfaces
 */
export interface RectAreaLightParams extends BaseLightParams {
  color?: number | string;
  intensity?: number;
  width?: number;
  height?: number;
  position?: xyz;
  rotation?: xyz;
}

// 聚光灯配置接口
/**
 * @group Interfaces
 */
export interface SpotLightParams extends BaseLightParams {
  color?: number | string;
  intensity?: number;
  distance?: number;
  angle?: number;
  penumbra?: number; //聚光锥的半影衰减百分比。默认值为 0。
  decay?: number; //沿着光照距离的衰减量。默认值为 2。
  position?: xyz;
  target?: Object3D | { x: number; y: number; z: number };
  castShadow?: boolean; //此属性设置为 true 灯光将投射阴影
  shadowNear?: number;
  shadowFar?: number;
  shadowMapSize?: number;
}
