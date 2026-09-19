import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const isGithubPages = process.env.GITHUB_PAGES === 'true' || Boolean(repoName);

export default defineConfig(() => {
    return {
          base: isGithubPages && repoName ? `/${repoName}/` : '/',
          plugins: [react(), tailwindcss()],
          resolve: {
                  alias: {
                            '@': path.resolve(__dirname, '.'),
                  },
          },
          server: {
                  hmr: process.env.DISABLE_HMR !== 'true',
                  watch: process.env.DISABLE_HMR === 'true' ? null : {},
                  allowedHosts: ['tvk-2lof.onrender.com'],
          },
    };
});
