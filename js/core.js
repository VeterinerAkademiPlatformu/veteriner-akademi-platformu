  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const storeKey = 'veterinerAkademi.v1';
  const localDateKey = (date=new Date()) => date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
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
    tasks:[false,false,false], taskDate:localDateKey(), dailyGoal:3, focusLength:25, sessions:0, focusMinutes:0, activity:[], sessionHistory:[], quizHistory:[]
  };
  let data;
  try { data = JSON.parse(localStorage.getItem(storeKey)) || structuredClone(seed); } catch { data = structuredClone(seed); }
  if(!Array.isArray(data.activity))data.activity=[]; if(!Array.isArray(data.sessionHistory))data.sessionHistory=[]; if(!Array.isArray(data.quizHistory))data.quizHistory=[];
  const todayKey=localDateKey;
  data.dailyGoal=Math.max(2,Math.min(5,Number(data.dailyGoal)||3));
  if(!Array.isArray(data.tasks))data.tasks=[];
  if(data.taskDate!==todayKey()){data.tasks=Array.from({length:data.dailyGoal},()=>false);data.taskDate=todayKey();}
  else if(data.tasks.length!==data.dailyGoal)data.tasks=Array.from({length:data.dailyGoal},(_,i)=>!!data.tasks[i]);
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
    if(page==='courses'){const panel=$('#courseTopicsPanel');if(panel)panel.hidden=true;const courseList=$('#allCourses');if(courseList)courseList.hidden=false;activeTopicCourseId=null;}
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