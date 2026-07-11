import "./globals.css";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { AuthProvider } from "@/src/lib/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />

          <div className="flex">
            <Sidebar />

            <main className="flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
