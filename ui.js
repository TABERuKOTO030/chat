// 界面层：两套主题（扭蛋糖果 / 超自然办公室），纯原生 JS。
(function(){
const ST=window.ST,CFG=window.HUSH_CONFIG,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui={tab:'chats',open:null,reply:null,q:'',cq:'',archive:null,sel:null};
const S={get theme(){return localStorage.getItem('hush-theme')||'gacha'},set theme(v){localStorage.setItem('hush-theme',v)},
  get lockMin(){return +(localStorage.getItem('hush-lock')||5)},set lockMin(v){localStorage.setItem('hush-lock',v)},
  get peek(){return localStorage.getItem('hush-peek')!=='0'},set peek(v){localStorage.setItem('hush-peek',v?'1':'0')}};
const isOffice=()=>S.theme==='office';
function applyTheme(){document.body.className='t-'+S.theme;const m=$('meta[name=theme-color]');if(m)m.content=isOffice()?'#E7E7E8':'#BFE1F6'}
// ---------- 图形 ----------
const sparkle=(c='')=>`<svg class="spk ${c}" viewBox="0 0 24 24"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/></svg>`;
function scallopPath(n=12,r1=46,r2=50){let d='';for(let i=0;i<=n*8;i++){const a=i/(n*8)*Math.PI*2;const r=r1+(r2-r1)*Math.abs(Math.cos(a*n/2));d+=(i?'L':'M')+(50+r*Math.cos(a)).toFixed(2)+' '+(50+r*Math.sin(a)).toFixed(2)}return d+'Z'}
const SCALLOP=scallopPath(14,43,50);
const badge=(top,big,cls='')=>`<div class="badge ${cls}"><svg viewBox="0 0 100 100"><path d="${SCALLOP}"/></svg><span><i>${esc(top)}</i><b>${esc(big)}</b></span></div>`;
const ghost=(c='')=>`<svg class="ghost ${c}" viewBox="0 0 120 150"><path d="M60 6C28 6 10 32 10 64v70c0 6 6 9 11 5l9-8 10 9c3 3 8 3 11 0l9-9 9 9c3 3 8 3 11 0l10-9 9 8c5 4 11 1 11-5V64C110 32 92 6 60 6Z" fill="#3FC6D6"/><ellipse cx="45" cy="62" rx="7" ry="10" fill="#111"/><ellipse cx="77" cy="62" rx="7" ry="10" fill="#111"/><path d="M52 86q8 7 16 0" stroke="#111" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
const capsule=(c='')=>`<svg class="capsule ${c}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#fff"/><path d="M8 50a42 42 0 0 1 84 0Z" fill="#F7B5CB"/><path d="M8 50a42 42 0 0 0 84 0Z" fill="#BFE1F6"/><rect x="8" y="46" width="84" height="8" rx="4" fill="#fff"/><circle cx="34" cy="30" r="6" fill="#fff" opacity=".7"/></svg>`;
const ICON={
  back:'<path d="M15 5l-7 7 7 7"/>',plus:'<path d="M12 5v14M5 12h14"/>',send:'<path d="M4 12l16-8-6 16-3-7z"/>',mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  img:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/>',file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>',lock:'<rect x="5" y="11" width="14" height="10" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',chat:'<path d="M4 5h16v11H9l-5 4z"/>',me:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',play:'<path d="M8 5l11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  dl:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4 1.5 4.5 4"/>',camera:'<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l2-3h4l2 3"/>'};
const ic=(n,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24">${ICON[n]}</svg>`;
function avatar(src,name,cls=''){const ch=(name||'?').trim().slice(0,1)||'?';const hue=[...(name||'?')].reduce((a,c)=>a+c.charCodeAt(0),0)%4;
  return src?`<span class="av ${cls}"><img src="${esc(src)}" alt=""></span>`:`<span class="av ${cls} av-c${hue}"><em>${esc(ch)}</em></span>`}
// ---------- 工具 ----------
const pad=n=>String(n).padStart(2,'0');
const hm=iso=>{const d=new Date(iso);return pad(d.getHours())+':'+pad(d.getMinutes())};
function dayLabel(iso){const d=new Date(iso),t=new Date();const k=x=>x.toDateString();if(k(d)===k(t))return T("今天");const y=new Date(t-864e5);if(k(d)===k(y))return T("昨天");return(d.getMonth()+1)+T("月")+d.getDate()+T("日")}
function listTime(iso){if(!iso)return'';const d=new Date(iso),t=new Date();if(d.toDateString()===t.toDateString())return hm(iso);return(d.getMonth()+1)+'/'+d.getDate()}
const fsize=n=>n<1024?n+'B':n<1048576?(n/1024).toFixed(0)+'KB':(n/1048576).toFixed(1)+'MB';
function toast(msg,kind=''){const t=document.createElement('div');t.className='toast '+kind;t.textContent=msg;$('#toasts').appendChild(t);setTimeout(()=>t.classList.add('out'),2600);setTimeout(()=>t.remove(),3000)}
function busy(on,text){let b=$('#busy');if(on){if(!b){b=document.createElement('div');b.id='busy';document.body.appendChild(b)}b.innerHTML=`<div class="busy-card">${isOffice()?ghost('spin'):capsule('spin')}<p>${esc(text||T("处理中…"))}</p></div>`}else if(b)b.remove()}
async function guard(fn,text){busy(true,text);try{return await fn()}catch(e){console.error(e);let m=e.message||String(e);if(/schema cache|relation .*chat_|does not exist/i.test(m))m=T("云端数据库还没初始化：需要先在 Supabase 运行一次 schema.sql");else if(/already registered/i.test(m))m=T("这个邮箱已经注册过（可能是其他 app）。可以直接登录，或用 名字+chat@邮箱 注册");else if(/Invalid login/i.test(m))m=T("邮箱或主密码不对");toast(m,'err')}finally{busy(false)}}
function sheet(html,cls=''){closeSheet();const r=$('#sheet-root');r.innerHTML=`<div class="scrim" data-act="close-sheet"></div><div class="sheet ${cls}">${html}</div>`;r.classList.add('on');return r.querySelector('.sheet')}
function closeSheet(){const r=$('#sheet-root');r.classList.remove('on');r.innerHTML=''}
const sheetHead=(title,sub='')=>`<div class="sh-head"><div><h3>${esc(title)}</h3>${sub?`<p>${esc(sub)}</p>`:''}</div><button class="ibtn" data-act="close-sheet" aria-label="${T('关闭')}">${ic('x')}</button></div>`;
function confirmBox(title,text,okText=T("确定"),danger){return new Promise(res=>{const s=sheet(`${sheetHead(title)}<p class="sh-text">${text}</p><div class="row-btns"><button class="btn ghost" data-r="0">${T("取消")}</button><button class="btn ${danger?'danger':''}" data-r="1">${esc(okText)}</button></div>`,'small');
  s.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{closeSheet();res(b.dataset.r==='1')})})}
function promptBox(title,label,val='',type='text'){return new Promise(res=>{const s=sheet(`${sheetHead(title)}<label class="fld"><span>${esc(label)}</span><input id="pb" type="${type}" value="${esc(val)}" autocomplete="off"></label><div class="row-btns"><button class="btn ghost" data-r="0">${T("取消")}</button><button class="btn" data-r="1">${T("确定")}</button></div>`,'small');
  const i=s.querySelector('#pb');setTimeout(()=>i.focus(),50);i.onkeydown=e=>{if(e.key==='Enter'){closeSheet();res(i.value)}};s.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const v=i.value;closeSheet();res(b.dataset.r==='1'?v:null)})})}
function pickFile(accept,capture){return new Promise(res=>{const i=document.createElement('input');i.type='file';if(accept)i.accept=accept;if(capture)i.capture=capture;i.onchange=()=>res(i.files[0]||null);i.click()})}
async function imgThumb(file,max=360,q=.72){const url=URL.createObjectURL(file);try{const im=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url});
  const r=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*r);c.height=Math.round(im.height*r);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return{thumb:c.toDataURL('image/jpeg',q),w:im.width,h:im.height}}finally{URL.revokeObjectURL(url)}}
