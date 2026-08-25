import {
    Object3D,
    Light,
    WebGLRenderer,
    Mesh,
    Texture,
    TextureLoader,
    Color,
    Vector2,
    Vector3,
    Material
} from 'three'
import { cloneDeep, merge } from 'lodash-es'
import { modelInfoParams } from '../ts/TModelInterfaces'
import type { MaterialMapsParams, MapType } from '../ts/TMaterialInterfaces'
import { mapsLoadOrder, mapTypeToProp } from '../ts/TMaterialInterfaces'
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader'

/** rotation 规范化：兼容 Three.js Euler 序列化 _x/_y/_z 与普通 x/y/z，缺省 { x:0, y:0, z:0 } */
export const normRotation = (
    rot?: Record<string, any> | null
): { x: number; y: number; z: number; _order?: string } => {
    if (!rot) return { x: 0, y: 0, z: 0 }
    if ('_x' in rot && !('x' in rot)) {
        const { _x, _y, _z, ...rest } = rot
        return { ...rest, x: _x ?? 0, y: _y ?? 0, z: _z ?? 0 }
    }
    return { x: rot.x ?? 0, y: rot.y ?? 0, z: rot.z ?? 0, _order: rot._order }
}

/**
 * 统一处理模型
 * @param model 模型对象
 * @param modelInfo 模型配置
 * @param thingOrigin 可选，ThingOrigin 实例；传入后可在此步骤内创建并应用材质/贴图；不传则从 globalThis.ThingOrigin 读取
 * @hidden
 */
export const setModelConfig = (model: Object3D, modelInfo: modelInfoParams, thingOrigin?: any): Object3D => {
    // 验证模型是否有效
    if (!model) {
        console.error('未获取到模型对象:', modelInfo)
        // 返回一个空的Group对象而不是null，避免递归调用问题
        const emptyGroup = new Object3D()
        emptyGroup.name = modelInfo.modelName || 'empty-model'
        return emptyGroup
    }

    // 收集需要移除的光源
    const lightsToRemove: Light[] = []

    model.traverse((child: any) => {
        // 检查是否是光源，如果是则标记为需要移除
        if (child instanceof Light) {
            lightsToRemove.push(child)
        } else {
            // // 统一材质属性;
            // if (child.isMesh && child.material) {
            //     const material = child.material
            //     if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            //         //颜色
            //         if (modelInfo.material?.color !== undefined) {
            //             material.color.set(modelInfo.material.color)
            //         }
            //         //金属度
            //         if (modelInfo.material?.metalness !== undefined) {
            //             material.metalness = modelInfo.material.metalness
            //         }
            //         //粗糙度
            //         if (modelInfo.material?.roughness !== undefined) {
            //             material.roughness = modelInfo.material.roughness
            //         }
            //         //环境贴图强度
            //         if (modelInfo.material?.envMapIntensity !== undefined) {
            //             material.envMapIntensity = modelInfo.material.envMapIntensity
            //         }
            //         //自发光
            //         if (modelInfo.material?.emissive !== undefined) {
            //             material.emissive.set(modelInfo.material.emissive)
            //         }
            //     }
            // }

            if (thingOrigin?.sceneData?.scene?.renderQuality?.shadowMap?.enabled && child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
            }

            // 处理此模型自定义材质配置，覆盖原节点材质
            const childObj = modelInfo?.userData?.material ?? modelInfo?.material
            const materialApi = thingOrigin?.material
            if (Array.isArray(childObj) && childObj.length) {
                // 数组形式：按 meshName 匹配后应用材质，并递归处理该子节点配置
                childObj.forEach((materialItem: any) => {
                    if (materialItem.meshName == child.name) {
                        // 处理材质与贴图：按 meshName 创建材质并应用到对应 mesh
                        materialApi && applyMaterialItem(materialItem, model, materialApi)
                        setModelConfig(child, materialItem, thingOrigin)
                    }
                })
            } else if (childObj && typeof childObj === 'object' && !Array.isArray(childObj)) {
                // 对象形式：与数组项相同，必须 meshName 与当前子节点一致
                if (childObj.meshName == child.name) {
                    materialApi && applyMaterialItem(childObj, model, materialApi)
                    setModelConfig(child, childObj, thingOrigin)
                }
            }

            //处理子节点的基础数据，如果有自定义配置，则覆盖当前节点配置
            let childInfo = modelInfo?.userData?.hierarchy?.level ?? modelInfo?.hierarchy?.level ?? []
            if (childInfo && childInfo.length > 0) {
                childInfo.forEach((item: any) => {
                    if (item.name == child.name) {
                        setModelConfig(child, item, thingOrigin)
                    }
                })
            }

            if (modelInfo.modelType != 'assemble') {
                // 只为非光源对象设置userData
                child.userData = merge(child.userData, {
                    parent: modelInfo.modelName
                })
            }
        }
    })

    // 组装模型
    if (modelInfo.modelType == 'assemble') {
        model.traverse((child) => {
            child.userData = merge(child.userData, {
                parent: modelInfo.modelName
            })
        })
    }

    // 移除收集到的光源
    lightsToRemove.forEach((light) => {
        if (light.parent) {
            light.parent.remove(light)
        }
    })

    //处理缩放
    if (modelInfo.scale) model.scale.set(modelInfo.scale.x, modelInfo.scale.y, modelInfo.scale.z)

    if (modelInfo.rotation) {
        const { x, y, z } = normRotation(modelInfo.rotation)
        model.rotation.set(x, y, z)
    }

    //处理位置
    if (modelInfo.position)
        model.position.set(modelInfo.position.x, modelInfo.position.y, modelInfo.position.z)

    // 仅当 modelName 有值时才覆盖，避免将节点 name 设为 undefined（递归时 customItem 可能无 modelName）
    if (modelInfo.modelName != null && modelInfo.modelName !== '') {
        model.name = modelInfo.modelName
    }
    // 处理用户数据
    // 注意：1) 用 {} 作首参，避免 merge 直接改写 modelInfo.userData
    //      2) 显式写 parent，覆盖复制/克隆残留的旧 parent
    model.userData = merge({}, modelInfo.userData ? modelInfo.userData : {}, {
        by: 'ThingOrigin3D',
        material: modelInfo.material,
        modelType: modelInfo.modelType,
        base: modelInfo.base,
        sim: modelInfo.sim,
        physics: modelInfo.physics,
        hierarchy: modelInfo.hierarchy,
        gatewayMachine: modelInfo.gatewayMachine,
        parent: modelInfo.modelName
    })
    // 只有标记类型才添加base和configs
    if (modelInfo.modelType == 'marker') {
        model.userData.base = modelInfo.base
        model.userData.configs = modelInfo.configs
        model.userData.type = modelInfo.type
    }

    model.updateMatrixWorld(true)

    // 放开有很多奇怪问题   模型莫名其妙消失
    //model.visible如果为undefined或者null，就会被设置为true
    model.visible = modelInfo.visible ?? true
    return model
}

