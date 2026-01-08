import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Wifi, WifiOff, CheckCircle2, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowBanner(false);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  // Floating install banner
  if (showBanner && deferredPrompt && !isInstalled) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
        <Card className="border-primary/20 bg-card/95 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Instalar App</CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-xs">
              Instale o Memória Mensal para acesso rápido e uso offline
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button onClick={handleInstallClick} className="w-full" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Instalar Agora
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

export function PWAStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isInstalled) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3 text-green-500" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-amber-500" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}

export function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Memória Mensal</CardTitle>
          <CardDescription>
            Instale o aplicativo para acesso rápido e funcionamento offline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-muted-foreground">
                App instalado com sucesso! Você pode acessá-lo pela tela inicial do seu dispositivo.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <h3 className="font-medium">Benefícios do app:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Acesso rápido pela tela inicial
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Funciona sem internet (modo offline)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Carregamento instantâneo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Experiência em tela cheia
                  </li>
                </ul>
              </div>

              {deferredPrompt ? (
                <Button onClick={handleInstallClick} className="w-full" size="lg">
                  <Download className="h-5 w-5 mr-2" />
                  Instalar Aplicativo
                </Button>
              ) : isIOS ? (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Para instalar no iPhone/iPad:</h4>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Toque no botão de compartilhar (quadrado com seta)</li>
                    <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
                    <li>Toque em "Adicionar" no canto superior direito</li>
                  </ol>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Para instalar:</h4>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Abra o menu do navegador (três pontos)</li>
                    <li>Toque em "Instalar aplicativo" ou "Adicionar à tela inicial"</li>
                  </ol>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
