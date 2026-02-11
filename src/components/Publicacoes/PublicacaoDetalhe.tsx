import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ExternalLink } from "lucide-react";

interface PublicacaoDetalheProps {
  publicacao: {
    id: string;
    data_disponibilizacao: string | null;
    data_publicacao: string | null;
    tipo: string | null;
    numero_processo: string | null;
    diario_sigla: string | null;
    diario_nome: string | null;
    comarca: string | null;
    nome_pesquisado: string | null;
    conteudo_completo: string | null;
    link_acesso: string | null;
    status: string;
    orgao: string | null;
    responsavel: string | null;
    partes: string | null;
  };
  onStatusChange: (status: string) => void;
}

export function PublicacaoDetalhe({ publicacao, onStatusChange }: PublicacaoDetalheProps) {
  const p = publicacao;

  return (
    <div className="p-6 space-y-6">
      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4">
        <InfoItem label="Nº Processo" value={p.numero_processo} />
        <InfoItem label="Tipo" value={p.tipo} />
        <InfoItem label="Data Disponibilização" value={p.data_disponibilizacao ? new Date(p.data_disponibilizacao + 'T12:00:00').toLocaleDateString('pt-BR') : null} />
        <InfoItem label="Data Publicação" value={p.data_publicacao ? new Date(p.data_publicacao + 'T12:00:00').toLocaleDateString('pt-BR') : null} />
        <InfoItem label="Diário" value={p.diario_sigla} />
        <InfoItem label="Órgão" value={p.diario_nome || p.orgao} />
        <InfoItem label="Comarca" value={p.comarca} />
        <InfoItem label="Responsável" value={p.responsavel} />
        <InfoItem label="Nome pesquisado" value={p.nome_pesquisado} className="col-span-2" />
        <InfoItem label="Partes" value={p.partes} className="col-span-2" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t pt-4">
        {p.status === 'nao_tratada' && (
          <>
            <Button size="sm" className="gap-1.5" onClick={() => onStatusChange('tratada')}>
              <Check className="h-3.5 w-3.5" />Marcar como tratada
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onStatusChange('descartada')}>
              <X className="h-3.5 w-3.5" />Descartar
            </Button>
          </>
        )}
        {p.status === 'tratada' && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onStatusChange('nao_tratada')}>
            Reabrir
          </Button>
        )}
        {p.status === 'descartada' && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onStatusChange('nao_tratada')}>
            Reabrir
          </Button>
        )}
        {p.link_acesso && (
          <Button variant="ghost" size="sm" className="gap-1.5 ml-auto" onClick={() => window.open(p.link_acesso!, '_blank')}>
            <ExternalLink className="h-3.5 w-3.5" />Acessar publicação
          </Button>
        )}
      </div>

      {/* Content */}
      {p.conteudo_completo && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Conteúdo da Publicação</h4>
          <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
            {p.conteudo_completo}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, className }: { label: string; value: string | null; className?: string }) {
  if (!value) return null;
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
