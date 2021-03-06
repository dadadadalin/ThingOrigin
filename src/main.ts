import { ThingOrigin } from "./ThingOrigin";

let mainScene = ThingOrigin.addScene("ttt", document.getElementById("d1"), {
  scene: {
    stats: {
      show: true,
    },
    fog: {
      show: true,
      color: "#f00",
    },
    background: { type: "color", sky: { color: { top: "#f00" } } },
  },
  camera: {
    position: {
      x: 100,
      y: 80,
      z: 200,
    },
  },
  lights: [
    {
      name: "light1",
      type: "DirectionalLight",
      color: undefined,
      intensity: 1,
      position: {
        x: 15,
        y: 15,
        z: 15,
      },
    },
  ],
});

ThingOrigin.model
  .initFileModel("gltf", "/static/three/test/scene.gltf")
  .then((model) => {
    console.log(model);

    mainScene.add(model);

    mainScene.eDispatcher.addEventListener("CLICK", (e) => {
      mainScene.effect.initBreath(e.event[0].object);
      console.log(e.event[0].object.parent.type);
    });
  });

// let modelInfo = { id: 1, type: "gltf", name: "model", url: "/static/three/scene_0620.gltf" };
// ThingOrigin.indexedDB.accessModel("db", "model", modelInfo).then((res) => {
//     console.log(res);
//     if (res.saved) {
//         ThingOrigin.model.initFileModel(modelInfo.type, res.url, { scale: [1, 1, 1] }).then((model) => {
//             mainScene.add(model);
//         });
//     } else {
//         alert("shoucijia");
//         ThingOrigin.indexedDB.insertModel("db", "model", modelInfo).then((modelParam) => {
//             ThingOrigin.model.initFileModel(modelInfo.type, modelParam.url, { scale: [1, 1, 1] }).then((model) => {
//                 mainScene.add(model);
//             });
//         });
//     }
// });

// window.onclick = () => {
//     ThingOrigin.indexedDB.updateModel("db", "model", { id: 1, type: "gltf", name: "model", url: "/static/three/jiance2.gltf" });
// };
// ThingOrigin.indexedDB.getDataBase("uui").then((db) => {
//     console.log(db.objectStoreNames.contains("book"));
// });
// ThingOrigin.indexedDB.createDateBase("test", "xp");
// ThingOrigin.indexedDB.accessModel("test", "xp", 10).then((exist) => {
//     console.log(exist);
//     if (exist) {
//     }
// });
// ThingOrigin.indexedDB.insertData("test", "xp", { id: 1, name: "testModel", type: "gltf", model: "456456" });
// mainScene;

// // let arrow = ThingOrigin.model.initArrow("arrow1", [-5, -5, -5], [0, 0, 0], 100, "#f00", 10, 5);
// // mainScene.add(arrow);
// // let plane = ThingOrigin.model.initPlane("initPlane", [0, 1, 0], 0, 200, "#0f0");
// // mainScene.add(plane);

// // const bbb = new SkeletonHelper(arrow);
// // mainScene.add(bbb);

// const localPlane = new Plane(new Vector3(0, -1, 0), 0.8);
// const globalPlane = new Plane(new Vector3(-1, 0, 0), 0.1);

// mainScene.effect.initSceneClip("x", 0.1);

// setTimeout(() => {

// }, 2000);

// ThingOrigin.getScene("ttt").eDispatcher.addEventListener("CLICK", (e) => {
//     console.log(e);
//     if (e.event[0]) {
//         eval("e.event[0].object.position.set(0, 30, 0);");
//         e.event[0].object.userData = { name: "userData set" };
//         console.log(mainScene);

//         mainScene.exporters.exportGLTF("ttt", "yyy");
//     }
// });

// var request = window.indexedDB.open("webDB", 1); //???var????????????????????????????????????
// request.onerror = function (event) {
//     console.log("?????????????????????");
// };
// var db;

// request.onsuccess = function (event) {
//     db = request.result;
//     //db = event.target.result; ????????????
//     console.log("?????????????????????");

//     // read();
// };

// var db;
// request.onupgradeneeded = function (event) {
//     //@ts-ignore
//     db = event.target.result;

//     console.log(db);

