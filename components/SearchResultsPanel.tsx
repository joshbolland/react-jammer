import Link from 'next/link'

export type SearchResultType = 'jam'

export interface SearchResultEntry {
  id: string
  type: SearchResultType
  title: string
  href: string
  secondaryLabel?: string
  tertiaryLabel?: string
  distanceLabel?: string
  badges?: string[]
  metaLabel?: string
}

interface SearchResultsPanelProps {
  results: SearchResultEntry[]
  variant?: 'card' | 'sidebar'
}

const TYPE_LABEL: Record<SearchResultType, string> = {
  jam: 'Jam',
}

const TYPE_ACCENT: Record<SearchResultType, string> = {
  jam: 'bg-primary-100 text-primary-700 ring-primary-200/70',
}

export function SearchResultsPanel({ results, variant = 'card' }: SearchResultsPanelProps) {
  const isSidebar = variant === 'sidebar'
  const containerClass = isSidebar
    ? 'flex h-full flex-col'
    : 'relative overflow-hidden rounded-[32px] border border-white/70 bg-white/85 shadow-[0_65px_160px_-90px_rgba(97,76,200,0.45)] backdrop-blur'
  const innerClass = isSidebar
    ? 'relative flex flex-col gap-4 px-6 pb-6 pt-4'
    : 'relative flex h-full flex-col px-6 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8'
  const listContainerClass = isSidebar ? 'mt-6' : 'mt-6 flex-1 overflow-hidden'
  const listWrapperClass = isSidebar ? '' : '-mx-2 max-h-[520px] overflow-y-auto px-2'
  const listClass = isSidebar ? 'space-y-0' : 'space-y-3'
  const headerHintClass = isSidebar
    ? 'text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400'
    : 'text-[11px] font-semibold uppercase tracking-[0.46em] text-primary-400'
  const headerTitleClass = isSidebar
    ? 'text-xl font-semibold tracking-tight text-slate-900'
    : 'text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl'
  const headerDescriptionClass = isSidebar
    ? 'text-xs text-slate-500'
    : 'text-sm text-slate-500'

  return (
    <div className={containerClass}>
      {!isSidebar && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/75 via-white/60 to-primary-50/70" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,_rgba(167,130,255,0.22),_transparent_70%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen">
            <div className="hero-waveform" />
          </div>
        </>
      )}
      <div className={innerClass}>
        <header className="flex flex-col gap-2">
          <span className={headerHintClass}>
            Nearby matches
          </span>
          <h2 className={headerTitleClass}>
            Jam results
          </h2>
          <p className={headerDescriptionClass}>
            These are the jams that match your filters.
          </p>
        </header>

        <div className={listContainerClass}>
          <div className={listWrapperClass}>
            {results.length === 0 ? (
              <EmptyState variant={variant} />
            ) : (
              <ul className={listClass}>
                {results.map((result) => (
                  <li key={result.id}>
                    <ResultCard result={result} variant={variant} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultCard({ result, variant }: { result: SearchResultEntry; variant: 'card' | 'sidebar' }) {
  const isSidebar = variant === 'sidebar'
  const linkClass = isSidebar
    ? 'group block border-b border-white/15 px-0 py-4 transition hover:bg-white/60 focus-visible:outline-none'
    : 'group relative block overflow-hidden rounded-2xl border border-white/0 bg-white/70 px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-200/80 hover:bg-white shadow-[0_18px_45px_-30px_rgba(105,78,214,0.65)]'
  const badgeClass = isSidebar
    ? 'inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500'
    : 'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.28em] ring-1 ring-inset transition'
  const distanceClass = isSidebar
    ? 'text-[10px] tracking-[0.24em] text-slate-400'
    : 'text-[10px] tracking-[0.28em] text-slate-400'
  const metaRowClass = isSidebar
    ? 'flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400'
    : 'flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-400'
  const titleClass = isSidebar
    ? 'mt-1 text-base font-semibold tracking-tight text-slate-900'
    : 'mt-2 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl'
  const goButton = isSidebar ? null : (
    <div className="mt-1 inline-flex items-center justify-center self-center rounded-full bg-primary-100/80 px-2 py-2 text-primary-500 transition group-hover:bg-primary-500 group-hover:text-white">
      <span className="text-base font-semibold tracking-[0.1em]">GO</span>
    </div>
  )
  const badgesClass = isSidebar
    ? 'mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.28em] text-slate-400'
    : 'mt-3 flex flex-wrap gap-2'

  return (
    <Link href={result.href} className={linkClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={metaRowClass}>
            <span
              className={[
                badgeClass,
                isSidebar ? '' : TYPE_ACCENT[result.type],
              ].join(' ')}
            >
              {TYPE_LABEL[result.type]}
            </span>
            {result.distanceLabel ? (
              <span className={distanceClass}>
                {result.distanceLabel.toUpperCase()}
              </span>
            ) : null}
          </div>
          <h3 className={titleClass}>
            {result.title}
          </h3>
          {result.metaLabel ? (
            <p className="mt-1 text-sm font-medium text-primary-600">{result.metaLabel}</p>
          ) : null}
          {result.secondaryLabel ? (
            <p className="mt-1 text-sm text-slate-600">{result.secondaryLabel}</p>
          ) : null}
          {result.tertiaryLabel ? (
            <p className="mt-1 text-xs uppercase tracking-[0.38em] text-slate-400">
              {result.tertiaryLabel}
            </p>
          ) : null}
        </div>
        {goButton ?? <span className="mt-1 text-sm font-semibold text-primary-500 transition group-hover:text-primary-600">→</span>}
      </div>
      {result.badges && result.badges.length > 0 ? (
        <div className={badgesClass}>
          {result.badges.slice(0, 4).map((badge) => (
            <span
              key={badge}
              className={
                isSidebar
                  ? 'inline-flex items-center bg-white/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500'
                  : 'inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-500 transition group-hover:bg-primary-50 group-hover:text-primary-600'
              }
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  )
}

function EmptyState({ variant }: { variant: 'card' | 'sidebar' }) {
  const isSidebar = variant === 'sidebar'
  if (isSidebar) {
    return (
      <div className="flex h-full flex-col items-start justify-center gap-3 text-left text-sm text-slate-500">
        <span className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">No matches</span>
        <p>No jams match these filters right now. Try changing the filters or moving the map.</p>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl border border-dashed border-primary-200/60 bg-white/60 px-6 py-12 text-center">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50/50 via-transparent to-white/80" />
      <div className="relative space-y-3">
        <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.42em] text-primary-600">
          No matches
        </span>
        <p className="text-sm text-slate-500">
          No jams match these filters right now. Try adjusting the filters or moving the map.
        </p>
      </div>
    </div>
  )
}
