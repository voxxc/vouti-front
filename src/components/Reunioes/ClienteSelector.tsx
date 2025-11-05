import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useReuniaoClientes } from '@/hooks/useReuniaoClientes';
import { ReuniaoCliente } from '@/types/reuniao';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ClienteSelectorProps {
  value?: string;
  onChange: (clienteId: string | undefined, cliente?: ReuniaoCliente) => void;
  onClienteNomeChange?: (nome: string) => void;
  onClienteTelefoneChange?: (telefone: string) => void;
  onClienteEmailChange?: (email: string) => void;
}

export const ClienteSelector = ({
  value,
  onChange,
  onClienteNomeChange,
  onClienteTelefoneChange,
  onClienteEmailChange
}: ClienteSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [showNewClienteDialog, setShowNewClienteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { clientes, buscarCliente, criarCliente } = useReuniaoClientes();
  const [clientesFiltrados, setClientesFiltrados] = useState<ReuniaoCliente[]>([]);
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    telefone: '',
    email: '',
    observacoes: ''
  });

  const selectedCliente = clientes.find(c => c.id === value);

  useEffect(() => {
    if (searchTerm) {
      buscarCliente(searchTerm).then(setClientesFiltrados);
    } else {
      setClientesFiltrados(clientes);
    }
  }, [searchTerm, clientes]);

  const handleSelectCliente = (cliente: ReuniaoCliente) => {
    onChange(cliente.id, cliente);
    onClienteNomeChange?.(cliente.nome);
    onClienteTelefoneChange?.(cliente.telefone || '');
    onClienteEmailChange?.(cliente.email || '');
    setOpen(false);
  };

  const handleCriarNovoCliente = async () => {
    const cliente = await criarCliente(novoCliente);
    if (cliente) {
      handleSelectCliente(cliente);
      setShowNewClienteDialog(false);
      setNovoCliente({ nome: '', telefone: '', email: '', observacoes: '' });
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedCliente ? (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{selectedCliente.nome}</span>
                {selectedCliente.telefone && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedCliente.telefone})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Selecionar cliente...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandEmpty>
              <div className="p-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">Nenhum cliente encontrado</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewClienteDialog(true);
                    setOpen(false);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Novo Cliente
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setShowNewClienteDialog(true);
                  setOpen(false);
                }}
                className="border-b"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="font-medium">Cadastrar Novo Cliente</span>
              </CommandItem>
              {clientesFiltrados.map((cliente) => (
                <CommandItem
                  key={cliente.id}
                  onSelect={() => handleSelectCliente(cliente)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === cliente.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{cliente.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {cliente.telefone}
                      {cliente.total_reunioes && (
                        <span className="ml-2">• {cliente.total_reunioes} reuniões</span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showNewClienteDialog} onOpenChange={setShowNewClienteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={novoCliente.nome}
                onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={novoCliente.telefone}
                onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={novoCliente.email}
                onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={novoCliente.observacoes}
                onChange={(e) => setNovoCliente({ ...novoCliente, observacoes: e.target.value })}
                placeholder="Informações adicionais..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewClienteDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCriarNovoCliente} disabled={!novoCliente.nome}>
                Cadastrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
