/* ═══════════ Une Heure — core: state, storage, sound, timer ═══════════ */
(function(){
'use strict';
var D=window.UH_DATA, KEY='uneheure.v1';
function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function pad(n){return n<10?'0'+n:''+n;}
function todayKey(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function parseKey(k){var p=String(k).split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
function addDays(d,n){var x=new Date(d.getTime());x.setDate(x.getDate()+n);return x;}
function dayDiff(a,b){return Math.round((parseKey(b)-parseKey(a))/86400000);}
function fmtClock(s){s=Math.max(0,Math.round(s));return pad(Math.floor(s/60))+':'+pad(s%60);}
function fmtHours(m){return (m/60).toFixed(m%60===0?0:1);}
function niceDate(k){return parseKey(k).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});}
/* the views live in a second closure, so reach them through window */
function renderTimerUI(){if(window.UH_renderTimerUI)window.UH_renderTimerUI();}
function renderTodayBlocks(){if(window.UH_renderTodayBlocks)window.UH_renderTodayBlocks();}
function render(){if(window.UH_render)window.UH_render();}

function defaults(){
  var cards=D.SEED_CARDS.map(function(c,i){return {id:'seed'+i,front:c[0],back:c[1],deck:c[2],tags:[c[3]],ease:2.5,ivl:0,reps:0,lapses:0,due:todayKey(),created:todayKey(),last:null};});
  return {v:1,startDate:todayKey(),
    settings:{theme:'nuit',sound:true,volume:.5,tick:false,autoAdvance:true,breakMin:5,longBreakMin:15,
      blockMins:{anki:10,structure:20,input:15,output:10,log:5},dailyGoal:60,name:'',ambient:false},
    sessions:[],days:{},weekTasks:{},cards:cards,reviews:[],starred:['lt','tv5','rfi'],errors:[],checkpoints:{},milestones:{},
    ui:{route:'dashboard',planWeek:null,libCat:'all',libQuery:'',cardDeck:'all',cardQuery:'',cardSort:'due'}};
}
function normalize(p){
  var d=defaults(),o=Object.assign({},d,p);
  o.settings=Object.assign({},d.settings,(p.settings&&typeof p.settings==='object')?p.settings:{});
  o.settings.blockMins=Object.assign({},d.settings.blockMins,(p.settings&&p.settings.blockMins&&typeof p.settings.blockMins==='object')?p.settings.blockMins:{});
  Object.keys(o.settings.blockMins).forEach(function(k){var n=+o.settings.blockMins[k];o.settings.blockMins[k]=(isFinite(n)&&n>0)?Math.min(n,90):(d.settings.blockMins[k]||5);});
  o.ui=Object.assign({},d.ui,(p.ui&&typeof p.ui==='object')?p.ui:{});
  ['sessions','cards','reviews','starred','errors'].forEach(function(k){if(!Array.isArray(o[k]))o[k]=d[k];});
  ['days','weekTasks','checkpoints','milestones'].forEach(function(k){if(!o[k]||typeof o[k]!=='object'||Array.isArray(o[k]))o[k]={};});
  o.cards=o.cards.filter(function(c){return c&&typeof c==='object'&&c.front!=null&&c.back!=null;});
  o.sessions=o.sessions.filter(function(s){return s&&typeof s==='object'&&typeof s.date==='string';});
  o.reviews=o.reviews.filter(function(r){return r&&typeof r.date==='string'&&isFinite(+r.count);});
  if(typeof o.startDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(o.startDate))o.startDate=todayKey();
  return o;
}
function load(){
  var raw=null;
  try{raw=localStorage.getItem(KEY);if(!raw)return defaults();
    var p=JSON.parse(raw);if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('bad state');
    return normalize(p);
  }catch(e){
    try{if(raw)localStorage.setItem(KEY+'.bak',raw);}catch(e2){}
    return defaults();
  }
}
var S=load(), saveT=null;
function save(){clearTimeout(saveT);saveT=setTimeout(function(){
  try{localStorage.setItem(KEY,JSON.stringify(S));var e=$('#storageState');if(e)e.textContent='saved '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
  catch(err){var e2=$('#storageState');if(e2)e2.textContent='storage full — export a backup';toast('Could not save locally. Export a backup.','warn');}
},150);}

function totalMinutes(){return S.sessions.reduce(function(a,s){return a+(s.minutes||0);},0);}
function sessionDates(){var m={};S.sessions.forEach(function(s){m[s.date]=(m[s.date]||0)+(s.minutes||0);});return m;}
function streaks(){
  var m=sessionDates(),k=Object.keys(m).sort();if(!k.length)return{cur:0,best:0};
  var best=1,run=1;for(var i=1;i<k.length;i++){if(dayDiff(k[i-1],k[i])===1){run++;best=Math.max(best,run);}else run=1;}
  var cur=0,t=todayKey();
  if(m[t]||m[todayKey(addDays(new Date(),-1))]){var d=m[t]?new Date():addDays(new Date(),-1);while(m[todayKey(d)]){cur++;d=addDays(d,-1);}}
  return {cur:cur,best:Math.max(best,cur)};
}
function currentWeek(){return clamp(Math.floor(dayDiff(S.startDate,todayKey())/7)+1,1,80);}
function weekData(w){return D.WEEKS[clamp(w,1,80)-1];}
function phaseOf(w){var id=weekData(w).phase;return D.PHASES.filter(function(p){return p.id===id;})[0];}
function weekProgress(w){var wd=weekData(w),done=0;wd.tasks.forEach(function(t,i){if(S.weekTasks['w'+w+':'+i])done++;});return{done:done,total:wd.tasks.length,pct:wd.tasks.length?done/wd.tasks.length:0};}
function anyWeeksDone(){var n=0;for(var w=1;w<=80;w++){var p=weekProgress(w);if(p.total&&p.done===p.total)n++;}return n;}
function today(){var k=todayKey();if(!S.days[k])S.days[k]={blocks:{},minutes:0,note:''};return S.days[k];}
function dueCards(){var t=todayKey();return S.cards.filter(function(c){return !c.due||dayDiff(c.due,t)>=0;});}
function stats(){var st=streaks(),m=totalMinutes();return{sessions:S.sessions.length,hours:m/60,minutes:m,bestStreak:st.best,curStreak:st.cur,
  cardCount:S.cards.length,speakSessions:S.sessions.filter(function(s){return s.speak;}).length,weeksDone:anyWeeksDone(),
  reviews:S.reviews.reduce(function(a,r){return a+r.count;},0)};}
function cefrPosition(h){
  var last={lvl:'A0',hours:0,color:'#7B87B4',label:'Starting out'},next=null;
  for(var i=0;i<D.CEFR.length;i++){if(h<D.CEFR[i].hours){next=D.CEFR[i];if(i>0)last=D.CEFR[i-1];break;}}
  if(!next){var top=D.CEFR[D.CEFR.length-1];return{from:top,to:top,pct:1,hoursToNext:0};}
  return{from:last,to:next,pct:clamp((h-last.hours)/(next.hours-last.hours),0,1),hoursToNext:Math.max(0,next.hours-h)};
}

/* ── sound ── */
var AC=null,amb=null;
function ac(){if(!S.settings.sound)return null;try{if(!AC){var C=window.AudioContext||window.webkitAudioContext;if(!C)return null;AC=new C();}if(AC.state==='suspended')AC.resume();return AC;}catch(e){return null;}}
function tone(f,dur,type,g,when){var c=ac();if(!c)return;var t=c.currentTime+(when||0),o=c.createOscillator(),gn=c.createGain();
  o.type=type||'sine';o.frequency.setValueAtTime(f,t);var v=(g==null?.18:g)*S.settings.volume;
  gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(Math.max(.0002,v),t+.012);gn.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(gn);gn.connect(c.destination);o.start(t);o.stop(t+dur+.03);}
var SND={click:function(){tone(520,.05,'triangle',.07);},toggle:function(){tone(700,.06,'sine',.08);},
  start:function(){tone(392,.14,'sine',.13);tone(587.33,.2,'sine',.11,.09);},pause:function(){tone(330,.12,'sine',.1);},
  blockDone:function(){tone(523.25,.13,'sine',.13);tone(659.25,.16,'sine',.12,.1);tone(783.99,.26,'sine',.11,.2);},
  complete:function(){[523.25,659.25,783.99,1046.5].forEach(function(f,i){tone(f,.4,'sine',.13,i*.11);});},
  good:function(){tone(659.25,.1,'sine',.1);tone(880,.14,'sine',.09,.07);},again:function(){tone(220,.16,'triangle',.09);},
  milestone:function(){[659.25,830.61,987.77,1318.5].forEach(function(f,i){tone(f,.5,'triangle',.11,i*.09);});}};
function play(n){if(S.settings.sound&&SND[n])SND[n]();}
function setAmbient(on){
  if(!on){if(amb&&AC){try{amb.g.gain.linearRampToValueAtTime(.0001,AC.currentTime+.4);amb.o1.stop(AC.currentTime+.5);amb.o2.stop(AC.currentTime+.5);}catch(e){}amb=null;}return;}
  var c=ac();if(!c||amb)return;
  try{var g=c.createGain();g.gain.value=.0001;var o1=c.createOscillator(),o2=c.createOscillator(),f=c.createBiquadFilter();
    o1.type='sine';o1.frequency.value=110;o2.type='sine';o2.frequency.value=164.81;f.type='lowpass';f.frequency.value=420;
    o1.connect(f);o2.connect(f);f.connect(g);g.connect(c.destination);o1.start();o2.start();
    g.gain.linearRampToValueAtTime(.03*S.settings.volume,c.currentTime+1.2);amb={o1:o1,o2:o2,g:g};}catch(e){}
}

/* ── toasts / modals / confetti ── */
function toast(msg,kind,action){
  var wrap=$('#toasts');if(!wrap)return;kind=kind||'info';
  var col={ok:'var(--c-green)',warn:'var(--c-amber)',danger:'var(--c-danger)',info:'var(--c-blue)'}[kind];
  var ic={ok:'\u2713',warn:'!',danger:'\u2715',info:'i'}[kind];
  var el=document.createElement('div');el.className='toast';el.style.setProperty('--tint',col);
  el.innerHTML='<span class="tic">'+ic+'</span><span>'+esc(msg)+'</span>';
  if(action){var b=document.createElement('button');b.textContent=action.label;b.onclick=function(){action.fn();rm();};el.appendChild(b);}
  wrap.appendChild(el);var to=setTimeout(rm,action?6500:3400);
  function rm(){clearTimeout(to);el.classList.add('out');setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},260);}
  return rm;
}
var stack=[];
function scrimFor(id){return id==='drawer'?$('#drawerScrim'):$('#'+id.replace('Modal','Scrim'));}
function openModal(id){var m=$('#'+id),sc=scrimFor(id);if(!m)return;m.hidden=false;if(sc)sc.hidden=false;
  document.body.classList.add('locked');if(stack.indexOf(id)<0)stack.push(id);
  var f=id==='drawer'?m.querySelector('#drawerClose'):m.querySelector('input,textarea,select,button:not(.modal-x)');if(f)setTimeout(function(){try{f.focus();}catch(e){}},60);}
function closeModal(id){var m=$('#'+id),sc=scrimFor(id);if(m)m.hidden=true;if(sc)sc.hidden=true;
  stack=stack.filter(function(x){return x!==id;});if(!stack.length)document.body.classList.remove('locked');}
function confirmDialog(title,body,onOk,label){
  $('#cfTitle').textContent=title;$('#cfBody').textContent=body;
  var b=$('#cfOk'),c=b.cloneNode(true);c.textContent=label||'Confirm';b.parentNode.replaceChild(c,b);
  c.onclick=function(){closeModal('confirmModal');onOk();};openModal('confirmModal');}
function confetti(){
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var cv=document.createElement('canvas');cv.className='confetti';document.body.appendChild(cv);
  var ctx=cv.getContext('2d'),dpr=Math.min(window.devicePixelRatio||1,2);
  cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
  var cols=['#3D7BFF','#12C2D6','#3FD07A','#FFB020','#FF4FA3','#A78BFA'],P=[];
  for(var i=0;i<120;i++)P.push({x:innerWidth/2+(Math.random()-.5)*220,y:innerHeight*.42,vx:(Math.random()-.5)*9,vy:-Math.random()*13-4,r:Math.random()*5+3,c:cols[i%6],a:Math.random()*6,va:(Math.random()-.5)*.3});
  var t0=performance.now();
  (function frame(t){var dt=(t-t0)/1000;ctx.clearRect(0,0,innerWidth,innerHeight);var alive=false;
    P.forEach(function(p){p.vy+=.34;p.x+=p.vx;p.y+=p.vy;p.a+=p.va;p.vx*=.995;if(p.y<innerHeight+40)alive=true;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.globalAlpha=clamp(1-dt/2.6,0,1);ctx.fillStyle=p.c;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.7);ctx.restore();});
    if(alive&&dt<2.6)requestAnimationFrame(frame);else if(cv.parentNode)cv.parentNode.removeChild(cv);})(t0);
}
function checkMilestones(){
  var st=stats(),nw=[];
  D.MILESTONES.forEach(function(m){if(!S.milestones[m.id]&&(st[m.k]||0)>=m.need){S.milestones[m.id]=todayKey();nw.push(m);}});
  if(nw.length){save();nw.forEach(function(m,i){setTimeout(function(){play('milestone');confetti();toast('Milestone unlocked · '+m.name,'ok');},400+i*900);});}
  return nw;
}

