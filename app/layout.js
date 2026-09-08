// Font
import { Inter } from "next/font/google";
// Providers
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SubmissionsProvider } from "@/components/SubmissionsProvider";
// Styling
import "./globals.css";

export const metadata = {
  title: "GDG on Campus · VIT Chennai | Technical Recruitment 2026",
  description:
    "Official Technical Recruitment 2026 Portal for Google Developer Groups on Campus at VIT Chennai — Learn, Build, Collaborate, Contribute, Grow.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        <SubmissionsProvider>
          {children}
          <Toaster />
        </SubmissionsProvider>
      </body>
    </html>
  );
}
