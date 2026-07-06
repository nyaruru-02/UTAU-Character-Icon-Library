const DATA_URLS = [
  new URL('../data/characters.json', document.currentScript.src).href,
  new URL('./data/characters.json', location.href).href,
  `${location.origin}${location.pathname.replace(/[^/]*$/, '')}data/characters.json`
];
const SITE_SHARE_TAGS = ['UTAUアイコンガチャ引いてみた'];
let characters = [];
let currentCharacter = null;

initRandomPage();


async function fetchCharactersJson(){
  let lastError = null;
  for(const url of [...new Set(DATA_URLS)]){
    try{
      const res = await fetch(`${url}?v=${Date.now()}`, { cache:'no-store' });
      if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    }catch(error){
      lastError = error;
    }
  }
  console.error('characters.jsonを読み込めませんでした', lastError);
  return null;
}

async function initRandomPage(){
  try{
    const data = await fetchCharactersJson();
    if(!data){
      document.querySelector('#randomResult').innerHTML = '<p class="empty">characters.jsonを読み込めませんでした。</p>';
      return;
    }
    const rows = Array.isArray(data) ? data : (Array.isArray(data.characters) ? data.characters : []);
    characters = rows.map((row, index) => {
      const speciesTags = collectTagsFromFields(row, ['speciesTags','species_tags','SpeciesTags','raceTags','race_tags','種族タグ','種族']);
      const motifTags = collectTagsFromFields(row, ['motifTags','motif_tags','MotifTags','themeTags','theme_tags','モチーフタグ','モチーフ']);
      const jobTags = collectTagsFromFields(row, ['jobTags','job_tags','JobTags','occupationTags','occupation_tags','職業タグ','職業']);
      const itemTags = collectTagsFromFields(row, ['itemTags','item_tags','ItemTags','accessoryTags','accessory_tags','小物タグ','小物']);
      const pointTags = collectTagsFromFields(row, ['pointTags','point_tags','PointTags','featureTags','feature_tags','onePointTags','one_point_tags','ワンポイントタグ','特徴タグ','特徴','身体的特徴タグ','身体的特徴']);
      const normalTags = collectTagsFromFields(row, ['tags','tag','Tags','Tag','characterTags','character_tags','normalTags','normal_tags','タグ','通常タグ']);
      const categoryTags = uniqueTags([...speciesTags, ...motifTags, ...jobTags, ...itemTags, ...pointTags]);
      return {
        id: firstValue(row, ['id','ID','Id','no','No','番号']) || String(index + 1),
        name: firstValue(row, ['name','Name','displayName','display_name','表示名','名前','キャラクター名']) || '',
        kana: firstValue(row, ['kana','Kana','reading','yomi','読み','ひらがな','かな']) || '',
        romaji: firstValue(row, ['romaji','Romaji','roman','romanji','ローマ字','ヘボン式']) || '',
        gender: normalizeTextValue(firstValue(row, ['gender','Gender','genderTag','gender_tag','GenderTag','sex','Sex','性別','性別タグ'])) || '',
        icon: normalizeIconPath(firstValue(row, ['icon','Icon','image','Image','画像','アイコン','アイコン画像']), firstValue(row, ['romaji','Romaji','roman','romanji','ローマ字','ヘボン式']) || firstValue(row, ['name','Name','displayName','display_name','表示名','名前','キャラクター名']) || ''),
        url: firstValue(row, ['url','URL','link','Link','リンク']) || '',
        tags: uniqueTags([...normalTags, ...categoryTags]),
        speciesTags,
        motifTags,
        jobTags,
        itemTags,
        pointTags,
        categoryTags,
        workTags: collectTagsFromFields(row, ['workTags','worktags','work_tags','WorkTags','works','work','series','seriesTags','series_tags','作品タグ','作品','シリーズ'])
      };
    }).filter(c => c.name || c.kana || c.romaji);

    document.querySelector('#drawRandomBtn')?.addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.delete('id');
      history.replaceState(null, '', url.href);
      drawRandom({ updateUrl:true });
    });
    renderInitialRandomResult();
  }catch(error){
    console.error('ランダムページの初期化に失敗しました', error);
    const root = document.querySelector('#randomResult');
    if(root) root.innerHTML = '<p class="empty">データを読み込めませんでした。</p>';
  }
}

function renderInitialRandomResult(){
  const root = document.querySelector('#randomResult');
  if(!characters.length){
    if(root) root.innerHTML = '<p class="empty">登録キャラクターがありません。</p>';
    return;
  }

  const id = getRequestedCharacterId();
  const requested = id ? findCharacterById(id) : null;

  if(requested){
    currentCharacter = requested;
    renderRandomCharacter(currentCharacter);
    return;
  }

  drawRandom({ updateUrl:false });
}

