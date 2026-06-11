const DATA_URL = 'data/characters.json';
const KANA_GROUPS = [
  { key:'あ', chars:['あ','い','う','え','お'] }, { key:'か', chars:['か','き','く','け','こ','が','ぎ','ぐ','げ','ご'] },
  { key:'さ', chars:['さ','し','す','せ','そ','ざ','じ','ず','ぜ','ぞ'] }, { key:'た', chars:['た','ち','つ','て','と','だ','ぢ','づ','で','ど'] },
  { key:'な', chars:['な','に','ぬ','ね','の'] }, { key:'は', chars:['は','ひ','ふ','へ','ほ','ば','び','ぶ','べ','ぼ','ぱ','ぴ','ぷ','ぺ','ぽ'] },
  { key:'ま', chars:['ま','み','む','め','も'] }, { key:'や', chars:['や','ゆ','よ'] },
  { key:'ら', chars:['ら','り','る','れ','ろ'] }, { key:'わ', chars:['わ','を','ん'] }, { key:'他', chars:[] }
];
let characters = [];
let currentViewMode = 'grid';
let visibleCharacterCount = 0;
let currentCharacterList = [];
let lastGridColumnCount = 0;

init();

async function init(){
  characters = await loadCharacters();
  renderKanaNav();
  renderTags();
  initCollapsibleSideColumns();
  bindEvents();
  renderByUrl();
}

async function loadCharacters(){
  const res = await fetch(DATA_URL, { cache:'no-store' });
  if(!res.ok) throw new Error('characters.jsonを読み込めませんでした');
  const data = await res.json();

  return data.map(row => ({
    id: row.id || '',
    name: row.name || '',
    kana: row.kana || '',
    romaji: row.romaji || '',
    icon: row.icon || '',
    url: row.url || '',
    tags: Array.isArray(row.tags)
      ? row.tags.map(t => String(t).trim()).filter(Boolean)
      : String(row.tags || '').split('|').map(t => t.trim()).filter(Boolean),
    createdAt: row.createdAt || row.created_at || ''
  }));
}


function bindEvents(){
  window.addEventListener('popstate', renderByUrl);
  document.querySelector('#searchForm').addEventListener('submit', onSearch);
  document.querySelector('#sideSearchForm').addEventListener('submit', onSearch);
  document.querySelector('#sortSelect').addEventListener('change', renderByUrl);
  document.querySelector('#gridBtn').addEventListener('click', () => setViewMode('grid'));
  document.querySelector('#listBtn').addEventListener('click', () => setViewMode('list'));
  window.addEventListener('resize', debounce(() => {
    initCollapsibleSideColumns();
    refreshCharacterVisibleCountOnResize();
  }, 150));
}

function onSearch(e){
  e.preventDefault();
  const q = (e.currentTarget.querySelector('input').value || '').trim();
  navigate(q ? `?q=${encodeURIComponent(q)}` : './');
}
function navigate(url){ history.pushState(null, '', url); renderByUrl(); }
function getParams(){ return new URLSearchParams(location.search); }

function renderByUrl(){
  const p = getParams();
  const q = p.get('q'); const tag = p.get('tag'); const kana = p.get('kana'); const view = p.get('view');
  let list = [...characters], title='キャラクター一覧', crumb='TOP';
  if(view === 'tags') { title='タグ一覧'; document.querySelector('#tagsPanel').scrollIntoView({block:'start'}); }
  if(q){
    const key = q.toLowerCase();
    list = list.filter(c => [c.name,c.kana,c.romaji,...c.tags].some(v => String(v).toLowerCase().includes(key)));
    title = `「${escapeHtml(q)}」の検索結果`; crumb = `TOP ＞ 検索`;
  } else if(tag){
    list = list.filter(c => c.tags.includes(tag)); title = `タグ：${escapeHtml(tag)}`; crumb = `TOP ＞ タグ一覧 ＞ ${escapeHtml(tag)}`;
  } else if(kana && kana !== 'all'){
    const g = KANA_GROUPS.find(x => x.key === kana);
    list = list.filter(c => inKanaGroup(c.kana, g)); title = `${escapeHtml(kana)}行のキャラクター一覧`; crumb = `TOP ＞ 50音 ＞ ${escapeHtml(kana)}行`;
  }
  list = sortCharacters(list);
  document.querySelector('#resultTitle').innerHTML = title;
  document.querySelector('#breadcrumb').innerHTML = crumb;
  document.querySelector('#resultCount').textContent = `全 ${list.length} 件`;
  visibleCharacterCount = 0;
  lastGridColumnCount = 0;
  renderCharacters(list); renderKanaNav(kana);
}
function sortCharacters(list){
  const mode = document.querySelector('#sortSelect').value;
  return list.sort((a,b)=>{
    if(mode === 'name-asc') return a.name.localeCompare(b.name, 'ja');
    if(mode === 'new-desc') return String(b.createdAt).localeCompare(String(a.createdAt));
    return a.kana.localeCompare(b.kana, 'ja');
  });
}
function inKanaGroup(kana, group){
  if(!group) return true; const first = (kana || '').charAt(0);
  if(group.key === '他') return !KANA_GROUPS.some(g => g.key !== '他' && g.chars.includes(first));
  return group.chars.includes(first);
}

