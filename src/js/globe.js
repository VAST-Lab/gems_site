import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.178/build/three.module.js";

export async function initGlobe(currentModel, allModels) {
    const canvas = document.getElementById("globe");
    if (!canvas) return;

    const hasAnyLocation = allModels.some((m) => m.location);
    if (!hasAnyLocation) {
        canvas.style.display = "none";
        return;
    }

    const SIZE = 200;
    canvas.width = SIZE;
    canvas.height = SIZE;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(SIZE, SIZE, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

    let globeZoom = 2.6;
    camera.position.set(0, 0, globeZoom);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin("anonymous");
    const landTexture = textureLoader.load(
        "https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_specular_2048.jpg"
    );

    const globe = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 64),
        new THREE.MeshBasicMaterial({ color: 0x525252 })
    );
    scene.add(globe);

    const land = new THREE.Mesh(
        new THREE.SphereGeometry(1.002, 64, 64),
        new THREE.MeshBasicMaterial({
            alphaMap: landTexture,
            color: 0x12141c,
            transparent: true,
            opacity: 1.0
        })
    );
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

    function tick() {
        globe.rotation.y += 0.002; // simplified auto-rotation for brevity
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }
    tick();
}