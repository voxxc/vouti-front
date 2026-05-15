import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Trash2, Pencil, GripVertical } from "lucide-react";
import { CircularTimer } from "./CircularTimer";
import { toast } from "sonner";

interface TokenRowProps {
  id: string;
  name: string;
  code: string;
  secondsRemaining: number;
  onDelete: () => void;
  onEdit?: (newName: string) => void;
  reorderMode?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export function TokenRow({
  id, name, code, secondsRemaining, onDelete, onEdit,
  reorderMode, draggable, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragOver
}: TokenRowProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.replace(' ', ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Código copiado!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleSaveEdit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== name) {
      onEdit?.(trimmed);
    }
    setIsEditing(false);
    setEditName(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(name);
    }
  };

  const formatCode = (code: string) => {
    if (code.length !== 6) return code;
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  };

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center justify-between py-2 px-3 hover:bg-accent/5 rounded-md group ${
        reorderMode ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isDragging ? 'opacity-40' : ''} ${isDragOver ? 'border-t-2 border-primary' : ''}`}
    >
      {reorderMode && (
        <GripVertical className="h-4 w-4 text-muted-foreground mr-1 shrink-0" />
      )}
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm max-w-[120px]"
        />
      ) : (
        <div className="flex items-center gap-1 group/name flex-1 min-w-0">
          <span className="text-sm text-muted-foreground truncate max-w-[100px]">{name}</span>
          {onEdit && !reorderMode && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover/name:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setEditName(name);
                setIsEditing(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <button
          onClick={handleCopy}
          disabled={reorderMode}
          className="font-mono text-lg font-bold tracking-wider text-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          {formatCode(code)}
          {copied && !reorderMode ? (
            <Check className="h-4 w-4 text-primary" />
          ) : !reorderMode ? (
            <Copy className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
          ) : null}
        </button>
        
        <CircularTimer secondsRemaining={secondsRemaining} />
        
        {!reorderMode && <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>}
      </div>
    </div>
  );
}
