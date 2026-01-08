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

  // Detect column indices from header row
  const detectBMColumns = (rows: any[][]): { 
    codigoCol: number; 
    descricaoCol: number; 
    unidadeCol: number; 
    qtdeCol: number;
    puCol: number; 
    valorCol: number;
    headerRowIndex: number;
  } | null => {
    // Look for header row with typical BM column names
    const headerPatterns = {
      codigo: /^(código|codigo|cod|item|id)$/i,
      descricao: /^(descrição|descricao|desc|serviço|servico|atividade)$/i,
      unidade: /^(un|und|unidade|unit)$/i,
      qtde: /^(qtde|quantidade|quant|qt)$/i,
      pu: /^(pu|preço\s*unit|preco\s*unit|valor\s*unit|p\.u\.)$/i,
      valor: /^(valor|total|preço|preco)$/i,
    };

    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (!row) continue;

      // Convert row to strings for pattern matching
      const cells = row.map(c => String(c || '').trim());
      
      // Check if this looks like a header row (has multiple matching patterns)
      let codigoCol = -1, descricaoCol = -1, unidadeCol = -1, qtdeCol = -1, puCol = -1, valorCol = -1;
      
      cells.forEach((cell, idx) => {
        if (headerPatterns.codigo.test(cell)) codigoCol = idx;
        if (headerPatterns.descricao.test(cell) || cell.includes('DESCRIÇÃO') || cell.includes('SERVIÇO')) descricaoCol = idx;
        if (headerPatterns.unidade.test(cell)) unidadeCol = idx;
        if (headerPatterns.qtde.test(cell)) qtdeCol = idx;
        if (headerPatterns.pu.test(cell) || cell === 'PU') puCol = idx;
        if (headerPatterns.valor.test(cell) && !cell.includes('UNIT')) valorCol = idx;
      });

      // Need at least codigo, descricao, and one of (pu or valor)
      if (codigoCol >= 0 && descricaoCol >= 0 && (puCol >= 0 || valorCol >= 0)) {
        return { 
          codigoCol, 
          descricaoCol, 
          unidadeCol: unidadeCol >= 0 ? unidadeCol : descricaoCol + 1, 
          qtdeCol: qtdeCol >= 0 ? qtdeCol : descricaoCol + 2,
          puCol: puCol >= 0 ? puCol : valorCol - 1, 
          valorCol: valorCol >= 0 ? valorCol : puCol + 1,
          headerRowIndex: i 
        };
      }
    }

    // Fallback: detect BM format by looking for typical patterns
    // BM format: Código | Linha | ID | DESCRIÇÃO SERVIÇO | UN | QTDE | PU | VALOR
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const row = rows[i];
      if (!row) continue;
      
      const cells = row.map(c => String(c || '').trim().toUpperCase());
      
      // Look for BM characteristic header
      if (cells.some(c => c.includes('DESCRIÇÃO SERVIÇO') || c.includes('DESCRICAO SERVICO'))) {
        return {
          codigoCol: 0,
          descricaoCol: 3,
          unidadeCol: 4,
          qtdeCol: 5,
          puCol: 6,
          valorCol: 7,
          headerRowIndex: i
        };
      }
    }

    return null;
  };

  // Parse price value from cell
  const parsePrice = (value: any): number => {
    if (typeof value === 'number') return value;
    const str = String(value || '0')
      .replace(/R\$\s*/g, '')
      .replace(/\./g, '')  // Remove thousand separators
      .replace(',', '.')   // Convert decimal comma
      .replace(/[^\d.-]/g, '');
    return parseFloat(str) || 0;
  };

  // Check if code looks like a valid service code (e.g., S6045, CS5500, BSO-01)
  const isValidServiceCode = (code: string): boolean => {
    const normalized = code.trim().toUpperCase();
    if (!normalized || normalized.length < 2) return false;
    // Must start with letter and have letters+numbers
    return /^[A-Z]{1,4}[\-\s]?\d/.test(normalized);
  };

  // Import price items from Excel/CSV (BM format)
  const importPriceSheet = useCallback((file: File): Promise<{ added: number; errors: string[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const errors: string[] = [];
          const newItems: PriceItem[] = [];
          const seenCodes = new Set<string>();
          
          // Process all sheets
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            // Detect column structure
            const columns = detectBMColumns(jsonData);
            
            if (!columns) {
              // Fallback to simple format: Codigo | Descricao | UN | Preco
              for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length < 2) continue;
                
                const codigo = String(row[0] || '').trim().toUpperCase();
                const descricao = String(row[1] || '').trim();
                const unidade = String(row[2] || 'UN').trim();
                const preco = parsePrice(row[3]);
                
                if (!codigo || !descricao) continue;
                if (seenCodes.has(codigo)) continue;
                
                seenCodes.add(codigo);
                newItems.push({
                  id: crypto.randomUUID(),
                  codigo,
                  descricao,
                  unidade: unidade || 'UN',
                  precoUnitario: preco,
                  categoria: sheetName !== 'Sheet1' ? sheetName : '',
                  fonte: '',
                  createdAt: new Date().toISOString(),
                });
              }
              return;
            }

            // Process rows using detected columns
            for (let i = columns.headerRowIndex + 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!row || row.length < columns.codigoCol) continue;
              
              const codigo = String(row[columns.codigoCol] || '').trim().toUpperCase();
              
              // Skip non-service rows
              if (!isValidServiceCode(codigo)) continue;
              
              const descricao = String(row[columns.descricaoCol] || '').trim();
              if (!descricao || descricao.length < 3) continue;
              
              const unidade = String(row[columns.unidadeCol] || 'UN').trim().toUpperCase();
              const preco = parsePrice(row[columns.puCol]);
              
              // Skip duplicates
              if (seenCodes.has(codigo)) continue;
              seenCodes.add(codigo);
              
              newItems.push({
                id: crypto.randomUUID(),
                codigo,
                descricao,
                unidade: unidade || 'UN',
                precoUnitario: preco,
                categoria: sheetName !== 'Sheet1' ? sheetName : '',
                fonte: 'BM',
                createdAt: new Date().toISOString(),
              });
            }
          });
          
          if (newItems.length === 0) {
            errors.push('Nenhum item encontrado. Verifique o formato da planilha.');
          }
          
          // Merge with existing (update by codigo)
          const existingMap = new Map(priceItems.map(p => [p.codigo, p]));
          newItems.forEach(item => {
            existingMap.set(item.codigo, item);
          });
          
          savePriceItems(Array.from(existingMap.values()));
          resolve({ added: newItems.length, errors });
        } catch (error) {
          console.error('Erro ao importar planilha:', error);
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
    if (!codigo) return null;
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

  // Find price item by description (semantic match with keywords)
  const findPriceByDescription = useCallback((descricao: string): PriceItem | null => {
    if (!descricao || descricao.length < 3) return null;
    
    const normalized = descricao.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
    
    if (normalized.length === 0) return null;
    
    // Score each price item by keyword matches
    let bestMatch: PriceItem | null = null;
    let bestScore = 0;
    
    priceItems.forEach(item => {
      const itemDesc = item.descricao.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ');
      
      let score = 0;
      normalized.forEach(keyword => {
        if (itemDesc.includes(keyword)) {
          // Longer keywords are more significant
          score += keyword.length;
        }
      });
      
      // Boost if unidade matches
      const inputHasM2 = descricao.toLowerCase().includes('m²') || descricao.toLowerCase().includes('m2');
      const inputHasM3 = descricao.toLowerCase().includes('m³') || descricao.toLowerCase().includes('m3');
      if (inputHasM2 && item.unidade.toLowerCase().includes('m²')) score += 5;
      if (inputHasM3 && item.unidade.toLowerCase().includes('m³')) score += 5;
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    });
    
    // Minimum threshold for match
    return bestScore >= 6 ? bestMatch : null;
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

  // Clear only price items
  const clearPriceItems = useCallback(() => {
    savePriceItems([]);
  }, [savePriceItems]);

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
    findPriceByDescription,
    clearPriceItems,
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
