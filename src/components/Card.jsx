import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { initViewer } from "../js/viewer";

export default function Card({ model }) {
  const [isInteractive, setIsInteractive] = useState(false);
  const canvasRef = useRef(null);
  const appRef = useRef(null);

  const hasSrc = model.src && (Array.isArray(model.src) ? model.src.length > 0 : model.src.trim() !== "");
  const thumb = model.thumb?.trim();
  const thumbUrl = thumb.startsWith("http") ? thumb : import.meta.env.BASE_URL + `assets/${thumb}`;
  const firstSrc = Array.isArray(model.src) ? model.src[0] : model.src;
  const isGltf = !firstSrc?.toLowerCase().match(/\.(ply|spz|splat|ksplat|sog)$/) && firstSrc?.toLowerCase().match(/\.(glb|gltf)$/);

  useEffect(() => {
    if (isInteractive && canvasRef.current) {
      let isMounted = true;
      initViewer(model, canvasRef.current).then((app) => {
        if (isMounted) appRef.current = app;
        else app.destroy();
      });
      const timer = setTimeout(() => {
        setIsInteractive(false);
      }, 7500);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (appRef.current) appRef.current.destroy();
      };
    }
  }, [isInteractive, model]);

  const badgeContent = model.badgeColor ? (
    <div 
      className="absolute right-2 top-2 z-10 flex h-[28px] w-[28px] items-center justify-center rounded-full border border-white/20 bg-black/60 shadow-lg backdrop-blur-md"
      title="Precious Gem"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={model.badgeColor}
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[15px] w-[15px]"
        style={{ filter: `drop-shadow(0 0 4px ${model.badgeColor})` }}
      >
        <path d="M6 3h12l4 6-10 13L2 9Z" />
        <path d="M11 3 8 9l4 13 4-13-3-6" />
        <path d="M2 9h20" />
      </svg>
    </div>
  ) : null;

  const thumbMarkup = isInteractive ? (
    <div 
      className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-transparent"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full touch-none select-none outline-none"></canvas>
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsInteractive(false);
        }}
        className="absolute right-3 top-3 z-20 cursor-pointer rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-black/90"
      >
        ✕ Close
      </button>
    </div>
  ) : thumb ? (
    <div className="group relative flex aspect-square w-full items-center justify-center overflow-hidden bg-transparent">
      {badgeContent}
      <img
        src={thumbUrl}
        alt={model.name}
        loading="lazy"
        className="block aspect-square w-full scale-[0.88] object-contain object-center mix-blend-screen"
      />
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsInteractive(true);
        }}
        className="absolute bottom-3 right-3 z-20 cursor-pointer rounded-lg border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-bold text-white opacity-0 backdrop-blur-md transition-all hover:bg-black/90 group-hover:opacity-100"
      >
        ▶ Preview 3D
      </button>
    </div>
  ) : isGltf ? (
    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-transparent">
      {badgeContent}
      <canvas className="thumb3d block h-full w-full" data-src={firstSrc}></canvas>
    </div>
  ) : (
    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-transparent">
      {badgeContent}
      <div className="text-muted">SPLAT</div>
    </div>
  );

  if (!hasSrc) {
    return (
      <div className="block overflow-hidden rounded-2xl border border-border bg-white/2 opacity-60">
        {thumbMarkup}
        <div className="p-3 pb-3.5">
          <div className="font-bold">{model.name} (Unavailable)</div>
          <div className="mt-1.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-[1.35] text-muted">
            {model.description}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/viewer/${model.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-white/2 text-inherit no-underline transition-all duration-150 hover:-translate-y-0.5 hover:border-border2"
    >
      {thumbMarkup}
      <div className="p-3 pb-3.5">
        <div className="font-bold">{model.name}</div>
        <div className="mt-1.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-[1.35] text-muted">{model.description}</div>
        {model.tags && model.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {model.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full border border-border bg-white/5 px-2 py-1 text-[11px] text-muted">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}