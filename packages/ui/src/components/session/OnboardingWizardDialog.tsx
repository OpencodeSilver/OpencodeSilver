import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/icon/Icon';
import { useI18n } from '@/lib/i18n';
import { useUIStore } from '@/stores/useUIStore';

const STORAGE_KEY = 'opencodesilver_onboarding_completed';

export function useOnboardingState() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        setIsOpen(true);
      }
    } catch {
      // Ignore localStorage access failures
    }
  }, []);

  const openOnboarding = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeOnboarding = React.useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
  }, []);

  return { isOpen, openOnboarding, closeOnboarding };
}

export const OnboardingWizardDialog: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { t, locale, setLocale, locales } = useI18n();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [selectedProviderOption, setSelectedProviderOption] = React.useState<'free' | 'custom' | 'claude'>('free');
  const [customKey, setCustomKey] = React.useState('');
  const [selectedProviderName, setSelectedProviderName] = React.useState('openrouter');

  const handleFinish = () => {
    if (selectedProviderOption === 'custom') {
      useUIStore.setState({
        settingsPage: 'providers',
        settingsProvidersConnectRequested: true,
        isSettingsDialogOpen: true,
      });
    }
    onClose();
  };

  const isRTL = locale === 'ar';

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-xl p-6 sm:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isRTL ? `الخطوة ${step} من 3` : `Step ${step} of 3`}
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === step
                      ? 'w-6 bg-primary'
                      : s < step
                      ? 'w-2.5 bg-primary/40'
                      : 'w-2.5 bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {step === 1 && (isRTL ? 'مرحباً بك في OpencodeSilver — اختر لغتك' : 'Welcome to OpencodeSilver — Choose Language')}
            {step === 2 && (isRTL ? 'اختر مزوّد النماذج والذكاء الاصطناعي' : 'Choose Your AI Model Provider')}
            {step === 3 && (isRTL ? 'تأكيد مساحة العمل وبدء البرمجة' : 'Confirm Workspace & Start Coding')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {step === 1 && (isRTL ? 'حدد اللغة المفضلة للواجهة والمحادثات. يمكنك تغييرها دائماً من الإعدادات.' : 'Select your preferred interface and conversation language. You can change this anytime.')}
            {step === 2 && (isRTL ? 'اختر الطريقة التي تفضلها للاتصال بنماذج الذكاء الاصطناعي.' : 'Select how you want to connect to AI models.')}
            {step === 3 && (isRTL ? 'مساحة العمل الخاصة بك جاهزة لبدء كتابة وإنجاز المشاريع البرمجية.' : 'Your workspace is ready to build and supercharge your coding projects.')}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Language */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 py-4">
            {locales.map((loc) => {
              const isSelected = locale === loc;
              const names: Record<string, string> = {
                ar: 'العربية (Arabic)',
                en: 'English (US)',
                fr: 'Français (French)',
                de: 'Deutsch (German)',
                es: 'Español (Spanish)',
                ja: '日本語 (Japanese)',
                'zh-CN': '简体中文 (Simplified Chinese)',
                'pt-BR': 'Português (Brasil)',
              };
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocale(loc)}
                  className={`flex items-center justify-between rounded-xl border p-3.5 text-left text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border/70 bg-card hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <span>{names[loc] || loc}</span>
                  {isSelected && <Icon name="check" className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Provider selection */}
        {step === 2 && (
          <div className="space-y-3 py-4">
            <button
              type="button"
              onClick={() => setSelectedProviderOption('free')}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                selectedProviderOption === 'free'
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border/70 bg-card hover:bg-muted/50'
              }`}
            >
              <div className="mt-0.5 rounded-lg bg-primary/20 p-2 text-primary">
                <Icon name="sparkles" className="size-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">
                  {isRTL ? 'النماذج المجانية في OpenCode' : 'OpenCode Free Models'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {isRTL
                    ? 'ابدأ فوراً بدون أي مفتاح API باستخدام النماذج المتاحة مجاناً.'
                    : 'Start immediately without an API key using bundled free tier models.'}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProviderOption('custom')}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                selectedProviderOption === 'custom'
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border/70 bg-card hover:bg-muted/50'
              }`}
            >
              <div className="mt-0.5 rounded-lg bg-primary/20 p-2 text-primary">
                <Icon name="key" className="size-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">
                  {isRTL ? 'مفتاح API خاص (Anthropic / OpenRouter / DeepSeek)' : 'Custom API Key (Anthropic / OpenRouter / DeepSeek)'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {isRTL
                    ? 'أدخل مفتاحك الخاص للحصول على أقصى أداء وسرعة دون قيود حصة مجانية.'
                    : 'Use your own API credentials with full rate limits and model access.'}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProviderOption('claude')}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                selectedProviderOption === 'claude'
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border/70 bg-card hover:bg-muted/50'
              }`}
            >
              <div className="mt-0.5 rounded-lg bg-primary/20 p-2 text-primary">
                <Icon name="terminal" className="size-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">
                  {isRTL ? 'جسر Claude Code CLI' : 'Claude Code CLI Bridge'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {isRTL
                    ? 'استخدم أداة Claude Code المثبتة على جهازك بحسابك واشتراكك المباشر في Anthropic.'
                    : 'Connect directly to your local Claude Code installation using your Anthropic account.'}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Step 3: Workspace */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {isRTL ? 'المجلد النشط الحالي' : 'Current Active Directory'}
              </div>
              <div className="mt-1 font-mono text-xs text-foreground truncate">
                {typeof window !== 'undefined' ? window.location.pathname || '/' : '/'}
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon name="check-circle" className="size-4 text-[var(--status-success)]" />
                <span>{isRTL ? 'محرك Silver Intelligence جاهز' : 'Silver Intelligence Engine Ready'}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isRTL
                  ? 'تم تهيئة Consensus Matrix و Mission Orchestrator ومفتش الأمان AST. أنت الآن جاهز لبدء البرمجة الذاتية.'
                  : 'Consensus Matrix, Mission Orchestrator, and AST Security Inspector initialized and active.'}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
          {step > 1 ? (
            <Button variant="outline" size="sm" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
              {isRTL ? 'السابق' : 'Back'}
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button size="sm" onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}>
              {isRTL ? 'التالي' : 'Next'}
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinish}>
              {isRTL ? 'ابدأ الاستخدام' : 'Get Started'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
