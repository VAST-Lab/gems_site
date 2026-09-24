const SPLAT_CACHE_VERSION = "1.1.0";
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
	return u.endsWith(".ply") || u.endsWith(".spz") || u.endsWith(".splat") || u.endsWith(".ksplat") || u.endsWith(".sog");
}

async function clearOldSplatCaches() {
	const names = await caches.keys();
	const oldNames = names.filter((name) => name.startsWith(SPLAT_CACHE_PREFIX) && name !== SPLAT_CACHE_NAME);
	await Promise.all(oldNames.map((name) => caches.delete(name)));
}

function getDeviceCapabilities() {
	const canvas = document.createElement("canvas");
	const gl = canvas.getContext("webgl");
	const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
	const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase() : "";
	const isMobile = /iphone|ipad|android/i.test(navigator.userAgent);
	const isLowPower = renderer.includes("intel") || renderer.includes("apple gpu") || renderer.includes("mali") || renderer.includes("adreno");

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

	if (!response.ok) {
		throw new Error(`HuggingFace Error: ${response.status}`);
	}

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

		if (onProgress && total) {
			onProgress(Math.round((loaded / total) * 100));
		}
	}

	const fullBlob = new Blob(chunks);

	try {
		await cache.put(
			url,
			new Response(fullBlob, {
				headers: {
					"Content-Length": fullBlob.size.toString()
				}
			})
		);
	} catch (e) {
		console.warn("Storage full, loading anyway...");
	}

	return URL.createObjectURL(fullBlob);
}

function getRobustCenter(splatAsset) {
	const aabb = splatAsset.resource?.aabb;
	const defaultCenter = aabb?.center?.clone() || new pc.Vec3();
	const splatData = splatAsset.resource?.splatData;

	if (!splatData || !splatData.numSplats) {
		return defaultCenter;
	}

	const numSplats = splatData.numSplats;
	const sampleSize = Math.min(numSplats, 10000);
	const step = Math.max(1, Math.floor(numSplats / sampleSize));
	const xs = [];
	const ys = [];
	const zs = [];

	try {
		for (let i = 0; i < numSplats; i += step) {
			if (typeof splatData.getF32 === "function") {
				xs.push(splatData.getF32("x", i));
				ys.push(splatData.getF32("y", i));
				zs.push(splatData.getF32("z", i));
			} else if (splatData.centers) {
				xs.push(splatData.centers[i * 3]);
				ys.push(splatData.centers[i * 3 + 1]);
				zs.push(splatData.centers[i * 3 + 2]);
			} else {
				return defaultCenter;
			}
		}

		xs.sort((a, b) => a - b);
		ys.sort((a, b) => a - b);
		zs.sort((a, b) => a - b);

		const mid = Math.floor(xs.length / 2);

		return new pc.Vec3(xs[mid], ys[mid], zs[mid]);
	} catch (e) {
		return defaultCenter;
	}
}

function getModelPivot(splatAsset, modelMeta) {
	const p = modelMeta?.pivot;

	if (p && typeof p === "object") {
		return new pc.Vec3(p.x ?? 0, p.y ?? 0, p.z ?? 0);
	}

	return getRobustCenter(splatAsset);
}

function getDisplayOffset(modelMeta) {
	const p = modelMeta?.displayOffset;
	return new pc.Vec3(p?.x ?? 0, p?.y ?? 0, p?.z ?? 0);
}

function getViewOffset(modelMeta) {
	const p = modelMeta?.viewOffset;
	return new pc.Vec2(Number.isFinite(Number(p?.x)) ? Number(p.x) : 0, Number.isFinite(Number(p?.y)) ? Number(p.y) : 0);
}

