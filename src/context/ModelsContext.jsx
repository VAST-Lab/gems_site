import { createContext, useContext, useState, useEffect } from "react";

const ModelsContext = createContext(null);

export function ModelsProvider({ children }) {
  const [models, setModels] = useState([]);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch(import.meta.env.BASE_URL + "models.json", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Could not load models.json");
        const data = await res.json();
        setModels(data);
      } catch (error) {
        console.error("Failed to load models:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchModels();
  }, []);

  const toggleTag = (tag) => {
    setActiveTags((prev) => {
      const newTags = new Set(prev);
      if (newTags.has(tag)) {
        newTags.delete(tag);
      } else {
        newTags.add(tag);
      }
      return newTags;
    });
  };

  const clearTags = () => setActiveTags(new Set());

  return (
    <ModelsContext.Provider
      value={{
        models,
        query,
        setQuery,
        activeTags,
        toggleTag,
        clearTags,
        isLoading,
      }}
    >
      {children}
    </ModelsContext.Provider>
  );
}

export function useModels() {
  return useContext(ModelsContext);
}
