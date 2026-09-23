// ─── PERIODIC TABLE  ──────────────────────────────────────────
const PERIODIC_TABLE = [
    { number: 1, symbol: "H", category: "nonmetal", row: 1, col: 1 },
    { number: 2, symbol: "He", category: "noble", row: 1, col: 18 },
    { number: 3, symbol: "Li", category: "alkali", row: 2, col: 1 },
    { number: 4, symbol: "Be", category: "alkaline", row: 2, col: 2 },
    { number: 5, symbol: "B", category: "metalloid", row: 2, col: 13 },
    { number: 6, symbol: "C", category: "nonmetal", row: 2, col: 14 },
    { number: 7, symbol: "N", category: "nonmetal", row: 2, col: 15 },
    { number: 8, symbol: "O", category: "nonmetal", row: 2, col: 16 },
    { number: 9, symbol: "F", category: "nonmetal", row: 2, col: 17 },
    { number: 10, symbol: "Ne", category: "noble", row: 2, col: 18 },
    { number: 11, symbol: "Na", category: "alkali", row: 3, col: 1 },
    { number: 12, symbol: "Mg", category: "alkaline", row: 3, col: 2 },
    { number: 13, symbol: "Al", category: "post", row: 3, col: 13 },
    { number: 14, symbol: "Si", category: "metalloid", row: 3, col: 14 },
    { number: 15, symbol: "P", category: "nonmetal", row: 3, col: 15 },
    { number: 16, symbol: "S", category: "nonmetal", row: 3, col: 16 },
    { number: 17, symbol: "Cl", category: "nonmetal", row: 3, col: 17 },
    { number: 18, symbol: "Ar", category: "noble", row: 3, col: 18 },
    { number: 19, symbol: "K", category: "alkali", row: 4, col: 1 },
    { number: 20, symbol: "Ca", category: "alkaline", row: 4, col: 2 },
    { number: 21, symbol: "Sc", category: "transition", row: 4, col: 3 },
    { number: 22, symbol: "Ti", category: "transition", row: 4, col: 4 },
    { number: 23, symbol: "V", category: "transition", row: 4, col: 5 },
    { number: 24, symbol: "Cr", category: "transition", row: 4, col: 6 },
    { number: 25, symbol: "Mn", category: "transition", row: 4, col: 7 },
    { number: 26, symbol: "Fe", category: "transition", row: 4, col: 8 },
    { number: 27, symbol: "Co", category: "transition", row: 4, col: 9 },
    { number: 28, symbol: "Ni", category: "transition", row: 4, col: 10 },
    { number: 29, symbol: "Cu", category: "transition", row: 4, col: 11 },
    { number: 30, symbol: "Zn", category: "transition", row: 4, col: 12 },
    { number: 31, symbol: "Ga", category: "post", row: 4, col: 13 },
    { number: 32, symbol: "Ge", category: "metalloid", row: 4, col: 14 },
    { number: 33, symbol: "As", category: "metalloid", row: 4, col: 15 },
    { number: 34, symbol: "Se", category: "nonmetal", row: 4, col: 16 },
    { number: 35, symbol: "Br", category: "nonmetal", row: 4, col: 17 },
    { number: 36, symbol: "Kr", category: "noble", row: 4, col: 18 },
    { number: 37, symbol: "Rb", category: "alkali", row: 5, col: 1 },
    { number: 38, symbol: "Sr", category: "alkaline", row: 5, col: 2 },
    { number: 39, symbol: "Y", category: "transition", row: 5, col: 3 },
    { number: 40, symbol: "Zr", category: "transition", row: 5, col: 4 },
    { number: 41, symbol: "Nb", category: "transition", row: 5, col: 5 },
    { number: 42, symbol: "Mo", category: "transition", row: 5, col: 6 },
    { number: 43, symbol: "Tc", category: "transition", row: 5, col: 7 },
    { number: 44, symbol: "Ru", category: "transition", row: 5, col: 8 },
    { number: 45, symbol: "Rh", category: "transition", row: 5, col: 9 },
    { number: 46, symbol: "Pd", category: "transition", row: 5, col: 10 },
    { number: 47, symbol: "Ag", category: "transition", row: 5, col: 11 },
    { number: 48, symbol: "Cd", category: "transition", row: 5, col: 12 },
    { number: 49, symbol: "In", category: "post", row: 5, col: 13 },
    { number: 50, symbol: "Sn", category: "post", row: 5, col: 14 },
    { number: 51, symbol: "Sb", category: "metalloid", row: 5, col: 15 },
    { number: 52, symbol: "Te", category: "metalloid", row: 5, col: 16 },
    { number: 53, symbol: "I", category: "nonmetal", row: 5, col: 17 },
    { number: 54, symbol: "Xe", category: "noble", row: 5, col: 18 },
    { number: 55, symbol: "Cs", category: "alkali", row: 6, col: 1 },
    { number: 56, symbol: "Ba", category: "alkaline", row: 6, col: 2 },
    { number: 57, symbol: "La", category: "lanthanide", row: 8, col: 3 },
    { number: 58, symbol: "Ce", category: "lanthanide", row: 8, col: 4 },
    { number: 59, symbol: "Pr", category: "lanthanide", row: 8, col: 5 },
    { number: 60, symbol: "Nd", category: "lanthanide", row: 8, col: 6 },
    { number: 61, symbol: "Pm", category: "lanthanide", row: 8, col: 7 },
    { number: 62, symbol: "Sm", category: "lanthanide", row: 8, col: 8 },
    { number: 63, symbol: "Eu", category: "lanthanide", row: 8, col: 9 },
    { number: 64, symbol: "Gd", category: "lanthanide", row: 8, col: 10 },
    { number: 65, symbol: "Tb", category: "lanthanide", row: 8, col: 11 },
    { number: 66, symbol: "Dy", category: "lanthanide", row: 8, col: 12 },
    { number: 67, symbol: "Ho", category: "lanthanide", row: 8, col: 13 },
    { number: 68, symbol: "Er", category: "lanthanide", row: 8, col: 14 },
    { number: 69, symbol: "Tm", category: "lanthanide", row: 8, col: 15 },
    { number: 70, symbol: "Yb", category: "lanthanide", row: 8, col: 16 },
    { number: 71, symbol: "Lu", category: "lanthanide", row: 8, col: 17 },
    { number: 72, symbol: "Hf", category: "transition", row: 6, col: 4 },
    { number: 73, symbol: "Ta", category: "transition", row: 6, col: 5 },
    { number: 74, symbol: "W", category: "transition", row: 6, col: 6 },
    { number: 75, symbol: "Re", category: "transition", row: 6, col: 7 },
    { number: 76, symbol: "Os", category: "transition", row: 6, col: 8 },
    { number: 77, symbol: "Ir", category: "transition", row: 6, col: 9 },
    { number: 78, symbol: "Pt", category: "transition", row: 6, col: 10 },
    { number: 79, symbol: "Au", category: "transition", row: 6, col: 11 },
    { number: 80, symbol: "Hg", category: "transition", row: 6, col: 12 },
    { number: 81, symbol: "Tl", category: "post", row: 6, col: 13 },
    { number: 82, symbol: "Pb", category: "post", row: 6, col: 14 },
    { number: 83, symbol: "Bi", category: "post", row: 6, col: 15 },
    { number: 84, symbol: "Po", category: "post", row: 6, col: 16 },
    { number: 85, symbol: "At", category: "nonmetal", row: 6, col: 17 },
    { number: 86, symbol: "Rn", category: "noble", row: 6, col: 18 },
    { number: 87, symbol: "Fr", category: "alkali", row: 7, col: 1 },
    { number: 88, symbol: "Ra", category: "alkaline", row: 7, col: 2 },
    { number: 89, symbol: "Ac", category: "actinide", row: 9, col: 3 },
    { number: 90, symbol: "Th", category: "actinide", row: 9, col: 4 },
    { number: 91, symbol: "Pa", category: "actinide", row: 9, col: 5 },
    { number: 92, symbol: "U", category: "actinide", row: 9, col: 6 }
];

