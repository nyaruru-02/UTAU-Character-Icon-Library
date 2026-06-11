const DATA_URL = 'data/characters.json';
let characters = [];

initRandomPage();

async function initRandomPage(){
  const res = await fetch(DATA_URL, { cache:'no-store' });
  if(!res.ok){
    document.querySelector('#randomResult').innerHTML = '<p class="empty">characters.jsonを読み込めませんでした。</p>';
    return;
  }

  const data = await res.json();
  characters = data.map(row => ({
    id: row.id || '',
    name: row.name || '',
    kana: row.kana || '',
    romaji: row.romaji || '',
    icon: row.icon || '',
    url: row.url || '',
    tags: Array.isArray(row.tags)
      ? row.tags.map(t => String(t).trim()).filter(Boolean)
      : String(row.tags || '').split('|').map(t => t.trim()).filter(Boolean)
  }));

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
        <div class="tags">${c.tags.map(t => `<a class="tag" href="./?tag=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('')}</div>
        ${c.url ? `<a class="detail-link" href="${escapeAttr(c.url)}" target="_blank" rel="noopener">管理サイトはこちら</a>` : ''}
      </div>
    </article>`;
}

function escapeHtml(s=''){
  return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}
function escapeAttr(s=''){
  return escapeHtml(s).replace(/'/g,'&#39;');
}
