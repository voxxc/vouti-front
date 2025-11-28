import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Fingerprint, 
  Clock, 
  Shield, 
  Zap, 
  ChevronRight, 
  CheckCircle,
  User,
  Phone,
  Mail,
  MapPin,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const BatinkLanding = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cidade: '',
    funcionarios: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from('leads_captacao').insert({
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email,
        comentario: `Cidade: ${formData.cidade} | Funcionários: ${formData.funcionarios}`,
        origem: 'batink_landing',
        tipo: 'batink',
        status: 'novo',
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success('Dados enviados com sucesso!');

      setTimeout(() => {
        setIsModalOpen(false);
        setIsSubmitted(false);
        setFormData({ nome: '', telefone: '', email: '', cidade: '', funcionarios: '' });
      }, 3000);
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Clock,
      title: 'Precisão',
      description: 'Registro de ponto com precisão de segundos e geolocalização integrada',
    },
    {
      icon: Zap,
      title: 'Agilidade',
      description: 'Interface intuitiva para registros rápidos em qualquer dispositivo',
    },
    {
      icon: Shield,
      title: 'Segurança',
      description: 'Dados protegidos com criptografia e backup automático',
    },
  ];

  // HSL Colors as per specification
  const colors = {
    bgMain: 'hsl(270, 50%, 8%)',        // Roxo escuro profundo
    primary: 'hsl(320, 85%, 50%)',       // Magenta vibrante
    accent: 'hsl(45, 90%, 50%)',         // Dourado brilhante
    cardBg: 'hsl(270, 40%, 15%)',        // Roxo semi-transparente
    textMain: 'hsl(0, 0%, 98%)',         // Branco
    textSecondary: 'hsl(270, 20%, 70%)', // Roxo claro
    border: 'hsl(270, 30%, 30%)',        // Roxo com transparência
  };

  return (
    <>
      {/* Background fixo para cobrir toda a viewport */}
      <div 
        className="fixed inset-0 -z-10" 
        style={{ backgroundColor: colors.bgMain }} 
      />
      
      <div className="min-h-screen w-full overflow-x-hidden relative">
        {/* Header */}
        <header 
          className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
          style={{ 
            backgroundColor: 'hsla(270, 50%, 8%, 0.9)',
            borderColor: colors.border
          }}
        >
          <div className="flex items-center justify-between h-20 px-6 lg:px-12">
            {/* Logo Elaborado */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`
                  }}
                >
                  <Fingerprint className="w-7 h-7 text-white" />
                </div>
                {/* Ponto dourado pulsante */}
                <div 
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full animate-pulse shadow-lg"
                  style={{ 
                    backgroundColor: colors.accent,
                    boxShadow: `0 0 10px ${colors.accent}`
                  }}
                />
              </div>
              <span 
                className="text-2xl font-bold tracking-tight"
                style={{ color: colors.primary }}
              >
                BATINK
              </span>
            </div>

            {/* Botão Entrar */}
            <Button
              variant="outline"
              onClick={() => navigate('/batink/auth')}
              className="border-2 bg-transparent transition-all duration-300 px-6"
              style={{ 
                borderColor: colors.primary,
                color: colors.primary
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsla(320, 85%, 50%, 0.15)';
                e.currentTarget.style.boxShadow = `0 0 20px hsla(320, 85%, 50%, 0.3)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Entrar
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <section 
          className="min-h-screen flex items-center justify-center pt-20 animate-fade-in"
          style={{
            background: `linear-gradient(135deg, ${colors.bgMain} 0%, hsl(270, 40%, 12%) 50%, ${colors.bgMain} 100%)`
          }}
        >
          <div className="px-6 text-center">
            <h1 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6"
              style={{ color: colors.textMain }}
            >
              Gestão de Ponto{' '}
              <span style={{ color: colors.primary }}>Digital</span>
            </h1>
            <p 
              className="text-xl sm:text-2xl mb-10"
              style={{ color: colors.textSecondary }}
            >
              O ponto certo para sua equipe.
            </p>
            <Button
              size="lg"
              onClick={() => setIsModalOpen(true)}
              className="text-lg px-8 py-6 font-semibold transition-all duration-300 hover:scale-105"
              style={{
                backgroundColor: colors.accent,
                color: colors.bgMain,
                boxShadow: `0 0 30px hsla(45, 90%, 50%, 0.4)`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 50px hsla(45, 90%, 50%, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px hsla(45, 90%, 50%, 0.4)';
              }}
            >
              Começar Agora
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section 
          className="py-24"
          style={{ backgroundColor: colors.bgMain }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-8 rounded-2xl backdrop-blur-sm border transition-all duration-300 hover:scale-105 cursor-default"
                  style={{
                    backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                    borderColor: colors.border,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.primary;
                    e.currentTarget.style.boxShadow = `0 0 30px hsla(320, 85%, 50%, 0.3)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                    style={{ backgroundColor: 'hsla(320, 85%, 50%, 0.15)' }}
                  >
                    <feature.icon 
                      className="w-7 h-7" 
                      style={{ color: colors.primary }}
                    />
                  </div>
                  <h3 
                    className="text-xl font-bold mb-3"
                    style={{ color: colors.textMain }}
                  >
                    {feature.title}
                  </h3>
                  <p style={{ color: colors.textSecondary }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section 
          className="py-24"
          style={{
            background: `linear-gradient(180deg, ${colors.bgMain} 0%, hsl(270, 40%, 12%) 100%)`
          }}
        >
          <div className="px-6 text-center">
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8"
              style={{ color: colors.textMain }}
            >
              Pronto para modernizar o controle de ponto da sua empresa?
            </h2>
            <Button
              size="lg"
              onClick={() => setIsModalOpen(true)}
              className="text-lg px-8 py-6 font-semibold transition-all duration-300 hover:scale-105"
              style={{
                backgroundColor: colors.accent,
                color: colors.bgMain,
                boxShadow: `0 0 30px hsla(45, 90%, 50%, 0.4)`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 50px hsla(45, 90%, 50%, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px hsla(45, 90%, 50%, 0.4)';
              }}
            >
              Acessar Sistema
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer 
          className="py-8 border-t"
          style={{ 
            backgroundColor: colors.bgMain,
            borderColor: colors.border
          }}
        >
          <div className="px-6 text-center">
            <p style={{ color: colors.textSecondary }}>
              © 2024{' '}
              <span style={{ color: colors.primary }}>BATINK</span>
              . Todos os direitos reservados.
            </p>
          </div>
        </footer>

        {/* Contact Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent 
            className="max-w-md border"
            style={{ 
              backgroundColor: 'hsl(270, 40%, 12%)',
              borderColor: colors.border
            }}
          >
            <DialogHeader>
              <DialogTitle 
                className="text-2xl font-bold text-center"
                style={{ color: colors.textMain }}
              >
                {isSubmitted ? 'Obrigado!' : 'Fale Conosco'}
              </DialogTitle>
            </DialogHeader>

            {isSubmitted ? (
              <div className="py-8 text-center">
                <CheckCircle 
                  className="w-16 h-16 mx-auto mb-4" 
                  style={{ color: colors.accent }}
                />
                <p 
                  className="text-lg"
                  style={{ color: colors.textSecondary }}
                >
                  Recebemos suas informações! Um especialista BATINK entrará em contato em breve.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="nome" 
                    className="flex items-center gap-2"
                    style={{ color: colors.textSecondary }}
                  >
                    <User className="w-4 h-4" />
                    Nome *
                  </Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    required
                    placeholder="Seu nome completo"
                    className="border focus:ring-2"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                      borderColor: colors.border,
                      color: colors.textMain
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label 
                    htmlFor="telefone" 
                    className="flex items-center gap-2"
                    style={{ color: colors.textSecondary }}
                  >
                    <Phone className="w-4 h-4" />
                    Telefone *
                  </Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    type="tel"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    required
                    placeholder="(00) 00000-0000"
                    className="border"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                      borderColor: colors.border,
                      color: colors.textMain
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label 
                    htmlFor="email" 
                    className="flex items-center gap-2"
                    style={{ color: colors.textSecondary }}
                  >
                    <Mail className="w-4 h-4" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="seu@email.com"
                    className="border"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                      borderColor: colors.border,
                      color: colors.textMain
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label 
                    htmlFor="cidade" 
                    className="flex items-center gap-2"
                    style={{ color: colors.textSecondary }}
                  >
                    <MapPin className="w-4 h-4" />
                    Cidade *
                  </Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    required
                    placeholder="Sua cidade"
                    className="border"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                      borderColor: colors.border,
                      color: colors.textMain
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label 
                    className="flex items-center gap-2"
                    style={{ color: colors.textSecondary }}
                  >
                    <Users className="w-4 h-4" />
                    Quantos funcionários *
                  </Label>
                  <Select
                    value={formData.funcionarios}
                    onValueChange={(value) => setFormData({ ...formData, funcionarios: value })}
                    required
                  >
                    <SelectTrigger 
                      className="border"
                      style={{ 
                        backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                        borderColor: colors.border,
                        color: colors.textMain
                      }}
                    >
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent
                      className="border"
                      style={{ 
                        backgroundColor: 'hsl(270, 40%, 15%)',
                        borderColor: colors.border
                      }}
                    >
                      <SelectItem value="1-10" style={{ color: colors.textMain }}>1-10</SelectItem>
                      <SelectItem value="11-50" style={{ color: colors.textMain }}>11-50</SelectItem>
                      <SelectItem value="51-100" style={{ color: colors.textMain }}>51-100</SelectItem>
                      <SelectItem value="101-500" style={{ color: colors.textMain }}>101-500</SelectItem>
                      <SelectItem value="500+" style={{ color: colors.textMain }}>500+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-6 font-semibold transition-all duration-300"
                  disabled={isLoading}
                  style={{
                    backgroundColor: colors.accent,
                    color: colors.bgMain,
                  }}
                >
                  {isLoading ? 'Enviando...' : 'Enviar'}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default BatinkLanding;
