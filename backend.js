// 数据后端：Supabase（正式）或本地 mock 服务器（?mock=URL，仅用于自动化测试）。传输的全部是密文。
(function(){
const CFG=window.HUSH_CONFIG;
const mockUrl=/^(127\.0\.0\.1|localhost)$/.test(location.hostname)?new URLSearchParams(location.search).get('mock'):null;
function supa(){
  const sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY,{auth:{persistSession:true,storageKey:'hush-auth'}});
  const ok=({data,error})=>{if(error)throw new Error(error.message||String(error));return data};
  let uid=null,chan=null;
  const B={kind:'supabase',
    async currentUser(){const {data}=await sb.auth.getSession();const u=data.session&&data.session.user;uid=u?u.id:null;return u?{id:u.id,email:u.email}:null},
    async signUp(email,pw){const d=ok(await sb.auth.signUp({email,password:pw}));if(!d.session){ok(await sb.auth.signInWithPassword({email,password:pw}))}return this.currentUser()},
    async signIn(email,pw){ok(await sb.auth.signInWithPassword({email,password:pw}));return this.currentUser()},
    async signOut(){if(chan){sb.removeChannel(chan);chan=null}await sb.auth.signOut({scope:'local'})},
    async changeAuthPw(pw){ok(await sb.auth.updateUser({password:pw}))},
    async getSecret(){return ok(await sb.from('chat_secrets').select('*').eq('id',uid).maybeSingle())},
    async getAccount(){return ok(await sb.from('chat_accounts').select('*').eq('id',uid).maybeSingle())},
    async putAccount(acc,sec){ok(await sb.from('chat_accounts').insert({id:uid,...acc}));ok(await sb.from('chat_secrets').insert({id:uid,...sec}))},
    async updateSecret(p){ok(await sb.from('chat_secrets').update({...p,updated_at:new Date().toISOString()}).eq('id',uid))},
    async findHandle(h){const d=ok(await sb.rpc('chat_find',{h}));return d&&d[0]||null},
    async accounts(ids){if(!ids.length)return[];return ok(await sb.from('chat_accounts').select('id,handle,pub_ecdh').in('id',ids))},
    async myConvs(){const mine=ok(await sb.from('chat_members').select('conv_id').eq('user_id',uid));const ids=mine.map(m=>m.conv_id);if(!ids.length)return[];
      const [convs,mems,keys]=await Promise.all([sb.from('chat_convs').select('*').in('id',ids),sb.from('chat_members').select('*').in('conv_id',ids),sb.from('chat_keys').select('*').eq('user_id',uid).in('conv_id',ids)]);
      return ok(convs).map(c=>({...c,members:ok(mems).filter(m=>m.conv_id===c.id),keys:ok(keys).filter(k=>k.conv_id===c.id)}))},
    async createConv(c){ok(await sb.from('chat_convs').insert(c))},
    async updateConv(id,p){ok(await sb.from('chat_convs').update({...p,updated_at:new Date().toISOString()}).eq('id',id))},
    async deleteConv(id){ok(await sb.from('chat_convs').delete().eq('id',id))},
    async addMembers(rows){ok(await sb.from('chat_members').insert(rows))},
    async updateMyMember(convId,p){ok(await sb.from('chat_members').update(p).eq('conv_id',convId).eq('user_id',uid))},
    async removeMember(convId,u){ok(await sb.from('chat_members').delete().eq('conv_id',convId).eq('user_id',u))},
    async addKeys(rows){ok(await sb.from('chat_keys').insert(rows))},
    async listMsgs(convId,limit=300){return ok(await sb.from('chat_messages').select('*').eq('conv_id',convId).order('created_at',{ascending:false}).limit(limit)).reverse()},
    async sendMsg(r){return ok(await sb.from('chat_messages').insert(r).select().single())},
    async deleteMsgs(ids){if(ids.length)ok(await sb.from('chat_messages').delete().in('id',ids))},
    async deleteConvMsgs(convId){ok(await sb.from('chat_messages').delete().eq('conv_id',convId))},
    async upload(path,bytes){ok(await sb.storage.from('chat-blobs').upload(path,new Blob([bytes],{type:'application/octet-stream'}),{contentType:'application/octet-stream',upsert:false}))},
    async download(path){const b=ok(await sb.storage.from('chat-blobs').download(path));return new Uint8Array(await b.arrayBuffer())},
    async removeBlobs(paths){for(let i=0;i<paths.length;i+=100)await sb.storage.from('chat-blobs').remove(paths.slice(i,i+100))},
    async listBlobs(convId){const d=ok(await sb.storage.from('chat-blobs').list(convId,{limit:1000}));return(d||[]).filter(f=>f.id).map(f=>convId+'/'+f.name)},
    async listFavs(){return ok(await sb.from('chat_favs').select('*').eq('owner',uid).order('created_at',{ascending:false}))},
    async addFav(r){ok(await sb.from('chat_favs').insert(r))},
    async delFav(id){ok(await sb.from('chat_favs').delete().eq('id',id))},
    async savePush(sub){ok(await sb.from('chat_push').upsert({endpoint:sub.endpoint,user_id:uid,sub}))},
    async delPush(endpoint){await sb.from('chat_push').delete().eq('endpoint',endpoint)},
    async notify(convId,msgId){if(!CFG.VAPID_PUBLIC_KEY)return;try{await sb.functions.invoke(CFG.PUSH_FUNCTION,{body:{conv_id:convId,msg_id:msgId}})}catch(e){}},
    async wipe(){const r=ok(await sb.rpc('chat_wipe_me'));await sb.auth.signOut({scope:'local'});return r!==false},
    subscribe(cb){if(chan)sb.removeChannel(chan);
      chan=sb.channel('hush-'+uid)
       .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},p=>cb({type:'msg',row:p.new}))
       .on('postgres_changes',{event:'DELETE',schema:'public',table:'chat_messages'},p=>cb({type:'msgdel',row:p.old}))
       .on('postgres_changes',{event:'*',schema:'public',table:'chat_members'},p=>cb({type:'member',row:p.new&&p.new.conv_id?p.new:p.old,ev:p.eventType}))
       .on('postgres_changes',{event:'*',schema:'public',table:'chat_convs'},p=>cb({type:'conv',row:p.new&&p.new.id?p.new:p.old,ev:p.eventType}))
       .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_keys',filter:'user_id=eq.'+uid},p=>cb({type:'key',row:p.new}))
       .subscribe(s=>cb({type:'status',status:s}));}
  };return B;
}
function mock(base){
  let tok=localStorage.getItem('hush-mock-tok'),uid=null,es=null;
  const call=async(op,a={})=>{const r=await fetch(base+'/api/'+op,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tok,...a})});const j=await r.json();if(j.error)throw new Error(j.error);return j.data};
  const B={kind:'mock',
    async currentUser(){if(!tok)return null;try{const u=await call('me');uid=u.id;return u}catch(e){return null}},
    async signUp(email,pw){const d=await call('signup',{email,pw});tok=d.tok;localStorage.setItem('hush-mock-tok',tok);return this.currentUser()},
    async signIn(email,pw){const d=await call('signin',{email,pw});tok=d.tok;localStorage.setItem('hush-mock-tok',tok);return this.currentUser()},
    async signOut(){if(es){es.close();es=null}tok=null;localStorage.removeItem('hush-mock-tok')},
    changeAuthPw:pw=>call('changepw',{pw}),getSecret:()=>call('getSecret'),getAccount:()=>call('getAccount'),
    putAccount:(acc,sec)=>call('putAccount',{acc,sec}),updateSecret:p=>call('updateSecret',{p}),findHandle:h=>call('findHandle',{h}),
    accounts:ids=>call('accounts',{ids}),myConvs:()=>call('myConvs'),createConv:c=>call('createConv',{c}),updateConv:(id,p)=>call('updateConv',{id,p}),
    deleteConv:id=>call('deleteConv',{id}),addMembers:rows=>call('addMembers',{rows}),updateMyMember:(convId,p)=>call('updateMyMember',{convId,p}),
    removeMember:(convId,u)=>call('removeMember',{convId,u}),addKeys:rows=>call('addKeys',{rows}),listMsgs:(convId,limit=300)=>call('listMsgs',{convId,limit}),
    sendMsg:r=>call('sendMsg',{r}),deleteMsgs:ids=>call('deleteMsgs',{ids}),deleteConvMsgs:convId=>call('deleteConvMsgs',{convId}),
    upload:(path,bytes)=>call('upload',{path,data:HC.b64(bytes)}),download:async path=>HC.ub64(await call('download',{path})),removeBlobs:paths=>call('removeBlobs',{paths}),listBlobs:convId=>call('listBlobs',{convId}),
    listFavs:()=>call('listFavs'),addFav:r=>call('addFav',{r}),delFav:id=>call('delFav',{id}),savePush:sub=>call('savePush',{sub}),delPush:e=>call('delPush',{e}),
    notify:async()=>{},async wipe(){await call('wipe');await this.signOut();return true},
    subscribe(cb){if(es)es.close();es=new EventSource(base+'/events?tok='+tok);es.onmessage=e=>cb(JSON.parse(e.data));es.onopen=()=>cb({type:'status',status:'SUBSCRIBED'})}
  };return B;
}
window.Backend=mockUrl?mock(mockUrl):supa();
})();
