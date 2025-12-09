import { useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, Download, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProcessoOAB, OABCadastrada } from '@/hooks/useOABs';
import { TarefaOAB } from '@/hooks/useTarefasOAB';

interface RelatorioProcessoOABProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processo: ProcessoOAB;
  oab: OABCadastrada | null;
  tarefas: TarefaOAB[];
}

export const RelatorioProcessoOAB = ({
  open,
  onOpenChange,
  processo,
  oab,
  tarefas,
}: RelatorioProcessoOABProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Extended OAB type
  const oabExtended = oab as OABCadastrada & {
    email_advogado?: string;
    telefone_advogado?: string;
    endereco_advogado?: string;
    cidade_advogado?: string;
    cep_advogado?: string;
    logo_url?: string;
  } | null;

  const formatData = (data: string | null | undefined) => {
    if (!data) return '-';
    try {
      return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return data;
    }
  };

  const formatValor = (valor: number | null | undefined) => {
    if (!valor && valor !== 0) return '-';
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatorio - ${processo.numero_cnj}</title>
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
              background: #333;
              border: 2px solid #fff;
            }
            .timeline-date {
              font-size: 11px;
              color: #666;
              margin-bottom: 3px;
            }
            .timeline-fase {
              display: inline-block;
              background: #f0f0f0;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 10px;
              margin-left: 10px;
            }
            .timeline-title {
              font-weight: 600;
              margin: 5px 0;
            }
            .timeline-desc {
              color: #4a4a4a;
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
          ${printContent.innerHTML}
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

  const capa = processo.capa_completa || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Preview do Relatorio</span>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div ref={printRef} className="p-4 bg-white text-black">
            {/* Cabecalho */}
            <div className="header">
              <div className="header-info">
                <h1>{oabExtended?.nome_advogado || `OAB ${oab?.oab_numero}/${oab?.oab_uf}`}</h1>
                {oab && (
                  <p style={{ fontSize: '12px', fontWeight: 500 }}>
                    OAB/{oab.oab_uf} {oab.oab_numero}
                  </p>
                )}
                {oabExtended?.telefone_advogado && (
                  <p>{oabExtended.telefone_advogado}</p>
                )}
                {oabExtended?.email_advogado && (
                  <p>{oabExtended.email_advogado}</p>
                )}
                {oabExtended?.endereco_advogado && (
                  <p>{oabExtended.endereco_advogado}</p>
                )}
                {(oabExtended?.cidade_advogado || oabExtended?.cep_advogado) && (
                  <p>
                    {oabExtended.cep_advogado && `CEP ${oabExtended.cep_advogado} - `}
                    {oabExtended.cidade_advogado}
                  </p>
                )}
              </div>
              {oabExtended?.logo_url && (
                <img src={oabExtended.logo_url} alt="Logo" className="logo" />
              )}
            </div>

            {/* Dados do Processo */}
            <div className="section">
              <div className="section-title">Dados do Processo</div>
              <div className="info-grid">
                <div className="info-item">
                  <label>Numero CNJ</label>
                  <span>{processo.numero_cnj}</span>
                </div>
                <div className="info-item">
                  <label>Tribunal</label>
                  <span>{processo.tribunal || processo.tribunal_sigla || '-'}</span>
                </div>
                <div className="info-item">
                  <label>Parte Ativa (Autor)</label>
                  <span>{processo.parte_ativa || '-'}</span>
                </div>
                <div className="info-item">
                  <label>Parte Passiva (Reu)</label>
                  <span>{processo.parte_passiva || '-'}</span>
                </div>
                <div className="info-item">
                  <label>Valor da Causa</label>
                  <span>{formatValor(processo.valor_causa || capa.amount)}</span>
                </div>
                <div className="info-item">
                  <label>Data Distribuicao</label>
                  <span>{formatData(processo.data_distribuicao || capa.distribution_date)}</span>
                </div>
                <div className="info-item">
                  <label>Juizo/Vara</label>
                  <span>{processo.juizo || capa.county || '-'}</span>
                </div>
                <div className="info-item">
                  <label>Status</label>
                  <span>{processo.status_processual || capa.situation || '-'}</span>
                </div>
              </div>
            </div>

            {/* Timeline de Tarefas */}
            {tarefas.length > 0 && (
              <div className="section">
                <div className="section-title">Historico de Atividades</div>
                <div className="timeline">
                  {tarefas
                    .sort((a, b) => new Date(a.data_execucao).getTime() - new Date(b.data_execucao).getTime())
                    .map((tarefa) => (
                      <div key={tarefa.id} className="timeline-item">
                        <div className="timeline-date">
                          {formatData(tarefa.data_execucao)}
                          {tarefa.fase && <span className="timeline-fase">{tarefa.fase}</span>}
                        </div>
                        <div className="timeline-title">{tarefa.titulo}</div>
                        {tarefa.descricao && (
                          <div className="timeline-desc">{tarefa.descricao}</div>
                        )}
                        {tarefa.observacoes && (
                          <div className="timeline-desc" style={{ fontStyle: 'italic', marginTop: '5px' }}>
                            Obs: {tarefa.observacoes}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Rodape */}
            <div className="footer">
              Relatorio gerado em {format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
