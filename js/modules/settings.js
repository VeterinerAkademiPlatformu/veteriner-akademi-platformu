/* Ayarlar menüsü: kullanıcı tercihleri ve çalışma hedefleri. */
  $('#editPlanBtn').addEventListener('click',()=>{const next=prompt('Günlük hedef kaç görev olsun? (2–5)',String(data.dailyGoal||3));const n=Number(next);if(Number.isInteger(n)&&n>=2&&n<=5){data.dailyGoal=n;data.tasks=Array.from({length:n},(_,i)=>!!data.tasks[i]);save();toast('Günlük hedef güncellendi.');render();}});
  $('#dailyGoal').addEventListener('change',e=>{data.dailyGoal=Math.max(2,Math.min(5,Number(e.target.value)||3));data.tasks=Array.from({length:data.dailyGoal},(_,i)=>!!data.tasks[i]);save();toast('Günlük hedef kaydedildi.');renderDashboard();});
  $('#focusLength').addEventListener('change',e=>{data.focusLength=Number(e.target.value);timerSeconds=data.focusLength*60;updateTimer();save();});
