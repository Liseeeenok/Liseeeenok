import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: process.env.VITE_BASE_PATH || '/',
    // Идентификатор сборки: подставляется в адреса контента панелей, чтобы браузер
    // не показывал старое описание из кэша после обновления сайта.
    define: {
        __BUILD_ID__: JSON.stringify(Date.now().toString(36))
    },
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
            },
            output: {
                manualChunks: {
                    three: ['three']
                },
            }
        },
        commonjsOptions: {
            include: [/three/, /node_modules/]
        }
    },
    publicDir: 'public',
    optimizeDeps: {
        include: ['three']
    }
});