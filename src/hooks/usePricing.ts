import { useState, useEffect, useCallback } from 'react';
import { PriceItem, ServiceEntry, MedicaoSummary } from '@/types/pricing';
import * as XLSX from 'xlsx';

const PRICE_STORAGE_KEY = 'memoria-mensal-precos';
const SERVICE_STORAGE_KEY = 'memoria-mensal-servicos';

export function usePricing() {
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage
  useEffect(() => {
    const storedPrices = localStorage.getItem(PRICE_STORAGE_KEY);
    const storedServices = localStorage.getItem(SERVICE_STORAGE_KEY);
    
    if (storedPrices) {
      try {
        setPriceItems(JSON.parse(storedPrices));
      } catch (e) {
        console.error('Erro ao carregar planilha de preços:', e);
      }
    }
    
    if (storedServices) {
      try {
        setServiceEntries(JSON.parse(storedServices));
      } catch (e) {
        console.error('Erro ao carregar lançamentos:', e);
      }
    }
    
    setIsLoading(false);
  }, []);

  // Save price items
  const savePriceItems = useCallback((items: PriceItem[]) => {
    setPriceItems(items);
    localStorage.setItem(PRICE_STORAGE_KEY, JSON.stringify(items));
  }, []);

  // Save service entries
  const saveServiceEntries = useCallback((entries: ServiceEntry[]) => {
    setServiceEntries(entries);
    localStorage.setItem(SERVICE_STORAGE_KEY, JSON.stringify(entries));
  }, []);

  // Import price items from Excel/CSV
  const importPriceSheet = useCallback((file: File): Promise<{ added: number; errors: string[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          const errors: string[] = [];
          const newItems: PriceItem[] = [];
          
          // Skip header row
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            // Try to find columns by common names
            const codigo = String(row[0] || '').trim();
            const descricao = String(row[1] || '').trim();
            const unidade = String(row[2] || '').trim();
            const precoStr = String(row[3] || '0').replace(',', '.').replace(/[^\d.-]/g, '');
            const preco = parseFloat(precoStr) || 0;
            const categoria = String(row[4] || '').trim();
            const fonte = String(row[5] || '').trim();
            
            if (!codigo) {
              errors.push(`Linha ${i + 1}: código vazio`);
              continue;
            }
            
            if (!descricao) {
              errors.push(`Linha ${i + 1}: descrição vazia`);
              continue;
            }
            
            newItems.push({
              id: crypto.randomUUID(),
              codigo: codigo.toUpperCase(),
              descricao,
              unidade: unidade || 'un',
              precoUnitario: preco,
              categoria,
              fonte,
              createdAt: new Date().toISOString(),
            });
          }
          
          // Merge with existing (update by codigo)
          const existingMap = new Map(priceItems.map(p => [p.codigo, p]));
          newItems.forEach(item => {
            existingMap.set(item.codigo, item);
          });
          
          savePriceItems(Array.from(existingMap.values()));
          resolve({ added: newItems.length, errors });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  }, [priceItems, savePriceItems]);

  // Add single price item
  const addPriceItem = useCallback((item: Omit<PriceItem, 'id' | 'createdAt'>) => {
    const newItem: PriceItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    savePriceItems([...priceItems, newItem]);
    return newItem;
  }, [priceItems, savePriceItems]);

  // Update price item
  const updatePriceItem = useCallback((id: string, updates: Partial<PriceItem>) => {
    const updated = priceItems.map(p => p.id === id ? { ...p, ...updates } : p);
    savePriceItems(updated);
  }, [priceItems, savePriceItems]);

  // Delete price item
  const deletePriceItem = useCallback((id: string) => {
    savePriceItems(priceItems.filter(p => p.id !== id));
  }, [priceItems, savePriceItems]);

  // Find price item by code (fuzzy match)
  const findPriceByCode = useCallback((codigo: string): PriceItem | null => {
    const normalized = codigo.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Exact match first
    const exact = priceItems.find(p => 
      p.codigo.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalized
    );
    if (exact) return exact;
    
    // Partial match
    const partial = priceItems.find(p => 
      p.codigo.toUpperCase().includes(normalized) || 
      normalized.includes(p.codigo.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    );
    return partial || null;
  }, [priceItems]);

  // Add service entry
  const addServiceEntry = useCallback((entry: Omit<ServiceEntry, 'id' | 'createdAt'>) => {
    const newEntry: ServiceEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    saveServiceEntries([...serviceEntries, newEntry]);
    return newEntry;
  }, [serviceEntries, saveServiceEntries]);

  // Add multiple service entries
  const addServiceEntries = useCallback((entries: Omit<ServiceEntry, 'id' | 'createdAt'>[]) => {
    const newEntries = entries.map(entry => ({
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }));
    saveServiceEntries([...serviceEntries, ...newEntries]);
    return newEntries;
  }, [serviceEntries, saveServiceEntries]);

  // Delete service entry
  const deleteServiceEntry = useCallback((id: string) => {
    saveServiceEntries(serviceEntries.filter(s => s.id !== id));
  }, [serviceEntries, saveServiceEntries]);

  // Delete all entries for an activity
  const deleteEntriesByActivity = useCallback((activityId: string) => {
    saveServiceEntries(serviceEntries.filter(s => s.activityId !== activityId));
  }, [serviceEntries, saveServiceEntries]);

  // Get entries by contractor
  const getEntriesByContratada = useCallback((contratada: string): ServiceEntry[] => {
    return serviceEntries.filter(s => 
      s.contratada.toLowerCase().includes(contratada.toLowerCase())
    );
  }, [serviceEntries]);

  // Get entries by date range
  const getEntriesByPeriod = useCallback((inicio: string, fim: string): ServiceEntry[] => {
    return serviceEntries.filter(s => s.data >= inicio && s.data <= fim);
  }, [serviceEntries]);

  // Get measurement summary
  const getMedicaoSummary = useCallback((
    contratada?: string, 
    periodo?: { inicio: string; fim: string }
  ): MedicaoSummary[] => {
    let filtered = [...serviceEntries];
    
    if (contratada) {
      filtered = filtered.filter(s => 
        s.contratada.toLowerCase().includes(contratada.toLowerCase())
      );
    }
    
    if (periodo) {
      filtered = filtered.filter(s => s.data >= periodo.inicio && s.data <= periodo.fim);
    }
    
    // Group by contractor
    const byContratada = new Map<string, ServiceEntry[]>();
    filtered.forEach(entry => {
      const key = entry.contratada;
      if (!byContratada.has(key)) byContratada.set(key, []);
      byContratada.get(key)!.push(entry);
    });
    
    const summaries: MedicaoSummary[] = [];
    byContratada.forEach((itens, contratadaName) => {
      const valorTotal = itens.reduce((sum, i) => sum + i.valorTotal, 0);
      const dates = itens.map(i => i.data).sort();
      
      summaries.push({
        contratada: contratadaName,
        periodo: {
          inicio: periodo?.inicio || dates[0] || '',
          fim: periodo?.fim || dates[dates.length - 1] || '',
        },
        itens,
        valorTotal,
        obra: itens[0]?.obra,
        fiscal: itens[0]?.fiscal,
      });
    });
    
    return summaries.sort((a, b) => b.valorTotal - a.valorTotal);
  }, [serviceEntries]);

  // Clear all data
  const clearAllPricing = useCallback(() => {
    savePriceItems([]);
    saveServiceEntries([]);
  }, [savePriceItems, saveServiceEntries]);

  // Export data
  const exportPricing = useCallback(() => {
    return {
      priceItems,
      serviceEntries,
    };
  }, [priceItems, serviceEntries]);

  // Import data
  const importPricing = useCallback((data: { priceItems?: PriceItem[]; serviceEntries?: ServiceEntry[] }) => {
    if (data.priceItems) savePriceItems(data.priceItems);
    if (data.serviceEntries) saveServiceEntries(data.serviceEntries);
  }, [savePriceItems, saveServiceEntries]);

  return {
    priceItems,
    serviceEntries,
    isLoading,
    // Price items
    importPriceSheet,
    addPriceItem,
    updatePriceItem,
    deletePriceItem,
    findPriceByCode,
    // Service entries
    addServiceEntry,
    addServiceEntries,
    deleteServiceEntry,
    deleteEntriesByActivity,
    getEntriesByContratada,
    getEntriesByPeriod,
    getMedicaoSummary,
    // General
    clearAllPricing,
    exportPricing,
    importPricing,
  };
}
