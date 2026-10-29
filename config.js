window.HUSH_CONFIG={
  SUPABASE_URL:'https://wtkvkklhbjoiitfvkkne.supabase.co',
  SUPABASE_ANON_KEY:'sb_publishable_KCt29Ha_kR56HNlxCDjfpw_TQolXAKU',
  VAPID_PUBLIC_KEY:'BD0CbHgeOFCe4WhnMYL0zu2KJSji_wuASwKtIhjfJzT0yPk6IjLYi8_oFqMJBF8vkd9zIvCTiOITGN9pNCYzJO4',
  PUSH_READY:true,              // 部署 chat-push Edge Function 并设好 VAPID 私钥后改成 true
  PUSH_FUNCTION:'chat-push',
  MAX_FILE_MB:50
};
try{document.body.className='t-'+(localStorage.getItem('hush-theme')||'gacha')}catch(e){}
