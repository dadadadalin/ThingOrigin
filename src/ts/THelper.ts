/**
 * @module
 * @mergeModuleWith <project>
 */

import {
    AxesHelper,
    BoxHelper,
    CanvasTexture,
    Color,
    GridHelper,
    Object3D,
    Plane,
    PlaneHelper,
    SRGBColorSpace,
    Sprite,
    SpriteMaterial,
    Vector3,
    Camera,
    WebGLRenderer,
} from 'three'
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js'
import { TScene } from './TScene'
import { merge } from 'lodash-es'
import { setModelConfig } from '../private/privateTool'
import { modelInfoParams } from './TModelInterfaces'
import { xyz } from './scenePrams'
import type { TORenderer } from './TRenderer'

/**
 * 辅助器
 */
export class THelper {
    private tScene: TScene
    grid: GridHelper
    axes: AxesHelper
    box: BoxHelper
    boxList: any[] = []
    view: ViewHelper | null = null
    viewRenderer: WebGLRenderer | null = null // ViewHelper 独立渲染器（若使用主渲染器则为 null）
    viewContainer: HTMLElement | null = null // ViewHelper 的 DOM 容器（独立模式）
    private viewLabelSprites: Sprite[] = [] // X/Y/Z 轴标注，用于 dispose

    constructor(tScene: TScene) {
        this.tScene = tScene
    }

    /**
     * 创建坐标轴
     * @author LL
     * @param {number} [len=50]
     */
    public initAxes(len: number = 50, position: xyz | Vector3 = { x: 0, y: 0, z: 0 }) {
        //辅助工具
        this.axes = new AxesHelper(len)
        this.axes.position.set(position.x, position.y, position.z)
        this.tScene.add(this.axes)
    }

    /**
     * 删除坐标轴
     * @author LL
     * @returns {boolean} 是否成功删除
     */
    public removeAxes(): boolean {
        if (!this.axes) {
            return false
        }

        // 先从场景中移除，避免重复移除
        if (this.axes.parent) {
            this.axes.parent.remove(this.axes)
        }

        // 清理资源
        // AxesHelper 继承自 LineSegments，有 geometry 和 material
        if ((this.axes as any).geometry) {
            ;(this.axes as any).geometry.dispose()
        }

        // 清理材质（可能是单个材质或材质数组）
        const material = (this.axes as any).material
        if (material) {
            if (Array.isArray(material)) {
                material.forEach((mat) => {
                    if (mat && mat.dispose) {
                        mat.dispose()
                    }
                })
            } else if (material.dispose) {
                material.dispose()
            }
        }

        // 清空引用
        this.axes = null

        return true
    }

    /**
     * 给模型创建包围盒
     * @author LL
     * @param {Object3D} model
     */
    public initBox(model: Object3D) {
        if (!model) {
            console.warn('包围盒加载失败，物体不存在')
            return
        }

        this.box = new BoxHelper(model)
        this.box.name = model.name + '-boxHelper'
        this.boxList.push(this.box)

        this.tScene.add(this.box)
    }

    /**
     * 移除包围盒
     * @author LL
     */
    public removeBox(modelName?: string) {
        if (modelName) {
            let index = this.boxList.findIndex((item) => item.name === modelName + '-boxHelper')
            if (index != -1) {
                this.tScene.remove(this.boxList[index])
                this.boxList.splice(index, 1)
            }
        } else {
            this.boxList.forEach((item) => {
                this.tScene.remove(item)
            })
            this.boxList = []
        }

        // if (this.box) {
        //   this.tScene.remove(this.box);
        //   this.box = null;
        // }
    }

    /**
     * 更新包围盒
     * @author LL
     */
    public updateBox() {
        if (this.box) {
            this.box.update()
            // let box = this.tScene.getObjectByProperty("type", "BoxHelper");
            // if (box) {
            //     (box as BoxHelper).update();
            // }
        }
    }

    /**
     * 创建grid
     * @author LL
     * @param {{}} [gridInfo] grid参数
     */
    public initGrid(gridInfo?: {}) {
        let defaultParams = {
            size: 100,
            divisions: 30,
            colorCenterLine: '#000000',
            colorGrid: '#000000',
        }
        let param = merge(defaultParams, gridInfo)
        this.grid = new GridHelper(
            param.size,
            param.divisions,
            new Color(param.colorCenterLine),
            new Color(param.colorGrid)
        )
        this.grid.name = 'gridHelper'
        this.grid.position.y -= 1
        this.tScene.add(this.grid)
    }

    /**
     * 删除grid
     * @author LL
     * @since 24/12/2021
     */
    public removeGrid() {
        if (this.grid) {
            this.tScene.remove(this.grid)
            this.grid = null
        }
    }

    /**
     * 创建面板
     * @author LL
     * @since 2024/06/03
     * @param {modelInfoParams} modelInfo 模型参数
     */
    public initPlaneHelper(modelInfo?: modelInfoParams): Object3D {
        let defaultParams = {
            modelName: 'planeHelper-' + new Date().getTime(),
            position: {
                x: 0,
                y: 0,
                z: 0,
            },
            scale: {
                x: 1,
                y: 1,
                z: 1,
            },
            rotation: {
                x: -Math.PI / 2,
                y: 0,
                z: 0,
            },
            base: {
                //法向量
                normal: {
                    x: 1,
                    y: 0,
                    z: 0,
                },
                distance: 0, //平面到原点的距离
                size: 1, //大小
            },
            material: {
                color: '0xffff00',
            },
        }
        let param = merge(defaultParams, modelInfo)
        const plane = new Plane(
            new Vector3(param.base.normal.x, param.base.normal.y, param.base.normal.z),
            param.base.distance
        )
        const helper = new PlaneHelper(plane, param.base.size, new Color(param.material.color).getHex())

        return setModelConfig(helper, param)
    }

