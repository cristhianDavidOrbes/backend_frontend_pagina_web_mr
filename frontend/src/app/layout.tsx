import type { Metadata, Viewport } from "next";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://algolab-navy.vercel.app";

export const viewport: Viewport = {
  themeColor: "#050c0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AlgoLab | Laboratorio de Programación POO en Realidad Mixta",
    template: "%s | AlgoLab",
  },
  description:
    "AlgoLab es una plataforma interactiva de aprendizaje de Programación Orientada a Objetos (POO) mediante Realidad Mixta (Meta Quest), mentor pedagógico con inteligencia artificial y simulador de código.",
  keywords: [
    "AlgoLab",
    "POO",
    "Programación Orientada a Objetos",
    "Realidad Mixta",
    "Meta Quest",
    "Aprender Programación",
    "Python",
    "Java",
    "Laboratorio Interactivo",
    "Mentor IA",
    "Encapsulamiento",
    "Herencia",
    "Polimorfismo",
    "Clases y Objetos",
  ],
  authors: [{ name: "AlgoLab Team" }],
  creator: "AlgoLab",
  publisher: "AlgoLab",
  applicationName: "AlgoLab",
  generator: "Next.js",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: siteUrl,
    siteName: "AlgoLab",
    title: "AlgoLab | Aprende Programación Orientada a Objetos en Realidad Mixta",
    description:
      "Convierte la programación orientada a objetos en un laboratorio interactivo en realidad mixta con mentor pedagógico de IA.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AlgoLab | Programación Orientada a Objetos en Realidad Mixta",
    description:
      "Laboratorio interactivo de POO con realidad mixta Meta Quest y mentor pedagógico con inteligencia artificial.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AlgoLab",
    url: siteUrl,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, Meta Quest VR/MR",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Plataforma educativa de programación orientada a objetos en realidad mixta con mentor pedagógico de inteligencia artificial.",
  };

  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
