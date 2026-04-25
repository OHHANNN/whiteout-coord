import { useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import '@mantine/core/styles.css';

import { ConfirmProvider } from '@/components/ConfirmDialog/ConfirmDialog';
import { ConnectionStatus } from '@/components/ConnectionStatus/ConnectionStatus';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { initServerTimeSync } from '@/hooks/useServerTime';
import { unlockAudio } from '@/lib/audio';
import { EntryPage } from '@/pages/EntryPage/EntryPage';
import { RoomPage } from '@/pages/RoomPage/RoomPage';
import { theme } from '@/theme';

// 部署到 GitHub Pages 子路徑時 BrowserRouter 需要 basename
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

export function App() {
  // 全自動匿名登入
  useAuth();

  // 啟動時鐘校正（訂閱 Firebase .info/serverTimeOffset）
  useEffect(() => {
    initServerTimeSync();
  }, []);

  // 全域 first-interaction listener · 解鎖 AudioContext（瀏覽器要求使用者互動才能播放）
  useEffect(() => {
    const handler = () => {
      unlockAudio();
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };
    window.addEventListener('click', handler);
    window.addEventListener('keydown', handler);
    window.addEventListener('touchstart', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, []);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ErrorBoundary>
        <ConfirmProvider>
          <ConnectionStatus />
          <BrowserRouter basename={basename}>
            <Routes>
              <Route path="/" element={<EntryPage />} />
              <Route path="/room/:pin" element={<RoomPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </ErrorBoundary>
    </MantineProvider>
  );
}
