import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif;">
        <div style="max-width: 500px; padding: 32px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h1 style="color: #dc2626; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">設定エラー</h1>
          <p style="color: #374151; margin: 0 0 16px 0; line-height: 1.5;">
            Supabaseの環境変数が設定されていません。
          </p>
          <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5;">
            <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">.env</code>
            ファイルに以下の変数が設定されているか確認してください：
          </p>
          <ul style="color: #6b7280; margin: 12px 0; font-size: 14px; line-height: 1.5;">
            <li><code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">VITE_SUPABASE_URL</code></li>
            <li><code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">VITE_SUPABASE_ANON_KEY</code></li>
          </ul>
          <p style="color: #6b7280; margin: 16px 0 0 0; font-size: 14px; line-height: 1.5;">
            設定後、開発サーバーを再起動してください。
          </p>
        </div>
      </div>
    `;
  }
  console.error('Application initialization error:', error);
}
