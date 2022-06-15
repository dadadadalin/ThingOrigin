import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { ThingOrigin } from "../../ThingOrigin";

export class TExporters {
    public exportGLTF(sceneName: string, fileName: string = "ThingOrigin") {
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
            ThingOrigin.getScene(sceneName),
            (result) => {
                console.log(result);

                if (result instanceof ArrayBuffer) {
                    this.saveArrayBuffer(result, fileName + ".glb");
                } else {
                    var output = JSON.stringify(result, null, 2);
                    this.saveString(output, fileName + ".gltf");
                }
            },
            options
        );
    }

    private saveString(text: BlobPart, filename: string) {
        this.save(new Blob([text], { type: "text/plain" }), filename);
    }

    private saveArrayBuffer(buffer: ArrayBuffer, filename: string) {
        this.save(new Blob([buffer], { type: "application/octet-stream" }), filename);
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
