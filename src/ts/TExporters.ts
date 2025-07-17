import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { TScene } from "./TScene";
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression ,KHRMaterialsIOR,KHRMaterialsSpecular,
  KHRMaterialsClearcoat, // 其他可能需要的扩展
  KHRMaterialsTransmission,
  KHRMaterialsVolume,} from '@gltf-transform/extensions';
import { draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

/**
 * 导出
 */
export class TExporters {
  private tScene: TScene;
  private io: NodeIO;

  constructor(tScene: TScene) {
    this.tScene = tScene;
    this.io = new NodeIO()
  }

  /**
   * 导出gltf模型文件
   * @author LL
   * @date 2024/07/21
   * @param [fileName="ThingOrigin"]
   */
  public exportGLTF(fileName: string = "ThingOrigin") {
    var gltfExporter = new GLTFExporter();
    var options = {
      trs: false,
      onlyVisible: true,
      truncateDrawRange: true,
      binary: false,
      forceIndices: false,
      forcePowerOfTwoTextures: false,
    };

    gltfExporter.parse(
      this.tScene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          let blob = this.getBlob(result);
          this.save(blob, fileName + ".glb");
        } else {
          var output = JSON.stringify(result, null, 2);
          this.generateFileName(output, fileName + ".gltf");
        }
      },
      function (error) {
        console.log("An error happened during parsing", error);
      },
      options
    );
  }

  /**
   * gltf/glb模型轻量化(通过Url地址)
   * @author MY
   * @date 2025/07/11
   * @param url 模型地址
   * @param fileName 导出模型名称 默认值 ThingOrigin
   */
  public modelCompressByUrl(
    url: string,
    fileName: string = "ThingOrigin"
  ) {
    try {
        // 1. 从接口获取模型数据
        var ajax = new XMLHttpRequest();
        let arrayBuffer:any;
        ajax.open("get", url);
        ajax.send();
        ajax.onreadystatechange = async () => {
          if (ajax.readyState == 4 && ajax.status == 200) {
            arrayBuffer = ajax.response;
            console.log("arrayBuffer", arrayBuffer);
            // 2. 初始化 GLTF 处理工具
            await this.registerNodeIo();
            // 3. 读取并处理模型
            // 处理文本 .gltf 文件
            const text = String(arrayBuffer);
            // console.log("text", text);
            const jsonDoc:any = {
                json: JSON.parse(text),
            };
            // console.log("jsonDoc", jsonDoc);
            const documentFile = await this.io.readJSON(jsonDoc);
            // 4. 应用 DRACO 压缩
            await documentFile.transform(draco({ method: 'edgebreaker' }));
            // 5. 导出并下载压缩后的模型
            const glb = await this.io.writeBinary(documentFile);
            this.generateFileName(glb,fileName+".glb");
          }
        }
    } catch (error) {
      console.error(error);
    }
    
  }

  /**
   * gltf/glb模型轻量化(通过上传的模型文件)
   * @author MY
   * @date 2025/07/11
   * @param file 模型文件
   * @param fileName 导出模型名称 默认值 ThingOrigin
   */
  public async modelCompressByFile(
    file: File,
    fileName: string = "ThingOrigin"
  ) {
    try {
        // 1. 读取文件内容,根据文件类型选择读取方式
        const reader = new FileReader();
        const isBinary = file.name.endsWith('.glb');
        if (isBinary) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
        await new Promise((resolve, reject) => {
            reader.onload = async () => {
                try {
                  // 2. 初始化 GLTF 处理工具
                  await this.registerNodeIo();
                  // 3. 读取并处理模型    
                  let documentFile;
                  if (isBinary) {
                      // 处理二进制 .glb 文件
                      const arrayBuffer:any = reader.result;
                      const uint8Array = new Uint8Array(arrayBuffer);
                      documentFile = await this.io.readBinary(uint8Array);
                  } else {
                      // 处理文本 .gltf 文件
                      const text = String(reader.result);
                      // console.log("text", text);
                      const jsonDoc:any = {
                          json: JSON.parse(text),
                      };
                      // console.log("jsonDoc", jsonDoc);
                      documentFile = await this.io.readJSON(jsonDoc);
                  }
                  // 4. 应用 DRACO 压缩
                  await documentFile.transform(draco({ method: 'edgebreaker' }));
                  // 5. 导出并下载压缩后的模型
                  const glb = await this.io.writeBinary(documentFile);
                  this.generateFileName(glb,fileName+".glb");

                  resolve(true);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('文件读取失败'));
        });

    } catch (error) {
      console.error(error);
    }
    
  }

  /**
   * 注册nodeio
   * @private
   * @param extensions 扩展模块
   */
  private async registerNodeIo(extensions?: any) {
    this.io.registerExtensions([KHRDracoMeshCompression,KHRMaterialsIOR,KHRMaterialsSpecular])
              .registerDependencies({
                'draco3d.decoder': await draco3d.createDecoderModule({
                  wasmBinaryFile: '/draco_decoder_gltf.wasm',
                }),
                'draco3d.encoder': await draco3d.createEncoderModule({
                  wasmBinaryFile: '/draco_encoder_gltf.wasm',
                }),
              });;
  }

  /**
   * 生成文件名
   * @private
   * @param blobPart 文件
   * @param filename 文件名称
   */
  private generateFileName(blobPart: BlobPart, filename: string) {
    this.save(new Blob([blobPart], { type: "text/plain" }), filename);
  }

  /**
   * 获取二进制对象
   * @private
   * @param buffer 二进制数组
   */
  private getBlob(buffer: ArrayBuffer) {
    return new Blob([buffer], { type: "application/octet-stream" });
  }

  /**
   * 保存文件
   * @private
   * @param blob
   * @param filename
   */
  private save(blob: Blob, filename: string) {
    var link = document.createElement("a");
    link.style.display = "none";
    document.body.appendChild(link); // Firefox workaround, see #6594

    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    // URL.revokeObjectURL( url ); breaks Firefox...
  }
}
