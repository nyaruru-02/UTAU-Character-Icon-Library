const DATA_URL = new URL('../data/characters.json', document.currentScript.src).href;
// GitHub Pages cache/update note: motif tag filtering is included in URL params and checkbox state. version: full-20260619-2
const KANA_GROUPS = [
  { key:'あ', chars:['あ','い','う','え','お'] }, { key:'か', chars:['か','き','く','け','こ','が','ぎ','ぐ','げ','ご'] },
  { key:'さ', chars:['さ','し','す','せ','そ','ざ','じ','ず','ぜ','ぞ'] }, { key:'た', chars:['た','ち','つ','て','と','だ','ぢ','づ','で','ど'] },
  { key:'な', chars:['な','に','ぬ','ね','の'] }, { key:'は', chars:['は','ひ','ふ','へ','ほ','ば','び','ぶ','べ','ぼ','ぱ','ぴ','ぷ','ぺ','ぽ'] },
  { key:'ま', chars:['ま','み','む','め','も'] }, { key:'や', chars:['や','ゆ','よ'] },
  { key:'ら', chars:['ら','り','る','れ','ろ'] }, { key:'わ', chars:['わ','を','ん'] }, { key:'他', chars:[] }
];

// 検索コラムのタググループ表示順です。
// GitHub Pagesで古い順番が残らないよう、HTML側のJSバージョンも更新しています。
// 並びを変えたい場合は、この配列の順番を変更してください。
const TAG_FILTER_GROUPS = [
  { key:'gender', field:'genderTags', title:'性別タグ' },
  { key:'species', field:'speciesTags', title:'種族タグ' },
  { key:'motif', field:'motifTags', title:'モチーフタグ' },
  { key:'point', field:'pointTags', title:'身体的特徴タグ' },
  { key:'job', field:'jobTags', title:'職業タグ' },
  { key:'attribute', field:'attributeTags', title:'属性タグ' },
  { key:'item', field:'itemTags', title:'小物タグ' }
  
];
function getFilterGroupKeys(){
  return TAG_FILTER_GROUPS.map(group => group.key);
}

function createEmptySelectedFilterGroups(){
  return Object.fromEntries(getFilterGroupKeys().map(key => [key, []]));
}

let characters = [];
let currentViewMode = 'grid';
let visibleCharacterCount = 0;
let currentCharacterList = [];
let lastGridColumnCount = 0;

init();

async function init(){
  try{
    characters = await loadCharacters();
    renderKanaNav();
    renderTags();
    bindEvents();
    renderByUrl();
  }catch(error){
    console.error('初期化に失敗しました', error);
    const empty = document.querySelector('#emptyMessage');
    if(empty){
      empty.hidden = false;
      empty.textContent = 'サイトの読み込み中にエラーが発生しました。';
    }
  }
}

async function loadCharacters(){
  const urls = [
    new URL('../data/characters.json', document.currentScript.src).href,
    new URL('./data/characters.json', location.href).href
  ];

  let lastError;
  for(const url of [...new Set(urls)]){
    try{
      const res = await fetch(`${url}?v=${Date.now()}`, { cache:'no-store' });
      if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (Array.isArray(data.characters) ? data.characters : []);
      return rows.map(normalizeCharacter).filter(c => c.name || c.kana || c.romaji);
    }catch(error){
      lastError = error;
    }
  }

  console.error('characters.jsonを読み込めませんでした', lastError);
  return [];
}

