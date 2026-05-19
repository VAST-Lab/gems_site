const SPLAT_CACHE_VERSION = "1.0.2";
const SPLAT_CACHE_PREFIX  = "gem-splat-cache-";
const SPLAT_CACHE_NAME    = `${SPLAT_CACHE_PREFIX}${SPLAT_CACHE_VERSION}`;

async function clearOldSplatCaches() {
  const names    = await caches.keys();
  const oldNames = names.filter(
    (name) => name.startsWith(SPLAT_CACHE_PREFIX) && name !== SPLAT_CACHE_NAME
  );
  await Promise.all(oldNames.map((name) => caches.delete(name)));
}

function getDeviceCapabilities() {
  const canvas    = document.createElement("canvas");
  const gl        = canvas.getContext("webgl");
  const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
  const renderer  = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()
    : "";

  const isMobile  = /iphone|ipad|android/i.test(navigator.userAgent);
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
  const cache = await caches.open(SPLAT_CACHE_NAME);

  const cachedResponse = await cache.match(url);
  if (cachedResponse) {
    const blob = await cachedResponse.blob();
    return URL.createObjectURL(blob);
  }

  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`HuggingFace Error: ${response.status}`);

  const contentLength = response.headers.get("content-length");
  const total  = parseInt(contentLength, 10);
  let   loaded = 0;

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
    b.className   = "chip";
    b.dataset.on  = "false";
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
    const badge = document.createElement("button");
    badge.type      = "button";
    badge.className = "compound-badge";

    if (item.color) badge.style.setProperty("--compound-bg",   item.color);
    if (item.glow)  badge.style.setProperty("--compound-glow", item.glow);

    badge.title = item.name ? `${item.name} (${item.symbol ?? ""})` : item.symbol ?? "";
    badge.setAttribute(
      "aria-label",
      `Open periodic table for ${item.name ?? item.symbol ?? "element"}`
    );
    badge.addEventListener("click", () => openPeriodicTable(item.symbol));

    const num = document.createElement("div");
    num.className  = "compound-number";
    num.textContent = item.number ?? "";

    const sym = document.createElement("div");
    sym.className  = "compound-symbol";
    sym.textContent = item.symbol ?? "";

    badge.appendChild(num);
    badge.appendChild(sym);
    host.appendChild(badge);
  }
}

const loaderBar     = document.getElementById("loader-progress-bar");
const loaderLabel   = document.getElementById("loader-progress-label");
const loaderOverlay = document.getElementById("loader-overlay");

function setLoaderProgress(value) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  if (loaderBar)   loaderBar.style.width   = `${pct}%`;
  if (loaderLabel) loaderLabel.textContent = `${pct}%`;
}

function hideLoaderOverlay(delay = 180) {
  setLoaderProgress(100);
  if (!loaderOverlay) return;
  window.setTimeout(() => {
    loaderOverlay.style.display = "none";
  }, delay);
}

function isSplatFile(url) {
  if (Array.isArray(url)) url = url[0];
  const u = (url ?? "").toLowerCase();
  return (
    u.endsWith(".ply")    ||
    u.endsWith(".spz")    ||
    u.endsWith(".splat")  ||
    u.endsWith(".ksplat") ||
    u.endsWith(".sog")
  );
}

