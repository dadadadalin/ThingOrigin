export default {
    fileRoot: "/static/three/",
    scene: {
        webglrenderer: {
            alpha: true, //是否支持透明
        },
        stats: {
            show: true,
            mode: 0,
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
            show: true,
            cameraView: false, //相机附近视野清晰
            color: "#fff",
        },
    },
    camera: {
        position: {
            x: 0,
            y: 100,
            z: 500,
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
        {
            name: "light2",
            type: "DirectionalLight",
            color: undefined,
            intensity: 1,
            position: {
                x: 10,
                y: 5,
                z: -10,
            },
        },
        {
            name: "light3",
            type: "DirectionalLight",
            color: undefined,
            intensity: 1,
            position: {
                x: 10,
                y: -5,
                z: 5,
            },
        },
        {
            name: "light4",
            type: "DirectionalLight",
            color: undefined,
            intensity: 1,
            position: {
                x: -10,
                y: -5,
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
