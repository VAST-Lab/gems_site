import { useState } from "react";
import { useModels } from "../context/ModelsContext";
import Card from "../components/Card";

export default function Vault() {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const { models } = useModels();

  const handleUnlock = (e) => {
    e.preventDefault();
    if (password === "vast") {
      setIsUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setPassword("");
    }
  };

  if (!isUnlocked) {
    return (
      <div className="mx-auto mt-[100px] max-w-[400px] rounded-2xl border border-[rgba(255,255,255,0.1)] bg-white/5 p-8 text-center">
        <h2 className="mt-0 text-2xl font-bold">Protected Vault</h2>
        <p className="mt-2 text-sm text-[#aab2c0]">Enter the password to access restricted specimens.</p>
        <form onSubmit={handleUnlock} className="mt-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-white/5 p-3 text-[#e9ecf1] outline-none focus:border-[rgba(255,255,255,0.16)]"
            placeholder="Password"
            required
            autoFocus
          />
          <button type="submit" className="w-full rounded-xl bg-[#6b3a97] p-3 font-bold text-white transition-all hover:brightness-110">
            Unlock
          </button>
          {error && <div className="mt-2.5 text-[13px] text-[#ff6b6b]">Incorrect password.</div>}
        </form>
      </div>
    );
  }

  // Temporary filtering for vault-specific models if needed; currently renders all for demonstration
  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-12 pt-6">
      <section className="mb-6">
        <h1 className="my-4 text-[clamp(30px,3.8vw,46px)] font-extrabold leading-tight tracking-tight">The Vault</h1>
        <p className="m-0 max-w-[72ch] text-[15px] leading-relaxed text-[#aab2c0]">Exclusive, password-protected mineral catalog.</p>
      </section>
      <section className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
        {models.map((m) => (
          <Card key={m.id} model={m} />
        ))}
      </section>
    </div>
  );
}
