import gulp from 'gulp'
import fs from 'fs'
import path from 'path'
import esbuild from 'gulp-esbuild'

const { src, dest } = gulp

function copyIcons() {
    return src(['nodes/**/*.{jpg,png,svg}']).pipe(dest('dist/nodes'))
}



const ROOT_DIR = path.resolve(__dirname, 'nodes');
const DIST_DIR = path.resolve(__dirname, 'dist/node');

function copyIconByPath(filePath: string) {
  return src([filePath]).pipe(dest(DIST_DIR))
}

function hasExportNodeClass(filePath: string) {
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
    const exportMatch = (/module\.exports = { nodeClass:/).test(fileContent);
    // return false;
    return exportMatch;
  }
  function processTsFile(filePath: string) {
    const nodeClass = hasExportNodeClass(filePath);
    console.log('nodeClass', nodeClass, filePath)

    if (nodeClass) {
      return gulp.src(filePath)
        .pipe(esbuild({
          target: 'node18',
          format: 'cjs',
          bundle: true,
          minifyWhitespace: true,
          tsconfig: path.join(__dirname, 'tsconfig.json'),
          sourcemap: false,
          platform: 'node',
          external: [
            'langchain',
            'axios'
          ]
        }))
        .pipe(gulp.dest(`${DIST_DIR}`));
    }
    return Promise.resolve();
  }
// create a gulp task to build file
const build = () => {
    return new Promise(async (resolve, reject) => {
        const queue = [ROOT_DIR];
        while (queue.length > 0) {
          const dir = queue.shift();
          if (dir) {
            const dirContent = fs.readdirSync(dir);
            for (const contentItem of dirContent) {
              const contentPath = path.join(dir, contentItem);
              const isDir = fs.statSync(contentPath).isDirectory();
              if (isDir) {
                queue.push(contentPath);
              } else if (contentItem.endsWith('.ts')) {
                const nodeModule = await require(contentPath)
                if (nodeModule.nodeClass) {
                  const newNodeInstance = new nodeModule.nodeClass()
                  newNodeInstance.filePath = `https://bp0r55-node-js.oss.laf.dev/${contentItem.replace('.ts', '.js')}`;
  
                  if (
                      newNodeInstance.icon &&
                      (newNodeInstance.icon.endsWith('.svg') ||
                          newNodeInstance.icon.endsWith('.png') ||
                          newNodeInstance.icon.endsWith('.jpg'))
                  ) {
                      const filePath = contentPath.replace(/\\/g, '/').split('/')
                      filePath.pop()
                      const nodeIconAbsolutePath = `${filePath.join('/')}/${newNodeInstance.icon}`
                      copyIconByPath(nodeIconAbsolutePath)
                      newNodeInstance.icon = `https://bp0r55-node-js.oss.laf.dev/${newNodeInstance.icon}`
                  }
                   //  发送一个请求，写入数据库
                   interface INodeColumn {
                    baseClasses: string;
                    inputs: string;
                    outputs?: string;
                    label: string;
                    name: string;
                    type: string;
                    icon: string;
                    category: string;
                    description?: string;
                    filePath?: string;
                }
                  const data: INodeColumn = {
                    name: newNodeInstance.name,
                    label: newNodeInstance.label,
                    type: newNodeInstance.type,
                    baseClasses: JSON.stringify(newNodeInstance.baseClasses),
                    inputs: JSON.stringify(newNodeInstance.inputs),
                    outputs: newNodeInstance.outputs ? JSON.stringify(newNodeInstance.outputs) : undefined,
                    icon: newNodeInstance.icon,
                    category: newNodeInstance.category,
                    description: newNodeInstance.description,
                    filePath: newNodeInstance.filePath
                  }
                  // fetch post请求，写入
                  fetch('http://127.0.0.1:3000/api/v1/node', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                  })
                }
             
                processTsFile(contentPath)
              }
            }
          }
        }
        resolve(true);
      });
}
exports.build = build
exports.default = copyIcons
