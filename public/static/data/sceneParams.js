export default {
    fileRoot: "/static/three/",
    scene: {
        webglrenderer: {
            alpha: true, //是否支持背景透明
        },
        stats: {
            show: false,
            mode: 0, //监控模式 0:画面每秒传输帧数（fps）  1：画面渲染的时间
        },
        background: {
            type: "sky",
            color: {
                alpha: 0.3, //透明度 取值范围0~1
                color: "#944",
            },
            img: {
                url: "",
            },
            sky: {
                color: { top: "#86b6f5", line: "#ffffff", bottom: "#999999" },
                params: {
                    radius: 4000,
                    widthSegments: 32,
                    heightSegments: 15,
                    skyCenter: [0, 0, 0],
                },
            },
        },
        fog: {
            show: false,
            cameraView: false, //相机附近视野清晰
            color: "#fff",
        },
    },
    camera: {
        position: {
            x: 0,
            y: 80,
            z: 200,
        },
        near: 0.1,
        far: 2000,
    },
    lights: [
        {
            name: "light1",
            type: "DirectionalLight",
            color: undefined,
            intensity: 1,
            position: {
                x: 15,
                y: 5,
                z: 5,
            },
        },
    ],
    controls: {
        orbit: {
            active: true, //是否启用智能相机控制器
        },
        raycaster: {
            active: true, //是否启用鼠标点击控制器
            events: {
                click: true,
                mousemove: true,
            },
        },
        transform: {
            active: false, //是否启用模型变换控制器
        },
        pointerLock: {
            speed: 1000, //是否启用人工漫游控制器
        },
    },
    helper: {
        axes: {
            active: true,
            length: 60,
        },
        grid: {
            active: true,
            size: 150,
            divisions: 30,
            centerLineColor: "black",
            gridColor: "black",
        },
    },
    effectComposer: {
        outlinePass: {
            edgeStrength: 3,
            edgeGlow: 1, //发光
            edgeThickness: 1, //光晕粗
            pulsePeriod: 1, //闪烁
            usePatternTexture: false, //true
            visibleEdgeColor: "red", //边缘颜色
            hiddenEdgeColor: "#190a05",
        },
        bloomPass: {
            strength: 1.5, //泛光的强度
            radius: 1, //泛光散发的半径
            threshold: 1, //泛光的光照强度阈值
        },
    },
    models: [
        // {
        //     name: "sphere",
        //     position: { x: 0, y: 0, z: 0 },
        //     rotation: { x: 0, y: 0, z: 0 },
        //     scale: { x: 1, y: 1, z: 1 },
        //     objInfo: { objType: "sphere", color: "#f00" },
        // },
    ],
};
