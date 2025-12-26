import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PagePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PagePlaceholder({ icon: Icon, title, description }: PagePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full bg-card border-border card-hover">
        <CardContent className="flex flex-col items-center py-12 px-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-6">
            <Icon className="h-8 w-8 text-gold" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
