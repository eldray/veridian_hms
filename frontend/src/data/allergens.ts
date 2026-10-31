// src/data/allergens.ts
// Pre-listed allergen catalog + the drug clash rule, same mechanism as data/complaints.ts
// and data/odqData.ts: the list lives here, the record keeps storing plain text.
//
// Where the drug patterns came from: every stem below was taken from the ingredient names in
// backend/src/data/medications1.json, medications2.json and nhismedicines.json (670 rows,
// 382 distinct ingredients). Short stems are used where the source list misspells a drug
// ("Ceftriazone", "Hydrochlorthiazide", "Artermether"), so matching by suffix survives those.
// Stems are only used when they cannot collide with another class: "-mycin" is shared by
// aminoglycosides, macrolides, glycopeptides and the cytotoxic Actinomycin/Adriamycin, so
// those classes enumerate their molecules instead of trusting a suffix.
//
// Two levels, and only one of them blocks:
//   contraindicated - the drug belongs to the class the patient is allergic to. Prescribing is blocked.
//   caution         - the drug belongs to a cross-reactive class (relatedAllergens). Warned, never blocked.

export type AllergenGroup = 'Antibiotic' | 'Other drug class' | 'Non-drug';

export interface Allergen {
  id: string;
  name: string;
  group: AllergenGroup;
  /** Lowercase stems/words that identify a stocked drug as belonging to this class. */
  drugPatterns?: string[];
  /** Spellings staff type for the allergy itself (not necessarily a drug name). */
  aliases?: string[];
  /** Ids of allergens whose drugs deserve a caution, not a block. */
  relatedAllergens?: string[];
  /** Shown in the picker and in the clash warning. */
  note?: string;
}

const norm = (value?: string | null): string =>
  String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * A pattern is allowed to match as a substring only if it is long enough to be unambiguous.
 * A pattern ending in "$" must sit at the end of a word - that is how "pril$" catches
 * "Lisinopril 10mg" without also catching "Prilocaine", which shares the same opening stem.
 * A pattern starting with "^" must sit at the start of a word, which is how "^cef" catches
 * every cephalosporin ("Cefaclor", "Cefuroxime") without needing each molecule enumerated.
 */
const escapeRe = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchesDrug = (pattern: string, drug: string): boolean => {
  if (pattern.endsWith('$')) {
    return new RegExp(`${escapeRe(pattern.slice(0, -1))}([^a-z]|$)`).test(drug);
  }
  if (pattern.startsWith('^')) {
    return new RegExp(`(^|[^a-z])${escapeRe(pattern.slice(1))}`).test(drug);
  }
  if (pattern.length >= 4) return drug.includes(pattern);
  // short stems ("asa", "egg") must stand as a whole word
  return new RegExp(`(^|[^a-z])${escapeRe(pattern)}([^a-z]|$)`).test(drug);
};

