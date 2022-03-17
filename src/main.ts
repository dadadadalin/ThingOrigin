import "../public/js/main.js";
import sd2 from "../public/static/data/sceneParams.js";
import { ThingOrigin } from "./ThingOrigin";

// sd2.models = [
//     {
//         name: "Scene",
//         position: { x: 0, y: 0, z: 0 },
//         rotation: { _x: 0, _y: 0, _z: 0, _order: "XYZ" },
//         scale: { x: 1, y: 1, z: 1 },
//         type: "Group",
//         uuid: "C5A0A76D-51F7-44B8-89B7-4051B365A030",
//         objInfo: { objType: "modelFile", fileType: "gltf", folder: "test/", fileName: "scene4.glb" },
//     },
// ];

let mainScene = ThingOrigin.addScene("ttt", document.getElementById("d1"), sd2);
mainScene.initSky();

// let arrow = ThingOrigin.model.initArrow("arrow1", [-5, -5, -5], [0, 0, 0], 100, "#f00", 10, 5);
// mainScene.add(arrow);
// let plane = ThingOrigin.model.initPlane("initPlane", [0, 1, 0], 0, 200, "#0f0");
// mainScene.add(plane);

// const bbb = new SkeletonHelper(arrow);
// mainScene.add(bbb);

setTimeout(() => {
    ThingOrigin.model.activeDRACOLoader("https://www.gstatic.com/draco/v1/decoders/");
    ThingOrigin.model.initFileModel("gltf", "/static/three/factory.glb", { scale: [5, 5, 5] }).then((model) => {
        console.log(model);

        mainScene.add(model);

        mainScene.helper.initBox(model.uuid);
    });
}, 2000);

// mainScene.overrideMaterial = new MeshBasicMaterial({ color: "green" });

// ThingOrigin.model.initText("这是文字", "/static/font/Microsoft YaHei Light_Regular.json", { color: "#ff0", size: 50, height: 100 }).then((font) => {
//     mainScene.add(font);
// });
// ThingOrigin.model.initTextLine("这是文字", "/static/font/Microsoft YaHei Light_Regular.json", { color: "#ff0", size: 50 }, { position: [50, 50, 50] }).then((font) => {
//     mainScene.add(font);
// });

// mainScene.add(ThingOrigin.model.initSphere("qiu1", undefined, { position: [0, 0, 0] }));
// mainScene.add(ThingOrigin.model.initSphere("qiu1", undefined, { position: [0, 0, -180] }));
// mainScene.add(ThingOrigin.model.initSphere("qiu1", undefined, { position: [0, 0, 180] }));

// window.onclick = () => {
//     var a = mainScene.getObjectByName("ABB_023");
//     console.log(a);

//     mainScene.initBreath(a.uuid);
// };

mainScene.eDispatcher.addEventListener("CLICK", (e) => {
    // CSSDiv.innerHTML = `<div><div>` + Math.random() + `</div> <div>` + Math.random() + `</div>   </div>`;
    // mainScene.removeCSS2D(tagId);
    // tagId = mainScene.addCSS2D("name", "car001", CSSDiv);
    // var a = mainScene.getObjectByName("ABB_023");
    // console.log(a);
    // mainScene.disposeBreath();
    // var a = new Object3D();
    // a.add(e.event[0].object);
    // mainScene.add(a);
    // console.log(a);
    // mainScene.initBreath(e.event[0].object.uuid);
    // console.log(a.object);
});

// var tagId: string;
// let CSSDiv = document.createElement("div");
// CSSDiv.id = "Test";
// CSSDiv.textContent = "文字测试";
// ThingOrigin.model.initFileModel("gltf", "/static/three/test/scene4.glb").then((model) => {
//     console.log(model);

//     mainScene.add(model);
//     tagId = mainScene.addCSS2D("name", "car001", CSSDiv);
// });

// ThingOrigin.model.initMap("/static/data/china.json").then((model) => {
//     console.log(model);

//     mainScene.add(model);
// });

// var models = ThingOrigin.model.initSpriteShape("points", a, { shape: "triangle", color: "#fff", radius: 2 }, { cusType: "777" });
// ThingOrigin.getScene("ttt").add(models);

// var cyl = ThingOrigin.model.initCylinder("cube1", {
//     radiusTop: 10,
//     radiusBottom: 20,
// });
// ThingOrigin.getScene("ttt").add(cyl);

//旧版demo
//旧版demo
//旧版demo

