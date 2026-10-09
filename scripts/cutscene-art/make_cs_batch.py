"""NIGHTFALL cutscenes, painted (round 9): the image batch for George's image tool, and the storyboard.

Writes cutscenes-batch.json (machine-readable, for Codex / ChatGPT image_gen) and cutscenes-batch.md
(readable, Chinese notes, English prompts). Captions are the shipped ones, word for word.
"""
import json, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'

INK = ("hand-inked editorial illustration; fine dip-pen linework with delicate cross-hatching in the shadows; flat matte gouache colour fields; "
       "limited palette of ink black (#0E0C0B), deep navy (#1B2A3A), dark teal (#23413F), walnut brown (#4A3222), aged matte brass (#8A6A3C), ivory paper (#E9DFC8) "
       "and one warm amber (#E3A34E) practical light; theatrical stage-set composition with large areas of near-black negative space; one warm light source makes a "
       "sharp-edged pool of light and everything outside it falls quickly into shadow; realistic proportions and consistent scale; subtle paper grain, slightly uneven ink.")
NO = "No glossy highlights, no airbrushed gradients, no 3D render look, no photorealism, no anime, no text, no letters, no numbers, no signage words, no watermark."

STYLES = {
  # the night service itself (Chapter 1's look): every shot inside the train, and the opening / finale / ending
  'ch1': {'refs': ['ST1-a.png'], 'text': f"STYLE: {INK} {NO} Match the style, palette, line quality and lighting of the reference image ST1-a.png exactly."},
  # Chapter 2, the rain city
  'ch2': {'refs': ['ST3-b.png', 'ST1-a.png'], 'text': (f"STYLE: {INK} The rain city at night: cold teal signs and amber lamps are the only colour; rain streaks are lit only inside a lamp's cone. "
           f"{NO} Match the style, palette and lighting of the reference image ST3-b.png exactly.")},
  # Chapter 3, Echo City: Leone's West
  'ch3': {'refs': ['ST4-b.png'], 'text': ("STYLE: a painted cinematic illustration lit and coloured like a 1960s Italian western shot in wide anamorphic Techniscope: bleached, "
           "almost white pale-blue sky; sun-baked ochre, sienna and terracotta stone; deep, hard, near-black shadows under arcades and doorways; dust in the air; "
           "high contrast, warm saturated earth tones against a cool sky; slight film grain; crisp, hot, harsh light. Not sepia, not hazy, not golden hour unless the "
           "prompt says dusk. Painterly, grounded, consistent scale. No 3D render look, no anime, no text, no letters, no numbers, no watermark. "
           "Match the colour, light and grain of the reference image ST4-b.png exactly.")},
  # Chapter 4, the painted country
  'ch4': {'refs': ['refs/ref-ch4-yard.jpg', 'refs/ref-ch4-line.jpg', 'refs/ref-ch4-studio.jpg'], 'text': (
           "STYLE: a soft graphite pencil line drawing on warm cream drawing paper (#EFE6D2) with visible paper tooth and light hatching, the lines a little wobbly like a "
           "careful hand; colour only where the prompt asks for it, as loose transparent gouache blooms that pool and stop short of the pencil lines, in a few clean "
           "pigments (hawthorn red #B0342A, leaf green, sky blue, ochre); lots of bare paper; flat, side-on composition like a picture book or a theatre backdrop. "
           "No 3D, no photorealism, no anime, no text, no letters, no numbers, no watermark. Match the look of the Chapter 4 references (ref-ch4-*.jpg): pencil on "
           "cream paper with gouache colour.")},
  # Chapter 5, the museum (walnut and brass in the dark), in the night service's ink
  'ch5': {'refs': ['ST1-a.png', 'refs/ref-ch5-museum.jpg'], 'text': (f"STYLE: {INK} The museum: dark walnut panelling, aged brass fittings and glass vitrines, "
           f"cream plaster high up lost in darkness, lit only by small warm lamps (its layout is the museum in ref-ch5-museum.jpg). {NO} "
           f"Match the style, palette, line quality and lighting of the reference image ST1-a.png exactly.")},
  # a separate object on grey, to be cut out
  'sheet': {'refs': ['ST1-a.png'], 'text': ("STYLE: hand-inked editorial illustration; fine dip-pen linework; flat matte gouache colour; realistic proportions; subtle paper grain. "
           "Even soft light so every part reads clearly. No glossy highlights, no 3D render look, no photorealism, no text, no watermark. Match the style and line quality of ST1-a.png.")},
}

BUTCH = ("BUTCH: a lean, tired railway lost-property clerk in his fifties, about 1.75 m tall; peaked railway cap with a short black brim and a small brass badge; long deep-navy "
         "greatcoat to the knee with a row of small aged-brass buttons; dark trousers, worn boots; carries a small oil lantern with a warm amber flame. Same face and costume as "
         "ST5-a.png and the C-butch-poses.png sheet.")
HANDS = ("BUTCH'S HANDS: weathered, older man's hands coming out of deep-navy greatcoat cuffs with a small aged-brass button; no face in the picture.")
CONDUCTOR = ("THE CONDUCTOR: tall, heavy-set railway conductor, the same man as C-conductor.png: peaked cap with a brass badge, deep shadow over the eyes with two small "
             "lamp-lit glints, grey moustache and short grey beard, long dark uniform greatcoat, a watch chain; holds a ticket punch.")
MARA = ("MARA: a woman seen only from behind, never her face, the same woman as C-mara.png: dark hair in a low bun, a long dark coat and a rose-red (#C8506A) scarf, "
        "the only rose colour in the picture.")
EMPTY = "No people and no animals in the picture (the game adds the characters)."
CAST = {'butch': BUTCH, 'hands': HANDS, 'conductor': CONDUCTOR, 'mara': MARA}
CAST_REFS = {'butch': ['ST5-a.png', 'C-butch-poses.png'], 'hands': ['ST5-a.png'], 'conductor': ['C-conductor.png'], 'mara': ['C-mara.png']}

