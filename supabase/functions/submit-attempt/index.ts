import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Content-Type":"application/json" };
function reply(body, status=200){ return new Response(JSON.stringify(body),{status,headers:cors}); }
async function clients(req){
 const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const token=(req.headers.get("Authorization")||"").replace("Bearer ","");
 const admin=createClient(url,service);
 const {data:{user},error}=await admin.auth.getUser(token);
 if(error||!user) return {error:"Sesión no válida"};
 const {data:profile}=await admin.from("profiles").select("*").eq("id",user.id).single();
 return {admin,user,profile};
}

Deno.serve(async req=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return reply({error:"Método no permitido"},405);
 const c=await clients(req); if(c.error) return reply({error:c.error},401);
 if(c.profile?.role!=="participant") return reply({error:"Solo participante"},403);
 if(c.profile.gift_choice) return reply({error:"La trivia ya está bloqueada"},403);
 const body=await req.json().catch(()=>({}));
 if(!Array.isArray(body.answers)||body.answers.length!==3) return reply({error:"Debes enviar las tres respuestas"},400);
 const {data:questions,error:qerr}=await c.admin.from("questions").select("id,correct_option").eq("active",true).order("id");
 if(qerr||!questions||questions.length!==3) return reply({error:"La trivia no está configurada con tres preguntas"},500);
 let score=0;
 const safeAnswers=questions.map(q=>{
   const submitted=body.answers.find((a:any)=>Number(a.question_id)===q.id);
   const selected=Number(submitted?.selected_option);
   const correct=Number.isInteger(selected)&&selected===q.correct_option;
   if(correct) score++;
   return {question_id:q.id,selected_option:Number.isInteger(selected)?selected:-1,correct};
 });
 const {error:insertError}=await c.admin.from("attempts").insert({participant_id:c.user.id,answers:safeAnswers,score,is_correct:score===3});
 if(insertError) return reply({error:insertError.message},500);
 return reply({score,correct:score===3,message:score===3?"¡Lo lograste!": "¡Buen intento! Puedes volver a probar."});
});
