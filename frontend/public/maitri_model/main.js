import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const container = document.getElementById("canvas");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06101a);
scene.fog = new THREE.Fog(0x06101a, 260, 520);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(150, 105, 155);

const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:"high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .055;
controls.maxPolarAngle = Math.PI * .48;
controls.minDistance = 45;
controls.maxDistance = 340;
controls.target.set(0, 7, 0);

scene.add(new THREE.HemisphereLight(0xaed6ff, 0x263238, 1.8));
const sun = new THREE.DirectionalLight(0xffffff, 3.2);
sun.position.set(-80, 170, 100);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left = -220; sun.shadow.camera.right = 220;
sun.shadow.camera.top = 220; sun.shadow.camera.bottom = -220;
scene.add(sun);

const mats = {
  ground:new THREE.MeshStandardMaterial({color:0x59666a, roughness:1}),
  snow:new THREE.MeshStandardMaterial({color:0xdce9ee, roughness:.9}),
  main:new THREE.MeshStandardMaterial({color:0x8caebe, roughness:.7}),
  roof:new THREE.MeshStandardMaterial({color:0xd9e5e8, roughness:.8}),
  blue:new THREE.MeshStandardMaterial({color:0x1c4e76, roughness:.75}),
  red:new THREE.MeshStandardMaterial({color:0xb95039, roughness:.8}),
  container:new THREE.MeshStandardMaterial({color:0xd87935, roughness:.9}),
  dark:new THREE.MeshStandardMaterial({color:0x202c32, roughness:.85}),
  glass:new THREE.MeshStandardMaterial({color:0xaed8e9, roughness:.2, metalness:.1}),
  panel:new THREE.MeshStandardMaterial({color:0x172b3c, roughness:.45, metalness:.35}),
  white:new THREE.MeshStandardMaterial({color:0xf0f4f4, roughness:.8}),
  pipe:new THREE.MeshStandardMaterial({color:0x33444b, roughness:.75}),
  green:new THREE.MeshStandardMaterial({color:0x3a7d44, roughness:.9}),
  brown:new THREE.MeshStandardMaterial({color:0x5c3a1e, roughness:.9}),
  yellow:new THREE.MeshStandardMaterial({color:0xd4c73b, roughness:.9}),
  warmLight:new THREE.MeshStandardMaterial({color:0xffcc66, roughness:.5, emissive:0xffaa33, emissiveIntensity:0.6}),
  cyan:new THREE.MeshStandardMaterial({color:0x5bc0de, roughness:.8}),
};

const equipment = [];
const labels = [];
const defaultCam = new THREE.Vector3(150,105,155);

function box(name, x,y,z, sx,sy,sz, mat, meta=null){
  const g = new THREE.Group(); g.name=name;
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), mat);
  m.castShadow=true; m.receiveShadow=true; g.add(m);
  g.position.set(x,y,z);
  if(meta){ g.userData={...meta,name}; equipment.push(g); }
  scene.add(g); return g;
}
function cyl(name,x,y,z,r,h,mat,meta=null){
  const g=new THREE.Group(); g.name=name;
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,18),mat);
  m.castShadow=true; g.add(m); g.position.set(x,y,z);
  if(meta){g.userData={...meta,name}; equipment.push(g);}
  scene.add(g); return g;
}
function addLabel(text, pos){
  const c=document.createElement("canvas"); c.width=512;c.height=128;
  const ctx=c.getContext("2d"); ctx.clearRect(0,0,512,128);
  ctx.fillStyle="rgba(5,14,21,.88)";
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(8,20,496,82,18);
  } else {
    ctx.rect(8,20,496,82);
  }
  ctx.fill();
  ctx.fillStyle="#eaf4f8"; ctx.font="700 30px Arial"; ctx.textAlign="center"; ctx.fillText(text,256,72);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  sp.scale.set(26,6.5,1); sp.position.copy(pos); scene.add(sp); labels.push(sp); return sp;
}
function statusMeta(status, type, metrics){
  return {status,type,metrics};
}

