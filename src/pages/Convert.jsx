import { useState, useRef } from "react";

export default function Convert() {
  const [file, setFile] = useState(null);
  const [loadedScene, setLoadedScene] = useState(null);
  const [format, setFormat] = useState("glb");
  const [filename, setFilename] = useState("output");
  const [status, setStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const safeName = (name) => (name || "output").replace(/[^a-z0-9_-]+/gi, "_");

  const downloadBlob = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const loadFile = async (selectedFile) => {
    if (!selectedFile) return;
    setStatus("Loading model…");
    setFile(selectedFile);

    const url = URL.createObjectURL(selectedFile);
    try {
      const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.178/build/three.module.js");
      const { GLTFLoader } = await import("https://cdn.jsdelivr.net/npm/three@0.178/examples/jsm/loaders/GLTFLoader.js");
      const { DRACOLoader } = await import("https://cdn.jsdelivr.net/npm/three@0.178/examples/jsm/loaders/DRACOLoader.js");
      const { MeshoptDecoder } = await import("https://cdn.jsdelivr.net/npm/three@0.178/examples/jsm/libs/meshopt_decoder.module.js");

      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
      loader.setDRACOLoader(draco);
      loader.setMeshoptDecoder(MeshoptDecoder);

      const gltf = await loader.loadAsync(url);
      setLoadedScene(gltf.scene);
      setStatus("Ready.");
    } catch (e) {
      console.error(e);
      setStatus("Failed to load. Open console for details.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const handleConvert = async () => {
    if (!loadedScene) return;
    const outName = safeName(filename);
    setStatus("Exporting…");

    try {
      const { GLTFExporter } = await import("https://cdn.jsdelivr.net/npm/three@0.178/examples/jsm/exporters/GLTFExporter.js");
      const exporter = new GLTFExporter();

      exporter.parse(
        loadedScene,
        async (result) => {
          if (format === "glb") {
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
                const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
                zip.file(`${outName}.bin`, bin);
                const jsonObj = JSON.parse(gltfJson);
                jsonObj.buffers[0].uri = `${outName}.bin`;
                zip.file(`${outName}.gltf`, JSON.stringify(jsonObj, null, 2));
              }
            }
            const blob = await zip.generateAsync({ type: "blob" });
            downloadBlob(blob, `${outName}_gltf.zip`);
            setStatus("Downloaded glTF (zipped).");
          }
        },
        (err) => {
          console.error(err);
          setStatus("Export failed. Open console for details.");
        },
        { binary: format === "glb", embedImages: true, trs: false, onlyVisible: true },
      );
    } catch (e) {
      console.error(e);
      setStatus("Export failed. Open console for details.");
    }
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-12 pt-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <section className="min-h-[260px] rounded-2xl border border-[rgba(255,255,255,0.1)] bg-white/5 p-4">
          <h3 className="mb-4 mt-0 text-lg font-bold">Input Files</h3>
          <div
            className={`cursor-pointer rounded-2xl border border-dashed p-6 text-center transition-colors ${
              isDragging ? "border-blue-400 bg-blue-500/10" : "border-[rgba(255,255,255,0.16)]"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              loadFile(e.dataTransfer.files[0]);
            }}
          >
            <div className="mb-2 text-2xl">⬆</div>
            <div>Drag & drop model files here</div>
            <div className="text-[13px] text-[#aab2c0]">or click to browse</div>
            <div className="mt-2 text-[13px] text-[#aab2c0]">.glb, .gltf</div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
              onChange={(e) => loadFile(e.target.files[0])}
            />
          </div>
          <div className="mt-2.5 text-[13px] text-[#aab2c0]">{file ? `Loaded: ${file.name}` : status}</div>
        </section>

        <section className="min-h-[260px] rounded-2xl border border-[rgba(255,255,255,0.1)] bg-white/5 p-4">
          <h3 className="mb-4 mt-0 text-lg font-bold">Output</h3>
          <label className="mb-3 block">
            <div className="mb-1.5 text-[13px] font-bold">Format</div>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="h-11 w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-white/5 px-3.5 text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
            >
              <option value="glb">.glb (binary)</option>
              <option value="gltf">.gltf (JSON + .bin)</option>
            </select>
          </label>
          <label className="mb-3 block">
            <div className="mb-1.5 text-[13px] font-bold">Filename</div>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="h-11 w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-white/5 px-3.5 text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
            />
          </label>
          <div className="my-2.5 text-[13px] text-[#aab2c0]">OUTPUT ACTIONS</div>
          <button
            onClick={() => alert("Actions pending implementation.")}
            className="mb-3 rounded-lg border border-transparent px-3 py-1.5 text-sm font-bold hover:bg-white/5"
          >
            ＋ Add Action
          </button>
          <button
            onClick={handleConvert}
            disabled={!loadedScene}
            className="w-full rounded-xl bg-[#ff8c28]/85 p-3 font-bold text-white disabled:opacity-50"
          >
            Convert & Download
          </button>
        </section>
      </div>
    </div>
  );
}
