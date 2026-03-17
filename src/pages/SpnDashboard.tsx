import { useState } from 'react';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import SpnSidebar, { type SpnView } from '@/components/Spn/SpnSidebar';
import SpnMobileNav from '@/components/Spn/SpnMobileNav';
import StudentDashboard from '@/components/Spn/StudentDashboard';
import AdminDashboard from '@/components/Spn/AdminDashboard';
import TeacherDashboard from '@/components/Spn/TeacherDashboard';
import AdminLevelsManager from '@/components/Spn/AdminLevelsManager';
import AdminUsersManager from '@/components/Spn/AdminUsersManager';
import AdminBooksManager from '@/components/Spn/AdminBooksManager';
import LeaderboardView from '@/components/Spn/LeaderboardView';
import AchievementsView from '@/components/Spn/AchievementsView';
import ProgressView from '@/components/Spn/ProgressView';
import ModulesView from '@/components/Spn/ModulesView';
import BooksView from '@/components/Spn/BooksView';
import SectionViewer from '@/components/Spn/SectionViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

const SpnDashboard = () => {
  const { isAdmin, isTeacher } = useSpnAuth();
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState<SpnView>('dashboard');
  const [viewData, setViewData] = useState<any>(null);

  const handleViewChange = (view: SpnView, data?: any) => {
    setActiveView(view);
    setViewData(data || null);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        if (isAdmin) return <AdminDashboard />;
        if (isTeacher) return <TeacherDashboard />;
        return <StudentDashboard />;
      case 'progress':
        return <ProgressView />;
      case 'books':
        return <BooksView />;
      case 'modules':
        return <ModulesView onOpenUnit={(id, name) => handleViewChange('section', { unitId: id, unitName: name })} />;
      case 'section':
        return viewData ? <SectionViewer unitId={viewData.unitId} unitName={viewData.unitName} /> : <ModulesView onOpenUnit={(id, name) => handleViewChange('section', { unitId: id, unitName: name })} />;
      case 'leaderboard':
        return <LeaderboardView />;
      case 'achievements':
        return <AchievementsView />;
      case 'admin-books':
        return <AdminBooksManager />;
      case 'admin-levels':
        return <AdminLevelsManager />;
      case 'admin-users':
        return <AdminUsersManager />;
      case 'teacher-students':
        return <TeacherDashboard />;
      case 'settings':
        return (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="h-6 w-6" /> Settings
            </h1>
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              Settings page coming soon.
            </CardContent></Card>
          </div>
        );
      default:
        return <StudentDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {!isMobile && <SpnSidebar activeView={activeView} onViewChange={handleViewChange} />}
      <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${isMobile ? 'pb-20' : ''}`}>
        {renderContent()}
      </main>
      {isMobile && <SpnMobileNav activeView={activeView} onViewChange={handleViewChange} />}
    </div>
  );
};

export default SpnDashboard;
