import { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { cn } from '@/lib/utils';

interface TenantUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface TenantMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentionedUserIds: string[]) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

export const TenantMentionInput = ({
  value,
  onChange,
  onMentionsChange,
  placeholder = "Digite um comentário... Use @ para mencionar",
  onKeyDown,
  className,
  rows = 3,
  disabled = false,
}: TenantMentionInputProps) => {
  const { tenantId } = useTenantId();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<TenantUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Buscar usuário atual
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Buscar usuários do tenant
  useEffect(() => {
    const fetchUsers = async () => {
      if (!tenantId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .eq('tenant_id', tenantId)
        .order('full_name');

      if (!error && data) {
        // Filtrar usuário atual usando variável local para evitar closure issues
        const currentId = currentUserId;
        const filteredData = currentId 
          ? data.filter((u) => u.user_id !== currentId)
          : data;
        setUsers(filteredData as TenantUser[]);
      }
    };

    fetchUsers();
  }, [tenantId, currentUserId]);

  // Extrair menções do texto
  const extractMentions = useCallback((text: string): string[] => {
    // Usar variável local para evitar closure issues
    const currentUsers = users || [];
    if (!text || currentUsers.length === 0) return [];
    
    const mentionRegex = /@([^@\s][^@]*?)(?=\s|$|@)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionName = match[1]?.trim();
      if (!mentionName) continue;
      
      const user = currentUsers.find(
        (u) => (u.full_name || '').toLowerCase() === mentionName.toLowerCase()
      );
      if (user) {
        mentions.push(user.user_id);
      }
    }

    return [...new Set(mentions)];
  }, [users]);

  // Atualizar lista de mencionados quando o texto muda
  useEffect(() => {
    if (onMentionsChange) {
      const mentionedIds = extractMentions(value);
      onMentionsChange(mentionedIds);
    }
  }, [value, extractMentions, onMentionsChange]);

  // Filtrar usuários baseado na busca
  useEffect(() => {
    // Usar variáveis locais para evitar TDZ issues
    const currentUsers = users || [];
    const search = mentionSearch?.toLowerCase() || '';
    
    if (search) {
      const filtered = currentUsers.filter((user) => {
        const name = user.full_name || '';
        return name.toLowerCase().includes(search);
      });
      setFilteredUsers(filtered.slice(0, 5));
    } else {
      setFilteredUsers(currentUsers.slice(0, 5));
    }
    setSelectedIndex(0);
  }, [mentionSearch, users]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);

    // Detectar se está digitando uma menção
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      
      // Verificar se não há espaço após @ (ainda digitando nome)
      if (!textAfterAt.includes(' ') || textAfterAt.split(' ').length <= 2) {
        setShowSuggestions(true);
        setMentionSearch(textAfterAt);
        setMentionStartIndex(lastAtIndex);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const selectUser = (user: TenantUser) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const beforeMention = value.slice(0, mentionStartIndex);
    const afterCursor = value.slice(cursorPos);

    const newValue = `${beforeMention}@${user.full_name} ${afterCursor}`;
    onChange(newValue);
    setShowSuggestions(false);
    setMentionSearch('');

    // Focar no textarea após inserir
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStartIndex + user.full_name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        selectUser(filteredUsers[selectedIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }

    onKeyDown?.(e);
  };

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("min-h-[80px]", className)}
        rows={rows}
        disabled={disabled}
      />

      {/* Dropdown de sugestões */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg"
        >
          <ScrollArea className="max-h-[200px]">
            <div className="p-1">
              {filteredUsers.map((user, index) => (
                <button
                  key={user.user_id}
                  type="button"
                  onClick={() => selectUser(user)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {user.full_name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user.full_name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