/**
 * 应用初始姿态
 * @param model 模型
 * @param modelInfo 模型配置
 * @param thingOrigin ThingOrigin 实例
 * @returns 应用初始姿态后的模型
 */
export const applyInitialPose = (
    model: Object3D,
    modelInfo: modelInfoParams,
    thingOrigin?: any
): Object3D => {
    const poses = modelInfo.userData?.pose
    if (Array.isArray(poses) && poses.length > 0) {
        const initial = poses.find((p) => p.initPose === true && p.poseData != null)
        if (initial) {
            thingOrigin?.machine.setPose(model, initial.poseData)
        }
    }
    return model
}

/**
 * 应用模型层级调整
 * @param model 模型
 * @param thingOrigin ThingOrigin 实例
 * @returns 应用模型层级调整后的模型
 */
export const applyModelHierarchy = (model: Object3D, thingOrigin?: any): Object3D => {
    if (model && ((model as any).userData?.hierarchy?.level || (model as any).hierarchy?.level)) {
        thingOrigin?.model?.updateModelHierarchy(model as Object3D)
    }
    return model
}

/**
 * 提取影响克隆路径的重型配置（材质 / 层级 / 姿态）
 */
const pickHeavyCfg = (info: modelInfoParams) => ({
    material: info.userData?.material ?? info.material,
    hierarchy: info.userData?.hierarchy ?? info.hierarchy,
    pose: info.userData?.pose,
    modelType: info.modelType
})

const heavyCfgKey = (info: modelInfoParams): string => JSON.stringify(pickHeavyCfg(info))

