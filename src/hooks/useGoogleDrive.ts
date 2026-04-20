import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
}

export interface DriveStatus {
  connected: boolean;
  email: string | null;
  rootFolderId: string | null;
}

async function invoke<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("google-drive-proxy", {
    body: { action, ...payload },
  });
  if (error) throw error;
  if ((data as { error?: unknown })?.error) {
    throw new Error(typeof (data as { error: unknown }).error === "string"
      ? (data as { error: string }).error
      : JSON.stringify((data as { error: unknown }).error));
  }
  return data as T;
}

export function useGoogleDrive() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke<DriveStatus>("status");
      setStatus(data);
    } catch {
      setStatus({ connected: false, email: null, rootFolderId: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const connect = useCallback(async () => {
    const returnTo = window.location.pathname + window.location.search;
    const { data, error } = await supabase.functions.invoke(
      "google-drive-oauth-start",
      { body: { returnTo } },
    );
    if (error) throw error;
    const url = (data as { url?: string })?.url;
    if (!url) throw new Error("Falha ao iniciar OAuth");
    window.location.href = url;
  }, []);

  const disconnect = useCallback(async () => {
    await invoke("disconnect");
    await refreshStatus();
  }, [refreshStatus]);

  const list = useCallback(
    async (folderId?: string, search?: string) => {
      return await invoke<{ files: DriveFile[]; rootFolderId: string }>(
        "list",
        { folderId, search },
      );
    },
    [],
  );

  const createFolder = useCallback(
    async (name: string, parentId?: string) =>
      await invoke<{ file: DriveFile }>("create_folder", { name, parentId }),
    [],
  );

  const remove = useCallback(
    async (fileId: string) => await invoke("delete", { fileId }),
    [],
  );

  const upload = useCallback(
    async (file: File, parentId?: string) => {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const data = btoa(bin);
      return await invoke<{ file: DriveFile }>("upload", {
        name: file.name,
        contentType: file.type || "application/octet-stream",
        data,
        parentId,
      });
    },
    [],
  );

  const download = useCallback(
    async (file: DriveFile) => {
      const res = await invoke<{ data: string; contentType: string }>(
        "download",
        { fileId: file.id },
      );
      const bin = atob(res.data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: res.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    [],
  );

  const about = useCallback(
    async () =>
      await invoke<{
        storageQuota: { limit: string; usage: string };
        user: { emailAddress: string };
      }>("about"),
    [],
  );

  return {
    status,
    loading,
    refreshStatus,
    connect,
    disconnect,
    list,
    createFolder,
    remove,
    upload,
    download,
    about,
  };
}