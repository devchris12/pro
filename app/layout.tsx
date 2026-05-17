import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "./components/query/QueryProvider";
import { ThemeApplier } from "./components/ThemeApplier";
import SessionHydrator from "./components/middleware/SessionHydrator";
import { MonitoringProvider } from "./components/monitoring/MonitoringProvider";

export const metadata: Metadata = {
  title: {
    default: "InView by MagByte",
    template: "%s | InView",
  },
  description: "InView by MagByte — business analytics for Nigerian SMEs.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://inview.magbyte.biz"),
  openGraph: {
    title: "InView by MagByte",
    description: "See your business clearly — analytics built for Nigerian SMEs.",
    type: "website",
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
        <link
          rel="apple-icon"
          href="/apple-icon.png"
          type="image/<generated>"
          sizes="<generated>"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.png"
          type="image/<generated>"
          sizes="<generated>"
        />
        <link
          rel="icon"
          href="/icon.png"
          type="image/<generated>"
          sizes="<generated>"
        />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="font-[DMSans] antialiased bg-white dark:bg-slate-950 text-black dark:text-slate-100">
        <QueryProvider>
          <SessionHydrator />
          <MonitoringProvider />
          <ThemeApplier />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
