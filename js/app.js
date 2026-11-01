(() => {
'use strict';
const Core = window.Core;
const CONFIG = Core.CONFIG;
CONFIG.REFERRER = 'dorinvest13-spec.github.io';
CONFIG.TIMEOUT = 40000;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const SYSTEM = 'Ты — профессиональный копирайтер, знающий правила всех площадок. Отвечай ТОЛЬКО готовым текстом на русском языке, без комментариев и пояснений.';

/* ============ ПРАВИЛА ПЛОЩАДОК (ПРОМПТЫ) ============ */
const PLATFORM_RULES = {
  tg: {
    name:'Telegram', icon:'📨',
    short:'до 4096 симв., хук, списки с эмодзи, 2-4 хештега, CTA-реакция',
    prompt:`ПЛОЩАДКА: Telegram (пост канала).
ЛИМИТ: до 4096 символов, оптимально 600-1200.
СТРУКТУРА:
1) Первая строка — хук с эмодзи, без кликбейта.
2) 2-3 коротких абзаца по 1-3 строки.
3) Список преимуществ с эмодзи-маркерами.
4) Призыв: поставить реакцию или открыть ссылку.
5) В конце 2-4 хештега через пробел.
СТИЛЬ: разговорный, энергичный, без канцелярита.
ЗАПРЕЩЕНО: простыни текста, более 5 хештегов, таблицы, ссылки-заглушки.`
  },
  site: {
    name:'Сайт', icon:'🌐',
    short:'800-1500 симв., SEO-структура, без эмодзи, CTA-заявка',
    prompt:`ПЛОЩАДКА: сайт компании (SEO-описание товара или услуги).
ЛИМИТ: 800-1500 символов.
СТРУКТУРА:
1) Заголовок с ключевым запросом.
2) Вводный абзац: что это и для кого.
3) Подзаголовок «Преимущества» и список из 3-5 пунктов через дефис.
4) Абзац доверия: опыт, гарантии, цифры.
5) Финальный абзац с призывом оставить заявку или позвонить.
СТИЛЬ: деловой дружелюбный, конкретика и польза.
ЗАПРЕЩЕНО: эмодзи, хештеги, КАПС, внешние ссылки.`
  },
  insta: {
    name:'Instagram', icon:'📸',
    short:'до 2200 симв., хук-интрига, 5-7 хештегов, «ссылка в шапке»',
    prompt:`ПЛОЩАДКА: Instagram (подпись к посту).
ЛИМИТ: до 2200 символов, оптимально 700-1200.
СТРУКТУРА:
1) Первая строка — хук с оборванной интригой, чтобы хотелось читать дальше.
2) 3-5 абзацев по 1-2 строки с эмодзи.
3) Нумерованный список условий или шагов.
4) Призыв: комментарий, сохранение, репост в сторис.
5) Фраза «ссылка в шапке профиля» (ссылки в подписи не кликабельны!).
6) Ровно 5-7 хештегов в конце.
СТИЛЬ: эмоциональный, личный, много воздуха и переносов.
ЗАПРЕЩЕНО: кликабельные ссылки, более 8 хештегов, длинные абзацы.`
  },
  vk: {
    name:'ВКонтакте', icon:'💙',
    short:'до 2000 симв., тон сообщества, лайк/репост/опрос, 2-3 хештега',
    prompt:`ПЛОЩАДКА: ВКонтакте (пост сообщества).
ЛИМИТ: до 2000 символов, оптимально 800-1500.
СТРУКТУРА:
1) Заголовок-новость с 1-2 эмодзи.
2) Абзац-приветствие сообщества.
3) Список фактов с галочками.
4) Призывы: лайк, репост, комментарий — каждый с новой строки.
5) Анонс опроса или следующего поста.
6) 2-3 хештега в конце.
СТИЛЬ: тёплый комьюнити-тон, обращение «друзья».
ЗАПРЕЩЕНО: капс-заголовки, более 6 эмодзи-блоков, короткие внешние ссылки.`
  },
  dzen: {
    name:'Яндекс Дзен', icon:'📰',
    short:'1500-2500 симв., подзаголовки, БЕЗ ссылок/хештегов/эмодзи',
    prompt:`ПЛОЩАДКА: Яндекс Дзен (статья).
ЛИМИТ: 1500-2500 символов.
СТРУКТУРА:
1) Заголовок до 100 символов: интрига + польза, без КАПСА и кликбейта.
2) Лид-абзац: обещание пользы.
3) 3-4 раздела с подзаголовками, абзацы по 3-5 строк.
4) Разбор ошибок или мифов.
5) Вывод-резюме.
6) Мягкий призыв: лайк и подписка на канал.
СТИЛЬ: экспертный сторителлинг, факты и примеры, без прямой рекламы.
ЗАПРЕЩЕНО: внешние ссылки, хештеги, эмодзи, призывы «купи».`
  }
};

const Logger = {
  logs: [],
  log(level, msg, data) {
    this.logs.push({ts:new Date().toISOString(), level, msg});
    if (this.logs.length > 100) this.logs.shift();
    console[level==='error'?'error':'log'](`[${level}] ${msg}`, data||'');
  },
  info(m,d){this.log('info',m,d)}, success(m,d){this.log('success',m,d)},
  warning(m,d){this.log('warning',m,d)}, error(m,d){this.log('error',m,d)}
};

const Utils = {
  cache: new Map(), rateRequests: [],
  async cachedFetch(url, ttl=CONFIG.CACHE_TTL, timeout=CONFIG.TIMEOUT) {
    const c = this.cache.get(url);
    if (c && Date.now()-c.t<ttl) return c.data;
    if (!navigator.onLine) throw new Error('Нет интернета');
    const ctrl = new AbortController();
    const tid = setTimeout(()=>ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {signal:ctrl.signal});
      clearTimeout(tid);
      if (!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.text();
      if (!data.trim()) throw new Error('Пустой ответ');
      this.cache.set(url, {data, t:Date.now()});
      if (this.cache.size > CONFIG.CACHE_LIMIT) this.cache.delete(this.cache.keys().next().value);
      return data;
    } catch(e) {
      clearTimeout(tid);
      if (e.name==='AbortError') throw new Error('Таймаут');
      throw e;
    }
  },
  canMakeRequest() {
    const now = Date.now();
    this.rateRequests = this.rateRequests.filter(t=>now-t<CONFIG.RATE_LIMIT.WINDOW);
    return this.rateRequests.length < CONFIG.RATE_LIMIT.MAX;
  },
  recordRequest(){this.rateRequests.push(Date.now())},
  sanitize: t => Core.sanitizeInput(t),
  async copy(text) {
    try {await navigator.clipboard.writeText(text); return true}
    catch {
      const t = document.createElement('textarea'); t.value = text;
      document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
      return true;
    }
  },
  download(content, name, type) {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  },
  compressImage(file, max=1200, q=.85) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          let {width:w, height:h} = img;
          if (w>h && w>max) {h=h*max/w; w=max} else if (h>=w && h>max) {w=w*max/h; h=max}
          c.width=w; c.height=h;
          c.getContext('2d').drawImage(img,0,0,w,h);
          res(c.toDataURL('image/jpeg',q));
        };
        img.onerror = rej; img.src = e.target.result;
      };
      r.onerror = rej; r.readAsDataURL(file);
    });
  }
};

