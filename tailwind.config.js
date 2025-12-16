/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      // 1. On définit les keyframes (le mouvement)
      keyframes: {
        'infinite-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }, // On bouge de 50% car on a dupliqué la liste
        }
      },
      // 2. On crée la classe utilitaire 'animate-infinite-scroll'
      animation: {
        'infinite-scroll': 'infinite-scroll 40s linear infinite',
      },
    },
  },
  plugins: [],
}