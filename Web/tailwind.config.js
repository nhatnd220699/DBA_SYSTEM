
/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',

    content: [
        './Views/**/*.cshtml',
        './Areas/**/*.cshtml',
        './Scripts/**/*.js',
        './Content/**/*.js'
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
        },
    },

    plugins: [],
};
