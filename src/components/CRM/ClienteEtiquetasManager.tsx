import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useClienteEtiquetas } from '@/hooks/useClienteEtiquetas';
import { Plus, X, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClienteEtiquetasManagerProps {
  clienteId?: string;
  readOnly?: boolean;
}

const CORES_DISPONIVEIS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#84cc16', // lime
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6b7280', // gray
  '#f97316', // orange
];

export const ClienteEtiquetasManager = ({
  clienteId,
  readOnly = false,
}: ClienteEtiquetasManagerProps) => {
  const {
    etiquetas,
    clienteEtiquetas,
    loading,
    addEtiquetaToCliente,
    removeEtiquetaFromCliente,
    createEtiqueta,
  } = useClienteEtiquetas(clienteId);

  const [novaEtiquetaNome, setNovaEtiquetaNome] = useState('');
  const [novaEtiquetaCor, setNovaEtiquetaCor] = useState(CORES_DISPONIVEIS[0]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Etiquetas atualmente selecionadas para o cliente
  const etiquetasDoCliente = etiquetas.filter((e) =>
    clienteEtiquetas.some((ce) => ce.etiqueta_id === e.id)
  );

  // Etiquetas disponíveis que ainda não foram selecionadas
  const etiquetasDisponiveis = etiquetas.filter(
    (e) => !clienteEtiquetas.some((ce) => ce.etiqueta_id === e.id)
  );

  const handleToggleEtiqueta = async (etiquetaId: string, isSelected: boolean) => {
    if (readOnly || !clienteId) return;

    if (isSelected) {
      await removeEtiquetaFromCliente(etiquetaId);
    } else {
      await addEtiquetaToCliente(etiquetaId);
    }
  };

  const handleCreateEtiqueta = async () => {
    if (!novaEtiquetaNome.trim()) return;

    const nova = await createEtiqueta(novaEtiquetaNome.trim(), novaEtiquetaCor);
    if (nova && clienteId) {
      await addEtiquetaToCliente(nova.id);
    }

    setNovaEtiquetaNome('');
    setNovaEtiquetaCor(CORES_DISPONIVEIS[0]);
    setPopoverOpen(false);
  };

  if (!clienteId) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg">
        <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Etiquetas
        </Label>
        <p className="text-sm text-muted-foreground italic">
          Salve o cliente primeiro para adicionar etiquetas
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
        <Tag className="h-4 w-4" />
        Etiquetas
      </Label>

      {/* Etiquetas selecionadas */}
      <div className="flex flex-wrap gap-2 mb-4">
        {etiquetasDoCliente.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Nenhuma etiqueta associada
          </p>
        ) : (
          etiquetasDoCliente.map((etiqueta) => (
            <Badge
              key={etiqueta.id}
              variant="secondary"
              className="gap-1 pr-1"
              style={{ backgroundColor: etiqueta.cor || '#6b7280', color: 'white' }}
            >
              {etiqueta.nome}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleToggleEtiqueta(etiqueta.id, true)}
                  className="ml-1 rounded-full hover:bg-white/20 p-0.5"
                  disabled={loading}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))
        )}
      </div>

      {/* Adicionar etiquetas existentes */}
      {!readOnly && etiquetasDisponiveis.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Adicionar etiqueta:</p>
          <div className="flex flex-wrap gap-2">
            {etiquetasDisponiveis.map((etiqueta) => (
              <Badge
                key={etiqueta.id}
                variant="outline"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                style={{ 
                  borderColor: etiqueta.cor || '#6b7280',
                  color: etiqueta.cor || '#6b7280'
                }}
                onClick={() => handleToggleEtiqueta(etiqueta.id, false)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {etiqueta.nome}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Criar nova etiqueta */}
      {!readOnly && (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Nova Etiqueta
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nova-etiqueta">Nome da Etiqueta</Label>
                <Input
                  id="nova-etiqueta"
                  value={novaEtiquetaNome}
                  onChange={(e) => setNovaEtiquetaNome(e.target.value)}
                  placeholder="Ex: Trabalhista, Criminal..."
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {CORES_DISPONIVEIS.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-transform',
                        novaEtiquetaCor === cor
                          ? 'scale-110 border-foreground'
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: cor }}
                      onClick={() => setNovaEtiquetaCor(cor)}
                    />
                  ))}
                </div>
              </div>

              <Button
                type="button"
                className="w-full"
                onClick={handleCreateEtiqueta}
                disabled={loading || !novaEtiquetaNome.trim()}
              >
                Criar e Adicionar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
