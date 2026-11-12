const KEY='utauIconCollectionGameV7';
const SPEED_MS=[600,450,300,200,100], TAP_AMOUNTS=[10,20,40,70,100];
const SPEED_COSTS=[150,350,800,1600], TAP_COSTS=[200,450,900,1800];
let PER=12;let chars=[],page=0;const PACK_TIERS=[{size:3,price:100,unlock:0},{size:5,price:200,unlock:100},{size:10,price:400,unlock:300},{size:20,price:800,unlock:700},{size:50,price:2000,unlock:1500},{size:100,price:4000,unlock:3000}];const def={notes:500,points:0,packs:2,packQueue:[3,3],unlockedPackSize:3,collected:[],pending:[],bankedPoints:0,bankSeconds:0,collectorSpeedLevel:1,collectorTapLevel:1};let s=JSON.parse(localStorage.getItem(KEY)||'null')||JSON.parse(JSON.stringify(def));if(!Array.isArray(s.packQueue)){s.packQueue=Array(Math.max(0,Number(s.packs)||0)).fill(Number(s.packSize)||3)}if(!s.unlockedPackSize)s.unlockedPackSize=Math.max(3,Number(s.packSize)||3);if(!Number.isFinite(Number(s.bankedPoints)))s.bankedPoints=0;if(!Number.isFinite(Number(s.bankSeconds)))s.bankSeconds=0;if(!Number.isFinite(Number(s.collectorSpeedLevel)))s.collectorSpeedLevel=1;if(!Number.isFinite(Number(s.collectorTapLevel)))s.collectorTapLevel=1;s.packs=s.packQueue.length;const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];
// v64 sound effects (local assets; played only after successful user actions)
const GAME_SFX={
  open:new Audio('assets/game/sound/pack-open.wav'),
  purchase:new Audio('assets/game/sound/purchase.wav'),
  collect:new Audio('assets/game/sound/point-collect.wav'),
  slice:new Audio('assets/game/sound/pack-slice.wav'),
  store:new Audio('assets/game/sound/card-store.wav'),
  complete:new Audio('assets/game/sound/complete.wav')
};
GAME_SFX.open.volume=0.55; GAME_SFX.purchase.volume=0.45; GAME_SFX.collect.volume=0.30; GAME_SFX.slice.volume=0.42; GAME_SFX.store.volume=0.45; GAME_SFX.complete.volume=0.55;
function playSfx(name){const a=GAME_SFX[name];if(!a)return;try{a.currentTime=0;const p=a.play();if(p&&p.catch)p.catch(()=>{});}catch(_){}}

