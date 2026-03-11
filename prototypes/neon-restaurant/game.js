import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("game");
const statsEl = document.getElementById("stats");
const taskEl = document.getElementById("task");
const toastEl = document.getElementById("toast");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0912, 18, 45);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 15, 15);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 9;
controls.maxDistance = 21;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0x6179d6, 0.45));

const key = new THREE.DirectionalLight(0xffc58d, 1.5);
key.position.set(-4, 12, 2);
key.castShadow = true;
scene.add(key);

const rim = new THREE.PointLight(0x00e5ff, 1.2, 30, 2.1);
rim.position.set(5, 4, -7);
scene.add(rim);

const mag = new THREE.PointLight(0xff4ad8, 1.1, 24, 2.0);
mag.position.set(-8, 3, 2);
scene.add(mag);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(24, 18),
  new THREE.MeshStandardMaterial({ color: 0x1d112e, roughness: 0.22, metalness: 0.58 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x120c1f, roughness: 0.6, metalness: 0.2 });
[
  [0, 2, -9, 24, 4, 0.5],
  [0, 2, 9, 24, 4, 0.5],
  [-12, 2, 0, 0.5, 4, 18],
  [12, 2, 0, 0.5, 4, 18],
].forEach(([x, y, z, w, h, d]) => {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  wall.position.set(x, y, z);
  wall.receiveShadow = true;
  scene.add(wall);
});

const neonArch = new THREE.Mesh(
  new THREE.TorusGeometry(2.8, 0.12, 12, 42, Math.PI),
  new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 2.5 })
);
neonArch.position.set(-10.4, 2.2, 0);
neonArch.rotation.z = Math.PI / 2;
scene.add(neonArch);

function createLabel(text, color = "#ffffff") {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(8,8,14,0.75)";
  ctx.fillRect(0, 20, 512, 88);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 30, 492, 68);
  ctx.fillStyle = color;
  ctx.font = "bold 50px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(text, 256, 84);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  s.scale.set(3.2, 0.8, 1);
  return s;
}

const stations = {
  pos: { name: "POS", position: new THREE.Vector3(8.8, 0.7, 6.8), color: 0xffc96b },
  grill: { name: "Grill", position: new THREE.Vector3(8.8, 0.7, -6.2), color: 0xff8d5c },
  wok: { name: "Wok", position: new THREE.Vector3(5.8, 0.7, -6.2), color: 0x99ff66 },
  pastry: { name: "Pastry", position: new THREE.Vector3(2.8, 0.7, -6.2), color: 0x8bc8ff },
  pass: { name: "Pass", position: new THREE.Vector3(6.2, 0.7, -3.4), color: 0x00eeff },
  clean: { name: "Clean Bin", position: new THREE.Vector3(9.2, 0.7, 0), color: 0xb5a2ff },
};

Object.values(stations).forEach((s) => {
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.1, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x2b1d45, metalness: 0.65, roughness: 0.26 })
  );
  base.position.copy(s.position);
  base.castShadow = true;
  scene.add(base);

  const glow = new THREE.PointLight(s.color, 1.1, 5, 2);
  glow.position.copy(s.position).add(new THREE.Vector3(0, 0.9, 0));
  scene.add(glow);

  const label = createLabel(s.name, `#${s.color.toString(16).padStart(6, "0")}`);
  label.position.copy(s.position).add(new THREE.Vector3(0, 1.8, 0));
  scene.add(label);
});

const dishTypes = [
  { name: "Neon Steak", station: "grill", cookTime: 10, value: 35 },
  { name: "Fusion Noodles", station: "wok", cookTime: 9, value: 30 },
  { name: "Starlight Tart", station: "pastry", cookTime: 8, value: 24 },
  { name: "Crystal Sushi", station: "wok", cookTime: 11, value: 40 },
];

const tables = [];
const tablePositions = [
  [-4, -4],
  [-1, -4],
  [-4, 0],
  [-1, 0],
  [-4, 4],
  [-1, 4],
];

tablePositions.forEach(([x, z], i) => {
  const group = new THREE.Group();
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.16, 24),
    new THREE.MeshStandardMaterial({ color: 0x3a294f, roughness: 0.28, metalness: 0.52 })
  );
  top.position.y = 0.78;
  top.castShadow = true;
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.8, 18),
    new THREE.MeshStandardMaterial({ color: 0x201631, metalness: 0.6, roughness: 0.3 })
  );
  leg.position.y = 0.36;
  group.add(top, leg);
  group.position.set(x, 0, z);
  scene.add(group);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x00e7ff, emissive: 0x00e7ff, emissiveIntensity: 2 })
  );
  beacon.position.set(0, 1.1, 0);
  group.add(beacon);

  const t = {
    id: i + 1,
    mesh: group,
    beacon,
    state: "empty",
    patience: 1,
    dish: null,
    timer: 0,
    scorePenaltyApplied: false,
  };
  tables.push(t);
});

