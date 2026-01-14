import type { Config } from "tailwindcss";

export default {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    blue: '#0066FF',
                    cyan: '#00D4FF',
                },
                surf: {
                    DEFAULT: '#00B4D8',
                    light: '#90E0EF',
                    dark: '#0077B6', // Darkened slightly for better contrast
                    darker: '#03045E',
                },
                sand: {
                    DEFAULT: '#FDF6E3',
                    dark: '#E6DCC5',
                },
                sunset: {
                    DEFAULT: '#FF9F1C',
                    pink: '#FF99C8',
                },
                ocean: {
                    DEFAULT: '#0077B6',
                    deep: '#03045E',
                },
                dark: {
                    navy: '#0A1628',
                },
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'hero-pattern': "url('/hero-pattern.svg')", // Placeholder if needed
            }
        },
    },
    plugins: [],
} satisfies Config;
