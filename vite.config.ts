import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import pkg from './package.json'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables" as *;`
      }
    }
  },
  // Tauri 的 WebView2 为现代 Chromium，可提高 target 减少转译产物与 polyfill
  build: {
    target: 'chrome109',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        // 稳定分包：大依赖各自独立 chunk，改善首屏加载与浏览器缓存命中
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('monaco-editor')) return 'monaco'
          if (id.includes('quicktype-core')) return 'quicktype'
          if (id.includes('shiki') || id.includes('@shikijs') || id.includes('@stream')) return 'shiki'
          if (id.includes('@uiw') || id.includes('react-json-view') || id.includes('react-copy-to-clipboard')) return 'jsonview'
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react'
          if (id.includes('zustand') || id.includes('immer')) return 'state'
        },
      },
    },
  },
  // 仅生产构建移除调试语句，dev 保留 console 便于排查
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
}))
