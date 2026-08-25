/// <reference lib="webworker" />
import { unzipSync } from 'fflate'

/** 此文件作用：等主线程派活，解压，并分批回传文件 */

/** 每批回传文件数，避免单次 postMessage 过大阻塞主线程 */
const CHUNK_SIZE = 40

interface UnzipMsgIn {
    id: number
    data: ArrayBuffer
}

type UnzipMsgOut =
    | { id: number; type: 'start'; total: number } // 开始解压，总文件数
    | { id: number; type: 'chunk'; files: Record<string, ArrayBuffer> } // 分批解压，一批几个文件
    | { id: number; type: 'done' } // 解压完成
    | { id: number; type: 'err'; err: string } // 解压失败

self.onmessage = (e: MessageEvent<UnzipMsgIn>) => {
    const { id, data } = e.data // 接收解压请求
    try {
        const raw = unzipSync(new Uint8Array(data))
        const paths = Object.keys(raw)
        postMessage({ id, type: 'start', total: paths.length } satisfies UnzipMsgOut)

        for (let i = 0; i < paths.length; i += CHUNK_SIZE) {
            const files: Record<string, ArrayBuffer> = {}
            const transfers: ArrayBuffer[] = []
            const end = Math.min(i + CHUNK_SIZE, paths.length)

            for (let j = i; j < end; j++) {
                const path = paths[j]
                const u8 = raw[path]
                const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
                files[path] = buf
                transfers.push(buf)
            }

            postMessage({ id, type: 'chunk', files } satisfies UnzipMsgOut, transfers)
        }

        postMessage({ id, type: 'done' } satisfies UnzipMsgOut)
    } catch (err: any) {
        postMessage({
            id,
            type: 'err',
            err: String(err?.message || err)
        } satisfies UnzipMsgOut)
    }
}
