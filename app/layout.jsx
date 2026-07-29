import { Outfit } from "next/font/google"
import { Toaster } from "react-hot-toast"
import { AppProvider } from "@/context/AppContext"
import { ThemeProvider } from "@/context/ThemeContext"
import "./globals.css"

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] })

export const metadata = {
  title: "IntelliMart — Shop Smarter",
  description: "IntelliMart — AI-powered multivendor e-commerce. Built by Asad.",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} antialiased`}>
        <ThemeProvider>
          <AppProvider>
            <Toaster position="top-right" />
            {children}
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
