import { Activity, MonthSummary } from '@/types/activity';
import { 
  FileText, 
  Users, 
  Truck, 
  Building2,
  HardHat,
  UserCheck
} from 'lucide-react';

interface SummaryCardsProps {
  summary: MonthSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      title: 'Total de Registros',
      value: summary.totalAtividades,
      icon: FileText,
      color: 'primary',
    },
    {
      title: 'Efetivo Total',
      value: summary.totalEfetivo,
      icon: Users,
      color: 'success',
    },
    {
      title: 'Equipamentos',
      value: summary.totalEquipamentos,
      icon: Truck,
      color: 'warning',
    },
    {
      title: 'Contratadas',
      value: summary.contratodasAtivas.length,
      icon: Building2,
      color: 'accent',
    },
    {
      title: 'Obras Ativas',
      value: summary.obrasAtivas.length,
      icon: HardHat,
      color: 'primary',
    },
    {
      title: 'Fiscais',
      value: summary.fiscais.length,
      icon: UserCheck,
      color: 'success',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
      {cards.map((card, index) => (
        <div
          key={card.title}
          className="card-elevated p-4 hover:scale-[1.02] transition-all duration-200"
          style={{ animationDelay: `${index * 50}ms` }}
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
  );
}
