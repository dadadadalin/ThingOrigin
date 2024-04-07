export default {
  scene: {
    renderQuality: {
      alpha: true,
      autoClear: true,
      antialias: true, //抗锯齿
      shadowMap: {
        enabled: true, //启用阴影
      },
      //色调映射
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
    //性能监控
    stats: {
      show: false,
      //监控模式 0:画面每秒传输帧数（fps）  1：画面渲染的时间
      mode: 0,
    },
    //环境光
    environment: {
      type: "roomEnvironment",
      typeList: [
        "roomEnvironment", //环境光
        "EquirectangularReflectionMapping", //经纬线映射贴图
      ],
      RoomEnvironmentConfig: {},
      EquirectangularReflectionMappingConfig: {
        url: "",
      },
    },
    //背景
    background: {
      type: "sky",
      color: {
        alpha: 0, //透明度 取值范围0~1
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
      cubeMap: {
        url: [
          "/static/img/SwedishRoyalCastle/px.jpg",
          "/static/img/SwedishRoyalCastle/nx.jpg",
          "/static/img/SwedishRoyalCastle/py.jpg",
          "/static/img/SwedishRoyalCastle/ny.jpg",
          "/static/img/SwedishRoyalCastle/pz.jpg",
          "/static/img/SwedishRoyalCastle/nz.jpg",
        ],
      },
    },
    //雾
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
        x: 150,
        y: 50,
        z: 50,
      },
    },
    {
      name: "light2",
      type: "DirectionalLight",
      color: undefined,
      intensity: 1,
      position: {
        x: -150,
        y: 50,
        z: -50,
      },
    },
    {
      name: "light3",
      type: "DirectionalLight",
      color: undefined,
      intensity: 1,
      position: {
        x: -150,
        y: -50,
        z: -50,
      },
    },
  ],
  controls: {
    orbit: {
      active: true, //是否启用智能相机控制器
      autoRotate: false, //自动旋转
      autoRotateSpeed: 0.5, //旋转速度
      enableDamping: true, //惯性
      dampingFactor: 0.05, //阻尼惯性
    },
    raycaster: {
      active: true, //是否启用鼠标点击控制器
      events: {
        click: true,
        mousemove: true,
      },
    },
    transform: {
      active: true, //是否启用模型变换控制器
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
      visibleEdgeColor: "blue", //边缘颜色
      hiddenEdgeColor: "#190a05",
    },
    bloomPass: {
      strength: 1.5, //泛光的强度
      radius: 1, //泛光散发的半径
      threshold: 0.8, //泛光的光照强度阈值
    },
  },
  indexedDB: {
    use: false,
    dataBaseName: "",
    headers: [
      { text: "id", key: true },
      { text: "name" },
      { text: "type" },
      { text: "model" },
    ],
    models: [{ id: 1, name: "aaa", type: "gltf", model: "", url: "" }],
  },
  models: [],
  animations: [],
  css2d: [],
  handles: [],
};