/* ============ ИИ-КЛИЕНТ: 4 ЭНДПОИНТА ПО ОЧЕРЕДИ ============ */
const AIClient = {
  lastOk: null,
  model() { return Generator.state.textModel || 'openai'; },
  async chat(userPrompt, systemPrompt, seed=0) {
    const sys = systemPrompt || SYSTEM;
    const messages = [{role:'system',content:sys},{role:'user',content:userPrompt}];
    const attempts = [];
    try {
      return await this.post('https://text.pollinations.ai/openai', {model:this.model(), messages, seed:Date.now()+seed, referrer:CONFIG.REFERRER}, 'POST /openai');
    } catch(e){ attempts.push('POST /openai → '+e.message); }
    try {
      return await this.post('https://text.pollinations.ai/', {messages, model:this.model(), seed:Date.now()+seed, referrer:CONFIG.REFERRER}, 'POST /');
    } catch(e){ attempts.push('POST / → '+e.message); }
    try {
      return await this.get(`https://text.pollinations.ai/${encodeURIComponent(userPrompt)}?model=${this.model()}&seed=${Date.now()+seed}&referrer=${CONFIG.REFERRER}`, 'GET+model');
    } catch(e){ attempts.push('GET+model → '+e.message); }
    try {
      return await this.get(`https://text.pollinations.ai/${encodeURIComponent(userPrompt)}?seed=${Date.now()+seed}`, 'GET plain');
    } catch(e){ attempts.push('GET plain → '+e.message); }
    const err = new Error('Все 4 эндпоинта молчат: ' + attempts.join(' | '));
    err.attempts = attempts;
    throw err;
  },
  async post(url, body, label) {
    const ctrl = new AbortController();
    const tid = setTimeout(()=>ctrl.abort(), CONFIG.TIMEOUT);
    try {
      const res = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:ctrl.signal});
      if (!res.ok) throw new Error('HTTP '+res.status);
      const raw = await res.text();
      let text = raw;
      try {
        const json = JSON.parse(raw);
        if (json && json.choices && json.choices[0]) text = (json.choices[0].message && json.choices[0].message.content) || json.choices[0].text || '';
      } catch(_) {}
      if (!text || !text.trim()) throw new Error('Пустой ответ');
      this.lastOk = label;
      Logger.success('ИИ ответил через '+label);
      return text.trim();
    } finally { clearTimeout(tid); }
  },
  async get(url, label) {
    const data = await Utils.cachedFetch(url);
    this.lastOk = label;
    Logger.success('ИИ ответил через '+label);
    return data.trim();
  }
};

const Toast = {
  timeout: null,
  show(msg, type='success', dur=3500) {
    const t = $('#toast');
    t.textContent = msg; t.className = `toast show ${type}`;
    clearTimeout(this.timeout);
    this.timeout = setTimeout(()=>t.classList.remove('show'), dur);
  }
};

const Modal = {
  cb: null, lastFocus: null,
  show(title, text, cb, label='Удалить') {
    this.lastFocus = document.activeElement;
    $('#modalTitle').textContent = title;
    $('#modalText').textContent = text;
    $('#modalConfirm').textContent = label;
    this.cb = cb;
    $('#modalOverlay').classList.add('active');
    $('#modalCancel').focus();
  },
  hide() {
    $('#modalOverlay').classList.remove('active');
    this.cb = null;
    if (this.lastFocus) this.lastFocus.focus();
  },
  init() {
    $('#modalCancel').onclick = ()=>this.hide();
    $('#modalOverlay').onclick = e=>{if(e.target===e.currentTarget)this.hide()};
    $('#modalConfirm').onclick = ()=>{if(this.cb)this.cb();this.hide()};
    document.addEventListener('keydown', e=>{
      if(e.key==='Escape' && $('#modalOverlay').classList.contains('active'))this.hide();
    });
  }
};

const Theme = {
  init() {
    this.set(localStorage.getItem(CONFIG.THEME_KEY)||'dark', false);
    $('#themeToggle').onclick = ()=>this.toggle();
  },
  set(theme, notify=true) {
    document.documentElement.setAttribute('data-theme', theme);
    try{localStorage.setItem(CONFIG.THEME_KEY, theme)}catch{}
    $('#themeToggle').textContent = theme==='dark'?'🌙':'☀️';
    if (notify) Toast.show(`Тема: ${theme==='dark'?'тёмная 🌙':'светлая ☀️'}`, 'info');
  },
  toggle() { this.set(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'); }
};

const Online = {
  init() {
    this.update();
    addEventListener('online', ()=>{this.update();Toast.show('Соединение восстановлено ✅','info')});
    addEventListener('offline', ()=>{this.update();Toast.show('Нет интернета','error')});
  },
  update() {
    $('#statusLed').classList.toggle('offline', !navigator.onLine);
    $('#statusText').textContent = navigator.onLine ? 'PRO активен' : 'Офлайн';
  }
};

const Tracker = {
  data: null,
  init() {
    const def = {firstUse:Date.now(), lastUse:Date.now(), generations:0, totalWords:0, campaigns:0, images:0};
    try { this.data = {...def, ...JSON.parse(localStorage.getItem(CONFIG.ANALYTICS_KEY)||'{}')}; }
    catch { this.data = def; }
    this.save();
  },
  save(){try{localStorage.setItem(CONFIG.ANALYTICS_KEY,JSON.stringify(this.data))}catch{}},
  trackGen(w){this.data.generations++;this.data.totalWords+=w||0;this.data.lastUse=Date.now();this.save()},
  trackCampaign(){this.data.campaigns++;this.save()},
  trackImage(){this.data.images++;this.save()},
  render() {
    $('#statGen').textContent = this.data.generations;
    $('#statWords').textContent = this.data.totalWords.toLocaleString('ru-RU');
    $('#statCampaigns').textContent = this.data.campaigns;
    $('#statImages').textContent = this.data.images;
  }
};

const Settings = {
  data: {tone:'friendly', len:'medium'},
  init() {
    try { this.data = Core.validateSettings(JSON.parse(localStorage.getItem(CONFIG.SETTINGS_KEY)||'{}')); } catch {}
    this.apply();
  },
  save(){try{localStorage.setItem(CONFIG.SETTINGS_KEY,JSON.stringify(this.data))}catch{}},
  apply() {
    $$('#toneBtns .opt-btn').forEach(b=>b.classList.toggle('active',b.dataset.tone===this.data.tone));
    $$('#lenBtns .opt-btn').forEach(b=>b.classList.toggle('active',b.dataset.len===this.data.len));
  },
  set(k,v){this.data[k]=v;this.save()}
};

const Templates = {
  items: [],
  init() {
    try { this.items = JSON.parse(localStorage.getItem(CONFIG.TEMPLATES_KEY)||'[]').filter(i=>typeof i==='string').slice(0,CONFIG.TEMPLATES_LIMIT); } catch {}
    this.render();
  },
  save(){try{localStorage.setItem(CONFIG.TEMPLATES_KEY,JSON.stringify(this.items))}catch{}},
  add(topic) {
    if (!topic.trim()) return;
    if (this.items.includes(topic)) {Toast.show('Уже существует','warning');return}
    if (this.items.length >= CONFIG.TEMPLATES_LIMIT) {Toast.show('Максимум 10','warning');return}
    this.items.unshift(topic); this.save(); this.render();
    Toast.show('Шаблон сохранён ★');
  },
  remove(i){this.items.splice(i,1);this.save();this.render()},
  use(topic) {
    $('#topic').value = topic;
    $('#topic').dispatchEvent(new Event('input'));
    Navigation.switch('gen');
    Toast.show('Шаблон применён ✨');
  },
  render() {
    const list = $('#templatesList');
    if (!this.items.length) {list.innerHTML='<div class="templates-empty">Пусто</div>';return}
    list.innerHTML = this.items.map((t,i)=>`
      <div class="template-item">
        <span class="template-text">${Core.escapeHtml(t)}</span>
        <button class="template-use" data-use="${i}">▶</button>
        <button class="template-del" data-del="${i}">✕</button>
      </div>`).join('');
    if (!list.dataset.bound) {
      list.addEventListener('click', e=>{
        const u = e.target.closest('[data-use]'), d = e.target.closest('[data-del]');
        if (u) this.use(this.items[+u.dataset.use]);
        if (d) this.remove(+d.dataset.del);
      });
      list.dataset.bound = '1';
    }
  }
};

const Brand = {
  words: [],
  init() {
    try { this.words = JSON.parse(localStorage.getItem(CONFIG.BRAND_KEY)||'[]').filter(w=>typeof w==='string').slice(0,20); } catch {}
    this.render();
    $('#brandAddBtn').onclick = ()=>this.add();
    $('#brandInput').addEventListener('keydown', e=>{if(e.key==='Enter'){e.preventDefault();this.add()}});
  },
  save(){try{localStorage.setItem(CONFIG.BRAND_KEY,JSON.stringify(this.words))}catch{}},
  add() {
    const w = $('#brandInput').value.trim().toLowerCase();
    if (!w) return;
    if (this.words.includes(w)) {Toast.show('Уже в словаре','warning');return}
    if (this.words.length>=20) {Toast.show('Максимум 20','warning');return}
    this.words.push(w); this.save(); this.render();
    $('#brandInput').value = '';
    Toast.show(`«${w}» добавлено 🚫`);
  },
  remove(w){this.words=this.words.filter(x=>x!==w);this.save();this.render()},
  render() {
    const c = $('#brandWords');
    if (!this.words.length) {c.innerHTML='<span class="brand-empty">Пусто</span>';return}
    c.innerHTML = this.words.map(w=>`<span class="brand-word">${Core.escapeHtml(w)}<button class="brand-word-del" data-word="${Core.escapeHtml(w)}">✕</button></span>`).join('');
    if (!c.dataset.bound) {
      c.addEventListener('click', e=>{
        const d = e.target.closest('[data-word]');
        if (d) this.remove(d.dataset.word);
      });
      c.dataset.bound = '1';
    }
  },
  enhancePrompt(p){return this.words.length?p+`\nВАЖНО: Не используй слова: ${this.words.join(', ')}.`:p},
  filterText(t){
    let r = t;
    this.words.forEach(w=>{r=r.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),m=>'•'.repeat(m.length))});
    return r;
  }
};