// ─── MAIN VIEWER  (PlayCanvas) ─────────────────────────────────────────────
(async () => {
  const canvas = document.getElementById("c");
  if (!canvas) throw new Error("Canvas #c not found");

  await clearOldSplatCaches();

  const capabilities = getDeviceCapabilities();

  // ── load models.json ──────────────────────────────────────────────────────
  let models;
  try {
    models = await loadModels();
  } catch (err) {
    console.error(err);
    setText("title", "Failed to load models.json");
    setText("name",  "Failed to load models.json");
    setText("desc",  err?.message ?? "Unknown error");
    return;
  }

  const id = getId();
  const m  = (models ?? []).find((x) => x.id === id) ?? (models ?? [])[0];

  if (!m) {
    setText("title", "No models found");
    setText("name",  "No models found");
    return;
  }

  const sources = Array.isArray(m.src) ? m.src : [m.src];
  let finalSrc;

  setLoaderProgress(5);

  // .ply → download button only, never rendered
  const plySrc      = sources.find((s) => s.toLowerCase().endsWith(".ply"));
  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn && plySrc) {
    downloadBtn.href = plySrc;
    downloadBtn.setAttribute("download", plySrc.split("/").pop() || "model");
  }

  // Render source priority: .sog > .spz > anything else (excluding .ply)
  const renderSources = sources.filter((s) => !s.toLowerCase().endsWith(".ply"));
  const sogSrc        = renderSources.find((s) => s.toLowerCase().endsWith(".sog"));
  const spzSrc        = renderSources.find((s) => s.toLowerCase().endsWith(".spz"));
  const preferredSrc  = sogSrc ?? spzSrc ?? renderSources[0];
  const checkList     = preferredSrc
    ? [preferredSrc, ...renderSources.filter((s) => s !== preferredSrc)]
    : renderSources;

  setLoaderProgress(12);
  setText("status", "Locating best source...");
  const cacheStore = await caches.open(SPLAT_CACHE_NAME);

  for (const url of checkList) {
    const isCached = await cacheStore.match(url);
    if (isCached) { finalSrc = url; break; }

    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) { finalSrc = url; break; }
    } catch (e) {
      console.warn(`Source not available, trying next: ${url}`);
    }
  }

  setLoaderProgress(25);
  document.title = m.name ?? "Viewer";
  setText("title",    m.name);
  setText("name",     m.name);
  if ((m.description ?? "").trim()) setText("desc", m.description);
  setText("author",   m.author);
  setText("date",     m.date);
  setText("software", m.software);
  setText("polycount",(m.polycount ?? "").toString());
  addTagChips(m.tags);
  renderCompoundBadges(m.compounds);

  setLoaderProgress(35);

  // ── Boot PlayCanvas ───────────────────────────────────────────────────────
  // PlayCanvas Engine v2 is a pure-ESM package on the CDN.
  const pc = await import(
    "https://cdn.jsdelivr.net/npm/playcanvas@2/build/playcanvas.mjs"
  );
 // const pc = await import("https://cdn.jsdelivr.net/npm/playcanvas@2/build/playcanvas.mjs");
  window.pc = pc;

  const pixelRatio = capabilities.isLowEnd
    ? Math.min(window.devicePixelRatio, 1)
    : Math.min(window.devicePixelRatio, 2);

  // Size canvas to its CSS box before creating the app so the initial
  // viewport is correct.
  function syncCanvasSize() {
    const rect = canvas.getBoundingClientRect();
    console.log("Canvas Size Detected:", rect.width, rect.height);
    const w    = Math.max(1, Math.floor(rect.width));
    const h    = Math.max(1, Math.floor(rect.height));
    canvas.width  = w * pixelRatio;
    canvas.height = h * pixelRatio;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
  }
  syncCanvasSize();

  const app = new pc.Application(canvas, {
    graphicsDeviceOptions: {
      antialias: !capabilities.isLowEnd,
      alpha:     true,
      powerPreference: "high-performance"
    },
    mouse:   new pc.Mouse(canvas),
    touch:   new pc.TouchDevice(canvas),
    keyboard: new pc.Keyboard(window)
  });

  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_FIXED);
  app.graphicsDevice.maxPixelRatio = pixelRatio;
  
  // Wait one frame for CSS layout to settle, THEN start
  requestAnimationFrame(() => {
    syncCanvasSize();                        // re-read real dimensions
    app.resizeCanvas(canvas.width, canvas.height);
    app.start();
  });

  window.addEventListener('resize', () => {
    syncCanvasSize();
    app.resizeCanvas(canvas.width, canvas.height);
  });



  // ── Scene background colour ───────────────────────────────────────────────
  app.scene.ambientLight = new pc.Color(0.05, 0.06, 0.08);

  // ── Camera entity ─────────────────────────────────────────────────────────
  const cameraEntity = new pc.Entity("camera");
  cameraEntity.addComponent("camera", {
    clearColor: new pc.Color(0.043, 0.059, 0.078, 1),  // 0x0b0f14
    nearClip:   0.001,
    farClip:    1000//,
    //fov:        50
  });
  //cameraEntity.setPosition(0, 0.6, 2.2);
  cameraEntity.addComponent("script");

  app.root.addChild(cameraEntity);
  
  cameraEntity.script.create("orbitCamera", {
	attributes: {
	  inertiaFactor: 0.1,
	  distanceMin: 0.1,
	  distanceMax: 100
	}
  });
  cameraEntity.script.create("orbitCameraInputMouse");
  cameraEntity.script.create("orbitCameraInputTouch");

  // ── Lighting ──────────────────────────────────────────────────────────────
  // Hemisphere-style ambient is set above.  Add a key + fill directional.
  const keyLight = new pc.Entity("keyLight");
  keyLight.addComponent("light", {
    type:      pc.LIGHTTYPE_DIRECTIONAL,
    color:     new pc.Color(1, 1, 1),
    intensity: 1.1
  });
  keyLight.setEulerAngles(45, 30, 0);
  app.root.addChild(keyLight);

  const fillLight = new pc.Entity("fillLight");
  fillLight.addComponent("light", {
    type:      pc.LIGHTTYPE_DIRECTIONAL,
    color:     new pc.Color(1, 1, 1),
    intensity: 0.35
  });
  fillLight.setEulerAngles(20, -130, 0);
  app.root.addChild(fillLight);

  // ── Helpers ───────────────────────────────────────────────────────────────
  /**
   * Frame the camera to fit a bounding box in view.
   * @param {pc.BoundingBox} aabb
   * @param {number} offsetMul  extra pull-back multiplier
   */
  function frameBoundingBox(aabb, offsetMul = 1.35) {
    if (!aabb) return;

    const size    = aabb.halfExtents.length() * 2;          // longest diagonal
    const maxDim  = Math.max(
      aabb.halfExtents.x, aabb.halfExtents.y, aabb.halfExtents.z
    ) * 2;
    const fovRad  = (cameraEntity.camera.fov * Math.PI) / 180;
    let   dist    = Math.abs((maxDim / 2) / Math.tan(fovRad / 2)) * offsetMul;

    const center  = aabb.center;
    cameraEntity.setPosition(
      center.x,
      center.y + maxDim * 0.1,
      center.z + dist
    );

    cameraEntity.camera.nearClip = Math.max(0.01, maxDim / 200);
    cameraEntity.camera.farClip  = Math.max(50,   maxDim * 50);

    // Update orbit pivot
    orbit.target.copy(center);
  }

  /**
   * Apply rotation from models.json (degrees) to a pc.Entity.
   * Falls back to -90° X rotation for raw splat files when no metadata
   * rotation is specified (mirrors the original Three.js defaultSplatFix).
   */
  function applyModelRotation(entity, modelMeta, { defaultSplatFix = true } = {}) {
    const r = modelMeta?.rotation;
    if (r && typeof r === "object") {
      entity.setEulerAngles(r.x ?? 0, r.y ?? 0, r.z ?? 0);
      return;
    }
    if (defaultSplatFix) {
	  entity.setEulerAngles(-90, 0, 0);
    }
  }

  // ── Orbit-camera controller ─────────────────────
  const orbit = {
    target:      new pc.Vec3(0, 0, 0),
    spherical:   { r: 2.2, theta: 0, phi: Math.PI / 2 },
    autoRotate:  true,
    autoSpeed:   0.005,          // radians per frame  (~1 rpm)
    resumeTimer: null,

    stopAuto() {
      this.autoRotate = false;
      if (this.resumeTimer) clearTimeout(this.resumeTimer);
    },
    scheduleResume() {
      if (this.resumeTimer) clearTimeout(this.resumeTimer);
      this.resumeTimer = setTimeout(() => { this.autoRotate = true; }, 900);
    },

    /** Call once after camera/target are repositioned to sync spherical coords. */
    syncFromCamera() {
      const cam = cameraEntity.getPosition();
      const d   = new pc.Vec3().sub2(cam, this.target);
      this.spherical.r     = d.length();
      this.spherical.phi   = Math.acos(Math.max(-1, Math.min(1, d.y / this.spherical.r)));
      this.spherical.theta = Math.atan2(d.x, d.z);
    },

    tick(dt) {
      if (this.autoRotate) {
        this.spherical.theta += this.autoSpeed;
      }
      const { r, theta, phi } = this.spherical;
      const sinPhi = Math.sin(phi);
      cameraEntity.setPosition(
        this.target.x + r * sinPhi * Math.sin(theta),
        this.target.y + r * Math.cos(phi),
        this.target.z + r * sinPhi * Math.cos(theta)
      );
      cameraEntity.lookAt(this.target);
    }
  };

  // Pointer / touch interaction
  let   pointerDown = false;
  let   lastX       = 0;
  let   lastY       = 0;

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button === 2) return;   // right-button handled below
    pointerDown = true;
    lastX = e.clientX;
    lastY = e.clientY;
    orbit.stopAuto();
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // Right-drag → pan
  let  rightDown = false;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 2) return;
    rightDown = true;
    lastX = e.clientX;
    lastY = e.clientY;
    orbit.stopAuto();
  });

  window.addEventListener("pointermove", (e) => {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX    = e.clientX;
    lastY    = e.clientY;

    if (pointerDown && !rightDown) {
      // Orbit (left-drag)
      orbit.spherical.theta -= dx * 0.005;
      orbit.spherical.phi    = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, orbit.spherical.phi - dy * 0.005)
      );
    } else if (rightDown) {
      // Pan
      const panSpeed = orbit.spherical.r * 0.001;
      const right    = new pc.Vec3();
      const up       = new pc.Vec3();
      cameraEntity.getLocalTransform().getX(right);
      cameraEntity.getLocalTransform().getY(up);
      orbit.target.add(right.mulScalar(-dx * panSpeed));
      orbit.target.add(up.mulScalar(dy * panSpeed));
    }
  });

  window.addEventListener("pointerup", (e) => {
    if (e.button === 2) { rightDown = false; }
    else                { pointerDown = false; }
    orbit.scheduleResume();
  });

  canvas.addEventListener("wheel", (e) => {
    orbit.stopAuto();
    orbit.spherical.r = Math.max(0.1, orbit.spherical.r + e.deltaY * 0.002 * orbit.spherical.r);
    orbit.scheduleResume();
  }, { passive: true });

  // ── Resize handler ────────────────────────────────────────────────────────
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w    = Math.max(1, Math.floor(rect.width));
    const h    = Math.max(1, Math.floor(rect.height));
    const pw   = Math.round(w * pixelRatio);
    const ph   = Math.round(h * pixelRatio);
    if (canvas.width !== pw || canvas.height !== ph) {
      app.resizeCanvas(pw, ph);
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
      cameraEntity.camera.aspectRatio = w / h;
    }
  }

  // Hook into PlayCanvas update loop
  app.on("update", (dt) => {
    resize();
    orbit.tick(dt);
  });

  setLoaderProgress(45);

  // ── Load the model ─────────────────────────────────────────────────────────
  if (isSplatFile(finalSrc)) {
    // ── Gaussian Splat via PlayCanvas GSplat ─────────────────────────────
    setLoaderProgress(50);
    setText("status", "Downloading Splat... 0%");

    try {
      const localBlobUrl = await getPersistentSplat(finalSrc, (pct) => {
        setText("status", `Downloading... ${pct}%`);
        setLoaderProgress(50 + Math.round(pct * 0.35));
      });

      setLoaderProgress(88);
      setText("status", "Processing Splat data...");

      // Determine format from original URL (blob URL loses the extension)
      const ext = (finalSrc ?? "").split("?")[0].toLowerCase().split(".").pop();

      // Register the blob as a PlayCanvas asset
      const splatAsset = new pc.Asset(
        "gem-splat",
        "gsplat",
        { url: localBlobUrl, filename: `model.${ext}` }
      );

      app.assets.add(splatAsset);

      splatAsset.on("load", () => {
		const splatEntity = new pc.Entity("splat");

		splatEntity.addComponent("gsplat", {
			asset: splatAsset
		});

		app.root.addChild(splatEntity);

		applyModelRotation(splatEntity, m, { defaultSplatFix: false });
		if (m.offset) {
			splatEntity.translate(m.offset.x ?? 0, m.offset.y ?? 0, m.offset.z ?? 0);
		}

		let frameChecks = 0;
		const tryFrame = () => {
			// Access the instance via the component
			const instance = splatEntity.gsplat.instance;
			const aabb = instance?.meshInstance?.aabb;

			if (aabb && aabb.halfExtents.length() > 0.001) {
				console.log("Splat detected! Centering and Framing...");

				const worldPos = splatEntity.getPosition();
				const center = aabb.center;
				    splatEntity.setPosition(
					worldPos.x - center.x,
					worldPos.y - center.y,
					worldPos.z - center.z
				);

				const centeredAABB = new pc.BoundingBox(new pc.Vec3(0, 0, 0), aabb.halfExtents.clone());
				frameBoundingBox(centeredAABB, 1.35);
				orbit.target.set(0, 0, 0);   // explicitly reset orbit target to origin
				orbit.syncFromCamera();

				setText("status", "Loaded and Centered.");
				hideLoaderOverlay();
			} else {
				if (frameChecks++ < 50) {
					setTimeout(tryFrame, 100);
				} else {
					console.warn("Framing failed, using fallback camera.");
					cameraEntity.setPosition(0, 0.5, 3);
					orbit.target.set(0, 0, 0);
					orbit.syncFromCamera();
					hideLoaderOverlay();
				}
			}
		};

		tryFrame();
	});

      splatAsset.on("error", (err) => {
        console.error(err);
        URL.revokeObjectURL(localBlobUrl);
        setText("status", "Failed to load splat.");
        setText("title",  "Failed to load splat");
        setText("name",   "Failed to load splat");
        setText("desc",   String(err));
		//console.error("PlayCanvas Load Error Details:", err);
      });

      app.assets.load(splatAsset);

    } catch (err) {
      console.error(err);
      setText("status", "Failed to load splat.");
      setText("title",  "Failed to load splat");
      setText("name",   "Failed to load splat");
      setText("desc",   err?.message ?? "Unknown error");
      return;
    }

  } else {
    // ── GLTF / GLB via PlayCanvas ─────────────────────────────────────────
    setLoaderProgress(55);
    setText("status", "Loading…");

    const gltfAsset = new pc.Asset(
      "gem-model",
      "container",
      { url: finalSrc }
    );

    app.assets.add(gltfAsset);

    gltfAsset.on("load", () => {
      const modelEntity = new pc.Entity("model");
      applyModelRotation(modelEntity, m);

      modelEntity.addComponent("render", {
        type:  "asset",
        asset: gltfAsset.resource?.model ?? gltfAsset
      });

      app.root.addChild(modelEntity);

      // Compute AABB from all render mesh instances
      let aabb = null;
      const renders = modelEntity.findComponents("render");
      for (const r of renders) {
        for (const mi of (r.meshInstances ?? [])) {
          if (!aabb) {
            aabb = mi.aabb.clone();
          } else {
            aabb.add(mi.aabb);
          }
        }
      }

      if (aabb) {
        frameBoundingBox(aabb, 1.25);
        orbit.syncFromCamera();
      }

      setLoaderProgress(100);
      setText("status", "Loaded model.");
      hideLoaderOverlay();
    });

    gltfAsset.on("progress", (loaded, total) => {
      if (total) {
        const pct = Math.round((loaded / total) * 100);
        setLoaderProgress(55 + Math.round(pct * 0.45));
        setText("status", `Loading… ${pct}%`);
      }
    });

    gltfAsset.on("error", (err) => {
      console.error(err);
      setText("status", "Failed to load model.");
      setText("title",  "Failed to load model");
      setText("name",   "Failed to load model");
      setText("desc",   err?.message ?? "Unknown error");
    });

    app.assets.load(gltfAsset);
  }
})();


