import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: { gold: "#b07a38", forest: "#0f1b2f" } }
    }
  },
  plugins: []
};
export default config;