// Helper: small building with peaked/triangular dark roof and lit window
function house(name, x, z, sx, sz, wallMat, meta=null){
  const g = new THREE.Group(); g.name=name;
  const body = new THREE.Mesh(new THREE.BoxGeometry(sx,8,sz),wallMat);
  body.position.y=4; body.castShadow=true; body.receiveShadow=true; g.add(body);
  // Peaked roof (triangular prism extruded along Z)
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-sx/2-0.5, 0);
  roofShape.lineTo(0, 4);
  roofShape.lineTo(sx/2+0.5, 0);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {depth:sz+1, bevelEnabled:false});
  const roof = new THREE.Mesh(roofGeo, mats.dark);
  roof.position.set(0, 8, -sz/2-0.5);
  roof.castShadow=true; g.add(roof);
  // Lit window on front face
  const win = new THREE.Mesh(new THREE.BoxGeometry(2.5,2.5,0.3), mats.warmLight);
  win.position.set(0, 4, sz/2+0.16); g.add(win);
  g.position.set(x, 0, z);
  if(meta){ g.userData={...meta,name}; equipment.push(g); }
  scene.add(g); return g;
}

// ====================================================================
//  SCENE GEOMETRY — structured to match reference 3D model
// ====================================================================

// ====== TERRAIN ======
const terrain = new THREE.Mesh(new THREE.CylinderGeometry(245,245,4,96),mats.ground);
terrain.position.y=-2; terrain.receiveShadow=true; scene.add(terrain);

// ====== SNOW / ICE PATCHES ======
for(const [sx,sz,sr] of [
  [20,10,32],[-15,30,28],[50,20,22],[0,48,20],[38,55,16]
]){
  const s=new THREE.Mesh(new THREE.CircleGeometry(sr,32),mats.snow);
  s.rotation.x=-Math.PI/2; s.scale.y=.55; s.position.set(sx,.05,sz); scene.add(s);
}

// ====== MAIN U-SHAPED STATION ======
// Two parallel wings (east-west) connected by bridge on east end.
// Blue walls, light blue/white roof, warm-lit windows, dark stilts.
const main = new THREE.Group(); main.name="Main Research Station";
function wing(x,z,sx,sz){
  const body=new THREE.Mesh(new THREE.BoxGeometry(sx,15,sz),mats.blue);
  body.position.set(x,12,z); body.castShadow=true; body.receiveShadow=true; main.add(body);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(sx+1.2,1.5,sz+1.2),mats.roof);
  roof.position.set(x,20,z); roof.castShadow=true; main.add(roof);
  // Warm-lit windows on both long faces
  for(let i=-Math.floor(sx/2)+5;i<Math.floor(sx/2)-2;i+=8){
    const w=new THREE.Mesh(new THREE.BoxGeometry(4.2,3,0.3),mats.warmLight);
    w.position.set(x+i,13.2,z+sz/2+.18); main.add(w);
    const w2=w.clone(); w2.position.z=z-sz/2-.18; main.add(w2);
  }
  // Elevated stilts under the building
  for(let i=-sx/2+5;i<sx/2;i+=10){
    const s=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,8,10),mats.dark);
    s.position.set(x+i,3,z-sz/2+1); s.castShadow=true; main.add(s);
    const s2=s.clone(); s2.position.z=z+sz/2-1; main.add(s2);
  }
}
wing(-5,-35,70,14);   // North wing
wing(-5,-15,70,14);   // South wing
// Bridge connecting wings on east end
const bridge=new THREE.Mesh(new THREE.BoxGeometry(14,15,34),mats.blue);
bridge.position.set(27,12,-25); bridge.castShadow=true; main.add(bridge);
const brRoof=new THREE.Mesh(new THREE.BoxGeometry(15.2,1.5,35.2),mats.roof);
brRoof.position.set(27,20,-25); main.add(brRoof);
scene.add(main);
addLabel("MAIN STATION",new THREE.Vector3(0,28,-25));

