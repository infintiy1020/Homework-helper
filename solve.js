// Vercel 서버리스 함수: 로그인한 사용자만 Gemini를 호출할 수 있어요.
// 모델 목록: 환경변수로 정한 모델 → 아래 FALLBACK 순서. 종료된(404) 모델은 건너뛰고 다음 모델로 자동 전환돼요.
const FALLBACK=["gemini-3.5-flash","gemini-3-flash-preview"];
const TIER={
  default:{env:process.env.GEMINI_MODEL,think:process.env.GEMINI_THINKING||"MEDIUM"},
  read:{env:process.env.GEMINI_MODEL,think:process.env.GEMINI_THINKING_READ||"LOW"},
  complex:{env:process.env.GEMINI_MODEL_COMPLEX||process.env.GEMINI_MODEL,think:process.env.GEMINI_THINKING_COMPLEX||"MEDIUM"}
};
const dead=new Set(); // 이 서버 인스턴스에서 404가 난 모델
const sleep=ms=>new Promise(r=>setTimeout(r,ms));


// Firebase 로그인 토큰(JWT)을 API 키 없이 직접 검증해요. (구글 공개 인증서 사용)
const crypto=require("crypto");
const PROJECT=process.env.FIREBASE_PROJECT_ID||"homework-helper-47a5a";
let certs=null,certsExp=0;
async function getCerts(){
  if(certs&&Date.now()<certsExp)return certs;
  const r=await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  if(!r.ok)throw new Error("certs "+r.status);
  certs=await r.json();
  const m=/max-age=(\d+)/.exec(r.headers.get("cache-control")||"");
  certsExp=Date.now()+(m?+m[1]:3600)*1000;
  return certs;
}
const b64u=x=>Buffer.from(x,"base64url");
async function verifyToken(tok){
  const parts=tok.split(".");
  if(parts.length!==3)return null;
  let head,pay;
  try{head=JSON.parse(b64u(parts[0]).toString());pay=JSON.parse(b64u(parts[1]).toString())}catch(e){return null}
  if(head.alg!=="RS256"||!head.kid)return null;
  const now=Math.floor(Date.now()/1000);
  if(pay.aud!==PROJECT||pay.iss!=="https://securetoken.google.com/"+PROJECT)return null;
  if(!pay.sub||typeof pay.exp!=="number"||pay.exp<now||(pay.iat&&pay.iat>now+300))return null;
  let cs=await getCerts();
  if(!cs[head.kid]){certs=null;cs=await getCerts()} // 인증서가 바뀌었을 수 있어서 한 번 더
  const cert=cs[head.kid];
  if(!cert)return null;
  const ok=crypto.createVerify("RSA-SHA256").update(parts[0]+"."+parts[1]).verify(crypto.createPublicKey(cert),b64u(parts[2]));
  return ok?pay:null;
}

async function call(model,parts,think){
  const gc={maxOutputTokens:8192,responseMimeType:"application/json"};
  if(think)gc.thinkingConfig={thinkingLevel:think};
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent";
  const body=JSON.stringify({contents:[{role:"user",parts}],generationConfig:gc});
  let r;
  for(let i=0;i<3;i++){ // 사용량 한도(429)나 서버 오류면 잠깐 쉬었다가 다시 시도
    r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},body});
    if(r.status!==429&&r.status<500)break;
    await sleep(1500*(i+1));
  }
  return r;
}

module.exports=async(req,res)=>{
  try{
    if(req.method!=="POST")return res.status(405).end();
    const tok=(req.headers.authorization||"").replace("Bearer ","");
    if(!tok)return res.status(401).json({error:"login"});
    // Firebase 로그인 토큰 검증 (인증서를 못 받아오면 401이 아니라 503으로 구분해요)
    let user;
    try{user=await verifyToken(tok)}catch(e){console.error("auth verify failed",e&&e.message);return res.status(503).json({error:"auth_server"})}
    if(!user){return res.status(401).json({error:"login"})}
    const {prompt,image,images,tier}=req.body||{};
    if(typeof prompt!=="string"||prompt.length>6000)return res.status(400).json({error:"bad request"});
    const imgs=(Array.isArray(images)?images:(image?[image]:[])).slice(0,8);
    if(imgs.some(x=>typeof x!=="string")||imgs.reduce((a,x)=>a+x.length,0)>3800000)return res.status(413).json({error:"image too large"});
    const parts=[];
    imgs.forEach(x=>parts.push({inline_data:{mime_type:"image/jpeg",data:x}}));
    parts.push({text:prompt});

    const t=TIER[tier]||TIER.default;
    let list=[...new Set([t.env,...FALLBACK].filter(Boolean))].filter(m=>!dead.has(m));
    if(!list.length){dead.clear();list=[...FALLBACK]}
    let r=null,errText="",used="";
    for(const m of list){
      used=m;
      r=await call(m,parts,t.think);
      if(r.status===400){ // thinking 설정을 모르는 모델이면 빼고 한 번 더
        const b=await r.text().catch(()=>"");
        if(/thinking/i.test(b))r=await call(m,parts,null);
        else{errText=b;break}
      }
      if(r.status===404){dead.add(m);errText=await r.text().catch(()=>"");console.error("model gone:",m);continue}
      break;
    }
    if(r.status===429)return res.status(429).json({error:"rate"});
    if(!r.ok){
      if(!errText)errText=await r.text().catch(()=>"");
      console.error("gemini error",r.status,used,errText.slice(0,500));
      const kind=r.status===404?"model":(/API key|PERMISSION_DENIED/i.test(errText)||r.status===403||r.status===401)?"key":r.status===400?"badreq":"upstream";
      return res.status(502).json({error:kind});
    }
    const j=await r.json();
    const ps=(((j.candidates||[])[0]||{}).content||{}).parts;
    const out=(ps||[]).filter(p=>!p.thought).map(p=>p.text||"").join("");
    if(!out){console.error("gemini empty",used,JSON.stringify(j).slice(0,500));return res.status(502).json({error:"empty"})}
    res.json({text:out,model:used});
  }catch(e){
    console.error("solve crash",e&&e.message);
    res.status(502).json({error:"upstream"});
  }
};
