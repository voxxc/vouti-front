import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { FileText, Plus, Search, ArrowLeft, Trash2, FileStack } from "lucide-react";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { useDocumentos } from "@/hooks/useDocumentos";
import { ModeloCard } from "@/components/Documentos/ModeloCard";
import { SeletorCliente } from "@/components/Documentos/SeletorCliente";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Documentos() {
  const { navigate } = useTenantNavigation();
  const [tab, setTab] = useState<"modelos" | "documentos">("modelos");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [gerarParaModelo, setGerarParaModelo] = useState<string | null>(null);
  const [gerarClienteId, setGerarClienteId] = useState<string | null>(null);

  const { documentos: modelos, isLoading: loadingModelos, deleteDocumento, isDeleting, createDocumento, gerarDeModelo, isGenerating } = useDocumentos("modelo");
  const { documentos, isLoading } = useDocumentos("documento");

  const filteredModelos = useMemo(() => {
    if (!searchTerm.trim()) return modelos;
    const t = searchTerm.toLowerCase();
    return modelos.filter((m) => m.titulo.toLowerCase().includes(t));
  }, [modelos, searchTerm]);

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

  const handleNovoModelo = async () => {
    const result = await createDocumento({
      titulo: "Novo modelo",
      conteudo_html: "",
      tipo: "modelo",
    });
    if (result) navigate(`/documentos/${result.id}`);
  };

  const handleDuplicar = async (modelo: typeof modelos[0]) => {
    const result = await createDocumento({
      titulo: `${modelo.titulo} (cópia)`,
      conteudo_html: modelo.conteudo_html || "",
      descricao: modelo.descricao || undefined,
      tipo: "modelo",
    });
    if (result) navigate(`/documentos/${result.id}`);
  };

  const handleConfirmGerar = async () => {
    if (!gerarParaModelo) return;
    const novo = await gerarDeModelo({
      modeloId: gerarParaModelo,
      clienteId: gerarClienteId || undefined,
    });
    setGerarParaModelo(null);
    setGerarClienteId(null);
    if (novo) navigate(`/documentos/${novo.id}`);
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
            {tab === "modelos" ? (
              <Button onClick={handleNovoModelo} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo modelo
              </Button>
            ) : (
              <Button onClick={() => navigate("/documentos/novo")} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo documento
              </Button>
            )}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "modelos" | "documentos")}>
            <TabsList>
              <TabsTrigger value="modelos" className="gap-2">
                <FileStack className="h-3.5 w-3.5" />
                Modelos ({modelos.length})
              </TabsTrigger>
              <TabsTrigger value="documentos" className="gap-2">
                <FileText className="h-3.5 w-3.5" />
                Documentos do cliente ({documentos.length})
              </TabsTrigger>
            </TabsList>

            {/* Search */}
            <div className="relative max-w-md mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tab === "modelos" ? "Buscar modelo..." : "Buscar documento ou cliente..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <TabsContent value="modelos" className="mt-4">
              {loadingModelos ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              ) : filteredModelos.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                  <FileStack className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    {searchTerm ? "Nenhum modelo encontrado" : "Nenhum modelo criado ainda"}
                  </p>
                  {!searchTerm && (
                    <Button onClick={handleNovoModelo} variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Criar primeiro modelo
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredModelos.map((m) => (
                    <ModeloCard
                      key={m.id}
                      modelo={m}
                      onEdit={() => navigate(`/documentos/${m.id}`)}
                      onDuplicate={() => handleDuplicar(m)}
                      onGerar={() => setGerarParaModelo(m.id)}
                      onDelete={() => setDeleteId(m.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documentos" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredDocumentos.length} documento(s)
              </p>
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
                          {doc.modelo_origem && (
                            <div className="text-[11px] text-muted-foreground">
                              de: {doc.modelo_origem.titulo}
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
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O item será excluído permanentemente.
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

      {/* Gerar para cliente */}
      <Dialog open={!!gerarParaModelo} onOpenChange={(o) => !o && setGerarParaModelo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar documento para cliente</DialogTitle>
            <DialogDescription>
              Será criada uma cópia do modelo vinculada ao cliente selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <SeletorCliente value={gerarClienteId} onChange={(id) => setGerarClienteId(id)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGerarParaModelo(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmGerar} disabled={isGenerating}>
              {isGenerating ? "Gerando..." : "Gerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
