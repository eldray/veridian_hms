// src/styles/themes.ts
// Single source of truth for all HMS color schemes.
// Each scheme defines both light and dark mode CSS variable values.
// The useThemeStore injects these into :root at runtime.
//
// Design principle applied across ALL schemes:
//   – Icon bg tints are low-saturation washes, never vivid fills
//   – Icon text accents are deep/muted, never neon or electric
//   – Borders are subtle — one step above the card background
//   – Dark mode cards are NOT pitch black and NOT bright; mid-depth only
//   – Nothing should "pop" in a way that distracts from clinical data

export type ThemeMode = 'light' | 'dark';

export interface ThemeVars {
  '--bg-main': string;
  '--bg-card': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--text-tertiary': string;
  '--icon-cyan-bg': string;
  '--icon-cyan-text': string;
  '--icon-orange-bg': string;
  '--icon-orange-text': string;
  '--icon-red-bg': string;
  '--icon-red-text': string;
  '--icon-green-bg': string;
  '--icon-green-text': string;
  '--icon-purple-bg': string;
  '--icon-purple-text': string;
  '--icon-yellow-bg': string;
  '--icon-yellow-text': string;
  '--border-color': string;
  '--shadow-sm': string;
  '--shadow-md': string;
}

export interface ColorScheme {
  id: string;
  name: string;
  description: string;
  previewAccent: string;
  previewBg: { light: string; dark: string };
  light: ThemeVars;
  dark: ThemeVars;
}

// ─── Scheme 1: Original ──────────────────────────────────────────────────────
// Reworked: icon tints pulled way back from vivid pastels to near-neutral
// washes. Accent hues darkened. Cyan is now a professional teal-slate, not
// a bright aqua. Green / orange / red remain readable but no longer shout.
const originalScheme: ColorScheme = {
  id: 'original',
  name: 'Original',
  description: 'The default HMS palette — refined gray base with muted teal accents',
  previewAccent: '#0E7490',
  previewBg: { light: '#EAECF0', dark: '#1E2530' },
  light: {
    '--bg-main': '#EAECF0',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#111827',
    '--text-secondary': '#4B5563',
    '--text-tertiary': '#9CA3AF',
    // Cyan — muted teal wash, not bright aqua
    '--icon-cyan-bg': '#E0F2F7',
    '--icon-cyan-text': '#0E7490',
    // Orange — desaturated amber
    '--icon-orange-bg': '#FDF3EC',
    '--icon-orange-text': '#C05621',
    // Red — soft rose, not alarm-red
    '--icon-red-bg': '#FDF0F0',
    '--icon-red-text': '#B91C1C',
    // Green — sage-toned, not neon lime
    '--icon-green-bg': '#EDFAF3',
    '--icon-green-text': '#15713A',
    // Purple — lavender-grey wash
    '--icon-purple-bg': '#F3F0FA',
    '--icon-purple-text': '#6D28D9',
    // Yellow — pale straw, not highlighter
    '--icon-yellow-bg': '#FBF8EC',
    '--icon-yellow-text': '#926B04',
    '--border-color': '#DDE1E7',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.04)',
    '--shadow-md': '0 4px 8px rgba(0,0,0,0.06)',
  },
  dark: {
    '--bg-main': '#1E2530',
    '--bg-card': '#28323F',
    '--text-primary': '#E4EAF0',
    '--text-secondary': '#8A9AB0',
    '--text-tertiary': '#4E5E70',
    '--icon-cyan-bg': '#0C2830',
    '--icon-cyan-text': '#4AACBF',
    '--icon-orange-bg': '#271400',
    '--icon-orange-text': '#CC7A40',
    '--icon-red-bg': '#240A0A',
    '--icon-red-text': '#C87070',
    '--icon-green-bg': '#0A2016',
    '--icon-green-text': '#4A9E68',
    '--icon-purple-bg': '#1C1238',
    '--icon-purple-text': '#9E7ED4',
    '--icon-yellow-bg': '#201800',
    '--icon-yellow-text': '#B89A30',
    '--border-color': '#38465A',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.35)',
    '--shadow-md': '0 4px 8px rgba(0,0,0,0.45)',
  },
};

