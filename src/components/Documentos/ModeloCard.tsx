import { Button } from "@/components/ui/button";
import { FileText, Edit2, Copy, UserPlus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DocumentoWithRelations } from "@/types/documento";

interface ModeloCardProps {
  modelo: DocumentoWithRelations;
  onEdit: () => void;
  onDuplicate: () => void;
  onGerar: () => void;
  onDelete: () => void;
}

function stripHtml(html: string | null): string {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export function ModeloCard({ modelo, onEdit, onDuplicate, onGerar, onDelete }: ModeloCardProps) {
  const preview = stripHtml(modelo.conteudo_html).slice(0, 180);

  return (
    <div className="group relative bg-background border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-md transition-all flex flex-col">
      {/* Mini "folha" preview */}
      <button
        onClick={onEdit}
        className="relative h-40 bg-white dark:bg-muted/30 border-b overflow-hidden text-left p-4 cursor-pointer"
      >
        <div className="absolute top-2 left-2">
          <FileText className="h-4 w-4 text-primary/70" />
        </div>
        <div
          className="text-[8px] leading-tight text-foreground/70 mt-4"
          style={{ fontFamily: "Times New Roman, serif" }}
        >
          {preview || <span className="italic text-muted-foreground">Modelo vazio</span>}
          {preview.length >= 180 && "..."}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
      </button>

      <div className="p-3 flex flex-col gap-2">
        <div>
          <h3 className="font-medium text-sm truncate" title={modelo.titulo}>
            {modelo.titulo}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Atualizado {format(new Date(modelo.updated_at), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="default"
            className="flex-1 h-8 gap-1.5 text-xs"
            onClick={onGerar}
          >
            <UserPlus className="h-3 w-3" />
            Gerar p/ cliente
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onEdit}
            title="Editar modelo"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onDuplicate}
            title="Duplicar"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}