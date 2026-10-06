export const CREDIT_TEAM = Object.freeze([
  {
    name: 'GEORGE',
    role: 'CREATIVE & INTEGRATION LEAD',
    stamp: 'NIGHT SERVICE · ALL LINES',
    style: 'night',
    featured: true,
  },
  { name: 'CARL', role: 'CHAPTER 4 OWNER', stamp: 'PAINTED COUNTRY', style: 'paper' },
  { name: 'JACK', role: 'CHAPTER 2 BUILDER', stamp: 'BORROWED LIGHT', style: 'grid' },
  { name: 'JASON', role: 'VISUAL & CINEMATIC LEAD', stamp: 'VISUAL WORLDS', style: 'city' },
  { name: 'MATHIAS', role: 'CHAPTER 5 / LABYRINTH', stamp: 'THE MUSEUM', style: 'night' },
]);

export const CREDIT_MUSIC = Object.freeze([
  {
    title: 'LAST AND FIRST LIGHT',
    creator: 'SCOTT BUCKLEY',
    use: 'CREDITS MUSIC',
    license: 'CC BY 4.0',
    source: 'https://www.scottbuckley.com.au/library/last-and-first-light/',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    localFile: '/assets/music/scott-buckley-last-and-first-light.mp3',
    note: 'Bittersweet contemporary classical · orchestra and solo violin · 07:48',
  },
  // Entry 0 above is the credits track itself (endCredits.js / titleMenu.js
  // play CREDIT_MUSIC[0]). The rows below are attribution only. Chapter 3's
  // CC BY / CC BY-SA recordings must stay listed while they ship; see
  // public/assets/music/ch3/ASSET_MANIFEST.md.
  {
    title: 'HUMORESQUE, OP. 101 NO. 7 (DVOŘÁK)',
    creator: 'ELIAS GOLDSTEIN · AL GOLDSTEIN COLLECTION',
    use: 'CHAPTER 3 · MARKET',
    license: 'CC BY-SA 2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Dvořák_-_Humoresque_Op._101_No._7.ogg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    note: 'Arranged for piano and viola by Elias Goldstein · converted to MP3 for the game',
  },
  {
    title: 'PRELUDE IN E MINOR, OP. 28 NO. 4 (CHOPIN)',
    creator: 'IVAN ILIĆ',
    use: 'CHAPTER 3 · DUSK',
    license: 'CC BY 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Ivan_Ilić-Chopin_Prelude_Opus_28_n.4.ogg',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    note: 'Solo piano · converted to MP3 for the game',
  },
  {
    title: 'SYMPHONY NO. 7, ALLEGRETTO (BEETHOVEN)',
    creator: 'JOHN MICHEL, CELLO',
    use: 'CHAPTER 3 · BURNING MESSAGE',
    license: 'CC BY-SA 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:JOHN_MICHEL_CELLO-BEETHOVEN_SYMPHONY_7_Allegretto.ogg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    note: 'Performed on cello · converted to MP3 for the game',
  },
  {
    title: 'GNOSSIENNE NO. 1 (SATIE)',
    creator: 'JAAN PATTERSON',
    use: 'CHAPTER 3 · ARRIVAL',
    license: 'CC0 1.0',
    source: 'https://commons.wikimedia.org/wiki/File:Jaan_Patterson_-_05_-_Gnossiennes_No1_ric_Alfred_Leslie_Satie.ogg',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    note: 'Public-domain dedication · credited voluntarily',
  },
  {
    title: 'THE WASHINGTON POST MARCH (SOUSA)',
    creator: 'UNITED STATES MARINE BAND',
    use: 'CHAPTER 3 · TRANSIT MINISTRY',
    license: 'PUBLIC DOMAIN',
    source: 'https://commons.wikimedia.org/wiki/File:Washington_Post.ogg',
    licenseUrl: 'https://commons.wikimedia.org/wiki/File:Washington_Post.ogg',
    note: 'U.S. federal-government work · credited voluntarily',
  },
  {
    title: 'PATHÉTIQUE II · MOONLIGHT I (BEETHOVEN)',
    creator: 'PAUL PITMAN / MUSOPEN',
    use: 'CHAPTER 3 · SQUARE AND ARCHIVE',
    license: 'PUBLIC DOMAIN',
    source: 'https://commons.wikimedia.org/wiki/File:Beethoven,_Sonata_No._8_in_C_Minor_Pathetique,_Op._13_-_II._Adagio_cantabile.ogg',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    note: 'CC0 / public-domain dedication · credited voluntarily',
  },
  {
    title: 'NOCTURNE IN D-FLAT, OP. 27 NO. 2 (CHOPIN)',
    creator: 'FRANK LÉVY / MUSOPEN',
    use: 'CHAPTER 3 · COPPER HERON',
    license: 'PUBLIC DOMAIN',
    source: 'https://commons.wikimedia.org/wiki/File:Chopin_-_Nocturne_No._8_in_D-flat_major,_Op._27_No._2_(Frank_Levy).flac',
    licenseUrl: 'https://commons.wikimedia.org/wiki/File:Chopin_-_Nocturne_No._8_in_D-flat_major,_Op._27_No._2_(Frank_Levy).flac',
    note: 'Credited voluntarily',
  },
  {
    title: 'NEW WORLD SYMPHONY IV · GREAT GATE OF KYIV',
    creator: 'MUSOPEN',
    use: 'CHAPTER 6 · MOVEMENTS III AND IV',
    license: 'PUBLIC DOMAIN',
    source: 'https://commons.wikimedia.org/wiki/File:Antonin_Dvorak_-_symphony_no._9_in_e_minor_%27from_the_new_world%27,_op._95_-_iv._allegro_con_fuoco.ogg',
    licenseUrl: 'https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_x._la_grande_porte_de_kiev_-_allegro_alla_breve._maestoso._con_grandezza.ogg',
    note: 'Dvořák and Mussorgsky · credited voluntarily',
  },
]);

