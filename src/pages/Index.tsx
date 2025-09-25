import { useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Projects from "./Projects";
import ProjectView from "./ProjectView";
import AcordosView from "./AcordosView";
import Agenda from "./Agenda";
import CRM from "./CRM";
import { Project, Task } from "@/types/project";

type AppState = 'login' | 'dashboard' | 'projects' | 'project-view' | 'acordos-view' | 'agenda' | 'crm';

const Index = () => {
  const [currentState, setCurrentState] = useState<AppState>('login');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Mock data - substitua por dados reais do Supabase
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: 'Caso Silva vs. Empresa XYZ',
      client: 'João Silva',
      description: 'Ação trabalhista por rescisão indevida. Acompanhamento de todas as etapas processuais.',
      tasks: [
        {
          id: 'task-1',
          title: 'Análise inicial do contrato',
          description: 'Revisar cláusulas contratuais e identificar irregularidades',
          status: 'done',
          comments: [],
          files: [],
          history: [],
          type: 'regular',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-18')
        },
        {
          id: 'task-2',
          title: 'Coleta de documentos',
          description: 'Reunir holerites, rescisão e documentos pessoais',
          status: 'progress',
          comments: [],
          files: [],
          history: [],
          type: 'regular',
          createdAt: new Date('2024-01-20'),
          updatedAt: new Date('2024-01-22')
        },
        {
          id: 'task-3',
          title: 'Elaboração da petição inicial',
          description: 'Redigir petição com fundamentação legal adequada',
          status: 'todo',
          comments: [],
          files: [],
          history: [],
          type: 'regular',
          createdAt: new Date('2024-01-25'),
          updatedAt: new Date('2024-01-25')
        }
      ],
      acordoTasks: [],
      createdBy: 'Dr. Eduardo Silva',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-22')
    },
    {
      id: '2',
      name: 'Divórcio - Maria Santos',
      client: 'Maria Santos',
      description: 'Processo de divórcio consensual com partilha de bens e guarda compartilhada.',
      tasks: [
        {
          id: 'task-4',
          title: 'Levantamento patrimonial',
          description: 'Identificar e avaliar todos os bens do casal',
          status: 'progress',
          comments: [],
          files: [],
          history: [],
          type: 'regular',
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-05')
        },
        {
          id: 'task-5',
          title: 'Acordo de guarda',
          description: 'Definir termos da guarda compartilhada dos filhos',
          status: 'waiting',
          comments: [],
          files: [],
          history: [],
          type: 'regular',
          createdAt: new Date('2024-02-03'),
          updatedAt: new Date('2024-02-03')
        }
      ],
      acordoTasks: [],
      createdBy: 'Dra. Ana Costa',
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-05')
    }
  ]);

  const handleLogin = () => {
    setCurrentState('dashboard');
  };

  const handleLogout = () => {
    setCurrentState('login');
    setSelectedProject(null);
  };

  const handleNavigateToProjects = () => {
    setCurrentState('projects');
  };

  const handleNavigateToAgenda = () => {
    setCurrentState('agenda');
  };

  const handleNavigateToCRM = () => {
    setCurrentState('crm');
  };

  const handleNavigate = (page: 'dashboard' | 'projects' | 'agenda' | 'crm') => {
    setCurrentState(page);
  };

  const handleNavigateToAcordos = () => {
    setCurrentState('acordos-view');
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentState('project-view');
  };

  const handleBackToDashboard = () => {
    setCurrentState('dashboard');
    setSelectedProject(null);
  };

  const handleBackToProjects = () => {
    setCurrentState('projects');
    setSelectedProject(null);
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    ));
    setSelectedProject(updatedProject);
  };

  const handleCreateProject = (projectData: Omit<Project, 'id' | 'tasks' | 'acordoTasks' | 'createdAt' | 'updatedAt'>) => {
    // Implementar criação de projeto
    console.log('Criar novo projeto', projectData);
  };

  const handleNavigateToFinancial = () => {
    setCurrentState('dashboard'); // For now, redirect to dashboard
  };

  if (currentState === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  if (currentState === 'dashboard') {
    return (
      <Dashboard
        onLogout={handleLogout}
        onNavigateToProjects={handleNavigateToProjects}
        onNavigateToAgenda={handleNavigateToAgenda}
        onNavigateToCRM={handleNavigateToCRM}
        onNavigateToFinancial={handleNavigateToFinancial}
        projects={projects}
      />
    );
  }

  if (currentState === 'projects') {
    return (
      <Projects
        onLogout={handleLogout}
        onBack={handleBackToDashboard}
        projects={projects}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        currentPage="projects"
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentState === 'project-view' && selectedProject) {
    return (
      <ProjectView
        onLogout={handleLogout}
        onBack={handleBackToProjects}
        project={selectedProject}
        onUpdateProject={handleUpdateProject}
        onNavigateToAcordos={handleNavigateToAcordos}
      />
    );
  }

  if (currentState === 'acordos-view' && selectedProject) {
    return (
      <AcordosView
        onLogout={handleLogout}
        onBack={() => setCurrentState('project-view')}
        project={selectedProject}
        onUpdateProject={handleUpdateProject}
      />
    );
  }

  if (currentState === 'agenda') {
    return <Agenda onLogout={handleLogout} projects={projects} onNavigate={handleNavigate} />;
  }

  if (currentState === 'crm') {
    return (
      <CRM
        onLogout={handleLogout}
        onBack={handleBackToDashboard}
        currentPage="crm"
        onNavigate={handleNavigate}
      />
    );
  }

  return <Login onLogin={handleLogin} />;
};

export default Index;
