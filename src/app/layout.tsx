import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Astana AI | Управление городом",
  description: "Симулятор городских решений и качества жизни районов Астаны",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
