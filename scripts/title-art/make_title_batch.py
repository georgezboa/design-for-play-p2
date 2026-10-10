"""NIGHTFALL title screen, painted (round 10): the image batch for George's image tool.

Writes title-batch.json (machine-readable, for Codex / ChatGPT image_gen) and title-batch.md (readable,
Chinese notes, English prompts). The composition is the round-6 title's ("one carriage behind"), painted:
Butch on the bench by the big window, the departures board (the game's menu) on the walnut wall, the end
door's little window onto the next carriage, where Mara walks away.

    python3 -I scripts/title-art/make_title_batch.py <out dir>
"""
import json, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'

INK = ("hand-inked editorial illustration; fine dip-pen linework with delicate cross-hatching in the shadows; flat matte gouache colour fields; "
       "limited palette of ink black (#0E0C0B), deep navy (#1B2A3A), dark teal (#23413F), walnut brown (#4A3222), aged matte brass (#8A6A3C), ivory paper (#E9DFC8) "
       "and one warm amber (#E3A34E) practical light; theatrical stage-set composition with large areas of near-black negative space; one warm light source makes a "
       "sharp-edged pool of light and everything outside it falls quickly into shadow; realistic proportions and consistent scale; subtle paper grain, slightly uneven ink.")
NO = "No glossy highlights, no airbrushed gradients, no 3D render look, no photorealism, no anime, no text, no letters, no numbers, no signage words, no watermark."
STYLE = f"STYLE: {INK} {NO} Match the style, palette, line quality and lighting of the reference image ST1-a.png exactly."
OUTSIDE = ("STYLE: the same hand-inked night as ST1-a.png and the view in A1-window.png: dip-pen linework and cross-hatching, flat matte gouache, a cold moonlit "
           "palette of ink black (#0E0C0B), deep navy (#1B2A3A), dark teal (#23413F) and grey-blue, a few tiny warm amber (#E3A34E) windows far away; rain-dark and "
           "soft, seen through a train window at night. " + NO)

BUTCH = ("BUTCH: a lean, tired railway lost-property clerk in his fifties, about 1.75 m tall; peaked railway cap with a short black brim and a small brass badge; "
         "long deep-navy greatcoat with a row of small aged-brass buttons; dark trousers, worn boots. Same face and costume as ST5-a.png and the C-butch-poses.png sheet "
         "(the seated pose there is how he sits).")
MARA = ("MARA: a woman seen only from behind, never her face, the same woman as C-mara.png: dark hair in a low bun, a long dark coat and a rose-red (#C8506A) scarf, "
        "the only rose colour in the picture.")
EMPTY = "No people and no animals in the picture."

GREEN = "pure green (#00FF00): flat, perfectly even, no reflections, no texture, no rain, no light on it, so the game can put a moving view behind it"
KEY = ("Everything that is not the subject is flat, perfectly even pure green (#00FF00), so the game can cut the subject out; nothing in the subject itself is green, "
       "and its edge against the green is clean (no green glow, no green halo).")
TILE = ("SEAMLESS: the left edge and the right edge must join as a continuous strip when the picture is repeated side by side (the game scrolls it endlessly), "
        "so nothing is cut in half at either edge.")
WIDE = "FRAMING: landscape 3:2, 1536x1024."

items = []
def add(id, title, prompt, *, size='1536x1024', refs=('ST1-a.png',), pair=None, green='', game='', zh=''):
    items.append({'id': id, 'file': f'{id}.png', 'title': title, 'size': size, 'reference_images': list(refs),
                  'pair_of': pair, 'chroma': green, 'prompt': prompt, 'game_adds': game, 'zh': zh})