async function videoThumb(file){const url=URL.createObjectURL(file);try{const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='metadata';v.src=url;
  await new Promise((ok,no)=>{v.onloadeddata=ok;v.onerror=no;setTimeout(ok,4000)});try{v.currentTime=Math.min(.5,(v.duration||1)/3);await new Promise(ok=>{v.onseeked=ok;setTimeout(ok,1500)})}catch(e){}
  const r=Math.min(1,360/Math.max(v.videoWidth||360,v.videoHeight||360));const c=document.createElement('canvas');c.width=Math.round((v.videoWidth||360)*r)||360;c.height=Math.round((v.videoHeight||240)*r)||240;
  try{c.getContext('2d').drawImage(v,0,0,c.width,c.height)}catch(e){}return{thumb:c.toDataURL('image/jpeg',.7),w:v.videoWidth,h:v.videoHeight,dur:Math.round(v.duration||0)}}catch(e){return{}}finally{URL.revokeObjectURL(url)}}
// ---------- 主题装饰 ----------
function brandHead(title,sub){
  if(isOffice())return`<header class="hd hd-office"><div class="monitor"><div class="screen"><div class="scr-top"><span>${esc(sub||'')}</span><span>${new Date().getFullYear()}/${new Date().getMonth()+1}/${new Date().getDate()}</span></div>
    <h1 class="serif-xl">HUSH<br>OFFICE</h1><div class="sticky"><b>${new Date().getMonth()+1}${T("月")}${new Date().getDate()}</b><small>${esc(title)}</small><i></i></div><p class="scr-cn">${esc(title)}!!</p>${ghost('peek')}</div><div class="stand"></div></div></header>`;
  return`<header class="hd hd-gacha"><div class="wordmark" aria-hidden="true">HUSH<br>HUSHHUSH</div>${badge('VOL.01',title,'tilt')}<p class="hd-sub">${esc(sub||'')}</p>${sparkle('s1')}${sparkle('s2')}${sparkle('s3')}</header>`;
}
const langSwitch=()=>`<div class="tswitch lsw" role="group" aria-label="Language"><button data-act="lang" data-v="zh" class="${LANG()==='zh'?'on':''}" lang="zh-CN"><span>中文</span></button><button data-act="lang" data-v="ja" class="${LANG()==='ja'?'on':''}" lang="ja"><span>日本語</span></button></div>`;
const themeSwitch=()=>`<div class="tswitch" role="group" aria-label="${T('切换风格')}"><button data-act="theme" data-v="gacha" class="${!isOffice()?'on':''}${T("\" title=\"扭蛋糖果\">")}${capsule()}<span>${T("扭蛋糖果")}</span></button><button data-act="theme" data-v="office" class="${isOffice()?'on':''}${T("\" title=\"超自然办公室\">")}${ghost()}<span>${T("超自然办公室")}</span></button></div>`;
// ---------- 登录 / 锁屏 ----------
function renderAuth(mode='in'){ui.authMode=mode;
  $('#app').innerHTML=`<div class="auth"><div class="sw-row">${themeSwitch()}${langSwitch()}</div>${brandHead(mode==='in'?T("欢迎回来"):T("创建加密空间"),'END-TO-END ENCRYPTED')}
  <form class="card auth-card" id="authf">${!isOffice()?'<span class="tape"></span>':'<span class="tag">CONFIDENTIAL</span>'}
   <div class="seg"><button type="button" data-act="auth-mode" data-v="in" class="${mode==='in'?'on':''}${T("\">登录")}</button><button type="button" data-act="auth-mode" data-v="up" class="${mode==='up'?'on':''}${T("\">注册")}</button></div>
   <label class="fld"><span>${T("邮箱")}</span><input name="email" type="email" required autocomplete="username" value="${esc(localStorage.getItem('hush-email')||'')}"></label>
   <label class="fld"><span>${T("主密码")}</span><input name="pw" type="password" required minlength="${mode==='up'?10:1}" autocomplete="${mode==='up'?'new-password':'current-password'}"></label>
   ${mode==='up'?`<label class="fld"><span>${T("再输一次")}</span><input name="pw2" type="password" required autocomplete="new-password"></label>
   <ul class="warn"><li><b>${T("主密码就是钥匙。")}</b>${T("它在你的设备上生成加密密钥，服务器和开发者都拿不到。忘了就")}<b>${T("永远无法找回")}</b>${T("任何内容。")}</li><li>${T("至少 10 位，建议用一句只有你知道的话。")}</li><li>${T("聊天账号和记账、减肥等 app 是分开的；如果邮箱已经注册过，可以用")} <code>${T("名字+chat@邮箱")}</code> ${T("的写法。")}</li></ul>
   <label class="chk"><input type="checkbox" name="ack" required><span>${T("我明白忘记密码无法恢复")}</span></label>`:''}
   <button class="btn big" type="submit">${mode==='in'?T("解锁进入"):T("生成密钥并注册")}</button>
   <p class="fine">${ic('shield')} ${T("消息、图片、文件、昵称、头像、群名都在本机加密后才上传。")}</p></form></div>`;
  $('#authf').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const email=f.get('email').trim(),pw=f.get('pw');
    if(mode==='up'&&pw!==f.get('pw2'))return toast(T("两次密码不一样"),'err');
    await guard(async()=>{if(mode==='up')await ST.signUp(email,pw);else await ST.signIn(email,pw)},mode==='up'?T("正在本机生成密钥…"):T("正在本机解密…"))}}
function renderLock(){const email=localStorage.getItem('hush-email')||'';
  $('#app').innerHTML=`<div class="auth lockscr"><div class="sw-row">${themeSwitch()}${langSwitch()}</div>${brandHead(T("已上锁"),'LOCKED')}<form class="card auth-card" id="lockf">${isOffice()?'<span class="tag">LOCKED</span>':'<span class="tape"></span>'}
   <div class="lock-ic">${ic('lock')}</div><p class="sh-text center">${esc(email)}<br>${T("内存里的密钥已清除，输入主密码重新解锁。")}</p>
   <label class="fld"><span>${T("主密码")}</span><input name="pw" type="password" required autocomplete="current-password"></label>
   <button class="btn big" type="submit">${T("解锁")}</button><button class="btn ghost" type="button" data-act="logout">${T("退出登录")}</button></form></div>`;
  $('#lockf').onsubmit=async e=>{e.preventDefault();const pw=new FormData(e.target).get('pw');await guard(()=>ST.unlock(pw),T("正在本机解密…"))};setTimeout(()=>{const i=$('#lockf input');i&&i.focus()},80)}
