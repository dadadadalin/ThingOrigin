import { Object3D } from "three";
import { merge, cloneDeep } from "lodash-es";

/**
 * 统一处理模型
 * @hidden
 */
export const setModelConfig = (
  model: Object3D,
  modelInfo: modelInfoParams
): Object3D => {
  model.traverse((child) => {
    child.userData = merge(child.userData, {
      parent: modelInfo.modelName,
    });
  });

  //处理缩放
  if (modelInfo.scale)
    model.scale.set(modelInfo.scale.x, modelInfo.scale.y, modelInfo.scale.z);

  if (modelInfo.rotation) {
    //处理旋转
    if ("x" in modelInfo.rotation) {
      model.rotation.set(
        modelInfo.rotation.x,
        modelInfo.rotation.y,
        modelInfo.rotation.z
      );
    } else if ("_x" in modelInfo.rotation) {
      model.rotation.set(
        modelInfo.rotation._x,
        modelInfo.rotation._y,
        modelInfo.rotation._z
      );
    }
  }

  //处理位置
  if (modelInfo.position)
    model.position.set(
      modelInfo.position.x,
      modelInfo.position.y,
      modelInfo.position.z
    );

  model.name = modelInfo.modelName;
  model.userData = merge(modelInfo.userData ? modelInfo.userData : {}, {
    by: "ThingOrigin3D",
    base: modelInfo.base,
    material: modelInfo.material,
    loadType: modelInfo.loadType,
    modelType: modelInfo.modelType,
  });

  model.updateMatrixWorld(true);

  // 放开有很多奇怪问题   模型莫名其妙消失
  //model.visible如果为undefined或者null，就会被设置为true
  model.visible = modelInfo.visible ?? true;
  return model;
};
