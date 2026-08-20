(() => {
  const DATA = window.BITACORA_PUBLICACIONES || [];
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const normalize = (s='') => s.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  const searchInput = $('#searchInput');
  const areaFilter = $('#areaFilter');
  const authorFilter = $('#authorFilter');
  const sortFilter = $('#sortFilter');
  const results = $('#results');
  const resultCount = $('#resultCount');
  const emptyState = $('#emptyState');
  const loadMore = $('#loadMore');
  const activeFilter = $('#activeFilter');
  const clearFilters = $('#clearFilters');
  const categoryGrid = $('#categoryGrid');
  const categoryCount = $('#categoryCount');
  let visibleCount = 12;
  const params = new URLSearchParams(window.location.search);
  const initialArea = params.get('area');

  const allAreas = [...new Set(DATA.flatMap(p => p.areas))].sort((a,b)=>a.localeCompare(b,'es'));
  const allAuthors = [...new Set(DATA.flatMap(p => p.authors))].sort((a,b)=>a.localeCompare(b,'es'));

  allAreas.forEach(area => areaFilter.insertAdjacentHTML('beforeend', `<option value="${escapeAttr(area)}">${escapeHtml(area)}</option>`));
  allAuthors.forEach(author => authorFilter.insertAdjacentHTML('beforeend', `<option value="${escapeAttr(author)}">${escapeHtml(author)}</option>`));
  if(initialArea && allAreas.includes(initialArea)) areaFilter.value = initialArea;

  const counts = new Map(allAreas.map(a => [a, DATA.filter(p => p.areas.includes(a)).length]));
  categoryCount.textContent = `${allAreas.length} categorías con publicaciones`;
  categoryGrid.innerHTML = allAreas.map(area => {
    const count = counts.get(area);
    return `<button class="category-card" type="button" data-area="${escapeAttr(area)}"><div><span class="category-mark" aria-hidden="true"></span><strong>${escapeHtml(area)}</strong></div><small>${count} ${count === 1 ? 'publicación' : 'publicaciones'} →</small></button>`;
  }).join('');

  function filteredData(){
    const q = normalize(searchInput.value.trim());
    let items = DATA.filter(p => {
      const haystack = normalize([p.title, p.authors.join(' '), p.areas.join(' '), p.year || '', p.searchText || ''].join(' '));
      return (!q || haystack.includes(q)) &&
             (!areaFilter.value || p.areas.includes(areaFilter.value)) &&
             (!authorFilter.value || p.authors.includes(authorFilter.value));
    });
    if(sortFilter.value === 'title') items.sort((a,b)=>a.title.localeCompare(b.title,'es'));
    if(sortFilter.value === 'author') items.sort((a,b)=>(a.authors[0]||'').localeCompare(b.authors[0]||'','es'));
    if(sortFilter.value === 'area') items.sort((a,b)=>(a.areas[0]||'').localeCompare(b.areas[0]||'','es'));
    return items;
  }

  function render(reset=false){
    if(reset) visibleCount = 12;
    const items = filteredData();
    const shown = items.slice(0, visibleCount);
    resultCount.textContent = `${items.length} ${items.length === 1 ? 'publicación' : 'publicaciones'}`;
    emptyState.hidden = items.length !== 0;
    results.innerHTML = shown.map(p => `
      <article class="result-item">
        <div>
          <h3><a href="${escapeAttr(p.localUrl)}">${escapeHtml(p.title)}</a></h3>
          <div class="result-meta">${p.areas.map(a=>`<button type="button" class="category-chip" data-pick-area="${escapeAttr(a)}">${escapeHtml(a)}</button>`).join('')}${p.year ? `<span class="year-chip">${escapeHtml(p.year)}</span>` : ''}</div>
        </div>
        <div class="author-block"><span>${p.authors.length > 1 ? 'Autores/as' : 'Autor/a'}</span>${p.authors.map(a=>`<button type="button" class="author-button" data-pick-author="${escapeAttr(a)}">${escapeHtml(a)}</button>`).join('')}</div>
        <a class="open-link" href="${escapeAttr(p.localUrl)}" aria-label="Abrir ${escapeAttr(p.title)}">↗</a>
      </article>`).join('');
    loadMore.hidden = visibleCount >= items.length || items.length === 0;
    updateActiveFilter();
    bindResultButtons();
  }

  function updateActiveFilter(){
    const parts=[];
    if(searchInput.value.trim()) parts.push(`Búsqueda: “${searchInput.value.trim()}”`);
    if(areaFilter.value) parts.push(areaFilter.value);
    if(authorFilter.value) parts.push(authorFilter.value);
    if(parts.length){activeFilter.hidden=false;activeFilter.textContent=parts.join(' · ')} else {activeFilter.hidden=true;activeFilter.textContent=''}
  }

  function bindResultButtons(){
    $$('[data-pick-area]').forEach(btn => btn.addEventListener('click', () => {
      areaFilter.value = btn.dataset.pickArea; render(true); $('#publicaciones').scrollIntoView({behavior:'smooth'});
    }));
    $$('[data-pick-author]').forEach(btn => btn.addEventListener('click', () => {
      authorFilter.value = btn.dataset.pickAuthor; render(true); $('#publicaciones').scrollIntoView({behavior:'smooth'});
    }));
  }

  searchInput.addEventListener('input', () => render(true));
  areaFilter.addEventListener('change', () => render(true));
  authorFilter.addEventListener('change', () => render(true));
  sortFilter.addEventListener('change', () => render(true));
  clearFilters.addEventListener('click', () => {
    searchInput.value=''; areaFilter.value=''; authorFilter.value=''; sortFilter.value='title'; render(true); searchInput.focus();
  });
  loadMore.addEventListener('click', () => { visibleCount += 12; render(false); });
  $$('.category-card').forEach(btn => btn.addEventListener('click', () => {
    areaFilter.value = btn.dataset.area; render(true); $('#publicaciones').scrollIntoView({behavior:'smooth'});
  }));

  const menuButton = $('#menuButton');
  const mobileNav = $('#mobileNav');
  menuButton.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.textContent = open ? 'Cerrar' : 'Menú';
  });
  $$('#mobileNav a').forEach(a => a.addEventListener('click', () => {
    mobileNav.classList.remove('open'); menuButton.setAttribute('aria-expanded','false'); menuButton.textContent='Menú';
  }));

  document.addEventListener('keydown', e => {
    if(e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT'){
      e.preventDefault(); searchInput.focus();
    }
  });

  function escapeHtml(value=''){
    return value.toString().replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }
  function escapeAttr(value=''){
    return escapeHtml(value).replace(/'/g,'&#39;');
  }

  render(true);
})();