const History = {
  items: [],
  init() {
    this.load(); this.render();
    $('#exportHistoryBtn').onclick = ()=>this.export();
  },
  load() {
    try { this.items = Core.validateHistory(JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY)||'[]')); }
    catch { this.items = []; }
  },
  save() {
    try { localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(this.items.slice(0,CONFIG.HISTORY_LIMIT))); }
    catch { Toast.show('Хранилище переполнено','warning'); }
  },
  add(item) {
    this.items.unshift({...item, id:Date.now(), timestamp:new Date().toISOString()});
    this.save(); this.render();
  },
  getById(id){return this.items.find(i=>i.id===id)},
  delete(id) {
    Modal.show('Удалить запись?','Запись будет удалена безвозвратно.',()=>{
      this.items = this.items.filter(h=>h.id!==id);
      this.save(); this.render();
      Toast.show('Удалено');
    });
  },
  export() {
    if (!this.items.length) {Toast.show('История пуста','warning');return}
    Utils.download(JSON.stringify(this.items,null,2), `history-${Date.now()}.json`, 'application/json');
    Toast.show('Экспортировано 📥');
  },
  render() {
    const list = $('#historyList');
    if (!this.items.length) {list.innerHTML='<div class="history-empty">История пуста ✨</div>';return}
    list.innerHTML = this.items.map(i=>`
      <div class="history-item" data-id="${i.id}">
        <div class="h-head"><span class="h-format">${i.formatLabel||'Текст'}</span><span class="h-date">${Core.formatDate(i.timestamp)}</span></div>
        <div class="h-preview">${Core.escapeHtml(i.topic||'')}</div>
        <button class="h-del" data-del="${i.id}">✕</button>
      </div>`).join('');
    if (!list.dataset.bound) {
      list.addEventListener('click', e=>{
        const del = e.target.closest('[data-del]');
        if (del) {this.delete(+del.dataset.del);return}
        const item = e.target.closest('.history-item');
        if (item) this.restore(+item.dataset.id);
      });
      list.dataset.bound = '1';
    }
  },
  restore(id) {
    const item = this.getById(id);
    if (item) {Generator.restoreFromHistory(item); Toast.show('Восстановлено 📜')}
  }
};

const Navigation = {
  views:{}, init:{top:false,infra:false,data:false},
  init() {
    this.views = {gen:$('#view-gen'), top:$('#view-top'), infra:$('#view-infra'), data:$('#view-data')};
    $$('.tab-btn').forEach(t=>t.onclick=()=>this.switch(t.dataset.tab));
  },
  switch(id) {
    if (id==='top'&&!this.init.top){TopProducts.init();this.init.top=true}
    if (id==='infra'&&!this.init.infra){Infographic.init();this.init.infra=true}
    if (id==='data'&&!this.init.data){DataCenter.init();this.init.data=true;Tracker.render()}
    const cur = Object.values(this.views).find(v=>!v.hidden);
    const target = this.views[id];
    if (cur && cur!==target) {
      cur.hidden = true;
      target.hidden = false;
      target.style.animation = 'viewEnter .4s var(--ease) backwards';
      setTimeout(()=>target.style.animation='', 400);
    }
    $$('.tab-btn').forEach(t=>{
      const a = t.dataset.tab===id;
      t.classList.toggle('active',a);
      t.setAttribute('aria-selected',a);
    });
    scrollTo({top:0, behavior:REDUCED?'auto':'smooth'});
  }
};

const CanvasBG = {
  cv:null, ctx:null, nodes:[], raf:null,
  init() {
    this.cv=$('#net'); this.ctx=this.cv.getContext('2d');
    this.resize();
    addEventListener('resize',()=>this.resize());
    document.addEventListener('visibilitychange',()=>{document.hidden?this.stop():(!REDUCED&&this.start())});
    if (!REDUCED) this.start();
  },
  resize() {
    const dpr=Math.min(devicePixelRatio||1,2), W=innerWidth, H=innerHeight;
    this.cv.width=W*dpr; this.cv.height=H*dpr;
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    const n=Math.min(55,Math.round(W*H/16000));
    this.nodes=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:.8+Math.random()*1.5,c:Math.random()<.55?'43,255,168':'139,92,255'}));
  },
  start(){if(this.raf)return;const d=()=>{this.draw();this.raf=requestAnimationFrame(d)};d()},
  stop(){if(this.raf){cancelAnimationFrame(this.raf);this.raf=null}},
  draw() {
    const W=innerWidth,H=innerHeight;
    this.ctx.clearRect(0,0,W,H);
    for(let i=0;i<this.nodes.length;i++){
      const a=this.nodes[i];
      for(let j=i+1;j<this.nodes.length;j++){
        const b=this.nodes[j],d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<115){this.ctx.strokeStyle=`rgba(${a.c},${(1-d/115)*.16})`;this.ctx.beginPath();this.ctx.moveTo(a.x,a.y);this.ctx.lineTo(b.x,b.y);this.ctx.stroke()}
      }
      this.ctx.fillStyle=`rgba(${a.c},.55)`;
      this.ctx.beginPath();this.ctx.arc(a.x,a.y,a.r,0,7);this.ctx.fill();
      a.x+=a.vx;a.y+=a.vy;
      if(a.x<-20)a.x=W+20;if(a.x>W+20)a.x=-20;
      if(a.y<-20)a.y=H+20;if(a.y>H+20)a.y=-20;
    }
  }
};

const FORMAT_META = {
  tg:{label:'Пост в Telegram',file:'generated_tg.txt'},
  site:{label:'Описание для сайта',file:'generated_site.txt'},
  insta:{label:'Реклама в Instagram',file:'generated_insta.txt'},
  vk:{label:'Пост для ВК',file:'generated_vk.txt'},
  dzen:{label:'Статья для Яндекс Дзен',file:'generated_dzen.txt'}
};
const TONE_LABELS = {friendly:'дружеский',formal:'формальный',expert:'экспертный',bold:'дерзкий'};
const LEN_LABELS = {short:'короткий',medium:'средний',long:'развёрнутый'};
const GEN_PHRASES = ['Читаю правила площадки…','Подбираю хук…','Строю структуру…','Полирую текст…'];

