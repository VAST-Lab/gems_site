import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useModels } from "../context/ModelsContext";
import { initViewer } from "../js/viewer.js";
import Sidebar from "../components/Sidebar";
import PeriodicTableModal from "../components/PeriodicTableModal";
import Globe from "../components/Globe";

export default function Viewer() {
  const { id } = useParams();
  const { models, isLoading } = useModels();
  const canvasRef = useRef(null);
  const initialized = useRef(false);
  const [activeElement, setActiveElement] = useState(null);

  const model = models.find((m) => m.id === id);

  useEffect(() => {
    if (!model || !canvasRef.current || initialized.current) return;

    let appInstance = null;
    initViewer(model, canvasRef.current).then((app) => {
      appInstance = app;
    });

    initialized.current = true;

    return () => {
      if (appInstance) {
        appInstance.destroy();
      }
      initialized.current = false;
    };
  }, [model]);

  if (isLoading) return <div className="p-4 text-[#aab2c0]">Loading...</div>;
  if (!model) return <div className="p-4 text-[#aab2c0]">Model not found.</div>;

  const sources = Array.isArray(model.src) ? model.src : [model.src];
  const plySrc = sources.find((s) => s?.toLowerCase().endsWith(".ply"));

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#0b0c10] lg:grid-cols-[220px_1fr]">
      <Sidebar />

      <div className="relative flex h-screen min-w-0 flex-col overflow-hidden">
        <div className="z-10 flex shrink-0 items-center gap-3 border-b border-[rgba(255,255,255,0.1)] bg-[#0b0c10]/86 px-4 py-3.5 backdrop-blur-md sm:py-5">
          <Link to="/" className="text-[#e9ecf1] opacity-90 no-underline hover:opacity-100">
            ← Back
          </Link>
          <div className="text-[13px] text-[#aab2c0]">{model.name}</div>
          <img src={`${import.meta.env.BASE_URL}assets/img/GemScan.logo.PNG`} alt="GemScan" className="ml-auto h-10 w-auto object-contain sm:h-16" />
        </div>

        <main className="relative grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_340px]">
          <div className="relative min-h-0 min-w-0 overflow-hidden">
            <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#0b0c10]/60 p-3 text-[11px] text-[#aab2c0] backdrop-blur-md sm:bottom-6 sm:left-6 sm:text-xs">
              <div className="flex items-center gap-2">
                <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[#e9ecf1]">Left Click</kbd> Rotate
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[#e9ecf1]">Right Click</kbd> Pan
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[#e9ecf1]">Scroll</kbd> Zoom
              </div>
            </div>

            {model.compounds && model.compounds.length > 0 && (
              <div className="absolute left-3 top-[66px] z-10 flex flex-col gap-2.5 sm:left-[18px] sm:top-[18px] sm:gap-2">
                {model.compounds.map((c) => (
                  <button
                    key={c.symbol}
                    onClick={() => setActiveElement(c.symbol)}
                    className="flex h-[68px] w-[54px] cursor-pointer flex-col items-center justify-start rounded-md border-0 pt-1.5 text-[#e9ecf1] backdrop-blur-sm sm:h-14 sm:w-11 sm:rounded-lg"
                    style={{
                      background: `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)), ${c.color || "#36577d"}`,
                      boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.03), 0 0 10px color-mix(in srgb, ${c.glow || "#4d78a8"} 20%, transparent), 0 6px 14px rgba(0,0,0,0.24)`,
                      border: `1px solid color-mix(in srgb, ${c.glow || "#4d78a8"} 65%, #d7e4ff 12%)`,
                    }}
                  >
                    <div className="mb-2 w-full text-center text-[8px] font-bold leading-none text-[#eef3fc]/80 sm:mb-1.5 sm:text-[9px]">
                      {c.number}
                    </div>
                    <div className="mt-0 w-full text-center text-[20px] font-bold leading-none text-white/95 sm:text-[22px]">{c.symbol}</div>
                  </button>
                ))}
              </div>
            )}

            <div id="loader-overlay" className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0b0c10]/82">
              <div className="mt-3.5 text-sm text-[#e9ecf1]">Loading Model...</div>
              <div className="mt-3 h-2.5 w-[min(240px,70%)] overflow-hidden rounded-full border border-white/10 bg-white/10">
                <div
                  id="loader-progress-bar"
                  className="h-full w-0 rounded-full bg-gradient-to-r from-sky-300 to-cyan-400 transition-[width] duration-150 ease-out"
                ></div>
              </div>
              <div id="loader-progress-label" className="mt-2 text-xs text-[#aab2c0]">
                0%
              </div>
            </div>

            <canvas ref={canvasRef} id="c" className="block h-full w-full touch-none select-none"></canvas>
          </div>

          <aside className="hidden flex-col overflow-y-auto border-l border-[rgba(255,255,255,0.1)] bg-[#12141c] p-4 lg:flex">
            {/* 1. Title */}
            <h2 className="mb-2 text-lg font-bold">{model.name}</h2>

            {/* 2. Tags */}
            {model.tags && model.tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {model.tags.map((t) => (
                  <span key={t} className="rounded-full border border-[rgba(255,255,255,0.1)] bg-white/5 px-2.5 py-1 text-xs text-[#aab2c0]">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* 3. Author / Dimensions / Location */}
            <div className="mt-2 flex flex-col gap-2 border-t border-[rgba(255,255,255,0.1)] pt-3">
              {model.author && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#aab2c0]">Author</span>
                  <span>{model.author}</span>
                </div>
              )}
              {model.dimensions && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#aab2c0]">Dimensions</span>
                  <span>{model.dimensions}</span>
                </div>
              )}
              {model.location?.label && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#aab2c0]">Location</span>
                  <span className="text-right">{model.location.label}</span>
                </div>
              )}
            </div>

            {/* 4. Globe View */}
            <Globe allModels={models} currentModel={model} />

            {/* 5. Date / Software / Polygons */}
            <div className="mb-3 flex flex-col gap-2 border-t border-[rgba(255,255,255,0.1)] pt-3">
              {model.date && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#aab2c0]">Date</span>
                  <span>{model.date}</span>
                </div>
              )}
              {model.software && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#aab2c0]">Software</span>
                  <span>{model.software}</span>
                </div>
              )}
              {model.polycount !== undefined && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#aab2c0]">Polygons</span>
                  <span>{model.polycount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* 6. Download Button */}
            {plySrc && (
              <a
                href={plySrc}
                download={plySrc.split("/").pop()}
                className="mx-auto mb-4 block w-fit rounded-lg border border-white/40 bg-transparent px-4 py-2 text-[13px] text-white underline underline-offset-[10px] transition-all duration-200 hover:border-white hover:bg-white/5 hover:no-underline"
              >
                Download Model
              </a>
            )}

            {/* 7. Description */}
            <div className="mt-1 rounded-xl border border-[rgba(255,255,255,0.1)] bg-white/5 p-3">
              <div className="mb-2 text-xs text-[#aab2c0]">Description</div>
              <p className="m-0 text-[13px] leading-[1.45] text-[#e9ecf1]">{model.description || "No description available."}</p>
            </div>
          </aside>
        </main>
      </div>

      <PeriodicTableModal activeSymbol={activeElement} onClose={() => setActiveElement(null)} />
    </div>
  );
}
