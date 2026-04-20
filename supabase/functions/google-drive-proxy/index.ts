import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory rate limit (per cold start) — 30 req / 10s per user
const rateMap = new Map<string, number[]>();
function rateLimit(userId: string): boolean {
  const now = Date.now();
  const arr = rateMap.get(userId) || [];
  const recent = arr.filter((t) => now - t < 10_000);
  recent.push(now);
  rateMap.set(userId, recent);
  return recent.length <= 30;
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_DRIVE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.access_token) return null;
  return { access_token: json.access_token, expires_in: json.expires_in || 3600 };
}

async function getValidToken(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ accessToken: string; rootFolderId: string | null } | { error: string }> {
  const { data, error } = await admin
    .from("user_google_drive_tokens")
    .select("access_token, refresh_token, expires_at, root_folder_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return { error: "not_connected" };

  const expiresAt = new Date(data.expires_at as string).getTime();
  if (Date.now() < expiresAt - 30_000) {
    return {
      accessToken: data.access_token as string,
      rootFolderId: (data.root_folder_id as string) ?? null,
    };
  }
  const refreshed = await refreshAccessToken(data.refresh_token as string);
  if (!refreshed) return { error: "refresh_failed" };
  const newExpires = new Date(Date.now() + (refreshed.expires_in - 60) * 1000)
    .toISOString();
  await admin
    .from("user_google_drive_tokens")
    .update({
      access_token: refreshed.access_token,
      expires_at: newExpires,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  return {
    accessToken: refreshed.access_token,
    rootFolderId: (data.root_folder_id as string) ?? null,
  };
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "missing auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return jsonResp({ error: "unauthorized" }, 401);

    if (!rateLimit(user.id)) return jsonResp({ error: "rate_limited" }, 429);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action;
    if (!action) return jsonResp({ error: "missing_action" }, 400);

    // status / disconnect don't require valid token first
    if (action === "status") {
      const { data } = await admin
        .from("user_google_drive_tokens")
        .select("google_email, root_folder_id, scope")
        .eq("user_id", user.id)
        .maybeSingle();
      return jsonResp({
        connected: !!data,
        email: data?.google_email ?? null,
        rootFolderId: data?.root_folder_id ?? null,
      });
    }

    if (action === "disconnect") {
      const { data } = await admin
        .from("user_google_drive_tokens")
        .select("refresh_token")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.refresh_token) {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${
            encodeURIComponent(data.refresh_token as string)
          }`,
          { method: "POST" },
        ).catch(() => {});
      }
      await admin.from("user_google_drive_tokens").delete().eq(
        "user_id",
        user.id,
      );
      return jsonResp({ ok: true });
    }

    const tok = await getValidToken(admin, user.id);
    if ("error" in tok) return jsonResp({ error: tok.error }, 401);
    const { accessToken, rootFolderId } = tok;

    const ROOT = rootFolderId || "root";

    if (action === "list") {
      const folderId: string = body?.folderId || ROOT;
      const search: string = body?.search || "";
      const qParts = [
        `'${folderId}' in parents`,
        "trashed = false",
      ];
      if (search) {
        qParts.push(`name contains '${search.replace(/'/g, "\\'")}'`);
      }
      const fields =
        "files(id,name,mimeType,size,modifiedTime,iconLink,webViewLink,parents),nextPageToken";
      const url =
        `https://www.googleapis.com/drive/v3/files?q=${
          encodeURIComponent(qParts.join(" and "))
        }&fields=${
          encodeURIComponent(fields)
        }&orderBy=folder,name&pageSize=200`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const j = await r.json();
      if (!r.ok) return jsonResp({ error: j }, r.status);
      return jsonResp({ files: j.files || [], rootFolderId: ROOT });
    }

    if (action === "create_folder") {
      const name: string = body?.name;
      const parent: string = body?.parentId || ROOT;
      if (!name) return jsonResp({ error: "missing_name" }, 400);
      const r = await fetch(
        "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,modifiedTime",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parent],
          }),
        },
      );
      const j = await r.json();
      if (!r.ok) return jsonResp({ error: j }, r.status);
      return jsonResp({ file: j });
    }

    if (action === "delete") {
      const fileId: string = body?.fileId;
      if (!fileId) return jsonResp({ error: "missing_fileId" }, 400);
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!r.ok && r.status !== 204) {
        const j = await r.json().catch(() => ({}));
        return jsonResp({ error: j }, r.status);
      }
      return jsonResp({ ok: true });
    }

    if (action === "download") {
      const fileId: string = body?.fileId;
      if (!fileId) return jsonResp({ error: "missing_fileId" }, 400);
      // Returns a short-lived link by streaming the file content as base64
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        return jsonResp({ error: j }, r.status);
      }
      const buf = new Uint8Array(await r.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const b64 = btoa(bin);
      const contentType = r.headers.get("content-type") ||
        "application/octet-stream";
      return jsonResp({ data: b64, contentType });
    }

    if (action === "upload") {
      const name: string = body?.name;
      const contentType: string = body?.contentType || "application/octet-stream";
      const dataB64: string = body?.data; // base64 string
      const parent: string = body?.parentId || ROOT;
      if (!name || !dataB64) return jsonResp({ error: "missing_fields" }, 400);

      const bin = atob(dataB64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const boundary = "boundary" + crypto.randomUUID();
      const metadata = JSON.stringify({ name, parents: [parent] });
      const enc = new TextEncoder();
      const pre = enc.encode(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
      );
      const post = enc.encode(`\r\n--${boundary}--`);
      const fullBody = new Uint8Array(pre.length + bytes.length + post.length);
      fullBody.set(pre, 0);
      fullBody.set(bytes, pre.length);
      fullBody.set(post, pre.length + bytes.length);

      const r = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: fullBody,
        },
      );
      const j = await r.json();
      if (!r.ok) return jsonResp({ error: j }, r.status);
      return jsonResp({ file: j });
    }

    if (action === "about") {
      const r = await fetch(
        "https://www.googleapis.com/drive/v3/about?fields=storageQuota,user",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const j = await r.json();
      if (!r.ok) return jsonResp({ error: j }, r.status);
      return jsonResp(j);
    }

    return jsonResp({ error: "unknown_action" }, 400);
  } catch (e) {
    return jsonResp({ error: String((e as Error).message || e) }, 500);
  }
});