let completionShowing=false;
function showCollectionComplete(){if(completionShowing)return;completionShowing=true;playSfx('complete');const fx=document.createElement('div');fx.className='collection-complete-fx';fx.innerHTML=`<div class="complete-sparkles">${Array.from({length:28},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><div class="complete-panel"><strong>COLLECTION COMPLETE!</strong><span>すべてのカードを集めました！</span><button type="button">OK</button></div>`;document.body.appendChild(fx);fx.querySelector('button').onclick=()=>{fx.classList.add('closing');setTimeout(()=>{fx.remove();completionShowing=false},260)};setTimeout(()=>fx.classList.add('show'),20);}
function checkCollectionComplete(previousCount){if(chars.length&&previousCount<chars.length&&s.collected.length>=chars.length)showCollectionComplete();}
function save(){localStorage.setItem(KEY,JSON.stringify(s));status()}function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1600)}function rate(){return chars.length?Math.round(s.collected.length/chars.length*100):0}
function renderPackShop(){const host=$('#packBuyCards');if(!host)return;const unlocked=PACK_TIERS.filter(t=>t.size<=s.unlockedPackSize);host.innerHTML=unlocked.map(t=>`<div class="shop-box pack-purchase-box"><span class="shop-icon"><img src="assets/game/png/pack-${t.size}.png" alt=""></span><div><h2>${t.size}枚入り<br>カードパック</h2><p>カードが${t.size}枚入ったパック</p></div><button class="buy-pack-tier" data-pack-size="${t.size}" data-pack-price="${t.price}"><img src="assets/game/note.svg" alt="">${t.price.toLocaleString()}</button></div>`).join('');$$('.buy-pack-tier').forEach(b=>b.onclick=()=>{const size=+b.dataset.packSize,price=+b.dataset.packPrice;if(s.notes<price)return toast('音符が足りません');s.notes-=price;s.packQueue.push(size);s.packs=s.packQueue.length;save();playSfx('purchase');toast(`${size}枚入りパックを1個購入しました`);if(tutorialActive&&tutorialStep==='shop'){setTimeout(()=>setTutorial('coinNav','#walletPoints'),50)}});const currentIndex=PACK_TIERS.findIndex(t=>t.size===s.unlockedPackSize),next=PACK_TIERS[currentIndex+1],up=$('#upgrade'),desc=$('#upgradeDescription'),shop=up?.closest('.upgrade-shop-box');if(next){desc.textContent=`${next.size}枚入りパックを解放`;$('#upgradeCost').textContent=next.unlock.toLocaleString();up.disabled=false;shop?.classList.remove('is-max')}else{desc.textContent='すべてのパックを解放済み';$('#upgradeCost').textContent='MAX';up.disabled=true;shop?.classList.add('is-max')}}
function status(){s.packs=s.packQueue.length;const r=rate();['#notes','#sideNotes','#shopNotes'].forEach(q=>$(q)&&($(q).textContent=s.notes.toLocaleString()));['#points','#sidePoints','#shopPoints'].forEach(q=>$(q)&&($(q).textContent=s.points.toLocaleString()));['#sidePacks','#shopPacks'].forEach(q=>$(q)&&($(q).textContent=s.packs.toLocaleString()));$('#sideRate').textContent=r+'%';$('#rateBar').style.width=r+'%';$('#ringRate').textContent=r+'%';$('#ring').style.setProperty('--p',r+'%');$('#collectCount').textContent=s.collected.length+' / '+chars.length;$('#bookCount').textContent=s.collected.length+' / '+chars.length+' 枚';renderPackShop();const bp=$('#bankedPoints');if(bp)bp.textContent=Math.floor(s.bankedPoints||0).toLocaleString();const cp=$('#collectorCurrentPoints');if(cp)cp.textContent=Number(s.points||0).toLocaleString();const cn=$('#coinNotes');if(cn)cn.textContent=Number(s.notes||0).toLocaleString();const cpk=$('#coinPacks');if(cpk)cpk.textContent=s.packs.toLocaleString();const sr=$('#shopRate');if(sr)sr.textContent=r+'%';const srb=$('#shopRateBar');if(srb)srb.style.width=r+'%';renderCollectorUpgrades()}

