/**
 * @module
 * @mergeModuleWith <project>
 */

import {
    BoxGeometry,
    BufferGeometry,
    CircleGeometry,
    ConeGeometry,
    CylinderGeometry,
    DoubleSide,
    ExtrudeGeometry,
    FileLoader,
    Group,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    MeshPhongMaterial,
    Object3D,
    ObjectLoader,
    PlaneGeometry,
    Points,
    Shape,
    ShapeGeometry,
    SphereGeometry,
    Sprite,
    SpriteMaterial,
    Texture,
    TextureLoader,
    Vector3,
    BufferAttribute,
    PointsMaterial,
    LoadingManager,
    LOD,
    EdgesGeometry,
    LineSegments,
    CapsuleGeometry,
    Matrix4,
    LinearSRGBColorSpace,
    SRGBColorSpace,
    NoColorSpace,
    MeshStandardMaterial,
    Material,
    EulerOrder
} from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { Rhino3dmLoader } from 'three/examples/jsm/loaders/3DMLoader.js'
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader.js'
import URDFLoader from '../../dependencies/urdf-loaders/URDFLoader'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import {
    setModelConfig,
    getFileName,
    getFileExtension,
    getMimeType,
    detectDevicePerformance,
    getDirPath,
    normalizeName,
    applyCloneConfig,
    normRotation,
    applyInitialPose,
    applyModelHierarchy
} from '../private/privateTool'
import { TMaterial } from './TMaterial'
import { TIndexedDB } from './TIndexedDB'
import { TFont } from './TFont'
import { Tool } from './Tool'
import { indexedDBmodelInfoParams, modelInfoParams, fenceInfoParams } from './TModelInterfaces'
import { ThingOrigin } from '../ThingOrigin'

import * as d3geo from 'd3-geo'
import { fetchArrayBuffer, resUrl } from './fetchUtil'
import { unzipPool } from '../private/unzipPool'
import type { TORenderer } from './TRenderer'
import { merge, cloneDeep } from 'lodash-es'

/** loadModel → loadModelFile 的文件类 modelType（扩充 Loader 时只改此处） */
const FILE_LOAD_TYPES = new Set(['gltf', 'glb', 'urdf', 'fbx', 'obj', 'stl', 'json', 'ply', '3dm', '3ds'])

/** 批量预下载 = 文件类 + zip 包 + 字体文件 */
const BATCH_PREFETCH_TYPES = new Set([...FILE_LOAD_TYPES, 'zip', 'font'])

const isFileLoadType = (t?: string) => !!t && FILE_LOAD_TYPES.has(t.toLowerCase())

/** Loader 类型注册项 */
type LoaderConfig = {
    loader: (manager?: LoadingManager) => any
    getObject: (obj: any) => Object3D
    TGA: boolean
}

/** loadWithConfig 可选参数 */
type LoadWithConfigOpts = {
    manager?: LoadingManager // 加载管理器
    onProgress?: (progress: ProgressEvent) => void // 加载进度回调
    preExtract?: (loadedObject: any) => Promise<void> | void // 解压前处理 ：load 回调里、getObject 之前（initZip 用它等所有资源加载完）
    afterExtract?: (mainObject: Object3D, loadedObject: any) => Promise<Object3D> | Object3D // 解压后处理 ：取主对象之后（initZip 用它做 FBX 贴图修复 + 清理 Blob）
    onError?: (err: Error) => void // 解压错误回调
}

/**
 * 基础模型
 */
export class TModel {
    MANAGER = new LoadingManager()
    FBXLoader: FBXLoader = new FBXLoader(this.MANAGER)
    STLLoader: STLLoader = new STLLoader(this.MANAGER)
    OBJLoader: OBJLoader = new OBJLoader(this.MANAGER)
    SVGLoader: SVGLoader = new SVGLoader(this.MANAGER)
    ObjectLoader: ObjectLoader = new ObjectLoader(this.MANAGER)
    GLTFLoader: GLTFLoader = new GLTFLoader(this.MANAGER)
    DRACO_LOADER: DRACOLoader = new DRACOLoader(this.MANAGER)
    // KTX2Loader 全局单例：多个 TModel 实例共享同一个，避免触发
    // "Multiple active KTX2 loaders may cause performance issues" 警告
    private static SHARED_KTX2: KTX2Loader | null = null
    private static KTX2_PATH_SET = false
    KTX2_LOADER: KTX2Loader
    PLYLoader: PLYLoader = new PLYLoader(this.MANAGER)
    Rhino3dmLoader: Rhino3dmLoader = new Rhino3dmLoader(this.MANAGER)
    TDSLoader: TDSLoader = new TDSLoader(this.MANAGER)
    URDFLoader: URDFLoader = new URDFLoader(this.MANAGER)
    ColladaLoader: ColladaLoader = new ColladaLoader(this.MANAGER)

    private TO: ThingOrigin
    private material: TMaterial
    private font: TFont
    private tool: Tool
    private indexedDB: TIndexedDB

    // 文件缓存（小写文件名 → 文件信息）
    private fileNameToFileInfoMap = new Map<
        string,
        {
            content: ArrayBuffer
            originalPath: string
            blob: Blob
            blobURL: string | null
        }
    >()
    private objectUrlToFileName = new Map<string, string>() // 关键：Blob URL → 原文件名
    private static globalTextureCache = new Map<string, Texture>() // 全局纹理缓存：key 为 "原始路径_文件大小" 或直接使用原始路径（因为不同zip中路径可能重复且内容相同）
    private pendingBlobURLs: string[] = [] // 待清理的Blob URL

    constructor(TO: ThingOrigin) {
        this.TO = TO

        // 初始化依赖
        this.material = new TMaterial(TO)
        this.font = new TFont(TO)
        this.tool = new Tool()
        this.indexedDB = new TIndexedDB(TO)
        this.DRACO_LOADER.setDecoderPath(
            resUrl(this.TO.sceneData.params.resource.serverAddress, this.TO.sceneData.params.resource.draco)
        )
        // 共享 KTX2Loader 单例：仅创建一次、仅设置一次 transcoder 路径
        if (!TModel.SHARED_KTX2) {
            TModel.SHARED_KTX2 = new KTX2Loader(this.MANAGER)
        }
        this.KTX2_LOADER = TModel.SHARED_KTX2
        if (!TModel.KTX2_PATH_SET) {
            this.KTX2_LOADER.setTranscoderPath(
                resUrl(
                    this.TO.sceneData.params.resource.serverAddress,
                    this.TO.sceneData.params.resource.ktx2
                )
            )
            TModel.KTX2_PATH_SET = true
        }
        // 设置 Rhino 3DM Loader 的库路径（用于加载 rhino3dm.wasm）
        this.Rhino3dmLoader.setLibraryPath(
            resUrl(
                this.TO.sceneData.params.resource.serverAddress,
                this.TO.sceneData.params.resource.rhino3dm
            )
        )
        this.GLTFLoader.setCrossOrigin('anonymous')
            .setDRACOLoader(this.DRACO_LOADER) //启用对 Draco 压缩几何的支持
            .setKTX2Loader(this.KTX2_LOADER) //启用对 KTX2 压缩纹理的支持

        // 预注册 TGA 处理器（FBX/DAE 必备）
        this.MANAGER.addHandler(/\.tga$/i, new TGALoader(this.MANAGER))

        // 给 URDFLoader 注册 mesh 加载器：默认仅支持 stl/dae，补齐 obj/gltf/glb
        this.setupUrdfMeshLoader(this.URDFLoader)
    }

    /**
     * 为 URDFLoader 注册 loadMeshCb，支持 stl/obj/dae/gltf/glb 网格引用
     * @author gj
     * @since 2026/07/24
     */
    private setupUrdfMeshLoader(loader: URDFLoader): void {
        loader.loadMeshCb = (path, manager, done) => {
            try {
                if (/\.stl$/i.test(path)) {
                    const stl = new STLLoader(manager)
                    stl.load(path, (geom) => {
                        done(new Mesh(geom, new MeshPhongMaterial()))
                    })
                } else if (/\.obj$/i.test(path)) {
                    // OBJLoader 不会自动加载 mtllib，须先加载同名 .mtl 再 setMaterials，否则网格无颜色
                    const mtlPath = path.replace(/\.obj$/i, '.mtl')
                    const mtlLoader = new MTLLoader(manager)
                    mtlLoader.load(
                        mtlPath,
                        (materials) => {
                            materials.preload()
                            const objLoader = new OBJLoader(manager)
                            objLoader.setMaterials(materials)
                            objLoader.load(
                                path,
                                (obj) => done(obj),
                                undefined,
                                (err) => done(null, err)
                            )
                        },
                        undefined,
                        (err) => {
                            // .mtl 加载失败（如 zip 内无 .mtl）则退回无材质加载，避免阻塞
                            console.warn(`URDFLoader: .mtl 加载失败，退回默认材质: ${mtlPath}`, err)
                            new OBJLoader(manager).load(
                                path,
                                (obj) => done(obj),
                                undefined,
                                (e) => done(null, e)
                            )
                        }
                    )
                } else if (/\.dae$/i.test(path)) {
                    new ColladaLoader(manager).load(
                        path,
                        (dae) => done(dae.scene),
                        undefined,
                        (err) => done(null, err)
                    )
                } else if (/\.gl(tf|b)$/i.test(path)) {
                    const gltf = new GLTFLoader(manager)
                    if (this.DRACO_LOADER) gltf.setDRACOLoader(this.DRACO_LOADER)
                    if (this.KTX2_LOADER) gltf.setKTX2Loader(this.KTX2_LOADER)
                    gltf.load(
                        path,
                        (g) => done(g.scene || g.scenes[0]),
                        undefined,
                        (err) => done(null, err)
                    )
                } else {
                    console.warn(`URDFLoader: Could not load model at ${path}.\nNo loader available`)
                }
            } catch (e) {
                done(null, e as Error)
            }
        }
    }

    /** 批量首条：网络下载并发（浏览器同域约 6 连接） */
    private static DOWNLOAD_CONCURRENCY = 6
    /** 批量首条：解析并发（Draco/GLTF 偏 CPU，略低于下载） */
    private static PARSE_CONCURRENCY = 4

    /** 首条加载是否需要远程文件（cube/sphere/text 等无 URL 模型不需要） */
    private needsFileDownload(model: modelInfoParams): boolean {
        const t = model.modelType?.toLowerCase()
        return !!t && BATCH_PREFETCH_TYPES.has(t)
    }

    /** 批量同 id 复用键；文字几何依赖文案，不同 text 不能克隆首条 */
    private getShareKey(model: modelInfoParams): string | number | null {
        if (model.id === undefined || model.id === null) return null
        if (model.modelType?.toLowerCase() === 'text') {
            const text = model.base?.text ?? model.userData?.text ?? model.userData?.base?.text ?? ''
            return `${model.id}::text::${text}`
        }
        return model.id
    }

    /** 并发池：限制同时执行的任务数 */
    private async runPool<T>(items: T[], fn: (item: T) => Promise<unknown>, limit: number): Promise<void> {
        if (!items.length) return
        let idx = 0
        const worker = async () => {
            while (idx < items.length) {
                const i = idx++
                await fn(items[i])
            }
        }
        await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
    }

    /**
     * 下载→解析流水线：单项下载完成即排队解析，不等待全部下载结束
     * @author gj
     * @since 2026/07/09
     * @param dlLimit 下载并发
     * @param parseLimit 解析并发
     */
    private async runDownloadParsePipeline(
        items: modelInfoParams[],
        download: (model: modelInfoParams) => Promise<string | undefined>,
        parse: (model: modelInfoParams, url?: string) => Promise<unknown>,
        dlLimit: number,
        parseLimit: number
    ): Promise<void> {
        if (!items.length) return

        let dlIdx = 0
        let parseActive = 0
        const parseWait: Array<() => void> = []
        const parseTasks: Promise<unknown>[] = []

        const acquireParse = () =>
            new Promise<void>((resolve) => {
                if (parseActive < parseLimit) {
                    parseActive++
                    resolve()
                    return
                }
                parseWait.push(() => {
                    parseActive++
                    resolve()
                })
            })

        const releaseParse = () => {
            parseActive--
            const next = parseWait.shift()
            if (next) next()
        }

        const scheduleParse = (model: modelInfoParams, url?: string) => {
            const task = acquireParse()
                .then(() => parse(model, url))
                .finally(releaseParse)
            parseTasks.push(task)
        }

        const dlWorker = async () => {
            while (dlIdx < items.length) {
                const model = items[dlIdx++]
                try {
                    const url = await download(model)
                    scheduleParse(model, url)
                } catch (error) {
                    console.error(`预下载失败 id=${model.id}:`, error)
                    scheduleParse(model)
                }
            }
        }

        await Promise.all(Array.from({ length: Math.min(dlLimit, items.length) }, () => dlWorker()))
        await Promise.all(parseTasks)
    }

    /**
     * 加载模型（单个或批量）
     * - 传入单个 modelInfo：走单模型加载，返回 Object3D
     * - 传入 models 数组：走批量逻辑（同 id 仅首条 loadModel，其余复制并应用独立配置；indexedDB 缓存、加载进度），返回 Object3D[]
     * @author LL gj
     * @since 2021/07/26
     * @update 2026/06/20 - 优化 indexedDB 存储逻辑、批量加载逻辑
     * @param models 模型数组
     * @param onModelLoaded 单个模型加载完成的回调
     * @param onAllLoaded 所有模型加载完成的回调，接收模型数组和 ThingOrigin 实例，返回 ThingOrigin 实例供后续操作
     * @param modelInfo 单个模型信息
     * @param useIndexedDB 是否使用 indexedDB（仅单模型时有效，默认 true）
     */
    // 重载签名1：仅类型声明，传入单个模型信息，返回模型
    public async loadModel(modelInfo: modelInfoParams, useIndexedDB?: boolean): Promise<Object3D>
    // 重载签名2：仅类型声明，传入模型数组，返回模型数组
    public async loadModel(
        models: modelInfoParams[],
        onModelLoaded?: (model: Object3D, index: number) => void,
        onAllLoaded?: (models: Object3D[], thingOrigin?: ThingOrigin) => ThingOrigin
    ): Promise<Object3D[]>
    // 实现签名，根据输入参数类型，调用不同的重载签名函数
    public async loadModel(
        input: modelInfoParams | modelInfoParams[],
        arg2?: boolean | ((model: Object3D, index: number) => void),
        onAllLoaded?: (models: Object3D[], thingOrigin?: ThingOrigin) => ThingOrigin
    ): Promise<Object3D | Object3D[]> {
        // ---------- 入口分发 ----------
        if (Array.isArray(input)) {
            return this.loadModelBatch(input, typeof arg2 === 'function' ? arg2 : undefined, onAllLoaded)
        }
        return this.loadModelSingle(input, typeof arg2 === 'boolean' ? arg2 : true)
    }

