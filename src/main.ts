import * as CANNON from "cannon-es";
import {
  AnimationMixer,
  AnimationUtils,
  Clock,
  LoopOnce,
  Mesh,
  PlaneGeometry,
  RepeatWrapping,
  TextureLoader,
  Vector3,
} from "three";
import { ThingOrigin } from "./ThingOrigin";
// import { Water } from "three/examples/jsm/objects/Water.js";
// import sortedArray = AnimationUtils.sortedArray;

let mainScene = ThingOrigin.addScene("ttt", document.getElementById("d1"), {
  // modelList: [
  //   {
  //     name: "零件",
  //     position: {
  //       x: 30,
  //       y: 0,
  //       z: 0,
  //     },
  //     rotation: {
  //       x: 0,
  //       y: 0,
  //       z: 0,
  //     },
  //     scale: {
  //       x: 1,
  //       y: 1,
  //       z: 1,
  //     },
  //     type: "cube",
  //     uuid: "41D2F7DC-5D1A-442E-8888-B3B61A5C1695",
  //     ownCSS2dList: false,
  //     userData: {
  //       rootName: "cube-01",
  //       sim: {
  //         type: "part",
  //         positionOffset: [0, 0, 9.7],
  //         rotationOffset: [0, 0, 0],
  //       },
  //     },
  //     loadType: "base",
  //     base: {
  //       width: 18,
  //       height: 6,
  //       depth: 2,
  //     },
  //     config: {
  //       color: "yellow",
  //     },
  //     zIndex: 1,
  //   },
  //   {
  //     name: "ABB机器人",
  //     position: {
  //       x: 0,
  //       y: 0,
  //       z: 0,
  //     },
  //     rotation: {
  //       x: 0,
  //       y: 0,
  //       z: 0,
  //     },
  //     scale: {
  //       x: 1,
  //       y: 1,
  //       z: 1,
  //     },
  //     type: "gltf",
  //     uuid: "7F62DD93-811D-4A32-A8E6-94D59C133D29",
  //     ownCSS2dList: false,
  //     userData: {
  //       rootName: "ABB-01",
  //       sim: {
  //         type: "robotArm",
  //         end: "柱体",
  //       },
  //     },
  //     saved: true,
  //     url: "/static/three/test/abb.gltf",
  //     modelName: "ABB-01",
  //     zIndex: 2,
  //   },
  // ],
});

console.log(mainScene);

let modelB = ThingOrigin.model.initCube("wb");
console.log(modelB);

mainScene.add(modelB);

// let cube = ThingOrigin.model.initCube({
//   name: "零件",
//   modelName: "part",
//   loadType: "base",
//   type: "cube",
//   icon: "icon-cube",
//   scale: { x: 1, y: 1, z: 1 },
//   position: { x: 0, y: 0, z: 0 },
//   rotation: { x: 0, y: 0, z: 0 },
//   base: {
//     width: 18,
//     height: 6,
//     depth: 2,
//   },
//   config: {
//     color: "blue",
//   },
//   userData: {
//     rootName: "cube-01",
//     sim: {
//       type: "part",
//       positionOffset: [0, 0, 9.7],
//       rotationOffset: [0, 0, 0],
//     },
//   },
// });
// mainScene.add(cube);

// ThingOrigin.model
//   .initFileModel(
//     {
//       name: "ABB机器人",
//       position: {
//         x: 20,
//         y: 0,
//         z: 0,
//       },
//       rotation: {
//         x: 0,
//         y: 0,
//         z: 0,
//       },
//       scale: {
//         x: 1,
//         y: 1,
//         z: 1,
//       },
//       type: "gltf",
//       uuid: "7F62DD93-811D-4A32-A8E6-94D59C133D29",
//       ownCSS2dList: false,
//       userData: {
//         rootName: "ABB-01",
//         sim: {
//           type: "robotArm",
//           end: "柱体",
//         },
//       },
//       saved: true,
//       url: "/static/three/test/abb.gltf",
//       modelName: "ABB-01",
//       zIndex: 2,
//     },
//     "/static/three/test/abb.gltf"
//   )
//   .then((model) => {
//     console.log(model);
//     mainScene.add(model.scene);

//     let a = ThingOrigin.tool.getChildrenInfo(model.scene);
//     console.log(a);
//   });
//
// let map = ThingOrigin.model.initMap("/static/data/china.json").then((map) => {
//   mainScene.add(map);
// });
//
// console.log(map);

// mainScene.setSceneViewImage('/static/three/animate/textures/venice_sunset_1k.hdr')
// ThingOrigin.model
//   .initFileModel("gltf", "/static/three/test/scene.gltf", { scale: [4, 4, 4] })
//   .then((model) => {
//     console.log(model);
//     mainScene.add(model.scene);
//   });

