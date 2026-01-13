/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontSize: {
        "course-heading-sm": ["26px", { lineHeight: "36px" }],
        "course-heading-lg": ["36px", { lineHeight: "44px" }],
        "home-heading-sm": ["28px", { lineHeight: "34px" }],
        "home-heading-lg": ["48px", { lineHeight: "56px" }],
      },
    },
  },
  plugins: [],
};
