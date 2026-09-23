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

      const SIZE = 200;
      const canvas = canvasRef.current;
      canvas.width = SIZE;
      canvas.height = SIZE;

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(SIZE, SIZE, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 0, 2.6);

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
        }),
      );
      globe.add(land);

      function latLngToVec3(lat, lng, r = 1.05) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
      }

      allModels.forEach((m) => {
        if (!m.location) return;
        const pos = latLngToVec3(m.location.lat, m.location.lng);
        const isCurrent = m.id === currentModel?.id;

        const pinColor = isCurrent ? 0x00cfcf : 0x005aff;
        const pinSize = isCurrent ? 0.055 : 0.035;

        const pinMat = new THREE.MeshBasicMaterial({ color: pinColor });
        const head = new THREE.Mesh(new THREE.SphereGeometry(pinSize, 16, 16), pinMat);
        head.position.copy(pos.clone().normalize().multiplyScalar(1.06));

        head.userData = { modelId: m.id };
        globe.add(head);
        pinMeshes.push(head);
      });

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      let isDragging = false;

      canvas.addEventListener("mousedown", () => {
        isDragging = false;
      });
      canvas.addEventListener("mousemove", () => {
        isDragging = true;
      });
      canvas.addEventListener("mouseup", (event) => {
        if (isDragging) return;

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
          canvas.style.cursor = isDragging ? "grabbing" : "grab";
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = "0";
          }
        }
      });

      canvas.addEventListener("mouseleave", () => {
        isDragging = false;
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
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
      }
      if (globe) {
        globe.geometry.dispose();
        globe.material.dispose();
      }
      pinMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
    };
  }, [currentModel, allModels, navigate]);

  if (!allModels?.some((m) => m.location)) return null;

  return (
    <>
      <div className="my-4 flex flex-col items-center justify-center py-2">
        <canvas
          ref={canvasRef}
          className="block h-[200px] w-[200px] cursor-grab rounded-full border-2 border-[#525252] shadow-[0_4px_24px_rgba(0,0,0,0.5)] outline-none active:cursor-grabbing"
        />
        <div className="mt-2 text-center text-[11px] text-[#aab2c0]">
          <span className="font-bold text-[#e9ecf1]">Drag</span> Rotate • <span className="font-bold text-[#e9ecf1]">Scroll</span> Zoom
        </div>
        <div className="mt-1.5 text-center text-[13px] font-bold text-[#00cfcf]">{currentModel?.location?.label}</div>
      </div>

      {/* Floating Tooltip Portal */}
      <div
        ref={tooltipRef}
        className="pointer-events-none fixed left-0 top-0 z-[100] rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#0b0c10]/95 px-3 py-2 text-xs text-[#e9ecf1] opacity-0 shadow-xl backdrop-blur-md transition-opacity duration-150 will-change-transform"
      />
    </>
  );
}
