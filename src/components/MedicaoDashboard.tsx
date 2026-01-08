import { useState, useMemo } from 'react';
import { ServiceEntry, MedicaoSummary } from '@/types/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3, 
  TrendingUp, 
  Building2, 
  Calendar, 
  DollarSign,
  PieChart,
  Activity
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface MedicaoDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceEntries: ServiceEntry[];
  getMedicaoSummary: (contratada?: string, periodo?: { inicio: string; fim: string }) => MedicaoSummary[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function MedicaoDashboard({
  open,
  onOpenChange,
  serviceEntries,
  getMedicaoSummary,
}: MedicaoDashboardProps) {
  const [filterPeriodo, setFilterPeriodo] = useState(() => {
    const now = new Date();
    return {
      inicio: format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'),
      fim: format(endOfMonth(now), 'yyyy-MM-dd'),
    };
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: value >= 1000000 ? 'compact' : 'standard',
    }).format(value);
  };

  // Filter entries by period
  const filteredEntries = useMemo(() => {
    return serviceEntries.filter(entry => {
      return (!filterPeriodo.inicio || entry.data >= filterPeriodo.inicio) &&
             (!filterPeriodo.fim || entry.data <= filterPeriodo.fim);
    });
  }, [serviceEntries, filterPeriodo]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredEntries.reduce((sum, e) => sum + e.valorTotal, 0);
    const contratadas = new Set(filteredEntries.map(e => e.contratada)).size;
    const servicos = filteredEntries.length;
    const mediaServico = servicos > 0 ? total / servicos : 0;
    
    return { total, contratadas, servicos, mediaServico };
  }, [filteredEntries]);

  // Data by contractor
  const dataByContratada = useMemo(() => {
    const grouped = filteredEntries.reduce((acc, entry) => {
      if (!acc[entry.contratada]) {
        acc[entry.contratada] = { name: entry.contratada, valor: 0, servicos: 0 };
      }
      acc[entry.contratada].valor += entry.valorTotal;
      acc[entry.contratada].servicos += 1;
      return acc;
    }, {} as Record<string, { name: string; valor: number; servicos: number }>);

    return Object.values(grouped)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [filteredEntries]);

  // Data by month
  const dataByMonth = useMemo(() => {
    const grouped = filteredEntries.reduce((acc, entry) => {
      const month = entry.data.substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { month, valor: 0, servicos: 0 };
      }
      acc[month].valor += entry.valorTotal;
      acc[month].servicos += 1;
      return acc;
    }, {} as Record<string, { month: string; valor: number; servicos: number }>);

    return Object.values(grouped)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(item => ({
        ...item,
        monthLabel: format(parseISO(item.month + '-01'), 'MMM/yy', { locale: ptBR }),
      }));
  }, [filteredEntries]);

  // Top services by value
  const topServices = useMemo(() => {
    const grouped = filteredEntries.reduce((acc, entry) => {
      const key = entry.codigo;
      if (!acc[key]) {
        acc[key] = { codigo: entry.codigo, descricao: entry.descricao, valor: 0, quantidade: 0, unidade: entry.unidade };
      }
      acc[key].valor += entry.valorTotal;
      acc[key].quantidade += entry.quantidade;
      return acc;
    }, {} as Record<string, { codigo: string; descricao: string; valor: number; quantidade: number; unidade: string }>);

    return Object.values(grouped)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [filteredEntries]);

  // Pie chart data
  const pieData = useMemo(() => {
    return dataByContratada.slice(0, 5).map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length],
    }));
  }, [dataByContratada]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Dashboard de Medição
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Period Filter */}
          <div className="flex gap-4 items-end">
            <div>
              <Label className="text-xs">Período inicial</Label>
              <Input
                type="date"
                value={filterPeriodo.inicio}
                onChange={(e) => setFilterPeriodo({ ...filterPeriodo, inicio: e.target.value })}
                className="w-[150px]"
              />
            </div>
            <div>
              <Label className="text-xs">Período final</Label>
              <Input
                type="date"
                value={filterPeriodo.fim}
                onChange={(e) => setFilterPeriodo({ ...filterPeriodo, fim: e.target.value })}
                className="w-[150px]"
              />
            </div>
          </div>

          <ScrollArea className="h-[calc(95vh-180px)]">
            <div className="space-y-4 pr-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valor Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(kpis.total)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Contratadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{kpis.contratadas}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Lançamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{kpis.servicos}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Média/Serviço
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(kpis.mediaServico)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Bar Chart - By Contractor */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Valor por Contratada
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      {dataByContratada.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dataByContratada} layout="vertical" margin={{ left: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              type="number" 
                              tickFormatter={(v) => formatCurrency(v)}
                              className="text-xs"
                            />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              width={100}
                              tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v}
                              className="text-xs"
                            />
                            <Tooltip 
                              formatter={(value: number) => [formatCurrency(value), 'Valor']}
                              labelFormatter={(label) => `${label}`}
                            />
                            <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          Sem dados no período
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Pie Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Distribuição por Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPie>
                            <Pie
                              data={pieData}
                              dataKey="valor"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percent }) => `${name.substring(0, 10)}... ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          </RechartsPie>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          Sem dados no período
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Line Chart - Evolution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Evolução Mensal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    {dataByMonth.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dataByMonth} margin={{ left: 10, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="monthLabel" className="text-xs" />
                          <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                          <Tooltip 
                            formatter={(value: number, name) => [
                              name === 'valor' ? formatCurrency(value) : value,
                              name === 'valor' ? 'Valor' : 'Serviços'
                            ]}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="valor" 
                            name="Valor" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Sem dados no período
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Services Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Top 10 Serviços por Valor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topServices.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Sem dados no período
                      </p>
                    ) : (
                      topServices.map((service, idx) => (
                        <div key={service.codigo} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                          <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                            {idx + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-medium">{service.codigo}</p>
                            <p className="text-xs text-muted-foreground truncate">{service.descricao}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-medium">{formatCurrency(service.valor)}</p>
                            <p className="text-xs text-muted-foreground">
                              {service.quantidade.toLocaleString('pt-BR')} {service.unidade}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
