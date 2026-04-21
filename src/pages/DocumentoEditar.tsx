import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { DocumentoEditor, type DocumentoEditorHandle } from "@/components/Documentos/DocumentoEditor";
import { VariaveisPanel } from "@/components/Documentos/VariaveisPanel";
import { SeletorCliente } from "@/components/Documentos/SeletorCliente";
import { exportDocumentoToPDF } from "@/components/Documentos/DocumentosPDFExport";
import { ArrowLeft, Save, FileDown, Eye, EyeOff, FileText } from "lucide-react";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { useDocumentos, useDocumento } from "@/hooks/useDocumentos";
import { useClientes } from "@/hooks/useClientes";
import { applyClienteVariables } from "@/lib/documentVariables";
import type { Cliente } from "@/types/cliente";
import { toast } from "sonner";

export default function DocumentoEditar() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const tipoParam = searchParams.get("tipo") === "modelo" ? "modelo" : "documento";
  const clienteParam = searchParams.get("cliente");
  const { navigate } = useTenantNavigation();
  const isNew = id === "novo";

  const { createDocumento, updateDocumento, isCreating, isUpdating } = useDocumentos();
  const { data: documento, isLoading } = useDocumento(isNew ? undefined : id);
  const { fetchClienteById } = useClientes();

  const editorRef = useRef<DocumentoEditorHandle>(null);
  const [titulo, setTitulo] = useState("");
  const [conteudoHtml, setConteudoHtml] = useState("");
  const [tipo, setTipo] = useState<"modelo" | "documento">(tipoParam);
  const [clienteId, setClienteId] = useState<string | null>(clienteParam);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);

  // Carregar dados do documento existente
  useEffect(() => {
    if (documento) {
      setTitulo(documento.titulo);
      setConteudoHtml(documento.conteudo_html || "");
      setTipo(documento.tipo);
      setClienteId(documento.cliente_id);
    }
  }, [documento]);

  // Carregar dados do cliente vinculado
  useEffect(() => {
    if (clienteId) {
      fetchClienteById(clienteId).then(setCliente);
    } else {
      setCliente(null);
    }
  }, [clienteId]);

  const previewHtml = useMemo(() => {
    if (!previewMode || !cliente) return null;
    return applyClienteVariables(conteudoHtml, cliente);
  }, [previewMode, cliente, conteudoHtml]);

  const handleClienteChange = (id: string | null, c: Cliente | null) => {
    setClienteId(id);
    setCliente(c);
    if (previewMode && !id) setPreviewMode(false);
  };

  const handleApplyVariables = () => {
    if (!cliente) return;
    const novoHtml = applyClienteVariables(conteudoHtml, cliente);
    setConteudoHtml(novoHtml);
    setPreviewMode(false);
    setConfirmApplyOpen(false);
    toast.success("Variáveis aplicadas. Salve para persistir.");
  };

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast.error("O título é obrigatório");
      return;
    }

    try {
      if (isNew) {
        const result = await createDocumento({
          titulo: titulo.trim(),
          conteudo_html: conteudoHtml,
          tipo,
          cliente_id: tipo === "documento" ? clienteId || undefined : undefined,
        });
        if (result) {
          navigate(`/documentos/${result.id}`);
        }
      } else if (id) {
        await updateDocumento({
          id,
          data: {
            titulo: titulo.trim(),
            conteudo_html: conteudoHtml,
            cliente_id: tipo === "documento" ? clienteId : null,
          }
        });
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const handleExportPDF = () => {
    if (!titulo.trim()) {
      toast.error("Adicione um título antes de exportar");
      return;
    }

    // Se tem cliente vinculado, exporta com variáveis substituídas
    const htmlExport =
      cliente && tipo === "documento"
        ? applyClienteVariables(conteudoHtml, cliente)
        : conteudoHtml;

    exportDocumentoToPDF({
      titulo: titulo.trim(),
      conteudoHtml: htmlExport,
    });

    toast.success("PDF gerado com sucesso!");
  };

  if (!isNew && isLoading) {
    return (
      <DashboardLayout currentPage="documentos">
        <div className="flex-1 p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[500px] w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="documentos">
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
        {/* Header fixo */}
        <div className="border-b bg-background px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/documentos")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <Input
              placeholder={tipo === "modelo" ? "Nome do modelo" : "Título do documento"}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="text-base font-medium border-0 shadow-none focus-visible:ring-1 px-2 max-w-md"
            />
            <Badge variant={tipo === "modelo" ? "secondary" : "default"} className="shrink-0">
              {tipo === "modelo" ? "Modelo" : "Documento"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {tipo === "documento" && (
              <SeletorCliente value={clienteId} onChange={handleClienteChange} />
            )}
            {cliente && tipo === "documento" && (
              <Button
                variant={previewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
                className="gap-1.5"
              >
                {previewMode ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" /> Editar
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="gap-1.5"
            >
              <FileDown className="h-3.5 w-3.5" />
              PDF
            </Button>
            <Button
              onClick={handleSave}
              disabled={isCreating || isUpdating}
              size="sm"
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {isCreating || isUpdating ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Editor + painel lateral */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <DocumentoEditor
            ref={editorRef}
            value={conteudoHtml}
            onChange={setConteudoHtml}
            previewHtml={previewHtml}
            className="flex-1 min-w-0"
          />
          <VariaveisPanel
            cliente={cliente}
            onInsert={(v) => editorRef.current?.insertAtCursor(v)}
            onApplyAll={cliente ? () => setConfirmApplyOpen(true) : undefined}
          />
        </div>
      </div>

      <AlertDialog open={confirmApplyOpen} onOpenChange={setConfirmApplyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar variáveis definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as variáveis <code>${"${_..._}"}</code> serão substituídas pelos dados
              reais de <strong>{cliente?.nome_pessoa_fisica || cliente?.nome_pessoa_juridica}</strong>.
              Esta ação é irreversível dentro deste documento. Salve depois para persistir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyVariables}>
              Aplicar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