// ─── Scheme 2: Arctic Slate ──────────────────────────────────────────────────
// Reworked: the bright #DBEAFE blue icon bg replaced with a pale ice wash.
// Royal blue accent deepened to a corporate navy. Pink icon removed — now
// uses a cool rose-grey. Dark mode lightened from near-black to proper slate.
const arcticSlate: ColorScheme = {
  id: 'arctic-slate',
  name: 'Arctic Slate',
  description: 'Corporate navy and cool slate — clean and authoritative',
  previewAccent: '#1A4080',
  previewBg: { light: '#EDF0F5', dark: '#111827' },
  light: {
    '--bg-main': '#EDF0F5',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1B2A3D',
    '--text-secondary': '#4A6080',
    '--text-tertiary': '#8AAABF',
    // Cyan slot → institutional navy-blue
    '--icon-cyan-bg': '#EAF0F8',
    '--icon-cyan-text': '#1A4080',
    // Orange → muted amber-rust
    '--icon-orange-bg': '#FDF2EB',
    '--icon-orange-text': '#B54A10',
    // Red → cool rose
    '--icon-red-bg': '#FDF0F0',
    '--icon-red-text': '#A81C1C',
    // Green → cool mint-sage
    '--icon-green-bg': '#EAF6F0',
    '--icon-green-text': '#0F5C3A',
    // Purple → cool mauve
    '--icon-purple-bg': '#F5EFF8',
    '--icon-purple-text': '#6B1E6E',
    // Yellow → pale gold
    '--icon-yellow-bg': '#FAF5E8',
    '--icon-yellow-text': '#7A5A00',
    '--border-color': '#CAD4E0',
    '--shadow-sm': '0 1px 3px rgba(0,0,0,0.05)',
    '--shadow-md': '0 4px 10px rgba(0,0,0,0.07)',
  },
  dark: {
    '--bg-main': '#111827',
    '--bg-card': '#1C2636',
    '--text-primary': '#C8D8E8',
    '--text-secondary': '#587090',
    '--text-tertiary': '#334860',
    '--icon-cyan-bg': '#0C1E40',
    '--icon-cyan-text': '#4880C8',
    '--icon-orange-bg': '#261200',
    '--icon-orange-text': '#C07040',
    '--icon-red-bg': '#260808',
    '--icon-red-text': '#C06060',
    '--icon-green-bg': '#081E14',
    '--icon-green-text': '#409060',
    '--icon-purple-bg': '#1A0A28',
    '--icon-purple-text': '#9060C0',
    '--icon-yellow-bg': '#201800',
    '--icon-yellow-text': '#A88020',
    '--border-color': '#263448',
    '--shadow-sm': '0 1px 3px rgba(0,0,0,0.35)',
    '--shadow-md': '0 4px 10px rgba(0,0,0,0.45)',
  },
};

// ─── Scheme 3: Sage Clinic ───────────────────────────────────────────────────
// Reworked: the vivid #DCFCE7 green bg and #4ADE80 neon dark accent are gone.
// Replaced with proper sage and forest tones. Icon backgrounds are barely-there
// tints. Secondary text is less saturated green, more readable grey-green.
const sageClinic: ColorScheme = {
  id: 'sage-clinic',
  name: 'Sage Clinic',
  description: 'Forest sage tones — calm and easy on the eyes for long shifts',
  previewAccent: '#2D6A4F',
  previewBg: { light: '#EFF3F0', dark: '#0E1812' },
  light: {
    '--bg-main': '#EFF3F0',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1A2E22',
    '--text-secondary': '#3D5C48',
    '--text-tertiary': '#7A9882',
    // Cyan slot → forest green
    '--icon-cyan-bg': '#EAF4EE',
    '--icon-cyan-text': '#2D6A4F',
    // Orange → terracotta-amber
    '--icon-orange-bg': '#FBF0E8',
    '--icon-orange-text': '#A84010',
    // Red → dusty rose
    '--icon-red-bg': '#FAF0F0',
    '--icon-red-text': '#9A1C1C',
    // Green slot → muted sky for contrast
    '--icon-green-bg': '#EAF3F8',
    '--icon-green-text': '#0A5C80',
    // Purple → muted plum
    '--icon-purple-bg': '#F4EFF8',
    '--icon-purple-text': '#5E1E6E',
    // Yellow → pale straw
    '--icon-yellow-bg': '#F8F4E8',
    '--icon-yellow-text': '#705A00',
    '--border-color': '#C8D8CC',
    '--shadow-sm': '0 1px 3px rgba(0,0,0,0.05)',
    '--shadow-md': '0 4px 10px rgba(0,0,0,0.07)',
  },
  dark: {
    '--bg-main': '#0E1812',
    '--bg-card': '#162018',
    '--text-primary': '#BED8C4',
    '--text-secondary': '#406850',
    '--text-tertiary': '#254030',
    // Forest green accent — not neon
    '--icon-cyan-bg': '#081E10',
    '--icon-cyan-text': '#4A9060',
    '--icon-orange-bg': '#261000',
    '--icon-orange-text': '#B06030',
    '--icon-red-bg': '#220808',
    '--icon-red-text': '#B06060',
    // Muted sky blue for contrast in dark
    '--icon-green-bg': '#081828',
    '--icon-green-text': '#4A80A0',
    '--icon-purple-bg': '#1A0828',
    '--icon-purple-text': '#8060A8',
    '--icon-yellow-bg': '#201800',
    '--icon-yellow-text': '#907820',
    '--border-color': '#1E3024',
    '--shadow-sm': '0 1px 3px rgba(0,0,0,0.35)',
    '--shadow-md': '0 4px 10px rgba(0,0,0,0.45)',
  },
};