function normalizeCharacter(row, index){
  const speciesTags = collectTagsFromFields(row, ['種族タグ']);
  const jobTags = collectTagsFromFields(row, ['職業タグ']);
  const attributeTags = collectTagsFromFields(row, ['属性タグ']);
  const itemTags = collectTagsFromFields(row, ['小物タグ']);
  const motifTags = collectTagsFromFields(row, ['モチーフタグ']);
  const pointTags = collectTagsFromFields(row, ['身体的特徴タグ', 'ワンポイントタグ', 'pointTags']);
  const normalTags = collectTagsFromFields(row, ['通常タグ']);
  const categoryTags = uniqueTags([...speciesTags, ...attributeTags, ...motifTags, ...jobTags, ...itemTags, ...pointTags]);
  const allCharacterTags = uniqueTags([...normalTags, ...categoryTags]);
  const gender = normalizeTextValue(firstValue(row, ['性別', 'gender', 'Gender'])) || '';
  const directGenderTags = collectTagsFromFields(row, ['genderTags']);
  const genderTags = uniqueTags([...(gender ? [gender] : []), ...directGenderTags]);

  return {
    id: firstValue(row, ['id','ID','Id','no','No','番号']) || String(index + 1),
    name: firstValue(row, ['name','Name','displayName','display_name','表示名','名前','キャラクター名']) || '',
    kana: firstValue(row, ['kana','Kana','reading','yomi','読み','ひらがな','かな']) || '',
    romaji: firstValue(row, ['romaji','Romaji','roman','romanji','ローマ字','ヘボン式']) || '',
    gender,
    genderTags,
    icon: normalizeIconPath(firstValue(row, ['icon','Icon','image','Image','画像','アイコン','アイコン画像']), firstValue(row, ['romaji','Romaji','roman','romanji','ローマ字','ヘボン式']) || firstValue(row, ['name','Name','displayName','display_name','表示名','名前','キャラクター名']) || ''),
    url: firstValue(row, ['url','URL','link','Link','リンク']) || '',
    tags: allCharacterTags,
    speciesTags,
    attributeTags,
    motifTags,
    jobTags,
    itemTags,
    pointTags,
    categoryTags,
    workTags: collectTagsFromFields(row, ['作品タグ']),
    createdAt: firstValue(row, ['createdAt','created_at','date','登録日','作成日']) || ''
  };
}

function firstValue(row, keys){
  if(!row || typeof row !== 'object') return '';
  for(const key of keys){
    if(Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== ''){
      return row[key];
    }
  }
  return '';
}

function normalizeTextValue(value){
  if(value === undefined || value === null) return '';
  if(Array.isArray(value)){
    return value.map(normalizeTextValue).find(Boolean) || '';
  }
  if(typeof value === 'object'){
    return Object.values(value).map(normalizeTextValue).find(Boolean) || '';
  }
  return String(value).trim();
}

function collectTagsFromFields(row, keys){
  const result = [];
  keys.forEach(key => {
    normalizeTags(row?.[key]).forEach(tag => {
      if(tag && !result.includes(tag)) result.push(tag);
    });
  });
  return result;
}

function uniqueTags(tags){
  const result = [];
  tags.forEach(tag => {
    const value = String(tag || '').trim();
    if(value && !result.includes(value)) result.push(value);
  });
  return result;
}

function normalizeTags(value){
  if(value === undefined || value === null) return [];
  if(Array.isArray(value)){
    return value.flatMap(normalizeTags).filter(Boolean);
  }
  if(typeof value === 'object'){
    return Object.values(value).flatMap(normalizeTags).filter(Boolean);
  }

  const text = String(value).trim();
  if(!text) return [];

  // Excel/変換ツールによっては '["タグA","タグB"]' のような文字列になるため対応。
  if((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))){
    try{
      const parsed = JSON.parse(text);
      const parsedTags = normalizeTags(parsed);
      if(parsedTags.length) return parsedTags;
    }catch(_){
      // JSON文字列でなければ通常の区切り処理へ進む。
    }
  }

  return text
    .split(/[|｜,，、\n\r]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

function bindEvents(){
  window.addEventListener('popstate', renderByUrl);
  document.querySelector('#sideSearchForm')?.addEventListener('submit', e => e.preventDefault());
  document.querySelector('#sideSearchInput')?.addEventListener('input', debounce(event => applySearchFromControls(event.target), 180));
  document.querySelector('#tagFilterGroups')?.addEventListener('change', event => {
    if(event.target.matches('input[type="checkbox"]')) applySearchFromControls();
  });
  document.querySelector('#characterList')?.addEventListener('click', event => {
    const link = event.target.closest('a.tag[href]');
    if(!link) return;
    event.preventDefault();
    navigate(link.getAttribute('href'), { keepScroll:true });
  });
  document.querySelector('#kanaNav')?.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if(!link) return;
    event.preventDefault();
    if(link.classList.contains('is-disabled')) return;
    navigate(link.getAttribute('href'), { keepScroll:true });
  });
  document.querySelector('#kanaAllLink')?.addEventListener('click', event => {
    event.preventDefault();
    const params = getParams();
    params.delete('kana');
    params.delete('view');
    const query = params.toString();
    navigate(query ? `?${query}` : './', { keepScroll:true });
  });
  document.querySelector('#sortSelect')?.addEventListener('change', renderByUrl);
  document.querySelector('#gridBtn')?.addEventListener('click', () => setViewMode('grid'));
  document.querySelector('#listBtn')?.addEventListener('click', () => setViewMode('list'));
  bindMobileSearchDrawer();
  window.addEventListener('resize', debounce(() => {
    initCollapsibleFilterGroups();
    refreshCharacterVisibleCountOnResize();
    if(window.matchMedia('(min-width: 761px)').matches) closeMobileSearchDrawer();
  }, 150));
}