// ====== ENTRY RAMPS ======
// Red/orange triangular ramps under the wings — inner faces of U gap
for(let i=-30;i<=10;i+=10){
  const r1=box("Entry Ramp",i,5,-28,7,1.5,5,mats.red);
  r1.rotation.x=-0.45;
  const r2=box("Entry Ramp",i,5,-22,7,1.5,5,mats.container);
  r2.rotation.x=0.45;
}
// Ramps on outer south face of south wing
for(let i=-25;i<=10;i+=12){
  const r3=box("Entry Ramp",i,5,-8,7,1.5,5,mats.red);
  r3.rotation.x=-0.45;
}

// ====== COMMUNICATION DOME ======
const dome=new THREE.Mesh(new THREE.SphereGeometry(8,32,16,0,Math.PI*2,0,Math.PI/2),mats.white);
dome.position.set(35,9,-5); dome.castShadow=true; scene.add(dome);
// Support legs
for(let a=0;a<Math.PI*2;a+=Math.PI/2){
  const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,8,8),mats.dark);
  leg.position.set(35+Math.cos(a)*4,4,-5+Math.sin(a)*4); scene.add(leg);
}
equipment.push(Object.assign(dome,{userData:statusMeta("OPERATIONAL","COMMUNICATION",{Link:"Stable",Uplink:"1.2 Mbps",Latency:"640 ms"})}));
equipment[equipment.length-1].userData.name="Satellite Communication Dome";
addLabel("COMMUNICATION",new THREE.Vector3(35,20,-5));

// ====== TALL CENTRAL ANTENNA ======
const antPole=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.8,50,12),mats.dark);
antPole.position.set(15,25,-50); antPole.castShadow=true; scene.add(antPole);
// Top sphere
const antTop=new THREE.Mesh(new THREE.SphereGeometry(2.5,16,12),mats.white);
antTop.position.set(15,51,-50); scene.add(antTop);
// Crossbar
const crossbar=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,14,8),mats.dark);
crossbar.rotation.z=Math.PI/2; crossbar.position.set(15,40,-50); scene.add(crossbar);
// Dish on antenna
const antDish=new THREE.Mesh(new THREE.SphereGeometry(3,16,8,0,Math.PI*2,0,Math.PI/2),mats.white);
antDish.scale.y=0.4; antDish.position.set(15,44,-50); antDish.rotation.z=-0.3; scene.add(antDish);

// ====== SATELLITE DISH (ground level) ======
function dish(x,z,scale=1){
  const g=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.55,.7,14,12),mats.dark); pole.position.y=7; g.add(pole);
  const d=new THREE.Mesh(new THREE.SphereGeometry(6*scale,24,12,0,Math.PI*2,0,Math.PI/2),mats.white);
  d.scale.y=.45; d.position.y=14; d.rotation.z=-.3; g.add(d);
  g.position.set(x,0,z); scene.add(g);
}
dish(-55,-30,0.8);

// ====== SCATTERED CONTAINERS — LEFT SIDE ======
box("Supply Container 01",-80,5,-15,14,10,10,mats.red,
    statusMeta("OPERATIONAL","LOGISTICS",{"Inventory":"78%","Category":"Emergency","Status":"Sealed"}));
box("Supply Container 02",-80,5,2,14,10,10,mats.container,
    statusMeta("OPERATIONAL","LOGISTICS",{"Inventory":"65%","Category":"Equipment","Status":"Available"}));
box("Supply Container 03",-65,4,-8,10,8,8,mats.yellow,
    statusMeta("OPERATIONAL","LOGISTICS",{"Inventory":"42%","Category":"Food","Status":"Available"}));
box("Generator 01",-65,5,8,14,10,10,mats.dark,
    statusMeta("OPERATIONAL","ENERGY",{"Output":"420 kW","Temperature":"-18°C","Fuel":"68%","Health":"Normal"}));
box("Generator 02",-50,5,-5,14,10,10,mats.dark,
    statusMeta("WARNING","ENERGY",{"Output":"390 kW","Vibration":"High","Fuel":"61%","Health":"Inspect"}));
addLabel("SUPPLY / GENERATORS",new THREE.Vector3(-68,18,-5));

