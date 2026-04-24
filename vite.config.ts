import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// whiteout-coord 部署在 GitHub Pages 子路徑 /whiteout-coord/
const base = process.env.VITE_BASE_PATH ?? '/whiteout-coord/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
    preprocessorOptions: {
      scss: {
        // 全域注入 CSS variables + mixins，每個 .module.scss 都能直接使用
        additionalData: `
          @use "@/styles/variables.scss" as *;
          @use "@/styles/mixins.scss" as *;
        `,
      },
    },
  },
});
