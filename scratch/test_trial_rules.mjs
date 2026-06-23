import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan credenciales de Supabase en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log("Iniciando verificación de datos de prueba...");
  
  // 1. Obtener una organización para simular pruebas
  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, name")
    .limit(1);
    
  if (orgsError || !orgs || orgs.length === 0) {
    console.error("Error al obtener organizaciones o no hay ninguna:", orgsError);
    return;
  }
  
  const org = orgs[0];
  console.log(`Organización encontrada para pruebas: ${org.name} (${org.id})`);
  
  // 2. Obtener un usuario de perfiles para simular
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .limit(1);
    
  if (profilesError || !profiles || profiles.length === 0) {
    console.error("Error al obtener perfiles o no hay ninguno:", profilesError);
    return;
  }
  
  const profile = profiles[0];
  console.log(`Usuario encontrado para pruebas: ${profile.full_name} (${profile.id})`);
  
  // 3. Consultar las solicitudes de prueba actuales para este usuario y organización
  const { data: requests, error: requestsError } = await supabase
    .from("trial_requests")
    .select("id, status, feedback_text, created_at")
    .eq("organization_id", org.id)
    .eq("user_id", profile.id);
    
  if (requestsError) {
    console.error("Error al consultar solicitudes de prueba:", requestsError);
  } else {
    console.log(`Solicitudes de prueba encontradas para este usuario y centro: ${requests.length}`);
    requests.forEach(r => {
      console.log(`- Solicitud ${r.id}: estado=${r.status}, firma IP=${r.feedback_text}, fecha=${r.created_at}`);
    });
  }
  
  console.log("Verificación de base de datos completada.");
}

verify();
