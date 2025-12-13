import { useState } from 'react';
import { useCustos } from '@/hooks/useCustos';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2 } from 'lucide-react';

interface CustoCategoriaManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CORES = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', 
  '#14b8a6', '#eab308', '#6b7280', '#ef4444',
  '#22c55e', '#06b6d4'
];

export const CustoCategoriaManager = ({ open, onOpenChange }: CustoCategoriaManagerProps) => {
  const { categorias, createCategoria, deleteCategoria } = useCustos();
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setSaving(true);
    try {
      await createCategoria(nome.trim(), cor);
      setNome('');
    } catch (error) {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategoria(id);
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nova Categoria</Label>
            <div className="flex gap-2">
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da categoria..."
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={saving || !nome.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
              </Button>
            </div>
          </div>

          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap mt-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    cor === c ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </form>

        <div className="space-y-2 mt-4">
          <Label>Categorias Existentes</Label>
          {categorias.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {categorias.map((cat) => (
                <Card key={cat.id}>
                  <CardContent className="py-2 px-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: cat.cor }}
                      />
                      <span className="font-medium">{cat.nome}</span>
                      {cat.padrao && (
                        <Badge variant="secondary" className="text-xs">Padrao</Badge>
                      )}
                    </div>
                    {!cat.padrao && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(cat.id)}
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
