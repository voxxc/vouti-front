import { useState, useRef, useEffect } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Trash2, Wallet, Pencil } from "lucide-react";
import { TOTPWallet, TOTPToken } from "@/types/totp";
import { TokenRow } from "./TokenRow";

interface WalletCardProps {
  wallet: TOTPWallet;
  tokens: TOTPToken[];
  codes: Record<string, string>;
  secondsRemaining: number;
  onDeleteWallet: () => void;
  onDeleteToken: (token: TOTPToken) => void;
  onEditToken?: (token: TOTPToken, newName: string) => void;
  onEditWallet?: (newName: string) => void;
}

export function WalletCard({ 
  wallet, 
  tokens, 
  codes, 
  secondsRemaining, 
  onDeleteWallet, 
  onDeleteToken,
  onEditToken,
  onEditWallet
}: WalletCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(wallet.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenCount = tokens.length;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== wallet.name) {
      onEditWallet?.(trimmed);
    }
    setIsEditing(false);
    setEditName(wallet.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(wallet.name);
    }
  };

  const formatWalletName = () => {
    let name = wallet.name;
    if (wallet.oabNumero && wallet.oabUf) {
      name += ` • OAB ${wallet.oabNumero}/${wallet.oabUf}`;
    } else if (wallet.oabNumero) {
      name += ` • OAB ${wallet.oabNumero}`;
    }
    return name;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 hover:bg-accent/5 transition-colors text-left">
            <div className="flex items-center gap-2 group/wallet">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Wallet className="h-4 w-4 text-primary" />
              {isEditing ? (
                <Input
                  ref={inputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 text-sm max-w-[180px]"
                />
              ) : (
                <>
                  <span className="font-medium text-sm">{formatWalletName()}</span>
                  {onEditWallet && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover/wallet:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditName(wallet.name);
                        setIsEditing(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isOpen && (
                <span className="text-xs text-muted-foreground">
                  {tokenCount} {tokenCount === 1 ? 'token' : 'tokens'}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteWallet();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t bg-muted/5">
            {tokens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum token nesta carteira
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {tokens.map((token) => (
                  <TokenRow
                    key={token.id}
                    id={token.id}
                    name={token.name}
                    code={codes[token.id] || '------'}
                    secondsRemaining={secondsRemaining}
                    onDelete={() => onDeleteToken(token)}
                    onEdit={onEditToken ? (newName) => onEditToken(token, newName) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
