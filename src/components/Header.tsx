import { ClipboardList, Plus, Trash2, Save, FolderOpen, FileSpreadsheet, Calculator, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onNewActivity: () => void;
  onClear: () => void;
  onSaveAs: () => void;
  onLoad: () => void;
  onOpenPriceSheet?: () => void;
  onOpenServices?: () => void;
  onExportMedicao?: () => void;
}

export function Header({ onNewActivity, onClear, onSaveAs, onLoad, onOpenPriceSheet, onOpenServices, onExportMedicao }: HeaderProps) {
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
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Arquivo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onLoad}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Abrir...
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveAs}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Como...
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onOpenPriceSheet && (
                  <DropdownMenuItem onClick={onOpenPriceSheet}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Planilha de Preços
                  </DropdownMenuItem>
                )}
                {onOpenServices && (
                  <DropdownMenuItem onClick={onOpenServices}>
                    <Calculator className="h-4 w-4 mr-2" />
                    Memória de Cálculo
                  </DropdownMenuItem>
                )}
                {onExportMedicao && (
                  <DropdownMenuItem onClick={onExportMedicao}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar Medição
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClear} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Tudo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={onNewActivity}
              className="gradient-accent hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