function bindMobileSearchDrawer(){
  const toggle = document.querySelector('#mobileSearchToggle');
  const close = document.querySelector('#mobileSearchClose');
  const drawer = document.querySelector('#sideSearchDrawer');
  const backdrop = document.querySelector('#mobileSearchBackdrop');
  if(!toggle || !drawer || !backdrop) return;

  toggle.addEventListener('click', () => openMobileSearchDrawer());
  close?.addEventListener('click', () => closeMobileSearchDrawer());
  backdrop.addEventListener('click', () => closeMobileSearchDrawer());
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape') closeMobileSearchDrawer();
  });
}

function openMobileSearchDrawer(){
  const toggle = document.querySelector('#mobileSearchToggle');
  const drawer = document.querySelector('#sideSearchDrawer');
  const backdrop = document.querySelector('#mobileSearchBackdrop');
  if(!toggle || !drawer || !backdrop) return;
  backdrop.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.classList.add('mobile-search-open');
    toggle.setAttribute('aria-expanded', 'true');
  });
}

function closeMobileSearchDrawer(){
  const toggle = document.querySelector('#mobileSearchToggle');
  const drawer = document.querySelector('#sideSearchDrawer');
  const backdrop = document.querySelector('#mobileSearchBackdrop');
  if(!toggle || !drawer || !backdrop) return;
  drawer.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  document.body.classList.remove('mobile-search-open');
  toggle.setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    if(!backdrop.classList.contains('is-open')) backdrop.hidden = true;
  }, 220);
}


function applySearchFromControls(sourceInput = null){
  const q = (sourceInput?.matches?.('input[type="search"]') ? sourceInput.value : (document.querySelector('#sideSearchInput')?.value || '')).trim();
  const params = new URLSearchParams(location.search);

  // 検索コラムのチェックボックスは TAG_FILTER_GROUPS に定義したキーをすべてURLへ反映します。
  // モチーフタグなど、後から追加したグループもここで自動的に処理されます。
  ['q','tag','work','view', ...getFilterGroupKeys()].forEach(key => params.delete(key));
  if(q) params.set('q', q);

  const selectedGroups = getSelectedFilterGroupsFromDom();
  Object.entries(selectedGroups).forEach(([key, values]) => {
    if(values.length) params.set(key, values.join(','));
  });

  const query = params.toString();
  navigate(query ? `?${query}` : './');
}

function getSelectedFilterGroupsFromDom(){
  const groups = createEmptySelectedFilterGroups();

  document.querySelectorAll('#tagFilterGroups input[type="checkbox"]:checked').forEach(input => {
    const key = input.dataset.group;
    if(Object.prototype.hasOwnProperty.call(groups, key)){
      groups[key].push(input.value);
    }
  });

  return groups;
}
function navigate(url, options = {}){
  const scrollY = window.scrollY;
  history.pushState(null, '', url);
  renderByUrl();
  if(options.keepScroll){
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' }));
  }
}
function getParams(){ return new URLSearchParams(location.search); }

