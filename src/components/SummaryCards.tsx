import { useState } from 'react';
import { MonthSummary } from '@/types/activity';
import { 
  FileText, 
  Users, 
  Truck, 
  Building2,
  HardHat,
  UserCheck,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SummaryCardsProps {
  summary: MonthSummary;
}

type DetailType = 'contratadas' | 'obras' | 'fiscais' | null;

export function SummaryCards({ summary }: SummaryCardsProps) {
  const [detailOpen, setDetailOpen] = useState<DetailType>(null);

  const cards = [
    {
      title: 'Total de Registros',
      value: summary.totalAtividades,
      icon: FileText,
      color: 'primary',
      detailType: null as DetailType,
    },
    {
      title: 'Efetivo Total',
      value: summary.totalEfetivo,
      icon: Users,
      color: 'success',
      detailType: null as DetailType,
    },
    {
      title: 'Equipamentos',
      value: summary.totalEquipamentos,
      icon: Truck,
      color: 'warning',
      detailType: null as DetailType,
    },
    {
      title: 'Contratadas',
      value: summary.contratodasAtivas.length,
      icon: Building2,
      color: 'accent',
      detailType: 'contratadas' as DetailType,
      items: summary.contratodasAtivas,
    },
    {
      title: 'Obras Ativas',
      value: summary.obrasAtivas.length,
      icon: HardHat,
      color: 'primary',
      detailType: 'obras' as DetailType,
      items: summary.obrasAtivas,
    },
    {
      title: 'Fiscais',
      value: summary.fiscais.length,
      icon: UserCheck,
      color: 'success',
      detailType: 'fiscais' as DetailType,
      items: summary.fiscais,
    },
  ];

  const getDetailTitle = () => {
    switch (detailOpen) {
      case 'contratadas': return 'Contratadas Ativas';
      case 'obras': return 'Obras Ativas';
      case 'fiscais': return 'Fiscais';
      default: return '';
    }
  };

  const getDetailItems = () => {
    switch (detailOpen) {
      case 'contratadas': return summary.contratodasAtivas;
      case 'obras': return summary.obrasAtivas;
      case 'fiscais': return summary.fiscais;
      default: return [];
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
        {cards.map((card, index) => (
          <div
            key={card.title}
            className={`card-elevated p-4 hover:scale-[1.02] transition-all duration-200 ${
              card.detailType ? 'cursor-pointer hover:ring-2 hover:ring-primary/50' : ''
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => card.detailType && setDetailOpen(card.detailType)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${
                card.color === 'primary' ? 'bg-primary/10' :
                card.color === 'success' ? 'bg-success/10' :
                card.color === 'warning' ? 'bg-warning/10' :
                'bg-accent/10'
              }`}>
                <card.icon className={`h-4 w-4 ${
                  card.color === 'primary' ? 'text-primary' :
                  card.color === 'success' ? 'text-success' :
                  card.color === 'warning' ? 'text-warning' :
                  'text-accent'
                }`} />
              </div>
              {card.detailType && (
                <span className="text-xs text-muted-foreground">Clique para ver</span>
              )}
            </div>
            <div className="font-mono text-2xl font-bold text-foreground">
              {card.value}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {card.title}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen !== null} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailOpen === 'contratadas' && <Building2 className="h-5 w-5 text-accent" />}
              {detailOpen === 'obras' && <HardHat className="h-5 w-5 text-primary" />}
              {detailOpen === 'fiscais' && <UserCheck className="h-5 w-5 text-success" />}
              {getDetailTitle()}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              {getDetailItems().length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum item encontrado</p>
              ) : (
                getDetailItems().map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-muted/50 border hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{item}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
