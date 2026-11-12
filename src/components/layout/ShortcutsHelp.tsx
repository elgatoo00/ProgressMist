import Modal from '@/components/ui/Modal';
import { Kbd } from '@/components/ui/primitives';
import { useUiStore } from '@/store/useUiStore';
import { NAV_ITEMS } from './navigation';

export default function ShortcutsHelp() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Ctrl';

  const general: [string, string[]][] = [
    ['Recherche globale', [mod, 'K']],
    ['Recherche globale', ['/']],
    ['Nouvelle candidature', ['N']],
    ['Enregistrer un formulaire', [mod, 'S']],
    ['Afficher cette aide', ['?']],
    ['Fermer une fenêtre', ['Échap']],
  ];

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Raccourcis clavier" size="md">
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <p className="eyebrow mb-2">Général</p>
          <ul className="space-y-2">
            {general.map(([label, keys], i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{label}</span>
                <span className="flex gap-1">{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-2">Navigation</p>
          <ul className="space-y-2">
            {NAV_ITEMS.map((n) => (
              <li key={n.to} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{n.label}</span>
                <span className="flex gap-1"><Kbd>G</Kbd><Kbd>{n.key.toUpperCase()}</Kbd></span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
