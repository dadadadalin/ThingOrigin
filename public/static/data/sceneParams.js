export default {
    fileRoot: "/static/three/",
    scene: {
        webglrenderer: {
            alpha: true, //是否支持透明
        },
        background: {
            alpha: 0.3, //透明度 取值范围0~1
            color: "#944",
        },
    },
    camera: {
        position: [0, 100, 500],
        near: 0.1,
        far: 2000,
    },
    lights: [
        {
            name: "light1",
            type: "DirectionalLight",
            color: undefined,
            intensity: 1,
            position: [15, 5, 5],
        },
        {
            name: "light2",
            type: "DirectionalLight",
            color: undefined,
            intensity: 1,
            position: [10, 5, -10],
        },
        {
            name: "light3",
            type: "DirectionalLight",
            color: undefined,
            intensity: 1,
            position: [10, -5, 5],
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
    helper: {
        axes: {
            active: false,
            length: 60,
        },
        grid: {
            active: false,
            size: 150,
            divisions: 30,
        },
    },
    models: [],
};
