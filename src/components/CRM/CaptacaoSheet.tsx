// Captação Sheet Component
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantId } from "@/hooks/useTenantId";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, MessageSquare, User, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LeadCommentPanel } from "./LeadCommentPanel";

interface Lead {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tipo: string | null;
  status: string | null;
  prioridade: string | null;
  validado: string | null;
  uf: string | null;
  responsavel_id: string | null;
  created_at: string;
  comentario?: string | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface StatusGroup {
  label: string;
  statusValues: string[];
  isOpen: boolean;
}

const TIPOS_CONFIG = {
  // Tipos de Agronegócio (Landing Page 1)
  'empresario': { label: 'Empresário', color: 'bg-blue-500 text-white' },
  'agricultor': { label: 'Agricultor', color: 'bg-green-500 text-white' },
  'pecuarista': { label: 'Pecuarista', color: 'bg-orange-500 text-white' },
  'produtor rural': { label: 'Produtor Rural', color: 'bg-amber-600 text-white' },
  
  // Áreas de Advocacia (Landing Page 2)
  'civil': { label: 'Direito Civil', color: 'bg-indigo-500 text-white' },
  'trabalhista': { label: 'Direito Trabalhista', color: 'bg-violet-500 text-white' },
  'familia': { label: 'Direito de Família', color: 'bg-pink-500 text-white' },
  'empresarial': { label: 'Direito Empresarial', color: 'bg-blue-600 text-white' },
  'tributario': { label: 'Direito Tributário', color: 'bg-emerald-600 text-white' },
  'imobiliario': { label: 'Direito Imobiliário', color: 'bg-teal-500 text-white' },
  'previdenciario': { label: 'Direito Previdenciário', color: 'bg-sky-500 text-white' },
  'consumidor': { label: 'Direito do Consumidor', color: 'bg-rose-500 text-white' },
};

const STATUS_CONFIG = {
  'captacao': { label: 'Captação', color: 'bg-gray-500 text-white' },
  'agendado': { label: 'Agendado', color: 'bg-blue-600 text-white' },
  'agendar': { label: 'Agendar', color: 'bg-cyan-500 text-white' },
  'proposta enviada': { label: 'Proposta Enviada', color: 'bg-purple-500 text-white' },
  '1a tentativa de contato': { label: '1ª Tentativa', color: 'bg-yellow-500 text-white' },
  '2a tentativa de contato': { label: '2ª Tentativa', color: 'bg-yellow-600 text-white' },
  '3a tentativa de contato': { label: '3ª Tentativa', color: 'bg-orange-500 text-white' },
  '4a tentativa de contato': { label: '4ª Tentativa', color: 'bg-red-500 text-white' },
  'reagendar': { label: 'Reagendar', color: 'bg-amber-500 text-white' },
  '1a reuniao realizada': { label: '1ª Reunião', color: 'bg-indigo-500 text-white' },
  '2a reuniao realizada': { label: '2ª Reunião', color: 'bg-indigo-600 text-white' },
  'sucesso do cliente': { label: 'Sucesso', color: 'bg-green-600 text-white' },
  'negociou com banco': { label: 'Negociou Banco', color: 'bg-teal-500 text-white' },
  'ja tem advogado': { label: 'Tem Advogado', color: 'bg-gray-600 text-white' },
  'desqualificado': { label: 'Desqualificado', color: 'bg-red-600 text-white' },
};

const PRIORIDADE_CONFIG = {
  'prioridade': { label: 'PRIORIDADE', color: 'bg-red-600 text-white' },
  '0 a 100k': { label: '0 a 100k', color: 'bg-emerald-500 text-white' },
  '101k a 300k': { label: '101k a 300k', color: 'bg-orange-400 text-white' },
  '301k a 500k': { label: '301k a 500k', color: 'bg-amber-500 text-white' },
  '501k a 1M': { label: '501k a 1M', color: 'bg-purple-500 text-white' },
  'mais de 1M': { label: 'Mais de 1M', color: 'bg-pink-600 text-white' },
  'a definir': { label: 'A Definir', color: 'bg-gray-400 text-white' },
};

const VALIDADO_CONFIG = {
  'validado': { label: 'Validado', color: 'bg-green-500 text-white' },
  'em contato': { label: 'Em Contato', color: 'bg-blue-500 text-white' },
  'sem contato': { label: 'Sem Contato', color: 'bg-gray-500 text-white' },
  'a definir': { label: 'A Definir', color: 'bg-gray-400 text-white' },
};

export function CaptacaoSheet() {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusGroups, setStatusGroups] = useState<StatusGroup[]>([
    { label: "Captação", statusValues: ["captacao"], isOpen: true },
    { label: "VALIDADO", statusValues: ["1a tentativa de contato", "2a tentativa de contato", "3a tentativa de contato", "4a tentativa de contato"], isOpen: false },
    { label: "Em agendamento / Agendar", statusValues: ["agendado", "agendar"], isOpen: false },
    { label: "Reunião realizada", statusValues: ["1a reuniao realizada", "2a reuniao realizada"], isOpen: false },
    { label: "Fechamento", statusValues: ["proposta enviada", "negociou com banco"], isOpen: false },
    { label: "Reagendar", statusValues: ["reagendar"], isOpen: false },
    { label: "Sucesso do cliente", statusValues: ["sucesso do cliente"], isOpen: false },
    { label: "Desqualificado", statusValues: ["ja tem advogado", "desqualificado"], isOpen: false },
  ]);

