export function initSidebar() {
  const sidebarHTML = `
    <div class="sb-brand">GemScan Library</div>
    <nav class="sb-nav">
      <a class="sb-item" href="index.html" data-page="index.html">Explore</a>
      <a class="sb-item" href="search.html" data-page="search.html">Search</a>
      <a class="sb-item" href="vault.html" data-page="vault.html">The Vault</a>
      <a class="sb-item" href="convert.html" data-page="convert.html">Convert</a>
      <a class="sb-item" href="directions.html" data-page="directions.html">Directions</a>
      <a class="sb-item" href="order-disclosure.html" data-page="order-disclosure.html">Order Disclosure</a>
    </nav>
    <div class="sb-footer muted">Tip: add models in<br><code>assets/models</code></div>
  `;

  const sidebarEl = document.createElement('aside');
  sidebarEl.className = 'sidebar';
  sidebarEl.innerHTML = sidebarHTML;

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = sidebarEl.querySelectorAll('.sb-item');
  
  links.forEach(link => {
    if (link.dataset.page === currentPath) {
      link.classList.add('sb-item-on');
    }
  });

  const shell = document.querySelector('.shell');
  if (shell) {
    shell.prepend(sidebarEl);
  }
}