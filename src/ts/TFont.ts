/**
 * @module
 * @mergeModuleWith <project>
 */

import { merge } from 'lodash-es'
import {
    BufferGeometry,
    DoubleSide,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    MeshPhongMaterial,
    Object3D,
    ShapeGeometry
} from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader'
import { setModelConfig } from '../private/privateTool'
import { TIndexedDB } from './TIndexedDB'
import { ThingOrigin } from '../ThingOrigin'
import { modelInfoParams } from './TModelInterfaces'
import { fontParams } from './TFontInterfaces'

/**
 * 文字
 */
export class TFont {
    private TO: ThingOrigin
    public fontLoader = new FontLoader()
    private indexedDB: TIndexedDB
    /** 同 fontUrl 复用进行中的加载 */
    private fontInflight = new Map<string, Promise<Font>>()
    /** 已解析字体内存缓存（key 为原始 fontUrl） */
    private fontCache = new Map<string, Font>()

    constructor(TO: ThingOrigin) {
        this.TO = TO
        this.indexedDB = new TIndexedDB(TO)
    }

    /** 默认微软雅黑字体 URL */
    public getDefaultFontUrl(): string {
        return (
            this.TO.sceneData.params.resource.serverAddress + this.TO.sceneData.params.resource.font_Microsoft
        )
    }

    /** sceneData 中 material 可能是 UUID 字符串，归一化为带 color 的对象 */
    private normMat(material: any, color = '#f00') {
        if (material && typeof material === 'object' && material.color != null) return material
        return { color }
    }

    private pickFontUrl(param: modelInfoParams): string {
        return param.base?.fontUrl || param.userData?.base?.fontUrl || this.getDefaultFontUrl()
    }

    /** 批量场景预加载文字字体（与模型下载并行，避免文字模型卡在解析阶段） */
    public preloadFonts(models: modelInfoParams[]): Promise<void> {
        const urls = new Set<string>()
        for (const m of models) {
            if (m.modelType?.toLowerCase() !== 'text') continue
            urls.add(this.pickFontUrl(m))
        }
        if (!urls.size) return Promise.resolve()
        return Promise.all([...urls].map((url) => this.loadFont({ fontUrl: url }))).then(() => undefined)
    }

    private parseFontJson(json: unknown): Font {
        return this.fontLoader.parse(json as Parameters<FontLoader['parse']>[0])
    }

    private async loadFontFile(url: string, cacheKey: string): Promise<Font> {
        const mem = this.fontCache.get(cacheKey)
        if (mem) return mem

        let font: Font
        if (url.startsWith('blob:') || url.startsWith('data:')) {
            const res = await fetch(url)
            font = this.parseFontJson(await res.json())
        } else {
            font = await new Promise<Font>((resolve, reject) => {
                if (!url) {
                    reject(new Error('fontUrl 为空'))
                    return
                }
                this.fontLoader.load(
                    url,
                    (f) => resolve(f),
                    undefined,
                    (err) => reject(err || new Error('字体解析失败'))
                )
            })
        }

        this.fontCache.set(cacheKey, font)
        return font
    }

    /**
     * 加载文字
     * @author LL
     * @param [fontInfo] 字体参数
     * @remarker 将用过的字体缓存到本地，字体id需小于10
     */
    public async loadFont(fontInfo?: Partial<fontParams>) {
        let defaultParams = {
            fontUrl: this.getDefaultFontUrl(),
            fontName: 'Microsoft',
            indexedDB: {
                active: true,
                id: 1
            }
        }
        let param = merge(defaultParams, fontInfo)
        const fontUrl = param.fontUrl
        const cacheKey = fontUrl

        const cached = this.fontCache.get(cacheKey)
        if (cached) return cached

        let pending = this.fontInflight.get(cacheKey)
        if (pending) return pending

        pending = (async () => {
            if (fontUrl.startsWith('blob:') || fontUrl.startsWith('data:')) {
                return this.loadFontFile(fontUrl, cacheKey)
            }

            if (param.indexedDB.active && param.indexedDB.id < 10) {
                const accessInsetResult = await this.indexedDB.accessInsertModel({
                    id: param.indexedDB.id,
                    modelName: param.fontName,
                    base: { modelUrl: fontUrl },
                    modelType: 'font'
                })
                if (!accessInsetResult.modelUrl) {
                    throw new Error('字体缓存失败')
                }
                return this.loadFontFile(accessInsetResult.modelUrl, cacheKey)
            }

            return this.loadFontFile(fontUrl, cacheKey)
        })()

        this.fontInflight.set(cacheKey, pending)
        try {
            return await pending
        } finally {
            this.fontInflight.delete(cacheKey)
        }
    }

