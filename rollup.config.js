import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import external from "rollup-plugin-peer-deps-external";
import terser from "@rollup/plugin-terser";

const name = "potion";
const plugins = [
    terser(),
    external({ includeDependencies: true }),
    resolve(),
    commonjs(),
];

export default [
    {
        input: "src/test.js",
        output: [{ name: "test", file: "potion/test.js", format: "iife" }],
        plugins: plugins,
    },
    {
        input: "src/main.js",
        output: [
            {
                name,
                file: "potion/potion.min.js",
                format: "iife",
            },
            {
                file: "potion/potion.esm.min.js",
                format: "es",
            },
        ],
        plugins: plugins,
    },
    {
        input: "src/main-diet.js",
        output: [
            {
                name,
                file: "potion-diet/potion.min.js",
                format: "iife",
            },
            {
                file: "potion-diet/potion.esm.min.js",
                format: "es",
            },
        ],
        plugins: plugins,
    },
];

/* import { readFileSync } from "fs";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import external from "rollup-plugin-peer-deps-external";
import terser from "@rollup/plugin-terser";

const packageJson = JSON.parse(readFileSync("./package.json"));

export default {
    input: "./src/main.js",
    output: [
        {
            name: "poumon",
            file: packageJson.browser,
            format: "umd",
        },
        {
            file: packageJson.module,
            format: "es",
        },
    ],
    plugins: [
        terser(),
        external({ includeDependencies: true }),
        resolve(),
        commonjs(),
    ],
};
 */
