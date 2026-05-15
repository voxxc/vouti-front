import { useState, useRef, useEffect } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Trash2, Wallet, Pencil, Users, GripVertical } from "lucide-react";
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
  onManageViewers?: () => void;
  isAdmin?: boolean;
  reorderMode?: boolean;
  onReorderTokens?: (orderedIds: string[]) => void;
  // Wallet-level drag (provided by parent)
  walletDraggable?: boolean;
  onWalletDragStart?: (e: React.DragEvent) => void;
  onWalletDragOver?: (e: React.DragEvent) => void;
  onWalletDrop?: (e: React.DragEvent) => void;
  onWalletDragEnd?: (e: React.DragEvent) => void;
  isWalletDragging?: boolean;
  isWalletDragOver?: boolean;
}

export function WalletCard({ 
  wallet, 
  tokens, 
  codes, 
  secondsRemaining, 
  onDeleteWallet, 
  onDeleteToken,
  onEditToken,
  onEditWallet,
  onManageViewers,
  isAdmin,
  reorderMode,
  onReorderTokens,
  walletDraggable,
  onWalletDragStart,
  onWalletDragOver,
  onWalletDrop,
  onWalletDragEnd,
  isWalletDragging,
  isWalletDragOver,
}: WalletCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(wallet.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenCount = tokens.length;

  // Token drag state (local)
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [dragOverTokenId, setDragOverTokenId] = useState<string | null>(null);

  // Auto-open card while reordering so user can drag tokens
  useEffect(() => {
    if (reorderMode) setIsOpen(true);
  }, [reorderMode]);

  const handleTokenDragStart = (id: string) => (e: React.DragEvent) => {
    setDraggingTokenId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const handleTokenDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggingTokenId && draggingTokenId !== id) setDragOverTokenId(id);
  };
  const handleTokenDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingTokenId || draggingTokenId === targetId) {
      setDraggingTokenId(null);
      setDragOverTokenId(null);
      return;
    }
    const ids = tokens.map(t => t.id);
    const fromIdx = ids.indexOf(draggingTokenId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...ids];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, draggingTokenId);
    setDraggingTokenId(null);
    setDragOverTokenId(null);
    onReorderTokens?.(next);
  };
  const handleTokenDragEnd = () => {
    setDraggingTokenId(null);
    setDragOverTokenId(null);
  };

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
      <div className="relative">
      {isWalletDragOver && (
        <div className="absolute -top-1 left-2 right-2 h-0.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)] animate-fade-in-simple pointer-events-none z-10" />
      )}
      <div
        draggable={walletDraggable}
        onDragStart={onWalletDragStart}
        onDragOver={onWalletDragOver}
        onDrop={onWalletDrop}
        onDragEnd={onWalletDragEnd}
        className={`border rounded-lg bg-card overflow-hidden transition-all duration-200 ease-out ${
          isWalletDragging ? 'opacity-50 scale-[0.98] shadow-lg ring-1 ring-primary/30 rotate-[0.2deg]' : ''
        }`}
      >
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 hover:bg-accent/5 transition-colors text-left">
            <div className="flex items-center gap-2 group/wallet">
              {reorderMode && (
                <GripVertical className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-grab transition-all duration-200 hover:scale-110" />
              )}
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
                  {onEditWallet && !reorderMode && (
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
              {isAdmin && onManageViewers && !reorderMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageViewers();
                  }}
                  title="Gerenciar permissões"
                >
                  <Users className="h-4 w-4" />
                </Button>
              )}
              {!reorderMode && <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteWallet();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>}
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
                    reorderMode={reorderMode}
                    draggable={reorderMode}
                    onDragStart={handleTokenDragStart(token.id)}
                    onDragOver={handleTokenDragOver(token.id)}
                    onDrop={handleTokenDrop(token.id)}
                    onDragEnd={handleTokenDragEnd}
                    isDragging={draggingTokenId === token.id}
                    isDragOver={dragOverTokenId === token.id}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
      </div>
    </Collapsible>
  );
}
