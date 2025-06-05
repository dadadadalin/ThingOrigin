import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { TScene } from "./TScene";

export class TExporters {
  public tScene: TScene;
  constructor(tScene: TScene) {
    this.tScene = tScene;
  }
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
          this.saveArrayBuffer(result, fileName + ".glb");
        } else {
          var output = JSON.stringify(result, null, 2);
          this.saveString(output, fileName + ".gltf");
        }
      },
      function (error) {
        console.log("An error happened during parsing", error);
      },
      options
    );
  }

  private saveString(text: BlobPart, filename: string) {
    this.save(new Blob([text], { type: "text/plain" }), filename);
  }

  private saveArrayBuffer(buffer: ArrayBuffer, filename: string) {
    this.save(
      new Blob([buffer], { type: "application/octet-stream" }),
      filename
    );
  }

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
