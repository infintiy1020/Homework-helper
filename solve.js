// Vercel 서버리스 함수: 로그인한 사용자만 Gemini를 호출할 수 있어요.
const MODELS={
  default:process.env.GEMINI_MODEL||"gemini-2.5-flash",
  complex:process.env.GEMINI_MODEL_COMPLEX||process.env.GEMINI_MODEL||"gemini-2.5-flash"
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
module.exports=async(req,res)=>{
  if(req.method!=="POST")return res.status(405).end();
  const tok=(req.headers.authorization||"").replace("Bearer ","");
  if(!tok)return res.status(401).json({error:"login"});
  // Firebase 로그인 토큰 검증
  const v=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="+process.env.FIREBASE_API_KEY,
    {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:tok})});
  if(!v.ok)return res.status(401).json({error:"login"});
  const {prompt,image,tier}=req.body||{};
  if(typeof prompt!=="string"||prompt.length>6000)return res.status(400).json({error:"bad request"});
  if(image&&(typeof image!=="string"||image.length>3500000))return res.status(413).json({error:"image too large"});
  const parts=[];
  if(image)parts.push({inline_data:{mime_type:"image/jpeg",data:image}});
  parts.push({text:prompt});
  const model=MODELS[tier]||MODELS.default;
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent";
  const body=JSON.stringify({contents:[{role:"user",parts}],generationConfig:{maxOutputTokens:4096,responseMimeType:"application/json"}});
  let r;
  for(let i=0;i<3;i++){ // 사용량 한도(429)나 서버 오류면 잠깐 쉬었다가 다시 시도
    r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},body});
    if(r.status!==429&&r.status<500)break;
    await sleep(1500*(i+1));
  }
  if(r.status===429)return res.status(429).json({error:"rate"});
  if(!r.ok)return res.status(502).json({error:"upstream"});
  const j=await r.json();
  const text=(((j.candidates||[])[0]||{}).content||{}).parts;
  const out=(text||[]).map(p=>p.text||"").join("");
  if(!out)return res.status(502).json({error:"empty"});
  res.json({text:out});
};
