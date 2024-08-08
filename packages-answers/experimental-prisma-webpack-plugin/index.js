const path = require('path');
const fs = require('fs/promises');

// when client is bundled this gets its output path
// regex works both on escaped and non-escaped code
const prismaDirRegex =
  /\\?"?output\\?"?:\s*{(?:\\n?|\s)*\\?"?value\\?"?:(?:\\n?|\s)*\\?"(.*?)\\?",(?:\\n?|\s)*\\?"?fromEnvVar\\?"?/g;

async function getPrismaDir(from) {
  // if we can find schema.prisma in the path, we are done
  if (await fs.stat(path.join(from, 'schema.prisma')).catch(() => false)) {
    return from;
  }

  // otherwise we need to find the generated prisma client
  return path.dirname(require.resolve('.prisma/client', { paths: [from] }));
}

// get all required prisma files (schema + engine)
async function getPrismaFiles(from) {
  const prismaDir = await getPrismaDir(from);
  const filterRegex = /schema\.prisma|engine/;
  const prismaFiles = await fs.readdir(prismaDir);

  return prismaFiles.filter((file) => file.match(filterRegex));
}

let schemaCount = 0;
const fromDestPrismaMap = {}; // { [from]: dest }

class PrismaPlugin {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * @param {import('webpack').Compiler} compiler
   */
  apply(compiler) {
    const { webpack } = compiler;
    const { Compilation, sources } = webpack;

    // read bundles to find which prisma files to copy (for all users)
    compiler.hooks.compilation.tap('PrismaPlugin', (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: 'PrismaPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ANALYSE
        },
        async (assets) => {
          const jsAssetNames = Object.keys(assets).filter((k) => k.endsWith('.js'));
          const jsAsyncActions = jsAssetNames.map(async (assetName) => {
            // prepare paths
            const outputDir = compiler.outputPath;
            const assetPath = path.resolve(outputDir, assetName);
            const assetDir = path.dirname(assetPath);
            // get sources
            const oldSourceAsset = compilation.getAsset(assetName);
            const oldSourceContents = oldSourceAsset.source.source() + '';

            // update sources
            for (const match of oldSourceContents.matchAll(prismaDirRegex)) {
              const prismaDir = await getPrismaDir(match[1]);
              const prismaFiles = await getPrismaFiles(match[1]);

              prismaFiles.forEach(async (f) => {
                const from = path.join(prismaDir, f);

                // if we have multiple schema.prisma files, we need to rename them
                if (f === 'schema.prisma' && fromDestPrismaMap[from] === undefined) {
                  f += ++schemaCount;
                }

                // if we already have renamed it, we need to get its "renamed" name
                if (f.includes('schema.prisma') && fromDestPrismaMap[from] !== undefined) {
                  f = path.basename(fromDestPrismaMap[from]);
                }

                if (f.includes('schema.prisma')) {
                  // update "schema.prisma" to "schema.prisma{number}" in the sources
                  const newSourceString = oldSourceContents.replace(/schema\.prisma/g, f);
                  const newRawSource = new sources.RawSource(newSourceString);
                  compilation.updateAsset(assetName, newRawSource);
                }

                // update copy map
                fromDestPrismaMap[from] = path.join(assetDir, f);
              });
            }
          });

          await Promise.all(jsAsyncActions);
        }
      );
    });

    // update nft.json files to include prisma files (only for next.js)
    compiler.hooks.compilation.tap('PrismaPlugin', (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: 'PrismaPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ANALYSE
        },
        async (assets) => {
          const nftAssetNames = Object.keys(assets).filter((k) => k.endsWith('.nft.json'));
          const nftAsyncActions = nftAssetNames.map((assetName) => {
            // prepare paths
            const outputDir = compiler.outputPath;
            const assetPath = path.resolve(outputDir, assetName);
            const assetDir = path.dirname(assetPath);

            // get sources
            const oldSourceAsset = compilation.getAsset(assetName);
            const oldSourceContents = oldSourceAsset.source.source() + '';
            const ntfLoadedAsJson = JSON.parse(oldSourceContents);

            // update sources
            Object.entries(fromDestPrismaMap).forEach(([from, dest]) => {
              ntfLoadedAsJson.files.push(path.relative(assetDir, dest));
            });

            // persist sources
            const newSourceString = JSON.stringify(ntfLoadedAsJson);
            const newRawSource = new sources.RawSource(newSourceString);
            compilation.updateAsset(assetName, newRawSource);
          });

          await Promise.all(nftAsyncActions);
        }
      );
    });

    // copy prisma files to output as the final step (for all users)
    compiler.hooks.done.tapPromise('PrismaPlugin', async () => {
      // console.log('fromDestPrismaMap', fromDestPrismaMap);
      const asyncActions = Object.entries(fromDestPrismaMap).map(async ([from, dest]) => {
        // only copy if file doesn't exist, necessary for watch mode
        const folder = path.dirname(dest);
        // Create path if it doesn't exist
        await fs.mkdir(folder, { recursive: true });
        if ((await fs.access(dest).catch(() => false)) === false) {
          return fs.copyFile(from, dest);
        }
      });

      await Promise.all(asyncActions);
    });
  }
}

module.exports = { PrismaPlugin };
