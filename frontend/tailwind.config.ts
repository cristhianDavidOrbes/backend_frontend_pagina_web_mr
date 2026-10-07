import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        canvas: token("bg"),
        deep: token("bg-deep"),
        surface: {
          DEFAULT: token("surface-1"),
          2: token("surface-2"),
          3: token("surface-3"),
        },
        line: token("line-rgb"),
        ink: {
          DEFAULT: token("text"),
          2: token("text-2"),
          3: token("text-3"),
        },
        action: {
          DEFAULT: token("action"),
          strong: token("action-strong"),
          on: token("on-action"),
        },
        info: token("info"),
        progress: token("progress"),
        danger: token("danger"),
        success: token("success"),
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        spring: "var(--ease-spring)",
      },
    },
  },
  plugins: [],
};

export default config;
