/* Une Heure - curriculum + resource data. Every listed resource is free to use. */
window.UH_DATA = (function () {
var PHASES = [
  { id:'p1', n:1, name:'Build the engine', weeks:[1,4], cefr:'A1 foundation', accent:'#3D7BFF',
    goal:'Understand how French works, lock in pronunciation early, bank your first ~300 words.',
    blocks:{
      anki:'Phonology sub-deck first, then the main course at 10 new cards/day. Expand the sub-decks so you land on the main course, not verb conjugations.',
      structure:'Language Transfer tracks 1-2 per day. Pause when asked, answer OUT LOUD, no transcript while constructing sentences.',
      input:'Alice Ayel beginner story-listening. Watch, do not translate, chase the gist. Rewatch favourites.',
      output:'Shadow the Language Transfer answers again, then describe your room and your day aloud.',
      log:'Add 5-10 sentences from today as cards. Write down tomorrow\'s first task.'
    },
    focusNote:'Pronunciation month: nasal vowels, u vs ou, silent final consonants, liaison. Check every uncertain word on Forvo.',
    checkpoint:{ week:4, label:'TV5MONDE 14-question level test, plus record a 60-second self-introduction and keep the file.' } },
  { id:'p2', n:2, name:'Reach A2', weeks:[5,12], cefr:'A2', accent:'#12C2D6',
    goal:'Handle everyday situations. Present, past and near future all working.',
    blocks:{
      anki:'15 new cards/day. Add your own sentence cards from TV5MONDE and Coffee Break - yours beat premade ones.',
      structure:'Coffee Break French Season 1, lessons 1-40 (about 5/week). Alternate days with TV5MONDE Première classe modules.',
      input:'TV5MONDE A1 video exercises - answer the comprehension questions. Start the Duolingo French Podcast.',
      output:'Role-play aloud: order coffee, ask directions, book a room. Write 3-5 sentences, check them in Reverso Context.',
      log:'Grammar on demand only: look up what confuses you on Lawless French. Never study grammar front-to-back.'
    },
    focusNote:'Start speaking with humans in week 6. Text plus voice notes on HelloTalk. Low pressure, high value.',
    checkpoint:{ week:12, label:'Free DELF A2 sample paper (France Education international): listening and reading, graded with the official key.' } },
  { id:'p3', n:3, name:'Consolidate to early B1', weeks:[13,26], cefr:'A2 to B1', accent:'#3FD07A',
    goal:'Past tenses fluent, real conversations survivable, listening takes off.',
    blocks:{
      anki:'15-20 new/day. Move into deck Part 2 (words 500-5000) and start the irregular-verb sub-deck.',
      structure:'Coffee Break French Season 2 - past, future, conditional. Supplement with TV5MONDE A2 exercises.',
      input:'innerFrench from episode 1: listen, read the transcript (max 5 lookups), listen again. RFI twice a week.',
      output:'Retell the innerFrench episode aloud in 60-90 seconds in your own simpler French. The highest-leverage speaking drill there is.',
      log:'One 45-min HelloTalk or Tandem call weekly. Bring 3 topics. Ask for corrections and log every one.'
    },
    focusNote:'Pronunciation still shaky? Swap the structure block for 10 minutes of public-domain FSI French Basic drills.',
    checkpoint:{ week:26, label:'Full DELF B1 sample paper, all four sections. Grade writing and speaking against the official rubrics.' } },
  { id:'p4', n:4, name:'Push to B1', weeks:[27,52], cefr:'B1', accent:'#FFB020',
    goal:'Independent user: express opinions, narrate, argue, understand normal-speed French.',
    blocks:{
      anki:'Shift to your OWN sentence cards mined from what you actually read and watch. Language Reactor exports to Anki with audio.',
      structure:'Coffee Break French Season 3 (B1-B2): subjunctive, plus 8 dedicated translation and dictation lessons at the end.',
      input:'Later innerFrench episodes plus Ingrid Immersion France. Daily RFI with transcript. Easy French street interviews with dual subtitles.',
      output:'Argue a position aloud for 2 minutes. Record it. Listen back. Fix one thing. Repeat.',
      log:'Two conversation sessions a week now. Discord voice rooms are free and lower-pressure than one-on-one.'
    },
    focusNote:'Dictation: the TV5MONDE dictée d\'Archibald forces you to hear every sound and fixes agreement at the same time.',
    checkpoint:{ week:52, label:'TV5MONDE TCF 90-minute mock exam under real conditions - a calibrated CEFR estimate, free.' } },
  { id:'p5', n:5, name:'Toward B2', weeks:[53,80], cefr:'B2', accent:'#FF4FA3',
    goal:'Work and study level French. Only if you want it.',
    blocks:{
      anki:'Mining only. Every card comes from something you chose to read or watch.',
      structure:'Coffee Break French Season 4 (B2-C1): normal speed, idiom-heavy. TV5MONDE B2 exercises.',
      input:'Native content you would consume anyway. TV5MONDE+ streams films and series free, subtitled in five languages.',
      output:'Weekly extended discussion plus a written argument graded against DELF B2 rubrics.',
      log:'Track recurring errors, not new words. At this level the error log IS the curriculum.'
    },
    focusNote:'Register-switching: formal writing versus casual speech. Notice which one you are hearing.',
    checkpoint:{ week:80, label:'DELF B2 sample paper, all four papers, timed. Compare against the examiner descriptors.' } }
];
var BLOCKS = [
  { id:'anki',      name:'Card review',         short:'Cards',     min:10, icon:'\u29C9', color:'#3D7BFF', tip:'Reviews first, then new cards. Never skip - even on bad days.' },
  { id:'structure', name:'Structured input',    short:'Structure', min:20, icon:'\u25C8', color:'#12C2D6', tip:'Language Transfer track or Coffee Break lesson. Answer out loud, always.' },
  { id:'input',     name:'Listening / reading', short:'Input',     min:15, icon:'\u25CD', color:'#3FD07A', tip:'Transcript-based: listen, read, listen again.' },
  { id:'output',    name:'Speaking out loud',   short:'Output',    min:10, icon:'\u25C9', color:'#FFB020', tip:'Shadow, retell, or record yourself. Free, always available, non-negotiable.' },
  { id:'log',       name:'Log and load',        short:'Log',       min:5,  icon:'\u270E', color:'#FF4FA3', tip:'Add 5-10 sentences as cards; write down tomorrow\'s first task.' }
];
var PREMIERE = ['Greetings','Hobbies','Meals','Accommodation','Work','Health','Trips'];
function buildWeeks(){
  var weeks=[];
  for (var w=1; w<=80; w++){
    var ph=null;
    for(var k=0;k<PHASES.length;k++){ if(w>=PHASES[k].weeks[0] && w<=PHASES[k].weeks[1]) ph=PHASES[k]; }
    var title,detail,tasks=[],a,b,i,ep,mod;
    if (w<=4){
      a=(w-1)*10+1; b=Math.min(w*10,40);
      title='Language Transfer '+a+'-'+b;
      detail='Ten tracks a week finishes the whole 40-track intro course inside month one.';
      tasks=[{t:'Language Transfer tracks '+a+'-'+b,tag:'structure'},
             {t:'Card phonology sub-deck, then 10 new words/day',tag:'anki'},
             {t:'3 Alice Ayel beginner stories (rewatch one)',tag:'input'},
             {t:'Forvo-check 10 words you are unsure how to say',tag:'output'}];
      if(w===1) tasks.push({t:'Install Anki and the free 5000-word frequency deck',tag:'anki'});
      if(w===4) tasks.push({t:'CHECKPOINT - TV5MONDE level test + 60-second recording',tag:'check',check:true});
    } else if (w<=12){
      i=w-4; a=(i-1)*5+1; b=Math.min(i*5,40); mod=PREMIERE[Math.min(i-1,PREMIERE.length-1)];
      title='Coffee Break S1, lessons '+a+'-'+b;
      detail='Alternate days with TV5MONDE Première classe: '+mod+'.';
      tasks=[{t:'Coffee Break French S1 lessons '+a+'-'+b,tag:'structure'},
             {t:'Première classe module: '+mod,tag:'structure'},
             {t:'15 new cards/day plus your own sentence cards',tag:'anki'},
             {t:'2 Duolingo French Podcast episodes',tag:'input'},
             {t:'Role-play aloud: 3 everyday situations',tag:'output'}];
      if(w===6) tasks.push({t:'FIRST HUMAN CONTACT - HelloTalk text + voice notes',tag:'speak',check:true});
      if(w===12) tasks.push({t:'CHECKPOINT - DELF A2 sample paper (listening + reading)',tag:'check',check:true});
    } else if (w<=26){
      i=w-12; a=Math.min((i-1)*3+1,40); b=Math.min(i*3,40); ep=(i-1)*3+1;
      title='Coffee Break S2, lessons '+a+'-'+b;
      detail='innerFrench episodes '+ep+'-'+(ep+2)+', three-pass method with the free transcript.';
      tasks=[{t:'Coffee Break French S2 lessons '+a+'-'+b,tag:'structure'},
             {t:'innerFrench E'+ep+'-E'+(ep+2)+' (listen, read, listen)',tag:'input'},
             {t:'RFI Journal en français facile x2 with transcript',tag:'input'},
             {t:'Retell one episode aloud in 90 seconds',tag:'output'},
             {t:'45-min exchange call + log every correction',tag:'speak'}];
      if(w===13) tasks.push({t:'Open the frequency deck Part 2 + irregular-verb sub-deck',tag:'anki'});
      if(w===26) tasks.push({t:'CHECKPOINT - Full DELF B1 sample paper, 4 sections',tag:'check',check:true});
    } else if (w<=52){
      i=w-26; a=Math.min((i-1)*2+1,40); b=Math.min(i*2,40); ep=43+(i-1)*3;
      title='Coffee Break S3, lessons '+a+'-'+b;
      detail='innerFrench E'+ep+'+ and Ingrid Immersion France. Two conversation sessions this week.';
      tasks=[{t:'Coffee Break French S3 lessons '+a+'-'+b,tag:'structure'},
             {t:'innerFrench E'+ep+'-E'+Math.min(ep+2,200)+' + 1 Ingrid Immersion episode',tag:'input'},
             {t:'RFI daily, transcript on the second pass',tag:'input'},
             {t:'Easy French street interview x2, dual subtitles',tag:'input'},
             {t:'2-minute recorded argument + self-review',tag:'output'},
             {t:'2 conversation sessions (Discord voice room counts)',tag:'speak'}];
      if(w===40) tasks.push({t:'Dictation week - dictée d\'Archibald x3',tag:'output'});
      if(w===52) tasks.push({t:'CHECKPOINT - TV5MONDE TCF 90-minute mock exam',tag:'check',check:true});
    } else {
      i=w-52; a=Math.min((i-1)*2+1,40); b=Math.min(i*2,40);
      title='Coffee Break S4, lessons '+a+'-'+b;
      detail='Normal-speed French, idioms, and native content you would watch anyway.';
      tasks=[{t:'Coffee Break French S4 lessons '+a+'-'+b,tag:'structure'},
             {t:'TV5MONDE B2 exercise series x3',tag:'structure'},
             {t:'One native film or series episode on TV5MONDE+',tag:'input'},
             {t:'Written argument, graded against DELF B2 descriptors',tag:'output'},
             {t:'Extended discussion session',tag:'speak'}];
      if(w===80) tasks.push({t:'CHECKPOINT - DELF B2 sample paper, all four papers, timed',tag:'check',check:true});
    }
    weeks.push({w:w,phase:ph.id,title:title,detail:detail,tasks:tasks,checkpoint:ph.checkpoint.week===w?ph.checkpoint.label:null});
  }
  return weeks;
}

var RESOURCES = [
  { id:'lt', name:'Language Transfer - Intro to French', cat:'structure', level:'A1-A2', badge:'100% free',
    url:'https://www.languagetransfer.org/french',
    desc:'40 audio tracks, about 6h37m. No signup, no ads, donation-funded. Teaches you to build French from English instead of memorising it.',
    note:'French is intro-only - there is no Complete French yet, so it covers roughly the first third of a full structural course.', use:'Phase 1 core' },
  { id:'cbf', name:'Coffee Break French (podcast)', cat:'structure', level:'A1-C1', badge:'Audio free', warn:true,
    url:'https://coffeebreaklanguages.com/coffeebreakfrench/',
    desc:'Seasons 1-4, 40 lessons each. S1 A1-A2, S2 A2-B1, S3 B1-B2, S4 B2-C1.',
    note:'Only the video, notes and exercise packages are paid. The podcast audio itself is free on every major app.', use:'Phases 2-5 spine' },
  { id:'tv5', name:'TV5MONDE - Apprendre le français', cat:'structure', level:'A1-B2', badge:'100% free',
    url:'https://apprendre.tv5monde.com/en',
    desc:'2000+ free video exercises built by professional FLE educators, sorted A1 to B2.',
    note:'Start with Première classe: about 480 exercises across seven themed modules.', use:'Every phase' },
  { id:'premiere', name:'Première classe (A1 course)', cat:'structure', level:'A1', badge:'100% free',
    url:'https://apprendre.tv5monde.com/en/exercices/premiere-classe',
    desc:'The structured beginner path inside TV5MONDE. Seven themed modules, each with four steps.',
    note:'Order: Greetings, Hobbies, Meals, Accommodation, Work, Health, Trips.', use:'Phase 2' },
  { id:'fsi', name:'FSI French Basic Course', cat:'structure', level:'A1-B1', badge:'Public domain',
    url:'https://fsi-languages.yojik.eu/languages/oldfsi/languages/french-basic.html',
    desc:'US government course, free audio and text. Old-fashioned and drill-heavy.',
    note:'Brutally effective on sound patterns. Use as a 10-minute swap-in when pronunciation feels shaky.', use:'Pronunciation rescue' },
  { id:'anki', name:'Anki', cat:'vocab', level:'All', badge:'Free (not iOS)', warn:true,
    url:'https://apps.ankiweb.net/',
    desc:'Spaced repetition. Free on Windows, Mac and Linux, free AnkiDroid on Android, free AnkiWeb sync.',
    note:'The official iPhone app costs money. On iOS, review in the browser via AnkiWeb instead.', use:'Daily, forever' },
  { id:'deck', name:'5000 most frequent French words', cat:'vocab', level:'A1-B2', badge:'Free deck',
    url:'https://ankiweb.net/shared/info/893324022',
    desc:'Frequency-ordered, IPA, native audio (Parisian and Canadian), example sentences, phonology and irregular-verb sub-decks.',
    note:'Some cards have gender or translation errors and a few missing audio files - sanity-check new words against a dictionary.', use:'Phase 1-3 vocabulary' },
  { id:'deck2', name:'Frequency deck - Part 2', cat:'vocab', level:'A2-B2', badge:'Free deck',
    url:'https://ankiweb.net/shared/info/1543609595',
    desc:'Words 500-5000. No overlap with Part 1, so nothing repeats.',
    note:'Open it from month 4 onward, once the first 500 feel automatic.', use:'Phase 3+' },
  { id:'forvo', name:'Forvo', cat:'vocab', level:'All', badge:'Free',
    url:'https://forvo.com/languages/fr/',
    desc:'Native-speaker pronunciation dictionary. Hear any word, often in several regional accents.',
    note:'Use it the moment you are unsure - never guess a French pronunciation from spelling.', use:'Phase 1 especially' },
  { id:'reverso', name:'Reverso Context', cat:'vocab', level:'All', badge:'Free',
    url:'https://context.reverso.net/translation/english-french/',
    desc:'Translation in context with millions of real bilingual examples.',
    note:'Check your own written sentences here before adding them as cards.', use:'Output checks' },
  { id:'rfi', name:'RFI - Journal en français facile', cat:'listening', level:'A2-B2', badge:'Free + transcript',
    url:'https://francaisfacile.rfi.fr/fr/podcasts/journal-en-fran%C3%A7ais-facile/',
    desc:'A real 10-minute news bulletin, Monday to Friday, with full transcription and weekly bonus exercises.',
    note:'The best value-per-minute listening exercise there is. Ten minutes, every day, from month 4.', use:'Phase 3-4 daily' },
  { id:'inner', name:'innerFrench (200 episodes)', cat:'listening', level:'B1', badge:'Free + transcript',
    url:'https://innerfrench.com/podcast/',
    desc:'Progressively harder episodes on French culture and society. From ep. 92 Ingrid joins for conversational formats.',
    note:'Ended Sept 2026 at episode 200, but the whole archive stays online. Transcripts need a free account.', use:'Phase 3-4 core' },
  { id:'ingrid', name:'Ingrid Immersion France', cat:'listening', level:'B1-B2', badge:'Free',
    url:'https://podcasts.apple.com/us/podcast/ingrid-immersion-france/id6806688032',
    desc:'The successor from innerFrench co-host Ingrid. Easy French on current events, about 30 min, twice monthly.',
    note:'Launched Aug/Sep 2026 - fresh content to replace the finished innerFrench feed.', use:'Phase 4' },
  { id:'duopod', name:'Duolingo French Podcast', cat:'listening', level:'A2-B1', badge:'Free + transcript',
    url:'https://podcast.duolingo.com/french',
    desc:'True stories in slow, clear French with an English narrator bridging the gaps.',
    note:'The right bridge between beginner audio and innerFrench. Nothing to do with the paid app tier.', use:'Phase 2' },
  { id:'ayel', name:'Alice Ayel - story listening', cat:'listening', level:'A0-A2', badge:'Free on YouTube',
    url:'https://www.youtube.com/@aliceayel',
    desc:'Slow French-only stories with drawings and gestures, designed for absolute beginners.',
    note:'Her Baby Stage approach: just try to understand the gist. Do not translate word for word.', use:'Phase 1 input' },
  { id:'easy', name:'Easy French - street interviews', cat:'listening', level:'A2-C1', badge:'Free + dual subs',
    url:'https://www.youtube.com/@EasyFrench',
    desc:'Real people, real speed, real filler words. Dual subtitles on every video.',
    note:'Where you train the ear for messy spoken French rather than studio French.', use:'Phase 4' },
  { id:'tvplus', name:'TV5MONDE+', cat:'listening', level:'B1+', badge:'Free',
    url:'https://www.tv5mondeplus.com/',
    desc:'Free streaming of francophone films, series and documentaries, subtitled in five languages.',
    note:'Phase 5 input: content you would watch anyway, in French.', use:'Phase 5' },
  { id:'lawless', name:'Lawless French', cat:'grammar', level:'All', badge:'Free',
    url:'https://www.lawlessfrench.com/',
    desc:'Thousands of free lesson pages, conjugation tables, quizzes and the Subjunctivisor.',
    note:'Use www.lawlessfrench.com. The separate progress.lawlessfrench.com caps free users at 10 kwizzes per month.', use:'On-demand lookup' },
  { id:'point', name:'Le Point du FLE', cat:'grammar', level:'All', badge:'Free',
    url:'https://www.lepointdufle.net/p/learnfrench.htm',
    desc:'A directory of 8,000+ links to free courses and exercises, organised by topic and level.',
    note:'Use when you need drills on one specific point, not as a course.', use:'Targeted drills' },
  { id:'ffacile', name:'Français Facile', cat:'grammar', level:'A1-B2', badge:'Free',
    url:'https://www.francaisfacile.com/',
    desc:'Enormous bank of graded grammar exercises with answer keys.',
    note:'The interface is dated; the exercise quality is not.', use:'Targeted drills' },
  { id:'bonjour', name:'Bonjour de France', cat:'grammar', level:'A1-C1', badge:'Free',
    url:'https://www.bonjourdefrance.com/',
    desc:'Graded lessons and self-correcting exercises from a French language school.',
    note:'Good for reading comprehension at A2 and B1.', use:'Supplementary' },
  { id:'hellotalk', name:'HelloTalk', cat:'speaking', level:'All', badge:'Free tier',
    url:'https://www.hellotalk.com/',
    desc:'Language exchange with native speakers: text, voice notes and calls, with inline corrections.',
    note:'The free tier is genuinely usable. Start with text and voice notes in week 6, calls later.', use:'From week 6' },
  { id:'tandem', name:'Tandem', cat:'speaking', level:'All', badge:'Free tier',
    url:'https://tandem.net/',
    desc:'The other big exchange app. A different pool of partners - worth having both.',
    note:'If one app has no responsive partners at your hours, the other usually does.', use:'From week 6' },
  { id:'discord', name:'Discord - Learn French', cat:'speaking', level:'All', badge:'Free',
    url:'https://discord.com/invite/french',
    desc:'A large community with free voice channels for group practice.',
    note:'Group voice is lower-pressure than one-on-one and easier to drop into for 20 minutes.', use:'Phase 4 weekly' },
  { id:'reactor', name:'Language Reactor', cat:'tools', level:'A2+', badge:'Free tier',
    url:'https://www.languagereactor.com/',
    desc:'Chrome extension: dual subtitles, click-any-word dictionary, and export to Anki with screenshots and audio.',
    note:'The free tier is enough for this plan. Pro is optional and never required.', use:'Card mining' },
  { id:'tcf', name:'TV5MONDE TCF simulator', cat:'testing', level:'A1-C2', badge:'Free',
    url:'https://apprendre.tv5monde.com/fr/tcf',
    desc:'17 practice series plus a full 90-minute mock exam under real exam conditions. Retake as often as you like.',
    note:'Gives a calibrated CEFR estimate without paying for a test.', use:'Month 12 checkpoint' },
  { id:'leveltest', name:'TV5MONDE level test', cat:'testing', level:'A1-B2', badge:'Free',
    url:'https://apprendre.tv5monde.com/en',
    desc:'14 audio questions that place your listening comprehension on the CEFR scale.',
    note:'Take it in week 4 and again every three months.', use:'Placement' },
  { id:'delf', name:'DELF official sample papers', cat:'testing', level:'A1-B2', badge:'Free',
    url:'https://www.france-education-international.fr/delf-tout-public',
    desc:'Official PDFs with MP3 audio, answer keys, transcripts and the actual examiner grading rubrics.',
    note:'Grade your own writing and speaking against the published descriptors - surprisingly accurate.', use:'Every checkpoint' }
];
var CATS = [
  {id:'all',label:'Everything',color:'#8FA0C8'},{id:'structure',label:'Core course',color:'#3D7BFF'},
  {id:'vocab',label:'Vocabulary',color:'#12C2D6'},{id:'listening',label:'Listening',color:'#3FD07A'},
  {id:'grammar',label:'Grammar',color:'#FFB020'},{id:'speaking',label:'Speaking',color:'#FF4FA3'},
  {id:'tools',label:'Tools',color:'#A78BFA'},{id:'testing',label:'Testing',color:'#FF6B4A'}
];
var SEED_CARDS = [
  ['je voudrais','I would like','Essentials','polite'],
  ["s'il vous plaît",'please (formal)','Essentials','polite'],
  ['est-ce que je peux','can I','Essentials','questions'],
  ['où est la gare ?','where is the station?','Essentials','directions'],
  ['je ne comprends pas',"I don't understand",'Survival','rescue'],
  ['pouvez-vous répéter ?','can you repeat?','Survival','rescue'],
  ['plus lentement','more slowly','Survival','rescue'],
  ['comment dit-on ... en français ?','how do you say ... in French?','Survival','rescue'],
  ['ça marche','that works / sounds good','Conversation','informal'],
  ['du coup','so / as a result','Conversation','filler'],
  ['en fait','actually / in fact','Conversation','filler'],
  ["j'ai hâte de",'I cannot wait to','Conversation','feelings'],
  ['ça dépend','it depends','Conversation','opinion'],
  ["je suis d'accord",'I agree','Conversation','opinion'],
  ['il faut que je','I have to (+ subjunctive)','Verbs','subjunctive'],
  ["j'ai été",'I was / I have been (passé composé of être)','Verbs','past'],
  ['je suis allé(e)','I went','Verbs','past'],
  ["j'allais",'I used to go / I was going (imparfait)','Verbs','past'],
  ['je vais partir','I am going to leave (futur proche)','Verbs','future'],
  ['je partirai','I will leave (futur simple)','Verbs','future'],
  ['il y a','there is / there are / ago','Structures','high-frequency'],
  ['il faut','it is necessary / you must','Structures','high-frequency'],
  ["c'est-à-dire",'that is to say','Structures','connector'],
  ['par contre','on the other hand','Structures','connector'],
  ['quand même','anyway / all the same','Structures','nuance'],
  ['le lendemain','the following day','Time','narration'],
  ['la veille','the day before','Time','narration'],
  ['tout de suite','right away','Time','high-frequency'],
  ['avoir lieu','to take place','Time','events'],
  ['se rendre compte de','to realise','Expressions','reflexive']
];
var MILESTONES = [
  {id:'first',icon:'\u2726',name:'First hour',desc:'Complete one full session.',k:'sessions',need:1},
  {id:'week',icon:'\u2737',name:'Seven days',desc:'Hit a 7-day streak.',k:'bestStreak',need:7},
  {id:'month',icon:'\u25D4',name:'Thirty hours',desc:'Bank 30 focused hours.',k:'hours',need:30},
  {id:'cards100',icon:'\u29C9',name:'100 cards live',desc:'Have 100 cards in your collection.',k:'cardCount',need:100},
  {id:'speak',icon:'\u25C9',name:'First speaking',desc:'Log a session with speaking.',k:'speakSessions',need:1},
  {id:'a2',icon:'\u25B2',name:'A2 reached',desc:'Complete week 12 of the plan.',k:'weeksDone',need:12},
  {id:'rev500',icon:'\u27F3',name:'500 reviews',desc:'Grade 500 cards.',k:'reviews',need:500},
  {id:'streak30',icon:'\u2739',name:'Thirty-day streak',desc:'A full month without a miss.',k:'bestStreak',need:30},
  {id:'b1',icon:'\u2605',name:'B1 territory',desc:'Complete week 52 of the plan.',k:'weeksDone',need:52},
  {id:'century',icon:'\u25C6',name:'100 hours',desc:'Bank 100 focused hours.',k:'hours',need:100}
];
var RULES = [
  ['Never skip the cards','On a terrible day, do only the 10 minutes of reviews. Streak preservation beats intensity.','#3D7BFF'],
  ['Answer out loud, always','Language Transfer works by making you construct sentences. Passive listening wastes the method.','#12C2D6'],
  ['Passive listening is bonus','Commute, chores, walking. It multiplies progress but cannot replace the focused hour.','#3FD07A'],
  ['Do not collect resources','Pick the ones named in each phase and ignore the rest until the phase changes.','#FFB020'],
  ['Speak from week 6, badly','Waiting until you are ready is the number one reason people plateau at reading-only French.','#FF4FA3'],
  ['Keep an error log','Every partner correction goes into a note, then into a card. Recurring errors are your real curriculum.','#A78BFA'],
  ['Mind the free-tier traps','The Anki iOS app is paid (use AnkiWeb). progress.lawlessfrench.com caps at 10 kwizzes per month (use www). Coffee Break course packs are paid; the podcast is not.','#FF6B4A']
];
var CEFR = [
  {lvl:'A1',hours:100,label:'Survival basics',color:'#3D7BFF'},
  {lvl:'A2',hours:200,label:'Simple conversation',color:'#12C2D6'},
  {lvl:'B1',hours:400,label:'Independent user',color:'#3FD07A'},
  {lvl:'B2',hours:600,label:'Work and study level',color:'#FFB020'},
  {lvl:'C1',hours:800,label:'Advanced',color:'#FF4FA3'}
];
var PROMPTS = {
  p1:['Décris ta chambre à voix haute : cinq objets, cinq couleurs.','Présente-toi : nom, ville, travail, une chose que tu aimes.','Dis ce que tu fais aujourd\'hui, du matin au soir.','Épelle trois mots français à voix haute, lettre par lettre.','Décris ta famille en six phrases simples.'],
  p2:['Commande un café et l\'addition, à voix haute, sans notes.','Demande ton chemin jusqu\'à la gare. Puis jusqu\'à la pharmacie.','Réserve une chambre d\'hôtel : dates, prix, petit-déjeuner.','Raconte ta journée d\'hier au passé composé.','Explique ce que tu vas faire ce week-end (futur proche).'],
  p3:['Raconte l\'épisode d\'innerFrench d\'aujourd\'hui en 90 secondes.','Raconte un souvenir d\'enfance : imparfait pour le décor, passé composé pour les actions.','Explique pourquoi tu apprends le français, avec trois raisons.','Décris ta ville à quelqu\'un qui ne l\'a jamais vue.','Donne ton opinion sur les réseaux sociaux, puis nuance-la.'],
  p4:['Argumente pendant deux minutes : faut-il interdire les voitures en centre-ville ?','Résume l\'actualité du jour à partir du journal RFI.','Compare deux façons de travailler : bureau ou télétravail.','Raconte une histoire avec un début, un problème, une solution.','Réagis à une opinion avec laquelle tu n\'es pas d\'accord, poliment.'],
  p5:['Fais un exposé de trois minutes sur un sujet que tu maîtrises.','Défends une position, puis retourne-la et défends l\'inverse.','Analyse un article : thèse, arguments, failles.','Raconte un film sans spoilers, puis recommande-le ou non.','Simule un entretien d\'embauche en français.']
};
return { PHASES:PHASES, BLOCKS:BLOCKS, WEEKS:buildWeeks(), RESOURCES:RESOURCES, CATS:CATS,
         SEED_CARDS:SEED_CARDS, MILESTONES:MILESTONES, RULES:RULES, CEFR:CEFR, PROMPTS:PROMPTS };
})();