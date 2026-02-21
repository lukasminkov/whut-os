import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#06060f",
        primary: "#00d4aa",
        secondary: "#6366f1",
      },
      boxShadow: {
        glow: "0 0 30px rgba(0, 212, 170, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
