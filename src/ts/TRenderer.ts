/**
 * @module
 * @mergeModuleWith <project>
 */

import {
    ACESFilmicToneMapping,
    CineonToneMapping,
    SRGBColorSpace,
    LinearToneMapping,
    NoToneMapping,
    PCFSoftShadowMap,
    ReinhardToneMapping,
    WebGLRenderer
} from 'three'
import { WebGPURenderer } from 'three/webgpu'
import WebGPU from 'three/examples/jsm/capabilities/WebGPU.js'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { ThingOrigin } from '../ThingOrigin'
import { renderQualityParam, RendererMode, toneMappingParams } from './scenePrams'
import { merge } from 'lodash-es'

/**
 * @group Types
 */
export type TORenderer = WebGLRenderer | WebGPURenderer

/**
 * 渲染器（WebGL / WebGPU 双后端）
 */
export class TRenderer {
    TO: ThingOrigin

    /** 当前 Three 渲染器实例 */
    public renderer: TORenderer | null = null
    public rendererView: Map<string, any> = new Map<string, any>()
    public CSS2DRenderer: CSS2DRenderer

    /** 是否使用 WebGPU 后端 */
    public isWebGPU = false

    private rendererMode: RendererMode = 'webgl'

    constructor(TO: ThingOrigin) {
        this.TO = TO
    }

    /**
     * 异步初始化渲染器（须在 createScene 早期调用）
     * @author LL
     * @since 2026/07/22
     */
    public async initRenderer(): Promise<void> {
        const rq = this.TO.sceneData.scene.renderQuality
        this.rendererMode = rq?.renderer ?? 'webgl'

        let useWebGPU = this.rendererMode === 'webgpu'
        if (this.rendererMode === 'auto') {
            useWebGPU = WebGPU.isAvailable()
        }

        const renderParams: renderQualityParam = {
            logarithmicDepthBuffer: rq.logarithmicDepthBuffer,
            antialias: rq.antialias,
            alpha: rq.alpha
        }

        const w = this.TO.container.clientWidth
        const h = this.TO.container.clientHeight

        if (useWebGPU) {
            try {
                const wgpu = new WebGPURenderer({
                    antialias: renderParams.antialias,
                    alpha: renderParams.alpha ?? true,
                    // r185：补齐 logarithmicDepthBuffer（原仅 WebGL 传入），大尺度场景下避免深度精度不足导致的穿模/闪烁
                    logarithmicDepthBuffer: renderParams.logarithmicDepthBuffer
                })
                wgpu.outputColorSpace = SRGBColorSpace
                wgpu.setPixelRatio(Math.min(window.devicePixelRatio, 2))
                wgpu.setSize(w, h)
                await wgpu.init()
                this.renderer = wgpu
                this.isWebGPU = true
            } catch (e) {
                console.warn('[ThingOrigin] WebGPU 初始化失败，回退 WebGL', e)
                this.createWebGLRenderer(renderParams, w, h)
            }
        } else {
            this.createWebGLRenderer(renderParams, w, h)
        }

        const rendererLabel = this.isWebGPU ? 'WebGPU' : 'WebGL'
        console.log(`ThingOrigin2.0.js\n渲染器: ${rendererLabel}\n           by - SIA8`)

        this.renderer.domElement.style.position = 'absolute'
        this.renderer.domElement.style.bottom = '0'
        this.TO.container.appendChild(this.renderer.domElement)

        this.CSS2DRenderer = new CSS2DRenderer()
        this.CSS2DRenderer.setSize(w, h)
        this.CSS2DRenderer.domElement.id = 'CSS2DDom'
        this.CSS2DRenderer.domElement.style.position = 'absolute'
        this.CSS2DRenderer.domElement.style.bottom = '0'
        this.CSS2DRenderer.domElement.style.pointerEvents = 'none'
        this.TO.container.appendChild(this.CSS2DRenderer.domElement)

        this.setRenderQuality()
        // r185：WebGPU 也需设置 toneMapping/toneMappingExposure，由 RenderPipeline 的 renderOutput 消费
        this.setToneMapping()
    }

    /**
     * 创建 WebGL 渲染器
     * @param renderParams 渲染器参数
     * @param w 宽度
     * @param h 高度
     * @author LL
     * @since 2026/07/22
     */
    private createWebGLRenderer(renderParams: renderQualityParam, w: number, h: number) {
        const gl = new WebGLRenderer(renderParams)
        gl.outputColorSpace = SRGBColorSpace
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        gl.setSize(w, h)
        this.renderer = gl
        this.isWebGPU = false
    }

    /**
     * 获取渲染器模式
     * @returns RendererMode: webgl | webgpu
     * @author LL
     * @since 2026/07/22
     */
    public getRendererMode(): RendererMode {
        return this.isWebGPU ? 'webgpu' : 'webgl'
    }

    /**
     * 获取 WebGL 渲染器
     * @returns WebGLRenderer | null
     * @author LL
     * @since 2026/07/22
     */
    public get webglRenderer(): WebGLRenderer | null {
        if (!this.renderer || this.isWebGPU) return null
        return this.renderer as WebGLRenderer
    }

    /**
     * 设置渲染器质量
     * @param renderQualityParams 渲染器质量参数
     * @author LL
     */
    public setRenderQuality(renderQualityParams?: renderQualityParam) {
        if (!this.renderer) return
        let defaultRenderQualityParams = merge(
            this.TO.sceneData.scene.renderQuality,
            renderQualityParams || {}
        )
        this.renderer.autoClear = defaultRenderQualityParams.autoClear
        if (!this.isWebGPU && defaultRenderQualityParams.shadowMap?.enabled) {
            const gl = this.renderer as WebGLRenderer
            gl.shadowMap.enabled = true
            gl.shadowMap.type = PCFSoftShadowMap
        }
    }

    /**
     * 设置色调映射
     * @param toneMappingParams 色调映射参数
     * @author LL
     */
    public setToneMapping(toneMappingParams?: toneMappingParams) {
        if (!this.renderer) return
        const gl = this.renderer as WebGLRenderer
        let defaultToneMappingParams = merge(
            this.TO.sceneData.scene.renderQuality.toneMapping,
            toneMappingParams || {}
        )
        switch (defaultToneMappingParams.type) {
            case 'NoToneMapping':
                gl.toneMapping = NoToneMapping
                break
            case 'LinearToneMapping':
                gl.toneMapping = LinearToneMapping
                break
            case 'ReinhardToneMapping':
                gl.toneMapping = ReinhardToneMapping
                break
            case 'CineonToneMapping':
                gl.toneMapping = CineonToneMapping
                break
            case 'ACESFilmicToneMapping':
                gl.toneMapping = ACESFilmicToneMapping
                break
        }
        if (defaultToneMappingParams.type === 'NoToneMapping') {
            gl.toneMappingExposure = 0
        } else {
            gl.toneMappingExposure = defaultToneMappingParams.exposure || 1.2
        }
    }

    /**
     * 清理渲染器资源
     * @author LL
     */
    public dispose(): void {
        if (this.renderer) {
            this.renderer.dispose()
            if (this.renderer.domElement?.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
            }
            this.renderer = null
        }
        if (this.CSS2DRenderer?.domElement?.parentNode) {
            this.CSS2DRenderer.domElement.parentNode.removeChild(this.CSS2DRenderer.domElement)
        }
        this.rendererView.forEach((renderer) => {
            if (renderer?.dispose) renderer.dispose()
        })
        this.rendererView.clear()
    }
}