export const ALLERGENS: Allergen[] = [
  // ══ Antibiotics ════════════════════════════════════════════════════════════
  {
    id: 'penicillins', name: 'Penicillins', group: 'Antibiotic',
    aliases: ['penicillin', 'amoxicillin', 'amox', 'amoxiclav', 'co-amoxiclav', 'augmentin', 'ampicillin', 'flucloxacillin', 'cloxacillin', 'benzylpenicillin', 'phenoxymethylpenicillin', 'peni'],
    drugPatterns: ['penicillin', 'amoxicillin', 'ampicillin', 'flucloxacillin', 'cloxacillin', 'phenoxymethyl', 'amoxiclav', 'penbritin', 'pen-V', 'penidure'],
    relatedAllergens: ['cephalosporins', 'carbapenems'],
    note: 'Blocks every penicillin-family product, including amoxicillin + clavulanic acid and procaine benzylpenicillin.',
  },
  {
    id: 'cephalosporins', name: 'Cephalosporins', group: 'Antibiotic',
    aliases: ['cephalexin', 'cefalexin', 'ceftriaxone', 'ceftriazone', 'cefuroxime', 'cefaclor', 'cefotaxime', 'ceftazidime', 'cefixime', 'cefazolin', 'cefpodoxime', 'ceftazidime', 'keflex', 'rocephin', 'ceph'],
    drugPatterns: ['^cef', '^ceph', 'keflex'],
    relatedAllergens: ['penicillins', 'carbapenems'],
    note: 'Matched on the cef- stem, so it also catches the misspelled entries and any cephalosporin added later.',
  },
  {
    id: 'carbapenems', name: 'Carbapenems', group: 'Antibiotic',
    aliases: ['meropenem', 'imipenem', 'ertapenem'],
    drugPatterns: ['penem'],
    relatedAllergens: ['penicillins', 'cephalosporins'],
  },
  {
    id: 'sulfonamides', name: 'Sulfa drugs (sulfonamide antibiotics)', group: 'Antibiotic',
    aliases: ['sulfa', 'sulfamethoxazole', 'cotrimoxazole', 'co-trimoxazole', 'septrin', 'bactrim', 'sulfasalazine', 'sulfadiazine', 'silver sulphadiazine', 'sulfadoxine'],
    drugPatterns: ['sulfamethox', 'sulfapyridine', 'sulfadox', 'sulfadiaz', 'sulphadiaz', 'sulfasalazine', 'sulfacetamide', 'sulfisox', 'sulfonamid', 'cotrimox', 'co-trimox', 'septrin', 'bactrim'],
    relatedAllergens: ['thiazides', 'loop-diuretics', 'sulfonylureas', 'dapsone'],
    note: 'The molecules are enumerated on purpose: the bare "sulfa" stem also sits inside "Zinc Sulfate" and "Ferrous Sulphate", which are not sulfa drugs.',
  },
  {
    id: 'aminoglycosides', name: 'Aminoglycosides', group: 'Antibiotic',
    aliases: ['gentamicin', 'amikacin', 'streptomycin', 'neomycin', 'tobramycin', 'kanamycin', 'framycetin', 'netilmicin', 'paromomycin'],
    drugPatterns: ['gentamicin', 'amikacin', 'tobramycin', 'netilmicin', 'kanamycin', 'streptomycin', 'neomycin', 'framycetin', 'paromomycin'],
    note: 'Enumerated rather than matched on "-mycin", because macrolides and glycopeptides share that ending.',
  },
  {
    id: 'tetracyclines', name: 'Tetracyclines', group: 'Antibiotic',
    aliases: ['tetracycline', 'doxycycline', 'minocycline', 'oxytetracycline', 'tigecycline'],
    drugPatterns: ['cycline', 'minocycl'],
  },
  {
    id: 'macrolides', name: 'Macrolides / lincosamides', group: 'Antibiotic',
    aliases: ['erythromycin', 'azithromycin', 'clarithromycin', 'roxythromycin', 'spiramycin', 'josamycin', 'clindamycin', 'lincomycin', 'dalacin'],
    drugPatterns: ['thromycin', 'erythro', 'spiramy', 'josamy', 'clindamy', 'lincomy', 'telithromy'],
    note: 'Clindamycin is grouped here because a reaction to one macrolide is usually accepted as a class caution.',
  },
  {
    id: 'quinolones', name: 'Quinolones / fluoroquinolones', group: 'Antibiotic',
    aliases: ['ciprofloxacin', 'ofloxacin', 'levofloxacin', 'norfloxacin', 'moxifloxacin', 'pefloxacin', 'nalidixic acid', 'cipro'],
    drugPatterns: ['floxacin', 'nalidix'],
  },
  {
    id: 'nitroimidazoles', name: 'Nitroimidazoles', group: 'Antibiotic',
    aliases: ['metronidazole', 'tinidazole', 'secnidazole', 'ornidazole', 'nimorazole', 'flagyl', 'metrozine'],
    drugPatterns: ['nidazole'],
    note: 'Includes fixed-dose combinations such as Ciprofloxacin + Tinidazole.',
  },
  {
    id: 'nitrofurans', name: 'Nitrofurantoin', group: 'Antibiotic',
    aliases: ['nitrofurantoin', 'furadantin', 'macrobid'],
    drugPatterns: ['nitrofuran'],
  },
  {
    id: 'chloramphenicol', name: 'Chloramphenicol / thiamphenicol', group: 'Antibiotic',
    aliases: ['chloramphenicol', 'thiamphenicol', 'florfenicol'],
    drugPatterns: ['phenicol'],
  },
  {
    id: 'rifamycins', name: 'Rifamycins', group: 'Antibiotic',
    aliases: ['rifampicin', 'rifampin', 'rifaximin'],
    drugPatterns: ['rifam'],
  },
  {
    id: 'dapsone', name: 'Dapsone', group: 'Antibiotic',
    aliases: ['dapsone', 'sulphone'],
    drugPatterns: ['dapsone'],
    relatedAllergens: ['sulfonamides'],
  },
  {
    id: 'glycopeptides', name: 'Glycopeptides (vancomycin, teicoplanin)', group: 'Antibiotic',
    aliases: ['vancomycin', 'teicoplanin'],
    drugPatterns: ['vancomyc', 'teicoplan'],
  },
  {
    id: 'polymyxins', name: 'Polymyxins / fosfomycin', group: 'Antibiotic',
    aliases: ['colistin', 'polymyxin', 'fosfomycin'],
    drugPatterns: ['colistin', 'polymyxin', 'fosfomycin'],
  },
  {
    id: 'aztreonam', name: 'Monobactams (aztreonam)', group: 'Antibiotic',
    aliases: ['aztreonam'],
    drugPatterns: ['aztreonam'],
    relatedAllergens: ['cephalosporins'],
  },

  // ══ Analgesia and anaesthesia ══════════════════════════════════════════════
  {
    id: 'nsaids', name: 'NSAIDs', group: 'Other drug class',
    aliases: ['ibuprofen', 'diclofenac', 'voltarol', 'mefenamic', 'mefenamic acid', 'piroxicam', 'meloxicam', 'tenoxicam', 'celecoxib', 'naproxen', 'indomethacin', 'ketorolac', 'flurbiprofen', 'ketoprofen', 'aceclofenac', 'nimesulide', 'aspirin'],
    drugPatterns: ['profen', 'fenac', 'oxicam', 'coxib', 'roxen', 'metacin', 'acolac', 'brufen', 'diclo', 'mefenamic', 'flurbipro', 'ketopro', 'nimesulide', 'ibuprofen', 'clofenac'],
    relatedAllergens: ['aspirin'],
    note: 'Blocks the whole NSAID family. Paracetamol is not an NSAID and stays prescribable.',
  },
  {
    id: 'aspirin', name: 'Aspirin / salicylates', group: 'Other drug class',
    aliases: ['aspirin', 'acetylsalicylic acid', 'salicylate', 'salicylic acid', 'asa'],
    drugPatterns: ['aspirin', 'salicyl', 'asa'],
    relatedAllergens: ['nsaids'],
    note: 'Also covers topical salicylic acid preparations.',
  },
  {
    id: 'paracetamol', name: 'Paracetamol / acetaminophen', group: 'Other drug class',
    aliases: ['paracetamol', 'panadol', 'acetaminophen', 'mpp', 'calpol'],
    drugPatterns: ['paracetamol', 'acetaminophen', 'panadol', 'calpol'],
    note: 'Rare, but combination analgesics carry it too - check every fixed-dose product.',
  },
  {
    id: 'opioids', name: 'Opioids', group: 'Other drug class',
    aliases: ['morphine', 'codeine', 'dihydrocodeine', 'pethidine', 'tramadol', 'fentanyl', 'oxycodone', 'buprenorphine', 'codeine phosphate', 'duromorph'],
    drugPatterns: ['morphine', 'codine', 'tramadol', 'fentanyl', 'pethidine', 'oxycodone', 'buprenorph', 'diamorphine', 'methadone'],
    note: 'Includes codeine in cough mixtures and paracetamol-codeine combinations.',
  },
  {
    id: 'amide-anaesthetics', name: 'Amide local anaesthetics', group: 'Other drug class',
    aliases: ['lidocaine', 'lignocaine', 'xylocaine', 'bupivacaine', 'ropivacaine', 'mepivacaine', 'prilocaine', 'articaine'],
    drugPatterns: ['lidocaine', 'lignocaine', 'bupivacaine', 'ropivacaine', 'mepivacaine', 'prilocaine', 'articaine', 'xylocaine'],
    relatedAllergens: ['ester-anaesthetics'],
    note: 'Amide and ester anaesthetics rarely cross-react, so esters are warned, not blocked.',
  },
  {
    id: 'ester-anaesthetics', name: 'Ester local anaesthetics', group: 'Other drug class',
    aliases: ['procaine', 'tetracaine', 'benzocaine', 'cocaine', 'chloroprocaine'],
    drugPatterns: ['procaine', 'tetracaine', 'benzocaine', 'cocaine', 'isocaine'],
    relatedAllergens: ['amide-anaesthetics', 'penicillins'],
    note: 'Procaine benzylpenicillin is both an ester and a penicillin.',
  },
  {
    id: 'general-anaesthetics', name: 'General anaesthetics / muscle relaxants', group: 'Other drug class',
    aliases: ['suxamethonium', 'succinylcholine', 'thiopentone', 'propofol', 'ketamine', 'atracurium', 'rocuronium', 'vecuronium', 'isoflurane', 'sevoflurane', 'halothane', 'nitrous oxide'],
    drugPatterns: ['suxameth', 'succinylcholine', 'thiopent', 'propofol', 'curium', 'flurane', 'ketamine', 'trional'],
  },

  // ══ Other drug classes ═════════════════════════════════════════════════════
  {
    id: 'corticosteroids', name: 'Corticosteroids', group: 'Other drug class',
    aliases: ['hydrocortisone', 'prednisolone', 'prednisone', 'dexamethasone', 'betamethasone', 'methylprednisolone', 'triamcinolone', 'beclometasone', 'budesonide', 'fluticasone', 'clobetasol', 'fludrocortisone', 'deflazacort', 'hydrocortisone sodium succinate'],
    drugPatterns: ['cortis', 'cortisol', 'cort', 'sone', 'clobetas', 'fluticas', 'budeson', 'triamcinol', 'mometas', 'fluocin', 'desonide', 'methasone', 'betameth', 'dexameth', 'prednisol', 'predniso', 'hydrocort', 'methylpred'],
    note: 'Matched on the corticosteroid stems, so creams, inhalers and injections all flag. Sex hormones (progesterone, testosterone) are a separate entry and are not caught here.',
  },
  {
    id: 'azoles', name: 'Azole antifungals', group: 'Other drug class',
    aliases: ['fluconazole', 'ketoconazole', 'itraconazole', 'miconazole', 'clotrimazole', 'econazole', 'sertaconazole', 'voriconazole', 'fenticonazole'],
    drugPatterns: ['conazole'],
    note: 'Includes topical, vaginal and oral clotrimazole/miconazole preparations.',
  },
  {
    id: 'polyene-antifungals', name: 'Polyene antifungals', group: 'Other drug class',
    aliases: ['nystatin', 'amphotericin', 'amphotericin b'],
    drugPatterns: ['nystatin', 'amphoteric', 'amphotec'],
  },
  {
    id: 'allylamines', name: 'Terbinafine / allylamines', group: 'Other drug class',
    aliases: ['terbinafine', 'lamisil', 'amorolfine', 'naftifine', 'tolnaftate'],
    drugPatterns: ['terbinafine', 'bfinafine', 'amorolfine', 'naftifine', 'tolnaftate'],
  },
  {
    id: 'griseofulvin', name: 'Griseofulvin', group: 'Other drug class',
    aliases: ['griseofulvin', 'fulvicin', 'gris-'],
    drugPatterns: ['griseofulvin'],
  },
  {
    id: 'antivirals', name: 'Antivirals', group: 'Other drug class',
    aliases: ['acyclovir', 'valaciclovir', 'oseltamivir', 'ganciclovir', 'aciclovir'],
    drugPatterns: ['ciclovir', 'amivir'],
  },
  {
    id: 'antiretrovirals', name: 'Antiretrovirals', group: 'Other drug class',
    aliases: ['abacavir', 'nevirapine', 'efavirenz', 'zidovudine', 'tenofovir', 'lamivudine', 'atazanavir', 'lopinavir', 'dolutegravir'],
    drugPatterns: ['abacavir', 'navir', 'avirenz', 'zidovudine', 'tefovir', 'ovudine', 'gravir', 'previr'],
    note: 'Abacavir hypersensitivity is a lifelong contraindication - never re-challenge.',
  },
  {
    id: 'antimalarials', name: 'Antimalarials', group: 'Other drug class',
    aliases: ['artesunate', 'artemether', 'artemether + lumefantrine', 'amodiaquine', 'chloroquine', 'quinine', 'mefloquine', 'primaquine', 'sulfadoxine-pyrimethamine', 'fansidar', 'piperaquine', 'dihydroartemisinin'],
    drugPatterns: ['artem', 'quine', 'aquine', 'quinine', 'lumefantrine', 'piperaquine', 'pyrimethamine', 'sulfadox'],
    relatedAllergens: ['sulfonamides'],
    note: 'Fansidar contains sulfadoxine, so it also flags the sulfa caution.',
  },
  {
    id: 'anthelmintics', name: 'Anthelmintics / antiparasitics', group: 'Other drug class',
    aliases: ['albendazole', 'mebendazole', 'levamisole', 'praziquantel', 'ivermectin', 'tiabendazole', 'pyrantel', 'niclosamide', 'diethylcarbamazine', 'metronidazole'],
    drugPatterns: ['dazole', 'praziquantel', 'mectin', 'levamis', 'pyrantel', 'niclosamide', 'carbazine'],
    note: 'Albendazole/mebendazole end in "-dazole" like nitroimidazoles, so a nitroimidazole allergy warns here.',
    relatedAllergens: ['nitroimidazoles'],
  },
  {
    id: 'ACE-inhibitors', name: 'ACE inhibitors', group: 'Other drug class',
    aliases: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'perindopril', 'quinapril', 'fosinopril', 'benazepril'],
    drugPatterns: ['pril$'],
    relatedAllergens: ['ARBs'],
    note: 'Angio-oedema on an ACE inhibitor blocks the class; an ARB is a caution.',
  },
  {
    id: 'ARBs', name: 'Angiotensin receptor blockers', group: 'Other drug class',
    aliases: ['losartan', 'valsartan', 'telmisartan', 'irbesartan', 'candesartan', 'olmesartan'],
    drugPatterns: ['sartan'],
    relatedAllergens: ['ACE-inhibitors'],
  },
  {
    id: 'thiazides', name: 'Thiazide / thiazide-like diuretics', group: 'Other drug class',
    aliases: ['hydrochlorothiazide', 'hydrochlorthiazide', 'bendroflumethiazide', 'indapamide', 'chlorthalidone', 'metolazone'],
    drugPatterns: ['thiazide', 'thiaz', 'indapamide', 'metolazone', 'xipamide'],
    relatedAllergens: ['sulfonamides', 'loop-diuretics'],
  },
  {
    id: 'loop-diuretics', name: 'Loop diuretics', group: 'Other drug class',
    aliases: ['furosemide', 'frusemide', 'bumetanide', 'torasemide', 'piretanide'],
    drugPatterns: ['semide', 'bumetanide', 'torasemide', 'piretanide'],
    relatedAllergens: ['sulfonamides', 'thiazides'],
  },
  {
    id: 'potassium-sparing', name: 'Potassium-sparing diuretics', group: 'Other drug class',
    aliases: ['spironolactone', 'eplerenone', 'amiloride', 'triamterene'],
    drugPatterns: ['spironolact', 'eplerenone', 'amiloride', 'triamterene'],
    relatedAllergens: ['corticosteroids'],
  },
  {
    id: 'sulfonylureas', name: 'Sulfonylureas', group: 'Other drug class',
    aliases: ['glibenclamide', 'glyburide', 'glimepiride', 'gliclazide', 'glipizide', 'tolbutamide'],
    drugPatterns: ['clamide', 'gliclaz', 'glimep', 'glipizide', 'tolbutamide', 'glyburide'],
    relatedAllergens: ['sulfonamides'],
  },
  {
    id: 'biguanides', name: 'Metformin / biguanides', group: 'Other drug class',
    aliases: ['metformin', 'glucophage', 'biguanide'],
    drugPatterns: ['metformin', 'formin'],
  },
  {
    id: 'thiazolidinediones', name: 'Glitazones', group: 'Other drug class',
    aliases: ['pioglitazone', 'rosiglitazone'],
    drugPatterns: ['glitazone'],
  },
  {
    id: 'statins', name: 'Statins', group: 'Other drug class',
    aliases: ['simvastatin', 'atorvastatin', 'pravastatin', 'rosuvastatin', 'fluvastatin', 'pitavastatin'],
    drugPatterns: ['statin', 'prava'],
  },
  {
    id: 'fibrates', name: 'Fibrates', group: 'Other drug class',
    aliases: ['fenofibrate', 'gemfibrozil', 'bezafibrate', 'ciprofibrate'],
    drugPatterns: ['fibrate', 'fibrozil'],
  },
  {
    id: 'beta-blockers', name: 'Beta-blockers', group: 'Other drug class',
    aliases: ['propranolol', 'atenolol', 'metoprolol', 'bisoprolol', 'carvedilol', 'labetalol', 'timolol', 'nebivolol', 'atenolol + hydrochlorthiazide'],
    drugPatterns: ['olol'],
    note: 'Includes timolol eye drops - an eye-drop beta-blocker is still systemic.',
  },
  {
    id: 'calcium-channel-blockers', name: 'Calcium channel blockers', group: 'Other drug class',
    aliases: ['amlodipine', 'nifedipine', 'felodipine', 'levamlodipine', 'diltiazem', 'verapamil', 'nicardipine'],
    drugPatterns: ['dipine', 'diltiazem', 'verapamil'],
  },
  {
    id: 'cardiac-glycosides', name: 'Cardiac glycosides (digoxin)', group: 'Other drug class',
    aliases: ['digoxin', 'digitoxin', 'lanatoside'],
    drugPatterns: ['digox', 'digitox', 'lanatosid'],
  },
  {
    id: 'antiarrhythmics', name: 'Antiarrhythmics', group: 'Other drug class',
    aliases: ['amiodarone', 'adenosine', 'disopyramide', 'flecainide', 'lignocaine', 'verapamil', 'ivabradine', 'sotalol'],
    drugPatterns: ['amiodarone', 'adenosine', 'pyramide', 'cainide', 'bradine', 'sotalol'],
    relatedAllergens: ['beta-blockers', 'iodine-contrast'],
    note: 'Amiodarone carries a large iodine load - relevant to a contrast/iodine history.',
  },
  {
    id: 'vasodilators', name: 'Nitrates / vasodilators', group: 'Other drug class',
    aliases: ['nitroglycerin', 'glyceryl trinitrate', 'GTN', 'isosorbide dinitrate', 'hydralazine', 'minoxidil', 'prazosin', 'terazosin'],
    drugPatterns: ['nitroglyc', 'trinitrate', 'isosorbide', 'dinitrate', 'hydralazine', 'minoxidil', 'zosin'],
  },
  {
    id: 'antiplatelets', name: 'Antiplatelets', group: 'Other drug class',
    // "aspirin" is deliberately not an alias here: it has its own allergen, and listing it made an
    // aspirin reaction resolve onto this class, which blocked clopidogrel as a false positive.
    aliases: ['clopidogrel', 'ticagrelor', 'prasugrel', 'dipyridamole'],
    drugPatterns: ['grel', 'dipyridamole', 'prasugrel'],
    relatedAllergens: ['aspirin'],
  },
  {
    id: 'vitamin-k-antagonists', name: 'Warfarin / coumarins', group: 'Other drug class',
    aliases: ['warfarin', 'acenocoumarol', 'nicoumalone', 'phenindione'],
    drugPatterns: ['warfarin', 'coumarol', 'nicoumal', 'phenindione'],
  },
  {
    id: 'heparins', name: 'Heparins / LMWH', group: 'Other drug class',
    aliases: ['heparin', 'enoxaparin', 'clexane', 'dalteparin', 'tinzaparin', 'fondaparinux'],
    drugPatterns: ['heparin', 'parin', 'parinux', 'clexane'],
    note: 'A heparin history includes HIT, so every LMWH is blocked too.',
  },
  {
    id: 'antifibrinolytics', name: 'Tranexamic acid', group: 'Other drug class',
    aliases: ['tranexamic', 'cyklokapron', 'amicar', 'aminocaproic'],
    drugPatterns: ['tranexamic', 'aminocaproic', 'kapron'],
  },
  {
    id: 'thrombolytics', name: 'Thrombolytics', group: 'Other drug class',
    aliases: ['streptokinase', 'alteplase', 'tenecteplase', 'urokinase'],
    drugPatterns: ['streptokinase', 'plase', 'urokinase'],
    note: 'Streptokinase must not be repeated within 12 months even without a previous reaction.',
  },
  {
    id: 'protamine', name: 'Protamine', group: 'Other drug class',
    aliases: ['protamine', 'protamine sulphate'],
    drugPatterns: ['protamine'],
    relatedAllergens: ['insulin'],
    note: 'Protamine allergy also rules out NPH/isophane insulin, which contains protamine.',
  },
  {
    id: 'insulin', name: 'Insulin', group: 'Other drug class',
    aliases: ['insulin', 'isophane insulin', 'insulin premixed', 'soluble insulin', 'NPH', 'glargine', 'aspart'],
    drugPatterns: ['insulin', 'isophane', 'glargine', 'aspart'],
    relatedAllergens: ['protamine'],
  },
  {
    id: 'glucagon', name: 'Glucagon / octapeptides', group: 'Other drug class',
    aliases: ['glucagon', 'octreotide', 'somatostatin'],
    drugPatterns: ['glucagon', 'octreotide', 'somatostatin'],
  },
  {
    id: 'aromatic-anticonvulsants', name: 'Aromatic anticonvulsants', group: 'Other drug class',
    aliases: ['carbamazepine', 'phenytoin', 'phenobarbital', 'phenobarbitone', 'primidone', 'oxcarbazepine', 'lamotrigine', 'fosphenytoin', 'ethosuximide'],
    drugPatterns: ['carbamazepine', 'carbamaz', 'phenytoin', 'phenyto', 'barbital', 'barbitone', 'primidone', 'oxcarbazepine', 'lamotrigine', 'ethosuximide', 'epilex', 'dilantin', 'tegretol', 'lamictal'],
    note: 'A rash from any of these (SJS/TEN risk) blocks the whole group, including phenobarbital for seizures.',
  },
  {
    id: 'other-anticonvulsants', name: 'Other anticonvulsants', group: 'Other drug class',
    aliases: ['sodium valproate', 'valproic acid', 'valproate', 'levetiracetam', 'topiramate', 'gabapentin', 'pregabalin', 'clonazepam'],
    drugPatterns: ['valproate', 'valproic', 'levetiracetam', 'piracetam', 'gabentin', 'gabapen', 'pabalin', 'topiramate'],
    relatedAllergens: ['aromatic-anticonvulsants'],
  },
  {
    id: 'benzodiazepines', name: 'Benzodiazepines', group: 'Other drug class',
    aliases: ['diazepam', 'lorazepam', 'midazolam', 'clonazepam', 'nitrazepam', 'temazepam', 'alprazolam', 'oxazepam'],
    drugPatterns: ['zepam', 'zolam', 'midazol', 'dormicum', 'valium'],
    note: 'Some rectal diazepam tubes are in arachis (peanut) oil - check the product, see the excipient entry.',
    relatedAllergens: ['excipients'],
  },
  {
    id: 'tricyclics', name: 'Tricyclic antidepressants', group: 'Other drug class',
    aliases: ['amitriptyline', 'imipramine', 'nortriptyline', 'clomipramine', 'dosulepin'],
    drugPatterns: ['triptyline', 'ipramine', 'dosulepin'],
  },
  {
    id: 'ssri', name: 'SSRIs / SNRIs', group: 'Other drug class',
    aliases: ['fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram', 'venlafaxine', 'duloxetine', 'fluoxetina'],
    drugPatterns: ['oxetine', 'traline', 'ctalopram', 'lafaxine'],
  },
  {
    id: 'phenothiazines', name: 'Phenothiazines', group: 'Other drug class',
    aliases: ['chlorpromazine', 'promethazine', 'prochlorperazine', 'trifluoperazine', 'fluphenazine', 'perphenazine', 'thiethylperazine'],
    drugPatterns: ['promazine', 'perazine', 'promethazine', 'phazine'],
    note: 'Covers both the antipsychotic and the antihistamine phenothiazines ( Largactil and Phenergan ).',
  },
  {
    id: 'butyrophenones', name: 'Butyrophenones / atypical antipsychotics', group: 'Other drug class',
    aliases: ['haloperidol', 'risperidone', 'olanzapine', 'quetiapine', 'flupentixol', 'amisulpride', 'aripiprazole', 'clozapine', 'pimozide'],
    drugPatterns: ['peridol', 'ridone', 'zapine', 'iapine', 'tixol', 'sulpride', 'piprazole', 'clozapine', 'pimozide'],
  },
  {
    id: 'lithium', name: 'Lithium', group: 'Other drug class',
    aliases: ['lithium', 'lithium carbonate'],
    drugPatterns: ['lithium'],
  },
  {
    id: 'xanthines', name: 'Xanthines', group: 'Other drug class',
    aliases: ['theophylline', 'aminophylline', 'doxapram', 'caffeine'],
    drugPatterns: ['phylline', 'phyllin', 'doxapram', 'cafein'],
  },
  {
    id: 'allopurinol', name: 'Allopurinol / urate drugs', group: 'Other drug class',
    aliases: ['allopurinol', 'febuxostat', 'colchicine', 'rasburicase'],
    drugPatterns: ['allopurinol', 'purinol', 'febuxostat', 'colchicine', 'rasburicase'],
    note: 'Allopurinol rash can progress to DRESS/SJS - do not re-challenge.',
  },
  {
    id: 'ppi', name: 'Proton pump inhibitors', group: 'Other drug class',
    aliases: ['omeprazole', 'pantoprazole', 'lansoprazole', 'esomeprazole', 'rabeprazole'],
    drugPatterns: ['prazole'],
  },
  {
    id: 'h2-blockers', name: 'H2 blockers', group: 'Other drug class',
    aliases: ['ranitidine', 'famotidine', 'cimetidine', 'nizatidine'],
    drugPatterns: ['tidine'],
  },
  {
    id: 'antiemetics', name: 'Antiemetics', group: 'Other drug class',
    aliases: ['ondansetron', 'granisetron', 'metoclopramide', 'domperidone', 'cyclizine', 'dimenhydrinate', 'meclizine'],
    drugPatterns: ['setron', 'clopramide', 'domperidone', 'clizine', 'hydrinate'],
  },
  {
    id: 'antihistamines', name: 'Antihistamines', group: 'Other drug class',
    aliases: ['chlorpheniramine', 'chlorphenamine', 'dexchlorpheniramine', 'pheniramine', 'cetirizine', 'levocetirizine', 'loratadine', 'desloratadine', 'fexofenadine', 'hydroxyzine', 'triprolidine', 'acrivastine', 'antazoline', 'clemastine'],
    drugPatterns: ['irizine', 'tadine', 'fenadine', 'xyzine', 'polidine', 'pheniramine', 'clestine'],
    note: 'The first-generation antihistamines are the usual culprits; cetirizine and loratadine are matched too.',
  },
  {
    id: 'sympathomimetics', name: 'Adrenaline / ephedrine / bronchodilators', group: 'Other drug class',
    aliases: ['adrenaline', 'epinephrine', 'noradrenaline', 'norepinephrine', 'ephedrine', 'pseudoephedrine', 'salbutamol', 'ventolin', 'terbutaline', 'salmeterol', 'formoterol', 'isoprenaline', 'dobutamine', 'dopamine'],
    drugPatterns: ['salbut', 'terol', 'ephrine', 'nephrine', 'butamine', 'renaline', 'isoprenal', 'dopamine'],
  },
  {
    id: 'antispasmodics', name: 'Antispasmodics', group: 'Other drug class',
    aliases: ['hyoscine', 'scopolamine', 'dicyclomine', 'mebeverine', 'papaverine', 'alverine', 'oxybutynin'],
    drugPatterns: ['oscine', 'polamine', 'cyclomine', 'mebeverine', 'apaverine', 'lverine', 'butynin'],
  },
  {
    id: 'anticholinergics', name: 'Anticholinergics', group: 'Other drug class',
    aliases: ['atropine', 'ipratropium', 'tiotropium', 'propantheline', 'benzhexol', 'trihexyphenidyl', 'procyclidine', 'biperiden', 'pirenzepine', 'hyoscine'],
    drugPatterns: ['tropium', 'atropine', 'theline', 'benzhexol', 'phenidyl', 'cyclidine', 'iperiden', 'pirenzepine'],
  },
  {
    id: 'hormones', name: 'Oestrogens / progestogens / androgens', group: 'Other drug class',
    aliases: ['medroxyprogesterone', 'depo', 'norethisterone', 'levonorgestrel', 'ethinylestradiol', 'conjugated oestrogen', 'estradiol', 'diethylstilboestrol', 'testosterone', 'finasteride', 'dutasteride'],
    drugPatterns: ['gesterone', 'gestrel', 'estradiol', 'oestrogen', 'estrogen', 'norethisterone', 'stilboestrol', 'testosterone', 'teride', 'finasteride'],
  },
  {
    id: 'uterotonics', name: 'Oxytocics', group: 'Other drug class',
    aliases: ['oxytocin', 'ergometrine', 'methylergometrine', 'misoprostol', 'ergotamine', 'carboprost'],
    drugPatterns: ['oxytocin', 'ergometrine', 'ergot', 'moprost', 'carboprost', 'synto'],
  },
  {
    id: 'antithyroid', name: 'Antithyroid drugs', group: 'Other drug class',
    aliases: ['carbimazole', 'propylthiouracil', 'PTU', 'methimazole', 'potassium iodide'],
    drugPatterns: ['carbimazole', 'methimazole', 'thiouracil', 'mazol'],
  },
  {
    id: 'thyroid-hormone', name: 'Thyroid hormone', group: 'Other drug class',
    aliases: ['levothyroxine', 'liothyronine', 'thyroxine'],
    drugPatterns: ['thyrox', 'liothyro', 'eltrox', 'synthroid'],
  },
  {
    id: 'muscle-relaxants', name: 'Muscle relaxants / antigout adjuncts', group: 'Other drug class',
    aliases: ['baclofen', 'thiocolchicoside', 'chlorzoxazone', 'cyclobenzaprine', 'tolperisone', 'orphenadrine', 'methocarbamol'],
    drugPatterns: ['baclofen', 'colchicoside', 'zoxazone', 'zaprine', 'perisone', 'orphenadrine', 'ocarbamol'],
  },
  {
    id: 'platinum-cytotoxics', name: 'Platinum chemotherapy', group: 'Other drug class',
    aliases: ['cisplatin', 'carboplatin', 'oxaliplatin'],
    drugPatterns: ['platin'],
    relatedAllergens: ['metals'],
  },
  {
    id: 'cytotoxics', name: 'Other cytotoxics', group: 'Other drug class',
    aliases: ['methotrexate', 'cyclophosphamide', 'doxorubicin', 'adriamycin', 'vincristine', 'paclitaxel', 'docetaxel', 'etoposide', 'capecitabine', 'hydroxyurea', 'actinomycin D', 'tamoxifen', 'anastrozole', 'rituximab', 'bleomycin', 'ifosfamide', 'fluorouracil'],
    drugPatterns: ['methotrex', 'trexate', 'phosphamide', 'orubicin', 'adriamycin', 'blastine', 'cristine', 'taxel', 'poside', 'citabine', 'hydroxyurea', 'actinomycin', 'uracil', 'bleomycin', 'imab', 'mustine', 'treosulfan'],
    relatedAllergens: ['platinum-cytotoxics'],
    note: 'Enumerated by molecule because "-mycin"/"-cycline" endings are shared with antibiotics.',
  },
  {
    id: 'immunosuppressants', name: 'Immunosuppressants', group: 'Other drug class',
    aliases: ['ciclosporin', 'cyclosporin', 'tacrolimus', 'azathioprine', 'mycophenolate', 'sirolimus', 'methotrexate'],
    drugPatterns: ['sporin$', 'rolimus', 'athioprine', 'mycophen'],
    relatedAllergens: ['cytotoxics'],
  },
  {
    id: 'biologics', name: 'Monoclonal antibodies', group: 'Other drug class',
    aliases: ['rituximab', 'infliximab', 'adalimumab', 'omalizumab', 'bevacizumab', 'trastuzumab'],
    drugPatterns: ['umab'],
  },
  {
    id: 'immune-sera', name: 'Antivenom / antisera / immunoglobulin', group: 'Other drug class',
    aliases: ['antivenom', 'anti-snake venom', 'ASV', 'anti tetanus serum', 'tetanus antitoxin', 'rabies immunoglobulin', 'anti-RH', 'immunoglobulin', 'horse serum', 'antitoxin', 'ARV serum'],
    drugPatterns: ['serum', 'immunoglobulin', 'antivenom', 'antitoxin', 'antivenin', 'globulin'],
    note: 'Animal-protein sera (ATS, snake antivenom) are the commonest anaphylaxis trigger here - always record the exact product.',
  },
  {
    id: 'vaccines', name: 'Vaccines & toxoids', group: 'Other drug class',
    aliases: ['vaccine', 'tetanus toxoid', 'TT', 'yellow fever', 'measles vaccine', 'BCG', 'oral polio', 'OPV', 'hepatitis B vaccine', 'influenza vaccine', 'rabies vaccine', 'pentavalent', 'rotavirus', 'pneumococcal', 'meningococcal'],
    drugPatterns: ['vaccine', 'toxoid', 'BCG', 'polio', 'measles', 'vax'],
    relatedAllergens: ['eggs'],
    note: 'Yellow fever and influenza vaccines are egg-derived; a severe egg allergy is a vaccination contraindication.',
  },
  {
    id: 'iron', name: 'Iron preparations', group: 'Other drug class',
    aliases: ['iron', 'ferrous', 'iron dextran', 'iron sucrose', 'ferric', 'polymaltose'],
    drugPatterns: ['ferrous', 'ferric', 'iron', 'haemoglobin', 'hemin'],
    note: 'Parenteral iron (dextran) is the one that causes anaphylaxis; oral ferrous sulphate reactions are usually intolerance.',
  },

  // ══ Non-drug ═══════════════════════════════════════════════════════════════
  {
    id: 'local-antiseptics', name: 'Chlorhexidine & antiseptics', group: 'Non-drug',
    aliases: ['chlorhexidine', 'hibitane', 'savlon', 'cetrimide', 'hydrogen peroxide', 'sodium hypochlorite', 'Dakin', 'hexetidine', 'benzalkonium', 'alcohol', 'spirit'],
    drugPatterns: ['chlorhexidine', 'hexidine', 'cetrimide', 'peroxide', 'hypochlorite', 'benzalkonium', 'hexetidine', 'chloroxylenol', 'surgical spirit', 'methylated spirit'],
    relatedAllergens: ['iodine-contrast'],
    note: 'Chlorhexidine hides in mouth wash, wound wash, catheter lubricant and surgical scrub - read the label, not just the trade name.',
  },
  {
    // Split out of local-antiseptics: an iodine reaction must not block chlorhexidine or peroxide,
    // which contain no iodine, and must not block every contrast agent either.
    id: 'iodine-antiseptics', name: 'Iodine antiseptics (povidone-iodine)', group: 'Non-drug',
    aliases: ['iodine', 'povidone iodine', 'povidone-iodine', 'betadine', 'isodine', 'iodophor', 'aqueous iodine'],
    drugPatterns: ['povidone', 'betadine', 'iodophor', 'pvp-iodine', '^iodine'],
    relatedAllergens: ['iodine-contrast'],
    note: 'Povidone-iodine, betadine and any iodine-containing scrub or swab.',
  },
  {
    id: 'iodine-contrast', name: 'Iodinated contrast media', group: 'Non-drug',
    aliases: ['contrast', 'iohexol', 'omnipaque', 'diatrizoate', 'urografin', 'gastrografin', 'iodine', 'shellfish'],
    drugPatterns: ['iohexol', 'iodixanol', 'opamidol', 'iatrol', 'ioxaglate', 'italamox', 'omnipaque', 'urografin', 'gastrografin', 'visipaque', 'hexabrix', 'contrast'],
    relatedAllergens: ['local-antiseptics'],
    note: 'Shellfish/iodine "allergy" is not a true contrast contraindication, but a previous contrast reaction is.',
  },
  {
    id: 'gadolinium', name: 'MRI gadolinium contrast', group: 'Non-drug',
    aliases: ['gadolinium', 'mri contrast', 'gadovist', 'dotarem'],
    drugPatterns: ['gado'],
  },
  {
    id: 'latex', name: 'Latex', group: 'Non-drug',
    aliases: ['latex', 'rubber', 'gloves', 'condom', 'catheter balloon', 'natural rubber'],
    drugPatterns: ['latex'],
    relatedAllergens: ['banana', 'avocado', 'chestnut', 'kiwi'],
    note: 'Flag before theatre, delivery and catheterisation; use latex-free gloves and adhesives.',
  },
  {
    id: 'adhesives', name: 'Adhesive plaster / colophony', group: 'Non-drug',
    aliases: ['plaster', 'adhesive', 'micropore', 'leukoplast', 'colophony', 'rosin', 'tape', 'bandage adhesive'],
    drugPatterns: ['plaster', 'colophony', 'rosin'],
    relatedAllergens: ['metals'],
  },
  {
    id: 'metals', name: 'Nickel / cobalt / chrome / implant metals', group: 'Non-drug',
    aliases: ['nickel', 'cobalt', 'chrome', 'metal', 'stainless steel', 'implant', 'dental amalgam', 'titanium'],
    drugPatterns: ['nickel', 'cobalt', 'amalgam'],
  },
  {
    id: 'excipients', name: 'Excipients (arachis oil, benzyl alcohol, parabens, sulfites)', group: 'Non-drug',
    aliases: ['peanut oil', 'arachis oil', 'benzyl alcohol', 'paraben', 'sulfite', 'metabisulfite', 'polysorbate', 'propylene glycol', 'lactose', 'tartrazine', 'soy lecithin', 'carmellose'],
    drugPatterns: ['arachis', 'peanut oil', 'benzyl alcohol', 'paraben', 'sulfite', 'bisulfite', 'polysorbate', 'sorbitan', 'tartrazine', 'propylene glycol', 'lecithin'],
    relatedAllergens: ['peanuts', 'soya'],
    note: 'Rectal diazepam tubes and some injectables are in arachis (peanut) oil; propofol carries soy lecithin.',
  },
  {
    id: 'eggs', name: 'Eggs / chicken protein', group: 'Non-drug',
    aliases: ['egg', 'ovalbumin', 'chicken', 'feather'],
    drugPatterns: ['egg', 'ovalbumin'],
    relatedAllergens: ['vaccines'],
  },
  {
    id: 'milk', name: 'Cow’s milk protein', group: 'Non-drug',
    aliases: ['milk', 'casein', 'whey', 'lactalbumin'],
    drugPatterns: ['milk', 'casein', 'whey'],
  },
  {
    id: 'peanuts', name: 'Peanuts / groundnut', group: 'Non-drug',
    aliases: ['peanut', 'groundnut', 'arachis'],
    drugPatterns: ['peanut', 'groundnut', 'arachis'],
    relatedAllergens: ['tree-nuts', 'excipients', 'latex'],
  },
  {
    id: 'tree-nuts', name: 'Tree nuts', group: 'Non-drug',
    aliases: ['tree nut', 'cashew', 'almond', 'walnut', 'pistachio', 'hazelnut', 'pecan', 'shea', 'macadamia', 'brazil nut'],
    drugPatterns: ['cashew', 'almond', 'walnut', 'pistachio', 'hazelnut', 'pecan', 'shea', 'macadamia', 'nut'],
    relatedAllergens: ['peanuts', 'latex'],
  },
  {
    id: 'shellfish', name: 'Shellfish / crustaceans', group: 'Non-drug',
    aliases: ['shellfish', 'crab', 'shrimp', 'prawn', 'lobster', 'crustacean', 'mollusc', 'snail', 'conch'],
    drugPatterns: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'crustacean', 'mollusc'],
    relatedAllergens: ['iodine-contrast'],
  },
  {
    id: 'fish', name: 'Fish', group: 'Non-drug',
    aliases: ['fish', 'fish oil', 'omega 3', 'cod', 'tuna', 'sardine'],
    drugPatterns: ['fish', 'salmon', 'tuna', 'cod ', 'sardine'],
    relatedAllergens: ['shellfish'],
  },
  {
    id: 'soya', name: 'Soya / soy', group: 'Non-drug',
    aliases: ['soya', 'soy', 'soybean', 'tofu', 'lecithin'],
    drugPatterns: ['soy', 'soya'],
    relatedAllergens: ['excipients', 'peanuts'],
  },
  {
    id: 'wheat', name: 'Wheat / gluten', group: 'Non-drug',
    aliases: ['wheat', 'gluten', 'coeliac', 'barley', 'rye', 'oats'],
    drugPatterns: ['wheat', 'gluten', 'barley', 'rye'],
  },
  {
    id: 'banana', name: 'Banana', group: 'Non-drug',
    aliases: ['banana', 'plantain', 'kiwi', 'avocado'],
    drugPatterns: ['banana'],
    relatedAllergens: ['latex'],
  },
  {
    id: 'avocado', name: 'Avocado', group: 'Non-drug',
    aliases: ['avocado', 'chestnut'],
    drugPatterns: ['avocado'],
    relatedAllergens: ['latex'],
  },
  {
    id: 'chestnut', name: 'Chestnut', group: 'Non-drug',
    aliases: ['chestnut'],
    drugPatterns: ['chestnut'],
    relatedAllergens: ['latex'],
  },
  {
    id: 'kiwi', name: 'Kiwi / strawberry / citrus', group: 'Non-drug',
    aliases: ['kiwi', 'strawberry', 'citrus', 'orange', 'lemon', 'tomato'],
    drugPatterns: ['kiwi', 'strawberry', 'citrus', 'orange', 'lemon'],
    relatedAllergens: ['latex'],
  },
  {
    id: 'herbal', name: 'Herbal / traditional preparations', group: 'Non-drug',
    aliases: ['herbal', 'traditional medicine', 'herb', 'moringa', 'neem', 'garlic', 'turmeric', 'ginseng', 'ashwagandha', 'bilberry', 'echinacea', 'valerian', 'senna'],
    drugPatterns: ['herb', 'moringa', 'neem', 'turmeric', 'ginseng', 'ashwagandha', 'bilberry', 'echinacea', 'valerian', 'rhodiola', 'primrose', 'thistle', 'extract', 'root'],
    note: 'Herbal preparations are the least predictable - record the exact product, not "herbs".',
  },
  {
    id: 'supplements', name: 'Vitamins / mineral supplements', group: 'Non-drug',
    aliases: ['multivitamin', 'vitamin', 'mineral', 'probiotic', 'zinc', 'selenium', 'biotin', 'folate', 'folic', 'thiamine', 'ascorbic', 'collagen', 'glucosamine', 'chondroitin', 'coenzyme', 'omega', 'lutein', 'cranberry', 'amino acid', 'lysine', 'carnitine', 'melatonin', 'MSM'],
    drugPatterns: ['vitamin', 'multivit', 'probiotic', 'zinc', 'selenium', 'biotin', 'folate', 'folic', 'thiamine', 'ascorbic', 'collagen', 'glucosamine', 'chondroitin', 'coenzyme', 'lutein', 'zeaxanthin', 'carnitine', 'lysine', 'melatonin', 'methylsulfonyl', 'lipoic', 'resveratrol', 'quercetin', 'pycnogenol', 'cranberry', 'mannose', 'picolinate'],
    relatedAllergens: ['herbal', 'fish'],
    note: 'The mineral salts (zinc, magnesium, iron sulphates) are frequent contact sensitisers in creams and drops.',
  },
  {
    id: 'blood-products', name: 'Blood products / plasma expanders', group: 'Non-drug',
    aliases: ['blood transfusion', 'albumin', 'plasma', 'platelets', 'dextran', 'gelatin', 'starch', 'hetastarch'],
    drugPatterns: ['albumin', 'dextran', 'gelatin', 'starch', 'plasma'],
  },
  {
    id: 'dust-mould', name: 'Dust mite / mould / pollen / dander', group: 'Non-drug',
    aliases: ['dust', 'mite', 'house dust', 'pollen', 'mould', 'grass', 'animal dander', 'cockroach'],
    drugPatterns: [],
  },
  {
    id: 'cosmetics', name: 'Cosmetics / dyes / fragrances', group: 'Non-drug',
    aliases: ['fragrance', 'perfume', 'dye', 'colouring', 'parfum', 'lanolin', 'cocoa butter', 'shea butter'],
    drugPatterns: ['lanolin', 'fragrance', 'parfum', 'cocoa butter', 'shea butter', 'carmoisine'],
    relatedAllergens: ['adhesives', 'metals'],
  },
  {
    id: 'radiotherapy', name: 'Radiotherapy', group: 'Non-drug',
    aliases: ['radiotherapy', 'radiation'],
    drugPatterns: [],
    relatedAllergens: ['iodine-contrast'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUPS
// ═══════════════════════════════════════════════════════════════════════════════

const BY_ID = new Map<string, Allergen>(ALLERGENS.map((a) => [a.id, a]));

export const getAllergen = (id: string): Allergen | undefined => BY_ID.get(id);

/** Catalog entries a stocked drug belongs to, by class pattern. */
export const allergensForDrug = (drugName?: string | null): Allergen[] => {
  const drug = norm(drugName);
  if (!drug) return [];
  return ALLERGENS.filter((a) => (a.drugPatterns || []).some((p) => matchesDrug(norm(p), drug)));
};

/**
 * Which catalog entries a recorded allergy text refers to. A typed value that matches a drug
 * pattern counts too, so "Amoxicillin" resolves to Penicillins even though it is not an alias.
 */
export const resolveAllergenText = (text?: string | null): Allergen[] => {
  const value = norm(text);
  if (value.length < 2) return [];
  const found = ALLERGENS.filter((a) => {
    const name = norm(a.name);
    if (name === value || name.includes(value) || value.includes(name)) return true;
    if ((a.aliases || []).some((aliasRaw) => {
      const alias = norm(aliasRaw);
      return alias === value || value.includes(alias) || (alias.includes(value) && value.length >= 4);
    })) return true;
    return (a.drugPatterns || []).some((p) => matchesDrug(norm(p), value));
  });
  return found;
};

export type ClashLevel = 'contraindicated' | 'caution';

export interface AllergenClash {
  allergen: Allergen;
  level: ClashLevel;
  /** The recorded allergy row that produced this clash. */
  recordedAs: string;
  /** Why it clashes - shown to the prescriber. */
  reason: string;
}

/**
 * The rule: does this drug clash with this patient's recorded allergies?
 * Direct class membership is a contraindication; a cross-reactive class is a caution.
 * A recorded allergy the catalog does not know still blocks on a plain text match, so an
 * allergen added as free text is not silently unprotected.
 */
export const findContraindications = (
  allergies: Array<{ allergen?: string | null; reaction?: string | null; severity?: string | null }> | undefined | null,
  drugName?: string | null,
): AllergenClash[] => {
  const drug = norm(drugName);
  if (!drug || !Array.isArray(allergies) || allergies.length === 0) return [];

  const drugClasses = allergensForDrug(drug);
  const drugClassIds = new Set(drugClasses.map((a) => a.id));
  const out: AllergenClash[] = [];
  const seen = new Set<string>();
  const key = (allergenId: string, recordedAs: string, level: ClashLevel) => `${allergenId}|${recordedAs}|${level}`;

  for (const entry of allergies) {
    const recordedAs = String(entry?.allergen || '').trim();
    const value = norm(recordedAs);
    if (value.length < 2) continue;

    // 1. direct: the drug sits in a class the recorded allergy resolves to
    const resolved = resolveAllergenText(recordedAs);
    for (const allergen of resolved) {
      if (drugClassIds.has(allergen.id)) {
        const id = key(allergen.id, recordedAs, 'contraindicated');
        if (!seen.has(id)) {
          seen.add(id);
          out.push({
            allergen, level: 'contraindicated', recordedAs,
            reason: `${drug} belongs to the ${allergen.name} class, which this patient is allergic to.`,
          });
        }
      }
    }

    // 2. plain text overlap, for allergens the catalog does not know
    const overlaps = value.length >= 4 && (drug.includes(value) || value.includes(drug));
    if (overlaps) {
      const id = key('__text__', recordedAs, 'contraindicated');
      if (!seen.has(id)) {
        seen.add(id);
        out.push({
          allergen: { id: '__text__', name: recordedAs, group: 'Other drug class' },
          level: 'contraindicated', recordedAs,
          reason: `The drug name contains the recorded allergy "${recordedAs}".`,
        });
      }
    }

    // 3. cross-reactive classes warn, they never block
    for (const allergen of resolved) {
      for (const relatedId of allergen.relatedAllergens || []) {
        if (!drugClassIds.has(relatedId)) continue;
        const related = getAllergen(relatedId);
        if (!related) continue;
        const id = key(related.id, recordedAs, 'caution');
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          allergen: related, level: 'caution', recordedAs,
          reason: `${drug} is a ${related.name.toLowerCase()}; it can cross-react with ${allergen.name}, which this patient is allergic to.`,
        });
      }
    }
  }

  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'contraindicated' ? -1 : 1));
};