function drawRandom(options = {}){
  const root = document.querySelector('#randomResult');
  if(!characters.length){
    if(root) root.innerHTML = '<p class="empty">登録キャラクターがありません。</p>';
    return;
  }

  currentCharacter = characters[Math.floor(Math.random() * characters.length)];
  if(options.updateUrl){
    const url = new URL(location.href);
    url.searchParams.set('id', currentCharacter.id);
    history.replaceState(null, '', url.href);
  }
  renderRandomCharacter(currentCharacter);
}

function getRequestedCharacterId(){
  return new URLSearchParams(location.search).get('id')?.trim() || '';
}

function findCharacterById(id){
  const wanted = normalizeIdForCompare(id);
  return characters.find(c => normalizeIdForCompare(c.id) === wanted)
    || characters.find(c => String(c.id).trim() === String(id).trim())
    || null;
}

function normalizeIdForCompare(value){
  const text = String(value ?? '').trim();
  const number = text.match(/\d+/g)?.join('');
  return number || text;
}

function renderRandomCharacter(c){
  const root = document.querySelector('#randomResult');
  root.innerHTML = `
    <article class="character-card random-card">
      <img src="${escapeAttr(getIconSrc(c))}" alt="${escapeAttr(c.name)}のアイコン" loading="lazy" onerror="this.onerror=null;this.src='${escapeAttr(getFallbackIcon(c))}';">
      <div class="card-body">
        <p class="random-label">RESULT</p>
        <h2 class="character-name">${escapeHtml(c.name)}</h2>
        <p class="reading1">${escapeHtml(c.kana)}</p>
        <p class="reading2">${escapeHtml(c.romaji)}</p>
        ${renderCardTags(c, './')}
        ${c.url ? `<a class="detail-link" href="${escapeAttr(c.url)}" target="_blank" rel="noopener">管理サイトはこちら</a>` : ''}
        <div id="randomSharePanel" class="random-share random-share-panel" aria-label="ガチャ結果を共有">
          <p class="random-share-title">結果を共有</p>
          <div class="random-share-buttons">
            <a id="shareXBtn" class="share-button share-x" href="#" target="_blank" rel="noopener">Xで投稿</a>
            <a id="shareBlueskyBtn" class="share-button share-bluesky" href="#" target="_blank" rel="noopener">Blueskyで投稿</a>
            <button id="webShareBtn" class="share-button share-native" type="button">リンクを共有</button>
          </div>
        </div>
      </div>
    </article>`;
  setupCardTagToggles(root);
  updateSharePanel(c);
}

function updateSharePanel(c){
  const panel = document.querySelector('#randomSharePanel');
  const xBtn = document.querySelector('#shareXBtn');
  const bskyBtn = document.querySelector('#shareBlueskyBtn');
  if(!panel || !xBtn || !bskyBtn) return;

  xBtn.href = buildXShareUrl(c);
  bskyBtn.href = buildBlueskyShareUrl(c);
  panel.hidden = false;

  bindShareButtons(panel, c);
}

function bindShareButtons(root, c){
  const btn = root.querySelector('#webShareBtn');
  if(!btn) return;

  if(!navigator.share){
    btn.hidden = true;
    return;
  }

  btn.hidden = false;
  const freshBtn = btn.cloneNode(true);
  btn.replaceWith(freshBtn);
  freshBtn.addEventListener('click', async () => {
    try{
      await navigator.share({
        title: 'ランダムガチャ結果',
        text: buildShareText(c),
        url: getShareUrl(c)
      });
    }catch(error){
      if(error?.name !== 'AbortError') console.warn('共有に失敗しました', error);
    }
  });
}

function buildShareText(c){
  const name = c?.name || 'キャラクター';
  const tagText = SITE_SHARE_TAGS.map(tag => `#${tag}`).join(' ');
  return `${tagText}\nランダムガチャで「${name}」が出ました！`;
}

function getShareUrl(c){
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  if(c?.id) url.searchParams.set('id', c.id);
  return url.href;
}

function buildXShareUrl(c){
  const url = new URL('https://twitter.com/intent/tweet');
  url.searchParams.set('text', buildShareText(c));
  url.searchParams.set('url', getShareUrl(c));
  return url.href;
}

function buildBlueskyShareUrl(c){
  const url = new URL('https://bsky.app/intent/compose');
  url.searchParams.set('text', `${buildShareText(c)}\n${getShareUrl(c)}`);
  return url.href;
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
  if(Array.isArray(value)) return value.flatMap(normalizeTags).filter(Boolean);
  if(typeof value === 'object') return Object.values(value).flatMap(normalizeTags).filter(Boolean);

  const text = String(value).trim();
  if(!text) return [];
  if((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))){
    try{
      const parsedTags = normalizeTags(JSON.parse(text));
      if(parsedTags.length) return parsedTags;
    }catch(_){ }
  }

  return text
    .split(/[|｜,，、\n\r]+/)
    .map(t => t.trim())
    .filter(Boolean);
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

function escapeHtml(s=''){
  return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}
function escapeAttr(s=''){
  return escapeHtml(s).replace(/'/g,'&#39;');
}
