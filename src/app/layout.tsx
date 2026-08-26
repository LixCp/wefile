import type {Metadata} from "next";
import {Geist, Geist_Mono, Vazirmatn} from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";


const vazirMatn = Vazirmatn({
    variable: "--font-vazir-matn",
    subsets: ["arabic", "latin"],
    weight: ["500", "800", "900"],
})
const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "WeFile",
    description: "به اشتراک‌گذاری سریع و امن فایل با شناسه اختصاصی",
};

export default function RootLayout({children}: LayoutProps<"/">) {
    return (
        <html
            lang="fa"
            dir="rtl"
            className={`${geistSans.variable} ${vazirMatn.variable} ${geistMono.variable} h-full antialiased`}
        >
        <body className="min-h-full flex flex-col">
            {children}
            <Toaster />
            </body>
        </html>
    );
}