    /**
     * 初始化视图辅助器（独立小画布叠加，避免 WebGPU RenderPipeline 与 helper 同画布混绘导致残影/viewport 被污染）
     * - 与主场景共享相机，旋转时自动跟随
     * - 点击 X/Y/Z 轴切换主相机视角
     * @author gj
     * @since 2026/02/10
     * @param camera 相机实例
     * @param host 主容器（右下角挂载 128x128 叠加层）
     * @param opts.width / opts.height 叠加层尺寸，默认 128
     */
    public initView(
        camera: Camera,
        host: HTMLElement,
        opts?: { width?: number; height?: number }
    ): ViewHelper {
        if (!camera) throw new Error('ViewHelper 需要相机实例')
        if (!host) throw new Error('ViewHelper 需要 DOM 元素')

        if (this.view) this.removeView()

        const w = opts?.width ?? 128
        const h = opts?.height ?? 128

        const wrap = document.createElement('div')
        wrap.id = 'TO-view-helper'
        wrap.style.cssText = [
            'position:absolute',
            'right:0',
            'bottom:0',
            `width:${w}px`,
            `height:${h}px`,
            'z-index:10',
            'pointer-events:auto',
            'touch-action:none'
        ].join(';')
        const cs = getComputedStyle(host)
        if (cs.position === 'static') {
            host.style.position = 'relative'
        }
        host.appendChild(wrap)

        const canvas = document.createElement('canvas')
        canvas.style.cssText = 'width:100%;height:100%;display:block;'
        wrap.appendChild(canvas)

        // 独立 WebGL 小画布：不与主场景 WebGPU/EffectComposer 抢同一 drawing buffer
        const gl = new WebGLRenderer({ canvas, alpha: true, antialias: true })
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        gl.setSize(w, h, false)
        gl.setClearColor(0x000000, 0)
        gl.autoClear = true

        this.viewContainer = wrap
        this.viewRenderer = gl
        this.view = new ViewHelper(camera, canvas)
        // 小画布铺满：从左下角画满 dim 区域
        this.view.location.left = 0
        this.view.location.bottom = 0
        this.view.location.right = null as any
        this.view.location.top = null

        this.viewLabelSprites = this.addViewHelperLabels(this.view)
        return this.view
    }

    /**
     * 在 ViewHelper 的 X/Y/Z 轴端点添加文字标注
     * @author gj
     * @since 2026/02/10
     * @param view ViewHelper 实例
     */
    private addViewHelperLabels(view: ViewHelper): Sprite[] {
        const configs = [
            { text: 'X', color: '#ff4466', pos: [1.5, 0, 0] as [number, number, number] },
            { text: 'Y', color: '#88ff44', pos: [0, 1.5, 0] as [number, number, number] },
            { text: 'Z', color: '#4488ff', pos: [0, 0, 1.5] as [number, number, number] },
        ]
        const sprites: Sprite[] = []
        for (const cfg of configs) {
            const mat = this.createTextSpriteMaterial(cfg.text, cfg.color)
            const sprite = new Sprite(mat)
            sprite.position.set(...cfg.pos)
            sprite.scale.set(0.5, 0.5, 1)
            sprite.renderOrder = 999
            view.add(sprite)
            sprites.push(sprite)
        }
        return sprites
    }

    /**
     * 创建文字精灵材质
     * @author gj
     * @since 2026/02/10
     * @param text 文字
     * @param color 颜色
     */
    private createTextSpriteMaterial(text: string, color: string): SpriteMaterial {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, size, size)
        ctx.font = 'bold 72px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 4
        ctx.strokeText(text, size / 2, size / 2)
        ctx.fillStyle = color
        ctx.fillText(text, size / 2, size / 2)
        const texture = new CanvasTexture(canvas)
        texture.needsUpdate = true
        texture.colorSpace = SRGBColorSpace
        return new SpriteMaterial({
            map: texture,
            toneMapped: false,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            alphaTest: 0.01,
        })
    }

    /**
     * 更新视图辅助器（必须在动画循环中调用，才能实现点击后的相机切换动画）
     * @author gj
     * @since 2026/02/10
     * @param delta 时间增量（秒），用于动画更新
     */
    public updateView(delta: number): void {
        if (this.view?.animating) this.view.update(delta)
    }

    /**
     * 渲染视图辅助器（独立小画布，每帧 autoClear，无残影、不污染主场景 viewport）
     * @author gj
     * @since 2026/02/10
     */
    public renderView(_mainRenderer?: TORenderer): void {
        if (!this.view || !this.viewRenderer) return
        this.viewRenderer.autoClear = true
        this.view.render(this.viewRenderer)
    }

    /**
     * 处理视图辅助器的点击事件，点击 X/Y/Z 轴后主场景相机切换
     * @author gj
     * @since 2026/02/10
     * @param event 鼠标事件
     */
    public handleViewClick(event: MouseEvent): boolean {
        if (!this.view) return false
        return this.view.handleClick(event)
    }

    /**
     * 移除视图辅助器
     * @author gj
     * @since 2026/02/10
     */
    public removeView(): void {
        if (this.view) {
            for (const s of this.viewLabelSprites) {
                this.view.remove(s)
                if (s.material?.map) s.material.map.dispose()
                if (s.material) s.material.dispose()
            }
            this.viewLabelSprites = []
            this.view.dispose()
            this.view = null
        }
        if (this.viewRenderer) {
            this.viewRenderer.dispose()
            this.viewRenderer = null
        }
        if (this.viewContainer && this.viewContainer.parentNode) {
            this.viewContainer.parentNode.removeChild(this.viewContainer)
            this.viewContainer = null
        }
    }
}