// ====== CONTAINER YARD — RIGHT SIDE ======
const cColors=[mats.container,mats.red,mats.yellow,mats.green,mats.blue,
               mats.brown,mats.red,mats.container,mats.yellow,mats.green,
               mats.container,mats.red,mats.yellow,mats.green,mats.container];
let idx=0;
for(let r=0;r<3;r++) for(let c=0;c<5;c++){
  const cx=60+c*12, cz=5+r*11;
  box("Storage Container",cx,4,cz,10,8,7,cColors[idx++%cColors.length],
      statusMeta(r===2&&c>3?"WARNING":"OPERATIONAL","LOGISTICS",
      {"Inventory":r===2&&c>3?"21%":"71%","Category":"Supplies","Consumption":"Tracked","Status":"Available"}));
}
addLabel("LOGISTICS / STORAGE",new THREE.Vector3(84,16,18));

// ====== AUXILIARY BUILDINGS — PEAKED-ROOF HOUSES ======
const hMeta=()=>statusMeta("OPERATIONAL","INFRASTRUCTURE",
    {"Temperature":"-14°C","Power":"18 kW","Occupancy":"Low","Health":"Normal"});
house("Lab Building 01",-15,62,12,10,mats.red,hMeta());
house("Quarters 01",5,64,12,10,mats.container,hMeta());
house("Quarters 02",25,62,12,10,mats.blue,hMeta());
house("Workshop",-10,77,14,10,mats.brown,hMeta());
house("Medical Bay",12,79,12,10,mats.green,hMeta());
house("Storage Shed",32,76,12,10,mats.yellow,hMeta());
house("Equipment Room",-30,68,12,10,mats.main,hMeta());
addLabel("RESIDENTIAL / LABS",new THREE.Vector3(5,18,70));

// ====== LONG AUXILIARY BUILDING ======
const longBody=new THREE.Mesh(new THREE.BoxGeometry(80,10,12),mats.blue);
longBody.position.set(-5,5,48); longBody.castShadow=true; longBody.receiveShadow=true; scene.add(longBody);
const longRoof=new THREE.Mesh(new THREE.BoxGeometry(81.2,1.2,13.2),mats.roof);
longRoof.position.set(-5,10.5,48); longRoof.castShadow=true; scene.add(longRoof);
// Windows on long building
for(let i=-35;i<35;i+=10){
  const w=new THREE.Mesh(new THREE.BoxGeometry(3.5,2.5,0.3),mats.warmLight);
  w.position.set(i,5,48-6.18); scene.add(w);
  const w2=w.clone(); w2.position.z=48+6.18; scene.add(w2);
}
addLabel("ACCOMMODATION",new THREE.Vector3(-5,16,48));

// ====== SOLAR PANELS ======
for(let row=0;row<2;row++) for(let col=0;col<4;col++){
  const p=box("Solar Panel",35+col*7,3,85+row*7,5.5,.35,5,mats.panel,
      statusMeta("OPERATIONAL","ENERGY",{"Generation":"86 kW","Irradiance":"Normal","Efficiency":"91%","Status":"Online"}));
  p.rotation.x=-0.18;
}
addLabel("SOLAR ARRAY",new THREE.Vector3(49,10,88));

// ====== WATER SYSTEM ======
box("Water System",60,7,65,18,14,14,mats.blue,
    statusMeta("OPERATIONAL","WATER",{"Level":"74%","Flow":"18 L/min","Temperature":"2°C","Health":"Normal"}));
addLabel("WATER SYSTEM",new THREE.Vector3(60,18,65));

// ====== BLUE WALKWAY / PLATFORMS ======
for(const [wx,wz,wl,ww] of [
  [10,5,25,5],[-25,28,30,5],[52,-5,20,4],
  [-5,52,18,4],[25,55,14,4],[62,42,16,4],[-40,48,15,4],
  [5,68,20,4],[40,65,18,4]
]){
  const wk=new THREE.Mesh(new THREE.BoxGeometry(wl,0.3,ww),mats.cyan);
  wk.position.set(wx,0.15,wz); wk.receiveShadow=true; scene.add(wk);
}

