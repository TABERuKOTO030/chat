// chat-push：有新消息时给对话里其他成员发 Web Push。推送内容只有会话 ID，不含任何明文。
// 需要的 secrets：VAPID_PUBLIC_KEY、VAPID_PRIVATE_KEY、VAPID_SUBJECT（SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY 平台自动提供）
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')||'mailto:admin@example.com',Deno.env.get('VAPID_PUBLIC_KEY')!,Deno.env.get('VAPID_PRIVATE_KEY')!);
const URL_=Deno.env.get('SUPABASE_URL')!;
const admin=createClient(URL_,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const jwt=(req.headers.get('Authorization')||'').replace('Bearer ','');
    const {data:{user}}=await admin.auth.getUser(jwt);
    if(!user)return new Response('unauthorized',{status:401,headers:cors});
    const {conv_id,msg_id}=await req.json();
    // 只有该消息的发送者、且是会话成员，才能触发推送
    const {data:msg}=await admin.from('chat_messages').select('id').eq('id',msg_id).eq('conv_id',conv_id).eq('sender_id',user.id).maybeSingle();
    if(!msg)return new Response('forbidden',{status:403,headers:cors});
    const {data:mem}=await admin.from('chat_members').select('user_id').eq('conv_id',conv_id).neq('user_id',user.id);
    const ids=(mem||[]).map(m=>m.user_id);if(!ids.length)return new Response(JSON.stringify({sent:0}),{headers:{...cors,'content-type':'application/json'}});
    const {data:subs}=await admin.from('chat_push').select('endpoint,sub').in('user_id',ids);
    let sent=0;
    await Promise.all((subs||[]).map(async s=>{
      try{await webpush.sendNotification(s.sub,JSON.stringify({conv:conv_id}),{TTL:3600,urgency:'high'});sent++}
      catch(e){if(e.statusCode===404||e.statusCode===410)await admin.from('chat_push').delete().eq('endpoint',s.endpoint)}
    }));
    return new Response(JSON.stringify({sent}),{headers:{...cors,'content-type':'application/json'}});
  }catch(e){return new Response(String(e),{status:500,headers:cors})}
});
