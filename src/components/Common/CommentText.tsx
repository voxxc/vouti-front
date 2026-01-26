import { cn } from '@/lib/utils';

interface CommentTextProps {
  text: string;
  className?: string;
}

/**
 * Componente para renderizar texto de comentário com menções destacadas
 * Menções no formato @NomeCompleto são exibidas com destaque visual
 */
export const CommentText = ({ text, className }: CommentTextProps) => {
  // Regex para encontrar @NomeCompleto (captura até próximo @ ou fim)
  const mentionRegex = /@([^@]+?)(?=\s*@|$)/g;
  
  // Dividir o texto preservando as menções
  const parts: { type: 'text' | 'mention'; content: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Adicionar texto antes da menção
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Adicionar a menção (nome capturado)
    parts.push({
      type: 'mention',
      content: match[1].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  // Adicionar texto restante após última menção
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  // Se não há partes, renderizar texto simples
  if (parts.length === 0) {
    return (
      <p className={cn("text-sm whitespace-pre-wrap break-words", className)}>
        {text}
      </p>
    );
  }

  return (
    <p className={cn("text-sm whitespace-pre-wrap break-words", className)}>
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <span
              key={index}
              className="bg-primary/10 text-primary font-medium px-1 rounded"
            >
              @{part.content}
            </span>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </p>
  );
};
