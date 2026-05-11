import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Closer Creator Dashboard",
  description:
    "Creator discovery and campaign review platform for agencies, consultancies, and SaaS teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="border-t py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
            <a href="/privacy-policy" className="hover:text-gray-900 underline">
              Privacy Policy
            </a>
            <span className="mx-2">|</span>
            <span>© {new Date().getFullYear()} Closer Ventures Pvt. Ltd.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
