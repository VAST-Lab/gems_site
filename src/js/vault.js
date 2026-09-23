document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("vault-form");
    const passwordInput = document.getElementById("vault-password");
    const loginContainer = document.getElementById("vault-login");
    const vaultContent = document.getElementById("vault-content");
    const errorMsg = document.getElementById("vault-error");

    // Temporary client-side password
    const VAULT_PASSWORD = "vast";

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (passwordInput.value === VAULT_PASSWORD) {
            loginContainer.style.display = "none";
            vaultContent.style.display = "block";

            loadVaultModels();
        } else {
            errorMsg.style.display = "block";
            passwordInput.value = "";
        }
    });

    async function loadVaultModels() {
        try {
            // TODO: Check with database or external password container
            const res = await fetch("../../public/models.json", { cache: "no-store" });
            if (!res.ok) throw new Error("Could not load vault data");

            const models = await res.json();

            const grid = document.getElementById("grid");
            if (grid) {
                grid.innerHTML = `<div class="muted">Vault models successfully loaded. (Grid render logic goes here)</div>`;
            }
        } catch (error) {
            console.error("Vault load error:", error);
        }
    }
});