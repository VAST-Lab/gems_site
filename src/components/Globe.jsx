import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Globe({ currentModel, allModels }) {
  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let renderer, scene, camera, globe, controls, reqId;
    let isMounted = true;
    const pinMeshes = [];

    async function init() {
      const hasAnyLocation = allModels?.some((m) => m.location);
      if (!hasAnyLocation || !canvasRef.current) return;

      const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.178/build/three.module.js");
      const { OrbitControls } = await import("https://cdn.jsdelivr.net/npm/three@0.178/examples/jsm/controls/OrbitControls.js");

      if (!isMounted) return;

      const SIZE = 220;
      const canvas = canvasRef.current;
      canvas.width = SIZE;
      canvas.height = SIZE;

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(SIZE, SIZE, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      
      const cameraDistance = 2.4;
      
      if (currentModel?.location?.lat !== undefined && currentModel?.location?.lng !== undefined) {
        const phi = (90 - currentModel.location.lat) * (Math.PI / 180);
        const theta = (currentModel.location.lng + 180) * (Math.PI / 180);
        camera.position.x = -cameraDistance * Math.sin(phi) * Math.cos(theta);
        camera.position.y = cameraDistance * Math.cos(phi);
        camera.position.z = cameraDistance * Math.sin(phi) * Math.sin(theta);
      } else {
        camera.position.set(0, 0, cameraDistance);
      }
      camera.lookAt(0, 0, 0);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enablePan = false;
      controls.minDistance = 1.2;
      controls.maxDistance = 4;
      controls.enableRotate = true;
      controls.enableZoom = true;

      const textureLoader = new THREE.TextureLoader();
      textureLoader.setCrossOrigin("anonymous");
      const landTexture = textureLoader.load("https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_specular_2048.jpg");

      globe = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), new THREE.MeshBasicMaterial({ color: 0x525252 }));
      scene.add(globe);

      const land = new THREE.Mesh(
        new THREE.SphereGeometry(1.002, 64, 64),
        new THREE.MeshBasicMaterial({
          alphaMap: landTexture,
          color: 0x12141c,
          transparent: true,
          opacity: 1.0,
        })
      );
      globe.add(land);

      function latLngToVec3(lat, lng, r = 1.02) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
      }

      allModels.forEach((m) => {
        if (!m.location?.lat || !m.location?.lng) return;
        const pos = latLngToVec3(m.location.lat, m.location.lng);
        const isCurrent = m.id === currentModel?.id;

        const thumbUrl = m.thumb?.trim().startsWith("http")
            ? m.thumb
            : import.meta.env.BASE_URL + `assets/${m.thumb}`;

        let material;
        if (thumbUrl) {
            const map = textureLoader.load(thumbUrl);
            material = new THREE.SpriteMaterial({
                map: map,
                color: isCurrent ? 0xffffff : 0xaaaaaa,
                transparent: true,
                alphaTest: 0.1
            });
        } else {
            material = new THREE.SpriteMaterial({ color: isCurrent ? 0x00cfcf : 0x005aff });
        }

        const sprite = new THREE.Sprite(material);
        const scale = isCurrent ? 0.12 : 0.05;
        sprite.scale.set(scale, scale, scale);
        sprite.position.copy(pos);

        sprite.userData = { modelId: m.id };
        globe.add(sprite);
        pinMeshes.push(sprite);
      });

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      let isDraggingGlobe = false;

      canvas.addEventListener("mousedown", () => {
        isDraggingGlobe = false;
      });
      canvas.addEventListener("mousemove", () => {
        isDraggingGlobe = true;
      });
      canvas.addEventListener("mouseup", (event) => {
        if (isDraggingGlobe) return;

        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(pinMeshes);

        if (intersects.length > 0) {
          const clickedModelId = intersects[0].object.userData.modelId;
          if (clickedModelId && clickedModelId !== currentModel?.id) {
            navigate(`/viewer/${clickedModelId}`);
          }
        }
      });

      canvas.addEventListener("mousemove", (event) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(pinMeshes);

        if (intersects.length > 0) {
          canvas.style.cursor = "pointer";
          const hoveredId = intersects[0].object.userData.modelId;
          const hoveredModel = allModels.find((m) => m.id === hoveredId);

          if (hoveredModel && tooltipRef.current) {
            tooltipRef.current.style.opacity = "1";
            tooltipRef.current.style.transform = `translate(${event.clientX + 15}px, ${event.clientY + 15}px)`;
            tooltipRef.current.innerHTML = `
                 <div class="font-bold">${hoveredModel.name}</div>
                 <div class="text-[10px] text-[#aab2c0] mt-0.5">${hoveredModel.location?.label || ""}</div>
               `;
          }
        } else {
          canvas.style.cursor = isDraggingGlobe ? "grabbing" : "grab";
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = "0";
          }
        }
      });

      canvas.addEventListener("mouseleave", () => {
        isDraggingGlobe = false;
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = "0";
        }
      });

      function tick() {
        if (!isMounted) return;
        if (controls) controls.update();
        renderer.render(scene, camera);
        reqId = requestAnimationFrame(tick);
      }
      tick();
    }

    init();

    return () => {
      isMounted = false;
      if (reqId) cancelAnimationFrame(reqId);
      if (controls) controls.dispose();
      if (renderer) renderer.dispose();
      if (globe) {
        globe.geometry.dispose();
        globe.material.dispose();
      }
      pinMeshes.forEach((mesh) => {
        if(mesh.geometry) mesh.geometry.dispose();
        if(mesh.material) mesh.material.dispose();
      });
    };
  }, [currentModel, allModels, navigate]);

  if (!allModels?.some((m) => m.location)) return null;

  return (
    <>
      <div className="relative my-4 flex flex-col items-center justify-center py-2">
        <canvas
          ref={canvasRef}
          className="block h-[220px] w-[220px] cursor-grab rounded-full bg-[#05080e] border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.4)] outline-none active:cursor-grabbing"
        />

        <div className="mt-3 text-center text-[11px] text-[#aab2c0]">
          <span className="font-bold text-[#e9ecf1]">Drag</span> Rotate • <span className="font-bold text-[#e9ecf1]">Scroll</span> Zoom
        </div>
        <div className="mt-1.5 flex flex-col items-center justify-center gap-1 text-center text-[13px] font-bold text-[#00cfcf]">
          {currentModel?.location?.label}
          {currentModel?.location && (
            <div className="rounded border border-white/20 px-2 py-0.5 text-[11px] font-normal text-white bg-black/40">
               {currentModel?.name}
            </div>
          )}
        </div>
      </div>

      <div
        ref={tooltipRef}
        className="pointer-events-none fixed left-0 top-0 z-[100] rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#0b0c10]/95 px-3 py-2 text-xs text-[#e9ecf1] opacity-0 shadow-xl backdrop-blur-md transition-opacity duration-150 will-change-transform"
      />
    </>
  );
}