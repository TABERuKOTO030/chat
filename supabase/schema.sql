-- 悄悄话 HUSH · 端到端加密聊天 —— 在 Supabase SQL Editor 里整段运行一次即可（只新增 chat_ 开头的表）。
-- 服务器只保存密文 + 必要的元数据（谁在哪个会话、时间）。

create table if not exists public.chat_accounts(
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[A-Z0-9]{8}$'),
  pub_ecdh text not null,
  created_at timestamptz not null default now());
create table if not exists public.chat_secrets(
  id uuid primary key references auth.users(id) on delete cascade,
  wrapped_priv text not null, wrap_iv text not null,
  enc_profile text,                       -- 自己的资料（用主密码派生的密钥加密，多设备同步）
  updated_at timestamptz not null default now());
create table if not exists public.chat_convs(
  id uuid primary key,
  kind text not null check (kind in ('dm','group')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  enc_meta text,                          -- 群名/群头像/阅后即焚设置（会话密钥加密）
  key_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());
create table if not exists public.chat_members(
  conv_id uuid not null references public.chat_convs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  enc_profile text,                       -- 该成员在此会话中的资料（会话密钥加密）
  last_read timestamptz,
  joined_at timestamptz not null default now(),
  primary key(conv_id,user_id));
create table if not exists public.chat_keys(
  conv_id uuid not null references public.chat_convs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version int not null,
  wrapped text not null, iv text not null,
  by_user uuid not null, by_pub text not null,
  created_at timestamptz not null default now(),
  primary key(conv_id,user_id,version));
create table if not exists public.chat_messages(
  id uuid primary key,
  conv_id uuid not null references public.chat_convs(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key_version int not null,
  ct text not null, iv text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now());
create index if not exists chat_messages_conv_idx on public.chat_messages(conv_id,created_at desc);
create table if not exists public.chat_favs(
  id uuid primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ct text not null, iv text not null,
  created_at timestamptz not null default now());
create table if not exists public.chat_push(
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sub jsonb not null,
  created_at timestamptz not null default now());

-- 辅助函数（security definer 避免 RLS 递归）
create or replace function public.chat_is_member(c uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from chat_members where conv_id=c and user_id=auth.uid()) $$;
create or replace function public.chat_is_admin(c uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from chat_members where conv_id=c and user_id=auth.uid() and role='admin')
       or exists(select 1 from chat_convs where id=c and created_by=auth.uid()) $$;
create or replace function public.chat_shares_conv(u uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from chat_members a join chat_members b on a.conv_id=b.conv_id where a.user_id=auth.uid() and b.user_id=u) $$;
-- 按邀请码查人（只返回公钥，防止枚举全部用户）
create or replace function public.chat_find(h text) returns table(id uuid,handle text,pub_ecdh text) language sql stable security definer set search_path=public as
$$ select id,handle,pub_ecdh from chat_accounts where handle=upper(h) and auth.uid() is not null $$;

alter table public.chat_accounts enable row level security;
alter table public.chat_secrets  enable row level security;
alter table public.chat_convs    enable row level security;
alter table public.chat_members  enable row level security;
alter table public.chat_keys     enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_favs     enable row level security;
alter table public.chat_push     enable row level security;

drop policy if exists acc_sel on public.chat_accounts; create policy acc_sel on public.chat_accounts for select to authenticated using (id=auth.uid() or public.chat_shares_conv(id));
drop policy if exists acc_ins on public.chat_accounts; create policy acc_ins on public.chat_accounts for insert to authenticated with check (id=auth.uid());
drop policy if exists acc_upd on public.chat_accounts; create policy acc_upd on public.chat_accounts for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
drop policy if exists acc_del on public.chat_accounts; create policy acc_del on public.chat_accounts for delete to authenticated using (id=auth.uid());
drop policy if exists sec_all on public.chat_secrets; create policy sec_all on public.chat_secrets for all to authenticated using (id=auth.uid()) with check (id=auth.uid());
drop policy if exists conv_sel on public.chat_convs; create policy conv_sel on public.chat_convs for select to authenticated using (created_by=auth.uid() or public.chat_is_member(id));
drop policy if exists conv_ins on public.chat_convs; create policy conv_ins on public.chat_convs for insert to authenticated with check (created_by=auth.uid());
drop policy if exists conv_upd on public.chat_convs; create policy conv_upd on public.chat_convs for update to authenticated using (public.chat_is_member(id)) with check (public.chat_is_member(id));
drop policy if exists conv_del on public.chat_convs; create policy conv_del on public.chat_convs for delete to authenticated using (public.chat_is_admin(id));
drop policy if exists mem_sel on public.chat_members; create policy mem_sel on public.chat_members for select to authenticated using (user_id=auth.uid() or public.chat_is_member(conv_id));
drop policy if exists mem_ins on public.chat_members; create policy mem_ins on public.chat_members for insert to authenticated with check (public.chat_is_admin(conv_id));
drop policy if exists mem_upd on public.chat_members; create policy mem_upd on public.chat_members for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists mem_del on public.chat_members; create policy mem_del on public.chat_members for delete to authenticated using (user_id=auth.uid() or public.chat_is_admin(conv_id));
drop policy if exists key_sel on public.chat_keys; create policy key_sel on public.chat_keys for select to authenticated using (user_id=auth.uid());
drop policy if exists key_ins on public.chat_keys; create policy key_ins on public.chat_keys for insert to authenticated with check (by_user=auth.uid() and public.chat_is_admin(conv_id));
drop policy if exists key_del on public.chat_keys; create policy key_del on public.chat_keys for delete to authenticated using (user_id=auth.uid() or public.chat_is_admin(conv_id));
drop policy if exists msg_sel on public.chat_messages; create policy msg_sel on public.chat_messages for select to authenticated using (public.chat_is_member(conv_id) and (expires_at is null or expires_at>now()));
drop policy if exists msg_ins on public.chat_messages; create policy msg_ins on public.chat_messages for insert to authenticated with check (sender_id=auth.uid() and public.chat_is_member(conv_id));
drop policy if exists msg_del on public.chat_messages; create policy msg_del on public.chat_messages for delete to authenticated using (sender_id=auth.uid() or public.chat_is_admin(conv_id));
drop policy if exists fav_all on public.chat_favs; create policy fav_all on public.chat_favs for all to authenticated using (owner=auth.uid()) with check (owner=auth.uid());
drop policy if exists push_all on public.chat_push; create policy push_all on public.chat_push for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

revoke all on public.chat_accounts,public.chat_secrets,public.chat_convs,public.chat_members,public.chat_keys,public.chat_messages,public.chat_favs,public.chat_push from anon;
grant select,insert,update,delete on public.chat_accounts,public.chat_secrets,public.chat_convs,public.chat_members,public.chat_keys,public.chat_messages,public.chat_favs,public.chat_push to authenticated;
revoke execute on function public.chat_find(text) from anon, public; grant execute on function public.chat_find(text) to authenticated;

-- 彻底销毁账号：删除本人在服务器上的一切（含登录账号本身）。媒体文件由客户端先行删除。
drop function if exists public.chat_wipe_me();
create or replace function public.chat_wipe_me() returns boolean language plpgsql security definer set search_path=public as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'not signed in'; end if;
  delete from chat_messages where sender_id=u;
  delete from chat_convs c where c.kind='dm' and exists(select 1 from chat_members m where m.conv_id=c.id and m.user_id=u);
  delete from chat_members where user_id=u;
  delete from chat_convs c where not exists(select 1 from chat_members m where m.conv_id=c.id);
  delete from chat_keys where user_id=u;
  delete from chat_favs where owner=u;
  delete from chat_push where user_id=u;
  delete from chat_secrets where id=u;
  delete from chat_accounts where id=u;
  begin delete from auth.users where id=u; return true;
  exception when others then raise notice 'auth delete failed: %', sqlerrm; return false; end;
end $$;
revoke execute on function public.chat_wipe_me() from anon, public; grant execute on function public.chat_wipe_me() to authenticated;

-- 实时推送
do $$ begin
  begin alter publication supabase_realtime add table public.chat_messages; exception when others then null; end;
  begin alter publication supabase_realtime add table public.chat_members;  exception when others then null; end;
  begin alter publication supabase_realtime add table public.chat_convs;    exception when others then null; end;
  begin alter publication supabase_realtime add table public.chat_keys;     exception when others then null; end;
end $$;

-- 加密文件存储（私有桶，路径 = 会话ID/随机ID，只有会话成员能读写）
insert into storage.buckets(id,name,public,file_size_limit) values('chat-blobs','chat-blobs',false,52428800)
  on conflict (id) do update set public=false, file_size_limit=52428800;
drop policy if exists chat_blob_sel on storage.objects; create policy chat_blob_sel on storage.objects for select to authenticated using (bucket_id='chat-blobs' and public.chat_is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists chat_blob_ins on storage.objects; create policy chat_blob_ins on storage.objects for insert to authenticated with check (bucket_id='chat-blobs' and public.chat_is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists chat_blob_del on storage.objects; create policy chat_blob_del on storage.objects for delete to authenticated using (bucket_id='chat-blobs' and (owner_id=auth.uid()::text or public.chat_is_admin(((storage.foldername(name))[1])::uuid)));

-- 阅后即焚：到期消息每分钟清理（需要 pg_cron；没有也没关系，过期消息查询时本来就被 RLS 隐藏）
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('chat-expire','* * * * *',$c$delete from public.chat_messages where expires_at is not null and expires_at<now()$c$);
exception when others then raise notice 'pg_cron 不可用：%', sqlerrm; end $$;
