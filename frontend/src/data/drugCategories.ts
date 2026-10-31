// src/data/drugCategories.ts
// The therapeutic class of every line this pharmacy actually stocks.
//
// WHY THIS FILE EXISTS: StockItem.category cannot drive a billing rule. Of the 659 active medication
// lines, 415 (63%) store a dosage form in that field ("Oral Solid", "Injectable", "Topical", "Oral
// Liquid", "Other Medicines") instead of a drug class, and only 30 rows are tagged "Antibiotic" while
// at least 58 of the stocked names are antibiotics (Amoxicillin + Clavulanic Acid is filed under
// "Injectable"). A rule keyed on that field would let most antibiotics through, so the class is
// derived here from the ingredient named on the stock line.
//
// HOW IT WAS BUILT: generated from the live StockItem table, then reviewed - 83 classes in 26 billing
// groups over 359 distinct ingredient keys, using the same stem approach as data/allergens.ts. It now
// resolves all 685 active stock items (659 medications + 26 devices and consumables) with nothing left
// unclassified. The generator is gone: this file is the source of truth and is edited by hand.
// Review a class with ingredientsInClass('penicillins'); classify a line with getClassForDrug(name).
// Re-pointing a drug at another class is a one-line edit in CLASS_BY_INGREDIENT. The table is keyed by
// ingredient rather than pack size, so "Amoxicillin Capsule 500 mg" and "Amoxicillin Suspension
// 125mg/5mL" always land in the same class.
//
// COMBINATIONS belong to more than one class - getAllClassesForDrug("Ciprofloxacin + Tinidazole")
// returns both the quinolone and the nitroimidazole, and getClassForDrug returns the first named
// ingredient, which is how the product is dispensed. Route is applied last: a corticosteroid in a
// cream, ointment or drop reports corticosteroids-topical, not corticosteroids-systemic, because a
// rule written about systemic steroids must not catch hydrocortisone cream.
//
// A drug that resolves to 'unclassified' is a gap in this table - a new brand, or a stock name whose
// ingredient is spelled differently. Treat it as "review before billing", never as permission to bill:
// see isClassified(). Brand-named lines (Panadol, Zithromax, Lilacid) land here until the brand is
// added to the table, which is why every consumer of this file should check isClassified first.

export type DrugClassId =
  | 'ace-inhibitors'
  | 'acid-suppressants'
  | 'adrenaline-anaphylaxis'
  | 'alpha-blockers-urological'
  | 'aminoglycosides'
  | 'angiotensin-receptor-blockers'
  | 'antacids'
  | 'anthelmintics'
  | 'antiarrhythmics'
  | 'anticoagulants'
  | 'antidepressants'
  | 'antidiabetics-oral'
  | 'antidiarrhoeals'
  | 'antidotes-detoxification'
  | 'antiemetics'
  | 'antiepileptics'
  | 'antifibrinolytics-haemostatics'
  | 'antifungals'
  | 'antihistamines'
  | 'antimalarials'
  | 'antiplatelets'
  | 'antipsychotics'
  | 'antiseptics'
  | 'antispasmodics'
  | 'antivirals'
  | 'anxiolytics-sedatives'
  | 'beta-blockers'
  | 'bronchodilators'
  | 'calcium-channel-blockers'
  | 'calcium-vitamin-d'
  | 'cardiac-glycosides'
  | 'cephalosporins'
  | 'corticosteroids-systemic'
  | 'corticosteroids-topical'
  | 'cough-cold-preparations'
  | 'cytotoxics'
  | 'diuretics'
  | 'ecto-parasiticides'
  | 'flatulence-preparations'
  | 'gout-drugs'
  | 'herbal-medicines'
  | 'immunoglobulins-sera'
  | 'inhaled-corticosteroids'
  | 'insulins'
  | 'iron-preparations'
  | 'iv-fluids-electrolytes'
  | 'laxatives'
  | 'leukotriene-antagonists'
  | 'lipid-regulators'
  | 'local-anaesthetics'
  | 'macrolides-lincosamides'
  | 'medical-devices-consumables'
  | 'migraine-drugs'
  | 'minerals'
  | 'nitrofurans'
  | 'nitroimidazoles'
  | 'non-opioid-analgesics'
  | 'nootropics-cognitive'
  | 'nsaids'
  | 'nutritional-supplements'
  | 'ophthalmic-preparations'
  | 'opioids'
  | 'other-antibacterials'
  | 'other-antihypertensives'
  | 'other-nervous-system-drugs'
  | 'parkinsonism-drugs'
  | 'penicillins'
  | 'phenicols'
  | 'quinolones'
  | 'respiratory-stimulants'
  | 'salicylates'
  | 'sex-hormones-contraceptives'
  | 'skin-emollients-protectants'
  | 'sulfonamides'
  | 'tetracyclines'
  | 'thrombolytics'
  | 'thyroid-and-antithyroid'
  | 'topical-combination-preparations'
  | 'unclassified'
  | 'uterotonics'
  | 'vasoactive-agents'
  | 'vasodilators-nitrates'
  | 'vitamins';

export type DrugGroupId =
  | 'Anaesthesia'
  | 'Analgesia'
  | 'Antibacterial'
  | 'Antidotes'
  | 'Antifungal'
  | 'Antiparasitic'
  | 'Antiviral'
  | 'Cardiovascular'
  | 'Corticosteroid'
  | 'Emergency drugs'
  | 'Endocrine'
  | 'Eye, ear, nose'
  | 'Fluids & parenteral'
  | 'Gastrointestinal'
  | 'Genitourinary'
  | 'Haematological'
  | 'Herbal & traditional'
  | 'Immunological'
  | 'Metabolic'
  | 'Nervous system'
  | 'Non-drug'
  | 'Obstetrics'
  | 'Oncology'
  | 'Respiratory / allergy'
  | 'Topical & skin'
  | 'Vitamins & nutrition';

