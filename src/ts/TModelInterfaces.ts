interface prs {
  position: xyz;
  rotation: xyz;
  scale: xyz;
}
/**
 * 模型参数
 * @param author LL
 * @param since 2021/09/16
 * @param param modelName string 模型名称。
 * @param param base any 模型基础信息，包括modelUrl。
 * @param param material any 基础模型材质。
 * @param param loadType 加载类型。
 * @param param position xyz 位置。
 * @param param rotation xyz 旋转。
 * @param param scale xyz 缩放。
 * @param param modelType string 模型类型，包括（sphere,cube,cylinder,cone,circle,gltf,glb,fbx,obj,stl,json,zip,text,assemble）
 * @param param userData any 用户自定义数据
 * @param param visible boolean 是否显示
 */
interface modelInfoParams {
  modelName?: string;
  base?: any;
  material?: any;
  loadType?: string;
  position?: xyz;
  rotation?: xyz | rotationXYZ;
  scale?: xyz;
  modelType?: string;
  modelUrl?: string;
  userData?: any;
  visible?: boolean;
  [key: string]: any;
}

interface updateInfoParams {
  modelInfo: modelInfoParams;
  update: string;
}

interface modelInfo {
  modelName: string;
  modelUrl: string;
  position: xyz;
  scale: xyz;
  rotation: xyz;
  saved: boolean;
  userData: object;
}

interface xyz {
  x: number;
  y: number;
  z: number;
}