FRAME = {
  'stage': ("FRAMING: landscape 3:2. The game crops the top 12% and the bottom 12% to a 2:1 frame, so keep everything important inside the middle 76% of the height; "
            "keep the main subject inside the middle third of the width, because narrow screens crop the sides."),
  'pan': ("FRAMING: landscape 3:2. The game crops the top 12% and the bottom 12% to a 2:1 frame and pans across the whole width, so keep everything important inside "
          "the middle 76% of the height and spread the interest across the width."),
  'sheet': "Plain flat mid-grey (#7F7F7F) background, nothing else, the object fully visible with space around it.",
}
GREEN = ("The window glass is filled with flat, perfectly even pure green (#00FF00): no reflections, no texture, no rain, no light on it, so the game can put a moving "
         "view behind it. Keep the green inside the glass only.")

items = []
def add(id, cut, title, prompt, *, style='ch1', frame='stage', chars=(), parent=None, pair=None, continues=None, green=False, game='', notes='', zh=''):
    refs = list(STYLES[style]['refs'])
    for c in chars:
        refs += [r for r in CAST_REFS[c] if r not in refs]
    for src in (parent, pair, continues and continues['from']):
        if src and src + '.png' not in refs:
            refs.append(src + '.png')
    cast = ' '.join(CAST[c] for c in chars) if chars else (EMPTY if frame != 'sheet' else '')
    parts = [prompt, GREEN if green else '', cast, FRAME[frame], STYLES[style]['text']]
    items.append({'id': id, 'file': f'{id}.png', 'cutscene': cut, 'title': title, 'size': '1536x1024', 'style': style,
                  'reference_images': refs, 'parent': parent, 'pair_of': pair, 'continues': continues, 'chroma_window': green,
                  'prompt': ' '.join(p for p in parts if p), 'game_adds': game, 'notes': notes, 'zh': zh})

# ---------------------------------------------------------------- 1 opening
add('OP-viaduct', 'opening', 'The empty viaduct in the rain (wide)',
    "A very long stone railway viaduct of many tall arches crossing a dark wooded valley at night in heavy rain, seen side-on from far away like a theatre backdrop; "
    "its top runs level from the LEFT edge to the RIGHT edge at about 40% of the image height, with a low parapet and a pair of rails; a deep black sky with heavy "
    "low cloud and a faint glow where the moon is hidden; the valley floor near-black with one thin glint of river under the arches; a few dark pines in the foreground "
    "at the bottom corners. The viaduct is EMPTY: no train on it.", frame='pan',
    game='the lit night train (C-train) crossing from left to right, rain, the wet shine of its windows on the parapet', notes='Also the last shot of the ending.',
    zh='空高架桥。游戏让 C-train 的亮窗火车从左开到右；结尾的最后一镜也用这张。')
add('OP-case', 'opening', 'Close-up: the orchard case on the top shelf',
    "Close-up of the top shelf of the lost-property office from the reference A0-office-awake.png: the battered wooden orchard case with brass corners, a leather handle "
    "and a paper luggage tag tied to the handle with string, between a hat box and a bundle of letters; lit from below by the desk lamp; the tag hangs straight down "
    "facing us in the middle of the picture, an ivory card about the size of a hand with a printed border, blank.", parent='A0-office-awake',
    game='CLAIM 1978-0412 · ORCHARD CASE · UNCLAIMED on the tag', notes='The camera flies into this from the case on the top shelf of A0-office-awake, so match that case.',
    zh='从 A0-office-awake 顶层架子上的箱子推进来，箱子要和那张图里的一致；标签空白，字由游戏写。')
add('OP-tag-front', 'opening', 'Close-up: the tag in his hands, front',
    "Close-up at the clerk's desk under the green-shaded lamp: two hands hold a paper luggage tag up towards the lamp by its two edges; the tag faces us, an ivory card "
    "with a printed border and a string through a brass eyelet at its left end, blank; behind, soft and dark, the walnut desk and the lamp's pool of light.",
    chars=('hands',), game='the front of the tag (CLAIM 1978-0412) and the flip to its back',
    zh='手持标签正面，空白。')
add('OP-tag-back', 'opening', 'Close-up: the tag turned over',
    "Exactly the same picture as the reference OP-tag-front.png, unchanged in every detail, except that the tag is turned over: we see its back, older and more yellowed, "
    "with a faded brown ink smudge across the middle where a name was written long ago (no readable letters).", pair='OP-tag-front', chars=('hands',),
    game='M. VELEZ · BELLWETHER in faded ink', notes='Make it with the edit tool from OP-tag-front so the hands do not move.',
    zh='同一张图，只把标签翻到背面。用编辑模式在 OP-tag-front 上改，手不要动。')

# ---------------------------------------------------------------- 2 chapter1To2
add('C12-rack', 'chapter1To2', 'In the carriage, leaving Bellwether: the rack and the window',
    "Inside a night-train carriage, seen straight on: a long window in the middle of the picture with a dark-wood frame and brass fittings, a red seat below it, and above "
    "it a brass luggage rack whose netting holds the battered wooden orchard case with a paper tag hanging from its handle, at the upper left, clearly visible; one wall "
    "lamp at the right; the rest in shadow.", green=True,
    game='the moving view of Bellwether halt (C12-halt-out) behind the glass, rain on the glass, the lamp swaying',
    zh='车厢内，行李架上是果园箱。窗玻璃涂纯绿 #00FF00，游戏在后面放移动的窗外景。')
add('C12-halt-out', 'chapter1To2', 'Out of the window: Bellwether halt, night',
    "The view out of a train window at night, side-on: a tiny country halt — a short wooden platform with one lamp post, a small blank station name board, a bench — "
    "running out of the LEFT edge; behind it a hawthorn hedge, apple trees and, far off, one lit house window; the right half of the picture is open dark fields under "
    "rain; the horizon at about 55% of the image height.", frame='pan', game='slides left behind the C12-rack window as the train pulls away',
    zh='窗外的贝尔韦瑟小站，从左边出画，右半边是黑田野。')
add('C12-ticket', 'chapter1To2', 'Close-up: the city-line ticket',
    "Close-up: one hand holds a small stiff railway ticket by its edge in warm lamplight; the ticket is an ivory card with a printed border, blank, with one round punched "
    "hole near its right end; behind it, soft and dark, the carriage window and the brass rack.", chars=('hands',),
    game='CITY LINE · ONE WAY · 1978 on the ticket', zh='手里的车票，空白。')
