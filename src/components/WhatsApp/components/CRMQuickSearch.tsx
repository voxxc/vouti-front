import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/hooks/useTenantId';
import { checkIfUserIsAdminOrController } from '@/lib/auth-helpers';
import { Search } from 'lucide-react';

interface CRMQuickSearchProps {
  onSelectProject?: (projectId: string) => void;
}

interface ProjectItem {
  id: string;
  name: string;
  client: string | null;
}

export const CRMQuickSearch = ({ onSelectProject }: CRMQuickSearchProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadProjects = async () => {
    if (!user || !tenantId) return;
    
    const isAdminOrController = await checkIfUserIsAdminOrController(user.id, tenantId);
    
    if (isAdminOrController) {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client')
        .eq('tenant_id', tenantId)
        .eq('module', 'crm')
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[CRMQuickSearch] Error loading projects:', error);
        return;
      }
      if (data) setProjects(data);
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
        .eq('module', 'crm')
        .or(orFilter)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[CRMQuickSearch] Error loading projects:', error);
        return;
      }
      if (data) setProjects(data);
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
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProjects = projects.filter(p => 
    searchTerm.length >= 1 && (
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const visibleResults = filteredProjects.slice(0, 5);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const handleSelect = (projectId: string) => {
    onSelectProject?.(projectId);
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
        setHighlightedIndex(prev => Math.min(prev + 1, visibleResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (visibleResults[highlightedIndex]) {
          handleSelect(visibleResults[highlightedIndex].id);
        }
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
      
      {open && visibleResults.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-64 z-[60] bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          {visibleResults.map((project, index) => (
            <div
              key={project.id}
              onClick={() => handleSelect(project.id)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`flex flex-col px-3 py-2 cursor-pointer transition-colors ${
                index === highlightedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              }`}
            >
              <span className="font-medium text-sm">{project.name}</span>
              {project.client && (
                <span className="text-xs text-muted-foreground">{project.client}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
