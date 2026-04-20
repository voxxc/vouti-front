import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/hooks/useTenantId';
import { checkIfUserIsAdminOrController } from '@/lib/auth-helpers';
import { Search, FolderOpen, FileText } from 'lucide-react';

interface ProjectQuickSearchProps {
  tenantPath: (path: string) => string;
  onSelectProject?: (projectId: string) => void;
  onSelectProtocolo?: (projectId: string, protocoloId: string) => void;
  borderless?: boolean;
}

interface ProjectItem {
  id: string;
  name: string;
  client: string | null;
}

interface ProtocoloItem {
  id: string;
  nome: string;
  project_id: string;
  project_name: string;
  project_client: string | null;
}

export const ProjectQuickSearch = ({ tenantPath, onSelectProject, onSelectProtocolo, borderless = false }: ProjectQuickSearchProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [protocolos, setProtocolos] = useState<ProtocoloItem[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const loadProjects = async () => {
    if (!user || !tenantId) return;
    
    const isAdminOrController = await checkIfUserIsAdminOrController(user.id, tenantId);
    
    if (isAdminOrController) {
      const [projectsRes, protocolosRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, client')
          .eq('tenant_id', tenantId)
          .eq('module', 'legal')
          .order('updated_at', { ascending: false }),
        supabase
          .from('project_protocolos')
          .select('id, nome, project_id, projects!inner(name, client, tenant_id)')
          .eq('projects.tenant_id', tenantId)
          .order('created_at', { ascending: false }),
      ]);
      
      if (projectsRes.error) {
        console.error('[ProjectQuickSearch] Error loading projects:', projectsRes.error);
      } else {
        setProjects(projectsRes.data || []);
      }

      if (protocolosRes.error) {
        console.error('[ProjectQuickSearch] Error loading protocolos:', protocolosRes.error);
      } else {
        const mapped = (protocolosRes.data || []).map((p: any) => ({
          id: p.id,
          nome: p.nome,
          project_id: p.project_id,
          project_name: p.projects?.name || '',
          project_client: p.projects?.client || null,
        }));
        setProtocolos(mapped);
      }
    } else {
      const { data: collaboratorProjects } = await supabase
        .from('project_collaborators')
        .select('project_id')
        .eq('user_id', user.id);
      
      const collaboratorProjectIds = collaboratorProjects?.map(cp => cp.project_id) || [];
      let orFilter = `created_by.eq.${user.id}`;
      if (collaboratorProjectIds.length > 0) {
        orFilter += `,id.in.(${collaboratorProjectIds.join(',')})`;
      }
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client')
        .eq('tenant_id', tenantId)
        .eq('module', 'legal')
        .or(orFilter)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[ProjectQuickSearch] Error loading projects:', error);
        return;
      }
      if (data) {
        setProjects(data);
        
        // Load protocolos for accessible projects
        const projectIds = data.map(p => p.id);
        if (projectIds.length > 0) {
          const { data: protData, error: protError } = await supabase
            .from('project_protocolos')
            .select('id, nome, project_id')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false });
          
          if (!protError && protData) {
            const projectMap = new Map(data.map(p => [p.id, p]));
            setProtocolos(protData.map(p => ({
              id: p.id,
              nome: p.nome,
              project_id: p.project_id,
              project_name: projectMap.get(p.project_id)?.name || '',
              project_client: projectMap.get(p.project_id)?.client || null,
            })));
          }
        }
      }
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user, tenantId]);

  useEffect(() => {
    const handler = () => {
      setTimeout(() => loadProjects(), 2000);
    };
    window.addEventListener('project-created', handler);
    return () => window.removeEventListener('project-created', handler);
  }, [user, tenantId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [open, searchTerm]);

  const term = searchTerm.toLowerCase();

  const filteredProjects = searchTerm.length >= 1
    ? projects.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.client?.toLowerCase().includes(term)
      )
    : [];

  const filteredProtocolos = searchTerm.length >= 1
    ? protocolos.filter(p =>
        p.nome?.toLowerCase().includes(term) ||
        p.project_name?.toLowerCase().includes(term) ||
        p.project_client?.toLowerCase().includes(term)
      )
    : [];

  const visibleProjects = filteredProjects.slice(0, 4);
  const visibleProtocolos = filteredProtocolos.slice(0, 5);
  const visibleResults = [
    ...visibleProjects.map((project) => ({
      type: 'project' as const,
      id: project.id,
      onSelect: () => handleSelectProject(project.id),
    })),
    ...visibleProtocolos.map((protocolo) => ({
      type: 'protocolo' as const,
      id: protocolo.id,
      onSelect: () => handleSelectProtocolo(protocolo.project_id, protocolo.id),
    })),
  ];

  const hasResults = filteredProjects.length > 0 || filteredProtocolos.length > 0;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    if (highlightedIndex > visibleResults.length - 1) {
      setHighlightedIndex(Math.max(visibleResults.length - 1, 0));
    }
  }, [highlightedIndex, visibleResults.length]);

  const handleSelectProject = (projectId: string) => {
    if (onSelectProject) {
      onSelectProject(projectId);
    } else {
      navigate(tenantPath(`project/${projectId}`));
    }
    setSearchTerm('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleSelectProtocolo = (projectId: string, protocoloId: string) => {
    if (onSelectProtocolo) {
      onSelectProtocolo(projectId, protocoloId);
    } else if (onSelectProject) {
      onSelectProject(projectId);
    }
    setSearchTerm('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || visibleResults.length === 0) {
      if (e.key === 'Escape') {
        setSearchTerm('');
        setOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, visibleResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        visibleResults[highlightedIndex]?.onSelect();
        break;
      case 'Escape':
        e.preventDefault();
        setSearchTerm('');
        setOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Busca Rápida..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setOpen(e.target.value.length >= 1);
          }}
          onFocus={() => {
            if (searchTerm.length >= 1) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-48 h-8 text-xs pl-8 bg-background/50 border-border/50 focus:bg-background placeholder:text-xs"
        />
      </div>
      
      {open && hasResults && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-72 z-[60] bg-popover border border-border rounded-md shadow-lg max-h-80 overflow-y-auto py-1"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {filteredProjects.length > 0 && (
            <div className="px-1">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Projetos</div>
              {visibleProjects.map((project, index) => (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex items-center px-2 py-1.5 rounded-sm cursor-pointer transition-colors ${
                    index === highlightedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <FolderOpen className="h-3.5 w-3.5 mr-2 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm truncate">{project.name}</span>
                    {project.client && (
                      <span className="text-xs text-muted-foreground truncate">{project.client}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {filteredProtocolos.length > 0 && (
            <div className="px-1">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Processos (Protocolos)</div>
              {visibleProtocolos.map((protocolo, index) => {
                const itemIndex = visibleProjects.length + index;
                return (
                  <div
                    key={protocolo.id}
                    onClick={() => handleSelectProtocolo(protocolo.project_id, protocolo.id)}
                    onMouseEnter={() => setHighlightedIndex(itemIndex)}
                    className={`flex items-center px-2 py-1.5 rounded-sm cursor-pointer transition-colors ${
                      itemIndex === highlightedIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm truncate">{protocolo.nome}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {protocolo.project_name}{protocolo.project_client ? ` · ${protocolo.project_client}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
