import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, History, Loader2, Activity } from "lucide-react";
import { ESTADOS_BRASIL } from "@/types/busca-oab";
import { useBuscaOAB } from "@/hooks/useBuscaOAB";
import { ProcessoOABCard } from "./ProcessoOABCard";
import { ImportarProcessoDialog } from "./ImportarProcessoDialog";
import { ProcessoDetalhesDrawer } from "./ProcessoDetalhesDrawer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ProcessoOAB } from "@/types/busca-oab";
import { supabase } from "@/integrations/supabase/client";

export const BuscarPorOABTab = () => {
  const [oabNumero, setOabNumero] = useState("");
  const [oabUf, setOabUf] = useState("PR");
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoOAB | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [detalhesDrawerOpen, setDetalhesDrawerOpen] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [juditHealth, setJuditHealth] = useState<{ ok: boolean; message: string; status: number } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const {
    buscarPorOAB,
    resultados,
    buscando,
    ultimaBusca,
    carregarHistorico,
    historicoBuscas,
    carregarBuscaAnterior
  } = useBuscaOAB();

  useEffect(() => {
    carregarHistorico();
    checkJuditHealth();
  }, []);

  const checkJuditHealth = async () => {
    setCheckingHealth(true);
    try {
      const { data, error } = await supabase.functions.invoke('judit-health');
      if (!error && data) {
        setJuditHealth(data);
      }
    } catch (err) {
      console.error('[BuscarPorOABTab] Erro ao verificar saúde da Judit:', err);
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleBuscar = () => {
    if (!oabNumero.trim()) return;
    buscarPorOAB(oabNumero, oabUf);
  };

  const handleImportar = (processo: ProcessoOAB) => {
    setProcessoSelecionado(processo);
    setImportDialogOpen(true);
  };

  const handleVerDetalhes = (processo: ProcessoOAB) => {
    setProcessoSelecionado(processo);
    setDetalhesDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Busca */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Processos por OAB
            </CardTitle>
            
            {/* Health Badge */}
            <div className="flex items-center gap-2">
              {checkingHealth ? (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verificando...
                </Badge>
              ) : juditHealth ? (
                <Badge 
                  variant={juditHealth.ok ? "default" : "destructive"}
                  className="gap-1 cursor-pointer"
                  onClick={checkJuditHealth}
                >
                  <Activity className="h-3 w-3" />
                  Judit: {juditHealth.ok ? 'OK' : 'Instável'}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="oab-numero">Número da OAB</Label>
              <Input
                id="oab-numero"
                placeholder="Digite o número da OAB (ex: 123456)"
                value={oabNumero}
                onChange={(e) => setOabNumero(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                disabled={buscando}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oab-uf">UF</Label>
              <Select value={oabUf} onValueChange={setOabUf} disabled={buscando}>
                <SelectTrigger id="oab-uf">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BRASIL.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>
                      {estado.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleBuscar}
              disabled={buscando || !oabNumero.trim()}
              className="flex-1 md:flex-initial"
            >
              {buscando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar Processos
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowHistorico(!showHistorico)}
              disabled={buscando}
            >
              <History className="mr-2 h-4 w-4" />
              Histórico
            </Button>
          </div>

          {buscando && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              ⏳ Buscando processos na API Judit... isso pode levar até 60 segundos
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Buscas */}
      {showHistorico && historicoBuscas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Buscas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {historicoBuscas.map((busca) => (
              <div
                key={busca.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => {
                  carregarBuscaAnterior(busca);
                  setShowHistorico(false);
                }}
              >
                <div>
                  <div className="font-medium">
                    OAB {busca.oab_numero}/{busca.oab_uf}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {busca.total_processos_encontrados} processo(s) •{' '}
                    {format(new Date(busca.data_busca), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Ver Resultados
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Resultados */}
      {ultimaBusca && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                📊 {resultados.length} processo(s) encontrado(s)
              </h3>
              <p className="text-sm text-muted-foreground">
                Última busca: {format(ultimaBusca, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          {resultados.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum processo encontrado para esta OAB
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {resultados.map((processo) => (
                <ProcessoOABCard
                  key={processo.numero_cnj}
                  processo={processo}
                  onImportar={() => handleImportar(processo)}
                  onVerDetalhes={() => handleVerDetalhes(processo)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <ImportarProcessoDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        processo={processoSelecionado}
      />

      <ProcessoDetalhesDrawer
        processo={processoSelecionado}
        open={detalhesDrawerOpen}
        onOpenChange={setDetalhesDrawerOpen}
      />
    </div>
  );
};
