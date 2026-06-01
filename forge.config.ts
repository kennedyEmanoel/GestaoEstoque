import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { PublisherGithub } from '@electron-forge/publisher-github';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'path';
import fs from 'fs';

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/*.node',
    },
    name: 'GestaoEstoque',
    executableName: 'GestaoEstoque',
  },
  rebuildConfig: {
    extraModules: ['better-sqlite3'],
  },
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      // Copia better-sqlite3 e suas dependências para dentro do pacote
      const deps = ['better-sqlite3', 'bindings', 'file-uri-to-path'];
      for (const dep of deps) {
        const src  = path.join(process.cwd(), 'node_modules', dep);
        const dest = path.join(buildPath,      'node_modules', dep);
        if (fs.existsSync(src)) copyDirSync(src, dest);
      }
    },
  },
  publishers: [
    new PublisherGithub({
      repository: { owner: 'kennedyEmanoel', name: 'GestaoEstoque' },
      prerelease: false,
    }),
  ],
  makers: [
    new MakerSquirrel({
      name: 'GestaoEstoque',
      setupExe: 'GestaoEstoque-Setup.exe',
      noMsi: true,
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