function renderByUrl(){
  const p = getParams();
  const q = p.get('q');
  const tag = p.get('tag');
  const work = p.get('work');
  const kana = p.get('kana');
  const view = p.get('view');
  const selectedFilterGroups = getSelectedFilterGroupsFromParams(p);

  syncSearchControls(q || '', selectedFilterGroups);

  let list = filterCharacters({ excludeKana:false });
  const listBeforeKana = filterCharacters({ excludeKana:true });
  const titleParts = [];
  const crumbParts = ['TOP'];

  if(view === 'tags') {
    // タグ一覧枠は廃止済み。旧URL互換として何もしない。
  }

  if(q){
    titleParts.push(`「${escapeHtml(q)}」`);
    crumbParts.push('検索');
  }

  if(tag){
    titleParts.push(`タグ：${escapeHtml(tag)}`);
    crumbParts.push(`タグ ＞ ${escapeHtml(tag)}`);
  }

  if(work){
    titleParts.push(`作品：${escapeHtml(work)}`);
    crumbParts.push(`作品タグ ＞ ${escapeHtml(work)}`);
  }

  const filterLabels = [];
  Object.values(selectedFilterGroups).forEach(values => filterLabels.push(...values));
  if(filterLabels.length){
    titleParts.push(`タグ：${filterLabels.map(escapeHtml).join(' / ')}`);
    crumbParts.push('絞り込みタグ');
  }

  if(kana && kana !== 'all'){
    titleParts.push(`${escapeHtml(kana)}行`);
    crumbParts.push(`50音 ＞ ${escapeHtml(kana)}行`);
  }

  let title = 'キャラクター一覧';
  if(view === 'tags' && !q && !tag && !kana){
    title = 'タグ一覧';
  }else if(titleParts.length){
    title = `${titleParts.join(' / ')}のキャラクター一覧`;
  }

  list = sortCharacters(list);
  document.querySelector('#resultTitle').innerHTML = title;
  document.querySelector('#breadcrumb').innerHTML = crumbParts.join(' ＞ ');
  document.querySelector('#resultCount').textContent = `全 ${list.length} 件`;
  visibleCharacterCount = 0;
  lastGridColumnCount = 0;
  renderCharacters(list);
  renderKanaNav(kana, listBeforeKana);
  renderTagFilterGroups(list);
  initCollapsibleFilterGroups();
  syncSearchControls(q || '', selectedFilterGroups);
}


function filterCharacters(options = {}){
  const { excludeKana = false } = options;
  const p = getParams();
  const q = p.get('q');
  const tag = p.get('tag');
  const work = p.get('work');
  const kana = p.get('kana');
  const selectedFilterGroups = getSelectedFilterGroupsFromParams(p);
  let list = [...characters];

  if(q){
    const key = q.toLowerCase();
    list = list.filter(c => [c.name,c.kana,c.romaji,c.gender,...c.tags,...c.workTags].some(v => String(v).toLowerCase().includes(key)));
  }

  if(tag){
    list = list.filter(c => c.tags.includes(tag));
  }

  if(work){
    list = list.filter(c => c.workTags.includes(work));
  }

  Object.entries(selectedFilterGroups).forEach(([key, values]) => {
    if(values.length){
      list = list.filter(c => values.every(tagName => (c[`${key}Tags`] || []).includes(tagName)));
    }
  });

  if(!excludeKana && kana && kana !== 'all'){
    const g = KANA_GROUPS.find(x => x.key === kana);
    list = list.filter(c => inKanaGroup(c.kana, g));
  }

  return list;
}

function getSelectedFilterGroupsFromParams(params = getParams()){
  const groups = createEmptySelectedFilterGroups();

  getFilterGroupKeys().forEach(key => {
    groups[key] = splitParamValues(params.get(key));
  });

  return groups;
}

function splitParamValues(value){
  return String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}
function sortCharacters(list){
  const select = document.querySelector('#sortSelect');
  const mode = select?.value || 'new-desc';

  return [...list].sort((a,b)=>{
    // 名前順：ひらがな読み（kana）順
    if(mode === 'kana-asc'){
      return compareJapanese(a.kana || a.name, b.kana || b.name);
    }

    // 表示名順：表示名（name）順
    if(mode === 'name-asc'){
      return compareJapanese(a.name || a.kana, b.name || b.kana);
    }

    // 新しい順：id/番号が大きいものから
    const aId = toSortableId(a.id);
    const bId = toSortableId(b.id);
    if(aId !== bId) return bId - aId;

    return compareJapanese(a.kana || a.name, b.kana || b.name);
  });
}

