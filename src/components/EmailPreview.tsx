import { useState } from 'react';
import { Monitor, Smartphone, FileText } from 'lucide-react';
import { formatFileSize } from '../utils/format';
import { getFileIcon, getExtensionDisplay, formatExpiryDisplay, formatDownloadLimitDisplay } from '../utils/file-metadata';
import type { SelectedFile } from '../types';

interface EmailPreviewProps {
  senderName: string;
  senderCompany: string;
  senderEmail: string;
  recipientName: string;
  message: string;
  files: SelectedFile[];
  expiresAt: string;
  downloadLimit: number | null;
  subject: string;
}

type ViewMode = 'html-desktop' | 'html-mobile' | 'text';

export default function EmailPreview({
  senderName,
  senderCompany,
  recipientName,
  message,
  files,
  expiresAt,
  downloadLimit,
  subject,
}: EmailPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('html-desktop');

  const expiryDisplay = formatExpiryDisplay(expiresAt);
  const limitDisplay = formatDownloadLimitDisplay(downloadLimit);
  const bulkUrl = `${window.location.origin}/d/preview`;

  const renderHtml = () => (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: '#f4f6f9', margin: 0, padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ background: '#1A56DB', padding: '24px 32px', borderRadius: '8px 8px 0 0' }}>
          <p style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
            {senderCompany || 'SecureShare'}
          </p>
        </div>

        <div style={{ background: '#ffffff', padding: '32px', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#64748B', fontSize: '14px' }}>{recipientName || '受信者'} 様</p>
          <div style={{ color: '#1E293B', fontSize: '15px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
            {message || '（メッセージ未入力）'}
          </div>

          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '20px', margin: '24px 0' }}>
            <p style={{ color: '#1A56DB', fontWeight: 'bold', fontSize: '15px', margin: '0 0 16px' }}>
              📁 共有ファイル（{files.length}件）
            </p>

            {files.map((f, i) => {
              const icon = getFileIcon(f.name);
              const ext = getExtensionDisplay(f.name);
              return (
                <div
                  key={f.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px', background: '#fff', borderRadius: '6px', marginBottom: '8px',
                    border: '1px solid #DBEAFE',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
                    <span style={{ color: '#1E293B', fontWeight: 'bold', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ color: '#64748B', fontSize: '12px', marginLeft: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {ext} · {formatFileSize(f.size)}
                    </span>
                  </div>
                  <span
                    style={{
                      background: '#1A56DB', color: '#fff', textDecoration: 'none',
                      padding: '6px 14px', borderRadius: '4px', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    ダウンロード
                  </span>
                </div>
              );
            })}

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <span
                style={{
                  background: '#0F172A', color: '#fff', textDecoration: 'none',
                  padding: '12px 28px', borderRadius: '6px', fontSize: '14px',
                  fontWeight: 'bold', display: 'inline-block',
                }}
              >
                まとめてダウンロード（ZIP）
              </span>
            </div>
          </div>

          <div style={{ background: '#FEF9C3', border: '1px solid #FDE047', borderRadius: '6px', padding: '12px 16px', fontSize: '13px', color: '#713F12' }}>
            <strong>有効期限：</strong>{expiryDisplay}　／　<strong>DL制限：</strong>{limitDisplay}
          </div>
        </div>

        <div style={{ background: '#F1F5F9', padding: '16px 32px', borderRadius: '0 0 8px 8px', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
          このメールは SecureShare から自動送信されています。
        </div>
      </div>
    </div>
  );

  const renderPlainText = () => {
    const lines = [
      `${recipientName || '受信者'} 様`,
      '',
      message || '（メッセージ未入力）',
      '',
      '────────────────────────────────',
      `■ 共有ファイル一覧（${files.length}件）`,
      '────────────────────────────────',
    ];

    const indices = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
    files.forEach((f, i) => {
      lines.push(`${indices[i] || `(${i + 1})`} ${f.name}`);
      lines.push(`   種別: ${getExtensionDisplay(f.name)}  /  サイズ: ${formatFileSize(f.size)}`);
      lines.push(`   ダウンロード: ${window.location.origin}/d/preview/f/token${i}`);
      lines.push('');
    });

    lines.push('────────────────────────────────');
    lines.push('■ まとめてダウンロード（ZIP）');
    lines.push(`  ${bulkUrl}`);
    lines.push('');
    lines.push(`■ 有効期限：${expiryDisplay}`);
    lines.push(`■ ダウンロード制限：${limitDisplay}`);
    lines.push('────────────────────────────────');
    lines.push('');
    lines.push(senderName || '送信者');
    lines.push(senderCompany || '');
    lines.push('');
    lines.push('※ このメールは SecureShare から自動送信されています。');

    return lines.join('\n');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('html-desktop')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'html-desktop' ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
        >
          <Monitor className="h-3.5 w-3.5" /> PC表示
        </button>
        <button
          onClick={() => setViewMode('html-mobile')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'html-mobile' ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
        >
          <Smartphone className="h-3.5 w-3.5" /> スマートフォン
        </button>
        <button
          onClick={() => setViewMode('text')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'text' ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
        >
          <FileText className="h-3.5 w-3.5" /> テキスト版
        </button>
      </div>

      <div className="rounded-lg border border-surface-200 bg-surface-50 p-2">
        <div className="bg-white rounded border border-surface-200 p-3 mb-2 text-sm">
          <div className="flex items-center gap-2 text-surface-500">
            <span className="font-medium text-surface-700">件名:</span> {subject || '（未入力）'}
          </div>
        </div>

        {viewMode === 'text' ? (
          <pre className="bg-white rounded border border-surface-200 p-4 text-sm text-surface-700 font-mono whitespace-pre-wrap leading-relaxed overflow-auto max-h-[500px]">
            {renderPlainText()}
          </pre>
        ) : (
          <div
            className="bg-white rounded border border-surface-200 overflow-auto max-h-[500px]"
            style={{ maxWidth: viewMode === 'html-mobile' ? '375px' : '100%', margin: viewMode === 'html-mobile' ? '0 auto' : undefined }}
          >
            {renderHtml()}
          </div>
        )}
      </div>
    </div>
  );
}