  useEffect(() => {
    if (user && tenantId) {
      fetchLeads();
      fetchProfiles();
    }
  }, [user, tenantId]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads_captacao')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, email')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const updateLead = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('leads_captacao')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      setLeads(leads.map(lead => 
        lead.id === id ? { ...lead, [field]: value } : lead
      ));
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const toggleGroup = (index: number) => {
    setStatusGroups(statusGroups.map((group, i) => 
      i === index ? { ...group, isOpen: !group.isOpen } : group
    ));
  };

  const filteredLeads = leads.filter(lead =>
    lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.telefone?.includes(searchTerm)
  );

  const getLeadsByStatus = (statusValues: string[]) => {
    return filteredLeads.filter(lead => 
      statusValues.includes(lead.status?.toLowerCase() || '')
    );
  };

  const getResponsavelInfo = (responsavelId: string | null) => {
    if (!responsavelId) return null;
    return profiles.find(p => p.user_id === responsavelId);
  };

  const getDDDtoUF = (telefone: string | null) => {
    if (!telefone) return null;
    const ddd = telefone.replace(/\D/g, '').substring(0, 2);
    const dddMap: Record<string, string> = {
      '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
      '21': 'RJ', '22': 'RJ', '24': 'RJ',
      '27': 'ES', '28': 'ES',
      '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '37': 'MG', '38': 'MG',
      '41': 'PR', '42': 'PR', '43': 'PR', '44': 'PR', '45': 'PR', '46': 'PR',
      '47': 'SC', '48': 'SC', '49': 'SC',
      '51': 'RS', '53': 'RS', '54': 'RS', '55': 'RS',
      '61': 'DF',
      '62': 'GO', '64': 'GO',
      '63': 'TO',
      '65': 'MT', '66': 'MT',
      '67': 'MS',
      '68': 'AC',
      '69': 'RO',
      '71': 'BA', '73': 'BA', '74': 'BA', '75': 'BA', '77': 'BA',
      '79': 'SE',
      '81': 'PE', '87': 'PE',
      '82': 'AL',
      '83': 'PB',
      '84': 'RN',
      '85': 'CE', '88': 'CE',
      '86': 'PI', '89': 'PI',
      '91': 'PA', '93': 'PA', '94': 'PA',
      '92': 'AM', '97': 'AM',
      '95': 'RR',
      '96': 'AP',
      '98': 'MA', '99': 'MA',
    };
    return dddMap[ddd] || null;
  };

