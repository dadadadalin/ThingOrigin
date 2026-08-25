/**
 * 生成文档后：侧栏导航只保留 Classes 下的类列表
 * Interfaces / Types / Utils 页面仍保留，可从类文档类型链接进入
 */
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

const navPath = path.resolve('doc/assets/navigation.js')
if (!fs.existsSync(navPath)) {
    console.error('未找到', navPath, '请先 npm run doc')
    process.exit(1)
}

const raw = fs.readFileSync(navPath, 'utf8')
const m = raw.match(/window\.navigationData\s*=\s*"([^"]+)"/)
if (!m) {
    console.error('无法解析 navigationData')
    process.exit(1)
}

const tree = JSON.parse(zlib.inflateSync(Buffer.from(m[1], 'base64')).toString())

function flatten(nodes) {
    if (!Array.isArray(nodes)) return []
    const out = []
    for (const n of nodes) {
        if (!n || typeof n !== 'object') continue
        const text = (n.text || '').trim()
        // 只保留 Classes 分组里的子项；其它分组整组丢掉
        if (text === 'Classes' && Array.isArray(n.children)) {
            out.push(...n.children)
            continue
        }
        if (/^(Interfaces|Types|Utils|Modules|Type Aliases|Functions|Variables)$/i.test(text)) {
            continue
        }
        // 未分组的类节点（兜底）
        if (n.path && String(n.path).includes('classes/')) {
            out.push(n)
        }
    }
    return out
}

const filtered = flatten(tree)
const encoded = zlib.deflateSync(Buffer.from(JSON.stringify(filtered))).toString('base64')
fs.writeFileSync(navPath, `window.navigationData = "${encoded}"`)
console.log(`导航已精简：仅 Classes（${filtered.length} 项）`)
