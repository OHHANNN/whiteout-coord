import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import i18n from '@/i18n';
import { logError } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 整個 app 的最外層 boundary。
 * 任何 render 階段未捕獲的 React error fallback 到友善頁面，避免白屏。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError('ErrorBoundary · caught', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // ErrorBoundary 是 class component、不能用 hook、改用 i18n 直接呼叫
    const t = i18n.t.bind(i18n);
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-6">
        <Card className="border-destructive flex w-full max-w-md flex-col items-center gap-4 p-6 text-center">
          <h1 className="text-destructive text-base font-semibold">
            {t('error.system_error')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('error.system_error_hint')}
          </p>
          {this.state.error && (
            <pre className="bg-muted text-muted-foreground max-h-40 w-full overflow-auto rounded-md p-3 text-left text-xs whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          )}
          <Button onClick={this.handleReload}>↻ {t('error.reload')}</Button>
        </Card>
      </div>
    );
  }
}