// ─── GLOBE ─────────────────────────────
(async () => {
  let allModels = [];
  try {
    const res = await fetch("models.json", { cache: "no-store" });
    allModels = await res.json();
  } catch (e) {
    return;
  }

  const currentId    = new URL(location.href).searchParams.get("id");
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
  canvas.width  = SIZE;
  canvas.height = SIZE;

  const renderer = new THREE_G.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE_G.SRGBColorSpace;

  const scene  = new THREE_G.Scene();
 const camera = new THREE_G.PerspectiveCamera(45, 1, 0.1, 100);
const DEFAULT_GLOBE_ZOOM = 2.6;
let globeZoom = 2.6;
const MIN_GLOBE_ZOOM = 1.6;
const MAX_GLOBE_ZOOM = DEFAULT_GLOBE_ZOOM;
camera.position.set(0, 0, globeZoom);

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();

  globeZoom += e.deltaY * 0.003;
  globeZoom = Math.max(MIN_GLOBE_ZOOM, Math.min(MAX_GLOBE_ZOOM, globeZoom));

  camera.position.z = globeZoom;
}, { passive: false });

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
      alphaMap:    landTexture,
      color:       0x12141c,
      transparent: true,
      opacity:     1.0
    })
  );
  globe.renderOrder = 2;
  globe.add(land);

  function latLngToVec3(lat, lng, r = 1.05) {
    const phi   = (90 - lat) * (Math.PI / 180);
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
    const pos      = latLngToVec3(m.location.lat, m.location.lng);
    const isCurrent = m.id === currentModel?.id;

    const pinColor = isCurrent ? 0x00cfcf : 0x005aff;
    const pinMat   = new THREE_G.MeshBasicMaterial({ color: pinColor });

    const head = new THREE_G.Mesh(new THREE_G.SphereGeometry(0.035, 10, 10), pinMat);
    head.position.copy(pos.clone().normalize().multiplyScalar(1.06));
    globe.add(head);

    pinMeshes.push({ mesh: head, modelId: m.id, label: m.location.label, name: m.name });
  });

  if (currentModel?.location) {
    const { lat, lng } = currentModel.location;
    globe.rotation.y = -THREE_G.MathUtils.degToRad(lng + 180);
    globe.rotation.x =  THREE_G.MathUtils.degToRad(lat * 0.5);
  }

  const locLabel = document.getElementById("globe-location");
  if (locLabel && currentModel?.location) locLabel.textContent = currentModel.location.label;

  const raycaster = new THREE_G.Raycaster();
  const mouse     = new THREE_G.Vector2();

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
    mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

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
    mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

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

    // Scale pins inversely with zoom so they stay visually consistent
    const pinScale = globeZoom / DEFAULT_GLOBE_ZOOM;
    for (const { mesh } of pinMeshes) {
      mesh.scale.setScalar(pinScale);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
})();


