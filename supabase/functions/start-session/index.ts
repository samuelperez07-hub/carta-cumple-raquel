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
 const {data,error}=await c.admin.from("profiles").update({first_visit_at: c.profile.first_visit_at || new Date().toISOString()}).eq("id",c.user.id).select().single();
 if(error) return reply({error:error.message},500);
 return reply({first_visit_at:data.first_visit_at,gift_choice:data.gift_choice});
});
