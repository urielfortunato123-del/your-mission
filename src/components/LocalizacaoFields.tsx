import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Localizacao } from '@/types/activity';
import { MapPin } from 'lucide-react';

interface LocalizacaoFieldsProps {
  value: Localizacao;
  onChange: (localizacao: Localizacao) => void;
  compact?: boolean;
}

const defaultLocalizacao: Localizacao = {
  kmInicial: '',
  kmFinal: '',
  estacaInicial: '',
  estacaFinal: '',
  faixa: '',
  lado: '',
  trecho: '',
  segmento: '',
};

export function LocalizacaoFields({ value, onChange, compact = false }: LocalizacaoFieldsProps) {
  // Ensure value is always defined with default values
  const safeValue = value || defaultLocalizacao;
  
  const updateField = (field: keyof Localizacao, newValue: string) => {
    onChange({ ...safeValue, [field]: newValue });
  };

  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Km Inicial</Label>
          <Input
            value={safeValue.kmInicial || ''}
            onChange={(e) => updateField('kmInicial', e.target.value)}
            placeholder="Ex: 172+500"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Km Final</Label>
          <Input
            value={safeValue.kmFinal || ''}
            onChange={(e) => updateField('kmFinal', e.target.value)}
            placeholder="Ex: 173+200"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Faixa</Label>
          <Input
            value={safeValue.faixa || ''}
            onChange={(e) => updateField('faixa', e.target.value)}
            placeholder="Ex: 1, 2"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Lado</Label>
          <Select value={safeValue.lado || ''} onValueChange={(v) => updateField('lado', v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">-</SelectItem>
              <SelectItem value="E">Esquerdo</SelectItem>
              <SelectItem value="D">Direito</SelectItem>
              <SelectItem value="EIXO">Eixo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        LOCALIZAÇÃO DETALHADA
      </h3>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="kmInicial">Km Inicial</Label>
          <Input
            id="kmInicial"
            value={safeValue.kmInicial || ''}
            onChange={(e) => updateField('kmInicial', e.target.value)}
            placeholder="Ex: 172+500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kmFinal">Km Final</Label>
          <Input
            id="kmFinal"
            value={safeValue.kmFinal || ''}
            onChange={(e) => updateField('kmFinal', e.target.value)}
            placeholder="Ex: 173+200"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estacaInicial">Estaca Inicial</Label>
          <Input
            id="estacaInicial"
            value={safeValue.estacaInicial || ''}
            onChange={(e) => updateField('estacaInicial', e.target.value)}
            placeholder="Ex: 1450"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estacaFinal">Estaca Final</Label>
          <Input
            id="estacaFinal"
            value={safeValue.estacaFinal || ''}
            onChange={(e) => updateField('estacaFinal', e.target.value)}
            placeholder="Ex: 1520"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="faixa">Faixa</Label>
          <Input
            id="faixa"
            value={safeValue.faixa || ''}
            onChange={(e) => updateField('faixa', e.target.value)}
            placeholder="Ex: 1, 2, Acost."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lado">Lado</Label>
          <Select value={safeValue.lado || ''} onValueChange={(v) => updateField('lado', v as Localizacao['lado'])}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">-</SelectItem>
              <SelectItem value="E">Esquerdo (E)</SelectItem>
              <SelectItem value="D">Direito (D)</SelectItem>
              <SelectItem value="EIXO">Eixo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="trecho">Trecho</Label>
          <Input
            id="trecho"
            value={safeValue.trecho || ''}
            onChange={(e) => updateField('trecho', e.target.value)}
            placeholder="Ex: SP-079"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="segmento">Segmento</Label>
          <Input
            id="segmento"
            value={safeValue.segmento || ''}
            onChange={(e) => updateField('segmento', e.target.value)}
            placeholder="Ex: Seg. 01"
          />
        </div>
      </div>
    </div>
  );
}

// Utility to format location as string
export function formatLocalizacao(loc?: Localizacao): string {
  if (!loc) return '';
  
  const parts: string[] = [];
  
  if (loc.trecho) parts.push(loc.trecho);
  
  if (loc.kmInicial && loc.kmFinal) {
    parts.push(`Km ${loc.kmInicial} a ${loc.kmFinal}`);
  } else if (loc.kmInicial) {
    parts.push(`Km ${loc.kmInicial}`);
  }
  
  if (loc.estacaInicial && loc.estacaFinal) {
    parts.push(`Est. ${loc.estacaInicial} a ${loc.estacaFinal}`);
  } else if (loc.estacaInicial) {
    parts.push(`Est. ${loc.estacaInicial}`);
  }
  
  if (loc.faixa) parts.push(`Faixa ${loc.faixa}`);
  if (loc.lado) parts.push(`Lado ${loc.lado}`);
  if (loc.segmento) parts.push(loc.segmento);
  
  return parts.join(' | ');
}