// ---------- 主界面 ----------
function renderMain(){
  $('#app').innerHTML=`<div class="shell ${ui.open?'open':''}"><aside class="side"><div class="side-scroll" id="side"></div>
   <nav class="tabs">${[['chats','chat',T("聊天")],['favs','star',T("收藏")],['me','me',T("我")]].map(([k,i,t])=>`<button data-act="tab" data-v="${k}" class="${ui.tab===k?'on':''}">${ic(i)}<span>${t}</span>${k==='chats'?'<em class="tbadge" id="tb"></em>':''}</button>`).join('')}</nav></aside>
   <main class="pane" id="pane"></main></div>`;
  renderSide();renderPane();
}
function renderSide(){const el=$('#side');if(!el)return;
  if(ui.tab==='chats')el.innerHTML=chatsTab();else if(ui.tab==='favs')el.innerHTML=favsTab();else el.innerHTML=meTab();
  const n=[...ST.convs.values()].reduce((a,c)=>a+(c.unread||0),0);const tb=$('#tb');if(tb){tb.textContent=n>99?'99+':n||'';tb.style.display=n?'':'none'}
  document.title=n?`(${n}${T(") 悄悄话")}`:T("悄悄话");if(navigator.setAppBadge){n?navigator.setAppBadge(n).catch(()=>{}):navigator.clearAppBadge().catch(()=>{})}
  const q=$('#q');if(q){q.oninput=()=>{ui.q=q.value;const p=q.selectionStart;renderSide();const n2=$('#q');n2.focus();n2.setSelectionRange(p,p)}}
}
function sortedConvs(){return[...ST.convs.values()].sort((a,b)=>{const la=(a.msgs[a.msgs.length-1]||{}).at||a.created_at,lb=(b.msgs[b.msgs.length-1]||{}).at||b.created_at;return la<lb?1:-1})}
function chatsTab(){const q=ui.q.trim().toLowerCase();let list=sortedConvs();
  if(q)list=list.filter(c=>ST.convTitle(c).toLowerCase().includes(q)||c.msgs.some(m=>(m.body.text||'').toLowerCase().includes(q)));
  const total=ST.convs.size;
  return`${brandHead(T("悄悄话"),total?`${total} ${T("个加密对话")}`:T("只属于你们的空间"))}
  <div class="toolbar"><label class="search">${ic('search')}<input id="q" placeholder="${T('搜索对话和消息（只在本机解密后搜索）')}" value="${esc(ui.q)}"></label><button class="ibtn fill" data-act="new-menu" aria-label="${T('新建')}">${ic('plus')}</button></div>
  ${ST.rt&&ST.rt!=='SUBSCRIBED'&&ST.rt!=='idle'?`<p class="rt-warn">${T("实时连接：")}${esc(ST.rt)}${T("，正在重连…")}</p>`:''}
  <ul class="clist">${list.map((c,i)=>{const last=c.msgs[c.msgs.length-1];const t=ST.convTitle(c);
    let pv=last?ST.preview(last.body):(c.kind==='dm'?T("已建立加密通道，打个招呼吧"):T("群聊已创建"));if(q&&last){const hit=[...c.msgs].reverse().find(m=>(m.body.text||'').toLowerCase().includes(q));if(hit)pv=hit.body.text}
    if(last&&c.kind==='group'&&last.body.t!=='sys')pv=(last.mine?T("我"):ST.nameOf(last.sender))+T("：")+pv;
    return`<li class="citem ${ui.open===c.id?'cur':''}" data-act="open" data-id="${c.id}">${i===0&&!isOffice()?'<span class="tape sm"></span>':''}${avatar(ST.convAvatar(c),t,'sticker')}<div class="cmain"><div class="crow"><b>${esc(t)}</b>${c.kind==='group'?`<span class="pill">${c.members.length}${T("人")}</span>`:''}${c.meta.ttl?`<span class="pill t">${ic('timer')}</span>`:''}<time>${listTime(last&&last.at||c.created_at)}</time></div>
    <div class="crow"><p>${esc(pv)}</p>${c.unread?`<em class="ubadge">${c.unread>99?'99+':c.unread}</em>`:''}</div></div></li>`}).join('')}</ul>
  ${!list.length?`<div class="empty">${isOffice()?ghost('big'):capsule('big')}<h4>${q?T("没有找到"):T("还没有对话")}</h4><p>${q?T("换个关键词试试"):T("把你的邀请码发给想聊天的人，或者输入对方的邀请码。")}</p>${q?'':`<button class="btn" data-act="add-friend">${T("添加好友")}</button>`}</div>`:''}`}
function favsTab(){return`${brandHead(T("收藏夹"),ST.favs.length+T(" 条"))}<div class="favs">${ST.favs.map((f,i)=>{const b=f.data.body;
  return`<div class="fav" style="--r:${(i%3-1)*1.2}deg"><span class="${isOffice()?'ftape':'tape sm'}"></span><div class="fav-body">${b.t==='text'?`<p>${esc(b.text)}</p>`:b.thumb?`<img src="${esc(b.thumb)}" alt="">`:`<p class="fav-file">${esc(ST.preview(b))}</p>`}</div>
  <div class="fav-meta"><span>${esc(f.data.sender)} · ${esc(f.data.conv)}</span><time>${dayLabel(f.data.at)} ${hm(f.data.at)}</time></div><div class="fav-act">${b.t==='text'?`<button data-act="copy-fav" data-id="${f.id}${T("\">复制")}</button>`:''}<button data-act="del-fav" data-id="${f.id}${T("\">移除")}</button></div></div>`}).join('')}</div>
  ${!ST.favs.length?`<div class="empty">${isOffice()?ghost('big'):capsule('big')}<h4>${T("还没有收藏")}</h4><p>${T("长按（电脑上右键）任意消息，选择\"收藏\"。收藏内容同样加密保存，换设备登录也能看到。")}</p></div>`:''}`}
function meTab(){const me=ST.me,p=me.profile;
  return`${brandHead(T("我的空间"),'ID '+me.handle)}
  <div class="card me-card">${avatar(p.avatar,p.name||T("我"),'xl sticker')}<div><h3>${esc(p.name||T("未设置昵称"))}</h3><p>${esc(p.bio||T("写一句签名吧"))}</p></div><button class="btn sm" data-act="edit-profile">${T("编辑")}</button></div>
  <div class="card code-card"><span class="lbl">${T("我的邀请码")}</span><div class="code">${me.handle.replace(/(.{4})/,'$1 ')}</div><div class="row-btns"><button class="btn sm" data-act="copy-code">${T("复制邀请码")}</button><button class="btn sm ghost" data-act="copy-link">${T("复制邀请链接")}</button></div><p class="fine">${T("对方输入邀请码即可和你建立端到端加密的对话。")}</p></div>
  <h4 class="sec">${T("外观")}</h4>${themeSwitch()}<h4 class="sec">${T("语言")} · Language</h4>${langSwitch()}
  <h4 class="sec">${T("安全与隐私")}</h4><div class="menu card">
   <button data-act="notify">${ic('chat')}<span>${T("消息提醒")}</span><em>${notifState()}</em></button>
   <button data-act="autolock">${ic('lock')}<span>${T("自动上锁")}</span><em>${S.lockMin?S.lockMin+T(" 分钟无操作"):T("关闭")}</em></button>
   <button data-act="peek">${ic('search')}<span>${T("弹窗显示内容预览")}</span><em>${S.peek?T("开"):T("关")}</em></button>
   <button data-act="my-fp">${ic('shield')}<span>${T("我的密钥指纹")}</span><em></em></button>
   <button data-act="change-pw">${ic('lock')}<span>${T("修改主密码")}</span><em></em></button>
   <button data-act="lock-now">${ic('lock')}<span>${T("立即上锁")}</span><em></em></button></div>
  <h4 class="sec">${T("备份")}</h4><div class="menu card">
   <button data-act="backup">${ic('dl')}<span>${T("导出加密备份")}</span><em>${T(".hush 文件")}</em></button>
   <button data-act="restore">${ic('file')}<span>${T("打开备份文件")}</span><em>${T("需同一账号密码")}</em></button></div>
  <h4 class="sec">${T("清除")}</h4><div class="menu card">
   <button data-act="about">${ic('info')}<span>${T("加密说明与局限")}</span><em></em></button>
   <button data-act="logout">${ic('back')}<span>${T("退出登录")}</span><em>${T("并清空本机数据")}</em></button>
   <button data-act="wipe" class="danger">${ic('x')}<span>${T("彻底销毁账号")}</span><em>${T("不可恢复")}</em></button></div>
  <p class="fine center pad">${T("悄悄话 HUSH · v1 · 端到端加密")}</p>`}
