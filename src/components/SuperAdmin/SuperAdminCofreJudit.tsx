import { useState } from 'react';
import { Search, Trash2, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CredentialSystem {
  name: string;
  customer_key: string;
  credential_status: string;
}

export function SuperAdminCofreJudit() {
  // Verificar
  const [searchKey, setSearchKey] = useState('');
  const [searching, setSearching] = useState(false);
  const [systems, setSystems] = useState<CredentialSystem[]>([]);
  const [searched, setSearched] = useState(false);

  // Deletar
  const [deleteKey, setDeleteKey] = useState('');
  const [deleteSystem, setDeleteSystem] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSearch = async () => {
    if (!searchKey.trim()) {
      toast({ title: 'Erro', description: 'Informe a customer_key', variant: 'destructive' });
      return;
    }

    setSearching(true);
    setSearched(false);
    setSystems([]);

    try {
      const { data, error } = await supabase.functions.invoke('judit-verificar-credencial', {
        body: { customerKey: searchKey.trim() },
      });

      if (error) throw error;

      const result = data?.data;
      if (Array.isArray(result?.systems)) {
        setSystems(result.systems);
      } else if (Array.isArray(result)) {
        setSystems(result);
      } else {
        setSystems([]);
      }
      setSearched(true);
    } catch (err: any) {
      toast({ title: 'Erro ao consultar', description: err.message, variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteKey.trim() || !deleteSystem.trim()) {
      toast({ title: 'Erro', description: 'Informe customer_key e system_name', variant: 'destructive' });
      return;
    }

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('judit-deletar-credencial', {
        body: { customerKey: deleteKey.trim(), systemName: deleteSystem.trim() },
      });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Credencial removida do cofre Judit' });
      setDeleteKey('');
      setDeleteSystem('');
    } catch (err: any) {
      toast({ title: 'Erro ao deletar', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Cofre de Credenciais Judit</h2>
        <p className="text-muted-foreground">
          Verifique e gerencie credenciais cadastradas no cofre da Judit
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verificar Credenciais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Verificar Credenciais
            </CardTitle>
            <CardDescription>
              Consulte as credenciais cadastradas para uma customer_key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Key</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: tenant_abc123"
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {searched && (
              <div className="mt-4">
                {systems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma credencial encontrada para esta customer_key
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>System Name</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {systems.map((sys, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{sys.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={sys.credential_status === 'active' ? 'default' : 'secondary'}
                              className={sys.credential_status === 'active' ? 'bg-green-600' : ''}
                            >
                              {sys.credential_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deletar Credencial */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Deletar Credencial
            </CardTitle>
            <CardDescription>
              Remova uma credencial específica do cofre Judit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Key</Label>
              <Input
                placeholder="Ex: tenant_abc123"
                value={deleteKey}
                onChange={(e) => setDeleteKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>System Name (tribunal)</Label>
              <Input
                placeholder="Ex: projudi_pr, esaj_sp, pje_pe"
                value={deleteSystem}
                onChange={(e) => setDeleteSystem(e.target.value)}
              />
            </div>
            <Button
              variant="destructive"
              className="w-full"
              disabled={!deleteKey.trim() || !deleteSystem.trim() || deleting}
              onClick={() => setConfirmDelete(true)}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Deletar Credencial
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a credencial do sistema <strong>{deleteSystem}</strong> com customer_key <strong>{deleteKey}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
