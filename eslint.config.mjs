import globals from "globals";
import { defineConfig } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
    { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: globals.browser } },
    { files: ["**/*.js"], plugins: { js }, extends: ["js/recommended"] },
    {
        rules: {
            "no-unused-vars": "off", // ts_ls already gives this warning.
            "no-undef": "warn",
        },
    },
]);
