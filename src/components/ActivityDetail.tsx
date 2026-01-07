import { Activity } from '@/types/activity';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  User, 
  Building2, 
  MapPin, 
  Cloud, 
  Users, 
  Truck,
  FileText,
  MessageSquare
} from 'lucide-react';

interface ActivityDetailProps {
  activity: Activity | null;
  onClose: () => void;
}

export function ActivityDetail({ activity, onClose }: ActivityDetailProps) {
  if (!activity) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const InfoItem = ({ 
    icon: Icon, 
    label, 
    value 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | number;
  }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className="p-2 rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );

  return (
    <Dialog open={!!activity} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Detalhes da Atividade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Header info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="gradient-primary">
              {activity.contratada}
            </Badge>
            <Badge variant="outline">{activity.dia}</Badge>
            <Badge variant="secondary">{activity.condicoesClima}</Badge>
          </div>

          {/* Grid info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoItem icon={Calendar} label="Data" value={formatDate(activity.data)} />
            <InfoItem icon={User} label="Fiscal" value={activity.fiscal} />
            <InfoItem icon={Building2} label="Contratada" value={activity.contratada} />
            <InfoItem icon={MapPin} label="Frente de Obra" value={activity.frenteObra || '-'} />
            <InfoItem icon={Cloud} label="Condições Climáticas" value={activity.condicoesClima} />
            <InfoItem icon={Users} label="Efetivo Total" value={activity.efetivoTotal} />
            <InfoItem icon={Truck} label="Equipamentos" value={activity.equipamentos} />
          </div>

          {/* Obra */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-semibold">Obra</span>
            </div>
            <p className="text-foreground">{activity.obra}</p>
          </div>

          {/* Atividades */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-semibold">Atividades Realizadas</span>
            </div>
            <p className="text-foreground whitespace-pre-wrap">{activity.atividades}</p>
          </div>

          {/* Observações */}
          {activity.observacoes && (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-warning" />
                <span className="font-semibold">Observações</span>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{activity.observacoes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
