import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function verifyState(
  state: string,
  secret: string,
): Promise<{ uid: string; r: string } | null> {
  const [b64, sig] = state.split(".");
  if (!b64 || !sig) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedBuf = await crypto.subtle.sign("HMAC", key, enc.encode(b64));
  const expected = btoa(
    String.fromCharCode(...new Uint8Array(expectedBuf)),
  ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (expected !== sig) return null;
  try {
    const json = JSON.parse(atob(b64));
    if (typeof json.uid !== "string") return null;
    // 10-min validity
    if (Date.now() - Number(json.t || 0) > 10 * 60 * 1000) return null;
    return { uid: json.uid, r: typeof json.r === "string" ? json.r : "/" };
  } catch {
    return null;
  }
}

function htmlRedirect(url: string, message: string) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${message}</title></head><body style="font-family:sans-serif;padding:24px"><p>${message}</p><script>setTimeout(function(){window.location.replace(${
      JSON.stringify(url)
    })},400)</script></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const clientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET")!;
  const stateSecret = Deno.env.get("GOOGLE_DRIVE_OAUTH_STATE_SECRET")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\./)?.[1];
  const redirectUri =
    `https://${projectRef}.supabase.co/functions/v1/google-drive-oauth-callback`;

  const referer = req.headers.get("referer") || "/";
  const origin = (() => {
    try {
      return new URL(referer).origin;
    } catch {
      return "";
    }
  })();

  if (error) {
    return htmlRedirect(
      `${origin}/?drive=error&reason=${encodeURIComponent(error)}`,
      "Cancelado",
    );
  }
  if (!code || !state) {
    return htmlRedirect(
      `${origin}/?drive=error&reason=missing_params`,
      "Erro",
    );
  }

  const verified = await verifyState(state, stateSecret);
  if (!verified) {
    return htmlRedirect(`${origin}/?drive=error&reason=bad_state`, "Erro");
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    return htmlRedirect(
      `${origin}/?drive=error&reason=token_exchange`,
      "Erro ao trocar token",
    );
  }

  const accessToken: string = tokenJson.access_token;
  const refreshToken: string | undefined = tokenJson.refresh_token;
  const expiresIn: number = tokenJson.expires_in || 3600;
  const scope: string = tokenJson.scope || "";

  // Get user email
  const userInfoRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const userInfo = await userInfoRes.json();
  const googleEmail: string = userInfo.email || "unknown";

  // Create root folder "Vouti" if it doesn't exist (search by name + appProperties)
  let rootFolderId: string | null = null;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${
      encodeURIComponent(
        "name='Vouti' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      )
    }&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const searchJson = await searchRes.json();
  if (searchJson.files && searchJson.files.length > 0) {
    rootFolderId = searchJson.files[0].id;
  } else {
    const createRes = await fetch(
      "https://www.googleapis.com/drive/v3/files?fields=id",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Vouti",
          mimeType: "application/vnd.google-apps.folder",
        }),
      },
    );
    const createJson = await createRes.json();
    rootFolderId = createJson.id || null;
  }

  // Persist tokens with service role (bypass RLS for trusted server-side write)
  const admin = createClient(supabaseUrl, serviceKey);
  const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000)
    .toISOString();

  const upsertPayload: Record<string, unknown> = {
    user_id: verified.uid,
    google_email: googleEmail,
    access_token: accessToken,
    expires_at: expiresAt,
    scope,
    root_folder_id: rootFolderId,
    updated_at: new Date().toISOString(),
  };
  if (refreshToken) upsertPayload.refresh_token = refreshToken;

  // If no refresh_token returned (user re-consenting) preserve existing one
  if (!refreshToken) {
    const { data: existing } = await admin
      .from("user_google_drive_tokens")
      .select("refresh_token")
      .eq("user_id", verified.uid)
      .maybeSingle();
    if (existing?.refresh_token) {
      upsertPayload.refresh_token = existing.refresh_token;
    }
  }

  if (!upsertPayload.refresh_token) {
    return htmlRedirect(
      `${origin}/?drive=error&reason=no_refresh_token`,
      "Sem refresh token — tente novamente.",
    );
  }

  const { error: upsertErr } = await admin
    .from("user_google_drive_tokens")
    .upsert(upsertPayload, { onConflict: "user_id" });

  if (upsertErr) {
    return htmlRedirect(
      `${origin}/?drive=error&reason=db_${
        encodeURIComponent(upsertErr.message)
      }`,
      "Erro ao salvar token",
    );
  }

  const target = `${origin}${verified.r}${
    verified.r.includes("?") ? "&" : "?"
  }drive=connected`;
  return htmlRedirect(target, "Conectado! Redirecionando...");
});