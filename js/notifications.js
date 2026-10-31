'use strict';
const Notifications = {
  permission: 'default',
  init() {
    if (!('Notification' in window)) return;
    this.permission = Notification.permission;
    if (this.permission === 'default') setTimeout(()=>this.showBanner(), 3000);
  },
  async requestPermission() {
    if (!('Notification' in window)) return false;
    try {
      this.permission = await Notification.requestPermission();
      if (this.permission === 'granted') {
        this.show('🔔 Уведомления включены!', {body:'Вы будете получать уведомления о готовности текстов.'});
        return true;
      }
      return false;
    } catch { return false; }
  },
  show(title, options={}) {
    if (!('Notification' in window) || this.permission!=='granted') return;
    try {
      const n = new Notification(title, {
        body: options.body||'', icon:'icons/icon-192.png', badge:'icons/icon-192.png',
        vibrate:[100,50,100], tag:options.tag||'ai-marketer'
      });
      n.onclick = () => { window.focus(); n.close(); };
      setTimeout(()=>n.close(), 5000);
      return n;
    } catch(e) { console.error(e); }
  },
  notifyGeneration(format, words) {
    this.show('✨ Текст готов!', {body:`${words} слов для формата "${format}"`, tag:'gen'});
  },
  notifyCampaign(count) {
    this.show('🚀 Кампания завершена!', {body:`Сгенерировано ${count} варианта`, tag:'camp'});
  },
  notifyImage() {
    this.show('🖼️ Карточка готова!', {body:'Изображение сгенерировано', tag:'img'});
  },
  showBanner() {
    if (document.getElementById('notifBanner')) return;
    const b = document.createElement('div');
    b.id = 'notifBanner';
    b.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--glass-strong);border:1px solid var(--line);border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:12px;z-index:99;max-width:90%;backdrop-filter:blur(10px);box-shadow:0 8px 32px rgba(0,0,0,.3)';
    b.innerHTML = '<span style="font-size:24px">🔔</span><div style="flex:1"><div style="font-weight:700;font-size:13px">Включить уведомления?</div></div><button id="notifAllow" style="padding:8px 14px;background:var(--neon);color:var(--bg0);border:none;border-radius:8px;font-weight:700;cursor:pointer">Да</button><button id="notifDismiss" style="padding:8px;background:none;border:none;color:var(--muted);cursor:pointer">✕</button>';
    document.body.appendChild(b);
    document.getElementById('notifAllow').onclick = async()=>{await this.requestPermission(); b.remove();};
    document.getElementById('notifDismiss').onclick = ()=>b.remove();
    setTimeout(()=>{if(document.getElementById('notifBanner'))b.remove();}, 10000);
  }
};
window.Notifications = Notifications;
