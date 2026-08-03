import { Cairo, Tajawal } from "next/font/google";
import "./globals.css";
import "@/lib/pi/piReady";
import { BottomNav } from "@/components/bottom-nav";
import { PiSdkLoader } from "@/components/pi-sdk-loader";
import { StoreAssistant } from "@/components/store-assistant";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["600", "700", "800"],
  variable: "--font-cairo",
});

export const metadata = {
  title: "سوق π — تسوّق وادفع بعملة Pi",
  description: "سوق باي: سوق إلكتروني متكامل تتسوّق فيه وتدفع مباشرة بعملة Pi.",
};

export const viewport = {
  themeColor: "#2e1065",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={`bg-background ${tajawal.variable} ${cairo.variable}`}>
      <body className="antialiased">
        <PiSdkLoader />
        <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background shadow-sm">
          <div className="flex-1 pb-20">{children}</div>
          <BottomNav />
          <StoreAssistant />
        </div>
      </body>
    </html>
  );
}