const Generator = {
  els:{}, state:{fullText:'',format:'tg',tone:'friendly',len:'medium',phTimer:null,previous:null,variants:[],curVar:0,textModel:'openai'},
  init() {
    try{this.state.textModel = localStorage.getItem('ai-marketer-model-text')||'openai'}catch{}
    this.els = {
      ta:$('#topic'), select:$('#format'), btn:$('#btnGenerate'), btnAB:$('#btnAB'),
      ctaLabel:$('#ctaLabel'), ctaSpark:$('#ctaSpark'), miniSpin:$('#miniSpin'),
      empty:$('#emptyState'), loader:$('#loader'), output:$('#output'),
      copyBtn:$('#copyBtn'), dlBtn:$('#dlBtn'), undoBtn:$('#undoBtn'), saveTplBtn:$('#saveTemplateBtn'),
      meta:$('#meta'), stats:$('#statsRow'), counter:$('#counter'),
      resultCard:$('#resultCard'), think:$('#thinkText'), fname:$('#fname'),
      tabs:$('#resultTabs'), preview:$('#previewBox'), analyze:$('#analyzeBox'),
      rText:$('#rtab-text'), rPrev:$('#rtab-preview'), rAnalyze:$('#rtab-analyze'),
      varTabs:$('#variantTabs'), campGrid:$('#campaignGrid'), btnCamp:$('#btnCampaign'), campLabel:$('#campLabel')
    };
    this.bind();
    this.renderFormatHint();
    this.renderModelPicker();
  },
  bind() {
    const {els} = this;
    els.ta.oninput = ()=>{els.counter.textContent=els.ta.value.length+' / 1500';els.ta.classList.remove('error')};
    els.select.onchange = ()=>this.renderFormatHint();
    $$('#view-gen .chip[data-fill]').forEach(c=>c.onclick=()=>{els.ta.value=c.dataset.fill;els.ta.dispatchEvent(new Event('input'));els.ta.focus()});
    $('#toneBtns').onclick = e=>{const b=e.target.closest('.opt-btn');if(!b)return;$$('#toneBtns .opt-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');this.state.tone=b.dataset.tone;Settings.set('tone',b.dataset.tone)};
    $('#lenBtns').onclick = e=>{const b=e.target.closest('.opt-btn');if(!b)return;$$('#lenBtns .opt-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');this.state.len=b.dataset.len;Settings.set('len',b.dataset.len)};
    els.tabs.onclick = e=>{const b=e.target.closest('.rtab');if(!b)return;els.tabs.querySelectorAll('.rtab').forEach(x=>x.classList.remove('active'));b.classList.add('active');this.showTab(b.dataset.rtab)};
    els.varTabs.onclick = e=>{const b=e.target.closest('.variant-tab');if(!b)return;els.varTabs.querySelectorAll('.variant-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');this.switchVariant(+b.dataset.variant)};
    els.btn.onclick = ()=>this.handleGen();
    els.btnAB.onclick = ()=>this.handleAB();
    els.btnCamp.onclick = ()=>this.handleCampaign();
    els.undoBtn.onclick = ()=>this.undo();
    els.saveTplBtn.onclick = ()=>Templates.add(els.ta.value.trim());
    els.copyBtn.onclick = async()=>{
      if(!this.state.fullText)return;
      await Utils.copy(this.state.fullText);
      els.copyBtn.classList.add('done');els.copyBtn.textContent='✓ Скопировано';
      Toast.show('Скопировано 📋');
      setTimeout(()=>{els.copyBtn.textContent='📋 Копировать';els.copyBtn.classList.remove('done')},1600);
    };
    els.dlBtn.onclick = ()=>{
      if(!this.state.fullText)return;
      Utils.download(this.state.fullText, els.fname.textContent||'text.txt','text/plain;charset=utf-8');
      Toast.show('Скачано 💾');
    };
  },
  renderFormatHint() {
    const wrap = this.els.select.closest('.sel-wrap');
    let hint = $('#formatHint');
    if (!hint) { hint = document.createElement('div'); hint.id='formatHint'; hint.className='hint-box'; wrap.after(hint); }
    const r = PLATFORM_RULES[this.els.select.value] || PLATFORM_RULES.tg;
    hint.innerHTML = `<span class="hint-ico">${r.icon}</span><span class="hint-text"><b>${r.name}:</b> ${r.short}</span>`;
  },
  renderModelPicker() {
    const host = this.els.select.closest('.card-inner');
    let row = $('#modelRow');
    if (!row) {
      row = document.createElement('div');
      row.id = 'modelRow'; row.className = 'setting-group';
      row.innerHTML = '<label class="lbl">🤖 Модель ИИ для текста</label><div class="opt-btns" id="modelBtns"></div>';
      host.insertBefore(row, host.querySelector('.brand-dict'));
    }
    const btns = $('#modelBtns');
    btns.innerHTML = ['openai','mistral','llama'].map(m=>`<button class="opt-btn ${m===this.state.textModel?'active':''}" data-model="${m}">${m}</button>`).join('');
    btns.onclick = e=>{
      const b = e.target.closest('.opt-btn'); if(!b)return;
      this.state.textModel = b.dataset.model;
      try{localStorage.setItem('ai-marketer-model-text',this.state.textModel)}catch{}
      this.renderModelPicker();
      Toast.show('Модель текста: '+this.state.textModel,'info');
    };
  },
  handleGen(){
    const t=this.els.ta.value.trim();
    if(!t){this.err(this.els.ta,'Введите тему');return}
    if(!navigator.onLine){Toast.show('Нет интернета','error');return}
    this.generate(Utils.sanitize(t),this.els.select.value);
  },
  handleAB(){
    const t=this.els.ta.value.trim();
    if(!t){this.err(this.els.ta,'Введите тему');return}
    if(!navigator.onLine){Toast.show('Нет интернета','error');return}
    this.generateAB(Utils.sanitize(t),this.els.select.value);
  },
  handleCampaign(){
    const t=this.els.ta.value.trim();
    if(!t){this.err(this.els.ta,'Введите тему');return}
    if(!navigator.onLine){Toast.show('Нет интернета','error');return}
    this.runCampaign(Utils.sanitize(t));
  },
  err(el,msg){el.classList.remove('error');void el.offsetWidth;el.classList.add('error');el.focus();Toast.show(msg,'error')},
  showTab(t){this.els.rText.hidden=t!=='text';this.els.rPrev.hidden=t!=='preview';this.els.rAnalyze.hidden=t!=='analyze'},
  switchVariant(i){
    const s=this.state;
    if(!s.variants[i])return;
    s.curVar=i;s.fullText=s.variants[i];
    this.els.output.textContent=s.fullText;
    this.renderPreview(s.format,s.fullText);
    this.renderAnalyze(s.fullText);
    this.updateMeta(s.format,s.fullText,false);
  },
  buildPrompt(topic,format,tone,len){
    const r = PLATFORM_RULES[format] || PLATFORM_RULES.tg;
    return `${r.prompt}\nТЕМА: «${topic}».\nТОН: ${TONE_LABELS[tone]}.\nОБЪЁМ: ${LEN_LABELS[len]}.\nВерни только готовый текст.`;
  },
  async genAPI(topic,format,tone,len,seed=0){
    if(!Utils.canMakeRequest())throw new Error('Слишком много запросов, подождите минуту');
    const prompt = Brand.enhancePrompt(this.buildPrompt(topic,format,tone,len));
    Utils.recordRequest();
    const text = await AIClient.chat(prompt);
    return Brand.filterText(text);
  },
  setLoading(on){
    const {els}=this;
    els.btn.disabled=on;els.btnAB.disabled=on;els.btnCamp.disabled=on;
    els.ctaLabel.textContent=on?'Нейросеть думает…':'Сгенерировать';
    els.ctaSpark.hidden=on;els.miniSpin.hidden=!on;
    els.loader.hidden=!on;
    els.resultCard.classList.toggle('thinking',on);
  },
  startPhrases(){
    const {els,state}=this;
    if(state.phTimer)clearInterval(state.phTimer);
    let pi=0;els.think.textContent=GEN_PHRASES[0];
    state.phTimer=setInterval(()=>{pi=(pi+1)%GEN_PHRASES.length;els.think.textContent=GEN_PHRASES[pi]},1100);
  },
  stopPhrases(){if(this.state.phTimer){clearInterval(this.state.phTimer);this.state.phTimer=null}},
  savePrevious(){
    const s=this.state;
    if(s.fullText){s.previous={text:s.fullText,format:s.format};this.els.undoBtn.hidden=false}
  },
  prepareUI(format){
    const {els}=this;
    els.empty.hidden=true;els.tabs.hidden=false;els.output.hidden=false;
    this.showTab('text');
    this.hideError();
    els.fname.textContent=FORMAT_META[format]?.file||'post.txt';
    els.resultCard.scrollIntoView({behavior:REDUCED?'auto':'smooth',block:'nearest'});
  },
  ensureErrorBox(){
    let box=$('#genError');
    if(!box){box=document.createElement('div');box.id='genError';box.className='error-box';box.style.marginTop='12px';this.els.stats.after(box);}
    return box;
  },
  hideError(){const b=$('#genError');if(b)b.hidden=true},
  showError(err){
    const box=this.ensureErrorBox();
    box.hidden=false;
    box.innerHTML=`<b>⚠ Нейросеть не ответила (шаблон НЕ использовался)</b><br>${Core.escapeHtml((err&&err.message)||'Неизвестная ошибка')}
      <div class="err-actions">
        <button class="err-btn primary" id="errRetry">🔄 Повторить</button>
        <button class="err-btn" id="errTpl">📄 Включить шаблон вручную</button>
      </div>`;
    $('#errRetry').onclick=()=>{box.hidden=true;this.handleGen()};
    $('#errTpl').onclick=()=>{
      box.hidden=true;
      const topic=this.els.ta.value.trim(), format=this.els.select.value;
      this.savePrevious();
      this.state.fullText=this.fallback(format,topic);
      this.state.format=format;
      this.typeText(this.els.output,this.state.fullText,()=>this.finalize(format,topic,true));
    };
    Toast.show('Ошибка API — подробности в карточке','error',5000);
  },
  async generate(topic,format){
    const {els,state}=this;
    this.setLoading(true);this.startPhrases();
    els.varTabs.hidden=true;this.prepareUI(format);
    let text=null, err=null;
    try{ text=await this.genAPI(topic,format,state.tone,state.len); this.savePrevious(); }
    catch(e){ err=e; Logger.error('Генерация не удалась', e.message); }
    this.stopPhrases();this.setLoading(false);
    if(!text){ this.showError(err); return; }
    state.fullText=text;state.variants=[];state.format=format;
    this.typeText(els.output,state.fullText,()=>this.finalize(format,topic,false));
  },
  async generateAB(topic,format){
    const {els,state}=this;
    this.setLoading(true);this.startPhrases();
    els.varTabs.hidden=true;this.prepareUI(format);
    const results=[];
    for(let i=0;i<2;i++){
      try{results.push(await this.genAPI(topic,format,state.tone,state.len,i*1000))}
      catch(e){Logger.warning('Вариант '+(i+1)+' не удался', e.message)}
    }
    this.stopPhrases();this.setLoading(false);
    if(!results.length){ this.showError(new Error('Оба варианта не удались, см. причины ниже')); return; }
    this.savePrevious();
    state.format=format;
    if(results.length===2){
      state.variants=results;state.curVar=0;state.fullText=results[0];
      els.varTabs.hidden=false;
      els.varTabs.querySelectorAll('.variant-tab').forEach((b,i)=>b.classList.toggle('active',i===0));
      this.typeText(els.output,state.fullText,()=>{this.finalize(format,topic,false);Toast.show('Готово 2 варианта ⚡')});
    } else {
      state.variants=[];state.fullText=results[0];
      this.typeText(els.output,state.fullText,()=>{this.finalize(format,topic,false);Toast.show('Удался 1 вариант из 2','warning')});
    }
  },
  finalize(format,topic,offline){
    const {els,state}=this;
    this.renderPreview(format,state.fullText);
    this.renderAnalyze(state.fullText);
    this.updateMeta(format,state.fullText,offline);
    els.copyBtn.disabled=false;els.dlBtn.disabled=false;els.saveTplBtn.hidden=false;
    const stats=Core.analyzeText(state.fullText);
    Tracker.trackGen(stats.words);
    History.add({topic,format,formatLabel:FORMAT_META[format]?.label||'Текст',text:state.fullText,tone:state.tone,len:state.len,model:offline?'offline':state.textModel});
    if(window.Notifications && Notifications.permission==='granted'){
      Notifications.notifyGeneration(FORMAT_META[format]?.label||'Текст',stats.words);
    }
    els.resultCard.classList.add('success-flash');
    setTimeout(()=>els.resultCard.classList.remove('success-flash'),600);
    Toast.show(offline?'Включён офлайн-шаблон 📄':'Текст готов ✨ Модель: '+state.textModel, offline?'warning':'success');
  },
  undo(){
    const s=this.state;
    if(!s.previous)return;
    const cur={text:s.fullText,format:s.format};
    s.fullText=s.previous.text;s.format=s.previous.format;s.previous=cur;
    this.els.output.textContent=s.fullText;
    this.renderPreview(s.format,s.fullText);
    this.renderAnalyze(s.fullText);
    this.updateMeta(s.format,s.fullText,false);
    Toast.show('Восстановлено ↩');
  },
  fallback(format,topic){
    const up=topic.charAt(0).toUpperCase()+topic.slice(1);
    const lo=topic.charAt(0).toLowerCase()+topic.slice(1);
    const tag=topic.toLowerCase().replace(/[^a-zа-яё0-9]+/gi,'_').replace(/^_+|_+$/g,'').slice(0,24)||'новости';
    const base={
      tg:`⚡ ${up} — то, о чём говорят все!\n\nКоротко о главном:\n• старт уже совсем скоро\n• первым участникам — особые условия 🎁\n• формат, о котором захочется рассказать друзьям\n\n👇 Ставьте , если ждёте запуска!\n\n#${tag} #новости`,
      site:`${up}\n\nМы создали решение, которое экономит время и даёт предсказуемый результат. Прозрачные условия и внимание к деталям — то, за что нас выбирают.\n\nПреимущества:\n- экспертная команда;\n- гибкие форматы под задачу;\n- поддержка на каждом этапе.\n\nОставьте заявку — предложим оптимальный вариант.`,
      insta:`А вы уже слышали про «${lo}»? 👀\n\nМы запускаем кое-что особенное — и первыми об этом узнают подписчики.\n\n1️⃣ Подписка\n2️⃣ ❤️ на пост\n3️⃣ Комментарий «хочу»\n\n🔗 Подробности — по ссылке в шапке профиля.\n\n#${tag} #акция #новинка #розыгрыш #подарки`,
      vk:`🔥 ГОРЯЧАЯ НОВОСТЬ!\n\nПривет, друзья! 👋 У нас «${lo}».\n\n✅ просто и понятно\n✅ доступно каждому\n✅ подарки первым 🎁\n\n👍 Лайк, ↪ репост, 💬 комментарий!\n\n#${tag} #новости`,
      dzen:`${up}: что важно знать в 2026 году\n\nТема «${lo}» звучит всё чаще: люди ищут проверенные решения и хотят разобраться без лишней рекламы.\n\nПочему это актуально\nПредложений стало больше, а вместе с ними — вопросов. Осознанный подход сейчас важнее импульсивных решений.\n\nНа что смотреть\nОценивайте прозрачность условий, реальный опыт людей и качество поддержки.\n\nЧастые ошибки\nВыбор только по цене, доверие громким обещаниям, откладывание решения.\n\nВывод\nОпирайтесь на факты и сравнивайте варианты — тогда результат оправдает ожидания.\n\nЕсли материал полезен — поставьте лайк и подпишитесь.`
    };
    return base[format]||`${up}\n\nМатериал на заданную тему.`;
  },
  renderPreview(format,text){
    const p=text.length>300?text.slice(0,300)+'…':text;
    const safe=Core.escapeHtml(p).replace(/\n/g,'<br>');
    let html='';
    if(format==='tg')html=`<div class="preview-tg"><div class="msg">${safe}</div></div>`;
    else if(format==='insta')html=`<div class="preview-insta"><div class="img-ph">📸</div><div class="actions">❤️ 💬 ️</div><div class="caption">${safe}</div></div>`;
    else if(format==='vk')html=`<div class="preview-vk"><div class="vk-head"><div class="vk-avatar"></div><div><div class="vk-name">Ваш бренд</div><div class="vk-time">только что</div></div></div><div class="vk-text">${safe}</div></div>`;
    else if(format==='site')html=`<div class="preview-site"><h3 style="margin-bottom:10px">🌐 Описание</h3><p style="line-height:1.6">${safe}</p></div>`;
    else if(format==='dzen'){const pp=safe.split('\n\n').slice(0,3).join('</p><p>');html=`<div class="preview-dzen"><h3>📰 Статья</h3><p>${pp}</p></div>`}
    this.els.preview.innerHTML=html;
  },
  renderAnalyze(text){
    const r=Core.readability(text),s=Core.sentiment(text),st=Core.analyzeText(text);
    this.els.analyze.innerHTML=`
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:32px">${s.icon}</div>
          <div><div style="font-weight:800">${s.label}</div><div style="font-size:12px;color:var(--muted)">Тональность</div></div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:12px;color:var(--muted)">Читабельность</span>
            <span style="font-size:12px;font-weight:800;color:var(--neon)">${r.score}/100 · ${r.label}</span>
          </div>
          <div style="height:8px;background:var(--input-bg);border-radius:4px;overflow:hidden;border:1px solid var(--line)">
            <div style="height:100%;width:${r.score}%;background:linear-gradient(90deg,var(--vio),var(--neon))"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div class="stat-chip">Слов: <b>${st.words}</b></div>
          <div class="stat-chip">Символов: <b>${st.chars}</b></div>
          <div class="stat-chip">Токенов: <b>${st.tokens}</b></div>
          <div class="stat-chip">Чтение: <b>${st.readTime} мин</b></div>
        </div>
      </div>`;
  },
  updateMeta(format,text,offline){
    const m=FORMAT_META[format]||{label:'Текст'};
    const st=Core.analyzeText(text),se=Core.sentiment(text);
    this.els.meta.innerHTML=`<span>${m.icon||'📝'} <b>${m.label}</b></span><span>·</span><span>Тон: <b>${TONE_LABELS[this.state.tone]}</b></span><span>·</span><span>🤖 <b>${offline?'офлайн-шаблон':this.state.textModel+' / '+AIClient.lastOk}</b></span>`;
    this.els.stats.innerHTML=`
      <span class="stat-chip">Слов: <b>${st.words}</b></span>
      <span class="stat-chip">Токенов: <b>${st.tokens}</b></span>
      <span class="stat-chip ${se.type}">Тональность: <b>${se.label}</b></span>`;
    this.els.meta.hidden=false;this.els.stats.hidden=false;
  },
  restoreFromHistory(item){
    const {els,state}=this;
    this.savePrevious();
    state.fullText=item.text;state.format=item.format;state.variants=[];
    els.varTabs.hidden=true;els.empty.hidden=true;els.tabs.hidden=false;els.output.hidden=false;
    els.output.textContent=item.text;
    this.showTab('text');
    this.renderPreview(item.format,item.text);
    this.renderAnalyze(item.text);
    this.updateMeta(item.format,item.text,item.model==='offline');
    els.copyBtn.disabled=false;els.dlBtn.disabled=false;els.saveTplBtn.hidden=false;
    els.fname.textContent=FORMAT_META[item.format]?.file||'post.txt';
    els.resultCard.scrollIntoView({behavior:'smooth',block:'nearest'});
  },
  async runCampaign(topic){
    const {els,state}=this;
    els.btnCamp.disabled=true;els.campLabel.textContent='⏳ Кампания…';
    els.campGrid.hidden=false;
    const items=els.campGrid.querySelectorAll('.campaign-item');
    const formats=['tg','insta','vk'];
    for(let i=0;i<formats.length;i++){
      const it=items[i];
      it.classList.add('loading');it.querySelector('.c-status').textContent='генерирую…';
      try{
        const text=await this.genAPI(topic,formats[i],state.tone,state.len);
        it.classList.remove('loading');it.classList.add('done');
        it.querySelector('.c-status').textContent='✓ готово';
        History.add({topic,format:formats[i],formatLabel:FORMAT_META[formats[i]].label,text,tone:state.tone,len:state.len,model:state.textModel});
      }catch{
        it.classList.remove('loading');it.querySelector('.c-status').textContent='✕ ошибка';
      }
    }
    Tracker.trackCampaign();
    els.btnCamp.disabled=false;els.campLabel.textContent='🚀 Кампания (3 формата)';
    if(window.Notifications&&Notifications.permission==='granted')Notifications.notifyCampaign(3);
    Toast.show('Кампания завершена 📊');
  },
  typeText(el,text,done){
    if(REDUCED){el.textContent=text;done();return}
    let i=0;
    const tick=()=>{
      i=Math.min(text.length,i+2+Math.floor(Math.random()*3));
      el.textContent=text.slice(0,i);
      if(i<text.length)setTimeout(tick,14+Math.random()*20);
      else done();
    };
    tick();
  }
};

