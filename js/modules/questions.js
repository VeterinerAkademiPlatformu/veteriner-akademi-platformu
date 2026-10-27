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
  let activeQuiz = [], quizIndex = 0, quizAnswers = [], quizResultLogged = false;
  const startDemoQuiz = () => {
    const typedCourse = ($('#quizCourse').value || '').trim().toLocaleLowerCase('tr-TR');
    let pool = demoQuestionBank.filter(q => !typedCourse || q.course.toLocaleLowerCase('tr-TR').includes(typedCourse) || typedCourse.includes(q.course.toLocaleLowerCase('tr-TR')));
    const filtered = pool.length > 0;
    if (!pool.length) pool = demoQuestionBank.slice();
    const amount = selectedAmount === 'all' ? pool.length : Math.min(Number(selectedAmount) || 10, pool.length);
    activeQuiz = pool.slice().sort(() => Math.random() - 0.5).slice(0, amount);
    quizIndex = 0;
    quizResultLogged = false;
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
    if(!quizResultLogged){
      quizResultLogged=true;
      const courses=[...new Set(activeQuiz.map(q=>q.course))];
      data.quizHistory=Array.isArray(data.quizHistory)?data.quizHistory:[];
      data.quizHistory.push({at:new Date().toISOString(),correct,total:activeQuiz.length,courses});
      data.quizHistory=data.quizHistory.slice(-100);
      logActivity('Soru çözümü tamamlandı',correct+'/'+activeQuiz.length+' doğru · '+courses.join(', '),'list-checks');
      save();renderDashboard();
    }
    quizLayout.innerHTML = '<div class="panel-card quiz-result"><span class="eyebrow">OTURUM TAMAMLANDI</span><div class="quiz-score-ring"><strong>'+correct+'/'+activeQuiz.length+'</strong><span>doğru</span></div><h2>Çalışmanı tamamladın.</h2><p>Bu örnek oturumdaki doğru yanıt sayın. Yanlış yaptığın soruların açıklamalarını aşağıdan inceleyebilirsin.</p><div class="quiz-review-list">'+activeQuiz.map((q,i)=>'<article class="quiz-review-item"><div class="quiz-review-heading"><strong>'+(i+1)+'. '+safe(q.question)+'</strong><span class="'+(quizAnswers[i]===q.answer?'correct':'incorrect')+'">'+(quizAnswers[i]===q.answer?'Doğru':'Tekrar et')+'</span></div><p><b>Doğru yanıt:</b> '+safe(q.options[q.answer])+'</p><p>'+safe(q.explanation)+'</p></article>').join('')+'</div><div class="quiz-result-actions"><button class="outline-button" data-quiz-action="exit">Ayarlarına dön</button><button class="primary-button" data-quiz-action="retry">'+icon('rotate-ccw')+' Yeniden çöz</button></div></div>';
    refreshIcons();
  };
  quizLayout.addEventListener('click', e => {
    const amountButton = e.target.closest('[data-amount]');
    if (amountButton) {
      selectedAmount = amountButton.dataset.amount;
      $$('.choice-chip', quizLayout).forEach(button => button.classList.toggle('active', button === amountButton));
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
