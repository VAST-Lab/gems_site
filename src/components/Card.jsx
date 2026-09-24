import { Link } from "react-router-dom";

export default function Card({ model }) {
  const hasSrc = model.src && (Array.isArray(model.src) ? model.src.length > 0 : model.src.trim() !== "");
  const thumb = model.thumb?.trim();
  const thumbUrl = thumb.startsWith("http") ? thumb : import.meta.env.BASE_URL + `assets/${thumb}`;
  const firstSrc = Array.isArray(model.src) ? model.src[0] : model.src;
  const isGltf = !firstSrc?.toLowerCase().match(/\.(ply|spz|splat|ksplat|sog)$/) && firstSrc?.toLowerCase().match(/\.(glb\vert{}gltf)$/);

  const badgeContent = model.badgeColor ? (
    <div className="absolute right-2 top-2 z-10 grid h-[22px] w-[22px] grid-cols-2 gap-[3px] rounded-md bg-black/45 p-1">
      <span className="block rounded-[1.5px]" style={{ background: model.badgeColor }}></span>
      <span className="block rounded-[1.5px]" style={{ background: model.badgeColor }}></span>
      <span className="block rounded-[1.5px]" style={{ background: model.badgeColor }}></span>
      <span className="block rounded-[1.5px]" style={{ background: model.badgeColor }}></span>
    </div>
  ) : null;

  const thumbMarkup = thumb ? (
    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-card">
      {badgeContent}
      <img
        src={thumbUrl}
        alt={model.name}
        loading="lazy"
        className="block aspect-square w-full scale-[0.88] object-contain object-center"
        style={{
          background: "radial-gradient(circle at 30% 20%, #1a1f29, #0f1117)",
        }}
      />
    </div>
  ) : isGltf ? (
    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-card">
      {badgeContent}
      <canvas className="thumb3d block h-full w-full" data-src={firstSrc}></canvas>
    </div>
  ) : (
    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-card">
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
          <div className="text-muted mt-1.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-[1.35]">
            {model.description}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/viewer/${model.id}`}
      className="block overflow-hidden rounded-2xl border border-border bg-white/2 text-inherit no-underline transition-all duration-150 hover:-translate-y-0.5 hover:border-border2"
    >
      {thumbMarkup}
      <div className="p-3 pb-3.5">
        <div className="font-bold">{model.name}</div>
        <div className="text-muted mt-1.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-[1.35]">{model.description}</div>
        {model.tags && model.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {model.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-muted rounded-full border border-border bg-white/5 px-2 py-1 text-[11px]">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
