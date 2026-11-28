# Clinical Diagnosis Catalogue Expansion (Ghana-focused)

## Scope
This catalogue is intended to support diagnosis selection for general/family medicine, specialist Obstetrics & Gynaecology, and routine outpatient care in a Ghanaian primary-hospital setting. It is a selectable diagnosis reference catalogue, not a clinical decision support protocol and not proof of an NHIS G-DRG mapping.

## Expansion
The catalogue includes additions and/or verified existing coverage for:
- Family medicine: dyslipidaemia, sickle-cell disease (with/without crisis), prediabetes, dyspepsia/heartburn, influenza, viral illness, joint pain, nausea/vomiting, weakness, weight change and urinary incontinence.
- Gynaecology: vaginitis, cervicitis, Bartholin abscess, uterine prolapse, cystocele/rectocele, amenorrhoea, irregular menses, postmenopausal bleeding, menopause symptoms, vaginal atrophy, genital tract polyps, postcoital bleeding, premenstrual syndrome, ovarian torsion, adenomyosis and vulvar disorders.
- Reproductive care: contraception counselling, IUD insertion encounter, pregnancy testing and recurrent pregnancy loss.
- Obstetrics: chronic/gestational hypertension, pre-existing hypertension with pre-eclampsia, gestational proteinuria, gestational diabetes, twin pregnancy, breech, oligohydramnios, fetal growth restriction, false labour, perineal tears, obstetric trauma, postpartum complications, puerperal mastitis, lactation disorders and selected comorbidities complicating pregnancy.

## Added infectious and parasitic diagnoses
- Helminthiasis: unspecified intestinal helminthiasis (B82.0), unspecified helminthiasis (B83.9), unspecified intestinal parasitism (B82.9), mixed/other intestinal helminthiases (B81.4, B81.8), enterobiasis/pinworm (B80), strongyloidiasis (B78.9), taeniasis (B68.9) and cysticercosis (B69.9).
- *Helicobacter pylori*: intestinal infection (A04.8), other gastritis (K29.6), and the supplementary organism code (B98.0). For H. pylori-associated gastritis, the disease code and organism code are represented separately; B98.0 is not presented as a standalone gastritis diagnosis.
- Existing schistosomiasis, hookworm, ascariasis, trichuriasis, giardiasis and amoebiasis entries are retained.

## Ghana/African primary-care prioritisation
This catalogue prioritises locally relevant conditions alongside specialist coverage: malaria, URTI, acute UTI, diarrhoeal disease, typhoid, anaemia, rheumatism/joint pain, skin disease, pneumonia, hypertension, diabetes, pregnancy complications, sickle-cell disease and relevant tropical infections.

## Data quality
- Duplicate ICD-10 entries were removed so each ICD code has one catalogue record.
- Basal-cell and squamous-cell skin carcinoma entries were given distinct ICD-10-CM codes C44.91 and C44.92 to avoid a shared-code collision.
- Existing diagnosis rows in a populated database are intentionally not overwritten by the reference-data seed; these changes add missing codes but do not erase local edits.
- The newly selectable diagnoses must not be treated as having tariff links automatically verified. New ICD entries have provisional, non-seeded mapping placeholders solely to preserve catalogue/mapping integrity; they are excluded from automatic NHIS G-DRG claim resolution until Annex C is reviewed. Diagnosis-to-G-DRG relationships remain subject to NHIA Tariff Operation Manual/Annex C review and the claim resolver's rules.

## References
- Ghana Health Service / Ministry of Health Standard Treatment Guidelines: https://garh.gov.gh/wp-content/uploads/2026/04/GHANA-STG-2017-1.pdf
- Ghana outpatient morbidity report (Family Medicine): https://www.ccthghana.org/wp-content/uploads/2026/09/2025-ANNUAL-PERFORMANCE-BOOKLET1.pdf
- Ghana News Agency (Accra OPD morbidity): https://gna.org.gh/2024/03/city-of-accra-experiencing-alarming-diagnoses-of-ncds/
- Ghana National/Regional morbidity context: https://ndpc.gov.gh/media/6_july_2024_National_APR_Design_editorial_work_fin1.pdf
