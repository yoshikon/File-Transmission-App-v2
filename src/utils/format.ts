import { format, formatDistanceToNow, isAfter, differenceInDays } from 'date-fns';
import { ja } from 'date-fns/locale';

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'yyyy/MM/dd HH:mm', { locale: ja });
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), 'MM/dd HH:mm', { locale: ja });
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ja });
}

export function isExpired(date: string | Date): boolean {
  return !isAfter(new Date(date), new Date());
}

export function daysUntilExpiry(date: string | Date): number {
  return differenceInDays(new Date(date), new Date());
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    pdf: 'file-text',
    doc: 'file-text',
    docx: 'file-text',
    xls: 'file-spreadsheet',
    xlsx: 'file-spreadsheet',
    ppt: 'file',
    pptx: 'file',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    svg: 'image',
    zip: 'file-archive',
    rar: 'file-archive',
    '7z': 'file-archive',
    mp4: 'film',
    mov: 'film',
    mp3: 'music',
    wav: 'music',
    txt: 'file-text',
    csv: 'file-spreadsheet',
  };
  return iconMap[ext] || 'file';
}

export function getMimeColor(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const colorMap: Record<string, string> = {
    pdf: 'text-red-500',
    doc: 'text-blue-600',
    docx: 'text-blue-600',
    xls: 'text-green-600',
    xlsx: 'text-green-600',
    ppt: 'text-orange-500',
    pptx: 'text-orange-500',
    jpg: 'text-teal-500',
    jpeg: 'text-teal-500',
    png: 'text-teal-500',
    gif: 'text-teal-500',
    zip: 'text-amber-600',
    rar: 'text-amber-600',
  };
  return colorMap[ext] || 'text-surface-400';
}
