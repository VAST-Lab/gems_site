import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.178/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.178/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.178/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://cdn.jsdelivr.net/npm/three@0.178/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "https://cdn.jsdelivr.net/npm/three@0.178/examples/jsm/libs/meshopt_decoder.module.js";
import { SplatMesh } from "https://sparkjs.dev/releases/spark/0.1.10/spark.module.js";

function getDeviceCapabilities() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl");
  const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase() : "";

  const isMobile = /iphone|ipad|android/i.test(navigator.userAgent);
  const isLowPower =
    renderer.includes("intel") ||
    renderer.includes("apple gpu") ||
    renderer.includes("mali") ||
    renderer.includes("adreno");

  return {
    isLowEnd: isMobile || isLowPower,
    tier: isMobile && !renderer.includes("apple") ? "low" : "high"
  };
}

async function getPersistentSplat(url, onProgress) {
  const cacheName = "gem-splat-cache";
  const cache = await caches.open(cacheName);

  const cachedResponse = await cache.match(url);
  if (cachedResponse) {
    const blob = await cachedResponse.blob();
    return URL.createObjectURL(blob);
  }

  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`HuggingFace Error: ${response.status}`);

  const contentLength = response.headers.get("content-length");
  const total = parseInt(contentLength, 10);
  let loaded = 0;

  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (onProgress && total) onProgress(Math.round((loaded / total) * 100));
  }

  const fullBlob = new Blob(chunks);

  try {
    await cache.put(
      url,
      new Response(fullBlob, {
        headers: { "Content-Length": fullBlob.size.toString() }
      })
    );
  } catch (e) {
    console.warn("Storage full, loading anyway...");
  }

  return URL.createObjectURL(fullBlob);
}

async function loadModels() {
  const res = await fetch("models.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load models.json");
  return res.json();
}

function getId() {
  const u = new URL(location.href);
  return u.searchParams.get("id");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "";
}

function addTagChips(tags) {
  const host = document.getElementById("tags");
  if (!host) return;
  host.innerHTML = "";
  for (const t of tags ?? []) {
    const b = document.createElement("span");
    b.className = "chip";
    b.dataset.on = "false";
    b.textContent = t;
    host.appendChild(b);
  }
}

function renderCompoundBadges(compounds) {
  const host = document.getElementById("compoundBadges");
  if (!host) return;

  host.innerHTML = "";

  if (!Array.isArray(compounds) || compounds.length === 0) {
    host.style.display = "none";
    return;
  }

  host.style.display = "flex";

  for (const item of compounds) {
    const badge = document.createElement("div");
    badge.className = "compound-badge";

    if (item.color) badge.style.setProperty("--compound-bg", item.color);
    if (item.glow) badge.style.setProperty("--compound-glow", item.glow);

    badge.title = item.name ? `${item.name} (${item.symbol ?? ""})` : item.symbol ?? "";

    const num = document.createElement("div");
    num.className = "compound-number";
    num.textContent = item.number ?? "";

    const sym = document.createElement("div");
    sym.className = "compound-symbol";
    sym.textContent = item.symbol ?? "";

    badge.appendChild(num);
    badge.appendChild(sym);
    host.appendChild(badge);
  }
}

const loaderBar = document.getElementById("loader-progress-bar");
const loaderLabel = document.getElementById("loader-progress-label");
const loaderOverlay = document.getElementById("loader-overlay");

function setLoaderProgress(value) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  if (loaderBar) loaderBar.style.width = `${pct}%`;
  if (loaderLabel) loaderLabel.textContent = `${pct}%`;
}

function hideLoaderOverlay(delay = 180) {
  setLoaderProgress(100);
  if (!loaderOverlay) return;
  window.setTimeout(() => {
    loaderOverlay.style.display = "none";
  }, delay);
}

function fitCameraToObject(camera, controls, object, offset = 1.25) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = (camera.fov * Math.PI) / 180;

  let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
  cameraZ *= offset;

  camera.position.set(center.x, center.y, center.z + cameraZ);
  camera.near = Math.max(0.01, maxDim / 200);
  camera.far = Math.max(50, maxDim * 50);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();

  return box;
}