const TopProducts = {
  els:{},state:{text:'',timer:null},
  PHRASES:['Подключаюсь к маркетплейсам…','Анализирую товары…','Сравниваю цены…','Формирую список…'],
  init(){
    this.els={cat:$('#cat'),criteria:$('#criteria'),btn:$('#btnTop'),ctaLabel:$('#ctaLabelTop'),ctaSpark:$('#ctaSparkTop'),miniSpin:$('#miniSpinTop'),empty:$('#emptyTop'),loader:$('#loaderTop'),output:$('#outputTop'),copy:$('#copyTop'),cnt:$('#cnt2'),card:$('#topCard'),think:$('#thinkTextTop'),err:$('#errorTop')};
    this.els.cat.oninput=()=>{this.els.cnt.textContent=this.els.cat.value.length+' / 200';this.els.cat.classList.remove('error')};
    this.els.btn.onclick=()=>{
      const q=this.els.cat.value.trim();
      if(!q){this.els.cat.classList.add('error');Toast.show('Введите категорию','error');return}
      if(!navigator.onLine){Toast.show('Нет интернета','error');return}
      this.fetch(Utils.sanitize(q),this.els.criteria.value);
    };
    this.els.copy.onclick=async()=>{
      if(!this.state.text)return;
      await Utils.copy(this.state.text);
      this.els.copy.classList.add('done');this.els.copy.textContent='✓';
      setTimeout(()=>{this.els.copy.textContent='📋 Копировать';this.els.copy.classList.remove('done')},1600);
    };
  },
  async fetch(query,crit){
    const {els,state}=this;
    if(!Utils.canMakeRequest()){Toast.show('Слишком много запросов','warning');return}
    if(state.timer)clearInterval(state.timer);
    els.btn.disabled=true;els.ctaLabel.textContent='ИИ думает…';els.ctaSpark.hidden=true;els.miniSpin.hidden=false;
    els.empty.hidden=true;els.output.hidden=true;els.err.hidden=true;els.copy.disabled=true;
    els.loader.hidden=false;els.card.classList.add('thinking');
    let pi=0;els.think.textContent=this.PHRASES[0];
    state.timer=setInterval(()=>{pi=(pi+1)%this.PHRASES.length;els.think.textContent=this.PHRASES[pi]},1400);
    const prompt=`ПЛОЩАДКА: маркетплейс-аналитика (Wildberries, Ozon, Amazon).\nЗАДАЧА: составь Топ-10 товаров по запросу «${query}».\nСОРТИРОВКА: по ${crit}.\nФОРМАТ КАЖДОГО ПУНКТА: номер, название, примерная цена в рублях, оценка из 5, одно короткое преимущество.\nВерни только нумерованный список на русском.`;
    Utils.recordRequest();
    try{
      state.text = await AIClient.chat(prompt, 'Ты — эксперт по маркетплейсам. Отвечай только списком товаров на русском.');
    }catch(e){
      clearInterval(state.timer);state.timer=null;
      els.loader.hidden=true;els.card.classList.remove('thinking');
      els.btn.disabled=false;els.ctaLabel.textContent='Найти Топ-10';els.ctaSpark.hidden=false;els.miniSpin.hidden=true;
      els.err.textContent='⚠ '+(e.message||'Ошибка');els.err.hidden=false;
      Toast.show('Ошибка запроса','error');return;
    }
    clearInterval(state.timer);state.timer=null;
    els.loader.hidden=true;els.card.classList.remove('thinking');
    els.btn.disabled=false;els.ctaLabel.textContent='Найти Топ-10';els.ctaSpark.hidden=false;els.miniSpin.hidden=true;
    els.output.hidden=false;
    Generator.typeText(els.output,state.text,()=>{els.copy.disabled=false;Toast.show('Топ-10 готов 🏆')});
  }
};

