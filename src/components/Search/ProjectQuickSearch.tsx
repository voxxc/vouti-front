import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectQuickSearchProps {
  tenantPath: (path: string) => string;
}

interface ProjectItem {
  id: string;
  name: string;
  client: string | null;
}

export const ProjectQuickSearch = ({ tenantPath }: ProjectQuickSearchProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar projetos na montagem
  useEffect(() => {
    if (!user) return;
    
    const loadProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, client')
        .order('updated_at', { ascending: false });
      
      if (data) setProjects(data);
    };

    loadProjects();
  }, [user]);

  // Filtrar projetos localmente
  const filteredProjects = projects.filter(p => 
    searchTerm.length >= 1 && (
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleSelect = (projectId: string) => {
    navigate(tenantPath(`project/${projectId}`));
    setSearchTerm('');
    setOpen(false);
  };

  return (
    <Popover open={open && filteredProjects.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          ref={inputRef}
          placeholder="Ir para cliente..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay para permitir o clique no item
            setTimeout(() => setOpen(false), 150);
          }}
          className="w-48 h-8 text-sm bg-background/50 border-border/50 focus:bg-background"
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command>
          <CommandList>
            {filteredProjects.length === 0 && searchTerm.length >= 1 && (
              <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            )}
            <CommandGroup>
              {filteredProjects.slice(0, 5).map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => handleSelect(project.id)}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{project.name}</span>
                    {project.client && (
                      <span className="text-xs text-muted-foreground">{project.client}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
