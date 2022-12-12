import * as CANNON from "cannon";
import { ThingOrigin } from "./ThingOrigin";

let mainScene = ThingOrigin.addScene("ttt", document.getElementById("d1"));

// 物理引擎案例
var world,
  mass,
  body,
  shape,
  timeStep = 1 / 60,
  camera,
  scene,
  renderer,
  geometry,
  material,
  mesh;

initThree();
initCannon();
animate();

function initCannon() {
  world = new CANNON.World();
  world.gravity.set(0, -10, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10; //迭代次数

  // world.defaultContactMaterial.contactEquationStiffness = 1e7;
  // world.defaultContactMaterial.contactEquationRelaxation = 4;

  // Create a plane
  var groundShape = new CANNON.Plane();
  var groundBody = new CANNON.Body({ mass: 0 });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(1, 0, 0),
    -Math.PI / 2
  );
  world.addBody(groundBody);

  shape = new CANNON.Box(new CANNON.Vec3(11, 4, 6));
  mass = 1;
  body = new CANNON.Body({
    mass: 1,
  });
  body.addShape(shape);
  body.position.set(0, 30, 0);
  body.angularVelocity.set(1, 10, 1); //角速度
  body.angularDamping = 0.01; //角度阻尼
  world.addBody(body);
}

let modelA;
let modelB;
function initThree() {
  modelB = ThingOrigin.model.initBox("wb");
  modelB.position.set(0, 60, 0);
  mainScene.add(modelB);

  // modelB.material = ThingOrigin.material.initPicMaterial("/static/img/wb.jpg");
  // ThingOrigin.model.initFileModel("gltf", "/static/three/test/scene.gltf", { scale: [4, 4, 4] }).then((model) => {
  //     console.log(model);
  //     mainScene.add(model);
  //     console.log(ThingOrigin.tool.getObjectBox(model));
  //     modelA = model;
  //     animate();

  //     ThingOrigin.animate.showExploded(model, 5, 5000);
  // });
  // geometry = new BoxGeometry(2, 2, 2);
  // material = new MeshBasicMaterial({ color: 0xff0000, wireframe: true });

  // mesh = new Mesh(geometry, material);
  // mainScene.add(mesh);
}

function animate() {
  requestAnimationFrame(animate);
  updatePhysics();
}

function updatePhysics() {
  // Step the physics world
  world.step(timeStep);

  // Copy coordinates from Cannon.js to Three.js
  // modelA.position.copy(body.position);
  // modelA.quaternion.copy(body.quaternion);
  modelB.position.copy(body.position);
  modelB.quaternion.copy(body.quaternion);
  // mesh.position.copy(body.position);
  // mesh.quaternion.copy(body.quaternion);
}

// 中科院图谱案例
// import links from "../public/static/data/w-links.js";
// import nodes from "../public/static/data/w-nodes.js";

// let mainScene = ThingOrigin.addScene("test", document.getElementById("d1"));

// console.log(links, nodes);
// let n = ThingOrigin.model.initSpriteShape("nodes", nodes, {
//   shape: "sphere",
//   color: "red",
//   radius: 10,
// });

// mainScene.add(n);
