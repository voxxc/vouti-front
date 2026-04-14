import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, Trash2, Copy, Check, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { generateTOTP, getSecondsRemaining, isValidBase32 } from '@/lib/totp';

interface SavedToken {
  id: string;
  name: string;
  secret: string;
  createdAt: string;
}

interface TokenWithCode extends SavedToken {
  code: string;
  loading: boolean;
  error: boolean;
}

const STORAGE_KEY = 'vouti_totp_tokens';

export function SuperAdminTOTPTopbar() {
  const [tokens, setTokens] = useState<TokenWithCode[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(getSecondsRemaining());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const loadTokens = useCallback((): SavedToken[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Erro ao carregar tokens:', e);
    }
    return [];
  }, []);

  const saveTokens = useCallback((t: SavedToken[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  }, []);

  const generateAllCodes = useCallback(async (savedTokens: SavedToken[]) => {
    const results = await Promise.all(
      savedTokens.map(async (token) => {
        try {
          const code = await generateTOTP(token.secret);
          return { ...token, code, loading: false, error: false };
        } catch {
          return { ...token, code: 'ERRO', loading: false, error: true };
        }
      })
    );
    setTokens(results);
  }, []);

  // Load and generate on popover open
  useEffect(() => {
    if (popoverOpen) {
      const saved = loadTokens();
      generateAllCodes(saved);
    }
  }, [popoverOpen, loadTokens, generateAllCodes]);

  // Timer
  useEffect(() => {
    if (!popoverOpen) return;
    const interval = setInterval(() => {
      const remaining = getSecondsRemaining();
      setSecondsRemaining(remaining);
      if (remaining === 30) {
        const saved = loadTokens();
        generateAllCodes(saved);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [popoverOpen, loadTokens, generateAllCodes]);

  const handleCopy = async (token: TokenWithCode) => {
    if (token.error || token.loading) return;
    try {
      await navigator.clipboard.writeText(token.code);
      setCopiedId(token.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: 'Copiado!', description: `${token.code}` });
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast({ title: 'Informe um nome', variant: 'destructive' });
      return;
    }
    const cleanSecret = newSecret.replace(/\s/g, '').toUpperCase();
    if (!isValidBase32(cleanSecret)) {
      toast({ title: 'Secret inválido', description: 'Mínimo 16 caracteres Base32 (A-Z, 2-7)', variant: 'destructive' });
      return;
    }
    setAddLoading(true);
    try {
      await generateTOTP(cleanSecret);
      const newToken: SavedToken = {
        id: crypto.randomUUID(),
        name: newName.trim(),
        secret: cleanSecret,
        createdAt: new Date().toISOString(),
      };
      const current = loadTokens();
      const updated = [...current, newToken];
      saveTokens(updated);
      await generateAllCodes(updated);
      setNewName('');
      setNewSecret('');
      setAddDialogOpen(false);
      toast({ title: 'Token adicionado' });
    } catch {
      toast({ title: 'Erro', description: 'Secret inválido', variant: 'destructive' });
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    const current = loadTokens().filter(t => t.id !== id);
    saveTokens(current);
    setTokens(prev => prev.filter(t => t.id !== id));
    toast({ title: 'Token removido' });
  };

  const formatCode = (code: string) => {
    if (code.length !== 6) return code;
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" title="Autenticador 2FA">
            <ShieldCheck className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">2FA Tokens</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{secondsRemaining}s</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Progress */}
          <Progress value={(secondsRemaining / 30) * 100} className="h-1 rounded-none" />

          {/* Token list */}
          <div className="max-h-72 overflow-y-auto">
            {tokens.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Nenhum token
              </div>
            ) : (
              tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 border-b border-border last:border-b-0 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground truncate">{token.name}</div>
                    {token.error ? (
                      <div className="flex items-center gap-1 text-destructive text-xs">
                        <AlertCircle className="h-3 w-3" />
                        Erro
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCopy(token)}
                        className="font-mono text-lg font-bold tracking-widest text-foreground hover:text-primary transition-colors"
                      >
                        {token.loading ? '--- ---' : formatCode(token.code)}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopy(token)}
                      disabled={token.error || token.loading}
                    >
                      {copiedId === token.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(token.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Token 2FA</DialogTitle>
            <DialogDescription>Cole o código secreto Base32 do serviço.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Gmail, Projudi" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Secret (Base32)</Label>
              <Input placeholder="JBSWY3DPEHPK3PXP..." value={newSecret} onChange={(e) => setNewSecret(e.target.value)} className="font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={addLoading}>
              {addLoading ? 'Verificando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