/**
 * 两条模型配置在材质 / 层级 / 姿态上是否不同（仅比较影响克隆重型路径的字段）
 */
export const hasHeavyConfigDiff = (a: modelInfoParams, b: modelInfoParams): boolean => {
    return heavyCfgKey(a) !== heavyCfgKey(b)
}

/**
 * 复制项是否需要完整 setModelConfig（材质 / 层级 / 姿态等）
 * @param info 当前复制项配置
 * @param tpl 同 id 首条已加载项配置；传入且重型配置一致时可走轻量复制
 */
export const needsFullCloneConfig = (info: modelInfoParams, tpl?: modelInfoParams): boolean => {
    const mat = info.userData?.material ?? info.material
    const hasMat =
        (Array.isArray(mat) && mat.length > 0) ||
        (mat && typeof mat === 'object' && !Array.isArray(mat) && Object.keys(mat).length > 0)

    const levels = info.userData?.hierarchy?.level ?? info.hierarchy?.level
    const hasHier = Array.isArray(levels) && levels.length > 0

    const poses = info.userData?.pose
    const hasPose = Array.isArray(poses) && poses.some((p) => p.initPose === true && p.poseData != null)

    const isAssemble = info.modelType === 'assemble'

    if (!hasMat && !hasHier && !hasPose && !isAssemble) return false

    // 同 id 首条已做过 setModelConfig，复制项重型配置一致则无需再 traverse
    if (tpl && !hasHeavyConfigDiff(tpl, info)) return false

    return true
}

/** 复制后隔离 mesh 材质引用，避免与源实例互相影响 */
const isolateMats = (root: Object3D) => {
    root.traverse((child: any) => {
        if (!child.isMesh || !child.material) return
        child.material = Array.isArray(child.material)
            ? child.material.map((m: Material) => m.clone())
            : child.material.clone()
    })
}

/**
 * 轻量复制：仅变换 / 名称 / userData，跳过材质与层级 traverse
 */
export const applyLightCloneConfig = (
    source: Object3D,
    info: modelInfoParams,
    thingOrigin?: any
): Object3D => {
    const cloned = source.clone(true)
    isolateMats(cloned)

    const lights: Light[] = []
    cloned.traverse((child: any) => {
        if (child instanceof Light) {
            lights.push(child)
        } else if (thingOrigin?.sceneData?.scene?.renderQuality?.shadowMap?.enabled && child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
        }
    })
    lights.forEach((light) => light.parent?.remove(light))

    if (info.scale) cloned.scale.set(info.scale.x, info.scale.y, info.scale.z)
    if (info.rotation) {
        const { x, y, z } = normRotation(info.rotation)
        cloned.rotation.set(x, y, z)
    }
    if (info.position) cloned.position.set(info.position.x, info.position.y, info.position.z)
    if (info.modelName != null && info.modelName !== '') cloned.name = info.modelName

    cloned.userData = merge({}, info.userData ? info.userData : {}, {
        by: 'ThingOrigin3D',
        material: info.material,
        modelType: info.modelType,
        base: info.base,
        sim: info.sim,
        physics: info.physics,
        hierarchy: info.hierarchy,
        gatewayMachine: info.gatewayMachine,
        parent: info.modelName
    })

    if (info.modelType === 'marker') {
        cloned.userData.base = info.base
        cloned.userData.configs = info.configs
        cloned.userData.type = info.type
    }

    if (info.modelType === 'assemble') {
        cloned.traverse((child) => {
            child.userData = merge(child.userData, { parent: info.modelName })
        })
    } else {
        cloned.traverse((child) => {
            if (!(child instanceof Light)) {
                child.userData = merge(child.userData, { parent: info.modelName })
            }
        })
    }

    cloned.updateMatrixWorld(true)
    cloned.visible = info.visible ?? true
    return cloned
}

/**
 * 应用克隆配置
 * @param source 源模型
 * @param model 模型配置
 * @param thingOrigin ThingOrigin 实例
 * @param tpl 同 id 首条配置（批量 loadModel 传入，用于跳过重复 setModelConfig）
 */
