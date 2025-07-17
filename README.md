# ThingOrigin.js

### 如何安装&引入

```shell
npm install thingorigin
```

```javascript
import 'thingorigin'

console.dir(ThingOrigin)
```


### ThingOrigin.js是什么

ThingOrigin.js 是一款高性能 Web3D 引擎，为开发者提供从场景搭建到交互控制的全流程解决方案。

通过简洁高效的 API，可快速实现 3D 场景渲染、模型缓存，导入与控制、物理模拟、动画系统及数据可视化等功能，广泛适用于工业仿真、数字孪生等领域。

### 5秒轻松搭建场景

```javascript
let TO = new ThingOrigin('TOScene',document.getElementById('TO'));
```

### 链接
[官网](https://www.thingorigin.com/ThingOrigin3D/)
[API文档](https://www.thingorigin.com/ThingOrigin3D/components/api/)

[github](https://github.com/dadadadalin/ThingOrigin)


### 依赖升级
由于部分依赖不支持最新版本three.js,所以请手动修改依赖代码

#### node_modules/three-dxf/src/index.js
```text
加入：
import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry'

修改（570行）：
new THREE.TextGeometry(*****)  =>  new TextGeometry(*****)
```

#### node_modules/troika-three-text/dist/troika-three-text.esm.js
```text
全局搜索  PlaneBufferGeometry  替换为 PlaneGeometry
```

#### node_modules/troika-three-utils/dist/troika-three-utils.esm.js
```text 
全局搜索  CylinderBufferGeometry  替换为 CylinderGeometry
```

### 功能组成

#### 1. 基础
场景（渲染器、相机、灯光） | 工具

#### 2. 辅助/控制器
control | helper | GUI | 导出

#### 3. 模型
常规 | 模型文件 | 线 | 文字 | 标记 | 材质 | 本地缓存 | 模型轻量化（收费）

#### 4. 模型控制
爆炸图 | 吸附  | 动作

#### 5. 动效
动画 | 效果 | 产品关联

#### 6. 物理模拟
重力 | 弹力 | 摩擦力 | 碰撞检测 | 碰撞响应

#### 7. CAD
dxf图纸渲染 | 模型转换（收费）


### 联系我们
#### 邮箱：ll@niir.com.cn
#### QQ群：429495366
