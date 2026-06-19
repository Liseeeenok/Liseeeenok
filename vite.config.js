import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        minify: false,
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