const waitress = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.34, 0.9, 6, 12),
  new THREE.MeshStandardMaterial({ color: 0xf4e8ff, metalness: 0.12, roughness: 0.22 })
);
body.castShadow = true;
body.position.y = 1;
const apron = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.45, 0.35),
  new THREE.MeshStandardMaterial({ color: 0x00c5ff, emissive: 0x0088aa, emissiveIntensity: 0.8 })
);
apron.position.set(0, 0.9, 0.22);
waitress.add(body, apron);
waitress.position.set(6, 0, 2);
scene.add(waitress);

const trayGlow = new THREE.PointLight(0xfff8b3, 0, 3, 2);
trayGlow.position.set(0, 1.5, 0.3);
waitress.add(trayGlow);

const state = {
  money: 0,
  served: 0,
  missed: 0,
  combo: 0,
  rating: 100,
  timer: 0,
  spawnTimer: 2,
  carrying: [],
  pendingOrderTicket: null,
  kitchenQueue: [],
  readyPass: [],
};

const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === "e") interact();
});
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

function setToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(setToast._id);
  setToast._id = setTimeout(() => toastEl.classList.remove("show"), 1200);
}

function tableColor(table) {
  return {
    empty: 0x576188,
    waiting_order: 0xffd166,
    order_taken: 0xff9f1c,
    cooking: 0xff4d6d,
    food_ready: 0x00e7ff,
    served: 0x91ff66,
    eating: 0x57ffb2,
    dirty: 0xb877ff,
  }[table.state] || 0xffffff;
}

function setTableState(table, next, timer = 0) {
  table.state = next;
  table.timer = timer;
  table.beacon.material.color.setHex(tableColor(table));
}

function nearestTarget(list, maxDist = 1.4) {
  let best = null;
  let d = Infinity;
  list.forEach((obj) => {
    const p = obj.position || obj.mesh?.position;
    const dist = waitress.position.distanceTo(p);
    if (dist < d && dist <= maxDist) {
      d = dist;
      best = obj;
    }
  });
  return best;
}

function interact() {
  const nearTable = nearestTarget(tables.map((t) => ({ ...t, position: t.mesh.position })));
  if (nearTable) {
    if (nearTable.state === "waiting_order" && !state.pendingOrderTicket) {
      nearTable.dish = dishTypes[Math.floor(Math.random() * dishTypes.length)];
      setTableState(nearTable, "order_taken", 0);
      state.pendingOrderTicket = { tableId: nearTable.id, dish: nearTable.dish };
      setToast(`Order taken T${nearTable.id}: ${nearTable.dish.name}. Bring to POS.`);
      return;
    }

    if (nearTable.state === "food_ready") {
      const idx = state.carrying.findIndex((dish) => dish.tableId === nearTable.id);
      if (idx >= 0) {
        const dish = state.carrying.splice(idx, 1)[0];
        setTableState(nearTable, "served", 1.2);
        nearTable.patience = Math.max(0, nearTable.patience);
        const tip = Math.round(dish.value * Math.max(0.1, nearTable.patience) * (1 + state.combo * 0.05));
        state.money += dish.value + tip;
        state.served += 1;
        state.combo += 1;
        state.rating = Math.min(100, state.rating + 2.2);
        setToast(`Served T${nearTable.id}! +$${dish.value + tip} (${tip} tip)`);
        return;
      }
    }

    if (nearTable.state === "dirty") {
      setTableState(nearTable, "empty");
      nearTable.dish = null;
      nearTable.patience = 1;
      setToast(`Table ${nearTable.id} cleaned.`);
      return;
    }
  }

  const nearPos = waitress.position.distanceTo(stations.pos.position) < 1.45;
  if (nearPos && state.pendingOrderTicket) {
    const ticket = state.pendingOrderTicket;
    state.pendingOrderTicket = null;
    const table = tables.find((t) => t.id === ticket.tableId);
    setTableState(table, "cooking");
    state.kitchenQueue.push({
      tableId: ticket.tableId,
      dish: ticket.dish,
      progress: 0,
      cookTime: ticket.dish.cookTime,
    });
    setToast(`Sent ${ticket.dish.name} to ${ticket.dish.station}.`);
    return;
  }

  const nearPass = waitress.position.distanceTo(stations.pass.position) < 1.5;
  if (nearPass && state.readyPass.length && state.carrying.length < 2) {
    const dish = state.readyPass.shift();
    state.carrying.push(dish);
    setToast(`Picked up ${dish.name} for T${dish.tableId}.`);
    return;
  }

  if (nearPass && state.readyPass.length && state.carrying.length >= 2) {
    setToast("Tray full! Deliver dishes first.");
  }
}