/** True when any clash is a direct class match, i.e. prescribing must be blocked. */
export const isBlocked = (clashes: AllergenClash[]): boolean =>
  clashes.some((c) => c.level === 'contraindicated');

// ═══════════════════════════════════════════════════════════════════════════════
// PICKER SUPPORT - same shape as searchComplaints() in data/complaints.ts
// ═══════════════════════════════════════════════════════════════════════════════

const haystack = (a: Allergen): string =>
  [a.name, ...(a.aliases || [])].map(norm).join(' | ');

export const searchAllergens = (searchTerm: string, limit = 8): Allergen[] => {
  const term = norm(searchTerm);
  if (!term) {
    // nothing typed yet: show the ones a prescriber most often needs
    const popular = ['penicillins', 'cephalosporins', 'sulfonamides', 'nsaids', 'aspirin', 'amide-anaesthetics', 'corticosteroids', 'latex', 'iodine-contrast', 'local-antiseptics', 'eggs', 'peanuts'];
    return popular.map(getAllergen).filter((a): a is Allergen => !!a);
  }
  const exact = ALLERGENS.filter((a) => norm(a.name) === term);
  const startsWith = ALLERGENS.filter((a) => norm(a.name).startsWith(term) && norm(a.name) !== term);
  const contains = ALLERGENS.filter((a) => norm(a.name).includes(term) && !norm(a.name).startsWith(term));
  const alias = ALLERGENS.filter((a) => {
    const h = haystack(a);
    return !norm(a.name).includes(term) && (h.includes(term) || term.includes(norm(a.name)));
  });
  return [...exact, ...startsWith, ...contains, ...alias].slice(0, limit);
};

export const ALLERGEN_GROUPS: AllergenGroup[] = ['Antibiotic', 'Other drug class', 'Non-drug'];

export const allergensByGroup = (): Array<{ group: AllergenGroup; items: Allergen[] }> =>
  ALLERGEN_GROUPS
    .map((group) => ({ group, items: ALLERGENS.filter((a) => a.group === group) }))
    .filter((section) => section.items.length > 0);
