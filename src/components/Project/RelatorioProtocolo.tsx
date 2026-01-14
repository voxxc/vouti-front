import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Printer, FileText, CheckCircle2, Clock, User, Mail, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProjectAdvogado } from '@/hooks/useProjectAdvogado';
import { ProjectProtocolo, ProjectProtocoloEtapa } from '@/hooks/useProjectProtocolos';

interface RelatorioProtocoloProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolo: ProjectProtocolo;
  advogado: ProjectAdvogado | null;
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pendente: '#eab308',
  em_andamento: '#3b82f6',
  concluido: '#22c55e',
  cancelado: '#ef4444',
};

export function RelatorioProtocolo({
  open,
  onOpenChange,
  protocolo,
  advogado,
}: RelatorioProtocoloProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formatData = (data: Date | null | undefined) => {
    if (!data) return '-';
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatDataHora = (data: Date | null | undefined) => {
    if (!data) return '-';
    return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Get completed stages sorted by completion date (most recent first)
  const etapasConcluidas = (protocolo.etapas || [])
    .filter((e) => e.status === 'concluido' && e.dataConclusao)
    .sort((a, b) => {
      const dateA = a.dataConclusao ? new Date(a.dataConclusao).getTime() : 0;
      const dateB = b.dataConclusao ? new Date(b.dataConclusao).getTime() : 0;
      return dateB - dateA;
    });

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório - ${protocolo.nome}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              color: #1a1a1a;
              line-height: 1.6;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #1a1a1a;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header-info { flex: 1; }
            .header-info h1 { font-size: 24px; margin-bottom: 8px; }
            .header-info p { font-size: 14px; color: #666; margin: 4px 0; }
            .header-logo { width: 100px; height: 100px; object-fit: contain; }
            .section { margin-bottom: 30px; }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              color: #1a1a1a;
              border-bottom: 1px solid #ddd;
              padding-bottom: 8px;
              margin-bottom: 16px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .info-item { margin-bottom: 8px; }
            .info-label { font-size: 12px; color: #666; }
            .info-value { font-size: 14px; font-weight: 500; }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              color: white;
            }
            .timeline { position: relative; padding-left: 24px; }
            .timeline::before {
              content: '';
              position: absolute;
              left: 8px;
              top: 0;
              bottom: 0;
              width: 2px;
              background: #e5e5e5;
            }
            .timeline-item {
              position: relative;
              margin-bottom: 24px;
              padding-bottom: 24px;
              border-bottom: 1px dashed #e5e5e5;
            }
            .timeline-item:last-child { border-bottom: none; }
            .timeline-dot {
              position: absolute;
              left: -20px;
              top: 4px;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #22c55e;
              border: 2px solid white;
              box-shadow: 0 0 0 2px #22c55e;
            }
            .timeline-date {
              font-size: 12px;
              color: #666;
              margin-bottom: 4px;
            }
            .timeline-title {
              font-size: 15px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .timeline-comment {
              background: #f5f5f5;
              padding: 12px;
              border-radius: 8px;
              font-size: 14px;
              color: #333;
              margin-top: 8px;
              border-left: 3px solid #22c55e;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 12px;
              color: #999;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Relatório do Protocolo
          </DialogTitle>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div ref={printRef} className="p-4 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-foreground pb-4">
              <div className="space-y-1">
                {advogado?.nomeAdvogado && (
                  <h1 className="text-xl font-bold">{advogado.nomeAdvogado}</h1>
                )}
                {advogado?.emailAdvogado && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {advogado.emailAdvogado}
                  </p>
                )}
                {advogado?.telefoneAdvogado && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {advogado.telefoneAdvogado}
                  </p>
                )}
                {advogado?.enderecoAdvogado && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {advogado.enderecoAdvogado}
                    {advogado.cidadeAdvogado && ` - ${advogado.cidadeAdvogado}`}
                    {advogado.cepAdvogado && ` - CEP: ${advogado.cepAdvogado}`}
                  </p>
                )}
                {!advogado?.nomeAdvogado && (
                  <p className="text-sm text-muted-foreground italic">
                    Perfil do advogado não configurado
                  </p>
                )}
              </div>
              {advogado?.logoUrl && (
                <img
                  src={advogado.logoUrl}
                  alt="Logo"
                  className="w-24 h-24 object-contain"
                />
              )}
            </div>

            {/* Protocol Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Dados do Protocolo</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Nome do Protocolo</p>
                  <p className="font-medium">{protocolo.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    style={{ backgroundColor: STATUS_COLORS[protocolo.status] }}
                    className="text-white"
                  >
                    {STATUS_LABELS[protocolo.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data de Início</p>
                  <p className="font-medium">{formatData(protocolo.dataInicio)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Previsão de Conclusão</p>
                  <p className="font-medium">{formatData(protocolo.dataPrevisao)}</p>
                </div>
                {protocolo.dataConclusao && (
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Conclusão</p>
                    <p className="font-medium">{formatData(protocolo.dataConclusao)}</p>
                  </div>
                )}
                {protocolo.responsavelNome && (
                  <div>
                    <p className="text-xs text-muted-foreground">Responsável</p>
                    <p className="font-medium flex items-center gap-1">
                      <User className="w-3 h-3" /> {protocolo.responsavelNome}
                    </p>
                  </div>
                )}
              </div>
              {protocolo.descricao && (
                <div>
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p className="text-sm">{protocolo.descricao}</p>
                </div>
              )}
            </div>

            {/* Timeline of Completed Stages */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Timeline de Etapas Concluídas
              </h2>

              {etapasConcluidas.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Nenhuma etapa foi concluída ainda
                </p>
              ) : (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />

                  {etapasConcluidas.map((etapa, index) => (
                    <div key={etapa.id} className="relative mb-6 pb-6 border-b border-dashed last:border-b-0">
                      <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background shadow-[0_0_0_2px] shadow-green-500" />
                      
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {formatDataHora(etapa.dataConclusao)}
                        </p>
                        <h3 className="font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          {etapa.nome}
                        </h3>
                        {etapa.descricao && (
                          <p className="text-sm text-muted-foreground">{etapa.descricao}</p>
                        )}
                        {etapa.comentarioConclusao && (
                          <div className="bg-muted p-3 rounded-lg border-l-4 border-green-500">
                            <p className="text-xs text-muted-foreground mb-1">Comentário de Conclusão:</p>
                            <p className="text-sm">{etapa.comentarioConclusao}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