function isSplatFile(url) {
  if (Array.isArray(url)) url = url[0];
  const u = (url ?? "").toLowerCase();
  return (
    u.endsWith(".ply") ||
    u.endsWith(".spz") ||
    u.endsWith(".splat") ||
    u.endsWith(".ksplat") ||
    u.endsWith(".sog")
  );
}

function frameBox(camera, controls, box, offset = 1.4) {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = (camera.fov * Math.PI) / 180;
  let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
  cameraZ *= offset;

  camera.position.set(center.x, center.y + maxDim * 0.1, center.z + cameraZ);
  camera.near = Math.max(0.01, maxDim / 200);
  camera.far = Math.max(50, maxDim * 50);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
}

function applyModelRotation(obj3d, modelMeta, { defaultSplatFix = false } = {}) {
  const r = modelMeta?.rotation;
  if (r && typeof r === "object") {
    obj3d.rotation.x = THREE.MathUtils.degToRad(r.x ?? 0);
    obj3d.rotation.y = THREE.MathUtils.degToRad(r.y ?? 0);
    obj3d.rotation.z = THREE.MathUtils.degToRad(r.z ?? 0);
    return;
  }

  if (defaultSplatFix) {
    obj3d.rotation.x = -Math.PI / 2;
  }
}

(async () => {
  const canvas = document.getElementById("c");
  if (!canvas) throw new Error("Canvas #c not found");

  const capabilities = getDeviceCapabilities();

  let models;
  try {
    models = await loadModels();
  } catch (err) {
    console.error(err);
    setText("title", "Failed to load models.json");
    setText("name", "Failed to load models.json");
    setText("desc", err?.message ?? "Unknown error");
    return;
  }

  const id = getId();
  const m = (models ?? []).find((x) => x.id === id) ?? (models ?? [])[0];

  if (!m) {
    setText("title", "No models found");
    setText("name", "No models found");
    return;
  }

  const sources = Array.isArray(m.src) ? m.src : [m.src];
  let finalSrc;
  let preferredSrc = sources[0];

  setLoaderProgress(5);

  if (capabilities.isLowEnd) {
    const lowEndPreferred = sources.find((url) => url.endsWith(".spz") || url.endsWith(".sog"));
    if (lowEndPreferred) preferredSrc = lowEndPreferred;
  }

  const checkList = [preferredSrc, ...sources.filter((s) => s !== preferredSrc)];

  setLoaderProgress(12);
  setText("status", "Locating best source...");
  const cache = await caches.open("gem-splat-cache");

  for (const url of checkList) {
    const isCached = await cache.match(url);
    if (isCached) {
      finalSrc = url;
      break;
    }

    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        finalSrc = url;
        break;
      }
    } catch (e) {
      console.warn(`Source not available, trying next: ${url}`);
    }
  }

  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn && finalSrc) {
    downloadBtn.href = finalSrc;
    downloadBtn.setAttribute("download", finalSrc.split("/").pop() || "model");
  }

  setLoaderProgress(25);
  document.title = m.name ?? "Viewer";
  setText("title", m.name);
  setText("name", m.name);
  if ((m.description ?? "").trim()) setText("desc", m.description);
  setText("author", m.author);
  setText("date", m.date);
  setText("software", m.software);
  setText("polycount", (m.polycount ?? "").toString());
  addTagChips(m.tags);
  renderCompoundBadges(m.compounds);

  setLoaderProgress(35);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !capabilities.isLowEnd,
    alpha: true,
    powerPreference: "high-performance"
  });

  const pixelRatio = capabilities.isLowEnd
    ? Math.min(window.devicePixelRatio, 1)
    : Math.min(window.devicePixelRatio, 2);

  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f14);

  const camera = new THREE.PerspectiveCamera(50, 2, 0.01, 2000);
  camera.position.set(0, 0.6, 2.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.0;

  let resumeTimer = null;
  const stopAuto = () => {
    controls.autoRotate = false;
    if (resumeTimer) clearTimeout(resumeTimer);
  };
  const scheduleResume = () => {
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      controls.autoRotate = true;
    }, 900);
  };

  controls.addEventListener("start", stopAuto);
  controls.addEventListener("end", scheduleResume);
  renderer.domElement.addEventListener(
    "wheel",
    () => {
      stopAuto();
      scheduleResume();
    },
    { passive: true }
  );

  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.95));

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 5, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-4, 2, -2);
  scene.add(fill);

  const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f1117, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 96), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -9999;
  scene.add(ground);

  setLoaderProgress(45);

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);

  if (isSplatFile(finalSrc)) {
    setLoaderProgress(50);
    setText("status", "Downloading Splat... 0%");

    try {
      const localBlobUrl = await getPersistentSplat(finalSrc, (pct) => {
        setText("status", `Downloading... ${pct}%`);
        setLoaderProgress(50 + Math.round(pct * 0.35));
      });

      setLoaderProgress(88);
      setText("status", "Processing Splat data...");

      const splat = new SplatMesh({
        url: localBlobUrl,
        onLoad: (mesh) => {
          applyModelRotation(mesh, m, { defaultSplatFix: true });

          URL.revokeObjectURL(localBlobUrl);

          setText("status", "Loaded splat.");
          hideLoaderOverlay();

          try {
            const box1 = mesh.getBoundingBox(false);
            const center = box1.getCenter(new THREE.Vector3());

            mesh.position.sub(center);

            if (m.offset) {
              mesh.position.x += m.offset.x ?? 0;
              mesh.position.y += m.offset.y ?? 0;
              mesh.position.z += m.offset.z ?? 0;
            }

            const box2 = mesh.getBoundingBox(false);
            if (box2 && box2.isBox3) {
              frameBox(camera, controls, box2, 1.35);
            }

            controls.target.set(0, 0, 0);
            controls.update();
          } catch (e) {
            camera.position.set(0, 0.25, 3);
            controls.target.set(0, 0, 0);
            controls.update();
          }
        }
      });

      scene.add(splat);
      await splat.initialized;
    } catch (err) {
      console.error(err);
      setText("status", "Failed to load splat.");
      setText("title", "Failed to load splat");
      setText("name", "Failed to load splat");
      setText("desc", err?.message ?? "Unknown error");
      return;
    }
  } else {
    setLoaderProgress(55);
    setText("status", "Loading…");

    loader.load(
      finalSrc,
      (gltf) => {
        const root = gltf.scene ?? gltf.scenes?.[0];
        if (!root) throw new Error("No scene in GLTF");

        applyModelRotation(root, m);
        scene.add(root);

        const box = fitCameraToObject(camera, controls, root, 1.25);
        ground.position.y = box.min.y - 0.02;

        setLoaderProgress(100);
        setText("status", "Loaded model.");
        hideLoaderOverlay();
      },
      (ev) => {
        const pct = ev.total ? Math.round((ev.loaded / ev.total) * 100) : null;
        if (pct !== null) setLoaderProgress(55 + Math.round(pct * 0.45));
        setText("status", pct ? `Loading… ${pct}%` : "Loading…");
      },
      (err) => {
        console.error(err);
        setText("status", "Failed to load model.");
        setText("title", "Failed to load model");
        setText("name", "Failed to load model");
        setText("desc", err?.message ?? "Unknown error");
      }
    );
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function tick() {
    resize();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
})();

