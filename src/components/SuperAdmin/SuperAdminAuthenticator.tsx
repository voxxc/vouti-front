import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, Trash2, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

export function SuperAdminAuthenticator() {
  const [tokens, setTokens] = useState<TokenWithCode[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(getSecondsRemaining());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);
  
  // Form states
  const [newName, setNewName] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Load tokens from localStorage
  const loadTokens = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: SavedToken[] = JSON.parse(stored);
        return parsed.map(t => ({
          ...t,
          code: '------',
          loading: true,
          error: false,
        }));
      }
    } catch (e) {
      console.error('Erro ao carregar tokens:', e);
    }
    return [];
  }, []);

  // Save tokens to localStorage
  const saveTokens = useCallback((tokensToSave: SavedToken[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokensToSave));
    } catch (e) {
      console.error('Erro ao salvar tokens:', e);
    }
  }, []);

  // Generate codes for all tokens
  const generateAllCodes = useCallback(async () => {
    setTokens(prev => 
      prev.map(token => ({
        ...token,
        loading: true,
      }))
    );

    const updatedTokens = await Promise.all(
      tokens.map(async (token) => {
        try {
          const code = await generateTOTP(token.secret);
          return { ...token, code, loading: false, error: false };
        } catch {
          return { ...token, code: 'ERRO', loading: false, error: true };
        }
      })
    );

    setTokens(updatedTokens);
  }, [tokens]);

  // Initial load
  useEffect(() => {
    const loaded = loadTokens();
    setTokens(loaded);
  }, [loadTokens]);

  // Generate codes when tokens change
  useEffect(() => {
    if (tokens.length > 0 && tokens.some(t => t.loading)) {
      generateAllCodes();
    }
  }, [tokens.length]);

  // Update timer and regenerate codes every second
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getSecondsRemaining();
      setSecondsRemaining(remaining);
      
      // Regenerate codes when timer resets
      if (remaining === 30 && tokens.length > 0) {
        generateAllCodes();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tokens, generateAllCodes]);

  // Add new token
  const handleAddToken = async () => {
    if (!newName.trim()) {
      toast({ title: 'Erro', description: 'Informe um nome para o token', variant: 'destructive' });
      return;
    }

    const cleanSecret = newSecret.replace(/\s/g, '').toUpperCase();
    
    if (!isValidBase32(cleanSecret)) {
      toast({ 
        title: 'Secret inválido', 
        description: 'O código secreto deve ter pelo menos 16 caracteres Base32 (A-Z, 2-7)', 
        variant: 'destructive' 
      });
      return;
    }

    setAddLoading(true);

    try {
      // Test if we can generate a code
      await generateTOTP(cleanSecret);

      const newToken: SavedToken = {
        id: crypto.randomUUID(),
        name: newName.trim(),
        secret: cleanSecret,
        createdAt: new Date().toISOString(),
      };

      const currentTokens = tokens.map(({ code, loading, error, ...rest }) => rest);
      const updatedTokens = [...currentTokens, newToken];
      saveTokens(updatedTokens);

      const code = await generateTOTP(cleanSecret);
      setTokens(prev => [...prev, { ...newToken, code, loading: false, error: false }]);

      setNewName('');
      setNewSecret('');
      setAddDialogOpen(false);
      
      toast({ title: 'Token adicionado', description: `${newToken.name} foi adicionado com sucesso` });
    } catch (error) {
      toast({ 
        title: 'Erro ao adicionar token', 
        description: 'Não foi possível gerar o código. Verifique o secret.', 
        variant: 'destructive' 
      });
    } finally {
      setAddLoading(false);
    }
  };

  // Delete token
  const handleDeleteToken = () => {
    if (!tokenToDelete) return;

    const updatedTokens = tokens.filter(t => t.id !== tokenToDelete);
    const tokensToSave = updatedTokens.map(({ code, loading, error, ...rest }) => rest);
    saveTokens(tokensToSave);
    setTokens(updatedTokens);
    setDeleteDialogOpen(false);
    setTokenToDelete(null);
    
    toast({ title: 'Token removido', description: 'O token foi removido com sucesso' });
  };

  // Copy code to clipboard
  const handleCopyCode = async (token: TokenWithCode) => {
    if (token.error || token.loading) return;

    try {
      await navigator.clipboard.writeText(token.code);
      setCopiedId(token.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: 'Código copiado!', description: `${token.code} copiado para a área de transferência` });
    } catch {
      toast({ title: 'Erro ao copiar', description: 'Não foi possível copiar o código', variant: 'destructive' });
    }
  };

  // Format code with space in the middle (123 456)
  const formatCode = (code: string) => {
    if (code.length !== 6) return code;
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Autenticador TOTP</h2>
          <p className="text-muted-foreground">
            Gerador de códigos 2FA compatível com Google Authenticator
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Token 2FA</DialogTitle>
              <DialogDescription>
                Cole o código secreto (Base32) fornecido pelo serviço ao configurar a autenticação em duas etapas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="token-name">Nome/Label</Label>
                <Input
                  id="token-name"
                  placeholder="Ex: Gmail, Projudi, etc."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token-secret">Código Secreto (Base32)</Label>
                <Input
                  id="token-secret"
                  placeholder="JBSWY3DPEHPK3PXP..."
                  value={newSecret}
                  onChange={(e) => setNewSecret(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Geralmente são 16-32 caracteres (A-Z, 2-7). Espaços serão removidos automaticamente.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddToken} disabled={addLoading}>
                {addLoading ? 'Verificando...' : 'Adicionar Token'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tokens.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum token cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione seus códigos secretos para gerar tokens 2FA em tempo real.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Token
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tokens.map((token) => (
            <Card key={token.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{token.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setTokenToDelete(token.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Adicionado em {new Date(token.createdAt).toLocaleDateString('pt-BR')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Code display */}
                <button
                  onClick={() => handleCopyCode(token)}
                  disabled={token.error || token.loading}
                  className={`w-full py-4 px-2 rounded-lg transition-colors ${
                    token.error 
                      ? 'bg-destructive/10 cursor-not-allowed' 
                      : 'bg-muted hover:bg-muted/80 cursor-pointer'
                  }`}
                >
                  {token.error ? (
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Erro no secret</span>
                    </div>
                  ) : (
                    <div className="text-4xl font-mono font-bold tracking-[0.3em] text-center text-foreground">
                      {token.loading ? '--- ---' : formatCode(token.code)}
                    </div>
                  )}
                </button>

                {/* Progress bar and actions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {secondsRemaining}s restantes
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCode(token)}
                      disabled={token.error || token.loading}
                      className="h-7"
                    >
                      {copiedId === token.id ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                  <Progress 
                    value={(secondsRemaining / 30) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir token?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O token será removido permanentemente do seu navegador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTokenToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteToken} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
