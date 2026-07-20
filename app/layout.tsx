import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Agent 日报与问答',
  description: '面向 AI Agent 面试展示的日报与大模型问答项目',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
