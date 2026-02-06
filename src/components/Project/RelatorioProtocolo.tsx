import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProjectAdvogado } from '@/hooks/useProjectAdvogado';
import { ProjectProtocolo } from '@/hooks/useProjectProtocolos';
import { ProcessoOAB, OABCadastrada } from '@/hooks/useOABs';

interface ProcessoVinculado extends ProcessoOAB {
  oab?: OABCadastrada;
}

interface TarefaOAB {
  id: string;
  titulo: string;
  descricao: string | null;
  fase: string | null;
  data_execucao: string;
  observacoes: string | null;
}

interface RelatorioProtocoloProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolo: ProjectProtocolo;
  advogado: ProjectAdvogado | null;
  processoVinculado?: ProcessoVinculado | null;
  tarefasProcesso?: TarefaOAB[];
}

export function RelatorioProtocolo({
  open,
  onOpenChange,
  protocolo,
  advogado,
  processoVinculado,
  tarefasProcesso,
}: RelatorioProtocoloProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formatData = (data: string | Date | null | undefined) => {
    if (!data) return '-';
    try {
      return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const formatValor = (valor: number | null | undefined) => {
    if (!valor && valor !== 0) return '-';
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
            @page { margin: 20mm; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 12px;
              line-height: 1.5;
              color: #1a1a1a;
              margin: 0;
              padding: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #1a1a1a;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header-info { flex: 1; }
            .header-info h1 { 
              font-size: 18px; 
              margin: 0 0 5px 0;
              font-weight: 600;
            }
            .header-info p { 
              margin: 2px 0; 
              color: #4a4a4a;
            }
            .logo {
              width: 80px;
              height: 80px;
              object-fit: contain;
              margin-left: 20px;
            }
            .section { margin-bottom: 20px; }
            .section-title {
              font-size: 14px;
              font-weight: 600;
              text-transform: uppercase;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
              margin-bottom: 10px;
              color: #333;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 20px;
            }
            .info-item label {
              display: block;
              font-size: 10px;
              color: #666;
              text-transform: uppercase;
            }
            .info-item span {
              display: block;
              font-weight: 500;
            }
            .timeline {
              position: relative;
              padding-left: 20px;
            }
            .timeline::before {
              content: '';
              position: absolute;
              left: 5px;
              top: 5px;
              bottom: 5px;
              width: 2px;
              background: #ccc;
            }
            .timeline-item {
              position: relative;
              margin-bottom: 15px;
              padding-bottom: 15px;
              border-bottom: 1px dashed #eee;
            }
            .timeline-item:last-child {
              border-bottom: none;
            }
            .timeline-item::before {
              content: '';
              position: absolute;
              left: -19px;
              top: 5px;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: #22c55e;
              border: 2px solid #fff;
            }
            .timeline-item.judicial::before {
              background: #3b82f6;
            }
            .timeline-title {
              font-weight: 600;
              margin: 0 0 5px 0;
            }
            .timeline-comment {
              background: #f5f5f5;
              padding: 10px;
              border-radius: 6px;
              border-left: 3px solid #22c55e;
              font-size: 12px;
              color: #333;
            }
            .timeline-comment.judicial {
              border-left: 3px solid #3b82f6;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #ccc;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const capa = processoVinculado?.capa_completa || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Preview do Relatório
            </span>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div ref={printRef} className="p-4 bg-white text-black">
            {/* Cabeçalho */}
            <div className="header">
              <div className="header-info">
                <h1>{advogado?.nomeAdvogado || 'Advogado não configurado'}</h1>
                {advogado?.telefoneAdvogado && (
                  <p>{advogado.telefoneAdvogado}</p>
                )}
                {advogado?.emailAdvogado && (
                  <p>{advogado.emailAdvogado}</p>
                )}
                {advogado?.enderecoAdvogado && (
                  <p>{advogado.enderecoAdvogado}</p>
                )}
                {(advogado?.cidadeAdvogado || advogado?.cepAdvogado) && (
                  <p>
                    {advogado?.cepAdvogado && `CEP ${advogado.cepAdvogado} - `}
                    {advogado?.cidadeAdvogado}
                  </p>
                )}
              </div>
              {advogado?.logoUrl && (
                <img src={advogado.logoUrl} alt="Logo" className="logo" />
              )}
            </div>

            {/* Dados do Processo - Só exibe se houver processo vinculado */}
            {processoVinculado && (
              <div className="section">
                <div className="section-title">Dados do Processo</div>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Número CNJ</label>
                    <span>{processoVinculado.numero_cnj}</span>
                  </div>
                  <div className="info-item">
                    <label>Tribunal</label>
                    <span>{processoVinculado.tribunal || processoVinculado.tribunal_sigla || '-'}</span>
                  </div>
                  <div className="info-item">
                    <label>Parte Ativa (Autor)</label>
                    <span>{processoVinculado.parte_ativa || '-'}</span>
                  </div>
                  <div className="info-item">
                    <label>Parte Passiva (Réu)</label>
                    <span>{processoVinculado.parte_passiva || '-'}</span>
                  </div>
                  <div className="info-item">
                    <label>Valor da Causa</label>
                    <span>{formatValor(processoVinculado.valor_causa || capa.amount)}</span>
                  </div>
                  <div className="info-item">
                    <label>Data Distribuição</label>
                    <span>{formatData(processoVinculado.data_distribuicao || capa.distribution_date)}</span>
                  </div>
                  <div className="info-item">
                    <label>Juízo/Vara</label>
                    <span>{processoVinculado.juizo || capa.county || '-'}</span>
                  </div>
                  <div className="info-item">
                    <label>Status</label>
                    <span>{processoVinculado.status_processual || capa.situation || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Histórico do Protocolo */}
            <div className="section">
              <div className="section-title">Histórico do Processo</div>
              
              {etapasConcluidas.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px 0' }}>
                  Nenhuma etapa foi concluída ainda
                </p>
              ) : (
                <div className="timeline">
                  {etapasConcluidas.map((etapa) => (
                    <div key={etapa.id} className="timeline-item">
                      <div className="timeline-title">{etapa.nome}</div>
                      <p style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>
                        {formatData(etapa.dataConclusao)}
                      </p>
                      {etapa.comentarioConclusao && (
                        <div className="timeline-comment">
                          {etapa.comentarioConclusao}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Atividades Judiciais do Processo */}
            {processoVinculado && tarefasProcesso && tarefasProcesso.length > 0 && (
              <div className="section">
                <div className="section-title">Atividades Judiciais</div>
                <div className="timeline">
                  {[...tarefasProcesso]
                    .sort((a, b) => new Date(b.data_execucao).getTime() - new Date(a.data_execucao).getTime())
                    .map((tarefa) => (
                      <div key={tarefa.id} className="timeline-item judicial">
                        <div className="timeline-title">
                          {tarefa.fase && `[${tarefa.fase}] `}{tarefa.titulo}
                        </div>
                        <p style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>
                          {formatData(tarefa.data_execucao)}
                        </p>
                        {(tarefa.descricao || tarefa.observacoes) && (
                          <div className="timeline-comment judicial">
                            {tarefa.descricao}
                            {tarefa.observacoes && (
                              <p style={{ marginTop: '5px', fontStyle: 'italic' }}>
                                Obs: {tarefa.observacoes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Rodapé */}
            <div className="footer">
              Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
