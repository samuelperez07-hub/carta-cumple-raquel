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
 if(c.profile.gift_choice) return reply({error:"Ya existe una elección y no se puede cambiar"},409);
 const {data:success}=await c.admin.from("attempts").select("id").eq("participant_id",c.user.id).eq("is_correct",true).limit(1);
 if(!success?.length) return reply({error:"Primero debes conseguir 3/3"},403);
 const body=await req.json().catch(()=>({}));
 const giftId=String(body.gift_id||"");
 const {data:gift}=await c.admin.from("gifts").select("id,title,description,emoji").eq("id",giftId).eq("active",true).single();
 if(!gift) return reply({error:"Opción de regalo no válida"},400);
 const {data:updated,error}=await c.admin.from("profiles").update({gift_choice:gift.id,gift_chosen_at:new Date().toISOString()}).eq("id",c.user.id).is("gift_choice",null).select().maybeSingle();
 if(error) return reply({error:error.message},500);
 if(!updated) return reply({error:"La elección ya fue registrada. No se puede cambiar."},409);
 return reply({gift});
});
