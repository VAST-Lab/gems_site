export default function Chip({ label, isOn, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-2.5 py-1.5 text-xs text-text ${isOn ? "border-border2 bg-chip-on" : "border-border bg-chip"}`}
    >
      {label}
    </button>
  );
}