export const applyCloneConfig = (
    source: Object3D,
    model: modelInfoParams,
    thingOrigin?: any,
    tpl?: modelInfoParams
): Object3D => {
    const info = cloneDeep(model)
    if (info.rotation) info.rotation = normRotation(info.rotation)

    if (needsFullCloneConfig(info, tpl)) {
        const cloned = source.clone(true)
        const finalModel = setModelConfig(cloned, info, thingOrigin)
        applyInitialPose(finalModel, info, thingOrigin)
        applyModelHierarchy(finalModel, thingOrigin)
        return finalModel
    }

    return applyLightCloneConfig(source, info, thingOrigin)
}

/**
 * 处理单个材质项
 * 有原材质时克隆并只覆盖 properties 中指定的属性（保留 GLB 贴图）；无原材质时创建新材质
 * properties 中有的属性覆盖，没有的保留原材质值
 */
function applyMaterialItem(materialItem: any, model: Object3D, materialApi: any) {
    const props = materialItem.properties ?? {}
    const baseParams = getBaseMaterialParams(props as Record<string, unknown>)
    const convertedParams = convertBaseParams(baseParams)
    const textureParams = getTextureParams(props as Record<string, unknown>)
    const hasTextureUrls = Object.keys(textureParams).length > 0

    const mesh = model.getObjectByName(materialItem.meshName) as Mesh | undefined
    if (!mesh?.isMesh) return

    const existingMat = mesh.material as Material | Material[] | undefined
    const singleMat = Array.isArray(existingMat) ? existingMat[0] : existingMat
    const hasExistingMat = singleMat && typeof singleMat.clone === 'function'

    let material: any

    if (hasExistingMat) {
        // 有原材质：始终克隆原材质，然后只覆盖 properties 中明确指定的属性
        material = singleMat.clone()

        // 仅将 convertedParams 中与 props 原始键匹配的属性应用到材质
        // 这样 properties 中没有的属性不会覆盖原材质值
        const originalKeys = Object.keys(props).filter((k) => !isTextureProperty(k))
        const paramsToApply: Record<string, unknown> = {}
        for (const key of originalKeys) {
            if (convertedParams[key] !== undefined) {
                paramsToApply[key] = convertedParams[key]
            }
        }

        applyBaseParamsToMaterial(material, paramsToApply)
    } else {
        // 无原材质：创建新材质（降级方案）
        const shouldPreferPbr = hasPbrInputs(materialItem, textureParams)
        if (shouldPreferPbr && typeof materialApi?.initStandardMaterial === 'function') {
            material = materialApi.initStandardMaterial(convertedParams)
        } else {
            const typeSuffix = (materialItem.type ?? 'MeshStandardMaterial').replace(/^Mesh/, '')
            const methodName = 'init' + typeSuffix.charAt(0).toUpperCase() + typeSuffix.slice(1)
            material = materialApi[methodName](convertedParams)
        }
    }

    if (materialItem.materialName != null) material.name = String(materialItem.materialName)
    mesh.material = material

    // 异步加载并应用贴图 URL（覆盖对应槽位）
    if (hasTextureUrls) {
        applyTextures(mesh, textureParams, materialApi)
    }
}

/**
 * 从 mapTypeToProp 构建的贴图属性集合（统一数据源，避免重复定义）
 */
const TEXTURE_PROP_SET: ReadonlySet<string> = new Set(mapsLoadOrder.map((t) => mapTypeToProp[t]))

/**
 * 判断是否为贴图属性
 */
function isTextureProperty(key: string): boolean {
    return TEXTURE_PROP_SET.has(key)
}

/**
 * 将 baseParams 应用到已有材质上（保留材质原有贴图，只覆盖指定属性）
 */
function applyBaseParamsToMaterial(material: any, params: Record<string, unknown>): void {
    if (!material || typeof material !== 'object') return

    let hasChanges = false

    for (const [key, value] of Object.entries(params)) {
        if (value == null || value === undefined) continue

        try {
            // Color 类型：使用 set 方法
            if (COLOR_KEYS.has(key) && material[key]?.set) {
                material[key].set(value)
                hasChanges = true
                continue
            }

            // Vector2/Vector3 类型：使用 copy 方法
            if ((value instanceof Vector2 || value instanceof Vector3) && material[key]?.copy) {
                material[key].copy(value)
                hasChanges = true
                continue
            }

            // 普通属性：直接赋值
            if (key in material) {
                material[key] = value
                hasChanges = true
            }
        } catch (err) {
            // 开发环境输出警告
            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
                console.warn(`材质属性 ${key} 赋值失败:`, err)
            }
        }
    }

    if (hasChanges && material.needsUpdate !== undefined) {
        material.needsUpdate = true
    }
}