# ---------------------------------------------------------------- the carriage (the room)
CARRIAGE = (
  "The title screen of a game: inside a night-train carriage at night, seen exactly side-on like a theatre stage, one continuous wall from the LEFT edge to the "
  "RIGHT edge. Lay it out like this (fractions of the picture's width and height, measured from the top left): "
  "(1) THE BIG WINDOW on the left: one large window with rounded corners, a dark-wood frame with a thin aged-brass edge; its glass spans from 5% to 56% of the "
  "width and from 16% to 63% of the height. The glass is filled with " + GREEN + ". Below it a narrow wooden sill at 63%-66% of the height. "
  "(2) Above the window, a brass luggage rack with netting from 3% to 58% of the width at 5%-12% of the height, an old round hatbox and a paper parcel on it. "
  "(3) THE BENCH: a long upholstered bench (deep red or dark teal, like A1-window.png) runs under the window, its seat at about 74% of the height; two high "
  "wooden seat backs make a bay: one at about 20% of the width, one at about 57%. "
  "(4) BUTCH sits on the bench in the bay, in profile, facing RIGHT along the train, looking out of the window: his body between 33% and 46% of the width, the top "
  "of his cap at about 36% of the height, his boots on the floor at about 92%. Beside him on the seat, nearer to us, the battered wooden orchard case with brass "
  "corners, his left hand resting on it; a blank paper luggage tag on a string hangs from its handle (the tag is plain, no writing). "
  "(5) THE LAMP: on a small wooden table fixed under the window just in front of him (at about 49%-54% of the width, at sill height) a small brass oil lamp is lit: "
  "the one warm amber light, a sharp-edged pool on his face, his hands, the case and the table; everything else falls off into deep shadow. "
  "(6) THE WALL: from 58% to 87% of the width and from 6% to 90% of the height, a broad, plain, dark walnut-panelled wall with NOTHING on it (no sign, no board, no "
  "picture, no lamp on it): the game hangs the departures board there. A small brass pendant lamp hangs from the ceiling above it at about 73% of the width, its "
  "shade at 2%-8% of the height, glowing dimly. "
  "(7) THE END DOOR at the right edge, from 88% to 100% of the width: a dark wooden door with a brass handle, and in it a small upright window with rounded corners "
  "from 90% to 98% of the width and 20% to 45% of the height whose glass is also " + GREEN + ". "
  "(8) THE FLOOR: dark boards with a worn runner from 90% to 100% of the height. "
  "Pure green ONLY in the two glasses; nothing else in the picture is green. " + BUTCH + " "
  "FRAMING: landscape 3:2, 1536x1024. Wide screens crop up to 18% off the top and the bottom, square-ish screens crop the sides, phones show only the window and "
  "Butch: keep every part exactly where the layout says. " + STYLE)
add('TT-carriage', 'The carriage: Butch by the big window, the wall for the board, the end door', CARRIAGE,
    refs=['ST1-a.png', 'A1-window.png', 'A2-window.png', 'ST5-a.png', 'C-butch-poses.png'],
    green='window glass and the end door\'s little window',
    game='the view behind both glasses (sky, hills, orchards, trackside), rain on the glass, the departures board (the menu) on the plain wall, NIGHTFALL on the glass, '
         'the lamp flicker, the carriage sway',
    zh='标题画面的车厢：左边大窗（玻璃纯绿），Butch 坐在窗前长凳上、侧脸朝右，手放在果园箱上，小桌上点着油灯；右边是一大片空的胡桃木墙（游戏把出发牌菜单挂在这里，墙上什么都不要画）；最右是尽头门，门上小窗也是纯绿。每个东西的位置按提示里的百分比放。')

add('TT-carriage-lit', 'The same carriage, washed by a passing trackside lamp', (
  "Edit TT-carriage.png and change only the light: the same picture, every line, object, person and colour field exactly where it is, but as if a strong trackside "
  "lamp outside is passing the window at this moment: a broad wash of warm sodium-orange light (#FF9A46) comes in through the big window and falls across Butch, "
  "the bench, the table, the case, the walnut wall and the end door, brightening them and throwing soft window-shaped light onto the wall; the shadows stay where "
  "they are. The green in the two glasses stays exactly the same flat pure green (#00FF00), untouched. " + STYLE),
    refs=['TT-carriage.png', 'ST1-a.png'], pair='TT-carriage', green='same as TT-carriage',
    game='a band of this lit version sweeps across the carriage each time a trackside lamp goes past outside',
    zh='用编辑模式从 TT-carriage.png 改：只改光，一切不动，像窗外正好有一盏轨旁灯经过，一片暖橙光照进车厢。两块绿玻璃保持原样。')