add('C12-window', 'chapter1To2', 'The carriage window (frame for moving views)',
    "A night-train carriage window seen straight on from inside, filling most of the picture: a heavy dark-wood frame with brass fittings, short dark-teal velvet curtains "
    "tied back at both sides, a narrow sill with a small brass ashtray; one warm lamp from the left lights the frame and the curtain folds.", green=True,
    game='the fields-to-city view (C12-fields, C12-city) scrolling behind the glass; reused in 2→3 (the records) and 3→4',
    zh='一扇车窗（窗玻璃纯绿），三段过场都用它看窗外。')
add('C12-fields', 'chapter1To2', 'Out of the window: night fields giving way to the city',
    "Night fields seen side-on from a moving train: dark ploughed fields and hedgerows under a black sky with a thin moon, a row of telegraph poles; the horizon at about "
    "55% of the image height; towards the RIGHT edge the first dark city buildings start to rise, and at the right edge itself a row of tenement roofs begins at the same "
    "horizon.", frame='pan', notes='Its right edge leads into C12-city: same horizon height.',
    zh='夜里的田野，右边开始出现城市，地平线和 C12-city 对齐。')
add('C12-city', 'chapter1To2', 'Out of the window: the rain city',
    "Continue the reference C12-fields.png beyond its right edge, with the same horizon height: a city of rooftops in heavy rain at night seen side-on from a train — water "
    "towers, chimneys, tenement roofs, iron footbridges between roofs, rows of small lit windows — and five large blank signboards standing on roofs at different heights "
    "across the picture, their faces flat dark with no words.", style='ch2', frame='pan', continues={'from': 'C12-fields', 'edge': 'the left edge continues the right edge of C12-fields'},
    game='the five signs light one after another, like a bell (teal and amber)', zh='雨夜城市，五块空白招牌，游戏让它们像钟声一样依次亮起。')
add('C12-terminal', 'chapter1To2', 'CITY TERMINAL: the rooftop platform',
    "A rooftop railway platform at night in heavy rain, seen side-on like a theatre backdrop: a long plank platform on a tenement roof with a low parapet, an iron canopy on "
    "thin posts, one hanging lamp with rain lit in its cone, a station clock on a post, and a big blank signboard hanging over the platform (its face plain dark, no words); "
    "the night train stands along the LEFT third, one door open with warm light; across a street-gap behind, a lower roof, and beyond it a far roof with a water tower and "
    "one small lamp. The platform is empty.", style='ch2',
    game='CITY TERMINAL lit on the board; Butch steps down from the train (sprite); on the far roof a small figure in a rose scarf turns away and is gone (C-mara)',
    notes='Leave the far roof clear and lit by its lamp: that is where Mara stands.', zh='屋顶站台，空无一人。招牌字、Butch 下车、远处屋顶上的 Mara 都由游戏加。')

# ---------------------------------------------------------------- 3 chapter2To3
add('C23-door', 'chapter2To3', 'Just made it: the coat caught in the door',
    "Close and side-on, at night in heavy rain: the side of the night train pulling out of a rooftop station, one carriage door just slammed shut, and a corner of a long "
    "deep-navy greatcoat caught in the door, sticking out and flapping in the wind; through the door's small window a warm lamp and the shoulder and cap of a man inside, "
    "his back to us; rain streaks lit by a platform lamp; wet planks sliding by at the bottom.", style='ch2', zh='刚赶上车，大衣角夹在门缝里。')
add('C23-letter', 'chapter2To3', 'The letter by lamplight',
    "Close-up in a dim night-train carriage, lit by a small oil lantern on the seat: two hands hold open a short letter on ivory notepaper; the writing area is blank, only "
    "faint ruled lines, so the words can be written in; the lantern's amber light falls across the paper and the cuffs, the rest dark teal shadow.", chars=('hands',),
    game="the letter: \"Butch — … KEEP MOVING. — M.\"", zh='灯下的信，纸面空白，字由游戏写。')
add('C23-records', 'chapter2To3', 'Out of the window: the tunnel of filed records',
    "A tunnel made of an archive, seen side-on as if from a train window: endless walls of small wooden filing drawers with brass handles and blank label frames, stacked "
    "from the bottom edge to the top edge, running straight across the whole picture; a few loose pages caught in the air; dim, warm light far off.", frame='pan',
    game='seen through C12-window, scrolling fast with motion blur, pages fluttering past, sunlight growing at the end', zh='档案隧道，横向连续，游戏让它在窗外快速滚过。')
add('C23-echo', 'chapter2To3', 'Echo City, 14:20: arriving',
    "Echo City at two in the afternoon, seen from a train arriving at its station, wide: a stone platform in the foreground under a long iron-and-glass canopy that throws "
    "a hard black shadow; beyond it a sun-baked town square of ochre and terracotta stone, arcades with near-black shadows, a stone clock tower centre-right with a big "
    "round clock face left blank (no hands, no numerals); on the platform at the right, a tall wooden ticket board with notices pinned to it. Nobody about.", style='ch3', frame='pan',
    game='the clock hands at 14:20, dust in the light, the camera drifting right to the board', zh='回声城下午两点二十。钟面空白，指针由游戏画。')
add('C23-board', 'chapter2To3', 'Close-up: two tickets for seat 43',
    "Close-up of the wooden ticket board on the station platform from the reference C23-echo.png, in hard afternoon sun with a sharp diagonal shadow across it: sun-faded "
    "green paint, pinned paper notices, and in the middle two small ivory railway tickets pinned side by side, both blank.", style='ch3', parent='C23-echo',
    game='SEAT 43 on both tickets', notes='The camera flies into this from the board in C23-echo, so match that board.',
    zh='站台告示板特写，两张空白车票，字由游戏写。要和 C23-echo 里的告示板一致。')

# ---------------------------------------------------------------- 4 chapter3To4
add('C34-seat', 'chapter3To4', 'Leaving Echo City at dusk: seat 43 empty',
    "Inside the night train at dusk, seen straight on: two red seats side by side under a window; Butch sits on the LEFT seat, seen side-on, looking at the RIGHT seat, "
    "which is empty, with a small blank brass number plate on its back; low burnt-orange sunlight lays long hard stripes across the seats and the floor, everything "
    "outside the stripes in deep shadow.", green=True, chars=('butch',), game='43 on the plate; the dusk country (C34-dusk) moving behind the glass; the sun stripes flicker past poles',
    zh='黄昏车厢，Butch 坐左边，右边 43 号座空着。窗玻璃纯绿。')
