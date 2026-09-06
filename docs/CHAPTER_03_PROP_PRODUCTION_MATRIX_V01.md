# CHAPTER 03 · 34-PROP PRODUCTION MATRIX V01

Status: **ART SOURCE LOCKED**

Narrative authority: `CHAPTER_03_MOVE_AS_ONE_NARRATIVE_LOCK.md`

Core reference directory: `docs/visual-references/chapter03-props-v01/`

This is the single handoff list for Chapter 3 prop production. The goal is not
to give every object equal detail. Narrative objects receive a distinct
silhouette and authored wear; ordinary street clutter comes from verified CC0
sources or tiny local geometry.

## Shared Hunyuan rules

- Upload exactly one reference image per generation. Never upload the contact
  sheet and never request the whole plaza.
- Preserve the large silhouette, movable parts and material boundaries. Remove
  tiny generated ornament that is invisible from the fixed camera.
- Return the original GLB with separate movable parts. Do not decimate before
  delivery; Codex will make the runtime derivative.
- Real metre scale, Y-up, origin at ground contact, transforms applied, no
  camera, light, floor, animation or background mesh.
- Embedded PBR materials; 1K maximum for hero props and 512px for clutter.
- Paper and cards remain textured planes. They must not become dense GLBs.

## A. Fourteen core interactions — all references complete

| # | Object | Reference | Runtime target | Production note |
|---:|---|---|---:|---|
| C01 | Queue-ticket dispenser | `P01_queue_ticket_dispenser_ref_v01.png` | 2.5–4K tris | custom GLB; handle and ticket separate |
| C02 | Duplicate number 43 tickets | `C02_duplicate_43_tickets_ref_v01.png` | 2–12 tris each | local planes; author final “43” texture exactly |
| C03 | Produce scale | `P02_produce_scale_ref_v01.png` | 3–5K tris | custom GLB; needle rotates |
| C04 | Porter handcart | `P03_porter_handcart_ref_v01.png` | 4–6K tris | custom GLB; wheels and handle separate |
| C05 | Receipt roll and spike | `P05_receipt_spike_ref_v01.png` | 1.5–3K tris | custom GLB; paper strip separate |
| C06 | Clerk stamping machine | `P07_clerk_stamp_kit_ref_v01.png` | 2.5–4K tris | custom GLB; lever, stamp head and ink pad separate |
| C07 | Temporary movement form | `P14_temporary_movement_form_ref_v01.png` | 2–24 tris | local plane; runtime text authored separately |
| C08 | Queue stanchion gate | `P06_queue_stanchion_ref_v01.png` | 1.5–3K tris | custom reusable kit; belt and gate pivot separate |
| C09 | Crosswalk button and signal | `P09_crosswalk_signal_ref_v01.png` | 2.5–4K tris | custom GLB; button and lenses separate |
| C10 | Scanner return curb plate | `P13_scanner_return_plate_ref_v01.png` | 300–700 tris | local mesh or Hunyuan; must stay a floor plate |
| C11 | Fountain bench | `P10_fountain_bench_ref_v01.png` | 3–5K tris | custom GLB; loose seat slat separate |
| C12 | Public-address speaker | `P11_pa_speaker_ref_v01.png` | 1.5–3K tris | custom GLB; bracket pivot and junction box separate |
| C13 | Cancelled transit pass | `C13_cancelled_transit_pass_ref_v01.png` | 2–12 tris | local card plane; cancellation mark authored exactly |
| C14 | Night-train ticket reader | `P12_night_ticket_reader_ref_v01.png` | 2.5–4K tris | custom GLB; ticket clamp and front door separate |

The reference images define silhouette and surface language. Exact written
English, the number 43 and UI-readable stamps are authored in-engine after the
model is returned; generated pseudo-text is reference texture only.

## B. Nine supporting interactions — prompt only

These objects need Chapter 3-specific states or story wear, but do not justify
another concept-image pass. Generate each separately with the shared rules.

### O01 · Newspaper rack

