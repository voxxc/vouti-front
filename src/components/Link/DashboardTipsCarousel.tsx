import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export const DashboardTipsCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const tips = [
    {
      title: "Personalize sua página",
      description: "Adicione cores, imagens e links para deixar sua página única",
      gradient: "from-purple-500/20 to-pink-500/20",
    },
    {
      title: "Adicione seus links",
      description: "Conecte todas suas redes sociais em um só lugar",
      gradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
      title: "Acompanhe suas métricas",
      description: "Veja quantas pessoas visitam seus links",
      gradient: "from-green-500/20 to-emerald-500/20",
    },
  ];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? tips.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === tips.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dicas para você</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {tips.map((tip, index) => (
          <Card
            key={index}
            className={`bg-gradient-to-br ${tip.gradient} border-none transition-opacity duration-300 ${
              index === currentIndex ? "opacity-100" : "opacity-50 hidden md:block"
            }`}
          >
            <CardContent className="p-6 h-48 flex flex-col justify-end">
              <h3 className="text-lg font-bold mb-2">{tip.title}</h3>
              <p className="text-sm text-muted-foreground">{tip.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