add('C34-dusk', 'chapter3To4', 'Out of the window: the West at dusk',
    "The country outside Echo City at dusk, seen side-on from a moving train: a low burnt-orange sun near the horizon, long hard shadows, sun-baked hills, a few dark "
    "cypresses, a white farmhouse, telegraph poles; the horizon at about 55% of the image height.", style='ch3', frame='pan',
    notes='Its pencil twin C34-dusk-pencil must match it line for line.', zh='黄昏的西部原野。')
add('C34-dusk-pencil', 'chapter3To4', 'The same country, drained to pencil',
    "Exactly the same picture as the reference C34-dusk.png, the same composition line for line, but redrawn as a soft graphite pencil line drawing on warm cream paper "
    "with no colour at all.", style='ch4', frame='pan', pair='C34-dusk',
    game='the colour drains out across the window, leaving these lines', notes='Make it with the edit tool from C34-dusk.',
    zh='同一张图改成纯铅笔线稿（用编辑模式），游戏让颜色从画面里褪掉。')
add('C34-rosa', 'chapter3To4', "Rosa's drawing",
    "Seen from straight above, a child's drawing on a sheet of cream drawing paper lying on a dark walnut table under warm lamplight, the paper filling most of the frame: "
    "drawn in wax crayon and gouache by a child of about eight — an orchard of round apple trees, a white house with a red roof and one yellow window, a big round sun, "
    "and a long red hawthorn hedge across the bottom; bright, happy and simple; an empty space in the lower right corner of the paper where a name would be signed.",
    style='ch4', game='ROSA signed in a child\'s hand in the corner', zh='罗莎的儿童画（蜡笔加水粉），右下角留空给签名。')
add('C34-rosa-grey', 'chapter3To4', "Rosa's drawing, filed",
    "Exactly the same picture as the reference C34-rosa.png, the same drawing line for line, but painted over with a flat, even grey archive wash so every colour is "
    "gone and only grey pencil and crayon marks show through; one small patch of the red hedge near the lower right still shows faintly through the grey.",
    style='ch4', pair='C34-rosa', game='the grey wash sweeps across; a red FILED stamp lands', notes='Make it with the edit tool from C34-rosa.',
    zh='同一张画被灰色档案颜料刷过（用编辑模式），只剩右下一点红。')
add('C34-arrive', 'chapter3To4', 'Into the unfinished drawing',
    "The Chapter 4 world: a pencil-drawn railway on cream paper running from the LEFT edge into an unfinished drawing of an orchard country — a few hills and apple "
    "trees half sketched, a house in outline only, and a long hedge drawn in grey pencil along a lane in the lower right; an old steam locomotive with two carriages, "
    "drawn in pencil, arrives from the left, slowing; most of the paper bare. All graphite, no colour.", style='ch4',
    game='one fleck of red gouache blooms through the grey at the hedge', zh='火车开进没画完的铅笔世界。红色由游戏在树篱上晕开。')

# ---------------------------------------------------------------- 5 chapter4To5
add('C45-wet', 'chapter4To5', 'The painted train runs into the dark',
    "Side-on: a small steam locomotive and two carriages freshly painted in bright gouache — hawthorn red, ochre, sky blue and leaf green — the paint still wet and "
    "dripping, running to the right along pencil rails on cream paper, towards a solid wall of black ink darkness that fills the right half of the picture.", style='ch4', frame='pan',
    zh='刚涂好颜色的火车（水粉未干）开向右边的一片黑。')
add('C45-ink', 'chapter4To5', 'The same train, dried into ink',
    "Exactly the same picture as the reference C45-wet.png, line for line, but the train's paint has dried into dark brown-black ink with thin brass-coloured lines like "
    "an engraving, and the cream paper around it has darkened to walnut brown.", style='ch1', frame='pan', pair='C45-wet', notes='Make it with the edit tool from C45-wet.',
    game='the wet colour dries into ink from front to back as the camera follows', zh='同一张图，颜色干成墨（用编辑模式）。')
add('C45-hall', 'chapter4To5', 'The walnut hall',
    "A vast dark museum hall of walnut panelling, seen straight on like a theatre set: tall brass double doors at the back centre, a parquet floor with iron rails set into "
    "it running from the LEFT edge to the doors, and the night train (dark carriages, one warm lamp at the front) standing on the rails at the left, a little smoke "
    "hanging under the ceiling; small warm lamps on brass brackets along the walls; cream plaster high above lost in darkness.", style='ch5',
    game='the train lamp, the smoke drifting, the camera moving slowly in', zh='胡桃木大厅，火车停在里面。')
add('C45-cases', 'chapter4To5', 'Four display cases, dark',
    "A row of four glass display cases on walnut stands down a dark museum gallery (the same museum as C45-hall.png), seen side-on, evenly spaced across the picture, each "
    "case dark, its glass catching only faint light, a small blank brass label plate on each stand; parquet floor; deep shadow.", style='ch5', parent='C45-hall',
    zh='四个陈列柜，暗着。')
add('C45-cases-lit', 'chapter4To5', 'Four display cases, lit, holding his journey',
    "Exactly the same picture as the reference C45-cases.png, unchanged, except every case is now lit warmly from inside, and each holds one object: case 1 (left) a small "
    "punched railway ticket stub; case 2 a folded handwritten letter; case 3 two small railway tickets side by side; case 4 (right) a child's crayon drawing of an orchard "
    "with a red hedge.", style='ch5', pair='C45-cases', notes='Make it with the edit tool from C45-cases.',
    game='the cases light one at a time with a punch sound each', zh='同一张图，四个柜子亮起来，里面是这一路的东西（用编辑模式）。游戏一个一个点亮。')
