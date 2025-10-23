import { Sparkles } from "lucide-react";

export const EmptyLinksState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      <div className="mb-4 p-4 rounded-full bg-muted/50">
        <Sparkles className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <p className="text-lg text-foreground mb-1">
        Show the world who you are.
      </p>
      <p className="text-sm text-muted-foreground">
        Add a link to get started.
      </p>
    </div>
  );
};