// ─── Scheme 4: Violet Care ────────────────────────────────────────────────────
// Reworked: purple is now a deep aubergine/plum, not electric violet. Icon bg
// washes are near-white tinted, not saturated lavender. Dark mode bg is a
// dark wine tone (#130E22) — not the near-black that read as a generic dark theme.
const violetCare: ColorScheme = {
  id: 'violet-care',
  name: 'Violet Care',
  description: 'Deep plum and aubergine — refined and distinctive',
  previewAccent: '#4C1D95',
  previewBg: { light: '#F3F1F8', dark: '#130E22' },
  light: {
    '--bg-main': '#F3F1F8',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1E1548',
    '--text-secondary': '#4A3E80',
    '--text-tertiary': '#8880B8',
    // Cyan slot → deep plum
    '--icon-cyan-bg': '#EEE8FA',
    '--icon-cyan-text': '#4C1D95',
    // Orange → warm ochre
    '--icon-orange-bg': '#FBF2E8',
    '--icon-orange-text': '#A8440A',
    // Red → deep rose-red
    '--icon-red-bg': '#F8EEF2',
    '--icon-red-text': '#8A1040',
    // Green → cool sage
    '--icon-green-bg': '#EAF4EC',
    '--icon-green-text': '#1A5A30',
    // Purple → mid plum tint
    '--icon-purple-bg': '#EEE8FA',
    '--icon-purple-text': '#3E1878',
    // Yellow → aged gold
    '--icon-yellow-bg': '#F8F3E8',
    '--icon-yellow-text': '#7A5A00',
    '--border-color': '#DDD5F0',
    '--shadow-sm': '0 1px 3px rgba(20,10,50,0.06)',
    '--shadow-md': '0 4px 10px rgba(20,10,50,0.09)',
  },
  dark: {
    '--bg-main': '#130E22',
    '--bg-card': '#1E1838',
    '--text-primary': '#CEBEF8',
    '--text-secondary': '#7060B0',
    '--text-tertiary': '#403870',
    '--icon-cyan-bg': '#200E50',
    '--icon-cyan-text': '#9070D0',
    '--icon-orange-bg': '#281000',
    '--icon-orange-text': '#B87040',
    '--icon-red-bg': '#280818',
    '--icon-red-text': '#B06080',
    '--icon-green-bg': '#082018',
    '--icon-green-text': '#409060',
    '--icon-purple-bg': '#200E50',
    '--icon-purple-text': '#A888E0',
    '--icon-yellow-bg': '#201400',
    '--icon-yellow-text': '#A88020',
    '--border-color': '#2E2250',
    '--shadow-sm': '0 1px 3px rgba(0,0,0,0.4)',
    '--shadow-md': '0 4px 10px rgba(0,0,0,0.5)',
  },
};

