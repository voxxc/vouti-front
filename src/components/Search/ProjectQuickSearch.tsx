import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/hooks/useTenantId';
import { checkIfUserIsAdminOrController } from '@/lib/auth-helpers';

interface ProjectQuickSearchProps {
  tenantPath: (path: string) => string;
  onSelectProject?: (projectId: string) => void;
}

interface ProjectItem {
  id: string;
  name: string;
  client: string | null;
}

export const ProjectQuickSearch = ({ tenantPath, onSelectProject }: ProjectQuickSearchProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const containerRef = useRef<HTMLDivElement>(null);

  // Carregar projetos na montagem com filtro de permissão
  useEffect(() => {
    if (!user || !tenantId) return;
    
    const loadProjects = async () => {
      // Verificar se é admin ou controller NO TENANT ATUAL
      const isAdminOrController = await checkIfUserIsAdminOrController(user.id, tenantId);
      
      if (isAdminOrController) {
        // Admin/Controller: ver todos os projetos DO TENANT
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, client')
          .eq('tenant_id', tenantId)
          .order('updated_at', { ascending: false });
        
        if (error) {
          console.error('[ProjectQuickSearch] Error loading projects:', error);
          return;
        }
        if (data) setProjects(data);
      } else {
        // Usuário normal: ver apenas projetos onde é criador ou participante DO TENANT
        const { data: collaboratorProjects } = await supabase
          .from('project_collaborators')
          .select('project_id')
          .eq('user_id', user.id);
        
        const collaboratorProjectIds = collaboratorProjects?.map(cp => cp.project_id) || [];
        
        // Buscar projetos criados pelo usuário
        let orFilter = `created_by.eq.${user.id}`;
        
        // Adicionar projetos onde é colaborador
        if (collaboratorProjectIds.length > 0) {
          orFilter += `,id.in.(${collaboratorProjectIds.join(',')})`;
        }
        
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, client')
          .eq('tenant_id', tenantId)
          .or(orFilter)
          .order('updated_at', { ascending: false });
        
        if (error) {
          console.error('[ProjectQuickSearch] Error loading projects:', error);
          return;
        }
        if (data) setProjects(data);
      }
    };

    loadProjects();
  }, [user, tenantId]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar projetos localmente
  const filteredProjects = projects.filter(p => 
    searchTerm.length >= 1 && (
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleSelect = (projectId: string) => {
    if (onSelectProject) {
      onSelectProject(projectId);
    } else {
      navigate(tenantPath(`project/${projectId}`));
    }
    setSearchTerm('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder=""
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          if (e.target.value.length >= 1) {
            setOpen(true);
          } else {
            setOpen(false);
          }
        }}
        onFocus={() => {
          if (searchTerm.length >= 1) {
            setOpen(true);
          }
        }}
        className="w-48 h-8 text-sm bg-background/50 border-border/50 focus:bg-background"
      />
      
      {/* Dropdown de resultados */}
      {open && filteredProjects.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-64 z-50 bg-popover border border-border rounded-md shadow-lg">
          <Command>
            <CommandList>
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
        </div>
      )}
    </div>
  );
};