/**
 * 转换材质基础参数中的特殊类型（Vector2、Vector3、Color）
 */
function convertBaseParams(params: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(params)) {
        result[key] = convertMaterialValue(key, value)
    }
    return result
}

/** 需要转换为 Vector2 的属性名集合 */
const VECTOR2_KEYS = new Set(['normalScale', 'repeat', 'clearcoatNormalScale'])

/** 需要转换为 Color 的属性名集合 */
const COLOR_KEYS = new Set(['color', 'emissive', 'sheenColor', 'attenuationColor'])

/**
 * 转换单个材质属性值：normalScale -> Vector2，{x,y,z} -> Vector3，color/emissive -> Color
 */
function convertMaterialValue(key: string, value: unknown): unknown {
    if (value == null) return value

    // 已是 Three.js 类型，无需转换
    if (value instanceof Vector2 || value instanceof Vector3 || value instanceof Color) {
        return value
    }

    // 字符串转 Color
    if (COLOR_KEYS.has(key) && typeof value === 'string') {
        return new Color(value)
    }

    // 对象类型转换
    if (typeof value !== 'object' || value === null) return value
    const obj = value as Record<string, unknown>

    // 提取数值
    const getNum = (k: string, d: number) => (typeof obj[k] === 'number' ? (obj[k] as number) : d)

    // 判断是否有 xyz 或 rgb 结构
    const hasXyz = 'x' in obj || 'y' in obj || 'z' in obj
    const hasRgb = 'r' in obj || 'g' in obj || 'b' in obj

    // Vector2 属性（优先检查，避免 {x,y} 被误判为 Vector3）
    if (VECTOR2_KEYS.has(key) && (hasXyz || hasRgb)) {
        return new Vector2(getNum('x', getNum('r', 1)), getNum('y', getNum('g', 1)))
    }

    // Color 属性（有 rgb 结构）
    if (COLOR_KEYS.has(key) && hasRgb) {
        return new Color(getNum('r', 1), getNum('g', 1), getNum('b', 1))
    }

    // Vector3 属性（有 z 坐标）
    if (hasXyz && 'z' in obj) {
        return new Vector3(getNum('x', 0), getNum('y', 0), getNum('z', 0))
    }

    // Vector2（有 xy 但无 z）
    if (hasXyz && !hasRgb) {
        return new Vector2(getNum('x', 1), getNum('y', 1))
    }

    return value
}

/**
 * 从材质配置中分离出基础参数（不含所有贴图属性），用于同步创建材质
 */
function getBaseMaterialParams(properties: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!properties) return {}
    const base: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(properties)) {
        if (isTextureProperty(key)) continue
        base[key] = value
    }
    return base
}

/**
 * 从材质配置中提取贴图参数（仅包含有 url 的项），用于异步加载贴图
 */
function getTextureParams(properties: Record<string, unknown> | undefined): MaterialMapsParams {
    const params: MaterialMapsParams = {}
    if (!properties) return params

    for (const mapType of mapsLoadOrder) {
        const prop = mapTypeToProp[mapType]
        const raw = properties[prop]
        if (raw == null) continue

        // 类型守卫：检查是否为有效的贴图配置
        if (typeof raw === 'string') {
            // 字符串直接作为 URL
            params[mapType] = { url: raw }
        } else if (isTextureConfigWithUrl(raw)) {
            // 对象形式（含 url 属性）
            params[mapType] = { ...raw } as MaterialMapsParams[typeof mapType]
        }
    }
    return params
}

/**
 * 类型守卫：检查是否为含 url 的贴图配置对象
 */
function isTextureConfigWithUrl(value: unknown): value is { url: string } {
    return (
        typeof value === 'object' &&
        value !== null &&
        'url' in value &&
        typeof (value as Record<string, unknown>).url === 'string'
    )
}

/**
 * 异步加载贴图并应用到材质上（不阻塞 setModelConfig 返回）
 * @param materialApi 可选，若不传则从 globalThis.ThingOrigin 读取
 */
