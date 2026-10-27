  const isReaderHeading = raw => {
    const line=raw.trim();
    if(!line || line.length>100)return false;
    if(/^#{1,3}\s+\S/.test(line))return true;
    if(/^\d{1,2}[.)]\s+[^.!?]{3,85}$/.test(line))return true;
    if(/^(BÖLÜM|KONU|GİRİŞ|SONUÇ|ETİYOLOJİ|PATOGENEZ|KLİNİK BULGULAR|TANI|TEDAVİ|KORUNMA|AŞILAMA|BULAŞMA|BELİRTİLER|AYIRICI TANI|KOMPLİKASYONLAR|ÖZET)\s*:?$/i.test(line))return true;
    return line.length>=4 && line.length<=75 && !/[.!?]$/.test(line) && line===line.toLocaleUpperCase('tr-TR') && /[A-ZÇĞİÖŞÜ]/.test(line) && line.split(/\s+/).length<=10;
  };
  const readerHeadingText = raw => raw.trim().replace(/^#{1,3}\s+/,'').replace(/^\d{1,2}[.)]\s+/,'').replace(/\s*:\s*$/,'').trim();
  const highlightReaderLine = (line,note) => {
    let out=safe(line);
    (note.highlights||[]).filter(Boolean).slice().sort((a,b)=>b.length-a.length).forEach(mark=>{
      if(mark.includes('\n'))return;
      const escaped=safe(mark);
      if(escaped && out.includes(escaped))out=out.replace(escaped,'<mark class="reader-highlight">'+escaped+'</mark>');
    });
    return out || '&nbsp;';
  };
  const readerStudyKeywords=/\b(sınavda|sınav için|dikkat|önemli|kritik|karıştırılmamalı|karıştırmayın|ayırt edici|ayırt edilmelidir|en sık|mutlaka|kesinlikle|istisna|unutmayın|sorulur|soru gelebilir|kilit bilgi)\b/i;
  let studyQuizItems=[],studyQuizIndex=0,studyQuizScore=0,studyQuizMissed=[];
  const paintStudyQuiz = () => {
    const host=$('#noteStudyQuiz');if(!host)return;
    if(!studyQuizItems.length){host.innerHTML='<p class="reader-study-empty">Mini sınav için yeterli başlık bulunamadı. Notunu başlıklarla düzenleyerek tekrar deneyebilirsin.</p>';return;}
    if(studyQuizIndex>=studyQuizItems.length){
      host.innerHTML='<div class="reader-quiz-result"><span class="eyebrow">OTURUM SONUCU</span><strong>'+studyQuizScore+' / '+studyQuizItems.length+' doğru</strong><p>'+Math.round(studyQuizScore/studyQuizItems.length*100)+'% başarı · '+studyQuizMissed.length+' konu tekrar listesinde.</p>'+(studyQuizMissed.length?'<button type="button" class="reader-quiz-primary" data-quiz-action="retry">Yanlışları tekrar et ('+studyQuizMissed.length+')</button>':'<p>Harika! Yanlış yanıtlanan konu yok.</p>')+' <button type="button" class="reader-quiz-secondary" data-quiz-action="restart">Yeniden çöz</button></div>';return;
    }
    const item=studyQuizItems[studyQuizIndex];
    host.innerHTML='<div class="reader-quiz-progress"><span>Soru '+(studyQuizIndex+1)+' / '+studyQuizItems.length+'</span><span>'+studyQuizScore+' doğru</span></div><div class="reader-quiz-track"><span style="width:'+Math.round(studyQuizIndex/studyQuizItems.length*100)+'%"></span></div><article class="reader-quiz-card"><span class="eyebrow">KENDİNİ SINA</span><h4>'+safe(item.question)+'</h4><details class="reader-quiz-answer"><summary>Yanıtı göster</summary><p>'+safe(item.answer||'Bu başlığı nottan tekrar et ve kendi cümlenle açıkla.')+'</p></details><div class="reader-quiz-actions"><button type="button" class="reader-quiz-primary" data-quiz-action="known">Bildim</button><button type="button" class="reader-quiz-secondary" data-quiz-action="missed">Tekrar et</button></div></article>';
  };
  const renderReaderStudy = note => {
    const panel=$('#noteStudyPanel'),button=$('#noteStudyModeBtn');
    if(!panel||!button)return;
    const lines=String(note.body||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
    const warnings=[];
    lines.forEach(line=>{
      const clean=line.replace(/^[-*•▪]+\s*/,'').replace(/^#{1,3}\s*/,'');
      if(readerStudyKeywords.test(clean)&&clean.length>=12&&!warnings.some(x=>x.toLocaleLowerCase('tr-TR')===clean.toLocaleLowerCase('tr-TR')))warnings.push(clean);
    });
    const headings=lines.filter(isReaderHeading).map(readerHeadingText).filter(Boolean);
    const prompts=headings.slice(0,8).map(title=>{
      const at=lines.findIndex(line=>isReaderHeading(line)&&readerHeadingText(line)===title);
      const answer=lines.slice(at+1).find(line=>line&&!isReaderHeading(line)&&line.length>12);
      return {title,answer:answer?answer.replace(/^[-*•▪]+\s*/,'').slice(0,360):''};
    });
    panel.innerHTML='<div class="reader-study-heading"><div><span class="eyebrow">AKTİF HATIRLAMA</span><h2>Çalışma modu</h2><p>Önce kendin cevapla, sonra yanıtı aç.</p></div><button type="button" class="reader-study-close" id="noteStudyClose">Kapat</button></div>'+
      (warnings.length?'<section class="reader-study-section"><h3>⚠ Sınavda dikkat</h3><ul class="reader-study-warnings">'+warnings.slice(0,10).map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul></section>':'<section class="reader-study-section reader-study-empty"><h3>Sınav uyarısı bulunamadı</h3><p>Notta “Dikkat”, “Önemli” veya “Sınavda” gibi ifadeler varsa burada listelenir. Bu bölüm otomatik metin taramasıdır.</p></section>')+
      (prompts.length?'<section class="reader-study-section"><h3>Kendini sına</h3><div class="reader-study-prompts">'+prompts.map((p,i)=>'<details class="reader-study-question"><summary><span>'+(i+1)+'.</span> '+safe(p.title)+' konusu için temel bilgi nedir?</summary><p>'+(p.answer?safe(p.answer):'Bu başlığı not içinde yeniden incele ve kendi cümlenle açıkla.')+'</p></details>').join('')+'</div></section>':'<p class="reader-study-empty">Kendini sınamak için notta başlık bulunamadı. Başlıkları kısa ve belirgin yazmayı deneyebilirsin.</p>')+
      '<section class="reader-study-section"><h3>📝 Mini sınav</h3><p class="reader-quiz-intro">Notta belirgin başlıklar varsa bunlardan kısa tekrar soruları hazırlanır. Soru sayısı notun yapısına bağlıdır.</p><div id="noteStudyQuiz"></div></section>'+
      '<p class="reader-study-disclaimer">Otomatik oluşturulan çalışma yardımıdır; notun içeriğinin yerine geçmez. Mini sınav başlıklardan türetilir, akademik doğruluk kontrolü yapılmış bir test değildir.</p>';
    studyQuizItems=prompts.slice(0,5).map(p=>({question:p.title+' konusundaki temel bilgi nedir?',answer:p.answer}));
    studyQuizIndex=0;studyQuizScore=0;studyQuizMissed=[];
    panel.hidden=true;
    button.setAttribute('aria-pressed','false');
    button.classList.remove('is-active');
  };
  const renderReaderBody = note => {
    const rawLines=String(note.body||'Bu notta henüz içerik yok.').replace(/\r/g,'').split('\n');
    const sections=rawLines.map((text,index)=>({text,index,heading:isReaderHeading(text),title:readerHeadingText(text)})).filter(x=>x.heading);
    const toc=$('#noteReaderToc'), tocList=$('#noteReaderTocList');
    tocList.innerHTML='';
    if(sections.length>1){
      toc.hidden=false;
      sections.forEach((section,i)=>{
        const id='reader-section-'+section.index;
        const li=document.createElement('li'),a=document.createElement('button');
        a.type='button';a.className='reader-toc-link';a.dataset.readerJump=id;
        a.textContent=section.title;
        li.appendChild(a);tocList.appendChild(li);
      });
    }else toc.hidden=true;
    $('#noteReaderBody').innerHTML=rawLines.map((line,index)=>{
      if(isReaderHeading(line)){
        const title=readerHeadingText(line),level=/^\s*###/.test(line)?3:2;
        return '<h'+level+' class="reader-section-heading" id="reader-section-'+index+'" data-reader-line="'+index+'">'+safe(title)+'</h'+level+'>';
      }
      if(!line.trim())return '<div class="reader-paragraph-space" aria-hidden="true"></div>';
      const examCritical=readerStudyKeywords.test(line)&&line.length>=12;
      return '<p class="reader-paragraph'+(examCritical?' reader-exam-critical':'')+'" data-reader-line="'+index+'">'+(examCritical?'<span class="reader-critical-label">SINAVDA DİKKAT</span>':'')+highlightReaderLine(line,note)+'</p>';
    }).join('');
    runReaderSearch($('#noteReaderSearch')?.value||'');
    renderReaderStudy(note);
  };
  const runReaderSearch = query => {
    const q=String(query||'').trim().toLocaleLowerCase('tr-TR');
    readerSearchMatches=[];
    $$('.reader-search-match',$('#noteReaderBody')).forEach(el=>el.classList.remove('reader-search-match'));
    if(q)readerSearchMatches=$$('[data-reader-line]',$('#noteReaderBody')).filter(el=>(el.textContent||'').toLocaleLowerCase('tr-TR').includes(q));
    readerSearchIndex=readerSearchMatches.length?Math.min(readerSearchIndex,readerSearchMatches.length-1):0;
    const count=$('#noteReaderSearchCount');
    count.textContent=q?(readerSearchMatches.length?(readerSearchIndex+1)+' / '+readerSearchMatches.length:'Sonuç yok'):'';
    if(readerSearchMatches.length)readerSearchMatches[readerSearchIndex].classList.add('reader-search-match');
  };
  const jumpReaderSearch = direction => {
    if(!readerSearchMatches.length)return;
    readerSearchMatches[readerSearchIndex]?.classList.remove('reader-search-match');
    readerSearchIndex=(readerSearchIndex+direction+readerSearchMatches.length)%readerSearchMatches.length;
    const target=readerSearchMatches[readerSearchIndex];
    target.classList.add('reader-search-match');
    $('#noteReaderSearchCount').textContent=(readerSearchIndex+1)+' / '+readerSearchMatches.length;
    target.scrollIntoView({behavior:'smooth',block:'center'});
  };
  const updateBookmarkButton = note => {
    const b=$('#noteBookmarkBtn');if(!b||!note)return;
    b.innerHTML=icon(note.bookmarked?'bookmark-check':'bookmark')+'<span>'+(note.bookmarked?'Kaydedildi':'Yer imi')+'</span>';
    b.title=note.bookmarked?'Yer imini kaldır':'Yer imi ekle';
    b.setAttribute('aria-pressed',String(!!note.bookmarked));
  };
  const openNoteReader = id => {
    const note=data.notes.find(n=>String(n.id)===String(id)) || (String(id).startsWith('shared_') ? (()=>{const shared=sharedNotes.find(n=>String(n.id)===String(id).slice(7));return shared?{id:'shared_'+String(shared.id),title:shared.title,course:shared.course,body:shared.content||'',date:(shared.updated_at||shared.created_at||'').slice(0,10),isShared:true}:null;})() : null);if(!note){console.warn('Not okuma ekranı için not bulunamadı:',id);return;}
    readerNoteId=id;try{const stored=Number(localStorage.getItem('readerFontSize'));readerFontSize=Number.isFinite(stored)&&stored>=15&&stored<=25?stored:18;}catch(_){readerFontSize=18;}
    $('#noteReaderCourse').textContent=note.course||'Genel not';
    $('#noteReaderDate').textContent='Oluşturulma tarihi · '+(note.date||'Tarih belirtilmemiş');
    const readerText=String(note.body||'').trim(),wordCount=readerText?readerText.split(/\s+/u).length:0,minutes=Math.max(1,Math.ceil(wordCount/200));const stats=$('#noteReaderStats');if(stats)stats.textContent=wordCount.toLocaleString('tr-TR')+' kelime · yaklaşık '+minutes+' dk okuma';
    $('#noteReaderTitle').textContent=note.title||'Başlıksız not';
    $('#noteReaderSearch').value='';
    $('#noteReaderSearchCount').textContent='';
    readerSearchMatches=[];readerSearchIndex=0;
    renderReaderBody(note);
    $('#noteReaderBody').style.fontSize=readerFontSize+'px';
    const spacing=$('#noteLineSpacing');if(spacing){try{spacing.value=localStorage.getItem('readerLineSpacing')||'1.95';}catch(_){spacing.value='1.95';}$('#noteReaderBody').style.lineHeight=spacing.value;}
    $('#noteReaderBackdrop').hidden=false;document.body.classList.add('note-reader-open');
    $('#noteBookmarkBtn').disabled=!!note.isShared;$('#noteHighlightBtn').disabled=!!note.isShared;
    $('#noteBookmarkBtn').title=note.isShared?'Ortak notlar salt okunurdur':'Yer imi ekle';$('#noteHighlightBtn').title=note.isShared?'Ortak notlar salt okunurdur':'Seçili metni vurgula';
    updateBookmarkButton(note);
    requestAnimationFrame(()=>{const box=$('#noteReaderScroll');const max=box.scrollHeight-box.clientHeight;box.scrollTop=max*Math.max(0,Math.min(1,Number(note.readPosition)||0));updateReaderProgress();});
    refreshIcons();
  };
  const closeNoteReader = () => {
    if(readerNoteId && !String(readerNoteId).startsWith('shared_')){const n=data.notes.find(x=>String(x.id)===String(readerNoteId));if(n){const box=$('#noteReaderScroll'),max=box.scrollHeight-box.clientHeight;n.readPosition=max>0?Math.max(0,Math.min(1,box.scrollTop/max)):0;save();}}
    readerSharedId=null;
    $('#noteReaderBackdrop').hidden=true;document.body.classList.remove('note-reader-open');readerNoteId=null;$('#noteBookmarkBtn').disabled=false;$('#noteHighlightBtn').disabled=false;renderNotes();renderSharedNotes();
  };
  const updateReaderProgress = () => {
    const box=$('#noteReaderScroll');if(!box)return;
    const max=box.scrollHeight-box.clientHeight,percent=Math.round(max>0?Math.max(0,Math.min(100,box.scrollTop/max*100)):100),bar=$('#noteReaderProgress'),track=bar?.parentElement,label=$('#noteReaderProgressLabel');
    if(bar)bar.style.width=percent+'%';if(track)track.setAttribute('aria-valuenow',String(percent));if(label)label.textContent='Okuma ilerlemesi · '+percent+'%';
  };
  $('#noteReaderSearch').addEventListener('input',()=>{readerSearchIndex=0;runReaderSearch($('#noteReaderSearch').value);});
  $('#noteReaderSearchClear').addEventListener('click',()=>{$('#noteReaderSearch').value='';runReaderSearch('');$('#noteReaderSearch').focus();});
  $('#noteReaderSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();jumpReaderSearch(e.shiftKey?-1:1);}});
  $('#noteReaderTocToggle').addEventListener('click',()=>{
    const list=$('#noteReaderTocList'),button=$('#noteReaderTocToggle'),expanded=button.getAttribute('aria-expanded')==='true';
    button.setAttribute('aria-expanded',String(!expanded));list.hidden=expanded;
    button.querySelector('.reader-toc-chevron')?.setAttribute('data-lucide',expanded?'chevron-down':'chevron-up');refreshIcons();
  });
  $('#noteReaderTocList').addEventListener('click',e=>{
    const button=e.target.closest('[data-reader-jump]');if(!button)return;
    const target=document.getElementById(button.dataset.readerJump);if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
    $('.reader-toc-link').forEach(el=>el.classList.toggle('active',el===button));
  });
  $('#noteStudyModeBtn')?.addEventListener('click',()=>{
    const panel=$('#noteStudyPanel'),button=$('#noteStudyModeBtn');if(!panel||!button)return;
    const opening=panel.hidden;panel.hidden=!opening;button.setAttribute('aria-pressed',String(opening));button.classList.toggle('is-active',opening);
    button.title=opening?'Çalışma modunu kapat':'Sınav odaklı çalışma modunu aç';
    if(opening){paintStudyQuiz();panel.scrollIntoView({behavior:'smooth',block:'nearest'});}
  });
  $('#noteStudyPanel')?.addEventListener('click',e=>{
    if(e.target.closest('#noteStudyClose')){$('#noteStudyPanel').hidden=true;$('#noteStudyModeBtn')?.setAttribute('aria-pressed','false');$('#noteStudyModeBtn')?.classList.remove('is-active');return;}
    const action=e.target.closest('[data-quiz-action]')?.dataset.quizAction;if(!action)return;
    if(action==='restart'){studyQuizIndex=0;studyQuizScore=0;studyQuizMissed=[];paintStudyQuiz();return;}
    if(action==='retry'){studyQuizItems=studyQuizMissed.slice();studyQuizMissed=[];studyQuizIndex=0;studyQuizScore=0;paintStudyQuiz();return;}
    const current=studyQuizItems[studyQuizIndex];if(!current)return;
    if(action==='known')studyQuizScore++;else if(action==='missed')studyQuizMissed.push(current);
    studyQuizIndex++;paintStudyQuiz();
  });
  $('#noteReaderClose').addEventListener('click',closeNoteReader);
  $('#noteReaderCloseBottom').addEventListener('click',closeNoteReader);
  $('#noteReaderBackdrop').addEventListener('click',e=>{if(e.target===$('#noteReaderBackdrop'))closeNoteReader();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && $('#noteReaderBackdrop') && !$('#noteReaderBackdrop').hidden){e.preventDefault();closeNoteReader();}});
  $('#noteReaderScroll').addEventListener('scroll',()=>{
    updateReaderProgress();
    if(!readerNoteId || readerNoteId===readerSharedId)return;
    const n=data.notes.find(x=>x.id===readerNoteId),box=$('#noteReaderScroll');if(!n)return;
    const max=box.scrollHeight-box.clientHeight;n.readPosition=max>0?Math.max(0,Math.min(1,box.scrollTop/max)):0;
    clearTimeout(readerSaveTimer);readerSaveTimer=setTimeout(()=>save(),900);
  },{passive:true});
  $('#noteFontDown').addEventListener('click',()=>{readerFontSize=Math.max(15,readerFontSize-1);$('#noteReaderBody').style.fontSize=readerFontSize+'px';try{localStorage.setItem('readerFontSize',String(readerFontSize));}catch(_){}});
  $('#noteFontUp').addEventListener('click',()=>{readerFontSize=Math.min(25,readerFontSize+1);$('#noteReaderBody').style.fontSize=readerFontSize+'px';try{localStorage.setItem('readerFontSize',String(readerFontSize));}catch(_){}});
  $('#noteLineSpacing')?.addEventListener('change',e=>{const value=['1.65','1.95','2.2'].includes(e.target.value)?e.target.value:'1.95';$('#noteReaderBody').style.lineHeight=value;try{localStorage.setItem('readerLineSpacing',value);}catch(_){};});
  $('#noteCopyBtn').addEventListener('click',async()=>{const n=data.notes.find(x=>String(x.id)===String(readerNoteId));const shared=String(readerNoteId||'').startsWith('shared_')?sharedNotes.find(x=>String(x.id)===String(readerNoteId).slice(7)):null;const title=n?.title||shared?.title||'';const body=n?.body??shared?.content??'';if(!n&&!shared)return;try{await navigator.clipboard.writeText(title+'\n\n'+body);toast('Not panoya kopyalandı.');}catch(_){toast('Kopyalama desteklenmiyor. Metni seçip kopyalayabilirsin.');}});
  $('#noteBookmarkBtn').addEventListener('click',()=>{const n=data.notes.find(x=>x.id===readerNoteId);if(!n||n.isShared)return;n.bookmarked=!n.bookmarked;save();updateBookmarkButton(n);renderNotes();toast(n.bookmarked?'Not yer imlerine eklendi.':'Yer imi kaldırıldı.');});
  $('#noteHighlightBtn').addEventListener('click',()=>{
    const n=data.notes.find(x=>x.id===readerNoteId);if(!n||n.isShared)return;
    const selection=window.getSelection(), selected=(selection?selection.toString():'').trim();
    if(!selected||!$('#noteReaderBody').contains(selection.anchorNode)){toast('Önce not içinden bir cümle veya ifade seç.');return;}
    if(selected.length>240||selected.includes('\n')){toast('Lütfen tek satırlık, kısa bir ifade seç.');return;}
    n.highlights=n.highlights||[];
    if(n.highlights.includes(selected)){n.highlights=n.highlights.filter(x=>x!==selected);toast('Metin vurgusu kaldırıldı.');}
    else{n.highlights.push(selected);toast('Seçili metin vurgulandı.');}
    save();renderReaderBody(n);selection.removeAllRanges();
  });
  $('#noteBookmarksFilter').addEventListener('click',()=>{
    showBookmarkedNotes=!showBookmarkedNotes;
    $('#noteBookmarksFilter').setAttribute('aria-pressed',String(showBookmarkedNotes));
    $('#noteBookmarksFilter').classList.toggle('active',showBookmarkedNotes);
    $('#noteBookmarksFilter').innerHTML=icon(showBookmarkedNotes?'bookmark-check':'bookmark')+(showBookmarkedNotes?' Yer imleri açık':' Yer imlerim');
    renderNotes();
  });