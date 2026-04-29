import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blush: "#F8D7DA",
        rose: "#E8A5B0",
        "hot-pink": "#D63384",
        cream: "#FBF7F2",
        pearl: "#FFFFFF",
        champagne: "#E8D5B7",
        gold: "#C9A961",
        noir: "#1A0F1A",
        smoke: "#6B4F5E",
      },
      fontFamily: {
        display: ["var(--font-display)", "Cormorant Garamond", "GT Sectra Display", "serif"],
        sans: ["var(--font-body)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        script: ["var(--font-script)", "Pinyon Script", "La Belle Aurore", "cursive"],
      },
      fontFeatureSettings: {
        oldstyle: '"onum" on, "lnum" off',
      },
      backgroundImage: {
        "champagne-gold": "linear-gradient(135deg, #E8D5B7 0%, #C9A961 100%)",
        "silk-blush": "linear-gradient(180deg, #FBF7F2 0%, #F8D7DA 100%)",
        "boudoir-glow":
          "radial-gradient(80% 60% at 50% 0%, rgba(232,165,176,0.35) 0%, rgba(251,247,242,0) 70%)",
      },
      boxShadow: {
        vanity: "0 30px 80px -40px rgba(214, 51, 132, 0.25), 0 8px 30px -12px rgba(26,15,26,0.08)",
        pearl: "0 4px 20px -8px rgba(26,15,26,0.12)",
        gold: "0 8px 24px -10px rgba(201, 169, 97, 0.55)",
      },
      borderRadius: {
        atelier: "1.25rem",
        vanity: "2rem",
      },
      keyframes: {
        sparkleDrift: {
          "0%, 100%": { transform: "translateX(0) translateY(0) rotate(0deg)", opacity: "0.7" },
          "50%": { transform: "translateX(8px) translateY(-4px) rotate(15deg)", opacity: "1" },
        },
        bowSpin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        polaroidDevelop: {
          "0%": { opacity: "0", filter: "blur(8px) saturate(0.6)", transform: "scale(0.97)" },
          "100%": { opacity: "1", filter: "blur(0) saturate(1)", transform: "scale(1)" },
        },
        ribbonPulse: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "sparkle-drift": "sparkleDrift 3.5s ease-in-out infinite",
        "bow-spin": "bowSpin 2.4s linear infinite",
        "polaroid-develop": "polaroidDevelop 700ms ease-out both",
        "ribbon-pulse": "ribbonPulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