function notifState(){if(!('Notification' in window))return T("不支持");if(Notification.permission==='granted')return CFG.PUSH_READY?T("已开启推送"):T("已开启（app 打开时）");if(Notification.permission==='denied')return T("已被系统拒绝");return T("未开启")}
// ---------- 聊天窗口 ----------
function renderPane(){const el=$('#pane');if(!el)return;const c=ui.open&&ST.convs.get(ui.open);
  document.querySelector('.shell').classList.toggle('open',!!c);
  if(!c){el.innerHTML=`<div class="pane-empty">${isOffice()?`<div class="pe-office"><h2 class="serif-xl">NO FILE<br>OPENED</h2>${ghost('big')}<span class="tag">${T("选择一个对话")}</span></div>`:`<div class="pe-gacha"><div class="wordmark">GACHA<br>GACHA</div>${capsule('huge')}${badge('HUSH',T("选个对话"))}</div>`}</div>`;return}
  const t=ST.convTitle(c);const sub=c.kind==='group'?`${c.members.length} ${T("位成员 · 端到端加密")}`:(isVerified(c)?T("已核对安全码 · 端到端加密"):T("端到端加密"));
  el.innerHTML=`<section class="chat">
   <header class="chat-hd">${isOffice()?'<div class="chrome"><i></i><i></i><i></i><span>'+esc(t.toUpperCase())+'.CHAT</span></div>':''}<div class="chat-hd-row"><button class="ibtn back" data-act="back" aria-label="${T('返回')}">${ic('back')}</button>${avatar(ST.convAvatar(c),t,'sm sticker')}
    <div class="chat-title" data-act="info"><b>${esc(t)}</b><small>${c.meta.ttl?ic('timer')+T(" 阅后即焚 ")+ttlLabel(c.meta.ttl)+' · ':''}${esc(sub)}</small></div>
    <button class="ibtn" data-act="chat-search" aria-label="${T('搜索')}">${ic('search')}</button><button class="ibtn" data-act="info" aria-label="${T('详情')}">${ic('info')}</button></div>
    <div class="csearch ${ui.cq!==''?'on':''}${T("\"><input id=\"cq\" placeholder=\"在本对话中搜索\" value=\"")}${esc(ui.cq)}"><span id="cqn"></span></div></header>
   <div class="msgs" id="msgs"></div>
   <div class="replybar" id="replybar"></div>
   <footer class="composer" id="composer"><button class="ibtn" data-act="attach" aria-label="${T('附件')}">${ic('plus')}</button>
    <textarea id="txt" rows="1" placeholder="${isOffice()?'TYPE A MESSAGE…':T("说点悄悄话…")}"></textarea>
    <button class="ibtn" data-act="voice" id="micb" aria-label="${T('语音')}">${ic('mic')}</button><button class="sendb" data-act="send" aria-label="${T('发送')}">${isOffice()?'SEND':''}${ic('send')}</button></footer></section>`;
  const tx=$('#txt');tx.value=ui.draft&&ui.draft[c.id]||'';
  tx.oninput=()=>{tx.style.height='auto';tx.style.height=Math.min(tx.scrollHeight,140)+'px';(ui.draft=ui.draft||{})[c.id]=tx.value};
  tx.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&matchMedia('(pointer:fine)').matches){e.preventDefault();doSend()}};
  const cq=$('#cq');cq.oninput=()=>{ui.cq=cq.value;renderMsgs(true)};
  renderMsgs(true);renderReply();ST.markRead(c);
}
const ttlLabel=s=>({30:T("30秒"),300:T("5分钟"),3600:T("1小时"),86400:T("1天"),604800:T("7天")}[s]||s+T("秒"));
function isVerified(c){if(c.kind!=='dm')return false;const p=ST.peerOf(c);const a=p&&ST.accounts.get(p);return!!(a&&localStorage.getItem('hush-ver-'+p)===a.pub_ecdh.slice(-24))}
function renderMsgs(toBottom){const el=$('#msgs');const c=ST.convs.get(ui.open);if(!el||!c)return;
  const near=el.scrollHeight-el.scrollTop-el.clientHeight<120;
  const q=ui.cq.trim().toLowerCase();let ms=c.msgs;if(q)ms=ms.filter(m=>(m.body.text||m.body.blob&&m.body.blob.name||'').toLowerCase().includes(q));
  const cqn=$('#cqn');if(cqn)cqn.textContent=q?ms.length+T(" 条"):'';
  const others=c.members.filter(m=>m.user_id!==ST.me.id);
  let html='',lastDay='',lastSender='';
  html+=`<div class="e2e-note">${ic('lock')}<span>${T("消息已端到端加密。只有对话里的人能解密，服务器只能看到乱码。")}</span></div>`;
  for(const m of ms){const d=dayLabel(m.at);if(d!==lastDay){html+=`<div class="day"><span>${d}</span></div>`;lastDay=d;lastSender=''}
    if(m.body.t==='sys'){html+=`<div class="sys">${esc(m.body.text)}</div>`;lastSender='';continue}
    const first=m.sender!==lastSender;lastSender=m.sender;
    let read='';if(m.mine&&others.length){const n=others.filter(o=>o.last_read&&o.last_read>=m.at).length;read=c.kind==='dm'?(n?T("已读"):T("送达")):(n?n+T("人已读"):T("送达"))}
    const prof=ST.profileOf(m.sender);
    html+=`<div class="msg ${m.mine?'me':'them'} ${first?'first':''}" data-mid="${m.id}">${!m.mine?(first?avatar(prof.avatar,ST.nameOf(m.sender),'xs sticker'):'<span class="av-sp"></span>'):''}
     <div class="mcol">${!m.mine&&first&&c.kind==='group'?`<span class="mname">${esc(ST.nameOf(m.sender))}</span>`:''}
     <div class="bubble b-${m.body.t}">${m.body.reply?`<div class="quote"><b>${esc(m.body.reply.s)}</b>${esc(m.body.reply.p)}</div>`:''}${bodyHtml(m)}</div>
     <span class="mmeta">${m.exp?ic('timer'):''}${hm(m.at)}${read?' · '+read:''}</span></div></div>`}
  el.innerHTML=html;
  if(toBottom||near)el.scrollTop=el.scrollHeight;
  el.querySelectorAll('.msg').forEach(bindMsg);
  el.querySelectorAll('img.lazy').forEach(i=>i.onload=()=>{if(toBottom||near)el.scrollTop=el.scrollHeight});
}
function bodyHtml(m){const b=m.body;
  if(b.t==='text')return`<p>${linkify(esc(b.text))}</p>`;
  if(b.t==='img')return`<button class="media" data-act="view" data-mid="${m.id}" style="aspect-ratio:${b.w&&b.h?b.w+'/'+b.h:'4/3'}"><img class="lazy" src="${esc(b.thumb||'')}${T("\" alt=\"图片\">")}</button>`;
  if(b.t==='video')return`<button class="media vid" data-act="view" data-mid="${m.id}" style="aspect-ratio:${b.w&&b.h?b.w+'/'+b.h:'16/9'}">${b.thumb?`<img src="${esc(b.thumb)}${T("\" alt=\"视频\">")}`:''}<span class="playb">${ic('play')}</span>${b.dur?`<em>${Math.floor(b.dur/60)}:${pad(b.dur%60)}</em>`:''}</button>`;
  if(b.t==='voice'){const bars=Array.from({length:22},(_,i)=>{const v=(parseInt(m.id.replace(/-/g,'').slice(i%30,i%30+2),16)||90)%70+30;return`<i style="height:${v}%"></i>`}).join('');
    return`<button class="voice" data-act="play" data-mid="${m.id}"><span class="vp">${ic('play')}</span><span class="wave">${bars}</span><em>${b.dur||0}″</em></button>`}
  if(b.t==='file')return`<button class="filecard" data-act="dlfile" data-mid="${m.id}"><span class="fic">${esc(((b.blob.name||'').split('.').pop()||'FILE').slice(0,4).toUpperCase())}</span><span class="fmeta"><b>${esc(b.blob.name||T("文件"))}</b><small>${fsize(b.blob.size)} ${T("· 点击解密下载")}</small></span></button>`;
  if(b.t==='locked')return`<p class="muted">${T("🔒 这条消息无法解密（可能是加入前的旧密钥）")}</p>`;
  return'';
}
const linkify=s=>s.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g,'<br>');
function bindMsg(el){let t=null;const open=()=>msgMenu(el.dataset.mid);
  el.oncontextmenu=e=>{e.preventDefault();open()};
  el.addEventListener('touchstart',()=>{t=setTimeout(()=>{t=null;open()},480)},{passive:true});
  ['touchend','touchmove','touchcancel'].forEach(ev=>el.addEventListener(ev,()=>{clearTimeout(t)},{passive:true}))}
function curMsg(id){const c=ST.convs.get(ui.open);return[c,c&&c.msgs.find(m=>m.id===id)]}
function msgMenu(id){const [c,m]=curMsg(id);if(!m||m.body.t==='sys')return;
  const s=sheet(`<div class="mm-prev">${esc(ST.preview(m.body)).slice(0,80)}</div><div class="mm">
   <button data-a="reply">${ic('back')}${T("回复")}</button>${m.body.t==='text'?`<button data-a="copy">${ic('file')}${T("复制")}</button>`:''}<button data-a="fav">${ic('star')}${T("收藏")}</button>
   <button data-a="me">${ic('x')}${T("仅在我这里删除")}</button>${m.mine||c.isAdmin?`<button data-a="all" class="danger">${ic('x')}${T("为所有人删除")}</button>`:''}</div>
   <p class="fine">${T("为所有人删除会从服务器真正删除这条消息和附件，并让对方界面同步移除；但无法阻止对方之前截图或另存。")}</p>`,'small');
  s.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{closeSheet();const a=b.dataset.a;
    if(a==='reply'){ui.reply={id:m.id,s:ST.nameOf(m.sender),p:ST.preview(m.body).slice(0,60)};renderReply();$('#txt').focus()}
    if(a==='copy'){await navigator.clipboard.writeText(m.body.text).catch(()=>{});toast(T("已复制"))}
    if(a==='fav')await guard(()=>ST.addFav(c,m)).then(()=>toast(T("已收藏 ✦")));
    if(a==='me')ST.deleteForMe(c,[m.id]);
    if(a==='all')await guard(()=>ST.deleteForAll(c,[m.id]),T("正在删除…"))})}