// ─── Scheme 5: Obsidian Gold ──────────────────────────────────────────────────
// Reworked: the gold accent is now a proper dark amber (#92620A) — not the
// warm-orange it was reading as. Backgrounds are correct parchment-to-dark-earth.
// The jarring blue icon in dark mode (#60A5FA) is replaced with burnished gold.
const obsidianGold: ColorScheme = {
  id: 'obsidian-gold',
  name: 'Obsidian Gold',
  description: 'Dark earth and burnished gold — premium and editorial',
  previewAccent: '#92620A',
  previewBg: { light: '#F5F4EE', dark: '#131108' },
  light: {
    '--bg-main': '#F5F4EE',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1C1A10',
    '--text-secondary': '#5C5230',
    '--text-tertiary': '#9C8C60',
    // Cyan slot → burnished amber-gold
    '--icon-cyan-bg': '#FAF2E0',
    '--icon-cyan-text': '#92620A',
    // Orange → clay-rust
    '--icon-orange-bg': '#FAF0E8',
    '--icon-orange-text': '#8A3A0A',
    // Red → aged burgundy
    '--icon-red-bg': '#F8ECEA',
    '--icon-red-text': '#8A1A10',
    // Green → dark forest
    '--icon-green-bg': '#EAF4EC',
    '--icon-green-text': '#1A5A30',
    // Purple → antique violet
    '--icon-purple-bg': '#F4EEF8',
    '--icon-purple-text': '#4E1E6E',
    // Yellow slot → ink blue for contrast
    '--icon-yellow-bg': '#EAF0F8',
    '--icon-yellow-text': '#1A3A70',
    '--border-color': '#E0DAC8',
    '--shadow-sm': '0 1px 3px rgba(28,26,16,0.06)',
    '--shadow-md': '0 4px 10px rgba(28,26,16,0.09)',
  },
  dark: {
    '--bg-main': '#131108',
    '--bg-card': '#1E1C0E',
    '--text-primary': '#E8E0C8',
    '--text-secondary': '#7A6A30',
    '--text-tertiary': '#484018',
    // Gold accent — burnished, not yellow
    '--icon-cyan-bg': '#281E00',
    '--icon-cyan-text': '#B88A30',
    '--icon-orange-bg': '#261000',
    '--icon-orange-text': '#A86030',
    '--icon-red-bg': '#220808',
    '--icon-red-text': '#A05050',
    '--icon-green-bg': '#081A10',
    '--icon-green-text': '#408050',
    '--icon-purple-bg': '#180A28',
    '--icon-purple-text': '#8060A8',
    // Ink blue for contrast — deep, not electric
    '--icon-yellow-bg': '#08122A',
    '--icon-yellow-text': '#4870A8',
    '--border-color': '#302C10',
    '--shadow-sm': '0 1px 3px rgba(0,0,0,0.35)',
    '--shadow-md': '0 4px 10px rgba(0,0,0,0.45)',
  },
};

// ─── Scheme 6: Slate & Indigo ─────────────────────────────────────────────────
// Reworked: indigo accent toned from electric #4338CA to a measured #3730A3.
// Orange and red icon bgs removed of any brightness. Dark mode bg deepened from
// near-pure-black to a navigable #0E0E18 that still has slate character.
const slateIndigo: ColorScheme = {
  id: 'slate-indigo',
  name: 'Slate & Indigo',
  description: 'Measured indigo on cool slate — sharp and data-dense',
  previewAccent: '#3730A3',
  previewBg: { light: '#F0F1F6', dark: '#0E0E1C' },
  light: {
    '--bg-main': '#F0F1F6',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1E1F3B',
    '--text-secondary': '#484A70',
    '--text-tertiary': '#7880A8',
    // Cyan slot → deep indigo
    '--icon-cyan-bg': '#ECEEFA',
    '--icon-cyan-text': '#3730A3',
    // Orange → muted amber
    '--icon-orange-bg': '#FAF0E8',
    '--icon-orange-text': '#984010',
    // Red → cool crimson
    '--icon-red-bg': '#F8ECEC',
    '--icon-red-text': '#8A1818',
    // Green → cool sage
    '--icon-green-bg': '#EAF4EC',
    '--icon-green-text': '#145A30',
    // Purple → medium grape
    '--icon-purple-bg': '#F0ECFA',
    '--icon-purple-text': '#4A1E90',
    // Yellow → dark gold
    '--icon-yellow-bg': '#F8F4E8',
    '--icon-yellow-text': '#705000',
    '--border-color': '#D4D6E2',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.05)',
    '--shadow-md': '0 4px 8px rgba(0,0,0,0.07)',
  },
  dark: {
    '--bg-main': '#0E0E1C',
    '--bg-card': '#18182E',
    '--text-primary': '#D8DAF8',
    '--text-secondary': '#6870B0',
    '--text-tertiary': '#404880',
    '--icon-cyan-bg': '#10103A',
    '--icon-cyan-text': '#7880D0',
    '--icon-orange-bg': '#260E00',
    '--icon-orange-text': '#A06030',
    '--icon-red-bg': '#240808',
    '--icon-red-text': '#A05858',
    '--icon-green-bg': '#081A10',
    '--icon-green-text': '#408060',
    '--icon-purple-bg': '#180E38',
    '--icon-purple-text': '#8870C0',
    '--icon-yellow-bg': '#1C1600',
    '--icon-yellow-text': '#908030',
    '--border-color': '#222240',
    '--shadow-sm': '0 1px 3px rgba(0,0,0,0.4)',
    '--shadow-md': '0 4px 10px rgba(0,0,0,0.5)',
  },
};

