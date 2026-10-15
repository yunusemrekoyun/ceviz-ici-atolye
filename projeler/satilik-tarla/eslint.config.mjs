import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**', // sw.js — service worker globalleri, app kodu değil
      'reference/**',
      'uploads/**',
      'prisma/migrations/**',
      // Editör/ajan araç script'leri — uygulama kodu değil
      '.agents/**',
      '.claude/**',
      '.codex/**',
      '.impeccable/**',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Projede bilinçli atılan değerler _ önekiyle işaretleniyor (örn. _unused)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Mount-sync gibi meşru kullanımlar tek tek gerekçeli disable yorumuyla
      // işaretlendi; yenileri bilinçli bir karar gerektirsin diye kural error.
      'react-hooks/set-state-in-effect': 'error',
    },
  },
];

export default config;
