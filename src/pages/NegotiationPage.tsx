import React, { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CATEGORY_LABELS } from '@/types';
import type { ContractCategory } from '@/types';
import { parseSalary, formatDate } from '@/utils/helpers';
import { useNavigate } from 'react-router-dom';
import {
  Scale,
  DollarSign,
  MapPin,
  TrendingUp,
  Award,
  Building2,
  Globe,
  Calendar,
  ArrowRight,
  Star,
  Zap,
} from 'lucide-react';

const categories: ContractCategory[] = ['stage', 'alternance', 'cdi', 'cdd'];

export default function NegotiationPage() {
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const navigate = useNavigate();

  const [selectedCat, setSelectedCat] = useState<ContractCategory>(activeCategory);

  const acceptedOffers = useMemo(
    () => applications.filter((a) => a.status === 'acceptee' && a.category === selectedCat),
    [applications, selectedCat]
  );

  const hasSalaries = acceptedOffers.some((a) => a.salaire && parseSalary(a.salaire) > 0);
  const maxSal = acceptedOffers.length > 0
    ? Math.max(...acceptedOffers.map((a) => parseSalary(a.salaire)), 1)
    : 1;

  const sorted = useMemo(
    () => [...acceptedOffers].sort((a, b) => parseSalary(b.salaire) - parseSalary(a.salaire)),
    [acceptedOffers]
  );

  const bestOffer = sorted[0];
  const bestSal = bestOffer ? parseSalary(bestOffer.salaire) : 0;

  // Salary insights
  const insights = useMemo(() => {
    const withSal = acceptedOffers.filter((a) => parseSalary(a.salaire) > 0);
    if (withSal.length < 2) return null;
    const sortedSal = withSal.map((a) => parseSalary(a.salaire)).sort((a, b) => b - a);
    const avg = Math.round(sortedSal.reduce((s, v) => s + v, 0) / sortedSal.length);
    const spread = sortedSal[0] - sortedSal[sortedSal.length - 1];
    const spreadPct = sortedSal[0] > 0 ? Math.round((spread / sortedSal[0]) * 100) : 0;
    return { avg, spread, spreadPct };
  }, [acceptedOffers]);

  // Empty states
  if (acceptedOffers.length === 0) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
            <Scale className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="section-title">Négociation</h1>
            <p className="text-sm text-gray-400">Comparez vos offres acceptées</p>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1 glass-card p-1 mb-8 w-fit">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCat(cat); setActiveCategory(cat); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCat === cat ? 'bg-theme-solid text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="glass-card p-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <Scale className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-xl font-bold font-display text-[var(--color-text)] mb-2">
            Aucune offre acceptée en {CATEGORY_LABELS[selectedCat]}
          </h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            La page Négociation s'affiche automatiquement dès que vous avez au moins une offre acceptée.
            Continuez vos candidatures !
          </p>
          <button onClick={() => navigate('/applications')} className="btn-primary inline-flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Voir mes candidatures
          </button>
        </div>
      </div>
    );
  }

  // Only 1 offer
  if (acceptedOffers.length === 1) {
    const offer = acceptedOffers[0];
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
            <Scale className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="section-title">Négociation</h1>
            <p className="text-sm text-gray-400">Comparez vos offres acceptées</p>
          </div>
        </div>

        <div className="flex items-center gap-1 glass-card p-1 mb-8 w-fit">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCat(cat); setActiveCategory(cat); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCat === cat ? 'bg-theme-solid text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="glass-card p-12 text-center border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
          <div className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <Award className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-xl font-bold font-display text-[var(--color-text)] mb-2">
            Félicitations ! 🎉
          </h2>
          <p className="text-gray-400 mb-2">
            Vous avez une offre acceptée en {CATEGORY_LABELS[selectedCat]}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 mt-2">
            <Building2 className="w-4 h-4 text-theme" />
            <span className="font-semibold text-[var(--color-text)]">{offer.entreprise}</span>
            <span className="text-gray-500">—</span>
            <span className="text-gray-300">{offer.poste}</span>
          </div>
          <p className="text-sm text-gray-500 mt-6 max-w-md mx-auto">
            Obtenez d'autres offres acceptées dans cette catégorie pour débloquer la comparaison et négocier votre salaire !
          </p>
          <button
            onClick={() => navigate(`/applications/${offer.id}`)}
            className="btn-primary mt-6 inline-flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Voir le détail
          </button>
        </div>
      </div>
    );
  }

  // 2+ offers: Full comparison
  return (
    <div className="max-w-[1600px] mx-auto animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
            <Scale className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="section-title">Session de négociation</h1>
            <p className="text-sm text-gray-400">
              {acceptedOffers.length} offres acceptées · Comparez pour mieux négocier
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 glass-card p-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCat(cat);
                setActiveCategory(cat);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCat === cat ? 'bg-theme-solid text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Insights */}
      {insights && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InsightCard
            icon={Award}
            label="Meilleur salaire"
            value={bestOffer?.salaire || 'N/A'}
            subtitle={bestOffer?.entreprise || ''}
            color="green"
          />
          <InsightCard
            icon={TrendingUp}
            label="Salaire moyen"
            value={insights.avg.toLocaleString('fr-FR') + ' €'}
            subtitle={`sur ${acceptedOffers.filter((a) => parseSalary(a.salaire) > 0).length} offres`}
            color="blue"
          />
          <InsightCard
            icon={Zap}
            label="Écart salarial"
            value={`${insights.spreadPct}%`}
            subtitle={`${insights.spread.toLocaleString('fr-FR')} € d'écart`}
            color="orange"
          />
          <InsightCard
            icon={Building2}
            label="Offres comparées"
            value={acceptedOffers.length}
            subtitle={`en ${CATEGORY_LABELS[selectedCat]}`}
            color="purple"
          />
        </div>
      )}

      {/* Comparison grid */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {sorted.map((offer, index) => {
          const sal = parseSalary(offer.salaire);
          const pct = maxSal > 0 ? (sal / maxSal) * 100 : 0;
          const isBest = index === 0 && sal > 0;
          const diff = bestSal - sal;
          const diffPct = bestSal > 0 && sal > 0 ? Math.round((diff / bestSal) * 100) : 0;

          return (
            <div
              key={offer.id}
              className={`glass-card p-6 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1
                ${isBest ? 'border-2 border-green-500/30 bg-gradient-to-b from-green-500/5 to-transparent' : 'border border-white/10'}`}
            >
              {/* Best offer badge */}
              {isBest && (
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-green-500 text-white text-[11px] font-bold shadow-lg flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" />
                  Meilleure offre
                </div>
              )}

              {/* Company header */}
              <div className="flex items-start gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-theme-gradient-br flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-theme">
                  {offer.entreprise.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-[var(--color-text)] leading-tight">
                    {offer.poste}
                  </h3>
                  <p className="text-sm text-gray-400">{offer.entreprise}</p>
                </div>
              </div>

              {/* Salary */}
              <div className="mb-5">
                <div className="flex items-end justify-between mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Salaire</span>
                  {sal > 0 && !isBest && diffPct > 0 && (
                    <span className="text-xs text-orange-400 font-medium">-{diffPct}% vs top</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className={`w-5 h-5 ${isBest ? 'text-green-400' : 'text-gray-400'}`} />
                  <span className={`text-2xl font-bold font-display ${isBest ? 'text-green-400' : 'text-[var(--color-text)]'}`}>
                    {offer.salaire || 'Non renseigné'}
                  </span>
                </div>
                {sal > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isBest ? 'bg-green-500' : 'bg-theme-solid'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-500 font-mono">{Math.round(pct)}%</span>
                  </div>
                )}
              </div>

              {/* Details grid */}
              <div className="space-y-2 mb-5">
                {offer.lieu && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                    <span>{offer.lieu}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>Candidature le {formatDate(offer.dateCandidature, 'dd MMMM yyyy')}</span>
                </div>
                {offer.teletravail && (
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <Globe className="w-4 h-4 shrink-0" />
                    <span>Télétravail</span>
                  </div>
                )}
              </div>

              {/* Technologies */}
              {offer.technologies.length > 0 && (
                <div className="mb-5 pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                    Technologies
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {offer.technologies.slice(0, 6).map((t) => (
                      <span key={t} className="badge bg-theme-subtle text-theme border-theme-subtle text-[10px]">
                        {t}
                      </span>
                    ))}
                    {offer.technologies.length > 6 && (
                      <span className="text-[10px] text-gray-500">+{offer.technologies.length - 6}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Contact */}
              {(offer.contact.name || offer.contact.email) && (
                <div className="mb-5 pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                    Contact
                  </p>
                  <p className="text-sm text-gray-400">
                    {offer.contact.name}
                    {offer.contact.role && <span className="text-gray-500"> — {offer.contact.role}</span>}
                  </p>
                  {offer.contact.email && (
                    <p className="text-xs text-theme truncate">{offer.contact.email}</p>
                  )}
                </div>
              )}

              {/* Action button */}
              <button
                onClick={() => navigate(`/applications/${offer.id}`)}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                <ArrowRight className="w-4 h-4" />
                Voir le détail
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom: negotiation tips */}
      <div className="glass-card p-8 border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Award className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">Conseils de négociation</h2>
            <p className="text-sm text-gray-400">Maximisez vos chances d'obtenir le meilleur package</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <TipCard
            icon={TrendingUp}
            title="Argumentez avec le marché"
            description={
              hasSalaries && bestOffer
                ? `L'offre la plus élevée en ${CATEGORY_LABELS[selectedCat]} est à ${bestOffer.salaire}. Utilisez ce chiffre comme point de référence pour négocier les autres offres.`
                : 'Renseignez les salaires de vos offres pour obtenir un levier de négociation concret.'
            }
          />
          <TipCard
            icon={Globe}
            title="Comparez les avantages"
            description="Au-delà du salaire, évaluez le télétravail, les technologies utilisées, la localisation et les perspectives d'évolution de chaque entreprise."
          />
          <TipCard
            icon={Zap}
            title="Créez une compétition saine"
            description="Avoir plusieurs offres vous donne du pouvoir. Mentionnez (avec tact) que vous avez d'autres propositions pour obtenir de meilleures conditions."
          />
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle: string;
  color: 'green' | 'blue' | 'orange' | 'purple';
}) {
  const colors: Record<string, string> = {
    green: 'bg-green-500/10 text-green-400',
    blue: 'bg-blue-500/10 text-blue-400',
    orange: 'bg-orange-500/10 text-orange-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-bold font-display text-[var(--color-text)]">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function TipCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-green-400" />
        </div>
        <h3 className="font-semibold text-sm text-[var(--color-text)]">{title}</h3>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
