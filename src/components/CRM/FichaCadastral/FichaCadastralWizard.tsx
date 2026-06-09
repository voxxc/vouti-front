import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FileSpreadsheet, Save } from 'lucide-react';
import { Cliente } from '@/types/cliente';
import { useClientes } from '@/hooks/useClientes';
import { useFichaCadastral } from '@/hooks/useFichaCadastral';
import { exportFichaXlsx } from '@/lib/fichaCadastral/exportXlsx';
import { emptyConta, emptyDivida, emptyFicha, emptyPessoa, FichaCadastral } from '@/lib/fichaCadastral/schema';
import { toast } from '@/hooks/use-toast';

interface Props {
  cliente?: Cliente;
  onSuccess: (clienteId?: string, nomeCliente?: string) => void;
  onCancel: () => void;
}

const CHECKLIST: Array<{ key: keyof FichaCadastral['dados_contrato']['checklist']; label: string }> = [
  { key: 'procuracoes', label: 'Procurações assinadas' },
  { key: 'execucao', label: 'Já há execução?' },
  { key: 'citacao', label: 'Já houve citação?' },
  { key: 'leilao', label: 'Há risco de leilão?' },
  { key: 'avalistas', label: 'Possui avalistas?' },
  { key: 'alienacao', label: 'Alienação fiduciária?' },
];