// ThingOrigin.model
//   .initFileModel("gltf", "/static/three/factory.glb", {
//     scale: [4, 4, 4],
//   })
//   .then((model) => {
//     //@ts-ignore
//     mainScene.add(model.scene);
//
//     //@ts-ignore
//     mainScene.playAnimation(model, 0);
//   });

// //indexedDB缓存模型;
// let modelInfo = {
//   id: 1,
//   type: "gltf",
//   name: "测试模型",
//   url: "/static/three/test/scene.gltf",
//   configs: {
//     scale: [4, 4, 4],
//   },
// };
// ThingOrigin.indexedDB.accessModel("ttt", "ttt", modelInfo).then((res) => {
//   console.log(res);
//
//   if (res.saved) {
//     console.log("已缓存", res.type, res.url);
//     ThingOrigin.model.initFileModel(res.type, res.url).then((model) => {
//       console.log(model);
//       //@ts-ignore
//       mainScene.add(model.scene);
//     });
//   } else {
//     // ElMessage('模型首次加载缓存中，请稍后！')
//     ThingOrigin.indexedDB
//       .insertModel("ttt", "ttt", modelInfo)
//       .then((modelParam) => {
//         if (modelParam.saved == false) {
//           console.log("缓存失败");
//         } else {
//           console.log("开始缓存", modelParam);
//         }
//       });
//   }
// });

// demo2 物理引擎案例
// var world,
//   mass,
//   body,
//   shape,
//   timeStep = 1 / 60,
//   camera,
//   scene,
//   renderer,
//   geometry,
//   material,
//   mesh;

// initThree();
// initCannon();
// animate();

// function initCannon() {
//   world = ThingOrigin.physics.initWorld();
//   // world.broadphase = new CANNON.NaiveBroadphase();
//   // world.solver.iterations = 10; //迭代次数

//   // world.defaultContactMaterial.contactEquationStiffness = 1e7;
//   // world.defaultContactMaterial.contactEquationRelaxation = 4;
//   let materialInfo = {
//     friction: 0.7,
//     restitution: 1,
//   };
//   let boxMaterialCon = ThingOrigin.physics.initMaterial(materialInfo);

//   // Create a plane
//   let groundShape = ThingOrigin.physics.initPlane();
//   let groundBody = ThingOrigin.physics.initBody(0, groundShape, [0, 0, 0]);
//   groundBody.quaternion.setFromAxisAngle(
//     new CANNON.Vec3(1, 0, 0),
//     -Math.PI / 2
//   );
//   world.addBody(groundBody);

//   let modelInfo = {
//     base: {
//       width: 10,
//       height: 10,
//       depth: 10,
//     },
//   };
//   shape = ThingOrigin.physics.initBox(modelInfo);
//   mass = 1;
//   body = ThingOrigin.physics.initBody(1, shape, [0, 30, 0]);
//   // body.position.set(0, 30, 0);
//   body.angularVelocity.set(1, 10, 1); //角速度
//   body.angularDamping = 0.01; //角度阻尼
//   world.addBody(body);
// }

// let modelA;
// let modelB;
// function initThree() {
//   modelB = ThingOrigin.model.initCube("wb", {});
//   modelB.position.set(0, 60, 0);
//   mainScene.add(modelB);

//   // modelB.material = ThingOrigin.material.initPicMaterial("/static/img/wb.jpg");
//   // ThingOrigin.model.initFileModel("gltf", "/static/three/test/scene.gltf", { scale: [4, 4, 4] }).then((model) => {
//   //     console.log(model);
//   //     mainScene.add(model);
//   //     console.log(ThingOrigin.tool.getObjectBox(model));
//   //     modelA = model;
//   //     animate();

//   //     ThingOrigin.animate.showExploded(model, 5, 5000);
//   // });
//   // geometry = new BoxGeometry(2, 2, 2);
//   // material = new MeshBasicMaterial({ color: 0xff0000, wireframe: true });

//   // mesh = new Mesh(geometry, material);
//   // mainScene.add(mesh);
// }

// function animate() {
//   requestAnimationFrame(animate);
//   updatePhysics();
// }

// function updatePhysics() {
//   // Step the physics world
//   world.step(timeStep);

//   // Copy coordinates from Cannon.js to Three.js
//   // modelA.position.copy(body.position);
//   // modelA.quaternion.copy(body.quaternion);
//   modelB.position.copy(body.position);
//   modelB.quaternion.copy(body.quaternion);
//   // mesh.position.copy(body.position);
//   // mesh.quaternion.copy(body.quaternion);
// }

// // demo1 中科院图谱案例
// // import links from "../public/static/data/w-links.js";
// // import nodes from "../public/static/data/w-nodes.js";

// // let mainScene = ThingOrigin.addScene("test", document.getElementById("d1"));

// // console.log(links, nodes);
// // let n = ThingOrigin.model.initSpriteShape("nodes", nodes, {
// //   shape: "sphere",
// //   color: "red",
// //   radius: 10,
// // });

// // mainScene.add(n);
