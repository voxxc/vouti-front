import { useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Projects from "./Projects";
import ProjectView from "./ProjectView";
import { Project, Task } from "@/types/project";

type AppState = 'login' | 'dashboard' | 'projects' | 'project-view';

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
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-18')
        },
        {
          id: 'task-2',
          title: 'Coleta de documentos',
          description: 'Reunir holerites, rescisão e documentos pessoais',
          status: 'progress',
          comments: [],
          createdAt: new Date('2024-01-20'),
          updatedAt: new Date('2024-01-22')
        },
        {
          id: 'task-3',
          title: 'Elaboração da petição inicial',
          description: 'Redigir petição com fundamentação legal adequada',
          status: 'todo',
          comments: [],
          createdAt: new Date('2024-01-25'),
          updatedAt: new Date('2024-01-25')
        }
      ],
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
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-05')
        },
        {
          id: 'task-5',
          title: 'Acordo de guarda',
          description: 'Definir termos da guarda compartilhada dos filhos',
          status: 'waiting',
          comments: [],
          createdAt: new Date('2024-02-03'),
          updatedAt: new Date('2024-02-03')
        }
      ],
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

  const handleCreateProject = () => {
    // Implementar criação de projeto
    console.log('Criar novo projeto');
  };

  if (currentState === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  if (currentState === 'dashboard') {
    return (
      <Dashboard
        onLogout={handleLogout}
        onNavigateToProjects={handleNavigateToProjects}
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
      />
    );
  }

  return <Login onLogin={handleLogin} />;
};

export default Index;