    /**
     * 批量加载：同 id 仅首条真正 loadModel，其余复制并应用独立配置；
     * 含 indexedDB 缓存命中、下载→解析流水线、加载进度上报。
     */
    private async loadModelBatch(
        models: modelInfoParams[],
        onModelLoaded?: (model: Object3D, index: number) => void,
        onAllLoaded?: (models: Object3D[], thingOrigin?: ThingOrigin) => ThingOrigin
    ): Promise<Object3D[]> {
        // 处理空模型数组的情况
        if (!models || models.length === 0) {
            const emptyResult: Object3D[] = []
            onAllLoaded?.(emptyResult, this.TO)
            return emptyResult
        }

        const successfulModels: Object3D[] = []
        let modelIndex = 0

        // 1. 区分首条加载 / 待复制
        const seenIds = new Set<number | string>() // 已处理过的 id 集合
        const firstCandidates: modelInfoParams[] = [] //每个 id 的首条 + 所有无 id 项 =》 真正要"加载"的
        const clonesById = new Map<string | number, modelInfoParams[]>() //同 id 的后续项 =》 待"复制"的
        const firstInfoById = new Map<string | number, modelInfoParams>() //每个 id 的首条信息 =》 作为复制模板

        for (const model of models) {
            const shareKey = this.getShareKey(model)

            if (shareKey != null && seenIds.has(shareKey)) {
                const list = clonesById.get(shareKey) || []
                list.push(model)
                clonesById.set(shareKey, list)
                continue
            }

            if (shareKey != null) {
                seenIds.add(shareKey)
                firstInfoById.set(shareKey, model)
            }
            firstCandidates.push(model)
        }

        // 2. 并行检查 indexedDB 缓存，再拆分首条(已缓存) / 首条(未缓存)
        const firstLoadCached: Array<{ model: modelInfoParams; cachedUrl: string }> = []
        const firstLoadFresh: modelInfoParams[] = []

        const cacheResults = await Promise.all(
            firstCandidates.map(async (model) => {
                const hasId = model.id !== undefined && model.id !== null
                if (!hasId) return { model, cachedUrl: undefined as string | undefined }

                try {
                    const indexed = await this.indexedDB.accessModel(model as indexedDBmodelInfoParams)
                    const cachedUrl =
                        indexed.info.saved !== false && indexed.modelUrl ? indexed.modelUrl : undefined
                    return { model, cachedUrl }
                } catch (error) {
                    console.error(`检查模型 ${model.id} 缓存失败:`, error)
                    return { model, cachedUrl: undefined as string | undefined }
                }
            })
        )

        for (const { model, cachedUrl } of cacheResults) {
            if (cachedUrl) {
                // 已缓存
                firstLoadCached.push({ model, cachedUrl })
            } else {
                // 未缓存
                firstLoadFresh.push(model)
            }
        }

        console.log('首条(已缓存):', firstLoadCached, '首条(未缓存):', firstLoadFresh, '待复制:', clonesById)

        // 3. 加载状态上报准备
        const modelLoadIds = new Map<modelInfoParams, string>() // 模型加载 id 映射：model → uniqueId
        models.forEach((model, index) => {
            const uniqueId = `${model.modelName || model.name || 'model'}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            modelLoadIds.set(model, uniqueId)
        })

        this.TO?.scene?.resetModelLoadingStatus()
        this.TO?.scene?.beginBatchLoad(models.length)

        let rendered = 0
        let failed = 0
        const tryRenderReport = () => {
            this.TO?.scene?.onBatchRenderTick(rendered, failed)
        }

        const finishedIds = new Set<string>()
        const markDone = (model: modelInfoParams) => {
            const uniqueId = modelLoadIds.get(model)
            if (!uniqueId || finishedIds.has(uniqueId)) return
            finishedIds.add(uniqueId)
            this.TO?.scene?.finishModelLoading(uniqueId)
        }

        const failModel = (model: modelInfoParams) => {
            failed++
            tryRenderReport()
            markDone(model)
        }

        models.forEach((model) => {
            this.TO?.scene?.startModelLoading(modelLoadIds.get(model)!)
        })

        const loadedById = new Map<string | number, Object3D>()
        const cloneTasks: Promise<Object3D | null>[] = []

        const emitLoaded = (model: modelInfoParams, loadedModel: Object3D | null) => {
            const modelName = model.modelName || model.name || `model-${Date.now()}`
            const currentIndex = modelIndex++

            if (onModelLoaded && loadedModel) {
                onModelLoaded(loadedModel, currentIndex)
                rendered++
                tryRenderReport()
            }
            if (loadedModel) {
                successfulModels.push(loadedModel)
            }
            markDone(model)
        }

        const cloneOne = async (
            model: modelInfoParams,
            source: Object3D | null
        ): Promise<Object3D | null> => {
            const modelName = model.modelName || model.name || `model-${Date.now()}`

            if (!source) {
                console.error(`复制模型 ${model.modelName || model.name} 未找到同源模型 id=${model.id}`)
                failModel(model)
                return null
            }

            try {
                const shareKey = this.getShareKey(model)
                const tpl = shareKey != null ? firstInfoById.get(shareKey) : undefined
                const clonedModel = applyCloneConfig(source, model, this.TO, tpl)
                emitLoaded(model, clonedModel)
                return clonedModel
            } catch (error) {
                console.error(`复制模型 ${modelName} 失败:`, error)
                failModel(model)
                return null
            }
        }

        // 首条完成即复制同 id 待复制项（与其余首条并行）
        const enqueueClones = (id: string | number, source: Object3D | null) => {
            const pending = clonesById.get(id)
            if (!pending?.length) return
            clonesById.delete(id)
            for (const model of pending) {
                cloneTasks.push(cloneOne(model, source))
            }
        }

        const parseFirstLoad = async (
            model: modelInfoParams,
            blobUrl?: string,
            errorPrefix: string = '模型'
        ): Promise<Object3D | null> => {
            const modelName = model.modelName || model.name || `model-${Date.now()}`

            try {
                let loadedModel: Object3D | null = null

                if (blobUrl) {
                    const loadInfo = cloneDeep(model)
                    loadInfo.base = loadInfo.base || {}
                    if (model.modelType === 'text') {
                        loadInfo.base.fontUrl = blobUrl
                    } else {
                        loadInfo.base.modelUrl = blobUrl
                    }
                    loadedModel = (await this.loadModel(loadInfo, false)) as Object3D
                } else {
                    loadedModel = (await this.loadModel(model, false)) as Object3D
                }

                // 触发 onModelLoaded + rendered++ + markDone
                emitLoaded(model, loadedModel)

                const shareKey = this.getShareKey(model)
                if (shareKey != null) {
                    if (loadedModel) loadedById.set(shareKey, loadedModel) //记录首条成果 =》 作为后续复制项的源
                    enqueueClones(shareKey, loadedModel) //立即把同 id 待复制项推入 cloneTasks
                }

                return loadedModel
            } catch (error) {
                console.error(`${errorPrefix} ${modelName} 加载失败:`, error)
                failModel(model)
                const shareKey = this.getShareKey(model)
                if (shareKey != null) enqueueClones(shareKey, null)
                return null
            }
        }

        // 4. 三路并行解析（已缓存立即解析 / 无需下载直接解析 / 未缓存下载流水线）
        const freshNeedDl = firstLoadFresh.filter((m) => m.id != null && this.needsFileDownload(m)) //有 id 且 needsFileDownload（文件类，需远程下载）
        const freshNoDl = firstLoadFresh.filter((m) => !(m.id != null && this.needsFileDownload(m))) //无 id 或非文件类（cube/sphere/text 等本地生成）

        this.indexedDB.beginDeferDbSave()

        // 字体预加载与批量并行
        const fontWarm = this.font.preloadFonts(models)

        // 已缓存：立即解析
        const cachedParsePromises = firstLoadCached.map((item) =>
            parseFirstLoad(item.model, item.cachedUrl, '已缓存模型')
        )

        // 无需下载的首条：直接解析
        const noDlParsePromise = freshNoDl.length
            ? this.runPool(freshNoDl, (model) => parseFirstLoad(model), TModel.PARSE_CONCURRENCY)
            : Promise.resolve()

        // 未缓存：下载完成一项即解析一项（与 cached / noDl 并行）
        const pipelinePromise = freshNeedDl.length
            ? this.runDownloadParsePipeline(
                  freshNeedDl,
                  async (model) => {
                      const res = await this.indexedDB.resolveModelUrl(model as indexedDBmodelInfoParams, {
                          skipAccess: true
                      })
                      if (!res.modelUrl) {
                          throw new Error(`预下载无 blobUrl id=${model.id}`)
                      }
                      return res.modelUrl
                  },
                  (model, url) => parseFirstLoad(model, url),
                  TModel.DOWNLOAD_CONCURRENCY,
                  TModel.PARSE_CONCURRENCY
              )
            : Promise.resolve()

        await Promise.all([
            Promise.allSettled(cachedParsePromises),
            fontWarm.catch((err) => console.warn('字体预加载失败:', err)),
            noDlParsePromise,
            pipelinePromise
        ])

        // 5. 兜底复制 + 收尾上报：首条失败或未触发时，结束剩余待复制项
        for (const id of [...clonesById.keys()]) {
            enqueueClones(id, loadedById.get(id) ?? null)
        }
        await Promise.allSettled(cloneTasks)

        for (const model of models) {
            const uniqueId = modelLoadIds.get(model)
            if (uniqueId && !finishedIds.has(uniqueId)) {
                failed++
                tryRenderReport()
                markDone(model)
            }
        }

        // 兜底上报（正常情况最后一条 markDone 时已打印耗时）
        this.TO?.scene?.completeModelLoadingBatch()

        void this.indexedDB.flushPendingDbSaves().catch((err) => console.error('批量 IDB 写入失败:', err))

        onAllLoaded?.(successfulModels, this.TO)
        return successfulModels
    }

    /**
     * 单模型加载：按 modelType 分发到具体 init，再叠加初始姿态与层级。
     * @param useIndexedDB 是否走 indexedDB 缓存（批量内部递归调用时传 false，避免重复下载）
     */
    private async loadModelSingle(
        modelInfo: modelInfoParams,
        useIndexedDB: boolean = true
    ): Promise<Object3D> {
        let model

        if (modelInfo.rotation) modelInfo.rotation = normRotation(modelInfo.rotation)

        // 处理 indexedDB 逻辑（先查缓存，未命中则下载）
        let loadInfo = cloneDeep(modelInfo)
        if (useIndexedDB && modelInfo.id) {
            const idbInfo = await this.indexedDB.accessInsertModel(modelInfo as indexedDBmodelInfoParams)
            // text 走 fontUrl，其余走 modelUrl（与批量 parseFirstLoad 一致）
            loadInfo.base = loadInfo.base || {}
            if (modelInfo.modelType === 'text') {
                loadInfo.base.fontUrl = idbInfo.modelUrl
            } else {
                loadInfo.base.modelUrl = idbInfo.modelUrl
            }
        }

        switch (modelInfo.modelType) {
            case 'sphere':
                model = this.initSphere(modelInfo)
                break
            case 'cube':
                model = this.initCube(modelInfo)
                break
            case 'cylinder':
                model = this.initCylinder(modelInfo)
                break
            case 'fence':
                model = await this.initFence(modelInfo as fenceInfoParams)
                break
            case 'ground':
                model = this.initPlane(modelInfo)
                break
            case 'cone':
                model = this.initCone(modelInfo)
                break
            case 'circle':
                model = this.initCircle(modelInfo)
                break
            case 'lod':
                return await this.initLOD(modelInfo)
            default: {
                const type = modelInfo.modelType?.toLowerCase()
                if (isFileLoadType(type)) {
                    model = await this.loadModelFile(loadInfo)
                    break
                }
                switch (type) {
                    case 'zip':
                        model = await this.initZip(loadInfo)
                        break
                    case 'text': {
                        const textInfo = cloneDeep(loadInfo)
                        switch (modelInfo.base.textType) {
                            case 'text':
                                model = await this.font.initText(textInfo)
                                break
                            case 'traceText':
                                model = await this.font.initTextLine(textInfo)
                                break
                            case 'shapeText':
                                model = await this.font.initTextShape(textInfo)
                                break
                            default:
                                console.error(`不支持的文本类型: ${modelInfo.base.textType}`)
                        }
                        break
                    }
                    case 'assemble':
                        model = await this.initAssemble(modelInfo)
                        break
                    case 'shelf':
                        model = await this.initShelf(modelInfo)
                        break
                    default:
                        console.error(`不支持的模型类型: ${modelInfo.modelType}`)
                        return null
                }
            }
        }

        //设置初始姿态
        applyInitialPose(model, modelInfo, this.TO)

        // 模型层级调整
        applyModelHierarchy(model, this.TO)

        return model ?? null
    }

    /**
     * 模型文件类加载入口（普通 URL）
     * @author LL
     * @since 2021/07/26
     * @note merge 默认参数 → 校验 modelUrl → getLoaderConfig(type) → loadWithConfig(config, url) → setModelConfig
     * @param {modelInfoParams} modelInfo 模型参数
     * @returns {Promise<Object3D>} 加载的模型对象
     */
    private async loadModelFile(modelInfo?: modelInfoParams): Promise<Object3D> {
        let defaultParams = {
            modelType: 'gltf',
            modelName: 'fileModel-' + new Date().getTime(),
            base: {
                modelUrl:
                    this.TO.sceneData.params.resource.serverAddress + 'editor/model2/loadFileAsId/56201403'
            },
            position: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            rotation: { x: 0, y: 0, z: 0 }
        }

        let param = merge(defaultParams, modelInfo)

        // 验证模型URL是否有效
        if (!param.base || !param.base.modelUrl) {
            console.error('模型导入失败: 路径未写入')
            return null
        }

        // 获取模型配置
        const modelType = param.modelType!.toLowerCase()
        const modelConfig = this.getLoaderConfig(modelType)

        if (!modelConfig) {
            console.warn(`未定义模型类型: ${modelType}，导入失败`)
            return null
        }

        try {
            const mainObject = await this.loadWithConfig(modelConfig, param.base!.modelUrl!)
            // WebGPU：修复 FBX ReflectionColor 等 2D envMap 触发的 cube view 校验错误
            this.fixWebGPUEnvMaps(mainObject)
            return setModelConfig(mainObject, param, this.TO)
        } catch (error) {
            console.error(`${param.modelName}，${modelType.toUpperCase()}模型导入失败:`, error)
            console.error('模型URL:', param.base!.modelUrl!)
            return null
        }
    }

    /**
     * 按文件扩展名获取 Loader（initZip / loadModelFile）
     * 与 FILE_LOAD_TYPES（modelType）大部分对齐；dae 等仅作为 zip 内扩展名，无对应顶层 modelType
     */
    private getLoaderConfig(modelType: string): LoaderConfig | null {
        const lowerExt = modelType.toLowerCase()
        switch (lowerExt) {
            case 'fbx':
                return {
                    loader: (manager?) => {
                        if (manager) {
                            const loader = new FBXLoader(manager)
                            // 设置跨域
                            loader.setCrossOrigin('anonymous')
                            return loader
                        }
                        return this.FBXLoader
                    },
                    getObject: (obj) => obj,
                    TGA: true
                }
            case 'dae':
                return {
                    loader: (manager?) => (manager ? new ColladaLoader(manager) : this.ColladaLoader),
                    getObject: (obj) => obj.scene,
                    TGA: true // DAE 需要 TGA 纹理支持
                }
            case 'gltf':
            case 'glb':
                return {
                    loader: (manager?) => {
                        if (manager) {
                            // ZIP 加载时需要新实例，复制重要配置
                            const loader = new GLTFLoader(manager)
                            // 复制 DRACO、KTX2 等解码器配置
                            if (this.DRACO_LOADER) {
                                loader.setDRACOLoader(this.DRACO_LOADER)
                            }
                            if (this.KTX2_LOADER) {
                                loader.setKTX2Loader(this.KTX2_LOADER)
                            }
                            loader.setCrossOrigin('anonymous')
                            return loader
                        }
                        // 普通加载时复用已配置好的实例
                        return this.GLTFLoader
                    },
                    getObject: (obj) => {
                        const objClone = obj.scene || obj.scenes[0]
                        // 设置动画到模型对象上
                        objClone.animations = obj.animations
                        return objClone
                    },
                    TGA: false
                }
            case 'urdf':
                return {
                    loader: (manager?) => {
                        const loader = manager ? new URDFLoader(manager) : this.URDFLoader
                        this.setupUrdfMeshLoader(loader)
                        return loader
                    },
                    getObject: (obj) => obj,
                    TGA: false
                }
            case 'obj':
                return {
                    loader: (manager?) => (manager ? new OBJLoader(manager) : this.OBJLoader),
                    getObject: (obj) => obj,
                    TGA: false
                }
            case 'stl':
                return {
                    loader: (manager?) => (manager ? new STLLoader(manager) : this.STLLoader),
                    getObject: (geo) => {
                        // STL 返回的是几何体，使用哑光灰色材质包装为 Mesh
                        const material = new MeshPhongMaterial({
                            side: DoubleSide,
                            color: 0xc8c8c8, // 主色：灰色
                            emissive: 0x000000, // 环境光/自发光：黑色
                            specular: 0x000000, // 高光：黑色（无高光，哑光效果）
                            shininess: 0, // 光泽度：0（完全哑光）
                            opacity: 1, // 不透明 100%
                            transparent: false // 关闭透明
                        })
                        return new Mesh(geo, material)
                    },
                    TGA: false
                }
            case 'json':
                return {
                    loader: (manager?) => (manager ? new ObjectLoader(manager) : this.ObjectLoader),
                    getObject: (obj) => obj,
                    TGA: false
                }
            case 'ply':
                return {
                    loader: (manager?) => (manager ? new PLYLoader(manager) : this.PLYLoader),
                    getObject: (geo) => {
                        // PLY 返回的是几何体，需要包装为 Mesh
                        geo.computeVertexNormals()
                        const material = new MeshPhongMaterial({
                            side: DoubleSide,
                            vertexColors: geo.hasAttribute('color'),
                            color: geo.hasAttribute('color') ? 0xffffff : 0xc8c8c8
                        })
                        return new Mesh(geo, material)
                    },
                    TGA: false
                }
            case '3dm':
                return {
                    loader: (manager?) => {
                        if (manager) {
                            const loader = new Rhino3dmLoader(manager)
                            loader.setCrossOrigin('anonymous')
                            return loader
                        }
                        return this.Rhino3dmLoader
                    },
                    getObject: (obj) => obj,
                    TGA: false
                }
            case '3ds':
                return {
                    loader: (manager?) => {
                        if (manager) {
                            const loader = new TDSLoader(manager)
                            loader.setCrossOrigin('anonymous')
                            return loader
                        }
                        return this.TDSLoader
                    },
                    getObject: (obj) => obj,
                    TGA: false
                }
            default:
                return null
        }
    }

    /**
     * 通用文件加载内核：loader.load → getObject → 可选后处理
     * @author gj
     * @since 2026/06/30
     */
    private loadWithConfig(
        config: LoaderConfig,
        url: string,
        opts: LoadWithConfigOpts = {}
    ): Promise<Object3D> {
        return new Promise((resolve, reject) => {
            const loader = config.loader(opts.manager)
            loader.load(
                url,
                async (loadedObject: any) => {
                    try {
                        if (opts.preExtract) await opts.preExtract(loadedObject)
                        const mainObject = config.getObject(loadedObject)
                        if (opts.afterExtract) {
                            resolve(await opts.afterExtract(mainObject, loadedObject))
                            return
                        }
                        if (!mainObject) throw new Error('导入失败: 没有主对象')
                        resolve(mainObject)
                    } catch (e) {
                        reject(e)
                    }
                },
                opts.onProgress,
                (err: Error) => {
                    opts.onError?.(err)
                    reject(err)
                }
            )
        })
    }

    /**
     * 更新模型层级
     * @author gj
     * @since 2026/03/11
     * @param {Object3D} root 根模型节点
     */
    public updateModelHierarchy(root: Object3D): void {
        let group = (root as any).userData.hierarchy?.level || (root as any).hierarchy?.level
        if (!group || !Array.isArray(group) || group.length === 0) return

        // 过滤掉 parent 为 null 或没有 parent 属性的数据
        group = group.filter((item: any) => item.parent != null)
        if (group.length === 0) return

        // 构建名称到节点的映射（包括现有节点）
        const nodeMap = new Map<string, Object3D>()
        root.traverse((node) => {
            if (node.name) {
                nodeMap.set(node.name, node)
            }
        })

        // 遍历记录，调整层级或创建新节点
        group.forEach((item: any) => {
            let node = nodeMap.get(item.name)
            let newParent: Object3D | undefined = nodeMap.get(item.parent)
            let isNewNode = false

            // 处理节点不存在的情况：创建新节点
            if (!node) {
                node = this.TO.tool.initGroup()
                node.name = item.name
                if (item.visible !== undefined) node.visible = item.visible
                if (item.position) node.position.set(item.position.x, item.position.y, item.position.z)
                if (item.rotation) {
                    const rot = normRotation(item.rotation)
                    node.rotation.set(rot.x, rot.y, rot.z, (rot._order ?? 'XYZ') as EulerOrder)
                }
                if (item.scale) node.scale.set(item.scale.x, item.scale.y, item.scale.z)
                if (item.userData) node.userData = item.userData
                nodeMap.set(item.name, node)
                isNewNode = true
            }

            if (!newParent) {
                console.warn(`父节点 ${item.parent} 不存在，无法添加节点 ${item.name}，跳过`)
                return
            }

            // 已存在且无父节点的节点跳过；新建节点需添加到父节点才能渲染
            if (!isNewNode && !node.parent) return

            // 防止循环引用：检查新父节点是否在 node 的后代中
            let isDescendant = false
            node.traverse((desc) => {
                if (desc === newParent) isDescendant = true
            })
            if (isDescendant) {
                console.warn(`不能将节点 ${item.name} 移动到其后代 ${item.parent} 下`)
                return
            }

            if (item.isAttach === true || item.isAttach === undefined || item.isAttach === null) {
                // 使用 attach 方法移动节点，保持世界坐标系中的位置/旋转/缩放不变
                // attach 会自动计算并设置节点在新父节点局部坐标系中的变换
                newParent.attach(node)
            } else {
                // 如果节点已经有父节点，先移除
                if (node.parent) {
                    node.parent.remove(node)
                }
                // 添加到新父节点
                newParent.add(node)
                // 更新矩阵
                node.updateMatrixWorld(true)
                newParent.updateMatrixWorld(true)
            }
        })
        // 触发根节点矩阵更新
        root.updateMatrixWorld(true)
    }

    /**
     * 创建围栏
     * @author LL
     * @since 2025/08/26
     * @param modelInfo
     * @returns {*}
     */
    public async initFence(fenceInfo?: fenceInfoParams) {
        let defaultParams = {
            modelName: `fence-group-${new Date().getTime()}`,
            base: {
                height: 2,
                closed: false,
                children: [
                    { x: 0, y: 0, z: 0 },
                    { x: 10, y: 0, z: 0 }
                ]
            },
            material: {
                type: 'image',
                color: {
                    color: '#4CAF50', // 绿色半透明
                    opacity: 0.9 // 增加透明度以便更好地看到
                },
                image: {
                    // 水平密度：每 1 世界单位重复次数，实际 repeatX = 密度 × 两点间距
                    repeatX: 1,
                    // 高度方向重复次数（贴图铺满整段围栏高度）
                    repeatY: 1,
                    url: this.TO.sceneData.params.resource.serverAddress + '/image/download/fence_483579.png'
                },
                doubleSide: true
            }
        }
        let params = merge(defaultParams, fenceInfo)

        if (params.base.children.length <= 1) {
            console.warn('数据长度不足，无法创建围栏')
            return
        }

        if (params.base.closed && params.base.children.length > 2) {
            params.base.children.push(params.base.children[0])
        }

        let group = this.initGroup({ modelName: params.modelName })
        const height = params.base.height
        const densityX = params.material.image.repeatX || 1
        const densityY = params.material.image.repeatY || 1

        // 重新创建所有围栏片段
        for (let i = 0; i < params.base.children.length - 1; i++) {
            const start = params.base.children[i]
            const end = params.base.children[i + 1]
            const distance = this.tool.getPointDistance(start, end)
            if (distance <= 0) continue

            // 按两点间距自动计算贴图重复，保证不同长度围栏纹理密度一致
            const repeatX = distance * densityX
            const repeatY = densityY

            let center = {
                x: (start.x + end.x) / 2,
                y: Math.min(start.y, end.y) + height / 2,
                z: (start.z + end.z) / 2
            }

            // 计算围栏的旋转角度（朝向）- 修正角度计算
            const deltaX = end.x - start.x
            const deltaZ = end.z - start.z
            const angle = -Math.atan2(deltaZ, deltaX)

            // 几何尺寸直接等于段长/高度，避免再用 scale 放大默认 10×10 平面
            const fencePlane = await this.initPlane({
                modelName: `${params.modelName}-${i}`,
                position: center,
                scale: { x: 1, y: 1, z: 1 },
                rotation: {
                    x: 0,
                    y: angle,
                    z: 0
                },
                base: {
                    type: 'rect',
                    rect: {
                        width: distance,
                        height: height
                    }
                },
                material: {
                    ...params.material,
                    image: {
                        ...params.material.image,
                        repeatX,
                        repeatY
                    }
                }
            })
            group.add(fencePlane)
        }

        return setModelConfig(group, defaultParams, this.TO)
    }

    /**
     * 创建LOD（Level of Detail）对象
     * 支持两种模式：
     * 1. 距离模式：根据距离阈值自动切换不同细节层次的模型（传统LOD）
     * 2. 性能模式：根据设备性能自动选择合适细节层次的模型
     * 自动检测模式：如果levels中有distance属性，使用距离模式；否则使用性能模式
     * @author gj
     * @since 2025/08/20
     * @param {modelInfoParams} modelInfo 模型参数
     * @param {string} mode 可选，强制指定模式：'distance' | 'performance' | 'auto'（默认自动检测）
     * @param {boolean} disableCache 可选，是否禁用缓存（默认不禁用）
     */
    public async initLOD(
        modelInfo?: modelInfoParams,
        mode: 'distance' | 'performance' | 'auto' = 'auto',
        disableCache: boolean = false
    ): Promise<Object3D> {
        let defaultParams = {
            modelName: 'lod-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            },
            base: {
                levels: [
                    {
                        performance: 'high', // 高性能设备使用
                        modelType: 'sphere', // 模型类型
                        base: {
                            radius: 10,
                            widthSegments: 32,
                            heightSegments: 32
                        },
                        material: {
                            color: '#ff0000'
                        }
                    },
                    {
                        performance: 'medium', // 中等性能设备使用
                        modelType: 'sphere', // 模型类型
                        base: {
                            radius: 10,
                            widthSegments: 16,
                            heightSegments: 16
                        },
                        material: {
                            color: '#00ff00'
                        }
                    },
                    {
                        performance: 'low', // 低性能设备使用
                        modelType: 'sphere', // 模型类型
                        base: {
                            radius: 10,
                            widthSegments: 8,
                            heightSegments: 8
                        },
                        material: {
                            color: '#0000ff'
                        }
                    }
                ]
            }
        }
        let param = merge(defaultParams, modelInfo)
        //单独处理levels，避免一些其他自定义的属性合并，影响levels
        param.base.levels = modelInfo?.base?.levels || defaultParams.base.levels

        if (param.base.levels.length === 0) {
            console.error('LOD levels 不能为空')
            const emptyGroup = new Object3D()
            emptyGroup.name = param.modelName || 'empty-lod'
            return emptyGroup
        }

        // 自动检测模式：检查levels中是否有distance属性
        let lodMode: 'distance' | 'performance' = 'performance'
        if (mode === 'auto') {
            // 检查是否有任何level包含distance属性
            const hasDistance = param.base.levels.some(
                (level: any) => level.distance !== undefined && level.distance !== null
            )
            lodMode = hasDistance ? 'distance' : 'performance'
        } else {
            lodMode = mode
        }

        console.log(`LOD模式: ${lodMode}`)

        // 距离模式：创建LOD对象，根据距离自动切换
        if (lodMode === 'distance') {
            // 创建LOD对象
            const lod = new LOD()

            // 为每个细节层次创建模型
            for (let i = 0; i < param.base.levels.length; i++) {
                const level = param.base.levels[i]
                const distance =
                    level.distance !== undefined && level.distance !== null ? level.distance : i * 50

                // 合并当前层次的模型信息
                const levelModelInfo = merge({}, level, {
                    modelType: level.modelType,
                    position: param.position,
                    scale: param.scale,
                    rotation: param.rotation
                })

                // 直接调用 loadModel 方法创建模型
                const model = await this.loadModel(levelModelInfo)

                // 将模型添加到LOD中，设置距离阈值
                lod.addLevel(model, distance)
            }

            return setModelConfig(lod, param, this.TO)
        }

        // 性能模式：根据设备性能自动选择模型级别
        // 检测设备性能等级
        const devicePerformance = detectDevicePerformance(this.TO?.renderer?.webglRenderer ?? undefined, {
            disableCache: disableCache
        })
        console.log(`设备性能等级: ${devicePerformance}`)

        // 根据性能等级选择对应的模型级别
        // 优先级: 精确匹配 > 降级匹配（high -> medium -> low）
        let selectedLevel = null
        const performanceOrder = ['high', 'medium', 'low']
        const currentIndex = performanceOrder.indexOf(devicePerformance)

        // 首先尝试精确匹配
        selectedLevel = param.base.levels.find((level: any) => level.performance === devicePerformance)

        // 如果没有精确匹配，尝试降级匹配（从当前级别向下查找）
        if (!selectedLevel) {
            for (let i = currentIndex; i < performanceOrder.length; i++) {
                selectedLevel = param.base.levels.find(
                    (level: any) => level.performance === performanceOrder[i]
                )
                if (selectedLevel) break
            }
        }

        // 如果还是没有找到，使用第一个级别或最后一个级别
        if (!selectedLevel) {
            selectedLevel = param.base.levels[0] || param.base.levels[param.base.levels.length - 1]
        }

        if (!selectedLevel) {
            console.error('未找到合适的LOD级别')
            const emptyGroup = new Object3D()
            emptyGroup.name = param.modelName || 'empty-lod'
            return emptyGroup
        }

        console.log(`选择的LOD级别: ${selectedLevel.performance || 'default'}`)

        // 合并当前层次的模型信息
        const levelModelInfo = merge({}, selectedLevel, {
            modelType: selectedLevel.modelType,
            position: param.position,
            scale: param.scale,
            rotation: param.rotation
        })

        // 直接调用 loadModel 方法创建模型
        const model = await this.loadModel(levelModelInfo)

        // 返回配置好的模型（性能模式直接返回选中的模型）
        return setModelConfig(model, param, this.TO)
    }

    /**
     * 创建压缩包导入模型（支持gltf/glb/fbx/obj/stl/json及跨目录纹理）
     * @author gj
     * @since 2025/06/13
     * @update 2026/04/24 (性能优化版：异步解压、合并遍历、减少主线程阻塞)
     * @note 下载 → Worker 解压 → 建文件映射 → 选模型 → 独立 LoadingManager + setURLModifier（把贴图 URL 重写成 Blob URL）→ loadWithConfig → FBX 贴图自动修复 → 清理 Blob。
     * @param {modelInfoParams} modelInfo 模型参数数组
     */
    public async initZip(modelInfo?: modelInfoParams): Promise<Object3D> {
        if (!modelInfo?.base?.modelUrl) {
            const error = new Error('没有可导入的文件!')
            console.error(error.message)
            return Promise.reject(error)
        }

        let pendingBlobURLs: string[] = [] // 所有创建的 Blob URL
        let usedBlobURLs = new Set<string>() // 实际被加载器请求过的 URL

        try {
            // 下载 ZIP 文件
            const zipArrayBuffer = await fetchArrayBuffer(modelInfo.base.modelUrl)
            const zipUint8Array = new Uint8Array(zipArrayBuffer)

            // Worker 分批解压，避免大 zip 阻塞主线程
            // 主线程下载 zip → 交给 Worker 解压 → Worker 每 xx 个文件一批传回来 → unzipPool 拼成完整字典 → initZip 用这份字典加载模型和贴图。
            const decompressedFiles = await unzipPool.unzip(zipUint8Array)

            if (Object.keys(decompressedFiles).length === 0) {
                throw new Error('没有可导入的文件: zip为空')
            }

            type ZipFileInfo = {
                content: ArrayBuffer // 文件内容
                originalPath: string // 原始路径
                blob: Blob | null // 文件 Blob
                blobURL: string | null // 文件 Blob URL
            }

            const ensureZipBlob = (info: ZipFileInfo): string => {
                if (!info.blobURL) {
                    const ext = getFileExtension(info.originalPath).toLowerCase()
                    info.blob = new Blob([info.content], { type: getMimeType(ext) })
                    info.blobURL = URL.createObjectURL(info.blob)
                    pendingBlobURLs.push(info.blobURL)
                }
                return info.blobURL
            }

            // 让出主线程，避免阻塞主线程
            const yieldMain = () => new Promise<void>((r) => setTimeout(r, 0))

            // 遍历构建映射 + 筛选可导入模型（分批让出主线程）
            const fileNameToFileInfoMap = new Map<string, ZipFileInfo>() // 文件名到文件信息映射
            const importableModels: Array<{
                // 可导入模型列表
                name: string
                type: string
                file: Blob
                blobURL: string
                originalPath: string
            }> = []
            const objectUrlToFileName = new Map<string, string>() // 文件 Blob URL 到文件名映射

            const entries = Object.entries(decompressedFiles)
            const MAP_CHUNK = 80 // 分批处理数量

            for (let i = 0; i < entries.length; i++) {
                const [originalPath, content] = entries[i]
                const fileName = getFileName(originalPath)
                const ext = getFileExtension(originalPath).toLowerCase()
                const lowerFileName = fileName.toLowerCase()

                const fileInfo: ZipFileInfo = {
                    content,
                    originalPath,
                    blob: null,
                    blobURL: null
                }
                fileNameToFileInfoMap.set(lowerFileName, fileInfo)

                // 可导入模型提前建 Blob（数量通常很少）
                if (this.getLoaderConfig(ext)) {
                    const blobURL = ensureZipBlob(fileInfo)
                    importableModels.push({
                        name: originalPath,
                        type: ext,
                        file: fileInfo.blob!,
                        blobURL,
                        originalPath
                    })
                }

                if (i > 0 && i % MAP_CHUNK === 0) await yieldMain() // 分批让出主线程
            }

            if (importableModels.length === 0) {
                throw new Error('没有可导入的文件: zip中没有支持的模型文件')
            }

            // 多模型选择 - 使用 selectModel 参数指定，未指定则弹窗
            // 支持 selectModel 从 modelInfo 中读取
            const preferredModelName = modelInfo?.base?.selectModel
            let selectedModel: (typeof importableModels)[0]

            if (importableModels.length > 1 && preferredModelName) {
                // 使用指定的模型名称
                const matchedModel = importableModels.find((m) => m.name === preferredModelName)
                if (matchedModel) {
                    selectedModel = matchedModel
                    console.log('使用指定的模型:', selectedModel)
                } else {
                    // 指定的模型不在 ZIP 中，弹窗选择
                    console.warn(`指定的模型 "${preferredModelName}" 不在 ZIP 中，将弹窗选择`)
                    selectedModel = await this.selectModelFromDialog(importableModels)
                }
            } else if (importableModels.length > 1) {
                // 未指定模型名称：显示弹窗选择
                selectedModel = await this.selectModelFromDialog(importableModels)
            } else {
                // 只有一个模型，直接使用
                selectedModel = importableModels[0]
            }

            const modelType = selectedModel.type
            const modelConfig = this.getLoaderConfig(modelType)
            if (!modelConfig) throw new Error(`未定义模型类型: ${modelType}，导入失败`)

            const mainFileUrl = selectedModel.blobURL

            // 创建 LoadingManager，等待所有资源加载完成
            // 创建独立的 LoadingManager 用于 ZIP 加载 使其具有隔离性, 避免全局状态污染风险, 另外 ZIP 加载完成后需要清理
            // 关键：不能使用 this.MANAGER，因为 ZIP 加载需要独立的 URL 修改器， URL 重写需求不同：
            // (1) 普通加载：直接加载服务器上的文件，URL 是标准的 HTTP/HTTPS 路径
            // (2) ZIP 加载：需要从 ZIP 包内的文件加载，URL 是 Blob URL (blob:http://...)
            const loadingManager = new LoadingManager()
            let resolveAllLoaded: () => void
            const allResourcesLoaded = new Promise<void>((resolve) => {
                resolveAllLoaded = resolve
            })
            loadingManager.onLoad = () => resolveAllLoaded()

            // 注册 TGA 处理器，ZIP 加载需要独立的 TGALoader 实例
            if (modelConfig.TGA) {
                loadingManager.addHandler(/\.tga$/i, new TGALoader(loadingManager))
            }

            // URL 重写 + 记录被使用的 Blob URL
            loadingManager.setURLModifier((url) => {
                if (url === mainFileUrl) return url
                const fileName = getFileName(url)
                const lowerFileName = fileName.toLowerCase()
                if (fileNameToFileInfoMap.has(lowerFileName)) {
                    const fileInfo = fileNameToFileInfoMap.get(lowerFileName)!
                    const blobUrl = ensureZipBlob(fileInfo)
                    usedBlobURLs.add(blobUrl)
                    objectUrlToFileName.set(blobUrl, fileName)
                    return blobUrl
                }
                console.warn(`缺少文件: ${fileName} (不在zip中)`)
                return url
            })

            return await this.loadWithConfig(modelConfig, mainFileUrl, {
                manager: loadingManager,
                onProgress: (progress) => modelInfo.onProgress?.(progress),
                preExtract: async () => {
                    // 等待所有资源加载完成
                    await allResourcesLoaded
                },
                afterExtract: async (mainObject) => {
                    // 提取主对象
                    if (!mainObject) throw new Error('导入失败: 没有主对象')

                    if (modelType.toLowerCase() === 'fbx') {
                        await this.autoRepairFbxMaps(
                            mainObject,
                            fileNameToFileInfoMap,
                            selectedModel.originalPath,
                            modelInfo?.base?.repairSlotLimit,
                            { ensureBlobUrl: ensureZipBlob }
                        )
                    }

                    // WebGPU：修复 FBX ReflectionColor 等 2D envMap 触发的 cube view 校验错误
                    this.fixWebGPUEnvMaps(mainObject)

                    // 设置模型配置
                    const finalModel = setModelConfig(
                        mainObject,
                        {
                            ...modelInfo,
                            modelType,
                            modelName: modelInfo?.modelName || `zipModel-${Date.now()}`,
                            base: {
                                loadType: modelType || 'zip',
                                selectModel: selectedModel.name,
                                repairSlotLimit: modelInfo?.base?.repairSlotLimit ?? 500
                            }
                        },
                        this.TO
                    )

                    // 清理未使用的 Blob URL
                    const unusedURLs = pendingBlobURLs.filter((url) => !usedBlobURLs.has(url))
                    this.revokeBlobURLs(unusedURLs)
                    return finalModel
                },
                onError: (err) => {
                    console.error(`模型导入失败 (${modelType}):`, err)
                    this.revokeBlobURLs(pendingBlobURLs)
                }
            })
        } catch (error) {
            console.error('压缩包导入失败:', error)
            if (pendingBlobURLs.length > 0) this.revokeBlobURLs(pendingBlobURLs)
            return Promise.reject(error as Error)
        }
    }
    /**
     * WebGPU 下修复非法 envMap（典型：FBX ReflectionColor → 2D 贴图 + EquirectangularReflectionMapping）。
     * Phong/BasicEnvironmentNode/CubeMapNode 在贴图未就绪时会落到空 CubeTexture（GPU 上常为 1x1×1 层），
     * CreateView(cube, arrayLayerCount:6) 触发 GPUValidationError。
     * 处理：Phong/Lambert 升为 Standard（走 scene.environment / PMREM）；其它材质清除非 Cube 的 envMap。
     * @author gj
     * @since 2026/08/12
     */
    private fixWebGPUEnvMaps(root: Object3D): void {
        if (!this.TO.renderer?.isWebGPU || !root) return

        root.traverse((obj: any) => {
            if (!obj.isMesh || !obj.material) return
            const list = Array.isArray(obj.material) ? obj.material : [obj.material]
            const next = list.map((mat: Material) => this.fixWebGPUEnvMapMaterial(mat))
            obj.material = Array.isArray(obj.material) ? next : next[0]
        })
    }

    /**
     * 单材质：非法 2D envMap → Phong/Lambert 转 Standard；其余材质清空 envMap
     */
    private fixWebGPUEnvMapMaterial(mat: Material): Material {
        if (!mat) return mat
        const m = mat as any
        const badEnv = !!(m.envMap && !m.envMap.isCubeTexture)

        if (badEnv && (m.isMeshPhongMaterial || m.isMeshLambertMaterial)) {
            const std = new MeshStandardMaterial()
            std.name = m.name
            std.color.copy(m.color)
            std.map = m.map
            std.lightMap = m.lightMap
            std.lightMapIntensity = m.lightMapIntensity
            std.aoMap = m.aoMap
            std.aoMapIntensity = m.aoMapIntensity
            if (m.emissive) std.emissive.copy(m.emissive)
            std.emissiveMap = m.emissiveMap
            std.emissiveIntensity = m.emissiveIntensity ?? 1
            std.normalMap = m.normalMap
            if (m.normalScale) std.normalScale.copy(m.normalScale)
            std.bumpMap = m.bumpMap
            std.bumpScale = m.bumpScale
            std.displacementMap = m.displacementMap
            std.displacementScale = m.displacementScale
            std.displacementBias = m.displacementBias
            std.alphaMap = m.alphaMap
            std.transparent = m.transparent
            std.opacity = m.opacity
            std.side = m.side
            std.depthWrite = m.depthWrite
            std.depthTest = m.depthTest
            std.wireframe = m.wireframe
            std.vertexColors = m.vertexColors
            std.flatShading = m.flatShading
            std.userData = { ...m.userData }
            // shininess(0~100) → roughness 粗估；反射改由场景 environment 提供
            std.roughness =
                typeof m.shininess === 'number' ? Math.max(0.04, 1 - Math.min(m.shininess, 100) / 100) : 0.6
            std.metalness = 0.05
            m.dispose()
            return std
        }

        if (badEnv) {
            m.envMap = null
            m.needsUpdate = true
        }
        return mat
    }

    /**
     * 自动修复 FBXLoader 不支持槽位导致丢失的贴图（按文件名启发式匹配）。
     * 典型场景：3dsMax 的 base_color_map 被跳过后，自动回填到 map。
     * 优先级：模型目录 > 模型目录下的 textures 子目录 > 文件名 > 贴图槽位关键词
     * @author gj
     * @since 2026/04/14
     * @update 2026/04/24 (性能优化版：加权打分(比精准文件匹配更准确，避免文件命名不规范问题) + 三阶段批量加载 + 全局缓存 + 索引加速)
     * @param {Object3D} root 根模型节点
     * @param {Map<string, { content: ArrayBuffer; originalPath: string; blob: Blob; blobURL: string | null }>} fileMap 文件映射
     * @param {string} mainModelPath 主模型路径
     * @param {number} repairSlotLimit 修复槽位上限
     * @param {object} options 可选配置
     */
    private async autoRepairFbxMaps(
        root: Object3D,
        fileMap: Map<
            string,
            { content: ArrayBuffer; originalPath: string; blob: Blob | null; blobURL: string | null }
        >,
        mainModelPath?: string,
        repairSlotLimit?: number,
        options?: {
            maxNewTextures?: number
            concurrency?: number
            verbose?: boolean
            ensureBlobUrl?: (f: {
                content: ArrayBuffer
                originalPath: string
                blob: Blob | null
                blobURL: string | null
            }) => string
        }
    ): Promise<void> {
        const CONCURRENCY = options?.concurrency ?? 8 // 提高并发数
        const MAX_NEW_TEXTURES = options?.maxNewTextures ?? 300 // 最大同时加载纹理数量
        const REPAIR_SLOT_LIMIT = repairSlotLimit ?? 500 // 修复槽位上限

        // 过滤出纹理文件
        const textureFiles = [...fileMap.values()].filter((f) => {
            const ext = getFileExtension(f.originalPath).toLowerCase()
            return ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tga'].includes(ext)
        })
        if (textureFiles.length === 0) return

        const modelDir = getDirPath(mainModelPath || '')
        const modelTexturesDir = modelDir ? `${modelDir}/textures` : 'textures'

        // ---------- 预计算候选纹理分数 ----------
        interface PrecomputedCandidate {
            url: string
            originalPath: string
            normName: string
            cacheKey: string
            dirScore: number // 80 或 70 或 0
            keywordScores: {
                // 各槽位关键词分数（0 或 40）
                map: number
                normalMap: number
                metalnessMap: number
                roughnessMap: number
                aoMap: number
            }
            tgaScore: number // 5 或 0
            isTga: boolean
        }

        // 用于按 normName 索引的 Map (支持同名多候选)
        const nameIndex = new Map<string, PrecomputedCandidate[]>()
        const candidatesList: PrecomputedCandidate[] = []

        for (const f of textureFiles) {
            const originalPath = f.originalPath
            const url = options?.ensureBlobUrl ? options.ensureBlobUrl(f) : f.blobURL!
            const name = getFileName(originalPath)
            const normName = normalizeName(name)
            const lowerPath = originalPath.toLowerCase()
            const isTga = /\.tga$/i.test(originalPath)
            const size = f.content.byteLength
            const cacheKey = `${originalPath}|${size}`

            // 计算目录分
            let dirScore = 0
            const dir = getDirPath(originalPath)
            if (dir === modelDir) dirScore = 80
            else if (dir === modelTexturesDir || dir.startsWith(`${modelTexturesDir}/`)) dirScore = 70

            // 计算关键词分（预计算）
            const keywordScores = {
                map: /basecolor|base_color|albedo|diffuse|color|col/.test(lowerPath) ? 40 : 0,
                normalMap: /normal|nrm/.test(lowerPath) ? 40 : 0,
                metalnessMap: /metalness|metallic|metal/.test(lowerPath) ? 40 : 0,
                roughnessMap: /roughness|rough/.test(lowerPath) ? 40 : 0,
                aoMap: /ao|occlusion|ambientocclusion/.test(lowerPath) ? 40 : 0
            }
            const tgaScore = isTga ? 5 : 0

            const candidate: PrecomputedCandidate = {
                url,
                originalPath,
                normName,
                cacheKey,
                dirScore,
                keywordScores,
                tgaScore,
                isTga
            }
            candidatesList.push(candidate)
            if (!nameIndex.has(normName)) nameIndex.set(normName, [])
            nameIndex.get(normName)!.push(candidate)
        }

        // ---------- 快速匹配函数（缓存结果）----------
        const matchCache = new Map<string, PrecomputedCandidate | null>()
        const findBestTexture = (
            matName: string,
            slot: keyof PrecomputedCandidate['keywordScores']
        ): PrecomputedCandidate | null => {
            const cacheKey = `${matName}|${slot}`
            if (matchCache.has(cacheKey)) return matchCache.get(cacheKey)!

            const matNorm = normalizeName(matName)
            let best: PrecomputedCandidate | null = null
            let bestScore = 0

            // 1. 完全匹配（直接从索引取）
            const exactMatches = nameIndex.get(matNorm)
            if (exactMatches) {
                for (const cand of exactMatches) {
                    let score = 120 + cand.dirScore + cand.keywordScores[slot] + cand.tgaScore
                    if (score > bestScore) {
                        bestScore = score
                        best = cand
                    }
                }
            }

            // 2. 前缀匹配（遍历所有候选，但只计算一次前缀匹配分数）
            if (!best) {
                for (const cand of candidatesList) {
                    if (cand.normName.startsWith(matNorm)) {
                        let score = 90 + cand.dirScore + cand.keywordScores[slot] + cand.tgaScore
                        if (score > bestScore) {
                            bestScore = score
                            best = cand
                        }
                    }
                }
            }

            // 3. 包含匹配（仍然需要遍历，但可以限制候选数量？ 暂时全量）
            if (!best) {
                for (const cand of candidatesList) {
                    if (cand.normName.includes(matNorm) || matNorm.includes(cand.normName)) {
                        let score = 70 + cand.dirScore + cand.keywordScores[slot] + cand.tgaScore
                        if (score > bestScore) {
                            bestScore = score
                            best = cand
                        }
                    }
                }
            }

            // 4. 如果还没有，尝试只使用目录+关键词分（不含文件名匹配分）
            if (!best) {
                for (const cand of candidatesList) {
                    let score = cand.dirScore + cand.keywordScores[slot] + cand.tgaScore
                    if (score > bestScore) {
                        bestScore = score
                        best = cand
                    }
                }
            }

            const result = best && bestScore > 0 ? best : null
            matchCache.set(cacheKey, result)
            return result
        }

        // ---------- 全局纹理缓存 ----------
        const globalCache = (this.constructor as any).globalTextureCache
        let newTexturesLoaded = 0

        const loadSingleTexture = async (cand: PrecomputedCandidate): Promise<Texture | null> => {
            if (globalCache.has(cand.cacheKey)) return globalCache.get(cand.cacheKey)
            if (newTexturesLoaded >= MAX_NEW_TEXTURES) return null
            newTexturesLoaded++
            try {
                let texture: Texture
                if (cand.originalPath.toLowerCase().endsWith('.tga')) {
                    const loader = new TGALoader()
                    loader.setCrossOrigin('anonymous')
                    texture = await loader.loadAsync(cand.url)
                } else {
                    const loader = new TextureLoader()
                    loader.setCrossOrigin('anonymous')
                    texture = await loader.loadAsync(cand.url)
                }
                globalCache.set(cand.cacheKey, texture)
                return texture
            } catch (err) {
                console.warn(`[FBX修复] 纹理加载失败: ${cand.originalPath}`, err)
                return null
            } finally {
                if (cand.url?.startsWith('blob:')) URL.revokeObjectURL(cand.url)
            }
        }

        // ---------- 第一阶段：收集请求 ----------
        const fixedMaterials = new Map<Material, boolean>()
        const materialUpgradeMap = new Map<Material, MeshStandardMaterial>()
        const uniqueTextureRequests = new Map<string, PrecomputedCandidate>()
        const assignments: { targetMat: Material; slot: string; cacheKey: string }[] = []

        const meshes: Mesh[] = []
        root.traverse((obj: any) => {
            if (obj.isMesh && obj.material) meshes.push(obj)
        })

        let repairedSlotCount = 0
        for (const mesh of meshes) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const originalMat of materials) {
                if (!originalMat || fixedMaterials.has(originalMat)) continue
                fixedMaterials.set(originalMat, true)

                //仅当原材质不是 MeshStandardMaterial 且确实需要 PBR 贴图时才升级， 验证是否有metalnessMap和roughnessMap
                const matName = String((originalMat as any).name || '')
                const wantsPbr =
                    (!('metalnessMap' in originalMat) && !!findBestTexture(matName, 'metalnessMap')) ||
                    (!('roughnessMap' in originalMat) && !!findBestTexture(matName, 'roughnessMap'))
                const isStandardOrPhysical =
                    (originalMat as any).isMeshStandardMaterial === true ||
                    (originalMat as any).isMeshPhysicalMaterial === true

                let targetMat: Material = originalMat
                if (wantsPbr && !isStandardOrPhysical) {
                    if (!materialUpgradeMap.has(originalMat)) {
                        const upgraded = new MeshStandardMaterial({
                            color: (originalMat as any).color ?? 0xffffff,
                            map: (originalMat as any).map ?? null,
                            normalMap: (originalMat as any).normalMap ?? null,
                            emissive: (originalMat as any).emissive ?? 0x000000,
                            emissiveIntensity: (originalMat as any).emissiveIntensity ?? 1,
                            transparent: !!(originalMat as any).transparent,
                            opacity: (originalMat as any).opacity ?? 1,
                            side: (originalMat as any).side
                        })
                        materialUpgradeMap.set(originalMat, upgraded)
                    }
                    targetMat = materialUpgradeMap.get(originalMat)!
                }

                const slots = ['map', 'normalMap', 'metalnessMap', 'roughnessMap', 'aoMap']
                for (const slot of slots) {
                    if (repairedSlotCount >= REPAIR_SLOT_LIMIT) break
                    if ((targetMat as any)[slot]) continue
                    const best = findBestTexture(matName, slot as keyof PrecomputedCandidate['keywordScores'])
                    if (!best) continue
                    if (!uniqueTextureRequests.has(best.cacheKey)) {
                        uniqueTextureRequests.set(best.cacheKey, best)
                    }
                    assignments.push({ targetMat, slot, cacheKey: best.cacheKey })
                    repairedSlotCount++
                }
            }
        }

        if (assignments.length === 0) return

        // ---------- 第二阶段：批量并发加载纹理 ----------
        const uniqueCands = Array.from(uniqueTextureRequests.values())
        for (let i = 0; i < uniqueCands.length; i += CONCURRENCY) {
            const batch = uniqueCands.slice(i, i + CONCURRENCY)
            await Promise.all(batch.map((cand) => loadSingleTexture(cand)))
        }

        // ---------- 第三阶段：应用 ----------
        // 替换升级材质
        for (const [originalMat, upgradedMat] of materialUpgradeMap.entries()) {
            root.traverse((obj: any) => {
                if (obj.isMesh) {
                    if (Array.isArray(obj.material)) {
                        const idx = obj.material.indexOf(originalMat)
                        if (idx !== -1) obj.material[idx] = upgradedMat
                    } else if (obj.material === originalMat) {
                        obj.material = upgradedMat
                    }
                }
            })
        }

        // 纹理赋值 + 颜色空间 + 更新标记
        for (const assign of assignments) {
            const tex = globalCache.get(assign.cacheKey)
            if (!tex) continue
            if (assign.slot === 'map') tex.colorSpace = SRGBColorSpace
            else if (assign.slot === 'normalMap') tex.colorSpace = NoColorSpace
            else tex.colorSpace = LinearSRGBColorSpace
            ;(assign.targetMat as any)[assign.slot] = tex
            if (assign.slot === 'aoMap') {
                root.traverse((obj: any) => {
                    if (obj.isMesh) {
                        const usesMat =
                            obj.material === assign.targetMat ||
                            (Array.isArray(obj.material) && obj.material.includes(assign.targetMat))
                        if (usesMat && obj.geometry?.attributes?.uv && !obj.geometry?.attributes?.uv2) {
                            obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv.clone())
                        }
                    }
                })
            }
            assign.targetMat.needsUpdate = true
        }

        const modelFileName = mainModelPath ? getFileName(mainModelPath) : '未命名'
        console.info(
            `[FBX修复] 模型: ${modelFileName}, 材质数: ${fixedMaterials.size}, 新纹理: ${newTexturesLoaded}, 修复槽位: ${repairedSlotCount}`
        )
    }
    /**
     * 撤销指定的 Blob URL（用于单次 initZip 的局部清理，不触碰实例级状态）
     * @author gj
     * @since 2026/01/30
     */
    private revokeBlobURLs(urls: string[]): void {
        urls.forEach((url) => {
            try {
                URL.revokeObjectURL(url)
                if (typeof (window as any).RevokeObjectUrl === 'function') {
                    ;(window as any).RevokeObjectUrl(url)
                }
            } catch (e) {
                console.warn('撤销Blob URL失败:', e, url)
            }
        })
    }

    /**
     * 资源清理（清空实例级映射并撤销所有待清理的 Blob URL）
     * @author gj
     * @since 2025/12/15
     */
    private cleanupResources(): void {
        // 撤销所有 Blob URL
        this.pendingBlobURLs.forEach((url) => {
            try {
                URL.revokeObjectURL(url)
                if (typeof (window as any).RevokeObjectUrl === 'function') {
                    ;(window as any).RevokeObjectUrl(url)
                }
            } catch (e) {
                console.warn('撤销Blob URL失败:', e, url)
            }
        })
        // 清空所有映射
        this.fileNameToFileInfoMap.clear()
        this.objectUrlToFileName.clear()
        this.pendingBlobURLs = []
    }

    /**
     * 从弹窗选择模型（zip导入模型时使用）
     * @author gj
     * @since 2026/04/30
     * @param importableModels 可导入的模型列表
     * @returns {Promise<{ name: string; type: string; file: Blob; blobURL: string; originalPath: string }>} 选中的模型
     */
    private async selectModelFromDialog(
        importableModels: Array<{
            name: string
            type: string
            file: Blob
            blobURL: string
            originalPath: string
        }>
    ): Promise<{ name: string; type: string; file: Blob; blobURL: string; originalPath: string }> {
        const selectionItems = importableModels.map((m) => ({
            name: m.name,
            type: m.type,
            file: m.file
        }))

        const selected = await this.showModelSelectionDialog(selectionItems)

        // 返回完整的模型信息
        return importableModels.find((m) => m.name === selected.name && m.type === selected.type)!
    }

    /**
     * 显示模型选择弹窗（zip导入模型时使用）
     * @author gj
     * @since 2025/12/15
     * @param {Array<{ name: string; type: string; file: Blob }>} models 模型文件列表
     * @param models 模型文件列表
     * @returns {Promise<{ name: string; type: string; file: Blob }>} 选中的模型文件
     */
    private showModelSelectionDialog(
        models: Array<{ name: string; type: string; file: Blob }>
    ): Promise<{ name: string; type: string; file: Blob }> {
        return new Promise((resolve, reject) => {
            const overlay = document.createElement('div')
            overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(2px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            padding: 16px;
          `

            const dialog = document.createElement('div')
            dialog.style.cssText = `
            background: #fff;
            padding: 20px 22px 16px 22px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
            max-width: 520px;
            width: min(92%, 520px);
            max-height: 80vh;
            overflow-y: auto;
            font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
          `

            const title = document.createElement('h3')
            title.textContent = '找到多个可导入的模型，请选择要导入的模型'
            title.style.cssText = 'margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #111;'
            dialog.appendChild(title)

            const list = document.createElement('div')
            list.style.cssText = 'margin-bottom: 12px; display: grid; gap: 10px;'

            models.forEach((model) => {
                const item = document.createElement('div')
                item.style.cssText = `
                padding: 12px 12px;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.16s ease;
                background: #fafafa;
                box-shadow: 0 2px 6px rgba(0,0,0,0.06);
                display: flex;
                flex-direction: column;
                gap: 6px;
              `
                item.onmouseover = () => {
                    item.style.borderColor = '#4CAF50'
                    item.style.background = '#f6fff8'
                    item.style.boxShadow = '0 4px 10px rgba(0,0,0,0.12)'
                }
                item.onmouseout = () => {
                    item.style.borderColor = '#ddd'
                    item.style.background = '#fafafa'
                    item.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'
                }
                item.onclick = () => {
                    overlay.remove()
                    resolve(model)
                }

                const name = document.createElement('div')
                name.textContent = model.name
                name.style.cssText =
                    'font-weight: 600; margin-bottom: 4px; word-break: break-all; color: #111;'
                item.appendChild(name)

                const type = document.createElement('div')
                type.textContent = `Format: ${model.type.toUpperCase()}`
                type.style.cssText = 'color: #666; font-size: 12px; letter-spacing: 0.2px;'
                item.appendChild(type)

                list.appendChild(item)
            })

            dialog.appendChild(list)

            const actions = document.createElement('div')
            actions.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;'

            const cancelBtn = document.createElement('button')
            cancelBtn.textContent = '取消'
            cancelBtn.style.cssText = `
            padding: 9px 16px;
            background: #f44336;
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            min-width: 78px;
            font-weight: 600;
            letter-spacing: 0.2px;
            transition: all 0.16s ease;
          `
            cancelBtn.onclick = () => {
                overlay.remove()
                reject(new Error('用户取消文件选择'))
            }
            cancelBtn.onmouseover = () => {
                cancelBtn.style.opacity = '0.9'
                cancelBtn.style.boxShadow = '0 6px 14px rgba(244,67,54,0.35)'
            }
            cancelBtn.onmouseout = () => {
                cancelBtn.style.opacity = '1'
                cancelBtn.style.boxShadow = 'none'
            }

            actions.appendChild(cancelBtn)
            dialog.appendChild(actions)

            overlay.appendChild(dialog)
            document.body.appendChild(overlay)
        })
    }

