import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Cliente } from "@/types/cliente";
import { ClienteDetails } from "@/components/CRM/ClienteDetails";
import { useClientes } from "@/hooks/useClientes";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Unlink, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectClientDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  clienteId?: string | null;
  onClienteLinked: (clienteId: string | null) => void;
}

export const ProjectClientDataDialog = ({
  open,
  onOpenChange,
  projectId,
  clienteId,
  onClienteLinked
}: ProjectClientDataDialogProps) => {
  const { fetchClientes } = useClientes();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [showUnlinkAlert, setShowUnlinkAlert] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    if (clienteId) {
      loadClienteData(clienteId);
    }
  }, [clienteId]);

  const loadClientes = async () => {
    const data = await fetchClientes();
    setClientes(data);
  };

  const loadClienteData = async (id: string) => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setSelectedCliente(data as Cliente);
    }
  };

  const handleVincularCliente = async (clienteIdToLink: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ cliente_id: clienteIdToLink })
      .eq('id', projectId);

    if (!error) {
      onClienteLinked(clienteIdToLink);
      loadClienteData(clienteIdToLink);
      toast({
        title: "Sucesso",
        description: "Cliente vinculado com sucesso!",
      });
    } else {
      toast({
        title: "Erro",
        description: "Erro ao vincular cliente.",
        variant: "destructive",
      });
    }
  };

  const handleDesvincular = async () => {
    const { error } = await supabase
      .from('projects')
      .update({ cliente_id: null })
      .eq('id', projectId);

    if (!error) {
      onClienteLinked(null);
      setSelectedCliente(null);
      setShowUnlinkAlert(false);
      toast({
        title: "✓ Desvinculado",
        description: "Cliente desvinculado do projeto com sucesso!",
      });
    } else {
      toast({
        title: "Erro",
        description: "Erro ao desvincular cliente.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dados do Cliente</DialogTitle>
        </DialogHeader>

        {!clienteId || !selectedCliente ? (
          // MODO: Selecionar cliente para vincular
          <div className="space-y-4">
            <Label>Selecione o cliente para vincular ao projeto</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full justify-between"
                >
                  {selectedCliente
                    ? selectedCliente.nome_pessoa_fisica || selectedCliente.nome_pessoa_juridica
                    : "Buscar cliente..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {clientes.map((cliente) => (
                        <CommandItem
                          key={cliente.id}
                          value={cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || ''}
                          onSelect={() => {
                            handleVincularCliente(cliente.id);
                            setComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCliente?.id === cliente.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          // MODO: Visualizar dados do cliente vinculado
          <div className="space-y-6">
            <ClienteDetails 
              cliente={selectedCliente} 
              onEdit={() => {}}
              readOnly={true}
            />

            <div className="flex justify-end pt-4 border-t">
              <Button 
                variant="destructive" 
                onClick={() => setShowUnlinkAlert(true)}
                className="gap-2"
              >
                <Unlink size={16} />
                Desvincular Cliente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Desvinculamento */}
      <AlertDialog open={showUnlinkAlert} onOpenChange={setShowUnlinkAlert}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-500" />
            </div>
            <AlertDialogTitle className="text-xl">
              Desvincular Cliente?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base leading-relaxed pt-2">
            Tem certeza que deseja desvincular{" "}
            <span className="font-semibold text-foreground">
              {selectedCliente?.nome_pessoa_fisica || selectedCliente?.nome_pessoa_juridica}
            </span>{" "}
            deste projeto?
            <div className="mt-3 p-3 bg-muted rounded-md text-sm">
              💡 <strong>Importante:</strong> Os dados do cliente não serão excluídos, 
              apenas a vinculação com este projeto será removida.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="mt-0">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDesvincular}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Sim, Desvincular
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>
    </>
  );
};