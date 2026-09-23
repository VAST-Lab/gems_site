import { useModels } from "../context/ModelsContext";

export default function Topbar() {
  const { query, setQuery } = useModels();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3.5 border-b border-border bg-[#0b0c10]/86 px-6 py-4 backdrop-blur-md">
      <div className="flex items-center">
        <img src={`${import.meta.env.BASE_URL}assets/img/GemScan.logo.PNG`} alt="GEMSCANS" className="block h-[84px] w-auto object-contain" />
      </div>
      <div className="flex items-center">
        <input
          type="text"
          id="search"
          className="w-[min(350px,40vw)] rounded-xl border border-border bg-white/5 px-4 py-3 text-base text-text outline-none focus:border-border2"
          placeholder="Search models, tags, author…"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    </header>
  );
}
