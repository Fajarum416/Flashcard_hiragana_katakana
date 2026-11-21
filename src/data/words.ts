import type { Script } from './kana'

/** [kana, romaji, arti] */
export type Word = [string, string, string]

export const WORDS: Record<Script, Word[]> = {
  hiragana: [
    ['あめ', 'ame', 'rain'],
    ['いぬ', 'inu', 'dog'],
    ['ねこ', 'neko', 'cat'],
    ['さかな', 'sakana', 'fish'],
    ['みず', 'mizu', 'water'],
    ['はな', 'hana', 'flower'],
    ['やま', 'yama', 'mountain'],
    ['ほん', 'hon', 'book'],
    ['つき', 'tsuki', 'moon'],
    ['さくら', 'sakura', 'cherry blossom'],
    ['すし', 'sushi', 'sushi'],
    ['くるま', 'kuruma', 'car'],
    ['ひと', 'hito', 'person'],
    ['ほし', 'hoshi', 'star'],
    ['かさ', 'kasa', 'umbrella'],
    ['うみ', 'umi', 'sea'],
    ['いえ', 'ie', 'house'],
  ],
  katakana: [
    ['アイス', 'aisu', 'ice cream'],
    ['カメラ', 'kamera', 'camera'],
    ['コーヒー', 'kōhī', 'coffee'],
    ['テレビ', 'terebi', 'television'],
    ['ケーキ', 'kēki', 'cake'],
    ['パン', 'pan', 'bread'],
    ['ペン', 'pen', 'pen'],
    ['タクシー', 'takushī', 'taxi'],
    ['ホテル', 'hoteru', 'hotel'],
    ['ラジオ', 'rajio', 'radio'],
    ['ココア', 'kokoa', 'cocoa'],
    ['ナイフ', 'naifu', 'knife'],
  ],
}
