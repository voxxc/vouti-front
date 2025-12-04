import { useState } from 'react';
import { Plus, RefreshCw, Trash2, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOABs, OABCadastrada } from '@/hooks/useOABs';
import { OABTab } from './OABTab';
import { ESTADOS_BRASIL } from '@/types/busca-oab';

export const OABManager = () => {
  const { oabs, loading, sincronizando, cadastrarOAB, sincronizarOAB, removerOAB } = useOABs();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [oabToDelete, setOabToDelete] = useState<OABCadastrada | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  
  // Form state
  const [oabNumero, setOabNumero] = useState('');
  const [oabUf, setOabUf] = useState('');
  const [nomeAdvogado, setNomeAdvogado] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCadastrar = async () => {
    if (!oabNumero || !oabUf) return;
    
    setSubmitting(true);
    const result = await cadastrarOAB(oabNumero, oabUf, nomeAdvogado);
    setSubmitting(false);
    
    if (result) {
      setDialogOpen(false);
      setOabNumero('');
      setOabUf('');
      setNomeAdvogado('');
      setActiveTab(result.id);
    }
  };

  const handleSincronizar = (oab: OABCadastrada) => {
    sincronizarOAB(oab.id, oab.oab_numero, oab.oab_uf);
  };

  const handleDeleteClick = (oab: OABCadastrada) => {
    setOabToDelete(oab);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (oabToDelete) {
      await removerOAB(oabToDelete.id);
      setDeleteDialogOpen(false);
      setOabToDelete(null);
      if (activeTab === oabToDelete.id && oabs.length > 1) {
        const remaining = oabs.filter(o => o.id !== oabToDelete.id);
        setActiveTab(remaining[0]?.id || '');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Minhas OABs</h2>
          <Badge variant="secondary">{oabs.length}</Badge>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar OAB
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Nova OAB</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="oab-numero">Numero da OAB</Label>
                  <Input
                    id="oab-numero"
                    placeholder="Ex: 92124"
                    value={oabNumero}
                    onChange={(e) => setOabNumero(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oab-uf">Estado (UF)</Label>
                  <Select value={oabUf} onValueChange={setOabUf}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BRASIL.map((estado) => (
                        <SelectItem key={estado.value} value={estado.value}>
                          {estado.value} - {estado.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome-advogado">Nome do Advogado (opcional)</Label>
                <Input
                  id="nome-advogado"
                  placeholder="Ex: Dr. Joao Silva"
                  value={nomeAdvogado}
                  onChange={(e) => setNomeAdvogado(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCadastrar} 
                disabled={!oabNumero || !oabUf || submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar e Sincronizar'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs de OABs */}
      {oabs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma OAB cadastrada</h3>
          <p className="text-muted-foreground mb-4">
            Cadastre uma OAB para visualizar seus processos
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar OAB
          </Button>
        </div>
      ) : (
        <Tabs value={activeTab || oabs[0]?.id} onValueChange={setActiveTab}>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <TabsList className="h-auto p-1">
              {oabs.map((oab) => (
                <TabsTrigger
                  key={oab.id}
                  value={oab.id}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <span className="font-medium">
                    {oab.oab_numero}/{oab.oab_uf}
                  </span>
                  {oab.total_processos > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {oab.total_processos}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {oabs.map((oab) => (
            <TabsContent key={oab.id} value={oab.id} className="mt-4">
              {/* Toolbar da OAB */}
              <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">
                      OAB {oab.oab_numero}/{oab.oab_uf}
                    </p>
                    {oab.nome_advogado && (
                      <p className="text-sm text-muted-foreground">{oab.nome_advogado}</p>
                    )}
                  </div>
                  {oab.ultima_sincronizacao && (
                    <Badge variant="outline" className="text-xs">
                      Ultima sync: {new Date(oab.ultima_sincronizacao).toLocaleDateString('pt-BR')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSincronizar(oab)}
                    disabled={sincronizando === oab.id}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${sincronizando === oab.id ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(oab)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de Processos */}
              <OABTab oabId={oab.id} />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover OAB?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso ira remover a OAB {oabToDelete?.oab_numero}/{oabToDelete?.oab_uf} e todos os seus processos cadastrados.
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