add('C45-card', 'chapter4To5', 'Close-up: the accession card',
    "Close-up inside the fourth lit glass case from the reference C45-cases-lit.png: a typed museum accession card standing in a small brass holder — an ivory card with a "
    "printed border, blank — beside the corner of the child's crayon drawing; warm light from above, the edge of the glass catching a thin line of light.", style='ch5', parent='C45-cases-lit',
    game='ACC. 1978-0412 · VELEZ, M. · PENDING typed onto the card', zh='第四个柜子里的登记卡特写，卡片空白，字由游戏打出来。')
add('C45-archivist', 'chapter4To5', 'The Archivist',
    "A dark archive desk at the far end of the museum: a brass desk lamp with a green shade lights an open ledger and a stack of index cards; behind it a tall figure "
    "stands in deep shadow, only the outline of shoulders and a high collar visible, the face entirely lost in darkness; the wall behind is all small card drawers with "
    "brass handles.", style='ch5', notes='Never a face.', zh='档案员：灯后的一个黑影，看不到脸。')

# ---------------------------------------------------------------- 6 chapter5-to-conductor
add('C5C-gallery', 'chapter5-to-conductor', 'The gallery, lamps lit',
    "A long museum gallery seen straight down its length in one-point perspective: walnut walls hung with dark picture frames, a row of six brass lamps hanging down the "
    "middle, all lit, receding to a far dark doorway; the parquet floor has two long brass inlay lines running straight to the vanishing point; Butch stands small in the "
    "middle distance, his back to us, holding up his lantern.", style='ch5', chars=('butch',), zh='长廊，六盏灯亮着，地板上两道铜线。')
add('C5C-rails', 'chapter5-to-conductor', 'The gallery, lamps out, inlay become rails',
    "Exactly the same picture as the reference C5C-gallery.png, unchanged, except every hanging lamp is dark, the only light is Butch's lantern, and the two brass inlay "
    "lines in the floor are now real iron railway rails on wooden sleepers, running to the far doorway.", style='ch5', chars=('butch',), pair='C5C-gallery',
    notes='Make it with the edit tool from C5C-gallery.', game='the lamps go out one at a time; the rails surface', zh='同一张图，灯全灭，铜线变成铁轨（用编辑模式）。游戏一盏一盏关灯。')
add('C5C-conductor', 'chapter5-to-conductor', 'The Conductor at the far end',
    "Straight down the length of a dark railway carriage: at the far end the Conductor stands in a single pool of lamplight from above, facing us, holding out a ticket "
    "punch in his right hand; the carriage walls on both sides are lined with small framed windows, each showing a different dim lit world — a lost-property office, "
    "a rainy rooftop city, a sunny stone square, a pencil-drawn orchard; the near floor in darkness.", chars=('conductor',),
    zh='车厢尽头的列车长，两侧小窗里是四个世界。')
add('C5C-face', 'chapter5-to-conductor', 'Close-up: the Conductor',
    "Close-up of the Conductor's face and shoulders, front view, lit from below by a lantern: the cap with its brass badge, deep shadow over the eyes with two small "
    "lamp-lit glints, grey moustache and beard, the heavy dark uniform collar and watch chain; he raises the ticket punch beside his face; the background black.",
    chars=('conductor',), parent='C5C-conductor', zh='列车长特写。')
add('C5C-raise', 'chapter5-to-conductor', 'Butch raises his lamp',
    "The same carriage as the reference C5C-conductor.png, seen from just behind Butch: Butch in the near foreground on the LEFT, seen from behind (cap, turned-up "
    "greatcoat collar), raising his lantern high; far down the carriage the Conductor stands small in his pool of light.", chars=('butch', 'conductor'), parent='C5C-conductor',
    zh='从 Butch 背后看：他举灯，远处是列车长。')

# ---------------------------------------------------------------- 7 chapter5-to-black-knife
add('CBK-palm', 'chapter5-to-black-knife', 'Five stones in his palm',
    "Close-up of an open right hand, palm up, held out in the dark; in the palm five small stones glowing softly from inside: an ember-red one, a sage-green one with fine "
    "lines like a grid, a pale sky-blue translucent one, an ochre-gold one flecked with spots of paint colour, and a black one shaped like the torn corner of a ticket with "
    "a violet glint on its edge; their glow lights the fingers; everything else black.", chars=('hands',),
    game='each stone glows in turn with a soft bell', zh='掌心五颗石头：红、带网格的灰绿、浅蓝、带颜料点的金、像车票一角的黑石。')
add('CBK-door', 'chapter5-to-black-knife', 'LAST CARRIAGE: the door',
    "The far end of a dark walnut museum gallery: set into the end wall, an old railway carriage door that does not belong there — dark oxblood lacquer, a small window "
    "with a faint cold light behind it, a polished brass name plate on the door (blank) and a brass handle; Butch stands before it, small, on the LEFT, seen from behind "
    "with his lantern; parquet floor.", style='ch5', chars=('butch',), game='LAST CARRIAGE on the brass plate', zh='走廊尽头一扇不该在这里的车厢门，铜牌空白。')
add('CBK-door-open', 'chapter5-to-black-knife', 'He steps in',
    "Exactly the same picture as the reference CBK-door.png, unchanged, except the door stands open onto darkness and Butch, seen from behind, is stepping through it, "
    "his lantern going in first.", style='ch5', chars=('butch',), pair='CBK-door', notes='Make it with the edit tool from CBK-door.', zh='同一张图，门开了，Butch 走进去（用编辑模式）。')
add('CBK-door-shut', 'chapter5-to-black-knife', 'The door closes',
    "Exactly the same picture as the reference CBK-door.png, unchanged, except Butch is gone and the door is shut, its little window dark.", style='ch5', pair='CBK-door',
    notes='Make it with the edit tool from CBK-door.', zh='同一张图，人不见了，门关上，小窗黑了（用编辑模式）。')
add('CBK-seat', 'chapter5-to-black-knife', 'Inside: one seat',
    "Inside an empty, dark railway carriage: one single red seat in the centre lit from directly above by a thin cold light, nothing else; the walls and windows dark; the "
    "air above the seat empty.", game='a black ticket floats above the seat (CBK-ticket)', zh='车厢里只有一个座位，上方留空，游戏放漂浮的黑车票。')