const CATEGORY_COLORS = {
    alkali: "#8f3b3b",
    alkaline: "#8a6335",
    transition: "#8d7740",
    post: "#4d7f65",
    metalloid: "#336b77",
    nonmetal: "#45698f",
    noble: "#5d4a8c",
    lanthanide: "#6d5a86",
    actinide: "#754d5f"
};

export function initPeriodicTable() {
    document.getElementById("ptableClose")?.addEventListener("click", closePeriodicTable);
    document.getElementById("ptableOverlay")?.addEventListener("click", (e) => {
        if (e.target.id === "ptableOverlay") closePeriodicTable();
    });
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closePeriodicTable();
    });
}

export function openPeriodicTable(activeSymbol) {
    const overlay = document.getElementById("ptableOverlay");
    const grid = document.getElementById("ptableGrid");
    if (!overlay || !grid) return;

    grid.innerHTML = "";

    for (let row = 1; row <= 9; row++) {
        for (let col = 1; col <= 18; col++) {
            const cell = PERIODIC_TABLE.find((el) => el.row === row && el.col === col);
            const div = document.createElement("div");

            if (!cell) {
                div.className = "ptable-cell empty";
                grid.appendChild(div);
                continue;
            }

            div.className = "ptable-cell";
            if (cell.symbol === activeSymbol) {
                div.classList.add("active");
            }
            else if (activeSymbol) {
                div.classList.add("dimmed");
            }
            div.style.background = CATEGORY_COLORS[cell.category] ?? "#3f4d63";
            div.innerHTML = `
        <div class="ptable-num">${cell.number}</div>
        <div class="ptable-sym">${cell.symbol}</div>
      `;
            grid.appendChild(div);
        }
    }

    overlay.hidden = false;
    document.body.style.overflow = "hidden";
}

export function closePeriodicTable() {
    const overlay = document.getElementById("ptableOverlay");
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
}