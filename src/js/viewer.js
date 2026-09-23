const SPLAT_CACHE_VERSION = "1.0.2";
const SPLAT_CACHE_PREFIX = "gem-splat-cache-";
const SPLAT_CACHE_NAME = `${SPLAT_CACHE_PREFIX}${SPLAT_CACHE_VERSION}`;

function setText(id, value) {
	const el = document.getElementById(id);
	if (el) el.textContent = value ?? "";
}

function setLoaderProgress(value) {
	const loaderBar = document.getElementById("loader-progress-bar");
	const loaderLabel = document.getElementById("loader-progress-label");
	const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
	if (loaderBar) loaderBar.style.width = `${pct}%`;
	if (loaderLabel) loaderLabel.textContent = `${pct}%`;
}

function hideLoaderOverlay(delay = 180) {
	setLoaderProgress(100);
	window.setTimeout(() => {
		const loaderOverlay = document.getElementById("loader-overlay");
		if (loaderOverlay) loaderOverlay.style.display = "none";
	}, delay);
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

async function clearOldSplatCaches() {
	const names = await caches.keys();
	const oldNames = names.filter(
		(name) => name.startsWith(SPLAT_CACHE_PREFIX) && name !== SPLAT_CACHE_NAME
	);
	await Promise.all(oldNames.map((name) => caches.delete(name)));
}

function getDeviceCapabilities() {
	const canvas = document.createElement("canvas");
	const gl = canvas.getContext("webgl");
	const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
	const renderer = debugInfo
		? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()
		: "";
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
	const cache = await caches.open(SPLAT_CACHE_NAME);
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

export async function initViewer(m, canvas) {
	await clearOldSplatCaches();
	const capabilities = getDeviceCapabilities();
	const sources = Array.isArray(m.src) ? m.src : [m.src];
	let finalSrc;
	setLoaderProgress(5);
	const renderSources = sources.filter((s) => !s.toLowerCase().endsWith(".ply"));
	const sogSrc = renderSources.find((s) => s.toLowerCase().endsWith(".sog"));
	const spzSrc = renderSources.find((s) => s.toLowerCase().endsWith(".spz"));
	const preferredSrc = sogSrc ?? spzSrc ?? renderSources[0];
	const checkList = preferredSrc
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
	setLoaderProgress(35);
	const pc = await import("https://cdn.jsdelivr.net/npm/playcanvas@2/build/playcanvas.mjs");
	window.pc = pc;
	const pixelRatio = capabilities.isLowEnd
		? Math.min(window.devicePixelRatio, 1)
		: Math.min(window.devicePixelRatio, 2);
	function syncCanvasSize() {
		canvas.style.width = "";
		canvas.style.height = "";
		const rect = canvas.getBoundingClientRect();
		const w = Math.max(1, Math.floor(rect.width));
		const h = Math.max(1, Math.floor(rect.height));
		canvas.width = w * pixelRatio;
		canvas.height = h * pixelRatio;
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;
	}
	syncCanvasSize();
	const app = new pc.Application(canvas, {
		graphicsDeviceOptions: {
			antialias: !capabilities.isLowEnd,
			alpha: true,
			powerPreference: "high-performance"
		},
		mouse: new pc.Mouse(canvas),
		touch: new pc.TouchDevice(canvas),
		keyboard: new pc.Keyboard(window)
	});
	app.setCanvasFillMode(pc.FILLMODE_NONE);
	app.setCanvasResolution(pc.RESOLUTION_FIXED);
	app.graphicsDevice.maxPixelRatio = pixelRatio;
	requestAnimationFrame(() => {
		syncCanvasSize();
		app.resizeCanvas(canvas.width, canvas.height);
		app.start();
	});
	window.addEventListener('resize', () => resize());
	app.scene.ambientLight = new pc.Color(0.05, 0.06, 0.08);
	const cameraEntity = new pc.Entity("camera");
	cameraEntity.addComponent("camera", {
		clearColor: new pc.Color(0.043, 0.059, 0.078, 1),
		nearClip: 0.001,
		farClip: 1000
	});
	cameraEntity.addComponent("script");
	app.root.addChild(cameraEntity);
	cameraEntity.script.create("orbitCamera", {
		attributes: { inertiaFactor: 0.1, distanceMin: 0.1, distanceMax: 100 }
	});
	cameraEntity.script.create("orbitCameraInputMouse");
	cameraEntity.script.create("orbitCameraInputTouch");
	const keyLight = new pc.Entity("keyLight");
	keyLight.addComponent("light", { type: pc.LIGHTTYPE_DIRECTIONAL, color: new pc.Color(1, 1, 1), intensity: 1.1 });
	keyLight.setEulerAngles(45, 30, 0);
	app.root.addChild(keyLight);
	const fillLight = new pc.Entity("fillLight");
	fillLight.addComponent("light", { type: pc.LIGHTTYPE_DIRECTIONAL, color: new pc.Color(1, 1, 1), intensity: 0.35 });
	fillLight.setEulerAngles(20, -130, 0);
	app.root.addChild(fillLight);
	function frameBoundingBox(aabb, offsetMul = 1.35) {
		if (!aabb) return;
		const maxDim = Math.max(aabb.halfExtents.x, aabb.halfExtents.y, aabb.halfExtents.z) * 2;
		const vFovRad = (cameraEntity.camera.fov * Math.PI) / 180;
		const rect = canvas.getBoundingClientRect();
		const aspect = rect.width / Math.max(1, rect.height);
		const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
		const distV = Math.abs((maxDim / 2) / Math.tan(vFovRad / 2));
		const distH = Math.abs((maxDim / 2) / Math.tan(hFovRad / 2));
		const dist = Math.max(distV, distH) * offsetMul;
		const center = aabb.center;
		cameraEntity.setPosition(center.x, center.y + maxDim * 0.1, center.z + dist);
		cameraEntity.camera.aspectRatio = aspect;
		cameraEntity.camera.nearClip = Math.max(0.01, maxDim / 200);
		cameraEntity.camera.farClip = Math.max(50, maxDim * 50);
		orbit.target.copy(center);
	}
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
	const orbit = {
		target: new pc.Vec3(0, 0, 0),
		spherical: { r: 2.2, theta: 0, phi: Math.PI / 2 },
		autoRotate: true,
		autoSpeed: 0.005,
		resumeTimer: null,
		stopAuto() {
			this.autoRotate = false;
			if (this.resumeTimer) clearTimeout(this.resumeTimer);
		},
		scheduleResume() {
			if (this.resumeTimer) clearTimeout(this.resumeTimer);
			this.resumeTimer = setTimeout(() => { this.autoRotate = true; }, 900);
		},
		syncFromCamera() {
			const cam = cameraEntity.getPosition();
			const d = new pc.Vec3().sub2(cam, this.target);
			this.spherical.r = d.length();
			this.spherical.phi = Math.acos(Math.max(-1, Math.min(1, d.y / this.spherical.r)));
			this.spherical.theta = Math.atan2(d.x, d.z);
		},
		tick(dt) {
			if (this.autoRotate) this.spherical.theta += this.autoSpeed;
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
	let pointerDown = false;
	let rightDown = false;
	let lastX = 0;
	let lastY = 0;
	canvas.addEventListener("pointerdown", (e) => {
		if (e.button === 2) rightDown = true;
		else pointerDown = true;
		lastX = e.clientX;
		lastY = e.clientY;
		orbit.stopAuto();
	});
	canvas.addEventListener("contextmenu", (e) => e.preventDefault());
	window.addEventListener("pointermove", (e) => {
		const dx = e.clientX - lastX;
		const dy = e.clientY - lastY;
		lastX = e.clientX;
		lastY = e.clientY;
		if (pointerDown && !rightDown) {
			orbit.spherical.theta -= dx * 0.005;
			orbit.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orbit.spherical.phi - dy * 0.005));
		} else if (rightDown) {
			const panSpeed = orbit.spherical.r * 0.001;
			const right = new pc.Vec3();
			const up = new pc.Vec3();
			cameraEntity.getLocalTransform().getX(right);
			cameraEntity.getLocalTransform().getY(up);
			orbit.target.add(right.mulScalar(-dx * panSpeed));
			orbit.target.add(up.mulScalar(dy * panSpeed));
		}
	});
	window.addEventListener("pointerup", (e) => {
		if (e.button === 2) rightDown = false;
		else pointerDown = false;
		orbit.scheduleResume();
	});
	canvas.addEventListener("wheel", (e) => {
		orbit.stopAuto();
		orbit.spherical.r = Math.max(0.1, orbit.spherical.r + e.deltaY * 0.002 * orbit.spherical.r);
		orbit.scheduleResume();
	}, { passive: true });
	let pinchStartDistance = null;
	let pinchStartRadius = null;
	function getTouchDistance(touches) {
		const dx = touches[0].clientX - touches[1].clientX;
		const dy = touches[0].clientY - touches[1].clientY;
		return Math.hypot(dx, dy);
	}
	canvas.style.touchAction = "none";
	canvas.addEventListener("touchstart", (e) => {
		if (e.touches.length === 2) {
			e.preventDefault();
			orbit.stopAuto();
			pinchStartDistance = getTouchDistance(e.touches);
			pinchStartRadius = orbit.spherical.r;
		}
	}, { passive: false });
	canvas.addEventListener("touchmove", (e) => {
		if (e.touches.length === 2 && pinchStartDistance && pinchStartRadius) {
			e.preventDefault();
			const currentDistance = getTouchDistance(e.touches);
			const scale = pinchStartDistance / currentDistance;
			orbit.spherical.r = Math.max(0.1, Math.min(100, pinchStartRadius * scale));
		}
	}, { passive: false });
	canvas.addEventListener("touchend", (e) => {
		if (e.touches.length < 2) {
			pinchStartDistance = null;
			pinchStartRadius = null;
			orbit.scheduleResume();
		}
	});
	function resize() {
		canvas.style.width = "";
		canvas.style.height = "";
		const rect = canvas.getBoundingClientRect();
		const w = Math.max(1, Math.floor(rect.width));
		const h = Math.max(1, Math.floor(rect.height));
		const pw = Math.round(w * pixelRatio);
		const ph = Math.round(h * pixelRatio);
		if (canvas.width !== pw || canvas.height !== ph) {
			canvas.width = pw;
			canvas.height = ph;
			app.resizeCanvas(pw, ph);
		}
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;
		cameraEntity.camera.aspectRatio = w / h;
	}
	const _resizeObserver = new ResizeObserver(() => resize());
	_resizeObserver.observe(canvas.parentElement ?? canvas);
	app.on("update", (dt) => {
		orbit.tick(dt);
	});
	setLoaderProgress(45);
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
			const ext = (finalSrc ?? "").split("?")[0].toLowerCase().split(".").pop();
			const splatAsset = new pc.Asset("gem-splat", "gsplat", { url: localBlobUrl, filename: `model.${ext}` });
			app.assets.add(splatAsset);
			splatAsset.on("load", () => {
				const splatEntity = new pc.Entity("splat");
				splatEntity.addComponent("gsplat", { asset: splatAsset });
				app.root.addChild(splatEntity);
				applyModelRotation(splatEntity, m, { defaultSplatFix: false });
				if (m.offset) splatEntity.translate(m.offset.x ?? 0, m.offset.y ?? 0, m.offset.z ?? 0);
				let frameChecks = 0;
				const tryFrame = () => {
					const aabb = splatAsset.resource?.aabb;
					if (aabb && aabb.halfExtents.length() > 0.001) {
						const worldPos = splatEntity.getPosition();
						const center = aabb.center;
						splatEntity.setPosition(worldPos.x - center.x, worldPos.y - center.y, worldPos.z - center.z);
						const centeredAABB = new pc.BoundingBox(new pc.Vec3(0, 0, 0), aabb.halfExtents.clone());
						setText("status", "Loaded and Centered.");
						hideLoaderOverlay();
						requestAnimationFrame(() => {
							syncCanvasSize();
							app.resizeCanvas(canvas.width, canvas.height);
							frameBoundingBox(centeredAABB, 1.35);
							orbit.target.set(0, 0, 0);
							orbit.syncFromCamera();
						});
					} else {
						if (frameChecks++ < 50) {
							setTimeout(tryFrame, 100);
						} else {
							hideLoaderOverlay();
							requestAnimationFrame(() => {
								syncCanvasSize();
								app.resizeCanvas(canvas.width, canvas.height);
								cameraEntity.setPosition(0, 0.5, 3);
								cameraEntity.camera.aspectRatio = canvas.width / Math.max(1, canvas.height);
								orbit.target.set(0, 0, 0);
								orbit.syncFromCamera();
							});
						}
					}
				};
				tryFrame();
			});
			splatAsset.on("error", (err) => {
				URL.revokeObjectURL(localBlobUrl);
				setText("status", "Failed to load splat.");
				setText("title", "Failed to load splat");
				setText("name", "Failed to load splat");
				setText("desc", String(err));
			});
			app.assets.load(splatAsset);
		} catch (err) {
			setText("status", "Failed to load splat.");
			setText("title", "Failed to load splat");
			setText("name", "Failed to load splat");
			setText("desc", err?.message ?? "Unknown error");
		}
	} else {
		setLoaderProgress(55);
		setText("status", "Loading…");
		const gltfAsset = new pc.Asset("gem-model", "container", { url: finalSrc });
		app.assets.add(gltfAsset);
		gltfAsset.on("load", () => {
			const modelEntity = new pc.Entity("model");
			applyModelRotation(modelEntity, m);
			modelEntity.addComponent("render", { type: "asset", asset: gltfAsset.resource?.model ?? gltfAsset });
			app.root.addChild(modelEntity);
			let aabb = null;
			const renders = modelEntity.findComponents("render");
			for (const r of renders) {
				for (const mi of (r.meshInstances ?? [])) {
					if (!aabb) aabb = mi.aabb.clone();
					else aabb.add(mi.aabb);
				}
			}
			if (aabb) {
				hideLoaderOverlay();
				requestAnimationFrame(() => {
					syncCanvasSize();
					app.resizeCanvas(canvas.width, canvas.height);
					frameBoundingBox(aabb, 1.25);
					orbit.syncFromCamera();
				});
			}
		});
		gltfAsset.on("progress", (loaded, total) => {
			if (total) {
				const pct = Math.round((loaded / total) * 100);
				setLoaderProgress(55 + Math.round(pct * 0.45));
				setText("status", `Loading… ${pct}%`);
			}
		});
		gltfAsset.on("error", (err) => {
			setText("status", "Failed to load model.");
			setText("title", "Failed to load model");
			setText("name", "Failed to load model");
			setText("desc", err?.message ?? "Unknown error");
		});
		app.assets.load(gltfAsset);
	}
    
    return app;
}