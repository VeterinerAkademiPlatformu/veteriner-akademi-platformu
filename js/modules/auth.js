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
    next.dailyGoal=Math.max(2,Math.min(5,Number(next.dailyGoal)||3)); next.focusLength=Number(next.focusLength)||25; next.sessions=Number(next.sessions)||0; next.focusMinutes=Math.max(0,Number(next.focusMinutes)||0); if(!Array.isArray(next.activity))next.activity=[];if(!Array.isArray(next.sessionHistory))next.sessionHistory=[];if(!Array.isArray(next.quizHistory))next.quizHistory=[];
    if(next.taskDate!==todayKey()){next.tasks=Array.from({length:next.dailyGoal},()=>false);next.taskDate=todayKey();}else next.tasks=Array.from({length:next.dailyGoal},(_,i)=>!!next.tasks[i]);
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
  initAuth();loadSharedNotes();loadSharedCatalog();if(supabaseClient)supabaseClient.auth.onAuthStateChange(()=>setTimeout(()=>{renderSharedNotes();loadSharedNotes();loadSharedCatalog();},0));