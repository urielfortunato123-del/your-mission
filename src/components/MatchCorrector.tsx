import { useState, useEffect, useMemo } from 'react';
import { PriceItem } from '@/types/pricing';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Search, Link2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExtractedService {
  codigo: string;
  descricaoOriginal: string;
  descricaoPlanilha: string | null;
  quantidade: number;
  unidade: string;
  localizacao?: string;
  confiancaMatch?: string;
}

interface MatchCorrectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ExtractedService | null;
  priceItems: PriceItem[];
  onSaveMatch: (service: ExtractedService, priceItem: PriceItem | null) => void;
  onLearnMatch?: (descricaoOriginal: string, priceItem: PriceItem) => void;
}

const MATCH_HISTORY_KEY = 'memoria-mensal-match-history';

// Load match history from localStorage
const loadMatchHistory = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(MATCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save match history to localStorage
const saveMatchHistory = (history: Record<string, string>) => {
  try {
    localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Erro ao salvar histórico de matches:', e);
  }
};

// Export for use in other components
export const getMatchSuggestion = (descricao: string): string | null => {
  const history = loadMatchHistory();
  const normalized = descricao.toLowerCase().trim();
  
  // Exact match
  if (history[normalized]) return history[normalized];
  
  // Partial match - find keys that are contained or contain the description
  for (const [key, codigo] of Object.entries(history)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return codigo;
    }
  }
  
  return null;
};

export function MatchCorrector({
  open,
  onOpenChange,
  service,
  priceItems,
  onSaveMatch,
  onLearnMatch,
}: MatchCorrectorProps) {
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<PriceItem | null>(null);

  // Reset when service changes
  useEffect(() => {
    if (service) {
      setSearch('');
      // Try to find current match
      if (service.codigo) {
        const current = priceItems.find(p => 
          p.codigo.toUpperCase() === service.codigo.toUpperCase()
        );
        setSelectedItem(current || null);
      } else {
        setSelectedItem(null);
      }
    }
  }, [service, priceItems]);

  // Filter and sort price items
  const filteredItems = useMemo(() => {
    if (!search) return priceItems.slice(0, 50);
    
    const searchLower = search.toLowerCase();
    const searchTerms = searchLower.split(/\s+/).filter(t => t.length > 1);
    
    return priceItems
      .map(item => {
        const codigoMatch = item.codigo.toLowerCase().includes(searchLower);
        const descLower = item.descricao.toLowerCase();
        
        let score = 0;
        if (codigoMatch) score += 100;
        
        searchTerms.forEach(term => {
          if (descLower.includes(term)) score += term.length * 2;
        });
        
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map(({ item }) => item);
  }, [priceItems, search]);

  const handleSave = () => {
    if (!service) return;
    
    // Save match to history for learning
    if (selectedItem && onLearnMatch) {
      onLearnMatch(service.descricaoOriginal, selectedItem);
    }
    
    // Also save to local storage for future suggestions
    if (selectedItem) {
      const history = loadMatchHistory();
      const key = service.descricaoOriginal.toLowerCase().trim();
      history[key] = selectedItem.codigo;
      saveMatchHistory(history);
    }
    
    onSaveMatch(service, selectedItem);
    onOpenChange(false);
  };

  const handleClearMatch = () => {
    setSelectedItem(null);
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Vincular Serviço à Planilha
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Service Info */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
            <Label className="text-xs text-muted-foreground">Serviço extraído do RDA:</Label>
            <p className="font-medium">{service.descricaoOriginal}</p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Qtd: {service.quantidade} {service.unidade}</span>
              {service.localizacao && <span>Local: {service.localizacao}</span>}
              {service.confiancaMatch && (
                <Badge variant={service.confiancaMatch === 'alta' ? 'default' : 'secondary'}>
                  Confiança: {service.confiancaMatch}
                </Badge>
              )}
            </div>
          </div>

          {/* Current Match */}
          {selectedItem && (
            <div className="p-3 border-2 border-primary rounded-lg bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge>{selectedItem.codigo}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {selectedItem.unidade} • R$ {selectedItem.precoUnitario.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{selectedItem.descricao}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearMatch}>
                  Limpar
                </Button>
              </div>
            </div>
          )}

          {/* Search and Select */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-2">
              <Search className="h-3 w-3" />
              Buscar item na planilha de preços:
            </Label>
            <Command className="border rounded-lg">
              <CommandInput 
                placeholder="Digite código ou descrição..." 
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>Nenhum item encontrado</CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-[200px]">
                    {filteredItems.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.codigo}
                        onSelect={() => setSelectedItem(item)}
                        className={cn(
                          "cursor-pointer",
                          selectedItem?.id === item.id && "bg-primary/10"
                        )}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedItem?.id === item.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{item.codigo}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.unidade} • R$ {item.precoUnitario.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate max-w-[400px]">
                            {item.descricao}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          {/* Learning Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <Sparkles className="h-4 w-4" />
            <span>Sua correção será salva para melhorar matches futuros</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" />
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
