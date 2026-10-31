import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ライフプラン＆投資シミュレータ",
  description: "世帯収入・ライフイベント・複数ファンド運用を掛け合わせた生涯キャッシュフローの可視化",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
