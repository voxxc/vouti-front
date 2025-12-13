import { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Download, Settings, Calendar, FileSpreadsheet, FileDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRelatorioFinanceiro } from '@/hooks/useRelatorioFinanceiro';
import { RelatorioFinanceiroExport } from './RelatorioFinanceiroExport';
import { EscritorioConfigModal } from './EscritorioConfigModal';
import type { RelatorioConfig, RelatorioEscopo } from '@/types/relatorio';

const defaultEscopo: RelatorioEscopo = {
  receitas: { faturamento: true, pagos: true, pendentes: true, ativos: true, encerrados: true },
  inadimplencia: { total: true, clientes: true, contratos: true, percentual: true },
  custos: { operacionais: true, fixos: true, variaveis: true, compras: true, servicos: true },
  colaboradores: { salarios: true, vales: true, porColaborador: true, totalGeral: true },
  resumo: { receita: true, despesa: true, resultado: true },
};

export function RelatorioFinanceiroModal() {
  const [open, setOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [periodoInicio, setPeriodoInicio] = useState<Date>(startOfMonth(new Date()));
  const [periodoFim, setPeriodoFim] = useState<Date>(endOfMonth(new Date()));
  const [escopo, setEscopo] = useState<RelatorioEscopo>(defaultEscopo);
  const [detalhamento, setDetalhamento] = useState<'resumido' | 'detalhado' | 'analitico'>('detalhado');
  const [formato, setFormato] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [exporting, setExporting] = useState(false);
  const [dadosRelatorio, setDadosRelatorio] = useState<any>(null);

  const { gerarRelatorio, loading } = useRelatorioFinanceiro();

  const toggleEscopo = (categoria: keyof RelatorioEscopo, campo: string, valor: boolean) => {
    setEscopo(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        [campo]: valor,
      },
    }));
  };

  const toggleTodosCategoria = (categoria: keyof RelatorioEscopo, valor: boolean) => {
    const campos = Object.keys(escopo[categoria]);
    const novoEscopo = { ...escopo[categoria] };
    campos.forEach(campo => {
      (novoEscopo as any)[campo] = valor;
    });
    setEscopo(prev => ({ ...prev, [categoria]: novoEscopo }));
  };

  const handleGerarRelatorio = async () => {
    const config: RelatorioConfig = {
      periodo: { inicio: periodoInicio, fim: periodoFim },
      escopo,
      detalhamento,
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
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Exportar Relatorio
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatorio Financeiro Consolidado
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setConfigOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
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

              {/* Escopo */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Escopo do Relatorio</Label>
                
                <Tabs defaultValue="receitas" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="receitas">Receitas</TabsTrigger>
                    <TabsTrigger value="inadimplencia">Inadimplencia</TabsTrigger>
                    <TabsTrigger value="custos">Custos</TabsTrigger>
                    <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
                    <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  </TabsList>

                  <TabsContent value="receitas" className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Receitas e Contratos</Label>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => toggleTodosCategoria('receitas', !Object.values(escopo.receitas).every(v => v))}
                      >
                        {Object.values(escopo.receitas).every(v => v) ? 'Desmarcar todos' : 'Marcar todos'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'faturamento', label: 'Faturamento do periodo' },
                        { key: 'pagos', label: 'Honorarios pagos' },
                        { key: 'pendentes', label: 'Honorarios pendentes' },
                        { key: 'ativos', label: 'Contratos ativos' },
                        { key: 'encerrados', label: 'Contratos encerrados' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`receitas-${item.key}`}
                            checked={(escopo.receitas as any)[item.key]}
                            onCheckedChange={(checked) => toggleEscopo('receitas', item.key, !!checked)}
                          />
                          <Label htmlFor={`receitas-${item.key}`} className="text-sm cursor-pointer">
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="inadimplencia" className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Inadimplencia</Label>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => toggleTodosCategoria('inadimplencia', !Object.values(escopo.inadimplencia).every(v => v))}
                      >
                        {Object.values(escopo.inadimplencia).every(v => v) ? 'Desmarcar todos' : 'Marcar todos'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'total', label: 'Total inadimplente' },
                        { key: 'clientes', label: 'Clientes inadimplentes' },
                        { key: 'contratos', label: 'Contratos em atraso' },
                        { key: 'percentual', label: 'Percentual de inadimplencia' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`inadimplencia-${item.key}`}
                            checked={(escopo.inadimplencia as any)[item.key]}
                            onCheckedChange={(checked) => toggleEscopo('inadimplencia', item.key, !!checked)}
                          />
                          <Label htmlFor={`inadimplencia-${item.key}`} className="text-sm cursor-pointer">
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="custos" className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Custos Operacionais</Label>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => toggleTodosCategoria('custos', !Object.values(escopo.custos).every(v => v))}
                      >
                        {Object.values(escopo.custos).every(v => v) ? 'Desmarcar todos' : 'Marcar todos'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'operacionais', label: 'Custos operacionais' },
                        { key: 'fixos', label: 'Custos fixos' },
                        { key: 'variaveis', label: 'Custos variaveis' },
                        { key: 'compras', label: 'Compras' },
                        { key: 'servicos', label: 'Servicos / terceiros' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`custos-${item.key}`}
                            checked={(escopo.custos as any)[item.key]}
                            onCheckedChange={(checked) => toggleEscopo('custos', item.key, !!checked)}
                          />
                          <Label htmlFor={`custos-${item.key}`} className="text-sm cursor-pointer">
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="colaboradores" className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Colaboradores</Label>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => toggleTodosCategoria('colaboradores', !Object.values(escopo.colaboradores).every(v => v))}
                      >
                        {Object.values(escopo.colaboradores).every(v => v) ? 'Desmarcar todos' : 'Marcar todos'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'salarios', label: 'Salarios' },
                        { key: 'vales', label: 'Vales / adiantamentos' },
                        { key: 'porColaborador', label: 'Total por colaborador' },
                        { key: 'totalGeral', label: 'Total geral de pessoal' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`colaboradores-${item.key}`}
                            checked={(escopo.colaboradores as any)[item.key]}
                            onCheckedChange={(checked) => toggleEscopo('colaboradores', item.key, !!checked)}
                          />
                          <Label htmlFor={`colaboradores-${item.key}`} className="text-sm cursor-pointer">
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="resumo" className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Resumo Financeiro</Label>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => toggleTodosCategoria('resumo', !Object.values(escopo.resumo).every(v => v))}
                      >
                        {Object.values(escopo.resumo).every(v => v) ? 'Desmarcar todos' : 'Marcar todos'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'receita', label: 'Receita total' },
                        { key: 'despesa', label: 'Despesa total' },
                        { key: 'resultado', label: 'Resultado liquido (lucro/prejuizo)' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`resumo-${item.key}`}
                            checked={(escopo.resumo as any)[item.key]}
                            onCheckedChange={(checked) => toggleEscopo('resumo', item.key, !!checked)}
                          />
                          <Label htmlFor={`resumo-${item.key}`} className="text-sm cursor-pointer">
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Detalhamento */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Nivel de Detalhamento</Label>
                <RadioGroup value={detalhamento} onValueChange={(v) => setDetalhamento(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="resumido" id="resumido" />
                    <Label htmlFor="resumido" className="cursor-pointer">
                      <span className="font-medium">Resumido (executivo)</span>
                      <span className="text-sm text-muted-foreground ml-2">- Apenas totais e percentuais</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="detalhado" id="detalhado" />
                    <Label htmlFor="detalhado" className="cursor-pointer">
                      <span className="font-medium">Detalhado</span>
                      <span className="text-sm text-muted-foreground ml-2">- Subtotais por categoria</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="analitico" id="analitico" />
                    <Label htmlFor="analitico" className="cursor-pointer">
                      <span className="font-medium">Analitico</span>
                      <span className="text-sm text-muted-foreground ml-2">- Linha por linha com todos os registros</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Formato */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Formato de Exportacao</Label>
                <RadioGroup value={formato} onValueChange={(v) => setFormato(v as any)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pdf" id="pdf" />
                    <Label htmlFor="pdf" className="cursor-pointer flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="excel" id="excel" />
                    <Label htmlFor="excel" className="cursor-pointer flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="csv" id="csv" />
                    <Label htmlFor="csv" className="cursor-pointer flex items-center gap-2">
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
            <Button onClick={handleGerarRelatorio} disabled={loading} className="gap-2">
              <Download className="h-4 w-4" />
              {loading ? 'Gerando...' : 'Gerar Relatorio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EscritorioConfigModal open={configOpen} onOpenChange={setConfigOpen} />

      {exporting && dadosRelatorio && (
        <RelatorioFinanceiroExport
          dados={dadosRelatorio}
          config={{ periodo: { inicio: periodoInicio, fim: periodoFim }, escopo, detalhamento, formato }}
          onComplete={handleExportComplete}
        />
      )}
    </>
  );
}