// ─── Scheme 7: Teal & Ivory ───────────────────────────────────────────────────
// Reworked: #ccfbf1 bright mint bg toned to a near-white ivory wash. Teal
// accent darkened from #0f766e to #0A5C55. Dark mode mint accents like
// #5eead4 replaced with a measured teal #3A9490.
const tealIvory: ColorScheme = {
  id: 'teal-ivory',
  name: 'Teal & Ivory',
  description: 'Ivory base with deep teal — calm and wellness-forward',
  previewAccent: '#0A5C55',
  previewBg: { light: '#F2F6F5', dark: '#0C1A18' },
  light: {
    '--bg-main': '#F2F6F5',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1A3330',
    '--text-secondary': '#345850',
    '--text-tertiary': '#6A8880',
    // Cyan slot → deep teal
    '--icon-cyan-bg': '#E4F4F2',
    '--icon-cyan-text': '#0A5C55',
    // Orange → warm amber-clay
    '--icon-orange-bg': '#FAF0E8',
    '--icon-orange-text': '#984010',
    // Red → muted crimson
    '--icon-red-bg': '#F8ECEC',
    '--icon-red-text': '#8A1818',
    // Green → mid forest
    '--icon-green-bg': '#EAF4EE',
    '--icon-green-text': '#1A5A30',
    // Purple → soft plum
    '--icon-purple-bg': '#F4EEF8',
    '--icon-purple-text': '#5A1E6E',
    // Yellow → aged straw
    '--icon-yellow-bg': '#F8F4E8',
    '--icon-yellow-text': '#705800',
    '--border-color': '#C8DAD6',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.04)',
    '--shadow-md': '0 4px 8px rgba(0,0,0,0.06)',
  },
  dark: {
    '--bg-main': '#0C1A18',
    '--bg-card': '#162824',
    '--text-primary': '#D0E8E4',
    '--text-secondary': '#3A8880',
    '--text-tertiary': '#1E5050',
    // Measured teal — not neon
    '--icon-cyan-bg': '#081E1A',
    '--icon-cyan-text': '#3A9490',
    '--icon-orange-bg': '#241000',
    '--icon-orange-text': '#A06030',
    '--icon-red-bg': '#200808',
    '--icon-red-text': '#A05858',
    '--icon-green-bg': '#081A10',
    '--icon-green-text': '#408058',
    '--icon-purple-bg': '#180828',
    '--icon-purple-text': '#8058A8',
    '--icon-yellow-bg': '#1C1600',
    '--icon-yellow-text': '#887820',
    '--border-color': '#1C3430',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.35)',
    '--shadow-md': '0 4px 8px rgba(0,0,0,0.45)',
  },
};

