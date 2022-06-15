export default {
    scene: { webglrenderer: { alpha: true }, background: { alpha: 0.3, color: "#911", type: "color", url: "" } },
    camera: { position: [0, 100, 500], near: 0.1, far: 2000 },
    lights: [
        { name: "light1", type: "DirectionalLight", intensity: 1, position: [15, 5, 5] },
        { name: "light2", type: "DirectionalLight", intensity: 1, position: [10, 5, -10] },
        { name: "light3", type: "DirectionalLight", intensity: 1, position: [10, -5, 5] },
        { name: "light4", type: "DirectionalLight", intensity: 1, position: [10, -15, 5] },
        { name: "light4", type: "DirectionalLight", intensity: 1, position: [-10, -15, -5] },
    ],
    controls: { orbit: { active: true }, raycaster: { active: true, events: { click: true, mousemove: true } }, transform: { active: true }, pointerLock: { speed: 1000 } },
    effectComposer: { outlinePass: { edgeStrength: 3, edgeGlow: 1, edgeThickness: 1, pulsePeriod: 1, usePatternTexture: false, visibleEdgeColor: "red", hiddenEdgeColor: "#190a05" } },
    helper: { axes: { active: false, length: 60 }, grid: { active: false, size: 150, divisions: 30, colorCenterLine: "black", colorGrid: "black" } },
    models: [
        {
            name: "Scene",
            position: { x: 0, y: 0, z: 0 },
            rotation: { _x: 0, _y: 0, _z: 0, _order: "XYZ" },
            scale: { x: 1, y: 1, z: 1 },
            type: "Group",
            uuid: "C5A0A76D-51F7-44B8-89B7-4051B365A030",
            objInfo: { objType: "modelFile", fileType: "gltf", folder: "test/", fileName: "scene4.glb" },
        },
    ],
    animations: [],
    css2d: [
        {
            uuid: "490B6FBE-9B61-4BE4-9934-1E56FBE868CF",
            name: "ABB_021",
            domTypeIndex: "1",
            domId: "css2d",
            css2dBoxUuid: "EA0E17AC-EDFF-4F51-8444-1EFFF66A48D5",
            css2dForm: [
                { label: "宽度", content: 248, type: "number" },
                { label: "标题", content: "ABB_021", type: "text" },
                { label: "内容", content: "ABB_021的内容", type: "textarea" },
            ],
        },
        {
            uuid: "A76AAB88-76F8-4595-B21F-35E4B10F51A8",
            name: "AB_025",
            domTypeIndex: "1",
            domId: "css2d2",
            css2dBoxUuid: "48E20F9E-2E1E-4CFE-8886-D2440F6641B2",
            css2dForm: [
                { label: "宽度", content: 248, type: "number" },
                { label: "标题", content: "AB_025", type: "text" },
                { label: "内容", content: "AB_025的内容", type: "textarea" },
            ],
        },
    ],
    handles: [],
};
