import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onNewActivity: () => void;
}

export function Header({ onNewActivity }: HeaderProps) {
  return (
    <header className="gradient-hero border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="gradient-primary p-2.5 rounded-lg">
              <ClipboardList className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">
                Memória Mensal
              </h1>
              <p className="text-sm text-muted-foreground">
                Relatório Diário de Atividades
              </p>
            </div>
          </div>
          
          <Button
            onClick={onNewActivity}
            className="gradient-accent hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Atividade
          </Button>
        </div>
      </div>
    </header>
  );
}
