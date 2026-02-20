import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clienteSchema, ClienteFormData } from '@/lib/validations/cliente';
import { Cliente, PessoaAdicional, GruposParcelasConfig, Veiculo } from '@/types/cliente';
import { useClientes } from '@/hooks/useClientes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, X, Plus, ChevronDown, FolderPlus, Car, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { GruposParcelasManager } from './GruposParcelasManager';
import { CurrencyInput } from '@/components/ui/currency-input';
import { JurosMultaConfig } from './JurosMultaConfig';
import { ClienteEtiquetasManager } from './ClienteEtiquetasManager';

interface ClienteFormProps {
  cliente?: Cliente;
  onSuccess: (clienteId?: string, nomeCliente?: string) => void;
  onCancel: () => void;
  showCreateProject?: boolean;
  criarProjeto?: boolean;
  setCriarProjeto?: (value: boolean) => void;
  nomeProjeto?: string;
  setNomeProjeto?: (value: string) => void;
}

export const ClienteForm = ({ 
  cliente, 
  onSuccess, 
  onCancel,
  showCreateProject = false,
  criarProjeto = false,
  setCriarProjeto,
  nomeProjeto = '',
  setNomeProjeto,
}: ClienteFormProps) => {
  const { createCliente, updateCliente, uploadDocumento, loading } = useClientes();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [pessoasAdicionais, setPessoasAdicionais] = useState<PessoaAdicional[]>(
    cliente?.pessoas_adicionais || []
  );
  const [gruposParcelas, setGruposParcelas] = useState<GruposParcelasConfig>(
    cliente?.grupos_parcelas || { grupos: [] }
  );
  const [usarGruposParcelas, setUsarGruposParcelas] = useState(!!cliente?.grupos_parcelas);
  
  // Estados para juros e multa
  const [aplicarJuros, setAplicarJuros] = useState(cliente?.aplicar_juros || false);
  const [taxaJurosMensal, setTaxaJurosMensal] = useState(cliente?.taxa_juros_mensal?.toString() || '1');
  const [aplicarMulta, setAplicarMulta] = useState(cliente?.aplicar_multa || false);
  const [taxaMulta, setTaxaMulta] = useState(cliente?.taxa_multa?.toString() || '2');
  
  // Estado para seção colapsável
  const [contratoOpen, setContratoOpen] = useState(!!cliente?.valor_contrato);
  
  // Estado para seção veicular
  const initVeiculos = (): Veiculo[] => {
    if (cliente?.dados_veiculares?.veiculos?.length) return cliente.dados_veiculares.veiculos;
    if (cliente?.cnh || cliente?.cnh_validade) return [{ cnh: cliente.cnh || '', cnh_validade: cliente.cnh_validade || '', renavam: '', placa: '' }];
    return [{ cnh: '', cnh_validade: '', renavam: '', placa: '' }];
  };
  const [veicularOpen, setVeicularOpen] = useState(
    !!(cliente?.dados_veiculares?.veiculos?.length || cliente?.cnh || cliente?.cnh_validade)
  );
  const [veiculos, setVeiculos] = useState<Veiculo[]>(initVeiculos);
  const isEditing = !!cliente;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: cliente ? {
      nome_pessoa_fisica: cliente.nome_pessoa_fisica || '',
      nome_pessoa_juridica: cliente.nome_pessoa_juridica || '',
      cpf: cliente.cpf || '',
      cnpj: cliente.cnpj || '',
      cnh: cliente.cnh || '',
      cnh_validade: cliente.cnh_validade || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      data_nascimento: cliente.data_nascimento || '',
      endereco: cliente.endereco || '',
      profissao: cliente.profissao || '',
      uf: cliente.uf || '',
      data_fechamento: cliente.data_fechamento || '',
      valor_contrato: cliente.valor_contrato?.toString() || '',
      forma_pagamento: cliente.forma_pagamento || 'a_vista',
      valor_entrada: cliente.valor_entrada?.toString() || '',
      numero_parcelas: cliente.numero_parcelas?.toString() || '',
      valor_parcela: cliente.valor_parcela?.toString() || '',
      data_vencimento_inicial: cliente.data_vencimento_inicial || '',
      data_vencimento_final: cliente.data_vencimento_final || '',
      vendedor: cliente.vendedor || '',
      origem_rede_social: cliente.origem_rede_social || '',
      origem_tipo: cliente.origem_tipo || undefined,
      observacoes: cliente.observacoes || '',
      classificacao: cliente.classificacao || 'pf',
      status_cliente: cliente.status_cliente || 'ativo',
      proveito_economico: cliente.proveito_economico?.toString() || '',
    } : {
      forma_pagamento: 'a_vista',
      classificacao: 'pf',
      status_cliente: 'ativo',
      cpf: '',
      cnpj: '',
      cnh: '',
      cnh_validade: '',
      profissao: '',
      uf: '',
    },
  });

  const formaPagamento = watch('forma_pagamento');
  const classificacao = watch('classificacao');

  const addPessoaAdicional = () => {
    setPessoasAdicionais([...pessoasAdicionais, {
      nome_pessoa_fisica: '',
      nome_pessoa_juridica: '',
      cpf: '',
      cnpj: '',
      telefone: '',
      email: '',
      data_nascimento: '',
      endereco: '',
      profissao: '',
      uf: '',
    }]);
  };

  const removePessoaAdicional = (index: number) => {
    setPessoasAdicionais(pessoasAdicionais.filter((_, i) => i !== index));
  };

  const updatePessoaAdicional = (index: number, field: keyof PessoaAdicional, value: string) => {
    const updated = [...pessoasAdicionais];
    updated[index] = { ...updated[index], [field]: value };
    setPessoasAdicionais(updated);
  };

  const onSubmit = async (data: ClienteFormData) => {
    const clienteData: Partial<Cliente> = {
      nome_pessoa_fisica: data.nome_pessoa_fisica || undefined,
      nome_pessoa_juridica: data.nome_pessoa_juridica || undefined,
      cpf: data.cpf || undefined,
      cnpj: data.cnpj || undefined,
      cnh: veicularOpen && veiculos[0]?.cnh ? veiculos[0].cnh : undefined,
      cnh_validade: veicularOpen && veiculos[0]?.cnh_validade ? veiculos[0].cnh_validade : undefined,
      telefone: data.telefone || undefined,
      email: data.email || undefined,
      data_nascimento: data.data_nascimento || undefined,
      endereco: data.endereco || undefined,
      profissao: data.profissao || undefined,
      uf: data.uf || undefined,
      data_fechamento: data.data_fechamento || undefined,
      valor_contrato: data.valor_contrato ? parseFloat(data.valor_contrato) : undefined,
      forma_pagamento: data.forma_pagamento || undefined,
      // Só incluir campos do modelo simples se NÃO estiver usando grupos personalizados
      valor_entrada: !usarGruposParcelas && data.valor_entrada ? parseFloat(data.valor_entrada) : undefined,
      numero_parcelas: !usarGruposParcelas && data.numero_parcelas ? parseInt(data.numero_parcelas) : undefined,
      valor_parcela: !usarGruposParcelas && data.valor_parcela ? parseFloat(data.valor_parcela) : undefined,
      data_vencimento_inicial: !usarGruposParcelas && data.data_vencimento_inicial ? data.data_vencimento_inicial : undefined,
      data_vencimento_final: !usarGruposParcelas && data.data_vencimento_final ? data.data_vencimento_final : undefined,
      vendedor: data.vendedor || undefined,
      origem_rede_social: data.origem_rede_social || undefined,
      origem_tipo: data.origem_tipo || undefined,
      observacoes: data.observacoes || undefined,
      classificacao: data.classificacao,
      status_cliente: data.status_cliente || 'ativo',
      pessoas_adicionais: pessoasAdicionais.filter(p => 
        p.nome_pessoa_fisica || p.nome_pessoa_juridica
      ),
      grupos_parcelas: usarGruposParcelas ? gruposParcelas : undefined,
      dados_veiculares: veicularOpen ? { veiculos: veiculos.filter(v => v.cnh || v.renavam || v.placa) } : undefined,
      proveito_economico: data.proveito_economico ? parseFloat(data.proveito_economico) : undefined,
      // Campos de juros e multa
      aplicar_juros: aplicarJuros,
      taxa_juros_mensal: aplicarJuros ? parseFloat(taxaJurosMensal) : 0,
      aplicar_multa: aplicarMulta,
      taxa_multa: aplicarMulta ? parseFloat(taxaMulta) : 0,
    };

    let result;
    if (isEditing) {
      result = await updateCliente(cliente.id, clienteData);
    } else {
      result = await createCliente(clienteData);
    }

    if (result && selectedFiles.length > 0) {
      setUploadingFiles(true);
      for (const file of selectedFiles) {
        await uploadDocumento(result.id, file);
      }
      setUploadingFiles(false);
    }

    if (result) {
      const nomeCliente = data.nome_pessoa_fisica || data.nome_pessoa_juridica || '';
      onSuccess(result.id, nomeCliente);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* SEÇÃO 1: CLASSIFICAÇÃO DO CLIENTE */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <Label className="text-base font-semibold mb-3 block">Classificação do Cliente *</Label>
        <RadioGroup 
          value={classificacao} 
          onValueChange={(value) => setValue('classificacao', value as 'pf' | 'pj')}
        >
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pf" id="pf" />
              <Label htmlFor="pf" className="cursor-pointer font-normal">👤 Pessoa Física</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pj" id="pj" />
              <Label htmlFor="pj" className="cursor-pointer font-normal">🏢 Pessoa Jurídica</Label>
            </div>
          </div>
        </RadioGroup>
        {errors.classificacao && (
          <p className="text-sm text-destructive mt-2">{errors.classificacao.message}</p>
        )}
      </div>

      {/* SEÇÃO 2: CONTRATANTE PRINCIPAL */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>👤</span> Contratante Principal
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome_pessoa_fisica">Nome Pessoa Física</Label>
            <Input id="nome_pessoa_fisica" {...register('nome_pessoa_fisica')} />
            {errors.nome_pessoa_fisica && (
              <p className="text-sm text-destructive">{errors.nome_pessoa_fisica.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_pessoa_juridica">Nome Pessoa Jurídica</Label>
            <Input id="nome_pessoa_juridica" {...register('nome_pessoa_juridica')} />
          </div>

          {/* CPF - sempre visível */}
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input 
              id="cpf" 
              {...register('cpf')} 
              placeholder="000.000.000-00"
              maxLength={14}
            />
            {errors.cpf && (
              <p className="text-sm text-destructive">{errors.cpf.message}</p>
            )}
          </div>

          {/* CNPJ - sempre visível */}
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input 
              id="cnpj" 
              {...register('cnpj')} 
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
            {errors.cnpj && (
              <p className="text-sm text-destructive">{errors.cnpj.message}</p>
            )}
          </div>

          {/* SEÇÃO VEICULAR */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="veicular-toggle"
                checked={veicularOpen}
                onCheckedChange={(checked) => setVeicularOpen(!!checked)}
              />
              <Label htmlFor="veicular-toggle" className="flex items-center gap-2 cursor-pointer text-base font-semibold">
                <Car className="h-4 w-4" />
                Veicular
              </Label>
            </div>
            
            {veicularOpen && (
              <div className="space-y-4 pl-7">
                {veiculos.map((veiculo, idx) => (
                  <div key={idx} className="p-4 border rounded-lg relative bg-card">
                    {veiculos.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setVeiculos(veiculos.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <p className="text-sm font-medium text-muted-foreground mb-3">Veículo {idx + 1}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                      <div className="space-y-2">
                        <Label>CNH</Label>
                        <Input
                          value={veiculo.cnh || ''}
                          onChange={(e) => {
                            const updated = [...veiculos];
                            updated[idx] = { ...updated[idx], cnh: e.target.value };
                            setVeiculos(updated);
                          }}
                          placeholder="00000000000"
                          maxLength={11}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Validade CNH</Label>
                        <Input
                          type="date"
                          value={veiculo.cnh_validade || ''}
                          onChange={(e) => {
                            const updated = [...veiculos];
                            updated[idx] = { ...updated[idx], cnh_validade: e.target.value };
                            setVeiculos(updated);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>RENAVAM</Label>
                        <Input
                          value={veiculo.renavam || ''}
                          onChange={(e) => {
                            const updated = [...veiculos];
                            updated[idx] = { ...updated[idx], renavam: e.target.value };
                            setVeiculos(updated);
                          }}
                          placeholder="00000000000"
                          maxLength={11}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Placa</Label>
                        <Input
                          value={veiculo.placa || ''}
                          onChange={(e) => {
                            const updated = [...veiculos];
                            updated[idx] = { ...updated[idx], placa: e.target.value.toUpperCase() };
                            setVeiculos(updated);
                          }}
                          placeholder="ABC1D23"
                          maxLength={7}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs">Observação</Label>
                        <Input
                          value={veiculo.observacao || ''}
                          onChange={(e) => {
                            const updated = [...veiculos];
                            updated[idx] = { ...updated[idx], observacao: e.target.value };
                            setVeiculos(updated);
                          }}
                          placeholder="Observação sobre o veículo"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVeiculos([...veiculos, { cnh: '', cnh_validade: '', renavam: '', placa: '', observacao: '' }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar veículo
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" {...register('telefone')} placeholder="(00) 00000-0000" />
            {errors.telefone && (
              <p className="text-sm text-destructive">{errors.telefone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Data de Nascimento - sempre visível para PF e PJ */}
          <div className="space-y-2">
            <Label htmlFor="data_nascimento">Data de Nascimento</Label>
            <Input id="data_nascimento" type="date" {...register('data_nascimento')} />
          </div>

          {/* Profissão - sempre visível para PF e PJ */}
          <div className="space-y-2">
            <Label htmlFor="profissao">Profissão</Label>
            <Input 
              id="profissao" 
              {...register('profissao')} 
              placeholder="Ex: Empresário, Advogado, Contador..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf">Estado (UF)</Label>
            <Select
              value={watch('uf') || ''}
              onValueChange={(value) => setValue('uf', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AC">Acre</SelectItem>
                <SelectItem value="AL">Alagoas</SelectItem>
                <SelectItem value="AP">Amapá</SelectItem>
                <SelectItem value="AM">Amazonas</SelectItem>
                <SelectItem value="BA">Bahia</SelectItem>
                <SelectItem value="CE">Ceará</SelectItem>
                <SelectItem value="DF">Distrito Federal</SelectItem>
                <SelectItem value="ES">Espírito Santo</SelectItem>
                <SelectItem value="GO">Goiás</SelectItem>
                <SelectItem value="MA">Maranhão</SelectItem>
                <SelectItem value="MT">Mato Grosso</SelectItem>
                <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                <SelectItem value="MG">Minas Gerais</SelectItem>
                <SelectItem value="PA">Pará</SelectItem>
                <SelectItem value="PB">Paraíba</SelectItem>
                <SelectItem value="PR">Paraná</SelectItem>
                <SelectItem value="PE">Pernambuco</SelectItem>
                <SelectItem value="PI">Piauí</SelectItem>
                <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                <SelectItem value="RO">Rondônia</SelectItem>
                <SelectItem value="RR">Roraima</SelectItem>
                <SelectItem value="SC">Santa Catarina</SelectItem>
                <SelectItem value="SP">São Paulo</SelectItem>
                <SelectItem value="SE">Sergipe</SelectItem>
                <SelectItem value="TO">Tocantins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" {...register('endereco')} />
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: PESSOAS/EMPRESAS ADICIONAIS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>👥</span> Pessoas/Empresas Adicionais
          </h3>
          <Button type="button" onClick={addPessoaAdicional} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
        
        {pessoasAdicionais.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-4 text-center border border-dashed rounded-lg">
            Nenhuma pessoa/empresa adicional cadastrada
          </p>
        )}
        
        <div className="space-y-4">
          {pessoasAdicionais.map((pessoa, index) => (
            <div key={index} className="p-4 border rounded-lg relative bg-card">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => removePessoaAdicional(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                <div className="space-y-2">
                  <Label>Nome Pessoa Física</Label>
                  <Input
                    value={pessoa.nome_pessoa_fisica || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'nome_pessoa_fisica', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Nome Pessoa Jurídica</Label>
                  <Input
                    value={pessoa.nome_pessoa_juridica || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'nome_pessoa_juridica', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    value={pessoa.cpf || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>

                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={pessoa.cnpj || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'cnpj', e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={pessoa.telefone || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={pessoa.email || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'email', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={pessoa.data_nascimento || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'data_nascimento', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Profissão</Label>
                  <Input
                    value={pessoa.profissao || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'profissao', e.target.value)}
                    placeholder="Ex: Advogado, Médico..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado (UF)</Label>
                  <Input
                    value={pessoa.uf || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'uf', e.target.value.toUpperCase())}
                    placeholder="Ex: SP, RJ, PR..."
                    maxLength={2}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    value={pessoa.endereco || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'endereco', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seção de Etiquetas - Sempre visível */}
      <ClienteEtiquetasManager clienteId={cliente?.id} />

      {/* SEÇÃO 4: DADOS DO CONTRATO (Colapsável) */}
      <Collapsible open={contratoOpen} onOpenChange={setContratoOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted"
          >
            <span className="text-lg font-semibold flex items-center gap-2">
              <span>📄</span> Dados do Contrato
            </span>
            <ChevronDown className={cn(
              "h-5 w-5 transition-transform duration-200",
              contratoOpen && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
        {isEditing && (
          <div className="flex items-start gap-2 p-3 rounded-md border border-amber-500/50 bg-amber-500/10 text-sm text-amber-700 dark:text-amber-400 md:col-span-2 mb-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Alterar os dados de pagamento irá regenerar todas as parcelas. Parcelas já pagas perderão o histórico.</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data_fechamento">Data de Fechamento *</Label>
            <Input id="data_fechamento" type="date" {...register('data_fechamento')} />
            {errors.data_fechamento && (
              <p className="text-sm text-destructive">{errors.data_fechamento.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_contrato">Valor do Contrato *</Label>
            <CurrencyInput
              id="valor_contrato"
              value={watch('valor_contrato') ? parseFloat(watch('valor_contrato')) : undefined}
              onChange={(value) => setValue('valor_contrato', value.toString())}
              placeholder="R$ 0,00"
            />
            {errors.valor_contrato && (
              <p className="text-sm text-destructive">{errors.valor_contrato.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="forma_pagamento">Forma de Pagamento *</Label>
            <Select
              value={watch('forma_pagamento')}
              onValueChange={(value) => setValue('forma_pagamento', value as 'a_vista' | 'parcelado')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a_vista">À Vista</SelectItem>
                <SelectItem value="parcelado">Parcelado</SelectItem>
              </SelectContent>
            </Select>
            {errors.forma_pagamento && (
              <p className="text-sm text-destructive">{errors.forma_pagamento.message}</p>
            )}
          </div>

          {formaPagamento === 'parcelado' && (
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!usarGruposParcelas}
                    onChange={() => setUsarGruposParcelas(false)}
                    className="cursor-pointer"
                  />
                  <span>Parcelamento Simples</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={usarGruposParcelas}
                    onChange={() => setUsarGruposParcelas(true)}
                    className="cursor-pointer"
                  />
                  <span>Parcelamento Personalizado</span>
                </Label>
              </div>

              {!usarGruposParcelas ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor_entrada">Valor de Entrada</Label>
                    <CurrencyInput
                      id="valor_entrada"
                      value={watch('valor_entrada') ? parseFloat(watch('valor_entrada')) : undefined}
                      onChange={(value) => setValue('valor_entrada', value.toString())}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numero_parcelas">Número de Parcelas *</Label>
                    <Input id="numero_parcelas" type="number" {...register('numero_parcelas')} placeholder="12" />
                    {errors.numero_parcelas && (
                      <p className="text-sm text-destructive">{errors.numero_parcelas.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor_parcela">Valor da Parcela</Label>
                    <CurrencyInput
                      id="valor_parcela"
                      value={watch('valor_parcela') ? parseFloat(watch('valor_parcela')) : undefined}
                      onChange={(value) => setValue('valor_parcela', value.toString())}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_vencimento_inicial">Vencimento Inicial *</Label>
                    <Input 
                      id="data_vencimento_inicial" 
                      type="date" 
                      {...register('data_vencimento_inicial')} 
                    />
                    {errors.data_vencimento_inicial && (
                      <p className="text-sm text-destructive">{errors.data_vencimento_inicial.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_vencimento_final">Vencimento Final *</Label>
                    <Input 
                      id="data_vencimento_final" 
                      type="date" 
                      {...register('data_vencimento_final')} 
                    />
                    {errors.data_vencimento_final && (
                      <p className="text-sm text-destructive">{errors.data_vencimento_final.message}</p>
                    )}
                  </div>
                </div>
              ) : (
                <GruposParcelasManager
                  value={gruposParcelas}
                  onChange={setGruposParcelas}
                  valorContrato={parseFloat(watch('valor_contrato')) || 0}
                />
              )}

              {/* Configuração de Juros e Multa */}
              <JurosMultaConfig
                aplicarJuros={aplicarJuros}
                taxaJurosMensal={taxaJurosMensal}
                aplicarMulta={aplicarMulta}
                taxaMulta={taxaMulta}
                onAplicarJurosChange={setAplicarJuros}
                onTaxaJurosMensalChange={setTaxaJurosMensal}
                onAplicarMultaChange={setAplicarMulta}
                onTaxaMultaChange={setTaxaMulta}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="proveito_economico">
              Proveito Econômico <span className="text-xs text-muted-foreground">(% opcional)</span>
            </Label>
            <div className="relative">
              <Input 
                id="proveito_economico" 
                type="number"
                min="0"
                max="100"
                step="0.01"
                {...register('proveito_economico')} 
                placeholder="0"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendedor">Vendedor</Label>
            <Input id="vendedor" {...register('vendedor')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="origem_tipo">Tipo de Origem</Label>
            <Select
              value={watch('origem_tipo')}
              onValueChange={(value) => setValue('origem_tipo', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="indicacao">Indicação</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="origem_rede_social">Origem (Rede Social)</Label>
            <Input id="origem_rede_social" {...register('origem_rede_social')} placeholder="@usuario ou nome da página" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status_cliente">Status do Cliente</Label>
            <Select
              value={watch('status_cliente')}
              onValueChange={(value) => setValue('status_cliente', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">✅ Ativo</SelectItem>
                <SelectItem value="inativo">⏸️ Inativo</SelectItem>
                <SelectItem value="contrato_encerrado">🔒 Contrato Encerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" {...register('observacoes')} rows={3} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" {...register('observacoes')} rows={3} />
          </div>

          {!isEditing && (
            <div className="space-y-2 md:col-span-2">
              <Label>Documentos (opcional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground text-center">
                    <label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
                      Clique para fazer upload
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Seção: Criar Projeto Vinculado */}
      {showCreateProject && !isEditing && (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="criar-projeto"
              checked={criarProjeto}
              onCheckedChange={(checked) => setCriarProjeto?.(!!checked)}
            />
            <Label htmlFor="criar-projeto" className="flex items-center gap-2 cursor-pointer">
              <FolderPlus className="h-4 w-4 text-primary" />
              Criar projeto vinculado a este cliente
            </Label>
          </div>
          
          {criarProjeto && (
            <div className="pl-7 space-y-2">
              <Label htmlFor="nome-projeto" className="text-sm">Nome do Projeto</Label>
              <Input
                id="nome-projeto"
                value={nomeProjeto}
                onChange={(e) => setNomeProjeto?.(e.target.value)}
                placeholder="Nome do projeto (deixe em branco para usar o nome do cliente)"
              />
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading || uploadingFiles}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || uploadingFiles}>
          {loading || uploadingFiles ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
};