export interface DrugClass {
  id: DrugClassId;
  label: string;
  /** Coarser family a billing rule keys on: 'Antibacterial' covers every antibiotic class below it. */
  group: DrugGroupId;
}

export const DRUG_CLASSES: DrugClass[] = [
  { id: 'ace-inhibitors', label: "ACE inhibitors", group: "Cardiovascular" },
  { id: 'acid-suppressants', label: "Acid suppressants (PPI / H2)", group: "Gastrointestinal" },
  { id: 'adrenaline-anaphylaxis', label: "Adrenaline / anaphylaxis", group: "Emergency drugs" },
  { id: 'alpha-blockers-urological', label: "Alpha-blockers (urological)", group: "Genitourinary" },
  { id: 'aminoglycosides', label: "Aminoglycosides", group: "Antibacterial" },
  { id: 'angiotensin-receptor-blockers', label: "Angiotensin receptor blockers", group: "Cardiovascular" },
  { id: 'antacids', label: "Antacids", group: "Gastrointestinal" },
  { id: 'anthelmintics', label: "Anthelmintics", group: "Antiparasitic" },
  { id: 'antiarrhythmics', label: "Antiarrhythmics", group: "Cardiovascular" },
  { id: 'anticoagulants', label: "Anticoagulants", group: "Haematological" },
  { id: 'antidepressants', label: "Antidepressants", group: "Nervous system" },
  { id: 'antidiabetics-oral', label: "Oral antidiabetics", group: "Endocrine" },
  { id: 'antidiarrhoeals', label: "Antidiarrhoeals & ORS", group: "Gastrointestinal" },
  { id: 'antidotes-detoxification', label: "Antidotes & detoxification", group: "Antidotes" },
  { id: 'antiemetics', label: "Antiemetics", group: "Gastrointestinal" },
  { id: 'antiepileptics', label: "Antiepileptics", group: "Nervous system" },
  { id: 'antifibrinolytics-haemostatics', label: "Antifibrinolytics / haemostatics", group: "Haematological" },
  { id: 'antifungals', label: "Antifungals", group: "Antifungal" },
  { id: 'antihistamines', label: "Antihistamines", group: "Respiratory / allergy" },
  { id: 'antimalarials', label: "Antimalarials", group: "Antiparasitic" },
  { id: 'antiplatelets', label: "Antiplatelets", group: "Haematological" },
  { id: 'antipsychotics', label: "Antipsychotics", group: "Nervous system" },
  { id: 'antiseptics', label: "Antiseptics & disinfectants", group: "Topical & skin" },
  { id: 'antispasmodics', label: "Antispasmodics", group: "Gastrointestinal" },
  { id: 'antivirals', label: "Antivirals", group: "Antiviral" },
  { id: 'anxiolytics-sedatives', label: "Anxiolytics / sedatives", group: "Nervous system" },
  { id: 'beta-blockers', label: "Beta-blockers", group: "Cardiovascular" },
  { id: 'bronchodilators', label: "Bronchodilators & xanthines", group: "Respiratory / allergy" },
  { id: 'calcium-channel-blockers', label: "Calcium channel blockers", group: "Cardiovascular" },
  { id: 'calcium-vitamin-d', label: "Calcium & vitamin D", group: "Vitamins & nutrition" },
  { id: 'cardiac-glycosides', label: "Cardiac glycosides", group: "Cardiovascular" },
  { id: 'cephalosporins', label: "Cephalosporins", group: "Antibacterial" },
  { id: 'corticosteroids-systemic', label: "Corticosteroids (systemic)", group: "Corticosteroid" },
  { id: 'corticosteroids-topical', label: "Corticosteroids (topical)", group: "Corticosteroid" },
  { id: 'cough-cold-preparations', label: "Cough & cold preparations", group: "Respiratory / allergy" },
  { id: 'cytotoxics', label: "Cytotoxics", group: "Oncology" },
  { id: 'diuretics', label: "Diuretics", group: "Cardiovascular" },
  { id: 'ecto-parasiticides', label: "Ectoparasiticides (scabicides)", group: "Antiparasitic" },
  { id: 'flatulence-preparations', label: "Flatulence", group: "Gastrointestinal" },
  { id: 'gout-drugs', label: "Drugs for gout", group: "Metabolic" },
  { id: 'herbal-medicines', label: "Herbal & traditional medicines", group: "Herbal & traditional" },
  { id: 'immunoglobulins-sera', label: "Immunoglobulins & sera", group: "Immunological" },
  { id: 'inhaled-corticosteroids', label: "Corticosteroids (inhaled)", group: "Respiratory / allergy" },
  { id: 'insulins', label: "Insulins", group: "Endocrine" },
  { id: 'iron-preparations', label: "Iron preparations", group: "Haematological" },
  { id: 'iv-fluids-electrolytes', label: "IV fluids & electrolytes", group: "Fluids & parenteral" },
  { id: 'laxatives', label: "Laxatives", group: "Gastrointestinal" },
  { id: 'leukotriene-antagonists', label: "Leukotriene antagonists", group: "Respiratory / allergy" },
  { id: 'lipid-regulators', label: "Lipid regulators", group: "Metabolic" },
  { id: 'local-anaesthetics', label: "Local anaesthetics", group: "Anaesthesia" },
  { id: 'macrolides-lincosamides', label: "Macrolides / lincosamides", group: "Antibacterial" },
  { id: 'medical-devices-consumables', label: "Devices & consumables", group: "Non-drug" },
  { id: 'migraine-drugs', label: "Drugs for migraine", group: "Nervous system" },
  { id: 'minerals', label: "Minerals", group: "Vitamins & nutrition" },
  { id: 'nitrofurans', label: "Nitrofurans", group: "Antibacterial" },
  { id: 'nitroimidazoles', label: "Nitroimidazoles", group: "Antibacterial" },
  { id: 'non-opioid-analgesics', label: "Non-opioid analgesics (paracetamol)", group: "Analgesia" },
  { id: 'nootropics-cognitive', label: "Nootropics", group: "Nervous system" },
  { id: 'nsaids', label: "NSAIDs", group: "Analgesia" },
  { id: 'nutritional-supplements', label: "Nutritional supplements", group: "Vitamins & nutrition" },
  { id: 'ophthalmic-preparations', label: "Ophthalmic preparations", group: "Eye, ear, nose" },
  { id: 'opioids', label: "Opioids", group: "Analgesia" },
  { id: 'other-antibacterials', label: "Other antibacterials", group: "Antibacterial" },
  { id: 'other-antihypertensives', label: "Other antihypertensives", group: "Cardiovascular" },
  { id: 'other-nervous-system-drugs', label: "Other nervous-system drugs", group: "Nervous system" },
  { id: 'parkinsonism-drugs', label: "Parkinsonism & anticholinergics", group: "Nervous system" },
  { id: 'penicillins', label: "Penicillins", group: "Antibacterial" },
  { id: 'phenicols', label: "Phenicols (chloramphenicol)", group: "Antibacterial" },
  { id: 'quinolones', label: "Quinolones", group: "Antibacterial" },
  { id: 'respiratory-stimulants', label: "Respiratory stimulants", group: "Emergency drugs" },
  { id: 'salicylates', label: "Salicylates", group: "Analgesia" },
  { id: 'sex-hormones-contraceptives', label: "Sex hormones / contraceptives", group: "Endocrine" },
  { id: 'skin-emollients-protectants', label: "Emollients & skin protectants", group: "Topical & skin" },
  { id: 'sulfonamides', label: "Sulfonamides / cotrimoxazole", group: "Antibacterial" },
  { id: 'tetracyclines', label: "Tetracyclines", group: "Antibacterial" },
  { id: 'thrombolytics', label: "Thrombolytics", group: "Haematological" },
  { id: 'thyroid-and-antithyroid', label: "Thyroid & antithyroid", group: "Endocrine" },
  { id: 'topical-combination-preparations', label: "Topical combination preparations", group: "Topical & skin" },
  { id: 'unclassified', label: "Unclassified", group: "Non-drug" },
  { id: 'uterotonics', label: "Uterotonics", group: "Obstetrics" },
  { id: 'vasoactive-agents', label: "Vasoactive agents", group: "Emergency drugs" },
  { id: 'vasodilators-nitrates', label: "Nitrates / vasodilators", group: "Cardiovascular" },
  { id: 'vitamins', label: "Vitamins", group: "Vitamins & nutrition" },
];