// ─── Scheme 8: Warm Neutral ───────────────────────────────────────────────────
// Reworked: the bright #e0f2fe cyan bg and #7dd3fc sky-blue accent swapped for
// a properly warm steel-blue that fits the stone palette. Icon bgs are barely
// tinted. Dark mode uses #1C1917 stone-black with brown-grey cards.
const warmNeutral: ColorScheme = {
  id: 'warm-neutral',
  name: 'Warm Neutral',
  description: 'Stone and warm grey — reduces eye strain across long shifts',
  previewAccent: '#2A5580',
  previewBg: { light: '#F5F2EF', dark: '#1C1917' },
  light: {
    '--bg-main': '#F5F2EF',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1C1917',
    '--text-secondary': '#504840',
    '--text-tertiary': '#988880',
    // Cyan slot → warm steel-blue, fits the stone palette
    '--icon-cyan-bg': '#EAF0F6',
    '--icon-cyan-text': '#2A5580',
    // Orange → warm terracotta
    '--icon-orange-bg': '#FAF0E8',
    '--icon-orange-text': '#8A3A10',
    // Red → warm rose-brick
    '--icon-red-bg': '#F8ECEC',
    '--icon-red-text': '#8A1818',
    // Green → warm olive-forest
    '--icon-green-bg': '#EDF4EC',
    '--icon-green-text': '#245A28',
    // Purple → warm mauve
    '--icon-purple-bg': '#F5F0F8',
    '--icon-purple-text': '#5A2070',
    // Yellow → warm honey
    '--icon-yellow-bg': '#F8F4E8',
    '--icon-yellow-text': '#785800',
    '--border-color': '#DDD8D0',
    '--shadow-sm': '0 1px 2px rgba(28,25,23,0.05)',
    '--shadow-md': '0 4px 8px rgba(28,25,23,0.07)',
  },
  dark: {
    '--bg-main': '#1C1917',
    '--bg-card': '#272320',
    '--text-primary': '#EEE8E0',
    '--text-secondary': '#908070',
    '--text-tertiary': '#605850',
    // Warm steel blue — not cold sky blue
    '--icon-cyan-bg': '#0C1A28',
    '--icon-cyan-text': '#4880A8',
    '--icon-orange-bg': '#241000',
    '--icon-orange-text': '#A07040',
    '--icon-red-bg': '#220808',
    '--icon-red-text': '#A05858',
    '--icon-green-bg': '#0C1E0A',
    '--icon-green-text': '#488048',
    '--icon-purple-bg': '#1A0A28',
    '--icon-purple-text': '#8860A8',
    '--icon-yellow-bg': '#1E1600',
    '--icon-yellow-text': '#988040',
    '--border-color': '#3A3430',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.35)',
    '--shadow-md': '0 4px 8px rgba(0,0,0,0.45)',
  },
};

// ─── Scheme 9: Clinical Blue ──────────────────────────────────────────────────
// Reworked: bright #e8f4ff bg and #89cff0 sky-blue dark accent replaced with
// proper navy/hospital tones. All icon bgs are very pale washes. Dark mode
// accent is a measured #4878B8 — readable without looking like a website link.
const clinicalBlue: ColorScheme = {
  id: 'clinical-blue',
  name: 'Clinical Blue',
  description: 'Hospital-grade navy — trustworthy and authoritative',
  previewAccent: '#0A3870',
  previewBg: { light: '#EFF3F8', dark: '#0C1824' },
  light: {
    '--bg-main': '#EFF3F8',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1A2E44',
    '--text-secondary': '#3A5070',
    '--text-tertiary': '#7090A8',
    // Cyan slot → deep hospital navy
    '--icon-cyan-bg': '#E8EFF8',
    '--icon-cyan-text': '#0A3870',
    // Orange → warm amber
    '--icon-orange-bg': '#FAF0E8',
    '--icon-orange-text': '#8A3A10',
    // Red → clean medical red
    '--icon-red-bg': '#F8ECEC',
    '--icon-red-text': '#8A1818',
    // Green → clinical green
    '--icon-green-bg': '#EAF4EC',
    '--icon-green-text': '#145A30',
    // Purple → mid blue-violet
    '--icon-purple-bg': '#EEF0F8',
    '--icon-purple-text': '#3A2880',
    // Yellow → muted gold
    '--icon-yellow-bg': '#F8F4E8',
    '--icon-yellow-text': '#705800',
    '--border-color': '#CCd8E4',
    '--shadow-sm': '0 1px 2px rgba(10,30,60,0.05)',
    '--shadow-md': '0 4px 8px rgba(10,30,60,0.07)',
  },
  dark: {
    '--bg-main': '#0C1824',
    '--bg-card': '#142030',
    '--text-primary': '#D0DEF0',
    '--text-secondary': '#608090',
    '--text-tertiary': '#385060',
    // Measured navy-blue — not sky blue
    '--icon-cyan-bg': '#081428',
    '--icon-cyan-text': '#4878B8',
    '--icon-orange-bg': '#220E00',
    '--icon-orange-text': '#986030',
    '--icon-red-bg': '#1E0808',
    '--icon-red-text': '#985858',
    '--icon-green-bg': '#081A10',
    '--icon-green-text': '#408060',
    '--icon-purple-bg': '#100A28',
    '--icon-purple-text': '#6858A8',
    '--icon-yellow-bg': '#1A1400',
    '--icon-yellow-text': '#887830',
    '--border-color': '#1A3048',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.38)',
    '--shadow-md': '0 4px 8px rgba(0,0,0,0.48)',
  },
};

