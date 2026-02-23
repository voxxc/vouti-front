import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const callerUserId = claimsData.claims.sub;

    // Check caller is admin in their tenant
    const { data: callerProfile } = await userClient.from("profiles").select("tenant_id").eq("user_id", callerUserId).single();
    if (!callerProfile?.tenant_id) {
      return new Response(JSON.stringify({ error: "Tenant não encontrado" }), { status: 403, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .eq("tenant_id", callerProfile.tenant_id)
      .in("role", ["admin", "controller"])
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Sem permissão. Apenas admin/controller." }), { status: 403, headers: corsHeaders });
    }

    const { userId, full_name, email, password } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId é obrigatório" }), { status: 400, headers: corsHeaders });
    }

    // Verify target user belongs to same tenant
    const { data: targetProfile } = await adminClient.from("profiles").select("tenant_id").eq("user_id", userId).single();
    if (!targetProfile || targetProfile.tenant_id !== callerProfile.tenant_id) {
      return new Response(JSON.stringify({ error: "Usuário não pertence ao seu tenant" }), { status: 403, headers: corsHeaders });
    }

    // Update auth user (email/password)
    const authUpdates: any = {};
    if (email) authUpdates.email = email;
    if (password) authUpdates.password = password;

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, authUpdates);
      if (authError) {
        console.error("Auth update error:", authError);
        return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: corsHeaders });
      }
    }

    // Update profile (name, email)
    const profileUpdates: any = {};
    if (full_name) profileUpdates.full_name = full_name;
    if (email) profileUpdates.email = email;

    if (Object.keys(profileUpdates).length > 0) {
      await adminClient.from("profiles").update(profileUpdates).eq("user_id", userId);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