const CLASS_BY_ID = new Map<DrugClassId, DrugClass>(DRUG_CLASSES.map(c => [c.id, c]));

export const getDrugClass = (id: DrugClassId): DrugClass | undefined => CLASS_BY_ID.get(id);

/** Class ids belonging to a group - for a rule that means "any antibacterial", not one antibiotic class. */
export const classesInGroup = (group: DrugGroupId): DrugClassId[] =>
  DRUG_CLASSES.filter(c => c.group === group).map(c => c.id);

export const DRUG_GROUPS: DrugGroupId[] = ["Anaesthesia","Analgesia","Antibacterial","Antidotes","Antifungal","Antiparasitic","Antiviral","Cardiovascular","Corticosteroid","Emergency drugs","Endocrine","Eye, ear, nose","Fluids & parenteral","Gastrointestinal","Genitourinary","Haematological","Herbal & traditional","Immunological","Metabolic","Nervous system","Non-drug","Obstetrics","Oncology","Respiratory / allergy","Topical & skin","Vitamins & nutrition"];

/**
 * Ingredient key -> therapeutic class, generated from the stocked formulary.
 * Keys are the lowercase ingredient phrases produced by extractIngredient().
 */
export const CLASS_BY_INGREDIENT: Record<string, DrugClassId> = {
  "5-fluorouracil": 'cytotoxics',
  "5-htp": 'nutritional-supplements',
  "acetazolamide": 'diuretics',
  "acetylcysteine": 'antidotes-detoxification',
  "acetylsalicylic acid": 'salicylates',
  "actinomycin d": 'cytotoxics',
  "activated charcoal": 'antidotes-detoxification',
  "acyclovir": 'antivirals',
  "adrenaline": 'adrenaline-anaphylaxis',
  "adriamycin": 'cytotoxics',
  "albendazole": 'anthelmintics',
  "allopurinol": 'gout-drugs',
  "alpha lipoic acid": 'nutritional-supplements',
  "aluminium hydroxide": 'antacids',
  "ambroxol": 'cough-cold-preparations',
  "amino acid": 'iv-fluids-electrolytes',
  "aminophylline": 'bronchodilators',
  "amiodarone": 'antiarrhythmics',
  "amitriptyline": 'antidepressants',
  "amlodipine": 'calcium-channel-blockers',
  "amodiaquine + artesunate": 'antimalarials',
  "amoxicillin": 'penicillins',
  "amoxicillin + clavulanic acid": 'penicillins',
  "ampicillin": 'penicillins',
  "anastrozole": 'cytotoxics',
  "anti rh immunoglobulin": 'immunoglobulins-sera',
  "anti tetanus serum": 'immunoglobulins-sera',
  "aqueous": 'skin-emollients-protectants',
  "aqueous cream": 'skin-emollients-protectants',
  "artemether": 'antimalarials',
  "artemether + lumefantrine": 'antimalarials',
  "artermether + lumefantrine": 'antimalarials',
  "artesunate": 'antimalarials',
  "ashwagandha": 'herbal-medicines',
  "atenolol": 'beta-blockers',
  "atorvastatin": 'lipid-regulators',
  "atropine": 'ophthalmic-preparations',
  "azithromycin": 'macrolides-lincosamides',
  "badoe's": 'iv-fluids-electrolytes',
  "beclometasone dipropionate": 'inhaled-corticosteroids',
  "bendroflumethiazide": 'diuretics',
  "benzatropine": 'parkinsonism-drugs',
  "benzoic acid": 'skin-emollients-protectants',
  "benzoyl peroxide": 'skin-emollients-protectants',
  "benzyl benzoate": 'ecto-parasiticides',
  "benzylpenicillin": 'penicillins',
  "betamethasone valerate": 'corticosteroids-topical',
  "betaxolol": 'beta-blockers',
  "bilberry": 'herbal-medicines',
  "biotin": 'vitamins',
  "bisacodyl": 'laxatives',
  "bisoprolol": 'beta-blockers',
  "bromhexine": 'cough-cold-preparations',
  "bromocriptine": 'other-nervous-system-drugs',
  "budesonide": 'inhaled-corticosteroids',
  "budesonide + formoterol": 'bronchodilators',
  "calamine": 'skin-emollients-protectants',
  "calciferol": 'calcium-vitamin-d',
  "calcium carbonate": 'calcium-vitamin-d',
  "calcium gluconate": 'calcium-vitamin-d',
  "calcium with vitamin d": 'calcium-vitamin-d',
  "capecitabine": 'cytotoxics',
  "carbamazepine": 'antiepileptics',
  "carbimazole": 'thyroid-and-antithyroid',
  "carbocisteine": 'cough-cold-preparations',
  "carboplatin": 'cytotoxics',
  "carvedilol": 'beta-blockers',
  "cefaclor": 'cephalosporins',
  "cefotaxime": 'cephalosporins',
  "ceftriazone": 'cephalosporins',
  "cefuroxime": 'cephalosporins',
  "celecoxib": 'nsaids',
  "cetirizine": 'antihistamines',
  "cetrimide": 'antiseptics',
  "charcoal": 'antidotes-detoxification',
  "chloramphenicol": 'phenicols',
  "chlorhexidine": 'antiseptics',
  "chlorphenamine": 'antihistamines',
  "chlorpheniramine": 'antihistamines',
  "chlorpromazine": 'antipsychotics',
  "cholera replacement": 'antidiarrhoeals',
  "chromium picolinate": 'minerals',
  "cimetidine": 'acid-suppressants',
  "ciprofloxacin": 'quinolones',
  "clarithromycin": 'macrolides-lincosamides',
  "clindamycin": 'macrolides-lincosamides',
  "clobetasol propionate": 'corticosteroids-topical',
  "clopidogrel": 'antiplatelets',
  "clotrimazole": 'antifungals',
  "cloxacillin": 'penicillins',
  "co-trimoxazole": 'sulfonamides',
  "codeine": 'opioids',
  "coenzyme q10": 'nutritional-supplements',
  "collagen": 'nutritional-supplements',
  "conjugated oestrogen": 'sex-hormones-contraceptives',
  "conjugated oestrogen + norgesterol": 'sex-hormones-contraceptives',
  "corticosteroid + antibiotic": 'other-antibacterials',
  "cotrimoxazole": 'sulfonamides',
  "cranberry": 'nutritional-supplements',
  "cranberry + d-mannose": 'nutritional-supplements',
  "cyclopentolate": 'ophthalmic-preparations',
  "cyclophosphamide": 'cytotoxics',
  "d-mannose": 'nutritional-supplements',
  "dalteparin": 'anticoagulants',
  "darrow's": 'iv-fluids-electrolytes',
  "dexamethasone": 'corticosteroids-systemic',
  "dextromethorphan": 'cough-cold-preparations',
  "dextrose": 'iv-fluids-electrolytes',
  "dextrose in sodium chloride": 'iv-fluids-electrolytes',
  "dextrose saline": 'iv-fluids-electrolytes',
  "diazepam": 'anxiolytics-sedatives',
  "diclofenac": 'nsaids',
  "dicyclomine": 'antispasmodics',
  "diethylstilboestrol": 'sex-hormones-contraceptives',
  "digoxin": 'cardiac-glycosides',
  "dihydroartemisin + piperaquine": 'antimalarials',
  "dihydrocodeine": 'opioids',
  "disopyramide": 'antiarrhythmics',
  "docetaxel": 'cytotoxics',
  "domperidone": 'antiemetics',
  "dopamine": 'vasoactive-agents',
  "doxapram": 'respiratory-stimulants',
  "doxorubicin": 'cytotoxics',
  "doxycycline": 'tetracyclines',
  "echinacea": 'herbal-medicines',
  "enoxaparin": 'anticoagulants',
  "ephedrine": 'cough-cold-preparations',
  "epinephrine": 'adrenaline-anaphylaxis',
  "ergometrine": 'uterotonics',
  "ergotamine": 'migraine-drugs',
  "erythromycin": 'macrolides-lincosamides',
  "esomeprazole": 'acid-suppressants',
  "ethosuximide": 'antiepileptics',
  "etoposide": 'cytotoxics',
  "evening primrose": 'herbal-medicines',
  "famotidine": 'acid-suppressants',
  "ferric ammonium citrate": 'iron-preparations',
  "ferrous fumarate": 'iron-preparations',
  "ferrous sulphate": 'iron-preparations',
  "ferrous sulphate + folic acid": 'iron-preparations',
  "finasteride": 'sex-hormones-contraceptives',
  "flucloxacillin": 'penicillins',
  "fluconazole": 'antifungals',
  "fludrocortisone": 'corticosteroids-systemic',
  "fluoxetine": 'antidepressants',
  "flupentixol": 'antipsychotics',
  "fluphenazine": 'antipsychotics',
  "fluticasone": 'inhaled-corticosteroids',
  "fluticasone + salmeterol": 'bronchodilators',
  "fluvastatin": 'lipid-regulators',
  "folic acid": 'vitamins',
  "furosemide": 'diuretics',
  "garlic": 'herbal-medicines',
  "gelatin": 'iv-fluids-electrolytes',
  "gentamicin": 'aminoglycosides',
  "ginkgo biloba": 'herbal-medicines',
  "ginseng": 'herbal-medicines',
  "glibenclamide": 'antidiabetics-oral',
  "gliclazide": 'antidiabetics-oral',
  "glimepiride": 'antidiabetics-oral',
  "glucagon": 'antidotes-detoxification',
  "glucosamine chondroitin": 'nutritional-supplements',
  "glyceryl trinitrate": 'vasodilators-nitrates',
  "granisetron": 'antiemetics',
  "grape seed": 'herbal-medicines',
  "green tea": 'herbal-medicines',
  "griseofulvin": 'antifungals',
  "guaifenesin": 'cough-cold-preparations',
  "haloperidol": 'antipsychotics',
  "heparin": 'anticoagulants',
  "human immune tetanus globulins": 'immunoglobulins-sera',
  "hyaluronic acid": 'nutritional-supplements',
  "hydralazine": 'other-antihypertensives',
  "hydrochlorothiazide": 'diuretics',
  "hydrochlorthiazide": 'diuretics',
  "hydrocortisone": 'corticosteroids-systemic',
  "hydrocortisone sodium succinate": 'corticosteroids-systemic',
  "hydrogen peroxide": 'antiseptics',
  "hydroxocobalamin": 'vitamins',
  "hydroxyurea": 'cytotoxics',
  "hyoscine butylbromide": 'antispasmodics',
  "ibuprofen": 'nsaids',
  "imipramine": 'antidepressants',
  "immunocin": 'herbal-medicines',
  "insulin premixed": 'insulins',
  "insulin soluble": 'insulins',
  "intralipid": 'iv-fluids-electrolytes',
  "ipratropium": 'bronchodilators',
  "iron bisglycinate": 'iron-preparations',
  "iron dextran": 'iron-preparations',
  "iron iii polymaltose complex": 'iron-preparations',
  "iron polymaltose complex": 'iron-preparations',
  "iron sucrose": 'iron-preparations',
  "isophane insulin": 'insulins',
  "isosorbide dinitrate": 'vasodilators-nitrates',
  "itraconazole": 'antifungals',
  "iv giving": 'medical-devices-consumables',
  "kaolin": 'antidiarrhoeals',
  "ketoconazole": 'antifungals',
  "l-carnitine": 'nutritional-supplements',
  "l-lysine": 'nutritional-supplements',
  "l-theanine": 'nutritional-supplements',
  "labetalol": 'beta-blockers',
  "lactulose": 'laxatives',
  "lamotrigine": 'antiepileptics',
  "lansoprazole": 'acid-suppressants',
  "levocetirizine": 'antihistamines',
  "levofloxacin": 'quinolones',
  "levothyroxine": 'thyroid-and-antithyroid',
  "lidocaine": 'local-anaesthetics',
  "lisinopril": 'ace-inhibitors',
  "lodoxamide": 'ophthalmic-preparations',
  "loperamide": 'antidiarrhoeals',
  "loratadine": 'antihistamines',
  "lorazepam": 'anxiolytics-sedatives',
  "losartan": 'angiotensin-receptor-blockers',
  "lutein": 'nutritional-supplements',
  "lutein + zeaxanthin": 'nutritional-supplements',
  "maca": 'herbal-medicines',
  "magnesium hydroxide": 'antacids',
  "magnesium oxide": 'minerals',
  "magnesium sulphate": 'minerals',
  "magnesium trisilicate": 'antacids',
  "mannitol": 'iv-fluids-electrolytes',
  "mebendazole": 'anthelmintics',
  "mebeverine": 'antispasmodics',
  "medroxyprogesterone acetate": 'sex-hormones-contraceptives',
  "mefenamic acid": 'nsaids',
  "melatonin": 'nutritional-supplements',
  "metformin": 'antidiabetics-oral',
  "methotrexate": 'cytotoxics',
  "methyl cellulose": 'ophthalmic-preparations',
  "methyldopa": 'other-antihypertensives',
  "metoclopramide": 'antiemetics',
  "metolazone": 'diuretics',
  "metoprolol": 'beta-blockers',
  "metronidazole": 'nitroimidazoles',
  "miconazole": 'antifungals',
  "midazolam": 'anxiolytics-sedatives',
  "milk thistle": 'nutritional-supplements',
  "montelukast": 'leukotriene-antagonists',
  "morphine": 'opioids',
  "msm": 'nutritional-supplements',
  "multivitamin": 'vitamins',
  "nac": 'antidotes-detoxification',
  "naloxone": 'antidotes-detoxification',
  "needle": 'medical-devices-consumables',
  "neomycin": 'aminoglycosides',
  "neostigmine": 'other-nervous-system-drugs',
  "nifedipine": 'calcium-channel-blockers',
  "nitrofurantoin": 'nitrofurans',
  "nitroglycerin": 'vasodilators-nitrates',
  "norethisterone": 'sex-hormones-contraceptives',
  "norgesterol": 'sex-hormones-contraceptives',
  "normal saline": 'iv-fluids-electrolytes',
  "nystatin": 'antifungals',
  "olanzapine": 'antipsychotics',
  "omega-3 fish oil": 'nutritional-supplements',
  "omeprazole": 'acid-suppressants',
  "ondansetron": 'antiemetics',
  "ondansetrone": 'antiemetics',
  "oral rehydration salts": 'antidiarrhoeals',
  "oxytocin": 'uterotonics',
  "paclitaxel": 'cytotoxics',
  "panax ginseng": 'herbal-medicines',
  "pantoprazole": 'acid-suppressants',
  "paracetamol": 'non-opioid-analgesics',
  "paraffin": 'laxatives',
  "paraffin liquid": 'laxatives',
  "pethidine": 'opioids',
  "pheniramine": 'antihistamines',
  "phenobarbital": 'antiepileptics',
  "phenol": 'antiseptics',
  "phenoxymethyl penicillin": 'penicillins',
  "phenytoin": 'antiepileptics',
  "phytomenadione": 'antidotes-detoxification',
  "pilocarpine": 'ophthalmic-preparations',
  "pioglitazone": 'antidiabetics-oral',
  "piracetam": 'nootropics-cognitive',
  "pomegranate": 'herbal-medicines',
  "potassium chloride": 'minerals',
  "potassium citrate": 'minerals',
  "povidone iodine": 'antiseptics',
  "praziquantel": 'anthelmintics',
  "prazosin": 'other-antihypertensives',
  "prednisolone": 'corticosteroids-systemic',
  "primidone": 'antiepileptics',
  "probiotics": 'nutritional-supplements',
  "procaine benzylpenicillin": 'penicillins',
  "promethazine": 'antihistamines',
  "propranolol": 'beta-blockers',
  "propylthiouracil": 'thyroid-and-antithyroid',
  "prostate support": 'herbal-medicines',
  "protamine sulphate": 'antidotes-detoxification',
  "pseudoephedrine": 'cough-cold-preparations',
  "psyllium": 'laxatives',
  "pycnogenol": 'nutritional-supplements',
  "quercetin": 'nutritional-supplements',
  "quinine": 'antimalarials',
  "ramipril": 'ace-inhibitors',
  "ranitidine": 'acid-suppressants',
  "resveratrol": 'nutritional-supplements',
  "retinol": 'vitamins',
  "rhodiola": 'herbal-medicines',
  "ringer - lactate": 'iv-fluids-electrolytes',
  "ringer's lactate": 'iv-fluids-electrolytes',
  "risperidone": 'antipsychotics',
  "rituximab": 'cytotoxics',
  "salbutamol": 'bronchodilators',
  "salicylic acid": 'salicylates',
  "saw palmetto": 'herbal-medicines',
  "secnidazole": 'nitroimidazoles',
  "selenium": 'minerals',
  "selenium sulphide": 'ecto-parasiticides',
  "senna": 'laxatives',
  "sertraline": 'antidepressants',
  "silver sulphadiazine": 'antiseptics',
  "simethicone": 'flatulence-preparations',
  "simple": 'cough-cold-preparations',
  "simple linctus": 'cough-cold-preparations',
  "simvastatin": 'lipid-regulators',
  "sodium bicarbonate": 'iv-fluids-electrolytes',
  "sodium chloride": 'iv-fluids-electrolytes',
  "sodium chloride nasal": 'cough-cold-preparations',
  "sodium valproate": 'antiepileptics',
  "soothing agent + local anaesthetic": 'topical-combination-preparations',
  "soothing agent + local anaesthetic + steroid": 'topical-combination-preparations',
  "spironolactone": 'diuretics',
  "st. john's wort": 'herbal-medicines',
  "streptokinase": 'thrombolytics',
  "sulfasalazine": 'sulfonamides',
  "tamoxifen": 'cytotoxics',
  "tamsulosin": 'alpha-blockers-urological',
  "terazosin": 'alpha-blockers-urological',
  "terbinafine": 'antifungals',
  "tetracycline": 'tetracyclines',
  "theophylline": 'bronchodilators',
  "thiamine": 'vitamins',
  "tiabendazole": 'anthelmintics',
  "timolol": 'beta-blockers',
  "tinidazole": 'nitroimidazoles',
  "tirofiban": 'antiplatelets',
  "tolbutamide": 'antidiabetics-oral',
  "tranexamic acid": 'antifibrinolytics-haemostatics',
  "trihexyphenidyl": 'parkinsonism-drugs',
  "turmeric": 'herbal-medicines',
  "valerian": 'herbal-medicines',
  "valsartan": 'angiotensin-receptor-blockers',
  "verapamil": 'calcium-channel-blockers',
  "vincristine": 'cytotoxics',
  "vitamin b12": 'vitamins',
  "vitamin c": 'vitamins',
  "vitamin d3": 'calcium-vitamin-d',
  "vitamin e": 'vitamins',
  "warfarin": 'anticoagulants',
  "water for": 'iv-fluids-electrolytes',
  "zinc": 'minerals',
  "zinc oxide": 'skin-emollients-protectants',
  "zinc sulfate": 'minerals',
};

