/**
 * @module
 * @mergeModuleWith <project>
 */

import { merge, cloneDeep } from 'lodash-es'
import { ThingOrigin } from '../ThingOrigin'
import { indexedDBmodelInfoParams, modelInfoParams, updateInfoParams } from './TModelInterfaces'
import { accessInsetResult, accessResult } from './TIndexedDBInterfaces'
import { fetchBlob as fetchBlobUtil } from './fetchUtil'

/**
 * 本地缓存
 * @remarker 0-10用于存放字体
 */
export class TIndexedDB {
    private TO: ThingOrigin
    public DBs: Map<string, IDBDatabase> = new Map<string, IDBDatabase>()
    /** 同 URL 进行中的下载，避免批量时重复请求 */
    private downloadInflight = new Map<string, Promise<Blob>>()
    /** 批量 loadModel 期间延后 IDB 写入 */
    private deferDbDepth = 0
    private pendingDb: { modelInfo: indexedDBmodelInfoParams; blob: Blob }[] = []

    constructor(TO: ThingOrigin) {
        this.TO = TO
    }

    private pickUrl(...cands: (string | undefined)[]): string | undefined {
        for (const u of cands) {
            if (!u || u.startsWith('blob:') || u.startsWith('data:')) continue
            return u
        }
        return undefined
    }

    private getResUrl(modelInfo: indexedDBmodelInfoParams): string | undefined {
        if (modelInfo.modelType == 'text') {
            return this.pickUrl(modelInfo.base?.fontUrl, modelInfo.userData?.base?.fontUrl)
        }
        return this.pickUrl(modelInfo.base?.modelUrl, modelInfo.userData?.base?.modelUrl)
    }

    /** 下载模型文件，同 URL 复用进行中的 Promise */
    public async downloadBlob(url: string): Promise<Blob> {
        let pending = this.downloadInflight.get(url)
        if (!pending) {
            pending = this.fetchBlob(url).finally(() => this.downloadInflight.delete(url))
            this.downloadInflight.set(url, pending)
        }
        return pending
    }

    private async fetchBlob(url: string): Promise<Blob> {
        return fetchBlobUtil(url)
    }

