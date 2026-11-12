import type { AttachedFile } from '@/types';
import { generateId } from '@/utils/helpers';

/** Taille maximale d'une pièce jointe : les fichiers sont stockés dans le localStorage (≈ 5 Mo au total). */
export const MAX_FILE_SIZE = 1.5 * 1024 * 1024;

export const FILE_TYPE_LABELS: Record<AttachedFile['type'], string> = {
  cv: 'CV',
  lettre: 'Lettre',
  portfolio: 'Portfolio',
  certificat: 'Certificat',
  autre: 'Autre',
};

export const FILE_TYPES = Object.keys(FILE_TYPE_LABELS) as AttachedFile['type'][];

export const ACCEPTED_FILES = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.pptx,.xlsx';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Lit un fichier en data URL. Rejette avec un message lisible si le fichier est trop volumineux. */
export function readAttachment(file: File, type: AttachedFile['type']): Promise<AttachedFile> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`« ${file.name} » fait ${formatFileSize(file.size)}. La taille maximale est de ${formatFileSize(MAX_FILE_SIZE)}.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ id: generateId(), name: file.name, type, url: reader.result as string, uploadedAt: new Date().toISOString() });
    reader.onerror = () => reject(new Error(`Impossible de lire « ${file.name} ».`));
    reader.readAsDataURL(file);
  });
}
