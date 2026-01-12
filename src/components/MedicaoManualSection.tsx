import { useState } from 'react';
import { MedicaoManual } from '@/types/activity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

interface MedicaoManualSectionProps {
  medicoes: MedicaoManual[];
  onMedicoesChange: (medicoes: MedicaoManual[]) => void;
}

const parseKm = (value: string): number => {
  // Parse km values like "48,700" or "48.700" to 48.700
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const formatKm = (value: number): string => {
  return value.toFixed(3).replace('.', ',');
};

export function MedicaoManualSection({ medicoes, onMedicoesChange }: MedicaoManualSectionProps) {
  const [entradaAtual, setEntradaAtual] = useState({
    kmInicial: '',
    kmFinal: '',
    largura: '',
    altura: '',
    tonelada: '',
  });

  const calcularDistancia = (kmInicial: string, kmFinal: string): string => {
    const ini = parseKm(kmInicial);
    const fim = parseKm(kmFinal);
    if (ini > 0 && fim > 0 && fim >= ini) {
      const distancia = fim - ini;
      return formatKm(distancia) + ' km';
    }
    return '';
  };

  const distanciaCalculada = calcularDistancia(entradaAtual.kmInicial, entradaAtual.kmFinal);

  const handleAdicionar = () => {
    const novaMedicao: MedicaoManual = {
      id: Date.now().toString(),
      kmInicial: entradaAtual.kmInicial,
      kmFinal: entradaAtual.kmFinal,
      distancia: distanciaCalculada,
      largura: entradaAtual.largura,
      altura: entradaAtual.altura,
      tonelada: entradaAtual.tonelada,
    };

    onMedicoesChange([...medicoes, novaMedicao]);

    // Limpar campos para próxima entrada
    setEntradaAtual({
      kmInicial: '',
      kmFinal: '',
      largura: '',
      altura: '',
      tonelada: '',
    });
  };

  const handleRemover = (id: string) => {
    onMedicoesChange(medicoes.filter(m => m.id !== id));
  };

  const temDadosParaAdicionar = entradaAtual.kmInicial || entradaAtual.kmFinal || 
    entradaAtual.largura || entradaAtual.altura || entradaAtual.tonelada;

  return (
    <div className="space-y-4">
      <div className="p-3 border rounded-lg bg-background space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Adicionar Medição Manual</p>
        
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
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {medicoes.map((medicao) => (
              <div
                key={medicao.id}
                className="flex items-center justify-between p-2 bg-background border rounded text-xs"
              >
                <div className="flex flex-wrap gap-2">
                  {medicao.kmInicial && (
                    <span><strong>Km:</strong> {medicao.kmInicial} → {medicao.kmFinal}</span>
                  )}
                  {medicao.distancia && (
                    <span className="text-primary font-medium">({medicao.distancia})</span>
                  )}
                  {medicao.largura && (
                    <span><strong>L:</strong> {medicao.largura}</span>
                  )}
                  {medicao.altura && (
                    <span><strong>A:</strong> {medicao.altura}</span>
                  )}
                  {medicao.tonelada && (
                    <span><strong>T:</strong> {medicao.tonelada}</span>
                  )}
                </div>
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
