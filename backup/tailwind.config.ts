/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html","./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins","ui-sans-serif","system-ui","sans-serif"],
      },
      colors: {
        primary: "#0D6EFD",
        "primary-foreground": "#FFFFFF",
        secondary: "#6C757D",
        "secondary-foreground": "#FFFFFF",
        muted: "#F2F4F7",
        "muted-foreground": "#667085",
        success: "#17C964",
        danger: "#F31260",
        warning: "#F5A524",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 8px 20px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
