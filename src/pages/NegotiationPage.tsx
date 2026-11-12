import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scale, MapPin, TrendingUp, Award, Building2, Globe, ArrowRight, Zap, ArrowLeftRight, Check, Home, Calendar, Code2, Wallet, UserRound, Trophy,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Application, ContractCategory } from '@/types';
import { CATEGORY_LABELS } from '@/types';
import { formatDate, parseSalary } from '@/utils/helpers';
import { Card, CategoryTabs, CompanyAvatar, EmptyState, PageHeader, ProgressBar, StatCard, StatusBadge } from '@/components/ui/primitives';

function euros(n: number) {
  return `${n.toLocaleString('fr-FR')} €`;
}

export default function NegotiationPage() {
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const navigate = useNavigate();

  const [selectedCat, setSelectedCat] = useState<ContractCategory>(activeCategory);
  const [includeInterviews, setIncludeInterviews] = useState(false);

  const changeCat = (c: ContractCategory) => {
    setSelectedCat(c);
    setActiveCategory(c);
  };

  const pool = useMemo(
    () =>
      applications
        .filter((a) => a.category === selectedCat && (a.status === 'acceptee' || (includeInterviews && a.status === 'entretien')))
        .sort((a, b) => parseSalary(b.salaire) - parseSalary(a.salaire)),
    [applications, selectedCat, includeInterviews]
  );
  const accepted = pool.filter((a) => a.status === 'acceptee');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    applications.filter((a) => a.status === 'acceptee').forEach((a) => (c[a.category] = (c[a.category] || 0) + 1));
    (['stage', 'alternance', 'cdi', 'cdd'] as const).forEach((k) => (c[k] = c[k] || 0));
    return c;
  }, [applications]);

  // Sélection des deux offres à comparer
  const [aId, setAId] = useState<string>('');
  const [bId, setBId] = useState<string>('');
  useEffect(() => {
    const ids = pool.map((p) => p.id);
    setAId((cur) => (ids.includes(cur) ? cur : ids[0] || ''));
    setBId((cur) => (ids.includes(cur) ? cur : ids[1] || ''));
  }, [pool]);
  const offerA = pool.find((p) => p.id === aId);
  const offerB = pool.find((p) => p.id === bId && p.id !== aId);

  const insights = useMemo(() => {
    const sals = pool.map((a) => parseSalary(a.salaire)).filter((v) => v > 0).sort((a, b) => b - a);
    if (sals.length < 2) return null;
    const avg = Math.round(sals.reduce((s, v) => s + v, 0) / sals.length);
    const spread = sals[0] - sals[sals.length - 1];
    return { avg, spread, spreadPct: Math.round((spread / sals[0]) * 100), count: sals.length };
  }, [pool]);

  const bestOffer = pool[0] && parseSalary(pool[0].salaire) > 0 ? pool[0] : undefined;
  const maxSal = Math.max(1, ...pool.map((a) => parseSalary(a.salaire)));

  const header = (
    <>
      <PageHeader
        title="Négociation"
        icon={Scale}
        description="Comparez vos offres pour choisir et négocier en connaissance de cause"
      />
      <div className="flex flex-wrap items-center gap-3">
        <CategoryTabs value={selectedCat} onChange={changeCat} counts={counts} />
        <label className="inline-flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
          <input type="checkbox" checked={includeInterviews} onChange={(e) => setIncludeInterviews(e.target.checked)} className="w-4 h-4 rounded accent-[var(--color-primary)]" />
          Inclure les candidatures au stade entretien
        </label>
      </div>
    </>
  );

  if (pool.length === 0) {
    return (
      <div className="space-y-5">
        {header}
        <div className="card">
          <EmptyState
            icon={Scale}
            title={`Aucune offre ${includeInterviews ? 'acceptée ou en entretien' : 'acceptée'} en ${CATEGORY_LABELS[selectedCat]}`}
            description="Dès qu’une candidature passe au statut « Acceptée », elle apparaît ici. Cochez l’option ci-dessus pour préparer la comparaison dès le stade de l’entretien."
            action={
              <button onClick={() => navigate('/applications')} className="btn-primary btn-sm">
                Voir mes candidatures <ArrowRight className="w-4 h-4" />
              </button>
            }
          />
        </div>
      </div>
    );
  }

  if (pool.length === 1) {
    const offer = pool[0];
    return (
      <div className="space-y-5">
        {header}
        <div className="card">
          <EmptyState
            icon={Award}
            title={offer.status === 'acceptee' ? 'Félicitations pour votre offre !' : 'Une offre à suivre'}
            description={
              <>
                <span className="font-medium text-[var(--color-text)]">{offer.poste}</span> chez <span className="font-medium text-[var(--color-text)]">{offer.entreprise}</span>
                {offer.salaire && <> · {offer.salaire}</>}. Ajoutez une deuxième offre dans cette catégorie pour débloquer la comparaison.
              </>
            }
            action={
              <button onClick={() => navigate(`/applications/${offer.id}`)} className="btn-primary btn-sm">
                Voir le détail <ArrowRight className="w-4 h-4" />
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {header}

      {insights && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Award} label="Meilleur salaire" value={parseSalary(bestOffer?.salaire || '')} suffix="€" tone="green" hint={bestOffer?.entreprise} />
          <StatCard icon={TrendingUp} label="Salaire moyen" value={insights.avg} suffix="€" tone="blue" hint={`Sur ${insights.count} offres renseignées`} />
          <StatCard icon={Zap} label="Écart salarial" value={insights.spreadPct} suffix="%" tone="orange" hint={`${euros(insights.spread)} d’écart`} />
          <StatCard icon={Building2} label="Offres comparées" value={pool.length} hint={`${accepted.length} acceptée${accepted.length > 1 ? 's' : ''}`} />
        </div>
      )}

      {/* Comparateur face à face */}
      <Card title="Comparer deux offres" icon={ArrowLeftRight} description="Sélectionnez deux offres : le meilleur critère est mis en évidence.">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:gap-4 mb-5">
          <OfferSelect id="offer-a" label="Offre A" value={aId} onChange={setAId} pool={pool} exclude={bId} />
          <button
            onClick={() => { setAId(bId); setBId(aId); }}
            className="icon-btn mb-0.5"
            aria-label="Inverser les offres"
            title="Inverser"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <OfferSelect id="offer-b" label="Offre B" value={bId} onChange={setBId} pool={pool} exclude={aId} />
        </div>
        {offerA && offerB ? <HeadToHead a={offerA} b={offerB} onOpen={(id) => navigate(`/applications/${id}`)} /> : (
          <p className="text-sm text-muted">Choisissez deux offres différentes.</p>
        )}
      </Card>

      {/* Classement */}
      <Card title="Toutes les offres" icon={Trophy} description="Classées par salaire" bodyClassName="!px-2">
        <ul className="divide-y divide-[var(--color-border)]">
          {pool.map((offer, i) => {
            const sal = parseSalary(offer.salaire);
            const best = i === 0 && sal > 0;
            return (
              <li key={offer.id}>
                <button onClick={() => navigate(`/applications/${offer.id}`)} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg row-hover text-left">
                  <span className="w-5 text-xs text-muted tabular-nums text-center">{i + 1}</span>
                  <CompanyAvatar name={offer.entreprise} logo={offer.entrepriseLogo} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{offer.poste}</p>
                    <p className="text-xs text-muted truncate">
                      {offer.entreprise}{offer.lieu && ` · ${offer.lieu}`}{offer.teletravail && ' · Télétravail'}
                    </p>
                  </div>
                  <div className="hidden sm:block"><StatusBadge status={offer.status} size="sm" /></div>
                  <div className="w-32 sm:w-40 shrink-0 text-right">
                    <p className={`text-sm font-semibold tabular-nums ${best ? 'text-green-600 dark:text-green-400' : ''}`}>{offer.salaire || <span className="text-muted font-normal">Non renseigné</span>}</p>
                    {sal > 0 && <div className="mt-1.5"><ProgressBar value={(sal / maxSal) * 100} tone={best ? 'green' : 'theme'} /></div>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Conseils */}
      <Card title="Conseils de négociation" icon={Award}>
        <div className="grid md:grid-cols-3 gap-3">
          <Tip
            icon={TrendingUp}
            title="Argumentez avec le marché"
            description={
              bestOffer
                ? `L’offre la plus élevée en ${CATEGORY_LABELS[selectedCat]} est à ${bestOffer.salaire}. Servez-vous-en comme point de référence pour négocier les autres.`
                : 'Renseignez les salaires de vos offres pour obtenir un levier de négociation concret.'
            }
          />
          <Tip icon={Globe} title="Comparez le package complet" description="Au-delà du salaire : télétravail, technologies, localisation, date de début et perspectives d’évolution." />
          <Tip icon={Zap} title="Créez une saine concurrence" description="Plusieurs offres vous donnent du poids. Mentionnez-le avec tact pour obtenir de meilleures conditions." />
        </div>
      </Card>
    </div>
  );
}

function OfferSelect({ id, label, value, onChange, pool, exclude }: { id: string; label: string; value: string; onChange: (v: string) => void; pool: Application[]; exclude: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="eyebrow mb-1.5 block">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="glass-input w-full text-sm py-2 truncate">
        {pool.map((o) => (
          <option key={o.id} value={o.id} disabled={o.id === exclude}>
            {o.entreprise} — {o.poste}
          </option>
        ))}
      </select>
    </div>
  );
}

type Winner = 'a' | 'b' | null;

function HeadToHead({ a, b, onOpen }: { a: Application; b: Application; onOpen: (id: string) => void }) {
  const sa = parseSalary(a.salaire);
  const sb = parseSalary(b.salaire);
  const salaryWinner: Winner = sa > 0 && sb > 0 && sa !== sb ? (sa > sb ? 'a' : 'b') : null;
  const remoteWinner: Winner = a.teletravail !== b.teletravail ? (a.teletravail ? 'a' : 'b') : null;
  const startA = a.dateDebut ? new Date(a.dateDebut).getTime() : null;
  const startB = b.dateDebut ? new Date(b.dateDebut).getTime() : null;

  const diff = salaryWinner ? Math.abs(sa - sb) : 0;
  const diffPct = salaryWinner ? Math.round((diff / Math.max(sa, sb)) * 100) : 0;

  const wins = { a: [salaryWinner, remoteWinner].filter((w) => w === 'a').length, b: [salaryWinner, remoteWinner].filter((w) => w === 'b').length };

  const rows: { icon: ElementType; label: string; a: ReactNode; b: ReactNode; winner?: Winner }[] = [
    { icon: Wallet, label: 'Salaire', a: a.salaire || '—', b: b.salaire || '—', winner: salaryWinner },
    { icon: MapPin, label: 'Localisation', a: a.lieu || '—', b: b.lieu || '—' },
    { icon: Home, label: 'Télétravail', a: a.teletravail ? 'Oui' : 'Non', b: b.teletravail ? 'Oui' : 'Non', winner: remoteWinner },
    {
      icon: Calendar,
      label: 'Date de début',
      a: a.dateDebut ? formatDate(a.dateDebut) : '—',
      b: b.dateDebut ? formatDate(b.dateDebut) : '—',
      winner: startA && startB && startA !== startB ? (startA < startB ? 'a' : 'b') : null,
    },
    {
      icon: Code2,
      label: 'Technologies',
      a: a.technologies.length ? a.technologies.slice(0, 5).join(', ') + (a.technologies.length > 5 ? '…' : '') : '—',
      b: b.technologies.length ? b.technologies.slice(0, 5).join(', ') + (b.technologies.length > 5 ? '…' : '') : '—',
    },
    { icon: UserRound, label: 'Contact', a: a.contact.name || '—', b: b.contact.name || '—' },
  ];

  const cell = (content: ReactNode, win: boolean) => (
    <td className={`px-3 py-3 align-top ${win ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-[var(--color-text)]'}`}>
      <span className="inline-flex items-start gap-1.5">
        {win && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
        <span className="break-words">{content}</span>
      </span>
    </td>
  );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr>
              <th className="w-[140px]" />
              {[a, b].map((o) => (
                <th key={o.id} className="px-3 pb-3 text-left font-normal align-bottom w-[42%]">
                  <button onClick={() => onOpen(o.id)} className="flex items-center gap-2.5 text-left group">
                    <CompanyAvatar name={o.entreprise} logo={o.entrepriseLogo} size="sm" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate group-hover:text-theme">{o.entreprise}</span>
                      <span className="block text-xs text-muted truncate">{o.poste}</span>
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="px-0 py-3 text-left font-normal text-muted align-top">
                  <span className="inline-flex items-center gap-2"><r.icon className="w-4 h-4" />{r.label}</span>
                </th>
                {cell(r.a, r.winner === 'a')}
                {cell(r.b, r.winner === 'b')}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 text-sm leading-relaxed">
        {salaryWinner ? (
          <p>
            <span className="font-semibold">{salaryWinner === 'a' ? a.entreprise : b.entreprise}</span> propose{' '}
            <span className="font-semibold text-green-700 dark:text-green-400">{euros(diff)} de plus ({diffPct} %)</span>.{' '}
            Vous pouvez vous appuyer sur ce montant pour demander une revalorisation à {salaryWinner === 'a' ? b.entreprise : a.entreprise}.
          </p>
        ) : sa > 0 && sb > 0 ? (
          <p>Les deux offres proposent le même salaire : départagez-les sur le télétravail, les missions et les perspectives d’évolution.</p>
        ) : (
          <p className="text-muted">Renseignez le salaire des deux offres pour obtenir une comparaison chiffrée.</p>
        )}
        {(wins.a > 0 || wins.b > 0) && (
          <p className="text-xs text-muted mt-2">
            Critères objectifs remportés : {a.entreprise} {wins.a} · {b.entreprise} {wins.b}
          </p>
        )}
      </div>
    </div>
  );
}

function Tip({ icon: Icon, title, description }: { icon: ElementType; title: string; description: string }) {
  return (
    <div className="p-4 rounded-xl border border-[var(--color-border)]">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-8 h-8 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </span>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <p className="text-sm text-muted leading-relaxed">{description}</p>
    </div>
  );
}
