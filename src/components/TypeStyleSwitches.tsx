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

export function StyleSwitch() {
  const comp = useSelection((s) => s.comp)
  const setComp = useSelection((s) => s.setComp)
  return (
    <Segmented
      label="Style"
      value={comp ? 'comp' : 'single'}
      onChange={(v) => setComp(v === 'comp')}
      options={[
        { value: 'single', text: 'Single' },
        { value: 'comp', text: 'Composite' },
      ]}
    />
  )
}

export const pageTitle = (sc: 'hiragana' | 'katakana', mode: 'char' | 'word') => {
  if (sc === 'hiragana') {
    return mode === 'char' ? (
      <>
        Hiragana Flashcard <span className="jp">ひらがな</span>
      </>
    ) : (
      <>
        Hiragana Words <span className="jp">ひらがな 単語</span>
      </>
    )
  }
  return mode === 'char' ? (
    <>
      Katakana Flashcard <span className="jp">カタカナ</span>
    </>
  ) : (
    <>
      Katakana Words <span className="jp">カタカナ 単語</span>
    </>
  )
}
