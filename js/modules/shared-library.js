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
    setText('#adminSharedNoteCount',notes.length);setText('#adminPublishedNoteCount',published.length);setText('#adminDraftNoteCount',drafts.length);setText('#adminSharedCourseCount',sharedCourses.length);setText('#adminSharedTopicCount',sharedCourseTopics.length);
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