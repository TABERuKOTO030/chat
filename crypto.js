// 端到端加密核心：全部在浏览器本地完成（Web Crypto）。服务器只看到密文。
(function(){
const S=crypto.subtle,te=new TextEncoder(),td=new TextDecoder();
const b64=buf=>{const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const ub64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
const ITERS=600000;
// 主密码 → 768 位：[0..32) 登录口令（发给服务器，无法反推出其它部分）、[32..64) 包裹私钥的 KEK、[64..96) 本地/备份密钥
async function deriveMaster(email,password){
  const salt=new Uint8Array(await S.digest('SHA-256',te.encode('hush-v1|'+email.trim().toLowerCase())));
  const base=await S.importKey('raw',te.encode(password.normalize('NFKC')),'PBKDF2',false,['deriveBits']);
  const bits=new Uint8Array(await S.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERS},base,768));
  const auth=[...bits.slice(0,32)].map(b=>b.toString(16).padStart(2,'0')).join('');
  const kek=await S.importKey('raw',bits.slice(32,64),'AES-GCM',false,['encrypt','decrypt']);
  const bak=await S.importKey('raw',bits.slice(64,96),'AES-GCM',false,['encrypt','decrypt']);
  bits.fill(0);return{auth,kek,bak};
}
async function aesEnc(key,data,aad){const iv=rnd(12);const p={name:'AES-GCM',iv};if(aad)p.additionalData=te.encode(aad);const ct=await S.encrypt(p,key,typeof data==='string'?te.encode(data):data);return{iv:b64(iv),ct:b64(ct)}}
async function aesDecRaw(key,box,aad){const p={name:'AES-GCM',iv:ub64(box.iv)};if(aad)p.additionalData=te.encode(aad);return new Uint8Array(await S.decrypt(p,key,ub64(box.ct)))}
const encJSON=(k,o,aad)=>aesEnc(k,JSON.stringify(o),aad);
const decJSON=async(k,b,aad)=>JSON.parse(td.decode(await aesDecRaw(k,b,aad)));
// 身份密钥（ECDH P-256）
async function newIdentity(){const kp=await S.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const pub=b64(await S.exportKey('spki',kp.publicKey));const pk8=new Uint8Array(await S.exportKey('pkcs8',kp.privateKey));return{pub,pk8}}
async function wrapPriv(kek,pk8){return aesEnc(kek,pk8,'hush-priv')}
async function unwrapPriv(kek,box){const pk8=await aesDecRaw(kek,box,'hush-priv');const k=await S.importKey('pkcs8',pk8,{name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);pk8.fill(0);return k}
const pubCache=new Map();
async function importPub(pub){if(!pubCache.has(pub))pubCache.set(pub,await S.importKey('spki',ub64(pub),{name:'ECDH',namedCurve:'P-256'},false,[]));return pubCache.get(pub)}
// 两人之间的包裹密钥：ECDH → HKDF(salt=会话ID)
async function pairKey(myPriv,theirPub,convId,ver){const bits=await S.deriveBits({name:'ECDH',public:await importPub(theirPub)},myPriv,256);
  const h=await S.importKey('raw',bits,'HKDF',false,['deriveKey']);
  return S.deriveKey({name:'HKDF',hash:'SHA-256',salt:te.encode(convId),info:te.encode('hush-wrap-v'+ver)},h,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function newConvKey(){return rnd(32)}
async function wrapConvKey(myPriv,theirPub,convId,ver,raw){return aesEnc(await pairKey(myPriv,theirPub,convId,ver),raw,'ck|'+convId+'|'+ver)}
async function unwrapConvKey(myPriv,byPub,convId,ver,box){const raw=await aesDecRaw(await pairKey(myPriv,byPub,convId,ver),box,'ck|'+convId+'|'+ver);return S.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt'])}
async function pairRaw(myPriv,byPub,convId,ver,box){return aesDecRaw(await pairKey(myPriv,byPub,convId,ver),box,'ck|'+convId+'|'+ver)}
const importRaw=raw=>S.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
// 文件：每个文件一把随机密钥
async function encFile(buf){const raw=rnd(32);const k=await importRaw(raw);const iv=rnd(12);const ct=await S.encrypt({name:'AES-GCM',iv},k,buf);return{ct:new Uint8Array(ct),k:b64(raw),iv:b64(iv)}}
async function decFile(ct,k,iv){const key=await importRaw(ub64(k));return new Uint8Array(await S.decrypt({name:'AES-GCM',iv:ub64(iv)},key,ct))}
// 安全码：双方公钥排序后 SHA-256，显示为 12 组 5 位数字
async function safetyCode(pubA,pubB){const [x,y]=[pubA,pubB].sort();const h=new Uint8Array(await S.digest('SHA-256',te.encode('hush-safety|'+x+'|'+y)));
  const out=[];for(let i=0;i<12;i++){const n=((h[i*2]<<16)|(h[i*2+1]<<8)|h[(i*2+7)%32])%100000;out.push(String(n).padStart(5,'0'))}return out}
async function fingerprint(pub){const h=new Uint8Array(await S.digest('SHA-256',ub64(pub)));return [...h.slice(0,8)].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase().match(/.{4}/g).join(' ')}
window.HC={b64,ub64,rnd,ITERS,deriveMaster,aesEnc,aesDecRaw,encJSON,decJSON,newIdentity,wrapPriv,unwrapPriv,newConvKey,wrapConvKey,unwrapConvKey,pairRaw,importRaw,encFile,decFile,safetyCode,fingerprint};
})();