export const FichaCadastralWizard = ({ cliente, onSuccess, onCancel }: Props) => {
  const { createCliente, updateCliente } = useClientes();
  const { fetchByCliente, upsert, loading } = useFichaCadastral();

  const [tab, setTab] = useState('contrato');
  const [ficha, setFicha] = useState<FichaCadastral>(() => {
    const f = emptyFicha();
    if (cliente) {
      f.cliente_principal = {
        ...f.cliente_principal,
        nome: cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || '',
        cpf: cliente.cpf || cliente.cnpj || '',
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        endereco: cliente.endereco || '',
        profissao: cliente.profissao || '',
        responsavel_contrato: true,
      };
      if (cliente.data_fechamento) f.dados_contrato.data_fechamento = cliente.data_fechamento;
    }
    return f;
  });

  useEffect(() => {
    if (cliente?.id) {
      fetchByCliente(cliente.id).then((existing) => {
        if (existing) {
          setFicha((prev) => ({
            ...existing,
            cliente_principal: prev.cliente_principal,
          }));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente?.id]);

  const setP = (mut: (f: FichaCadastral) => void) => {
    setFicha((prev) => {
      const next = structuredClone(prev);
      mut(next);
      return next;
    });
  };

  const cp = ficha.cliente_principal;
  const d = ficha.dados_contrato;

  const handleSave = async (alsoExport = false) => {
    if (!cp.nome.trim()) {
      toast({ title: 'Nome do cliente principal é obrigatório', variant: 'destructive' });
      setTab('clientes');
      return;
    }
    let clienteId = cliente?.id;
    const nome = cp.nome;
    const payload: Partial<Cliente> = {
      nome_pessoa_fisica: cp.nome,
      cpf: cp.cpf || null as any,
      telefone: cp.telefone || null,
      email: cp.email || null,
      endereco: cp.endereco || null,
      profissao: cp.profissao || null,
      data_fechamento: d.data_fechamento || null,
      vendedor: d.consultor || null,
    };
    if (clienteId) {
      const upd = await updateCliente(clienteId, payload);
      if (!upd) return;
    } else {
      const created = await createCliente(payload);
      if (!created) return;
      clienteId = created.id;
    }
    const ok = await upsert(clienteId!, ficha);
    if (!ok) return;
    if (alsoExport) {
      await exportFichaXlsx(ficha, `ficha-${nome.replace(/\s+/g, '_').toLowerCase()}`);
    }
    onSuccess(clienteId, nome);
  };

  const handleExportOnly = async () => {
    await exportFichaXlsx(ficha, `ficha-${(cp.nome || 'cliente').replace(/\s+/g, '_').toLowerCase()}`);
  };

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="contrato">1. Contrato</TabsTrigger>
          <TabsTrigger value="clientes">2. Clientes</TabsTrigger>
          <TabsTrigger value="contas">3. Contas</TabsTrigger>
          <TabsTrigger value="dividas">4. Dívidas</TabsTrigger>
        </TabsList>

        {/* ============ CONTRATO ============ */}
        <TabsContent value="contrato" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Forma de captação</Label>
              <Input value={d.forma_captacao} onChange={(e) => setP(f => { f.dados_contrato.forma_captacao = e.target.value; })} />
            </div>
            <div>
              <Label>Consultor</Label>
              <Input value={d.consultor} onChange={(e) => setP(f => { f.dados_contrato.consultor = e.target.value; })} />
            </div>
            <div>
              <Label>Advogado responsável</Label>
              <Input value={d.advogado_responsavel} onChange={(e) => setP(f => { f.dados_contrato.advogado_responsavel = e.target.value; })} />
            </div>
            <div>
              <Label>Responsável financeiro</Label>
              <Input value={d.responsavel_financeiro} onChange={(e) => setP(f => { f.dados_contrato.responsavel_financeiro = e.target.value; })} />
            </div>
            <div>
              <Label>Data de fechamento</Label>
              <Input type="date" value={d.data_fechamento} onChange={(e) => setP(f => { f.dados_contrato.data_fechamento = e.target.value; })} />
            </div>
            <div>
              <Label>Data pagamento entrada</Label>
              <Input type="date" value={d.data_pagamento_entrada} onChange={(e) => setP(f => { f.dados_contrato.data_pagamento_entrada = e.target.value; })} />
            </div>
          </div>
          <div>
            <Label>Serviços contratados</Label>
            <Textarea rows={2} value={d.servicos_contratados} onChange={(e) => setP(f => { f.dados_contrato.servicos_contratados = e.target.value; })} />
          </div>

          <div className="border rounded-md p-4">
            <h3 className="font-semibold mb-3">Checklist</h3>
            <div className="space-y-3">
              {CHECKLIST.map(({ key, label }) => {
                const item = d.checklist[key];
                return (
                  <div key={key} className="grid md:grid-cols-[1fr_140px_2fr] gap-2 items-center">
                    <Label>{label}</Label>
                    <Select value={item.resposta} onValueChange={(v) => setP(f => { f.dados_contrato.checklist[key].resposta = v as any; })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                        <SelectItem value="na">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Observação" value={item.observacao} onChange={(e) => setP(f => { f.dados_contrato.checklist[key].observacao = e.target.value; })} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Observação geral</Label>
              <Textarea rows={3} value={d.observacao_geral} onChange={(e) => setP(f => { f.dados_contrato.observacao_geral = e.target.value; })} />
            </div>
            <div>
              <Label>Situações urgentes</Label>
              <Textarea rows={3} value={d.situacoes_urgentes} onChange={(e) => setP(f => { f.dados_contrato.situacoes_urgentes = e.target.value; })} />
            </div>
          </div>
        </TabsContent>

        {/* ============ CLIENTES ============ */}
        <TabsContent value="clientes" className="space-y-6 mt-4">
          <div className="border rounded-md p-4">
            <h3 className="font-semibold mb-3">Cliente principal</h3>
            <PessoaFields
              pessoa={cp}
              onChange={(p) => setP(f => { f.cliente_principal = p; })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Outros clientes</h3>
              <Button type="button" size="sm" variant="outline" onClick={() => setP(f => { f.outros_clientes.push(emptyPessoa()); })}>
                <Plus size={14} className="mr-1" /> Adicionar
              </Button>
            </div>
            {ficha.outros_clientes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cliente adicional.</p>}
            {ficha.outros_clientes.map((p, i) => (
              <div key={i} className="border rounded-md p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Cliente {i + 2}</span>
                  <Button type="button" size="icon" variant="ghost" onClick={() => setP(f => { f.outros_clientes.splice(i, 1); })}>
                    <Trash2 size={14} />
                  </Button>
                </div>
                <PessoaFields
                  pessoa={p}
                  onChange={(np) => setP(f => { f.outros_clientes[i] = np; })}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ============ CONTAS ============ */}
        <TabsContent value="contas" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Contas contratadas</h3>
            <Button type="button" size="sm" variant="outline" onClick={() => setP(f => { f.contas.push(emptyConta()); })}>
              <Plus size={14} className="mr-1" /> Adicionar conta
            </Button>
          </div>
          {ficha.contas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta adicionada.</p>}
          {ficha.contas.map((c, i) => (
            <div key={i} className="grid md:grid-cols-[1fr_1fr_1fr_40px] gap-2 items-end border rounded-md p-3">
              <div>
                <Label>Titular</Label>
                <Input value={c.titular} onChange={(e) => setP(f => { f.contas[i].titular = e.target.value; })} />
              </div>
              <div>
                <Label>Banco</Label>
                <Input value={c.banco} onChange={(e) => setP(f => { f.contas[i].banco = e.target.value; })} />
              </div>
              <div>
                <Label>Agência / Conta</Label>
                <Input value={c.agencia_conta} onChange={(e) => setP(f => { f.contas[i].agencia_conta = e.target.value; })} />
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setP(f => { f.contas.splice(i, 1); })}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </TabsContent>

        {/* ============ DÍVIDAS ============ */}
        <TabsContent value="dividas" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Resumo de endividamento</h3>
            <Button type="button" size="sm" variant="outline" onClick={() => setP(f => { f.dividas.push(emptyDivida()); })}>
              <Plus size={14} className="mr-1" /> Adicionar dívida
            </Button>
          </div>
          {ficha.dividas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma dívida adicionada.</p>}
          {ficha.dividas.map((dv, i) => (
            <div key={i} className="border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Dívida {i + 1}</span>
                <Button type="button" size="icon" variant="ghost" onClick={() => setP(f => { f.dividas.splice(i, 1); })}>
                  <Trash2 size={14} />
                </Button>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>Banco</Label><Input value={dv.banco} onChange={(e) => setP(f => { f.dividas[i].banco = e.target.value; })} /></div>
                <div><Label>Agência / Conta</Label><Input value={dv.agencia_conta} onChange={(e) => setP(f => { f.dividas[i].agencia_conta = e.target.value; })} /></div>
                <div><Label>Titular</Label><Input value={dv.titular} onChange={(e) => setP(f => { f.dividas[i].titular = e.target.value; })} /></div>
                <div><Label>Anos de movimentação</Label><Input value={dv.anos_movimentacao} onChange={(e) => setP(f => { f.dividas[i].anos_movimentacao = e.target.value; })} /></div>
                <div><Label>Valor da dívida</Label><Input value={dv.valor_divida} onChange={(e) => setP(f => { f.dividas[i].valor_divida = e.target.value; })} /></div>
                <div><Label>Situação parcelas</Label><Input value={dv.situacao_parcelas} onChange={(e) => setP(f => { f.dividas[i].situacao_parcelas = e.target.value; })} /></div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Bens em garantia</Label><Input value={dv.bens_garantia} onChange={(e) => setP(f => { f.dividas[i].bens_garantia = e.target.value; })} /></div>
                <div><Label>Avalistas</Label><Input value={dv.avalistas} onChange={(e) => setP(f => { f.dividas[i].avalistas = e.target.value; })} /></div>
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea rows={2} value={dv.observacao} onChange={(e) => setP(f => { f.dividas[i].observacao = e.target.value; })} />
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleExportOnly} disabled={loading}>
            <FileSpreadsheet size={16} className="mr-1" /> Exportar XLSX
          </Button>
          <Button type="button" variant="outline" onClick={() => handleSave(true)} disabled={loading}>
            <FileSpreadsheet size={16} className="mr-1" /> Salvar + Exportar
          </Button>
          <Button type="button" onClick={() => handleSave(false)} disabled={loading}>
            <Save size={16} className="mr-1" /> Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

function PessoaFields({ pessoa, onChange }: { pessoa: any; onChange: (p: any) => void }) {
  const upd = (k: string, v: any) => onChange({ ...pessoa, [k]: v });
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div><Label>Nome</Label><Input value={pessoa.nome} onChange={(e) => upd('nome', e.target.value)} /></div>
      <div><Label>CPF</Label><Input value={pessoa.cpf} onChange={(e) => upd('cpf', e.target.value)} /></div>
      <div><Label>RG</Label><Input value={pessoa.rg} onChange={(e) => upd('rg', e.target.value)} /></div>
      <div><Label>Estado civil</Label><Input value={pessoa.estado_civil} onChange={(e) => upd('estado_civil', e.target.value)} /></div>
      <div><Label>Profissão</Label><Input value={pessoa.profissao} onChange={(e) => upd('profissao', e.target.value)} /></div>
      <div><Label>Telefone</Label><Input value={pessoa.telefone} onChange={(e) => upd('telefone', e.target.value)} /></div>
      <div><Label>E-mail</Label><Input type="email" value={pessoa.email} onChange={(e) => upd('email', e.target.value)} /></div>
      <div><Label>Endereço</Label><Input value={pessoa.endereco} onChange={(e) => upd('endereco', e.target.value)} /></div>
      <div className="md:col-span-2 flex items-center gap-2">
        <Checkbox id={`resp-${pessoa.nome}`} checked={pessoa.responsavel_contrato} onCheckedChange={(c) => upd('responsavel_contrato', !!c)} />
        <Label htmlFor={`resp-${pessoa.nome}`} className="cursor-pointer">Responsável pelo contrato</Label>
      </div>
    </div>
  );
}