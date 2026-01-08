import { useState } from 'react';
import { ServiceEntry, PriceItem, MedicaoSummary } from '@/types/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Search, Calculator, Building2, Calendar } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ServiceEntriesManagerProps {
  open: boolean;
  onClose: () => void;
  serviceEntries: ServiceEntry[];
  priceItems: PriceItem[];
  onDelete: (id: string) => void;
  getMedicaoSummary: (contratada?: string, periodo?: { inicio: string; fim: string }) => MedicaoSummary[];
  onExportReport: (config: any) => void;
}

export function ServiceEntriesManager({
  open,
  onClose,
  serviceEntries,
  priceItems,
  onDelete,
  getMedicaoSummary,
  onExportReport,
}: ServiceEntriesManagerProps) {
  const [search, setSearch] = useState('');
  const [filterContratada, setFilterContratada] = useState<string>('all');
  const [filterPeriodo, setFilterPeriodo] = useState({ inicio: '', fim: '' });
  const [view, setView] = useState<'entries' | 'summary'>('entries');

  // Get unique contractors
  const contratadas = [...new Set(serviceEntries.map(e => e.contratada))].sort();

  // Filter entries
  const filteredEntries = serviceEntries.filter(entry => {
    const matchSearch = search === '' || 
      entry.codigo.toLowerCase().includes(search.toLowerCase()) ||
      entry.descricao.toLowerCase().includes(search.toLowerCase()) ||
      entry.localizacao.toLowerCase().includes(search.toLowerCase());
    
    const matchContratada = filterContratada === 'all' || entry.contratada === filterContratada;
    
    const matchPeriodo = 
      (!filterPeriodo.inicio || entry.data >= filterPeriodo.inicio) &&
      (!filterPeriodo.fim || entry.data <= filterPeriodo.fim);
    
    return matchSearch && matchContratada && matchPeriodo;
  });

  // Get summaries
  const summaries = getMedicaoSummary(
    filterContratada === 'all' ? undefined : filterContratada,
    filterPeriodo.inicio && filterPeriodo.fim ? filterPeriodo : undefined
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const totalGeral = filteredEntries.reduce((sum, e) => sum + e.valorTotal, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Memória de Cálculo - Lançamentos de Serviços
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* View Toggle */}
          <div className="flex gap-2">
            <Button
              variant={view === 'entries' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('entries')}
            >
              Lançamentos
            </Button>
            <Button
              variant={view === 'summary' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('summary')}
            >
              Resumo por Empresa
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar código, descrição ou local..."
                className="pl-9"
              />
            </div>
            
            <div className="min-w-[180px]">
              <Label className="text-xs">Contratada</Label>
              <Select value={filterContratada} onValueChange={setFilterContratada}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {contratadas.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[130px]">
              <Label className="text-xs">De</Label>
              <Input
                type="date"
                value={filterPeriodo.inicio}
                onChange={(e) => setFilterPeriodo({ ...filterPeriodo, inicio: e.target.value })}
              />
            </div>

            <div className="min-w-[130px]">
              <Label className="text-xs">Até</Label>
              <Input
                type="date"
                value={filterPeriodo.fim}
                onChange={(e) => setFilterPeriodo({ ...filterPeriodo, fim: e.target.value })}
              />
            </div>
          </div>

          {view === 'entries' ? (
            <>
              {/* Entries Table */}
              <ScrollArea className="h-[350px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px]">Data</TableHead>
                      <TableHead className="w-[80px]">Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[100px] text-right">Qtd</TableHead>
                      <TableHead className="w-[60px]">Un</TableHead>
                      <TableHead className="w-[100px] text-right">P.Unit</TableHead>
                      <TableHead className="w-[110px] text-right">Total</TableHead>
                      <TableHead className="w-[120px]">Contratada</TableHead>
                      <TableHead className="w-[60px]">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          {serviceEntries.length === 0
                            ? 'Nenhum lançamento ainda. Suba um RDA com quantidades de serviço.'
                            : 'Nenhum lançamento encontrado com esse filtro.'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm">{formatDate(entry.data)}</TableCell>
                          <TableCell className="font-mono text-xs font-medium">{entry.codigo}</TableCell>
                          <TableCell className="max-w-[180px] truncate text-sm" title={entry.descricao}>
                            {entry.descricao}
                          </TableCell>
                          <TableCell className="text-right font-mono">{entry.quantidade.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-muted-foreground">{entry.unidade}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(entry.precoUnitario)}</TableCell>
                          <TableCell className="text-right font-mono font-medium">{formatCurrency(entry.valorTotal)}</TableCell>
                          <TableCell className="text-xs truncate max-w-[100px]" title={entry.contratada}>
                            {entry.contratada}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Totals */}
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {filteredEntries.length} lançamento(s)
                </span>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground mr-2">Total:</span>
                  <span className="text-lg font-bold">{formatCurrency(totalGeral)}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Summary View */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {summaries.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhum resumo disponível.
                    </div>
                  ) : (
                    summaries.map((summary, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            <span className="font-semibold">{summary.contratada}</span>
                          </div>
                          <Badge variant="outline" className="text-lg font-bold">
                            {formatCurrency(summary.valorTotal)}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(summary.periodo.inicio)} a {formatDate(summary.periodo.fim)}
                          </span>
                          {summary.obra && <span>Obra: {summary.obra}</span>}
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Código</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="text-right">Qtd Total</TableHead>
                              <TableHead>Un</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Group items by code */}
                            {Object.entries(
                              summary.itens.reduce((acc, item) => {
                                const key = item.codigo;
                                if (!acc[key]) {
                                  acc[key] = {
                                    ...item,
                                    quantidade: 0,
                                    valorTotal: 0,
                                  };
                                }
                                acc[key].quantidade += item.quantidade;
                                acc[key].valorTotal += item.valorTotal;
                                return acc;
                              }, {} as Record<string, ServiceEntry>)
                            ).map(([codigo, item]) => (
                              <TableRow key={codigo}>
                                <TableCell className="font-mono text-sm">{codigo}</TableCell>
                                <TableCell className="text-sm">{item.descricao}</TableCell>
                                <TableCell className="text-right font-mono">
                                  {item.quantidade.toLocaleString('pt-BR')}
                                </TableCell>
                                <TableCell>{item.unidade}</TableCell>
                                <TableCell className="text-right font-mono font-medium">
                                  {formatCurrency(item.valorTotal)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