export const CREDIT_GENERATIVE = Object.freeze([
  {
    label: 'TENCENT HUNYUAN 3D',
    detail: 'Generated and then optimized 3D environments, props and character source meshes used in Echo City and the Museum reconstruction.',
    source: 'https://3d.hunyuan.tencent.com/',
  },
  {
    label: 'OPENAI IMAGE GENERATION',
    detail: 'Title and visual-direction imagery, world panoramas, painterly textures, Chapter 3 surface sources and selected production reference art.',
    source: 'https://openai.com/index/image-generation-api/',
  },
  {
    label: 'AI-ASSISTED DEVELOPMENT',
    detail: 'OpenAI Codex, Anthropic Claude Code, Alibaba Qwen Code, Moonshot Kimi and Google Gemini supported planning, implementation, review and testing under team direction.',
  },
  {
    label: 'SYNTHETIC CHARACTER VOICES',
    detail: 'Chapter 3 and Chapter 5 use generated English voice performances, and Chapter 6 reuses selected Chapter 3 lines for the argument about Mara. The audio manifests do not record the provider; attribution remains explicitly marked as incomplete.',
  },
]);

export const CREDIT_EXTERNAL = Object.freeze([
  {
    label: 'QUATERNIUS',
    detail: 'Universal Animation Library 1 & 2 · CC0 1.0',
    source: 'https://quaternius.com/',
  },
  {
    label: 'POLY HAVEN',
    detail: 'Museum wall, carpet, wood, rubber and table PBR materials · CC0 1.0',
    source: 'https://polyhaven.com/',
  },
  {
    label: 'AMBIENTCG',
    detail: 'Fingerprints001 museum glass fingerprints · CC0 1.0',
    source: 'https://ambientcg.com/',
  },
  {
    label: 'QUATERNIUS DOWNTOWN CITY MEGAKIT',
    detail: 'Concrete asphalt texture behind the Echo City back-street paving · CC0 1.0',
    source: 'https://quaternius.com/',
  },
]);
