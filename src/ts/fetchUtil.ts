/**
 * 工具函数
 * @module
 * @mergeModuleWith <project>
 */

/**
 * 默认下载超时（大模型/zip）
 * @group Utils
 */
export const FETCH_TIMEOUT_MS = 120000

/**
 * fetch + AbortController 超时
 * @group Utils
 */
export async function fetchWithTimeout(
    url: string,
    opts: RequestInit & { timeout?: number } = {}
): Promise<Response> {
    const { timeout = FETCH_TIMEOUT_MS, ...init } = opts
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeout)

    try {
        return await fetch(url, { ...init, signal: ctrl.signal })
    } catch (err: any) {
        if (ctrl.signal.aborted) {
            throw new Error(`下载超时 (${timeout}ms): ${url}`)
        }
        throw err
    } finally {
        clearTimeout(timer)
    }
}

/**
 * @group Utils
 */
export async function fetchBlob(url: string, timeout?: number): Promise<Blob> {
    const res = await fetchWithTimeout(url, { timeout })
    if (!res.ok) throw new Error(`下载失败，状态码: ${res.status}`)
    return res.blob()
}

/**
 * @group Utils
 */
export async function fetchArrayBuffer(url: string, timeout?: number): Promise<ArrayBuffer> {
    const res = await fetchWithTimeout(url, { timeout })
    if (!res.ok) throw new Error(`下载失败，状态码: ${res.status}`)
    return res.arrayBuffer()
}

/**
 * 拼接 serverAddress + 相对路径，避免缺少 / 导致 URL 无效
 * @group Utils
 */
export function resUrl(base: string, path: string): string {
    if (!path) return base
    if (/^https?:\/\//i.test(path)) return path
    const root = base.endsWith('/') ? base.slice(0, -1) : base
    const rel = path.startsWith('/') ? path : `/${path}`
    return root + rel
}
