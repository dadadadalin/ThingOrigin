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
ThingOrigin.model.initFileModel("gltf", "/static/three/test/scene.gltf", { scale: [1, 1, 1] }).then((model) => {
    console.log(model);
    mainScene.add(model);

    console.log(ThingOrigin.tool.getObjectStructure(model));
    // console.log(ThingOrigin.tool.getChildrenInfo(model));
    // ThingOrigin.animate.showExploded(model, 2, 3000);
    // ThingOrigin.animate.tweenRotate(model, "x", 0, 20, 3000);
    // window.onclick = () => {
    //     model.children[0].children[1].layers.toggle(1);
    // };
    // ThingOrigin.animate.showExploded(model, 10, 2000);
    // ThingOrigin.animate.tweenRotate(model, "x", 10, 50, 1000);
    // mainScene.effect.initModelClip(model, "x", 10);
});
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

// var request = window.indexedDB.open("webDB", 1); //用var是为了方便反复执行，下同
// request.onerror = function (event) {
//     console.log("数据库打开报错");
// };
// var db;

// request.onsuccess = function (event) {
//     db = request.result;
//     //db = event.target.result; 也能拿到
//     console.log("数据库打开成功");

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

//         // 定义存储对象的数据项
//         objectStore.createIndex("id", "id", {
//             unique: true,
//         });
//         objectStore.createIndex("name", "name");
//         objectStore.createIndex("model", "model");
//     }
//     console.log("数据库升级成功");
// };

// function add(book) {
//     console.log(db);

//     var request1 = db
//         .transaction(["book"], "readwrite") //新建事务，readwrite, readonly(默认), versionchange
//         .objectStore("book") //拿到IDBObjectStore 对象
//         .add({
//             // 插入记录
//             id: book.id,
//             name: book.name,
//             model: book.model,
//         });
//     request1.onsuccess = function (event) {
//         console.log("数据写入成功");
//     };
//     request1.onerror = function (event) {
//         console.log("数据写入失败");
//     };
//     request1.onabort = function (event) {
//         console.log("事务回滚");
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

//         //异步的
//         // var student = e.target.result;
//         // console.log(student.name);
//     };
// }

// //步骤一:创建异步对象
// var ajax = new XMLHttpRequest();
// //步骤二:设置请求的url参数,参数一是请求的类型,参数二是请求的url,可以带参数,动态的传递参数starName到服务端
// ajax.open("get", "/static/three/xi.gltf");
// //步骤三:发送请求
// ajax.send();
// //步骤四:注册事件 onreadystatechange 状态改变就会调用
// ajax.onreadystatechange = function () {
//     if (ajax.readyState == 4 && ajax.status == 200) {
//         //步骤五 如果能够进到这个判断 说明 数据 完美的回来了,并且请求的页面是存在的
//         // console.log(ajax.responseText); //输入相应的内容
//         // let ab = new ArrayBuffer(ajax.responseText);
//         // console.log(new Blob([ab], { type: "gltf" }));
//         // console.log(ajax.response);

//         let blob = new Blob([ajax.responseText]);
//         console.log(blob);

//         // add({ id: 10, name: "书名", model: blob });
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

//         //异步的
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

// ThingOrigin.model.initText("这是文字", "/static/font/Microsoft YaHei Light_Regular.json", { color: "#ff0", size: 50, height: 100 }).then((font) => {
//     mainScene.add(font);
// });
// ThingOrigin.model.initTextLine("这是文字", "/static/font/Microsoft YaHei Light_Regular.json", { color: "#ff0", size: 50 }, { position: [50, 50, 50] }).then((font) => {
//     mainScene.add(font);
// });

// mainScene.add(ThingOrigin.model.initSphere("qiu1", undefined, { position: [0, 0, 0] }));
// mainScene.add(ThingOrigin.model.initSphere("qiu1", undefined, { position: [0, 0, -180] }));
// mainScene.add(ThingOrigin.model.initSphere("qiu1", undefined, { position: [0, 0, 180] }));

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
