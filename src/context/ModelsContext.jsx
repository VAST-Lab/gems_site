import { createContext, useContext, useState, useEffect } from "react";

const ModelsContext = createContext();

export function ModelsProvider({ children }) {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState(new Set());

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch("/models.json");
        const data = await response.json();
        setModels(data || []);
      } catch (error) {
        console.error("Error fetching models:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchModels();
  }, []);

  const toggleTag = (tag) => {
    setActiveTags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) newSet.delete(tag);
      else newSet.add(tag);
      return newSet;
    });
  };

  const clearTags = () => setActiveTags(new Set());

  return (
    <ModelsContext.Provider
      value={{
        models,
        isLoading,
        query,
        setQuery,
        activeTags,
        toggleTag,
        clearTags,
      }}
    >
      {children}
    </ModelsContext.Provider>
  );
}

export const useModels = () => useContext(ModelsContext);