// ─── Scheme 10: Graphite & Steel ─────────────────────────────────────────────
// Bloomberg / Reuters grade. Single steel-teal accent. Everything else is
// neutral. The most data-first scheme — nothing competes with the content.
const graphiteSteel: ColorScheme = {
  id: 'graphite-steel',
  name: 'Graphite & Steel',
  description: 'Data-first neutrals with a single steel-teal signal accent',
  previewAccent: '#007A8C',
  previewBg: { light: '#F4F5F7', dark: '#0D1117' },
  light: {
    '--bg-main': '#F4F5F7',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#0D1117',
    '--text-secondary': '#4A5568',
    '--text-tertiary': '#A0AEC0',
    '--icon-cyan-bg': '#E6F4F6',
    '--icon-cyan-text': '#007A8C',
    '--icon-orange-bg': '#FAF0E8',
    '--icon-orange-text': '#8A3A10',
    '--icon-red-bg': '#F8ECEC',
    '--icon-red-text': '#8A1818',
    '--icon-green-bg': '#EAF4EC',
    '--icon-green-text': '#145A30',
    '--icon-purple-bg': '#F2EEF8',
    '--icon-purple-text': '#3E2878',
    '--icon-yellow-bg': '#F8F4E8',
    '--icon-yellow-text': '#705800',
    '--border-color': '#E2E6EC',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.04)',
    '--shadow-md': '0 4px 8px rgba(0,0,0,0.06)',
  },
  dark: {
    '--bg-main': '#0D1117',
    '--bg-card': '#1C2128',
    '--text-primary': '#CDD9E5',
    '--text-secondary': '#768390',
    '--text-tertiary': '#444C56',
    '--icon-cyan-bg': '#0A2830',
    '--icon-cyan-text': '#3AAABB',
    '--icon-orange-bg': '#261000',
    '--icon-orange-text': '#A86030',
    '--icon-red-bg': '#220808',
    '--icon-red-text': '#A05858',
    '--icon-green-bg': '#081A10',
    '--icon-green-text': '#488060',
    '--icon-purple-bg': '#180E28',
    '--icon-purple-text': '#8060A8',
    '--icon-yellow-bg': '#1C1600',
    '--icon-yellow-text': '#908030',
    '--border-color': '#30363D',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.4)',
    '--shadow-md': '0 4px 10px rgba(0,0,0,0.5)',
  },
};

// ─── Scheme 11: Sandstone & Rust ─────────────────────────────────────────────
// Warm parchment base. Terracotta accent. Aesop / Monocle editorial feel.
// Premium private-clinic energy — not sterile, not corporate.
const sandstoneRust: ColorScheme = {
  id: 'sandstone-rust',
  name: 'Sandstone & Rust',
  description: 'Warm parchment and terracotta — premium and grounded',
  previewAccent: '#9A3810',
  previewBg: { light: '#FAF7F3', dark: '#1A1410' },
  light: {
    '--bg-main': '#FAF7F3',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1A130A',
    '--text-secondary': '#5C4830',
    '--text-tertiary': '#A08868',
    '--icon-cyan-bg': '#FAF0E8',
    '--icon-cyan-text': '#9A3810',
    '--icon-orange-bg': '#F8EEE4',
    '--icon-orange-text': '#803010',
    '--icon-red-bg': '#F8ECEC',
    '--icon-red-text': '#8A1818',
    '--icon-green-bg': '#EAF4EE',
    '--icon-green-text': '#1A5A30',
    '--icon-purple-bg': '#F5EEF8',
    '--icon-purple-text': '#502070',
    '--icon-yellow-bg': '#FAF4E4',
    '--icon-yellow-text': '#705800',
    '--border-color': '#EAE0D0',
    '--shadow-sm': '0 1px 3px rgba(60,30,10,0.05)',
    '--shadow-md': '0 4px 10px rgba(60,30,10,0.08)',
  },
  dark: {
    '--bg-main': '#1A1410',
    '--bg-card': '#242018',
    '--text-primary': '#EAD8C0',
    '--text-secondary': '#886A48',
    '--text-tertiary': '#503C28',
    '--icon-cyan-bg': '#301400',
    '--icon-cyan-text': '#C06038',
    '--icon-orange-bg': '#281000',
    '--icon-orange-text': '#A85030',
    '--icon-red-bg': '#220808',
    '--icon-red-text': '#A05050',
    '--icon-green-bg': '#0C1E10',
    '--icon-green-text': '#488050',
    '--icon-purple-bg': '#1A0A28',
    '--icon-purple-text': '#8860A8',
    '--icon-yellow-bg': '#201600',
    '--icon-yellow-text': '#987830',
    '--border-color': '#382A1A',
    '--shadow-sm': '0 1px 3px rgba(0,0,0,0.38)',
    '--shadow-md': '0 4px 10px rgba(0,0,0,0.48)',
  },
};