> 单独生成一个1970年代欧洲市政广场的金属报纸架，腰部高度，窄长矩形箱体，前方有可掀起的玻璃门，内部三叠报纸清楚分层，顶部不是广告灯箱。深蓝灰搪瓷、黄铜门轴、雨痕、边缘掉漆和手指污迹。门、玻璃、三叠报纸分别独立；报纸只保留无意义版式，不生成可读标题。三分之四正视角，中性浅灰背景，无街景、无人、无品牌、无水印。

Target: 1.5–2.5K tris. Runtime headline is a separate decal.

### O02 · Public telephone

> 单独生成一个旧欧洲街头公共电话，壁挂式厚重深绿色搪瓷机身，黑色电木听筒，卷曲布包电话线，圆形机械拨号盘，小型硬币退币槽和黄铜挂钩。听筒、挂钩、拨号盘、退币盖独立；结构真实可用，磨损集中在手握和投币位置。三分之四正视角，中性浅灰背景，无电话亭、无墙、无人物、无文字、无品牌、无水印。

Target: 2–3.5K tris.

### O04 · Bench thermos and two cups

> 单独生成一套旧市政工人使用的保温壶道具：一个高约28厘米的暗酒红色金属保温壶，奶油色搪瓷肩部，深色软木塞盖，以及两个不完全相同的小搪瓷杯。一个杯沿有缺口，另一个内部仍有浅色茶渍。壶盖、软木塞和两个杯子完全分离，表面写实磨损但无花纹和品牌。中性浅灰背景，三分之四视角，无长椅、无人、无其他食物、无文字、无水印。

Target: 1–2K tris for the complete kit.

### O06 · Market awning crank

> 单独生成一个老式市场遮阳篷的手摇机构套件：壁挂铸铁齿轮箱、可折叠深色木柄黄铜摇杆、短卷轴、两段机械连杆和一小块褪色暗红帆布边缘。结构必须清楚表现摇杆带动卷轴，摇杆、卷轴、连杆分别独立，能够制作打开、半开、关闭三种状态。掉漆、油脂和雨痕真实。中性浅灰背景，无完整摊位、无墙、无人、无文字、无水印。

Target: 1.5–2.5K tris plus simple cloth plane.

### O10 · Pigeon-feed tin

> 单独生成一个可手持的旧鸽食铁皮罐，高约18厘米，椭圆圆筒形，褪色青绿色印铁皮，顶部为可旋开的浅口盖，侧面有折叠金属提环，底部边缘凹陷。盖子、提环和少量分离谷粒独立，磨损写实但不要品牌、图案或可读文字。中性浅灰背景，三分之四近景，无鸽子、无人、无场景、无水印。

Target: 500–900 tris; grain uses particles, not modeled piles.

### O11 · Street-cleaner cart

> 单独生成一辆旧欧洲市政街道清洁手推车，窄双轮钢管车架，褪色蓝灰色水桶、斜放的硬毛扫帚、卷起的灰布、机械夹具和一个浅水盘。车高约1.05米，轮子、扫帚、水桶、布卷和夹具分别独立，结构真实可推行。边缘掉漆、湿水痕、扫帚毛磨损明显。中性浅灰背景，三分之四正视角，无清洁工、无街道、无文字、无品牌、无水印。

Target: 3–4.5K tris. A verified CC0 broom may replace the generated broom.

### O12 · Clock-maintenance toolbox

> 单独生成一个老式市政钟表维修工具箱，深蓝灰色薄钢板箱体，黄铜提手和两只扣锁，箱盖打开约110度。内部有分隔木槽、三根不同长度的备用钟针、小扳手、螺丝刀和空的工单夹；所有工具排列克制，不要堆满。箱盖、扣锁、三根钟针和主要工具独立。表面有油迹、磕碰和粉笔编号痕迹但无可读文字。中性浅灰背景，无钟楼、无人、无品牌、无水印。

Target: 2.5–4K tris. Poly Haven tool-chest geometry is an alternative base only.

### O14 · Protest flyer variants

> 生成一张严格正交俯视的抗议传单纹理参考图，浅灰背景上分开放置三张同版传单：一张完整、一张对折、一张被撕去一角并沾有水果汁。纸张为廉价灰白纸，粗糙黑色油墨，大型中央留白区和暗红边框，版式有地下印刷的错位感。不要生成真实组织、标志或长段可读文字；最终口号由Codex后期准确排版。无手、无桌面、无透视、无阴影、无水印。

