const H={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
function clean(t){t=String(t||"").trim().replace(/^```(?:json)?/i,"").replace(/```$/i,"").trim();const a=t.indexOf("{"),b=t.lastIndexOf("}");if(a>=0&&b>a)t=t.slice(a,b+1);return JSON.parse(t)}
function b64(bytes){let s="",c=0x8000;for(let i=0;i<bytes.length;i+=c)s+=String.fromCharCode(...bytes.subarray(i,i+c));return btoa(s)}
async function flux2(env,prompt){
  const form=new FormData(); form.append("prompt",prompt); form.append("width","1024"); form.append("height","1024");
  try{
    const r=await env.AI.run("@cf/black-forest-labs/flux-2-klein-9b",{multipart:{body:(await new Response(form)).body,contentType:(await new Response(form)).headers.get("content-type")}});
    if(r?.image)return r.image;
  }catch(_){ }
  const r=await env.AI.run("@cf/black-forest-labs/flux-1-schnell",{prompt,steps:6});
  if(!r?.image)throw new Error("No image returned by the image model."); return r.image;
}
export default {async fetch(req,env){const u=new URL(req.url);
if(u.pathname==="/api/health"&&req.method==="GET")return json({ok:true,service:"Silent Power Studio",engine:"Ultimate Realistic Podcast"});
if(u.pathname==="/api/story"&&req.method==="POST")try{const b=await req.json(),script=String(b.script||"").trim();if(!script)return json({error:"Script or idea is required."},400);
const duration=Math.max(30,Math.min(60,Number(b.duration)||45));
const prompt=`You are the senior creative director and dialogue writer for SILENT POWER, an original premium motivational media brand. Create an ORIGINAL two-host realistic podcast Short. Never imitate, quote, or recreate any named creator, celebrity, influencer, podcast, copyrighted script, face, or voice. Hosts are fictional adults: HOST A = calm, deep, grounded male; HOST B = confident, warm, intelligent female. The conversation must feel like a real podcast, not an advertisement and not a lecture.
Language: ${b.language||"English"}. Target duration: ${duration} seconds. User idea/script: ${script}
Write 6 scenes with natural turn-taking. Scene 1 must hook immediately. Include disagreement/response or a natural follow-up so it feels like two people actually talking. End with a concise memorable line and Silent Power emotional tone. Each dialogue line should be short enough to speak naturally. Total spoken text should fit the target duration.
Use these shot values only: TWO_SHOT, MALE_CLOSE, FEMALE_CLOSE, WIDE, BROLL. Use BROLL for 1-2 cutaways. For every scene include a cinematic visual description. Captions should be 2-8 words, punchy, not full subtitles.
Return ONLY valid JSON exactly like: {"duration":${duration},"title":"...","hook":"...","scenes":[{"speaker":"A","dialogue":"...","caption":"...","shot":"TWO_SHOT","visual":"..."}]}`;
const r=await env.AI.run("@cf/google/gemma-4-26b-a4b-it",{messages:[{role:"system",content:"Return only valid JSON. No markdown."},{role:"user",content:prompt}],temperature:.65,max_completion_tokens:2400,response_format:{type:"json_object"}});
const raw=r?.response??r?.choices?.[0]?.message?.content??r?.output_text??"";if(!raw)throw new Error("Workers AI returned no text. Raw: "+JSON.stringify(r).slice(0,1200));
const out=clean(raw); out.duration=duration; out.scenes=(out.scenes||[]).slice(0,7); if(!out.scenes.length)throw new Error("The AI returned no scenes."); return json(out);
}catch(e){return json({error:"Story generation failed.",detail:String(e?.message||e)},500)}
if(u.pathname==="/api/studio"&&req.method==="POST")try{const b=await req.json();const look=String(b.look||"Premium photorealistic cinematic studio");
const prompt=`High-end photorealistic documentary photograph of an ORIGINAL fictional two-person podcast studio, vertical-friendly composition. A charismatic fictional adult bearded man with short dark hair sits on the LEFT; an elegant fictional adult woman with long dark brown hair sits on the RIGHT. They are different people, not celebrities. Both wear premium black studio headphones and speak into professional broadcast microphones on desk stands. Dark luxury studio, walnut table, acoustic panels, tasteful shelves, books, plants, practical tungsten lamps, subtle black and metallic-gold accents, cinematic depth of field, realistic skin pores, natural hands, realistic eyes, authentic microphones and cables, premium camera and lighting, 35mm photography, soft rim light, rich shadows, believable reflections. Leave clean negative space around the hosts for captions. No cartoon, no 3D render, no illustration, no public figure, no celebrity likeness, no logo, no watermark, no readable text, no distorted hands, no extra people. Style: ${look}.`;
const image=await flux2(env,prompt);return json({dataURI:`data:image/jpeg;base64,${image}`,model:"FLUX.2 Klein 9B"})
}catch(e){return json({error:"Studio generation failed.",detail:String(e?.message||e)},500)}
if(u.pathname==="/api/image"&&req.method==="POST")try{const b=await req.json();const prompt=`Premium photorealistic cinematic B-roll for a motivational podcast, vertical-friendly composition, documentary photography, realistic materials, natural dramatic lighting, shallow depth of field, no recognizable public figures, no logos, no text, no watermark. ${String(b.prompt||"")}`;const image=await flux2(env,prompt);return json({dataURI:`data:image/jpeg;base64,${image}`})
}catch(e){return json({error:"B-roll generation failed.",detail:String(e?.message||e)},500)}
if(u.pathname==="/api/voice"&&req.method==="POST")try{const b=await req.json(),text=String(b.text||"").trim();if(!text)return json({error:"Voice text is required."},400);const audio=await env.AI.run("@cf/deepgram/aura-2-en",{text,speaker:String(b.speaker||"zeus"),encoding:"mp3"});const ab=await new Response(audio).arrayBuffer();return json({base64:b64(new Uint8Array(ab))})}catch(e){return json({error:"Voice generation failed.",detail:String(e?.message||e)},500)}
return env.ASSETS.fetch(req)}};