add('CBK-ticket', 'chapter5-to-black-knife', 'The black ticket (cut-out)',
    "One black railway ticket, never punched, with a thin worn gold border and rounded corners, blank, seen straight on.", style='sheet', frame='sheet',
    game='cut out and floated above the seat', zh='一张黑车票，灰底，游戏抠出来。')

# ---------------------------------------------------------------- 8 ending
add('END-walk-a', 'ending', 'The length of the train (left half)',
    "Inside the night train, a long carriage interior seen side-on like a theatre set: a row of windows on the far wall with the night outside, red seats, two hanging "
    "lamps, a corridor floor running straight from the LEFT edge to the RIGHT edge at about 74% of the image height; at the right a connecting door standing open into "
    "the next carriage.", frame='pan', game='Butch walks the corridor (walk sprite), the lamps sway', zh='长车厢侧视（左半），地板线 74%。')
add('END-walk-b', 'ending', 'The length of the train (right half)',
    "Continue the reference END-walk-a.png beyond its right edge: through the open connecting door into the next carriage, the same floor line at 74% of the image height, "
    "the same wall, windows and seats, two more hanging lamps, a second connecting door at the right edge.", frame='pan',
    continues={'from': 'END-walk-a', 'edge': 'the left edge continues the right edge of END-walk-a'}, zh='接 END-walk-a 的右边继续（右半）。')
add('END-mara', 'ending', 'One carriage ahead: the empty seat beside her',
    "Inside a quiet night-train carriage, seen from just behind a row of two seats: a woman sits by the window on the RIGHT seat, seen from behind; the LEFT seat beside "
    "her is empty; the black window in front of her shows only a soft blur of lamplight in its reflection, no face; one lamp above.", chars=('mara',),
    zh='Mara 坐在右边靠窗，背对我们；左边的座位空着；窗里的倒影只是一团灯光，没有脸。')
add('END-beside', 'ending', 'He sits down beside her',
    "Exactly the same picture as the reference END-mara.png, unchanged, except Butch now sits in the empty LEFT seat beside her, seen from behind (cap, turned-up collar), "
    "his lantern on the floor by his boots; in the black window their reflections are only soft blurs of lamplight, no faces.", chars=('butch', 'mara'), pair='END-mara',
    notes='Make it with the edit tool from END-mara.', game='two lamps pass outside and sweep light across them', zh='同一张图，Butch 坐到她旁边（用编辑模式）。')

# ---------------------------------------------------------------- the storyboard (captions verbatim)
REUSED = {'A0-office': 'ch1/A0-office.png (Butch asleep)', 'A0-office-awake': 'ch1/A0-office-awake.png', 'C-train': 'ch1/C-train.png (lit carriage)',
          'C-butch-poses': 'ch1/C-butch-poses.png (walk)', 'C-mara': 'ch1/C-mara.png (turning away)', 'panels': 'Chapter 1 bezels around plates from the other cutscenes'}
B = []
def cs(id, length, music, shots): B.append({'id': id, 'length': length, 'music': music, 'shots': shots})
def shot(id, s, plates, motion, join, captions=(), sound=''):
    return {'id': id, 'seconds': s, 'plates': plates, 'motion': motion, 'join': join, 'captions': list(captions), 'sound': sound}

