(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const storeKey = 'veterinerAkademi.v1';
  const supabaseClient = window.supabase?.createClient('https://jvbpoibzjihznlljeech.supabase.co', 'sb_publishable_BcGDhOHty5_NsY-wHMI_vg_pAfd1tT9');
  let authUser = null, cloudLoading = false, cloudReady = false, cloudSaveTimer = null, lastLoadedUserId = null;
  const ownerKey = 'veterinerAkademi.ownerId';

  const seed = {
    courses: [
      {id:'c1',name:'Anatomi',year:'1',color:'teal',description:'Organlar, sistemler ve topografik anatomi',topics:8,progress:38},
      {id:'c2',name:'Histoloji ve Embriyoloji',year:'1',color:'purple',description:'Doku yapısı ve gelişim süreçleri',topics:6,progress:24},
      {id:'c3',name:'Fizyoloji',year:'2',color:'blue',description:'Canlı sistemlerin işleyişi',topics:9,progress:52},
      {id:'c4',name:'Mikrobiyoloji',year:'2',color:'gold',description:'Bakteriyoloji, viroloji ve mikoloji',topics:7,progress:31},
      {id:'c5',name:'Patoloji',year:'3',color:'purple',description:'Hastalıkların nedenleri ve mekanizmaları',topics:5,progress:18},
      {id:'c6',name:'Farmakoloji',year:'3',color:'teal',description:'İlaçlar, etki mekanizmaları ve güvenli kullanım',topics:6,progress:12}
    ],
    exams: [
      {id:'e1',course:'Mikrobiyoloji',type:'Vize',date:'2026-11-04',priority:'Yüksek'},
      {id:'e2',course:'Fizyoloji',type:'Final',date:'2026-11-18',priority:'Orta'}
    ],
    notes: [
      {id:'n1',title:'PTH ve kalsiyum dengesi',course:'Fizyoloji',body:'PTH, serum kalsiyum düzeyi düştüğünde salgılanır. Kemik rezorpsiyonunu ve böbrekten kalsiyum geri emilimini artırır; aktif D vitamini oluşumunu destekler.',date:'2026-10-24'},
      {id:'n2',title:'Bakteriyel etkenlerde tanı yaklaşımı',course:'Mikrobiyoloji',body:'Örnek seçimi ve uygun taşıma koşulları tanı başarısını etkiler. Klinik bulgular, mikroskobik inceleme, kültür ve gerekli durumlarda moleküler testler birlikte değerlendirilir.',date:'2026-10-22'}
    ],
    cards: [
      {id:'f1',course:'Mikrobiyoloji',question:'Etiyoloji neyi ifade eder?',answer:'Bir hastalığın nedenini veya hastalığa yol açan etkenleri ifade eder.'},
      {id:'f2',course:'Fizyoloji',question:'PTH salgısını temel olarak hangi değişiklik artırır?',answer:'Serum iyonize kalsiyum düzeyinin düşmesi.'},
      {id:'f3',course:'Patoloji',question:'İnflamasyonun beş temel belirtisi nelerdir?',answer:'Rubor (kızarıklık), calor (ısı artışı), tumor (şişlik), dolor (ağrı) ve functio laesa (fonksiyon kaybı).'}
    ],
    tasks:[false,false,false], taskDate:new Date().toISOString().slice(0,10), dailyGoal:3, focusLength:25, sessions:0, focusMinutes:0, activity:[], sessionHistory:[]
  };
  let data;
  try { data = JSON.parse(localStorage.getItem(storeKey)) || structuredClone(seed); } catch { data = structuredClone(seed); }
  if(!Array.isArray(data.activity))data.activity=[]; if(!Array.isArray(data.sessionHistory))data.sessionHistory=[];
  const todayKey=()=>new Date().toISOString().slice(0,10);
  if(data.taskDate!==todayKey()){data.tasks=[false,false,false];data.taskDate=todayKey();}
  const logActivity=(title,detail='',type='check-circle-2')=>{data.activity=Array.isArray(data.activity)?data.activity:[];data.activity.unshift({id:crypto.randomUUID(),title,detail,type,at:new Date().toISOString()});data.activity=data.activity.slice(0,30);};
  const writeLocal = () => { try { localStorage.setItem(storeKey, JSON.stringify(data)); } catch {} };
  const queueCloudSave = () => {
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(async () => {
      if (!authUser || !cloudReady || cloudLoading || !supabaseClient) return;
      const userId = authUser.id;
      const snapshot = JSON.parse(JSON.stringify(data));
      const { error } = await supabaseClient.from('student_workspaces').upsert({ user_id: userId, data: snapshot, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) { console.error('Bulut kaydı başarısız:', error.message); toast('Buluta kaydedilemedi. Bağlantını kontrol et.'); }
      else { const b=$('#accountButton'); if(b) b.title='Bulut senkronizasyonu etkin'; }
    }, 650);
  };
  const save = () => { writeLocal(); if (authUser && cloudReady && !cloudLoading) queueCloudSave(); };
  let activePage='dashboard', modalType='', activeEditId=null, timerSeconds=(data.focusLength||25)*60, timerRunning=false, timerInterval=null, activeDeck=[], activeCard=0, answerShown=false, selectedAmount='10';
  const safe = v => String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => '<i data-lucide="'+name+'"></i>';
  const refreshIcons = () => { if(window.lucide) lucide.createIcons(); };
  const toast = msg => { const t=$('#toast'), m=$('#toastMessage'); if(!t||!m)return; m.textContent=msg;t.classList.add('show');clearTimeout(toast._timer);toast._timer=setTimeout(()=>t.classList.remove('show'),2600); };
  const empty = (title,desc,ico='book-open') => '<div class="empty-state">'+icon(ico)+'<strong>'+safe(title)+'</strong><p>'+safe(desc)+'</p></div>';
  const go = page => {
    if(page==='admin' && !isLibraryAdmin()){toast('Yönetim paneli yalnızca yönetici hesabına açıktır.');return;}
    activePage=page;
    $$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));
    $$('.nav-item[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
    const labels={dashboard:'Genel Bakış',courses:'Derslerim',exams:'Sınav Takvimi',library:'Ortak Ders Notları',admin:'Yönetim Paneli',notes:'Notlarım',flashcards:'Flash Kartlar',review:'Tekrar Listem',questions:'Soru Çöz',settings:'Ayarlar'};
    $('#crumbCurrent').textContent=labels[page]||'Veteriner Akademi';
    $('#sidebar').classList.remove('open');
    render(); window.scrollTo({top:0,behavior:'smooth'});
  };
  const courseIcon = c => ({teal:'activity',purple:'microscope',blue:'heart-pulse',gold:'bug'})[c.color]||'book-open';
  const courseCard = (c, compact=false) => '<article class="course-card" data-course-open="'+safe(c.id)+'"><div class="course-card-top"><span class="course-symbol '+safe(c.color)+'">'+icon(courseIcon(c))+'</span><div><h3>'+safe(c.name)+'</h3><p>'+safe(c.description||'Ders çalışma alanı')+'</p></div></div><div class="course-progress"><span style="width:'+Math.max(0,Math.min(100,Number(c.progress)||0))+'%"></span></div><div class="course-card-foot"><span>'+safe(c.topics||0)+' konu başlığı</span><strong>%'+(Number(c.progress)||0)+' tamamlandı</strong></div>'+(compact?'':'<div class="course-actions"><button class="mini-action" data-course-topics="'+safe(c.id)+'">'+icon('book-open')+' Konuları gör</button><button class="mini-action" data-course-note="'+safe(c.id)+'">'+icon('notebook-pen')+' Not ekle</button><button class="mini-action" data-course-card="'+safe(c.id)+'">'+icon('layers')+' Kart ekle</button><button class="mini-action" data-course-edit="'+safe(c.id)+'">'+icon('pencil')+' Düzenle</button><button class="mini-action" data-course-delete="'+safe(c.id)+'">'+icon('trash-2')+' Sil</button></div>')+'</article>';
  const examRow = e => { const d=new Date(e.date+'T12:00:00');const day=String(d.getDate()).padStart(2,'0');const month=d.toLocaleDateString('tr-TR',{month:'short'}).replace('.','');return '<div class="exam-row"><div class="exam-date"><strong>'+day+'</strong><small>'+safe(month)+'</small></div><div class="exam-info"><strong>'+safe(e.course)+'</strong><small>'+safe(e.type)+' sınavı · '+d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})+'</small></div><span class="exam-type">'+safe(e.type)+'</span><button class="exam-delete" data-exam-delete="'+safe(e.id)+'" title="Sınavı sil">'+icon('x')+'</button></div>'; };
  const renderDashboard = () => {
    $('#todayDate').textContent=new Date().toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'});
    $('#weeklySessions').textContent=String(data.sessions||0);
    const completedTasks=(data.tasks||[]).filter(Boolean).length, goal=Math.max(1,Number(data.dailyGoal)||3), goalPct=Math.min(100,Math.round(completedTasks/goal*100));
    $('#goalProgress').textContent=String(completedTasks);const goalTotal=$('#goalTotal');if(goalTotal)goalTotal.textContent='/ '+goal+' görev';const goalBar=$('#goalProgressBar');if(goalBar)goalBar.style.width=goalPct+'%';const goalCaption=$('#goalCaption');if(goalCaption)goalCaption.textContent=completedTasks>=goal?'Günlük hedef tamamlandı':(goal-completedTasks)+' görev daha tamamla';
    $('#savedCount').textContent=String(data.notes.length+data.cards.length);
    const focusTotal=$('#focusTotal');if(focusTotal)focusTotal.textContent=String(Math.max(0,Number(data.focusMinutes)||0));
    $('#dashboardCourses').innerHTML=data.courses.slice(0,4).map(c=>{const topics=Array.isArray(c.topicList)?c.topicList:[];const progress=topics.length?Math.round(topics.filter(t=>t.done).length/topics.length*100):0;return courseCard({...c,topics:topics.length,progress},true);}).join('')||empty('Henüz ders yok','Bir ders ekleyerek çalışma alanını oluştur.','book-open');
    const activityHost=$('#dashboardActivity');if(activityHost){const activities=(data.activity||[]).slice(0,5);activityHost.innerHTML=activities.map(a=>'<div class="dashboard-activity-item"><span class="dashboard-activity-icon">'+icon(a.type||'check-circle-2')+'</span><span class="dashboard-activity-copy"><strong>'+safe(a.title)+'</strong><small>'+safe(a.detail||'Çalışma alanı')+' · '+new Date(a.at).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+'</small></span></div>').join('')||empty('Henüz etkinlik yok','Bir konuyu tamamla veya odak oturumu bitir; geçmişin burada görünsün.','activity');}
    const today=new Date();today.setHours(0,0,0,0);
    const upcomingExams=data.exams.filter(e=>e.date&&new Date(e.date+'T12:00:00')>=today).sort((a,b)=>a.date.localeCompare(b.date));
    $('#dashboardExams').innerHTML=upcomingExams.slice(0,3).map(examRow).join('')||empty('Yaklaşan sınav yok','Sınav takvimine yeni bir tarih ekleyebilirsin.','calendar-days');
    const reviewTopics=[];data.courses.forEach(course=>(course.topicList||[]).forEach(topic=>{if(topic.needsReview)reviewTopics.push({course,topic});}));
    const reviewHost=$('#dashboardReviewTopics');if(reviewHost)reviewHost.innerHTML=reviewTopics.slice(0,3).map(({course,topic})=>'<button type="button" class="dashboard-review-item" data-page="review"><span class="dashboard-review-icon">'+icon('rotate-ccw')+'</span><span class="dashboard-review-copy"><strong>'+safe(topic.title)+'</strong><small>'+safe(course.name)+(topic.lastReviewed?' · Son tekrar: '+safe(topic.lastReviewed):' · Henüz tekrar edilmedi')+'</small></span>'+icon('arrow-right')+'</button>').join('')||empty('Tekrar bekleyen konu yok','Bir konuyu tekrar listene eklediğinde burada görünecek.','check-circle-2');
    $$('.task-item input').forEach((el,i)=>{el.checked=!!data.tasks[i];el.closest('.task-item').classList.toggle('done',!!data.tasks[i]);});
    const taskList=$('#taskList'); if(taskList){const count=(data.tasks||[]).filter(Boolean).length;const pill=$('.tiny-pill',taskList.parentElement);if(pill)pill.textContent=count+'/'+(data.dailyGoal||3);}
  };
  const renderCourses = () => {
    const q=($('#courseSearch')?.value||'').toLocaleLowerCase('tr-TR'), year=$('#semesterFilter')?.value||'all';
    const list=data.courses.filter(c=>(c.name+' '+(c.description||'')).toLocaleLowerCase('tr-TR').includes(q)&&(year==='all'||c.year===year));
    $('#allCourses').innerHTML=list.map(c=>courseCard(c)).join('')||empty('Aramana uygun ders bulunamadı','Farklı bir kelime dene veya yeni bir ders ekle.','search');
    $('#courseResultLabel').textContent=list.length+' ders';
    $('#courseCount').textContent=String(data.courses.length);
  };
  const renderExams = () => {
    const filter=$('#examFilter')?.value||'all', list=data.exams.filter(e=>filter==='all'||e.type===filter).sort((a,b)=>a.date.localeCompare(b.date));
    $('#allExams').innerHTML=list.map(examRow).join('')||empty('Sınav kaydı yok','Yeni sınav ekleyerek takvimini oluştur.','calendar-days');
    const now=new Date();now.setHours(0,0,0,0);
    const upcoming=data.exams.filter(e=>new Date(e.date+'T12:00:00')>=now).length;
    $('#examSummary').innerHTML='<div class="summary-tile"><span>Takvimdeki sınavlar</span><strong>'+data.exams.length+'</strong></div><div class="summary-tile"><span>Yaklaşan sınavlar</span><strong>'+upcoming+'</strong></div><div class="summary-tile"><span>Yüksek öncelik</span><strong>'+data.exams.filter(e=>e.priority==='Yüksek').length+'</strong></div>';
  };
  let readerNoteId=null, readerFontSize=18, readerSaveTimer=null, showBookmarkedNotes=false, readerSharedId=null;
  let sharedNotes=[], sharedLibraryLoading=false, sharedEditingId=null;
  const isLibraryAdmin=()=>authUser?.app_metadata?.role==='admin';
  let readerSearchMatches=[], readerSearchIndex=0;
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
  const renderSharedNotes=()=>{
    const grid=$('#sharedNotesGrid');if(!grid)return;
    const visibleNotes=sharedNotes.filter(n=>n.published!==false);
    const q=($('#sharedNoteSearch')?.value||'').trim().toLocaleLowerCase('tr-TR'),cs=$('#sharedNoteCourseFilter'),ts=$('#sharedNoteTopicFilter'),oldC=cs?.value||'all',oldT=ts?.value||'all';
    const courses=[...new Set(visibleNotes.map(n=>n.course).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
    const topics=[...new Set(visibleNotes.filter(n=>oldC==='all'||n.course===oldC).map(n=>n.topic).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
    if(cs){cs.innerHTML='<option value="all">Tüm dersler</option>'+courses.map(x=>'<option value="'+safe(x)+'">'+safe(x)+'</option>').join('');cs.value=courses.includes(oldC)?oldC:'all';}
    if(ts){ts.innerHTML='<option value="all">Tüm konular</option>'+topics.map(x=>'<option value="'+safe(x)+'">'+safe(x)+'</option>').join('');ts.value=topics.includes(oldT)?oldT:'all';}
    const c=cs?.value||'all',t=ts?.value||'all',sort=$('#sharedNoteSort')?.value||'newest',list=visibleNotes.filter(n=>(n.title+' '+n.course+' '+(n.topic||'')+' '+n.content).toLocaleLowerCase('tr-TR').includes(q)&&(c==='all'||n.course===c)&&(t==='all'||n.topic===t));
    const dateValue=value=>{const time=Date.parse(value||'');return Number.isFinite(time)?time:0;};
    list.sort((a,b)=>{if(sort==='title')return (a.title||'').localeCompare(b.title||'','tr',{sensitivity:'base',numeric:true});if(sort==='course')return (a.course||'').localeCompare(b.course||'','tr',{sensitivity:'base',numeric:true})||(a.title||'').localeCompare(b.title||'','tr',{sensitivity:'base',numeric:true});if(sort==='updated')return dateValue(b.updated_at||b.created_at)-dateValue(a.updated_at||a.created_at);return dateValue(b.created_at)-dateValue(a.created_at);});
    const count=$('#sharedNoteResultCount');if(count)count.textContent=list.length+' not';
    grid.innerHTML=list.length?list.map(n=>'<article class="note-card note-card-reader shared-note-card"><div class="note-meta shared-note-meta"><span class="shared-note-course">'+icon('book-open-text')+' '+safe(n.course)+'</span>'+(n.topic?'<span class="shared-note-topic">'+safe(n.topic)+'</span>':'')+'</div><h3>'+safe(n.title)+'</h3><p>'+safe(n.content)+'</p><div class="shared-note-actions"><button class="note-read-button" data-shared-note-read="'+safe(n.id)+'">'+icon('book-open-text')+' Notu oku <span>→</span></button></div><footer><span>'+icon('calendar-days')+' '+safe((n.updated_at||n.created_at||'').slice(0,10)||'Ortak not')+'</span><span>Ortak kütüphane</span></footer></article>').join(''):empty(sharedLibraryLoading?'Notlar yükleniyor':visibleNotes.length?'Eşleşen not bulunamadı':'Henüz yayınlanmış not yok',sharedLibraryLoading?'Ortak kütüphane kontrol ediliyor.':sharedNotes.length?'Arama kelimesini değiştirebilir veya filtreleri temizleyebilirsin.':'Yeni ortak notlar eklendiğinde burada ders ve konu başlıklarına göre görünecek.',sharedNotes.length?'search':'library-big');
    refreshIcons();
  };
  const renderAdminPanel=()=>{
    const host=$('#adminSharedNotesGrid');if(!host)return;
    const admin=!!authUser&&isLibraryAdmin();
    const nav=$('#adminNavItem'),label=$('#adminWorkspaceLabel');
    if(nav)nav.hidden=!admin;if(label)label.hidden=!admin;
    const notes=sharedNotes.slice().sort((a,b)=>(a.course||'').localeCompare(b.course||'','tr')||(a.topic||'').localeCompare(b.topic||'','tr')||(a.title||'').localeCompare(b.title||'','tr'));
    const published=notes.filter(n=>n.published!==false),drafts=notes.filter(n=>n.published===false);
    const courses=new Set(notes.map(n=>(n.course||'').trim()).filter(Boolean));
    const topics=new Set(notes.map(n=>((n.course||'').trim()+'::'+(n.topic||'').trim())).filter(k=>k!=='::'&&k.split('::')[1]));
    const setText=(id,value)=>{const el=$(id);if(el)el.textContent=String(value);};
    setText('#adminSharedNoteCount',notes.length);setText('#adminPublishedNoteCount',published.length);setText('#adminDraftNoteCount',drafts.length);setText('#adminSharedCourseCount',courses.size);setText('#adminSharedTopicCount',topics.size);
    if(!admin){host.innerHTML=empty('Yönetici erişimi gerekli','Bu bölüm yalnızca yönetici yetkili hesaplar içindir.','shield-check');return;}
    if(sharedLibraryLoading){host.innerHTML=empty('İçerikler yükleniyor','Ortak ders notları kontrol ediliyor.','loader-circle');return;}
    const search=$('#adminNoteSearch')?.value?.trim().toLocaleLowerCase('tr-TR')||'';
    const courseFilter=$('#adminNoteCourseFilter'),statusFilter=$('#adminNoteStatusFilter');
    const oldCourse=courseFilter?.value||'all';
    const courseNames=[...courses].sort((a,b)=>a.localeCompare(b,'tr'));
    if(courseFilter){courseFilter.innerHTML='<option value="all">Tüm dersler</option>'+courseNames.map(c=>'<option value="'+safe(c)+'">'+safe(c)+'</option>').join('');courseFilter.value=courseNames.includes(oldCourse)?oldCourse:'all';}
    const selectedCourse=courseFilter?.value||'all',status=statusFilter?.value||'all';
    const filtered=notes.filter(n=>(selectedCourse==='all'||n.course===selectedCourse)&&(status==='all'||(status==='published'?n.published!==false:n.published===false))&&(String(n.title||'')+' '+String(n.course||'')+' '+String(n.topic||'')+' '+String(n.content||'')).toLocaleLowerCase('tr-TR').includes(search));
    setText('#adminNoteResultCount',filtered.length+' / '+notes.length+' içerik');
    host.innerHTML=filtered.length?filtered.map(n=>{
      const isPublished=n.published!==false;
      const statusLabel=isPublished?'YAYINDA':'TASLAK / GİZLİ';
      const statusClass=isPublished?'published':'draft';
      const safeId=safe(n.id);
      return '<article class="admin-note-row"><div class="admin-note-main"><div class="admin-note-tags"><span>'+icon('book-open-text')+' '+safe(n.course)+'</span>'+(n.topic?'<span>'+icon('list-tree')+' '+safe(n.topic)+'</span>':'')+'<span class="admin-status-pill '+statusClass+'"><span></span>'+statusLabel+'</span></div><h3>'+safe(n.title)+'</h3><p>'+safe(n.content)+'</p><small>'+icon('calendar-days')+' Güncelleme: '+safe((n.updated_at||n.created_at||'').slice(0,10)||'Tarih yok')+'</small></div><div class="admin-note-actions"><button class="outline-button" data-shared-note-edit="'+safeId+'" type="button">'+icon('pencil')+' Düzenle</button><button class="admin-publish-button '+(isPublished?'is-published':'is-draft')+'" data-shared-note-publish="'+safeId+'" data-published="'+(isPublished?'true':'false')+'" type="button">'+icon(isPublished?'eye-off':'send')+(isPublished?' Yayından kaldır':'Yayınla')+'</button><button class="note-delete-button" data-shared-note-delete="'+safeId+'" type="button" aria-label="Ortak notu sil">'+icon('trash-2')+'</button></div></article>';
    }).join(''):empty(notes.length?'Filtreye uygun içerik yok':'Henüz ortak not yok',notes.length?'Arama kelimesini veya filtreleri değiştir.':'İlk akademik içeriğini ekleyerek ortak kütüphaneyi oluşturmaya başla.','book-open-text');
    refreshIcons();
  };
    // Ortak not okuma: belge yakalama aşamasında işle; diğer tıklama
  // dinleyicilerinden bağımsız çalışsın ve hata olursa kullanıcıya bildirilsin.
  document.addEventListener('click',e=>{
    const target=e.target instanceof Element ? e.target : e.target?.parentElement;
    const button=target?.closest('[data-shared-note-read]');
    if(!button)return;
    e.preventDefault();
    e.stopPropagation();
    const rawId=button.getAttribute('data-shared-note-read');
    const shared=sharedNotes.find(n=>String(n.id)===String(rawId));
    if(!shared){toast('Not henüz yüklenemedi. Sayfayı yenileyip tekrar dene.');console.warn('Ortak not listede bulunamadı:',rawId);return;}
    const id='shared_'+String(shared.id);
    readerSharedId=id;
    try{
      openNoteReader(id);
      if($('#noteReaderBackdrop')?.hidden)throw new Error('Not okuma penceresi görünür duruma getirilemedi.');
    }catch(err){
      console.error('Ortak not açılamadı:',err);
      const detail=String(err?.message||err||'Bilinmeyen hata').slice(0,180);
      toast('Not açılamadı: '+detail);
    }
  },true);
  const loadSharedNotes=async()=>{
    if(!supabaseClient){sharedNotes=[];sharedLibraryLoading=false;renderSharedNotes();renderAdminPanel();return;}
    sharedLibraryLoading=true;renderSharedNotes();
    let sharedQuery=supabaseClient.from('shared_notes').select('id,course,topic,title,content,published,created_at,updated_at').order('course',{ascending:true}).order('topic',{ascending:true}).order('title',{ascending:true});if(!isLibraryAdmin())sharedQuery=sharedQuery.eq('published',true);const {data:rows,error}=await sharedQuery;
    sharedLibraryLoading=false;if(error){console.error('Ortak notlar yüklenemedi:',error.message);sharedNotes=[];renderSharedNotes();renderAdminPanel();return;}sharedNotes=rows||[];renderSharedNotes();renderAdminPanel();
  };
  const openSharedNoteEditor=note=>{
    if(!isLibraryAdmin()){toast('Ortak not eklemek için yönetici yetkisi gerekir.');return;}
    sharedEditingId=note?.id||null;openModal('sharedNote');$('#modalTitle').textContent=note?'Ortak notu düzenle':'Ortak ders notu ekle';$('#modalEyebrow').textContent='ORTAK KÜTÜPHANE YÖNETİMİ';
    const submit=$('#modalForm button[type="submit"]');if(submit)submit.innerHTML=icon('check')+(note?' Değişiklikleri kaydet':' Yayınla');
    if(note){$('[name="course"]').value=note.course||'';$('[name="topic"]').value=note.topic||'';$('[name="title"]').value=note.title||'';$('[name="body"]').value=note.content||'';}refreshIcons();
  };
  const renderNotes = () => {
    const q=($('#noteSearch')?.value||'').toLocaleLowerCase('tr-TR'), course=$('#noteCourseFilter')?.value||'all';
    const select=$('#noteCourseFilter');if(select){const val=select.value;select.innerHTML='<option value="all">Tüm dersler</option>'+data.courses.map(c=>'<option>'+safe(c.name)+'</option>').join('');if([...select.options].some(o=>o.value===val))select.value=val;}
    const list=data.notes.filter(n=>(n.title+' '+n.body+' '+n.course).toLocaleLowerCase('tr-TR').includes(q)&&(course==='all'||n.course===course)&&(!showBookmarkedNotes||n.bookmarked));
    $('#notesGrid').innerHTML=list.map(n=>'<article class="note-card note-card-reader"><div class="note-meta">'+icon(n.bookmarked?'bookmark-check':'notebook-pen')+' '+safe(n.course||'Genel not')+(n.bookmarked?' · Yer imli':'')+'</div><h3>'+safe(n.title)+'</h3><p>'+safe(n.body)+'</p><div class="note-card-actions"><button class="note-read-button" data-note-read="'+safe(n.id)+'">'+icon('book-open-text')+(n.readPosition>0.03?' Kaldığın yerden devam et':' Notu oku')+' <span>→</span></button><button class="note-delete-button" data-note-delete="'+safe(n.id)+'" aria-label="Notu sil" title="Notu sil">'+icon('trash-2')+'</button></div><footer><span>'+icon('calendar-days')+' '+safe(n.date||'Bugün')+'</span><span>'+(n.highlights&&n.highlights.length?n.highlights.length+' vurgu':'Okuma görünümü')+'</span></footer></article>').join('')||empty('Not arşivin hazır','İlk notunu oluşturarak önemli bilgilerini kaydet.','notebook-pen');
  };
  const renderFlashcards = () => {
    const groups={};data.cards.forEach(c=>(groups[c.course||'Genel kartlar']??=[]).push(c));
    $('#flashSetCount').textContent=Object.keys(groups).length+' set';
    $('#flashSets').innerHTML=Object.entries(groups).map(([name,cards],i)=>'<article class="flash-set"><div class="flash-set-head"><span class="course-symbol '+['teal','purple','gold','blue'][i%4]+'">'+icon('layers')+'</span><span class="result-label">'+cards.length+' kart</span></div><h3>'+safe(name)+'</h3><div class="flash-card-admin-list">'+cards.map(c=>'<div class="flash-card-admin-item"><span>'+safe(c.question)+'</span><div><button class="mini-action" data-card-edit="'+safe(c.id)+'" aria-label="Kartı düzenle">'+icon('pencil')+'</button><button class="mini-action" data-card-delete="'+safe(c.id)+'" aria-label="Kartı sil">'+icon('trash-2')+'</button></div></div>').join('')+'</div><button class="outline-button" data-deck="'+safe(name)+'">Tekrar et '+icon('arrow-right')+'</button></article>').join('')||empty('Henüz flash kart yok','Kart oluşturup tekrar setini hazırlayabilirsin.','layers');
  };
  const renderReview = () => {
    const review=[];
    data.courses.forEach(course=>(course.topicList||[]).forEach(topic=>{if(topic.needsReview)review.push({course,topic});}));
    const count=$('#reviewCount');if(count)count.textContent=String(review.length);
    const summary=$('#reviewSummary');if(summary)summary.innerHTML='<article class="review-stat"><span>Tekrar bekleyen konu</span><strong>'+review.length+'</strong></article><article class="review-stat"><span>Hatırlama denemesi</span><strong>'+review.reduce((n,x)=>n+(x.topic.recalledCount||0),0)+'</strong></article>';
    const host=$('#reviewTopicList');if(!host)return;
    host.innerHTML=review.map(({course,topic})=>'<article class="review-topic-card"><div class="review-topic-icon">'+icon('rotate-ccw')+'</div><div class="review-topic-copy"><span class="eyebrow">'+safe(course.name)+'</span><h3>'+safe(topic.title)+'</h3><p>'+safe(topic.summary.slice(0,180))+(topic.summary.length>180?'…':'')+'</p><small>'+(topic.lastReviewed?'Son tekrar: '+safe(topic.lastReviewed):'Henüz tekrar tarihi yok')+'</small></div><button class="primary-button" data-review-topic="'+safe(course.id)+'|'+safe(topic.id)+'">Tekrar çalış '+icon('arrow-right')+'</button></article>').join('')||'<div class="review-empty"><span>'+icon('check-circle-2')+'</span><h2>Tekrar bekleyen konu yok</h2><p>Bir konu çalışırken “Tekrar etmeliyim” seçeneğini işaretlediğinde burada görünecek.</p><button class="outline-button" data-page="courses">Derslerime dön</button></div>';
    refreshIcons();
  };
  const render = () => { renderDashboard();renderCourses();renderExams();renderNotes();renderFlashcards();renderReview();renderAdminPanel();refreshIcons(); };

  let activeTopicCourseId=null;
  const renderCourseTopics=id=>{
    const course=data.courses.find(c=>c.id===id);if(!course)return;activeTopicCourseId=id;
    let panel=$('#courseTopicsPanel');
    if(!panel){panel=document.createElement('section');panel.id='courseTopicsPanel';panel.className='course-topics-panel';$('#allCourses').parentElement.insertBefore(panel,$('#allCourses'));}
    $('#allCourses').hidden=true;panel.hidden=false;
    const topics=course.topicList||[];
    panel.innerHTML='<div class="topics-header"><button class="text-button" id="backToCourses">'+icon('arrow-left')+' Tüm dersler</button><div class="topics-heading"><span class="eyebrow">'+safe(course.year)+'. SINIF · KONU ÇALIŞMA</span><h2>'+safe(course.name)+'</h2><p>'+safe(course.description||'Ders konuları ve kişisel tekrar alanı')+'</p></div><div class="topic-header-actions"><button class="outline-button" id="editCourseBtn">'+icon('pencil')+' Dersi düzenle</button><button class="primary-button" id="addTopicBtn">'+icon('plus')+' Konu ekle</button></div><div class="topics-summary"><span>'+topics.length+' konu</span><span>'+topics.filter(t=>t.done).length+' tamamlandı</span><span>İlerleme '+(topics.length?Math.round(topics.filter(t=>t.done).length/topics.length*100):0)+'%</span></div><div class="topic-list">'+(topics.length?topics.map((t,i)=>'<article class="topic-item"><div class="topic-number">'+String(i+1).padStart(2,'0')+'</div><div class="topic-copy"><h3>'+safe(t.title)+'</h3><p>'+safe(t.summary.slice(0,150))+(t.summary.length>150?'…':'')+'</p><span class="topic-status '+(t.needsReview?'needs-review':t.done?'done':'')+'">'+(t.needsReview?'Tekrar gerekli':t.done?'Tamamlandı':'Çalışılmadı')+'</span></div><div class="topic-item-actions"><button class="outline-button topic-open" data-topic-study="'+safe(t.id)+'">Konu çalış '+icon('arrow-right')+'</button><button class="mini-action" data-topic-edit="'+safe(t.id)+'" aria-label="Konuyu düzenle">'+icon('pencil')+'</button><button class="mini-action" data-topic-delete="'+safe(t.id)+'" aria-label="Konuyu sil">'+icon('trash-2')+'</button></div></article>').join(''):'<div class="topics-empty"><h3>Henüz konu eklenmedi</h3><p>İlk konuyu ekleyerek bu ders için kişisel çalışma yolunu oluştur.</p><button class="primary-button" id="addFirstTopicBtn">'+icon('plus')+' İlk konuyu ekle</button></div>')+'</div>';
    refreshIcons();
  };
  const studyTopic=id=>{
    const course=data.courses.find(c=>c.id===activeTopicCourseId),topic=course?.topicList?.find(t=>t.id===id);if(!course||!topic)return;
    $('#courseTopicsPanel').innerHTML='<div class="topics-header"><button class="text-button" id="backToTopicList">'+icon('arrow-left')+' Konu listesine dön</button><span class="eyebrow">'+safe(course.name)+'</span></div><article class="topic-study-card"><span class="eyebrow">KONU ANLATIMI</span><h2>'+safe(topic.title)+'</h2><div class="topic-study-body">'+safe(topic.summary).replace(/\n/g,'<br>')+'</div>'+'<section class="active-recall-card"><span class="eyebrow">AKTİF HATIRLAMA</span><h3>Kendini sına</h3><p class="recall-question">Bu konunun en önemli noktalarını, notlarına bakmadan kendi cümlelerinle açıklayabilir misin?</p><div class="recall-answer" id="recallAnswer" hidden><strong>'+icon('lightbulb')+' Cevabını kontrol et</strong><p>'+safe(topic.keypoint||topic.summary).replace(/\n/g,'<br>')+'</p></div><button class="outline-button" id="revealRecallAnswer">'+icon('eye')+' Cevabı göster</button><div class="recall-rating" id="recallRating" hidden><span>Ne kadar hatırladın?</span><div><button class="outline-button" id="recallNeedsReview">'+icon('rotate-ccw')+' Tekrar etmeliyim</button><button class="primary-button" id="recallGotIt">'+icon('check')+' Hatırladım</button></div></div></section>'+'<div class="topic-study-actions"><button class="outline-button" id="topicAddNote">'+icon('notebook-pen')+' Bu konudan not oluştur</button><button class="outline-button" id="topicAddCard">'+icon('layers')+' Flash kart oluştur</button><button class="primary-button" id="markTopicDone">'+icon('check-circle-2')+' '+(topic.done?'Tamamlandı':'Konuyu tamamladım')+'</button></div></article>';
    refreshIcons();
    $('#topicAddNote').addEventListener('click',()=>{openModal('note');setTimeout(()=>{const s=$('[name="course"]');if(s)s.value=course.name;const t=$('[name="title"]');if(t)t.value=topic.title;const b=$('[name="body"]');if(b)b.value=topic.summary+(topic.keypoint?'\n\nSınavda hatırla: '+topic.keypoint:'');},0);});
    $('#topicAddCard').addEventListener('click',()=>{openModal('card');setTimeout(()=>{const s=$('[name="course"]');if(s)s.value=course.name;const q=$('[name="question"]');if(q)q.value=topic.title+' konusunun temel noktası nedir?';const a=$('[name="answer"]');if(a)a.value=topic.keypoint||topic.summary.slice(0,220);},0);});
    $('#markTopicDone').addEventListener('click',()=>{topic.done=!topic.done;course.progress=course.topicList.length?Math.round(course.topicList.filter(t=>t.done).length/course.topicList.length*100):0;logActivity(topic.done?'Konu tamamlandı':'Konu tekrar açıldı',course.name+' · '+topic.title,topic.done?'check-circle-2':'rotate-ccw');save();renderCourses();renderDashboard();renderCourseTopics(activeTopicCourseId);toast(topic.done?'Konu tamamlandı olarak işaretlendi.':'Konu tekrar listesine alındı.');});
    $('#revealRecallAnswer').addEventListener('click',()=>{$('#recallAnswer').hidden=false;$('#recallRating').hidden=false;$('#revealRecallAnswer').hidden=true;});
    $('#recallNeedsReview').addEventListener('click',()=>{topic.needsReview=true;topic.lastReviewed=new Date().toISOString().slice(0,10);save();renderReview();renderCourseTopics(activeTopicCourseId);studyTopic(topic.id);toast('Konu tekrar listene eklendi.');});
    $('#recallGotIt').addEventListener('click',()=>{topic.needsReview=false;topic.lastReviewed=new Date().toISOString().slice(0,10);topic.recalledCount=(topic.recalledCount||0)+1;save();renderReview();renderCourseTopics(activeTopicCourseId);studyTopic(topic.id);toast('Harika! Konu tekrar durumun güncellendi.');});
  };
  document.addEventListener('click',async e=>{
    const editCourse=e.target.closest('#editCourseBtn');if(editCourse&&activeTopicCourseId){openModal('course',activeTopicCourseId);return;}
    const editTopic=e.target.closest('[data-topic-edit]');if(editTopic){openModal('topic',editTopic.dataset.topicEdit);return;}
    const deleteTopic=e.target.closest('[data-topic-delete]');if(deleteTopic){const course=data.courses.find(x=>x.id===activeTopicCourseId),topic=course?.topicList?.find(x=>x.id===deleteTopic.dataset.topicDelete);if(course&&topic&&confirm('“'+topic.title+'” konusunu silmek istiyor musun?')){course.topicList=course.topicList.filter(x=>x.id!==topic.id);course.topics=course.topicList.length;course.progress=course.topicList.length?Math.round(course.topicList.filter(x=>x.done).length/course.topicList.length*100):0;save();render();renderCourseTopics(course.id);toast('Konu silindi.');}return;}
    if(e.target.closest('#backToCourses')){const p=$('#courseTopicsPanel');if(p)p.hidden=true;$('#allCourses').hidden=false;return;}
    if(e.target.closest('#addTopicBtn')||e.target.closest('#addFirstTopicBtn')){openModal('topic');setTimeout(()=>{const s=$('[name="course"]');if(s)s.value=data.courses.find(c=>c.id===activeTopicCourseId)?.name||'';},0);return;}
    const study=e.target.closest('[data-topic-study]');if(study){studyTopic(study.dataset.topicStudy);return;}
    const reviewTopic=e.target.closest('[data-review-topic]');if(reviewTopic){const [courseId,topicId]=reviewTopic.dataset.reviewTopic.split('|');activeTopicCourseId=courseId;renderCourseTopics(courseId);studyTopic(topicId);return;}
    if(e.target.closest('#backToTopicList')){renderCourseTopics(activeTopicCourseId);return;}
  });

  const openModal = (type, editId=null) => {
    modalType=type;activeEditId=editId;const title={course:'Yeni ders ekle',exam:'Sınav takvimine ekle',note:'Yeni not oluştur',card:'Flash kart oluştur',topic:'Ders konusunu ekle',sharedNote:'Ortak ders notu ekle'}[type];
    $('#modalTitle').textContent=title;$('#modalEyebrow').textContent=({course:'DERS YÖNETİMİ',exam:'SINAV PLANLAMA',note:'KİŞİSEL KÜTÜPHANE',card:'AKTİF HATIRLAMA',topic:'KONU ÇALIŞMA ALANI',sharedNote:'ORTAK KÜTÜPHANE YÖNETİMİ'})[type];
    const courses='<option value="">Ders seç (isteğe bağlı)</option>'+data.courses.map(c=>'<option>'+safe(c.name)+'</option>').join('');
    const field=(label,name,placeholder='',kind='text',required=true)=>'<label class="field-label">'+label+(kind==='textarea'?'<textarea class="field-textarea" name="'+name+'" placeholder="'+placeholder+'" '+(required?'required':'')+'></textarea>':kind==='select'?'<select class="field-select" name="'+name+'" '+(required?'required':'')+'>'+placeholder+'</select>':'<input class="field-input" type="'+kind+'" name="'+name+'" placeholder="'+placeholder+'" '+(required?'required':'')+'>')+'</label>';
    let html='';
    if(type==='course') html=field('Ders adı','name','Örn. İç Hastalıkları')+field('Sınıf','year','<option value="1">1. sınıf</option><option value="2">2. sınıf</option><option value="3">3. sınıf</option><option value="4">4. sınıf</option><option value="5">5. sınıf</option>','select')+field('Kısa açıklama','description','Dersin kapsamı', 'text',false);
    if(type==='exam') html=field('Ders adı','course','Örn. Mikrobiyoloji')+field('Sınav türü','type','<option>Vize</option><option>Final</option><option>Bütünleme</option>','select')+field('Sınav tarihi','date','','date')+field('Öncelik','priority','<option>Yüksek</option><option selected>Orta</option><option>Düşük</option>','select');
    if(type==='note') html=field('Not başlığı','title','Örn. İnflamasyonun temel belirtileri')+field('Ders','course',courses,'select',false)+field('Not içeriği','body','Önemli bilgileri buraya yaz...','textarea');
    if(type==='sharedNote') html=field('Ders','course','Örn. Patoloji')+field('Konu / alt başlık','topic','Örn. İnflamasyonun patogenezi')+field('Not başlığı','title','Örn. Akut inflamasyon')+field('Akademik not içeriği','body','Başlıklar ve alt başlıklarla metin notunu buraya yaz...','textarea');
    if(type==='card') html=field('Ders / set adı','course','Örn. Patoloji')+field('Kartın sorusu','question','Ön yüzde görülecek soru')+field('Cevap','answer','Kısa ve net yanıt','textarea');
    if(type==='topic') html=field('Ders','course',courses,'select')+field('Konu başlığı','title','Örn. Hücre zarının yapısı')+field('Kısa konu anlatımı','summary','Temel kavramları buraya yaz...','textarea')+field('Sınavda hatırlanacak nokta','keypoint','Önemli tanım veya ayrım','textarea',false);
    $('#modalFields').innerHTML=html;
    if(editId){const val=(name,value)=>{const el=$('[name="'+name+'"]');if(el)el.value=value??'';};
      if(type==='course'){const item=data.courses.find(x=>x.id===editId);if(item){val('name',item.name);val('year',item.year);val('description',item.description);$('#modalTitle').textContent='Dersi düzenle';}}
      if(type==='topic'){const course=data.courses.find(x=>x.id===activeTopicCourseId),item=course?.topicList?.find(x=>x.id===editId);if(item){val('course',course.name);val('title',item.title);val('summary',item.summary);val('keypoint',item.keypoint);$('#modalTitle').textContent='Konuyu düzenle';}}
      if(type==='card'){const item=data.cards.find(x=>x.id===editId);if(item){val('course',item.course);val('question',item.question);val('answer',item.answer);$('#modalTitle').textContent='Flash kartı düzenle';}}
    }
    $('#modalBackdrop').hidden=false;$('#modalBackdrop').setAttribute('aria-hidden','false');refreshIcons();setTimeout(()=>$('#modalFields input, #modalFields textarea')?.focus(),50);
  };
  const closeModal=()=>{$('#modalBackdrop').hidden=true;$('#modalBackdrop').setAttribute('aria-hidden','true');$('#modalForm').reset();modalType='';activeEditId=null;sharedEditingId=null;};
  $('#modalClose').addEventListener('click',closeModal);$('#modalCancel').addEventListener('click',closeModal);
  $('#modalBackdrop').addEventListener('click',e=>{if(e.target===$('#modalBackdrop'))closeModal();});
  $('#modalForm').addEventListener('submit',async e=>{
    e.preventDefault();const submittedType=modalType;const f=Object.fromEntries(new FormData(e.currentTarget).entries());
    if(submittedType==='sharedNote'){
      if(!isLibraryAdmin()||!authUser){toast('Yönetici hesabıyla giriş yapmalısın.');return;}
      const editing=!!sharedEditingId,existingShared=editing?sharedNotes.find(n=>String(n.id)===String(sharedEditingId)):null,payload={course:f.course.trim(),topic:f.topic.trim(),title:f.title.trim(),content:f.body.trim(),published:existingShared?existingShared.published!==false:true,updated_at:new Date().toISOString()};
      if(!payload.course||!payload.title||!payload.content){toast('Ders, başlık ve not içeriği zorunludur.');return;}
      const result=editing?await supabaseClient.from('shared_notes').update(payload).eq('id',sharedEditingId):await supabaseClient.from('shared_notes').insert({...payload,created_by:authUser.id});
      if(result.error){console.error('Ortak not kaydedilemedi:',result.error.message);toast('Ortak not kaydedilemedi. Yönetici yetkisini ve bağlantıyı kontrol et.');return;}
      closeModal();await loadSharedNotes();toast(editing?'Ortak not güncellendi.':'Ortak not yayınlandı.');return;
    }
    if(modalType==='course'&&activeEditId){const item=data.courses.find(x=>x.id===activeEditId);if(item){const oldName=item.name;item.name=f.name.trim();item.year=f.year;item.description=f.description.trim()||'Ders çalışma alanı';data.exams.forEach(x=>{if(x.course===oldName)x.course=item.name;});data.notes.forEach(x=>{if(x.course===oldName)x.course=item.name;});data.cards.forEach(x=>{if(x.course===oldName)x.course=item.name;});}}
    else if(modalType==='course')data.courses.push({id:crypto.randomUUID(),name:f.name.trim(),year:f.year,color:['teal','purple','blue','gold'][data.courses.length%4],description:f.description.trim()||'Ders çalışma alanı',topics:0,progress:0});
    if(modalType==='exam')data.exams.push({id:crypto.randomUUID(),course:f.course.trim(),type:f.type,date:f.date,priority:f.priority});
    if(modalType==='note'){data.notes.unshift({id:crypto.randomUUID(),title:f.title.trim(),course:f.course||'Genel',body:f.body.trim(),date:new Date().toISOString().slice(0,10)});logActivity('Ders notu oluşturuldu',f.course||'Genel','notebook-pen');}
    if(modalType==='card'&&activeEditId){const item=data.cards.find(x=>x.id===activeEditId);if(item){item.course=f.course.trim();item.question=f.question.trim();item.answer=f.answer.trim();}}
    else if(modalType==='card'){data.cards.push({id:crypto.randomUUID(),course:f.course.trim(),question:f.question.trim(),answer:f.answer.trim()});logActivity('Flash kart oluşturuldu',f.course.trim(),'layers');}
    if(modalType==='topic'&&activeEditId){const course=data.courses.find(c=>c.id===activeTopicCourseId),item=course?.topicList?.find(x=>x.id===activeEditId);if(item){const destination=data.courses.find(c=>c.name===f.course);if(destination&&destination.id!==course.id){course.topicList=course.topicList.filter(x=>x.id!==item.id);course.topics=course.topicList.length;destination.topicList=destination.topicList||[];destination.topicList.push({...item,title:f.title.trim(),summary:f.summary.trim(),keypoint:(f.keypoint||'').trim()});destination.topics=destination.topicList.length;activeTopicCourseId=destination.id;}else{item.title=f.title.trim();item.summary=f.summary.trim();item.keypoint=(f.keypoint||'').trim();}}}
    else if(modalType==='topic'){const course=data.courses.find(c=>c.name===f.course);if(course){course.topicList=course.topicList||[];course.topicList.push({id:crypto.randomUUID(),title:f.title.trim(),summary:f.summary.trim(),keypoint:(f.keypoint||'').trim(),done:false});course.topics=course.topicList.length;activeTopicCourseId=course.id;}}
    const wasEditing=!!activeEditId;save();closeModal();render();if(submittedType==='topic'&&activeTopicCourseId)renderCourseTopics(activeTopicCourseId);if(submittedType==='course'&&activeTopicCourseId&&data.courses.some(c=>c.id===activeTopicCourseId))renderCourseTopics(activeTopicCourseId);toast(wasEditing?'Değişiklikler kaydedildi.':'Kaydın başarıyla oluşturuldu.');
  });
  document.addEventListener('click',async e=>{
    const nav=e.target.closest('[data-page]');if(nav){e.preventDefault();go(nav.dataset.page);return;}
    const goBtn=e.target.closest('[data-go]');if(goBtn){go(goBtn.dataset.go);return;}
    const ctopics=e.target.closest('[data-course-topics]');if(ctopics){renderCourseTopics(ctopics.dataset.courseTopics);return;}
    const cnote=e.target.closest('[data-course-note]');if(cnote){openModal('note');setTimeout(()=>{const s=$('[name="course"]');if(s)s.value=data.courses.find(c=>c.id===cnote.dataset.courseNote)?.name||'';},0);return;}
    const ccard=e.target.closest('[data-course-card]');if(ccard){openModal('card');setTimeout(()=>{const s=$('[name="course"]');if(s)s.value=data.courses.find(c=>c.id===ccard.dataset.courseCard)?.name||'';},0);return;}
    const editCourseCard=e.target.closest('[data-course-edit]');if(editCourseCard){openModal('course',editCourseCard.dataset.courseEdit);return;}
    const editCard=e.target.closest('[data-card-edit]');if(editCard){openModal('card',editCard.dataset.cardEdit);return;}
    const deleteCard=e.target.closest('[data-card-delete]');if(deleteCard){const item=data.cards.find(x=>x.id===deleteCard.dataset.cardDelete);if(item&&confirm('“'+item.question+'” flash kartını silmek istiyor musun?')){data.cards=data.cards.filter(x=>x.id!==item.id);save();render();toast('Flash kart silindi.');}return;}
    const delCourse=e.target.closest('[data-course-delete]');if(delCourse){const c=data.courses.find(c=>c.id===delCourse.dataset.courseDelete);if(c&&confirm(c.name+' dersini ve bağlantılı çalışma kayıtlarını silmek istiyor musun?')){data.courses=data.courses.filter(x=>x.id!==c.id);data.notes=data.notes.filter(n=>n.course!==c.name);data.cards=data.cards.filter(n=>n.course!==c.name);data.exams=data.exams.filter(n=>n.course!==c.name);if(activeTopicCourseId===c.id){activeTopicCourseId=null;const panel=$('#courseTopicsPanel');if(panel)panel.hidden=true;$('#allCourses').hidden=false;}save();render();toast('Ders ve bağlantılı kayıtlar silindi.');}return;}
    const delExam=e.target.closest('[data-exam-delete]');if(delExam){data.exams=data.exams.filter(x=>x.id!==delExam.dataset.examDelete);save();render();toast('Sınav kaydı silindi.');return;}

    const sharedEdit=e.target.closest('[data-shared-note-edit]');if(sharedEdit){if(!isLibraryAdmin()||activePage!=='admin')return;const note=sharedNotes.find(x=>String(x.id)===String(sharedEdit.dataset.sharedNoteEdit));if(note)openSharedNoteEditor(note);return;}
    const publishToggle=e.target.closest('[data-shared-note-publish]');if(publishToggle){const note=sharedNotes.find(x=>String(x.id)===String(publishToggle.dataset.sharedNotePublish));if(!note||!isLibraryAdmin()||activePage!=='admin')return;const nextPublished=publishToggle.dataset.published!=='true';const action=nextPublished?'yayınlansın':'yayından kaldırılsın';if(!confirm('“'+note.title+'” '+action+' mı?'))return;publishToggle.disabled=true;const {error}=await supabaseClient.from('shared_notes').update({published:nextPublished,updated_at:new Date().toISOString()}).eq('id',note.id);if(error){toast('Yayın durumu değiştirilemedi. Yönetici yetkisini kontrol et.');publishToggle.disabled=false;return;}await loadSharedNotes();toast(nextPublished?'İçerik yayınlandı.':'İçerik yayından kaldırıldı.');return;}
    const sharedDelete=e.target.closest('[data-shared-note-delete]');if(sharedDelete){const note=sharedNotes.find(x=>String(x.id)===String(sharedDelete.dataset.sharedNoteDelete));if(!note||!isLibraryAdmin()||activePage!=='admin')return;if(confirm('“'+note.title+'” ortak kütüphaneden silinsin mi?')){const {error}=await supabaseClient.from('shared_notes').delete().eq('id',note.id);if(error){toast('Not silinemedi. Yönetici yetkisini kontrol et.');return;}await loadSharedNotes();toast('Ortak not silindi.');}return;}
    const readNote=e.target.closest('[data-note-read]');if(readNote){const note=data.notes.find(x=>x.id===readNote.dataset.noteRead);if(note){openNoteReader(note.id);}return;}
    const delNote=e.target.closest('[data-note-delete]');if(delNote){const removed=data.notes.find(x=>x.id===delNote.dataset.noteDelete);data.notes=data.notes.filter(x=>x.id!==delNote.dataset.noteDelete);save();render();toast('Not silindi.');return;}
    const deck=e.target.closest('[data-deck]');if(deck){startDeck(deck.dataset.deck);return;}
    const openCourse=e.target.closest('[data-course-open]');if(openCourse&&!e.target.closest('button'))renderCourseTopics(openCourse.dataset.courseOpen);
  });
  $('#addCourseBtn').addEventListener('click',()=>openModal('course'));
  $('#addExamBtn').addEventListener('click',()=>openModal('exam'));
  $('#addNoteBtn').addEventListener('click',()=>openModal('note'));
  $('#sharedNoteAddBtn')?.addEventListener('click',()=>{if(!isLibraryAdmin()||activePage!=='admin'){toast('Ortak içerik eklemek için Yönetim Paneli’ni aç.');return;}openSharedNoteEditor(null);});
  $('#adminNoteSearch')?.addEventListener('input',renderAdminPanel);$('#adminNoteCourseFilter')?.addEventListener('change',renderAdminPanel);$('#adminNoteStatusFilter')?.addEventListener('change',renderAdminPanel);
  $('#sharedNoteSearch')?.addEventListener('input',renderSharedNotes);$('#sharedNoteResetFilters')?.addEventListener('click',()=>{const search=$('#sharedNoteSearch'),course=$('#sharedNoteCourseFilter'),topic=$('#sharedNoteTopicFilter');if(search)search.value='';if(course)course.value='all';if(topic)topic.value='all';const sort=$('#sharedNoteSort');if(sort)sort.value='newest';renderSharedNotes();});$('#sharedNoteCourseFilter')?.addEventListener('change',()=>{const t=$('#sharedNoteTopicFilter');if(t)t.value='all';renderSharedNotes();});$('#sharedNoteTopicFilter')?.addEventListener('change',renderSharedNotes);$('#sharedNoteSort')?.addEventListener('change',renderSharedNotes);
  $('#addCardBtn')?.addEventListener('click',()=>openModal('card'));
  $('#courseSearch').addEventListener('input',renderCourses);$('#semesterFilter').addEventListener('change',renderCourses);
  $('#examFilter').addEventListener('change',renderExams);$('#noteSearch').addEventListener('input',renderNotes);$('#noteCourseFilter').addEventListener('change',renderNotes);
  $('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){const q=e.target.value.toLocaleLowerCase('tr-TR');if(data.courses.some(c=>c.name.toLocaleLowerCase('tr-TR').includes(q)))go('courses');else if(data.notes.some(n=>(n.title+n.body).toLocaleLowerCase('tr-TR').includes(q)))go('notes');else if(data.cards.some(c=>(c.question+c.answer).toLocaleLowerCase('tr-TR').includes(q)))go('flashcards');else toast('Bu ifadeyle eşleşen kayıt bulunamadı.');}});
  $('#menuToggle').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#notificationBtn').addEventListener('click',()=>toast(data.exams.length?'Sınav takvimini kontrol etmeyi unutma.':'Henüz bildirim yok.'));
  $('#editPlanBtn').addEventListener('click',()=>{const next=prompt('Günlük hedef kaç görev olsun? (2–5)',String(data.dailyGoal||3));const n=Number(next);if(Number.isInteger(n)&&n>=2&&n<=5){data.dailyGoal=n;save();toast('Günlük hedef güncellendi.');render();}});
  $('#taskList').addEventListener('change',e=>{if(e.target.matches('input[type=checkbox]')){const items=$('#taskList input');data.tasks=items.map(x=>x.checked);data.taskDate=todayKey();logActivity(e.target.checked?'Günlük görev tamamlandı':'Günlük görev yeniden açıldı',e.target.closest('.task-item')?.querySelector('strong')?.textContent||'Plan görevi',e.target.checked?'check-circle-2':'rotate-ccw');save();renderDashboard();toast('Günlük plan güncellendi.');}});
  $('#dailyGoal').addEventListener('change',e=>{data.dailyGoal=Number(e.target.value);save();toast('Günlük hedef kaydedildi.');renderDashboard();});
  $('#focusLength').addEventListener('change',e=>{data.focusLength=Number(e.target.value);timerSeconds=data.focusLength*60;updateTimer();save();});
  const overlay=$('#focusOverlay');
  const openFocus=()=>{timerSeconds=(data.focusLength||25)*60;timerRunning=false;clearInterval(timerInterval);updateTimer();overlay.hidden=false;};
  const closeFocus=()=>{overlay.hidden=true;timerRunning=false;clearInterval(timerInterval);$('#timerToggle').innerHTML=icon('play')+' Başlat';refreshIcons();};
  const updateTimer=()=>{$('#timerDisplay').textContent=String(Math.floor(timerSeconds/60)).padStart(2,'0')+':'+String(timerSeconds%60).padStart(2,'0');};
  const toggleTimer=()=>{if(timerRunning){clearInterval(timerInterval);timerRunning=false;$('#timerToggle').innerHTML=icon('play')+' Devam et';refreshIcons();}else{timerRunning=true;$('#timerToggle').innerHTML=icon('pause')+' Duraklat';refreshIcons();timerInterval=setInterval(()=>{timerSeconds--;updateTimer();if(timerSeconds<=0){clearInterval(timerInterval);timerRunning=false;data.sessions=(data.sessions||0)+1;data.focusMinutes=(data.focusMinutes||0)+(data.focusLength||25);data.sessionHistory=Array.isArray(data.sessionHistory)?data.sessionHistory:[];data.sessionHistory.push(new Date().toISOString());data.sessionHistory=data.sessionHistory.slice(-500);logActivity('Odak oturumu tamamlandı',(data.focusLength||25)+' dakikalık çalışma','timer');save();renderDashboard();toast('Odak oturumu tamamlandı. Harika iş!');$('#timerToggle').innerHTML=icon('play')+' Yeniden başlat';refreshIcons();}},1000);}};
  $('#focusStart').addEventListener('click',openFocus);$('#focusClose').addEventListener('click',closeFocus);$('#timerToggle').addEventListener('click',toggleTimer);$('#timerReset').addEventListener('click',()=>{clearInterval(timerInterval);timerRunning=false;timerSeconds=(data.focusLength||25)*60;updateTimer();$('#timerToggle').innerHTML=icon('play')+' Başlat';refreshIcons();});
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeFocus();});
  const startDeck=name=>{activeDeck=data.cards.filter(c=>(c.course||'Genel kartlar')===name);activeCard=0;answerShown=false;showDeck();};
  const showDeck=()=>{const host=$('#flashSets');if(!activeDeck.length)return;host.innerHTML='<div class="flash-study"><div class="flash-progress"><span style="width:'+((activeCard+1)/activeDeck.length*100)+'%"></span></div><div class="section-heading compact"><div><h2>'+safe(activeDeck[activeCard].course)+'</h2><p>Kart '+(activeCard+1)+' / '+activeDeck.length+'</p></div><button class="text-button" id="exitDeck">Setlere dön</button></div><article class="study-card" id="studyCard"><small>'+(answerShown?'CEVAP':'SORU')+'</small><h2>'+safe(answerShown?activeDeck[activeCard].answer:activeDeck[activeCard].question)+'</h2><p>'+(answerShown?'Kendini kontrol et.':'Cevabını düşündükten sonra karta dokun.')+'</p></article><div class="study-controls"><button class="outline-button" id="prevCard" '+(activeCard===0?'disabled':'')+'>'+icon('arrow-left')+' Önceki</button><button class="primary-button" id="flipCard">'+(answerShown?'Cevabı gördün':'Cevabı göster')+' '+icon('eye')+'</button><button class="outline-button" id="nextCard">'+(activeCard===activeDeck.length-1?'Bitir':'Sonraki')+' '+icon('arrow-right')+'</button></div></div>';refreshIcons();$('#studyCard').addEventListener('click',()=>{answerShown=!answerShown;showDeck();});$('#flipCard').addEventListener('click',()=>{answerShown=!answerShown;showDeck();});$('#prevCard').addEventListener('click',()=>{if(activeCard>0){activeCard--;answerShown=false;showDeck();}});$('#nextCard').addEventListener('click',()=>{if(activeCard<activeDeck.length-1){activeCard++;answerShown=false;showDeck();}else{activeDeck=[];renderFlashcards();toast('Flash kart setini tamamladın.');}});$('#exitDeck').addEventListener('click',renderFlashcards);};
  $('#startFlashBtn').addEventListener('click',()=>{if(!data.cards.length){openModal('card');return;}const groups=[...new Set(data.cards.map(c=>c.course||'Genel kartlar'))];startDeck(groups[0]);});
  $('#questionAmount').addEventListener('click',e=>{const b=e.target.closest('[data-amount]');if(!b)return;selectedAmount=b.dataset.amount;$$('.choice-chip').forEach(x=>x.classList.toggle('active',x===b));});

  const demoQuestionBank = [
    {course:'Anatomi',question:'Sığırda rumen hangi mide bölmesidir?',options:['Bezli mide','En büyük ön mide bölmesi','İnce bağırsağın ilk bölümü','Kalın bağırsağın son bölümü'],answer:1,explanation:'Rumen, geviş getirenlerde hacim bakımından en büyük ön mide bölmesidir.'},
    {course:'Histoloji ve Embriyoloji',question:'Epitel dokunun temel özelliklerinden biri hangisidir?',options:['Hücreler arası matriksi çok fazladır','Damar bakımından zengindir','Hücreler birbirine sıkıca yakındır','Yalnızca kemik dokuda bulunur'],answer:2,explanation:'Epitel hücreleri sıkı yerleşimlidir ve genellikle bazal membran üzerinde bulunur.'},
    {course:'Fizyoloji',question:'Kandaki kalsiyum düzeyinin düşmesi durumunda parathormonun temel etkisi hangisidir?',options:['Kan kalsiyumunu yükseltmeye katkı sağlamak','İdrarla kalsiyum atılımını daima artırmak','D vitamini sentezini tamamen durdurmak','Bağırsaktan kalsiyum emilimini engellemek'],answer:0,explanation:'PTH kemik, böbrek ve aktif D vitamini üzerinden kan kalsiyumunun yükselmesine katkıda bulunur.'},
    {course:'Mikrobiyoloji',question:'Gram boyamada Gram-pozitif bakteriler genellikle hangi renkte görünür?',options:['Pembe/kırmızı','Mor/mavi-mor','Yeşil','Renksiz'],answer:1,explanation:'Kalın peptidoglikan tabakası kristal viyole-iyot kompleksini tuttuğu için Gram-pozitif bakteriler mor görünür.'},
    {course:'Patoloji',question:'Akut inflamasyonda erken dönemde dokuya göçü belirgin olan hücre hangisidir?',options:['Nötrofil','Plazma hücresi','Fibroblast','Eritrosit'],answer:0,explanation:'Akut inflamasyonun erken evresinde nötrofiller genellikle baskın lökositlerdir.'},
    {course:'Farmakoloji',question:'Bir ilacın yarı ömrü (t½) neyi ifade eder?',options:['İlacın tamamının atıldığı süreyi','Plazma konsantrasyonunun yarıya inmesi için gereken süreyi','İlacın en yüksek dozunu','İlacın yalnızca bağırsaktan emilme süresini'],answer:1,explanation:'Eliminasyon yarı ömrü, plazma ilaç konsantrasyonunun yaklaşık yarıya düşmesi için geçen süredir.'},
    {course:'Anatomi',question:'Tendonun temel görevi nedir?',options:['Kası kemiğe bağlamak','İki kemiği eklemde birleştirmek','Sinir impulsu üretmek','Kan hücresi oluşturmak'],answer:0,explanation:'Tendonlar kas kuvvetini kemiğe aktarır; ligamentler ise çoğunlukla kemikleri birbirine bağlar.'},
    {course:'Mikrobiyoloji',question:'Aşılamanın temel amacı aşağıdakilerden hangisidir?',options:['Her enfeksiyonu tedavi etmek','Özgül bağışıklık yanıtı oluşturmak','Antibiyotik direncini artırmak','Doğuştan gelen bağışıklığı ortadan kaldırmak'],answer:1,explanation:'Aşılama, hedef etkene karşı özgül bağışıklık yanıtı ve immünolojik bellek oluşturmayı amaçlar.'}
  ];
  const quizLayout = $('.quiz-layout');
  const quizSetupMarkup = quizLayout.innerHTML;
  let activeQuiz = [], quizIndex = 0, quizAnswers = [];
  const startDemoQuiz = () => {
    const typedCourse = ($('#quizCourse').value || '').trim().toLocaleLowerCase('tr-TR');
    let pool = demoQuestionBank.filter(q => !typedCourse || q.course.toLocaleLowerCase('tr-TR').includes(typedCourse) || typedCourse.includes(q.course.toLocaleLowerCase('tr-TR')));
    const filtered = pool.length > 0;
    if (!pool.length) pool = demoQuestionBank.slice();
    const amount = selectedAmount === 'all' ? pool.length : Math.min(Number(selectedAmount) || 10, pool.length);
    activeQuiz = pool.slice().sort(() => Math.random() - 0.5).slice(0, amount);
    quizIndex = 0;
    quizAnswers = Array(activeQuiz.length).fill(null);
    renderQuizQuestion(!filtered && !!typedCourse);
  };
  const renderQuizQuestion = (courseFallback=false) => {
    const q = activeQuiz[quizIndex];
    if (!q) return renderQuizResult();
    quizLayout.innerHTML = '<div class="panel-card quiz-live"><div class="quiz-live-top"><button class="text-button" data-quiz-action="exit">'+icon('arrow-left')+' Çalışma ayarlarına dön</button><span class="eyebrow">ÖRNEK SORU BANKASI</span></div><div class="quiz-progress-meta"><span>Soru '+(quizIndex+1)+' / '+activeQuiz.length+'</span><span>'+safe(q.course)+'</span></div><div class="quiz-progress-track"><span style="width:'+((quizIndex+1)/activeQuiz.length*100)+'%"></span></div>'+(courseFallback?'<p class="quiz-demo-notice">Bu ders için örnek soru bulunamadı; genel örnek sorular gösteriliyor.</p>':'')+'<h2 class="quiz-question-title">'+safe(q.question)+'</h2><div class="quiz-options">'+q.options.map((option,i)=>'<button class="quiz-option '+(quizAnswers[quizIndex]===i?'selected':'')+'" data-quiz-answer="'+i+'"><span class="quiz-option-letter">'+String.fromCharCode(65+i)+'</span><span>'+safe(option)+'</span></button>').join('')+'</div><div class="quiz-live-bottom"><span class="quiz-demo-notice">Eğitim amaçlı örnek soru</span><button class="primary-button" data-quiz-action="next" '+(quizAnswers[quizIndex]===null?'disabled':'')+'>'+(quizIndex===activeQuiz.length-1?'Sonuçları gör':'Sonraki soru')+' '+icon('arrow-right')+'</button></div></div>';
    refreshIcons();
  };
  const renderQuizResult = () => {
    const correct = activeQuiz.reduce((n,q,i)=>n+(quizAnswers[i]===q.answer?1:0),0);
    quizLayout.innerHTML = '<div class="panel-card quiz-result"><span class="eyebrow">OTURUM TAMAMLANDI</span><div class="quiz-score-ring"><strong>'+correct+'/'+activeQuiz.length+'</strong><span>doğru</span></div><h2>Çalışmanı tamamladın.</h2><p>Bu örnek oturumdaki doğru yanıt sayın. Yanlış yaptığın soruların açıklamalarını aşağıdan inceleyebilirsin.</p><div class="quiz-review-list">'+activeQuiz.map((q,i)=>'<article class="quiz-review-item"><div class="quiz-review-heading"><strong>'+(i+1)+'. '+safe(q.question)+'</strong><span class="'+(quizAnswers[i]===q.answer?'correct':'incorrect')+'">'+(quizAnswers[i]===q.answer?'Doğru':'Tekrar et')+'</span></div><p><b>Doğru yanıt:</b> '+safe(q.options[q.answer])+'</p><p>'+safe(q.explanation)+'</p></article>').join('')+'</div><div class="quiz-result-actions"><button class="outline-button" data-quiz-action="exit">Ayarlarına dön</button><button class="primary-button" data-quiz-action="retry">'+icon('rotate-ccw')+' Yeniden çöz</button></div></div>';
    refreshIcons();
  };
  quizLayout.addEventListener('click', e => {
    const amountButton = e.target.closest('[data-amount]');
    if (amountButton) {
      selectedAmount = amountButton.dataset.amount;
      $('.choice-chip', quizLayout).forEach(button => button.classList.toggle('active', button === amountButton));
      return;
    }
    const answer = e.target.closest('[data-quiz-answer]');
    if (answer) { quizAnswers[quizIndex] = Number(answer.dataset.quizAnswer); renderQuizQuestion(); return; }
    const action = e.target.closest('[data-quiz-action]')?.dataset.quizAction;
    if (action === 'exit') { quizLayout.innerHTML = quizSetupMarkup; refreshIcons(); }
    if (action === 'retry') startDemoQuiz();
    if (action === 'next' && quizAnswers[quizIndex] !== null) { quizIndex++; renderQuizQuestion(); }
  });

  $('#createQuizBtn').addEventListener('click',startDemoQuiz);
  // Ortak arşiv metin tabanlıdır; notlar mevcut Supabase senkronizasyonuyla saklanır.
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus();}if(e.key==='Escape'){if(!$('#modalBackdrop').hidden)closeModal();if(!$('#noteReaderBackdrop').hidden)closeNoteReader();if(!overlay.hidden)closeFocus();}});
  render();refreshIcons();

  // Supabase Auth + kişiye özel çalışma alanı senkronizasyonu
  let authMode = 'signin';
  const authMessage = (message, error=false) => { const el=$('#authMessage'); if(el){el.textContent=message;el.classList.toggle('error',error);} };
  const setAuthMode = (mode, clearMessage=true) => {
    authMode=mode; const signup=mode==='signup';
    const title=$('#authTitle'), submit=$('#authSubmit'), toggle=$('#authModeToggle'), pass=$('#authPassword');
    if(title)title.textContent=signup?'Hesap oluştur':'Hesabına giriş yap';
    if(submit)submit.innerHTML=(signup?'Kayıt ol':'Giriş yap')+' '+icon('arrow-right');
    if(toggle)toggle.textContent=signup?'Zaten hesabın var mı? Giriş yap':'Hesabın yok mu? Hesap oluştur';
    if(pass)pass.autocomplete=signup?'new-password':'current-password';
    if(clearMessage)authMessage(''); refreshIcons();
  };
  const updateAccountUI = () => {
    const b=$('#accountButton'); if(!b)return;
    b.innerHTML = authUser ? icon(cloudReady?'cloud-check':'user-round')+'<span>'+(cloudReady?'Bulut bağlı':'Hesap açık')+'</span>' : icon('user-round')+'<span>Hesaba giriş</span>';
    b.title = authUser ? 'Oturum: '+authUser.email+(cloudReady?' · Bulut senkronizasyonu etkin':' · Bulut bağlantısı kontrol ediliyor') : 'Giriş yap veya hesap oluştur';
    renderAdminPanel();
    if(!isLibraryAdmin()&&activePage==='admin')go('dashboard');
    const signed=$('#authSignedIn'), form=$('#authForm'), toggle=$('#authModeToggle');
    if(signed)signed.hidden=!authUser; if(form)form.hidden=!!authUser; if(toggle)toggle.hidden=!!authUser;
    const email=$('#authUserEmail'); if(email&&authUser)email.textContent=authUser.email||'Oturum açıldı';
    if(authUser)$('#authTitle').textContent='Hesabın bağlı'; else setAuthMode(authMode,false);
    refreshIcons();
  };
  const openAuth = () => { $('#authBackdrop').hidden=false; updateAccountUI(); };
  const closeAuth = () => { $('#authBackdrop').hidden=true; authMessage(''); };
  const showEmailConfirmation = email => {
    const card=$('#emailConfirmBackdrop');
    $('#emailConfirmAddress').textContent=email;
    $('#emailConfirmCheck').checked=false;
    $('#emailConfirmContinue').disabled=true;
    card.hidden=false;
    refreshIcons();
  };
  const closeEmailConfirmation = () => { $('#emailConfirmBackdrop').hidden=true; };

  // E-posta bağlantısından dönüldüğünde ayrı doğrulama ekranı göster.
  let verificationReturn = /(?:^|[?&])code=/.test(window.location.search) ||
    /(?:^|[&#])type=(?:signup|email|magiclink)(?:&|$)/i.test(window.location.hash) ||
    /(?:^|[&#])access_token=/.test(window.location.hash);
  let verificationFinished = false;
  const verificationPage = $('#verificationPage');
  const showVerificationPage = (state, message) => {
    if(!verificationPage)return;
    const title=$('#verificationPageTitle'), copy=$('#verificationPageCopy'), iconBox=$('#verificationPageIcon');
    if(title)title.textContent=state==='success'?'E-posta adresin doğrulandı':state==='error'?'Doğrulama tamamlanamadı':'E-posta adresin doğrulanıyor';
    if(copy)copy.textContent=message || (state==='success'?'Hesabın açılıyor. Birazdan çalışma alanına yönlendirileceksin.':'Lütfen bekle; doğrulama bağlantın kontrol ediliyor.');
    if(iconBox)iconBox.innerHTML=icon(state==='success'?'check-circle-2':state==='error'?'mail-x':'mail-check');
    verificationPage.hidden=false;
    refreshIcons();
  };
  const finishVerificationFlow = user => {
    if(!verificationReturn || verificationFinished || !user)return;
    verificationFinished=true;
    showVerificationPage('success','E-posta adresin doğrulandı. Hesabın açılıyor; birazdan çalışma alanına yönlendirileceksin.');
    // Doğrulama kodunu/adres çubuğundaki tokenları URL'den temizle.
    try{window.history.replaceState({},document.title,window.location.pathname+window.location.search.replace(/([?&])code=[^&]*/,'$1').replace(/[?&]$/,'') );}catch{}
    window.setTimeout(()=>{
      if(verificationPage)verificationPage.hidden=true;
      const dashboard=$('#page-dashboard');
      if(dashboard){$('.page').forEach(p=>p.classList.remove('active'));dashboard.classList.add('active');}
      $('.nav-item[data-page]').forEach(n=>n.classList.toggle('active',n.dataset.page==='dashboard'));
      const crumb=$('#crumbCurrent');if(crumb)crumb.textContent='Genel Bakış';
      updateAccountUI();
      render();
      refreshIcons();
    },2200);
  };
  if(verificationReturn)showVerificationPage('pending');
  const normalizeWorkspace = saved => {
    const next={...structuredClone(seed),...(saved&&typeof saved==='object'?saved:{})};
    for(const key of ['courses','exams','notes','cards','tasks']) if(!Array.isArray(next[key]))next[key]=structuredClone(seed[key]);
    next.dailyGoal=Number(next.dailyGoal)||3; next.focusLength=Number(next.focusLength)||25; next.sessions=Number(next.sessions)||0; next.focusMinutes=Math.max(0,Number(next.focusMinutes)||0); if(!Array.isArray(next.activity))next.activity=[];if(!Array.isArray(next.sessionHistory))next.sessionHistory=[];
    return next;
  };
  const loadCloudWorkspace = async user => {
    if(!supabaseClient||!user)return;
    if(lastLoadedUserId===user.id&&cloudReady){authUser=user;updateAccountUI();return;}
    cloudLoading=true; cloudReady=false; authUser=user; updateAccountUI();
    const {data:row,error}=await supabaseClient.from('student_workspaces').select('data').eq('user_id',user.id).maybeSingle();
    if(error){cloudLoading=false;cloudReady=false;toast('Bulut verileri okunamadı. Proje erişimini kontrol et.');console.error('Bulut okuma hatası:',error.message);updateAccountUI();return;}
    if(row&&row.data&&typeof row.data==='object'){
      data=normalizeWorkspace(row.data); writeLocal(); try{localStorage.setItem(ownerKey,user.id);}catch{}
      if($('#dailyGoal'))$('#dailyGoal').value=String(data.dailyGoal); if($('#focusLength'))$('#focusLength').value=String(data.focusLength);
    } else {
      // İlk girişte sürekli onay penceresi açma: aynı tarayıcıdaki veriyi koru,
      // farklı bir kullanıcıya ait olduğu bilinen yerel verileri ise paylaşma.
      let previousOwner=''; try{previousOwner=localStorage.getItem(ownerKey)||'';}catch{}
      if(previousOwner && previousOwner!==user.id) data=structuredClone(seed);
      writeLocal();
      const {error:writeError}=await supabaseClient.from('student_workspaces').upsert({user_id:user.id,data:JSON.parse(JSON.stringify(data)),updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(writeError){
        cloudLoading=false;cloudReady=false;
        toast('Bulut kaydı oluşturulamadı. İnternet bağlantısını ve Supabase izinlerini kontrol et.');
        console.error('İlk bulut kaydı hatası:',writeError.message);
        updateAccountUI();return;
      }
    }
    try{localStorage.setItem(ownerKey,user.id);}catch{}
    lastLoadedUserId=user.id; cloudLoading=false; cloudReady=true; render(); updateAccountUI(); toast('Hesabın bağlandı; çalışma alanın senkronize.');
  };
  const initAuth = () => {
    if(!supabaseClient){$('#accountButton').addEventListener('click',()=>toast('Hesap servisi yüklenemedi. Sayfayı yenile.'));return;}
    $('#accountButton').addEventListener('click',openAuth); $$('[data-open-account]').forEach(el=>el.addEventListener('click',openAuth));
    $('#authClose').addEventListener('click',closeAuth); $('#authBackdrop').addEventListener('click',e=>{if(e.target===$('#authBackdrop'))closeAuth();});
    $('#emailConfirmCheck').addEventListener('change',e=>{ $('#emailConfirmContinue').disabled=!e.target.checked; });
    $('#emailConfirmContinue').addEventListener('click',()=>{
      if(!$('#emailConfirmCheck').checked)return;
      const email=$('#emailConfirmAddress').textContent;
      closeEmailConfirmation();
      setAuthMode('signin');
      $('#authEmail').value=email;
      $('#authPassword').value='';
      openAuth();
      authMessage('E-postanı kontrol ettikten sonra doğrulama bağlantısını aç. Ardından şifrenle giriş yap.');
    });
    $('#emailConfirmDismiss').addEventListener('click',closeEmailConfirmation);
    $('#emailConfirmBackdrop').addEventListener('click',e=>{if(e.target===$('#emailConfirmBackdrop'))closeEmailConfirmation();});
    $('#authModeToggle').addEventListener('click',()=>setAuthMode(authMode==='signin'?'signup':'signin'));
    $('#authForm').addEventListener('submit',async e=>{
      e.preventDefault(); const email=$('#authEmail').value.trim(), password=$('#authPassword').value; const submit=$('#authSubmit');
      submit.disabled=true; authMessage(authMode==='signup'?'Hesap oluşturuluyor…':'Giriş yapılıyor…');
      try {
        if(authMode==='signup'){
          const {data:result,error}=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+window.location.pathname}}); if(error)throw error;
          if(result.session){closeAuth();toast('Hesabın oluşturuldu.');}
          else { closeAuth(); showEmailConfirmation(email); }
        } else {
          const {data:result,error}=await supabaseClient.auth.signInWithPassword({email,password}); if(error)throw error;
          if(result.user && !(result.user.email_confirmed_at || result.user.confirmed_at)) {
            if(result.session) await supabaseClient.auth.signOut({scope:'local'});
            authMessage('E-posta adresin henüz doğrulanmadı. Gelen kutundaki doğrulama bağlantısını açtıktan sonra giriş yapabilirsin.',true);
            return;
          }
          if(result.user)closeAuth();
        }
      } catch(err){
        const message=(err.code==='email_not_confirmed'||/email not confirmed/i.test(err.message||''))
          ? 'E-posta adresin henüz doğrulanmamış. Lütfen e-posta kutuna gönderdiğimiz doğrulama bağlantısını aç, ardından yeniden giriş yap.'
          : (err.message||'İşlem tamamlanamadı. Bilgilerini kontrol et.');
        authMessage(message,true);
      }
      finally{submit.disabled=false;}
    });
    $('#authSignOut').addEventListener('click',async()=>{
      const {error}=await supabaseClient.auth.signOut(); if(error){authMessage('Çıkış yapılamadı: '+error.message,true);return;}
      authUser=null;cloudReady=false;lastLoadedUserId=null;data=structuredClone(seed);writeLocal();render();updateAccountUI();closeAuth();toast('Hesabından güvenli çıkış yaptın.');
    });
    supabaseClient.auth.onAuthStateChange((event,session)=>{
      setTimeout(()=>{
        if(event==='SIGNED_OUT'){authUser=null;cloudReady=false;cloudLoading=false;lastLoadedUserId=null;data=structuredClone(seed);writeLocal();render();updateAccountUI();return;}
        if((event==='INITIAL_SESSION'||event==='SIGNED_IN')&&session?.user){
          loadCloudWorkspace(session.user);
          finishVerificationFlow(session.user);
        }
        else if(!session?.user){authUser=null;cloudReady=false;updateAccountUI();}
      },0);
    });
    updateAccountUI();
  };
  initAuth();loadSharedNotes();if(supabaseClient)supabaseClient.auth.onAuthStateChange(()=>setTimeout(()=>{renderSharedNotes();loadSharedNotes();},0));
})();