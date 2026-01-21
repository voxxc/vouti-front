import { useState } from 'react';
import { Search, User, Building2, Loader2, MapPin, Phone, Mail, Users, AlertCircle, Calendar, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';

type SearchType = 'cpf' | 'cnpj' | 'name';

interface Address {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

interface Contact {
  type?: string;
  value?: string;
}

interface Partner {
  name?: string;
  document?: string;
  qualification?: string;
}

interface EconomicActivity {
  code?: string;
  description?: string;
  is_main?: boolean;
}

interface EntityData {
  name?: string;
  document?: string;
  type?: 'person' | 'company';
  birth_date?: string;
  gender?: string;
  nationality?: string;
  mother_name?: string;
  father_name?: string;
  trading_name?: string;
  legal_nature?: string;
  share_capital?: number;
  special_situation?: string;
  addresses?: Address[];
  contacts?: Contact[];
  partners?: Partner[];
  economic_activities?: EconomicActivity[];
}

export function SuperAdminBuscaGeral() {
  const [searchType, setSearchType] = useState<SearchType>('cpf');
  const [searchKey, setSearchKey] = useState('');
  const [onDemand, setOnDemand] = useState(true);
  const [revealPartners, setRevealPartners] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EntityData[]>([]);
  const [searched, setSearched] = useState(false);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  const handleInputChange = (value: string) => {
    if (searchType === 'cpf') {
      setSearchKey(formatCPF(value));
    } else if (searchType === 'cnpj') {
      setSearchKey(formatCNPJ(value));
    } else {
      setSearchKey(value);
    }
  };

  const handleSearch = async () => {
    if (!searchKey.trim()) {
      toast({ title: 'Erro', description: 'Digite um valor para buscar', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setSearched(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('judit-buscar-dados-cadastrais', {
        body: {
          search_type: searchType,
          search_key: searchKey,
          on_demand: onDemand,
          reveal_partners_documents: revealPartners,
        },
      });

      if (error) throw error;

      if (data.pending) {
        toast({ 
          title: 'Busca em processamento', 
          description: data.message || 'Tente novamente em alguns segundos' 
        });
        return;
      }

      if (data.success && data.data) {
        // Normalizar dados - pode vir como array ou objeto único
        const entities = Array.isArray(data.data) ? data.data : [data.data];
        setResults(entities);
        
        if (entities.length === 0) {
          toast({ title: 'Nenhum resultado', description: 'Nenhum dado encontrado para a busca' });
        } else {
          toast({ title: 'Sucesso', description: `${entities.length} resultado(s) encontrado(s)` });
        }
      } else {
        toast({ title: 'Erro', description: data.error || 'Erro ao realizar busca', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('Erro na busca:', err);
      toast({ 
        title: 'Erro', 
        description: err.message || 'Erro ao realizar busca', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'Não informado';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Não informado';
    try {
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return date;
    }
  };

  const renderAddress = (address: Address, index: number) => (
    <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
      <span>
        {[
          address.street,
          address.number,
          address.complement,
          address.neighborhood,
          address.city,
          address.state,
          address.zip_code
        ].filter(Boolean).join(', ') || 'Endereço não disponível'}
      </span>
    </div>
  );

  const renderContact = (contact: Contact, index: number) => {
    const isPhone = contact.type?.toLowerCase().includes('phone') || contact.type?.toLowerCase().includes('telefone');
    const isEmail = contact.type?.toLowerCase().includes('email') || contact.value?.includes('@');
    
    return (
      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
        {isEmail ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
        <span>{contact.value || 'Não disponível'}</span>
        {contact.type && <Badge variant="outline" className="text-xs">{contact.type}</Badge>}
      </div>
    );
  };

  const renderPersonCard = (entity: EntityData, index: number) => (
    <Card key={index} className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{entity.name || 'Nome não disponível'}</CardTitle>
              <CardDescription>CPF: {entity.document || 'Não informado'}</CardDescription>
            </div>
          </div>
          <Badge>Pessoa Física</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dados Pessoais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {entity.birth_date && (
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Nascimento
              </span>
              <span className="font-medium">{formatDate(entity.birth_date)}</span>
            </div>
          )}
          {entity.gender && (
            <div>
              <span className="text-muted-foreground">Gênero</span>
              <span className="font-medium block">{entity.gender}</span>
            </div>
          )}
          {entity.nationality && (
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Nacionalidade
              </span>
              <span className="font-medium">{entity.nationality}</span>
            </div>
          )}
        </div>

        {/* Filiação */}
        {(entity.mother_name || entity.father_name) && (
          <div className="space-y-1">
            <span className="text-sm font-medium">Filiação</span>
            {entity.mother_name && (
              <p className="text-sm text-muted-foreground">Mãe: {entity.mother_name}</p>
            )}
            {entity.father_name && (
              <p className="text-sm text-muted-foreground">Pai: {entity.father_name}</p>
            )}
          </div>
        )}

        <Accordion type="multiple" className="w-full">
          {/* Endereços */}
          {entity.addresses && entity.addresses.length > 0 && (
            <AccordionItem value="addresses">
              <AccordionTrigger className="text-sm">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereços ({entity.addresses.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                {entity.addresses.map(renderAddress)}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Contatos */}
          {entity.contacts && entity.contacts.length > 0 && (
            <AccordionItem value="contacts">
              <AccordionTrigger className="text-sm">
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contatos ({entity.contacts.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                {entity.contacts.map(renderContact)}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );

  const renderCompanyCard = (entity: EntityData, index: number) => (
    <Card key={index} className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900">
              <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{entity.name || 'Razão Social não disponível'}</CardTitle>
              <CardDescription>CNPJ: {entity.document || 'Não informado'}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">Pessoa Jurídica</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dados da Empresa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {entity.trading_name && (
            <div>
              <span className="text-muted-foreground">Nome Fantasia</span>
              <span className="font-medium block">{entity.trading_name}</span>
            </div>
          )}
          {entity.legal_nature && (
            <div>
              <span className="text-muted-foreground">Natureza Jurídica</span>
              <span className="font-medium block">{entity.legal_nature}</span>
            </div>
          )}
          {entity.share_capital !== undefined && (
            <div>
              <span className="text-muted-foreground">Capital Social</span>
              <span className="font-medium block">{formatCurrency(entity.share_capital)}</span>
            </div>
          )}
          {entity.special_situation && (
            <div>
              <span className="text-muted-foreground">Situação Especial</span>
              <Badge variant="destructive" className="mt-1">{entity.special_situation}</Badge>
            </div>
          )}
        </div>

        <Accordion type="multiple" className="w-full">
          {/* Sócios */}
          {entity.partners && entity.partners.length > 0 && (
            <AccordionItem value="partners">
              <AccordionTrigger className="text-sm">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Sócios ({entity.partners.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                {entity.partners.map((partner, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                    <div>
                      <span className="font-medium">{partner.name}</span>
                      {partner.document && (
                        <span className="text-muted-foreground ml-2">({partner.document})</span>
                      )}
                    </div>
                    {partner.qualification && (
                      <Badge variant="outline">{partner.qualification}</Badge>
                    )}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Atividades Econômicas */}
          {entity.economic_activities && entity.economic_activities.length > 0 && (
            <AccordionItem value="activities">
              <AccordionTrigger className="text-sm">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Atividades Econômicas ({entity.economic_activities.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                {entity.economic_activities.map((activity, i) => (
                  <div key={i} className="text-sm p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      {activity.is_main && <Badge className="text-xs">Principal</Badge>}
                      {activity.code && <span className="text-muted-foreground">{activity.code}</span>}
                    </div>
                    <span>{activity.description}</span>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Endereços */}
          {entity.addresses && entity.addresses.length > 0 && (
            <AccordionItem value="addresses">
              <AccordionTrigger className="text-sm">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereços ({entity.addresses.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                {entity.addresses.map(renderAddress)}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Contatos */}
          {entity.contacts && entity.contacts.length > 0 && (
            <AccordionItem value="contacts">
              <AccordionTrigger className="text-sm">
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contatos ({entity.contacts.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                {entity.contacts.map(renderContact)}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );

  const renderEntityCard = (entity: EntityData, index: number) => {
    // Determinar tipo baseado no documento ou tipo explícito
    const isCompany = entity.type === 'company' || 
      (entity.document && entity.document.replace(/\D/g, '').length === 14);
    
    return isCompany ? renderCompanyCard(entity, index) : renderPersonCard(entity, index);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Busca por Dados Cadastrais</h2>
        <p className="text-muted-foreground">
          Consulte informações de CPF, CNPJ ou Nome na base da Receita Federal via Judit
        </p>
      </div>

      {/* Formulário de Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Tipo de Busca */}
            <div className="space-y-2">
              <Label htmlFor="search-type">Tipo de Busca</Label>
              <Select 
                value={searchType} 
                onValueChange={(v: SearchType) => {
                  setSearchType(v);
                  setSearchKey('');
                }}
              >
                <SelectTrigger id="search-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      CPF
                    </div>
                  </SelectItem>
                  <SelectItem value="cnpj">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      CNPJ
                    </div>
                  </SelectItem>
                  <SelectItem value="name">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Nome
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo de Busca */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="search-key">
                {searchType === 'cpf' ? 'CPF' : searchType === 'cnpj' ? 'CNPJ' : 'Nome'}
              </Label>
              <Input
                id="search-key"
                placeholder={
                  searchType === 'cpf' ? '000.000.000-00' :
                  searchType === 'cnpj' ? '00.000.000/0000-00' :
                  'Digite o nome...'
                }
                value={searchKey}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* Botão Buscar */}
            <div className="flex items-end">
              <Button 
                onClick={handleSearch} 
                disabled={loading || !searchKey.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Opções Extras */}
          <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="on-demand" 
                checked={onDemand} 
                onCheckedChange={(c) => setOnDemand(c === true)}
              />
              <Label htmlFor="on-demand" className="text-sm cursor-pointer">
                Consultar em tempo real na Receita Federal
              </Label>
            </div>
            
            {searchType === 'cnpj' && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="reveal-partners" 
                  checked={revealPartners} 
                  onCheckedChange={(c) => setRevealPartners(c === true)}
                />
                <Label htmlFor="reveal-partners" className="text-sm cursor-pointer">
                  Revelar documentos dos sócios
                </Label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aviso para busca por nome */}
      {searchType === 'name' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            A busca por nome pode retornar <strong>homônimos</strong>. Confirme os dados (CPF/CNPJ) antes de usar as informações.
          </AlertDescription>
        </Alert>
      )}

      {/* Resultados */}
      {searched && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Resultados {results.length > 0 && `(${results.length})`}
          </h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum resultado encontrado para esta busca.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.map(renderEntityCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
