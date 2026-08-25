/**
 * TypeDoc 插件：从文档中彻底移除 Constructor
 */
import { Application, Converter, ReflectionKind } from 'typedoc'

/** @param {import('typedoc').Application} app */
export function load(app) {
    // 转换结束后再删，避免被后续分组逻辑加回来
    app.converter.on(Converter.EVENT_END, (context) => {
        stripConstructors(context.project)
    })

    // 渲染前再清一次（兼容 merge-modules 等插件的后续改动）
    app.on(Application.EVENT_RENDER_BEGIN, (event) => {
        stripConstructors(event.project)
    })
}

/** @param {import('typedoc').ProjectReflection} project */
function stripConstructors(project) {
    const toRemove = []
    for (const id of Object.keys(project.reflections)) {
        const ref = project.reflections[id]
        if (!ref) continue
        if (
            ref.kind === ReflectionKind.Constructor ||
            ref.kind === ReflectionKind.ConstructorSignature ||
            ref.name === 'constructor'
        ) {
            toRemove.push(ref)
        }
    }
    for (const ref of toRemove) {
        project.removeReflection(ref)
    }

    // 清掉空的 Constructors 分组
    cleanEmptyConstructorGroups(project)
}

/** @param {import('typedoc').ContainerReflection} ref */
function cleanEmptyConstructorGroups(ref) {
    if (ref.groups) {
        ref.groups = ref.groups.filter((g) => {
            const title = (g.title || '').toLowerCase()
            if (title === 'constructors' || title === '构造函数') return false
            return g.children && g.children.length > 0
        })
    }
    if (ref.categories) {
        ref.categories = ref.categories.filter((c) => {
            const title = (c.title || '').toLowerCase()
            if (title === 'constructors' || title === '构造函数') return false
            return c.children && c.children.length > 0
        })
    }
    if (ref.children) {
        for (const child of ref.children) cleanEmptyConstructorGroups(child)
    }
}
