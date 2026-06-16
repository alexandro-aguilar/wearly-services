import { build, context } from 'esbuild';
// import { nodeExternalsPlugin } from 'esbuild-node-externals';
import alias from 'esbuild-plugin-alias';
import { resolve } from 'path';
import fg from 'fast-glob';
// import chokidar from 'chokidar';
import { LogLevel } from 'esbuild';

async function main() {
  const entryPoints = await fg('app/**/interface/handlers/*Handler.ts');
  const isWatchMode = process.argv.includes('--watch');
  console.log(`isWatchMode: ${isWatchMode}`);

  if (!entryPoints || entryPoints.length === 0) {
    console.log('No lambda handler TypeScript files found in app/.');
    process.exit(0);
  }

  // Convert entryPoints array to object mapping for custom output names
  const entryPointsMap = entryPoints.reduce((acc, file) => {
    const handlerName = file.split('/').pop()?.replace('.ts', '') || 'handler';
    acc[handlerName] = file;
    return acc;
  }, {} as Record<string, string>);

  const buildOptions = {
    entryPoints: entryPointsMap,
    bundle: true,
    platform: 'node' as const,
    target: 'node22',
    outdir: './.dist',
    minify: false,
    sourcemap: isWatchMode,
    logLevel: 'info' as LogLevel,
    plugins: [
      // nodeExternalsPlugin({ packagePath: './package.json' }),
      alias({
        '@src': resolve(__dirname, 'app/src'),
        '@tests': resolve(__dirname, 'app/tests'),
        '@root': resolve(__dirname, '.'),
      }),
    ],
  };

  try {
    if (isWatchMode) {
      const ctx = await context(buildOptions);
      await ctx.watch();
    } else {
      await build(buildOptions);
      console.log('✅ TypeScript build successful');
    }
  } catch (error) {
    console.log(entryPoints);
    console.log(resolve(__dirname, 'src'));
    console.error('❌ TypeScript build failed:', error);
    process.exit(1);
  }
}

main();
