export const sceneData = {
  params: {
    // 数据库参数
    indexedDB: {
      dataBaseName: "ThingOrigin3D", // 数据库名
      tableName: "ThingOrigin3D", // 表名
    },
    // 加载器参数(此参数非必要不修改)
    loader: {
      draco:
        "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/libs/draco/gltf/",
      ktx2: "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/libs/basis/",
    },
    //资源访问路径
    resource: {
      serverAddress: "http://124.70.30.193:8084", // 服务器地址
      model: "http://124.70.30.193:8084/model2/load/ae5636a6-99f4-4780-9e3d-7affeb1c62da", // 服务器地址
      font_Microsoft: "http://124.70.30.193:8084/model2/load/Microsoft.json",
    },
  },
  // 场景参数
  scene: {
    // 渲染质量
    renderQuality: {
      alpha: true, // 是否启用alpha通道
      autoClear: true, // 是否启用自动清除
      antialias: true, // 是否启用抗锯齿
      logarithmicDepthBuffer: true, // 解决穿模，精度0.001
      shadowMap: {
        enabled: true, // 是否启用阴影
      },
      // 色调映射
      toneMapping: {
        type: "ReinhardToneMapping",
        typeList: [
          "NoToneMapping", //无色调映射，直接输出线性颜色。
          "LinearToneMapping", //线性色调映射，将线性颜色映射到显示器的范围。
          "ReinhardToneMapping", //Reinhard色调映射，模拟人眼对亮度的感知。
          "CineonToneMapping", //Cineon色调映射，模拟电影胶片的色调映射。
          "ACESFilmicToneMapping", //ACES Filmic色调映射，模拟电影和电视的色调映射。
        ],
      },
    },
    // 性能监控
    stats: {
      show: false, // 是否显示性能监控
      // 监控模式 0:画面每秒传输帧数（fps）  1：画面渲染的时间
      mode: 0,
    },
    // 环境光
    environment: {
      type: "roomEnvironment",
      typeList: [
        "roomEnvironment", //环境光
        "EquirectangularReflectionMapping", //经纬线映射贴图
      ],
      EquirectangularReflectionMappingConfig: {
        url: "",
      },
    },
    // 背景
    background: {
      type: "sky", // 类型（sky:天空盒;color:颜色;img:图片）
      // 颜色
      color: {
        alpha: 0.5, // 透明度 取值范围0~1
        color: "#666", // 背景颜色
      },
      // 天空盒
      sky: {
        color: { top: "#86b6f5", line: "#ffffff", bottom: "#999999" }, // 天空盒颜色
        params: {
          radius: 5000, // 半径
          widthSegments: 32, // 宽度分段数
          heightSegments: 15, // 高度分段数
          skyCenter: [0, 0, 0], // 天空盒中心点
        },
      },
      img: {
        url: "/public/img/sky.jpg",
      },
      cubeMap: {
        url: [
          "/public/cubmap/pos-x.jpg",
          "/public/cubmap/neg-x.jpg",
          "/public/cubmap/pos-y.jpg",
          "/public/cubmap/neg-y.jpg",
          "/public/cubmap/pos-z.jpg",
          "/public/cubmap/neg-z.jpg",
        ],
      },
      workshop: {
        url: "public/models/workshop.glb",
        modelType: "glb",
      },
    },
    ground: {
      active: true,
      base: {
        width: 10000,
        height: 10000,
      },
      material: {
        type: "color",
        color:{
          color: "#eee",
          opacity: 1,
        },
        image: {
          url: "/public/image/ground.jpg",
          repeat: {
            width: 1000,
            height:1000
          }
        },
      },
    },
    //雾
    fog: {
      show: false, // 是否启用雾
      cameraView: false, // 相机附近视野清晰
      color: "#fff", // 雾颜色
    },
  },
  // 控制器参数
  controls: {
    orbit: {
      active: true, // 是否启用智能相机控制器
      autoRotate: false, // 自动旋转
      autoRotateSpeed: 0.5, // 旋转速度
      enableDamping: true, // 惯性
      dampingFactor: 0.05, // 阻尼惯性
      minDistance: 1,
      maxDistance: 2000,
    },
    drag: {
      active: false, // 是否启用拖拽控制器
    },
    raycaster: {
      active: true, //是否启用鼠标点击控制器
      // 鼠标事件
      events: {
        click: true, // 点击事件
        mousemove: true, // 移动事件
      },
    },
    transform: {
      active: false, //是否启用模型变换控制器
    },
    pointerLock: {
      speed: 1000, //是否启用人工漫游控制器
    },
  },
  // 辅助参数
  helper: {
    // 坐标轴
    axes: {
      active: false, // 是否启用
      length: 60, // 轴长度
    },
    // 网格
    grid: {
      active: false, // 是否启用
      size: 150, // 网格大小
      divisions: 30, // 网格分段数
      centerLineColor: "black", // 中心线颜色
      gridColor: "black", // 网格颜色
    },
  },
  // 相机参数
  camera: {
    type: "PerspectiveCamera", // 相机类型（PerspectiveCamera：透视相机；OrthographicCamera：正交相机）
    // 相机位置
    position: {
      x: 90,
      y: 60,
      z: 200,
    },
    // 相机中心点
    lookAt: {
      x: 0,
      y: 0,
      z: 0,
    },
    // 透视相机参数
    perspective: {
      fov: 45, // 摄像机视锥体垂直视野角度
      near: 0.1, // 摄像机视锥体近端面
      far: 6000, // 摄像机视锥体远端面
    },
  },

  // 光源参数
  lights: [
    {
      name: "light1", // 光源名称
      type: "AmbientLight", // 光源类型-环境光
      color: "#fff", // 颜色
      intensity: 1, // 强度
      visible: true, // 可见性
      position: {
        // 位置
        x: 150,
        y: 150,
        z: 150,
      },
    },
    {
      name: "light2",
      visible: true,
      type: "AmbientLight",
      color: "#fff",
      intensity: 1,
      position: {
        x: -150,
        y: 150,
        z: -150,
      },
    },
    {
      name: "light3",
      visible: true,
      type: "DirectionalLight", // 光源类型-平行光
      color: "#fff",
      intensity: 1,
      position: {
        x: -150,
        y: 150,
        z: 150,
      },
    },
    {
      name: "light4",
      visible: true,
      type: "DirectionalLight",
      color: "#fff",
      intensity: 1,
      position: {
        x: 150,
        y: 150,
        z: -150,
      },
    },
  ],

  // 后处理参数
  effectComposer: {
    // 高亮
    outlinePass: {
      edgeStrength: 3, // 边缘强度
      edgeGlow: 1, // 发光
      edgeThickness: 6, // 光晕粗
      pulsePeriod: 1, // 闪烁
      usePatternTexture: false, // true
      visibleEdgeColor: "yellow", // 边缘颜色
      hiddenEdgeColor: "#190a05",
    },
    // 泛光
    bloomPass: {
      strength: 1.5, // 泛光的强度
      radius: 1, // 泛光散发的半径
      threshold: 0.8, // 泛光的光照强度阈值
    },
  },
  // 物理引擎参数
  physicsSim: {
    open: true, // 是否开启物理引擎
    gravity: {
      // 重力
      x: 0,
      y: -9.82,
      z: 0,
    },
  },
  modelList: [],
  animationList: [],
  markerList: [],
  //事件
  handleList: [],
  //模型关联关系
  attachList: [],
};