function toSortableId(value){
  const text = String(value ?? '').trim();
  const matchedNumber = text.match(/\d+/g);
  if(matchedNumber) return Number(matchedNumber.join(''));
  return 0;
}

function compareJapanese(a,b){
  return String(a || '').localeCompare(String(b || ''), 'ja', { numeric:true, sensitivity:'base' });
}

function inKanaGroup(kana, group){
  if(!group) return true; const first = (kana || '').charAt(0);
  if(group.key === '他') return !KANA_GROUPS.some(g => g.key !== '他' && g.chars.includes(first));
  return group.chars.includes(first);
}

function renderCharacters(list){
  currentCharacterList = list;
  const root = document.querySelector('#characterList');
  if(!root) return;
  root.className = currentViewMode === 'list' ? 'card-grid is-list' : 'card-grid';

  const pageSize = getCharacterPageSize();
  if(!visibleCharacterCount) visibleCharacterCount = pageSize;
  visibleCharacterCount = Math.min(Math.max(visibleCharacterCount, pageSize), list.length);
  const visibleList = list.slice(0, visibleCharacterCount);

  root.innerHTML = visibleList.map(c => `
    <article class="character-card">
      <img src="${escapeAttr(getIconSrc(c))}" alt="${escapeAttr(c.name)}のアイコン" loading="lazy" onerror="this.onerror=null;this.src='${escapeAttr(getFallbackIcon(c))}';">
      <div class="card-body">
        <h3 class="character-name">${escapeHtml(c.name)}</h3>
        <p class="reading1">${escapeHtml(c.kana)}</p>
        <p class="reading2">${escapeHtml(c.romaji)}</p>
        ${renderCardTags(c, '')}
        ${c.url ? `<a class="detail-link" href="${escapeAttr(c.url)}" target="_blank" rel="noopener">管理サイトはこちら</a>` : ''}
      </div>
    </article>`).join('');
  setupCardTagToggles(root);
  document.querySelector('#emptyMessage').hidden = list.length !== 0;
  renderCharacterMoreButton(list.length);
}

function renderCardTags(c, prefix = ''){
  const genderParts = [];
  const workParts = [];
  const mainParts = [];

  if(c.gender){
    genderParts.push(`<span class="tag gender-tag">${escapeHtml(c.gender)}</span>`);
  }

  if(Array.isArray(c.workTags)){
    c.workTags.forEach(t => workParts.push(`<a class="tag work-tag" href="${prefix}?work=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`));
  }

  const displayTags = Array.isArray(c.categoryTags) && c.categoryTags.length ? c.categoryTags : (Array.isArray(c.tags) ? c.tags : []);
  displayTags.forEach(t => mainParts.push(`<a class="tag" href="${prefix}?tag=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`));

  if(!genderParts.length && !workParts.length && !mainParts.length) return '';

  return `
        <div class="card-tags-wrap">
          ${genderParts.length ? `<div class="tags card-gender-tags">${genderParts.join('')}</div>` : ''}
          ${workParts.length ? `<div class="tags card-work-tags">${workParts.join('')}</div>` : ''}
          ${mainParts.length ? `
          <div class="card-main-tags-wrap">
            <div class="tags card-main-tags is-collapsed">${mainParts.join('')}</div>
            <button class="card-tags-toggle" type="button" hidden>さらに表示</button>
          </div>` : ''}
        </div>`;
}

function setupCardTagToggles(root){
  requestAnimationFrame(() => {
    root.querySelectorAll('.card-main-tags-wrap').forEach(wrap => {
      const tags = wrap.querySelector('.card-main-tags');
      const btn = wrap.querySelector('.card-tags-toggle');
      if(!tags || !btn) return;

      tags.classList.add('is-collapsed');
      btn.textContent = 'さらに表示';
      const needsToggle = tags.scrollHeight > tags.clientHeight + 2;
      btn.hidden = !needsToggle;

      btn.onclick = () => {
        const isCollapsed = tags.classList.toggle('is-collapsed');
        btn.textContent = isCollapsed ? 'さらに表示' : '閉じる';
      };
    });
  });
}

