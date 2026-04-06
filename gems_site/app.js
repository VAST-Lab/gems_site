const state = {
  models: [],
  query: "",
  activeTags: new Set()
};

async function loadModels() {
  const res = await fetch("models.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load models.json");
  return res.json();
}

function normalize(s) {
  return (s ?? "").toString().toLowerCase().trim();
}

function isSplatFile(url) {
  if (Array.isArray(url)) url = url[0];
  const u = (url ?? "").toString().toLowerCase();
  return (
    u.endsWith(".ply") ||
    u.endsWith(".spz") ||
    u.endsWith(".splat") ||
    u.endsWith(".ksplat") ||
    u.endsWith(".sog")
  );
}

function modelMatches(m) {
  const q = normalize(state.query);
  const hay = [
    m.name, m.description, m.author, m.software,
    ...(m.tags ?? [])
  ].map(normalize).join(" ");

  const passesQuery = !q || hay.includes(q);

  const tags = new Set((m.tags ?? []).map(normalize));
  const active = [...state.activeTags];
  const passesTags = active.length === 0 || active.every(t => tags.has(t));

  return passesQuery && passesTags;
}

function allTags(models) {
  const s = new Set();
  for (const m of models) for (const t of (m.tags ?? [])) s.add(t);
  return [...s].sort((a, b) => a.localeCompare(b));
}

function chip(label, on, onClick) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "chip";
  el.textContent = label;
  el.dataset.on = on ? "true" : "false";
  el.addEventListener("click", onClick);
  return el;
}

function renderChips() {
  const host = document.getElementById("tagChips");
  if (!host) return;

  host.innerHTML = "";

  const tags = allTags(state.models);
  if (tags.length === 0) {
    host.innerHTML = `<span class="muted">No tags yet</span>`;
    return;
  }

  //  clears filters
  host.appendChild(chip("All", state.activeTags.size === 0, () => {
    state.activeTags.clear();
    render();
  }));

  for (const t of tags) {
    const key = normalize(t);
    const on = state.activeTags.has(key);
    host.appendChild(chip(t, on, () => {
      if (state.activeTags.has(key)) state.activeTags.delete(key);
      else state.activeTags.add(key);
      render();
    }));
  }
}

function cardHTML(m) {
  const href = `model.html?id=${encodeURIComponent(m.id)}`;
  const tags = (m.tags ?? []).slice(0, 3).map(t => `<span class="badge">${t}</span>`).join("");

  // Thumbnails:
  // - If `thumb` is provided, show it.
  // - If no `thumb` and it's GLB/GLTF, render automatic 3D thumb (canvas).
  // - If it's a splat, show a placeholder (no auto-thumb).
  const firstSrc = Array.isArray(m.src) ? m.src[0] : m.src;
  
  const thumb = (m.thumb ?? "").trim();
  const splat = isSplatFile(firstSrc);
  const glbLike = !splat && (firstSrc ?? "").toLowerCase().match(/\.(glb|gltf)$/);
  
const color = m.badgeColor ? `style="background:${m.badgeColor}"` : "";
const badge = `<div class="card-badge"><span ${color}></span><span ${color}></span><span ${color}></span><span ${color}></span></div>`;

const thumbMarkup = thumb
  ? `<div class="thumb-wrapper">
       ${badge}
       <img class="thumb" src="${thumb}" alt="${m.name}" loading="lazy" />
     </div>`
  : (glbLike
      ? `<div class="thumb-wrapper" style="position:relative;">
           ${badge}
           <canvas class="thumb thumb3d" data-src="${firstSrc}" aria-label="${m.name} 3D thumbnail" style="width:100%;height:100%;display:block;"></canvas>
         </div>`
      : `<div class="thumb thumb-placeholder">${badge}<div class="ph">SPLAT</div></div>`
    );
  return `
    <a class="card" href="${href}">
      ${thumbMarkup}
      <div class="card-meta">
        <div class="card-title">${m.name}</div>
        <div class="card-sub">${m.description ?? ""}</div>
        <div class="card-tags">${tags}</div>
      </div>
    </a>
  `;
}

function renderGrid(filtered) {
  const grid = document.getElementById("grid");
  if (!grid) return;

  grid.innerHTML = filtered.map(cardHTML).join("") || `<div class="muted">No results.</div>`;
  initAutoThumbs(grid);
}