# ---------------------------------------------------------------- the view outside (behind the big window)
add('TT-sky', 'The night sky outside the window', (
  "The night sky seen from a train, filling the whole picture: low, heavy rain clouds in deep navy and grey-blue, soft-edged; a pale full moon, half veiled by thin "
  "cloud, at about 32% of the width and 40% of the height, with a faint cold halo; the upper left quarter of the picture is a calm, dark, even cloud field (the game "
  "writes the title there). From about 66% of the height down, a dark, almost black, flat distant land with no detail. " + EMPTY + " " + WIDE + " " + OUTSIDE),
    refs=['ST1-a.png', 'A1-window.png'],
    game='stays still behind the moving layers; rain over it',
    zh='窗外的夜空：低垂的雨云，月亮在左边约三分之一处（游戏会让它落在 Butch 的帽子后面），左上角留一片安静的暗云（游戏在那里写 NIGHTFALL）。画面 66% 以下是看不清的远地。')

add('TT-hills', 'Far layer: low hills and a village (slowest)', (
  "A long, low line of dark rolling hills seen far away at night from a train, side-on: the hill line runs across the whole width between 45% and 60% of the "
  "height; on the hills a small sleeping village with a church spire, a few houses and three or four tiny warm amber windows, and faint rows of orchard trees; "
  "below the hill line, dark fields down to the bottom edge. Above the hill line, everything is " + GREEN.replace(', so the game can put a moving view behind it', '') + " (the game "
  "puts its own sky there). " + TILE + " " + EMPTY + " " + WIDE + " " + OUTSIDE),
    refs=['ST1-a.png', 'A1-window.png'], green='everything above the hill line',
    game='scrolls slowly past behind the window',
    zh='最远的一层：低矮连绵的山丘和一个小村子（教堂尖顶、几扇暖黄的小窗）。山脊线以上全部纯绿（游戏放自己的天空）。左右边要能无缝接上。')

add('TT-orchard', 'Middle layer: hedgerows, hawthorns and orchard trees', (
  "A middle-distance band of countryside seen from a train at night, side-on: dark hedgerows with a few wind-bent hawthorn trees and round apple trees in rows, "
  "rain-dark, their tops between 58% and 72% of the height (a few taller trees up to 52%), their shapes clear against the sky; below them dark wet meadow down to the bottom edge. Above the "
  "hedgerows and trees, everything is " + GREEN.replace(', so the game can put a moving view behind it', '') + ". " + TILE + " " + EMPTY + " " + WIDE + " " + OUTSIDE),
    refs=['ST1-a.png', 'A1-window.png'], green='everything above the trees',
    game='scrolls past faster than the hills',
    zh='中间一层：树篱、山楂树、苹果树。树顶以上全部纯绿。左右边要能无缝接上。')

add('TT-trackside', 'Near layer: the embankment rushing past', (
  "The wet grassy railway embankment right outside a moving train at night, side-on, streaked by speed into long horizontal motion blur: tall wet grass, a low "
  "wire fence and a few stones catching cold moonlight, occupying only the bottom 25% of the picture (from 75% of the height down to the bottom edge). Above "
  "that, everything is " + GREEN.replace(', so the game can put a moving view behind it', '') + ". " + TILE + " " + EMPTY + " " + WIDE + " " + OUTSIDE),
    refs=['ST1-a.png', 'A2-window.png'], green='everything above the embankment',
    game='rushes past fastest, under the window',
    zh='最近一层：窗下飞快掠过的湿草坡和铁丝矮栅栏，横向动态模糊，只占画面最下面 25%，上面全部纯绿。左右边要能无缝接上。')

