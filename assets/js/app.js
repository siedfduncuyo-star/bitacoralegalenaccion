(() => {
  const DATA = window.BITACORA_PUBLICACIONES || [];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const normalize = (value = '') => value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñü\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const searchInput = $('#searchInput');
  const results = $('#results');
  const resultCount = $('#resultCount');
  const emptyState = $('#emptyState');
  const loadMore = $('#loadMore');
  const categoryGrid = $('#categoryGrid');
  const categoryCount = $('#categoryCount');
  const catalog = $('#catalogo');
  let visibleCount = 12;
  let selectedCategory = '';

  if (!searchInput || !results || !resultCount || !emptyState || !loadMore || !categoryGrid) {
    console.error('Bitácora: faltan elementos necesarios para iniciar el catálogo.');
    return;
  }

  const allAreas = [...new Set(DATA.flatMap(publication => publication.areas || []))]
    .sort((a, b) => a.localeCompare(b, 'es'));

  const counts = new Map(
    allAreas.map(area => [area, DATA.filter(publication => (publication.areas || []).includes(area)).length])
  );

  categoryCount.textContent = `${allAreas.length} categorías con publicaciones`;
  categoryGrid.innerHTML = allAreas.map(area => {
    const count = counts.get(area);
    return `
      <button class="category-card" type="button" data-area="${escapeAttr(area)}" aria-label="Buscar publicaciones de ${escapeAttr(area)}">
        <div>
          <span class="category-mark" aria-hidden="true"></span>
          <strong>${escapeHtml(area)}</strong>
        </div>
        <small>${count} ${count === 1 ? 'publicación' : 'publicaciones'} →</small>
      </button>`;
  }).join('');

  function getSearchTerms() {
    return normalize(searchInput.value).split(' ').filter(Boolean);
  }

  function filteredData() {
    const terms = getSearchTerms();
    const items = DATA.filter(publication => {
      if (selectedCategory && !(publication.areas || []).includes(selectedCategory)) return false;
      if (!terms.length) return true;
      const haystack = normalize([
        publication.title,
        ...(publication.authors || []),
        ...(publication.areas || []),
        publication.year || '',
        publication.excerpt || '',
        publication.searchText || ''
      ].join(' '));
      return terms.every(term => haystack.includes(term));
    });

    return items.sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }

  function render(reset = false) {
    if (reset) visibleCount = 12;
    const items = filteredData();
    const shown = items.slice(0, visibleCount);

    resultCount.textContent = selectedCategory
      ? `${items.length} ${items.length === 1 ? 'publicación' : 'publicaciones'} en ${selectedCategory}`
      : `${items.length} ${items.length === 1 ? 'publicación' : 'publicaciones'}`;
    emptyState.hidden = items.length !== 0;

    results.innerHTML = shown.map(publication => `
      <article class="result-item">
        <div>
          <h3><a href="${escapeAttr(publication.localUrl)}">${escapeHtml(publication.title)}</a></h3>
          <div class="result-meta">
            ${(publication.areas || []).map(area => `<span class="category-chip">${escapeHtml(area)}</span>`).join('')}
            ${publication.year ? `<span class="year-chip">${escapeHtml(publication.year)}</span>` : ''}
          </div>
        </div>
        <div class="author-block">
          <span>${(publication.authors || []).length > 1 ? 'Autores/as' : 'Autor/a'}</span>
          ${(publication.authors || []).map(author => `<strong class="author-name">${escapeHtml(author)}</strong>`).join('')}
        </div>
        <a class="open-link" href="${escapeAttr(publication.localUrl)}" aria-label="Abrir ${escapeAttr(publication.title)}">↗</a>
      </article>`).join('');

    loadMore.hidden = visibleCount >= items.length || items.length === 0;
    updateCategoryState();
  }

  function updateCategoryState() {
    $$('.category-card').forEach(button => {
      const selected = selectedCategory === button.dataset.area;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  searchInput.addEventListener('input', () => {
    selectedCategory = '';
    render(true);
  });
  searchInput.addEventListener('search', () => {
    selectedCategory = '';
    render(true);
  });

  loadMore.addEventListener('click', () => {
    visibleCount += 12;
    render(false);
  });

  $$('.category-card').forEach(button => button.addEventListener('click', () => {
    const area = button.dataset.area;
    selectedCategory = selectedCategory === area ? '' : area;
    searchInput.value = '';
    render(true);
    if (catalog) catalog.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  const menuButton = $('#menuButton');
  const mobileNav = $('#mobileNav');
  if (menuButton && mobileNav) {
    menuButton.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.textContent = open ? 'Cerrar' : 'Menú';
    });
    $$('#mobileNav a').forEach(link => link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.textContent = 'Menú';
    }));
  }

  document.addEventListener('keydown', event => {
    if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
      event.preventDefault();
      searchInput.focus();
    }
  });

  function escapeHtml(value = '') {
    return value.toString().replace(/[&<>"]/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[character]));
  }

  function escapeAttr(value = '') {
    return escapeHtml(value).replace(/'/g, '&#39;');
  }

  render(true);
})();