    private async openDb(): Promise<IDBDatabase> {
        const dbName = this.TO.sceneData.params.indexedDB.dataBaseName
        const tableName = this.TO.sceneData.params.indexedDB.tableName

        let db = this.DBs.get(dbName)
        if (db) return db

        db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = window.indexedDB.open(dbName, 1)

            request.onerror = () => reject(new Error('数据库打开失败'))

            request.onsuccess = () => {
                const opened: IDBDatabase = request.result
                if (!this.DBs.has(dbName)) this.DBs.set(dbName, opened)
                resolve(opened)
            }

            request.onupgradeneeded = (event) => {
                //@ts-ignore
                this.createObjectStoreIfNotExists(event.target.result, tableName)
            }
        })

        return db
    }

    /** 后台写入 IndexedDB，不阻塞解析 */
    private scheduleDbSave(modelInfo: indexedDBmodelInfoParams, blob: Blob): void {
        void this.saveModelToDb(modelInfo, blob).catch((err) =>
            console.error('insertModel:后台写入失败 id=', modelInfo.id, err)
        )
    }

    /** 批量首屏加载开始前调用，缓存写入延后到 flushPendingDbSaves */
    public beginDeferDbSave(): void {
        this.deferDbDepth++
    }

    /** 批量结束后刷入待写队列（主键仍为 id，策略不变） */
    public async flushPendingDbSaves(): Promise<void> {
        if (this.deferDbDepth > 0) this.deferDbDepth = 0
        const queue = this.pendingDb.splice(0)
        if (!queue.length) return

        const results = await Promise.allSettled(
            queue.map(({ modelInfo, blob }) => this.saveModelToDb(modelInfo, blob))
        )
        const fail = results.filter((r) => r.status === 'rejected')
        if (fail.length) {
            console.warn(
                '批量 IDB 写入部分失败:',
                fail.map((r) => (r as PromiseRejectedResult).reason)
            )
        }
    }

    private enqueueDbSave(modelInfo: indexedDBmodelInfoParams, blob: Blob): void {
        if (this.deferDbDepth > 0) {
            this.pendingDb.push({ modelInfo: cloneDeep(modelInfo), blob })
            return
        }
        this.scheduleDbSave(modelInfo, blob)
    }

    private async saveModelToDb(modelInfo: indexedDBmodelInfoParams, blob: Blob): Promise<void> {
        const tableName = this.TO.sceneData.params.indexedDB.tableName
        const record = Object.assign(cloneDeep(modelInfo), {
            modelSize: blob.size,
            model: new Blob([blob]),
            dataBaseName: this.TO.sceneData.params.indexedDB.dataBaseName,
            tableName
        })

        const db = await this.openDb()
        const transaction = db.transaction([tableName], 'readwrite')
        const store = transaction.objectStore(tableName)

        await new Promise<void>((resolve, reject) => {
            const req = store.put(record)
            req.onsuccess = () => resolve()
            req.onerror = () => reject(new Error('insertModel:数据写入失败'))
        })
    }

    /**
     * 判断是否已缓存此模型，返回是否存储，若已缓存返回模型参数
     * @author LL
     * @since 2022-07-14
     * @param {modelParams} modelInfo
     */
    public async accessModel(modelInfo: indexedDBmodelInfoParams): Promise<accessResult> {
        const tableName = this.TO.sceneData.params.indexedDB.tableName

        try {
            const db = await this.openDb()
            const transaction = db.transaction(tableName, 'readonly')
            const store = transaction.objectStore(tableName)

            // 查询数据
            const result = await new Promise<any>((resolve, reject) => {
                const dataRequest = store.index('id').get(modelInfo.id)

                dataRequest.onsuccess = (e: any) => {
                    resolve(e.target.result)
                }

                dataRequest.onerror = () => {
                    reject(new Error('数据查询失败'))
                }

                transaction.onerror = () => {
                    reject(new Error('事务执行失败'))
                }
            })

            //@ts-ignore
            if (result != undefined) {
                let modelInfoResult = Object.assign(modelInfo, {
                    saved: true
                })

                let blobUrl = URL.createObjectURL(
                    new Blob([result.model], {
                        type: 'application/octet-stream'
                    })
                )

                return {
                    info: modelInfoResult,
                    modelUrl: blobUrl
                }
            } else {
                return { info: { saved: false } }
            }
        } catch (error) {
            console.error('accessModel 执行失败:', error)
            return { info: { saved: false } }
        }
    }

    /**
     * 向indexedDB数据表中，存储模型
     * @author LL
     * @since 2022-07-14
     * @param {indexedDBmodelInfoParams} modelInfo
     */
    public async insertModel(modelInfo: indexedDBmodelInfoParams): Promise<indexedDBmodelInfoParams> {
        const url = this.getResUrl(modelInfo)
        if (!url) {
            return {
                id: -1,
                info: { saved: false },
                modelUrl: ''
            }
        }

        let blob: Blob
        try {
            blob = await this.downloadBlob(url)
        } catch (error) {
            console.error('insertModel:下载失败:', error)
            return {
                id: -1,
                info: { saved: false },
                modelUrl: ''
            }
        }

        return this.cacheBlob(modelInfo, blob)
    }

    /** 用已下载 Blob 生成 blobUrl，IndexedDB 写入（批量模式下延后） */
    public cacheBlob(modelInfo: indexedDBmodelInfoParams, blob: Blob): indexedDBmodelInfoParams {
        const blobUrl = window.URL.createObjectURL(blob)
        this.enqueueDbSave(modelInfo, blob)
        return {
            id: modelInfo.id,
            info: merge(modelInfo, { saved: true }),
            modelUrl: blobUrl
        }
    }

    /**
     * 解析模型 blobUrl：已缓存直接返回；未缓存则下载后立即返回
     * 批量 loadModel 期间 IDB 写入延后，由 flushPendingDbSaves 统一刷入
     */
    public async resolveModelUrl(
        modelInfo: indexedDBmodelInfoParams,
        opts?: { skipAccess?: boolean }
    ): Promise<accessInsetResult> {
        if (!opts?.skipAccess) {
            const accessRes = await this.accessModel(modelInfo)
            if (accessRes.info.saved && accessRes.modelUrl) {
                return {
                    saved: true,
                    inserted: false,
                    modelUrl: accessRes.modelUrl
                }
            }
        }

        const url = this.getResUrl(modelInfo)
        if (!url) {
            return { saved: false, inserted: false }
        }

        try {
            const blob = await this.downloadBlob(url)
            const res = this.cacheBlob(modelInfo, blob)
            return {
                saved: true,
                inserted: true,
                modelUrl: res.modelUrl
            }
        } catch (error) {
            console.error('resolveModelUrl:下载失败 id=', modelInfo.id, error)
            return { saved: false, inserted: false }
        }
    }

    /**
     * 删除模型
     * @author LL
     * @since 2022-07-15
     * @param {number} id
     */
    public async deleteModel(id: number): Promise<boolean> {
        const dbName = this.TO.sceneData.params.indexedDB.dataBaseName
        const tableName = this.TO.sceneData.params.indexedDB.tableName

        let db = this.DBs.get(dbName)

        // 如果数据库连接不存在，打开数据库
        if (!db) {
            db = await new Promise<IDBDatabase>((resolve, reject) => {
                const request = window.indexedDB.open(dbName, 1)

                request.onerror = () => {
                    reject(new Error('数据库打开失败'))
                }

                request.onsuccess = () => {
                    const db: IDBDatabase = request.result
                    if (!this.DBs.has(dbName)) {
                        this.DBs.set(dbName, db)
                    }
                    resolve(db)
                }

                request.onupgradeneeded = (event) => {
                    //@ts-ignore
                    const db: IDBDatabase = event.target.result
                    this.createObjectStoreIfNotExists(db, tableName)
                }
            })
        }

        // 创建事务并删除数据
        const transaction = db.transaction([tableName], 'readwrite')
        const store = transaction.objectStore(tableName)

        try {
            await new Promise<void>((resolve, reject) => {
                const deleteRequest = store.delete(id)

                deleteRequest.onsuccess = () => {
                    console.log('数据删除成功')
                    resolve()
                }

                deleteRequest.onerror = () => {
                    reject(new Error('数据删除失败'))
                }
            })

            return true
        } catch (error) {
            console.error('删除模型失败:', error)
            return false
        }
    }

    /**
     * 更新模型
     * @author LL
     * @since 2022-07-15
     * @param {modelInfoParams} modelInfo 更新模型参数
     */
    public async updateModel(modelInfo: modelInfoParams): Promise<void> {
        if (!modelInfo.id) {
            throw new Error('模型ID不能为空')
        }

        const dbName = this.TO.sceneData.params.indexedDB.dataBaseName
        const tableName = this.TO.sceneData.params.indexedDB.tableName

        // 打开数据库，如果不存在则创建（通过 onupgradeneeded 创建表）
        let db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = window.indexedDB.open(dbName, 1)

            request.onerror = (event) => {
                reject(new Error('数据库打开失败'))
            }

            request.onsuccess = () => {
                const db: IDBDatabase = request.result
                if (!this.DBs.has(dbName)) {
                    this.DBs.set(dbName, db)
                }
                resolve(db)
            }

            // 处理数据库升级，创建表（如果不存在）
            request.onupgradeneeded = (event) => {
                //@ts-ignore
                const db: IDBDatabase = event.target.result
                this.createObjectStoreIfNotExists(db, tableName)
                console.log('数据库升级成功')
            }
        })

        // 如果表不存在（可能是在 onupgradeneeded 之后才检查），需要重新打开数据库
        if (!db.objectStoreNames.contains(tableName)) {
            db.close()
            this.DBs.delete(dbName)

            // 重新打开数据库，增加版本号以触发升级
            db = await new Promise<IDBDatabase>((resolve, reject) => {
                const request = window.indexedDB.open(dbName, 2)

                request.onerror = (event) => {
                    reject(new Error('数据库打开失败'))
                }

                request.onsuccess = () => {
                    const db: IDBDatabase = request.result
                    if (!this.DBs.has(dbName)) {
                        this.DBs.set(dbName, db)
                    }
                    resolve(db)
                }

                request.onupgradeneeded = (event) => {
                    //@ts-ignore
                    const db: IDBDatabase = event.target.result
                    this.createObjectStoreIfNotExists(db, tableName)
                }
            })
        }

        // 处理数据更新或插入
        const transaction = db.transaction(tableName, 'readwrite')
        const store = transaction.objectStore(tableName)

        // 获取现有数据
        const existingData = await new Promise<any>((resolve, reject) => {
            const getRequest = store.index('id').get(modelInfo.id)

            getRequest.onsuccess = () => {
                resolve(getRequest.result)
            }

            getRequest.onerror = (event) => {
                reject(new Error('updateModel:获取数据失败'))
            }
        })

        if (!existingData) {
            //要被更新的数据不存在，调用 insertModel 插入数据
            await this.insertModel(modelInfo as indexedDBmodelInfoParams)
            return
        }

        // 更新数据
        const updatedData = { ...existingData, ...modelInfo }
        await new Promise<void>((resolve, reject) => {
            transaction.onerror = (event) => {
                reject(new Error('updateModel:事务执行失败'))
            }

            transaction.oncomplete = () => {
                resolve()
            }

            const putRequest = store.put(updatedData)

            putRequest.onerror = (event) => {
                reject(new Error('updateModel:数据更新失败'))
            }
        })
    }

    /**
     * 查询并缓存模型
     * @author LL
     * @since 2025/01/09
     * @param {indexedDBmodelInfoParams} modelInfo
     * @param {object} opts 选项
     * @param {boolean} opts.skipAccess 是否跳过访问
     */
    public async accessInsertModel(
        modelInfo: indexedDBmodelInfoParams,
        opts?: { skipAccess?: boolean }
    ): Promise<accessInsetResult> {
        return this.resolveModelUrl(modelInfo, opts)
    }

    /**
     * 查询并缓存并返回模型
     * @author LL
     * @since 2025/11/14
     * @param {indexedDBmodelInfoParams} modelInfo
     */
    public async accessInsertLoadModel(modelInfo: indexedDBmodelInfoParams) {
        let result = await this.accessInsertModel(modelInfo)
        modelInfo.base.modelUrl = result.modelUrl
        let model = await this.TO.model.loadModel(modelInfo)
        return model
    }

    /**
     * 获取缓存模型信息
     * @author LL
     * @since 2025/01/07
     * @param {indexedDBmodelInfoParams} modelInfo
     */
    public async getIDBModelInfo(modelInfo: indexedDBmodelInfoParams): Promise<any> {
        let accessInsetResult = await this.accessInsertModel(modelInfo)

        let cloneInfo = cloneDeep(modelInfo)

        // 验证模型URL是否有效
        if (!accessInsetResult.modelUrl) {
            console.log('getIDBModelInfo:获取失败:', modelInfo)
            return cloneInfo as indexedDBmodelInfoParams
        }

        cloneInfo.base.modelUrl = accessInsetResult.modelUrl

        return cloneInfo as indexedDBmodelInfoParams
    }

    /**
     * 关闭所有 IndexedDB 连接
     * @author LL
     * @since 2024/12/19
     */
    public closeAllConnections(): void {
        this.DBs.forEach((db, dbName) => {
            try {
                db.close()
                console.log(`IndexedDB 连接 ${dbName} 已关闭`)
            } catch (error) {
                console.error(`关闭 IndexedDB 连接 ${dbName} 失败:`, error)
            }
        })
        this.DBs.clear()
    }

    /**
     * 关闭指定数据库连接
     * @author LL
     * @since 2024/12/19
     * @param dbName 数据库名称
     */
    public closeConnection(dbName: string): void {
        if (this.DBs.has(dbName)) {
            const db = this.DBs.get(dbName)
            try {
                db.close()
                this.DBs.delete(dbName)
                console.log(`IndexedDB 连接 ${dbName} 已关闭`)
            } catch (error) {
                console.error(`关闭 IndexedDB 连接 ${dbName} 失败:`, error)
            }
        }
    }

    /**
     * 创建对象存储和索引（如果不存在）
     * @author LL
     * @since 2025/12/10
     * @param db 数据库实例
     * @param tableName 表名
     */
    private createObjectStoreIfNotExists(db: IDBDatabase, tableName: string): void {
        if (!db.objectStoreNames.contains(tableName)) {
            const objectStore = db.createObjectStore(tableName, { keyPath: 'id' })
            // 定义存储对象的数据项
            objectStore.createIndex('id', 'id', { unique: true })
            objectStore.createIndex('name', 'name')
            objectStore.createIndex('modelName', 'modelName')
            objectStore.createIndex('model', 'model')
            objectStore.createIndex('modelUrl', 'modelUrl')
            objectStore.createIndex('modelSize', 'modelSize')
            objectStore.createIndex('modelType', 'modelType')
            objectStore.createIndex('loadType', 'loadType')
            objectStore.createIndex('position', 'position')
            objectStore.createIndex('scale', 'scale')
            objectStore.createIndex('rotation', 'rotation')
            objectStore.createIndex('dataBaseName', 'dataBaseName')
            objectStore.createIndex('tableName', 'tableName')
            objectStore.createIndex('userData', 'userData')
            console.log('数据库表创建成功')
        }
    }

    /**
     * 测试并创建数据库结构
     * @author LL
     * @since 2025/12/10
     * @private
     * @returns {Promise<boolean>} 数据库是否可用
     */
    private async testIndexedDB(): Promise<boolean> {
        const dbName = this.TO.sceneData.params.indexedDB.dataBaseName
        const tableName = this.TO.sceneData.params.indexedDB.tableName

        // 首先检查内存中是否已有数据库连接
        let db = this.DBs.get(dbName)
        if (db && db.objectStoreNames.contains(tableName)) {
            return true
        }

        try {
            // 如果内存中没有或表不存在，打开数据库进行检查/创建
            db = await new Promise<IDBDatabase>((resolve, reject) => {
                const request = window.indexedDB.open(dbName, 1)

                request.onerror = () => {
                    reject(new Error('数据库打开失败'))
                }

                request.onsuccess = () => {
                    const db: IDBDatabase = request.result
                    if (!this.DBs.has(dbName)) {
                        this.DBs.set(dbName, db)
                    }
                    resolve(db)
                }

                // 当数据库升级时，创建数据库表
                request.onupgradeneeded = (event) => {
                    //@ts-ignore
                    const db: IDBDatabase = event.target.result
                    this.createObjectStoreIfNotExists(db, tableName)
                }
            })

            // 检查表是否存在
            if (db.objectStoreNames.contains(tableName)) {
                return true
            } else {
                console.warn('indexedDB数据库表不存在')
                return false
            }
        } catch (error) {
            console.error('testIndexedDB 执行失败:', error)
            return false
        }
    }
}