add('TT-pole', 'A telegraph pole (cut-out)', (
  "One tall old wooden railway telegraph pole, seen side-on at night, standing straight from the very bottom edge to near the top edge: weathered dark wood, wet, "
  "one crossarm near the top with four small glass insulators catching a little cold light; lightly blurred sideways as if seen from a moving train. Only the pole. "
  + KEY + " " + EMPTY + " FRAMING: portrait 2:3, 1024x1536, the pole centred. " + OUTSIDE),
    size='1024x1536', refs=['ST1-a.png'], green='the background',
    game='goes past the window again and again; the game draws the wires between the poles',
    zh='一根电线杆（竖图 1024×1536），从底边立到接近顶边，顶部一根横担和四个玻璃瓷瓶。背景纯绿，游戏抠出来反复从窗外经过，电线由游戏画。')

add('TT-lamp', 'A trackside lamp (cut-out)', (
  "One old railway trackside lamp post, seen side-on at night: a slim cast-iron post from the very bottom edge up to about 18% from the top, with a small glass "
  "lantern head on top, lit with a strong warm amber flame (#E3A34E), its glass glowing; the post below in shadow. Only the lamp post, no light cast on any "
  "background. " + KEY + " " + EMPTY + " FRAMING: portrait 2:3, 1024x1536, the post centred. " + OUTSIDE.replace('a few tiny warm amber (#E3A34E) windows far away', 'one warm amber flame')),
    size='1024x1536', refs=['ST1-a.png'], green='the background',
    game='every few poles a lamp goes past; as it does, its light sweeps across the carriage (TT-carriage-lit)',
    zh='一盏轨旁灯（竖图 1024×1536）：细铸铁灯柱，顶上一个点亮的暖黄玻璃灯头。背景纯绿。它从窗外经过时，游戏让一道暖光扫过车厢。')

# ---------------------------------------------------------------- through the end door
add('TT-next-carriage', 'Through the end door: the next carriage, and Mara walking away', (
  "Looking straight down the corridor of the next night-train carriage, through its open connecting doors, seen head-on in one-point perspective: a narrow lamplit "
  "corridor with dark wood panelling, brass rails and a worn red runner, small warm lamps along it, the far end lost in darkness. Far down the corridor, small, "
  "MARA walks away from us. Keep the corridor and Mara inside the middle third of the width (the game shows only a tall, narrow slice of this picture, through a "
  "small door window). " + MARA + " " + WIDE + " " + STYLE),
    refs=['ST1-a.png', 'A2-aisle.png', 'C-mara.png'],
    game='seen through the end door\'s little window, a little dimmed by the glass; the corridor lamps flicker',
    zh='尽头门小窗里看到的下一节车厢：一条暖灯照着的走廊，Mara 在远处背对我们走远（不露脸，玫瑰色围巾）。走廊和 Mara 放在画面中间三分之一宽度里，游戏只透过小窗露出中间一窄条。')

