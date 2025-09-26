import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Logo from '@/components/Logo';
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

// Navigation component that uses useNavigate
function AppRoutes() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewingAcordos, setViewingAcordos] = useState(false);
  
  // Mock current user and users list
  const [currentUser] = useState<User>({
    id: '1',
    name: 'Administrador',
    email: 'admin@jusoffice.com',
    role: 'admin',
    personalInfo: {},
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'Administrador',
      email: 'admin@jusoffice.com',
      role: 'admin',
      personalInfo: {},
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'João Silva',
      email: 'joao@jusoffice.com',
      role: 'user',
      personalInfo: {
        department: 'Jurídico'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      name: 'Maria Santos',
      email: 'maria@jusoffice.com',
      role: 'user',
      personalInfo: {
        department: 'Secretaria'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  const handleProjectNavigation = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      handleSelectProject(project);
    }
  };

  const handleLogout = () => {
    navigate('/');
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
      navigate('/projects');
    }
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setViewingAcordos(false);
    navigate(`/project/${project.id}`);
  };

  const handleSelectAcordos = (project: Project) => {
    setSelectedProject(project);
    setViewingAcordos(true);
    navigate(`/project/${project.id}`);
  };

  return (
    <Routes>
      <Route path="/" element={
        <Dashboard
          onNavigateToProjects={() => navigate('/projects')}
          onNavigateToAgenda={() => navigate('/agenda')}
          onNavigateToCRM={() => navigate('/crm')}
          onNavigateToFinancial={() => navigate('/financial')}
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
          onBack={() => navigate('/')}
        />
      } />
      
      <Route path="/project/:id" element={
        selectedProject ? (
          viewingAcordos ? (
            <AcordosView
              project={selectedProject}
              onUpdateProject={handleUpdateProject}
              onLogout={handleLogout}
              onBack={() => navigate('/projects')}
            />
          ) : (
            <ProjectView
              project={selectedProject}
              onUpdateProject={handleUpdateProject}
              onLogout={handleLogout}
              onBack={() => navigate('/projects')}
              onNavigateToAcordos={() => handleSelectAcordos(selectedProject)}
              currentUser={currentUser}
              users={users}
              onProjectNavigation={handleProjectNavigation}
            />
          )
        ) : (
          <Navigate to="/projects" replace />
        )
      } />
      
      <Route path="/acordos" element={
        <Acordos 
          onLogout={handleLogout}
          onBack={() => navigate('/')}
          projects={projects}
          onSelectProject={handleSelectAcordos}
        />
      } />
      
      <Route path="/agenda" element={
        <Agenda 
          onLogout={handleLogout}
          onBack={() => navigate('/')}
        />
      } />
      
      <Route path="/crm" element={
        <CRM 
          onLogout={handleLogout}
          onBack={() => navigate('/')}
          currentPage="crm"
          onNavigate={(page) => navigate(`/${page}`)}
        />
      } />
      
      <Route path="/financial" element={
        <Financial 
          onLogout={handleLogout}
          onBack={() => navigate('/')}
        />
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showBrandSplash, setShowBrandSplash] = useState(false);
  const [brandSplashFadingOut, setBrandSplashFadingOut] = useState(false);

  const handleLogin = (email: string, password: string) => {
    // Simple authentication logic
    if (email && password) {
      setIsTransitioning(true);
      
      // Sequence: fade-out login → show brand splash → fade to dashboard
      setTimeout(() => {
        setShowBrandSplash(true);
        
        // Show brand for 2 seconds, then start fade-out
        setTimeout(() => {
          setBrandSplashFadingOut(true);
          
          // After fade-out completes, show dashboard
          setTimeout(() => {
            setShowBrandSplash(false);
            setBrandSplashFadingOut(false);
            setIsAuthenticated(true);
            
            // Reset transition state
            setTimeout(() => {
              setIsTransitioning(false);
            }, 600);
          }, 500);
        }, 2000);
      }, 500);
    }
  };

  // Show brand splash screen
  if (showBrandSplash) {
    return (
      <div className={`min-h-screen bg-gradient-subtle flex items-center justify-center transition-opacity duration-500 ease-out ${
        brandSplashFadingOut ? 'opacity-0' : 'opacity-100 animate-fade-in-simple'
      }`}>
        <div className="text-center">
          <Logo size="lg" className="justify-center transform scale-110" />
        </div>
      </div>
    );
  }

  // Show login screen
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen bg-background transition-opacity duration-500 ease-out ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}>
        <Login onLogin={handleLogin} />
        <Toaster />
      </div>
    );
  }

  // Show authenticated app with router
  return (
    <div className="min-h-screen bg-background animate-fade-in-simple">
      <Router>
        <AppRoutes />
      </Router>
      <Toaster />
    </div>
  );
}

export default App;