function renderCharacters(list){
  currentCharacterList = list;
  const root = document.querySelector('#characterList');
  root.className = currentViewMode === 'list' ? 'card-grid is-list' : 'card-grid';

  const pageSize = getCharacterPageSize();
  if(!visibleCharacterCount) visibleCharacterCount = pageSize;
  visibleCharacterCount = Math.min(Math.max(visibleCharacterCount, pageSize), list.length);
  const visibleList = list.slice(0, visibleCharacterCount);

  root.innerHTML = visibleList.map(c => `
    <article class="character-card">
      <img src="${escapeAttr(c.icon)}" alt="${escapeAttr(c.name)}のアイコン" loading="lazy">
      <div class="card-body">
        <h3 class="character-name">${escapeHtml(c.name)}</h3>
        <p class="reading1">${escapeHtml(c.kana)}</p>
        <p class="reading2">${escapeHtml(c.romaji)}</p>
        <div class="tags">${c.tags.map(t => `<a class="tag" href="?tag=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('')}</div>
        ${c.url ? `<a class="detail-link" href="${escapeAttr(c.url)}" target="_blank" rel="noopener">管理サイトはこちら</a>` : ''}
      </div>
    </article>`).join('');
  document.querySelector('#emptyMessage').hidden = list.length !== 0;
  renderCharacterMoreButton(list.length);
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
function renderKanaNav(active){
  const html = KANA_GROUPS.map(g => {
    const count = characters.filter(c => inKanaGroup(c.kana, g)).length;
    return `<a class="${active===g.key?'is-active':''} ${count===0?'is-disabled':''}" href="?kana=${encodeURIComponent(g.key)}">${g.key}</a>`;
  }).join('');
  document.querySelector('#kanaNav').innerHTML = html;
}
function renderTags(){
  const counts = new Map();
  characters.flatMap(c=>c.tags).forEach(t => counts.set(t, (counts.get(t)||0)+1));
  const tags = [...counts.entries()].sort((a,b)=> b[1]-a[1] || a[0].localeCompare(b[0],'ja'));
  const html = tags.map(([t,n]) => `<a href="?tag=${encodeURIComponent(t)}">${escapeHtml(t)} <span>(${n})</span></a>`).join('');
  document.querySelector('#tagCloud').innerHTML = tags.slice(0,10).map(([t,n]) => `<a href="?tag=${encodeURIComponent(t)}">${escapeHtml(t)} <span>(${n})</span></a>`).join('');
  document.querySelector('#allTags').innerHTML = html;
  initCollapsibleSideColumns();
}

function initCollapsibleSideColumns(){
  setupCollapsibleTagCloud('#tagCloud');
  setupCollapsibleTagCloud('#allTags');
}

function setupCollapsibleTagCloud(selector){
  const cloud = document.querySelector(selector);
  if(!cloud) return;

  let wrap = cloud.closest('.collapsible-wrap');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.className = 'collapsible-wrap';
    cloud.parentNode.insertBefore(wrap, cloud);
    wrap.appendChild(cloud);
  }

  let btn = wrap.querySelector('.tag-more-btn');
  if(!btn){
    btn = document.createElement('button');
    btn.className = 'tag-more-btn';
    btn.type = 'button';
    btn.addEventListener('click', () => {
      const expanded = cloud.dataset.expanded === 'true';
      setTagCloudState(cloud, btn, !expanded);
    });
    wrap.appendChild(btn);
  }

  const limit = getSixRowLimit(cloud);
  if(!limit){
    cloud.classList.remove('is-collapsed');
    cloud.style.maxHeight = '';
    cloud.dataset.expanded = 'true';
    btn.hidden = true;
    return;
  }

  cloud.dataset.limitHeight = String(limit);
  btn.hidden = false;
  setTagCloudState(cloud, btn, cloud.dataset.expanded === 'true');
}

function getSixRowLimit(cloud){
  const children = [...cloud.children];
  if(!children.length) return null;

  // 計測前にいったん全表示へ戻す。
  // offsetTop は親要素や折り返し条件でズレることがあるため、
  // getBoundingClientRect() でタグクラウド自身を基準に6行目の下端を測る。
  cloud.classList.remove('is-collapsed');
  cloud.style.maxHeight = '';
  cloud.style.height = '';

  const cloudRect = cloud.getBoundingClientRect();
  const rowTops = [];

  children.forEach(el => {
    const rect = el.getBoundingClientRect();
    const top = Math.round(rect.top - cloudRect.top);
    if(!rowTops.some(rowTop => Math.abs(rowTop - top) <= 2)){
      rowTops.push(top);
    }
  });

  rowTops.sort((a,b) => a - b);
  if(rowTops.length <= 6) return null;

  const sixthRowTop = rowTops[5];
  const sixthRowItems = children.filter(el => {
    const rect = el.getBoundingClientRect();
    const top = Math.round(rect.top - cloudRect.top);
    return Math.abs(top - sixthRowTop) <= 2;
  });

  const bottom = Math.max(...sixthRowItems.map(el => {
    const rect = el.getBoundingClientRect();
    return Math.ceil(rect.bottom - cloudRect.top);
  }));

  return bottom;
}

function setTagCloudState(cloud, btn, expand){
  cloud.dataset.expanded = expand ? 'true' : 'false';
  cloud.classList.toggle('is-collapsed', !expand);
  if(expand){
    cloud.style.maxHeight = '';
    cloud.style.height = '';
  }else{
    const h = `${cloud.dataset.limitHeight}px`;
    cloud.style.maxHeight = h;
    // 高さは固定しない。max-heightだけで6行を超えた分を隠すことで、
    // タグが少ない時や行が少ない時に枠だけが不自然に伸びるのを防ぐ。
    cloud.style.height = '';
  }
  btn.textContent = expand ? '閉じる' : 'もっと見る';
  btn.setAttribute('aria-expanded', expand ? 'true' : 'false');
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