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
  title: "WHUT OS — See Everything. Touch Nothing.",
  description:
    "See everything. Touch nothing. WHUT OS replaces every app with a single voice-driven intelligent surface. Private beta 2026.",
  metadataBase: new URL("https://whut.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "WHUT OS — See Everything. Touch Nothing.",
    description:
      "WHUT OS replaces every app with a single voice-driven intelligent surface. Private beta 2026.",
    url: "https://whut.ai",
    siteName: "WHUT OS",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "WHUT OS — See Everything. Touch Nothing.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WHUT OS — See Everything. Touch Nothing.",
    description:
      "WHUT OS replaces every app with a single voice-driven intelligent surface. Private beta 2026.",
    images: ["/og-image.svg"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "WHUT OS",
  description:
    "WHUT OS replaces every app with a single voice-driven intelligent surface. Private beta 2026.",
  url: "https://whut.ai",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/PreOrder",
    description: "Private beta waitlist — launching 2026",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <noscript>
          <style>{`
            [style*="opacity: 0"], [style*="opacity:0"],
            .motion-safe-hidden {
              opacity: 1 !important;
              transform: none !important;
            }
          `}</style>
        </noscript>
        <style>{`
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
            [style*="opacity: 0"], [style*="opacity:0"] {
              opacity: 1 !important;
              transform: none !important;
            }
          }
        `}</style>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