function renderReply(){const el=$('#replybar');if(!el)return;if(!ui.reply){el.innerHTML='';el.classList.remove('on');return}
  el.classList.add('on');el.innerHTML=`<div><b>${T("回复")} ${esc(ui.reply.s)}</b><span>${esc(ui.reply.p)}</span></div><button class="ibtn" data-act="cancel-reply">${ic('x')}</button>`}
async function doSend(){const c=ST.convs.get(ui.open);const tx=$('#txt');const v=tx.value.trim();if(!v||!c)return;
  const body={t:'text',text:v};if(ui.reply){body.reply={id:ui.reply.id,s:ui.reply.s,p:ui.reply.p};ui.reply=null;renderReply()}
  tx.value='';tx.style.height='auto';if(ui.draft)ui.draft[c.id]='';
  try{await ST.send(c,body)}catch(e){toast(T("发送失败：")+e.message,'err');tx.value=v}}
async function sendMedia(kind){const c=ST.convs.get(ui.open);
  const f=await pickFile(kind==='media'?'image/*,video/*':kind==='camera'?'image/*':'',kind==='camera'?'environment':'');if(!f)return;
  await guard(async()=>{let k='file',extra={};
    if(f.type.startsWith('image/')&&kind!=='file'){k='img';try{extra=await imgThumb(f)}catch(e){}}
    else if(f.type.startsWith('video/')&&kind!=='file'){k='video';extra=await videoThumb(f)}
    await ST.sendFile(c,f,k,extra)},T("正在加密上传…"))}
// ---------- 语音 ----------
async function startVoice(){const c=ST.convs.get(ui.open);if(ui.rec)return;
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}catch(e){return toast(T("没有麦克风权限"),'err')}
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t))||'';
  const rec=new MediaRecorder(stream,mime?{mimeType:mime}:{});const chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  const t0=Date.now();ui.rec={rec,stream,cancel:false};rec.start(250);
  const bar=$('#composer');bar.classList.add('recording');const old=bar.innerHTML;
  bar.innerHTML=`<button class="ibtn" id="rc">${ic('x')}</button><div class="recbox"><span class="dot"></span><b id="rt">0″</b><span>${T("正在录音，加密后发送")}</span></div><button class="sendb" id="rs">${isOffice()?'SEND':''}${ic('send')}</button>`;
  const iv=setInterval(()=>{const e=$('#rt');if(e)e.textContent=Math.round((Date.now()-t0)/1000)+'″';if(Date.now()-t0>300000)$('#rs').click()},300);
  const stop=cancel=>new Promise(res=>{ui.rec.cancel=cancel;rec.onstop=res;rec.stop();stream.getTracks().forEach(t=>t.stop());clearInterval(iv)});
  $('#rc').onclick=async()=>{await stop(true);ui.rec=null;renderPane()};
  $('#rs').onclick=async()=>{await stop(false);ui.rec=null;const dur=Math.max(1,Math.round((Date.now()-t0)/1000));const blob=new Blob(chunks,{type:rec.mimeType||mime||'audio/webm'});
    renderPane();const f=new File([blob],'voice.'+(blob.type.includes('mp4')?'m4a':'webm'),{type:blob.type});await guard(()=>ST.sendFile(c,f,'voice',{dur}),T("正在加密发送…"))};
}
let audio=null;
async function playVoice(id,btn){const [,m]=curMsg(id);if(!m)return;
  if(audio&&audio._id===id&&!audio.paused){audio.pause();return}
  if(audio)audio.pause();btn.classList.add('loading');
  try{const u=await ST.blobUrl(m.body.blob);audio=new Audio(u);audio._id=id;
    audio.onplay=()=>{btn.classList.add('playing');btn.querySelector('.vp').innerHTML=ic('pause')};audio.onpause=audio.onended=()=>{btn.classList.remove('playing');btn.querySelector('.vp').innerHTML=ic('play')};await audio.play()}
  catch(e){toast(T("播放失败：")+e.message,'err')}finally{btn.classList.remove('loading')}}
async function viewMedia(id){const [,m]=curMsg(id);if(!m)return;const b=m.body;
  const s=sheet(`<div class="viewer"><div class="vbox">${b.thumb?`<img src="${esc(b.thumb)}" class="blur">`:''}<div class="vload">${T("正在解密…")}</div></div><div class="row-btns"><button class="btn ghost" data-act="close-sheet">${T("关闭")}</button><button class="btn" id="vdl">${T("保存到本机")}</button></div></div>`,'full');
  try{const u=await ST.blobUrl(b.blob);const box=s.querySelector('.vbox');box.innerHTML=b.t==='video'?`<video src="${u}" controls autoplay playsinline></video>`:`<img src="${u}" alt="">`;
    s.querySelector('#vdl').onclick=()=>{const a=document.createElement('a');a.href=u;a.download=b.blob.name||('hush-'+Date.now()+(b.t==='video'?'.mp4':'.jpg'));a.click()}}
  catch(e){s.querySelector('.vload').textContent=T("解密失败：")+e.message}}
async function dlFile(id){const [,m]=curMsg(id);if(!m)return;await guard(async()=>{const u=await ST.blobUrl(m.body.blob);const a=document.createElement('a');a.href=u;a.download=m.body.blob.name||'file';document.body.appendChild(a);a.click();a.remove()},T("正在解密…"))}
// ---------- 会话详情 ----------
function infoSheet(){const c=ST.convs.get(ui.open);if(!c)return;const t=ST.convTitle(c);const grp=c.kind==='group';
  const s=sheet(`${sheetHead(grp?T("群聊详情"):T("聊天详情"))}
   <div class="info-top">${grp?`<button class="avbtn" data-a="gav">${avatar(c.meta.avatar,t,'xl sticker')}<span>${T("换头像")}</span></button>`:avatar(ST.convAvatar(c),t,'xl sticker')}
    <div><h3>${esc(t)}</h3>${grp?`<button class="btn sm ghost" data-a="rename">${T("修改群名")}</button>`:`<p class="fine">${esc((ST.profileOf(ST.peerOf(c))||{}).bio||'')}</p>`}</div></div>
   <div class="menu card">
    ${!grp?`<button data-a="safety">${ic('shield')}<span>${T("核对安全码")}</span><em>${isVerified(c)?T("已核对 ✓"):T("防冒充")}</em></button>`:''}
    <button data-a="ttl">${ic('timer')}<span>${T("阅后即焚")}</span><em>${c.meta.ttl?ttlLabel(c.meta.ttl)+T("后自动删除"):T("关闭")}</em></button>
    <button data-a="clear">${ic('x')}<span>${c.isAdmin?T("清空聊天记录（所有人）"):T("删除我发过的全部消息")}</span><em></em></button>
    <button data-a="leave" class="danger">${ic('back')}<span>${grp?T("退出群聊"):T("删除对话")}</span><em></em></button></div>
   ${grp?`<h4 class="sec">${T("成员")} ${c.members.length}${c.isAdmin?T("<button class=\"btn sm\" data-a=\"addm\">+ 邀请</button>"):''}</h4><ul class="mlist">${c.members.map(m=>`<li>${avatar((ST.profileOf(m.user_id)||{}).avatar,ST.nameOf(m.user_id),'sm sticker')}<b>${esc(ST.nameOf(m.user_id))}</b>${m.role==='admin'?T("<span class=\"pill\">管理员</span>"):''}
     ${m.user_id!==ST.me.id?`<button class="btn sm ghost" data-a="msafety" data-u="${m.user_id}${T("\">安全码")}</button>${c.isAdmin?`<button class="btn sm ghost" data-a="kick" data-u="${m.user_id}${T("\">移出")}</button>`:''}`:T("<span class=\"pill\">我</span>")}</li>`).join('')}</ul>`:''}`);
  s.onclick=async e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
    if(a==='rename'){const v=await promptBox(T("修改群名"),T("群名（会加密保存）"),c.meta.name);if(v!=null){await guard(async()=>{await ST.updateMeta(c,{name:v.trim().slice(0,40)});await ST.send(c,{t:'sys',text:(ST.me.profile.name||T("我"))+T(" 把群名改成了\"")+v.trim().slice(0,40)+'"'})});renderPane();infoSheet()}}
    if(a==='gav'){const f=await pickFile('image/*');if(f){await guard(async()=>{const {thumb}=await imgThumb(f,256,.8);await ST.updateMeta(c,{avatar:thumb});await ST.send(c,{t:'sys',text:(ST.me.profile.name||T("我"))+T(" 更换了群头像")})});renderPane();infoSheet()}}
    if(a==='ttl')ttlSheet(c);
    if(a==='safety')safetySheet(ST.peerOf(c));if(a==='msafety')safetySheet(b.dataset.u);
    if(a==='clear'&&await confirmBox(T("清空聊天记录"),c.isAdmin?T("会从服务器上真正删除这个对话里所有人的全部消息和附件，无法恢复。"):T("会从服务器上删除你在这里发过的全部消息和附件。"),T("清空"),true)){await guard(()=>ST.clearConv(c),T("正在清除…"));renderPane()}
    if(a==='leave'&&await confirmBox(grp?T("退出群聊"):T("删除对话"),grp?T("退出后你将无法再看到新消息。"):T("会删除双方服务器上的整段对话（包括附件），对方那边也会消失。"),grp?T("退出"):T("删除"),true)){await guard(()=>ST.leaveConv(c),T("正在处理…"));ui.open=null;closeSheet();renderMain()}
    if(a==='addm')pickMembers(T("邀请成员"),c.members.map(m=>m.user_id),async ids=>{await guard(()=>ST.addMembers(c,ids),T("正在分发群密钥…"));infoSheet()});
    if(a==='kick'&&await confirmBox(T("移出成员"),T("移出 ")+esc(ST.nameOf(b.dataset.u))+T(" 后会自动更换群密钥，TA 看不到之后的消息。"),T("移出"),true)){await guard(()=>ST.removeMember(c,b.dataset.u),T("正在更换群密钥…"));infoSheet()}
  }}