const Infographic = {
  els:{},state:{img:null,imgModel:'flux'},
  PROMPTS:{
    studio:'professional product photography, [product], clean white background, soft studio lighting, 4k, commercial style',
    lifestyle:'lifestyle product photography, [product] in modern interior, natural daylight, warm tones, 4k',
    neon:'cyberpunk product photography, [product], vibrant neon lights, dark background, futuristic, 4k',
    eco:'eco-friendly product photography, [product], wooden surface, green leaves, natural light, beige tones, 4k',
    luxury:'luxury product photography, [product], black velvet background, golden spotlight, elegant, 4k'
  },
  PHRASES:['Анализирую фото…','Подбираю стиль…','Генерирую через flux…','Применяю эффекты…'],
  init(){
    try{this.state.imgModel = localStorage.getItem('ai-marketer-model-img')||'flux'}catch{}
    this.els={drop:$('#dropZone'),dropContent:$('#dropContent'),file:$('#fileInput'),style:$('#style'),btn:$('#btnInfra'),ctaLabel:$('#ctaLabelInfra'),ctaSpark:$('#ctaSparkInfra'),miniSpin:$('#miniSpinInfra'),empty:$('#emptyInfra'),loader:$('#loaderInfra'),wrap:$('#resultImgWrap'),img:$('#resultImg'),dl:$('#dlImg'),err:$('#errorInfra'),card:$('#infraCard'),think:$('#thinkTextInfra'),preset:$('#stylePreset'),genPrompt:$('#btnGenPrompt')};
    this.els.drop.onclick=e=>{if(e.target.closest('.remove-img'))return;if(this.els.drop.classList.contains('has-image'))return;this.els.file.click()};
    this.els.drop.ondragover=e=>{e.preventDefault();this.els.drop.classList.add('dragover')};
    this.els.drop.ondragleave=()=>this.els.drop.classList.remove('dragover');
    this.els.drop.ondrop=e=>{e.preventDefault();this.els.drop.classList.remove('dragover');if(e.dataTransfer.files.length)this.handleFile(e.dataTransfer.files[0])};
    this.els.file.onchange=e=>{if(e.target.files.length)this.handleFile(e.target.files[0])};
    this.els.genPrompt.onclick=()=>{
      const t=this.PROMPTS[this.els.preset.value]||this.PROMPTS.studio;
      this.els.style.value=t;this.els.style.focus();
      Toast.show('Промпт подставлен — замените [product] на товар ✨');
    };
    this.els.btn.onclick=()=>{
      if(!this.state.img){Toast.show('Загрузите фото','error');return}
      if(!navigator.onLine){Toast.show('Нет интернета','error');return}
      this.generate(this.els.style.value.trim());
    };
    this.renderModelPicker();
  },
  renderModelPicker(){
    const host=this.els.style.closest('.card-inner');
    let row=$('#imgModelRow');
    if(!row){
      row=document.createElement('div');row.id='imgModelRow';row.className='setting-group';
      row.innerHTML='<label class="lbl">🎨 Модель ИИ для картинки</label><div class="opt-btns" id="imgModelBtns"></div>';
      host.insertBefore(row,this.els.btn.closest('.cta-wrap'));
    }
    const btns=$('#imgModelBtns');
    btns.innerHTML=['flux','turbo'].map(m=>`<button class="opt-btn ${m===this.state.imgModel?'active':''}" data-model="${m}">${m}</button>`).join('');
    btns.onclick=e=>{
      const b=e.target.closest('.opt-btn');if(!b)return;
      this.state.imgModel=b.dataset.model;
      try{localStorage.setItem('ai-marketer-model-img',this.state.imgModel)}catch{}
      this.renderModelPicker();
      Toast.show('Модель картинки: '+this.state.imgModel,'info');
    };
  },
  async handleFile(file){
    if(!file.type.startsWith('image/')){Toast.show('Выберите изображение','error');return}
    try{
      const c=await Utils.compressImage(file);
      this.state.img=c;
      this.showPreview(c);
      Toast.show('Фото загружено 📷');
    }catch{Toast.show('Ошибка обработки','error')}
  },
  showPreview(src){
    const {els}=this;
    els.dropContent.style.display='none';
    els.drop.classList.add('has-image');
    const fileInput=els.file;
    els.drop.innerHTML=`<div class="preview-img-wrap"><img src="${src}" class="preview-img" alt="Фото"><button class="remove-img">✕</button></div>`;
    els.drop.appendChild(fileInput);
    fileInput.value='';
    els.drop.querySelector('.remove-img').onclick=e=>{e.stopPropagation();this.removeImage()};
  },
  removeImage(){
    const {els}=this;
    this.state.img=null;
    els.drop.classList.remove('has-image');
    const fi=els.file;
    els.drop.innerHTML=`<div class="drop-zone-content" id="dropContent"><span class="drop-zone-icon">📷</span><div class="drop-zone-text">Нажмите для загрузки</div></div>`;
    els.drop.appendChild(fi);
    els.dropContent=$('#dropContent');
  },
  imgUrl(prompt,model,seed){
    return `${CONFIG.API.IMAGE}/prompt/${encodeURIComponent(prompt)}?width=600&height=600&nologo=true&model=${model}&seed=${seed}&referrer=${CONFIG.REFERRER}`;
  },
  async generate(style){
    const {els}=this;
    if(!Utils.canMakeRequest()){Toast.show('Слишком много запросов','warning');return}
    els.btn.disabled=true;els.ctaLabel.textContent='Создаю…';els.ctaSpark.hidden=true;els.miniSpin.hidden=false;
    els.empty.hidden=true;els.wrap.hidden=true;els.err.hidden=true;els.dl.hidden=true;
    els.loader.hidden=false;els.card.classList.add('thinking');
    let pi=0;els.think.textContent=this.PHRASES[0];
    const timer=setInterval(()=>{pi=(pi+1)%this.PHRASES.length;els.think.textContent=this.PHRASES[pi]},1200);
    const base=style||'product photography, e-commerce style';
    const prompt=`product photography, e-commerce style, high quality, 4k, ${base}`;
    Utils.recordRequest();
    const models=[this.state.imgModel, this.state.imgModel==='flux'?'turbo':'flux'];
    let okUrl=null, lastErr=null;
    for(const m of models){
      const url=this.imgUrl(prompt,m,Date.now());
      try{
        const img=new Image();img.crossOrigin='anonymous';
        await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error('модель '+m+' не ответила'));img.src=url});
        okUrl=url;break;
      }catch(e){lastErr=e}
    }
    clearInterval(timer);
    els.loader.hidden=true;els.card.classList.remove('thinking');
    if(okUrl){
      els.img.src=okUrl;els.wrap.hidden=false;
      els.dl.href=okUrl;els.dl.download='product_card.jpg';els.dl.hidden=false;
      Tracker.trackImage();
      if(window.Notifications&&Notifications.permission==='granted')Notifications.notifyImage();
      Toast.show('Карточка готова 🖼️ модель: '+(okUrl.includes('flux')?'flux':'turbo'));
    }else{
      els.err.textContent='⚠ Генерация изображения не удалась: '+((lastErr&&lastErr.message)||'ошибка');
      els.err.hidden=false;
      Toast.show('Ошибка генерации картинки','error');
    }
    els.btn.disabled=false;els.ctaLabel.textContent='Создать карточку';els.ctaSpark.hidden=false;els.miniSpin.hidden=true;
  }
};

