import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus, Search, ChevronRight } from "lucide-react";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { useDocumentos } from "@/hooks/useDocumentos";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DocumentosDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentosDrawer({ open, onOpenChange }: DocumentosDrawerProps) {
  const { navigate } = useTenantNavigation();
  const [searchTerm, setSearchTerm] = useState("");
  const { documentos, isLoading } = useDocumentos();

  const filteredDocumentos = useMemo(() => {
    if (!searchTerm.trim()) return documentos;
    const term = searchTerm.toLowerCase();
    return documentos.filter(
      d => d.titulo.toLowerCase().includes(term) || 
           d.descricao?.toLowerCase().includes(term) ||
           d.cliente?.nome_pessoa_fisica?.toLowerCase().includes(term) ||
           d.cliente?.nome_pessoa_juridica?.toLowerCase().includes(term)
    );
  }, [documentos, searchTerm]);

  const handleSelectDocumento = (id: string) => {
    navigate(`/documentos/${id}`);
    onOpenChange(false);
  };

  const handleNovoDocumento = () => {
    navigate("/documentos/novo");
    onOpenChange(false);
  };

  const getClienteName = (doc: typeof documentos[0]) => {
    if (!doc.cliente) return "Sem cliente";
    return doc.cliente.nome_pessoa_fisica || doc.cliente.nome_pessoa_juridica || "Sem cliente";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="left-offset" className="p-0 flex flex-col">
        {/* Barra decorativa no lado direito */}
        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary/20 via-border to-primary/20 pointer-events-none" />
        <SheetTitle className="sr-only">Documentos</SheetTitle>
        
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Documentos</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            <Button
              size="sm"
              className="gap-2"
              onClick={handleNovoDocumento}
            >
              <Plus className="h-4 w-4" />
              Novo Documento
            </Button>

            <div className="relative max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="space-y-1 pr-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              ) : filteredDocumentos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "Nenhum documento encontrado" : "Nenhum documento criado"}
                </div>
              ) : (
                filteredDocumentos.slice(0, 10).map((doc, index) => (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectDocumento(doc.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-colors",
                      "hover:bg-accent/50 focus:bg-accent/50 focus:outline-none",
                      "group",
                      index < Math.min(filteredDocumentos.length, 10) - 1 && "border-b border-border/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {doc.titulo}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {getClienteName(doc)}
                        </div>
                        <div className="text-xs text-muted-foreground/70 mt-0.5">
                          {format(new Date(doc.updated_at), "dd MMM yyyy", { locale: ptBR })}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                    </div>
                  </button>
                ))
              )}
            </div>

            <Button
              variant="ghost"
              className="w-full justify-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                navigate("/documentos");
                onOpenChange(false);
              }}
            >
              Ver todos os documentos
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
