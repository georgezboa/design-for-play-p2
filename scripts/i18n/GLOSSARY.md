# NIGHTFALL 汉化 · glossary and rules (2026-10-11)

Simplified Chinese (zh-CN). Voices stay English; this is subtitles and UI.

## The game, in two lines
A single-player journey backward through time on a night train. Butch, a quiet,
tired archive/lost-property clerk, follows the marks Mara left (a claim card,
1978-0412) through six chapters and finally faces the Conductor. Noir, literary,
restrained; never jokey.

## Names (George chose to translate them)
| English | 中文 |
|---|---|
| Butch | 布奇 |
| Mara · Mara Velez · VELEZ, M. | 玛拉 · 玛拉·韦莱斯 · 韦莱斯，M. |
| Rosa | 罗莎 |
| Lev · Lev Ardin | 列夫 · 列夫·阿尔丁 |
| Eda | 艾达 |
| Toma | 托马 |
| Petar · P. Kolar | 佩塔尔 · P. 科拉尔 |
| Olek | 奥列克 |
| Nika | 妮卡 |
| Hana | 哈娜 |
| Seline | 塞琳 |
| Sava | 萨瓦 |
| Rada | 拉达 |
| Bosko | 博斯科 |
| Ana | 安娜 |
| Daro | 达罗 |
| Irena | 伊雷娜 |
| Mila | 米拉 |
| Miro | 米罗 |
| Vesna | 韦丝娜 |
| the Conductor / CONDUCTOR | 列车长 |
| the Archivist / ARCHIVIST | 档案员 |
| NARRATION (speaker label) | 旁白 |

Any other person's name: standard Xinhua transliteration (新华社译名), and list it
under `"_newNames"` in your output so the names can be unified.

**Real people and companies stay in English** (credits, licences): George, Jason,
Mathias, Jaan Patterson, ElevenLabs, OpenAI, Musopen, ambientCG, Poly Haven,
Mixamo, Quaternius, Kenney, CC0, CC BY… Translate only the role/label words
around them ("MUSIC" → 音乐, "VOICES" → 配音).
The game title **NIGHTFALL stays NIGHTFALL**.

## Places, things, chapters
| English | 中文 |
|---|---|
| Echo City | 回声城 |
| the Night Service (the train) · NIGHT SERVICE | 夜班列车 |
| Borrowed Light · borrowed light | 借来的光 |
| The Painted Country | 彩绘之国 |
| The Museum of One Answer | 唯一答案博物馆 |
| The Black Ticket | 黑票 |
| All Worlds at Once | 万界同时 |
| The Copper Heron (hotel) | 铜鹭旅馆 |
| Transport / Transit Ministry · the ministry | 交通部 |
| Lost Property | 失物招领处 |
| the Archive · archive | 档案馆 · 档案 |
| claim · claim card · CLAIM 1978-0412 | 认领单 · 认领卡 · 认领单 1978-0412 |
| the orchard case | 果园箱 |
| Bellwether Orchard | 贝尔韦瑟果园 |
| hawthorn (Mara's mark, a plant) | 山楂 |
| Ticket 43 · seat forty-three · ticket forty-three | 43 号车票 · 43 号座位 · 43 号车票 |
| magic stone(s) · MAGIC STONES | 魔法石 |
| paper layers (Butch's health) | 纸层 |
| the bell · NEXT BELL · on the bell · off-beat | 钟 · 下一声钟 · 踩着钟声 · 反拍 |
| amber / teal / rose (the coloured lines, lamps) | 琥珀 / 青绿 / 玫瑰 |
| rose signal | 玫瑰信号灯 |
| STORY / NORMAL (difficulty) | 剧情 / 普通 |
| checkpoint · archive slot · journey (a save) | 检查点 · 存档位 · 旅程 |
| fire letters / GROUND LETTERS | 火字 / 地上的火字 |
| scanner (walk-beside crossings) | 扫描门 |
| the oil line | 油线 |

## Keys and inputs
Keep as written: E, Q, R, F, H, M, W A S D, WASD, SHIFT, ESC, ENTER, TAB, ALT,
CTRL, LT, RT, LB, RB, A/B/X/Y, digits, arrows (← → ↑ ↓).
Translate: SPACE → 空格 · CLICK → 点击 · RIGHT-CLICK → 右键 · DOUBLE-CLICK → 双击 ·
DRAG → 拖动 · HOLD → 按住 · SCROLL / WHEEL → 滚轮 · MOUSE → 鼠标 · LEFT STICK → 左摇杆 ·
GAMEPAD → 手柄 · KEYBOARD → 键盘.

## Rules for every string
1. **Placeholders** `{0}`, `{1}`… stay exactly, each once (you may move them).
2. **HTML tags** (`<kbd>…</kbd>`, `<b>`, `<span …>`, `<br>`) stay exactly, in the same
   order, with their attributes untouched; translate the text between them.
3. Keep the ` · ` separators (one space each side) and any `\n` line breaks.
4. ALL-CAPS English labels → plain Chinese (no forced emphasis). Keep them **short**:
   HUD labels sit in small boxes. Sentences → natural Chinese with full-width
   punctuation（，。？！：；“”）.
5. Numbers, codes and dates stay: 1978-0412, C-441, 43, 14:12, 1978.
6. Dialogue: natural spoken Chinese in character (Butch: few words, tired, precise;
   Lev: dry investigator; the Conductor: cold officialdom). Do not explain or add.
7. A string that is not shown to players (code, a file name, a font name, a CSS or
   debug word) → map it to **itself** unchanged.
8. Fragments (the end of a sentence built in code, e.g. "· WASH THE PAPER", "BACK TO
   THE") → translate so they still read when joined; look at the source file
   (`files`) to see how it is used when unsure.