function renderCharacterMoreButton(total){
  let btn = document.querySelector('#characterMoreBtn');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'characterMoreBtn';
    btn.className = 'character-more-btn';
    btn.type = 'button';
    btn.addEventListener('click', () => {
      const pageSize = getCharacterPageSize();
      const allShown = visibleCharacterCount >= currentCharacterList.length;

      if(allShown){
        visibleCharacterCount = pageSize;
        renderCharacters(currentCharacterList);
        document.querySelector('#characterList').scrollIntoView({ block:'start' });
        return;
      }

      visibleCharacterCount = Math.min(visibleCharacterCount + pageSize, currentCharacterList.length);
      renderCharacters(currentCharacterList);
    });
    document.querySelector('#emptyMessage').before(btn);
  }

  const pageSize = getCharacterPageSize();
  if(total <= pageSize){
    btn.hidden = true;
    return;
  }

  const allShown = visibleCharacterCount >= total;
  btn.hidden = false;
  btn.textContent = allShown ? '閉じる' : `もっと見る（残り${total - visibleCharacterCount}件）`;
  btn.setAttribute('aria-expanded', allShown ? 'true' : 'false');
}

function getCharacterColumnCount(){
  const root = document.querySelector('#characterList');
  if(!root) return 1;

  if(currentViewMode === 'list') return 1;

  const columns = getComputedStyle(root).gridTemplateColumns
    .split(' ')
    .filter(Boolean).length;

  return Math.max(columns || 1, 1);
}

function getCharacterPageSize(){
  const columns = getCharacterColumnCount();
  lastGridColumnCount = columns;
  return Math.max(columns * 3, 1);
}

function refreshCharacterVisibleCountOnResize(){
  if(!currentCharacterList.length) return;

  const newColumns = getCharacterColumnCount();
  if(newColumns === lastGridColumnCount) return;

  const currentRows = Math.max(Math.ceil(visibleCharacterCount / Math.max(lastGridColumnCount || newColumns, 1)), 3);
  visibleCharacterCount = Math.min(currentRows * newColumns, currentCharacterList.length);
  lastGridColumnCount = newColumns;
  renderCharacters(currentCharacterList);
}
function renderKanaNav(active, baseList = filterCharacters({ excludeKana:true })){
  const params = getParams();

  const html = KANA_GROUPS.map(g => {
    const count = baseList.filter(c => inKanaGroup(c.kana, g)).length;
    const hrefParams = new URLSearchParams(params);
    hrefParams.delete('view');
    hrefParams.set('kana', g.key);
    const href = `?${hrefParams.toString()}`;

    return `<a class="${active===g.key?'is-active':''} ${count===0?'is-disabled':''}" href="${href}">${g.key}</a>`;
  }).join('');
  const kanaRoot = document.querySelector('#kanaNav');
  if(kanaRoot) kanaRoot.innerHTML = html;
}

function renderTags(){

  const counts = new Map();
  characters.flatMap(c=>c.tags).forEach(t => counts.set(t, (counts.get(t)||0)+1));
  const tags = [...counts.entries()].sort((a,b)=> b[1]-a[1] || a[0].localeCompare(b[0],'ja'));

  renderTagSelectOptions(tags);
  renderTagFilterGroups(characters);
  initCollapsibleFilterGroups();
}

function renderTagFilterGroups(sourceList = characters){
  const root = document.querySelector('#tagFilterGroups');
  if(!root) return;

  const groups = TAG_FILTER_GROUPS;
  const selected = getSelectedFilterGroupsFromParams();

  root.innerHTML = groups.map(group => {
    const counts = new Map();
    sourceList.flatMap(c => c[group.field] || []).forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1));
    const selectedValues = selected[group.key] || [];
    selectedValues.forEach(tag => {
      if(tag && !counts.has(tag)) counts.set(tag, 0);
    });
    const tags = [...counts.entries()].sort((a,b) => a[0].localeCompare(b[0], 'ja'));
    if(!tags.length) return '';

    return `
      <section class="tag-filter-group" data-filter-group="${group.key}">
        <h3>${escapeHtml(group.title)}</h3>
        <div class="tag-check-list">
          ${tags.map(([tag, count]) => {
            const id = `tag-${group.key}-${slugify(tag)}`;
            const checked = selected[group.key]?.includes(tag) ? ' checked' : '';
            return `<label class="tag-check" for="${escapeAttr(id)}">
              <input id="${escapeAttr(id)}" type="checkbox" data-group="${group.key}" value="${escapeAttr(tag)}"${checked}>
              <span>${escapeHtml(tag)}</span>
              <small>${count}</small>
            </label>`;
          }).join('')}
        </div>
      </section>`;
  }).join('');
}

