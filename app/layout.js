// Font
import { Inter } from "next/font/google";
// Providers
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SubmissionsProvider } from "@/components/SubmissionsProvider";
// Styling
import "./globals.css";

export const metadata = {
  title: "GDG Recruitment Portal",
  description: "Official GDG Recruitment Portal",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
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
