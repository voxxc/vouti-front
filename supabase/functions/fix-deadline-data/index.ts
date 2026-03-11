import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("deadlines")
    .update({ concluido_por: "51d47f3b-fbe6-4811-9817-a45040c1bdee" })
    .in("id", [
      "3f57c526-12e0-4862-89b7-16257e5934de",
      "aefb9e4a-3831-4cda-a245-1c8b64cdc490",
    ])
    .eq("completed", true)
    .is("concluido_por", null)
    .select("id, title, concluido_por");

  return new Response(JSON.stringify({ data, error }), {
    headers: { "Content-Type": "application/json" },
  });
});
