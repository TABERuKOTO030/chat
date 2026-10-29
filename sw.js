const V='hush-v5';
const ASSETS=['./','index.html','styles.css','config.js','i18n.js','crypto.js','backend.js','core.js','ui.js','vendor/supabase.js','fonts/fredoka.woff2','fonts/abril.woff2','fonts/serif-cjk.woff2','fonts/serif-jp.woff2','manifest.json','icons/icon-192.png','icons/icon-512.png','icons/badge.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!=='hush-prefs').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// 只缓存 app 自身的静态文件；聊天数据（都是密文）从不进缓存
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))))});
// 推送：内容永远只有"你有一条新消息"，明文不经过苹果/谷歌的推送服务器
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(x){}
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{if(!d.test&&cs.some(c=>c.visibilityState==='visible'))return;
    return getLang().then(l=>self.registration.showNotification(l==='ja'?'HUSH':'悄悄话',{body:l==='ja'?'新着メッセージがあります':'你有一条新消息',tag:d.conv?'hush-'+d.conv:'hush',renotify:true,icon:'icons/icon-192.png',badge:'icons/badge.png',data:{conv:d.conv||null}}))}))});
function getLang(){return caches.open('hush-prefs').then(c=>c.match('lang')).then(r=>r?r.text():'').then(t=>t||(/^ja/i.test(self.navigator.language||'')?'ja':'zh')).catch(()=>'zh')}
self.addEventListener('notificationclick',e=>{e.notification.close();const conv=e.notification.data&&e.notification.data.conv;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{const c=cs[0];if(c){c.focus();if(conv)c.postMessage({open:conv});return}return self.clients.openWindow('./'+(conv?'?open='+conv:''))}))});
