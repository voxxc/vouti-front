import { Card, CardContent } from "@/components/ui/card";
import { Palette, MessageCircle, Copy, BadgeCheck, Users } from "lucide-react";

export const DashboardProBanner = () => {
  const features = [
    {
      icon: Palette,
      title: "Personalize suas cores",
      description: "Deixe sua página do seu jeito",
    },
    {
      icon: MessageCircle,
      title: "Botão flutuante do WhatsApp",
      description: "Adicione um botão flutuante na sua página",
    },
    {
      icon: Copy,
      title: "Tenha mais páginas",
      description: "Administre mais de 1 página",
    },
    {
      icon: BadgeCheck,
      title: "Selo de verificado",
      description: "Coloque o selo verificado na sua página",
    },
    {
      icon: Users,
      title: "Afilie-se em tempo limitado",
      description: "Afilie-se e ganhe comissões",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-lg p-6 border border-primary/20">
        <h2 className="text-2xl font-bold mb-1">
          Desbloqueie o Pro: 7 dias grátis
        </h2>
        <p className="text-muted-foreground">
          Aproveite o Pro grátis por uma semana
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card
              key={index}
              className="hover:shadow-lg transition-shadow cursor-pointer border-primary/10 hover:border-primary/30"
            >
              <CardContent className="p-4 text-center space-y-2">
                <div className="flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
