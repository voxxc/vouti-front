import { Scale, Shield, FileText, Users, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const VeridictoLanding = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-amber-400">Veri</span>
              <span className="text-white">dicto</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-8">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300">Plataforma Jurídica Inteligente</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Gestão Jurídica
            <span className="block text-amber-400">Simplificada</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Automatize processos, gerencie prazos e acompanhe andamentos com a plataforma mais completa para escritórios de advocacia.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 px-8"
            >
              Começar Agora
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Saiba Mais
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-slate-800/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Recursos <span className="text-amber-400">Poderosos</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: 'Gestão de Processos',
                description: 'Acompanhe todos os seus processos em um único lugar com atualizações automáticas dos tribunais.'
              },
              {
                icon: Users,
                title: 'CRM Jurídico',
                description: 'Gerencie clientes, contratos e financeiro de forma integrada e eficiente.'
              },
              {
                icon: Shield,
                title: 'Segurança Total',
                description: 'Seus dados protegidos com criptografia de ponta e backup automático.'
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Por que escolher o <span className="text-amber-400">Veridicto</span>?
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              'Integração com tribunais em tempo real',
              'Alertas automáticos de prazos',
              'Relatórios financeiros detalhados',
              'Agenda integrada com Google Calendar',
              'App mobile para iOS e Android',
              'Suporte técnico 24/7'
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <CheckCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span className="text-slate-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-700/50">
        <div className="container mx-auto text-center">
          <p className="text-slate-500 text-sm">
            © 2024 Veridicto. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default VeridictoLanding;