// var a = [];
// for (var i = 0; i < points.length; i++) {
//     if (points[i].Y < 80 && points[i].X <= -110) {
//         points[i]["POINT_ID"] = "rest";
//         a.push(points[i]);
//     }
//     if (points[i].Y < 80 && points[i].X <= 65 && points[i].X >= -70) {
//         points[i]["POINT_ID"] = "rest";
//         a.push(points[i]);
//     }
//     if (points[i].Y < 80 && points[i].X >= 120) {
//         points[i]["POINT_ID"] = "rest";
//         a.push(points[i]);
//     }
//     if (points[i].Y < 80 && points[i].X >= 65 && points[i].X <= 120 && points[i].Z <= -40) {
//         points[i]["POINT_ID"] = "rest";
//         a.push(points[i]);
//     }
// }

// console.log(JSON.stringify(a));

// // ThingOrigin.getScene("ttt").model.sprite.initPic("points", points, { url: "/static/img/sprite2.png", size: 5 }, { cusType: "777" });
// // ThingOrigin.getScene("ttt").model.addPoints("points", points, { color: "#f00", size: 3 });

// // var pointGroup = ThingOrigin.getScene("ttt").getObjectByProperty("name", "points");

// ThingOrigin.getScene("ttt").model.addSphere("sphere", {
//     radius: 30,
// });
// ThingOrigin.getScene("ttt").background = new TextureLoader().load("/static/img/ground.jpg");

// ThingOrigin.getScene("ttt")
//     .model.loadModel("gltf", "/static/three/car/scene.glb", { scale: [0.03, 0.03, 0.03] })
//     .then((uuid) => {
//         console.log("加载完毕", uuid);

//         // bbb.material.push(new MeshBasicMaterial({ color: 0xff0000 }));

//         // bbb.material[0].blending = bbb.material.length;
//         // console.log(bbb.material[0].blending);
//         // let iid = ThingOrigin.getScene("ttt").getObjectByProperty("name", "SUB30-1").uuid;
//     });

// let wall = ThingOrigin.getScene("ttt").model.addGeometry("cube", "cube");
// ThingOrigin.getScene("ttt").model.addCylinder("cube1", {
//     radiusTop: 10,
//     radiusBottom: 20,
// });

// ThingOrigin.getScene("ttt").eDispatcher.addEventListener("CLICK", (e) => {
//     console.log(e);
//     if (e.event[0]) {
//         if (e.event[0].object.name == "qiu") {
//             if (!ThingOrigin.getScene("ttt").ifOwnCSS2D(e.event[0] && e.event[0].object)) {
//                 ThingOrigin.getScene("ttt").model.addCSS2D("name", "qiu", document.getElementById("menu").cloneNode(true) as HTMLElement);
//             } else {
//                 let boxId = e.event[0].object.children[0].uuid;
//                 console.log(boxId);
//                 ThingOrigin.getScene("ttt").model.removeCSS2D(boxId);
//             }
//         }
//     }

//     // ThingOrigin.getScene("ttt").model.showExploded("name", "AB_tai003", 1.4, 1000);
//     // ThingOrigin.getScene("ttt").model.setVisible("qiu1", false);
//     // ThingOrigin.getScene("ttt").controls.initRaycaster(sceneParams.controls.raycaster.events);
//     // var a = ThingOrigin.getScene("ttt").getObjectByProperty("name", "car");
//     // var b = ThingOrigin.getScene("ttt").cloneObject("ttt", a.uuid, [100, 10, 100]);
//     // ThingOrigin.getScene("ttt").add(b);
//     // console.log(e);
//     // wallPoints.push([e.position.x, e.position.y, e.position.z]);
//     // console.log(wallPoints);
//     // let unResponse = ["BoxHelper", "GridHelper", "AxesHelper", "TransformControlsPlane", "Line"];
//     // for (let i = 0; i < e.event.length; i++) {
//     //     if (unResponse.indexOf(e.event[i].object.type) == -1) {
//     //         ThingOrigin.getScene("ttt").camera.lookAt(e.event[i].object.uuid, 1000, 1);
//     //         break;
//     //     }
//     // }
// });

// let showOn;
// ThingOrigin.getScene("ttt").eDispatcher.addEventListener("MOUSEOVER", (e) => {
//     if (showOn) {
//         showOn.material[0].color.set("#02A1E2");
//         showOn.material[1].color.set("#3480C4");

//         var properties = showOn.parent.properties;

//         document.getElementById("provinceInfo").textContent = properties.name;

//         document.getElementById("provinceInfo").style.visibility = "visible";
//     } else {
//         document.getElementById("provinceInfo").style.visibility = "hidden";
//     }
//     if (!e.event[0]) return;
//     if (e.event[0].object.type != "Mesh") return;

//     console.log(e);

//     e.event[0].object.material[0].color.set(0xff0000);
//     e.event[0].object.material[1].color.set(0xff0000);

//     showOn = e.event[0].object;
// });
