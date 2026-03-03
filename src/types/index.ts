export type UserRole = 'super_admin' | 'sender';
export type RecipientType = 'to' | 'cc' | 'bcc';
export type DeliveryStatus = 'draft' | 'sent' | 'expired' | 'revoked';
export type DownloadType = 'individual' | 'bulk';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Recipient {
  id: string;
  email: string;
  password_hash: string | null;
  registered: boolean;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  company: string | null;
  tags: string[];
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  is_shared: boolean;
  created_at: string;
}

export interface Signature {
  id: string;
  user_id: string;
  name: string;
  content_html: string;
  created_at: string;
}

export interface Delivery {
  id: string;
  sender_id: string;
  subject: string;
  message: string;
  expires_at: string;
  download_limit: number | null;
  password_protected: boolean;
  password_hash: string | null;
  notify_on_open: boolean;
  notify_on_download: boolean;
  scheduled_at: string | null;
  status: DeliveryStatus;
  created_at: string;
  delivery_files?: DeliveryFile[];
  delivery_recipients?: DeliveryRecipient[];
}

export interface DeliveryFile {
  id: string;
  delivery_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  storage_path: string | null;
  file_token: string;
  file_extension: string;
  created_at: string;
}

export interface DeliveryRecipient {
  id: string;
  delivery_id: string;
  recipient_email: string;
  recipient_type: RecipientType;
  token: string;
  download_count: number;
  first_accessed_at: string | null;
  file_download_counts: Record<string, number>;
  created_at: string;
  download_logs?: DownloadLog[];
}

export interface DownloadLog {
  id: string;
  delivery_recipient_id: string;
  file_id: string;
  download_type: DownloadType;
  downloaded_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface DeliveryFormData {
  recipients: { email: string; type: RecipientType }[];
  files: SelectedFile[];
  subject: string;
  message: string;
  signatureId: string | null;
  templateId: string | null;
  expiresInDays: number;
  downloadLimit: number | null;
  passwordProtected: boolean;
  password: string;
  notifyOnOpen: boolean;
  notifyOnDownload: boolean;
  scheduledAt: string | null;
}

export interface SelectedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
}

export interface FileMetadata {
  index: number;
  indexDisplay: string;
  icon: string;
  name: string;
  sizeDisplay: string;
  extensionDisplay: string;
  individualUrl: string;
}