/* ── timer ── */
var T={running:false,idx:0,left:600,total:600,mode:'session',breakLeft:0,breaksTaken:0,elapsedTotal:0,lastTick:0,raf:null};
function blockList(){return D.BLOCKS.map(function(b){return Object.assign({},b,{min:S.settings.blockMins[b.id]||b.min});});}
function sessionTotal(){return blockList().reduce(function(a,b){return a+b.min;},0);}
function curBlock(){return blockList()[clamp(T.idx,0,4)];}
function stopLoop(){if(T.raf){clearInterval(T.raf);T.raf=null;}}
function resetTimer(keep){T.running=false;stopLoop();if(!keep)T.idx=0;T.mode='session';T.total=curBlock().min*60;T.left=T.total;T.elapsedTotal=0;T.breaksTaken=0;setAmbient(false);renderTimerUI();}
function startLoop(){T.lastTick=performance.now();stopLoop();
  T.raf=setInterval(function(){
    if(!T.running){stopLoop();return;}
    var now=performance.now(),dt=(now-T.lastTick)/1000;T.lastTick=now;
    if(T.mode==='break'){T.breakLeft-=dt;if(T.breakLeft<=0)endBreak();}
    else{var prev=T.left;T.left-=dt;T.elapsedTotal+=dt;
      if(S.settings.tick&&Math.floor(T.left)!==Math.floor(prev)&&T.left<=10&&T.left>0)tone(880,.03,'square',.05);
      if(T.left<=0){blockFinished(false);}}
    renderTimerUI();if(!T.running)stopLoop();},250);}
function timerStart(){if(T.mode==='session'&&T.left<=0)T.left=T.total;T.running=true;play('start');startLoop();renderTimerUI();if(S.settings.ambient)setAmbient(true);}
function timerPause(){T.running=false;stopLoop();play('pause');setAmbient(false);renderTimerUI();}
function timerToggle(){T.running?timerPause():timerStart();}
function timerSkip(){if(T.mode==='break'){endBreak();return;}blockFinished(true);}
function timerReset(){confirmDialog('Reset the session?','The timer and this run restart. Logged sessions are not affected.',function(){resetTimer(false);toast('Session reset','info');},'Reset');}
function jumpTo(i){T.idx=clamp(i,0,4);T.mode='session';T.total=curBlock().min*60;T.left=T.total;play('click');renderTimerUI();}
function advance(){T.idx=clamp(T.idx+1,0,4);T.mode='session';T.total=curBlock().min*60;T.left=T.total;renderTimerUI();}
function endBreak(){advance();play('start');toast('Break over · '+curBlock().name,'info');}
function blockFinished(skipped){
  var b=curBlock();T.left=0;today().blocks[b.id]=true;save();
  if(!skipped)play('blockDone');
  if(T.idx>=4){finishSession();return;}
  toast(b.name+' done','ok');
  if(S.settings.autoAdvance){T.mode='break';T.breaksTaken++;T.breakLeft=((T.breaksTaken%3===0)?S.settings.longBreakMin:S.settings.breakMin)*60;
    if(T.breakLeft<=0)advance();}
  else advance();
  renderTimerUI();renderTodayBlocks();
}
function finishSession(){T.running=false;stopLoop();setAmbient(false);play('complete');confetti();
  openComplete(sessionTotal(),blockList().map(function(b){return b.id;}),false);renderTimerUI();}
function logPartial(){var m=Math.round(T.elapsedTotal/60);if(m<1){toast('Nothing to log yet — run the timer first.','warn');return;}
  openComplete(m,Object.keys(today().blocks).filter(function(k){return today().blocks[k];}),true);}
var pending=null;
function openComplete(mins,blocks,partial){
  var w=currentWeek();pending={minutes:mins,blocks:blocks,week:w,phase:phaseOf(w).id,partial:!!partial};
  $('#cmTitle').textContent=partial?'Session logged':'Hour complete';
  $('#cmSub').textContent=partial?'Partial sessions still count. Consistency beats perfection.':'Sixty focused minutes banked. Here is what you just earned.';
  var st=streaks();
  $('#cmStats').innerHTML='<div class="cm-stat"><b>'+mins+'</b><span>minutes</span></div><div class="cm-stat"><b>'+blocks.length+'/5</b><span>blocks</span></div><div class="cm-stat"><b>'+(st.cur+(sessionDates()[todayKey()]?0:1))+'</b><span>day streak</span></div>';
  $('#cmNote').value='';$('#cmCards').value='';openModal('completeModal');
}
function saveSession(){
  if(!pending)return;
  var note=$('#cmNote').value.trim(),raw=$('#cmCards').value.trim(),added=0;
  raw.split('\n').forEach(function(l){var p=l.split('|');
    if(p.length>=2&&p[0].trim()&&p[1].trim()){S.cards.push({id:uid(),front:p[0].trim(),back:p.slice(1).join('|').trim(),deck:'Mined',tags:['session'],ease:2.5,ivl:0,reps:0,lapses:0,due:todayKey(),created:todayKey(),last:null});added++;}});
  var rec={id:uid(),date:todayKey(),minutes:pending.minutes,blocks:pending.blocks,week:pending.week,phase:pending.phase,
    note:note,speak:pending.blocks.indexOf('output')>=0,cardsAdded:added,partial:pending.partial};
  S.sessions.push(rec);var td=today();td.minutes=(td.minutes||0)+rec.minutes;if(note)td.note=note;
  pending=null;save();closeModal('completeModal');play('good');
  toast('Session saved · '+rec.minutes+' min'+(added?' · '+added+' cards':''),'ok',{label:'Undo',fn:function(){
    S.sessions=S.sessions.filter(function(x){return x.id!==rec.id;});
    if(added)S.cards=S.cards.slice(0,S.cards.length-added);
    var t=today();t.minutes=Math.max(0,(t.minutes||0)-rec.minutes);save();render();toast('Session removed','info');}});
  checkMilestones();resetTimer(false);render();
}

/* ── SM-2 lite ── */
function nextIvl(card,g){
  var e=card.ease||2.5,ivl=card.ivl||0,reps=card.reps||0;
  if(g===0)return 0;reps++;
  if(reps===1)ivl=g===1?1:(g===3?3:1);
  else if(reps===2)ivl=g===1?3:(g===3?8:6);
  else ivl=Math.round(ivl*(g===1?1.2:(g===3?e*1.3:e)));
  return clamp(ivl,1,3650);
}
function gradeCard(card,g){
  var e=card.ease||2.5,ivl=nextIvl(card,g);
  if(g===0){card.lapses=(card.lapses||0)+1;card.reps=0;e=Math.max(1.3,e-.2);}
  else{card.reps=(card.reps||0)+1;e=clamp(e+(g===1?-.15:(g===3?.15:0)),1.3,3);}
  card.ease=e;card.ivl=ivl;card.last=todayKey();card.due=todayKey(addDays(new Date(),card.ivl));
  var t=todayKey(),r=S.reviews.filter(function(x){return x.date===t;})[0];
  if(r)r.count++;else S.reviews.push({date:t,count:1});
  save();
}
function ivlLabel(d){if(d<1)return 'now';if(d===1)return '1d';if(d<30)return d+'d';if(d<365)return Math.round(d/30)+'mo';return (d/365).toFixed(1)+'y';}

window.UH={D:D,S:S,$:$,$$:$$,esc:esc,uid:uid,clamp:clamp,pad:pad,todayKey:todayKey,parseKey:parseKey,addDays:addDays,dayDiff:dayDiff,
  fmtClock:fmtClock,fmtHours:fmtHours,niceDate:niceDate,save:save,defaults:defaults,
  replaceState:function(n){S=n;window.UH.S=n;},normalize:normalize,topModal:function(){return stack[stack.length-1];},
  totalMinutes:totalMinutes,sessionDates:sessionDates,streaks:streaks,currentWeek:currentWeek,weekData:weekData,phaseOf:phaseOf,
  weekProgress:weekProgress,anyWeeksDone:anyWeeksDone,today:today,dueCards:dueCards,stats:stats,cefrPosition:cefrPosition,
  checkMilestones:checkMilestones,toast:toast,play:play,tone:tone,setAmbient:setAmbient,confetti:confetti,
  openModal:openModal,closeModal:closeModal,confirmDialog:confirmDialog,
  T:T,blockList:blockList,sessionTotal:sessionTotal,curBlock:curBlock,resetTimer:resetTimer,timerStart:timerStart,timerPause:timerPause,
  timerToggle:timerToggle,timerSkip:timerSkip,timerReset:timerReset,jumpTo:jumpTo,logPartial:logPartial,saveSession:saveSession,
  gradeCard:gradeCard,nextIvl:nextIvl,ivlLabel:ivlLabel,
  renderTimerUI:function(){if(window.UH_renderTimerUI)window.UH_renderTimerUI();},
  renderTodayBlocks:function(){if(window.UH_renderTodayBlocks)window.UH_renderTodayBlocks();},
  render:function(){if(window.UH_render)window.UH_render();}};
})();

