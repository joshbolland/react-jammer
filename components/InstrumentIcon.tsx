import Icon from '@mdi/react'
import type { IconProps } from '@mdi/react/dist/IconProps'
import {
  mdiBugle,
  mdiGlassFlute,
  mdiGuitarAcoustic,
  mdiGuitarElectric,
  mdiGuitarPick,
  mdiGuitarPickOutline,
  mdiInstrumentTriangle,
  mdiMicrophoneVariant,
  mdiMidiPort,
  mdiMusicClefAlto,
  mdiMusicClefBass,
  mdiMusicNote,
  mdiMusicNoteEighth,
  mdiMusicNoteSixteenth,
  mdiPiano,
  mdiSaxophone,
  mdiTrumpet,
  mdiViolin,
} from '@mdi/js'
import type { Instrument } from '@/lib/types'

type InstrumentIconProps = Omit<IconProps, 'path'> & { strokeWidth?: number }

const instrumentIconPaths: Partial<Record<Instrument, string>> = {
  guitar: mdiGuitarAcoustic,
  ukulele: mdiGuitarPick,
  banjo: mdiGuitarPickOutline,
  mandolin: mdiGuitarElectric,
  bass: mdiMusicClefBass,
  drums: mdiInstrumentTriangle,
  piano: mdiPiano,
  keyboard: mdiMidiPort,
  vocals: mdiMicrophoneVariant,
  violin: mdiViolin,
  viola: mdiMusicClefAlto,
  cello: mdiMusicClefBass,
  saxophone: mdiSaxophone,
  trumpet: mdiTrumpet,
  trombone: mdiBugle,
  clarinet: mdiMusicNoteEighth,
  flute: mdiGlassFlute,
  harmonica: mdiMusicNoteSixteenth,
}

const fallbackIconPath = mdiMusicNote

export function getInstrumentIcon(instrument: Instrument, props?: InstrumentIconProps) {
  const { strokeWidth: _strokeWidth, ...iconProps } = props ?? {}
  const path = instrumentIconPaths[instrument] ?? fallbackIconPath
  return <Icon path={path} {...iconProps} />
}
