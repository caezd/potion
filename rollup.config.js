import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

const name = "potion";

export default [
    {
        input: "src/main.js",
        output: [
            {
                name,
                file: "dist/potion.js",
                format: "iife",
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
                file: "dist/potion-diet.js",
                format: "iife",
            },
        ],
        plugins: [
            commonjs(),
            resolve({
                browser: true,
            }),
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
