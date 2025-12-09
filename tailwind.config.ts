/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html","./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope","Cairo","Poppins","ui-sans-serif","system-ui","sans-serif"],
        display: ["Manrope","Poppins","ui-sans-serif","system-ui","sans-serif"],
      },
      colors: {
        primary: "#E53935",
        "primary-foreground": "#FFFFFF",
        secondary: "#0F172A",
        "secondary-foreground": "#FFFFFF",
        muted: "#F6F7FB",
        "muted-foreground": "#5F6B7A",
        success: "#16A34A",
        danger: "#D92D20",
        warning: "#F59E0B",
        info: "#2563EB",
        card: "#FFFFFF",
        "card-foreground": "#0F172A",
        accent: "#FFF2F1",
      },
      borderRadius: {
        lg: "12px",
        xl: "18px",
        "2xl": "24px",
      },
      boxShadow: {
        card: "0 10px 30px rgba(15, 23, 42, 0.06)",
        "nav-soft": "0 -4px 18px rgba(15, 23, 42, 0.08)",
        "elevated": "0 12px 35px rgba(16, 24, 40, 0.12)",
      },
    },
  },
  plugins: [],
};
