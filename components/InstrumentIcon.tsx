import { type LucideIcon, type LucideProps, AudioWaveform, Drum, Guitar, Keyboard, Mic2, Music2, Music3, Music4, Piano } from 'lucide-react'
import type { Instrument } from '@/lib/types'

type IconRenderer = LucideIcon

const instrumentIcons: Partial<Record<Instrument, IconRenderer>> = {
  guitar: Guitar,
  ukulele: Guitar,
  banjo: Guitar,
  mandolin: Guitar,
  bass: Music3,
  drums: Drum,
  piano: Piano,
  keyboard: Keyboard,
  vocals: Mic2,
  violin: Music4,
  viola: Music4,
  cello: Music4,
  saxophone: AudioWaveform,
  trumpet: Music2,
  trombone: Music2,
  clarinet: Music2,
  flute: Music2,
  harmonica: Music3,
}

const fallbackIcon: IconRenderer = Music4

export function getInstrumentIcon(instrument: Instrument, props?: LucideProps) {
  const Icon = instrumentIcons[instrument] ?? fallbackIcon
  return <Icon strokeWidth={1.75} {...props} />
}
