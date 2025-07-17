import { Euler, Object3D, Vector3 } from "three";

// 基础光源配置接口
interface BaseLightOptions {
  name?: string;
  helper?: boolean;
  helperSize?: number;
  helperColor?: number;
}

// 坐标类型定义
export type PositionType = Vector3 | { x: number; y: number; z: number } | [number, number, number];
export type RotationType = Euler | { x: number; y: number; z: number } | [number, number, number];

// 环境光配置接口
export interface AmbientLightOptions extends BaseLightOptions {
  color?: number | string;
  intensity?: number;
}

// 平行光配置接口
export interface DirectionalLightOptions extends BaseLightOptions {
  color?: number | string;
  intensity?: number;
  position?: PositionType;
  target?: Object3D | { x: number; y: number; z: number };
  castShadow?: boolean; //此属性设置为 true 灯光将投射阴影
  shadowNear?: number;
  shadowFar?: number;
  shadowMapSize?: number;
}

// 半球光配置接口
export interface HemisphereLightOptions extends BaseLightOptions {
  skyColor?: number | string;
  groundColor?: number | string;
  intensity?: number;
  position?: PositionType;
}

// 点光源配置接口
export interface PointLightOptions extends BaseLightOptions {
  color?: number | string;
  intensity?: number;
  distance?: number;
  decay?: number; //沿着光照距离的衰减量。默认值为 2。
  position?: PositionType;
  castShadow?: boolean; //此属性设置为 true 灯光将投射阴影
  shadowNear?: number;
  shadowFar?: number;
  shadowMapSize?: number;
}

// 平面光光源配置接口
export interface RectAreaLightOptions extends BaseLightOptions {
  color?: number | string;
  intensity?: number;
  width?: number;
  height?: number;
  position?: PositionType;
  rotation?: RotationType;
}

// 聚光灯配置接口
export interface SpotLightOptions extends BaseLightOptions {
  color?: number | string;
  intensity?: number;
  distance?: number;
  angle?: number;
  penumbra?: number; //聚光锥的半影衰减百分比。默认值为 0。
  decay?: number; //沿着光照距离的衰减量。默认值为 2。
  position?: PositionType;
  target?: Object3D | { x: number; y: number; z: number };
  castShadow?: boolean; //此属性设置为 true 灯光将投射阴影
  shadowNear?: number;
  shadowFar?: number;
  shadowMapSize?: number;
}
