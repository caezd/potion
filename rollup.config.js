import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import external from "rollup-plugin-peer-deps-external";
import terser from "@rollup/plugin-terser";

const name = "potion";

export default [
    {
        input: "src/main.js",
        output: [
            {
                name,
                file: "dist/potion.min.js",
                format: "iife",
            },
            {
                file: "dist/potion.esm.min.js",
                format: "es",
            },
        ],
        plugins: [
            commonjs(),
            resolve({
                browser: true,
            }),
        ],
    },
    {
        input: "src/main-diet.js",
        output: [
            {
                name,
                file: "dist/diet/potion-diet.js",
                format: "iife",
            },
            {
                file: "dist/diet/potion-diet.esm.min.js",
                format: "es",
            },
        ],
        plugins: [
            terser(),
            external({ includeDependencies: true }),
            resolve(),
            commonjs(),
        ],
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