function applyTextures(mesh: Mesh, textureParams: MaterialMapsParams, materialApi?: any): void {
    const api = materialApi ?? (globalThis as any).ThingOrigin?.material
    const requestedTypes = mapsLoadOrder.filter((type) => !!textureParams[type])
    if (requestedTypes.length === 0) return

    const assignTexture = (mat: any, mapType: MapType, texture: Texture) => {
        const prop = mapTypeToProp[mapType]
        mat[prop] = texture
        // aoMap 需要第二套 UV；若模型仅有 uv，则复制一份到 uv2
        if (mapType === 'aoMap') {
            const geometry: any = mesh.geometry
            if (geometry?.attributes?.uv && !geometry?.attributes?.uv2) {
                geometry.setAttribute('uv2', geometry.attributes.uv.clone())
            }
        }
    }

    const applyToMaterial = async () => {
        if (!mesh.material) return
        const mat = mesh.material as any
        let maps: Partial<Record<MapType, Texture>> = {}

        if (api?.initTextureMaps) {
            try {
                maps = await api.initTextureMaps(textureParams)
                // console.log("🚀 ~ :371 ~ textureParams:", textureParams)
            } catch (err) {
                console.warn('批量贴图加载失败，使用单贴图兜底：', mesh.name, err)
            }
        }

        // 兜底：补齐批量加载缺失项（例如 .tga）
        for (const mapType of requestedTypes) {
            if (maps[mapType]) continue
            const mapConfig = textureParams[mapType]
            const url = mapConfig?.url
            if (!url) continue
            try {
                maps[mapType] = await loadTextureWithFallback(url)
            } catch (err) {
                console.warn(`加载 ${mapType} 贴图失败：`, mesh.name, url, err)
            }
        }

        for (const mapType of requestedTypes) {
            const texture = maps[mapType]
            if (!texture) continue
            assignTexture(mat, mapType, texture)
        }
        mat.needsUpdate = true
    }

    applyToMaterial().catch((err) => {
        console.warn('应用材质贴图失败：', mesh.name, err)
    })
}

/** PBR 数值属性集合 */
const PBR_NUMERIC_KEYS = ['metalness', 'roughness', 'envMapIntensity', 'aoMapIntensity'] as const

/** PBR 贴图类型集合 */
const PBR_MAP_TYPES: (keyof MaterialMapsParams)[] = ['normalMap', 'aoMap', 'metalnessMap', 'roughnessMap']

/**
 * 判断材质配置是否包含 PBR 相关参数
 */
function hasPbrInputs(materialItem: any, textureParams: MaterialMapsParams): boolean {
    const props = materialItem?.properties
    if (!props || typeof props !== 'object') return false

    // 检查 PBR 数值属性
    const hasPbrNumeric = PBR_NUMERIC_KEYS.some((key) => key in props)

    // 检查 PBR 贴图
    const hasPbrMaps = PBR_MAP_TYPES.some((type) => !!textureParams[type])

    // 材质类型本身即为 PBR 类型
    const isPbrType = /standard|physical/i.test(materialItem?.type ?? '')

    return hasPbrNumeric || hasPbrMaps || isPbrType
}

/** 复用的贴图加载器实例（避免每次调用都创建新实例） */
const textureLoader = new TextureLoader()
textureLoader.setCrossOrigin('anonymous')

const tgaLoader = new TGALoader()
tgaLoader.setCrossOrigin('anonymous')

/**
 * 加载贴图（支持 .tga 格式）
 */
async function loadTextureWithFallback(url: string): Promise<Texture> {
    const ext = getFileExtension(url).toLowerCase()
    if (ext === 'tga') {
        return await tgaLoader.loadAsync(url)
    }
    return await textureLoader.loadAsync(url)
}

/**
 * 获取文件名
 * @hidden
 */
export function getFileName(filePath) {
    let fileName = filePath

    let firstParamIndex = fileName.indexOf('?')
    if (firstParamIndex !== -1) {
        fileName = fileName.substring(0, firstParamIndex)
    }

    let firstSeparator = fileName.lastIndexOf('/')
    if (firstSeparator === -1) {
        firstSeparator = fileName.lastIndexOf('\\')
    }
    if (firstSeparator !== -1) {
        fileName = fileName.substring(firstSeparator + 1)
    }

    return decodeURI(fileName)
}

/**
 * 获取文件扩展名
 * @hidden
 */
