import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectView from './pages/ProjectView';
import AcordosView from './pages/AcordosView';
import Agenda from './pages/Agenda';
import CRM from './pages/CRM';
import Acordos from './pages/Acordos';
import Financial from './pages/Financial';
import NotFound from './pages/NotFound';
import { Project } from './types/project';
import { User } from './types/user';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewingAcordos, setViewingAcordos] = useState(false);
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'Administrador',
      email: 'admin@jusoffice.com',
      role: 'admin',
      personalInfo: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  const handleLogin = (email: string, password: string) => {
    // Simple authentication logic
    if (email && password) {
      setIsAuthenticated(true);
      setCurrentPage('dashboard');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage('dashboard');
    setSelectedProject(null);
    setViewingAcordos(false);
  };

  const handleCreateProject = (projectData: Omit<Project, 'id' | 'tasks' | 'acordoTasks' | 'createdAt' | 'updatedAt'>) => {
    const newProject: Project = {
      ...projectData,
      id: Date.now().toString(),
      tasks: [],
      acordoTasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setProjects([...projects, newProject]);
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    setSelectedProject(updatedProject);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
      setCurrentPage('projects');
    }
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentPage('project-view');
    setViewingAcordos(false);
  };

  const handleSelectAcordos = (project: Project) => {
    setSelectedProject(project);
    setCurrentPage('project-view');
    setViewingAcordos(true);
  };

  // Navigation based on current page
  const renderCurrentPage = () => {
    if (!isAuthenticated) {
      return <Login onLogin={handleLogin} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <Router>
            <Routes>
              <Route path="/" element={
                <Dashboard
                  onNavigateToProjects={() => setCurrentPage('projects')}
                  onNavigateToAgenda={() => setCurrentPage('agenda')}
                  onNavigateToCRM={() => setCurrentPage('crm')}
                  onNavigateToFinancial={() => setCurrentPage('financial')}
                  onLogout={handleLogout}
                  projects={projects}
                  users={users}
                />
              } />
              <Route path="/projects" element={
                <Projects
                  projects={projects}
                  onCreateProject={handleCreateProject}
                  onSelectProject={handleSelectProject}
                  onDeleteProject={handleDeleteProject}
                  onLogout={handleLogout}
                  onBack={() => setCurrentPage('dashboard')}
                />
              } />
              <Route path="/project/:id" element={
                selectedProject ? (
                  viewingAcordos ? (
                    <AcordosView
                      project={selectedProject}
                      onUpdateProject={handleUpdateProject}
                      onLogout={handleLogout}
                      onBack={() => setCurrentPage('projects')}
                    />
                  ) : (
                    <ProjectView
                      project={selectedProject}
                      onUpdateProject={handleUpdateProject}
                      onLogout={handleLogout}
                      onBack={() => setCurrentPage('projects')}
                      onNavigateToAcordos={() => handleSelectAcordos(selectedProject)}
                    />
                  )
                ) : (
                  <Navigate to="/projects" replace />
                )
              } />
              <Route path="/acordos" element={
                <Acordos 
                  onLogout={handleLogout}
                  onBack={() => setCurrentPage('dashboard')}
                  projects={projects}
                  onSelectProject={handleSelectAcordos}
                />
              } />
              <Route path="/agenda" element={
                <Agenda 
                  onLogout={handleLogout}
                  onBack={() => setCurrentPage('dashboard')}
                />
              } />
              <Route path="/crm" element={
                <CRM 
                  onLogout={handleLogout}
                  onBack={() => setCurrentPage('dashboard')}
                  currentPage="crm"
                  onNavigate={(page) => setCurrentPage(page)}
                />
              } />
              <Route path="/financial" element={
                <Financial 
                  onLogout={handleLogout}
                  onBack={() => setCurrentPage('dashboard')}
                />
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        );

      case 'projects':
        return (
          <Projects
            projects={projects}
            onCreateProject={handleCreateProject}
            onSelectProject={handleSelectProject}
            onDeleteProject={handleDeleteProject}
            onLogout={handleLogout}
            onBack={() => setCurrentPage('dashboard')}
          />
        );

      case 'project-view':
        if (!selectedProject) {
          setCurrentPage('projects');
          return null;
        }
        
        if (viewingAcordos) {
          return (
            <AcordosView
              project={selectedProject}
              onUpdateProject={handleUpdateProject}
              onLogout={handleLogout}
              onBack={() => setCurrentPage('projects')}
            />
          );
        }
        
        return (
          <ProjectView
            project={selectedProject}
            onUpdateProject={handleUpdateProject}
            onLogout={handleLogout}
            onBack={() => setCurrentPage('projects')}
            onNavigateToAcordos={() => handleSelectAcordos(selectedProject)}
          />
        );

      case 'agenda':
        return (
          <Agenda 
            onLogout={handleLogout}
            onBack={() => setCurrentPage('dashboard')}
          />
        );

      case 'crm':
        return (
          <CRM 
            onLogout={handleLogout}
            onBack={() => setCurrentPage('dashboard')}
            currentPage="crm"
            onNavigate={(page) => setCurrentPage(page)}
          />
        );

      case 'financial':
        return (
          <Financial 
            onLogout={handleLogout}
            onBack={() => setCurrentPage('dashboard')}
          />
        );

      default:
        return (
          <Dashboard
            onNavigateToProjects={() => setCurrentPage('projects')}
            onNavigateToAgenda={() => setCurrentPage('agenda')}
            onNavigateToCRM={() => setCurrentPage('crm')}
            onNavigateToFinancial={() => setCurrentPage('financial')}
            onLogout={handleLogout}
            projects={projects}
            users={users}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderCurrentPage()}
      <Toaster />
    </div>
  );
}

export default App;