Runtime: textured planes only, 2–12 tris each.

### O18 · Umbrella stand and stitched umbrella

> 单独生成一个旧公共建筑入口的铸铁雨伞架，圆筒形镂空框架，底部可拆水盘，内部四把不同旧伞。三把湿润深色，一把干燥的暗青色布伞在伞缘有一条明显但克制的浅青色修补缝线。雨伞、底盘和架体全部分离，伞可单独取出，结构真实，磨损集中在把手和底盘。中性浅灰背景，三分之四正视角，无门厅、无人、无文字、无水印。

Target: 3–4.5K tris for stand plus four closed umbrellas.

## C. Eleven lowest-cost objects — reuse, download or build locally

Do not spend Hunyuan credits on these. Recolor and roughen reused models so
they share the plaza palette; source geometry does not dictate final material.

| Object | Source decision | Exact treatment |
|---|---|---|
| O03 Child's wool glove | download a CC0 glove or use a retopologized 150–300-tri cloth mesh | flatten pose; damp fingertip roughness mask; no fingers need interior geometry |
| O05 Cigarette tray | download/reuse a plain CC0 metal dish | six butts are tiny crossed cards; one 512px material |
| O07 Flower bucket | reuse Quaternius nature flowers; model bucket as a 16-sided local cylinder | separate water plane; 500–900 tris total |
| O08 Bottle crate | reuse the existing Quaternius crate and bottles from Kenney Food Kit | replace medieval surface with market wood; 1–1.8K tris total |
| O09 Hopscotch chalk lines | no GLB download | one transparent ground decal; scanner paint is a second decal layer |
| O13 Municipal plaque | no GLB download | beveled plane, four bolt heads, authored text texture; 80–160 tris |
| O15 Fountain coins | no GLB download | instanced 12-sided cylinders; three hero coins, rest baked cluster |
| O16 Dog bowl | reuse a simple bowl from a CC0 food/household pack | remove decorative detail; add local inventory-number decal |
| O17 Tram route map | no GLB download | local frame plus paper plane; cyan night-train drawing is a decal layer |
| O19 Cleaning notice cone | existing Kenney CC0 `construction-cone.glb` | recolor to dirty cream/red; old paired footprints live under it as decal |
| O20 Drain grate and cyan thread | existing Quaternius CC0 `Prop_Drain.gltf`; thread is local curve | recolor grate; thread ≤24 segments; one removable screw |

## Verified CC0 source shortlist

- Existing local source: `NIGHTFALL_Source_Assets/04_CH02_CITY/kenney_city-kit-roads/Models/GLB format/construction-cone.glb`
- Existing local source: `NIGHTFALL_Source_Assets/05_CH03_CITY/Downtown_City_MegaKit_Standard/Exports/glTF (Godot)/Prop_Drain.gltf`
- Existing local source: `NIGHTFALL_Source_Assets/07_CH05_MUSEUM/Medieval_Village_Pack/Props/Blends/Crate.blend`
- Existing local source: Quaternius Ultimate Stylized Nature flowers.
- Downloaded and license-verified CC0 source: Kenney Food Kit for apples,
  bottles, cups and bowl geometry; selected GLBs are already extracted under
  `NIGHTFALL_Source_Assets/05_CH03_CITY/CC0_PROP_PACKS/kenney_food-kit_selected/`.
- Online CC0 candidate: Poly Haven Plastic Broom for the cleaner-cart broom.
- Online CC0 candidate: Poly Haven Metal Tool Chest only as a geometry donor if
  the prompt-generated clock toolbox is poor; its high-resolution source must be
  retopologized and textures reduced before runtime use.

Every downloaded asset must be copied into `NIGHTFALL_Source_Assets`, recorded
in the external asset manifest with source URL and license, then converted into
a small runtime derivative. Source masters never go directly into the web build.

## Acceptance rule

The prop pass is complete only when a first-time player can distinguish the
three functional territories at a glance:

1. market objects teach **carry → wait → return**;
2. transit objects enforce **queue → signal → scanner**;
3. fountain objects reveal **Mara's waiting and the duplicate-person problem**.

If an object does not support one of those readings, it stays background clutter
and must not receive hero contrast, animation or a large texture budget.