// ====== UTILITY PIPELINES ======
function pipe(a,b){
  const A=new THREE.Vector3(...a), B=new THREE.Vector3(...b);
  const mid=A.clone().add(B).multiplyScalar(.5), dir=B.clone().sub(A);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,dir.length(),10),mats.pipe);
  m.position.copy(mid); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()); m.castShadow=true; scene.add(m);
}
pipe([27,5,-8],[35,5,-5]);      // Station to dome
pipe([35,5,-5],[60,5,5]);       // Dome toward container yard
pipe([27,5,-42],[-50,5,-5]);    // Station bridge to generators
pipe([0,5,-8],[0,5,48]);        // Station south to accommodation
pipe([60,5,30],[60,5,60]);      // Container area to water

// ====== ANTENNA / UTILITY POLES ======
function utilPole(x,z){
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,22,10),mats.dark);
  pole.position.set(x,11,z); pole.castShadow=true; scene.add(pole);
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,8,8),mats.dark);
  bar.rotation.z=Math.PI/2; bar.position.set(x,20,z); scene.add(bar);
}
utilPole(-55,-45); utilPole(-45,18); utilPole(-20,38);
utilPole(50,42); utilPole(72,-28);

// ====================================================================
//  INTERACTION — raycasting, selection, UI, animation
// ====================================================================

// Raycasting
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
let selected=null;

function setStatusMaterial(obj){
  const status=obj.userData.status;
  let color=0x50e38a;
  if(status==="WARNING") color=0xffd45b;
  if(status==="CRITICAL") color=0xff5c65;
  if(status==="COMMUNICATION") color=0x55b9ff;
  obj.traverse(o=>{
    if(o.isMesh && o.material && o.material.clone){
      o.userData.baseMaterial=o.material;
    }
  });
}
equipment.forEach(setStatusMaterial);

function findSelectable(o){
  while(o && !o.userData?.status && o.parent) o=o.parent;
  return o?.userData?.status ? o : null;
}
function select(obj){
  if(selected && selected!==obj) clearSelection(selected);
  selected=obj;
  obj.traverse(o=>{
    if(o.isMesh && o.material){
      o.userData.originalEmissive=o.material.emissive?.getHex?.() ?? 0;
      if(o.material.emissive) o.material.emissive.setHex(0x214a58);
    }
  });
  const d=obj.userData;
  document.getElementById("infoName").textContent=d.name;
  document.getElementById("infoType").textContent=d.type;
  document.getElementById("infoStatus").textContent=d.status;
  const statusEl=document.getElementById("infoStatus");
  statusEl.style.background=d.status==="WARNING"?"#4a3d13":d.status==="CRITICAL"?"#4b1d22":"#153d2a";
  statusEl.style.color=d.status==="WARNING"?"#ffe08a":d.status==="CRITICAL"?"#ff9ba0":"#63efa0";
  document.getElementById("infoMetrics").innerHTML=Object.entries(d.metrics||{}).map(([k,v])=>`<div class="metric"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
  document.getElementById("info").classList.remove("hidden");
}
function clearSelection(obj){
  obj.traverse(o=>{
    if(o.isMesh && o.material?.emissive) o.material.emissive.setHex(o.userData.originalEmissive||0);
  });
}
renderer.domElement.addEventListener("pointerdown",e=>{
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(scene.children,true);
  for(const h of hits){
    const obj=findSelectable(h.object);
    if(obj){select(obj);break;}
  }
});
document.getElementById("closeInfo").onclick=()=>{if(selected)clearSelection(selected);selected=null;document.getElementById("info").classList.add("hidden")};
document.getElementById("reset").onclick=()=>{camera.position.copy(defaultCam);controls.target.set(0,7,0);controls.update()};
document.getElementById("overview").onclick=()=>{camera.position.set(150,105,155);controls.target.set(0,7,0);controls.update()};
document.getElementById("topView").onclick=()=>{camera.position.set(0,260,0.01);controls.target.set(0,0,0);controls.update()};
let labelsOn=true;
document.getElementById("labels").onclick=()=>{labelsOn=!labelsOn;labels.forEach(l=>l.visible=labelsOn)};

addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
});

function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene,camera);
}
animate();
