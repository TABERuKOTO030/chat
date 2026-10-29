// 业务核心：账号、会话密钥、消息收发、媒体、收藏、备份、销毁。明文只存在于内存中。
(function(){
const B=window.Backend,CFG=window.HUSH_CONFIG;
const uuid=()=>crypto.randomUUID();
const st=window.ST={me:null,convs:new Map(),accounts:new Map(),favs:[],blobUrls:new Map(),hidden:new Set(JSON.parse(localStorage.getItem('hush-hidden')||'[]')),listeners:new Set(),rt:'idle'};
const emit=(what,data)=>st.listeners.forEach(f=>{try{f(what,data)}catch(e){console.error(e)}});
const HANDLE_CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newHandle=()=>Array.from(HC.rnd(8),b=>HANDLE_CH[b%HANDLE_CH.length]).join('');
// ---------- 账号 ----------
async function signUp(email,password){
  const m=await HC.deriveMaster(email,password);
  await B.signUp(email,m.auth);
  return finishLogin(email,m,true);
}
async function signIn(email,password){
  const m=await HC.deriveMaster(email,password);
  await B.signIn(email,m.auth);
  return finishLogin(email,m,false);
}
async function unlock(password){
  const u=await B.currentUser();if(!u)throw new Error('登录已过期，请重新登录');
  const m=await HC.deriveMaster(u.email,password);
  const sec=await B.getSecret();if(!sec)throw new Error('账号数据不存在');
  try{await HC.unwrapPriv(m.kek,{iv:sec.wrap_iv,ct:sec.wrapped_priv})}catch(e){throw new Error('密码不对')}
  return finishLogin(u.email,m,false);
}
async function finishLogin(email,m,isNew){
  const u=await B.currentUser();
  let sec=await B.getSecret(),acc=await B.getAccount();
  if(!sec){ // 首次：生成身份密钥，私钥用主密码派生的 KEK 包裹后才上传
    const id=await HC.newIdentity();const w=await HC.wrapPriv(m.kek,id.pk8);id.pk8.fill(0);
    let handle;for(let i=0;i<5;i++){handle=newHandle();try{await B.putAccount({handle,pub_ecdh:id.pub},{wrapped_priv:w.ct,wrap_iv:w.iv});break}catch(e){if(i==4)throw e}}
    sec=await B.getSecret();acc=await B.getAccount();
  }
  let priv;try{priv=await HC.unwrapPriv(m.kek,{iv:sec.wrap_iv,ct:sec.wrapped_priv})}catch(e){throw new Error('密码不对（无法解开你的密钥）')}
  let profile={name:'',bio:'',avatar:''};
  if(sec.enc_profile){try{profile=await HC.decJSON(m.kek,JSON.parse(sec.enc_profile),'profile')}catch(e){}}
  st.me={id:u.id,email,handle:acc.handle,pub:acc.pub_ecdh,priv,kek:m.kek,bak:m.bak,profile};
  st.accounts.set(u.id,{id:u.id,handle:acc.handle,pub_ecdh:acc.pub_ecdh});
  localStorage.setItem('hush-email',email);
  await refresh(true);await loadFavs();
  B.subscribe(onEvent);
  emit('login',{isNew});return st.me;
}
async function saveProfile(p){
  st.me.profile={...st.me.profile,...p,pv:Date.now()};
  const box=await HC.encJSON(st.me.kek,st.me.profile,'profile');
  await B.updateSecret({enc_profile:JSON.stringify(box)});
  await Promise.all([...st.convs.values()].map(c=>publishProfile(c).catch(()=>{})));
  emit('profile');
}
async function publishProfile(c){
  const k=c.keys.get(c.key_version);if(!k)return;
  const box=await HC.encJSON(k,{name:st.me.profile.name,bio:st.me.profile.bio,avatar:st.me.profile.avatar,pv:st.me.profile.pv||0,handle:st.me.handle},'prof|'+c.id);
  await B.updateMyMember(c.id,{enc_profile:JSON.stringify({v:c.key_version,...box})});
}
async function changePassword(oldPw,newPw){
  const old=await HC.deriveMaster(st.me.email,oldPw);
  const sec=await B.getSecret();
  try{await HC.unwrapPriv(old.kek,{iv:sec.wrap_iv,ct:sec.wrapped_priv})}catch(e){throw new Error('原密码不对')}
  const pk8=await HC.aesDecRaw(old.kek,{iv:sec.wrap_iv,ct:sec.wrapped_priv},'hush-priv');
  const m=await HC.deriveMaster(st.me.email,newPw);
  const w=await HC.wrapPriv(m.kek,pk8);pk8.fill(0);
  const prof=await HC.encJSON(m.kek,st.me.profile,'profile');
  // 先改登录口令，再写回新包裹的私钥
  await B.changeAuthPw(m.auth);
  await B.updateSecret({wrapped_priv:w.ct,wrap_iv:w.iv,enc_profile:JSON.stringify(prof)});
  // 收藏也要用新密钥重新加密
  const favs=st.favs.slice();st.me.kek=m.kek;st.me.bak=m.bak;
  for(const f of favs){const box=await HC.encJSON(m.kek,f.data,'fav');await B.delFav(f.id);await B.addFav({id:f.id,ct:box.ct,iv:box.iv})}
}
function lock(){
  if(!st.me)return;
  for(const u of st.blobUrls.values())URL.revokeObjectURL(u);st.blobUrls.clear();
  st.me=null;st.convs.clear();st.favs=[];st.locked=true;emit('lock');
}
async function signOut(){lock();st.locked=false;await B.signOut();emit('logout')}
// ---------- 会话 ----------
async function ensureAccounts(ids){const miss=ids.filter(i=>!st.accounts.has(i));if(miss.length)(await B.accounts(miss)).forEach(a=>st.accounts.set(a.id,a))}
async function decodeConv(row,prev){
  const c=prev||{msgs:[],loaded:false,unread:0};
  Object.assign(c,{id:row.id,kind:row.kind,created_by:row.created_by,key_version:row.key_version,updated_at:row.updated_at,created_at:row.created_at});
  c.keys=c.keys||new Map();
  for(const k of row.keys){if(c.keys.has(k.version))continue;
    try{c.keys.set(k.version,await HC.unwrapConvKey(st.me.priv,k.by_pub,row.id,k.version,{iv:k.iv,ct:k.wrapped}))}catch(e){console.warn('unwrap fail',e)}}
  c.meta={name:'',avatar:'',ttl:0};
  if(row.enc_meta){try{const b=JSON.parse(row.enc_meta);c.meta=await HC.decJSON(c.keys.get(b.v),b,'meta|'+row.id)}catch(e){c.meta.broken=true}}
  c.members=[];
  for(const m of row.members){let profile=null;
    if(m.enc_profile){try{const b=JSON.parse(m.enc_profile);profile=await HC.decJSON(c.keys.get(b.v),b,'prof|'+row.id)}catch(e){}}
    c.members.push({user_id:m.user_id,role:m.role,last_read:m.last_read,profile,raw:m.enc_profile});}
  c.my=c.members.find(m=>m.user_id===st.me.id)||{};
  c.isAdmin=c.my.role==='admin'||c.created_by===st.me.id;
  return c;
}
let refreshing=null,again=false;
async function refresh(first){
  if(refreshing){again=true;return refreshing}
  refreshing=(async()=>{do{again=false;
    const rows=await B.myConvs();if(!st.me)return;
    await ensureAccounts([...new Set(rows.flatMap(r=>r.members.map(m=>m.user_id)))]);
    const seen=new Set();
    for(const r of rows){seen.add(r.id);const c=await decodeConv(r,st.convs.get(r.id));st.convs.set(r.id,c);
      if(!c.loaded)await loadMsgs(c);
      if(c.keys.get(c.key_version)&&(!c.my.raw||!c.my.profile||(c.my.profile.pv||0)<(st.me.profile.pv||0)||JSON.parse(c.my.raw).v!==c.key_version))publishProfile(c).catch(()=>{});}
    for(const id of [...st.convs.keys()])if(!seen.has(id))st.convs.delete(id);
  }while(again);})().finally(()=>{refreshing=null;emit('convs')});
  return refreshing;
}
let rT=null;const softRefresh=()=>{clearTimeout(rT);rT=setTimeout(()=>refresh(),250)};
async function decodeMsg(c,row){
  const m={id:row.id,conv:c.id,sender:row.sender_id,at:row.created_at,exp:row.expires_at,mine:row.sender_id===st.me.id};
  const k=c.keys.get(row.key_version);
  if(!k){m.body={t:'locked'};return m}
  try{m.body=await HC.decJSON(k,{iv:row.iv,ct:row.ct},'msg|'+c.id)}catch(e){m.body={t:'locked'}}
  return m;
}
async function loadMsgs(c){
  const rows=await B.listMsgs(c.id,500);
  c.msgs=[];for(const r of rows){const m=await decodeMsg(c,r);if(!st.hidden.has(m.id))c.msgs.push(m)}
  c.loaded=true;
  const lr=c.my.last_read||'';c.unread=c.msgs.filter(m=>!m.mine&&m.at>lr&&m.body.t!=='sys').length;
}
async function onEvent(ev){
  if(!st.me)return;
  if(ev.type==='status'){st.rt=ev.status;emit('rt');return}
  if(ev.type==='msg'){const c=st.convs.get(ev.row.conv_id);if(!c){softRefresh();return}
    if(c.msgs.some(m=>m.id===ev.row.id))return;
    const m=await decodeMsg(c,ev.row);c.msgs.push(m);c.msgs.sort((a,b)=>a.at<b.at?-1:1);
    if(!m.mine){c.unread++;emit('incoming',{c,m})}
    emit('msgs',c);return}
  if(ev.type==='msgdel'){for(const c of st.convs.values()){const i=c.msgs.findIndex(m=>m.id===ev.row.id);if(i>=0){const [m]=c.msgs.splice(i,1);dropBlobUrls(m);emit('msgs',c)}}return}
  if(ev.type==='member'&&ev.ev==='DELETE'&&ev.row&&ev.row.user_id===st.me.id){st.convs.delete(ev.row.conv_id);emit('convs');emit('kicked',ev.row.conv_id);return}
  softRefresh();
}
function dropBlobUrls(m){const b=m.body&&m.body.blob;if(b&&st.blobUrls.has(b.p)){URL.revokeObjectURL(st.blobUrls.get(b.p));st.blobUrls.delete(b.p)}}
// 新建会话：随机会话密钥，分别用"我的私钥 × 对方公钥"包裹给每个成员
async function createConv(kind,memberIds,meta){
  const id=uuid(),raw=await HC.newConvKey();const key=await HC.importRaw(raw);
  const all=[st.me.id,...memberIds.filter(x=>x!==st.me.id)];
  await ensureAccounts(all);
  const encMeta=await HC.encJSON(key,meta||{name:'',avatar:'',ttl:0},'meta|'+id);
  await B.createConv({id,kind,enc_meta:JSON.stringify({v:1,...encMeta}),key_version:1});
  await B.addMembers(all.map(u=>({conv_id:id,user_id:u,role:(kind==='dm'||u===st.me.id)?'admin':'member'})));
  const keys=[];for(const u of all){const w=await HC.wrapConvKey(st.me.priv,st.accounts.get(u).pub_ecdh,id,1,raw);keys.push({conv_id:id,user_id:u,version:1,wrapped:w.ct,iv:w.iv,by_user:st.me.id,by_pub:st.me.pub})}
  raw.fill(0);await B.addKeys(keys);
  await refresh();return st.convs.get(id);
}
async function addContact(handle){
  handle=handle.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(handle===st.me.handle)throw new Error('这是你自己的邀请码');
  const a=await B.findHandle(handle);if(!a)throw new Error('没有找到这个邀请码');
  st.accounts.set(a.id,a);
  const ex=[...st.convs.values()].find(c=>c.kind==='dm'&&c.members.some(m=>m.user_id===a.id));
  if(ex)return ex;
  return createConv('dm',[a.id]);
}
async function updateMeta(c,patch){
  c.meta={...c.meta,...patch};const v=c.key_version;
  const box=await HC.encJSON(c.keys.get(v),c.meta,'meta|'+c.id);
  await B.updateConv(c.id,{enc_meta:JSON.stringify({v,...box})});emit('convs');
}
async function addMembers(c,ids){
  await ensureAccounts(ids);
  await B.addMembers(ids.map(u=>({conv_id:c.id,user_id:u,role:'member'})));
  // 新成员拿到当前及历史版本的会话密钥，才能看到之前的消息
  const rows=[];for(const [v] of c.keys){const raw=await rawOf(c,v);for(const u of ids){const w=await HC.wrapConvKey(st.me.priv,st.accounts.get(u).pub_ecdh,c.id,v,raw);rows.push({conv_id:c.id,user_id:u,version:v,wrapped:w.ct,iv:w.iv,by_user:st.me.id,by_pub:st.me.pub})}raw.fill(0)}
  await B.addKeys(rows);await sendSys(c,'邀请了 '+ids.map(nameOf).join('、')+' 加入群聊');await refresh();
}
// 会话密钥不可导出，需要原始字节时从服务器上的包裹副本重新解开
async function rawOf(c,v){const rows=await B.myConvs();const r=rows.find(x=>x.id===c.id);const k=r.keys.find(k=>k.version===v);
  const pk=await HC.pairRaw(st.me.priv,k.by_pub,c.id,v,{iv:k.iv,ct:k.wrapped});return pk}
async function removeMember(c,uid){
  await B.removeMember(c.id,uid);
  // 轮换密钥：被移除的人拿不到之后的新消息
  const v=c.key_version+1,raw=await HC.newConvKey();const rest=c.members.filter(m=>m.user_id!==uid).map(m=>m.user_id);
  const rows=[];for(const u of rest){const w=await HC.wrapConvKey(st.me.priv,st.accounts.get(u).pub_ecdh,c.id,v,raw);rows.push({conv_id:c.id,user_id:u,version:v,wrapped:w.ct,iv:w.iv,by_user:st.me.id,by_pub:st.me.pub})}
  await B.addKeys(rows);const key=await HC.importRaw(raw);raw.fill(0);c.keys.set(v,key);c.key_version=v;
  const box=await HC.encJSON(key,c.meta,'meta|'+c.id);await B.updateConv(c.id,{key_version:v,enc_meta:JSON.stringify({v,...box})});
  await sendSys(c,'将 '+nameOf(uid)+' 移出了群聊（已更换群密钥）');await refresh();
}
async function leaveConv(c){
  if(c.kind==='dm'){await clearConv(c);await B.deleteConv(c.id)}else{await B.removeMember(c.id,st.me.id)}
  st.convs.delete(c.id);emit('convs');
}
// ---------- 消息 ----------
async function send(c,body){
  const v=c.key_version,k=c.keys.get(v);if(!k)throw new Error('还没拿到会话密钥');
  const box=await HC.encJSON(k,body,'msg|'+c.id);
  const ttl=+(c.meta.ttl||0);
  const row={id:uuid(),conv_id:c.id,key_version:v,ct:box.ct,iv:box.iv,expires_at:ttl?new Date(Date.now()+ttl*1000).toISOString():null};
  const saved=await B.sendMsg(row);
  if(!c.msgs.some(m=>m.id===row.id)){c.msgs.push({id:row.id,conv:c.id,sender:st.me.id,at:saved&&saved.created_at||new Date().toISOString(),exp:row.expires_at,mine:true,body});emit('msgs',c)}
  B.notify(c.id,row.id);return row.id;
}
const sendSys=(c,text)=>send(c,{t:'sys',text:(st.me.profile.name||'我')+' '+text});
async function sendFile(c,file,kind,extra){
  if(file.size>CFG.MAX_FILE_MB*1024*1024)throw new Error('文件不能超过 '+CFG.MAX_FILE_MB+'MB');
  const buf=new Uint8Array(await file.arrayBuffer());
  const e=await HC.encFile(buf);const p=c.id+'/'+uuid();
  await B.upload(p,e.ct);
  return send(c,{t:kind,blob:{p,k:e.k,iv:e.iv,size:file.size,mime:file.type||'application/octet-stream',name:file.name||''},...extra});
}
async function blobUrl(b){
  if(st.blobUrls.has(b.p))return st.blobUrls.get(b.p);
  const ct=await B.download(b.p);const pt=await HC.decFile(ct,b.k,b.iv);
  const u=URL.createObjectURL(new Blob([pt],{type:b.mime}));st.blobUrls.set(b.p,u);return u;
}
async function deleteForAll(c,ids){
  const ms=c.msgs.filter(m=>ids.includes(m.id));
  await B.deleteMsgs(ids);await B.removeBlobs(ms.map(m=>m.body&&m.body.blob&&m.body.blob.p).filter(Boolean));
  c.msgs=c.msgs.filter(m=>!ids.includes(m.id));ms.forEach(dropBlobUrls);emit('msgs',c);
}
function deleteForMe(c,ids){ids.forEach(i=>st.hidden.add(i));localStorage.setItem('hush-hidden',JSON.stringify([...st.hidden].slice(-3000)));c.msgs=c.msgs.filter(m=>!ids.includes(m.id));emit('msgs',c)}
async function clearConv(c){
  if(c.isAdmin){await B.deleteConvMsgs(c.id);await B.removeBlobs(await B.listBlobs(c.id))}
  else{const mine=c.msgs.filter(m=>m.mine);await B.deleteMsgs(mine.map(m=>m.id));await B.removeBlobs(mine.map(m=>m.body.blob&&m.body.blob.p).filter(Boolean))}
  c.msgs.forEach(dropBlobUrls);c.msgs=[];c.unread=0;emit('msgs',c);
}
async function markRead(c){
  const last=c.msgs[c.msgs.length-1];c.unread=0;emit('convs');
  if(last&&(!c.my.last_read||c.my.last_read<last.at)){c.my.last_read=last.at;await B.updateMyMember(c.id,{last_read:last.at}).catch(()=>{})}
}
// 阅后即焚：到期后本地立即移除；自己发的顺手从服务器删掉（双保险，另有服务器定时清理）
setInterval(()=>{if(!st.me)return;const now=new Date().toISOString();
  for(const c of st.convs.values()){const exp=c.msgs.filter(m=>m.exp&&m.exp<=now);if(!exp.length)continue;
    c.msgs=c.msgs.filter(m=>!exp.includes(m));exp.forEach(dropBlobUrls);
    const mine=exp.filter(m=>m.mine);if(mine.length){B.deleteMsgs(mine.map(m=>m.id)).catch(()=>{});B.removeBlobs(mine.map(m=>m.body.blob&&m.body.blob.p).filter(Boolean)).catch(()=>{})}
    emit('msgs',c)}},2000);
// ---------- 收藏（用主密码派生的密钥加密，多设备同步） ----------
async function loadFavs(){const rows=await B.listFavs();st.favs=[];for(const r of rows){try{st.favs.push({id:r.id,at:r.created_at,data:await HC.decJSON(st.me.kek,{iv:r.iv,ct:r.ct},'fav')})}catch(e){}}emit('favs')}
async function addFav(c,m){const data={conv:convTitle(c),sender:nameOf(m.sender),at:m.at,body:m.body};const box=await HC.encJSON(st.me.kek,data,'fav');const id=uuid();await B.addFav({id,ct:box.ct,iv:box.iv});st.favs.unshift({id,at:new Date().toISOString(),data});emit('favs')}
async function delFav(id){await B.delFav(id);st.favs=st.favs.filter(f=>f.id!==id);emit('favs')}
// ---------- 备份（加密文件，用同一账号密码解开） ----------
async function exportBackup(withMedia,onProg){
  const out={app:'hush',v:1,at:new Date().toISOString(),me:{handle:st.me.handle,profile:st.me.profile},favs:st.favs.map(f=>f.data),convs:[],media:{}};
  let n=0;const convs=[...st.convs.values()];
  for(const c of convs){out.convs.push({id:c.id,kind:c.kind,title:convTitle(c),members:c.members.map(m=>nameOf(m.user_id)),
    msgs:c.msgs.filter(m=>m.body.t!=='locked').map(m=>({s:nameOf(m.sender),mine:m.mine,at:m.at,body:m.body}))});
    if(withMedia){for(const m of c.msgs){const b=m.body.blob;if(b&&b.size<=20*1024*1024){try{const ct=await B.download(b.p);out.media[b.p]=HC.b64(await HC.decFile(ct,b.k,b.iv))}catch(e){}}}}
    onProg&&onProg(++n/convs.length)}
  const box=await HC.aesEnc(st.me.bak,JSON.stringify(out),'hush-backup');
  return new Blob([JSON.stringify({app:'hush-backup',v:1,kdf:'PBKDF2-SHA256-'+HC.ITERS,iv:box.iv,ct:box.ct})],{type:'application/octet-stream'});
}
async function importBackup(text,email,password){
  const f=JSON.parse(text);if(f.app!=='hush-backup')throw new Error('不是悄悄话的备份文件');
  let key=st.me&&st.me.bak;
  if(password){key=(await HC.deriveMaster(email,password)).bak}
  try{return JSON.parse(new TextDecoder().decode(await HC.aesDecRaw(key,f,'hush-backup')))}catch(e){throw new Error('解不开：需要导出时的邮箱和密码')}
}
// ---------- 彻底销毁 ----------
async function wipeAccount(){
  for(const c of st.convs.values()){
    try{if(c.kind==='dm'){await B.removeBlobs(await B.listBlobs(c.id))}
      else{const rows=await B.listMsgs(c.id,2000);const mine=[];for(const r of rows.filter(r=>r.sender_id===st.me.id)){const m=await decodeMsg(c,r);if(m.body.blob)mine.push(m.body.blob.p)}await B.removeBlobs(mine)}}catch(e){console.warn(e)}}
  try{const reg=await navigator.serviceWorker.getRegistration();const s=reg&&await reg.pushManager.getSubscription();if(s)await s.unsubscribe()}catch(e){}
  const authGone=await B.wipe();await wipeLocal();return authGone;
}
async function wipeLocal(){
  lock();st.locked=false;
  try{localStorage.clear();sessionStorage.clear()}catch(e){}
  try{if(indexedDB.databases){for(const d of await indexedDB.databases())indexedDB.deleteDatabase(d.name)}}catch(e){}
  try{for(const k of await caches.keys())await caches.delete(k)}catch(e){}
  try{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister()}catch(e){}
}
// ---------- 推送 ----------
async function enablePush(){
  if(!('Notification' in window))throw new Error('这个浏览器不支持通知');
  const p=await Notification.requestPermission();if(p!=='granted')throw new Error('没有获得通知权限');
  if(!CFG.VAPID_PUBLIC_KEY||!('PushManager' in window))return 'local';
  const reg=await navigator.serviceWorker.ready;
  const key=Uint8Array.from(atob(CFG.VAPID_PUBLIC_KEY.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  await B.savePush(sub.toJSON());return 'push';
}
// ---------- 显示用 ----------
function nameOf(uid){if(st.me&&uid===st.me.id)return st.me.profile.name||'我';
  for(const c of st.convs.values()){const m=c.members.find(m=>m.user_id===uid);if(m&&m.profile&&m.profile.name)return m.profile.name}
  const a=st.accounts.get(uid);return a?'用户 '+a.handle.slice(0,4):'已离开的成员'}
function profileOf(uid){if(st.me&&uid===st.me.id)return st.me.profile;let best=null;for(const c of st.convs.values()){const m=c.members.find(m=>m.user_id===uid);if(m&&m.profile&&(!best||(m.profile.pv||0)>(best.pv||0)))best=m.profile}return best||{}}
function peerOf(c){const m=c.members.find(m=>m.user_id!==st.me.id);return m&&m.user_id}
function convTitle(c){if(c.kind==='group')return c.meta.name||('群聊 ('+c.members.length+')');const p=peerOf(c);return p?nameOf(p):'只剩我自己'}
function convAvatar(c){if(c.kind==='group')return c.meta.avatar||'';const p=peerOf(c);return p?(profileOf(p).avatar||''):''}
function preview(b){if(!b)return'';return{text:b.text,img:'[图片]',video:'[视频]',voice:'[语音]',file:'[文件] '+(b.blob&&b.blob.name||''),sys:b.text,locked:'🔒 无法解密的消息'}[b.t]||''}
Object.assign(st,{signUp,signIn,unlock,lock,signOut,saveProfile,changePassword,refresh,createConv,addContact,updateMeta,addMembers,removeMember,leaveConv,send,sendFile,blobUrl,deleteForAll,deleteForMe,clearConv,markRead,addFav,delFav,exportBackup,importBackup,wipeAccount,wipeLocal,enablePush,nameOf,profileOf,peerOf,convTitle,convAvatar,preview,on:f=>st.listeners.add(f),ensureAccounts});
})();