  const renderLeadsTable = (leadsToRender: Lead[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[200px]">Elemento</TableHead>
          <TableHead className="min-w-[100px]">Comentário</TableHead>
          <TableHead className="min-w-[150px]">Responsável</TableHead>
          <TableHead className="min-w-[120px]">Data</TableHead>
          <TableHead className="min-w-[150px]">Tipo</TableHead>
          <TableHead className="min-w-[200px]">Status</TableHead>
          <TableHead className="min-w-[150px]">Prioridade</TableHead>
          <TableHead className="min-w-[120px]">Validado</TableHead>
          <TableHead className="min-w-[80px]">UF</TableHead>
          <TableHead className="min-w-[200px]">E-mail</TableHead>
          <TableHead className="min-w-[150px]">Telefone</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={11} className="text-center py-8">
              Carregando...
            </TableCell>
          </TableRow>
        ) : leadsToRender.length === 0 ? (
          <TableRow>
            <TableCell colSpan={11} className="text-center py-8">
              Nenhum lead encontrado
            </TableCell>
          </TableRow>
        ) : (
          leadsToRender.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.nome}</TableCell>
              
              <TableCell>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4">
                    <LeadCommentPanel leadId={lead.id} />
                  </PopoverContent>
                </Popover>
              </TableCell>

              <TableCell>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                      {lead.responsavel_id ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getResponsavelInfo(lead.responsavel_id)?.avatar_url || ''} />
                          <AvatarFallback>
                            {getResponsavelInfo(lead.responsavel_id)?.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <Command>
                      <CommandInput placeholder="Buscar usuário..." />
                      <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                      <CommandGroup>
                        {profiles.map((profile) => (
                          <CommandItem
                            key={profile.user_id}
                            onSelect={() => updateLead(lead.id, 'responsavel_id', profile.user_id)}
                          >
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={profile.avatar_url || ''} />
                              <AvatarFallback>{profile.full_name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            {profile.full_name || profile.email}
                            {lead.responsavel_id === profile.user_id && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </TableCell>

              <TableCell>{format(new Date(lead.created_at), 'dd/MM/yyyy')}</TableCell>

              <TableCell>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Badge className={TIPOS_CONFIG[lead.tipo?.toLowerCase() || '']?.color || 'bg-gray-500'}>
                        {TIPOS_CONFIG[lead.tipo?.toLowerCase() || '']?.label || lead.tipo || 'N/A'}
                      </Badge>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <Command>
                      <CommandInput placeholder="Buscar tipo..." />
                      <CommandEmpty>Nenhum tipo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {Object.entries(TIPOS_CONFIG).map(([key, config]) => (
                          <CommandItem
                            key={key}
                            onSelect={() => updateLead(lead.id, 'tipo', key)}
                          >
                            <Badge className={config.color}>{config.label}</Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </TableCell>

              <TableCell>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Badge className={STATUS_CONFIG[lead.status?.toLowerCase() || '']?.color || 'bg-gray-500'}>
                        {STATUS_CONFIG[lead.status?.toLowerCase() || '']?.label || lead.status || 'N/A'}
                      </Badge>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <Command>
                      <CommandInput placeholder="Buscar status..." />
                      <CommandEmpty>Nenhum status encontrado.</CommandEmpty>
                      <CommandGroup>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <CommandItem
                            key={key}
                            onSelect={() => updateLead(lead.id, 'status', key)}
                          >
                            <Badge className={config.color}>{config.label}</Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </TableCell>

              <TableCell>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Badge className={PRIORIDADE_CONFIG[lead.prioridade?.toLowerCase() || '']?.color || 'bg-gray-500'}>
                        {PRIORIDADE_CONFIG[lead.prioridade?.toLowerCase() || '']?.label || lead.prioridade || 'N/A'}
                      </Badge>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <Command>
                      <CommandInput placeholder="Buscar prioridade..." />
                      <CommandEmpty>Nenhuma prioridade encontrada.</CommandEmpty>
                      <CommandGroup>
                        {Object.entries(PRIORIDADE_CONFIG).map(([key, config]) => (
                          <CommandItem
                            key={key}
                            onSelect={() => updateLead(lead.id, 'prioridade', key)}
                          >
                            <Badge className={config.color}>{config.label}</Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </TableCell>

              <TableCell>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Badge className={VALIDADO_CONFIG[lead.validado?.toLowerCase() || '']?.color || 'bg-gray-500'}>
                        {VALIDADO_CONFIG[lead.validado?.toLowerCase() || '']?.label || lead.validado || 'N/A'}
                      </Badge>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <Command>
                      <CommandInput placeholder="Buscar validação..." />
                      <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
                      <CommandGroup>
                        {Object.entries(VALIDADO_CONFIG).map(([key, config]) => (
                          <CommandItem
                            key={key}
                            onSelect={() => updateLead(lead.id, 'validado', key)}
                          >
                            <Badge className={config.color}>{config.label}</Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </TableCell>

              <TableCell>{lead.uf || (lead.telefone ? getDDDtoUF(lead.telefone) : 'N/A')}</TableCell>
              <TableCell>{lead.email || 'N/A'}</TableCell>
              <TableCell>{lead.telefone || 'N/A'}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar leads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="text-sm text-muted-foreground">
          {filteredLeads.length} leads no total
        </div>
      </div>

      <div className="space-y-2">
        {statusGroups.map((group, index) => {
          const groupLeads = getLeadsByStatus(group.statusValues);
          
          return (
            <Collapsible 
              key={index} 
              open={group.isOpen}
              onOpenChange={() => toggleGroup(index)}
              className="border rounded-lg"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  {group.isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-semibold">{group.label}</span>
                  <Badge variant="secondary">{groupLeads.length} Elementos</Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-[400px] w-full">
                  <div className="min-w-[1640px]">
                    {renderLeadsTable(groupLeads)}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
