import { useSearchParams } from 'react-router-dom';
import { Server, Bell, Shield, User, PenLine } from 'lucide-react';
import ProfileSettings from './settings/ProfileSettings';
import ServerSettings from './settings/ServerSettings';
import NotificationSettings from './settings/NotificationSettings';
import SecuritySettings from './settings/SecuritySettings';
import SignaturesSettings from './settings/SignaturesSettings';

type SettingsTab = 'profile' | 'servers' | 'notifications' | 'security' | 'signatures';

const validTabs: SettingsTab[] = ['profile', 'servers', 'notifications', 'security', 'signatures'];

const tabs: { id: SettingsTab; label: string; icon: typeof Server }[] = [
  { id: 'profile', label: 'プロフィール', icon: User },
  { id: 'servers', label: 'サーバー設定', icon: Server },
  { id: 'notifications', label: '通知設定', icon: Bell },
  { id: 'security', label: 'セキュリティ', icon: Shield },
  { id: 'signatures', label: '署名', icon: PenLine },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: SettingsTab = validTabs.includes(rawTab as SettingsTab)
    ? (rawTab as SettingsTab)
    : 'profile';

  const setTab = (id: SettingsTab) => {
    setSearchParams({ tab: id }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600'}`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="card p-6 lg:p-8 animate-fade-in" key={tab}>
        {tab === 'profile' && <ProfileSettings />}
        {tab === 'servers' && <ServerSettings />}
        {tab === 'notifications' && <NotificationSettings />}
        {tab === 'security' && <SecuritySettings />}
        {tab === 'signatures' && <SignaturesSettings />}
      </div>
    </div>
  );
}
