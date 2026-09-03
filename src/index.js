const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:JSON_HEADERS})}
function cleanJson(text){
  text=String(text||"").trim().replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
  const a=text.indexOf("{"),b=text.lastIndexOf("}");
  if(a>=0&&b>a) text=text.slice(a,b+1);
  return JSON.parse(text);
}
function b64(bytes){
  let s="";const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk)s+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  return btoa(s);
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==="/api/story"&&request.method==="POST"){
      try{
        const b=await request.json(), script=String(b.script||"").trim();
        if(!script)return json({error:"Script or idea is required."},400);
        const prompt=`You are the senior creative director of SILENT POWER, an original motivational media brand. Create a SHORT-FORM TWO-PERSON PODCAST CONVERSATION from the user's idea/script.
Do NOT imitate any named creator, celebrity, podcast, existing video, copyrighted script, face, or voice. The two hosts must be original fictional characters.
Language: ${b.language||"English"}.
Target duration: ${b.duration||45} seconds.
Visual style: ${b.style||"Premium cinematic 3D cartoon podcast"}.
Create 6-8 scenes. Alternate speakers A and B naturally. Speaker A is a calm deep male host; Speaker B is a confident thoughtful female host. The dialogue must sound like a real podcast, not an essay. Hook in first 2 seconds. Short sentences. One memorable insight. Strong ending and subtle Silent Power CTA.
Return ONLY JSON:
{"duration":45,"title":"...","scenes":[{"speaker":"A","dialogue":"...","caption":"3-8 word caption","visual":"cinematic original B-roll description, no real person, no brand logos"}]}
User idea/script:
${script}`;
        const r=await env.AI.run("@cf/google/gemma-4-26b-a4b-it",{messages:[{role:"system",content:"Return strict JSON only."},{role:"user",content:prompt}],temperature:.8,max_tokens:1800});
        return json(cleanJson(r?.response));
      }catch(e){return json({error:"Story generation failed.",detail:String(e?.message||e)},500)}
    }
    if(url.pathname==="/api/image"&&request.method==="POST"){
      try{
        const b=await request.json();
        const prompt=`${String(b.style||"Premium cinematic 3D cartoon podcast")}. Vertical 9:16 cinematic motivational B-roll for Silent Power. ${String(b.prompt||"")}. Original fictional scene only, no celebrities, no recognizable public figures, no logos, no text, dramatic lighting, premium depth, realistic materials, social-media quality.`;
        const r=await env.AI.run("@cf/black-forest-labs/flux-1-schnell",{prompt,steps:4});
        if(!r?.image)return json({error:"No image returned."},500);
        return json({dataURI:`data:image/jpeg;base64,${r.image}`});
      }catch(e){return json({error:"Image generation failed.",detail:String(e?.message||e)},500)}
    }
    if(url.pathname==="/api/voice"&&request.method==="POST"){
      try{
        const b=await request.json(), text=String(b.text||"").trim();
        if(!text)return json({error:"Voice text is required."},400);
        const audio=await env.AI.run("@cf/deepgram/aura-2-en",{text,speaker:String(b.speaker||"zeus"),encoding:"mp3"});
        const ab=await new Response(audio).arrayBuffer();
        return json({base64:b64(new Uint8Array(ab))});
      }catch(e){return json({error:"Voice generation failed.",detail:String(e?.message||e)},500)}
    }
    return env.ASSETS.fetch(request);
  }
};