//     var objectStore;
//     if (!db.objectStoreNames.contains("book")) {
//         objectStore = db.createObjectStore("book", {
//             keyPath: "id",
//         });

//         // ??????????????????????????????
//         objectStore.createIndex("id", "id", {
//             unique: true,
//         });
//         objectStore.createIndex("name", "name");
//         objectStore.createIndex("model", "model");
//     }
//     console.log("?????????????????????");
// };

// function add(book) {
//     console.log(db);

//     var request1 = db
//         .transaction(["book"], "readwrite") //???????????????readwrite, readonly(??????), versionchange
//         .objectStore("book") //??????IDBObjectStore ??????
//         .add({
//             // ????????????
//             id: book.id,
//             name: book.name,
//             model: book.model,
//         });
//     request1.onsuccess = function (event) {
//         console.log("??????????????????");
//     };
//     request1.onerror = function (event) {
//         console.log("??????????????????");
//     };
//     request1.onabort = function (event) {
//         console.log("????????????");
//     };
// }

// function read() {
//     var transaction = db.transaction("book", "readwrite");
//     var store = transaction.objectStore("book");
//     console.log(store);

//     var dataRequest = store.get("id");
//     console.log(dataRequest);

//     dataRequest.onsuccess = function (e) {
//         console.log(e);

//         //?????????
//         // var student = e.target.result;
//         // console.log(student.name);
//     };
// }

// //?????????:??????????????????
// var ajax = new XMLHttpRequest();
// //?????????:???????????????url??????,???????????????????????????,?????????????????????url,???????????????,?????????????????????starName????????????
// ajax.open("get", "/static/three/xi.gltf");
// //?????????:????????????
// ajax.send();
// //?????????:???????????? onreadystatechange ????????????????????????
// ajax.onreadystatechange = function () {
//     if (ajax.readyState == 4 && ajax.status == 200) {
//         //????????? ?????????????????????????????? ?????? ?????? ??????????????????,?????????????????????????????????
//         // console.log(ajax.responseText); //?????????????????????
//         // let ab = new ArrayBuffer(ajax.responseText);
//         // console.log(new Blob([ab], { type: "gltf" }));
//         // console.log(ajax.response);

//         let blob = new Blob([ajax.responseText]);
//         console.log(blob);

//         // add({ id: 10, name: "??????", model: blob });
//         add({ id: 100, name: "xi", model: blob });

//         // var reader = new FileReader();
//         // let m1 = reader.readAsBinaryString(ajax.responseText);

//         // reader.onload = function (e) {
//         //     console.log(e, reader);
//         // };
//     }
// };

// setTimeout(() => {
//     var transaction = db.transaction("book", "readwrite");
//     var store = transaction.objectStore("book");

//     var dataRequest = store.index("id").get(100);
//     console.log(dataRequest);

//     dataRequest.onsuccess = function (e) {
//         // console.log(e.target.result.model);

//         //?????????
//         // var student = e.target.result;
//         // console.log(student.name);
//         ThingOrigin.model.initFileModel("gltf", e.target.result.model, undefined, true).then((model) => {
//             mainScene.add(model);

//             mainScene.helper.initBox(model.uuid);

//             mainScene.tweenMove("name", "xi", "x", 0, 90, 20000);
//         });
//     };
// }, 1000);

// mainScene.overrideMaterial = new MeshBasicMaterial({ color: "green" });

// ThingOrigin.model.initText("????????????", "/static/font/Microsoft YaHei Light_Regular.json", { color: "#ff0", size: 50, height: 100 }).then((font) => {
//     mainScene.add(font);
// });
// ThingOrigin.model.initTextLine("????????????", "/static/font/Microsoft YaHei Light_Regular.json", { color: "#ff0", size: 50 }, { position: [50, 50, 50] }).then((font) => {
//     mainScene.add(font);
// });

// mainScene.add(ThingOrigin.model.initSphere("qiu1", undefined, { position: [0, 0, 0] }));
// mainScene.add(ThingOrigin.model.initSphere("qiu1", undefined, { position: [0, 0, -180] }));
// mainScene.add(ThingOrigin.model.initSphere("qiu1", undefined, { position: [0, 0, 180] }));

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

//??????demo
//??????demo
//??????demo

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
//         console.log("????????????", uuid);

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
