import { useState } from 'react';
import { Activity, MonthSummary } from '@/types/activity';
import { 
  FileText, 
  Users, 
  Truck, 
  Building2,
  HardHat,
  UserCheck,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface SummaryCardsProps {
  summary: MonthSummary;
  activities: Activity[];
}

type DetailType = 'registros' | 'efetivo' | 'equipamentos' | 'contratadas' | 'obras' | 'fiscais' | null;

export function SummaryCards({ summary, activities }: SummaryCardsProps) {
  const [detailOpen, setDetailOpen] = useState<DetailType>(null);
  const [selectedContratada, setSelectedContratada] = useState<string | null>(null);

  const cards = [
    {
      title: 'Total de Registros',
      value: summary.totalAtividades,
      icon: FileText,
      color: 'primary',
      detailType: 'registros' as DetailType,
    },
    {
      title: 'Efetivo Total',
      value: summary.totalEfetivo,
      icon: Users,
      color: 'success',
      detailType: 'efetivo' as DetailType,
    },
    {
      title: 'Equipamentos',
      value: summary.totalEquipamentos,
      icon: Truck,
      color: 'warning',
      detailType: 'equipamentos' as DetailType,
    },
    {
      title: 'Contratadas',
      value: summary.contratodasAtivas.length,
      icon: Building2,
      color: 'accent',
      detailType: 'contratadas' as DetailType,
    },
    {
      title: 'Obras Ativas',
      value: summary.obrasAtivas.length,
      icon: HardHat,
      color: 'primary',
      detailType: 'obras' as DetailType,
    },
    {
      title: 'Fiscais',
      value: summary.fiscais.length,
      icon: UserCheck,
      color: 'success',
      detailType: 'fiscais' as DetailType,
    },
  ];

  const getDetailTitle = () => {
    if (selectedContratada) {
      return `Detalhes - ${selectedContratada}`;
    }
    switch (detailOpen) {
      case 'registros': return 'Detalhes dos Registros';
      case 'efetivo': return 'Detalhes do Efetivo';
      case 'equipamentos': return 'Detalhes dos Equipamentos';
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

  const getEfetivoDetails = () => {
    const efetivoMap: Record<string, number> = {};
    activities.forEach((a) => {
      if (a.efetivoDetalhado && a.efetivoDetalhado.length > 0) {
        a.efetivoDetalhado.forEach((e) => {
          efetivoMap[e.funcao] = (efetivoMap[e.funcao] || 0) + e.quantidade;
        });
      } else if (a.efetivoTotal) {
        efetivoMap['Geral'] = (efetivoMap['Geral'] || 0) + a.efetivoTotal;
      }
    });
    return Object.entries(efetivoMap)
      .map(([funcao, quantidade]) => ({ funcao, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  };

  const getEquipamentosDetails = () => {
    const equipMap: Record<string, number> = {};
    activities.forEach((a) => {
      if (a.equipamentosDetalhado && a.equipamentosDetalhado.length > 0) {
        a.equipamentosDetalhado.forEach((e) => {
          equipMap[e.equipamento] = (equipMap[e.equipamento] || 0) + e.quantidade;
        });
      } else if (a.equipamentos) {
        equipMap['Geral'] = (equipMap['Geral'] || 0) + a.equipamentos;
      }
    });
    return Object.entries(equipMap)
      .map(([equipamento, quantidade]) => ({ equipamento, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  };

  const getEquipamentosByContratada = (contratada: string) => {
    const equipMap: Record<string, number> = {};
    activities
      .filter((a) => a.contratada === contratada)
      .forEach((a) => {
        if (a.equipamentosDetalhado && a.equipamentosDetalhado.length > 0) {
          a.equipamentosDetalhado.forEach((e) => {
            equipMap[e.equipamento] = (equipMap[e.equipamento] || 0) + e.quantidade;
          });
        } else if (a.equipamentos) {
          equipMap['Geral'] = (equipMap['Geral'] || 0) + a.equipamentos;
        }
      });
    return Object.entries(equipMap)
      .map(([equipamento, quantidade]) => ({ equipamento, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  };

  const getEfetivoByContratada = (contratada: string) => {
    const efetivoMap: Record<string, number> = {};
    activities
      .filter((a) => a.contratada === contratada)
      .forEach((a) => {
        if (a.efetivoDetalhado && a.efetivoDetalhado.length > 0) {
          a.efetivoDetalhado.forEach((e) => {
            efetivoMap[e.funcao] = (efetivoMap[e.funcao] || 0) + e.quantidade;
          });
        } else if (a.efetivoTotal) {
          efetivoMap['Geral'] = (efetivoMap['Geral'] || 0) + a.efetivoTotal;
        }
      });
    return Object.entries(efetivoMap)
      .map(([funcao, quantidade]) => ({ funcao, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  };

  const getRegistrosDetails = () => {
    const registrosMap: Record<string, { count: number; efetivo: number; equipamentos: number }> = {};
    activities.forEach((a) => {
      const key = a.contratada || 'Não informado';
      if (!registrosMap[key]) {
        registrosMap[key] = { count: 0, efetivo: 0, equipamentos: 0 };
      }
      registrosMap[key].count += 1;
      registrosMap[key].efetivo += a.efetivoTotal || 0;
      registrosMap[key].equipamentos += a.equipamentos || 0;
    });
    return Object.entries(registrosMap)
      .map(([contratada, data]) => ({ contratada, ...data }))
      .sort((a, b) => b.count - a.count);
  };

  const handleCloseDialog = () => {
    setDetailOpen(null);
    setSelectedContratada(null);
  };

  const handleBackToRegistros = () => {
    setSelectedContratada(null);
  };

  const renderContratadaDetails = () => {
    if (!selectedContratada) return null;
    
    const equipamentos = getEquipamentosByContratada(selectedContratada);
    const efetivo = getEfetivoByContratada(selectedContratada);
    const totalEquip = equipamentos.reduce((sum, e) => sum + e.quantidade, 0);
    const totalEfetivo = efetivo.reduce((sum, e) => sum + e.quantidade, 0);

    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToRegistros}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <div>
          <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <Truck className="h-4 w-4 text-warning" />
            Equipamentos ({totalEquip})
          </h4>
          <div className="space-y-2">
            {equipamentos.length === 0 ? (
              <p className="text-muted-foreground text-sm pl-6">Nenhum equipamento</p>
            ) : (
              equipamentos.map((item, index) => (
                <div
                  key={index}
                  className="p-2 rounded-lg bg-warning/5 border border-warning/20 flex justify-between items-center"
                >
                  <span className="text-sm">{item.equipamento}</span>
                  <span className="text-warning font-bold">{item.quantidade}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-success" />
            Efetivo ({totalEfetivo})
          </h4>
          <div className="space-y-2">
            {efetivo.length === 0 ? (
              <p className="text-muted-foreground text-sm pl-6">Nenhum efetivo</p>
            ) : (
              efetivo.map((item, index) => (
                <div
                  key={index}
                  className="p-2 rounded-lg bg-success/5 border border-success/20 flex justify-between items-center"
                >
                  <span className="text-sm">{item.funcao}</span>
                  <span className="text-success font-bold">{item.quantidade}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDetailContent = () => {
    if (selectedContratada) {
      return renderContratadaDetails();
    }

    if (detailOpen === 'registros') {
      const registros = getRegistrosDetails();
      return (
        <div className="space-y-2">
          {registros.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum registro encontrado</p>
          ) : (
            registros.map((item, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-muted/50 border hover:bg-muted transition-colors cursor-pointer group"
                onClick={() => setSelectedContratada(item.contratada)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{item.contratada}</div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex gap-4">
                  <span>{item.count} registros</span>
                  <span>{item.efetivo} efetivo</span>
                  <span>{item.equipamentos} equipamentos</span>
                </div>
              </div>
            ))
          )}
        </div>
      );
    }

    if (detailOpen === 'efetivo') {
      const efetivo = getEfetivoDetails();
      return (
        <div className="space-y-2">
          {efetivo.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum efetivo encontrado</p>
          ) : (
            efetivo.map((item, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-muted/50 border hover:bg-muted transition-colors flex justify-between items-center"
              >
                <span className="font-medium">{item.funcao}</span>
                <span className="text-success font-bold">{item.quantidade}</span>
              </div>
            ))
          )}
          <div className="pt-2 border-t mt-4">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-success">{summary.totalEfetivo}</span>
            </div>
          </div>
        </div>
      );
    }

    if (detailOpen === 'equipamentos') {
      const equipamentos = getEquipamentosDetails();
      return (
        <div className="space-y-2">
          {equipamentos.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum equipamento encontrado</p>
          ) : (
            equipamentos.map((item, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-muted/50 border hover:bg-muted transition-colors flex justify-between items-center"
              >
                <span className="font-medium">{item.equipamento}</span>
                <span className="text-warning font-bold">{item.quantidade}</span>
              </div>
            ))
          )}
          <div className="pt-2 border-t mt-4">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-warning">{summary.totalEquipamentos}</span>
            </div>
          </div>
        </div>
      );
    }

    const items = getDetailItems();
    return (
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum item encontrado</p>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-muted/50 border hover:bg-muted transition-colors"
            >
              <span className="font-medium">{item}</span>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
        {cards.map((card, index) => (
          <div
            key={card.title}
            className="card-elevated p-4 hover:scale-[1.02] transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-primary/50"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => setDetailOpen(card.detailType)}
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
              <span className="text-xs text-muted-foreground">Clique para ver</span>
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

      <Dialog open={detailOpen !== null} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedContratada ? (
                <Building2 className="h-5 w-5 text-accent" />
              ) : (
                <>
                  {detailOpen === 'registros' && <FileText className="h-5 w-5 text-primary" />}
                  {detailOpen === 'efetivo' && <Users className="h-5 w-5 text-success" />}
                  {detailOpen === 'equipamentos' && <Truck className="h-5 w-5 text-warning" />}
                  {detailOpen === 'contratadas' && <Building2 className="h-5 w-5 text-accent" />}
                  {detailOpen === 'obras' && <HardHat className="h-5 w-5 text-primary" />}
                  {detailOpen === 'fiscais' && <UserCheck className="h-5 w-5 text-success" />}
                </>
              )}
              {getDetailTitle()}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {renderDetailContent()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
