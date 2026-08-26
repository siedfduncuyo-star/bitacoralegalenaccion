(() => {
  const DATA = window.BITACORA_PUBLICACIONES || [];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const ALL_CATEGORIES = [
    'Derecho Administrativo',
    'Derecho Civil y Comercial',
    'Derecho Constitucional',
    'Derecho de Familia y Sucesorio',
    'Derecho de los Recursos Naturales, Aguas; y Protección del Medio Ambiente',
    'Derecho del Consumidor y Defensa de la Competencia',
    'Derecho del Trabajo y la Seguridad Social',
    'Derecho Informático',
    'Derecho Internacional',
    'Derecho Penal',
    'Derecho Político',
    'Derecho Procesal',
    'Derecho Registral y Notarial',
    'Derechos Humanos',
    'Derechos Reales',
    'Enseñanza del Derecho',
    'Filosofía del Derecho',
    'Mediación',
    'Miscelánea',
    'Pluralismo Jurídico y Gobernanza',
    'Sociología del Derecho',
    'Tecnologías aplicadas al Derecho'
  ].sort((a, b) => a.localeCompare(b, 'es'));

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

  let visibleCount = 12;
  let selectedCategory = '';
  let searchTimer = null;

  if (!searchInput || !results || !resultCount || !emptyState || !loadMore || !categoryGrid) {
    console.error('Bitácora: faltan elementos necesarios para iniciar el catálogo.');
    return;
  }

  // Prepara una sola vez el texto de búsqueda. Evita normalizar artículos completos
  // en cada tecla y hace que el buscador sea mucho más rápido en celular.
  const INDEXED_DATA = DATA.map(publication => ({
    ...publication,
    _searchKey: normalize([
      publication.title,
      ...(publication.authors || []),
      ...(publication.areas || []),
      publication.year || '',
      publication.excerpt || '',
      publication.searchText || ''
    ].join(' '))
  }));

  const counts = new Map(
    ALL_CATEGORIES.map(area => [
      area,
      DATA.filter(publication => (publication.areas || []).includes(area)).length
    ])
  );

  categoryCount.textContent = `${ALL_CATEGORIES.length} categorías`;
  categoryGrid.innerHTML = ALL_CATEGORIES.map(area => {
    const count = counts.get(area) || 0;
    return `
      <button class="category-card" type="button" data-area="${escapeAttr(area)}" aria-label="Mostrar publicaciones de ${escapeAttr(area)}" aria-pressed="false">
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
    return INDEXED_DATA
      .filter(publication => {
        if (selectedCategory && !(publication.areas || []).includes(selectedCategory)) return false;
        if (!terms.length) return true;
        return terms.every(term => publication._searchKey.includes(term));
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }

  function render(reset = false) {
    if (reset) visibleCount = 12;
    const items = filteredData();
    const shown = items.slice(0, visibleCount);

    if (selectedCategory) {
      resultCount.textContent = `${selectedCategory} · ${items.length} ${items.length === 1 ? 'publicación' : 'publicaciones'}`;
    } else if (getSearchTerms().length) {
      resultCount.textContent = `${items.length} ${items.length === 1 ? 'resultado' : 'resultados'}`;
    } else {
      resultCount.textContent = `${items.length} ${items.length === 1 ? 'publicación' : 'publicaciones'}`;
    }

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

  // Búsqueda libre: al escribir, se quita cualquier categoría seleccionada.
  searchInput.addEventListener('input', () => {
    selectedCategory = '';
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => render(true), 90);
  });

  searchInput.addEventListener('search', () => {
    selectedCategory = '';
    render(true);
  });

  loadMore.addEventListener('click', () => {
    visibleCount += 12;
    render(false);
  });

  // Delegación de eventos: funciona aunque las categorías se generen dinámicamente.
  categoryGrid.addEventListener('click', (event) => {
    const button = event.target.closest('.category-card');
    if (!button) return;

    const area = button.dataset.area || '';
    selectedCategory = selectedCategory === area ? '' : area;
    searchInput.value = '';
    render(true);

    // Importante: NO hacemos scroll. El usuario permanece en la categoría elegida.
  });

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
