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
                dark: {
                    navy: '#0A1628',
                },
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
            },
        },
    },
    plugins: [],
} satisfies Config;
