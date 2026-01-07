import { useState, useEffect, useCallback } from 'react';
import { Activity, MonthSummary } from '@/types/activity';

const STORAGE_KEY = 'memoria-mensal-atividades';

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setActivities(JSON.parse(stored));
      } catch (e) {
        console.error('Erro ao carregar atividades:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const saveActivities = useCallback((newActivities: Activity[]) => {
    setActivities(newActivities);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newActivities));
  }, []);

  const addActivity = useCallback((activity: Omit<Activity, 'id' | 'createdAt'>) => {
    const newActivity: Activity = {
      ...activity,
      // Ensure new fields have defaults
      area: activity.area || '',
      codigo: activity.codigo || 'RD',
      cn: activity.cn || '',
      cliente: activity.cliente || '',
      temperatura: activity.temperatura || 0,
      condicaoManha: activity.condicaoManha || 'BOM',
      condicaoTarde: activity.condicaoTarde || 'BOM',
      condicaoNoite: activity.condicaoNoite || 'BOM',
      praticavel: activity.praticavel ?? true,
      volumeChuva: activity.volumeChuva || 0,
      efetivoDetalhado: activity.efetivoDetalhado || [],
      equipamentosDetalhado: activity.equipamentosDetalhado || [],
      ocorrencias: activity.ocorrencias || '',
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    saveActivities([newActivity, ...activities]);
    return newActivity;
  }, [activities, saveActivities]);

  const updateActivity = useCallback((id: string, updates: Partial<Activity>) => {
    const updated = activities.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    );
    saveActivities(updated);
  }, [activities, saveActivities]);

  const deleteActivity = useCallback((id: string) => {
    saveActivities(activities.filter((a) => a.id !== id));
  }, [activities, saveActivities]);

  const clearAllActivities = useCallback(() => {
    saveActivities([]);
  }, [saveActivities]);

  const loadActivities = useCallback((newActivities: Activity[], merge: boolean = false) => {
    if (!merge) {
      saveActivities(newActivities);
      return { added: newActivities.length, updated: 0 };
    }

    // Merge: update existing by ID, add new ones
    const existingMap = new Map(activities.map(a => [a.id, a]));
    let updated = 0;
    let added = 0;

    newActivities.forEach(newAct => {
      if (existingMap.has(newAct.id)) {
        // Merge: keep new fields from existing, update with imported data
        const existing = existingMap.get(newAct.id)!;
        existingMap.set(newAct.id, { ...existing, ...newAct });
        updated++;
      } else {
        // Add with default values for new fields
        existingMap.set(newAct.id, {
          ...newAct,
          area: newAct.area || '',
          codigo: newAct.codigo || 'RD',
          cn: newAct.cn || '',
          cliente: newAct.cliente || '',
          temperatura: newAct.temperatura || 0,
          condicaoManha: newAct.condicaoManha || 'BOM',
          condicaoTarde: newAct.condicaoTarde || 'BOM',
          condicaoNoite: newAct.condicaoNoite || 'BOM',
          praticavel: newAct.praticavel ?? true,
          volumeChuva: newAct.volumeChuva || 0,
          efetivoDetalhado: newAct.efetivoDetalhado || [],
          equipamentosDetalhado: newAct.equipamentosDetalhado || [],
          ocorrencias: newAct.ocorrencias || '',
        });
        added++;
      }
    });

    saveActivities(Array.from(existingMap.values()));
    return { added, updated };
  }, [activities, saveActivities]);

  const exportActivities = useCallback(() => {
    return activities;
  }, [activities]);

  const getMonthSummary = useCallback((month?: string): MonthSummary => {
    const filtered = month
      ? activities.filter((a) => a.data.startsWith(month))
      : activities;

    const contratadas = new Set<string>();
    const obras = new Set<string>();
    const fiscais = new Set<string>();

    let totalEfetivo = 0;
    let totalEquipamentos = 0;

    filtered.forEach((a) => {
      contratadas.add(a.contratada);
      obras.add(a.obra);
      fiscais.add(a.fiscal);
      totalEfetivo += a.efetivoTotal || 0;
      totalEquipamentos += a.equipamentos || 0;
    });

    return {
      totalAtividades: filtered.length,
      totalEfetivo,
      totalEquipamentos,
      contratodasAtivas: Array.from(contratadas),
      obrasAtivas: Array.from(obras),
      fiscais: Array.from(fiscais),
    };
  }, [activities]);

  return {
    activities,
    isLoading,
    addActivity,
    updateActivity,
    deleteActivity,
    clearAllActivities,
    loadActivities,
    exportActivities,
    getMonthSummary,
  };
}
