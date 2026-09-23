import { useMemo } from "react";
import { useModels } from "../context/ModelsContext";
import Chip from "../components/Chip";
import Card from "../components/Card";

export default function Home() {
  const { models, query, activeTags, toggleTag, clearTags, isLoading } = useModels();

  const allTags = useMemo(() => {
    const s = new Set();
    for (const m of models) {
      for (const t of m.tags || []) s.add(t);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [models]);

  const filteredModels = useMemo(() => {
    const q = (query || "").toLowerCase().trim();
    const active = [...activeTags];

    return models.filter((m) => {
      const hay = [m.name, m.description, m.author, m.software, ...(m.tags || [])].map((v) => (v || "").toString().toLowerCase().trim()).join(" ");

      const passesQuery = !q || hay.includes(q);
      const modelTags = new Set((m.tags || []).map((t) => t.toLowerCase().trim()));
      const passesTags = active.length === 0 || active.every((t) => modelTags.has(t.toLowerCase().trim()));

      return passesQuery && passesTags;
    });
  }, [models, query, activeTags]);

  if (isLoading) {
    return <div className="text-muted">Loading models...</div>;
  }

  return (
    <>
      <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-white/2 p-3">
        <div className="flex items-start gap-3">
          <div className="text-muted w-[70px] pt-1.5 text-xs">Tags</div>
          <div className="flex flex-wrap gap-2">
            <Chip label="All" isOn={activeTags.size === 0} onClick={clearTags} />
            {allTags.map((tag) => (
              <Chip key={tag} label={tag} isOn={activeTags.has(tag)} onClick={() => toggleTag(tag)} />
            ))}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-muted w-[70px] pt-1.5 text-xs">Results</div>
          <div className="text-muted">
            {filteredModels.length} / {models.length}
          </div>
        </div>
      </section>
      <section className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
        {filteredModels.length > 0 ? filteredModels.map((m) => <Card key={m.id} model={m} />) : <div className="text-muted">No results.</div>}
      </section>
    </>
  );
}
