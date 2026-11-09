import { useState, useEffect } from "react";
import { useModels } from "../context/ModelsContext";
import Card from "../components/Card";

export default function Vault() {
  const { models } = useModels();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vaultModels, setVaultModels] = useState([]);

  useEffect(() => {
    if (isAuthenticated && models) {
      const preciousGems = models.filter(m => m.badgeColor);
      setVaultModels(preciousGems.map(m => ({ ...m, isVault: true })));
    }
  }, [isAuthenticated, models]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    setTimeout(() => {
      if (username === "admin" && password === "admin") {
        setIsAuthenticated(true);
      } else {
        setError("Invalid login credentials. Try admin / password123");
      }
      setLoading(false);
    }, 600);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setVaultModels([]);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-[400px] rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#0b0c10] p-8 shadow-2xl">
          <h1 className="mb-2 text-center text-2xl font-bold tracking-wide text-[#00cfcf]">
            Vault Access
          </h1>
          <p className="mb-8 text-center text-sm text-[#aab2c0]">
            Enter credentials to view protected gems.<br/>
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#e9ecf1]">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 w-full rounded border border-white/20 bg-black/40 px-3 text-[#e9ecf1] outline-none transition-colors focus:border-[#00cfcf]"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#e9ecf1]">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded border border-white/20 bg-black/40 px-3 text-[#e9ecf1] outline-none transition-colors focus:border-[#00cfcf]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-center text-xs font-medium text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 cursor-pointer rounded bg-[#00cfcf] px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-cyan-300 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Unlock Vault"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="m-0 text-[clamp(24px,3vw,36px)] font-bold leading-tight tracking-tight text-[#e9ecf1]">
            The Vault
          </h1>
          <p className="mt-2 max-w-[600px] text-sm text-[#aab2c0]">
            Secure collection of high-resolution diamond and precious gem scans.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="cursor-pointer rounded border border-white/20 bg-black/40 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
        >
          Lock Vault
        </button>
      </div>

      {vaultModels.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:gap-6">
          {vaultModels.map((model) => (
            <Card key={model.id} model={model} />
          ))}
        </div>
      ) : (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="text-[#aab2c0]">The vault is currently empty.</div>
        </div>
      )}
    </div>
  );
}