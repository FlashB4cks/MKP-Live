/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          sidebar: '#1e1f22',
          channels: '#2b2d31',
          chat: '#313338',
          input: '#383a40',
          hover: '#35373c',
          active: '#404249',
          blurple: '#5865f2',
          'blurple-hover': '#4752c4',
          green: '#23a55a',
          red: '#f23f43',
          yellow: '#f0b232',
          text: '#dbdee1',
          'text-muted': '#949ba4',
          'text-header': '#f2f3f5',
        }
      }
    },
  },
  plugins: [],
}
