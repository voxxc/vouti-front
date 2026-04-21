import { useState, useMemo, useEffect } from "react";
import { Check, ChevronsUpDown, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useClientes } from "@/hooks/useClientes";
import type { Cliente } from "@/types/cliente";
import { cn } from "@/lib/utils";

interface SeletorClienteProps {
  value?: string | null;
  onChange: (clienteId: string | null, cliente: Cliente | null) => void;
  disabled?: boolean;
}

export function SeletorCliente({ value, onChange, disabled }: SeletorClienteProps) {
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const { fetchClientes, fetchClienteById } = useClientes();

  useEffect(() => {
    fetchClientes().then(setClientes);
  }, []);

  const selected = useMemo(
    () => clientes.find((c) => c.id === value) || null,
    [clientes, value]
  );

  const [selectedFallback, setSelectedFallback] = useState<Cliente | null>(null);
  useEffect(() => {
    if (value && !selected) {
      fetchClienteById(value).then(setSelectedFallback);
    } else {
      setSelectedFallback(null);
    }
  }, [value, selected]);

  const display = selected || selectedFallback;
  const nome = display
    ? display.nome_pessoa_fisica || display.nome_pessoa_juridica || "Cliente"
    : null;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="justify-between min-w-[240px] h-9"
          >
            <span className="flex items-center gap-2 truncate">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate text-sm">
                {nome || "Vincular cliente..."}
              </span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar cliente..." />
            <CommandList>
              <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
              <CommandGroup>
                {clientes.map((c) => {
                  const n = c.nome_pessoa_fisica || c.nome_pessoa_juridica || "Sem nome";
                  const doc = c.cpf || c.cnpj;
                  return (
                    <CommandItem
                      key={c.id}
                      value={`${n} ${doc || ""}`}
                      onSelect={() => {
                        onChange(c.id, c);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          value === c.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm">{n}</span>
                        {doc && (
                          <span className="text-[10px] text-muted-foreground">{doc}</span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => onChange(null, null)}
          disabled={disabled}
          title="Remover vínculo"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}