import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { LogOut, FolderOpen } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

const DashboardLayout = ({ children, onLogout }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card">
        <div className="flex items-center justify-between px-6 py-4">
          <Logo size="sm" />
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Bem-vindo ao sistema
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="gap-2"
            >
              <LogOut size={16} />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;