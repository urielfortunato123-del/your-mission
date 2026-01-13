import { useState, useMemo } from 'react';
import { MedicaoManual } from '@/types/activity';
import { PriceItem } from '@/types/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Loader2, Link2, AlertTriangle, Check } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MedicaoManualSectionProps {
  medicoes: MedicaoManual[];
  onMedicoesChange: (medicoes: MedicaoManual[]) => void;
  textoAtividade?: string;
  priceItems?: PriceItem[];
  extractedServiceCodes?: string[]; // Códigos já extraídos na seção de serviços
}

const parseKm = (value: string): number => {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const formatKm = (value: number): string => {
  return value.toFixed(3).replace('.', ',');
};

const FAIXA_OPTIONS = ['I', 'II', 'III', 'Acostamento', 'I - II', 'I - II - Acostamento', 'Fora da Faixa de Domínio'];
const SENTIDO_OPTIONS = ['Leste', 'Oeste', 'Norte', 'Sul', 'Ambos'];

export function MedicaoManualSection({ medicoes, onMedicoesChange, textoAtividade, priceItems = [], extractedServiceCodes = [] }: MedicaoManualSectionProps) {
  const [entradaAtual, setEntradaAtual] = useState({
    kmInicial: '',
    kmFinal: '',
    largura: '',
    altura: '',
    tonelada: '',
    faixa: '',
    sentido: '',
    material: '',
    responsavel: '',
    descricao: '',
    codigoServico: '', // Código vinculado à BM
  });

  // Detectar código de serviço vinculado baseado na descrição
  const matchedPriceItem = useMemo(() => {
    if (!entradaAtual.codigoServico) return null;
    return priceItems.find(p => p.codigo === entradaAtual.codigoServico);
  }, [entradaAtual.codigoServico, priceItems]);

  // Verificar se o código já foi lançado na seção de serviços
  const isAlreadyExtracted = useMemo(() => {
    if (!entradaAtual.codigoServico) return false;
    return extractedServiceCodes.includes(entradaAtual.codigoServico);
  }, [entradaAtual.codigoServico, extractedServiceCodes]);

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtractWithAI = async () => {
    if (!textoAtividade || textoAtividade.trim() === '') {
      toast.error('Preencha o campo de atividades antes de extrair medições');
      return;
    }

    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-medicoes', {
        body: { textoAtividade }
      });

      if (error) {
        console.error('Erro ao extrair medições:', error);
        toast.error('Erro ao extrair medições: ' + error.message);
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.medicoes && data.medicoes.length > 0) {
        const novasMedicoes: MedicaoManual[] = data.medicoes.map((m: any) => {
          const kmIni = m.kmInicial || '';
          const kmFim = m.kmFinal || '';
          const distancia = calcularDistanciaFromKm(kmIni, kmFim);
          const area = calcularAreaFromValues(distancia, m.largura || '');
          const volume = calcularVolumeFromValues(distancia, m.largura || '', m.altura || '');
          
          return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            kmInicial: kmIni,
            kmFinal: kmFim,
            distancia,
            largura: m.largura || '',
            altura: m.altura || '',
            tonelada: m.tonelada || '',
            area,
            volume,
            faixa: m.faixa || '',
            sentido: m.sentido || '',
            material: m.material || '',
            responsavel: m.responsavel || '',
            descricao: m.descricao || '',
          };
        });

        onMedicoesChange([...medicoes, ...novasMedicoes]);
        toast.success(`${novasMedicoes.length} medição(ões) extraída(s) com sucesso!`);
      } else {
        toast.info('Nenhuma medição encontrada no texto');
      }
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao processar extração');
    } finally {
      setIsExtracting(false);
    }
  };

  const calcularDistanciaFromKm = (kmInicial: string, kmFinal: string): string => {
    const ini = parseKm(kmInicial);
    const fim = parseKm(kmFinal);
    if (ini > 0 && fim > 0 && fim >= ini) {
      const distancia = fim - ini;
      return formatKm(distancia) + ' km';
    }
    return '';
  };

  const calcularAreaFromValues = (distanciaStr: string, larguraStr: string): string => {
    const distanciaKm = parseNumericValueLocal(distanciaStr);
    const larguraM = parseNumericValueLocal(larguraStr);
    if (distanciaKm > 0 && larguraM > 0) {
      const distanciaM = distanciaKm * 1000;
      const area = distanciaM * larguraM;
      return area.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' m²';
    }
    return '';
  };

  const calcularVolumeFromValues = (distanciaStr: string, larguraStr: string, alturaStr: string): string => {
    const distanciaKm = parseNumericValueLocal(distanciaStr);
    const larguraM = parseNumericValueLocal(larguraStr);
    const alturaM = parseNumericValueLocal(alturaStr);
    if (distanciaKm > 0 && larguraM > 0 && alturaM > 0) {
      const distanciaM = distanciaKm * 1000;
      const volume = distanciaM * larguraM * alturaM;
      return volume.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' m³';
    }
    return '';
  };

  const parseNumericValueLocal = (value: string): number => {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const parseNumericValue = (value: string): number => {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const calcularDistancia = (kmInicial: string, kmFinal: string): string => {
    const ini = parseKm(kmInicial);
    const fim = parseKm(kmFinal);
    if (ini > 0 && fim > 0 && fim >= ini) {
      const distancia = fim - ini;
      return formatKm(distancia) + ' km';
    }
    return '';
  };

  const calcularArea = (distanciaStr: string, larguraStr: string): string => {
    // Distância em km, largura em m -> área em m²
    const distanciaKm = parseNumericValue(distanciaStr);
    const larguraM = parseNumericValue(larguraStr);
    if (distanciaKm > 0 && larguraM > 0) {
      const distanciaM = distanciaKm * 1000; // converter km para m
      const area = distanciaM * larguraM;
      return area.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' m²';
    }
    return '';
  };

  const calcularVolume = (distanciaStr: string, larguraStr: string, alturaStr: string): string => {
    // Distância em km, largura e altura em m -> volume em m³
    const distanciaKm = parseNumericValue(distanciaStr);
    const larguraM = parseNumericValue(larguraStr);
    const alturaM = parseNumericValue(alturaStr);
    if (distanciaKm > 0 && larguraM > 0 && alturaM > 0) {
      const distanciaM = distanciaKm * 1000;
      const volume = distanciaM * larguraM * alturaM;
      return volume.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' m³';
    }
    return '';
  };

  const distanciaCalculada = calcularDistancia(entradaAtual.kmInicial, entradaAtual.kmFinal);
  const areaCalculada = calcularArea(distanciaCalculada, entradaAtual.largura);
  const volumeCalculado = calcularVolume(distanciaCalculada, entradaAtual.largura, entradaAtual.altura);

  const handleAdicionar = () => {
    // Calcular quantidade baseado no tipo de medição (área, volume, tonelada ou distância)
    let quantidade = 0;
    if (entradaAtual.tonelada) {
      quantidade = parseNumericValueLocal(entradaAtual.tonelada);
    } else if (volumeCalculado) {
      quantidade = parseNumericValueLocal(volumeCalculado);
    } else if (areaCalculada) {
      quantidade = parseNumericValueLocal(areaCalculada);
    } else if (distanciaCalculada) {
      quantidade = parseNumericValueLocal(distanciaCalculada) * 1000; // km para m
    }

    const precoUnit = matchedPriceItem?.precoUnitario || 0;
    const valorTot = quantidade * precoUnit;

    const novaMedicao: MedicaoManual = {
      id: Date.now().toString(),
      kmInicial: entradaAtual.kmInicial,
      kmFinal: entradaAtual.kmFinal,
      distancia: distanciaCalculada,
      largura: entradaAtual.largura,
      altura: entradaAtual.altura,
      tonelada: entradaAtual.tonelada,
      area: areaCalculada,
      volume: volumeCalculado,
      faixa: entradaAtual.faixa,
      sentido: entradaAtual.sentido,
      material: entradaAtual.material,
      responsavel: entradaAtual.responsavel,
      descricao: entradaAtual.descricao,
      codigoServico: entradaAtual.codigoServico,
      precoUnitario: precoUnit,
      valorTotal: valorTot,
      unidade: matchedPriceItem?.unidade || '',
    };

    onMedicoesChange([...medicoes, novaMedicao]);

    setEntradaAtual({
      kmInicial: '',
      kmFinal: '',
      largura: '',
      altura: '',
      tonelada: '',
      faixa: '',
      sentido: '',
      material: '',
      responsavel: '',
      descricao: '',
      codigoServico: '',
    });
  };

  const handleRemover = (id: string) => {
    onMedicoesChange(medicoes.filter(m => m.id !== id));
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const temDadosParaAdicionar = entradaAtual.kmInicial || entradaAtual.kmFinal || 
    entradaAtual.largura || entradaAtual.altura || entradaAtual.tonelada ||
    entradaAtual.faixa || entradaAtual.sentido || entradaAtual.material ||
    entradaAtual.responsavel || entradaAtual.descricao;

  return (
    <div className="space-y-4">
      {/* Botão de extração via IA */}
      {textoAtividade && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExtractWithAI}
          disabled={isExtracting}
          className="w-full border-primary/50 text-primary hover:bg-primary/10"
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Extraindo medições...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Extrair Medições do Texto com IA
            </>
          )}
        </Button>
      )}

      <div className="p-3 border rounded-lg bg-background space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Adicionar Medição Manual</p>
        
        {/* Primeira linha: KM, Distância, Medidas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Km Inicial</Label>
            <Input
              value={entradaAtual.kmInicial}
              onChange={(e) => setEntradaAtual(prev => ({ ...prev, kmInicial: e.target.value }))}
              placeholder="48,700"
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Km Final</Label>
            <Input
              value={entradaAtual.kmFinal}
              onChange={(e) => setEntradaAtual(prev => ({ ...prev, kmFinal: e.target.value }))}
              placeholder="49,000"
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Distância (auto)</Label>
            <Input
              value={distanciaCalculada}
              readOnly
              placeholder="0,300 km"
              className="h-8 text-sm bg-muted/50"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Largura</Label>
            <Input
              value={entradaAtual.largura}
              onChange={(e) => setEntradaAtual(prev => ({ ...prev, largura: e.target.value }))}
              placeholder="3,5 m"
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Altura</Label>
            <Input
              value={entradaAtual.altura}
              onChange={(e) => setEntradaAtual(prev => ({ ...prev, altura: e.target.value }))}
              placeholder="0,05 m"
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Tonelada</Label>
            <Input
              value={entradaAtual.tonelada}
              onChange={(e) => setEntradaAtual(prev => ({ ...prev, tonelada: e.target.value }))}
              placeholder="240 ton"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Campos calculados: Área e Volume */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Área (auto)</Label>
            <Input
              value={areaCalculada}
              readOnly
              placeholder="Distância × Largura"
              className="h-8 text-sm bg-muted/50 text-primary font-medium"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Volume (auto)</Label>
            <Input
              value={volumeCalculado}
              readOnly
              placeholder="Área × Altura"
              className="h-8 text-sm bg-muted/50 text-primary font-medium"
            />
          </div>
        </div>

        {/* Segunda linha: Faixa, Sentido, Responsável, Material */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Faixa</Label>
            <Select
              value={entradaAtual.faixa}
              onValueChange={(value) => setEntradaAtual(prev => ({ ...prev, faixa: value }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {FAIXA_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Sentido</Label>
            <Select
              value={entradaAtual.sentido}
              onValueChange={(value) => setEntradaAtual(prev => ({ ...prev, sentido: value }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {SENTIDO_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Responsável</Label>
            <Input
              value={entradaAtual.responsavel}
              onChange={(e) => setEntradaAtual(prev => ({ ...prev, responsavel: e.target.value }))}
              placeholder="Ex: Escobar"
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Material</Label>
            <Input
              value={entradaAtual.material}
              onChange={(e) => setEntradaAtual(prev => ({ ...prev, material: e.target.value }))}
              placeholder="Ex: C.A.U.Q. EGL"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Terceira linha: Descrição e Código de Serviço */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Descrição da Atividade</Label>
            <Input
              value={entradaAtual.descricao}
              onChange={(e) => setEntradaAtual(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Ex: Fresagem, recomposição e pintura horizontal"
              className="h-8 text-sm"
            />
          </div>
          
          {priceItems.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Código BM
              </Label>
              <Select
                value={entradaAtual.codigoServico || "__none__"}
                onValueChange={(value) => setEntradaAtual(prev => ({ ...prev, codigoServico: value === "__none__" ? "" : value }))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Vincular..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {priceItems.slice(0, 100).map(item => (
                    <SelectItem key={item.id} value={item.codigo}>
                      <span className="font-mono text-xs">{item.codigo}</span>
                      <span className="text-xs text-muted-foreground ml-1 truncate">
                        - {item.descricao.substring(0, 30)}...
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Indicador de vínculo e alerta de duplicação */}
        {entradaAtual.codigoServico && entradaAtual.codigoServico !== "__none__" && (
          <div className="space-y-2">
            {matchedPriceItem && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/30">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                  Vinculado: {matchedPriceItem.codigo} - {matchedPriceItem.descricao.substring(0, 50)}...
                </span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {matchedPriceItem.unidade} | R$ {matchedPriceItem.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Badge>
              </div>
            )}
            
            {isAlreadyExtracted && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  ⚠️ Este código já foi lançado na seção "Lançamento de Serviços" acima. 
                  Verifique se não está duplicando!
                </span>
              </div>
            )}
          </div>
        )}
        
        <Button
          type="button"
          size="sm"
          onClick={handleAdicionar}
          disabled={!temDadosParaAdicionar}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Medição
        </Button>
      </div>

      {/* Lista de medições adicionadas */}
      {medicoes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Medições Adicionadas ({medicoes.length})
          </p>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {medicoes.map((medicao) => (
              <Collapsible 
                key={medicao.id} 
                open={expandedItems.includes(medicao.id)}
                onOpenChange={() => toggleExpand(medicao.id)}
              >
                <div className="bg-background border rounded text-xs">
                  <div className="flex items-center justify-between p-2">
                    <div className="flex flex-wrap gap-2 items-center flex-1">
                      {medicao.codigoServico && (
                        <Badge variant="secondary" className="text-xs font-mono bg-blue-500/10 text-blue-600 border-blue-500/30">
                          {medicao.codigoServico}
                        </Badge>
                      )}
                      {medicao.descricao && (
                        <span className="font-semibold text-primary">{medicao.descricao}</span>
                      )}
                      {medicao.kmInicial && (
                        <span><strong>Km:</strong> {medicao.kmInicial} → {medicao.kmFinal}</span>
                      )}
                      {medicao.distancia && (
                        <span className="text-primary font-medium">({medicao.distancia})</span>
                      )}
                      {medicao.tonelada && (
                        <span><strong>T:</strong> {medicao.tonelada}</span>
                      )}
                      {medicao.valorTotal && medicao.valorTotal > 0 && (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30 ml-auto">
                          R$ {medicao.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                        >
                          {expandedItems.includes(medicao.id) ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleRemover(medicao.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <CollapsibleContent>
                    <div className="px-2 pb-2 pt-1 border-t bg-muted/30 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {medicao.area && (
                        <span className="text-primary"><strong>Área:</strong> {medicao.area}</span>
                      )}
                      {medicao.volume && (
                        <span className="text-primary"><strong>Volume:</strong> {medicao.volume}</span>
                      )}
                      {medicao.faixa && (
                        <span><strong>Faixa:</strong> {medicao.faixa}</span>
                      )}
                      {medicao.sentido && (
                        <span><strong>Sentido:</strong> {medicao.sentido}</span>
                      )}
                      {medicao.responsavel && (
                        <span><strong>Resp:</strong> {medicao.responsavel}</span>
                      )}
                      {medicao.material && (
                        <span><strong>Material:</strong> {medicao.material}</span>
                      )}
                      {medicao.largura && (
                        <span><strong>L:</strong> {medicao.largura}</span>
                      )}
                      {medicao.altura && (
                        <span><strong>A:</strong> {medicao.altura}</span>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
