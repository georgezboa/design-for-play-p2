# Chapter 3 — Hunyuan 3D Asset Brief

## Art direction

The current generic low-poly scene is only a gameplay blockout. The replacement environment uses an original painterly, post-industrial coastal civic language: sun-bleached ochre plaster, oxidized teal metal, faded vermilion cloth, aged brass, warm limestone, chipped enamel, and restrained hand-painted wear. The goal is emotional, illustrated 3D—not photorealism and not a copy of any existing game or artist.

Use each supplied image as a separate image-to-3D input. Do not combine several reference images into one generation.

## Shared Hunyuan instructions

Append this block to every asset prompt:

```text
游戏用独立3D资产，保持参考图的整体轮廓、比例、配色和材质分区。生成完整闭合网格，真实厚度，底部平整，世界坐标Y轴向上，原点位于资产底部中心。删除背景、地面、摄影棚阴影、人物、文字、Logo和参考图中没有的附加物。不要增加悬空碎片、极细线缆、纸片厚度或透明玻璃内部。保持可读的大形，细小磨损主要进入贴图而不是几何体。

输出GLB/FBX，PBR材质，Base Color、Roughness、Metallic、Normal、AO；单套2K贴图，颜色空间正确。不要把灯光和硬阴影烘进Base Color。允许分离材质槽，但所有部件保持同一资产层级并使用清楚英文命名。模型需要适合45度俯视固定镜头，远距离轮廓优先于微小细节。
```

## 01 — Central clock tower

Reference: `visual-references/chapter03-hunyuan/CH03_clock_tower_hunyuan_ref_v01.png`

Target size: `5.2 m H × 1.65 m W × 1.65 m D`  
Triangle target: `35k–60k`, plus an optional `12k–18k` LOD  
Suggested material slots: stone base / teal painted iron / aged brass / clock face / dark glass

```text
根据参考图生成一座独立的老城区市政街钟。必须保留：八边形深青绿色铸铁立柱、分层石质基座、黄铜嵌板、双面方形钟箱、略微不规则的氧化铜尖顶。钟面使用简单刻度，不生成数字或文字。钟箱与立柱必须有可信连接结构，正反两面钟面均完整；背面不能是空壳。时针分针做成独立但较厚的子网格，避免过细。整体略显古怪但仍然可信、可制造，作为广场第一视觉锚点。
```

Acceptance: recognizable at 120 px tall; both clock faces readable; no text artifacts; no hollow rear; base sits flat.

## 02 — Municipal tram

Reference: `visual-references/chapter03-hunyuan/CH03_tram_hunyuan_ref_v01.png`

Target size: `9.0 m L × 2.5 m W × 3.35 m H` excluding trolley poles  
Triangle target: `55k–90k`, plus an optional `20k–30k` LOD  
Suggested material slots: cream enamel / teal enamel / burgundy accent / brass trim / dark window / steel undercarriage

```text
根据参考图生成一辆虚构海港城市的1930年代市政电车。必须保留：圆角车身、奶油色上半部、氧化深青绿色下半部、暗酒红色路线牌框、黄铜包边、完整车轮与转向架。所有车门关闭。窗户使用深色不透明或半透明平面，不生成复杂内饰。车底必须连续并遮住看穿漏洞。车顶受电杆可以加粗并简化连接件，不能变成易碎细线。不要生成轨道、乘客、司机、路线文字或城市背景。
```

Acceptance: wheels contact one ground plane; left/right sides coherent; no fake interior blobs; no readable text; roof poles structurally attached.

## 03 — Reunion fountain

Reference: `visual-references/chapter03-hunyuan/CH03_fountain_hunyuan_ref_v01.png`

Target size: `4.6 m diameter × 2.7 m H`  
Triangle target: `30k–55k`, plus an optional `10k–16k` LOD  
Suggested material slots: limestone / red tile inlay / oxidized bronze / water

```text
根据参考图生成一座老城区公共喷泉。必须保留：宽厚的圆形石盆、八边形中央基座、两层克制水盘、四个与柱体连接的青铜出水口、顶部抽象鸟与叶片饰件、石盆边缘少量褪色红砖镶嵌。所有石材需要真实厚度并形成连续闭合结构。水面单独输出为简单圆形平面；不要生成复杂流体网格，喷水水柱由游戏运行时另加。顶部饰件适度加粗，避免脆弱悬空。
```

Acceptance: circular basin remains circular from top view; water is a separate named mesh; no frozen splash geometry; central tiers are centered and watertight.

## 04 — Produce market stall

Reference: `visual-references/chapter03-hunyuan/CH03_market_stall_hunyuan_ref_v01.png`

Target size: `3.6 m W × 2.2 m D × 2.8 m H`  
Triangle target: `45k–75k`; produce may be baked into grouped crate meshes  
Suggested material slots: weathered timber / vermilion canvas / sage canvas / painted crates / grouped produce / ceramic

```text
根据参考图生成一个完整的老城区蔬果摊位。必须保留：坚固木结构、褪色朱红色主篷布、不对称灰绿色侧篷、木柜台、多层板条箱、少量陶罐和篮筐。篷布要有真实厚度并与木架连接，不生成飘散布条或细绳。蔬果不要逐个生成高面数模型；按每个板条箱合并成3到5个简化颜色簇，并把小细节主要做进贴图。所有篮筐、木桶和箱子保持接触或连接摊位主体，不要生成摊主、顾客、文字招牌或周围街景。
```

Acceptance: clean single silhouette; canopy has no torn floating geometry; fruit groups are optimized; stall reads at 180 px wide; all feet sit on one plane.

## Export checklist

1. Export one `.glb` per asset with embedded or adjacent textures.
2. Freeze transforms; scale in meters; bottom-center origin; Y-up.
3. Remove cameras, lights, background planes, and hidden studio meshes.
4. Keep visible face normals outward and avoid non-manifold holes.
5. Do not decimate the hero silhouette; simplify only unseen backs and micro-detail.
6. Zip each asset separately with the reference image and final texture files.
7. Before runtime integration, provide one 45-degree top-down screenshot and one wireframe screenshot per asset.

## Ownership boundary

Butch and Mara are not included. Their final design and model are owned by the assigned character contributor. These four references cover environment assets only; temporary player/crowd capsules stay placeholders until approved character work arrives.

## 2026-08-05 integration result

The four delivered Hunyuan GLBs were each a single mesh at roughly 1.5 million triangles with three embedded 4096px PBR textures. They were normalized to the authored world dimensions, reduced while preserving the hero silhouette, and repacked with 2048px textures:

| Asset | Source triangles | Optimized triangles | Reduction |
|---|---:|---:|---:|
| Clock tower | 1,500,004 | 24,000 | 98.40% |
| Municipal tram | 1,497,526 | 36,000 | 97.60% |
| Reunion fountain | 1,499,760 | 28,000 | 98.13% |
| Produce market stall | 1,499,524 | 40,000 | 97.33% |

Optimized GLBs remain outside Git under `NIGHTFALL_Source_Assets/05_CH03_CITY/HUNYUAN_GENERATED/optimized/`. Phaser uses only the camera-locked `assets-iso-v2/city_full_hunyuan_v2.webp` derivative. The clock is rotated 45 degrees so one face reads cleanly in the fixed camera instead of producing a four-petal silhouette.