// ─── PERIODIC TABLE  ──────────────────────────────────────────
const PERIODIC_TABLE = [
  { number: 1,  symbol: "H",  category: "nonmetal",   row: 1, col: 1  },
  { number: 2,  symbol: "He", category: "noble",      row: 1, col: 18 },
  { number: 3,  symbol: "Li", category: "alkali",     row: 2, col: 1  },
  { number: 4,  symbol: "Be", category: "alkaline",   row: 2, col: 2  },
  { number: 5,  symbol: "B",  category: "metalloid",  row: 2, col: 13 },
  { number: 6,  symbol: "C",  category: "nonmetal",   row: 2, col: 14 },
  { number: 7,  symbol: "N",  category: "nonmetal",   row: 2, col: 15 },
  { number: 8,  symbol: "O",  category: "nonmetal",   row: 2, col: 16 },
  { number: 9,  symbol: "F",  category: "nonmetal",   row: 2, col: 17 },
  { number: 10, symbol: "Ne", category: "noble",      row: 2, col: 18 },
  { number: 11, symbol: "Na", category: "alkali",     row: 3, col: 1  },
  { number: 12, symbol: "Mg", category: "alkaline",   row: 3, col: 2  },
  { number: 13, symbol: "Al", category: "post",       row: 3, col: 13 },
  { number: 14, symbol: "Si", category: "metalloid",  row: 3, col: 14 },
  { number: 15, symbol: "P",  category: "nonmetal",   row: 3, col: 15 },
  { number: 16, symbol: "S",  category: "nonmetal",   row: 3, col: 16 },
  { number: 17, symbol: "Cl", category: "nonmetal",   row: 3, col: 17 },
  { number: 18, symbol: "Ar", category: "noble",      row: 3, col: 18 },
  { number: 19, symbol: "K",  category: "alkali",     row: 4, col: 1  },
  { number: 20, symbol: "Ca", category: "alkaline",   row: 4, col: 2  },
  { number: 21, symbol: "Sc", category: "transition", row: 4, col: 3  },
  { number: 22, symbol: "Ti", category: "transition", row: 4, col: 4  },
  { number: 23, symbol: "V",  category: "transition", row: 4, col: 5  },
  { number: 24, symbol: "Cr", category: "transition", row: 4, col: 6  },
  { number: 25, symbol: "Mn", category: "transition", row: 4, col: 7  },
  { number: 26, symbol: "Fe", category: "transition", row: 4, col: 8  },
  { number: 27, symbol: "Co", category: "transition", row: 4, col: 9  },
  { number: 28, symbol: "Ni", category: "transition", row: 4, col: 10 },
  { number: 29, symbol: "Cu", category: "transition", row: 4, col: 11 },
  { number: 30, symbol: "Zn", category: "transition", row: 4, col: 12 },
  { number: 31, symbol: "Ga", category: "post",       row: 4, col: 13 },
  { number: 32, symbol: "Ge", category: "metalloid",  row: 4, col: 14 },
  { number: 33, symbol: "As", category: "metalloid",  row: 4, col: 15 },
  { number: 34, symbol: "Se", category: "nonmetal",   row: 4, col: 16 },
  { number: 35, symbol: "Br", category: "nonmetal",   row: 4, col: 17 },
  { number: 36, symbol: "Kr", category: "noble",      row: 4, col: 18 },
  { number: 37, symbol: "Rb", category: "alkali",     row: 5, col: 1  },
  { number: 38, symbol: "Sr", category: "alkaline",   row: 5, col: 2  },
  { number: 39, symbol: "Y",  category: "transition", row: 5, col: 3  },
  { number: 40, symbol: "Zr", category: "transition", row: 5, col: 4  },
  { number: 41, symbol: "Nb", category: "transition", row: 5, col: 5  },
  { number: 42, symbol: "Mo", category: "transition", row: 5, col: 6  },
  { number: 43, symbol: "Tc", category: "transition", row: 5, col: 7  },
  { number: 44, symbol: "Ru", category: "transition", row: 5, col: 8  },
  { number: 45, symbol: "Rh", category: "transition", row: 5, col: 9  },
  { number: 46, symbol: "Pd", category: "transition", row: 5, col: 10 },
  { number: 47, symbol: "Ag", category: "transition", row: 5, col: 11 },
  { number: 48, symbol: "Cd", category: "transition", row: 5, col: 12 },
  { number: 49, symbol: "In", category: "post",       row: 5, col: 13 },
  { number: 50, symbol: "Sn", category: "post",       row: 5, col: 14 },
  { number: 51, symbol: "Sb", category: "metalloid",  row: 5, col: 15 },
  { number: 52, symbol: "Te", category: "metalloid",  row: 5, col: 16 },
  { number: 53, symbol: "I",  category: "nonmetal",   row: 5, col: 17 },
  { number: 54, symbol: "Xe", category: "noble",      row: 5, col: 18 },
  { number: 55, symbol: "Cs", category: "alkali",     row: 6, col: 1  },
  { number: 56, symbol: "Ba", category: "alkaline",   row: 6, col: 2  },
  { number: 57, symbol: "La", category: "lanthanide", row: 8, col: 3  },
  { number: 58, symbol: "Ce", category: "lanthanide", row: 8, col: 4  },
  { number: 59, symbol: "Pr", category: "lanthanide", row: 8, col: 5  },
  { number: 60, symbol: "Nd", category: "lanthanide", row: 8, col: 6  },
  { number: 61, symbol: "Pm", category: "lanthanide", row: 8, col: 7  },
  { number: 62, symbol: "Sm", category: "lanthanide", row: 8, col: 8  },
  { number: 63, symbol: "Eu", category: "lanthanide", row: 8, col: 9  },
  { number: 64, symbol: "Gd", category: "lanthanide", row: 8, col: 10 },
  { number: 65, symbol: "Tb", category: "lanthanide", row: 8, col: 11 },
  { number: 66, symbol: "Dy", category: "lanthanide", row: 8, col: 12 },
  { number: 67, symbol: "Ho", category: "lanthanide", row: 8, col: 13 },
  { number: 68, symbol: "Er", category: "lanthanide", row: 8, col: 14 },
  { number: 69, symbol: "Tm", category: "lanthanide", row: 8, col: 15 },
  { number: 70, symbol: "Yb", category: "lanthanide", row: 8, col: 16 },
  { number: 71, symbol: "Lu", category: "lanthanide", row: 8, col: 17 },
  { number: 72, symbol: "Hf", category: "transition", row: 6, col: 4  },
  { number: 73, symbol: "Ta", category: "transition", row: 6, col: 5  },
  { number: 74, symbol: "W",  category: "transition", row: 6, col: 6  },
  { number: 75, symbol: "Re", category: "transition", row: 6, col: 7  },
  { number: 76, symbol: "Os", category: "transition", row: 6, col: 8  },
  { number: 77, symbol: "Ir", category: "transition", row: 6, col: 9  },
  { number: 78, symbol: "Pt", category: "transition", row: 6, col: 10 },
  { number: 79, symbol: "Au", category: "transition", row: 6, col: 11 },
  { number: 80, symbol: "Hg", category: "transition", row: 6, col: 12 },
  { number: 81, symbol: "Tl", category: "post",       row: 6, col: 13 },
  { number: 82, symbol: "Pb", category: "post",       row: 6, col: 14 },
  { number: 83, symbol: "Bi", category: "post",       row: 6, col: 15 },
  { number: 84, symbol: "Po", category: "post",       row: 6, col: 16 },
  { number: 85, symbol: "At", category: "nonmetal",   row: 6, col: 17 },
  { number: 86, symbol: "Rn", category: "noble",      row: 6, col: 18 },
  { number: 87, symbol: "Fr", category: "alkali",     row: 7, col: 1  },
  { number: 88, symbol: "Ra", category: "alkaline",   row: 7, col: 2  },
  { number: 89, symbol: "Ac", category: "actinide",   row: 9, col: 3  },
  { number: 90, symbol: "Th", category: "actinide",   row: 9, col: 4  },
  { number: 91, symbol: "Pa", category: "actinide",   row: 9, col: 5  },
  { number: 92, symbol: "U",  category: "actinide",   row: 9, col: 6  }
];

