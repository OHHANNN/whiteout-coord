import { Component, type ErrorInfo, type ReactNode } from 'react';

import i18n from '@/i18n';
import { logError } from '@/lib/logger';

import styles from './ErrorBoundary.module.scss';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 整個 app 的最外層 boundary。
 * 任何 render 階段未捕獲的 React error 會 fallback 到友善頁面，避免空白白屏。
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
      <div className={styles.wrap}>
        <div className={styles.box}>
          <div className={styles.title}>{t('error.system_error')}</div>
          <div className={styles.subtitle}>{t('error.system_error_hint')}</div>
          {this.state.error && (
            <pre className={styles.detail}>{this.state.error.message}</pre>
          )}
          <button type="button" className={styles.btn} onClick={this.handleReload}>
            ↻ {t('error.reload')}
          </button>
        </div>
      </div>
    );
  }
}
