/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B1020',
          surface: '#131A2E',
          'surface-2': '#1C2540',
          border: '#2A3556',
        },
        primary: {
          DEFAULT: '#7C5CFF',
          hover: '#6B4DE6',
        },
        gold: {
          DEFAULT: '#F5C451',
          hover: '#E8A33D',
        },
        status: {
          correct: '#34D399',
          wrong: '#FB7185',
          warning: '#FBBF24',
        },
        content: {
          main: '#F1F5F9',
          muted: '#94A3B8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
      },
      boxShadow: {
        premium: '0 10px 30px rgba(0, 0, 0, 0.35)',
        'violet-glow': '0 0 25px rgba(124, 92, 255, 0.25)',
      },
      animation: {
        blob: "blob 20s infinite alternate",
        "cursor-float": "cursorFloat 1.5s ease-out forwards",
        "scroll": "scroll 40s linear infinite",
      },
      keyframes: {
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(50px, -80px) scale(1.2)",
          },
          "66%": {
            transform: "translate(-40px, 40px) scale(0.8)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
        cursorFloat: {
          "0%": {
            opacity: "0.8",
            marginTop: "0px",
            filter: "blur(0px)",
          },
          "100%": {
            opacity: "0",
            marginTop: "-80px",
            filter: "blur(4px)",
          },
        },
        scroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }, /* Moving left by half because content is duplicated */
        }
      },
    },
  },
  plugins: [],
}
