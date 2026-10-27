  const renderExams = () => {
    const filter=$('#examFilter')?.value||'all', list=data.exams.filter(e=>filter==='all'||e.type===filter).sort((a,b)=>a.date.localeCompare(b.date));
    $('#allExams').innerHTML=list.map(examRow).join('')||empty('Sınav kaydı yok','Yeni sınav ekleyerek takvimini oluştur.','calendar-days');
    const now=new Date();now.setHours(0,0,0,0);
    const upcoming=data.exams.filter(e=>new Date(e.date+'T12:00:00')>=now).length;
    $('#examSummary').innerHTML='<div class="summary-tile"><span>Takvimdeki sınavlar</span><strong>'+data.exams.length+'</strong></div><div class="summary-tile"><span>Yaklaşan sınavlar</span><strong>'+upcoming+'</strong></div><div class="summary-tile"><span>Yüksek öncelik</span><strong>'+data.exams.filter(e=>e.priority==='Yüksek').length+'</strong></div>';
  };