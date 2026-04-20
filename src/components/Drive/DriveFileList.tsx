import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Download,
  ExternalLink,
  Folder,
  FolderPlus,
  Home,
  Loader2,
  Search,
  Trash2,
  File as FileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { DriveFile } from "@/hooks/useGoogleDrive";
import { DriveUploadButton } from "./DriveUploadButton";

interface Props {
  rootFolderId: string;
  list: (folderId?: string, search?: string) => Promise<{
    files: DriveFile[];
    rootFolderId: string;
  }>;
  upload: (file: File, parentId?: string) => Promise<unknown>;
  remove: (fileId: string) => Promise<unknown>;
  download: (file: DriveFile) => Promise<void>;
  createFolder: (
    name: string,
    parentId?: string,
  ) => Promise<{ file: DriveFile }>;
}

const FOLDER_MIME = "application/vnd.google-apps.folder";

function formatSize(size?: string) {
  if (!size) return "";
  const n = Number(size);
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export const DriveFileList = ({
  rootFolderId,
  list,
  upload,
  remove,
  download,
  createFolder,
}: Props) => {
  const [stack, setStack] = useState<{ id: string; name: string }[]>([
    { id: rootFolderId, name: "Vouti" },
  ]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<DriveFile | null>(null);

  const current = stack[stack.length - 1];

  const refresh = useMemo(() => {
    return async () => {
      setLoading(true);
      try {
        const r = await list(current.id, search.trim() || undefined);
        setFiles(r.files);
      } catch (e) {
        toast.error(`Erro ao listar: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    };
  }, [current.id, list, search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleNewFolder = async () => {
    const name = window.prompt("Nome da nova pasta:");
    if (!name?.trim()) return;
    try {
      await createFolder(name.trim(), current.id);
      toast.success("Pasta criada");
      refresh();
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  const handleUpload = async (file: File) => {
    await upload(file, current.id);
    refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id);
      toast.success("Removido");
      setDeleting(null);
      refresh();
    } catch (e) {
      toast.error(`Erro ao remover: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <DriveUploadButton onUpload={handleUpload} />
        <Button size="sm" variant="outline" onClick={handleNewFolder}>
          <FolderPlus className="h-4 w-4" />
          Nova pasta
        </Button>
        <div className="relative ml-auto flex-1 min-w-[180px]">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar nesta pasta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 flex-wrap">
        {stack.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            <button
              onClick={() => setStack(stack.slice(0, i + 1))}
              className="hover:text-foreground flex items-center gap-1"
            >
              {i === 0 && <Home className="h-3 w-3" />}
              {s.name}
            </button>
          </div>
        ))}
      </div>

      {/* List */}
      <ScrollArea className="flex-1 -mx-2">
        <div className="px-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              Pasta vazia
            </div>
          ) : (
            <ul className="space-y-1">
              {files.map((f) => {
                const isFolder = f.mimeType === FOLDER_MIME;
                return (
                  <li
                    key={f.id}
                    className="group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors"
                  >
                    <button
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => {
                        if (isFolder) {
                          setStack([...stack, { id: f.id, name: f.name }]);
                        }
                      }}
                    >
                      {isFolder ? (
                        <Folder className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm truncate">{f.name}</span>
                      {!isFolder && (
                        <span className="text-xs text-muted-foreground shrink-0 ml-auto mr-2">
                          {formatSize(f.size)}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isFolder && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Baixar"
                          onClick={() =>
                            download(f).catch((e) =>
                              toast.error(`Erro: ${(e as Error).message}`)
                            )}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {f.webViewLink && (
                        <a
                          href={f.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
                          title="Abrir no Google Drive"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Excluir"
                        onClick={() => setDeleting(f)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo será movido para a lixeira do seu Google Drive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};