cs('opening', '≈36 s', '1.1 Train Undertow', [
  shot('viaduct', 8.5, ['OP-viaduct', 'C-train'], 'the lit train crosses; the camera follows it and closes on one lit window', 'into the window: the window opens into the office',
       ["The night service runs between stored places.\nThe archive calls it the last line."], 'rail, rain'),
  shot('lost-property', 7, ['A0-office-awake'], 'down the shelves of tagged things to the desk; the lamp sways with the carriage', 'fly into the case on the top shelf',
       ["Everything left on board comes here, to Lost Property."], 'rain'),
  shot('orchard-case', 5.5, ['OP-case'], 'slow push onto the tag; the claim number is on it', 'tilt down to his hands', [], 'paper'),
  shot('the-tag', 8, ['OP-tag-front', 'OP-tag-back'], 'he turns the tag over: M. VELEZ · BELLWETHER', 'pull back out to the desk',
       ["The clerk, Butch, had filed it a hundred times.\nHe could not leave it alone."], 'paper'),
  shot('asleep', 7.5, ['A0-office-awake', 'A0-office'], 'his head drops onto his arms; the lamp burns low; the carriage rocks', 'to black, into Act 0',
       ["The line keeps running while someone rides it."], 'rail; music out'),
])
cs('chapter1To2', '≈34 s', '1.2 Train Resonance', [
  shot('pulls-away', 9, ['C12-rack', 'C12-halt-out'], 'Bellwether slides away behind the glass; the case stays on the rack', 'down to the ticket in his hand',
       ["The orchard case stayed on the rack.\nHer other ticket did not."], 'rail, rain, whistle'),
  shot('city-ticket', 6.5, ['C12-ticket'], 'CITY LINE · ONE WAY · 1978; a small tremor of the train', 'pull back to the window', [], 'paper'),
  shot('city-ahead', 9.5, ['C12-window', 'C12-fields', 'C12-city'], 'fields scroll into the city; its five signs light one after another like a bell', 'through the glass into the city',
       ["The city ahead ran on light\nit had borrowed from the train."], 'rain, five soft bells'),
  shot('city-terminal', 9.5, ['C12-terminal', 'C-butch-poses', 'C-mara'], 'CITY TERMINAL lights; Butch steps down; on the far roof a rose scarf turns away and is gone', 'end',
       ["One roof ahead.\nAlways one roof ahead."], 'brake, rain'),
])
cs('chapter2To3', '≈37 s', '3.1 Satie, Gnossienne no. 1', [
  shot('just-made-it', 7, ['C23-door'], 'the train pulls out; the coat corner flaps; the platform lamp slides away', 'through the door window into the carriage', [], 'rain, thud, whistle'),
  shot('the-letter', 7.8, ['C23-letter'], 'the letter is legible: "Butch — … KEEP MOVING. — M."; the lantern flickers', 'up to the window',
       ["The letter was a day old.\nIt read as if she had written it a minute ago."], 'paper'),
  shot('filed-records', 6.4, ['C12-window', 'C23-records'], 'drawers and pages stream past; light grows at the end of the tunnel', 'white-out into the sun', [], 'rail, paper'),
  shot('echo-city', 8.4, ['C23-echo'], 'hard sun, dust; the clock reads 14:20; drift right to the ticket board', 'fly into the board',
       ["Echo City keeps the afternoon\nits people remember."], 'brake, soft bell'),
  shot('seat-43', 7.6, ['C23-board'], 'SEAT 43 on both tickets', 'end', ["Today it was keeping two tickets\nfor seat forty-three."], 'paper'),
])
cs('chapter3To4', '≈37 s', '3.6 Chopin, Prelude op. 28 no. 4', [
  shot('seat-43', 7.4, ['C34-seat', 'C34-dusk'], 'dusk country slides by; sun stripes flicker over the empty seat 43', 'into the window', [], 'rail, whistle'),
  shot('colour-drains', 7.2, ['C34-dusk', 'C34-dusk-pencil'], 'the colour drains out of the country, leaving pencil lines', 'the paper becomes a sheet on a table', [], 'rail'),
  shot('rosas-drawing', 6.6, ['C34-rosa'], 'ROSA signed in the corner', 'hold', ["Rosa Velez drew the orchard every summer."], 'paper'),
  shot('filed', 7.6, ['C34-rosa', 'C34-rosa-grey'], 'a grey wash sweeps across; FILED stamps down', 'into the grey',
       ["The archive kept her drawings, and painted the colour out.\nColour is hard to file."], 'paper, thud'),
  shot('still-red', 8.6, ['C34-arrive'], 'the train slows into the drawing; one fleck of red blooms at the hedge', 'end', ["Under the grey, a hawthorn was still red."], 'brake, soft bell'),
])
cs('chapter4To5', '≈38 s', '3.5 Beethoven, Moonlight Sonata, mvt 1', [
  shot('dries-to-ink', 7.6, ['C45-wet', 'C45-ink'], 'following the train into the dark, the wet colour dries into ink', 'ink wipe', [], 'rail'),
  shot('walnut-hall', 7.2, ['C45-hall'], 'slow move in; the train stops; smoke hangs', 'slide', [], 'brake'),
  shot('cases-light', 8.8, ['C45-cases', 'C45-cases-lit'], 'the four cases light one at a time', 'fly into the fourth case',
       ["The archive had filed his journey already."], 'four punches'),
  shot('pending', 6.8, ['C45-card'], 'ACC. 1978-0412 · VELEZ, M. · PENDING types itself', 'slide', ["One object was still pending."], 'soft bell'),
  shot('one-answer', 7.6, ['C45-archivist'], 'the lamp flickers; the shadow does not move', 'end', [("THE ARCHIVIST", "The museum will need one clean answer.")], 'paper'),
])
cs('chapter5-to-conductor', '≈37 s', '1.2 Train Resonance', [
  shot('lamps-out', 7.6, ['C5C-gallery', 'C5C-rails'], 'the six lamps go out one by one; the inlay surfaces as rails', 'ink', [], 'five punches, rail'),
  shot('worlds-stack', 7.4, ['panels'], 'the worlds slide in around Butch as Chapter 1 windows: the office, the rooftops, the square, the painted country', 'fade', [], 'paper ×4'),
  shot('the-conductor', 6.6, ['C5C-conductor'], 'slow push down the carriage', 'fly into his face', [("THE CONDUCTOR", "Tickets, please.")], 'punch'),
  shot('close', 8.4, ['C5C-face'], 'the punch rises', 'cut', [("THE CONDUCTOR", "The line runs while someone rides it."), ("THE CONDUCTOR", "You are the someone.")], 'soft bell'),
  shot('raises-lamp', 5.4, ['C5C-raise'], 'Butch lifts his lantern; it flares', 'to black, into Movement I', [], 'whistle'),
])
cs('chapter5-to-black-knife', '≈35 s', '1.1 Train Undertow', [
  shot('five-stones', 8.6, ['CBK-palm'], 'each stone glows in turn', 'ink', ["Five things the archive could not file."], 'four soft bells, a bell'),
  shot('last-carriage', 8, ['CBK-door'], 'LAST CARRIAGE on the plate; the little window flickers; move in', 'through the window', [], 'rail'),
  shot('one-seat', 8.4, ['CBK-seat', 'CBK-ticket'], 'the black ticket floats above the seat, turning slowly', 'back out to the door', ["A ticket that is never punched…"], 'paper'),
  shot('door-closes', 7.6, ['CBK-door-open', 'CBK-door-shut'], 'he steps in; the door shuts', 'to black, into the fight', ["…never ends its journey."], 'thud; music out'),
])
cs('ending', '≈47 s', '6.5 Night Train Departure', [
  shot('worlds-fold', 8.6, ['panels', 'END-walk-a'], 'the stacked worlds fold back, window by window, into one carriage', 'slide', ["The Conductor did not stop the train. Nobody could."], 'rail, paper ×4'),
  shot('the-walk', 9, ['END-walk-a', 'END-walk-b', 'C-butch-poses'], 'Butch walks the length of the train, lamp in hand; the camera walks with him', 'through the far door', [], 'rail'),
  shot('next-carriage', 8, ['END-mara'], 'slow push on the empty seat', 'hold', ["One carriage ahead, the seat beside her was empty at last."], 'rail'),
  shot('beside-her', 11, ['END-mara', 'END-beside'], 'he sits down beside her; two lamps pass outside and sweep light across them', 'slide', ["He did not look for her reflection."], 'thud, rain'),
  shot('viaduct', 10, ['OP-viaduct', 'C-train'], 'the night service crosses the viaduct from the opening and runs on into the dark', 'end, then the STATUS: OPEN card',
       ["The night service kept running."], 'rain, rail'),
])

def cap_text(c):
    return c[1] if isinstance(c, tuple) else c
def cap_json(c):
    return {'speaker': c[0], 'text': c[1]} if isinstance(c, tuple) else {'text': c}
for b in B:
    for s in b['shots']:
        s['captions'] = [cap_json(c) for c in s['captions']]