/* ═══════════ views + wiring ═══════════ */
(function(){
'use strict';
var U=window.UH,D=U.D,$=U.$,$$=U.$$,esc=U.esc,clamp=U.clamp;
function S(){return U.S;}
var srs={queue:[],pos:0,shown:false,done:0};
function gradeCurrent(g){
  var c=srs.queue[srs.pos];if(!c)return;
  U.gradeCard(c,g);U.play(g===0?'again':'good');srs.done++;
  if(g===0)srs.queue.push(c);
  srs.pos++;srs.shown=false;U.checkMilestones();render();
}

function ringSVG(pct,size,id){var r=size/2-9,c=2*Math.PI*r;
  return '<svg viewBox="0 0 '+size+' '+size+'" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="var(--c-blue)"/><stop offset="55%" stop-color="var(--c-cyan)"/><stop offset="100%" stop-color="var(--c-magenta)"/></linearGradient></defs><circle class="trk" cx="'+size/2+'" cy="'+size/2+'" r="'+r+'"/><circle class="val" cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" stroke="url(#'+id+')" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+(c*(1-clamp(pct,0,1))).toFixed(1)+'"/></svg>';}
function bar(p,col){return '<div class="bar"><i style="width:'+(clamp(p,0,1)*100).toFixed(1)+'%'+(col?';background:'+col:'')+'"></i></div>';}
function tile(k,v,d,c){return '<div class="stat" style="--sc:'+c+'"><div class="k">'+esc(k)+'</div><div class="v">'+v+'</div><div class="d">'+esc(d)+'</div></div>';}
function tagColor(t){return {anki:'#3D7BFF',structure:'#12C2D6',input:'#3FD07A',output:'#FFB020',speak:'#FF4FA3',check:'#FF6B4A',log:'#A78BFA'}[t]||'#8FA0C8';}
function promptFor(pid){var a=D.PROMPTS[pid]||D.PROMPTS.p1;return a[Math.floor(Date.now()/86400000)%a.length];}
function taskHTML(w,i,t){var on=!!S().weekTasks['w'+w+':'+i];
  return '<button class="task'+(on?' on':'')+(t.check?' checkpoint':'')+'" data-task="'+w+':'+i+'"><span class="box">\u2713</span><span class="tx">'+esc(t.t)+'</span><span class="tg" style="background:'+tagColor(t.tag)+'22;color:'+tagColor(t.tag)+'">'+esc(t.tag)+'</span></button>';}

/* ── dashboard ── */
function todayBlocksHTML(){
  var td=U.today(),ph=U.phaseOf(U.currentWeek()),route=$('#main').dataset.route;
  return U.blockList().map(function(b,i){var on=!!td.blocks[b.id],act=(U.T.idx===i&&route==='focus');
    return '<div class="blk'+(on?' done':'')+(act?' active':'')+'" style="--bc:'+b.color+'"><div class="blk-ic">'+(on?'\u2713':b.icon)+'</div><div><div class="blk-t">'+esc(b.name)+'<span class="mins">'+b.min+' min</span></div><div class="blk-d">'+esc(ph.blocks[b.id]||b.tip)+'</div></div><div class="blk-a"><button class="btn btn-sm btn-ghost" data-block-go="'+i+'">Time it</button><button class="tick'+(on?' on':'')+'" data-block-tick="'+b.id+'" aria-pressed="'+on+'" title="Mark done">\u2713</button></div></div>';}).join('');
}
window.UH_renderTodayBlocks=function(){var e=$('#todayBlocks');if(e)e.innerHTML=todayBlocksHTML();};

function viewDashboard(){
  var w=U.currentWeek(),wd=U.weekData(w),ph=U.phaseOf(w),st=U.stats(),td=U.today();
  var mins=U.totalMinutes(),pos=U.cefrPosition(mins/60),goal=S().settings.dailyGoal||60;
  var tm=U.sessionDates()[U.todayKey()]||0,wp=U.weekProgress(w),due=U.dueCards().length;
  var dc=D.BLOCKS.filter(function(b){return td.blocks[b.id];}).length;
  var h=new Date().getHours(),greet=(h>=5&&h<18)?'Bonjour':'Bonsoir';
  var nm=S().settings.name?', '+esc(S().settings.name):'';
  var o='<div class="view stack">';
  o+='<section class="hero"><div class="hero-in"><div><div class="eyebrow">'+greet+nm+' · '+esc(new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'}))+'</div><h1>Week '+w+' — <em>'+esc(ph.name)+'</em></h1><p class="lede">'+esc(ph.goal)+'</p><div class="hero-meta"><span class="chip accent">'+esc(ph.cefr)+'</span><span class="chip">This week: <b>'+esc(wd.title)+'</b></span><span class="chip"><b>'+wp.done+'/'+wp.total+'</b> tasks</span><span class="chip"><b>'+due+'</b> cards due</span></div><div class="hero-actions"><button class="btn btn-primary" data-act="go-focus">Start the hour<span class="kbd">F</span></button><button class="btn btn-ghost" data-act="go-cards">Review '+due+' card'+(due===1?'':'s')+'</button><button class="btn btn-ghost" data-act="go-plan">See week '+w+'</button></div></div><div class="ring-wrap"><div class="ring">'+ringSVG(tm/goal,220,'gToday')+'<div class="ring-c"><div class="big">'+tm+'</div><div class="lbl">of '+goal+' min today</div><div class="sm">'+(tm>=goal?'Goal reached. Bravo.':(goal-tm)+' minutes to go')+'</div></div></div><div class="tiny dim">'+dc+' of 5 blocks ticked</div></div></div></section>';
  o+='<section class="stats">'+tile('Total focus',U.fmtHours(mins)+'<small>h</small>',st.sessions+' sessions logged','#3D7BFF')+tile('Current streak',st.curStreak+'<small>d</small>','best '+st.bestStreak+' days','#FFB020')+tile('Plan progress',Math.round(st.weeksDone/80*100)+'<small>%</small>',st.weeksDone+' of 80 weeks','#3FD07A')+tile('Cards live',S().cards.length,due+' due today','#A78BFA')+tile('Est. level',pos.from.lvl,pos.hoursToNext>0?Math.ceil(pos.hoursToNext)+'h to '+pos.to.lvl:'top of the scale','#FF4FA3')+'</section>';
  o+='<div class="split"><section class="card"><div class="card-h"><h3>Today\'s five blocks</h3><span class="sub">'+U.sessionTotal()+' min template</span></div><div class="blocks" id="todayBlocks">'+todayBlocksHTML()+'</div><div class="note" style="margin-top:14px"><b>Rule one:</b> never skip the cards. On a terrible day, do only the ten minutes of reviews. Streak preservation beats intensity.</div></section><div class="stack">';
  o+='<section class="card tight"><div class="card-h"><h3>Today\'s speaking prompt</h3><span class="sub">say it out loud</span></div><p class="quote" id="promptText" lang="fr">&laquo;&nbsp;'+esc(promptFor(ph.id))+'&nbsp;&raquo;</p><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-sm btn-ghost" data-act="new-prompt">Another prompt</button><button class="btn btn-sm btn-primary" data-act="prompt-focus">Time 10 minutes</button></div></section>';
  o+='<section class="card tight"><div class="card-h"><h3>This week\'s tasks</h3><span class="sub">'+wp.done+'/'+wp.total+'</span></div><div class="tasks">'+wd.tasks.slice(0,4).map(function(t,i){return taskHTML(w,i,t);}).join('')+'</div>'+(wd.tasks.length>4?'<button class="btn btn-sm btn-ghost" style="margin-top:10px;width:100%" data-act="go-plan">All '+wd.tasks.length+' tasks &rarr;</button>':'')+'</section></div></div>';
  o+='<section class="card"><div class="card-h"><h3>The five phases</h3><span class="sub">click a phase to open its weeks</span></div><div class="rail">'+D.PHASES.map(function(p){
    var tot=p.weeks[1]-p.weeks[0]+1,dn=0;for(var i=p.weeks[0];i<=p.weeks[1];i++){var q=U.weekProgress(i);if(q.total&&q.done===q.total)dn++;}
    var cur=p.id===ph.id;
    return '<button class="ph'+(cur?' cur':'')+'" style="--pc:'+p.accent+'" data-phase="'+p.id+'">'+(cur?'<span class="ph-badge">NOW</span>':'')+'<div class="ph-in"><div class="ph-n">Phase '+p.n+' · '+esc(p.cefr)+'</div><div class="ph-name">'+esc(p.name)+'</div><div class="ph-w">Weeks '+p.weeks[0]+'-'+p.weeks[1]+'</div><div class="ph-bar">'+bar(dn/tot,p.accent)+'<div class="tiny dim" style="margin-top:5px">'+dn+'/'+tot+' weeks complete</div></div></div></button>';}).join('')+'</div></section>';
  o+='<section class="card"><div class="card-h"><h3>Seven rules that make or break this</h3></div><div class="rules">'+D.RULES.map(function(r){return '<div class="rule" style="--rlc:'+r[2]+'"><b>'+esc(r[0])+'</b><span>'+esc(r[1])+'</span></div>';}).join('')+'</div></section></div>';
  return o;
}

/* ── plan ── */
function viewPlan(){
  var cw=U.currentWeek(),sel=clamp(S().ui.planWeek||cw,1,80),wd=U.weekData(sel),ph=U.phaseOf(sel),wp=U.weekProgress(sel),st=U.stats();
  var o='<div class="view stack"><section class="card"><div class="card-h"><h3>80-week map</h3><span class="sub">You are in week '+cw+' · started '+esc(U.niceDate(S().startDate))+'</span></div><div class="weekgrid">'+D.WEEKS.map(function(x){
    var p=U.weekProgress(x.w),pp=U.phaseOf(x.w),cls=p.total&&p.done===p.total?' full':(p.done>0?' part':'');
    return '<button class="wk'+cls+(x.w===cw?' cur':'')+(x.w===sel?' sel':'')+'" style="--wc:'+pp.accent+'" data-week="'+x.w+'" title="Week '+x.w+' · '+esc(x.title)+'">'+(x.checkpoint?'<span class="cp">\u2605</span>':'')+x.w+'<span class="wd"></span></button>';}).join('')+'</div><div class="legend">'+D.PHASES.map(function(p){return '<span class="lg"><i style="background:'+p.accent+'"></i>P'+p.n+' '+esc(p.name)+'</span>';}).join('')+'<span class="lg"><i style="background:var(--c-amber)"></i>\u2605 checkpoint</span></div></section>';
  o+='<div class="split"><section class="card" style="border-color:'+ph.accent+'55"><div class="card-h"><h3>Week '+sel+' · '+esc(wd.title)+'</h3><span class="sub">'+esc(ph.cefr)+'</span></div><p class="muted tiny" style="margin-bottom:12px">'+esc(wd.detail)+'</p><div class="bar-lbl"><span>Task completion</span><b>'+wp.done+'/'+wp.total+'</b></div>'+bar(wp.pct,ph.accent)+'<div class="tasks" style="margin-top:14px">'+wd.tasks.map(function(t,i){return taskHTML(sel,i,t);}).join('')+'</div>'+(wd.checkpoint?'<div class="note" style="margin-top:14px"><b>Checkpoint week.</b> '+esc(wd.checkpoint)+'</div>':'')+'<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn btn-sm btn-ghost" data-week-nav="-1"'+(sel<=1?' disabled':'')+'>&larr; Previous</button><button class="btn btn-sm btn-ghost" data-week-nav="1"'+(sel>=80?' disabled':'')+'>Next &rarr;</button><button class="btn btn-sm btn-ghost" data-act="week-current">Jump to current</button><span class="spacer"></span><button class="btn btn-sm btn-primary" data-act="week-all">Tick all tasks</button></div></section>';
  o+='<div class="stack"><section class="card"><div class="card-h"><h3>Phase '+ph.n+' playbook</h3><span class="sub">'+esc(ph.name)+'</span></div><p class="muted tiny" style="margin-bottom:14px">'+esc(ph.goal)+'</p><div class="blocks">'+U.blockList().map(function(b){return '<div class="blk" style="--bc:'+b.color+'"><div class="blk-ic">'+b.icon+'</div><div><div class="blk-t">'+esc(b.name)+'<span class="mins">'+b.min+' min</span></div><div class="blk-d">'+esc(ph.blocks[b.id])+'</div></div><div></div></div>';}).join('')+'</div><div class="note" style="margin-top:14px"><b>Focus note.</b> '+esc(ph.focusNote)+'</div></section>';
  if(wd.checkpoint){var cp=S().checkpoints[sel];
    o+='<section class="card"><div class="card-h"><h3>Checkpoint result</h3><span class="sub">week '+sel+'</span></div><label class="field"><span>Outcome / score</span><input type="text" id="cpResult" value="'+esc(cp?cp.result:'')+'" placeholder="e.g. A2 listening 18/25, reading 20/25"></label><label class="field"><span>What to fix next</span><textarea id="cpNote" rows="2" placeholder="Numbers above 20 still slow. Past-tense agreement.">'+esc(cp?cp.note:'')+'</textarea></label><button class="btn btn-sm btn-primary" data-cp-save="'+sel+'">Save checkpoint</button>'+(cp?'<span class="tiny dim" style="margin-left:10px">saved '+esc(U.niceDate(cp.date))+'</span>':'')+'</section>';}
  o+='</div></div>';
  o+='<section class="card"><div class="card-h"><h3>Milestones</h3><span class="sub">'+Object.keys(S().milestones).length+'/'+D.MILESTONES.length+' unlocked</span></div><div class="ms-grid">'+D.MILESTONES.map(function(m){
    var got=!!S().milestones[m.id],v=st[m.k]||0;
    return '<div class="ms'+(got?' got':'')+'"><div class="ms-i">'+m.icon+'</div><div class="ms-n">'+esc(m.name)+'</div><div class="ms-d">'+esc(m.desc)+'</div><div style="margin-top:8px">'+bar(Math.min(1,v/m.need),'var(--c-amber)')+'</div><div class="tiny dim" style="margin-top:4px">'+(got?'unlocked '+esc(U.niceDate(S().milestones[m.id])):Math.min(Math.round(v),m.need)+' / '+m.need)+'</div></div>';}).join('')+'</div></section></div>';
  return o;
}

/* ── focus ── */
function viewFocus(){
  var w=U.currentWeek(),ph=U.phaseOf(w),b=U.curBlock();
  var o='<div class="view stack"><div class="focus-wrap"><section class="timer-card" id="timerCard" style="--tc:'+b.color+'"><div class="timer-in"><span class="t-phase" id="tPhase">'+b.icon+' '+esc(b.name)+'</span><div class="dial"><svg viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="gDial" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="'+b.color+'"/><stop offset="100%" stop-color="var(--c-magenta)"/></linearGradient></defs><g class="dial-ticks" id="dialTicks"></g><circle class="dtrk" cx="100" cy="100" r="86"/><circle class="dval" id="dialVal" cx="100" cy="100" r="86" stroke="url(#gDial)" stroke-dasharray="540.4" stroke-dashoffset="0"/></svg><div class="dial-c"><div class="clock" id="clock">10:00</div><div class="clock-sub" id="clockSub">ready</div><div class="tiny dim" id="blockTip" style="margin-top:8px;max-width:230px">'+esc(ph.blocks[b.id]||b.tip)+'</div></div></div><div class="timer-controls"><button class="btn btn-ghost btn-sm" data-act="t-reset" title="Reset">\u21BA Reset</button><button class="btn-round" id="playBtn" data-act="t-toggle" aria-label="Start or pause">\u25B6</button><button class="btn btn-ghost btn-sm" data-act="t-skip" title="Skip block">Skip \u2192</button></div><div class="seq" id="seq"></div><div style="margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-sm btn-ghost" data-act="t-log">Log partial session</button><button class="btn btn-sm btn-ghost" data-act="go-cards">Open card review</button></div></div></section>';
  o+='<aside class="panel"><section class="card tight"><div class="card-h"><h3>Session controls</h3><span class="sub" id="totalLbl">'+U.sessionTotal()+' min</span></div><div class="ctrl">';
  U.blockList().forEach(function(bl){o+='<div class="ctrl-row"><div class="ctrl-lbl"><span style="color:'+bl.color+'">'+bl.icon+' '+esc(bl.short)+'</span><b id="lbl-'+bl.id+'">'+bl.min+' min</b></div><input type="range" min="1" max="45" step="1" value="'+bl.min+'" data-mins="'+bl.id+'" aria-label="'+esc(bl.name)+' minutes"></div>';});
  o+='<div class="divider"></div><div class="ctrl-row"><div class="ctrl-lbl"><span>Short break</span><b id="lbl-break">'+S().settings.breakMin+' min</b></div><input type="range" min="0" max="15" step="1" value="'+S().settings.breakMin+'" data-set="breakMin" aria-label="Short break minutes"></div>';
  o+='<div class="ctrl-row"><div class="ctrl-lbl"><span>Long break (every 3rd)</span><b id="lbl-long">'+S().settings.longBreakMin+' min</b></div><input type="range" min="0" max="30" step="1" value="'+S().settings.longBreakMin+'" data-set="longBreakMin" aria-label="Long break minutes"></div>';
  o+='<div class="ctrl-row"><div class="ctrl-lbl"><span>Volume</span><b id="lbl-vol">'+Math.round(S().settings.volume*100)+'%</b></div><input type="range" min="0" max="100" step="5" value="'+Math.round(S().settings.volume*100)+'" data-set="volume" aria-label="Volume"></div>';
  o+='<div class="divider"></div><button class="toggle'+(S().settings.autoAdvance?' on':'')+'" data-toggle="autoAdvance"><span>Auto breaks between blocks</span><span class="sw"></span></button>';
  o+='<button class="toggle'+(S().settings.tick?' on':'')+'" data-toggle="tick"><span>Final-10-second ticks</span><span class="sw"></span></button>';
  o+='<button class="toggle'+(S().settings.ambient?' on':'')+'" data-toggle="ambient"><span>Ambient focus drone</span><span class="sw"></span></button>';
  o+='<div class="ctrl-row"><span class="ctrl-lbl"><span>Theme</span></span><div class="seg" data-seg="theme"><button data-val="nuit"'+(S().settings.theme==='nuit'?' class="on"':'')+'>Nuit</button><button data-val="jour"'+(S().settings.theme==='jour'?' class="on"':'')+'>Jour</button><button data-val="rouge"'+(S().settings.theme==='rouge'?' class="on"':'')+'>Rouge</button></div></div>';
  o+='<div style="display:flex;gap:8px"><button class="btn btn-sm btn-ghost" style="flex:1" data-act="preset-default">Reset 60-min template</button><button class="btn btn-sm btn-ghost" style="flex:1" data-act="preset-short">Short 30-min day</button></div>';
  o+='</div></section></aside></div>';
  o+='<section class="card"><div class="card-h"><h3>Today\'s blocks</h3><span class="sub">tick manually if you studied away from the timer</span></div><div class="blocks" id="todayBlocks">'+todayBlocksHTML()+'</div></section></div>';
  return o;
}
function buildTicks(){
  var g=$('#dialTicks');if(!g||g.childNodes.length)return;var s='';
  for(var i=0;i<60;i++){var a=i*6*Math.PI/180,r1=i%5===0?72:76,r2=80;
    s+='<line x1="'+(100+Math.cos(a)*r1).toFixed(1)+'" y1="'+(100+Math.sin(a)*r1).toFixed(1)+'" x2="'+(100+Math.cos(a)*r2).toFixed(1)+'" y2="'+(100+Math.sin(a)*r2).toFixed(1)+'"/>';}
  g.innerHTML=s;
}
window.UH_renderTimerUI=function(){
  var T=U.T,b=U.curBlock(),ph=U.phaseOf(U.currentWeek());
  var left=T.mode==='break'?T.breakLeft:T.left;
  var dock=$('#timerDock');
  if(dock){
    var show=T.running||T.elapsedTotal>0;
    dock.hidden=!show||$('#main').dataset.route==='focus';
    if(!dock.hidden){
      var dsig=T.running?'1':'0';
      if(dock.dataset.sig!==dsig||!dock.firstChild){
        dock.dataset.sig=dsig;
        dock.innerHTML='<div><div class="dt"></div><div class="dl"></div></div><button class="dock-btn" data-act="t-toggle" aria-label="Play or pause">'+(T.running?'\u275A\u275A':'\u25B6')+'</button><button class="dock-btn" data-act="open-focus" aria-label="Open focus">\u2197</button>';
      }
      var dt=dock.querySelector('.dt'),dl=dock.querySelector('.dl');
      if(dt)dt.textContent=U.fmtClock(left);
      if(dl)dl.textContent=T.mode==='break'?'break':b.short;
    }
  }
  document.title=(T.running?U.fmtClock(left)+' \u00B7 ':'')+'Une Heure \u2014 French Focus Studio';
  var card=$('#timerCard');if(!card)return;
  card.style.setProperty('--tc',T.mode==='break'?'#A78BFA':b.color);
  var tot=T.mode==='break'?Math.max(1,(T.breaksTaken%3===0?S().settings.longBreakMin:S().settings.breakMin)*60):Math.max(1,T.total);
  var cl=$('#clock');if(cl)cl.textContent=U.fmtClock(left);
  var sub=$('#clockSub');if(sub)sub.textContent=T.mode==='break'?(T.running?'break running':'break paused'):(T.running?'focusing':(left<T.total?'paused':'ready'));
  var dv=$('#dialVal');if(dv)dv.setAttribute('stroke-dashoffset',(540.4*(1-clamp(left/tot,0,1))).toFixed(1));
  var tp=$('#tPhase');if(tp)tp.innerHTML=T.mode==='break'?'\u2615 Break':b.icon+' '+esc(b.name);
  var tip=$('#blockTip');if(tip)tip.textContent=T.mode==='break'?'Stand up. Look far away. Say one French sentence out loud before you sit back down.':(ph.blocks[b.id]||b.tip);
  var pb=$('#playBtn');if(pb)pb.innerHTML=T.running?'\u275A\u275A':'\u25B6';
  var seq=$('#seq');
  if(seq){
    var bl=U.blockList(),tdb=U.today().blocks;
    var ssig=T.idx+'|'+T.mode+'|'+bl.map(function(x){return (tdb[x.id]?1:0)+x.short;}).join(',');
    if(seq.dataset.sig!==ssig||!seq.firstChild){
      seq.dataset.sig=ssig;
      seq.innerHTML=bl.map(function(x,i){
        var done=!!tdb[x.id],pct=(i===T.idx&&T.mode==='session')?1-(T.left/Math.max(1,T.total)):(done?1:0);
        return '<button class="seq-i'+(i===T.idx?' on':'')+(done?' done':'')+'" style="--sqc:'+x.color+'" data-jump="'+i+'">'+esc(x.short)+'<div class="sq-b"><i style="width:'+(clamp(pct,0,1)*100).toFixed(0)+'%"></i></div></button>';}).join('');
    }
    if(T.mode==='session'){var fill=$('.seq-i.on .sq-b i',seq);if(fill)fill.style.width=(clamp(1-(T.left/Math.max(1,T.total)),0,1)*100).toFixed(0)+'%';}
  }
  var tl=$('#totalLbl');if(tl)tl.textContent=U.sessionTotal()+' min';
};

/* ── cards ── */
function decks(){var m={};S().cards.forEach(function(c){m[c.deck||'Unsorted']=1;});return Object.keys(m).sort();}
function filteredCards(){
  var q=(S().ui.cardQuery||'').toLowerCase(),dk=S().ui.cardDeck||'all';
  var arr=S().cards.filter(function(c){
    if(dk!=='all'&&(c.deck||'Unsorted')!==dk)return false;
    if(!q)return true;
    return (c.front+' '+c.back+' '+(c.tags||[]).join(' ')).toLowerCase().indexOf(q)>=0;});
  var sort=S().ui.cardSort||'due';
  arr.sort(function(a,b){
    if(sort==='due')return String(a.due||'').localeCompare(String(b.due||''));
    if(sort==='front')return a.front.localeCompare(b.front);
    if(sort==='deck')return String(a.deck).localeCompare(String(b.deck));
    if(sort==='reps')return (b.reps||0)-(a.reps||0);
    return 0;});
  return arr;
}
function buildQueue(){
  var dk=S().ui.cardDeck||'all';
  var pool=U.dueCards().filter(function(c){return dk==='all'||(c.deck||'Unsorted')===dk;});
  srs.queue=pool.slice(0,60);srs.pos=0;srs.shown=false;srs.done=0;
}
function viewCards(){
  var due=U.dueCards().length,dk=S().ui.cardDeck||'all';
  var o='<div class="view stack"><section class="card"><div class="card-h"><h3>Spaced repetition</h3><span class="sub">'+due+' due · '+S().cards.length+' total · '+U.stats().reviews+' reviews logged</span></div>';
  o+='<div class="filters" style="margin-bottom:14px"><select id="srsDeck" style="max-width:220px" aria-label="Review deck"><option value="all"'+(dk==='all'?' selected':'')+'>All decks</option>'+decks().map(function(d){return '<option value="'+esc(d)+'"'+(dk===d?' selected':'')+'>'+esc(d)+'</option>';}).join('')+'</select><button class="btn btn-sm btn-ghost" data-act="srs-restart">Restart queue</button><button class="btn btn-sm btn-primary" data-act="card-new">+ New card</button></div>';
  if(!srs.queue.length)buildQueue();
  if(srs.pos>=srs.queue.length){
    o+='<div class="empty"><div class="em">\u2726</div><h3>'+(srs.done?'Queue cleared':'Nothing due right now')+'</h3><p class="tiny">'+(srs.done?srs.done+' cards graded. Come back tomorrow — the intervals do the work.':'Every card is scheduled for a future day. Add new ones or study ahead.')+'</p><div style="display:flex;gap:8px;justify-content:center;margin-top:14px;flex-wrap:wrap"><button class="btn btn-sm btn-primary" data-act="card-new">Add a card</button><button class="btn btn-sm btn-ghost" data-act="srs-ahead">Study ahead (20 cards)</button></div></div>';
  }else{
    var c=srs.queue[srs.pos];
    o+='<div class="srs-stage"><div class="flash'+(srs.shown?' flip':'')+'" id="flash" role="button" tabindex="0" aria-label="Reveal answer"><div class="side">'+(srs.shown?'meaning':'french')+' · '+(srs.pos+1)+' / '+srs.queue.length+'</div><div class="front" lang="fr">'+esc(c.front)+'</div>'+(srs.shown?'<div class="back">'+esc(c.back)+'</div>':'<div class="tiny dim">click, or press Space, to reveal</div>')+'<div class="tags"><span class="tag">'+esc(c.deck||'Unsorted')+'</span>'+(c.tags||[]).map(function(t){return '<span class="tag">'+esc(t)+'</span>';}).join('')+'</div></div>';
    if(srs.shown){
      o+='<div class="grade-row">'+[[0,'Again','g1','1'],[1,'Hard','g2','2'],[2,'Good','g3','3'],[3,'Easy','g4','4']].map(function(g){
        return '<button class="grade '+g[2]+'" data-grade="'+g[0]+'">'+g[1]+'<small>'+U.ivlLabel(U.nextIvl(c,g[0]))+' · '+g[3]+'</small></button>';}).join('')+'</div>';
    }else o+='<div class="tiny dim">Say it out loud before you flip. Recall beats recognition.</div>';
    o+='<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn btn-sm btn-ghost" data-act="card-edit-cur">Edit this card</button><button class="btn btn-sm btn-ghost" data-act="srs-skip">Skip</button><button class="btn btn-sm btn-ghost" data-act="speak-card">Hear it (browser voice)</button></div></div>';
  }
  o+='</section>';
  o+='<section class="card"><div class="card-h"><h3>Collection</h3><span class="sub">'+filteredCards().length+' shown</span></div><div class="filters" style="margin-bottom:12px"><div class="search"><input type="text" id="cardSearch" placeholder="Search French, meaning or tag…" value="'+esc(S().ui.cardQuery||'')+'"></div><select id="cardDeck" style="max-width:190px" aria-label="Filter deck"><option value="all"'+(dk==='all'?' selected':'')+'>All decks</option>'+decks().map(function(d){return '<option value="'+esc(d)+'"'+(dk===d?' selected':'')+'>'+esc(d)+'</option>';}).join('')+'</select></div>';
  var list=filteredCards();
  if(!list.length)o+='<div class="empty"><div class="em">\u29C9</div><h3>No cards match</h3><p class="tiny">Clear the search or add a new card.</p></div>';
  else{
    o+='<div class="tbl-wrap"><table><thead><tr><th class="sortable" data-sort="front">French</th><th>Meaning</th><th class="sortable" data-sort="deck">Deck</th><th class="sortable" data-sort="due">Due</th><th class="sortable" data-sort="reps">Reps</th><th></th></tr></thead><tbody>'+list.slice(0,200).map(function(c){
      var overdue=!c.due||U.dayDiff(c.due,U.todayKey())>=0;
      var state=!c.reps?['new','#A78BFA']:(overdue?['due','#FFB020']:['learned','#3FD07A']);
      return '<tr><td class="fr" lang="fr">'+esc(c.front)+'</td><td class="muted">'+esc(c.back)+'</td><td><span class="tag">'+esc(c.deck||'Unsorted')+'</span></td><td><span class="state-dot" style="color:'+state[1]+'"><i style="background:'+state[1]+'"></i>'+state[0]+'</span> <span class="tiny dim">'+esc(c.due||'')+'</span></td><td class="mono">'+(c.reps||0)+'</td><td style="white-space:nowrap"><button class="rowbtn" data-card-edit="'+c.id+'" title="Edit">\u270E</button><button class="rowbtn del" data-card-del="'+c.id+'" title="Delete">\u2715</button></td></tr>';}).join('')+'</tbody></table></div>';
    if(list.length>200)o+='<p class="tiny dim" style="margin-top:10px">Showing the first 200 of '+list.length+'. Narrow the search to see more.</p>';
  }
  o+='</section>';
  o+='<section class="card"><div class="card-h"><h3>Error log</h3><span class="sub">recurring mistakes are your real curriculum</span></div><div class="field-row" style="align-items:end"><label class="field" style="margin:0"><span>What I got wrong</span><input type="text" id="errText" placeholder="said « je suis allé » for elle"></label><label class="field" style="margin:0"><span>Correction</span><input type="text" id="errFix" placeholder="elle est allée — agreement with être"></label></div><div style="margin:10px 0 14px"><button class="btn btn-sm btn-primary" data-act="err-add">Log error</button> <button class="btn btn-sm btn-ghost" data-act="err-to-cards">Turn unfixed errors into cards</button></div>';
  if(!S().errors.length)o+='<p class="tiny dim">Nothing logged yet. After every exchange call, add the corrections your partner gave you.</p>';
  else o+='<div class="tasks">'+S().errors.slice().reverse().map(function(e){return '<div class="err-item'+(e.resolved?' fixed':'')+'"><div style="flex:1"><div class="et">'+esc(e.text)+'</div>'+(e.fix?'<div class="ef">\u2192 '+esc(e.fix)+'</div>':'')+'<div class="tiny dim" style="margin-top:3px">'+esc(U.niceDate(e.date))+'</div></div><button class="rowbtn" data-err-toggle="'+e.id+'" title="Toggle resolved">'+(e.resolved?'\u21BA':'\u2713')+'</button><button class="rowbtn del" data-err-del="'+e.id+'" title="Delete">\u2715</button></div>';}).join('')+'</div>';
  o+='</section></div>';
  return o;
}

/* ── library ── */
function viewLibrary(){
  var cat=S().ui.libCat||'all',q=(S().ui.libQuery||'').toLowerCase();
  var list=D.RESOURCES.filter(function(r){
    if(cat==='starred'){if(S().starred.indexOf(r.id)<0)return false;}
    else if(cat!=='all'&&r.cat!==cat)return false;
    if(!q)return true;return (r.name+' '+r.desc+' '+r.note+' '+r.level+' '+r.use).toLowerCase().indexOf(q)>=0;});
  var o='<div class="view stack"><section class="card"><div class="card-h"><h3>Free resource library</h3><span class="sub">'+D.RESOURCES.length+' resources · every one usable without paying</span></div><div class="filters" style="margin-bottom:12px"><div class="search"><input type="text" id="libSearch" placeholder="Search resources…" value="'+esc(S().ui.libQuery||'')+'"></div></div><div class="filters">'+D.CATS.map(function(c){return '<button class="fchip'+(cat===c.id?' on':'')+'" style="--fc:'+c.color+'" data-cat="'+c.id+'">'+esc(c.label)+'</button>';}).join('')+'<button class="fchip'+(cat==='starred'?' on':'')+'" style="--fc:#FFB020" data-cat="starred">\u2605 Starred ('+S().starred.length+')</button></div></section>';
  if(!list.length)o+='<section class="card"><div class="empty"><div class="em">\u2726</div><h3>Nothing matches</h3><p class="tiny">Try another category or clear the search.</p></div></section>';
  else{o+='<div class="res-grid">'+list.map(function(r){
    var col=(D.CATS.filter(function(c){return c.id===r.cat;})[0]||{}).color||'#3D7BFF';
    var st=S().starred.indexOf(r.id)>=0;
    return '<article class="res" style="--rc:'+col+'"><div class="res-top"><h4>'+esc(r.name)+'</h4><span class="res-badge'+(r.warn?' warn':'')+'">'+esc(r.badge)+'</span></div><div class="res-meta"><span class="chip" style="border-color:'+col+'55;color:'+col+'">'+esc(r.level)+'</span><span class="chip">'+esc((D.CATS.filter(function(c){return c.id===r.cat;})[0]||{}).label||r.cat)+'</span></div><p class="res-desc">'+esc(r.desc)+'</p><div class="res-note">'+esc(r.note)+'</div><div class="res-foot"><span class="res-use">'+esc(r.use)+'</span><span class="spacer"></span><button class="star'+(st?' on':'')+'" data-star="'+r.id+'" title="Star">\u2605</button><a class="btn btn-sm btn-primary" href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">Open \u2197</a></div></article>';}).join('')+'</div>';}
  o+='<section class="card"><div class="card-h"><h3>Free-tier traps</h3></div><div class="rules">'+D.RULES.slice(6).concat([['Anki on iPhone','The desktop app, AnkiDroid and AnkiWeb are free. Only the official iOS app is paid — review in the browser instead.','#3D7BFF'],['Coffee Break','The podcast audio for all four seasons is free. The video lessons, notes and exercise packs are the paid part.','#12C2D6']]).map(function(r){return '<div class="rule" style="--rlc:'+r[2]+'"><b>'+esc(r[0])+'</b><span>'+esc(r[1])+'</span></div>';}).join('')+'</div></section></div>';
  return o;
}

/* ── progress ── */
function chartMinutes(){
  var days=[],m=U.sessionDates();
  for(var i=29;i>=0;i--){var k=U.todayKey(U.addDays(new Date(),-i));days.push({k:k,v:m[k]||0});}
  var W=760,H=200,pl=34,pb=24,max=Math.max(60,Math.max.apply(null,days.map(function(d){return d.v;})));
  var bw=(W-pl-10)/days.length,s='<svg class="chart" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="Minutes studied over the last 30 days">';
  s+='<defs><linearGradient id="gBar" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#3D7BFF"/><stop offset="100%" stop-color="#12C2D6"/></linearGradient></defs>';
  [0,.25,.5,.75,1].forEach(function(f){var y=H-pb-(H-pb-14)*f;s+='<line class="gl" x1="'+pl+'" y1="'+y+'" x2="'+(W-6)+'" y2="'+y+'"/><text x="4" y="'+(y+3)+'">'+Math.round(max*f)+'</text>';});
  var goal=S().settings.dailyGoal||60,gy=H-pb-(H-pb-14)*(goal/max);
  s+='<line x1="'+pl+'" y1="'+gy+'" x2="'+(W-6)+'" y2="'+gy+'" stroke="#FFB020" stroke-width="1.5" stroke-dasharray="5 4"/><text x="'+(W-6)+'" y="'+(gy-5)+'" text-anchor="end" fill="#FFB020">goal '+goal+'</text>';
  days.forEach(function(d,i){var h=(H-pb-14)*(d.v/max),x=pl+i*bw+1.5,y=H-pb-h;
    s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(2,bw-3).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="3" fill="'+(d.v>=goal?'#3FD07A':'url(#gBar)')+'" opacity="'+(d.v?1:.25)+'"><title>'+d.k+': '+d.v+' min</title></rect>';
    if(i%5===0)s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+U.parseKey(d.k).getDate()+'</text>';});
  s+='<line class="axis" x1="'+pl+'" y1="'+(H-pb)+'" x2="'+(W-6)+'" y2="'+(H-pb)+'"/></svg>';
  return s;
}
function chartCumulative(){
  var sess=S().sessions.slice().sort(function(a,b){return a.date.localeCompare(b.date);});
  var W=760,H=210,pl=36,pb=26,total=0,pts=[];
  var start=U.parseKey(S().startDate),end=new Date(),span=Math.max(1,U.dayDiff(S().startDate,U.todayKey()));
  var byDay={};sess.forEach(function(s){byDay[s.date]=(byDay[s.date]||0)+s.minutes;});
  for(var i=0;i<=span;i++){var k=U.todayKey(U.addDays(start,i));total+=(byDay[k]||0);pts.push({i:i,h:total/60});}
  var maxH=Math.max(10,total/60);
  var X=function(i){return pl+(W-pl-10)*(i/span);},Y=function(h){return H-pb-(H-pb-16)*(h/maxH);};
  var s='<svg class="chart" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="Cumulative hours against CEFR thresholds">';
  s+='<defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3D7BFF" stop-opacity=".55"/><stop offset="100%" stop-color="#FF4FA3" stop-opacity=".04"/></linearGradient></defs>';
  D.CEFR.forEach(function(c){if(c.hours>maxH)return;var y=Y(c.hours);
    s+='<line x1="'+pl+'" y1="'+y.toFixed(1)+'" x2="'+(W-8)+'" y2="'+y.toFixed(1)+'" stroke="'+c.color+'" stroke-width="1.2" stroke-dasharray="4 5" opacity=".8"/><text x="'+(W-10)+'" y="'+(y-4).toFixed(1)+'" text-anchor="end" fill="'+c.color+'">'+c.lvl+' · '+c.hours+'h</text>';});
  var d='M'+X(0).toFixed(1)+' '+Y(pts[0].h).toFixed(1);
  pts.forEach(function(p){d+=' L'+X(p.i).toFixed(1)+' '+Y(p.h).toFixed(1);});
  s+='<path d="'+d+' L'+X(span).toFixed(1)+' '+(H-pb)+' L'+pl+' '+(H-pb)+' Z" fill="url(#gArea)"/>';
  s+='<path d="'+d+'" fill="none" stroke="#12C2D6" stroke-width="2.4" stroke-linejoin="round"/>';
  s+='<circle cx="'+X(span).toFixed(1)+'" cy="'+Y(total/60).toFixed(1)+'" r="4.5" fill="#FF4FA3"/>';
  s+='<line class="axis" x1="'+pl+'" y1="'+(H-pb)+'" x2="'+(W-8)+'" y2="'+(H-pb)+'"/>';
  s+='<text x="4" y="16">'+maxH.toFixed(0)+'h</text><text x="4" y="'+(H-pb)+'">0h</text><text x="'+pl+'" y="'+(H-8)+'">'+esc(U.niceDate(S().startDate))+'</text><text x="'+(W-8)+'" y="'+(H-8)+'" text-anchor="end">today</text></svg>';
  return s;
}
function heatmap(){
  var m=U.sessionDates(),cells=[],start=U.addDays(new Date(),-181);
  start=U.addDays(start,-((start.getDay()+6)%7));
  for(var i=0;i<189;i++){var d=U.addDays(start,i),k=U.todayKey(d),v=m[k]||0;
    if(U.dayDiff(k,U.todayKey())<0)continue;
    var lvl=v===0?0:v<20?1:v<45?2:v<75?3:4;
    cells.push('<div class="hm-c'+(lvl?' hm-lvl'+lvl:'')+'" title="'+k+': '+v+' min"></div>');}
  return '<div class="hm">'+cells.join('')+'</div>';
}
function viewProgress(){
  var st=U.stats(),mins=U.totalMinutes(),pos=U.cefrPosition(mins/60);
  var byBlock={};D.BLOCKS.forEach(function(b){byBlock[b.id]=0;});
  S().sessions.forEach(function(s){(s.blocks||[]).forEach(function(id){if(byBlock[id]!=null)byBlock[id]+=S().settings.blockMins[id]||0;});});
  var totB=Object.keys(byBlock).reduce(function(a,k){return a+byBlock[k];},0)||1;
  var o='<div class="view stack"><section class="stats">'+tile('Focused hours',U.fmtHours(mins)+'<small>h</small>',st.sessions+' sessions','#3D7BFF')+tile('Best streak',st.bestStreak+'<small>d</small>','currently '+st.curStreak,'#FFB020')+tile('Cards graded',st.reviews,S().cards.length+' in collection','#A78BFA')+tile('Weeks complete',st.weeksDone+'<small>/80</small>',Math.round(st.weeksDone/80*100)+'% of the plan','#3FD07A')+tile('Speaking sessions',st.speakSessions,'output block completed','#FF4FA3')+'</section>';
  o+='<section class="card"><div class="card-h"><h3>Where you are on the CEFR ladder</h3><span class="sub">estimate from focused hours · Cambridge guided-learning figures</span></div><div class="bar-lbl"><span>'+esc(pos.from.lvl)+' → '+esc(pos.to.lvl)+' · '+esc(pos.to.label)+'</span><b>'+Math.round(pos.pct*100)+'%</b></div>'+bar(pos.pct,pos.to.color)+'<div class="legend">'+D.CEFR.map(function(c){return '<span class="lg"><i style="background:'+c.color+'"></i>'+c.lvl+' · '+c.hours+'h · '+esc(c.label)+'</span>';}).join('')+'</div><div class="note" style="margin-top:14px"><b>'+Math.ceil(pos.hoursToNext)+' focused hours</b> to '+pos.to.lvl+' at your current pace — about '+Math.ceil(pos.hoursToNext/(Math.max(1,S().settings.dailyGoal)/60))+' days at '+S().settings.dailyGoal+' min/day. Passive listening during commutes shortens this without touching your hour.</div></section>';
  o+='<div class="split"><section class="card"><div class="card-h"><h3>Last 30 days</h3><span class="sub">minutes per day</span></div>'+chartMinutes()+'<div class="legend"><span class="lg"><i style="background:linear-gradient(180deg,#12C2D6,#3D7BFF)"></i>studied</span><span class="lg"><i style="background:#3FD07A"></i>goal reached</span><span class="lg"><i style="background:#FFB020"></i>daily goal line</span></div></section>';
  o+='<section class="card"><div class="card-h"><h3>Cumulative hours vs CEFR</h3><span class="sub">since '+esc(U.niceDate(S().startDate))+'</span></div>'+chartCumulative()+'</section></div>';
  o+='<section class="card"><div class="card-h"><h3>Consistency</h3><span class="sub">last 27 weeks</span></div>'+heatmap()+'<div class="legend"><span class="lg"><i style="background:var(--bg2);border:1px solid var(--line)"></i>none</span><span class="lg"><i class="hm-lvl1" style="width:11px;height:11px;border-radius:3px"></i>&lt;20m</span><span class="lg"><i class="hm-lvl2" style="width:11px;height:11px;border-radius:3px"></i>&lt;45m</span><span class="lg"><i class="hm-lvl3" style="width:11px;height:11px;border-radius:3px"></i>&lt;75m</span><span class="lg"><i class="hm-lvl4" style="width:11px;height:11px;border-radius:3px"></i>75m+</span></div></section>';
  o+='<div class="split"><section class="card"><div class="card-h"><h3>Time by block</h3><span class="sub">is the hour balanced?</span></div><div class="stack" style="gap:11px">'+D.BLOCKS.map(function(b){
    var v=byBlock[b.id],p=v/totB;
    return '<div><div class="bar-lbl"><span style="color:'+b.color+'">'+b.icon+' '+esc(b.name)+'</span><b>'+U.fmtHours(v)+'h · '+Math.round(p*100)+'%</b></div>'+bar(p,b.color)+'</div>';}).join('')+'</div><div class="note" style="margin-top:14px"><b>Watch the output share.</b> If speaking sits far below 15%, you are building a reading-only French. Add a conversation session.</div></section>';
  o+='<section class="card"><div class="card-h"><h3>Recent sessions</h3><span class="sub">'+S().sessions.length+' logged</span></div>';
  if(!S().sessions.length)o+='<div class="empty"><div class="em">\u25D4</div><h3>No sessions yet</h3><p class="tiny">Run the focus timer and your history appears here.</p><button class="btn btn-sm btn-primary" style="margin-top:12px" data-act="go-focus">Start the first hour</button></div>';
  else o+='<div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Min</th><th>Week</th><th>Note</th><th></th></tr></thead><tbody>'+S().sessions.slice().reverse().slice(0,25).map(function(s){
    return '<tr><td>'+esc(U.niceDate(s.date))+(s.partial?' <span class="tag">partial</span>':'')+'</td><td class="mono">'+s.minutes+'</td><td>'+(s.week||'-')+'</td><td class="muted tiny">'+esc(s.note||'—')+'</td><td><button class="rowbtn del" data-sess-del="'+s.id+'" title="Delete">\u2715</button></td></tr>';}).join('')+'</tbody></table></div>';
  o+='</section></div>';
  o+='<section class="card"><div class="card-h"><h3>Milestones</h3><span class="sub">'+Object.keys(S().milestones).length+'/'+D.MILESTONES.length+'</span></div><div class="ms-grid">'+D.MILESTONES.map(function(m){
    var got=!!S().milestones[m.id],v=st[m.k]||0;
    return '<div class="ms'+(got?' got':'')+'"><div class="ms-i">'+m.icon+'</div><div class="ms-n">'+esc(m.name)+'</div><div class="ms-d">'+esc(m.desc)+'</div><div style="margin-top:8px">'+bar(Math.min(1,v/m.need),'var(--c-amber)')+'</div></div>';}).join('')+'</div></section></div>';
  return o;
}

/* ── settings drawer ── */
function drawerHTML(){
  var s=S().settings;
  return '<div class="dw-sec"><h4>You</h4><label class="field"><span>Name (used in the greeting)</span><input type="text" id="setName" value="'+esc(s.name)+'" placeholder="Camille"></label><label class="field"><span>Plan start date</span><input type="date" id="setStart" value="'+esc(S().startDate)+'"></label><label class="field"><span>Daily goal (minutes)</span><input type="number" id="setGoal" min="10" max="240" step="5" value="'+s.dailyGoal+'"></label></div>'+
  '<div class="dw-sec"><h4>Appearance</h4><div class="seg" data-seg="theme"><button data-val="nuit"'+(s.theme==='nuit'?' class="on"':'')+'>Nuit</button><button data-val="jour"'+(s.theme==='jour'?' class="on"':'')+'>Jour</button><button data-val="rouge"'+(s.theme==='rouge'?' class="on"':'')+'>Rouge</button></div><button class="toggle'+(s.sound?' on':'')+'" data-toggle="sound"><span>Sound effects</span><span class="sw"></span></button><button class="toggle'+(s.ambient?' on':'')+'" data-toggle="ambient"><span>Ambient focus drone</span><span class="sw"></span></button></div>'+
  '<div class="dw-sec" id="dataSec"><h4>Your data</h4><p class="tiny dim">Everything is stored in this browser only. Export regularly — clearing site data erases your progress.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sm btn-primary" data-act="export">Export JSON backup</button><button class="btn btn-sm btn-ghost" data-act="export-csv">Export sessions CSV</button><button class="btn btn-sm btn-ghost" data-act="import">Import backup</button></div><input type="file" id="importFile" accept="application/json" hidden></div>'+
  '<div class="dw-sec"><h4>Danger zone</h4><button class="btn btn-sm btn-danger-ghost" data-act="reset-all">Erase everything and start over</button></div>'+
  '<div class="dw-sec" id="aboutSec"><h4>About the method</h4><p class="tiny muted">One focused hour, split 10 / 20 / 15 / 10 / 5 across cards, structured input, listening, speaking and logging. Eighty weeks mapped from zero to B2 using only free resources. Passive listening outside the hour is a bonus multiplier, never a replacement.</p><p class="tiny dim">Level estimates use Cambridge guided-learning-hour figures (A1 ~100h, A2 ~200h, B1 ~400h, B2 ~600h). They are a guide, not a certificate.</p><p class="tiny dim">Keyboard: <b>F</b> focus · <b>C</b> cards · <b>P</b> plan · <b>L</b> library · <b>G</b> progress · <b>Space</b> play/pause or reveal · <b>1–4</b> grade · <b>S</b> mute · <b>Esc</b> close.</p></div>';
}

/* ── router / render ── */
var VIEWS={dashboard:viewDashboard,plan:viewPlan,focus:viewFocus,cards:viewCards,library:viewLibrary,progress:viewProgress};
function route(){var h=(location.hash||'#/dashboard').replace('#/','');return VIEWS[h]?h:'dashboard';}
function render(){
  var r=route();S().ui.route=r;
  var main=$('#main');main.dataset.route=r;
  try{main.innerHTML=VIEWS[r]();}
  catch(err){console.error(err);main.innerHTML='<div class="view"><section class="card"><div class="card-h"><h3>Something went wrong</h3></div><p class="muted">This section could not be drawn. Your data is untouched. Try another tab, or open Settings and export a backup before reloading.</p></section></div>';}
  $$('#tabs a').forEach(function(a){a.classList.toggle('on',a.dataset.route===r);});
  var st=U.streaks();$('#streakNum').textContent=st.cur;$('#streakPill').classList.toggle('hot',st.cur>=3);
  $('#soundBtn').setAttribute('aria-pressed',String(S().settings.sound));
  $('#soundIcon').innerHTML=S().settings.sound?'&#9834;':'&#9835;&#822;';
  if(r==='focus')buildTicks();
  window.UH_renderTimerUI();
  U.save();
}
window.UH_render=render;
function go(r){location.hash='#/'+r;}

/* ── card editor ── */
var editing=null;
function openCardEditor(id){
  editing=id||null;
  var c=id?S().cards.filter(function(x){return x.id===id;})[0]:null;
  $('#ceTitle').textContent=c?'Edit card':'New card';
  $('#ceFront').value=c?c.front:'';$('#ceBack').value=c?c.back:'';$('#ceTags').value=c?(c.tags||[]).join(', '):'';
  var ds=decks();if(ds.indexOf('Mined')<0)ds.push('Mined');if(ds.indexOf('Unsorted')<0)ds.push('Unsorted');
  $('#ceDeck').innerHTML=ds.map(function(d){return '<option value="'+esc(d)+'"'+(c&&c.deck===d?' selected':'')+(!c&&d==='Mined'?' selected':'')+'>'+esc(d)+'</option>';}).join('');
  $('#ceDelete').hidden=!c;
  U.openModal('cardModal');
}
function saveCardEditor(){
  var f=$('#ceFront').value.trim(),b=$('#ceBack').value.trim();
  if(!f||!b){U.toast('Both sides are required.','warn');U.play('again');return;}
  var tags=$('#ceTags').value.split(',').map(function(t){return t.trim();}).filter(Boolean);
  if(editing){var c=S().cards.filter(function(x){return x.id===editing;})[0];
    if(c){c.front=f;c.back=b;c.deck=$('#ceDeck').value;c.tags=tags;}}
  else S().cards.push({id:U.uid(),front:f,back:b,deck:$('#ceDeck').value,tags:tags,ease:2.5,ivl:0,reps:0,lapses:0,due:U.todayKey(),created:U.todayKey(),last:null});
  U.save();U.closeModal('cardModal');U.play('good');U.toast(editing?'Card updated':'Card added','ok');
  srs.queue=[];render();
}
function deleteCard(id){
  var idx=-1;S().cards.forEach(function(c,i){if(c.id===id)idx=i;});
  if(idx<0)return;
  var removed=S().cards.splice(idx,1)[0];U.save();srs.queue=[];render();
  U.toast('Card deleted','info',{label:'Undo',fn:function(){S().cards.splice(idx,0,removed);U.save();render();U.toast('Card restored','ok');}});
}

/* ── export / import ── */
function download(name,text,type){
  var blob=new Blob([text],{type:type||'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(url);a.remove();},400);
}
function exportJSON(){download('une-heure-backup-'+U.todayKey()+'.json',JSON.stringify(S(),null,2));U.toast('Backup downloaded','ok');}
function exportCSV(){
  var rows=[['date','minutes','week','phase','blocks','speaking','cards_added','note']];
  S().sessions.forEach(function(s){rows.push([s.date,s.minutes,s.week||'',s.phase||'',(s.blocks||[]).join(' '),s.speak?'yes':'no',s.cardsAdded||0,'"'+String(s.note||'').replace(/"/g,'""')+'"']);});
  download('une-heure-sessions-'+U.todayKey()+'.csv',rows.map(function(r){return r.join(',');}).join('\n'),'text/csv');
  U.toast('Sessions CSV downloaded','ok');
}
function importJSON(file){
  var fr=new FileReader();
  fr.onload=function(){
    try{
      var p=JSON.parse(fr.result);
      if(!p||!Array.isArray(p.cards)||!Array.isArray(p.sessions))throw new Error('bad shape');
      U.confirmDialog('Replace your data?','This overwrites everything currently in this browser with the imported backup.',function(){
        U.replaceState(U.normalize(p));applyTheme();U.resetTimer(false);srs.queue=[];render();U.toast('Backup imported','ok');
      },'Replace');
    }catch(e){U.toast('That file is not a valid Une Heure backup.','danger');}
  };
  fr.readAsText(file);
}
function applyTheme(){document.documentElement.setAttribute('data-theme',S().settings.theme||'nuit');}

/* ── global events ── */
document.addEventListener('click',function(ev){
  var t=ev.target.closest('[data-act],[data-task],[data-week],[data-phase],[data-block-go],[data-block-tick],[data-jump],[data-grade],[data-cat],[data-star],[data-card-edit],[data-card-del],[data-sess-del],[data-err-toggle],[data-err-del],[data-close-modal],[data-open-settings],[data-toggle],[data-seg] button,[data-week-nav],[data-cp-save],[data-sort],#flash,#navStart,#settingsBtn,#soundBtn,#drawerClose,#cmSave,#ceSave,#ceDelete,#streakPill');
  if(!t)return;
  var d=t.dataset;

  if(t.id==='navStart'||d.act==='go-focus'){go('focus');setTimeout(function(){if(!U.T.running)U.timerStart();},120);return;}
  if(d.act==='open-focus'){go('focus');return;}
  if(d.act==='go-cards'){go('cards');return;}
  if(d.act==='go-plan'){S().ui.planWeek=U.currentWeek();go('plan');return;}
  if(t.id==='streakPill'){go('progress');return;}
  if(t.id==='soundBtn'){S().settings.sound=!S().settings.sound;if(!S().settings.sound)U.setAmbient(false);else U.play('toggle');U.save();render();U.toast(S().settings.sound?'Sound on':'Sound muted','info');return;}
  if(t.id==='settingsBtn'||d.openSettings!==undefined){
    $('#drawerBody').innerHTML=drawerHTML();U.openModal('drawer');
    if(d.openSettings==='data')setTimeout(function(){var e=$('#dataSec');if(e)e.scrollIntoView({block:'start'});},120);
    if(d.openSettings==='about')setTimeout(function(){var e=$('#aboutSec');if(e)e.scrollIntoView({block:'start'});},120);
    return;}
  if(t.id==='drawerClose'){U.closeModal('drawer');return;}
  if(d.closeModal){U.closeModal(d.closeModal);return;}
  if(t.id==='cmSave'){U.saveSession();return;}
  if(t.id==='ceSave'){saveCardEditor();return;}
  if(t.id==='ceDelete'){var id=editing;U.closeModal('cardModal');deleteCard(id);return;}

  if(d.act==='t-toggle'){U.timerToggle();return;}
  if(d.act==='t-skip'){U.timerSkip();return;}
  if(d.act==='t-reset'){U.timerReset();return;}
  if(d.act==='t-log'){U.logPartial();return;}
  if(d.jump!==undefined){U.jumpTo(+d.jump);return;}
  if(d.blockGo!==undefined){go('focus');setTimeout(function(){U.jumpTo(+d.blockGo);U.timerStart();},120);return;}
  if(d.blockTick){var td=U.today();td.blocks[d.blockTick]=!td.blocks[d.blockTick];U.save();U.play('toggle');window.UH_renderTodayBlocks();window.UH_renderTimerUI();
    if(D.BLOCKS.every(function(b){return U.today().blocks[b.id];}))U.toast('All five blocks ticked. Log the session from the Focus tab.','ok');return;}
  if(d.act==='preset-default'){S().settings.blockMins={anki:10,structure:20,input:15,output:10,log:5};U.save();U.resetTimer(true);render();U.toast('Back to the 60-minute template','ok');return;}
  if(d.act==='preset-short'){S().settings.blockMins={anki:10,structure:8,input:5,output:4,log:3};U.save();U.resetTimer(true);render();U.toast('Short day: 30 minutes. Cards never skipped.','ok');return;}

  if(d.task){var k='w'+d.task;S().weekTasks[k]=!S().weekTasks[k];U.save();U.play(S().weekTasks[k]?'good':'click');
    var parts=d.task.split(':'),wp=U.weekProgress(+parts[0]);
    if(wp.done===wp.total){U.confetti();U.play('blockDone');U.toast('Week '+parts[0]+' complete','ok');U.checkMilestones();}
    render();return;}
  if(d.week){S().ui.planWeek=+d.week;U.save();U.play('click');render();return;}
  if(d.weekNav){S().ui.planWeek=clamp((S().ui.planWeek||U.currentWeek())+ +d.weekNav,1,80);U.save();render();return;}
  if(d.act==='week-current'){S().ui.planWeek=U.currentWeek();U.save();render();return;}
  if(d.act==='week-all'){var w=S().ui.planWeek||U.currentWeek();U.weekData(w).tasks.forEach(function(x,i){S().weekTasks['w'+w+':'+i]=true;});U.save();U.confetti();U.play('blockDone');U.checkMilestones();render();return;}
  if(d.phase){var p=D.PHASES.filter(function(x){return x.id===d.phase;})[0];S().ui.planWeek=p.weeks[0];U.save();go('plan');render();return;}
  if(d.cpSave){S().checkpoints[d.cpSave]={date:U.todayKey(),result:$('#cpResult').value.trim(),note:$('#cpNote').value.trim()};U.save();U.play('good');U.toast('Checkpoint saved','ok');render();return;}

  if(t.id==='flash'||(t.closest&&t.closest('#flash'))){srs.shown=!srs.shown;U.play('click');render();return;}
  if(d.grade!==undefined){gradeCurrent(+d.grade);return;}
  if(d.act==='srs-skip'){srs.pos++;srs.shown=false;render();return;}
  if(d.act==='srs-restart'){buildQueue();U.toast('Queue rebuilt','info');render();return;}
  if(d.act==='srs-ahead'){srs.queue=S().cards.slice().sort(function(a,b){return String(a.due).localeCompare(String(b.due));}).slice(0,20);srs.pos=0;srs.shown=false;srs.done=0;render();return;}
  if(d.act==='card-new'){openCardEditor(null);return;}
  if(d.act==='card-edit-cur'){var cc=srs.queue[srs.pos];if(cc)openCardEditor(cc.id);return;}
  if(d.act==='speak-card'){
    var sc=srs.queue[srs.pos];if(!sc)return;
    try{var u=new SpeechSynthesisUtterance(sc.front);u.lang='fr-FR';u.rate=.9;
      var vs=speechSynthesis.getVoices().filter(function(v){return /^fr/i.test(v.lang);});if(vs.length)u.voice=vs[0];
      speechSynthesis.cancel();speechSynthesis.speak(u);U.toast('Playing with your browser voice','info');}
    catch(e){U.toast('Speech synthesis unavailable here — use Forvo instead.','warn');}
    return;}
  if(d.cardEdit){openCardEditor(d.cardEdit);return;}
  if(d.cardDel){deleteCard(d.cardDel);return;}
  if(d.sort){S().ui.cardSort=d.sort;U.save();render();return;}
  if(d.sessDel){
    var i2=-1;S().sessions.forEach(function(x,i){if(x.id===d.sessDel)i2=i;});
    if(i2<0)return;var rem=S().sessions.splice(i2,1)[0];U.save();render();
    U.toast('Session removed','info',{label:'Undo',fn:function(){S().sessions.splice(i2,0,rem);U.save();render();}});return;}
  if(d.act==='err-add'){
    var et=$('#errText').value.trim(),ef=$('#errFix').value.trim();
    if(!et){U.toast('Write what went wrong first.','warn');return;}
    S().errors.push({id:U.uid(),date:U.todayKey(),text:et,fix:ef,resolved:false});U.save();U.play('good');render();return;}
  if(d.errToggle){S().errors.forEach(function(e){if(e.id===d.errToggle)e.resolved=!e.resolved;});U.save();render();return;}
  if(d.errDel){var ei=-1;S().errors.forEach(function(e,i){if(e.id===d.errDel)ei=i;});if(ei<0)return;
    var er=S().errors.splice(ei,1)[0];U.save();render();
    U.toast('Error removed','info',{label:'Undo',fn:function(){S().errors.splice(ei,0,er);U.save();render();}});return;}
  if(d.act==='err-to-cards'){
    var open=S().errors.filter(function(e){return !e.resolved&&e.fix;});
    if(!open.length){U.toast('No unfixed errors with a correction to convert.','warn');return;}
    open.forEach(function(e){S().cards.push({id:U.uid(),front:e.fix,back:e.text,deck:'Errors',tags:['correction'],ease:2.5,ivl:0,reps:0,lapses:0,due:U.todayKey(),created:U.todayKey(),last:null});e.resolved=true;});
    U.save();U.play('good');U.toast(open.length+' corrections turned into cards','ok');srs.queue=[];render();return;}

  if(d.cat){S().ui.libCat=d.cat;U.save();U.play('click');render();return;}
  if(d.star){var ix=S().starred.indexOf(d.star);if(ix>=0)S().starred.splice(ix,1);else S().starred.push(d.star);U.save();U.play('toggle');render();return;}

  if(d.toggle){
    var key=d.toggle;S().settings[key]=!S().settings[key];
    if(key==='sound'&&!S().settings.sound)U.setAmbient(false);
    if(key==='ambient')U.setAmbient(S().settings.ambient&&U.T.running);
    U.save();U.play('toggle');
    t.classList.toggle('on',S().settings[key]);
    if($('#drawer').hidden===false)$('#drawerBody').innerHTML=drawerHTML();
    $('#soundBtn').setAttribute('aria-pressed',String(S().settings.sound));
    $('#soundIcon').innerHTML=S().settings.sound?'&#9834;':'&#9835;&#822;';
    return;}
  if(d.val&&t.parentNode.dataset.seg==='theme'){S().settings.theme=d.val;applyTheme();U.save();U.play('click');
    $$('[data-seg="theme"] button').forEach(function(b){b.classList.toggle('on',b.dataset.val===d.val);});return;}

  if(d.act==='new-prompt'){
    var arr=D.PROMPTS[U.phaseOf(U.currentWeek()).id],el=$('#promptText');
    if(el){var cur=el.textContent,next=cur;
      for(var i=0;i<8&&next===cur;i++)next='\u00AB\u00A0'+arr[Math.floor(Math.random()*arr.length)]+'\u00A0\u00BB';
      el.textContent=next;U.play('click');}
    return;}
  if(d.act==='prompt-focus'){go('focus');setTimeout(function(){U.jumpTo(3);U.timerStart();},120);return;}
  if(d.act==='export'){exportJSON();return;}
  if(d.act==='export-csv'){exportCSV();return;}
  if(d.act==='import'){$('#importFile').click();return;}
  if(d.act==='reset-all'){
    U.confirmDialog('Erase everything?','Sessions, cards, task progress and milestones will be deleted from this browser. Export a backup first if you want to keep them.',function(){
      U.replaceState(U.defaults());applyTheme();U.resetTimer(false);srs.queue=[];U.save();U.closeModal('drawer');render();U.toast('Fresh start. Week 1 begins today.','ok');
    },'Erase everything');return;}
});

document.addEventListener('input',function(ev){
  var t=ev.target,d=t.dataset;
  if(d.mins){S().settings.blockMins[d.mins]=+t.value;var l=$('#lbl-'+d.mins);if(l)l.textContent=t.value+' min';
    if(!U.T.running&&U.curBlock().id===d.mins){U.T.total=+t.value*60;U.T.left=U.T.total;}
    U.save();window.UH_renderTimerUI();window.UH_renderTodayBlocks();return;}
  if(d.set){
    if(d.set==='volume'){S().settings.volume=+t.value/100;$('#lbl-vol').textContent=t.value+'%';}
    else{S().settings[d.set]=+t.value;var lb=$(d.set==='breakMin'?'#lbl-break':'#lbl-long');if(lb)lb.textContent=t.value+' min';}
    U.save();return;}
  if(t.id==='libSearch'){S().ui.libQuery=t.value;U.save();
    var pos=t.selectionStart;render();var n=$('#libSearch');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(e){}}return;}
  if(t.id==='cardSearch'){S().ui.cardQuery=t.value;U.save();
    var p2=t.selectionStart;render();var n2=$('#cardSearch');if(n2){n2.focus();try{n2.setSelectionRange(p2,p2);}catch(e){}}return;}
  if(t.id==='setName'){S().settings.name=t.value;U.save();return;}
  if(t.id==='setGoal'){S().settings.dailyGoal=U.clamp(+t.value||60,10,240);U.save();return;}
});
document.addEventListener('change',function(ev){
  var t=ev.target;
  if(t.id==='cardDeck'||t.id==='srsDeck'){S().ui.cardDeck=t.value;U.save();srs.queue=[];render();return;}
  if(t.id==='setStart'){S().startDate=t.value||U.todayKey();U.save();render();return;}
  if(t.id==='importFile'&&t.files&&t.files[0]){importJSON(t.files[0]);t.value='';return;}
});
document.addEventListener('keydown',function(ev){
  var tag=(ev.target.tagName||'').toLowerCase();
  if(ev.key==='Escape'){
    var top=U.topModal();
    if(top){U.closeModal(top);ev.preventDefault();return;}
    if(tag==='input'||tag==='textarea'||tag==='select')ev.target.blur();
    return;}
  if(ev.ctrlKey||ev.metaKey||ev.altKey)return;
  if(tag==='input'||tag==='textarea'||tag==='select')return;
  if(U.topModal())return;
  var r=$('#main').dataset.route;
  if(ev.code==='Space'){
    if(tag==='button'||tag==='a')return;
    ev.preventDefault();
    if(r==='cards'&&srs.queue.length&&srs.pos<srs.queue.length){srs.shown=!srs.shown;U.play('click');render();}
    else U.timerToggle();
    return;}
  if(r==='cards'&&srs.shown&&['1','2','3','4'].indexOf(ev.key)>=0){gradeCurrent(+ev.key-1);return;}
  var k=ev.key.toLowerCase();
  if(k==='f'){go('focus');}
  else if(k==='c'){go('cards');}
  else if(k==='p'){go('plan');}
  else if(k==='l'){go('library');}
  else if(k==='g'){go('progress');}
  else if(k==='s'){S().settings.sound=!S().settings.sound;if(!S().settings.sound)U.setAmbient(false);U.save();render();U.toast(S().settings.sound?'Sound on':'Sound muted','info');}
});
$$('.scrim').forEach(function(sc){sc.addEventListener('click',function(){
  var id=sc.id==='drawerScrim'?'drawer':sc.id.replace('Scrim','Modal');U.closeModal(id);});});
window.addEventListener('hashchange',function(){render();window.scrollTo({top:0,behavior:'smooth'});});

/* ── boot ── */
applyTheme();
if(!location.hash){try{history.replaceState(null,'','#/dashboard');}catch(e){location.hash='#/dashboard';}}
U.resetTimer(false);
render();
U.checkMilestones();
var seen=false;
try{seen=!!localStorage.getItem('uneheure.seen');if(!seen)localStorage.setItem('uneheure.seen','1');}catch(e){seen=true;}
if(!S().sessions.length&&!seen){
  setTimeout(function(){U.toast('Welcome. Press F to start your first hour.','ok',{label:'Start now',fn:function(){go('focus');setTimeout(U.timerStart,150);}});},900);
}
})();