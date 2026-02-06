import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { DocumentoEditor } from "@/components/Documentos/DocumentoEditor";
import { exportDocumentoToPDF } from "@/components/Documentos/DocumentosPDFExport";
import { ArrowLeft, Save, FileDown } from "lucide-react";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { useDocumentos, useDocumento } from "@/hooks/useDocumentos";
import { toast } from "sonner";

export default function DocumentoEditar() {
  const { id } = useParams<{ id: string }>();
  const { navigate } = useTenantNavigation();
  const isNew = id === "novo";
  
  const { createDocumento, updateDocumento, isCreating, isUpdating } = useDocumentos();
  const { data: documento, isLoading } = useDocumento(isNew ? undefined : id);

  const [titulo, setTitulo] = useState("");
  const [conteudoHtml, setConteudoHtml] = useState("");

  // Carregar dados do documento existente
  useEffect(() => {
    if (documento) {
      setTitulo(documento.titulo);
      setConteudoHtml(documento.conteudo_html || "");
    }
  }, [documento]);

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast.error("O título é obrigatório");
      return;
    }

    try {
      if (isNew) {
        const result = await createDocumento({
          titulo: titulo.trim(),
          conteudo_html: conteudoHtml
        });
        if (result) {
          navigate(`/documentos/${result.id}`);
        }
      } else if (id) {
        await updateDocumento({
          id,
          data: {
            titulo: titulo.trim(),
            conteudo_html: conteudoHtml
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
    
    exportDocumentoToPDF({
      titulo: titulo.trim(),
      conteudoHtml
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
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/documentos")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">
                {isNew ? "Novo Documento" : "Editar Documento"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
              <Button
                onClick={handleSave}
                disabled={isCreating || isUpdating}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isCreating || isUpdating ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo">Título do documento *</Label>
            <Input
              id="titulo"
              placeholder="Ex: Procuração Trânsito CPF - cliente"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              className="text-lg"
            />
          </div>

          {/* Editor */}
          <DocumentoEditor
            value={conteudoHtml}
            onChange={setConteudoHtml}
            className="min-h-[500px]"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
