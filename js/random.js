const DATA_URL = new URL('../data/characters.json', document.currentScript.src).href;
let characters = [];

initRandomPage();

async function initRandomPage(){
  const res = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache:'no-store' });
  if(!res.ok){
    document.querySelector('#randomResult').innerHTML = '<p class="empty">characters.jsonを読み込めませんでした。</p>';
    return;
  }

  const data = await res.json();
  const rows = Array.isArray(data) ? data : (Array.isArray(data.characters) ? data.characters : []);
  characters = rows.map((row, index) => ({
    id: firstValue(row, ['id','ID','Id','no','No','番号']) || String(index + 1),
    name: firstValue(row, ['name','Name','displayName','display_name','表示名','名前','キャラクター名']) || '',
    kana: firstValue(row, ['kana','Kana','reading','yomi','読み','ひらがな','かな']) || '',
    romaji: firstValue(row, ['romaji','Romaji','roman','romanji','ローマ字','ヘボン式']) || '',
    icon: firstValue(row, ['icon','Icon','image','Image','画像','アイコン','アイコン画像']) || '',
    url: firstValue(row, ['url','URL','link','Link','リンク']) || '',
    tags: collectTagsFromFields(row, ['tags','tag','Tags','Tag','characterTags','character_tags','normalTags','normal_tags','タグ','通常タグ']),
    workTags: collectTagsFromFields(row, ['workTags','worktags','work_tags','WorkTags','works','work','series','seriesTags','series_tags','作品タグ','作品','シリーズ'])
  })).filter(c => c.name || c.kana || c.romaji);

  document.querySelector('#drawRandomBtn').addEventListener('click', drawRandom);
  drawRandom();
}

function drawRandom(){
  const root = document.querySelector('#randomResult');
  if(!characters.length){
    root.innerHTML = '<p class="empty">登録キャラクターがありません。</p>';
    return;
  }

  const c = characters[Math.floor(Math.random() * characters.length)];
  root.innerHTML = `
    <article class="character-card random-card">
      <img src="${escapeAttr(c.icon)}" alt="${escapeAttr(c.name)}のアイコン" loading="lazy">
      <div class="card-body">
        <p class="random-label">RESULT</p>
        <h2 class="character-name">${escapeHtml(c.name)}</h2>
        <p class="reading1">${escapeHtml(c.kana)}</p>
        <p class="reading2">${escapeHtml(c.romaji)}</p>
        ${c.workTags.length ? `<div class="tags work-tags">${c.workTags.map(t => `<a class="tag work-tag" href="./?work=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('')}</div>` : ''}
        <div class="tags">${c.tags.map(t => `<a class="tag" href="./?tag=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('')}</div>
        ${c.url ? `<a class="detail-link" href="${escapeAttr(c.url)}" target="_blank" rel="noopener">管理サイトはこちら</a>` : ''}
      </div>
    </article>`;
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

function collectTagsFromFields(row, keys){
  const result = [];
  keys.forEach(key => {
    normalizeTags(row?.[key]).forEach(tag => {
      if(tag && !result.includes(tag)) result.push(tag);
    });
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

function escapeHtml(s=''){
  return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}
function escapeAttr(s=''){
  return escapeHtml(s).replace(/'/g,'&#39;');
}
