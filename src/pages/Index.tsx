import { useState, useRef } from 'react';
import { Header } from '@/components/Header';
import { SummaryCards } from '@/components/SummaryCards';
import { ActivityList } from '@/components/ActivityList';
import { ActivityForm } from '@/components/ActivityForm';
import { ExportButtons } from '@/components/ExportButtons';
import { ActivityCharts } from '@/components/ActivityCharts';
import { PriceSheetManager } from '@/components/PriceSheetManager';
import { ServiceEntriesManager } from '@/components/ServiceEntriesManager';
import { MedicaoExport } from '@/components/MedicaoExport';
import { MedicaoDashboard } from '@/components/MedicaoDashboard';
import { UserManual } from '@/components/UserManual';
import { TextReportExtractor } from '@/components/TextReportExtractor';

import { useActivities } from '@/hooks/useActivities';
import { useSupabasePricing } from '@/hooks/useSupabasePricing';
import { Activity } from '@/types/activity';
import { toast } from 'sonner';

interface ExtractedActivity {
  data: string | null;
  diaSemana: string | null;
  fiscal: string | null;
  contratada: string | null;
  obra: string | null;
  frenteTrabalho: string | null;
  area: string | null;
  atividades: string | null;
  observacoes: string | null;
  responsavel: string | null;
  materiais: string | null;
  quantidades: string | null;
}
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const Index = () => {
  const { activities, addActivity, updateActivity, deleteActivity, clearAllActivities, loadActivities, getMonthSummary } = useActivities();
  const pricing = useSupabasePricing();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [pendingFileData, setPendingFileData] = useState<Activity[] | null>(null);
  const [pendingFileName, setPendingFileName] = useState('');
  const [fileName, setFileName] = useState('memoria-mensal');
  const [priceSheetOpen, setPriceSheetOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summary = getMonthSummary();

  const handleAddExtractedActivities = (extractedActivities: ExtractedActivity[]) => {
    extractedActivities.forEach(ext => {
      const newActivity: Omit<Activity, 'id' | 'createdAt'> = {
        data: ext.data || new Date().toISOString().split('T')[0],
        dia: ext.diaSemana || '',
        fiscal: ext.fiscal || '',
        contratada: ext.contratada || '',
        obra: ext.obra || '',
        frenteObra: ext.frenteTrabalho || '',
        area: ext.area || '',
        codigo: '',
        cn: '',
        cliente: '',
        temperatura: 0,
        condicaoManha: '',
        condicaoTarde: '',
        condicaoNoite: '',
        praticavel: true,
        volumeChuva: 0,
        efetivoDetalhado: [],
        equipamentosDetalhado: [],
        condicoesClima: '',
        efetivoTotal: 0,
        equipamentos: 0,
        atividades: ext.atividades || '',
        observacoes: [ext.observacoes, ext.materiais, ext.quantidades].filter(Boolean).join(' | '),
        ocorrencias: '',
      };
      addActivity(newActivity);
    });
    toast.success(`${extractedActivities.length} atividades importadas com sucesso!`);
  };

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

  const handleClear = () => {
    clearAllActivities();
    toast.success('Todos os registros foram limpos.');
    setClearDialogOpen(false);
  };

  const handleSaveAs = () => {
    const dataStr = JSON.stringify(activities, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Arquivo "${fileName}.json" salvo com sucesso!`);
    setSaveAsDialogOpen(false);
  };

  const handleLoad = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          setPendingFileData(data);
          setPendingFileName(file.name);
          setLoadDialogOpen(true);
        } else {
          toast.error('Formato de arquivo inválido.');
        }
      } catch {
        toast.error('Erro ao ler o arquivo.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadReplace = () => {
    if (pendingFileData) {
      loadActivities(pendingFileData, false);
      toast.success(`Arquivo "${pendingFileName}" carregado! ${pendingFileData.length} registros substituídos.`);
      setPendingFileData(null);
      setLoadDialogOpen(false);
    }
  };

  const handleLoadMerge = () => {
    if (pendingFileData) {
      const result = loadActivities(pendingFileData, true);
      toast.success(`Arquivo "${pendingFileName}" mesclado! ${result.added} novos, ${result.updated} atualizados.`);
      setPendingFileData(null);
      setLoadDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />
      <Header 
        onNewActivity={() => setFormOpen(true)} 
        onClear={() => setClearDialogOpen(true)}
        onSaveAs={() => setSaveAsDialogOpen(true)}
        onLoad={handleLoad}
        onOpenPriceSheet={() => setPriceSheetOpen(true)}
        onOpenServices={() => setServicesOpen(true)}
        onExportMedicao={() => setExportOpen(true)}
        onOpenDashboard={() => setDashboardOpen(true)}
        onOpenManual={() => setManualOpen(true)}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Resumo Geral
          </h2>
          <SummaryCards summary={summary} activities={activities} />
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
            <div className="flex gap-2">
              <TextReportExtractor onAddActivities={handleAddExtractedActivities} />
              <ExportButtons activities={activities} serviceEntries={pricing.serviceEntries} />
            </div>
          </div>
          <ActivityList
            activities={activities}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteId(id)}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-border/50 bg-muted/30">
        <p className="text-sm text-muted-foreground animate-pulse">
          Desenvolvido por <span className="font-semibold text-primary">Uriel da Fonseca Fortunato</span>
        </p>
      </footer>

      {/* Form Dialog */}
      <ActivityForm
        open={formOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        initialData={editingActivity || undefined}
        priceItems={pricing.priceItems}
        onServicesExtracted={pricing.addServiceEntries}
        onImportPriceSheet={pricing.importPriceSheet}
      />

      {/* Price Sheet Manager */}
      <PriceSheetManager
        open={priceSheetOpen}
        onOpenChange={setPriceSheetOpen}
        priceItems={pricing.priceItems}
        onImport={pricing.importPriceSheet}
        onAdd={pricing.addPriceItem}
        onUpdate={pricing.updatePriceItem}
        onDelete={pricing.deletePriceItem}
        onClearAll={pricing.clearPriceItems}
      />

      {/* Service Entries Manager */}
      <ServiceEntriesManager
        open={servicesOpen}
        onOpenChange={setServicesOpen}
        serviceEntries={pricing.serviceEntries}
        onDelete={pricing.deleteServiceEntry}
        getMedicaoSummary={pricing.getMedicaoSummary}
      />

      {/* Export Medicao */}
      <MedicaoExport
        open={exportOpen}
        onOpenChange={setExportOpen}
        getMedicaoSummary={pricing.getMedicaoSummary}
      />

      {/* Dashboard */}
      <MedicaoDashboard
        open={dashboardOpen}
        onOpenChange={setDashboardOpen}
        serviceEntries={pricing.serviceEntries}
        getMedicaoSummary={pricing.getMedicaoSummary}
      />

      {/* User Manual */}
      <UserManual
        open={manualOpen}
        onOpenChange={setManualOpen}
      />

      {/* Clear Confirmation */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todos os registros?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá apagar todos os {activities.length} registros salvos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} className="bg-destructive hover:bg-destructive/90">
              Limpar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save As Dialog */}
      <Dialog open={saveAsDialogOpen} onOpenChange={setSaveAsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Como</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filename">Nome do arquivo</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="filename"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="nome-do-arquivo"
                />
                <span className="text-muted-foreground">.json</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {activities.length} registros serão salvos neste arquivo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveAsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAs}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Options Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregar Arquivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              O arquivo <strong>"{pendingFileName}"</strong> contém {pendingFileData?.length || 0} registros.
            </p>
            <p className="text-sm text-muted-foreground">
              Você tem atualmente {activities.length} registros. Como deseja carregar?
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="secondary" onClick={handleLoadReplace}>
              Substituir Tudo
            </Button>
            <Button onClick={handleLoadMerge}>
              Mesclar (Atualizar)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
