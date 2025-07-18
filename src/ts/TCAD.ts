//@ts-ignore
import { Viewer } from "../../dependencies/three-dxf";
import DxfParser from "dxf-parser"; // Note correct capitalization
import { TFont } from "./TFont";

/**
 * 用于绘制dxf图纸
 */
export class TCAD {
  private font: TFont = new TFont();
  constructor() {}

  /**
   * 解析dxf文件
   * @author LL
   * @since 2025/05/27
   * @param {string} url
   */
  public async getDXF(url: string) {
    console.log("xdf", new Date());
    const response = await fetch(url);
    const fileText = await response.text();

    let blobContent = new Blob([fileText], { type: "text/plain" });

    console.log("xdf-end", new Date());
    return blobContent;
  }

  /**
   * 绘制dxf文件
   * @author LL
   * @since 2025/05/27
   * @param {string} url
   * @param {string} domId
   */
  public async drawDXF(url: string, domId?: string) {
    console.log("draw", new Date());
    let text = await this.getDXF(url);
    this.font
      .loadFont({
        fontUrl: "public/dxf/helvetiker_regular.typeface.json",
        fontName: "helvetiker_regular.typeface",
        indexedDB: {
          active: true,
          id: 2,
        },
      })
      .then(async (font) => {
        const reader = new FileReader();
        //@ts-ignore
        reader.readAsText(text as Blob);

        reader.onloadend = (e) => {
          console.log("draw1", new Date());
          const contents = e.target.result;
          const parser = new DxfParser();
          //@ts-ignore
          const dxf = parser.parseSync(contents);

          let pic = document.getElementById(domId);

          //@ts-ignore
          let cadCanvas = new Viewer(dxf, pic, 300, 300, font);

          console.log("draw2", new Date());
          console.log("draw-end", new Date());
        };
      });
  }
}
