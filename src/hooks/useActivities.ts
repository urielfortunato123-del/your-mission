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
    getMonthSummary,
  };
}
