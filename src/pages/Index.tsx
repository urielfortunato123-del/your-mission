import { useState } from 'react';
import { Header } from '@/components/Header';
import { SummaryCards } from '@/components/SummaryCards';
import { ActivityList } from '@/components/ActivityList';
import { ActivityForm } from '@/components/ActivityForm';
import { ExportButtons } from '@/components/ExportButtons';
import { ActivityCharts } from '@/components/ActivityCharts';

import { useActivities } from '@/hooks/useActivities';
import { Activity } from '@/types/activity';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Index = () => {
  const { activities, addActivity, updateActivity, deleteActivity, getMonthSummary } = useActivities();
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const summary = getMonthSummary();

  const handleSave = (data: Omit<Activity, 'id' | 'createdAt'>) => {
    if (editingActivity) {
      updateActivity(editingActivity.id, data);
      toast.success('Atividade atualizada com sucesso!');
    } else {
      addActivity(data);
      toast.success('Atividade registrada com sucesso!');
    }
    setEditingActivity(null);
  };


  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteActivity(deleteId);
      toast.success('Atividade excluída.');
      setDeleteId(null);
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingActivity(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNewActivity={() => setFormOpen(true)} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Resumo Geral
          </h2>
          <SummaryCards summary={summary} />
        </section>

        {/* Charts */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Estatísticas Visuais
          </h2>
          <ActivityCharts activities={activities} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Registros de Atividades
            </h2>
            <ExportButtons activities={activities} />
          </div>
          <ActivityList
            activities={activities}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteId(id)}
          />
        </section>
      </main>

      {/* Form Dialog */}
      <ActivityForm
        open={formOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        initialData={editingActivity || undefined}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
