/**
 * Protection contre les URL dangereuses (javascript:, data:text/html, vbscript:…).
 *
 * Ces fonctions sont appliquées à DEUX endroits :
 *  1. à l'entrée (import JSON, migration du stockage, formulaires) → les données stockées sont saines ;
 *  2. à l'affichage (href / src) → même si une donnée dangereuse passait, elle ne devient jamais un lien actif.
 */

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

/** Retire les caractères de contrôle et espaces que les navigateurs ignorent dans un schéma (« java\tscript: »). */
function isIgnorable(code: number): boolean {
  return code <= 0x1f || (code >= 0x7f && code <= 0x9f) || (code >= 0x200b && code <= 0x200f) || code === 0x2028 || code === 0x2029 || code === 0xfeff;
}

function clean(v: unknown): string {
  if (typeof v !== 'string') return '';
  let out = '';
  for (let i = 0; i < v.length; i++) if (!isIgnorable(v.charCodeAt(i))) out += v[i];
  return out.trim();
}

const MAX_URL = 2048;

/** Renvoie une URL http(s) valide, ou '' si la valeur est vide ou dangereuse. Ajoute https:// si le protocole est absent. */
export function safeWebUrl(value: unknown): string {
  const v = clean(value);
  if (!v || v.length > MAX_URL) return '';
  const scheme = SCHEME.exec(v)?.[1]?.toLowerCase();
  // « exemple.com:8080 » ressemble à un schéma : on l'accepte seulement si la suite est un numéro de port.
  if (scheme && !/^https?$/.test(scheme) && !/^[^/\s]+:\d+(\/|$)/.test(v)) return '';
  const candidate = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return '';
    return u.href;
  } catch {
    return '';
  }
}

/** Lien mailto: valide construit à partir d'une adresse. */
export function safeMailto(email: unknown): string {
  const v = clean(email);
  return /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/.test(v) ? `mailto:${v}` : '';
}

/** Lien tel: valide (chiffres, +, espaces, points, tirets, parenthèses). */
export function safeTel(phone: unknown): string {
  const v = clean(phone);
  return /^[+()\d\s.-]{4,25}$/.test(v) ? `tel:${v.replace(/[\s.()-]/g, '')}` : '';
}

/** Source d'image sûre : https:// ou data:image/(png|jpeg|gif|webp). Les SVG sont refusés (ils peuvent contenir du script). */
export function safeImageSrc(value: unknown): string {
  const v = clean(value);
  if (!v) return '';
  if (/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(v) && v.length < 2_500_000) return v;
  if (/^https:\/\//i.test(v)) return safeWebUrl(v);
  return '';
}

/** Pièce jointe : uniquement une data URL en base64 (c'est ainsi que l'application les stocke). */
export function safeFileUrl(value: unknown): string {
  const v = typeof value === 'string' ? value.trim() : '';
  const m = /^data:([a-z0-9.+/-]*)(;[a-z0-9=.+-]+)*;base64,[a-z0-9+/=\s]*$/i.exec(v);
  if (!m || v.length >= 6_000_000) return '';
  // Types exécutables par un navigateur : refusés (HTML, SVG, XML, JavaScript).
  if (/html|xml|svg|javascript|ecmascript/i.test(m[1])) return '';
  return v;
}

/** Texte brut borné : empêche les chaînes démesurées venues d'un fichier importé. */
export function safeText(value: unknown, max = 5000): string {
  if (typeof value !== 'string') return value == null ? '' : String(value).slice(0, max);
  return value.slice(0, max);
}
