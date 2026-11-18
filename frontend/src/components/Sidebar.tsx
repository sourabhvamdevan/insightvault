import { NavLink } from 'react-router-dom'
import type { HealthState } from '../hooks/useHealth'
import { DEMO_MODE } from '../services/api'
import { ChartIcon, ChatIcon, DashboardIcon, LibraryIcon } from './Icons'

const NAV = [
  { to: '/', label: 'Overview', icon: DashboardIcon, end: true },
  { to: '/knowledge-base', label: 'Knowledge base', icon: LibraryIcon, end: false },
  { to: '/assistant', label: 'Ask the documents', icon: ChatIcon, end: false },
  { to: '/evaluation', label: 'Search quality', icon: ChartIcon, end: false },
]

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="iv-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7556ec" />
          <stop offset="1" stopColor="#4a2fb8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#iv-bg)" />
      <circle cx="14.5" cy="14.5" r="6" fill="none" stroke="#fff" strokeWidth="2.4" />
      <path d="M19 19l5 5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11.8 14.5h5.4" stroke="#fde68a" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function Status({ health }: { health: HealthState }) {
  if (health.loading) return <p className="text-xs text-ink-400">Checking services…</p>
  if (health.error || !health.health) {
    return (
      <p className="flex items-center gap-2 text-xs text-red-300">
        <span className="h-2 w-2 rounded-full bg-red-400" /> API unreachable
      </p>
    )
  }
  const { llm, index_vectors: vectors } = health.health
  const ok = llm.reachable && llm.model_available
  return (
    <div className="space-y-1 text-xs">
      <p className={`flex items-center gap-2 ${ok ? 'text-ink-200' : 'text-amber-300'}`}>
        <span className={`h-2 w-2 rounded-full ${ok ? 'bg-signal-500' : 'bg-amber-400'}`} />
        {!llm.reachable ? 'Ollama offline' : llm.model_available ? llm.model : `${llm.model} not pulled`}
      </p>
      <p className="pl-4 text-ink-400">
        {vectors} indexed passages{DEMO_MODE ? ' · in-browser demo' : ''}
      </p>
    </div>
  )
}

export function Sidebar({ health }: { health: HealthState }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-gradient-to-b from-ink-900 to-ink-950 text-white">
      <div className="px-5 pt-6 pb-7">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8 shrink-0" />
          <p className="text-[18px] font-semibold tracking-tight">InsightVault</p>
        </div>
        <p className="mt-3 text-xs leading-snug text-ink-300">Answers from your PDFs, with the page they came from</p>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-white/10 font-medium text-white shadow-[inset_3px_0_0_var(--color-signal-500)]' : 'text-ink-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-marker' : ''}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4">
        <Status health={health} />
      </div>
    </aside>
  )
}
