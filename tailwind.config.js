/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // This line tells Tailwind where to find your utility classes
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
