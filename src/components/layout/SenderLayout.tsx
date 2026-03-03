import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'ダッシュボード', subtitle: '送信状況の概要' },
  '/delivery/new': { title: '新規送信', subtitle: 'ファイルを安全に送信' },
  '/history': { title: '送信履歴', subtitle: '過去の送信を管理' },
  '/contacts': { title: 'アドレス帳', subtitle: '連絡先を管理' },
  '/templates': { title: 'テンプレート', subtitle: 'メールテンプレートを管理' },
  '/settings': { title: '設定', subtitle: 'システム設定' },
};

export default function SenderLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  const pageInfo = Object.entries(pageTitles).find(([key]) => pathname.startsWith(key));
  const { title, subtitle } = pageInfo?.[1] ?? { title: 'SecureShare' };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        onClose={() => setMobileOpen(false)}
        mobileOpen={mobileOpen}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
