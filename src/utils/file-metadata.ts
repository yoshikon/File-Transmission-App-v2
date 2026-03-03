import { formatFileSize } from './format';
import type { DeliveryFile, FileMetadata } from '../types';

const INDEX_DISPLAY = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];

const ICON_MAP: Record<string, string> = {
  pdf: '📄',
  doc: '📝', docx: '📝',
  xls: '📊', xlsx: '📊', csv: '📊',
  ppt: '📋', pptx: '📋',
  zip: '🗜️', tar: '🗜️', gz: '🗜️', rar: '🗜️', '7z': '🗜️',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
  mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬',
  mp3: '🎵', wav: '🎵', aac: '🎵', flac: '🎵',
  txt: '📄',
};

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function getFileIcon(fileName: string): string {
  const ext = getFileExtension(fileName);
  return ICON_MAP[ext] || '📁';
}

export function getExtensionDisplay(fileName: string): string {
  const ext = getFileExtension(fileName);
  return ext ? ext.toUpperCase() : 'FILE';
}

export function buildDownloadUrl(deliveryToken: string, fileToken?: string): string {
  const base = `${window.location.origin}/d/${deliveryToken}`;
  return fileToken ? `${base}/f/${fileToken}` : base;
}

export function buildFileMetadataList(
  files: DeliveryFile[],
  deliveryToken: string,
): FileMetadata[] {
  return files.map((file, i) => ({
    index: i + 1,
    indexDisplay: INDEX_DISPLAY[i] || `(${i + 1})`,
    icon: getFileIcon(file.file_name),
    name: file.file_name,
    sizeDisplay: formatFileSize(file.file_size),
    extensionDisplay: getExtensionDisplay(file.file_name),
    individualUrl: buildDownloadUrl(deliveryToken, file.file_token),
  }));
}

export function formatExpiryDisplay(expiresAt: string): string {
  const d = new Date(expiresAt);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}まで`;
}

export function formatDownloadLimitDisplay(limit: number | null): string {
  return limit ? `${limit}回まで` : '制限なし';
}
