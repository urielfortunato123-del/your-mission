import { useState } from 'react';
import { Activity } from '@/types/activity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Eye,
  Sun,
  Cloud,
  CloudRain,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActivityDetail } from './ActivityDetail';

interface ActivityListProps {
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
}

export function ActivityList({ activities, onEdit, onDelete }: ActivityListProps) {
  const [search, setSearch] = useState('');
  const [filterFiscal, setFilterFiscal] = useState<string>('all');
  const [filterContratada, setFilterContratada] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const fiscais = Array.from(new Set(activities.map((a) => a.fiscal)));
  const contratadas = Array.from(new Set(activities.map((a) => a.contratada)));

  const filtered = activities.filter((activity) => {
    const matchesSearch =
      activity.obra.toLowerCase().includes(search.toLowerCase()) ||
      activity.atividades.toLowerCase().includes(search.toLowerCase()) ||
      activity.fiscal.toLowerCase().includes(search.toLowerCase()) ||
      activity.contratada.toLowerCase().includes(search.toLowerCase());

    const matchesFiscal = filterFiscal === 'all' || activity.fiscal === filterFiscal;
    const matchesContratada = filterContratada === 'all' || activity.contratada === filterContratada;

    return matchesSearch && matchesFiscal && matchesContratada;
  });

  const getWeatherIcon = (weather: string) => {
    if (weather.toLowerCase().includes('chuva')) {
      return <CloudRain className="h-4 w-4 text-primary" />;
    }
    if (weather.toLowerCase().includes('nublado')) {
      return <Cloud className="h-4 w-4 text-muted-foreground" />;
    }
    return <Sun className="h-4 w-4 text-warning" />;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="card-elevated animate-slide-up">
      {/* Filters */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar atividades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select value={filterFiscal} onValueChange={setFilterFiscal}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Fiscal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Fiscais</SelectItem>
                {fiscais.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterContratada} onValueChange={setFilterContratada}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Contratada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {contratadas.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead>Fiscal</TableHead>
              <TableHead>Contratada</TableHead>
              <TableHead>Obra</TableHead>
              <TableHead className="text-center">Clima</TableHead>
              <TableHead className="text-center">Efetivo</TableHead>
              <TableHead className="text-center">Equip.</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {activities.length === 0
                    ? 'Nenhuma atividade registrada. Clique em "Nova Atividade" para começar.'
                    : 'Nenhuma atividade encontrada com os filtros aplicados.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((activity, index) => (
                <TableRow 
                  key={activity.id}
                  className="animate-fade-in cursor-pointer hover:bg-muted/50"
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => setSelectedActivity(activity)}
                >
                  <TableCell className="font-mono text-sm">
                    {formatDate(activity.data)}
                  </TableCell>
                  <TableCell>{activity.fiscal}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-medium">
                      {activity.contratada}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {activity.obra}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getWeatherIcon(activity.condicoesClima)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {activity.efetivoTotal}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {activity.equipamentos}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setSelectedActivity(activity);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onEdit(activity);
                        }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(activity.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      {filtered.length > 0 && (
        <div className="p-3 border-t border-border text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'} encontrado{filtered.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Detail Modal */}
      <ActivityDetail
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
}