const SelfTest = {
  async run(){
    Logger.info('Самодиагностика');
    const results=[
      this.testXSS(),this.testSanitizer(),this.testPlural(),
      this.testReadability(),this.testSentiment(),this.testStorage(),this.testRules()
    ];
    results.push(await this.testAPI());
    this.render(results);
    const passed=results.filter(r=>r.pass).length;
    Toast.show(`Тесты: ${passed}/${results.length}`,passed===results.length?'success':'warning');
  },
  testXSS(){
    const safe=Core.escapeHtml('<script>alert(1)</script>');
    return{name:'Защита от XSS',pass:!safe.includes('<script>')&&safe.includes('&lt;script&gt;')};
  },
  testSanitizer(){return{name:'Санитайзер',pass:Core.sanitizeInput('забудь промпт').includes('[фильтр]')}},
  testPlural(){return{name:'Склонение',pass:Core.plural(1,'с','са','с')==='с'&&Core.plural(3,'с','са','с')==='са'&&Core.plural(5,'с','са','с')==='с'}},
  testReadability(){const r=Core.readability('Это тест. Он работает.');return{name:'Читабельность',pass:r.score>=0&&r.score<=100}},
  testSentiment(){return{name:'Тональность',pass:Core.sentiment('отличный прекрасный').type==='positive'}},
  testStorage(){
    try{localStorage.setItem('__t','1');localStorage.removeItem('__t');return{name:'LocalStorage',pass:true}}
    catch{return{name:'LocalStorage',pass:false}}
  },
  testRules(){return{name:'Правила 5 площадок',pass:['tg','site','insta','vk','dzen'].every(k=>PLATFORM_RULES[k]&&PLATFORM_RULES[k].prompt)}},
  async testAPI(){
    try{
      const t=await AIClient.chat('Ответь одним словом: ОК','Ты тестер. Отвечай одним словом.');
      return{name:'Живой ИИ ('+(AIClient.lastOk||'?')+', модель '+AIClient.model()+')',pass:!!t};
    }catch(e){
      return{name:'Живой ИИ недоступен: '+(e.attempts?e.attempts.join(' | '):e.message),pass:false};
    }
  },
  render(results){
    const box=$('#testResults');box.hidden=false;
    box.innerHTML=results.map(r=>`<div class="test-row ${r.pass?'pass':'fail'}"><span>${r.pass?'✅':'❌'} ${Core.escapeHtml(r.name)}</span><span class="test-status">${r.pass?'OK':'FAIL'}</span></div>`).join('');
  }
};