function slugify(value){
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9぀-ヿ㐀-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tag';
}

function initCollapsibleFilterGroups(){
  document.querySelectorAll('.tag-filter-group .tag-check-list').forEach(list => setupCollapsibleCheckList(list));
}

function setupCollapsibleCheckList(list){
  const group = list.closest('.tag-filter-group');
  if(!group) return;

  let btn = group.querySelector('.tag-filter-more-btn');
  if(!btn){
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tag-filter-more-btn';
    btn.addEventListener('click', () => {
      const expanded = list.dataset.expanded === 'true';
      setCheckListState(list, btn, !expanded);
    });
    group.appendChild(btn);
  }

  const items = [...list.querySelectorAll('.tag-check')];
  list.style.maxHeight = '';

  if(items.length <= 5){
    list.dataset.expanded = 'true';
    btn.hidden = true;
    setCheckListState(list, btn, true);
    return;
  }

  btn.hidden = false;
  setCheckListState(list, btn, list.dataset.expanded === 'true');
}

function setCheckListState(list, btn, expand){
  const items = [...list.querySelectorAll('.tag-check')];
  list.dataset.expanded = expand ? 'true' : 'false';
  list.classList.toggle('is-collapsed', !expand);
  list.style.maxHeight = '';

  items.forEach((item, index) => {
    item.hidden = !expand && index >= 5;
  });

  btn.textContent = expand ? '閉じる' : 'もっと見る';
  btn.setAttribute('aria-expanded', expand ? 'true' : 'false');
}

function renderTagSelectOptions(tags){
  const sortedTagNames = [...tags]
    .map(item => Array.isArray(item) ? item[0] : item)
    .map(t => String(t || '').trim())
    .filter(Boolean)
    .filter((tag, index, arr) => arr.indexOf(tag) === index)
    .sort((a,b) => a.localeCompare(b, 'ja'));

  document.querySelectorAll('.tag-select').forEach(select => {
    const currentValue = getParams().get('tag') || select.value || '';
    select.replaceChildren();

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'すべてのタグ';
    select.appendChild(defaultOption);

    sortedTagNames.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      select.appendChild(option);
    });

    select.value = sortedTagNames.includes(currentValue) ? currentValue : '';
  });

  syncSearchControls(getParams().get('q') || '', getSelectedFilterGroupsFromParams());
}

function syncSearchControls(q, selectedFilterGroups = getSelectedFilterGroupsFromParams()){
  ['#sideSearchInput'].forEach(selector => {
    const input = document.querySelector(selector);
    if(input && input.value !== q) input.value = q;
  });


  document.querySelectorAll('#tagFilterGroups input[type="checkbox"]').forEach(input => {
    const key = input.dataset.group;
    const shouldCheck = Boolean(selectedFilterGroups[key]?.includes(input.value));
    if(input.checked !== shouldCheck) input.checked = shouldCheck;
  });
}


function normalizeIconPath(icon, romaji = ''){
  const raw = normalizeTextValue(icon);
  if(raw) return raw.replace(/^\.\//, '');
  const slug = slugifyRomaji(romaji);
  return slug ? `image/${slug}.png` : '';
}

function slugifyRomaji(value){
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getIconSrc(c){
  return c?.icon || getFallbackIcon(c);
}

function getFallbackIcon(c){
  return 'assets/人物のアイコン.png';
}

function debounce(fn, delay){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
function setViewMode(mode){
  currentViewMode = mode;
  document.querySelector('#gridBtn').classList.toggle('is-active', mode==='grid');
  document.querySelector('#listBtn').classList.toggle('is-active', mode==='list');
  renderByUrl();
}
function escapeHtml(s=''){ return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function escapeAttr(s=''){ return escapeHtml(s).replace(/'/g,'&#39;'); }