    /**
     * 创建仿真文字
     * @author MY
     * @param info
     * @param model
     */
    public async initSimTexts(info: any, model: any) {
        //是否带有文字
        const defaultParams = {
            id: 1,
            text: '形状文字',
            modelName: 'traceText',
            modelType: 'text',
            modelSize: null,
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            },
            base: {
                fontUrl:
                    this.TO.sceneData.params.resource.serverAddress +
                    this.TO.sceneData.params.resource.font_Microsoft,
                height: 100,
                text: '形状文字',
                textType: 'shapeText',
                color: '#f00',
                lineWidth: 2,
                opacity: 1,
                size: 1.5
            },
            material: null,
            userData: null
        }
        const urlRes = await this.indexedDB.resolveModelUrl(defaultParams)
        if (urlRes.modelUrl) {
            defaultParams.base.fontUrl = urlRes.modelUrl
        }
        for (const item of info.userData?.sim?.simTexts) {
            Object.assign(defaultParams, item)
            defaultParams.base.text = item.text
            this.font.initTextShape(defaultParams).then((textModel: any) => {
                //ABB机器人文字绑定在轴上
                if (defaultParams.base.text === '夹取') {
                    model.traverse((child: any) => {
                        if (child.name === 'WS30-5') {
                            child.attach(textModel)
                        }
                    })
                } else {
                    model.attach(textModel)
                }
            })
        }
    }

    /**
     * 创建组合模型
     * @author LL
     * @since 2021/07/26
     * @update 2026/07/01 - 整合loadModel方法
     * @param {modelInfoParams} modelInfo 模型参数
     */
    public async initAssemble(modelInfo?: modelInfoParams): Promise<any> {
        let defaultParams = {
            modelName: 'assemble-' + new Date().getTime(),
            base: {
                children: []
            },
            position: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            rotation: { x: 0, y: 0, z: 0 }
        }
        let param = merge(defaultParams, modelInfo)
        const children = param.base?.children || []

        let assemble: Object3D | null = null
        const loadType = param.base?.loadType

        if (loadType === 'shelf') {
            assemble = await this.initShelf(param)
        } else {
            assemble = this.initGroup(param)

            const shelfItems: any[] = []
            const loadItems: modelInfoParams[] = []

            for (const item of children) {
                if (item.base?.loadType === 'shelf') {
                    shelfItems.push(item)
                } else {
                    let childParams = {
                        ...item,
                        modelName: item.modelName || item.name || `child-model-${Date.now()}`,
                        position: item.position || { x: 0, y: 0, z: 0 },
                        rotation: item.rotation ? normRotation(item.rotation) : { x: 0, y: 0, z: 0 },
                        scale: item.scale || { x: 1, y: 1, z: 1 },
                        base: item.base || {}
                    }
                    loadItems.push(childParams)
                    console.log('🚀 ~ :1833 ~ initAssemble ~ item:', item)
                }
            }

            const shelfResults = await Promise.allSettled(
                shelfItems.map(async (item) => {
                    const shelf = await this.initShelf(item)
                    assemble!.add(shelf)
                    return shelf
                })
            )
            const shelfFail = shelfResults.filter((r) => r.status === 'rejected').length
            if (shelfFail > 0) {
                console.warn(`组合模型货架加载: ${shelfItems.length - shelfFail}个成功, ${shelfFail}个失败`)
            }

            if (loadItems.length > 0) {
                const loaded = await this.loadModel(loadItems, (model) => assemble!.add(model))
                if (loaded.length < loadItems.length) {
                    console.warn(
                        `组合模型子项加载: ${loaded.length}个成功, ${loadItems.length - loaded.length}个失败`
                    )
                }
            }
        }

        return setModelConfig(assemble, param, this.TO)
    }

    /**
     * 创建Group
     * @author LL
     * @since 2021/10/26
     * @param modelInfo [modelInfo] 模型参数
     */
    public initGroup(modelInfo?: modelInfoParams): Object3D {
        let defaultParams = {
            modelName: 'group-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            }
        }
        let param = merge(defaultParams, modelInfo)
        let group = new Group()
        return setModelConfig(group, param, this.TO)
    }

    /**
     * 创建立方体
     * @author LL
     * @since 2021/08/19
     * @param {modelInfoParams} [modelInfo] 模型参数
     * @param {*} [material] 材质
     */
    public initCube(modelInfo?: modelInfoParams, material?: any): Object3D {
        let defaultParams = {
            modelName: 'cube-' + new Date().getTime(),
            modelType: 'cube',
            position: {
                x: 0,
                y: 0.5,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            },
            base: {
                width: 1,
                height: 1,
                depth: 1,
                widthSegments: 1,
                heightSegments: 1,
                depthSegments: 1
            },
            material: {
                color: '#f00',
                type: 'MeshLambertMaterial'
            }
        }
        let param = merge(defaultParams, modelInfo)
        let cube: BoxGeometry = new BoxGeometry(
            param.base.width,
            param.base.height,
            param.base.depth,
            param.base.widthSegments,
            param.base.heightSegments,
            param.base.depthSegments
        )

        if (!material) {
            material = new MeshLambertMaterial({ color: param.material.color })
        }

        const geometryObject = new Mesh(cube, material)
        return setModelConfig(geometryObject, param, this.TO)
    }

    /**
     * 创建平面。base.type 为 'rect' 时取 base.rect，为 'shape' 时取 base.shape。
     * @author LL
     * @since 2025/07/16
     * @param {modelInfoParams} [modelInfo]
     */
    public async initPlane(modelInfo?: modelInfoParams): Promise<Object3D> {
        let defaultParams = {
            modelName: 'plane-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: -Math.PI / 2,
                y: 0,
                z: 0
            },
            base: {
                type: 'rect' as 'rect' | 'shape', // rect 矩形，shape 异形
                rect: {
                    width: 10, // 平面在 X 轴方向的宽度
                    height: 10, // 平面在 Y 轴方向的高度
                    widthSegments: 32, // 宽度方向分段数
                    heightSegments: 32 // 高度方向分段数
                },
                shape: {
                    points: [] as { x: number; y?: number; z?: number }[], // 异形顶点（≥3）
                    holes: [] as { x: number; y?: number; z?: number }[][] // 可选内环，用于挖洞
                }
            },
            material: {
                type: 'color',
                color: {
                    color: '#eee',
                    opacity: 1
                },
                doubleSide: false,
                image: {
                    url: '/public/image/ground.jpg',
                    repeatX: 10,
                    repeatY: 10
                }
            }
        }
        let param = merge(defaultParams, modelInfo)

        let geometry: BufferGeometry
        if (param.base.type === 'shape') {
            const { points, holes } = param.base.shape
            if (!points || points.length < 3) {
                console.warn('异形平面需要至少 3 个顶点')
                return
            }
            // z 有变化视为地面 XZ 多边形，否则为竖直 XY
            const ground = points.some((p) => Math.abs(p.z ?? 0) > 1e-8)
            const toXY = (p): [number, number] => (ground ? [p.x, -(p.z ?? 0)] : [p.x, p.y ?? 0])
            const ringToShape = (pts) => {
                const s = new Shape()
                pts.forEach((p, i) => (i ? s.lineTo(...toXY(p)) : s.moveTo(...toXY(p))))
                s.closePath()
                return s
            }
            const shape = ringToShape(points)
            holes?.forEach((ring) => ring?.length >= 3 && shape.holes.push(ringToShape(ring)))
            geometry = new ShapeGeometry(shape)
            if (ground) geometry.rotateX(-Math.PI / 2) // 法线朝上，世界 x/z 与顶点对齐
            if (!modelInfo?.rotation) param.rotation = { x: 0, y: 0, z: 0 }
        } else {
            geometry = this.initPlaneGeometry(param.base.rect.width, param.base.rect.height)
        }

        let material
        switch (param.material.type) {
            case 'color':
                material = new MeshBasicMaterial({
                    color: param.material.color.color,
                    transparent: true,
                    opacity: param.material.color.opacity
                })
                break
            case 'image':
                material = await this.material.initImageMaterial(param.material.image)
                break
        }

        if (param.material.doubleSide) material.side = DoubleSide

        const plane = new Mesh(geometry, material)

        return setModelConfig(plane, param, this.TO)
    }

    /**
     * 创建球体
     * @author LL
     * @since 2021/07/23
     * @param {modelInfoParams} modelInfo 模型参数
     * @param {*} [material] 材质（不传使用默认）
     */
    public initSphere(modelInfo?: modelInfoParams, material?: any): Object3D {
        let defaultParams = {
            modelName: 'sphere-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            },
            base: {
                radius: 10,
                widthSegments: 15,
                heightSegments: 15
            },
            material: {
                color: '#f00'
            }
        }
        let param = merge(defaultParams, modelInfo)
        let sphere: SphereGeometry
        sphere = new SphereGeometry(
            param.base.radius,
            param.base.widthSegments,
            param.base.heightSegments,
            param.base?.phiStart,
            param.base?.phiLength,
            param.base?.thetaStart,
            param.base?.thetaLength
        )

        if (!material) {
            material = new MeshLambertMaterial({
                color: param.material.color
            })
        }
        const geometryObject = new Mesh(sphere, material)
        return setModelConfig(geometryObject, param, this.TO)
    }

    /**
     * 创建圆锥
     * @author LL
     * @since 2021/08/19
     * @param {modelInfoParams} modelInfo 模型参数
     */
    public initCone(modelInfo?: modelInfoParams): Object3D {
        let defaultParams = {
            modelName: 'cone-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            },
            base: {
                radius: 10,
                height: 20
            },
            material: {
                color: '#f00'
            }
        }
        let param = merge(defaultParams, modelInfo)

        let cone: ConeGeometry
        cone = new ConeGeometry(
            param.base?.radius,
            param.base?.height,
            param.base?.radialSegments,
            param.base?.heightSegments,
            param.base?.openEnded,
            param.base?.thetaStart,
            param.base?.thetaLength
        )
        let material: MeshLambertMaterial = new MeshLambertMaterial({
            color: param.material.color
        })
        const geometryObject = new Mesh(cone, material)
        geometryObject.name = param.name
        return setModelConfig(geometryObject, param, this.TO)
    }

    /**
     * 创建圆柱体
     * @author LL
     * @since 2021/08/19
     * @param {modelInfoParams} modelInfo 模型参数
     */
    public initCylinder(modelInfo?: modelInfoParams): Object3D {
        let defaultParams = {
            modelName: 'cylinder-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            },
            base: {
                radiusTop: 10,
                radiusBottom: 10,
                height: 20,
                radialSegments: 32
            },
            material: {
                color: '#f00'
            }
        }
        let param = merge(defaultParams, modelInfo)

        let cylinder: CylinderGeometry
        cylinder = new CylinderGeometry(
            param.base?.radiusTop,
            param.base?.radiusBottom,
            param.base?.height,
            param.base?.radialSegments,
            param.base?.heightSegments,
            param.base?.openEnded,
            param.base?.thetaStart,
            param.base?.thetaLength
        )

        let material: MeshLambertMaterial = new MeshLambertMaterial({
            color: param.material.color
        })
        const geometryObject = new Mesh(cylinder, material)
        geometryObject.name = param.name
        return setModelConfig(geometryObject, param, this.TO)
    }

    /**
     * 创建圆形（平面）
     * @author LL
     * @since 2024/10/18
     * @param {modelInfoParams} [modelInfo] 模型参数
     */
    public initCircle(modelInfo?: any): Object3D {
        let defaultParams = {
            modelName: 'circle-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            },
            base: {
                radius: 5, //半径
                segments: 32, //圆形的分段数
                thetaStart: 0, //圆弧的起始角度（以弧度为单位）
                thetaLength: Math.PI * 2 //圆弧的角度范围（以弧度为单位）
            },
            material: {
                color: '#f00',
                doubleSide: true
            }
        }
        let param = merge(defaultParams, modelInfo)

        let geometry = new CircleGeometry(
            param.base.radius,
            param.base.segments,
            param.base.thetaStart,
            param.base.thetaLength
        )
        let material = new MeshBasicMaterial({ color: param.material.color })
        material.side = DoubleSide
        let circle = new Mesh(geometry, material)
        return setModelConfig(circle, param, this.TO)
    }

    /**
     * 创建货架
     * 自定义尺寸
     * @author LL
     * @since 2024/09/02
     * @param {modelInfoParams} modelInfo
     */
    public async initShelf(modelInfo?: modelInfoParams): Promise<Object3D> {
        let defaultParams = {
            modelName: 'shelf-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            },
            base: {
                rows: 3,
                columns: 4,
                height: 7.9,
                depth: 9,
                width: 9,
                children: [
                    {
                        name: 'shelf-Footer',
                        id: 300,
                        modelType: 'gltf',
                        base: {
                            modelUrl:
                                this.TO.sceneData.params.resource.serverAddress +
                                this.TO.sceneData.params.resource.model +
                                '/shelf-Footer.gltf'
                        }
                    },
                    {
                        name: 'shelf-OneSide',
                        id: 301,
                        modelType: 'gltf',
                        base: {
                            modelUrl:
                                this.TO.sceneData.params.resource.serverAddress +
                                this.TO.sceneData.params.resource.model +
                                '/shelf-OneSide.gltf'
                        }
                    },
                    {
                        name: 'shelf-ThreeSide',
                        id: 302,
                        modelType: 'gltf',
                        base: {
                            modelUrl:
                                this.TO.sceneData.params.resource.serverAddress +
                                this.TO.sceneData.params.resource.model +
                                '/shelf-ThreeSide.gltf'
                        }
                    }
                ]
            }
        }
        let param = merge(defaultParams, modelInfo)

        let footer, threeSide, oneSide
        for (let i = 0; i < param.base.children.length; i++) {
            await this.loadModel(param.base.children[i]).then((fileModel: any) => {
                console.log('oooo', fileModel)
                if (param.base.children[i].name == 'shelf-Footer') {
                    footer = fileModel
                } else if (param.base.children[i].name == 'shelf-ThreeSide') {
                    threeSide = fileModel
                } else if (param.base.children[i].name == 'shelf-OneSide') {
                    oneSide = fileModel
                }
            })
        }

        let shelf = this.initGroup()
        let oneRow = this.initGroup()
        let rightSide = this.initGroup()

        //计算尺寸
        for (let i = 0; i < param.base.columns; i++) {
            let threeSideClone = threeSide.clone()
            threeSideClone.name = 'threeSide' + (i + 1)
            threeSideClone.position.set(0, i * param.base.height, 0)
            threeSide.name = 'shelf-row-column' + (i + 1)
            oneRow.add(threeSideClone)

            let oneSideClone = oneSide.clone()
            oneSideClone.position.set(param.base.width * param.base.rows, i * param.base.height, 0)
            oneSideClone.name = 'shelf-right-column' + (i + 1)
            rightSide.add(oneSideClone)
        }
        rightSide.name = 'shelf-right'
        shelf.add(rightSide)
        for (let i = 0; i < param.base.rows; i++) {
            let oneRowClone = oneRow.clone()
            oneRowClone.position.set(param.base.width * i, 0, 0)
            oneRowClone.name = 'shelf-row' + (i + 1)
            shelf.add(oneRowClone)
        }

        console.log('eee', param)

        return setModelConfig(shelf, param, this.TO)
    }

    /**
     * 创建地图
     * @author LL
     * @since 2021/09/16
     * @param {modelInfoParams} [modelInfo] 模型参数
     */
    public initMap(modelInfo?: any): Promise<Object3D> {
        let defaultParams = {
            modelName: 'map-' + new Date().getTime(),
            base: {
                url: ''
            },
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            }
        }
        let param = merge(defaultParams, modelInfo)

        // 加载json文件
        let loader = new FileLoader()

        return new Promise((resolve) => {
            loader.load(param.base.url, (data) => {
                let jsonData = JSON.parse(data as string)
                // 建一个空对象存放对象
                var map = new Object3D()

                // 墨卡托投影转换
                const projection = d3geo.geoMercator().center([104.0, 37.5]).scale(80).translate([0, 0])

                jsonData.features.forEach((elem) => {
                    // 定一个省份3D对象
                    const province = new Object3D()
                    // 每个的 坐标 数组
                    const coordinates = elem.geometry.coordinates
                    // 循环坐标数组
                    coordinates.forEach((multiPolygon) => {
                        multiPolygon.forEach((polygon) => {
                            const shape = new Shape()

                            const lineMaterial = new LineBasicMaterial({ color: 'white' })

                            let points = []
                            for (let i = 0; i < polygon.length; i++) {
                                const [x, y] = projection(polygon[i])
                                if (i === 0) {
                                    shape.moveTo(x, -y)
                                }
                                shape.lineTo(x, -y)
                                points.push(new Vector3(x, -y, 4.01))
                            }
                            const lineGeometry = new BufferGeometry().setFromPoints(points)

                            const extrudeSettings = {
                                depth: 4,
                                bevelEnabled: false
                            }

                            const geometry = new ExtrudeGeometry(shape, extrudeSettings)
                            const material = new MeshBasicMaterial({
                                color: '#02A1E2',
                                transparent: true,
                                opacity: 0.6
                            })
                            const material1 = new MeshBasicMaterial({
                                color: '#3480C4',
                                transparent: true,
                                opacity: 0.5
                            })
                            const mesh = new Mesh(geometry, [material, material1])
                            const line = new Line(lineGeometry, lineMaterial)
                            province.add(mesh)
                            province.add(line)
                        })
                    })

                    // 将geo的属性放到省份模型中
                    ;(province as any).properties = elem.properties
                    if (elem.properties.contorid) {
                        const [x, y] = projection(elem.properties.contorid)
                        ;(province as any).properties._centroid = [x, y]
                    }

                    map.add(province)
                })

                resolve(setModelConfig(map, param, this.TO))
            })
        })
    }

    /**
     * 创建视频面板
     * @author LL
     * @since 2021/09/03
     * @param {HTMLVideoElement} dom video标签
     * @param {modelInfoParams} [modelInfo] 模型参数
     */
    public initVideoPlane(dom: HTMLVideoElement, modelInfo?: modelInfoParams): Object3D {
        let defaultParams = {
            modelName: 'videoPlane-' + new Date().getTime(),
            base: {
                width: 250,
                height: 100
            },
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            }
        }
        let param = merge(defaultParams, modelInfo)

        let planeGeometry: PlaneGeometry = this.initPlaneGeometry(param.base.width, param.base.height)
        var material = new MeshPhongMaterial()
        material.side = DoubleSide

        material.map = this.material.initVideoTexture({ videoDom: dom })
        var mesh = new Mesh(planeGeometry, material)

        return setModelConfig(mesh, param, this.TO)
    }

    /**
     * 创建点云
     * @author LL
     * @since 2021/08/25
     * @param {modelInfoParams} [modelInfo] 模型参数
     */
    public initPoints(modelInfo?: modelInfoParams): Object3D {
        let defaultParams = {
            modelName: 'points-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            },
            base: {
                positions: [],
                pointConfigs: {
                    color: '#f00',
                    size: 1.5
                },
                offset: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                scale: 1
            }
        }

        for (let i = 0; i < 100; i++) {
            defaultParams.base.positions.push({
                x: Math.random() * 100,
                y: Math.random() * 100,
                z: Math.random() * 100
            })
        }

        let param = merge(defaultParams, modelInfo)

        let pointArr = []
        for (let i = 0; i < param.base.positions.length; i++) {
            pointArr.push(
                new Vector3(
                    (param.base.positions[i]['x'] + param.base.offset.x) * param.base.scale,
                    (param.base.positions[i]['y'] + param.base.offset.y) * param.base.scale,
                    (param.base.positions[i]['z'] + param.base.offset.z) * param.base.scale
                )
            )
        }

        var geometry = new BufferGeometry().setFromPoints(pointArr) //声明一个几何体对象Geometry

        var pointMaterial = this.material.initPointsMaterial({
            color: param.base.pointConfigs.color,
            size: param.base.pointConfigs.size
        })

        //生成点模型
        var points = new Points(geometry, pointMaterial)

        return setModelConfig(points, param, this.TO)
    }

    public initPoints2(modelInfo?: modelInfoParams): Object3D {
        let defaultParams = {
            modelName: 'points-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            },
            base: {
                positions: [],
                pointConfigs: {
                    colorType: 'unite', //unite 统一    onself 单个自定义  random 随机
                    color: {
                        r: 1,
                        g: 0,
                        b: 0
                    },
                    size: 1.5
                },
                offset: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                scale: 1
            }
        }
        let param = merge(defaultParams, modelInfo)

        let positions = new Float32Array(param.base.positions.length * 3)
        let colors = new Float32Array(param.base.positions.length * 3)

        for (let i = 0; i < param.base.positions.length; i++) {
            positions[i * 3] =
                (param.base.positions[i][param.base.property.x] + param.base.offset.x) * param.base.scale
            positions[i * 3 + 1] =
                (param.base.positions[i][param.base.property.y] + param.base.offset.y) * param.base.scale
            positions[i * 3 + 2] =
                (param.base.positions[i][param.base.property.z] + param.base.offset.z) * param.base.scale

            if (param.base.pointConfigs.colorType === 'unite') {
                colors[i * 3] = param.base.pointConfigs.color.r
                colors[i * 3 + 1] = param.base.pointConfigs.color.g
                colors[i * 3 + 2] = param.base.pointConfigs.color.b
            } else if (param.base.pointConfigs.colorType === 'onself') {
                colors[i * 3] = param.base.pointConfigs[i].r
                colors[i * 3 + 1] = param.base.pointConfigs[i].g
                colors[i * 3 + 2] = param.base.pointConfigs[i].b
            } else if (param.base.pointConfigs.colorType === 'random') {
                colors[i * 3] = Math.random()
                colors[i * 3 + 1] = Math.random()
                colors[i * 3 + 2] = Math.random()
            }
        }

        var geometry = new BufferGeometry()
        geometry.setAttribute('position', new BufferAttribute(positions, 3))
        geometry.setAttribute('color', new BufferAttribute(colors, 3))

        const material = new PointsMaterial({
            size: param.base.pointConfigs.size,
            vertexColors: true
        })
        let points = new Points(geometry, material)

        return setModelConfig(points, param, this.TO)
    }

    /**
     * 创建精灵图形
     * @author LL
     * @since 2021/08/25
     * @param {modelInfoParams} [modelInfo] 模型参数
     */
    public initSpriteShape(modelInfo?: modelInfoParams): Object3D {
        let defaultParams = {
            modelName: 'spriteShape-' + new Date().getTime(),
            base: {
                positions: [],
                spriteShape: {
                    shape: 'sphere', //形状类型 例:'sphere'||'triangle'
                    color: '#f00',
                    radius: 5
                }
            },
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            }
        }
        for (let i = 0; i < 100; i++) {
            defaultParams.base.positions.push({
                name: 'sprite' + i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                z: Math.random() * 100
            })
        }
        let param = merge(defaultParams, modelInfo)

        let canvas = document.createElement('canvas')
        canvas.width = 20
        canvas.height = 20

        let ctx = canvas.getContext('2d')
        if (param.base.spriteShape.shape == 'sphere') {
            ctx.arc(10, 10, 10, 0, 2 * Math.PI)
        } else if (param.base.spriteShape.shape == 'triangle') {
            ctx.beginPath()
            ctx.moveTo(10, 15)
            ctx.lineTo(20, 0)
            ctx.lineTo(0, 0)
            ctx.closePath() //闭合路径
            ctx.lineWidth = 10 //线的边框为10像素
        }
        ctx.fillStyle = param.base.spriteShape.color
        ctx.fill()

        let texture = new Texture(canvas)
        texture.needsUpdate = true //注意这句不能少
        let material1 = new SpriteMaterial({ map: texture })

        let spriteGroup = new Group()

        for (var i = 0; i < param.base.positions.length; i++) {
            var sprite = new Sprite(material1.clone())
            if (param.base.positions[i].name) sprite.name = param.base.positions[i].name
            sprite.position.set(
                param.base.positions[i].x,
                param.base.positions[i].y,
                param.base.positions[i].z
            )
            sprite.scale.set(param.base.spriteShape.radius, param.base.spriteShape.radius, 1)
            spriteGroup.add(sprite)
        }

        return setModelConfig(spriteGroup, param, this.TO)

        // sprite.position.normalize();
        // sprite.position.multiplyScalar(700);
    }

    /**
     * 创建图片精灵
     * @author LL
     * @since 2021/08/25
     * @param {modelInfoParams} [modelInfo] 模型参数
     */
    public initSpritePic(modelInfo?: modelInfoParams): Object3D {
        let defaultParams = {
            modelName: 'spritePic-' + new Date().getTime(),
            base: {
                positions: [],
                spriteShape: {
                    url: '',
                    size: 10
                }
            },
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            }
        }

        if (modelInfo.base.positions.length > 0) {
            defaultParams.base.positions = modelInfo.base.positions
        } else {
            for (let i = 0; i < 100; i++) {
                defaultParams.base.positions.push({
                    name: 'sprite' + i,
                    x: Math.random() * 100,
                    y: Math.random() * 100,
                    z: Math.random() * 100
                })
            }
        }
        let param = merge(defaultParams, modelInfo)

        const map = new TextureLoader().load(param.base.spriteShape.url)
        const material = new SpriteMaterial({ map: map })

        let spriteGroup = new Group()
        for (var i = 0; i < param.base.positions.length; i++) {
            var sprite = new Sprite(material.clone())
            if (param.base.positions[i].name) sprite.name = param.base.positions[i].name
            sprite.position.set(
                param.base.positions[i].x,
                param.base.positions[i].y,
                param.base.positions[i].z
            )
            sprite.scale.set(param.base.spriteShape.size, param.base.spriteShape.size, 1)
            spriteGroup.add(sprite)
        }

        return setModelConfig(spriteGroup, param, this.TO)
    }
    /**
     * 创建线辅助器
     * @author MY
     * @since 2026/03/04
     * @param {modelInfoParams} [modelInfo] 模型参数
     * @returns {*}
     */

    public initLineHelper(modelInfo?: modelInfoParams): Object3D {
        let defaultParams = {
            modelName: 'lineHelper-' + new Date().getTime(),
            modelType: 'cube',
            cubeBase: {
                width: 1,
                height: 1,
                depth: 1
            },
            sphereBase: {
                radius: 0.5
            },
            capsuleBase: {
                radius: 0.5,
                height: 2,
                axis: 'y'
            },
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            }
        }
        let param = merge(defaultParams, modelInfo)
        const wireframeMaterial = this.TO.material.initLineMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6
        })
        let fallbackWireframe: any = null
        let geometry: any = null
        let helper: any = null
        if (param.modelType === 'cube') {
            fallbackWireframe = new BoxGeometry(
                param.cubeBase.width,
                param.cubeBase.height,
                param.cubeBase.depth
            )
            geometry = new EdgesGeometry(fallbackWireframe)
            helper = new LineSegments(geometry, wireframeMaterial)
        } else if (param.modelType === 'sphere') {
            geometry = this.createSphereCrossWireframe(param.sphereBase.radius)
            helper = new Line(geometry, wireframeMaterial)
        } else if (param.modelType === 'capsule') {
            geometry = this.createCapsuleCrossWireframe(param.capsuleBase.radius, param.capsuleBase.height)
            if (param.capsuleBase.axis === 'x') {
                geometry.applyMatrix4(new Matrix4().makeRotationZ(Math.PI / 2))
            } else if (param.capsuleBase.axis === 'z') {
                geometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2))
            }
            helper = new Line(geometry, wireframeMaterial)
        }
        return setModelConfig(helper, param, this.TO)
    }

    /**
     * 创建球体交叉线框几何体
     * @author MY
     * @since 2026/03/04
     * @param {number} radius 球体半径
     * @returns {BufferGeometry} 球体交叉线框几何体
     */
    private createSphereCrossWireframe(radius = 1): BufferGeometry {
        const pointsHorizontal = [] // 水平圆顶点
        const pointsVertical = [] // 垂直圆顶点
        const segments = 64 // 分段数，值越大圆越平滑

        // 1. 生成水平圆（赤道，y=0 平面）
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2
            const x = Math.cos(angle) * radius
            const z = Math.sin(angle) * radius
            pointsHorizontal.push(new Vector3(x, 0, z))
        }

        // 2. 生成垂直圆（子午，z=0 平面）
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            pointsVertical.push(new Vector3(x, y, 0))
        }

        // 3. 合并两个圆的顶点，创建 BufferGeometry
        const geometry = new BufferGeometry()
        const allPoints = [...pointsHorizontal, ...pointsVertical]
        geometry.setFromPoints(allPoints)

        return geometry
    }

    /**
     * 创建胶囊体十字交叉辅助线几何体（球体十字线+圆柱垂直线）
     * @param radius 胶囊体半径（半球+圆柱半径），默认0.5
     * @param cylinderHeight 圆柱部分高度（不含上下半球），默认1
     * @returns 胶囊体十字交叉辅助线的BufferGeometry
     */
    private createCapsuleCrossWireframe(radius = 0.5, cylinderHeight = 1): BufferGeometry {
        const points = []
        const cylinderTopY = cylinderHeight / 2 // 圆柱顶部Y
        const cylinderBottomY = -cylinderHeight / 2 // 圆柱底部Y

        // ========== 仅保留4组外轮廓线（勾勒整体形状） ==========
        // 1. 右侧轮廓：上半球右半弧 + 圆柱右竖线 + 下半球右半弧
        // 上半球右半弧（从顶端到圆柱顶部）
        for (let i = 0; i <= 20; i++) {
            const phi = ((i / 20) * Math.PI) / 2 // 0→π/2
            const x = radius * Math.sin(phi)
            const y = cylinderTopY + radius * Math.cos(phi)
            points.push(new Vector3(x, y, 0))
        }
        // 圆柱右侧竖线（连接上下半球底部）
        points.push(new Vector3(radius, cylinderTopY, 0))
        points.push(new Vector3(radius, cylinderBottomY, 0))
        // 下半球右半弧（从圆柱底部到底端）
        for (let i = 20; i >= 0; i--) {
            const phi = ((i / 20) * Math.PI) / 2
            const x = radius * Math.sin(phi)
            const y = cylinderBottomY - radius * Math.cos(phi)
            points.push(new Vector3(x, y, 0))
        }

        // 2. 左侧轮廓：上半球左半弧 + 圆柱左竖线 + 下半球左半弧
        for (let i = 0; i <= 20; i++) {
            const phi = ((i / 20) * Math.PI) / 2
            const x = -radius * Math.sin(phi)
            const y = cylinderTopY + radius * Math.cos(phi)
            points.push(new Vector3(x, y, 0))
        }
        points.push(new Vector3(-radius, cylinderTopY, 0))
        points.push(new Vector3(-radius, cylinderBottomY, 0))
        for (let i = 20; i >= 0; i--) {
            const phi = ((i / 20) * Math.PI) / 2
            const x = -radius * Math.sin(phi)
            const y = cylinderBottomY - radius * Math.cos(phi)
            points.push(new Vector3(x, y, 0))
        }

        // 3. 前侧轮廓：上半球前半弧 + 圆柱前竖线 + 下半球前半弧
        for (let i = 0; i <= 20; i++) {
            const phi = ((i / 20) * Math.PI) / 2
            const z = radius * Math.sin(phi)
            const y = cylinderTopY + radius * Math.cos(phi)
            points.push(new Vector3(0, y, z))
        }
        points.push(new Vector3(0, cylinderTopY, radius))
        points.push(new Vector3(0, cylinderBottomY, radius))
        for (let i = 20; i >= 0; i--) {
            const phi = ((i / 20) * Math.PI) / 2
            const z = radius * Math.sin(phi)
            const y = cylinderBottomY - radius * Math.cos(phi)
            points.push(new Vector3(0, y, z))
        }

        // 4. 后侧轮廓：上半球后半弧 + 圆柱后竖线 + 下半球后半弧
        for (let i = 0; i <= 20; i++) {
            const phi = ((i / 20) * Math.PI) / 2
            const z = -radius * Math.sin(phi)
            const y = cylinderTopY + radius * Math.cos(phi)
            points.push(new Vector3(0, y, z))
        }
        points.push(new Vector3(0, cylinderTopY, -radius))
        points.push(new Vector3(0, cylinderBottomY, -radius))
        for (let i = 20; i >= 0; i--) {
            const phi = ((i / 20) * Math.PI) / 2
            const z = -radius * Math.sin(phi)
            const y = cylinderBottomY - radius * Math.cos(phi)
            points.push(new Vector3(0, y, z))
        }

        // 创建轮廓几何体
        const geometry = new BufferGeometry().setFromPoints(points)
        return geometry
    }

    /**
     * 创建平面缓冲几何体
     * @author LL
     * @since 2023/11/13
     * @param {number} width
     * @param {number} height
     */
    public initPlaneGeometry(width?: number, height?: number): PlaneGeometry {
        return new PlaneGeometry(width, height)
    }

    public initBufferGeometry() {
        return new BufferGeometry()
    }

    public initBufferAttribute(array, itemSize) {
        return new BufferAttribute(array, itemSize)
    }

    public initMesh(geometry?, material?) {
        return new Mesh(geometry, material)
    }

    /**
     * @description 合并Mesh网格
     * @warn 需手动将合并的模型删除
     * @author LL
     * @since 2025/11/14
     * @param meshArray
     * @returns {*}
     */
    public mergeMesh(meshArray: Mesh[]) {
        // 1. 收集所有网格的几何体，并确保它们的变换（位置、旋转、缩放）已应用到几何体中
        const geometries = []
        meshArray.forEach((mesh) => {
            // 将网格的世界矩阵应用到几何体（确保位置、旋转、缩放被“烘焙”到顶点数据中）
            mesh.updateMatrixWorld(true)
            const geometry = mesh.geometry.clone()
            geometry.applyMatrix4(mesh.matrixWorld) // 应用变换
            geometries.push(geometry)
        })

        // 2. 合并几何体（使用 BufferGeometryUtils）
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries)

        // 3. 创建合并后的整体网格（使用原网格的材质，需确保材质相同）
        const mergedMesh = new Mesh(mergedGeometry, meshArray[0].material)

        return mergedMesh
    }

    /**
     * Loft 放样（r185 LoftGeometry）
     */
    public initLoft(options: {
        modelName?: string
        sections: Vector3[][]
        capStart?: boolean
        capEnd?: boolean
        color?: string
        position?: { x: number; y: number; z: number }
    }): Object3D {
        return this.TO.generator.createLoft(options)
    }

    /**
     * 预热 Draco / KTX2 解码器（在首批 glb 加载前调用，避免 wasm 计入首模时间）
     * 远程 wasm 加载失败时（如本地 dev CORS）自动回退 three 内置资源
     */
    public async warmupDecoders(renderer?: TORenderer): Promise<void> {
        const fails: unknown[] = []

        try {
            await this.warmDraco()
        } catch (e) {
            fails.push(e)
        }

        try {
            await this.warmKtx2(renderer)
        } catch (e) {
            fails.push(e)
        }

        if (fails.length) {
            console.warn('解码器预热失败（已尝试内置回退）:', fails)
        }
    }

    /** 预热 Draco 解码器 */
    private async warmDraco(): Promise<void> {
        this.DRACO_LOADER.preload()
        const pending = (this.DRACO_LOADER as any).decoderPending as Promise<unknown> | null
        if (!pending) return

        try {
            await pending
        } catch (err) {
            this.DRACO_LOADER.dispose()
            this.DRACO_LOADER = new DRACOLoader(this.MANAGER)
            this.GLTFLoader.setDRACOLoader(this.DRACO_LOADER)
            this.DRACO_LOADER.preload()
            await (this.DRACO_LOADER as any).decoderPending
        }
    }

    /** 预热 KTX2 解码器 */
    private async warmKtx2(renderer?: TORenderer): Promise<void> {
        if (renderer) {
            // KTX2 detectSupport 历史 API 以 WebGL 为主；WebGPU 时仍尝试探测
            this.KTX2_LOADER.detectSupport(renderer as any)
        }

        try {
            await this.KTX2_LOADER.init()
        } catch (err) {
            ;(this.KTX2_LOADER as any).transcoderPending = null
            this.KTX2_LOADER.setTranscoderPath('')
            if (renderer) {
                this.KTX2_LOADER.detectSupport(renderer as any)
            }
            await this.KTX2_LOADER.init()
        }
    }
}