(async () => {
  let allModels = [];
  try {
    const res = await fetch("models.json", { cache: "no-store" });
    allModels = await res.json();
  } catch (e) {
    return;
  }

  const currentId = new URL(location.href).searchParams.get("id");
  const currentModel = allModels.find((x) => x.id === currentId) ?? allModels[0];

  const dimEl = document.getElementById("dimensions");
  if (dimEl) dimEl.textContent = currentModel?.dimensions ?? "—";

  const canvas = document.getElementById("globe");
  if (!canvas) return;
  const hasAnyLocation = allModels.some((m) => m.location);
  if (!hasAnyLocation) {
    canvas.style.display = "none";
    return;
  }

  const THREE_G = await import("https://cdn.jsdelivr.net/npm/three@0.178/build/three.module.js");

  const SIZE = 200;
  canvas.width = SIZE;
  canvas.height = SIZE;

  const renderer = new THREE_G.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE_G.SRGBColorSpace;

  const scene = new THREE_G.Scene();
  const camera = new THREE_G.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 2.6);

  const textureLoader = new THREE_G.TextureLoader();
  textureLoader.setCrossOrigin("anonymous");

  const landTexture = textureLoader.load(
    "https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_specular_2048.jpg"
  );

  const globe = new THREE_G.Mesh(
    new THREE_G.SphereGeometry(1, 64, 64),
    new THREE_G.MeshBasicMaterial({ color: 0x525252 })
  );
  globe.renderOrder = 1;
  scene.add(globe);

  const land = new THREE_G.Mesh(
    new THREE_G.SphereGeometry(1.002, 64, 64),
    new THREE_G.MeshBasicMaterial({
      alphaMap: landTexture,
      color: 0x12141c,
      transparent: true,
      opacity: 1.0
    })
  );
  globe.renderOrder = 2;
  globe.add(land);

  function latLngToVec3(lat, lng, r = 1.05) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE_G.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  const pinMeshes = [];

  allModels.forEach((m) => {
    if (!m.location) return;
    const pos = latLngToVec3(m.location.lat, m.location.lng);
    const isCurrent = m.id === currentModel?.id;

    const pinColor = isCurrent ? 0x00cfcf : 0x005aff;
    const pinMat = new THREE_G.MeshBasicMaterial({ color: pinColor });

    const head = new THREE_G.Mesh(new THREE_G.SphereGeometry(0.035, 10, 10), pinMat);
    head.position.copy(pos.clone().normalize().multiplyScalar(1.06));
    globe.add(head);

    pinMeshes.push({ mesh: head, modelId: m.id, label: m.location.label, name: m.name });
  });

  if (currentModel?.location) {
    const { lat, lng } = currentModel.location;
    globe.rotation.y = -THREE_G.MathUtils.degToRad(lng + 180);
    globe.rotation.x = THREE_G.MathUtils.degToRad(lat * 0.5);
  }

  const locLabel = document.getElementById("globe-location");
  if (locLabel && currentModel?.location) locLabel.textContent = currentModel.location.label;

  const raycaster = new THREE_G.Raycaster();
  const mouse = new THREE_G.Vector2();

  let isDragging = false;
  let px = 0;
  let py = 0;
  let vx = 0.004;
  let vy = 0;

  canvas.addEventListener("pointerdown", (e) => {
    isDragging = true;
    px = e.clientX;
    py = e.clientY;
    vx = vy = 0;
  });

  window.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDragging) {
      const dx = e.clientX - px;
      const dy = e.clientY - py;
      px = e.clientX;
      py = e.clientY;
      vx = dx * 0.008;
      vy = dy * 0.008;
      globe.rotation.y += vx;
      globe.rotation.x = Math.max(-1.2, Math.min(1.2, globe.rotation.x + vy));
    }

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pinMeshes.map((p) => p.mesh));

    if (hits.length > 0) {
      const entry = pinMeshes.find((p) => p.mesh === hits[0].object);
      if (locLabel) locLabel.textContent = `${entry.name} — ${entry.label}`;
      canvas.style.cursor = "pointer";
    } else {
      if (locLabel) locLabel.textContent = currentModel?.location?.label ?? "";
      if (!isDragging) canvas.style.cursor = "grab";
    }
  });

  window.addEventListener("pointerup", () => {
    isDragging = false;
  });

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pinMeshes.map((p) => p.mesh));

    if (hits.length > 0) {
      const entry = pinMeshes.find((p) => p.mesh === hits[0].object);
      if (entry.modelId !== currentId) {
        window.location.href = `model.html?id=${encodeURIComponent(entry.modelId)}`;
      }
    }
  });

  function tick() {
    if (!isDragging) {
      globe.rotation.y += vx;
      vx *= 0.98;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
})();