import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantId } from "@/hooks/useTenantId";
import { SeletorModelo } from "@/components/Documentos/SeletorModelo";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { DocumentoWithRelations } from "@/types/documento";

interface ClienteDocumentosGeradosProps {
  clienteId: string;
  readOnly?: boolean;
}

export function ClienteDocumentosGerados({ clienteId, readOnly }: ClienteDocumentosGeradosProps) {
  const navigate = useNavigate();
  const { tenant } = useParams();
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();
  const [seletorOpen, setSeletorOpen] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["cliente-documentos-gerados", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("*, modelo_origem:documentos!documentos_modelo_origem_id_fkey(id, titulo)")
        .eq("cliente_id", clienteId)
        .eq("tipo", "documento")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DocumentoWithRelations[];
    },
    enabled: !!clienteId,
  });

  const criarMutation = useMutation({
    mutationFn: async (modeloId: string | null) => {
      if (!tenantId || !user?.id) throw new Error("Não autenticado");

      let titulo = "Novo documento";
      let conteudo: string | null = null;
      if (modeloId) {
        const { data: modelo, error: errM } = await supabase
          .from("documentos")
          .select("titulo, conteudo_html")
          .eq("id", modeloId)
          .single();
        if (errM) throw errM;
        titulo = modelo.titulo;
        conteudo = modelo.conteudo_html;
      }

      const { data, error } = await supabase
        .from("documentos")
        .insert({
          titulo,
          conteudo_html: conteudo,
          cliente_id: clienteId,
          responsavel_id: user.id,
          tipo: "documento",
          modelo_origem_id: modeloId,
          tenant_id: tenantId,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["cliente-documentos-gerados", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
      toast.success("Documento criado");
      navigate(`/${tenant}/documentos/${doc.id}`);
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {docs.length} documento(s) gerado(s) para este cliente
        </p>
        {!readOnly && (
          <Button size="sm" onClick={() => setSeletorOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo documento
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum documento gerado para este cliente
          </p>
          {!readOnly && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setSeletorOpen(true)}
              className="mt-1"
            >
              Criar primeiro documento
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => navigate(`/${tenant}/documentos/${doc.id}`)}
              className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-accent hover:border-primary/50 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{doc.titulo}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>
                    {format(new Date(doc.updated_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                  {doc.modelo_origem && (
                    <>
                      <span>•</span>
                      <span className="truncate">
                        Modelo: {doc.modelo_origem.titulo}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <SeletorModelo
        open={seletorOpen}
        onOpenChange={setSeletorOpen}
        onSelect={(modeloId) => criarMutation.mutate(modeloId)}
      />
    </div>
  );
}