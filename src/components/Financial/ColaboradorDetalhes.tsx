import { useState, useEffect } from 'react';
import { Colaborador, ColaboradorReajuste } from '@/types/financeiro';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { ColaboradorValesTab } from './ColaboradorValesTab';
import { ColaboradorComentariosTab } from './ColaboradorComentariosTab';
import { ColaboradorDocumentosTab } from './ColaboradorDocumentosTab';

interface ColaboradorDetalhesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: Colaborador;
}

export const ColaboradorDetalhes = ({ open, onOpenChange, colaborador }: ColaboradorDetalhesProps) => {
  const [reajustes, setReajustes] = useState<ColaboradorReajuste[]>([]);
  const [totalPago, setTotalPago] = useState(0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  useEffect(() => {
    if (open && colaborador) {
      fetchReajustes();
      calcularTotalPago();
    }
  }, [open, colaborador]);

  const fetchReajustes = async () => {
    const { data } = await supabase
      .from('colaborador_reajustes')
      .select('*')
      .eq('colaborador_id', colaborador.id)
      .order('data_reajuste', { ascending: false });
    
    setReajustes((data || []) as ColaboradorReajuste[]);
  };

  const calcularTotalPago = async () => {
    // Calcular total pago no ano atual
    const anoAtual = new Date().getFullYear();
    const mesesTrabalhados = colaborador.data_contratacao
      ? Math.min(12, Math.max(1, new Date().getMonth() + 1 - new Date(colaborador.data_contratacao).getMonth()))
      : 12;
    
    // Buscar vales descontados
    const { data: vales } = await supabase
      .from('colaborador_vales')
      .select('valor, tipo')
      .eq('colaborador_id', colaborador.id)
      .eq('status', 'descontado');

    const totalVales = (vales || []).reduce((sum, v) => {
      if (v.tipo === 'reembolso') return sum - v.valor;
      return sum + v.valor;
    }, 0);

    const total = (colaborador.salario_base * mesesTrabalhados) + totalVales;
    setTotalPago(total);
  };

  const getVinculoBadge = (vinculo?: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      CLT: { variant: 'default', label: 'CLT' },
      PJ: { variant: 'secondary', label: 'PJ' },
      Estagio: { variant: 'outline', label: 'Estagio' },
      Freelancer: { variant: 'outline', label: 'Freelancer' },
    };
    return variants[vinculo || ''] || { variant: 'outline', label: vinculo || '-' };
  };

  const vinculoConfig = getVinculoBadge(colaborador.tipo_vinculo);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">{colaborador.nome_completo}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={vinculoConfig.variant}>{vinculoConfig.label}</Badge>
                <span className="text-sm text-muted-foreground">{colaborador.cargo}</span>
                <Badge variant={colaborador.status === 'ativo' ? 'default' : 'secondary'}>
                  {colaborador.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="financeiro" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="vales">Vales</TabsTrigger>
            <TabsTrigger value="comentarios">Comentarios</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="financeiro" className="space-y-4 mt-4">
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Salario Base
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(colaborador.salario_base)}</div>
                  <p className="text-xs text-muted-foreground">
                    {colaborador.forma_pagamento === 'mensal' ? 'Mensal' : 
                     colaborador.forma_pagamento === 'hora' ? 'Por hora' : 'Por demanda'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Dia Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Dia {colaborador.dia_pagamento || 5}</div>
                  <p className="text-xs text-muted-foreground">Todo mes</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Pago ({new Date().getFullYear()})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(totalPago)}</div>
              </CardContent>
            </Card>

            {/* Historico de reajustes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Historico de Reajustes</CardTitle>
              </CardHeader>
              <CardContent>
                {reajustes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum reajuste registrado</p>
                ) : (
                  <div className="space-y-3">
                    {reajustes.map((reajuste) => {
                      const percentual = ((reajuste.valor_novo - reajuste.valor_anterior) / reajuste.valor_anterior * 100).toFixed(1);
                      return (
                        <div key={reajuste.id} className="flex items-center justify-between border-l-2 border-primary pl-3">
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(reajuste.data_reajuste), 'MM/yyyy', { locale: ptBR })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(reajuste.valor_anterior)} → {formatCurrency(reajuste.valor_novo)}
                            </p>
                          </div>
                          <Badge variant={parseFloat(percentual) > 0 ? 'default' : 'destructive'}>
                            {parseFloat(percentual) > 0 ? '+' : ''}{percentual}%
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dados pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {colaborador.email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{colaborador.email}</span>
                  </div>
                )}
                {colaborador.telefone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefone:</span>
                    <span>{colaborador.telefone}</span>
                  </div>
                )}
                {colaborador.cpf_cnpj && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{colaborador.tipo_pessoa === 'PF' ? 'CPF:' : 'CNPJ:'}</span>
                    <span>{colaborador.cpf_cnpj}</span>
                  </div>
                )}
                {colaborador.data_contratacao && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contratacao:</span>
                    <span>{format(new Date(colaborador.data_contratacao), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                )}
                {colaborador.endereco && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Endereco:</span>
                    <span className="text-right max-w-[200px]">{colaborador.endereco}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vales" className="mt-4">
            <ColaboradorValesTab colaboradorId={colaborador.id} />
          </TabsContent>

          <TabsContent value="comentarios" className="mt-4">
            <ColaboradorComentariosTab colaboradorId={colaborador.id} />
          </TabsContent>

          <TabsContent value="documentos" className="mt-4">
            <ColaboradorDocumentosTab colaboradorId={colaborador.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
