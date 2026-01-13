import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PriceItem, ServiceEntry, MedicaoSummary } from '@/types/pricing';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const MAX_SHEETS_PER_CONTRATADA = 20;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface PriceSheetFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  contratada: string;
  contrato: string | null;
  items_count: number;
  uploaded_at: string;
}

export function useSupabasePricing() {
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [sheetFiles, setSheetFiles] = useState<PriceSheetFile[]>([]);
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load price items
      const { data: items, error: itemsError } = await supabase
        .from('price_items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (itemsError) throw itemsError;
      
      // Map to PriceItem format
      const mappedItems: PriceItem[] = (items || []).map(item => ({
        id: item.id,
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        precoUnitario: Number(item.preco_unitario),
        categoria: item.categoria || undefined,
        fonte: item.fonte || undefined,
        contratada: item.contratada || undefined,
        contrato: item.contrato || undefined,
        createdAt: item.created_at,
      }));
      
      setPriceItems(mappedItems);

      // Load sheet files
      const { data: files, error: filesError } = await supabase
        .from('price_sheet_files')
        .select('*')
        .order('uploaded_at', { ascending: false });
      
      if (filesError) throw filesError;
      setSheetFiles(files || []);

      // Load service entries
      const { data: entries, error: entriesError } = await supabase
        .from('service_entries')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!entriesError && entries) {
        const mappedEntries: ServiceEntry[] = entries.map(e => ({
          id: e.id,
          activityId: e.activity_id,
          priceItemId: e.price_item_id || '',
          codigo: e.codigo,
          descricao: e.descricao,
          quantidade: Number(e.quantidade),
          unidade: e.unidade,
          precoUnitario: Number(e.preco_unitario),
          valorTotal: Number(e.valor_total),
          data: e.data,
          contratada: e.contratada || '',
          fiscal: e.fiscal || '',
          obra: e.obra || '',
          localizacao: e.localizacao || '',
          kmInicial: e.km_inicial || undefined,
          kmFinal: e.km_final || undefined,
          estacaInicial: e.estaca_inicial || undefined,
          estacaFinal: e.estaca_final || undefined,
          faixa: e.faixa || undefined,
          lado: e.lado as ServiceEntry['lado'],
          trecho: e.trecho || undefined,
          segmento: e.segmento || undefined,
          observacoes: e.observacoes || undefined,
          createdAt: e.created_at,
        }));
        setServiceEntries(mappedEntries);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Detect contractor name from BM header
  const detectContratadaFromBM = (rows: any[][]): { contratada: string; contrato: string } => {
    let contratada = '';
    let contrato = '';
    
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const row = rows[i];
      if (!row) continue;
      
      const rowText = row.map(c => String(c || '')).join(' ');
      
      const contratadaMatch = rowText.match(/Contratada[:\s]*([A-ZÀ-Ú][A-ZÀ-Ú\s\-\.]+(?:LTDA|S\.?A\.?|EPP|ME|EIRELI)?)/i);
      if (contratadaMatch) {
        contratada = contratadaMatch[1].trim();
      }
      
      const contratoMatch = rowText.match(/(?:Contrato|Nº Contrato)[:\s]*(\d{10,})/i);
      if (contratoMatch) {
        contrato = contratoMatch[1].trim();
      }
      
      if (contratada && contrato) break;
    }
    
    return { contratada, contrato };
  };

  // Detect BM column structure
  const detectBMColumns = (rows: any[][]): { 
    codigoCol: number; descricaoCol: number; unidadeCol: number; 
    qtdeCol: number; puCol: number; valorCol: number; headerRowIndex: number;
  } | null => {
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (!row) continue;
      const cells = row.map(c => String(c || '').trim().toUpperCase());
      
      if (cells.some(c => c.includes('DESCRIÇÃO SERVIÇO') || c.includes('DESCRICAO SERVICO'))) {
        return { codigoCol: 0, descricaoCol: 3, unidadeCol: 4, qtdeCol: 5, puCol: 6, valorCol: 7, headerRowIndex: i };
      }
    }
    
    // Try generic header detection
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (!row) continue;
      const cells = row.map(c => String(c || '').trim());
      
      let codigoCol = -1, descricaoCol = -1, unidadeCol = -1, puCol = -1, valorCol = -1;
      
      cells.forEach((cell, idx) => {
        const upper = cell.toUpperCase();
        if (/^(CÓDIGO|CODIGO|COD|ITEM|ID)$/.test(upper)) codigoCol = idx;
        if (upper.includes('DESCRIÇÃO') || upper.includes('SERVIÇO')) descricaoCol = idx;
        if (/^(UN|UND|UNIDADE)$/.test(upper)) unidadeCol = idx;
        if (upper === 'PU' || upper.includes('PREÇO UNIT')) puCol = idx;
        if (upper === 'VALOR' && !upper.includes('UNIT')) valorCol = idx;
      });

      if (codigoCol >= 0 && descricaoCol >= 0 && (puCol >= 0 || valorCol >= 0)) {
        return { 
          codigoCol, descricaoCol, 
          unidadeCol: unidadeCol >= 0 ? unidadeCol : descricaoCol + 1,
          qtdeCol: descricaoCol + 2,
          puCol: puCol >= 0 ? puCol : valorCol - 1, 
          valorCol: valorCol >= 0 ? valorCol : puCol + 1,
          headerRowIndex: i 
        };
      }
    }
    return null;
  };

  const parsePrice = (value: any): number => {
    if (typeof value === 'number') return value;
    const str = String(value || '0').replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    return parseFloat(str) || 0;
  };

  const isValidServiceCode = (code: string): boolean => {
    const normalized = code.trim().toUpperCase();
    if (!normalized || normalized.length < 2) return false;
    return /^[A-Z]{1,4}[\-\s]?\d/.test(normalized);
  };

  // Import BM price sheet with file upload to storage
  const importPriceSheet = useCallback(async (file: File): Promise<{ added: number; errors: string[]; contratada?: string; contrato?: string }> => {
    const errors: string[] = [];
    
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Parse file first to detect contractor
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
    
    let detectedContratada = '';
    let detectedContrato = '';
    const newItems: Omit<PriceItem, 'id' | 'createdAt'>[] = [];
    const seenCodes = new Set<string>();

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (!detectedContratada) {
        const bmInfo = detectContratadaFromBM(jsonData);
        detectedContratada = bmInfo.contratada;
        detectedContrato = bmInfo.contrato;
      }
      
      const columns = detectBMColumns(jsonData);
      
      if (!columns) {
        // Fallback simple format
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 2) continue;
          
          const codigo = String(row[0] || '').trim().toUpperCase();
          const descricao = String(row[1] || '').trim();
          if (!codigo || !descricao || seenCodes.has(codigo)) continue;
          
          seenCodes.add(codigo);
          newItems.push({
            codigo, descricao,
            unidade: String(row[2] || 'UN').trim(),
            precoUnitario: parsePrice(row[3]),
            categoria: sheetName !== 'Sheet1' ? sheetName : undefined,
            contratada: detectedContratada,
            contrato: detectedContrato,
          });
        }
        return;
      }

      for (let i = columns.headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < columns.codigoCol) continue;
        
        const codigo = String(row[columns.codigoCol] || '').trim().toUpperCase();
        if (!isValidServiceCode(codigo)) continue;
        
        const descricao = String(row[columns.descricaoCol] || '').trim();
        if (!descricao || descricao.length < 3 || seenCodes.has(codigo)) continue;
        
        seenCodes.add(codigo);
        newItems.push({
          codigo, descricao,
          unidade: String(row[columns.unidadeCol] || 'UN').trim().toUpperCase(),
          precoUnitario: parsePrice(row[columns.puCol]),
          categoria: sheetName !== 'Sheet1' ? sheetName : undefined,
          fonte: 'BM',
          contratada: detectedContratada,
          contrato: detectedContrato,
        });
      }
    });

    if (newItems.length === 0) {
      throw new Error('Nenhum item encontrado. Verifique o formato da planilha.');
    }

    // Check sheet limit per contractor
    const existingSheetsForContratada = sheetFiles.filter(
      f => f.contratada.toLowerCase() === detectedContratada.toLowerCase()
    );
    
    if (existingSheetsForContratada.length >= MAX_SHEETS_PER_CONTRATADA) {
      throw new Error(`Limite de ${MAX_SHEETS_PER_CONTRATADA} planilhas por contratada atingido. Delete uma planilha antiga.`);
    }

    // Upload file to storage
    const filePath = `${detectedContratada || 'sem-contratada'}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('price-sheets')
      .upload(filePath, file);
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Erro ao salvar arquivo');
    }

    // Create sheet file record
    const { data: sheetRecord, error: sheetError } = await supabase
      .from('price_sheet_files')
      .insert({
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        contratada: detectedContratada || 'Não identificada',
        contrato: detectedContrato || null,
        items_count: newItems.length,
      })
      .select()
      .single();

    if (sheetError) {
      console.error('Sheet record error:', sheetError);
      throw new Error('Erro ao registrar planilha');
    }

    // Insert price items
    const itemsToInsert = newItems.map(item => ({
      sheet_id: sheetRecord.id,
      codigo: item.codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      preco_unitario: item.precoUnitario,
      categoria: item.categoria || null,
      fonte: item.fonte || null,
      contratada: item.contratada || null,
      contrato: item.contrato || null,
    }));

    const { error: insertError } = await supabase
      .from('price_items')
      .insert(itemsToInsert);

    if (insertError) {
      console.error('Insert items error:', insertError);
      // Rollback
      await supabase.from('price_sheet_files').delete().eq('id', sheetRecord.id);
      await supabase.storage.from('price-sheets').remove([filePath]);
      throw new Error('Erro ao salvar itens');
    }

    // Reload data
    await loadData();

    return { 
      added: newItems.length, 
      errors, 
      contratada: detectedContratada, 
      contrato: detectedContrato 
    };
  }, [sheetFiles, loadData]);

  // Delete sheet file and all its items
  const deleteSheetFile = useCallback(async (sheetId: string) => {
    const sheet = sheetFiles.find(s => s.id === sheetId);
    if (!sheet) return;

    // Delete from storage
    await supabase.storage.from('price-sheets').remove([sheet.file_path]);
    
    // Delete record (cascade deletes items)
    await supabase.from('price_sheet_files').delete().eq('id', sheetId);
    
    await loadData();
  }, [sheetFiles, loadData]);

  // Get unique contractors
  const getContratadas = useCallback((): string[] => {
    const contratadas = new Set<string>();
    priceItems.forEach(item => {
      if (item.contratada) contratadas.add(item.contratada);
    });
    return Array.from(contratadas).sort();
  }, [priceItems]);

  // Get items by contractor
  const getPriceItemsByContratada = useCallback((contratada: string): PriceItem[] => {
    if (!contratada) return priceItems;
    return priceItems.filter(item => 
      item.contratada?.toLowerCase().includes(contratada.toLowerCase())
    );
  }, [priceItems]);

  // Find price by code
  const findPriceByCode = useCallback((codigo: string): PriceItem | null => {
    if (!codigo) return null;
    const normalized = codigo.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    const exact = priceItems.find(p => 
      p.codigo.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalized
    );
    if (exact) return exact;
    
    return priceItems.find(p => 
      p.codigo.toUpperCase().includes(normalized) || 
      normalized.includes(p.codigo.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    ) || null;
  }, [priceItems]);

  // Find by description
  const findPriceByDescription = useCallback((descricao: string): PriceItem | null => {
    if (!descricao || descricao.length < 3) return null;
    
    const keywords = descricao.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
    
    if (keywords.length === 0) return null;
    
    let bestMatch: PriceItem | null = null;
    let bestScore = 0;
    
    priceItems.forEach(item => {
      const itemDesc = item.descricao.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ');
      
      let score = 0;
      keywords.forEach(kw => {
        if (itemDesc.includes(kw)) score += kw.length;
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    });
    
    return bestScore >= 6 ? bestMatch : null;
  }, [priceItems]);

  // Add manual price item
  const addPriceItem = useCallback(async (item: Omit<PriceItem, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase
      .from('price_items')
      .insert({
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        preco_unitario: item.precoUnitario,
        categoria: item.categoria || null,
        fonte: item.fonte || null,
        contratada: item.contratada || null,
        contrato: item.contrato || null,
      })
      .select()
      .single();

    if (error) throw error;
    await loadData();
    return data;
  }, [loadData]);

  // Update price item
  const updatePriceItem = useCallback(async (id: string, updates: Partial<PriceItem>) => {
    const { error } = await supabase
      .from('price_items')
      .update({
        codigo: updates.codigo,
        descricao: updates.descricao,
        unidade: updates.unidade,
        preco_unitario: updates.precoUnitario,
        categoria: updates.categoria,
        fonte: updates.fonte,
        contratada: updates.contratada,
        contrato: updates.contrato,
      })
      .eq('id', id);

    if (error) throw error;
    await loadData();
  }, [loadData]);

  // Delete price item
  const deletePriceItem = useCallback(async (id: string) => {
    await supabase.from('price_items').delete().eq('id', id);
    await loadData();
  }, [loadData]);

  // Clear all items for a contractor
  const clearItemsByContratada = useCallback(async (contratada: string) => {
    await supabase.from('price_items').delete().eq('contratada', contratada);
    await loadData();
  }, [loadData]);

  // Clear all
  const clearAllPricing = useCallback(async () => {
    // Delete all files from storage
    for (const sheet of sheetFiles) {
      await supabase.storage.from('price-sheets').remove([sheet.file_path]);
    }
    
    await supabase.from('price_sheet_files').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('price_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('service_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    await loadData();
  }, [sheetFiles, loadData]);

  // Get sheets summary by contractor
  const getSheetsSummary = useCallback(() => {
    const byContratada = new Map<string, { sheets: number; items: number; size: number }>();
    
    sheetFiles.forEach(sheet => {
      const key = sheet.contratada;
      const current = byContratada.get(key) || { sheets: 0, items: 0, size: 0 };
      byContratada.set(key, {
        sheets: current.sheets + 1,
        items: current.items + sheet.items_count,
        size: current.size + sheet.file_size,
      });
    });
    
    return Array.from(byContratada.entries()).map(([contratada, stats]) => ({
      contratada,
      ...stats,
      canAddMore: stats.sheets < MAX_SHEETS_PER_CONTRATADA,
    }));
  }, [sheetFiles]);

  // Service entries functions
  const addServiceEntry = useCallback(async (entry: Omit<ServiceEntry, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase
      .from('service_entries')
      .insert({
        activity_id: entry.activityId,
        price_item_id: entry.priceItemId || null,
        codigo: entry.codigo,
        descricao: entry.descricao,
        quantidade: entry.quantidade,
        unidade: entry.unidade,
        preco_unitario: entry.precoUnitario,
        valor_total: entry.valorTotal,
        data: entry.data,
        contratada: entry.contratada,
        fiscal: entry.fiscal,
        obra: entry.obra,
        localizacao: entry.localizacao,
        km_inicial: entry.kmInicial,
        km_final: entry.kmFinal,
        estaca_inicial: entry.estacaInicial,
        estaca_final: entry.estacaFinal,
        faixa: entry.faixa,
        lado: entry.lado,
        trecho: entry.trecho,
        segmento: entry.segmento,
        observacoes: entry.observacoes,
      })
      .select()
      .single();

    if (error) throw error;
    await loadData();
    return data;
  }, [loadData]);

  const addServiceEntries = useCallback(async (entries: Omit<ServiceEntry, 'id' | 'createdAt'>[]) => {
    const toInsert = entries.map(entry => ({
      activity_id: entry.activityId,
      price_item_id: entry.priceItemId || null,
      codigo: entry.codigo,
      descricao: entry.descricao,
      quantidade: entry.quantidade,
      unidade: entry.unidade,
      preco_unitario: entry.precoUnitario,
      valor_total: entry.valorTotal,
      data: entry.data,
      contratada: entry.contratada,
      fiscal: entry.fiscal,
      obra: entry.obra,
      localizacao: entry.localizacao,
      km_inicial: entry.kmInicial,
      km_final: entry.kmFinal,
      estaca_inicial: entry.estacaInicial,
      estaca_final: entry.estacaFinal,
      faixa: entry.faixa,
      lado: entry.lado,
      trecho: entry.trecho,
      segmento: entry.segmento,
      observacoes: entry.observacoes,
    }));

    const { data, error } = await supabase
      .from('service_entries')
      .insert(toInsert)
      .select();

    if (error) throw error;
    await loadData();
    return data;
  }, [loadData]);

  const deleteServiceEntry = useCallback(async (id: string) => {
    await supabase.from('service_entries').delete().eq('id', id);
    await loadData();
  }, [loadData]);

  const deleteEntriesByActivity = useCallback(async (activityId: string) => {
    await supabase.from('service_entries').delete().eq('activity_id', activityId);
    await loadData();
  }, [loadData]);

  const getEntriesByContratada = useCallback((contratada: string): ServiceEntry[] => {
    return serviceEntries.filter(s => 
      s.contratada.toLowerCase().includes(contratada.toLowerCase())
    );
  }, [serviceEntries]);

  const getEntriesByPeriod = useCallback((inicio: string, fim: string): ServiceEntry[] => {
    return serviceEntries.filter(s => s.data >= inicio && s.data <= fim);
  }, [serviceEntries]);

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

  const clearPriceItems = useCallback(async () => {
    // Delete all files from storage
    for (const sheet of sheetFiles) {
      await supabase.storage.from('price-sheets').remove([sheet.file_path]);
    }
    
    await supabase.from('price_sheet_files').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('price_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    await loadData();
  }, [sheetFiles, loadData]);

  return {
    priceItems,
    sheetFiles,
    serviceEntries,
    isLoading,
    // Price items
    importPriceSheet,
    addPriceItem,
    updatePriceItem,
    deletePriceItem,
    findPriceByCode,
    findPriceByDescription,
    getContratadas,
    getPriceItemsByContratada,
    clearPriceItems,
    // Sheet management
    deleteSheetFile,
    getSheetsSummary,
    clearItemsByContratada,
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
    loadData,
    MAX_SHEETS_PER_CONTRATADA,
    MAX_FILE_SIZE,
  };
}
