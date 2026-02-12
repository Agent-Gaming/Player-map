import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/graphql': {
        target: 'https://mainnet.intuition.sh',
        changeOrigin: true,
        rewrite: (path) => '/v1/graphql',
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'PlayerMap',
      fileName: (format) => `index.${format}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'aframe', '3d-force-graph-vr'],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'aframe': 'AFRAME',
          '3d-force-graph-vr': 'ForceGraphVR'
        }
      }
    }
  }
})