function ttlSheet(c){const opts=[[0,T("关闭")],[30,T("30 秒")],[300,T("5 分钟")],[3600,T("1 小时")],[86400,T("1 天")],[604800,T("7 天")]];
  const s=sheet(`${sheetHead(T("阅后即焚"),T("开启后，新消息到时间会从服务器和所有人的界面上自动删除"))}<div class="opts">${opts.map(([v,l])=>`<button class="${(+c.meta.ttl||0)===v?'on':''}" data-v="${v}">${l}</button>`).join('')}</div>`,'small');
  s.querySelectorAll('[data-v]').forEach(b=>b.onclick=async()=>{const v=+b.dataset.v;closeSheet();await guard(async()=>{await ST.updateMeta(c,{ttl:v});await ST.send(c,{t:'sys',text:(ST.me.profile.name||T("我"))+(v?T(" 开启了阅后即焚（")+ttlLabel(v)+T("）"):T(" 关闭了阅后即焚"))})});renderPane()})}
async function safetySheet(uid){await ST.ensureAccounts([uid]).catch(()=>{});const a=ST.accounts.get(uid);if(!a)return toast(T("拿不到对方公钥"),'err');
  const code=await HC.safetyCode(ST.me.pub,a.pub_ecdh);const ok=localStorage.getItem('hush-ver-'+uid)===a.pub_ecdh.slice(-24);
  const s=sheet(`${sheetHead(T("核对安全码"),T("和 ")+ST.nameOf(uid)+T(" 当面或打电话对一下"))}<div class="scode">${code.map(x=>`<span>${x}</span>`).join('')}</div>
   <p class="sh-text">${T("双方看到的数字完全一样，就说明你们之间没有人冒充或被中间人截获。数字变了，代表对方换了账号或者有问题。")}</p>
   <div class="row-btns"><button class="btn ghost" data-act="close-sheet">${T("关闭")}</button><button class="btn" id="ver">${ok?T("取消已核对"):T("标记为已核对")}</button></div>`,'small');
  s.querySelector('#ver').onclick=()=>{if(ok)localStorage.removeItem('hush-ver-'+uid);else localStorage.setItem('hush-ver-'+uid,a.pub_ecdh.slice(-24));closeSheet();toast(ok?T("已取消"):T("已标记为已核对 ✓"));renderPane()}}
function contacts(){const m=new Map();for(const c of ST.convs.values())for(const x of c.members)if(x.user_id!==ST.me.id)m.set(x.user_id,1);return[...m.keys()]}
function pickMembers(title,exclude,cb,withName){const list=contacts().filter(u=>!exclude.includes(u));
  const s=sheet(`${sheetHead(title)}${withName?`<label class="fld"><span>${T("群名（加密保存）")}</span><input id="gname" placeholder="${T('比如：秘密基地')}"></label>`:''}
   ${list.length?`<ul class="mlist pick">${list.map(u=>`<li><label>${avatar(ST.profileOf(u).avatar,ST.nameOf(u),'sm sticker')}<b>${esc(ST.nameOf(u))}</b><input type="checkbox" value="${u}"><i class="ck"></i></label></li>`).join('')}</ul>`:T("<p class=\"sh-text\">还没有联系人。先通过邀请码添加好友，再来建群。</p>")}
   <div class="row-btns"><button class="btn ghost" data-act="close-sheet">${T("取消")}</button><button class="btn" id="pk">${T("确定")}</button></div>`);
  s.querySelector('#pk').onclick=async()=>{const ids=[...s.querySelectorAll('input[type=checkbox]:checked')].map(i=>i.value);if(!ids.length&&!withName)return toast(T("至少选一个人"));const n=withName?s.querySelector('#gname').value.trim():'';closeSheet();await cb(ids,n)}}
// ---------- 个人资料 / 设置 ----------
function profileSheet(){const p=ST.me.profile;let av=p.avatar||'';
  const s=sheet(`${sheetHead(T("编辑资料"),T("昵称、签名、头像都会加密，只有和你聊天的人能看到"))}<div class="info-top"><button class="avbtn" id="pav">${avatar(av,p.name||T("我"),'xl sticker')}<span>${T("换头像")}</span></button></div>
   <label class="fld"><span>${T("昵称")}</span><input id="pn" maxlength="24" value="${esc(p.name)}"></label><label class="fld"><span>${T("签名")}</span><input id="pb2" maxlength="60" value="${esc(p.bio)}"></label>
   <div class="row-btns"><button class="btn ghost" data-act="close-sheet">${T("取消")}</button><button class="btn" id="psv">${T("保存")}</button></div>`);
  s.querySelector('#pav').onclick=async()=>{const f=await pickFile('image/*');if(!f)return;av=(await imgThumb(f,256,.8)).thumb;s.querySelector('#pav').innerHTML=avatar(av,'','xl sticker')+T("<span>换头像</span>")};
  s.querySelector('#psv').onclick=async()=>{await guard(()=>ST.saveProfile({name:s.querySelector('#pn').value.trim(),bio:s.querySelector('#pb2').value.trim(),avatar:av}),T("正在加密保存…"));closeSheet();toast(T("已保存"));renderSide()}}
function addFriendSheet(prefill=''){const s=sheet(`${sheetHead(T("添加好友"),T("输入对方的 8 位邀请码"))}<label class="fld"><span>${T("邀请码")}</span><input id="hc" maxlength="9" value="${esc(prefill)}" placeholder="ABCD EFGH" autocapitalize="characters"></label>
  <p class="fine">${T("我的邀请码：")}<b>${ST.me.handle}</b></p><div class="row-btns"><button class="btn ghost" data-act="close-sheet">${T("取消")}</button><button class="btn" id="hcgo">${T("建立加密对话")}</button></div>`,'small');
  const go=async()=>{const v=s.querySelector('#hc').value;const c=await guard(()=>ST.addContact(v),T("正在交换密钥…"));if(c){closeSheet();openConv(c.id)}};s.querySelector('#hcgo').onclick=go;s.querySelector('#hc').onkeydown=e=>e.key==='Enter'&&go()}
