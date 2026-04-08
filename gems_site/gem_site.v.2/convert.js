
let loaded = null; // { scene, animations }

const drop = document.getElementById("drop");
const fileInput = document.getElementById("file");
const inputInfo = document.getElementById("inputInfo");
const formatSel = document.getElementById("format");
const filenameEl = document.getElementById("filename");
const convertBtn = document.getElementById("convert");
const statusEl = document.getElementById("status");
const addActionBtn = document.getElementById("addAction");

addActionBtn.addEventListener("click", () => {
  alert("Actions are a placeholder in this starter. Tell me what actions you want (scale, center, rotate, decimate) and I’ll add them.");
});

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function safeName(name) {
  return (name || "output").replace(/[^a-z0-9_-]+/gi, "_");
}

function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function loadFile(file) {
  setStatus("Loading model…");
  convertBtn.disabled = true;

  const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.161/build/three.module.js");
  const { GLTFLoader } = await import("https://cdn.jsdelivr.net/npm/three@0.161/examples/jsm/loaders/GLTFLoader.js");
  const { DRACOLoader } = await import("https://cdn.jsdelivr.net/npm/three@0.161/examples/jsm/loaders/DRACOLoader.js");
  const { MeshoptDecoder } = await import("https://cdn.jsdelivr.net/npm/three@0.161/examples/jsm/libs/meshopt_decoder.module.js");

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);

  const url = URL.createObjectURL(file);

  try {
    const gltf = await loader.loadAsync(url);
    loaded = gltf;
    inputInfo.textContent = `Loaded: ${file.name}`;
    setStatus("Ready.");
    convertBtn.disabled = false;
  } catch (e) {
    console.error(e);
    setStatus("Failed to load. Open console for details.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function exportAndDownload() {
  if (!loaded) return;

  const outName = safeName(filenameEl.value);
  const fmt = formatSel.value;

  setStatus("Exporting…");
  convertBtn.disabled = true;

  const { GLTFExporter } = await import("https://cdn.jsdelivr.net/npm/three@0.161/examples/jsm/exporters/GLTFExporter.js");
  const exporter = new GLTFExporter();

  const options = {
    binary: fmt === "glb",
    embedImages: true,
    trs: false,
    onlyVisible: true
  };

  exporter.parse(
    loaded.scene,
    async (result) => {
      try {
        if (fmt === "glb") {
          const blob = new Blob([result], { type: "model/gltf-binary" });
          downloadBlob(blob, `${outName}.glb`);
          setStatus("Downloaded GLB.");
        } else {
      
          const JSZip = (await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js")).default;
          const zip = new JSZip();

          const gltfJson = JSON.stringify(result, null, 2);
          zip.file(`${outName}.gltf`, gltfJson);

       
          if (result && result.buffers && result.buffers.length) {
            const b0 = result.buffers[0];
            if (b0.uri && b0.uri.startsWith("data:")) {
              const base64 = b0.uri.split(",")[1];
              const bin = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
              zip.file(`${outName}.bin`, bin);
              // Update uri to point to .bin
              const jsonObj = JSON.parse(gltfJson);
              jsonObj.buffers[0].uri = `${outName}.bin`;
              zip.file(`${outName}.gltf`, JSON.stringify(jsonObj, null, 2));
            }
          }

          const blob = await zip.generateAsync({ type: "blob" });
          downloadBlob(blob, `${outName}_gltf.zip`);
          setStatus("Downloaded glTF (zipped).");
        }
      } catch (e) {
        console.error(e);
        setStatus("Export failed. Open console for details.");
      } finally {
        convertBtn.disabled = false;
      }
    },
    (err) => {
      console.error(err);
      setStatus("Export failed. Open console for details.");
      convertBtn.disabled = false;
    },
    options
  );
}

// Events
drop.addEventListener("click", () => fileInput.click());
drop.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) loadFile(file);
});

drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("dropzone-on");
});
drop.addEventListener("dragleave", () => drop.classList.remove("dropzone-on"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("dropzone-on");
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) loadFile(file);
});

convertBtn.addEventListener("click", exportAndDownload);
