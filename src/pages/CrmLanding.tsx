import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLocalTheme } from "@/hooks/useLocalTheme";
import { AuthThemeToggle } from "@/components/Auth/AuthThemeToggle";
import authOfficeBg from "@/assets/auth-office-bg.jpg";

const CrmLanding = () => {
  const [slug, setSlug] = useState("");
  const navigate = useNavigate();

  useLocalTheme('auth-theme');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = slug.trim().toLowerCase();
    if (trimmed) {
      navigate(`/${trimmed}/auth`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex transition-opacity duration-500 relative overflow-hidden">
      {/* Floating Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-10 w-2 h-2 rounded-full bg-primary animate-float opacity-60" />
        <div className="absolute bottom-1/3 right-20 w-3 h-3 rounded-full bg-accent animate-float opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-primary animate-float opacity-50" style={{ animationDelay: '2s' }} />
      </div>

      {/* LEFT SIDE - Branding */}
      <div className="hidden lg:flex lg:w-3/5 flex-col items-start justify-start relative">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${authOfficeBg})` }} />
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative z-10 flex flex-col items-start text-left px-10 pt-12">
          <div className="mb-2 flex flex-col items-start">
            <span className="text-5xl md:text-7xl font-black tracking-tight lowercase">
              <span className="text-white">vouti</span>
              <span className="text-[#E11D48]">.crm</span>
            </span>
          </div>
          <p className="text-sm md:text-base font-medium tracking-wide text-white/90">
            Gestão inteligente de <span className="text-white font-semibold">clientes</span>.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE - Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-4 lg:pr-16">
        <div className="w-full max-w-md animate-slide-in-left">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <span className="text-3xl font-black tracking-tight lowercase block mb-3">
              <span className="text-foreground">vouti</span>
              <span className="text-[#E11D48]">.crm</span>
            </span>
            <p className="text-sm font-medium tracking-wide text-muted-foreground">
              Gestão inteligente de <span className="text-primary">clientes</span>.
            </p>
          </div>

          <Card className="shadow-card border-0 relative">
            <div className="absolute top-3 right-3">
              <AuthThemeToggle />
            </div>

            <CardHeader className="space-y-1 text-center pb-4">
              <h3 className="text-xl font-semibold text-foreground">
                Acesse seu CRM
              </h3>
              <p className="text-sm text-muted-foreground">
                Informe o identificador da sua empresa para continuar
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tenant-slug">Identificador da empresa</Label>
                  <Input
                    id="tenant-slug"
                    type="text"
                    placeholder="ex: minhaempresa"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" variant="professional" disabled={!slug.trim()}>
                  Continuar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CrmLanding;