function aboutSheet(){sheet(`${sheetHead(T("加密说明与局限"))}<div class="about">
 <h4>${T("保护了什么")}</h4><ul><li>${T("消息、图片、视频、语音、文件、昵称、头像、群名，全部在你的设备上用 AES-256-GCM 加密后才上传。")}</li><li>${T("每个人有自己的 P-256 密钥对；私钥用主密码（PBKDF2")} ${HC.ITERS.toLocaleString()} ${T("次）派生的密钥锁住后才存到云端，所以换设备输入同一密码就能用。")}</li><li>${T("登录用的口令也是从主密码派生出来的另一段，服务器拿到它也算不出你的加密密钥。")}</li><li>${T("移出群成员会自动更换群密钥。")}</li></ul>
 <h4>${T("做不到的")}</h4><ul><li>${T("服务器能看到：谁和谁在一个对话里、消息的时间和大小。")}</li><li>${T("对方设备上的内容、截图、录屏，任何聊天软件都拦不住。")}</li><li>${T("这是网页应用：如果有人控制了托管代码的 GitHub 账号，理论上可以改代码偷看。")}</li><li>${T("没有像 Signal 那样的\"前向保密\"，也没有经过专业安全审计。防专业攻击者请用 Signal。")}</li><li>${T("主密码忘了就永远打不开，任何人都救不回来。")}</li></ul></div>`)}
function backupSheet(){const s=sheet(`${sheetHead(T("导出加密备份"),T("备份文件用你的主密码加密，只有用同一账号和密码才能打开"))}<label class="chk"><input type="checkbox" id="bm" checked><span>${T("包含图片、语音、文件（单个 20MB 以内）")}</span></label>
 <p class="fine">${T("注意：之后修改主密码，旧备份仍需要用旧密码打开。")}</p><div class="row-btns"><button class="btn ghost" data-act="close-sheet">${T("取消")}</button><button class="btn" id="bgo">${T("导出")}</button></div>`,'small');
  s.querySelector('#bgo').onclick=async()=>{const wm=s.querySelector('#bm').checked;closeSheet();const blob=await guard(()=>ST.exportBackup(wm),T("正在加密打包…"));if(!blob)return;
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);const d=new Date();a.download=`hush-backup-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}.hush`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast(T("备份已导出（加密文件）"))}}
async function restoreFlow(){const f=await pickFile('.hush,application/octet-stream,application/json');if(!f)return;const text=await f.text();
  let data=null;try{data=await ST.importBackup(text)}catch(e){const pw=await promptBox(T("输入导出时的主密码"),T("这个备份不是用当前密码加密的"),'', 'password');if(!pw)return;data=await guard(()=>ST.importBackup(text,ST.me.email,pw),T("正在解密…"))}
  if(!data)return;ui.archive=data;archiveSheet()}
function archiveSheet(i){const d=ui.archive;if(i==null){sheet(`${sheetHead(T("备份内容"),`${T("导出于")} ${new Date(d.at).toLocaleString(LOC())}`)}<p class="fine">${T("备份只在本机内存里解密查看，关掉就消失。")}</p><ul class="clist arch">${d.convs.map((c,i)=>`<li class="citem" data-ai="${i}">${avatar('',c.title,'sticker')}<div class="cmain"><div class="crow"><b>${esc(c.title)}</b><time>${c.msgs.length} ${T("条")}</time></div><div class="crow"><p>${esc(c.members.join(T("、")))}</p></div></div></li>`).join('')}</ul>${d.favs.length?`<p class="fine">${T("另含")} ${d.favs.length} ${T("条收藏")}</p>`:''}`);
   $$('[data-ai]').forEach(el=>el.onclick=()=>archiveSheet(+el.dataset.ai));return}
  const c=d.convs[i];const urlOf=b=>{const s=d.media&&d.media[b.p];return s?URL.createObjectURL(new Blob([HC.ub64(s)],{type:b.mime})):null};
  sheet(`${sheetHead(c.title,T("备份 · 只读"))}<div class="msgs arch-msgs">${c.msgs.map(m=>{const b=m.body;let inner='';
    if(b.t==='text'||b.t==='sys')inner=`<p>${esc(b.text)}</p>`;else{const u=b.blob&&urlOf(b.blob);inner=b.t==='img'&&(u||b.thumb)?`<img src="${u||b.thumb}" style="max-width:220px;border-radius:12px">`:b.t==='voice'&&u?`<audio controls src="${u}"></audio>`:b.t==='video'&&u?`<video controls src="${u}" style="max-width:240px"></video>`:u?`<a download="${esc(b.blob.name||'file')}" href="${u}">${esc(ST.preview(b))}</a>`:`<p>${esc(ST.preview(b))}</p>`}
    return`<div class="msg ${m.mine?'me':'them'} first"><div class="mcol"><span class="mname">${esc(m.s)}</span><div class="bubble">${inner}</div><span class="mmeta">${dayLabel(m.at)} ${hm(m.at)}</span></div></div>`}).join('')}</div><div class="row-btns"><button class="btn ghost" id="abk">${T("返回列表")}</button></div>`,'full').querySelector('#abk').onclick=()=>archiveSheet()}
async function wipeFlow(){
  if(!await confirmBox(T("彻底销毁账号"),T("将会：<br>· 删除你在服务器上的全部消息、附件、对话、收藏、密钥和登录账号本身<br>· 一对一对话整段删除（对方那边也会消失）<br>· 清空这台设备上的所有缓存和数据<br><br><b>不可恢复。</b>对方之前的截图或另存的文件无法删除。"),T("继续"),true))return;
  const v=await promptBox(T("最后确认"),T("请输入\"彻底销毁\"四个字"));if(!v||![T("彻底销毁"),"彻底销毁","完全に消去"].includes(v.trim()))return toast(T("已取消"));
  let authGone=true;await guard(async()=>{authGone=await ST.wipeAccount();},T("正在销毁…"));if(!ST.me){document.body.innerHTML=T("<div class=\"gone\"><h2>已彻底销毁</h2><p>")+(authGone?T("服务器和本机都已清除。"):T("聊天数据已全部清除；登录账号本身需要在 Supabase 后台手动删除。"))+'</p></div>';setTimeout(()=>location.replace(location.pathname),2500)}}
async function changePwFlow(){const s=sheet(`${sheetHead(T("修改主密码"),T("会用新密码重新锁住你的私钥"))}<label class="fld"><span>${T("原密码")}</span><input id="op" type="password"></label><label class="fld"><span>${T("新密码（至少 10 位）")}</span><input id="np" type="password"></label><label class="fld"><span>${T("再输一次")}</span><input id="np2" type="password"></label>
  <div class="row-btns"><button class="btn ghost" data-act="close-sheet">${T("取消")}</button><button class="btn" id="cpgo">${T("修改")}</button></div>`,'small');
  s.querySelector('#cpgo').onclick=async()=>{const o=s.querySelector('#op').value,n=s.querySelector('#np').value;if(n.length<10)return toast(T("新密码至少 10 位"),'err');if(n!==s.querySelector('#np2').value)return toast(T("两次不一样"),'err');
    closeSheet();const ok=await guard(async()=>{await ST.changePassword(o,n);return true},T("正在重新加密密钥…"));if(ok)toast(T("主密码已修改"))}}
