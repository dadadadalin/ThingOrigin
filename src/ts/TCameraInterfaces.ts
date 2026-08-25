/**
 * @module
 * @mergeModuleWith <project>
 */

import { xyz } from './scenePrams'
import { PerspectiveCamera, OrthographicCamera, Color } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
/**
 * 相机动画配置接口
 */
/**
 * @group Interfaces
 */
export interface CameraAnimationConfig {
    /** 路径点数组 */
    positions: xyz[]
    /** 相机朝向目标点 */
    lookAt: xyz
    /** 每个点之间的过渡时间（毫秒） */
    speed?: number
    /** 是否循环播放 */
    loop?: boolean
    /** 缓动函数类型：控制“怎么走”（速度变化） */
    easingType?: 'linear' | 'nearLinear' | 'smooth' | 'cubic'
    /** 插值方式 控制“走什么路”（路径形状）*/
    interpolationType?: 'bezier' | 'linear'
}

/**
 * 画中画小窗（ArrayCamera 子相机）配置
 */
/**
 * @group Interfaces
 */
export interface ArrayViewOptions {
    /** 视图名称，唯一 */
    name: string
    /** 标签文字 */
    label?: string
    /** 相机位置 */
    position: xyz
    /** 相机朝向 */
    lookAt: xyz
    /** 视场角（透视相机有效） */
    fov?: number
    /** 正交相机视锥高度（仅 cameraType='orthographic' 时有效） */
    frustumSize?: number
    /** 近裁面 */
    near?: number
    /** 远裁面 */
    far?: number
    /** 小窗相机类型：透视 / 正交，默认透视 */
    cameraType?: 'perspective' | 'orthographic'
    /** 小窗停靠位置；'custom' 时用 left/top 自定义左上角坐标 */
    anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom'
    /** 自定义模式下小窗左上角 X（像素，相对容器左上角） */
    left?: number
    /** 自定义模式下小窗左上角 Y（像素，相对容器左上角） */
    top?: number
    /** 小窗宽度（像素） */
    width?: number
    /** 小窗高度（像素） */
    height?: number
    /** 小窗与容器边的间距（像素） */
    padding?: number
    /** 背景色 */
    background?: number | string
    /** 是否绘制 DOM 边框/标签 */
    showBorder?: boolean
    /** 是否开启点击小窗后将主画面切换到该视角（默认 false） */
    clickToSwitch?: boolean
    /** 是否跟随主相机变化：主相机拖动后，小窗 lookAt 同步到主相机看向的目标点（默认 false） */
    followMain?: boolean
}

/** 内部小窗结构 */
/**
 * @group Interfaces
 */
export interface PipView {
    name: string
    label: string
    camera: PerspectiveCamera | OrthographicCamera
    anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom'
    /** 自定义模式下的左上角 X（CSS 像素，相对容器左上角） */
    left: number
    /** 自定义模式下的左上角 Y（CSS 像素，相对容器左上角） */
    top: number
    width: number
    height: number
    padding: number
    background: Color
    showBorder: boolean
    el: HTMLDivElement | null
    /** 是否开启点击切换主视角 */
    clickToSwitch: boolean
    /** 是否跟随主相机变化（主相机拖动时小窗 lookAt 跟着主相机 target 走） */
    followMain: boolean
    /** 小窗 lookAt 目标点（点击切换时直接覆盖到主相机） */
    lookAt: xyz
    /** 上次跟随主相机时记录的主相机 target，用于检测主相机是否变化才同步 */
    lastSyncedTarget: xyz
    /** 点击事件处理函数（用于解绑） */
    clickHandler: ((e: PointerEvent) => void) | null
    /** 小窗自身动画 id（每个小窗独立，互不干扰） */
    animationId: number | null
    /** 小窗动画的 resolve（用于 stopPipAnimation 提前结束） */
    animationResolve: (() => void) | null
    /** 当前像素布局（three 视口坐标，左下原点） */
    x: number
    y: number
    w: number
    h: number
}

/**
 * 单个 ArrayCamera 分屏视图配置
 */
/**
 * @group Interfaces
 */
export interface SplitViewOptions {
    /** 视图名称，唯一 */
    name?: string
    /** 标签文字 */
    label?: string
    /** 相机位置（与 offset/followMain 互斥，优先使用） */
    position?: xyz
    /** 相机朝向 */
    lookAt?: xyz
    /** 相对主相机位置的本地偏移（x=右, y=上, z=前；仅 followMain: true 时生效） */
    offset?: xyz
    /** 视场角 */
    fov?: number
    /** 近裁面 */
    near?: number
    /** 远裁面 */
    far?: number
    /** 是否每帧跟随主相机（拖动 OrbitControls 时同步）
     * true：position = 主相机 + offset，lookAt = 主相机 target
     * false：创建后位置/朝向固定，直到用户在该视口内拖拽
     * 注意：用户在某视口拖拽后，该视口自动脱离 followMain / 固定快照
     */
    followMain?: boolean
    /** 是否允许在该视口内单独拖拽（默认 true） */
    drag?: boolean
    /** 自定义 viewport（像素，three 左下原点）；不传则按 cols/rows 网格自动布局 */
    viewport?: { x: number; y: number; w: number; h: number }
}

/**
 * ArrayCamera 多分屏配置（单次 renderer.render 自动分屏）
 */
/**
 * @group Interfaces
 */
export interface ArraySplitOptions {
    /** 分屏列数；与 rows 配合自动网格布局 */
    cols?: number
    /** 分屏行数 */
    rows?: number
    /** 各分屏视图；数量决定分屏数，cols/rows 可省略由系统自动推算 */
    views?: SplitViewOptions[]
    /** 默认视场角（各视图未指定 fov 时使用） */
    fov?: number
    /** 默认近裁面 */
    near?: number
    /** 默认远裁面 */
    far?: number
    /** 是否绘制网格分隔线 */
    showDivider?: boolean
    /** 分隔线颜色 */
    dividerColor?: string
    /** 分隔线粗细（px） */
    dividerSize?: number
    /** 各视口是否可单独拖拽旋转（默认 true） */
    splitDrag?: boolean
}

/** ArrayCamera 分屏内部结构 */
/**
 * @group Interfaces
 */
export interface SplitView {
    name: string
    label: string
    camera: PerspectiveCamera
    offset: xyz
    lookAt: xyz
    followMain: boolean
    /** 网格列索引（0 起） */
    col: number
    /** 网格行索引（0=底部行，three 左下原点） */
    row: number
    /** 是否使用自定义 viewport（resize 时不按网格重算） */
    customVp: boolean
    /** followMain:false 时锁定的位置 */
    fixedPos: xyz
    /** followMain:false 时锁定的旋转（四元数） */
    fixedQuat: { x: number; y: number; z: number; w: number }
    /** 是否允许单独拖拽 */
    drag: boolean
    /** 用户是否已手动拖拽过（脱离 followMain / 固定快照） */
    manual: boolean
    /** 该视口独立的 OrbitControls */
    orbit: OrbitControls | null
}