function renderCount(filtered) {
  const el = document.getElementById("count");
  if (!el) return;
  el.textContent = `${filtered.length} / ${state.models.length}`;
}

function render() {
  renderChips();
  const filtered = state.models.filter(modelMatches);
  renderCount(filtered);
  renderGrid(filtered);
}

/**
 * Automatic 3D thumbnails:
 */
async function initAutoThumbs(rootEl) {
  const canvases = [...rootEl.querySelectorAll("canvas.thumb3d")];
  if (canvases.length === 0) return;

  const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.178/build/three.module.js");
  const { GLTFLoader } = await import("https://cdn.jsdelivr.net/npm/three@0.178/examples/jsm/loaders/GLTFLoader.js");
  const { DRACOLoader } = await import("https://cdn.jsdelivr.net/npm/three@0.178/examples/jsm/loaders/DRACOLoader.js");
  const { MeshoptDecoder } = await import("https://cdn.jsdelivr.net/npm/three@0.178/examples/jsm/libs/meshopt_decoder.module.js");

  const fitCameraToObject = (camera, object, offset = 1.25) => {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera.fov * Math.PI) / 180;
    let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
    cameraZ *= offset;

    camera.position.set(center.x, center.y, center.z + cameraZ);
    camera.near = Math.max(0.01, maxDim / 100);
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();
    camera.lookAt(center);
  };

  const makeLoader = () => {
    const loader = new GLTFLoader();

    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
    loader.setDRACOLoader(draco);

    loader.setMeshoptDecoder(MeshoptDecoder);

    return loader;
  };

  const thumbEngines = new WeakMap();

  const renderThumb = async (canvas) => {
    if (thumbEngines.has(canvas)) return;

    const src = canvas.dataset.src;
    if (!src) return;

    // no auto thumb for splats
    if (isSplatFile(src)) return;

    const w = Math.max(360, Math.floor(canvas.clientWidth || 360));
    const h = Math.max(270, Math.floor(canvas.clientHeight || 270));
    canvas.width = w;
    canvas.height = h;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 2000);
    camera.position.set(0, 0.6, 2.2);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-4, 2, -2);
    scene.add(fill);

    const loader = makeLoader();

    let model = null;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let yaw = 0;
    let pitch = 0;
    let hovering = false;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const onPointerDown = (e) => {
      dragging = true;
      hovering = true;
      canvas.setPointerCapture?.(e.pointerId);
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = "grabbing";
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      yaw += dx * 0.01;
      pitch = clamp(pitch + dy * 0.008, -0.7, 0.7);

      if (model) {
        model.rotation.y = yaw;
        model.rotation.x = pitch;
      }
    };

    const stopDrag = () => {
      dragging = false;
      canvas.style.cursor = "grab";
    };

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", stopDrag);
    canvas.addEventListener("pointercancel", stopDrag);
    canvas.addEventListener("mouseenter", () => (hovering = true));
    canvas.addEventListener("mouseleave", () => {
      hovering = false;
      stopDrag();
    });

    try {
      const gltf = await loader.loadAsync(src);
      model = gltf.scene;
      scene.add(model);
      fitCameraToObject(camera, model, 1.22);

      yaw = 0.0;
      pitch = -0.1;
      model.rotation.set(pitch, yaw, 0);

      let raf = 0;
      const tick = () => {
        if (model && hovering && !dragging) model.rotation.y += 0.01;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };

      thumbEngines.set(canvas, {
        start: () => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(tick);
        },
        stop: () => cancelAnimationFrame(raf)
      });

      thumbEngines.get(canvas).start();
    } catch (e) {
      console.error("Thumbnail render failed:", src, e);
    }
  };


  canvases.slice(0, 12).forEach(c => renderThumb(c));

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        renderThumb(e.target);
        const engine = thumbEngines.get(e.target);
        engine?.start?.();
      } else {
        const engine = thumbEngines.get(e.target);
        engine?.stop?.();
      }
    }
  }, { rootMargin: "600px" });

  canvases.forEach(c => io.observe(c));
}

(async () => {
  state.models = await loadModels();

  const search = document.getElementById("search");
  if (search) {
    search.addEventListener("input", (e) => {
      state.query = e.target.value;
      render();
    });
  }

  render();
})();