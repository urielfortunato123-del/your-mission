import { useMemo } from 'react';
import { Activity } from '@/types/activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Users } from 'lucide-react';

interface ActivityChartsProps {
  activities: Activity[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(142, 76%, 36%)',
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(0, 84%, 60%)',
  'hsl(47, 96%, 53%)',
];

export function ActivityCharts({ activities }: ActivityChartsProps) {
  // Efetivo por contratada
  const efetivoByContratada = useMemo(() => {
    const grouped: Record<string, number> = {};
    activities.forEach((a) => {
      const key = a.contratada || 'Não informado';
      grouped[key] = (grouped[key] || 0) + (a.efetivoTotal || 0);
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [activities]);

  // Atividades por semana
  const atividadesPorSemana = useMemo(() => {
    const weekMap: Record<string, number> = {};
    
    activities.forEach((a) => {
      if (!a.data) return;
      const date = new Date(a.data);
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const weekNumber = Math.ceil(
        ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
      );
      const weekLabel = `Sem ${weekNumber}`;
      weekMap[weekLabel] = (weekMap[weekLabel] || 0) + 1;
    });

    return Object.entries(weekMap)
      .map(([name, atividades]) => ({ name, atividades }))
      .sort((a, b) => {
        const numA = parseInt(a.name.replace('Sem ', ''));
        const numB = parseInt(b.name.replace('Sem ', ''));
        return numA - numB;
      })
      .slice(-8);
  }, [activities]);

  // Distribuição por obra
  const distribuicaoPorObra = useMemo(() => {
    const grouped: Record<string, number> = {};
    activities.forEach((a) => {
      const key = a.obra || 'Não informado';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [activities]);

  // Equipamentos por dia
  const equipamentosPorDia = useMemo(() => {
    const dayMap: Record<string, { efetivo: number; equipamentos: number }> = {};
    
    activities.forEach((a) => {
      if (!a.data) return;
      const date = new Date(a.data);
      const dayLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      if (!dayMap[dayLabel]) {
        dayMap[dayLabel] = { efetivo: 0, equipamentos: 0 };
      }
      dayMap[dayLabel].efetivo += a.efetivoTotal || 0;
      dayMap[dayLabel].equipamentos += a.equipamentos || 0;
    });

    return Object.entries(dayMap)
      .map(([name, data]) => ({ name, ...data }))
      .slice(-10);
  }, [activities]);

  if (activities.length === 0) {
    return (
      <Card className="card-elevated">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Adicione atividades para visualizar os gráficos
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Efetivo por Contratada */}
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Efetivo por Contratada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={efetivoByContratada} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]}
                name="Efetivo"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Atividades por Semana */}
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-success" />
            Atividades por Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={atividadesPorSemana}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="atividades" 
                fill="hsl(var(--success))" 
                radius={[4, 4, 0, 0]}
                name="Atividades"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição por Obra */}
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-warning" />
            Distribuição por Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={distribuicaoPorObra}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => 
                  `${name.substring(0, 10)}${name.length > 10 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={false}
              >
                {distribuicaoPorObra.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Efetivo e Equipamentos por Dia */}
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Efetivo e Equipamentos por Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={equipamentosPorDia}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="efetivo" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                name="Efetivo"
              />
              <Line 
                type="monotone" 
                dataKey="equipamentos" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--success))' }}
                name="Equipamentos"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
