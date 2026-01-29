import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Copy, Check, Trash2, ShieldCheck } from "lucide-react";

// Componente CircularTimer SVG
interface CircularTimerProps {
  secondsRemaining: number;
  totalSeconds?: number;
}

function CircularTimer({ secondsRemaining, totalSeconds = 30 }: CircularTimerProps) {
  const size = 40;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = secondsRemaining / totalSeconds;
  const strokeDashoffset = circumference * (1 - progress);
  const isUrgent = secondsRemaining <= 5;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Círculo de fundo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Círculo de progresso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-linear ${isUrgent ? 'text-destructive' : 'text-primary'}`}
        />
      </svg>
      {/* Número no centro */}
      <span className={`absolute text-xs font-medium ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`}>
        {secondsRemaining}
      </span>
    </div>
  );
}
import { generateTOTP, getSecondsRemaining, isValidBase32 } from "@/lib/totp";
import { toast } from "sonner";

interface TOTPToken {
  id: string;
  name: string;
  secret: string;
}

interface TOTPSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = 'vouti_totp_tokens';

export function TOTPSheet({ open, onOpenChange }: TOTPSheetProps) {
  const [tokens, setTokens] = useState<TOTPToken[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<TOTPToken | null>(null);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenSecret, setNewTokenSecret] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Load tokens from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTokens(JSON.parse(stored));
      } catch {
        console.error('Error parsing stored tokens');
      }
    }
  }, []);

  // Save tokens to localStorage
  const saveTokens = useCallback((newTokens: TOTPToken[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTokens));
    setTokens(newTokens);
  }, []);

  // Generate codes for all tokens
  const generateAllCodes = useCallback(async () => {
    const newCodes: Record<string, string> = {};
    for (const token of tokens) {
      try {
        newCodes[token.id] = await generateTOTP(token.secret);
      } catch {
        newCodes[token.id] = '------';
      }
    }
    setCodes(newCodes);
  }, [tokens]);

  // Update codes and timer
  useEffect(() => {
    if (!open) return;

    generateAllCodes();
    
    const interval = setInterval(() => {
      const remaining = getSecondsRemaining();
      setSecondsRemaining(remaining);
      
      if (remaining === 30) {
        generateAllCodes();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open, generateAllCodes]);

  const handleAddToken = async () => {
    if (!newTokenName.trim()) {
      toast.error("Digite um nome para o token");
      return;
    }

    const cleanSecret = newTokenSecret.replace(/\s/g, '').toUpperCase();
    
    if (!isValidBase32(cleanSecret)) {
      toast.error("Secret Base32 inválido");
      return;
    }

    setIsAdding(true);
    
    try {
      // Test if we can generate a code
      await generateTOTP(cleanSecret);
      
      const newToken: TOTPToken = {
        id: crypto.randomUUID(),
        name: newTokenName.trim(),
        secret: cleanSecret
      };

      saveTokens([...tokens, newToken]);
      setNewTokenName("");
      setNewTokenSecret("");
      setAddDialogOpen(false);
      toast.success("Token adicionado com sucesso");
    } catch {
      toast.error("Erro ao validar o secret");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteToken = () => {
    if (!tokenToDelete) return;
    
    saveTokens(tokens.filter(t => t.id !== tokenToDelete.id));
    setTokenToDelete(null);
    setDeleteDialogOpen(false);
    toast.success("Token removido");
  };

  const handleCopy = async (tokenId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code.replace(' ', ''));
      setCopiedId(tokenId);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Código copiado!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const formatCode = (code: string) => {
    if (code.length !== 6) return code;
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[380px] sm:w-[420px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Autenticador 2FA
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <Button 
              onClick={() => setAddDialogOpen(true)} 
              className="w-full gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Novo Token
            </Button>

            {tokens.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum token cadastrado</p>
                <p className="text-sm mt-1">Adicione um token para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tokens.map((token) => (
                  <div 
                    key={token.id} 
                    className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm truncate">{token.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setTokenToDelete(token);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <button
                      onClick={() => handleCopy(token.id, codes[token.id] || '')}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-mono font-bold tracking-wider text-foreground flex items-center gap-2">
                          {formatCode(codes[token.id] || '------')}
                          {copiedId === token.id ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (
                            <Copy className="h-5 w-5 opacity-0 group-hover:opacity-50 transition-opacity" />
                          )}
                        </div>
                        <CircularTimer secondsRemaining={secondsRemaining} />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Token Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Token</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Nome</Label>
              <Input
                id="token-name"
                placeholder="Ex: Gmail, Projudi..."
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token-secret">Secret (Base32)</Label>
              <Input
                id="token-secret"
                placeholder="JBSWY3DPEHPK3PXP..."
                value={newTokenSecret}
                onChange={(e) => setNewTokenSecret(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Código secreto fornecido pelo serviço (geralmente ao configurar 2FA)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddToken} disabled={isAdding}>
              {isAdding ? "Validando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Token</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{tokenToDelete?.name}"? 
              Você precisará reconfigurar o 2FA no serviço original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteToken} className="bg-destructive text-destructive-foreground hover:bg-destructive/80">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
