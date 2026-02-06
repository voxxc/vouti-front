import { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Trash2, Wallet } from "lucide-react";
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
}

export function WalletCard({ 
  wallet, 
  tokens, 
  codes, 
  secondsRemaining, 
  onDeleteWallet, 
  onDeleteToken,
  onEditToken
}: WalletCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tokenCount = tokens.length;

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
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{formatWalletName()}</span>
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
