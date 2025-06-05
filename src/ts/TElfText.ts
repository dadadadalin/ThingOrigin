import * as THREE from "three";

/**
 * 城市精灵创建选项接口
 */
interface CitySpritesOptions {
  /** 文本最大宽度 */
  maxWidth?: number;
  /** 字体大小 */
  fontSize?: number;
  /** 字体族 */
  fontFamily?: string;
  /** 设备像素比 */
  dpr?: number;
  /** 精灵位置最小值 */
  minPosition?: number;
  /** 精灵位置最大值 */
  maxPosition?: number;
}

/**
 * 创建城市名称精灵
 * @param citiesData - 城市数据对象
 * @param options - 创建选项
 * @returns THREE.Group 包含所有城市精灵的组
 */
function createCitySprites(
  citiesData: Record<string, any>,
  options: CitySpritesOptions = {}
): THREE.Group {
  const {
    maxWidth = 100,
    fontSize = 20,
    fontFamily = "serif",
    dpr = 1.4,
    minPosition = -10,
    maxPosition = 10,
  } = options;

  const group = new THREE.Group();
  const updateCanvasText = createCanvasText({
    dpr,
    maxWidth,
    fontSize,
    fontFamily,
  });

  const getColor = () =>
    "#" +
    Math.floor(Math.random() * 0xffffff)
      .toString(16) //@ts-ignore
      .padStart(6, "0");

  for (const cityName in citiesData) {
    const canvas = updateCanvasText({ text: cityName, color: getColor() });
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(canvas.width / canvas.height, 1, 1);
    sprite.position.set(
      Math.random() * (maxPosition - minPosition) + minPosition,
      Math.random() * (maxPosition - minPosition) + minPosition,
      Math.random() * (maxPosition - minPosition) + minPosition
    );

    group.add(sprite);
  }

  return group;
}

/**
 * Canvas文本创建选项接口
 */
interface CanvasTextOptions {
  /** 设备像素比 */
  dpr?: number;
  /** 最大宽度 */
  maxWidth?: number;
  /** 字体大小 */
  fontSize?: number;
  /** 颜色 */
  color?: string;
  /** 字体族 */
  fontFamily?: string;
  /** 对齐方式 */
  align?: CanvasTextAlign;
  /** 是否显示边框 */
  border?: boolean;
}

/**
 * 创建Canvas文本
 * @param params - Canvas文本创建选项
 * @returns 更新Canvas文本的函数
 */
function createCanvasText(params: CanvasTextOptions) {
  const defaultParams: Required<CanvasTextOptions> = {
    dpr: 1,
    maxWidth: 100,
    fontSize: 20,
    color: "white",
    fontFamily: "serif",
    align: "center",
    border: false,
    ...params,
  };

  const { dpr, border, maxWidth, fontSize, align } = defaultParams;
  const devicePixelRatio = window.devicePixelRatio * dpr;

  // 准备 canvas
  const canvas = document.createElement("canvas");
  canvas.width = maxWidth * devicePixelRatio;
  canvas.height = fontSize * devicePixelRatio;

  // 获取 2d 上下文
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(devicePixelRatio, devicePixelRatio);

  /**
   * 创建边框
   */
  function createBorder() {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1 * devicePixelRatio;
    ctx.strokeRect(
      ctx.lineWidth / 2,
      ctx.lineWidth / 2,
      canvas.width / devicePixelRatio - ctx.lineWidth,
      canvas.height / devicePixelRatio - ctx.lineWidth
    );
  }

  /**
   * 创建文字
   * @param params - 文字参数
   */
  const createText = (params: {
    text: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
  }) => {
    const { text, color, fontSize: textFontSize, fontFamily } = params;

    ctx.fillStyle = color || defaultParams.color;
    ctx.font = `${textFontSize || defaultParams.fontSize}px ${
      fontFamily || defaultParams.fontFamily
    }`;

    // 文本长度计算
    let textMaxNum = 0;
    let totalWidth = 0;
    for (let i = 0; i < text.length; i++) {
      const metrics = ctx.measureText(text[i]);
      totalWidth += metrics.width;
      if (totalWidth > maxWidth) break;
      textMaxNum++;
    }
    const truncatedText = text.slice(0, textMaxNum);

    // 文字绘制
    const metrics = ctx.measureText(truncatedText);
    const actualHeight =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const textFillHeight =
      (canvas.height / devicePixelRatio - actualHeight) / 2 +
      metrics.actualBoundingBoxAscent;
    let textLeftOffset = 0;
    if (align === "center")
      textLeftOffset = (canvas.width / devicePixelRatio - metrics.width) / 2;

    ctx.fillText(
      truncatedText,
      textLeftOffset,
      textFillHeight,
      canvas.width / devicePixelRatio
    );
  };

  /**
   * 更新Canvas文本
   * @param parameters - 更新参数
   * @returns 更新后的Canvas元素
   */
  return (parameters: { text: string; color?: string }) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (border) createBorder();
    createText(parameters);
    return canvas;
  };
}

export { createCitySprites, CitySpritesOptions };
