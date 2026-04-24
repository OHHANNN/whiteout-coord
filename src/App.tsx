import { useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import '@mantine/core/styles.css';

import { useAuth } from '@/hooks/useAuth';
import { initServerTimeSync } from '@/hooks/useServerTime';
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

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<EntryPage />} />
          <Route path="/room/:pin" element={<RoomPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
