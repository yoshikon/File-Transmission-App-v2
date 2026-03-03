import { useState, useEffect } from 'react';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ProfileSettings() {
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
      setDepartment(profile.department || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, email, department })
      .eq('id', user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="text-lg font-semibold text-surface-800">プロフィール設定</h3>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-xl font-bold">
          {fullName ? fullName.slice(0, 2) : 'U'}
        </div>
      </div>
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">氏名</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">メールアドレス</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">部署</label>
          <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="例：営業部" className="input-field" />
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          保存
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600 animate-fade-in">
            <CheckCircle2 className="h-4 w-4" /> 保存しました
          </span>
        )}
      </div>
    </div>
  );
}