export function getFileExtension(filePath) {
    let fileName = getFileName(filePath)
    let firstPoint = fileName.lastIndexOf('.')
    if (firstPoint === -1) {
        return ''
    }
    let extension = fileName.substring(firstPoint + 1)
    return extension.toLowerCase()
}
/**
 * 获取目录路径
 * @param p 路径
 * @hidden
 */
export function getDirPath(p) {
    const normalized = (p || '').replace(/\\/g, '/').replace(/^\.\/+/, '')
    const idx = normalized.lastIndexOf('/')
    return idx >= 0 ? normalized.slice(0, idx) : ''
}
/**
 * 规范化名称
 * @param name 名称
 * @hidden
 */
export function normalizeName(name) {
    return name
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '')
}

/**
 * 创建对象URL
 * @hidden
 */
export function createObjectUrl(content) {
    let blob = new Blob([content])
    let url = URL.createObjectURL(blob)
    return url
}

/**
 * 等待表达式为true
 * @hidden
 */
export function waitWhile(expression) {
    function Waiter(expression) {
        if (expression()) {
            setTimeout(() => {
                Waiter(expression)
            }, 10)
        }
    }
    Waiter(expression)
}
/**
 * 辅助：获取 MIME 类型
 * @hidden
 */
export function getMimeType(ext: string): string {
    const mimeMap: Record<string, string> = {
        //模型
        gltf: 'model/gltf+json',
        glb: 'model/gltf-binary',
        fbx: 'application/octet-stream',
        obj: 'text/plain',
        stl: 'application/sla',
        dae: 'model/collada+xml',
        wrl: 'model/vrml',
        '3mf': 'model/3mf',
        amf: 'application/x-amf',
        // 纹理
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        tga: 'image/tga',
        bmp: 'image/bmp',
        gif: 'image/gif'
    }
    return mimeMap[ext] || 'application/octet-stream'
}

/**
 * 设备性能检测配置项
 * 可自定义评分阈值和各维度权重，适配不同业务场景
 */
export interface DevicePerformanceConfig {
    /** 高性能等级的最低分数（默认70） */
    highScore?: number
    /** 中性能等级的最低分数（默认40） */
    mediumScore?: number
    /** 各检测维度的权重配置（总分默认120） */
    weights?: {
        /** 纹理数量权重（默认30） */
        textures: number
        /** 纹理大小权重（默认25） */
        textureSize: number
        /** 顶点属性数量权重（默认15） */
        attributes: number
        /** 顶点Uniforms权重（默认15） */
        vertexUniforms: number
        /** 片段Uniforms权重（默认15） */
        fragmentUniforms: number
        /** 设备像素比权重（默认10） */
        pixelRatio: number
        /** WebGL2版本加分权重（默认10） */
        webgl2: number
    }
    /** 是否禁用缓存（默认false） */
    disableCache?: boolean
}

/**
 * 缓存的性能检测结果
 */
let performanceCache: {
    score: number
    level: 'high' | 'medium' | 'low'
    timestamp: number
} | null = null

/**
 * 检测设备3D渲染性能等级（优化版）
 * @param renderer Three.js WebGL渲染器实例（推荐传入，避免重复创建上下文）
 * @param config 自定义配置项
 * @returns 性能等级: high | medium | low
 *
 * @hidden
 */
