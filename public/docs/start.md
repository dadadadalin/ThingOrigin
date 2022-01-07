# 快速开始

目前支持 js 文件引入

## 全局引入

### Vue

main.js 中

```javascript
import "../**/ThingOrigin.js";
```

### HTML

```javascript
<script src="../**/ThingOrigin.js"></script>
```

## 创建场景

#### 创建场景

```
let scene = ThingOrigin.addScene("sceneName", document.getElementById("domId"), sceneParams);

let sphere = ThingOrigin.model.initSphere("sphere")
scene.add(sphere);
```

#### 场景参数

```
let sceneParams = {
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
};
```
