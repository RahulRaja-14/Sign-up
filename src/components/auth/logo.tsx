import { Waves } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Waves className="h-8 w-8 text-primary" />
      <h1 className="text-2xl font-bold text-foreground">
        Plamento
      </h1>
    </div>
  );
}