function spawnCustomer() {
  const candidates = tables.filter((t) => t.state === "empty");
  if (!candidates.length) return;
  const table = candidates[Math.floor(Math.random() * candidates.length)];
  setTableState(table, "waiting_order");
  table.patience = 1;
  table.scorePenaltyApplied = false;
  setToast(`New guests seated at table ${table.id}.`);
}

function update(dt) {
  state.timer += dt;
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnCustomer();
    state.spawnTimer = 6 + Math.random() * 5;
  }

  const speed = 4.8;
  const move = new THREE.Vector3(
    (keys["d"] || keys["arrowright"] ? 1 : 0) - (keys["a"] || keys["arrowleft"] ? 1 : 0),
    0,
    (keys["s"] || keys["arrowdown"] ? 1 : 0) - (keys["w"] || keys["arrowup"] ? 1 : 0)
  );
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    waitress.position.add(move);
    waitress.position.x = THREE.MathUtils.clamp(waitress.position.x, -10.7, 10.7);
    waitress.position.z = THREE.MathUtils.clamp(waitress.position.z, -7.6, 7.6);
    waitress.rotation.y = Math.atan2(move.x, move.z);
  }

  state.kitchenQueue.forEach((job) => {
    job.progress += dt;
    if (job.progress >= job.cookTime && !job.done) {
      job.done = true;
      const table = tables.find((t) => t.id === job.tableId);
      if (table) setTableState(table, "food_ready");
      state.readyPass.push({ tableId: job.tableId, name: job.dish.name, value: job.dish.value });
      setToast(`${job.dish.name} ready for table ${job.tableId}!`);
    }
  });
  state.kitchenQueue = state.kitchenQueue.filter((j) => !j.done);

  tables.forEach((t) => {
    if (["waiting_order", "order_taken", "cooking", "food_ready"].includes(t.state)) {
      t.patience -= dt * 0.018;
      if (t.patience <= 0 && !t.scorePenaltyApplied) {
        t.scorePenaltyApplied = true;
        state.missed += 1;
        state.combo = 0;
        state.rating = Math.max(0, state.rating - 8);
        setTableState(t, "dirty");
        state.readyPass = state.readyPass.filter((d) => d.tableId !== t.id);
        state.kitchenQueue = state.kitchenQueue.filter((j) => j.tableId !== t.id);
        if (state.pendingOrderTicket?.tableId === t.id) state.pendingOrderTicket = null;
        state.carrying = state.carrying.filter((d) => d.tableId !== t.id);
        setToast(`Table ${t.id} left unhappy.`);
      }
    }
    if (t.state === "served") {
      t.timer -= dt;
      if (t.timer <= 0) setTableState(t, "eating", 7.5);
    } else if (t.state === "eating") {
      t.timer -= dt;
      if (t.timer <= 0) setTableState(t, "dirty");
    }
  });

  trayGlow.intensity = state.carrying.length > 0 ? 1.4 : 0;

  const activeTables = tables.filter((t) => t.state !== "empty").length;
  statsEl.textContent = [
    `Revenue: $${state.money}`,
    `Served: ${state.served}   Missed: ${state.missed}`,
    `Rating: ${state.rating.toFixed(0)}%   Combo: x${Math.max(1, state.combo)}`,
    `Tray: ${state.carrying.length}/2   Active Tables: ${activeTables}`,
  ].join("\n");

  const nextTask = state.pendingOrderTicket
    ? `Deliver order ticket for T${state.pendingOrderTicket.tableId} to POS.`
    : state.carrying.length
    ? `Deliver ${state.carrying.map((d) => `T${d.tableId}`).join(", ")} dishes.`
    : state.readyPass.length
    ? "Pick up ready dish at PASS."
    : "Take orders, keep patience high, and clean dirty tables.";
  taskEl.textContent = `Objective: ${nextTask}`;

  controls.update();
  renderer.render(scene, camera);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