export function detectDevicePerformance(
    renderer?: WebGLRenderer | null,
    config: DevicePerformanceConfig = {}
): 'high' | 'medium' | 'low' {
    // 1. 使用默认配置合并用户配置
    const defaultConfig: Required<DevicePerformanceConfig> = {
        highScore: 70,
        mediumScore: 40,
        weights: {
            textures: 30,
            textureSize: 25,
            attributes: 15,
            vertexUniforms: 15,
            fragmentUniforms: 15,
            pixelRatio: 10,
            webgl2: 10
        },
        disableCache: false
    }
    const finalConfig = {
        ...defaultConfig,
        ...config,
        weights: {
            ...defaultConfig.weights,
            ...config.weights
        }
    }

    // 2. 检查缓存（有效期5分钟，避免长期缓存导致性能误判）
    const CACHE_EXPIRE_TIME = 5 * 60 * 1000 // 5分钟
    if (!finalConfig.disableCache && performanceCache) {
        const isCacheValid = Date.now() - performanceCache.timestamp < CACHE_EXPIRE_TIME
        if (isCacheValid) {
            console.debug(`使用缓存的性能等级: ${performanceCache.level} (分数: ${performanceCache.score})`)
            return performanceCache.level
        }
    }

    try {
        // 3. 获取渲染器能力参数（无渲染器时使用保底值）
        const caps = renderer?.capabilities || {
            maxTextures: 8,
            maxTextureSize: 2048,
            maxAttributes: 8,
            maxVertexUniforms: 256,
            maxFragmentUniforms: 256,
            isWebGL2: false
        }

        let performanceScore = 0
        const { weights } = finalConfig

        // 4. 各维度评分计算（按权重分配分数）
        // 4.1 纹理数量评分 (0-weights.textures分)
        if (caps.maxTextures >= 32) {
            performanceScore += weights.textures
        } else if (caps.maxTextures >= 16) {
            performanceScore += weights.textures * 0.67 // 2/3权重
        } else if (caps.maxTextures >= 8) {
            performanceScore += weights.textures * 0.33 // 1/3权重
        }

        // 4.2 纹理大小评分 (0-weights.textureSize分)
        if (caps.maxTextureSize >= 16384) {
            performanceScore += weights.textureSize
        } else if (caps.maxTextureSize >= 8192) {
            performanceScore += weights.textureSize * 0.8
        } else if (caps.maxTextureSize >= 4096) {
            performanceScore += weights.textureSize * 0.6
        } else if (caps.maxTextureSize >= 2048) {
            performanceScore += weights.textureSize * 0.4
        } else {
            performanceScore += weights.textureSize * 0.2
        }

        // 4.3 顶点属性数量评分 (0-weights.attributes分)
        if (caps.maxAttributes >= 16) {
            performanceScore += weights.attributes
        } else if (caps.maxAttributes >= 12) {
            performanceScore += weights.attributes * 0.67
        } else {
            performanceScore += weights.attributes * 0.33
        }

        // 4.4 顶点Uniforms评分 (0-weights.vertexUniforms分)
        if (caps.maxVertexUniforms >= 1024) {
            performanceScore += weights.vertexUniforms
        } else if (caps.maxVertexUniforms >= 512) {
            performanceScore += weights.vertexUniforms * 0.67
        } else {
            performanceScore += weights.vertexUniforms * 0.33
        }

        // 4.5 片段Uniforms评分 (0-weights.fragmentUniforms分)
        if (caps.maxFragmentUniforms >= 1024) {
            performanceScore += weights.fragmentUniforms
        } else if (caps.maxFragmentUniforms >= 512) {
            performanceScore += weights.fragmentUniforms * 0.67
        } else {
            performanceScore += weights.fragmentUniforms * 0.33
        }

        // 4.6 设备像素比评分 (0-weights.pixelRatio分，高DPI适当降分)
        const pixelRatio = window.devicePixelRatio || 1
        if (pixelRatio > 2) {
            performanceScore += weights.pixelRatio * 0.5 // 高DPI降分
        } else if (pixelRatio >= 1.5) {
            performanceScore += weights.pixelRatio * 0.8
        } else {
            performanceScore += weights.pixelRatio
        }

        // 4.7 WebGL2版本加分
        if (caps.isWebGL2) {
            performanceScore += weights.webgl2
        }

        // 5. 四舍五入分数，避免小数精度问题
        performanceScore = Math.round(performanceScore)

        // 6. 根据总分判断性能等级
        let performanceLevel: 'high' | 'medium' | 'low'
        if (performanceScore >= finalConfig.highScore) {
            performanceLevel = 'high'
        } else if (performanceScore >= finalConfig.mediumScore) {
            performanceLevel = 'medium'
        } else {
            performanceLevel = 'low'
        }

        // 7. 更新缓存
        if (!finalConfig.disableCache) {
            performanceCache = {
                score: performanceScore,
                level: performanceLevel,
                timestamp: Date.now()
            }
        }

        console.debug(`设备性能检测完成 - 总分: ${performanceScore}, 等级: ${performanceLevel}`)
        return performanceLevel
    } catch (error) {
        console.warn('设备性能检测失败，默认使用中等性能等级:', error)
        // 异常时清空缓存，避免缓存错误结果
        performanceCache = null
        return 'medium'
    }
}

/**
 * 清空性能检测缓存（用于主动更新检测结果）
 */
export function clearDevicePerformanceCache(): void {
    performanceCache = null
}
