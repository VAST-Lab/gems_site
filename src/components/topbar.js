export function initTopbar() {
    const topbarHTML = `
    <div class="topbar-left">
      <img src="/public/assets/img/GemScan.logo.png" class="header-logo" alt="GEMSCANS" />
    </div>
    <div class="topbar-right">
      <input id="search" class="search" placeholder="Search models, tags, author…" autocomplete="off" />
    </div>
  `;

    const topbarEl = document.createElement('header');
    topbarEl.className = 'topbar';
    topbarEl.innerHTML = topbarHTML;

    const contentDiv = document.querySelector('.content');
    if (contentDiv) {
        contentDiv.prepend(topbarEl);
    }
}