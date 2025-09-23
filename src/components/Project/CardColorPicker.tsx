import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";

interface CardColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
}

const CardColorPicker = ({ currentColor, onColorChange }: CardColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const colors = [
    { name: 'Padrão', value: 'default', class: 'bg-card border-border' },
    { name: 'Azul', value: 'blue', class: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' },
    { name: 'Verde', value: 'green', class: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' },
    { name: 'Amarelo', value: 'yellow', class: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800' },
    { name: 'Roxo', value: 'purple', class: 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800' },
    { name: 'Rosa', value: 'pink', class: 'bg-pink-50 border-pink-200 dark:bg-pink-950 dark:border-pink-800' },
    { name: 'Laranja', value: 'orange', class: 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800' },
    { name: 'Vermelho', value: 'red', class: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' },
  ];

  const currentColorData = colors.find(c => c.value === currentColor) || colors[0];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Palette size={16} />
          <div className={`w-4 h-4 rounded-full border-2 ${currentColorData.class}`}></div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Cor do Card</h4>
          <div className="grid grid-cols-4 gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => {
                  onColorChange(color.value);
                  setIsOpen(false);
                }}
                className={`
                  w-8 h-8 rounded-full border-2 transition-all
                  ${color.class}
                  ${currentColor === color.value ? 'ring-2 ring-primary ring-offset-2' : ''}
                  hover:scale-110
                `}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CardColorPicker;