// ─── Scheme 12: Chalk & Cobalt ────────────────────────────────────────────────
// Institutional cobalt #0047AB — medical device / ECG monitor blue.
// Crisp, McKinsey-deck precision. Not startup blue. Not sky blue.
const chalkCobalt: ColorScheme = {
  id: 'chalk-cobalt',
  name: 'Chalk & Cobalt',
  description: 'Institutional cobalt — surgical precision for data-heavy work',
  previewAccent: '#0047AB',
  previewBg: { light: '#F0F2F6', dark: '#111318' },
  light: {
    '--bg-main': '#F0F2F6',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#0A0E1A',
    '--text-secondary': '#3A4260',
    '--text-tertiary': '#8088A8',
    '--icon-cyan-bg': '#E8EDF6',
    '--icon-cyan-text': '#0047AB',
    '--icon-orange-bg': '#FAF0E8',
    '--icon-orange-text': '#8A3A10',
    '--icon-red-bg': '#F8ECEC',
    '--icon-red-text': '#8A1818',
    '--icon-green-bg': '#EAF4EC',
    '--icon-green-text': '#145A30',
    '--icon-purple-bg': '#F0EAF8',
    '--icon-purple-text': '#401E80',
    '--icon-yellow-bg': '#F8F4E8',
    '--icon-yellow-text': '#705800',
    '--border-color': '#D8DEEC',
    '--shadow-sm': '0 1px 2px rgba(10,14,26,0.05)',
    '--shadow-md': '0 4px 8px rgba(10,14,26,0.07)',
  },
  dark: {
    '--bg-main': '#111318',
    '--bg-card': '#1C1F2A',
    '--text-primary': '#D0D8F0',
    '--text-secondary': '#5868A0',
    '--text-tertiary': '#343860',
    '--icon-cyan-bg': '#081840',
    '--icon-cyan-text': '#4870C0',
    '--icon-orange-bg': '#240E00',
    '--icon-orange-text': '#986030',
    '--icon-red-bg': '#200808',
    '--icon-red-text': '#985858',
    '--icon-green-bg': '#081A10',
    '--icon-green-text': '#408060',
    '--icon-purple-bg': '#160A30',
    '--icon-purple-text': '#7058B0',
    '--icon-yellow-bg': '#1A1400',
    '--icon-yellow-text': '#886820',
    '--border-color': '#282C3C',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.45)',
    '--shadow-md': '0 4px 10px rgba(0,0,0,0.55)',
  },
};

// ─── Exported registry ────────────────────────────────────────────────────────
export const COLOR_SCHEMES: ColorScheme[] = [
  originalScheme,   // 1 — refined gray / muted teal
  arcticSlate,      // 2 — corporate navy / cool slate
  sageClinic,       // 3 — forest sage
  violetCare,       // 4 — deep plum / aubergine
  obsidianGold,     // 5 — dark earth / burnished gold
  slateIndigo,      // 6 — measured indigo on cool slate
  tealIvory,        // 7 — ivory base / deep teal
  warmNeutral,      // 8 — stone / warm grey
  clinicalBlue,     // 9 — hospital-grade navy
  graphiteSteel,    // 10 — bloomberg-grade neutrals ★ new
  sandstoneRust,    // 11 — parchment / terracotta     ★ new
  chalkCobalt,      // 12 — institutional cobalt       ★ new
];

export const DEFAULT_SCHEME_ID = 'original';