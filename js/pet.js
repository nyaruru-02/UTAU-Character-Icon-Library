(() => {
  'use strict';
  const root = 'image-pet/';
  const stored = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const folderFor = (c) => String(c?.romaji || '').normalize('NFKD').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const state = { pet:null, node:null, actionTimer:null, clickTimer:null, down:null, lastMove:0, strokes:0, lastDirection:0, lastX:0, lastStroke:0, blinkTimer:null, petSpeed:0, swayFrame:null, swayAngle:0, swayTarget:0, petUntil:0, swayEnergy:0, swayPhase:0, lastPetInput:0, lastPointerTime:0 };
  const exists = (url) => new Promise(resolve => { const img = new Image(); img.onload=()=>resolve(true); img.onerror=()=>resolve(false); img.src=url; });
  function file(folder, name) { return `${root}${encodeURIComponent(folder)}/${name}.png`; }
  function setAction(action, duration=700) {
    if (!state.node) return;
    clearTimeout(state.actionTimer);
    if(state.node.dataset.action===action && action==='pet') {
      if(duration) state.actionTimer=setTimeout(()=>{if(!state.down)setAction('idle',0);},duration);
      return;
    }
    state.node.dataset.action=action;
    const head=state.node.querySelector('.pet-head');
    head.src=file(state.pet.folder, ({click:'head2',double:'head4',pet:'head5',blink:'head3'})[action] || 'head1');
    if (duration) state.actionTimer=setTimeout(()=>setAction('idle',0),duration);
  }
  function remove() { cancelAnimationFrame(state.swayFrame); clearTimeout(state.blinkTimer); clearTimeout(state.actionTimer); clearTimeout(state.clickTimer); state.node?.remove(); state.node=null; state.pet=null; try { localStorage.removeItem('iconSitePet'); } catch {} }
  async function mount(data) {
    remove();
    try { localStorage.removeItem('iconSitePetDismissed'); } catch {}
    if (!data?.folder || !(await exists(file(data.folder,'body'))) || !(await exists(file(data.folder,'head1')))) return;
    state.pet=data;
    const el=document.createElement('div'); el.className='site-pet'; el.dataset.action='idle';
    el.setAttribute('aria-label',`${data.name || 'キャラクター'}のペット`);
    el.innerHTML=`<div class="pet-figure" title="クリック・ダブルクリック・撫でる・ドラッグで移動"><img class="pet-tail" alt="" draggable="false"><img class="pet-body" alt="" draggable="false"><div class="pet-head-motion"><img class="pet-head" alt="" draggable="false"></div></div><button type="button" class="pet-close" aria-label="ペットを閉じる">×</button>`;
    el.querySelector('.pet-body').src=file(data.folder,'body');
    el.querySelector('.pet-head').src=file(data.folder,'head1');
    const tail=el.querySelector('.pet-tail'); tail.src=file(data.folder,'tail'); tail.onerror=()=>tail.hidden=true;
    document.body.append(el); state.node=el;
    // Frame-based oscillator: pointer speed changes the intensity, not the head angle.
    // This prevents rapid pointer events from reversing the head abruptly.
    let lastFrame=performance.now();
    const animateSway=(now)=>{
      if(state.node!==el)return;
      const dt=Math.min(50,Math.max(0,now-lastFrame));lastFrame=now;
      const active=el.dataset.action==='pet';
      const fresh=now-state.lastPetInput<140;
      const goal=active && fresh ? Math.min(1,state.petSpeed/0.65) : 0;
      const smoothing=1-Math.exp(-dt/(goal>state.swayEnergy?110:135));
      state.swayEnergy+=(goal-state.swayEnergy)*smoothing;
      state.swayPhase+=dt*0.0065;
      const angle=Math.sin(state.swayPhase)*4.0*state.swayEnergy;
      el.style.setProperty('--pet-sway-angle',`${angle.toFixed(3)}deg`);
      state.swayFrame=requestAnimationFrame(animateSway);
    };
    state.swayFrame=requestAnimationFrame(animateSway);
    const registerStroke=(distance, time)=>{
      const dt=Math.max(8,Math.min(90,time-(state.lastPointerTime||time-16)));
      state.lastPointerTime=time;
      const speed=Math.min(1.3,Math.abs(distance)/dt);
      state.petSpeed+=(speed-state.petSpeed)*0.23;
      state.lastPetInput=time;
    };
    // Blink only while idle, at irregular intervals.
    const scheduleBlink = () => {
      clearTimeout(state.blinkTimer);
      state.blinkTimer = setTimeout(() => {
        if (state.node !== el) return;
        if (el.dataset.action === 'idle' && !state.down) {
          const head=el.querySelector('.pet-head');
          head.src=file(data.folder,'head3');
          setTimeout(()=>{
            if(state.node===el && el.dataset.action==='idle' && !state.down) head.src=file(data.folder,'head1');
          },135);
        }
        scheduleBlink();
      }, 2400 + Math.random() * 4600);
    };
    scheduleBlink();
    const position=stored('iconSitePetPosition');
    const size=()=>el.getBoundingClientRect();
    const place=(x,y)=>{const b=size(); el.style.left=`${Math.max(0,Math.min(innerWidth-b.width,x))}px`; el.style.top=`${Math.max(0,Math.min(innerHeight-b.height,y))}px`; el.style.right='auto';el.style.bottom='auto';};
    place(position?.x ?? innerWidth-190,position?.y ?? innerHeight-210);
    el.querySelector('.pet-close').addEventListener('click', e=>{e.stopPropagation();remove();save('iconSitePetDismissed',true);});
    const fig=el.querySelector('.pet-figure');
    const headZone=(e)=>{const b=fig.getBoundingClientRect();return e.clientX>=b.left+b.width*.22 && e.clientX<=b.left+b.width*.78 && e.clientY>=b.top+b.height*.12 && e.clientY<=b.top+b.height*.64;};
    fig.addEventListener('pointerdown', e=>{
      if(e.button!==0 && e.pointerType==='mouse') return;
      state.down={x:e.clientX,y:e.clientY,left:el.offsetLeft,top:el.offsetTop,drag:false, touchHead:e.pointerType!=='mouse' && headZone(e), lastX:e.clientX, lastY:e.clientY, moved:0};
      state.strokes=0;state.lastX=e.clientX;state.lastDirection=0;state.lastStroke=0;state.petSpeed=0;state.lastPointerTime=0;
      // The head stays lowered with head2 for the entire press.
      setAction('click',0);
      fig.setPointerCapture(e.pointerId);
    });
    fig.addEventListener('pointermove',e=>{
      if(state.down){const dx=e.clientX-state.down.x,dy=e.clientY-state.down.y;
        if(state.down.touchHead){
          const stepX=e.clientX-state.down.lastX, stepY=e.clientY-state.down.lastY;
          state.down.lastX=e.clientX;state.down.lastY=e.clientY;
          if(Math.abs(dx)>10 && Math.abs(dx)>Math.abs(dy)*1.15)state.down.moved++;
          if(state.down.moved>0 && Math.abs(stepX)>0.6){
            registerStroke(stepX,e.timeStamp);
            setAction('pet',0);
          }
          return;
        }
        if(Math.hypot(dx,dy)>9){if(!state.down.drag)setAction('idle',0);state.down.drag=true;}
        if(state.down.drag){place(state.down.left+dx,state.down.top+dy);state.lastMove=Date.now();}return;
      }
      // Hover stroking: require alternating horizontal movement across the head, not mere hover.
      if(e.pointerType!=='mouse')return;
      // Limit petting to the central, upper head region instead of the entire figure.
      const b=fig.getBoundingClientRect();
      const insideHead = e.clientX >= b.left+b.width*.22 && e.clientX <= b.left+b.width*.78 &&
        e.clientY >= b.top+b.height*.12 && e.clientY <= b.top+b.height*.64;
      if (!insideHead) {
        state.strokes=0;state.lastDirection=0;state.lastX=e.clientX;
        if(el.dataset.action==='pet')setAction('idle',0);
        return;
      }
      const dx=e.clientX-state.lastX;state.lastX=e.clientX;
      if(Math.abs(dx)<2)return;
      // Clamp the sway target, not the rendered rotation. Fast pointer motion remains smooth.
      registerStroke(dx,e.timeStamp);
      if(el.dataset.action==='pet')setAction('pet',190);
      const dir=Math.sign(dx);
      if(dir!==state.lastDirection && Date.now()-state.lastStroke<1200)state.strokes++;
      else if(Date.now()-state.lastStroke>=1200)state.strokes=0;
      state.lastDirection=dir;state.lastStroke=Date.now();
      if(state.strokes>=2){
        clearTimeout(state.clickTimer);
        // Cursor speed determines how quickly the head sways; clamp to a gentle range.
        setAction('pet',190);
        state.strokes=0;
      }
    });
    fig.addEventListener('pointerleave',()=>{state.strokes=0;state.lastDirection=0;if(!state.down && el.dataset.action==='pet'){state.petSpeed=0;setAction('idle',0);}});
    fig.addEventListener('pointerup',e=>{
      if(!state.down)return;
      const wasDrag=state.down.drag;
      const wasTouchPet=state.down.touchHead && state.down.moved>0;
      state.down=null;
      if(wasTouchPet){state.petSpeed=0;setAction('idle',0);return;}
      if(wasDrag){setAction('idle',0);save('iconSitePetPosition',{x:el.offsetLeft,y:el.offsetTop});return;}
      // Release immediately restores head1 and its idle breathing motion.
      setAction('idle',0);
      if(Date.now()-state.lastMove<250)return;
      if(state.clickTimer){clearTimeout(state.clickTimer);state.clickTimer=null;setAction('double',1100);}
      else state.clickTimer=setTimeout(()=>{state.clickTimer=null;},300);
    });
    fig.addEventListener('pointercancel',()=>{state.down=null;setAction('idle',0);});
    window.addEventListener('resize',()=>{if(state.node===el)place(el.offsetLeft,el.offsetTop);},{passive:true});
    save('iconSitePet',data);
  }
  async function openDetail(c) {
    const folder=folderFor(c);
    const available=await exists(file(folder,'body')) && await exists(file(folder,'head1'));
    const dlg=document.createElement('dialog');dlg.className='pet-detail-dialog';
    const header=document.createElement('div');header.className='pet-detail-header';
    const heading=document.createElement('div');
    const title=document.createElement('h2');title.textContent=c.name;
    const reading=document.createElement('p');reading.className='pet-detail-reading';
    reading.textContent=[c.kana,c.romaji].filter(Boolean).join(' / ');
    heading.append(title,reading);
    const x=document.createElement('button');x.type='button';x.className='pet-detail-x';x.textContent='×';x.setAttribute('aria-label','閉じる');x.addEventListener('click',()=>dlg.close());
    header.append(heading,x);
    const layout=document.createElement('div');layout.className='pet-detail-layout';
    const portrait=document.createElement('img');portrait.className='pet-detail-portrait';
    portrait.src=c.icon || 'image/人物のアイコン.png';portrait.alt=`${c.name}のアイコン`;
    portrait.onerror=()=>{portrait.onerror=null;portrait.src='image/人物のアイコン.png';};
    const fields=document.createElement('dl');fields.className='pet-detail-fields';
    const addField=(label,values,kind='text')=>{
      const arr=(Array.isArray(values)?values:[values]).filter(Boolean);
      if(!arr.length)return;
      const row=document.createElement('div');row.className='pet-detail-field';
      const dt=document.createElement('dt');dt.textContent=label;
      const dd=document.createElement('dd');
      for(const value of arr){
        if(kind==='tag'){
          const tag=document.createElement('span');tag.className='pet-detail-tag';tag.textContent=value;dd.append(tag);
        }else if(kind==='url'){
          const link=document.createElement('a');link.className='pet-detail-link';link.href=value;link.target='_blank';link.rel='noopener noreferrer';link.textContent='管理サイトはこちら';dd.append(link);
        }else{
          const text=document.createElement('span');text.textContent=value;dd.append(text);
        }
      }
      row.append(dt,dd);fields.append(row);
    };
    addField('性別',c.gender,'tag');
    addField('作品タグ',c.workTags,'tag');
    addField('種族タグ',c.speciesTags,'tag');
    addField('モチーフタグ',c.motifTags,'tag');
    addField('属性タグ',c.attributeTags,'tag');
    addField('職業タグ',c.jobTags,'tag');
    addField('小物タグ',c.itemTags,'tag');
    addField('身体的特徴タグ',c.pointTags,'tag');
    addField('その他のタグ', (c.tags||[]).filter(t=>![...(c.speciesTags||[]),...(c.motifTags||[]),...(c.attributeTags||[]),...(c.jobTags||[]),...(c.itemTags||[]),...(c.pointTags||[])].includes(t)),'tag');
    addField('管理サイト',c.url,'url');
    const portraitArea=document.createElement('div');portraitArea.className='pet-detail-portrait-area';portraitArea.append(portrait);
    layout.append(portraitArea,fields);
    const actions=document.createElement('div');actions.className='pet-detail-actions';
    if(available){
      const btn=document.createElement('button');btn.type='button';btn.textContent='ペットにする';btn.className='pet-start-button';
      btn.addEventListener('click',()=>{dlg.close();mount({folder,name:c.name});});portraitArea.append(btn);
    }else{
      const note=document.createElement('p');note.textContent='このキャラクターのペット画像はまだ登録されていません。';portraitArea.append(note);
    }
    dlg.append(header,layout);document.body.append(dlg);
    dlg.addEventListener('close',()=>dlg.remove(),{once:true});dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close();});dlg.showModal();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const previous=stored('iconSitePet');
    if(previous?.folder) mount(previous);
    else if(!stored('iconSitePetDismissed')) mount({folder:'kiraboshi-waku',name:'輝星惑'});
    document.querySelector('#characterList')?.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ') && e.target.matches('img[data-pet-detail]')){e.preventDefault();e.target.click();}});
    document.querySelector('#characterList')?.addEventListener('click',e=>{
      const trigger=e.target.closest('[data-pet-detail]');if(!trigger)return;
      const id=trigger.getAttribute('data-pet-detail');
      const c=(window.iconSiteCharacters || []).find(c=>String(c.id)===id);
      if(c)openDetail(c);
    });
  });
  window.iconSitePet={openDetail,mount};
})();