spec = {
  'project': 'NIGHTFALL',
  'phase': 'title screen (round 10)',
  'output_folder': 'NIGHTFALL art/title/',
  'size': '1536x1024 landscape, except TT-pole and TT-lamp: 1024x1536 portrait',
  'style': 'ST1-a, the night service (Chapter 1)',
  'rules': [
    'Generate in the order listed: TT-carriage-lit is made from TT-carriage with the image tool\'s edit mode, so everything except the light stays put.',
    'Pass every file in reference_images to the image tool (style-tests/ for ST*.png, ch1/ for A1-*/A2-*/C-*, title/ for TT-*).',
    'Pure green #00FF00 only where the item says (chroma): flat and even, nothing else in the picture green.',
    'Name each output exactly as "file". If you make several variants, add -a, -b, -c before .png.',
    'People only where the prompt says so (Butch in TT-carriage and TT-carriage-lit, Mara in TT-next-carriage). No text anywhere: the game writes NIGHTFALL and the whole menu.',
    'Record each generation (file, prompt, source) in title/generation-prompts.json as before.',
  ],
  'layout_note': 'TT-carriage positions (fractions of width x height): window glass 0.05-0.56 x 0.16-0.63; Butch 0.33-0.46, cap top 0.36; lamp 0.49-0.54 at the sill; '
                 'plain wall for the board 0.58-0.87 x 0.06-0.90; pendant lamp 0.73; end-door glass 0.90-0.98 x 0.20-0.45.',
  'items': items,
}
open(f'{OUT}/title-batch.json', 'w').write(json.dumps(spec, ensure_ascii=False, indent=2))

md = ['# NIGHTFALL 标题画面出图批次（给 Codex / ChatGPT）', '',
      '构图沿用现在的标题画面（"one carriage behind"），换成第一章的手绘风格（ST1-a）：Butch 坐在大窗前的长凳上，窗外雨夜田野分层滚动；右边胡桃木墙上挂出发牌菜单（菜单是游戏的文字，画里墙上留空）；尽头门的小窗里，Mara 在下一节车厢远去。',
      '', f'共 {len(items)} 张，输出到 `{spec["output_folder"]}`。尺寸：{spec["size"]}。', '', '**规则**', '']
md += [f'- {r}' for r in spec['rules']]
md += ['', '**几种特殊图**', '',
       '- **绿窗**（TT-carriage、TT-carriage-lit）：两块玻璃纯绿 #00FF00，游戏抠掉后在后面放窗外景。',
       '- **配对图**（TT-carriage-lit）：用编辑模式从 TT-carriage 改，只改光。游戏用它做"窗外轨旁灯经过时一道暖光扫过车厢"。',
       '- **分层窗外景**（TT-hills、TT-orchard、TT-trackside）：上面的天空部分纯绿，游戏抠掉后叠在 TT-sky 前面，按远近不同速度滚动；左右边要能无缝接上（不行也没关系，游戏会补缝）。',
       '- **抠图**（TT-pole、TT-lamp）：竖图，背景纯绿。',
       '', '**TT-carriage 的布局**（宽 × 高的比例，从左上角量）', '',
       '| 东西 | 位置 |', '|---|---|',
       '| 大窗玻璃（纯绿） | 宽 5%–56%，高 16%–63% |',
       '| 行李架 | 宽 3%–58%，高 5%–12% |',
       '| Butch（侧脸朝右坐着） | 宽 33%–46%，帽顶在 36% 高 |',
       '| 小桌上的油灯 | 宽 49%–54%，窗台高度 |',
       '| 空墙（挂菜单的地方，什么都不画） | 宽 58%–87%，高 6%–90% |',
       '| 吊灯 | 宽 73%，高 2%–8% |',
       '| 尽头门小窗（纯绿） | 宽 90%–98%，高 20%–45% |',
       '', '宽屏会裁掉上下各约 18%，窄屏裁左右，手机只显示大窗和 Butch，所以位置尽量照表放。', '',
       '## 出图清单', '']
for it in items:
    md += [f"### {it['id']} · {it['title']}", '', f"- 文件：`{it['file']}`（{it['size']}）",
           f"- 参考图：{', '.join('`' + r + '`' for r in it['reference_images'])}"]
    if it['pair_of']: md.append(f"- 配对图：用编辑模式从 `{it['pair_of']}.png` 改")
    if it['chroma']: md.append(f"- 纯绿：{it['chroma']}")
    md.append(f"- 说明：{it['zh']}")
    md.append(f"- 游戏加：{it['game_adds']}")
    md += ['', '```text', it['prompt'], '```', '']
open(f'{OUT}/title-batch.md', 'w').write('\n'.join(md))
print(len(items), 'items')
