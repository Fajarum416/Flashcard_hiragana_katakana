import { useSelection } from '../store/useSelection'
import { Segmented } from './Segmented'

export function TypeStyleSwitches({
  mode,
  onModeChange,
}: {
  mode: 'char' | 'word'
  onModeChange?: (m: 'char' | 'word') => void
}) {
  const comp = useSelection((s) => s.comp)
  const setComp = useSelection((s) => s.setComp)
  const setMode = useSelection((s) => s.setMode)
  return (
    <>
      <Segmented
        label="Type"
        value={mode}
        onChange={(m) => {
          setMode(m)
          onModeChange?.(m)
        }}
        options={[
          { value: 'char', text: 'Characters' },
          { value: 'word', text: 'Words' },
        ]}
      />
      <Segmented
        label="Style"
        value={comp ? 'comp' : 'single'}
        onChange={(v) => setComp(v === 'comp')}
        options={[
          { value: 'single', text: 'Single' },
          { value: 'comp', text: 'Composite' },
        ]}
      />
    </>
  )
}

export const scriptTitle = (sc: 'hiragana' | 'katakana') =>
  sc === 'hiragana' ? (
    <>
      Hiragana Practice <span className="jp">ひらがな</span>
    </>
  ) : (
    <>
      Katakana Practice <span className="jp">カタカナ</span>
    </>
  )