spec = {
  'project': 'NIGHTFALL', 'phase': 'cutscenes (round 9)', 'output_folder': 'NIGHTFALL art/cutscenes/', 'size': '1536x1024 landscape for every item',
  'style_by_destination': {
    'ch1': 'inside the night service, the opening, the finale and the ending: ST1-a', 'ch2': 'the rain city (Chapter 2): ST3-b',
    'ch3': "Echo City (Chapter 3), Leone's West: ST4-b", 'ch4': 'the painted country (Chapter 4): pencil on cream paper with gouache, refs/ref-ch4-*.jpg',
    'ch5': 'the museum (Chapter 5): ST1-a ink, walnut and brass, refs/ref-ch5-museum.jpg', 'sheet': 'a cut-out object on grey'},
  'rules': [
    'Generate the items in the order listed: a parent (zoom source), a pair source or a "continues" source always comes before the item that refers to it.',
    'Pass every file in reference_images to the image tool (style-tests/ for ST*.png, ch1/ for A0-*/C-*, cutscenes/refs/ for refs/*, cutscenes/ for the rest).',
    'Items with "pair_of" are the same picture with one change: make them with the image tool\'s edit mode from the pair_of image, so everything else stays put.',
    'Items with "chroma_window": the window glass must be flat pure green #00FF00, nothing else green in the picture.',
    'Name each output exactly as "file". If you make several variants, add -a, -b, -c before .png.',
    'People only where the prompt says so. No text anywhere: the game writes every word (tags, tickets, signs, the letter, the card, the plate, ROSA, FILED).',
    'Record each generation (file, prompt, source) in cutscenes/generation-prompts.json as before.'],
  'reused_from_ch1': REUSED,
  'storyboard': B,
  'items': items}
open(f'{OUT}/cutscenes-batch.json', 'w').write(json.dumps(spec, ensure_ascii=False, indent=2))

# ---------------------------------------------------------------- readable version
ZH_NAME = {'opening': '1 · 开场（标题 → 第一章）', 'chapter1To2': '2 · 第一章 → 第二章', 'chapter2To3': '3 · 第二章 → 第三章', 'chapter3To4': '4 · 第三章 → 第四章',
           'chapter4To5': '5 · 第四章 → 第五章', 'chapter5-to-conductor': '6 · 第五章 → 终章（列车长）', 'chapter5-to-black-knife': '7 · 第五章 → 黑车票（五颗石头）',
           'ending': '8 · 普通结局'}
STYLE_ZH = {'ch1': '夜车（ST1-a）', 'ch2': '雨城（ST3-b）', 'ch3': '回声城·莱昂内西部（ST4-b）', 'ch4': '铅笔加水粉（第四章截图）', 'ch5': '博物馆（ST1-a 墨线）', 'sheet': '灰底单件'}
md = ['# NIGHTFALL 过场动画出图批次（给 Codex / ChatGPT）', '',
      '8 段过场全部重做成手绘画面。画风跟着目的地章节走：车上和开场、终章、结局用夜车画风 ST1-a；第二章雨城用 ST3-b；第三章回声城用 ST4-b（莱昂内西部）；'
      '第四章用铅笔加水粉（参考 `refs/` 里的第四章截图）；第五章博物馆用 ST1-a 的墨线画胡桃木和黄铜。字幕原文不变，镜头重新编排成从一幅画推进到下一幅画。',
      '', f'共 {len(items)} 张新图，全部 1536×1024 横版，放进 `NIGHTFALL art/cutscenes/`。另外复用第一章已有的 A0-office、A0-office-awake、C-train、Butch 走路帧和 Mara 帧。'
      '机器可读版是同目录的 `cutscenes-batch.json`。', '', '**规则**', '']
md += [f'- {r}' for r in spec['rules']]
md += ['', '**几种特殊图**', '',
       '- **配对图**（标「用编辑模式」）：和前一张是同一张画，只改一处，比如翻过来的标签、褪成铅笔的风景、点亮的柜子。一定要在原图上用编辑模式改，别的地方不能动，游戏要在两张之间做过渡。',
       '- **绿窗**：车窗玻璃涂成纯绿 #00FF00，游戏把绿色抠掉，在后面放会动的窗外景。',
       '- **放大目标**（标「父图」）：游戏会从父图里的某个东西直接推进到这张特写，所以特写里的东西要和父图里的长得一样。',
       '- **字**：画里一个字都不要有。标签、车票、招牌、信、登记卡、铜牌、ROSA 签名、FILED 印章，全部由游戏写上去。', '']
md += ['## 分镜', '']
for b in B:
    md += [f'### {ZH_NAME[b["id"]]}（`{b["id"]}`，{b["length"]}，音乐 {b["music"]}）', '', '| 镜头 | 秒 | 画 | 画面里发生什么 | 接下一镜 | 字幕 |', '|---|---|---|---|---|---|']
    for s in b['shots']:
        caps = ' / '.join((f"{c['speaker']}: " if c.get('speaker') else '') + c['text'].replace('\n', ' ') for c in s['captions'])
        md.append(f"| {s['id']} | {s['seconds']} | {', '.join(s['plates'])} | {s['motion']} | {s['join']} | {caps} |")
    md.append('')
md += ['## 出图清单', '']
cur = None
for it in items:
    if it['cutscene'] != cur:
        cur = it['cutscene']; md += [f'### {ZH_NAME[cur]}', '']
    md += [f"#### {it['id']} · {it['title']}", '',
           f"- 文件：`{it['file']}`　画风：{STYLE_ZH[it['style']]}　参考图：{', '.join('`'+r+'`' for r in it['reference_images'])}"]
    if it['pair_of']: md.append(f"- 配对图：用编辑模式从 `{it['pair_of']}.png` 改")
    if it['parent']: md.append(f"- 父图：`{it['parent']}.png`（游戏从那里推进到这张）")
    if it['continues']: md.append(f"- 接续：{it['continues']['edge']}")
    if it['chroma_window']: md.append('- 绿窗：窗玻璃纯绿 #00FF00')
    if it['zh']: md.append(f"- 说明：{it['zh']}")
    if it['game_adds']: md.append(f"- 游戏加：{it['game_adds']}")
    md += ['', '```text', it['prompt'], '```', '']
open(f'{OUT}/cutscenes-batch.md', 'w').write('\n'.join(md))
print(len(items), 'items;', sum(len(b['shots']) for b in B), 'shots')
