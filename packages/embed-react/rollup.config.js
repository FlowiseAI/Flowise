import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import { babel } from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import { typescriptPaths } from "rollup-plugin-typescript-paths";

const extensions = [".ts", ".tsx"];

const indexConfig = {
  input: "./src/index.ts",
  output: {
    file: "./dist/index.js",
    format: "es",
  },
  external: ["react", "react/jsx-runtime", "flowise-embed"],
  plugins: [
    resolve({ extensions }),
    babel({
      babelHelpers: "bundled",
      exclude: "node_modules/**",
      presets: ["@babel/preset-react", "@babel/preset-typescript"],
      extensions,
    }),
    typescript(),
    typescriptPaths({ preserveExtensions: true }),
    terser({ output: { comments: false } }),
  ],
};

const configs = [indexConfig];

export default configs;