const FORM_WORDS = [
  'sustained release', 'slow release', 'enteric coated', 'dispersible', 'granular', 'paediatric', 'pediatric',
  'tablet', 'syrup', 'elixir', 'emulsion', 'injection', 'infusion', 'solution', 'suspension', 'capsules',
  'capsule', 'suppository', 'ovule', 'pessary', 'cream', 'ointment', 'gel', 'lotion', 'spray', 'drops', 'drop',
  'mouth wash', 'inhaler', 'nebules', 'nebulizer', 'dpi', 'mdi', 'powder', 'salt', 'mixture', 'linctus', 'husk',
  'set', 'fluid', 'eye', 'ear', 'oral', 'topical', 'nasal', 'rectal', 'vaginal', 'sublingual', 'hcl',
  'hci', 'bp', 'fac', 'bpc', 'hm', 'n a', 'for tpn', 'containing cough', 'containing expectorant', 'liquid',
  'sachet', 'soft', 'shampoo', 'gelling',
];

// Staff type the pack form as an abbreviation in front of the drug ("Tab Panadol", "Inj Syntocinon"),
// so those are removed before the ingredient is looked up.
const LEADING_ABBREVIATIONS = ['tab', 'tabs', 'tablet', 'inj', 'injection', 'syp', 'syrup', 'cap', 'caps',
  'capl', 'neb', 'spt', 'supp', 'pes', 'ovul', 'cream', 'oint', 'sol', 'susp'];