const DataCenter = {
  inited:false,
  init(){
    if(this.inited)return;this.inited=true;
    $('#exportAllBtn').onclick=()=>this.exportAll();
    $('#importBtn').onclick=()=>$('#importFile').click();
    $('#importFile').onchange=e=>{if(e.target.files.length)this.importAll(e.target.files[0])};
    $('#runTestsBtn').onclick=()=>{Toast.show('Тестирую, включая живой запрос к ИИ…','info');SelfTest.run()};
    $('#clearAllBtn').onclick=()=>this.clearAll();
  },
  exportAll(){
    const data={version:'6.3',exportedAt:new Date().toISOString(),history:History.items,templates:Templates.items,brandWords:Brand.words,settings:Settings.data,analytics:Tracker.data};
    Utils.download(JSON.stringify(data,null,2),`backup-${Date.now()}.json`,'application/json');
    Toast.show('Резервная копия создана 📥');
  },
  importAll(file){
    const r=new FileReader();
    r.onload=e=>{
      try{
        const data=JSON.parse(e.target.result);
        if(!data.version)throw new Error('Неверный формат');
        Modal.show('Импортировать?','Текущие данные будут заменены.',()=>{
          if(data.history){History.items=data.history.slice(0,CONFIG.HISTORY_LIMIT);History.save();History.render()}
          if(data.templates){Templates.items=data.templates.slice(0,CONFIG.TEMPLATES_LIMIT);Templates.save();Templates.render()}
          if(data.brandWords){Brand.words=data.brandWords.slice(0,20);Brand.save();Brand.render()}
          if(data.settings){Settings.data=data.settings;Settings.save();Settings.apply()}
          if(data.analytics){Tracker.data=data.analytics;Tracker.save();Tracker.render()}
          Toast.show('Импортировано ✅');
        },'Импортировать');
      }catch{Toast.show('Ошибка формата','error')}
    };
    r.readAsText(file);
    $('#importFile').value='';
  },
  clearAll(){
    Modal.show('Удалить ВСЕ данные?','Всё будет удалено безвозвратно.',()=>{
      [CONFIG.HISTORY_KEY,CONFIG.BRAND_KEY,CONFIG.ANALYTICS_KEY,CONFIG.TEMPLATES_KEY,CONFIG.SETTINGS_KEY].forEach(k=>{try{localStorage.removeItem(k)}catch{}});
      History.items=[];History.render();
      Templates.items=[];Templates.render();
      Brand.words=[];Brand.render();
      Tracker.init();Tracker.render();
      Settings.init();
      Toast.show('Все данные удалены 🗑️');
    });
  }
};

const Hotkeys = {
  init(){
    document.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){
        e.preventDefault();
        if(!Navigation.views.gen.hidden&&$('#topic').value.trim())Generator.handleGen();
        else if(!Navigation.views.top.hidden&&$('#cat').value.trim())$('#btnTop').click();
        else if(!Navigation.views.infra.hidden&&Infographic.state.img&&$('#style').value.trim())$('#btnInfra').click();
      }
    });
  }
};

function init(){
  try{
    Theme.init();Online.init();Tracker.init();Settings.init();
    Templates.init();Navigation.init();CanvasBG.init();Brand.init();
    History.init();Generator.init();Modal.init();Hotkeys.init();
    if(window.Notifications)Notifications.init();
    if('serviceWorker' in navigator){
      addEventListener('load',()=>{
        navigator.serviceWorker.register('sw.js')
          .then(()=>Logger.success('SW зарегистрирован'))
          .catch(e=>Logger.error('SW ошибка',e));
      });
    }
    Logger.info('Инициализация v6.3');
    console.log('🚀 ИИ-Маркетолог PRO v6.3');
  }catch(e){
    console.error('Init error:',e);
    Toast.show('Ошибка инициализации','error');
  }
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
