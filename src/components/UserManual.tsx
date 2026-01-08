import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileSpreadsheet, 
  ListChecks, 
  BarChart3, 
  Upload, 
  Download, 
  Plus, 
  Camera, 
  Sparkles,
  FileText,
  Settings,
  HelpCircle,
  Calculator,
  Layers,
  ClipboardList
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserManualProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserManual({ open, onOpenChange }: UserManualProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-6 w-6 text-primary" />
            Manual do Sistema de Medição
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="visao-geral" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
            <TabsTrigger value="planilha">Planilha</TabsTrigger>
            <TabsTrigger value="medicao">Medição</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4">
            {/* VISÃO GERAL */}
            <TabsContent value="visao-geral" className="space-y-6 mt-0">
              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Layers className="h-5 w-5" />
                  O que é o Sistema?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Este é um <strong>Sistema de Controle de Medição</strong> desenvolvido para auxiliar profissionais 
                  de engenharia e construção civil no registro e acompanhamento de atividades executadas em obra, 
                  permitindo gerar memórias de cálculo e boletins de medição de forma automatizada.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <ClipboardList className="h-5 w-5" />
                  Funcionalidades Principais
                </h3>
                <div className="grid gap-3">
                  <FeatureCard 
                    icon={<Plus className="h-5 w-5" />}
                    title="Registro de Atividades"
                    description="Cadastre atividades diárias com data, descrição, localização, quantidades e fotos."
                  />
                  <FeatureCard 
                    icon={<FileSpreadsheet className="h-5 w-5" />}
                    title="Planilha de Preços"
                    description="Importe planilhas do SINAPI, DER, SICRO ou personalizadas para precificação automática."
                  />
                  <FeatureCard 
                    icon={<ListChecks className="h-5 w-5" />}
                    title="Serviços Extraídos"
                    description="Visualize todos os serviços identificados nas atividades com quantidades consolidadas."
                  />
                  <FeatureCard 
                    icon={<BarChart3 className="h-5 w-5" />}
                    title="Dashboard de Medição"
                    description="Acompanhe valores totais, distribuição por categoria e evolução mensal."
                  />
                  <FeatureCard 
                    icon={<Download className="h-5 w-5" />}
                    title="Exportação"
                    description="Gere relatórios em PDF ou Excel prontos para anexar à medição oficial."
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Settings className="h-5 w-5" />
                  Fluxo de Trabalho Recomendado
                </h3>
                <ol className="space-y-3">
                  <StepItem number={1} title="Importe sua Planilha de Preços">
                    Acesse "Planilha BM" e importe sua tabela de preços (Excel, CSV ou PDF).
                  </StepItem>
                  <StepItem number={2} title="Registre as Atividades">
                    Clique em "+ Nova Atividade" e preencha os dados da execução diária.
                  </StepItem>
                  <StepItem number={3} title="Vincule os Serviços">
                    Use a IA para extrair automaticamente os serviços ou vincule manualmente.
                  </StepItem>
                  <StepItem number={4} title="Acompanhe no Dashboard">
                    Visualize o progresso e valores consolidados por período.
                  </StepItem>
                  <StepItem number={5} title="Exporte a Medição">
                    Gere o boletim final em PDF ou Excel para apresentação.
                  </StepItem>
                </ol>
              </section>
            </TabsContent>

            {/* ATIVIDADES */}
            <TabsContent value="atividades" className="space-y-6 mt-0">
              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Plus className="h-5 w-5" />
                  Criando uma Nova Atividade
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Clique no botão <Badge variant="default">+ Nova Atividade</Badge> no topo da página para abrir o formulário de cadastro.
                </p>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Campos do Formulário:</h4>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Data:</strong> Data de execução da atividade</li>
                    <li><strong>Descrição:</strong> Descrição detalhada do serviço executado</li>
                    <li><strong>Localização:</strong> Local específico da obra (ex: "Trecho km 5+200 ao km 5+800")</li>
                    <li><strong>Turno:</strong> Manhã, Tarde, Noite ou Dia Inteiro</li>
                    <li><strong>Equipe:</strong> Número de colaboradores envolvidos</li>
                    <li><strong>Status:</strong> Em Andamento, Concluído ou Pendente</li>
                    <li><strong>Observações:</strong> Notas adicionais relevantes</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Camera className="h-5 w-5" />
                  Anexando Fotos
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Você pode anexar até <strong>10 fotos</strong> por atividade. As fotos servem como registro 
                  visual da execução e podem ser incluídas nos relatórios exportados.
                </p>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm">
                  <strong>💡 Dica:</strong> Tire fotos do "antes" e "depois" para documentar a evolução do serviço.
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                  Extração de Serviços com IA
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  O sistema utiliza inteligência artificial para analisar a descrição da atividade e 
                  identificar automaticamente os serviços executados com base na sua planilha de preços.
                </p>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Como funciona:</h4>
                  <ol className="space-y-2 text-sm list-decimal list-inside">
                    <li>Preencha a descrição detalhada da atividade</li>
                    <li>Clique em <Badge variant="outline">Extrair Serviços (IA)</Badge></li>
                    <li>A IA identifica códigos de serviço compatíveis</li>
                    <li>Revise e ajuste as quantidades se necessário</li>
                    <li>Confirme os serviços para incluí-los na medição</li>
                  </ol>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
                  <strong>ℹ️ Importante:</strong> Para melhores resultados, certifique-se de ter uma planilha 
                  de preços carregada antes de usar a extração automática.
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Download className="h-5 w-5" />
                  Salvando e Carregando Dados
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Os dados são salvos automaticamente no navegador. Para backup ou transferência entre dispositivos:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><strong>Arquivo → Salvar Como:</strong> Exporta todas as atividades para um arquivo JSON</li>
                  <li><strong>Arquivo → Carregar:</strong> Importa atividades de um arquivo JSON salvo anteriormente</li>
                </ul>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm">
                  <strong>⚠️ Atenção:</strong> Faça backup regularmente! Os dados do navegador podem ser perdidos 
                  ao limpar cache ou usar modo anônimo.
                </div>
              </section>
            </TabsContent>

            {/* PLANILHA DE PREÇOS */}
            <TabsContent value="planilha" className="space-y-6 mt-0">
              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                  Planilha de Preços
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  A planilha de preços é a base para calcular os valores da medição. Você pode importar 
                  tabelas existentes ou cadastrar itens manualmente.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Upload className="h-5 w-5" />
                  Importando Planilhas
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel/CSV
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Formato esperado das colunas (nesta ordem):
                    </p>
                    <ol className="text-sm list-decimal list-inside space-y-1">
                      <li><strong>Código</strong> - Código do serviço (ex: "BSO-01", "73610/2")</li>
                      <li><strong>Descrição</strong> - Descrição completa do serviço</li>
                      <li><strong>Unidade</strong> - Unidade de medida (m, m², m³, kg, etc)</li>
                      <li><strong>Preço Unitário</strong> - Valor em reais</li>
                      <li><strong>Categoria</strong> (opcional) - Categoria do serviço</li>
                      <li><strong>Fonte</strong> (opcional) - Origem da tabela (SINAPI, DER, etc)</li>
                    </ol>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF (com IA)
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      O sistema usa IA para extrair dados de tabelas em PDF. Funciona melhor com:
                    </p>
                    <ul className="text-sm list-disc list-inside space-y-1">
                      <li>PDFs com tabelas bem formatadas</li>
                      <li>Texto selecionável (não imagens escaneadas)</li>
                      <li>Arquivos de até 10MB</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Plus className="h-5 w-5" />
                  Cadastro Manual
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Clique em <Badge variant="default">+ Adicionar</Badge> para incluir itens um a um. 
                  Campos obrigatórios: Código e Descrição.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Calculator className="h-5 w-5" />
                  Unidades de Medida Suportadas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['un', 'm', 'm²', 'm³', 'kg', 'l', 'ton', 'vb', 'h', 'cj', 'pç', 'cx', 'sc', 'gl', 'km', 'ha'].map(un => (
                    <Badge key={un} variant="outline">{un}</Badge>
                  ))}
                </div>
              </section>
            </TabsContent>

            {/* MEDIÇÃO */}
            <TabsContent value="medicao" className="space-y-6 mt-0">
              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <ListChecks className="h-5 w-5" />
                  Serviços Extraídos
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Esta seção consolida todos os serviços identificados nas atividades registradas. 
                  Cada serviço mostra a quantidade total acumulada e o valor calculado.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <p><strong>Fórmula:</strong> Valor Total = Quantidade × Preço Unitário</p>
                  <p className="text-muted-foreground">
                    O preço unitário é obtido automaticamente da planilha de preços carregada.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <BarChart3 className="h-5 w-5" />
                  Dashboard de Medição
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  O dashboard oferece uma visão consolidada da medição com:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  <li>Valor total da medição</li>
                  <li>Quantidade de serviços distintos</li>
                  <li>Gráfico de distribuição por categoria</li>
                  <li>Evolução mensal dos valores</li>
                  <li>Top 10 serviços por valor</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Download className="h-5 w-5" />
                  Exportando a Medição
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Clique em <Badge variant="default">Exportar Medição</Badge> para gerar relatórios:
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">📄 PDF</h4>
                    <p className="text-sm text-muted-foreground">
                      Boletim formatado pronto para impressão ou envio digital. 
                      Inclui cabeçalho, tabela de serviços e totais.
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">📊 Excel</h4>
                    <p className="text-sm text-muted-foreground">
                      Planilha editável para integração com sistemas de medição 
                      oficiais ou análises adicionais.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <HelpCircle className="h-5 w-5" />
                  Dúvidas Frequentes
                </h3>
                <div className="space-y-4">
                  <FaqItem 
                    question="Os dados ficam salvos onde?"
                    answer="Os dados são armazenados localmente no seu navegador (localStorage). Para garantir backup, use a função 'Salvar Como' regularmente."
                  />
                  <FaqItem 
                    question="Posso usar em outro dispositivo?"
                    answer="Sim! Salve seus dados em arquivo JSON e carregue no outro dispositivo usando 'Arquivo → Carregar'."
                  />
                  <FaqItem 
                    question="A extração por IA é precisa?"
                    answer="A IA oferece sugestões baseadas na sua planilha de preços. Sempre revise os serviços e quantidades antes de confirmar."
                  />
                  <FaqItem 
                    question="Posso editar serviços já extraídos?"
                    answer="Sim, você pode editar ou excluir serviços na seção 'Serviços Extraídos'."
                  />
                  <FaqItem 
                    question="Qual o limite de atividades?"
                    answer="Não há limite definido. O sistema suporta centenas de registros sem problemas de performance."
                  />
                </div>
              </section>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
      <div className="text-primary mt-0.5">{icon}</div>
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function StepItem({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
        {number}
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-border pb-3">
      <h4 className="font-medium text-sm mb-1">{question}</h4>
      <p className="text-sm text-muted-foreground">{answer}</p>
    </div>
  );
}
