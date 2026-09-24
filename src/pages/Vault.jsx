import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Card from "../components/Card";

export default function Vault() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const [vaultModels, setVaultModels] = useState([]);

  const fetchVaultData = async () => {
    // 1. Fetch from Database
    const { data: modelsData, error: dbError } = await supabase.from("models").select("*");

    if (dbError) {
      console.error("Database 403 Error:", dbError.message);
      return;
    }

    // 2. Fetch from Storage
    const modelsWithThumbs = await Promise.all(
      modelsData.map(async (m) => {
        if (m.thumb) {
          const { data, error: storageError } = await supabase.storage.from("vault").createSignedUrl(m.thumb, 3600);

          if (storageError) {
            console.error("Storage 403 Error for", m.thumb, ":", storageError.message);
            return m;
          }
          return { ...m, thumb: data?.signedUrl || m.thumb };
        }
        return m;
      }),
    );

    setVaultModels(modelsWithThumbs);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsChecking(false);
    });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: "vault@gemscans.com",
      password: password,
    });

    if (error) {
      setError("Incorrect vault password.");
    } else {
      setIsAuthenticated(true);
      fetchVaultData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  if (isChecking) return null;

  if (!isAuthenticated) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <h1 className="mb-6 text-2xl font-semibold text-white">Restricted Access</h1>
        <form onSubmit={handleLogin} className="flex w-full max-w-sm flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Vault Password"
            className="rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/60"
          />
          <button type="submit" className="rounded-lg bg-white/10 px-4 py-3 font-medium text-white transition-colors hover:bg-white/20">
            Unlock Vault
          </button>
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Vault Records</h1>
        <button onClick={handleLogout} className="text-sm text-white/60 hover:text-white transition-colors">
          Lock Vault
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
        {vaultModels.length > 0 ? vaultModels.map((m) => <Card key={m.id} model={m} />) : <div className="text-white/50">No vault models found.</div>}
      </div>
    </section>
  );
}