// ---------- 打开对话 / 提醒 ----------
function openConv(id){ui.open=id;ui.cq='';ui.reply=null;ui.tab='chats';if(!$('.shell'))renderMain();else{renderSide();renderPane()}}
function incoming({c,m}){
  const visible=document.visibilityState==='visible';
  if(visible&&ui.open===c.id){ST.markRead(c);return}
  const title=c.kind==='group'?ST.convTitle(c):ST.nameOf(m.sender);
  const text=S.peek?(c.kind==='group'?ST.nameOf(m.sender)+T("："):'')+ST.preview(m.body):T("你有一条新消息");
  if(visible){const t=document.createElement('div');t.className='banner';t.innerHTML=`${avatar(ST.convAvatar(c),title,'sm sticker')}<div><b>${esc(title)}</b><p>${esc(text)}</p></div>`;t.onclick=()=>{t.remove();openConv(c.id)};
    $('#toasts').appendChild(t);setTimeout(()=>t.classList.add('out'),4200);setTimeout(()=>t.remove(),4600);try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}}
  else if('Notification' in window&&Notification.permission==='granted'){navigator.serviceWorker.ready.then(r=>r.showNotification(T("悄悄话"),{body:T("你有一条新消息"),tag:'hush-'+c.id,icon:'icons/icon-192.png',badge:'icons/badge.png',data:{conv:c.id}})).catch(()=>{})}
}
// ---------- 全局事件 ----------
const ACT={
  'close-sheet':closeSheet,'auth-mode':b=>renderAuth(b.dataset.v),
  theme:b=>{S.theme=b.dataset.v;applyTheme();rerender()},lang:b=>{setLang(b.dataset.v);rerender()},
  tab:b=>{ui.tab=b.dataset.v;renderSide();$$('.tabs button').forEach(x=>x.classList.toggle('on',x.dataset.v===ui.tab));$('#side').scrollTop=0},
  open:b=>openConv(b.dataset.id),back:()=>{ui.open=null;renderPane();renderSide()},
  'new-menu':()=>{const s=sheet(`${sheetHead(T("新建"))}<div class="mm big"><button data-a="f">${ic('me')}<span><b>${T("添加好友")}</b><small>${T("用邀请码建立一对一加密对话")}</small></span></button><button data-a="g">${ic('users')}<span><b>${T("创建群聊")}</b><small>${T("群密钥分别加密发给每位成员")}</small></span></button></div>`,'small');
    s.querySelector('[data-a=f]').onclick=()=>addFriendSheet();s.querySelector('[data-a=g]').onclick=()=>pickMembers(T("创建群聊"),[],async(ids,name)=>{const c=await guard(()=>ST.createConv('group',ids,{name:name||'',avatar:'',ttl:0}),T("正在生成群密钥…"));if(c){await ST.send(c,{t:'sys',text:(ST.me.profile.name||T("我"))+T(" 创建了群聊")}).catch(()=>{});openConv(c.id)}},true)},
  'add-friend':()=>addFriendSheet(),send:doSend,
  attach:()=>{const s=sheet(`<div class="mm big"><button data-a="media">${ic('img')}<span><b>${T("图片 / 视频")}</b><small>${T("加密后上传，服务器看不到")}</small></span></button><button data-a="camera">${ic('camera')}<span><b>${T("拍照")}</b><small>${T("直接拍一张发送")}</small></span></button><button data-a="file">${ic('file')}<span><b>${T("文件")}</b><small>${T("任意格式，")}${CFG.MAX_FILE_MB}${T("MB 以内")}</small></span></button></div>`,'small');
    s.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{closeSheet();sendMedia(b.dataset.a)})},
  voice:startVoice,'cancel-reply':()=>{ui.reply=null;renderReply()},
  'chat-search':()=>{const el=$('.csearch');el.classList.toggle('on');if(el.classList.contains('on'))$('#cq').focus();else{ui.cq='';$('#cq').value='';renderMsgs(true)}},
  info:infoSheet,view:b=>viewMedia(b.dataset.mid),play:b=>playVoice(b.dataset.mid,b),dlfile:b=>dlFile(b.dataset.mid),
  'copy-fav':b=>{const f=ST.favs.find(x=>x.id===b.dataset.id);navigator.clipboard.writeText(f.data.body.text).then(()=>toast(T("已复制")))},
  'del-fav':b=>guard(()=>ST.delFav(b.dataset.id)),
  'edit-profile':profileSheet,'copy-code':()=>navigator.clipboard.writeText(ST.me.handle).then(()=>toast(T("邀请码已复制"))),
  'copy-link':()=>navigator.clipboard.writeText(location.origin+location.pathname+'?add='+ST.me.handle).then(()=>toast(T("邀请链接已复制"))),
  notify:async()=>{try{const r=await ST.enablePush();toast(r==='push'&&CFG.PUSH_READY?T("已开启推送提醒（锁屏也能收到）"):T("已开启提醒（app 在后台打开时提醒）"));
    if(/iP(hone|ad)/.test(navigator.userAgent)&&!navigator.standalone)toast(T("iPhone 需要先\"添加到主屏幕\"，从主屏幕打开才能收到推送"))}catch(e){toast(e.message,'err')}renderSide()},
  autolock:()=>{const s=sheet(`${sheetHead(T("自动上锁"),T("无操作或切到后台超过这个时间，就清除内存里的密钥"))}<div class="opts">${[[1,T("1 分钟")],[5,T("5 分钟")],[15,T("15 分钟")],[60,T("1 小时")],[0,T("关闭")]].map(([v,l])=>`<button class="${S.lockMin===v?'on':''}" data-v="${v}">${l}</button>`).join('')}</div>`,'small');
    s.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{S.lockMin=+b.dataset.v;closeSheet();renderSide()})},
  peek:()=>{S.peek=!S.peek;renderSide()},
  'my-fp':async()=>{const fp=await HC.fingerprint(ST.me.pub);sheet(`${sheetHead(T("我的密钥指纹"))}<div class="scode fp">${fp.split(' ').map(x=>`<span>${x}</span>`).join('')}</div><p class="sh-text">${T("这是你公钥的指纹。和好友核对安全码时，用的就是你们俩的公钥。")}</p>`,'small')},
  'change-pw':changePwFlow,'lock-now':()=>ST.lock(),backup:backupSheet,restore:restoreFlow,about:aboutSheet,wipe:wipeFlow,
  logout:async()=>{if(await confirmBox(T("退出登录"),T("会清空这台设备上的缓存数据。服务器上的加密内容还在，用同一密码登录即可恢复。"),T("退出"))){await ST.signOut();await ST.wipeLocal();location.replace(location.pathname)}}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const f=ACT[b.dataset.act];if(f){e.preventDefault();f(b)}});
function rerender(){if(ST.me)renderMain();else if(ST.locked)renderLock();else renderAuth(ui.authMode||'in')}
ST.on((what,data)=>{
  if(what==='login'){closeSheet();renderMain();const add=new URLSearchParams(location.search).get('add');if(add){history.replaceState(null,'',location.pathname+location.search.replace(/[?&]add=[^&]+/,'').replace(/^&/,'?'));addFriendSheet(add)}
    else if(data&&data.isNew)setTimeout(profileSheet,300)}
  if(what==='lock'){closeSheet();renderLock()}
  if(what==='logout')renderAuth('in');
  if(!ST.me)return;
  if(what==='convs'||what==='favs'||what==='profile'||what==='rt'){renderSide();if(what==='convs'){if(ui.open&&!ST.convs.has(ui.open)){ui.open=null;renderPane()}else if(ui.open){const h=$('.chat-title b');if(h)h.textContent=ST.convTitle(ST.convs.get(ui.open))}}}
  if(what==='msgs'){renderSide();if(data&&data.id===ui.open)renderMsgs(false)}
  if(what==='incoming')incoming(data);
  if(what==='kicked'&&ui.open===data){ui.open=null;renderPane();toast(T("你已被移出这个对话"))}
});
// 自动上锁 + 切后台模糊
let lastAct=Date.now(),hiddenAt=0;['pointerdown','keydown','touchstart'].forEach(e=>addEventListener(e,()=>lastAct=Date.now(),{passive:true}));
setInterval(()=>{if(ST.me&&S.lockMin&&Date.now()-lastAct>S.lockMin*60000&&!ui.rec)ST.lock()},10000);
document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('privacy',document.hidden);
  if(document.hidden)hiddenAt=Date.now();else{if(ST.me&&S.lockMin&&hiddenAt&&Date.now()-hiddenAt>S.lockMin*60000)ST.lock();lastAct=Date.now();const c=ui.open&&ST.convs.get(ui.open);if(c&&ST.me)ST.markRead(c)}});
navigator.serviceWorker&&navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.open&&ST.me&&ST.convs.has(e.data.open))openConv(e.data.open)});
window.HUI={openConv,toast};
// ---------- 启动 ----------
(async()=>{applyTheme();
  if('serviceWorker' in navigator&&!/[?&]nosw=1/.test(location.search))navigator.serviceWorker.register('sw.js').catch(()=>{});
  const u=await window.Backend.currentUser().catch(()=>null);
  if(u){ST.locked=true;renderLock()}else renderAuth(new URLSearchParams(location.search).get('add')?'up':'in');
  const open=new URLSearchParams(location.search).get('open');if(open)ui.open=open;
})();
})();
