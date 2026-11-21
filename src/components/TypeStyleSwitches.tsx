import { useSelection } from '../store/useSelection'
import { Segmented } from './Segmented'

export function TypeStyleSwitches() {
  const mode = useSelection((s) => s.mode)
  const comp = useSelection((s) => s.comp)
  const setMode = useSelection((s) => s.setMode)
  const setComp = useSelection((s) => s.setComp)
  return (
    <>
      <Segmented
        label="Type"
        value={mode}
        onChange={setMode}
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