const CATEGORY_COLORS = {
  alkali:     "#8f3b3b",
  alkaline:   "#8a6335",
  transition: "#8d7740",
  post:       "#4d7f65",
  metalloid:  "#336b77",
  nonmetal:   "#45698f",
  noble:      "#5d4a8c",
  lanthanide: "#6d5a86",
  actinide:   "#754d5f"
};

function openPeriodicTable(activeSymbol) {
  const overlay = document.getElementById("ptableOverlay");
  const grid    = document.getElementById("ptableGrid");
  if (!overlay || !grid) return;

  grid.innerHTML = "";

  for (let row = 1; row <= 9; row++) {
    for (let col = 1; col <= 18; col++) {
      const cell = PERIODIC_TABLE.find((el) => el.row === row && el.col === col);
      const div  = document.createElement("div");

      if (!cell) {
        div.className = "ptable-cell empty";
        grid.appendChild(div);
        continue;
      }

      div.className = "ptable-cell";
      if (cell.symbol === activeSymbol) {
		div.classList.add("active");
	  }
	  else if (activeSymbol) {
	    div.classList.add("dimmed");
	  }
      div.style.background = CATEGORY_COLORS[cell.category] ?? "#3f4d63";
      div.innerHTML = `
        <div class="ptable-num">${cell.number}</div>
        <div class="ptable-sym">${cell.symbol}</div>
      `;
      grid.appendChild(div);
    }
  }

  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closePeriodicTable() {
  const overlay = document.getElementById("ptableOverlay");
  if (!overlay) return;
  overlay.hidden = true;
  document.body.style.overflow = "";
}

document.getElementById("ptableClose")?.addEventListener("click", closePeriodicTable);
document.getElementById("ptableOverlay")?.addEventListener("click", (e) => {
  if (e.target.id === "ptableOverlay") closePeriodicTable();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePeriodicTable();
});