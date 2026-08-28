type IconName = 'home' | 'heart' | 'comment' | 'share' | 'bookmark' | 'speaker' | 'microphone'

export function SocialIcon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  const common = { fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {name === 'home' && <path {...common} d="m3 10.5 9-7.5 9 7.5V21h-6v-6H9v6H3V10.5Z" />}
      {name === 'heart' && <path {...common} d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" />}
      {name === 'comment' && <path {...common} d="M21 11.5a8.4 8.4 0 0 1-9 8.3 9.3 9.3 0 0 1-3.7-.8L3 21l1.8-4.7A8.2 8.2 0 0 1 3 11.5a8.4 8.4 0 0 1 9-8.3 8.4 8.4 0 0 1 9 8.3Z" />}
      {name === 'share' && <path {...common} d="m22 2-9.4 20-2.1-8.5L2 10l20-8Z M10.5 13.5 22 2" />}
      {name === 'bookmark' && <path {...common} d="M6 3.5h12v17L12 17l-6 3.5v-17Z" />}
      {name === 'speaker' && <><path {...common} d="M4 10v4h4l5 4V6l-5 4H4Z" /><path {...common} fill="none" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></>}
      {name === 'microphone' && <><rect {...common} x="9" y="3" width="6" height="11" rx="3" /><path {...common} fill="none" d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" /></>}
    </svg>
  )
}
