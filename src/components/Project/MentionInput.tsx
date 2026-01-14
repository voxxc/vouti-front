import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

export interface Participant {
  id: string;
  userId: string;
  fullName: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentionedUserIds: string[]) => void;
  projectId: string;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
}

export function MentionInput({
  value,
  onChange,
  onMentionsChange,
  projectId,
  placeholder = 'Digite seu comentário... Use @ para mencionar',
  onKeyDown,
  className
}: MentionInputProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch project participants
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!projectId) return;

      // Get project collaborators
      const { data: collabs } = await supabase
        .from('project_collaborators')
        .select('user_id')
        .eq('project_id', projectId);

      // Get project creator
      const { data: project } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .single();

      const userIds = new Set<string>();
      collabs?.forEach(c => userIds.add(c.user_id));
      if (project?.created_by) userIds.add(project.created_by);

      if (userIds.size === 0) return;

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', Array.from(userIds));

      setParticipants(
        (profiles || []).map(p => ({
          id: p.user_id,
          userId: p.user_id,
          fullName: p.full_name || 'Usuário'
        }))
      );
    };

    fetchParticipants();
  }, [projectId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check for @ mention
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only show suggestions if there's no space after @
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        setSearchTerm(textAfterAt.toLowerCase());
        setMentionStart(lastAtIndex);
        setShowSuggestions(true);
        return;
      }
    }
    
    setShowSuggestions(false);
    setMentionStart(-1);
  };

  const handleSelectParticipant = (participant: Participant) => {
    if (mentionStart === -1) return;

    const beforeMention = value.slice(0, mentionStart);
    const afterCursor = value.slice(cursorPosition);
    const newValue = `${beforeMention}@${participant.fullName} ${afterCursor}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(-1);

    // Extract all mentions and notify parent
    if (onMentionsChange) {
      const mentionRegex = /@([^@\s][^@]*?)(?=\s|$|@)/g;
      const mentionedNames = [...newValue.matchAll(mentionRegex)].map(m => m[1].trim());
      const mentionedUserIds = participants
        .filter(p => mentionedNames.includes(p.fullName))
        .map(p => p.userId);
      onMentionsChange(mentionedUserIds);
    }

    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const filteredParticipants = participants.filter(p =>
    p.fullName.toLowerCase().includes(searchTerm)
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setShowSuggestions(false);
          }
          onKeyDown?.(e);
        }}
        placeholder={placeholder}
        className={className}
        rows={2}
      />
      <Popover open={showSuggestions && filteredParticipants.length > 0}>
        <PopoverTrigger asChild>
          <span className="absolute bottom-0 left-0" />
        </PopoverTrigger>
        <PopoverContent 
          className="p-0 w-[250px]" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              <CommandEmpty>Nenhum participante encontrado</CommandEmpty>
              <CommandGroup>
                {filteredParticipants.map(participant => (
                  <CommandItem
                    key={participant.id}
                    onSelect={() => handleSelectParticipant(participant)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(participant.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{participant.fullName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Helper function to extract mentioned user IDs from text
export function extractMentions(text: string, participants: Participant[]): string[] {
  const mentionRegex = /@([^@\s][^@]*?)(?=\s|$|@)/g;
  const mentionedNames = [...text.matchAll(mentionRegex)].map(m => m[1].trim());
  return participants
    .filter(p => mentionedNames.includes(p.fullName))
    .map(p => p.userId);
}
