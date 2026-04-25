import { Component, type ErrorInfo, type ReactNode } from 'react';

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

    return (
      <div className={styles.wrap}>
        <div className={styles.box}>
          <div className={styles.title}>SYSTEM ERROR</div>
          <div className={styles.subtitle}>系統異常 · 請重新整理頁面</div>
          {this.state.error && (
            <pre className={styles.detail}>{this.state.error.message}</pre>
          )}
          <button type="button" className={styles.btn} onClick={this.handleReload}>
            ↻ RELOAD
          </button>
        </div>
      </div>
    );
  }
}
