/* global __SCENE_API_BASE__:readonly */
/** 资源服务根地址：`npm run build` 注入 http://124.70.30.193:8082，`npm run build:https` 注入 https://124.70.30.193:8444 */
export const RESOURCE_SERVER_BASE = __SCENE_API_BASE__

const maxRadius = 2500

export const sceneData = {
    params: {
        // 数据库参数
        indexedDB: {
            dataBaseName: 'ThingOrigin3D', // 数据库名
            tableName: 'ThingOrigin3D' // 表名
        },
        //资源访问路径
        resource: {
            serverAddress: RESOURCE_SERVER_BASE, // 服务器地址（随 build / build:https 注入）
            model: '/editor/model2/load/ae5636a6-99f4-4780-9e3d-7affeb1c62da', // 模型访问地址
            font_Microsoft: '/editor/model2/load/Microsoft.json', //字体访问地址
            draco: '/file/content?path=gltf/', //draco访问地址
            ktx2: '/file/content?path=basis/', //ktx2访问地址
            rhino3dm: '/file/content?path=rhino3dm/', //rhino3dm访问地址
            // physxWasm: 'https://cdn.jsdelivr.net/npm/physx-js-webidl/physx-js-webidl.wasm', //physxWasm访问地址
            physxWasm: '/file/loadFile/43' //physxWasm访问地址
        }
    },
    // 光源参数
    lights: [
        // scene.environment.type为roomEnvironment所需光源参数
        {
            name: 'factory_hemisphere',
            type: 'HemisphereLight',
            color: '#f0f0ee',
            /** 地面反弹光回到中性灰 */
            groundColor: '#9a948c',
            intensity: 1.0,
            position: { x: 0, y: 220, z: 0 },
            visible: true
        },
        {
            name: 'factory_ambient',
            type: 'AmbientLight',
            color: '#f7f5f0',
            intensity: 0.58,
            visible: true
        },
        {
            name: 'factory_main_sun',
            type: 'DirectionalLight',
            castShadow: true,
            color: '#fffaf2',
            intensity: 2.4,
            position: { x: 150, y: 250, z: 120 },
            visible: true
        },
        {
            name: 'factory_fill_directional',
            type: 'DirectionalLight',
            castShadow: false,
            color: '#fff4e8',
            intensity: 1.0,
            position: { x: -130, y: 110, z: -90 },
            visible: true
        },
        {
            name: 'factory_top_fill',
            type: 'DirectionalLight',
            castShadow: false,
            color: '#fff8ee',
            intensity: 1.2,
            position: { x: 0, y: 300, z: 0 },
            visible: true
        }
        // scene.environment.type为 HDR 所需光源参数
        // {
        //     name: 'factory_hemisphere',
        //     type: 'HemisphereLight',
        //     /** 中性天光，避免整体偏蓝 */
        //     color: '#f0f0ee',
        //     /** 地面反弹光回到中性灰 */
        //     groundColor: '#9a948c',
        //     intensity: 1.05,
        //     position: { x: 0, y: 220, z: 0 },
        //     visible: true,
        // },
        // {
        //     name: 'factory_ambient',
        //     type: 'AmbientLight',
        //     color: '#f7f5f0',
        //     intensity: 0.62,
        //     visible: true,
        // },
        // {
        //     name: 'factory_main_sun',
        //     type: 'DirectionalLight',
        //     castShadow: true,
        //     /** 主光改为中性白 */
        //     color: '#fffaf2',
        //     intensity: 2.4,
        //     position: { x: 150, y: 250, z: 120 },
        //     visible: true,
        // },
        // {
        //     name: 'factory_fill_directional',
        //     type: 'DirectionalLight',
        //     castShadow: false,
        //     color: '#fff4e8',
        //     intensity: 1.1,
        //     position: { x: -130, y: 110, z: -90 },
        //     visible: true,
        // },
        // {
        //     name: 'factory_top_fill',
        //     type: 'DirectionalLight',
        //     castShadow: false,
        //     /** 额外顶补光，模拟厂房顶棚泛光 */
        //     color: '#fff8ee',
        //     intensity: 1.35,
        //     position: { x: 0, y: 300, z: 0 },
        //     visible: true,
        // },
    ],
    // 场景参数
    scene: {
        // 渲染质量
        renderQuality: {
            alpha: true, // 是否启用alpha通道
            autoClear: true, // 是否启用自动清除
            antialias: true, // 是否启用抗锯齿
            logarithmicDepthBuffer: true, // 解决穿模，精度0.001
            shadowMap: {
                enabled: false // 是否启用阴影
            },
            // 色调映射
            toneMapping: {
                type: 'ACESFilmicToneMapping', // 切换到Reinhard，更适合高曝光场景
                exposure: 1, // 大幅提高曝光度（原2.8→4.5）
                typeList: [
                    'NoToneMapping', //无色调映射，直接输出线性颜色。
                    'LinearToneMapping', //线性色调映射，将线性颜色映射到显示器的范围。
                    'ReinhardToneMapping', //Reinhard色调映射，模拟人眼对亮度的感知。
                    'CineonToneMapping', //Cineon色调映射，模拟电影胶片的色调映射。
                    'ACESFilmicToneMapping' //ACES Filmic色调映射，模拟电影和电视的色调映射。
                ]
            },
            /** webgl | webgpu | auto */
            renderer: 'webgpu',
            /** r185 WebGPU 特性（renderer 为 webgpu/auto 且支持时生效） */
            webgpu: {
                opaqueClear: true, // 是否启用透明清除
                clusteredLighting: { active: false, maxLights: 512 }, // 是否启用聚光灯照明
                bloom: { active: false, strength: 0.35 }, // 是否启用泛光
                ssr: { active: false, denoise: true }, // 是否启用屏幕空间反射
                scatteringFog: { active: false, color: '#b8c8e8', density: 0.015 } // 是否启用散射雾
            }
        },
        // 性能监控
        stats: {
            active: false, // 是否显示性能监控
            mode: 0 // 监控模式 0:画面每秒传输帧数（fps）  1：画面渲染的时间
        },
        // 环境光
        environment: {
            active: true,
            type: 'roomEnvironment',
            typeList: [
                'roomEnvironment', //室内环境
                'EquirectangularReflectionMapping', //经纬线映射贴图
                'HDR' //HDR
            ],
            EquirectangularReflectionMappingConfig: {
                url: ''
            },
            HDRConfig: {
                background: false,
                url: '/file/loadFile/35' //HDR图片地址 file/loadFile/32
                // url: '/public/hdr/kloppenheim_05_1k.hdr', //HDR图片地址 file/loadFile/32
                // url: '/public/models/测试模型/hdr/工厂HDR2.hdr', //HDR图片地址 file/loadFile/32
            },
            intensity: 1
        },
        // 背景
        background: {
            type: 'sky', // 类型（sky:渐变天空盒;sky-physical:物理天空(WebGPU);color:颜色;img:图片;workshop:工厂）
            // 颜色
            color: {
                alpha: 1, // 透明度 取值范围0~1
                color: '#000000' // 背景颜色
            },
            intensity: 1,
            // 天空盒
            sky: {
                color: { top: '#86b6f5', line: '#ffffff', bottom: '#999999' }, // 天空盒颜色
                params: {
                    spaceType: 'world', // 渐变空间类型：'world'（世界空间，默认）或 'screen'（屏幕空间）
                    radius: maxRadius, // 半径
                    widthSegments: 32, // 宽度分段数
                    heightSegments: 15, // 高度分段数
                    skyCenter: { x: 0, y: 0, z: 0 } // 天空盒中心点
                }
            },
            // 物理天空（r185 SkyMesh：Preetham 大气散射 + 太阳圆盘 + 云；仅 WebGPU 渲染器，type='sky-physical' 时生效）
            skyPhysical: {
                scale: 10000, // 天空盒缩放（需远大于场景尺寸）
                turbidity: 2, // 浑浊度 0-20（越大越雾）
                rayleigh: 1, // 瑞利散射 0-4（越大天空越蓝）
                mieCoefficient: 0.005, // 米氏系数
                mieDirectionalG: 0.8, // 米氏方向性 0-1
                showSunDisc: true, // 是否显示太阳圆盘
                sun: {
                    elevation: 2, // 太阳仰角（度，0=地平线，90=天顶）
                    azimuth: 180 // 太阳方位角（度，0-360，正北=0）
                },
                clouds: {
                    active: true, // 是否启用云
                    coverage: 0.4, // 云量 0-1
                    density: 0.4, // 云密度
                    scale: 0.0002, // 云缩放
                    speed: 0.0001, // 云移动速度
                    elevation: 0.5 // 云高度
                }
            },
            img: {
                url: '/public/img/sky.jpg'
            },
            cubeMap: {
                url: [
                    '/public/cubmap/pos-x.jpg',
                    '/public/cubmap/neg-x.jpg',
                    '/public/cubmap/pos-y.jpg',
                    '/public/cubmap/neg-y.jpg',
                    '/public/cubmap/pos-z.jpg',
                    '/public/cubmap/neg-z.jpg'
                ]
            },
            workshop: {
                id: 7243,
                base: {
                    modelUrl: '/editor/model2/loadFileAsId/114783024'
                },
                modelType: 'glb'
            }
        },
        ground: {
            active: false,
            base: {
                type: 'rect',
                rect: {
                    width: maxRadius * 2,
                    height: maxRadius * 2
                }
            },
            material: {
                type: 'color',
                doubleSide: true,
                color: {
                    color: '#eee',
                    opacity: 1
                },
                image: {
                    url: `${RESOURCE_SERVER_BASE}/image/download/grass.jpg`,
                    repeatX: 1000,
                    repeatY: 1000
                }
            }
        },
        //雾
        fog: {
            active: false, // 关闭雾效，避免黑色雾让场景变暗
            cameraView: true, // 相机附近视野清晰
            color: '#9aa3ad', // 改为浅灰色雾，如果需要启用雾
            /** linear | exp2 | scattering（WebGPU TSL 散射雾） */
            type: 'linear',
            density: 0.015,
            sunDirection: { x: 0.5, y: 0.8, z: 0.3 }
        }
    },
    // 控制器参数
    controls: {
        orbit: {
            active: true, // 是否启用智能相机控制器
            autoRotate: false, // 自动旋转
            autoRotateSpeed: 0.5, // 旋转速度
            enableDamping: true, // 惯性
            dampingFactor: 0.5, // 阻尼惯性
            enableZoom: true, // 禁止滚轮缩放
            minDistance: 1,
            maxDistance: maxRadius
        },
        drag: {
            active: false // 是否启用拖拽控制器
        },
        raycaster: {
            active: true, //是否启用鼠标点击控制器
            // 鼠标事件
            events: {
                click: true, // 点击事件
                mousemove: true // 移动事件
            }
        },
        transform: {
            active: false //是否启用模型变换控制器
        },
        pointerLock: {
            speed: 1000 //是否启用人工漫游控制器
        }
    },
    // 辅助参数
    helper: {
        // 坐标轴
        axes: {
            active: false, // 是否启用
            length: 20 // 轴长度
        },
        //视图辅助器
        view: {
            active: true // 是否启用
        },
        // 网格
        grid: {
            active: false, // 是否启用
            size: 40, // 网格大小
            divisions: 40, // 网格分段数
            centerLineColor: 'black', // 中心线颜色
            gridColor: 'black' // 网格颜色
        }
    },
    // 相机参数
    camera: {
        type: 'PerspectiveCamera', // 相机类型（PerspectiveCamera：透视相机；OrthographicCamera：正交相机）
        // 相机位置
        position: {
            x: 0,
            y: 2,
            z: 20
        },
        // 相机中心点
        lookAt: {
            x: 0,
            y: 0,
            z: 0
        },
        // 透视相机参数
        perspective: {
            fov: 45, // 摄像机视锥体垂直视野角度
            near: 0.1, // 摄像机视锥体近端面
            far: maxRadius * 2 // 摄像机视锥体远端面
        }
    },

    // 后处理参数
    effectComposer: {
        // 高亮
        outlinePass: {
            edgeStrength: 5, // 边缘强度
            edgeGlow: 1, // 发光
            edgeThickness: 6, // 光晕粗
            pulsePeriod: 1, // 闪烁
            usePatternTexture: false, // true
            visibleEdgeColor: 'yellow', // 边缘颜色
            hiddenEdgeColor: '#190a05',
            maxOutlineSlots: 8, // 并发描边槽位上限（同时最多多少个模型各自独立颜色呼吸）
            // 呼吸灯可调参数
            breathSpeed: 4.0, // 呼吸脉动速度
            emissiveMin: 0.0, // 自发光强度下限
            emissiveMax: 0.4, // 自发光强度上限（过大易洗白模型）
            edgeMinRatio: 0.5, // 描边强度相对 edgeStrength 的下限比例
            edgeMaxRatio: 0.78, // 描边强度相对 edgeStrength 的上限比例
            emissiveColorMix: 0.35 // 呼吸色混入原 emissive 的最大比例（0~1）
        },
        // 泛光
        bloomPass: {
            strength: 0.05, // 泛光的强度，提升亮部光晕（原1.5→1.8）
            radius: 0.4, // 泛光散发的半径（原1→1.2）
            threshold: 0.98 // 降低阈值，让更多区域产生泛光（原0.8→0.6）
        }
    },
    // 物理引擎参数
    physicsSim: {
        open: true, // 是否开启物理引擎
        gravity: {
            // 重力
            x: 0,
            y: -9.82,
            z: 0
        }
    },
    modelList: [],
    animationList: [],
    markerList: [],
    //事件
    handleList: [],
    //模型关联关系
    attachList: []
}
