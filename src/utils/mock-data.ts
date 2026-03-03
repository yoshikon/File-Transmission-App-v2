import type { Delivery, Contact, EmailTemplate } from '../types';

export const mockDeliveries: Delivery[] = [
  {
    id: '1',
    sender_id: 'user-1',
    subject: '2025年度 第3四半期 営業レポート',
    message: 'お世話になっております。第3四半期の営業レポートをお送りいたします。',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    download_limit: 3,
    password_protected: false,
    password_hash: null,
    notify_on_open: true,
    notify_on_download: true,
    scheduled_at: null,
    status: 'sent',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    delivery_files: [
      { id: 'f1', delivery_id: '1', file_name: 'Q3_Report_2025.pdf', file_path: '/reports/', file_size: 2457600, mime_type: 'application/pdf', storage_path: null, created_at: '' },
      { id: 'f2', delivery_id: '1', file_name: 'Sales_Data.xlsx', file_path: '/reports/', file_size: 1048576, mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', storage_path: null, created_at: '' },
    ],
    delivery_recipients: [
      { id: 'r1', delivery_id: '1', recipient_email: 'tanaka@client.co.jp', recipient_type: 'to', token: 'abc123', download_count: 1, first_accessed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), created_at: '' },
      { id: 'r2', delivery_id: '1', recipient_email: 'suzuki@client.co.jp', recipient_type: 'cc', token: 'def456', download_count: 0, first_accessed_at: null, created_at: '' },
    ],
  },
  {
    id: '2',
    sender_id: 'user-1',
    subject: '契約書（最終版）のご送付',
    message: '先日お打ち合わせいただいた契約書の最終版をお送りいたします。',
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    download_limit: null,
    password_protected: true,
    password_hash: null,
    notify_on_open: true,
    notify_on_download: true,
    scheduled_at: null,
    status: 'sent',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    delivery_files: [
      { id: 'f3', delivery_id: '2', file_name: 'Contract_Final_v3.pdf', file_path: '/contracts/', file_size: 5242880, mime_type: 'application/pdf', storage_path: null, created_at: '' },
    ],
    delivery_recipients: [
      { id: 'r3', delivery_id: '2', recipient_email: 'yamada@partner.co.jp', recipient_type: 'to', token: 'ghi789', download_count: 2, first_accessed_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), created_at: '' },
    ],
  },
  {
    id: '3',
    sender_id: 'user-1',
    subject: 'デザインカンプ（修正版）',
    message: 'ご指摘いただいた箇所を修正いたしました。ご確認をお願いいたします。',
    expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    download_limit: 5,
    password_protected: false,
    password_hash: null,
    notify_on_open: true,
    notify_on_download: false,
    scheduled_at: null,
    status: 'sent',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    delivery_files: [
      { id: 'f4', delivery_id: '3', file_name: 'Design_Comp_v2.psd', file_path: '/design/', file_size: 15728640, mime_type: 'application/octet-stream', storage_path: null, created_at: '' },
      { id: 'f5', delivery_id: '3', file_name: 'Design_Preview.png', file_path: '/design/', file_size: 3145728, mime_type: 'image/png', storage_path: null, created_at: '' },
      { id: 'f6', delivery_id: '3', file_name: 'Style_Guide.pdf', file_path: '/design/', file_size: 2097152, mime_type: 'application/pdf', storage_path: null, created_at: '' },
    ],
    delivery_recipients: [
      { id: 'r4', delivery_id: '3', recipient_email: 'design@agency.co.jp', recipient_type: 'to', token: 'jkl012', download_count: 0, first_accessed_at: null, created_at: '' },
    ],
  },
  {
    id: '4',
    sender_id: 'user-1',
    subject: '2024年度 年末調整資料',
    message: '年末調整に必要な資料をお送りいたします。',
    expires_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    download_limit: null,
    password_protected: false,
    password_hash: null,
    notify_on_open: true,
    notify_on_download: true,
    scheduled_at: null,
    status: 'expired',
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    delivery_files: [
      { id: 'f7', delivery_id: '4', file_name: 'Tax_Adjustment_2024.pdf', file_path: '/hr/', file_size: 1048576, mime_type: 'application/pdf', storage_path: null, created_at: '' },
    ],
    delivery_recipients: [
      { id: 'r5', delivery_id: '4', recipient_email: 'hr@external.co.jp', recipient_type: 'to', token: 'mno345', download_count: 1, first_accessed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), created_at: '' },
    ],
  },
  {
    id: '5',
    sender_id: 'user-1',
    subject: 'プロジェクト提案書',
    message: '新規プロジェクトの提案書を添付いたします。ご検討のほどよろしくお願いいたします。',
    expires_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    download_limit: null,
    password_protected: false,
    password_hash: null,
    notify_on_open: true,
    notify_on_download: true,
    scheduled_at: null,
    status: 'sent',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    delivery_files: [
      { id: 'f8', delivery_id: '5', file_name: 'Proposal_2025.pptx', file_path: '/proposals/', file_size: 8388608, mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', storage_path: null, created_at: '' },
      { id: 'f9', delivery_id: '5', file_name: 'Budget_Estimate.xlsx', file_path: '/proposals/', file_size: 524288, mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', storage_path: null, created_at: '' },
    ],
    delivery_recipients: [
      { id: 'r6', delivery_id: '5', recipient_email: 'manager@bigcorp.co.jp', recipient_type: 'to', token: 'pqr678', download_count: 0, first_accessed_at: null, created_at: '' },
      { id: 'r7', delivery_id: '5', recipient_email: 'assistant@bigcorp.co.jp', recipient_type: 'cc', token: 'stu901', download_count: 0, first_accessed_at: null, created_at: '' },
    ],
  },
];

export const mockContacts: Contact[] = [
  { id: 'c1', user_id: 'user-1', name: '田中太郎', email: 'tanaka@client.co.jp', company: '株式会社クライアント', tags: ['営業', 'VIP'], created_at: '' },
  { id: 'c2', user_id: 'user-1', name: '鈴木花子', email: 'suzuki@client.co.jp', company: '株式会社クライアント', tags: ['営業'], created_at: '' },
  { id: 'c3', user_id: 'user-1', name: '山田一郎', email: 'yamada@partner.co.jp', company: 'パートナー株式会社', tags: ['法務'], created_at: '' },
  { id: 'c4', user_id: 'user-1', name: '佐藤美咲', email: 'sato@vendor.co.jp', company: 'ベンダー株式会社', tags: ['デザイン'], created_at: '' },
  { id: 'c5', user_id: 'user-1', name: '高橋健一', email: 'takahashi@agency.co.jp', company: 'エージェンシー株式会社', tags: ['マーケティング'], created_at: '' },
  { id: 'c6', user_id: 'user-1', name: '伊藤直美', email: 'ito@bigcorp.co.jp', company: 'ビッグコープ株式会社', tags: ['VIP', '経営'], created_at: '' },
];

export const mockTemplates: EmailTemplate[] = [
  { id: 't1', user_id: 'user-1', name: 'ファイル送付（標準）', subject: '【ファイル送付】{{subject}}', body: '{{recipient_name}} 様\n\nいつもお世話になっております。\n{{company_name}} の {{sender_name}} です。\n\nご依頼いただいた資料をお送りいたします。\n下記リンクよりダウンロードをお願いいたします。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\nよろしくお願いいたします。', is_shared: true, created_at: '' },
  { id: 't2', user_id: 'user-1', name: '契約書送付', subject: '【契約書送付】{{subject}}', body: '{{recipient_name}} 様\n\nいつもお世話になっております。\n{{company_name}} の {{sender_name}} です。\n\n契約書の最終版をお送りいたします。\n内容をご確認いただき、問題がなければご署名をお願いいたします。\n\nよろしくお願いいたします。', is_shared: false, created_at: '' },
  { id: 't3', user_id: 'user-1', name: 'レポート送付', subject: '【レポート】{{subject}}', body: '{{recipient_name}} 様\n\nお疲れ様です。\n{{sender_name}} です。\n\nレポートを添付いたしましたので、ご確認をお願いいたします。\n\n以上、よろしくお願いいたします。', is_shared: true, created_at: '' },
];

export const dashboardStats = {
  monthlySends: 24,
  monthlyGrowth: 12.5,
  pendingDownloads: 8,
  expiringLinks: 3,
  monthlyDownloads: 156,
  downloadGrowth: 8.3,
};

export const chartData = [
  { date: '03/01', sends: 4, downloads: 12 },
  { date: '03/05', sends: 6, downloads: 18 },
  { date: '03/10', sends: 3, downloads: 22 },
  { date: '03/15', sends: 8, downloads: 35 },
  { date: '03/20', sends: 5, downloads: 28 },
  { date: '03/25', sends: 7, downloads: 41 },
  { date: '03/30', sends: 2, downloads: 15 },
];
