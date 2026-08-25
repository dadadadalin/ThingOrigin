/** 此文件作用：管理 zip 解压池，避免主线程阻塞，全局只有一个池子、一个 Worker 实例，避免重复创建 */

/** zip 解压结果：路径 → 文件内容 */
export type UnzippedFiles = Record<string, ArrayBuffer>
/** 未完成的请求 */
type Pending = {
    resolve: (files: UnzippedFiles) => void // 解压成功回调
    reject: (err: Error) => void // 解压失败回调
    files: UnzippedFiles // 解压结果
    total: number // 总文件数
    got: number // 已解压文件数
}

/** Worker 解压池：大 zip 在 Worker 线程解压，主线程仅接收分批文件 */
export class UnzipPool {
    private worker: Worker | null = null // Worker 实例
    private reqId = 0 // 请求 ID
    private pending = new Map<number, Pending>() // 未完成的请求

    /** Worker 解压，失败时动态加载 fflate 回退主线程 */
    async unzip(data: Uint8Array): Promise<UnzippedFiles> {
        if (typeof Worker !== 'undefined') {
            try {
                return await this.unzipViaWorker(data)
            } catch (err) {
                console.warn('Worker 解压失败，回退主线程:', err)
            }
        }
        return this.unzipMain(data)
    }

    /** 销毁解压池 */
    dispose(): void {
        this.worker?.terminate() // 终止 Worker 实例
        this.worker = null
        for (const p of this.pending.values()) p.reject(new Error('UnzipPool 已销毁'))
        this.pending.clear()
    }

    /** 获取 Worker 实例（生产包内联脚本，开发态走独立 worker 文件） */
    private getWorker(): Worker {
        if (!this.worker) {
            const inline = (globalThis as any).__TO_UNZIP_WORKER__ as string | undefined
            if (inline) {
                const blob = new Blob([inline], { type: 'application/javascript' })
                this.worker = new Worker(URL.createObjectURL(blob))
            } else {
                this.worker = new Worker(
                    /* webpackChunkName: "unzip-worker" */
                    new URL('../workers/unzip.worker.ts', import.meta.url)
                )
            }
            this.worker.onmessage = (e: MessageEvent) => this.onMsg(e.data)
            this.worker.onerror = (ev) => {
                const err = new Error(ev.message || 'zip Worker 异常')
                for (const p of this.pending.values()) p.reject(err)
                this.pending.clear()
                this.worker?.terminate()
                this.worker = null
            }
        }
        return this.worker
    }

    /** 处理 Worker 消息 */
    private onMsg(msg: {
        id: number
        type?: 'start' | 'chunk' | 'done' | 'err'
        files?: UnzippedFiles
        total?: number
        err?: string
    }): void {
        const p = this.pending.get(msg.id)
        if (!p) return

        // 开始解压
        if (msg.type === 'start') {
            p.total = msg.total ?? 0
            p.got = 0
            return
        }

        // 分批解压，一批几个文件
        if (msg.type === 'chunk' && msg.files) {
            Object.assign(p.files, msg.files)
            p.got += Object.keys(msg.files).length
            return
        }

        // 解压完成
        if (msg.type === 'done') {
            this.pending.delete(msg.id)
            p.resolve(p.files)
            return
        }

        // 解压失败
        if (msg.err || msg.type === 'err') {
            this.pending.delete(msg.id)
            p.reject(new Error(msg.err || '解压失败'))
        }
    }

    /** 通过 Worker 解压 */
    private unzipViaWorker(data: Uint8Array): Promise<UnzippedFiles> {
        const id = ++this.reqId // 请求 ID, 区分多次解压请求
        const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) // 数据缓冲区

        return new Promise((resolve, reject) => {
            // 设置请求状态，记录解压结果、总文件数、已解压文件数
            this.pending.set(id, { resolve, reject, files: {}, total: 0, got: 0 })
            // 发送解压请求
            this.getWorker().postMessage({ id, data: buf }, [buf])
        })
    }

    /** 通过主线程解压 */
    private async unzipMain(data: Uint8Array): Promise<UnzippedFiles> {
        const fflate = await import('fflate')
        // 动态 import 无 namespace 类型，用 Record 标注解压结果
        const raw = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
            fflate.unzip(data, (err, res) => (err ? reject(err) : resolve(res)))
        })

        const files: UnzippedFiles = {} // 解压结果
        for (const [path, u8] of Object.entries(raw)) {
            files[path] = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
        }
        return files
    }
}

export const unzipPool = new UnzipPool()
