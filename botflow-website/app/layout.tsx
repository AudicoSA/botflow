import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "BotFlow - Automate Every WhatsApp Conversation",
    description: "Build AI-powered WhatsApp service agents in minutes. No coding required. Transform your customer experience with intelligent automation.",
    keywords: ["WhatsApp automation", "AI chatbot", "WhatsApp Business API", "customer service automation", "South Africa"],
    authors: [{ name: "BotFlow" }],
    openGraph: {
        title: "BotFlow - Automate Every WhatsApp Conversation",
        description: "Build AI-powered WhatsApp service agents in minutes. No coding required.",
        url: "https://botflow.co.za",
        siteName: "BotFlow",
        locale: "en_ZA",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "BotFlow - Automate Every WhatsApp Conversation",
        description: "Build AI-powered WhatsApp service agents in minutes. No coding required.",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className={`${inter.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}
