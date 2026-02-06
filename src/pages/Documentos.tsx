import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { FileText, Plus, Search, ArrowLeft, Trash2 } from "lucide-react";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { useDocumentos } from "@/hooks/useDocumentos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Documentos() {
  const { navigate } = useTenantNavigation();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { documentos, isLoading, deleteDocumento, isDeleting } = useDocumentos();

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

  const getClienteName = (doc: typeof documentos[0]) => {
    if (!doc.cliente) return "-";
    return doc.cliente.nome_pessoa_fisica || doc.cliente.nome_pessoa_juridica || "-";
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDocumento(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <DashboardLayout currentPage="documentos">
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Documentos</h1>
              </div>
            </div>
            <Button onClick={() => navigate("/documentos/novo")} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documento..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Count */}
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredDocumentos.length} documento(s)
          </p>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Origem</TableHead>
                  <TableHead>Documento / Descrição</TableHead>
                  <TableHead>Caso / Cliente</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Última Edição</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredDocumentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "Nenhum documento encontrado" : "Nenhum documento criado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocumentos.map((doc) => (
                    <TableRow 
                      key={doc.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => navigate(`/documentos/${doc.id}`)}
                    >
                      <TableCell>
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{doc.titulo}</div>
                          {doc.descricao && (
                            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {doc.descricao}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getClienteName(doc)}</TableCell>
                      <TableCell>{doc.responsavel?.full_name || "-"}</TableCell>
                      <TableCell>
                        {format(new Date(doc.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(doc.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O documento será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
