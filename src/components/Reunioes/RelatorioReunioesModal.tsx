import { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Calendar, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRelatorioReunioes } from '@/hooks/useRelatorioReunioes';
import { RelatorioReunioesExport } from './RelatorioReunioesExport';
import type { RelatorioReunioesConfig, RelatorioReunioesEscopo, AgrupamentoReunioes, DadosRelatorioReunioes } from '@/types/relatorioReunioes';

const defaultEscopo: RelatorioReunioesEscopo = {
  leads: { leadsCadastrados: true, novosLeads: true },
  reunioes: { agendadas: true, realizadas: true, fechadas: true, emContato: true, inviaveis: true },
  performance: { porUsuario: true, taxaConversao: true },
};

export function RelatorioReunioesModal() {
  const [open, setOpen] = useState(false);
  const [periodoInicio, setPeriodoInicio] = useState<Date>(startOfMonth(new Date()));
  const [periodoFim, setPeriodoFim] = useState<Date>(endOfMonth(new Date()));
  const [escopo, setEscopo] = useState<RelatorioReunioesEscopo>(defaultEscopo);
  const [agrupamento, setAgrupamento] = useState<AgrupamentoReunioes>('usuario');
  const [formato, setFormato] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [exporting, setExporting] = useState(false);
  const [dadosRelatorio, setDadosRelatorio] = useState<DadosRelatorioReunioes | null>(null);

  const { gerarRelatorio, loading } = useRelatorioReunioes();

  const toggleEscopo = (categoria: keyof RelatorioReunioesEscopo, campo: string, valor: boolean) => {
    setEscopo(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        [campo]: valor,
      },
    }));
  };

  const handleGerarRelatorio = async () => {
    const config: RelatorioReunioesConfig = {
      periodo: { inicio: periodoInicio, fim: periodoFim },
      escopo,
      agrupamento,
      formato,
    };

    const dados = await gerarRelatorio(config);
    if (dados) {
      setDadosRelatorio(dados);
      setExporting(true);
    }
  };

  const handleExportComplete = () => {
    setExporting(false);
    setDadosRelatorio(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Relatorios
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatorio de Reunioes e Leads
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Periodo */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Periodo do Relatorio</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground">Inicio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(periodoInicio, 'dd/MM/yyyy', { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={periodoInicio}
                        onSelect={(date) => date && setPeriodoInicio(date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground">Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(periodoFim, 'dd/MM/yyyy', { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={periodoFim}
                        onSelect={(date) => date && setPeriodoFim(date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Escopo - Leads */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Escopo - Leads</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'leadsCadastrados', label: 'Leads cadastrados' },
                  { key: 'novosLeads', label: 'Novos leads no periodo' },
                ].map(item => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`leads-${item.key}`}
                      checked={(escopo.leads as any)[item.key]}
                      onCheckedChange={(checked) => toggleEscopo('leads', item.key, !!checked)}
                    />
                    <Label htmlFor={`leads-${item.key}`} className="text-sm cursor-pointer">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Escopo - Reunioes */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Escopo - Reunioes</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'agendadas', label: 'Reunioes agendadas' },
                  { key: 'realizadas', label: 'Reunioes realizadas' },
                  { key: 'fechadas', label: 'Reunioes fechadas' },
                  { key: 'emContato', label: 'Reunioes em contato' },
                  { key: 'inviaveis', label: 'Reunioes inviaveis' },
                ].map(item => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`reunioes-${item.key}`}
                      checked={(escopo.reunioes as any)[item.key]}
                      onCheckedChange={(checked) => toggleEscopo('reunioes', item.key, !!checked)}
                    />
                    <Label htmlFor={`reunioes-${item.key}`} className="text-sm cursor-pointer">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Escopo - Performance */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Escopo - Performance</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'porUsuario', label: 'Performance por usuario' },
                  { key: 'taxaConversao', label: 'Taxa de conversao' },
                ].map(item => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`performance-${item.key}`}
                      checked={(escopo.performance as any)[item.key]}
                      onCheckedChange={(checked) => toggleEscopo('performance', item.key, !!checked)}
                    />
                    <Label htmlFor={`performance-${item.key}`} className="text-sm cursor-pointer">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Agrupamento */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Agrupamento</Label>
              <RadioGroup value={agrupamento} onValueChange={(v) => setAgrupamento(v as AgrupamentoReunioes)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="usuario" id="agrup-usuario" />
                  <Label htmlFor="agrup-usuario" className="cursor-pointer">Por usuario</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="status" id="agrup-status" />
                  <Label htmlFor="agrup-status" className="cursor-pointer">Por status</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dia" id="agrup-dia" />
                  <Label htmlFor="agrup-dia" className="cursor-pointer">Por dia</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Formato */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Formato de Exportacao</Label>
              <RadioGroup value={formato} onValueChange={(v) => setFormato(v as any)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="formato-pdf" />
                  <Label htmlFor="formato-pdf" className="cursor-pointer flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="formato-excel" />
                  <Label htmlFor="formato-excel" className="cursor-pointer flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="formato-csv" />
                  <Label htmlFor="formato-csv" className="cursor-pointer flex items-center gap-2">
                    <FileDown className="h-4 w-4" />
                    CSV
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGerarRelatorio} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Gerar Relatorio
              </>
            )}
          </Button>
        </div>

        {exporting && dadosRelatorio && (
          <RelatorioReunioesExport
            dados={dadosRelatorio}
            escopo={escopo}
            formato={formato}
            onComplete={handleExportComplete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
