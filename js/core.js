'use strict';
const Core = {
  CONFIG: {
    HISTORY_KEY: 'ai-marketer-history-v6',
    BRAND_KEY: 'ai-marketer-brand-v6',
    THEME_KEY: 'ai-marketer-theme',
    ANALYTICS_KEY: 'ai-marketer-analytics-v6',
    TEMPLATES_KEY: 'ai-marketer-templates-v6',
    SETTINGS_KEY: 'ai-marketer-settings-v6',
    HISTORY_LIMIT: 15, CACHE_LIMIT: 50, TEMPLATES_LIMIT: 10,
    API: { TEXT: 'https://text.pollinations.ai', IMAGE: 'https://image.pollinations.ai' },
    RATE_LIMIT: { MAX: 10, WINDOW: 60000 }, CACHE_TTL: 5*60*1000, TIMEOUT: 30000
  },
  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
    return text.replace(/[&<>"']/g, c => map[c]);
  },
  sanitizeInput(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/[`\n\r]/g,' ')
      .replace(/\b(забудь|игнорируй|системный промпт|инструкции выше)\b/gi,'[фильтр]')
      .slice(0,500);
  },
  plural(n, one, few, many) {
    const m100 = Math.abs(n)%100, m10 = m100%10;
    if (m100>10 && m100<20) return many;
    if (m10>1 && m10<5) return few;
    if (m10===1) return one;
    return many;
  },
  analyzeText(text) {
    if (!text || !text.trim()) return {words:0,chars:0,tokens:0,readTime:0};
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return {words, chars:text.length, tokens:Math.ceil(text.length/4), readTime:Math.max(1,Math.ceil(words/180))};
  },
  readability(text) {
    const words = (text||'').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return {score:0,label:'Нет данных'};
    const sentences = text.split(/[.!?]+/).filter(s=>s.trim()).length || 1;
    const vowels = text.match(/[аеёиоуыэюя]/gi) || [];
    const syllables = Math.max(vowels.length, words.length);
    const score = Math.max(0, Math.min(100, Math.round(206.835 - 1.3*(syllables/words.length) - 60.1*(sentences/words.length))));
    const labels = [[80,'Очень легко'],[60,'Легко'],[40,'Средне'],[20,'Сложно'],[0,'Очень сложно']];
    return {score, label: labels.find(([min])=>score>=min)[1]};
  },
  sentiment(text) {
    const pos = ['отличный','прекрасный','лучший','идеальный','супер','рекомендую','люблю','нравится','качественный','удобный','быстрый','выгодный','красивый','яркий'];
    const neg = ['плохой','ужасный','худший','разочарован','брак','проблема','сложный','медленный','дорогой','скучный'];
    const lower = (text||'').toLowerCase();
    let p=0, n=0;
    pos.forEach(w=>{if(lower.includes(w))p++});
    neg.forEach(w=>{if(lower.includes(w))n++});
    if (!p && !n) return {type:'neutral',label:'Нейтральный',icon:'⚪'};
    if (p>n) return {type:'positive',label:'Позитивный',icon:'😊'};
    if (n>p) return {type:'negative',label:'Негативный',icon:'😟'};
    return {type:'neutral',label:'Смешанный',icon:'⚪'};
  },
  validateHistory(data) {
    if (!Array.isArray(data)) return [];
    return data.filter(i=>i && typeof i.id==='number' && typeof i.text==='string').slice(0,this.CONFIG.HISTORY_LIMIT);
  },
  validateSettings(data) {
    const def = {tone:'friendly',len:'medium'};
    if (!data || typeof data!=='object') return def;
    return {
      tone: ['friendly','formal','expert','bold'].includes(data.tone)?data.tone:def.tone,
      len: ['short','medium','long'].includes(data.len)?data.len:def.len
    };
  },
  formatDate(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('ru-RU',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
    } catch { return '—'; }
  }
};
window.Core = Core;
