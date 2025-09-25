import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  type: 'task' | 'comment' | 'file' | 'project';
  title: string;
  content: string;
  projectName?: string;
  date: Date;
}

interface GlobalSearchProps {
  projects: any[];
  onSelectResult?: (result: SearchResult) => void;
}

export const GlobalSearch = ({ projects, onSelectResult }: GlobalSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const performSearch = (term: string) => {
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const lowercaseTerm = term.toLowerCase();

    projects.forEach(project => {
      // Search in project name
      if (project.name.toLowerCase().includes(lowercaseTerm)) {
        searchResults.push({
          id: `project-${project.id}`,
          type: 'project',
          title: project.name,
          content: project.description || '',
          date: project.createdAt
        });
      }

      // Search in tasks
      const allTasks = [...(project.tasks || []), ...(project.acordoTasks || [])];
      allTasks.forEach(task => {
        if (
          task.title.toLowerCase().includes(lowercaseTerm) ||
          task.description.toLowerCase().includes(lowercaseTerm)
        ) {
          searchResults.push({
            id: `task-${task.id}`,
            type: 'task',
            title: task.title,
            content: task.description,
            projectName: project.name,
            date: task.updatedAt
          });
        }

        // Search in comments
        task.comments?.forEach(comment => {
          if (comment.text.toLowerCase().includes(lowercaseTerm)) {
            searchResults.push({
              id: `comment-${comment.id}`,
              type: 'comment',
              title: `Comentário em "${task.title}"`,
              content: comment.text,
              projectName: project.name,
              date: comment.createdAt
            });
          }
        });

        // Search in files
        task.files?.forEach(file => {
          if (file.name.toLowerCase().includes(lowercaseTerm)) {
            searchResults.push({
              id: `file-${file.id}`,
              type: 'file',
              title: file.name,
              content: `Arquivo anexado em "${task.title}"`,
              projectName: project.name,
              date: file.uploadedAt
            });
          }
        });
      });
    });

    // Sort by date (most recent first)
    searchResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setResults(searchResults.slice(0, 20)); // Limit to 20 results
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'project': return 'bg-law-blue text-white';
      case 'task': return 'bg-law-gold text-black';
      case 'comment': return 'bg-accent text-accent-foreground';
      case 'file': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'project': return 'Cliente';
      case 'task': return 'Tarefa';
      case 'comment': return 'Comentário';
      case 'file': return 'Arquivo';
      default: return 'Item';
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    performSearch(value);
  };

  const handleSelectResult = (result: SearchResult) => {
    onSelectResult?.(result);
    setIsOpen(false);
    setSearchTerm('');
    setResults([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Search size={16} />
          Busca Global
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Busca Global</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar em todos os clientes, tarefas, comentários e arquivos..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearch('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X size={14} />
              </Button>
            )}
          </div>

          <ScrollArea className="h-[400px]">
            {results.length === 0 && searchTerm ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search size={48} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum resultado encontrado para "{searchTerm}"</p>
              </div>
            ) : searchTerm === '' ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search size={48} className="mx-auto mb-2 opacity-50" />
                <p>Digite pelo menos 2 caracteres para buscar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result) => (
                  <Card
                    key={result.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSelectResult(result)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-xs ${getTypeColor(result.type)}`}>
                              {getTypeLabel(result.type)}
                            </Badge>
                            {result.projectName && (
                              <span className="text-xs text-muted-foreground">
                                em {result.projectName}
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium text-sm truncate">
                            {result.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {result.content}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(result.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};