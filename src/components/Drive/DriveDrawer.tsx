import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Cloud, Loader2, LogOut } from "lucide-react";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { DriveConnectCard } from "./DriveConnectCard";
import { DriveFileList } from "./DriveFileList";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DriveDrawer = ({ open, onOpenChange }: Props) => {
  const drive = useGoogleDrive();
  const [connecting, setConnecting] = useState(false);
  const [quota, setQuota] = useState<{ usage: string; limit: string } | null>(
    null,
  );

  useEffect(() => {
    if (open) {
      drive.refreshStatus();
    }
  }, [open, drive.refreshStatus]);

  useEffect(() => {
    if (drive.status?.connected) {
      drive.about().then((a) => setQuota(a.storageQuota)).catch(() => {});
    } else {
      setQuota(null);
    }
  }, [drive.status?.connected, drive.about]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await drive.connect();
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Desconectar Google Drive? Os arquivos no Drive permanecem.")) {
      return;
    }
    try {
      await drive.disconnect();
      toast.success("Drive desconectado");
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  const formatGB = (s?: string) => {
    if (!s) return "?";
    const n = Number(s);
    if (!Number.isFinite(n)) return "?";
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        <SheetHeader className="p-6 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            Meu Drive
          </SheetTitle>
          <SheetDescription>
            {drive.status?.connected
              ? `Conectado como ${drive.status.email}`
              : "Use seu Google Drive pessoal para arquivos individuais"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-6 pt-4 min-h-0">
          {drive.loading && !drive.status ? (
            <div className="flex items-center justify-center flex-1 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !drive.status?.connected ? (
            <DriveConnectCard
              onConnect={handleConnect}
              connecting={connecting}
            />
          ) : (
            <>
              {quota && (
                <div className="text-xs text-muted-foreground mb-3">
                  Espaço usado: {formatGB(quota.usage)} de {formatGB(quota.limit)}
                </div>
              )}
              <div className="flex-1 min-h-0">
                <DriveFileList
                  rootFolderId={drive.status.rootFolderId || "root"}
                  list={drive.list}
                  upload={drive.upload}
                  remove={drive.remove}
                  download={drive.download}
                  createFolder={drive.createFolder}
                />
              </div>
              <div className="pt-4 mt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive w-full justify-start"
                  onClick={handleDisconnect}
                >
                  <LogOut className="h-4 w-4" />
                  Desconectar Google Drive
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};