// v70 interactive first-play tutorial. Starts only while the collection rate is 0%.
let tutorialActive=false,tutorialStep='';
const TUTORIAL_TEXT={
 home:{title:'まずはパックを開けよう！',text:'「パックを開ける」を押して、最初のカードを手に入れましょう。'},
 select:{title:'3枚入りパックを選ぼう',text:'最初から持っている3枚入りパックを選択してください。'},
 tear:{title:'パックを開封しよう',text:'パック上部を右へスライドして開封してみましょう。'},
 result:{title:'カードを確認！',text:'開封できました。「コレクションへ」を押してカードを収納しましょう。'},
 storePage:{title:'カードの番号を探そう',text:'左の「未収納」に表示されたNo.を確認して、ページをめくりましょう。'},
 store:{title:'カードを収納しよう',text:'同じNo.の空き枠をクリックすると、カードを本へ収納できます。'},
 shopNav:{title:'ショップへ行ってみよう',text:'右上の音符の「＋」ボタンを押すとショップへ移動できます。'},
 shop:{title:'カードパックを買ってみよう',text:'ショップでは音符を使ってパックを購入できます。3枚入りパックを1個購入してください。'},
 coinNav:{title:'ポイントを回収してみよう',text:'右上の「P＋」を押すと、ポイント回収画面へ移動できます。'},
 collect:{title:'音符をタップして回収！',text:'中央の音符をタップすると、たまったポイントを所持ポイントへ移せます。'},
 shopNavAfterCollect:{title:'もう一度ショップへ',text:'右上の音符の「＋」ボタンを押してショップへ戻り、アップグレードを試してみましょう。'},
 upgrade:{title:'アップグレードしてみよう',text:'ポイントを使って機能を強化できます。「パックをアップグレード」を押してみましょう。'},
 done:{title:'チュートリアル完了！',text:'基本操作はこれで完了です。これから自由にコレクションを楽しんでください！'}
};
function tutorialBox(){let el=$('#gameTutorial');if(el)return el;el=document.createElement('div');el.id='gameTutorial';el.className='game-tutorial';el.innerHTML='<div class="tutorial-bubble"><small>はじめての遊び方</small><strong></strong><p></p><button type="button" class="tutorial-skip">チュートリアルを終了</button></div>';document.body.appendChild(el);el.querySelector('.tutorial-skip').onclick=finishTutorial;return el}
function clearTutorialTarget(){$$('.tutorial-target').forEach(x=>x.classList.remove('tutorial-target'))}
function setTutorial(step,target){if(!tutorialActive)return;tutorialStep=step;clearTutorialTarget();const box=tutorialBox(),copy=TUTORIAL_TEXT[step],bubble=box.querySelector('.tutorial-bubble');box.classList.add('show');bubble.classList.toggle('tutorial-upgrade-bubble',step==='upgrade');box.querySelector('strong').textContent=copy.title;box.querySelector('p').textContent=copy.text;const el=typeof target==='string'?$(target):target;if(el){el.classList.add('tutorial-target');requestAnimationFrame(()=>step==='upgrade'?positionTutorialBubbleUpgrade(el):positionTutorialBubble(el))}}
function positionTutorialBubbleUpgrade(el){const box=$('#gameTutorial'),bubble=box?.querySelector('.tutorial-bubble');if(!box||!bubble||!el)return;const r=el.getBoundingClientRect(),bw=Math.min(400,window.innerWidth-32);bubble.style.transform='none';bubble.style.width=bw+'px';bubble.style.left=Math.max(16,Math.min(window.innerWidth-bw-16,r.left+r.width/2-bw/2))+'px';const bh=bubble.offsetHeight||170;let top=r.top-bh-12;if(top<12)top=Math.min(window.innerHeight-bh-12,r.bottom+12);bubble.style.top=Math.max(12,top)+'px'}
function positionTutorialBubble(el){const box=$('#gameTutorial'),bubble=box?.querySelector('.tutorial-bubble');if(!box||!bubble||!el)return;const r=el.getBoundingClientRect(),bw=Math.min(360,window.innerWidth-32),left=Math.max(16,Math.min(window.innerWidth-bw-16,r.left+r.width/2-bw/2));let top=r.bottom+18;if(top+190>window.innerHeight)top=Math.max(16,r.top-190);bubble.style.transform='none';bubble.style.width=bw+'px';bubble.style.left=left+'px';bubble.style.top=top+'px'}
function tutorialPendingId(){return [...s.pending].sort((a,b)=>a-b)[0]??null}
function tutorialGuideCollection(){if(!tutorialActive)return;const id=tutorialPendingId();if(id==null){setTutorial('shopNav','#walletNotes');return}const idx=chars.findIndex(c=>c.id===id);if(idx<0)return;const targetPage=Math.floor(idx/PER);if(page<targetPage){setTutorial('storePage','#next2');return}if(page>targetPage){setTutorial('storePage','#prev2');return}const slot=$(`[data-store="${id}"]`);if(slot)setTutorial('store',slot)}
function startTutorial(){if(tutorialActive||!chars.length||rate()!==0)return;tutorialActive=true;document.body.classList.add('tutorial-active');if(s.pending.length){go('collection');return}setTutorial('home','[data-go="pack"].action')}
function finishTutorial(){tutorialActive=false;tutorialStep='';clearTutorialTarget();document.body.classList.remove('tutorial-active');$('#gameTutorial')?.remove()}
function finishTutorialWithMessage(){if(!tutorialActive)return;clearTutorialTarget();const box=tutorialBox();tutorialStep='done';box.querySelector('strong').textContent=TUTORIAL_TEXT.done.title;box.querySelector('p').textContent=TUTORIAL_TEXT.done.text;const bubble=box.querySelector('.tutorial-bubble');bubble.style.width=Math.min(420,innerWidth-32)+'px';bubble.style.left='50%';bubble.style.top='50%';bubble.style.transform='translate(-50%,-50%)';const btn=box.querySelector('.tutorial-skip');btn.textContent='楽しむ！';btn.onclick=finishTutorial}
function tutorialGuideUpgrade(){if(!tutorialActive)return;const button=$('#upgrade'),card=button?.closest('.upgrade-card')||button;if(!card)return;card.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});setTimeout(()=>{if(tutorialActive&&tutorialStep==='shopNavAfterCollect'){button.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});setTimeout(()=>setTutorial('upgrade',button),260)}},420)}
function tutorialOnNavigate(id){if(!tutorialActive)return;if(id==='pack')setTimeout(()=>setTutorial('select','[data-select-pack="3"]'),30);if(id==='collection')setTimeout(tutorialGuideCollection,50);if(id==='coin'&&tutorialStep==='coinNav')setTimeout(()=>{s.bankedPoints=Math.max(10,Number(s.bankedPoints)||0);save();setTutorial('collect','#tapNote')},40);if(id==='shop'&&tutorialStep==='shopNav')setTimeout(()=>setTutorial('shop','.buy-pack-tier[data-pack-size="3"]'),40);if(id==='shop'&&tutorialStep==='shopNavAfterCollect')setTimeout(tutorialGuideUpgrade,80)}
function go(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$('#sidebar').style.display=id==='home'?'block':'none';if(id==='pack'){if($('#reveal'))$('#reveal').hidden=true;selectedPackSize=null;renderPackSelector();updatePackState();resetTear()}if(id==='collection'){render()}status();tutorialOnNavigate(id)}
let selectedPackSize=null;let lastOpenedPackSize=null;
function packCounts(){const m={};s.packQueue.forEach(n=>m[n]=(m[n]||0)+1);return m}
function renderPackSelector(){
 const host=$('#packSelector'); if(!host)return;
 const counts=packCounts(),sizes=PACK_TIERS.map(t=>t.size).filter(size=>(counts[size]||0)>0);
 host.innerHTML=sizes.length?`<h2>開けるパックを選択</h2><div class="pack-select-grid">${sizes.map(size=>`<button class="pack-select-card" data-select-pack="${size}"><img src="assets/game/png/pack-${size}.png" alt=""><b>${size}枚入り</b><span>所持 ${counts[size]}個</span></button>`).join('')}</div>`:'';
 host.hidden=!sizes.length;
 $$('[data-select-pack]').forEach(b=>b.onclick=()=>{if(tutorialActive&&tutorialStep==='select'&&+b.dataset.selectPack!==3)return;selectedPackSize=+b.dataset.selectPack;setOpeningPackImage(selectedPackSize);host.hidden=true;updatePackState();resetTear();if(tutorialActive&&tutorialStep==='select')setTimeout(()=>setTutorial('tear','#tearHandle'),30)});
}
function setOpeningPackImage(size){const src=`assets/game/png/open-pack-${size}.png`;const base=$('#tearHandle .pack-base'),top=$('#tearHandle .pack-top');if(base)base.src=src;if(top)top.src=src;}
function updatePackState(){s.packs=s.packQueue.length;const has=s.packs>0, chosen=selectedPackSize!=null&&s.packQueue.includes(selectedPackSize); const revealOpen=!$('#reveal').hidden; $('#tearHandle').style.display=has&&chosen&&!revealOpen?'block':'none'; $('.drag-hint').style.display=has&&chosen&&!revealOpen?'flex':'none'; $('#packEmpty').hidden=has||revealOpen; if(!has&&!revealOpen)$('#packEmpty').hidden=false; if(has&&!chosen&&!revealOpen)renderPackSelector();}
function renderRevealActions(){const box=$('#revealActions');const same=lastOpenedPackSize!=null&&s.packQueue.includes(lastOpenedPackSize);if(s.packs>0){box.innerHTML=`${same?'<button id="openSamePack">さらに開ける</button>':''}<button id="again">別のパックを開ける</button><button data-go="collection">コレクションへ</button>`;if(same)$('#openSamePack').onclick=()=>{$('#reveal').hidden=true;selectedPackSize=lastOpenedPackSize;setOpeningPackImage(selectedPackSize);updatePackState();resetTear()};$('#again').onclick=()=>{$('#reveal').hidden=true;selectedPackSize=null;renderPackSelector();updatePackState();resetTear()};box.querySelector('[data-go="collection"]').onclick=()=>go('collection');}else{box.innerHTML='<button data-go="shop">ショップへ行く</button><button data-go="collection">コレクションへ</button>';box.querySelector('[data-go="shop"]').onclick=()=>go('shop');box.querySelector('[data-go="collection"]').onclick=()=>go('collection');}}
function openPack(){if(!chars.length)return toast('データ読込中です');if(s.packQueue.length<1){updatePackState();return toast('パックを持っていません')}if(selectedPackSize==null)return toast('開けるパックを選択してください');const idx=s.packQueue.indexOf(selectedPackSize);if(idx<0){selectedPackSize=null;renderPackSelector();updatePackState();return toast('選択したパックを所持していません')}const openSize=s.packQueue.splice(idx,1)[0];playSfx('open');lastOpenedPackSize=openSize;selectedPackSize=null;s.packs=s.packQueue.length;const pulls=[];for(let i=0;i<openSize;i++){const c=chars[Math.floor(Math.random()*chars.length)],owned=s.collected.includes(c.id)||s.pending.includes(c.id)||pulls.some(x=>x.c.id===c.id);if(owned){s.points+=20;pulls.push({c,dup:true})}else{s.pending.push(c.id);pulls.push({c,dup:false})}}save();$('#revealCards').innerHTML=pulls.map((x,i)=>`<div class="pull" style="animation-delay:${i*.07}s"><img src="${x.c.icon}" alt=""><strong>No.${String(x.c.id).padStart(3,'0')}</strong><span>${x.c.name}</span>${x.dup?'<em>+20 pt</em>':'<i class="new">NEW</i>'}</div>`).join('');$('#reveal').hidden=false; renderRevealActions(); updatePackState();if(tutorialActive)setTimeout(()=>setTutorial('result','#revealActions [data-go="collection"]'),40);}
function filtered(){let a=chars;if($('#ownedOnly').checked)a=a.filter(c=>s.collected.includes(c.id));if($('#missingOnly').checked)a=a.filter(c=>!s.collected.includes(c.id)&&!s.pending.includes(c.id));return a}
function collectionPerPage(){const book=document.querySelector('.book');const w=book?book.getBoundingClientRect().width:Math.max(0,window.innerWidth-306);const pageSafe=w*0.365;const gap=12;const minCard=120;const cols=Math.max(1,Math.min(3,Math.floor((pageSafe+gap)/(minCard+gap))));return cols*4}
function syncCollectionPerPage(){const next=collectionPerPage();if(next!==PER){const first=page*PER;PER=next;page=Math.floor(first/PER)}document.body.classList.remove('collection-per-12','collection-per-8','collection-per-4');document.body.classList.add('collection-per-'+PER)}
function render(){syncCollectionPerPage();const a=filtered(),max=Math.max(0,Math.ceil(a.length/PER)-1);page=Math.min(page,max);const preview=$('.missing-preview');const pendingIds=[...s.pending].sort((a,b)=>a-b);const pendingChar=pendingIds.length?chars.find(c=>c.id===pendingIds[0]):null;if(preview){preview.innerHTML=pendingChar?`<div class="slot pending-preview"><img src="${pendingChar.icon}" alt="${pendingChar.name}"><b>No.${String(pendingChar.id).padStart(3,'0')}</b><span>未収納</span></div>`:`<div class="slot empty"><b>未収納なし</b></div>`;}const slice=a.slice(page*PER,page*PER+PER);$('#range').textContent=`No.${String(page*PER+1).padStart(3,'0')} ～ No.${String(Math.min(a.length,(page+1)*PER)).padStart(3,'0')}`;$('#pageText').textContent=`${page+1} / ${max+1} ページ`;const cardHtml=c=>s.collected.includes(c.id)?`<button class="slot owned" data-detail="${c.id}" type="button"><img src="${c.icon}" alt="${c.name}"><b>No.${String(c.id).padStart(3,'0')}</b></button>`:s.pending.includes(c.id)?`<button class="slot pending" data-store="${c.id}"><b>No.${String(c.id).padStart(3,'0')}</b></button>`:`<div class="slot empty"><b>No.${String(c.id).padStart(3,'0')}</b></div>`;
const filled=[...slice];while(filled.length<PER)filled.push(null);const half=PER/2;
$('#slots').innerHTML=filled.map(c=>c?cardHtml(c):'<div class="slot empty"><b>—</b></div>').join('');$$('[data-store]').forEach(b=>b.onclick=()=>storeCardAnimated(+b.dataset.store,b));if(tutorialActive&&(tutorialStep==='store'||tutorialStep==='storePage'))setTimeout(tutorialGuideCollection,20)}
function storeCardAnimated(id,target){
 if(tutorialActive&&(tutorialStep==='store'||tutorialStep==='storePage')&&id!==tutorialPendingId())return;
 if(target.dataset.storing==='1')return; const c=chars.find(x=>x.id===id); if(!c)return; target.dataset.storing='1';
 const start=document.querySelector('.missing-preview img')?.getBoundingClientRect(); const end=target.getBoundingClientRect();
 const flyer=document.createElement('img'); flyer.className='card-store-flyer'; flyer.src=c.icon; flyer.alt=''; document.body.appendChild(flyer);
 const sx=start?start.left+start.width/2:end.left+end.width/2, sy=start?start.top:start?.bottom||Math.max(12,end.top-220);
 const sw=start?start.width:Math.min(110,end.width), sh=start?start.height:Math.min(145,end.height);
 flyer.style.left=(sx-sw/2)+'px'; flyer.style.top=(sy||Math.max(12,end.top-220))+'px'; flyer.style.width=sw+'px'; flyer.style.height=sh+'px';
 requestAnimationFrame(()=>requestAnimationFrame(()=>{flyer.style.left=(end.left+end.width*.08)+'px';flyer.style.top=(end.top+end.height*.05)+'px';flyer.style.width=(end.width*.84)+'px';flyer.style.height=(end.height*.78)+'px';flyer.style.opacity='1';}));
 setTimeout(()=>playSfx('store'),260);
 setTimeout(()=>{const before=s.collected.length;s.pending=s.pending.filter(x=>x!==id);if(!s.collected.includes(id))s.collected.push(id);save();flyer.remove();render();toast(`No.${String(id).padStart(3,'0')} を収めました`);checkCollectionComplete(before);if(tutorialActive&&tutorialStep==='store'){setTimeout(()=>setTutorial('shopNav','#walletNotes'),60)}},560);
}
$$('[data-go]').forEach(b=>{b.onclick=()=>go(b.dataset.go)});
$('#walletNotes')?.addEventListener('click',()=>go('shop'));
$('#walletPoints')?.addEventListener('click',()=>go('coin'));
$('#upgrade').onclick=()=>{const currentIndex=PACK_TIERS.findIndex(t=>t.size===s.unlockedPackSize),next=PACK_TIERS[currentIndex+1];if(!next)return toast('すべて解放済みです');if(s.points<next.unlock)return toast('ポイントが足りません');s.points-=next.unlock;s.unlockedPackSize=next.size;save();playSfx('purchase');toast(`${next.size}枚入りパックを解放しました`);if(tutorialActive&&tutorialStep==='upgrade')setTimeout(finishTutorialWithMessage,180)};$('#exchange').onclick=()=>{if(s.points<100)return toast('100ポイント必要です');s.points-=100;s.notes+=100;save();toast('100音符に交換しました')};function move(n){const max=Math.max(0,Math.ceil(filtered().length/PER)-1);page=Math.max(0,Math.min(max,n));render()}
$('#prev2')?.addEventListener('click',()=>move(page-1));
$('#next2')?.addEventListener('click',()=>move(page+1));
$('#prev10')?.addEventListener('click',()=>move(page-10));
$('#next10')?.addEventListener('click',()=>move(page+10));
$('#first')?.addEventListener('click',()=>move(0));
$('#last')?.addEventListener('click',()=>move(99999));$('#ownedOnly').onchange=()=>{if($('#ownedOnly').checked)$('#missingOnly').checked=false;page=0;render()};$('#missingOnly').onchange=()=>{if($('#missingOnly').checked)$('#ownedOnly').checked=false;page=0;render()};
fetch('data/characters.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('characters.json '+r.status);return r.json()}).then(d=>{chars=d.sort((a,b)=>a.id-b.id);status();render();updatePackState();setTimeout(startTutorial,180)}).catch(err=>{console.error('character data load failed:',err);toast('キャラクターデータを読み込めませんでした')});status();updatePackState();

const tear=$('#tearHandle');let drag=false,startX=0,progress=0;function resetTear(){progress=0;tear.classList.remove('dragging','torn');$('.cut-progress').style.width='0';const top=tear.querySelector('.pack-top'); if(top) top.style.transform='';}
function pointerX(e){return e.touches?e.touches[0].clientX:e.clientX}
function begin(e){if($('#reveal').hidden===false||s.packs<1)return;drag=true;startX=pointerX(e);progress=0;tear.classList.add('dragging');e.preventDefault()}
function moveTear(e){if(!drag)return;const dx=Math.max(0,pointerX(e)-startX);progress=Math.min(1,dx/135);$('.cut-progress').style.width=`${progress*76}%`; e.preventDefault()}
function end(){if(!drag)return;drag=false;tear.classList.remove('dragging');if(progress>=.9){playSfx('slice');tear.classList.add('torn');$('.cut-progress').style.width='76%';setTimeout(openPack,430)}else{const top=tear.querySelector('.pack-top'); $('.cut-progress').style.transition='width .18s';$('.cut-progress').style.width='0'; if(top) top.style.transition='transform .18s', top.style.transform='translateX(0)'; setTimeout(()=>{$('.cut-progress').style.transition=''; if(top) top.style.transition='';},200);progress=0}}
tear.addEventListener('mousedown',begin);window.addEventListener('mousemove',moveTear);window.addEventListener('mouseup',end);tear.addEventListener('touchstart',begin,{passive:false});window.addEventListener('touchmove',moveTear,{passive:false});window.addEventListener('touchend',end);

// v13: detail panel bound to the actual ".slot[data-detail]" cards.
function openCardDetail(id){
  const c=chars.find(x=>x.id===id); if(!c)return;
  document.getElementById('cardDetailImage').src=c.icon;
  document.getElementById('cardDetailImage').alt=c.name;
  document.getElementById('cardDetailNo').textContent=`No.${String(c.id).padStart(3,'0')}`;
  document.getElementById('cardDetailName').textContent=c.name||'';
  document.getElementById('cardDetailKana').textContent=c.kana||'';
  document.getElementById('cardDetailRomaji').textContent=c.romaji||'';
  const detailGroups=[['gender','性別'],['race','種族タグ','種族'],['motif','モチーフタグ','モチーフ']];
  const tags=detailGroups.map(keys=>{const raw=keys.map(k=>c[k]).find(v=>v);if(!raw)return '';const value=String(raw).split(/[、,]/).map(x=>x.trim()).filter(Boolean).join('・');return value?`<span>${value}</span>`:''}).filter(Boolean);
  document.getElementById('cardDetailTags').innerHTML=tags.join('');
  const link=document.getElementById('cardDetailLink');
  link.href=c.url||'#'; link.hidden=!c.url;
  const m=document.getElementById('cardDetailModal');m.classList.add('open');m.setAttribute('aria-hidden','false');
}
document.addEventListener('click',e=>{
 const b=e.target.closest('.slot[data-detail]'); if(b)openCardDetail(+b.dataset.detail);
});
document.getElementById('cardDetailClose')?.addEventListener('click',()=>{
 const m=document.getElementById('cardDetailModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');
});
document.getElementById('cardDetailModal')?.addEventListener('click',e=>{
 if(e.target.id==='cardDetailModal'){e.currentTarget.classList.remove('open');e.currentTarget.setAttribute('aria-hidden','true')}
});
// v18 reset isolated from collection/shop layout
const resetModal=document.getElementById('resetModal');
document.querySelector('.reset-game-home')?.addEventListener('click',()=>{resetModal.hidden=false});
document.getElementById('resetCancel')?.addEventListener('click',()=>{resetModal.hidden=true});

resetModal?.addEventListener('click',e=>{if(e.target===resetModal)resetModal.hidden=true});


// v48 wallet navigation, tap collector and collector upgrades

function renderCollectorUpgrades(){
  const sl=Math.max(1,Math.min(5,Number(s.collectorSpeedLevel)||1)),tl=Math.max(1,Math.min(5,Number(s.collectorTapLevel)||1));
  const sb=$('#speedUpgrade'),tb=$('#tapUpgrade');
  if($('#speedLevelText'))$('#speedLevelText').textContent=sl>=5?'Lv.5 MAX':`Lv.${sl} → Lv.${sl+1}`;
  if($('#speedEffectText'))$('#speedEffectText').textContent=sl>=5?`${(SPEED_MS[4]/1000).toFixed(1)}秒で1P（最高）`:`${(SPEED_MS[sl-1]/1000).toFixed(2)}秒 → ${(SPEED_MS[sl]/1000).toFixed(2)}秒で1P`;
  if($('#speedUpgradeCost'))$('#speedUpgradeCost').textContent=sl>=5?'MAX':SPEED_COSTS[sl-1].toLocaleString(); if(sb)sb.disabled=sl>=5;
  if($('#tapLevelText'))$('#tapLevelText').textContent=tl>=5?'Lv.5 MAX':`Lv.${tl} → Lv.${tl+1}`;
  if($('#tapEffectText'))$('#tapEffectText').textContent=tl>=5?`${TAP_AMOUNTS[4]}P / タップ（最高）`:`${TAP_AMOUNTS[tl-1]}P → ${TAP_AMOUNTS[tl]}P / タップ`;
  if($('#tapUpgradeCost'))$('#tapUpgradeCost').textContent=tl>=5?'MAX':TAP_COSTS[tl-1].toLocaleString(); if(tb)tb.disabled=tl>=5;
  if($('#collectState'))$('#collectState').textContent=`1タップで${TAP_AMOUNTS[tl-1]}ポイント回収`;
}
$('#speedUpgrade')?.addEventListener('click',()=>{const l=Number(s.collectorSpeedLevel)||1;if(l>=5)return toast('最高レベルです');const c=SPEED_COSTS[l-1];if(s.points<c)return toast('ポイントが足りません');s.points-=c;s.collectorSpeedLevel=l+1;save();playSfx('purchase');toast('コイン回収スピードを強化しました')});
$('#tapUpgrade')?.addEventListener('click',()=>{const l=Number(s.collectorTapLevel)||1;if(l>=5)return toast('最高レベルです');const c=TAP_COSTS[l-1];if(s.points<c)return toast('ポイントが足りません');s.points-=c;s.collectorTapLevel=l+1;save();playSfx('purchase');toast('コイン獲得量を強化しました')});
// Bank points only while the game page is open. Speed upgrades shorten the interval.
setInterval(()=>{
  s.bankSeconds=(Number(s.bankSeconds)||0)+100;
  const interval=SPEED_MS[Math.max(0,Math.min(4,(Number(s.collectorSpeedLevel)||1)-1))];
  if(s.bankSeconds>=interval){const earned=Math.floor(s.bankSeconds/interval);s.bankSeconds%=interval;s.bankedPoints=(Number(s.bankedPoints)||0)+earned;localStorage.setItem(KEY,JSON.stringify(s));const bp=$('#bankedPoints');if(bp)bp.textContent=Math.floor(s.bankedPoints).toLocaleString()}
},100);
const tapNote=$('#tapNote');
tapNote?.addEventListener('click',()=>{
  const amount=TAP_AMOUNTS[Math.max(0,Math.min(4,(Number(s.collectorTapLevel)||1)-1))];
  if((Number(s.bankedPoints)||0)<1){tapNote.classList.remove('tap-pop');void tapNote.offsetWidth;tapNote.classList.add('tap-pop');return toast('まだポイントがたまっていません')}
  const got=Math.min(amount,Math.floor(s.bankedPoints));s.bankedPoints-=got;s.points+=got;playSfx('collect');
  tapNote.classList.remove('tap-pop');void tapNote.offsetWidth;tapNote.classList.add('tap-pop');save();
  if($('#collectState'))$('#collectState').textContent=`${got}ポイント回収しました！`;
  if(tutorialActive&&tutorialStep==='collect'){const need=PACK_TIERS[1].unlock;s.points=Math.max(s.points,need);save();setTimeout(()=>setTutorial('shopNavAfterCollect','#walletNotes'),220)}
});
let collectionResizeTimer;window.addEventListener('resize',()=>{clearTimeout(collectionResizeTimer);collectionResizeTimer=setTimeout(()=>{if(document.getElementById('collection')?.classList.contains('active'))render()},100)});


// Keep the reset result deterministic even when an old game-version key exists.
function hardResetGame(){
  for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith('utauIconCollectionGame'))localStorage.removeItem(k)}
  s=JSON.parse(JSON.stringify(def));
  s.notes=500;s.points=0;s.packs=2;s.packQueue=[3,3];s.unlockedPackSize=3;
  s.collected=[];s.pending=[];s.bankedPoints=0;s.bankSeconds=0;s.collectorSpeedLevel=1;s.collectorTapLevel=1;
  page=0;PER=12;selectedPackSize=null;lastOpenedPackSize=null;
  localStorage.setItem(KEY,JSON.stringify(s));
}
document.getElementById('resetConfirm')?.addEventListener('click',(e)=>{e.preventDefault();hardResetGame();resetModal.hidden=true;document.getElementById('ownedOnly').checked=false;document.getElementById('missingOnly').checked=false;status();render();renderPackSelector();updatePackState();resetTear();go('home');toast('ゲームデータを初期状態に戻しました')});

window.addEventListener('resize',()=>{if(tutorialActive){const t=$('.tutorial-target');if(t){if(tutorialStep==='upgrade')positionTutorialBubbleTop();else positionTutorialBubble(t)}}});