function getTransformedBounds(aabb, entity) {
	const worldAabb = new pc.BoundingBox();
	worldAabb.setFromTransformedAabb(aabb, entity.getWorldTransform(), true);
	return worldAabb;
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
	const checkList = preferredSrc ? [preferredSrc, ...renderSources.filter((s) => s !== preferredSrc)] : renderSources;

	setLoaderProgress(12);
	setText("status", "Locating best source...");

	const cacheStore = await caches.open(SPLAT_CACHE_NAME);

	for (const url of checkList) {
		const isCached = await cacheStore.match(url);

		if (isCached) {
			finalSrc = url;
			break;
		}

		try {
			const res = await fetch(url, {
				method: "HEAD"
			});

			if (res.ok) {
				finalSrc = url;
				break;
			}
		} catch (e) {
			console.warn(`Source not available, trying next: ${url}`);
		}
	}

	setLoaderProgress(35);

	canvas.style.position = "absolute";
	canvas.style.left = "0";
	canvas.style.top = "0";
	canvas.style.width = "100%";
	canvas.style.height = "100%";
	canvas.style.objectFit = "contain";

	const pc = await import("https://cdn.jsdelivr.net/npm/playcanvas@2/build/playcanvas.mjs");

	window.pc = pc;

	const pixelRatio = capabilities.isLowEnd ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 2);

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

	let isDestroyed = false;

	app.setCanvasFillMode(pc.FILLMODE_NONE);
	app.setCanvasResolution(pc.RESOLUTION_FIXED);
	app.graphicsDevice.maxPixelRatio = pixelRatio;

	setTimeout(() => {
		if (isDestroyed) return;

		resize();
		app.start();
	}, 0);

	app.scene.ambientLight = new pc.Color(0.05, 0.06, 0.08);
	const cameraEntity = new pc.Entity("camera");

	cameraEntity.addComponent("camera", {
		clearColor: new pc.Color(0.043, 0.059, 0.078, 1),
		nearClip: 0.001,
		farClip: 1000
	});

	cameraEntity.addComponent("script");
	app.root.addChild(cameraEntity);

	const keyLight = new pc.Entity("keyLight");
	keyLight.addComponent("light", {
		type: pc.LIGHTTYPE_DIRECTIONAL,
		color: new pc.Color(1, 1, 1),
		intensity: 1.1
	});
	keyLight.setEulerAngles(45, 30, 0);

	app.root.addChild(keyLight);

	const fillLight = new pc.Entity("fillLight");
	fillLight.addComponent("light", {
		type: pc.LIGHTTYPE_DIRECTIONAL,
		color: new pc.Color(1, 1, 1),
		intensity: 0.35
	});
	fillLight.setEulerAngles(20, -130, 0);

	app.root.addChild(fillLight);

	const DEFAULT_CAMERA_PADDING = 1.55;

	function getCameraPadding(modelMeta) {
		const value = Number(modelMeta?.cameraPadding);

		return Number.isFinite(value) && value > 1 ? value : DEFAULT_CAMERA_PADDING;
	}

	function frameBoundingBox(aabb, target, padding = DEFAULT_CAMERA_PADDING) {
		if (!aabb || !target || isDestroyed) return;

		const half = aabb.halfExtents;
		const maxDim = Math.max(half.x, half.y, half.z) * 2;
		const vFovRad = (cameraEntity.camera.fov * Math.PI) / 180;
		const parentRect = canvas.parentElement.getBoundingClientRect();
		const aspect = parentRect.width / Math.max(1, parentRect.height);
		const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
		const distV = half.y / Math.tan(vFovRad / 2);
		const distH = half.x / Math.tan(hFovRad / 2);
		const depthAllowance = half.z * 0.5;
		const dist = Math.max(distV, distH) + depthAllowance;
		const paddedDist = Math.max(0.1, dist * padding);

		orbit.target.copy(target);
		orbit.spherical.r = paddedDist;
		orbit.spherical.theta = 0;
		orbit.spherical.phi = Math.PI / 2;

		cameraEntity.camera.aspectRatio = aspect;
		cameraEntity.camera.nearClip = Math.max(0.01, maxDim / 200);
		cameraEntity.camera.farClip = Math.max(50, maxDim * 50);
		cameraEntity.camera.projectionOffset = orbit.panOffset;

		orbit.tick(0);
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
		panOffset: new pc.Vec2(0, 0),
		spherical: { r: 2.2, theta: 0, phi: Math.PI / 2 },
		autoRotate: true,
		autoSpeed: 0.005,
		resumeTimer: null,

		stopAuto() {
			this.autoRotate = false;

			if (this.resumeTimer) {
				clearTimeout(this.resumeTimer);
			}
		},

		scheduleResume() {
			if (this.resumeTimer) {
				clearTimeout(this.resumeTimer);
			}

			this.resumeTimer = setTimeout(() => {
				this.autoRotate = true;
			}, 900);
		},

		syncFromCamera() {
			const cam = cameraEntity.getPosition();
			const d = new pc.Vec3().sub2(cam, this.target);
			this.spherical.r = Math.max(0.001, d.length());
			this.spherical.phi = Math.acos(Math.max(-1, Math.min(1, d.y / this.spherical.r)));
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

	let pointerDown = false;
	let rightDown = false;
	let lastX = 0;
	let lastY = 0;

	canvas.addEventListener("pointerdown", (e) => {
		if (e.button === 2) {
			rightDown = true;
		} else {
			pointerDown = true;
		}

		lastX = e.clientX;
		lastY = e.clientY;

		orbit.stopAuto();
	});

	canvas.addEventListener("contextmenu", (e) => e.preventDefault());

	const onPointerMove = (e) => {
		if (isDestroyed) return;

		const dx = e.clientX - lastX;
		const dy = e.clientY - lastY;

		lastX = e.clientX;
		lastY = e.clientY;

		if (pointerDown && !rightDown) {
			orbit.spherical.theta -= dx * 0.005;

			orbit.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orbit.spherical.phi - dy * 0.005));
		} else if (rightDown) {
			const rect = canvas.getBoundingClientRect();

			if (rect.width > 0 && rect.height > 0) {
				orbit.panOffset.x = Math.max(-1.5, Math.min(1.5, orbit.panOffset.x - (dx * 2) / rect.width));
				orbit.panOffset.y = Math.max(-1.5, Math.min(1.5, orbit.panOffset.y + (dy * 2) / rect.height));
				cameraEntity.camera.projectionOffset = orbit.panOffset;
			}
		}
	};

	const onPointerUp = (e) => {
		if (isDestroyed) return;

		if (e.button === 2) {
			rightDown = false;
		} else {
			pointerDown = false;
		}

		orbit.scheduleResume();

		console.log(`Viewer state for ${m.id}:`, {
			pivot: {
				x: orbit.target.x.toFixed(3),
				y: orbit.target.y.toFixed(3),
				z: orbit.target.z.toFixed(3)
			},
			pan: {
				x: orbit.panOffset.x.toFixed(3),
				y: orbit.panOffset.y.toFixed(3)
			}
		});
	};

	window.addEventListener("pointermove", onPointerMove);
	window.addEventListener("pointerup", onPointerUp);

	canvas.addEventListener(
		"wheel",
		(e) => {
			orbit.stopAuto();

			orbit.spherical.r = Math.max(0.1, orbit.spherical.r + e.deltaY * 0.002 * orbit.spherical.r);

			orbit.scheduleResume();
		},
		{ passive: true }
	);

	let pinchStartDistance = null;
	let pinchStartRadius = null;

	function getTouchDistance(touches) {
		const dx = touches[0].clientX - touches[1].clientX;
		const dy = touches[0].clientY - touches[1].clientY;
		return Math.hypot(dx, dy);
	}

	canvas.style.touchAction = "none";

	canvas.addEventListener(
		"touchstart",
		(e) => {
			if (e.touches.length === 2) {
				e.preventDefault();
				orbit.stopAuto();
				pinchStartDistance = getTouchDistance(e.touches);
				pinchStartRadius = orbit.spherical.r;
			}
		},
		{ passive: false }
	);

	canvas.addEventListener(
		"touchmove",
		(e) => {
			if (e.touches.length === 2 && pinchStartDistance && pinchStartRadius) {
				e.preventDefault();
				const currentDistance = getTouchDistance(e.touches);
				const scale = pinchStartDistance / currentDistance;
				orbit.spherical.r = Math.max(0.1, Math.min(100, pinchStartRadius * scale));
			}
		},
		{ passive: false }
	);

	canvas.addEventListener("touchend", (e) => {
		if (e.touches.length < 2) {
			pinchStartDistance = null;
			pinchStartRadius = null;
			orbit.scheduleResume();
		}
	});

	function resize() {
		if (isDestroyed) return;

		const parent = canvas.parentElement;
		if (!parent) return;

		const rect = parent.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) {
			return;
		}

		const currentDpr = capabilities.isLowEnd ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 2);
		const MAX_RES = 4096;
		const pw = Math.min(Math.floor(rect.width * currentDpr), MAX_RES);
		const ph = Math.min(Math.floor(rect.height * currentDpr), MAX_RES);

		if (canvas.width !== pw || canvas.height !== ph) {
			canvas.width = pw;
			canvas.height = ph;

			if (app && app.graphicsDevice) {
				app.resizeCanvas(pw, ph);
			}
		}

		if (cameraEntity && cameraEntity.camera) {
			cameraEntity.camera.aspectRatio = rect.width / Math.max(1, rect.height);
		}
	}

	const _resizeObserver = new ResizeObserver(() => resize());
	_resizeObserver.observe(canvas.parentElement ?? canvas);

	app.on("update", (dt) => {
		if (isDestroyed) return;

		orbit.tick(dt);
	});

	const originalDestroy = app.destroy.bind(app);

	app.destroy = () => {
		if (isDestroyed) return;
		isDestroyed = true;

		if (orbit.resumeTimer) {
			clearTimeout(orbit.resumeTimer);
		}

		if (_resizeObserver) {
			_resizeObserver.disconnect();
		}

		window.removeEventListener("pointermove", onPointerMove);
		window.removeEventListener("pointerup", onPointerUp);

		app.autoRender = false;

		if (keyLight) {
			keyLight.destroy();
		}

		if (fillLight) {
			fillLight.destroy();
		}

		originalDestroy();
	};

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
			const splatAsset = new pc.Asset("gem-splat", "gsplat", {
				url: localBlobUrl,
				filename: `model.${ext}`
			});

			app.assets.add(splatAsset);

			splatAsset.on("load", () => {
				const gemRoot = new pc.Entity("gem-root");
				const splatEntity = new pc.Entity("splat");

				splatEntity.addComponent("gsplat", {
					asset: splatAsset
				});

				gemRoot.addChild(splatEntity);
				app.root.addChild(gemRoot);

				applyModelRotation(gemRoot, m, {
					defaultSplatFix: false
				});

				const pivot = getModelPivot(splatAsset, m);
				const displayOffset = getDisplayOffset(m);

				gemRoot.setPosition(displayOffset);
				splatEntity.setLocalPosition(-pivot.x, -pivot.y, -pivot.z);

				let frameChecks = 0;

				const tryFrame = () => {
					if (isDestroyed) return;

					const aabb = splatAsset.resource?.aabb;

					if (aabb && aabb.halfExtents.length() > 0.001) {
						resize();
						const centeredAABB = getTransformedBounds(aabb, splatEntity);
						setText("status", "Loaded and Centered.");
						hideLoaderOverlay();
						requestAnimationFrame(() => {
							if (isDestroyed) return;

							cameraEntity.camera.nearClip = 0.01;
							cameraEntity.camera.farClip = 500;

							frameBoundingBox(centeredAABB, gemRoot.getPosition(), getCameraPadding(m));

							orbit.panOffset.copy(getViewOffset(m));
							cameraEntity.camera.projectionOffset = orbit.panOffset;

							frameBoundingBox(centeredAABB, gemRoot.getPosition(), getCameraPadding(m));
						});
					} else if (frameChecks++ < 50) {
						setTimeout(tryFrame, 100);
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

		const gltfAsset = new pc.Asset("gem-model", "container", {
			url: finalSrc
		});

		app.assets.add(gltfAsset);
		gltfAsset.on("load", () => {
			const modelEntity = new pc.Entity("model");

			applyModelRotation(modelEntity, m);

			modelEntity.addComponent("render", {
				type: "asset",
				asset: gltfAsset.resource?.model ?? gltfAsset
			});

			app.root.addChild(modelEntity);
			let aabb = null;
			const renders = modelEntity.findComponents("render");

			for (const r of renders) {
				for (const mi of r.meshInstances ?? []) {
					if (!aabb) {
						aabb = mi.aabb.clone();
					} else {
						aabb.add(mi.aabb);
					}
				}
			}

			if (aabb) {
				hideLoaderOverlay();

				requestAnimationFrame(() => {
					if (isDestroyed) {
						return;
					}

					resize();
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
