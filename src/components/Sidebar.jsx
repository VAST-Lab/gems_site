import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const navItems = [
    { path: "/", label: "Explore" },
    { path: "/search", label: "Search" },
    { path: "/vault", label: "The Vault" },
    { path: "/convert", label: "Convert" },
    { path: "/directions", label: "Directions" },
    { path: "/order-disclosure", label: "Order Disclosure" },
  ];

  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-[#0b0c10]/92 p-4 backdrop-blur-md lg:flex">
      <div className="mx-[6px] mb-3.5 mt-1 font-extrabold tracking-[0.2px]">GemScan Library</div>
      <nav className="flex flex-col gap-2 px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block rounded-xl border p-2.5 opacity-90 text-text no-underline hover:border-border2 hover:bg-white/5 hover:opacity-100 ${
                isActive ? "border-border2 bg-white/5 opacity-100" : "border-transparent"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-2 text-xs leading-[1.35] text-muted">
        Tip: add models in
        <br />
        <code className="font-mono">assets/models</code>
      </div>
    </aside>
  );
}