    /**
     * 创建文字
     * @author gj LL
     * @since 2021/09/16
     * @param {modelInfoParams} [modelInfo] 模型参数
     */
    public initText(modelInfo?: modelInfoParams): Promise<Object3D> {
        let defaultParams = {
            modelName: 'text-' + new Date().getTime(),
            modelType: 'text',
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
                textType: 'text',
                text: 'ThingOrigin 3D',
                fontUrl: this.getDefaultFontUrl(),
                size: 10,
                depth: 2,
                curveSegments: 12,
                bevelEnabled: false,
                bevelThickness: 20,
                bevelSize: 8,
                bevelSegments: 3
            },
            material: {
                color: '#f00',
                sideColor: '#666'
            }
        }
        let param = merge(defaultParams, modelInfo)
        param.material = this.normMat(param.material, '#f00')
        if (!param.material.sideColor) param.material.sideColor = '#666'

        return new Promise((resolve, reject) => {
            this.loadFont({ fontUrl: this.pickFontUrl(param) })
                .then((font: Font) => {
                    const geometry = new TextGeometry(param.base.text, {
                        font: font,
                        size: param.base.size,
                        depth: param.base.depth,
                        curveSegments: param.base.curveSegments,
                        bevelEnabled: param.base.bevelEnabled,
                        bevelThickness: param.base.bevelThickness,
                        bevelSize: param.base.bevelSize,
                        bevelSegments: param.base.bevelSegments
                    })

                    var meshMaterial = [
                        new MeshPhongMaterial({ color: param.material.color, flatShading: true }), // front
                        new MeshPhongMaterial({ color: param.material.sideColor }) // side
                    ]

                    const geometryObject = new Mesh(geometry, meshMaterial)

                    resolve(setModelConfig(geometryObject, param))
                })
                .catch(reject)
        })
    }

    /**
     * 创建形状文字
     * @author LL
     * @since 2021/09/17
     * @param {modelInfoParams} [modelInfo] 模型参数
     */
    public initTextShape(modelInfo?: modelInfoParams): Promise<Object3D> {
        let defaultParams = {
            modelName: 'textShape-' + new Date().getTime(),
            modelType: 'text',
            base: {
                text: 'ThingOrigin 3D',
                textType: 'shapeText',
                fontUrl: this.getDefaultFontUrl(),
                transparent: true,
                opacity: 0.4,
                size: 10
            },
            material: {
                color: '#f00'
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
        param.material = this.normMat(param.material, '#f00')

        return new Promise((resolve, reject) => {
            this.loadFont({ fontUrl: this.pickFontUrl(param) })
                .then((font: Font) => {
                    var matLite = new MeshBasicMaterial({
                        color: param.material.color,
                        transparent: param.base.transparent,
                        opacity: param.base.opacity,
                        side: DoubleSide
                    })
                    var shapes = font.generateShapes(param.base.text, param.base.size)
                    var geometry = new ShapeGeometry(shapes)
                    geometry.computeBoundingBox()
                    const geometryObject = new Mesh(geometry, matLite)
                    resolve(setModelConfig(geometryObject, param))
                })
                .catch(reject)
        })
    }

    /**
     * 创建描线文字
     * @author LL
     * @since 2021/09/17
     * @param {modelInfoParams} [modelInfo] 模型参数
     */
    public initTextLine(modelInfo?: modelInfoParams): Promise<Object3D> {
        let defaultParams = {
            modelName: 'textLine-' + new Date().getTime(),
            modelType: 'text',
            base: {
                text: 'ThingOrigin 3D',
                textType: 'traceText',
                fontUrl: this.getDefaultFontUrl(),
                size: 10,
                lineWidth: 2,
                opacity: 1
            },
            material: {
                color: '#f00'
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
        param.material = this.normMat(param.material, '#f00')

        return new Promise((resolve, reject) => {
            this.loadFont({ fontUrl: this.pickFontUrl(param) })
                .then((font: Font) => {
                    var matDark = new LineBasicMaterial({
                        color: param.material.color,
                        transparent: true,
                        opacity: param.base.opacity,
                        linewidth: param.base.lineWidth
                    })

                    var shapes = font.generateShapes(param.base.text, param.base.size)
                    const geometry = new ShapeGeometry(shapes)
                    geometry.computeBoundingBox()

                    var holeShapes = []
                    for (var i = 0; i < shapes.length; i++) {
                        var shape = shapes[i]
                        if (shape.holes && shape.holes.length > 0) {
                            for (var j = 0; j < shape.holes.length; j++) {
                                var hole = shape.holes[j]
                                holeShapes.push(hole)
                            }
                        }
                    }
                    shapes.push.apply(shapes, holeShapes)

                    var lineText = new Object3D()

                    for (let i = 0; i < shapes.length; i++) {
                        let shape = shapes[i]

                        var points = shape.getPoints()
                        const geometry = new BufferGeometry().setFromPoints(points)

                        var lineMesh = new Line(geometry, matDark)
                        lineText.add(lineMesh)
                    }

                    resolve(setModelConfig(lineText, param))
                })
                .catch(reject)
        })
    }
}