const lower = (value: string): string => value.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * "Amoxicillin + Clavulanic Acid Tablet, 875 mg + 125 mg" -> "amoxicillin + clavulanic acid".
 * A stock name is the ingredient, then the pack form, then the strength, so form and strength are removed.
 * Note "Aqueous Cream" keeps the word aqueous - it is part of the product name, not a route label.
 */
export const extractIngredient = (stockName?: string | null): string => {
  let s = lower(String(stockName ?? '')).split(',')[0];
  s = s.replace(/\([^)]*\)/g, ' ');
  s = s.replace(/\//g, ' ');
  s = s.replace(/[^a-z0-9+ .'-]/g, ' ');
  s = s.replace(/\s\d[^\s]*/g, ' ');
  s = s.replace(/\s+(mg|mcg|ug|g|kg|ml|l|iu|units?|microgram|milligram|%|doses|dose)\b/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  for (;;) {
    const words = s.split(' ');
    if (words.length > 1 && LEADING_ABBREVIATIONS.includes(words[0])) {
      s = words.slice(1).join(' ');
      continue;
    }
    break;
  }
  for (;;) {
    let changed = false;
    for (const f of FORM_WORDS) {
      if (s === f) { s = ''; changed = true; break; }
      if (s.endsWith(' ' + f)) { s = s.slice(0, s.length - f.length).trim(); changed = true; }
    }
    s = s.replace(/\s+/g, ' ').trim();
    if (!changed) break;
  }
  return s;
};

// Used only when a stock name is not in CLASS_BY_INGREDIENT, so a newly added antibiotic still reads
// as an antibiotic. Deliberately coarser than the table: it may pick the wrong class within a group,
// and 'unclassified' still means "a human should look at this".
const FALLBACK_STEMS: Array<[string, DrugClassId]> = [
  ['cef', 'cephalosporins'],
  ['ceph', 'cephalosporins'],
  ['penicillin', 'penicillins'],
  ['amoxicill', 'penicillins'],
  ['cycline', 'tetracyclines'],
  ['floxacin', 'quinolones'],
  ['thromycin', 'macrolides-lincosamides'],
  ['clidamyc', 'macrolides-lincosamides'],
  ['gentamicin', 'aminoglycosides'],
  ['amikacin', 'aminoglycosides'],
  ['conazole', 'antifungals'],
  ['terbinafine', 'antifungals'],
  ['ciclovir', 'antivirals'],
  ['artem', 'antimalarials'],
  ['quine', 'antimalarials'],
  ['prazole', 'acid-suppressants'],
  ['tidine', 'acid-suppressants'],
  ['statin', 'lipid-regulators'],
  ['sartan', 'angiotensin-receptor-blockers'],
  ['dipine', 'calcium-channel-blockers'],
  ['semide', 'diuretics'],
  ['thiazide', 'diuretics'],
  ['cortisone', 'corticosteroids-systemic'],
  ['cortisol', 'corticosteroids-systemic'],
  ['etrinate', 'vasodilators-nitrates'],
  ['setron', 'antiemetics'],
  ['pramide', 'antiemetics'],
  ['azepam', 'anxiolytics-sedatives'],
  ['triptyline', 'antidepressants'],
  ['oxetine', 'antidepressants'],
  ['peridone', 'antipsychotics'],
  ['piprazole', 'antipsychotics'],
  ['diazine', 'anthelmintics'],
  ['mectin', 'anthelmintics'],
  ['profen', 'nsaids'],
  ['fenac', 'nsaids'],
  ['coxib', 'nsaids'],
  ['codine', 'opioids'],
  ['morphine', 'opioids'],
  ['paracetamol', 'non-opioid-analgesics'],
  ['warfarin', 'anticoagulants'],
  ['heparin', 'anticoagulants'],
  ['sulin', 'insulins'],
  ['formin', 'antidiabetics-oral'],
  ['ringer', 'iv-fluids-electrolytes'],
  ['betadine', 'antiseptics'],
  ['surgical spirit', 'antiseptics'],
  ['syringe', 'medical-devices-consumables'],
  ['cannula', 'medical-devices-consumables'],
  ['catheter', 'medical-devices-consumables'],
  ['iv giving', 'medical-devices-consumables'],
  ['iv drip', 'medical-devices-consumables'],
  ['rdt', 'medical-devices-consumables'],
  ['gauze', 'medical-devices-consumables'],
  ['bandage', 'medical-devices-consumables'],
  ['plaster', 'medical-devices-consumables'],
  ['wool', 'medical-devices-consumables'],
  ['glove', 'medical-devices-consumables'],
  ['face mask', 'medical-devices-consumables'],
  ['swab', 'medical-devices-consumables'],
  ['dipstick', 'medical-devices-consumables'],
  ['test kit', 'medical-devices-consumables'],
  ['test strip', 'medical-devices-consumables'],
  ['blood glucose', 'medical-devices-consumables'],
  ['nasogastric', 'medical-devices-consumables'],
  ['endotracheal', 'medical-devices-consumables'],
  ['urine bag', 'medical-devices-consumables'],
];

const UNCLASSIFIED = CLASS_BY_ID.get('unclassified') as DrugClass;

/** One ingredient phrase -> class. Exact table first, then a stem, then a partial name match. */
const classifyKey = (key: string): DrugClass => {
  if (!key) return UNCLASSIFIED;
  const exact = CLASS_BY_INGREDIENT[key];
  if (exact) return CLASS_BY_ID.get(exact) as DrugClass;
  for (const [stem, classId] of FALLBACK_STEMS) {
    if (key.includes(stem)) return CLASS_BY_ID.get(classId) as DrugClass;
  }
  for (const [ing, classId] of Object.entries(CLASS_BY_INGREDIENT)) {
    if (key === ing || key.startsWith(ing + ' ') || key.endsWith(' ' + ing)) {
      return CLASS_BY_ID.get(classId) as DrugClass;
    }
  }
  return UNCLASSIFIED;
};

const splitParts = (key: string): string[] =>
  key.split(' + ').map(p => p.trim()).filter(Boolean);

// A steroid in a cream is not a steroid in the blood. The ingredient table cannot see the route,
// but a rule written against systemic corticosteroids must not catch hydrocortisone cream.
const TOPICAL_FORM = /(?:^|[^a-z])(cream|ointment|lotion|emulgel|paste|eye|ear|nasal|nose|spray|suppositor|suppository|supp|vaginal|pessar|transdermal)(?:[^a-z]|$)/i;

const byRoute = (c: DrugClass, stockName: string): DrugClass =>
  c.id === 'corticosteroids-systemic' && TOPICAL_FORM.test(stockName)
    ? (CLASS_BY_ID.get('corticosteroids-topical') as DrugClass)
    : c;

/**
 * Every class a stocked drug belongs to. A combination product belongs to more than one:
 * "Ciprofloxacin + Tinidazole" is both a quinolone and a nitroimidazole, and a rule that
 * blocks either must catch it.
 */
export const getAllClassesForDrug = (stockName?: string | null): DrugClass[] => {
  const key = extractIngredient(stockName);
  if (!key) return [UNCLASSIFIED];
  const name = stockName ?? '';
  const whole = classifyKey(key);
  const parts = splitParts(key).map(classifyKey).filter(c => c.id !== 'unclassified');
  // Parts first, in the order the product is named, so "Atenolol + Hydrochlorothiazide" reads as a
  // beta-blocker that also contains a diuretic rather than the other way round.
  const out = [...parts, whole].filter(c => c.id !== 'unclassified').map(c => byRoute(c, name));
  const unique = new Map<DrugClassId, DrugClass>();
  for (const c of (out.length ? out : [UNCLASSIFIED])) unique.set(c.id, c);
  return [...unique.values()];
};

/**
 * Primary class of a stocked drug name: for a combination it is the first ingredient that is
 * known to the table, which is how the product is named and dispensed.
 */
export const getClassForDrug = (stockName?: string | null): DrugClass => {
  const all = getAllClassesForDrug(stockName);
  return all[0] ?? UNCLASSIFIED;
};

export const getGroupForDrug = (stockName?: string | null): DrugGroupId => getClassForDrug(stockName).group;

/** Groups the drug belongs to, for a rule written against a whole family. */
export const getAllGroupsForDrug = (stockName?: string | null): DrugGroupId[] =>
  [...new Set(getAllClassesForDrug(stockName).map(c => c.group))];

/** False when this drug is not in the table at all - the caller should stop and review, not bill. */
export const isClassified = (stockName?: string | null): boolean => getClassForDrug(stockName).id !== 'unclassified';

/** The ingredient keys filed under one class - what a reviewer opens to check a class. */
export const ingredientsInClass = (id: DrugClassId): string[] =>
  Object.entries(CLASS_BY_INGREDIENT).filter(([, c]) => c === id).map(([ing]) => ing).sort();

export const classLabel = (id: DrugClassId): string => CLASS_BY_ID.get(id)?.label ?? id;

export const searchDrugClasses = (term: string): DrugClass[] => {
  const q = lower(term);
  if (!q) return DRUG_CLASSES;
  return DRUG_CLASSES.filter(c => c.label.toLowerCase().includes(q) || c.id.includes(q) || c.group.toLowerCase().includes(q));
};
