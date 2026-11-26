# NHIS diagnosis/procedure/G-DRG mapping audit — initial findings

**Branch:** `audit/nhis-diagnosis-procedure-gdrg-linkage`  
**Status:** Initial static integrity review; clinical tariff validation is still in progress.

## Structural checks

Against the branch's checked-in tariff and catalogues:

- Tariff catalogue: 444 G-DRG entries
- Diagnosis-to-G-DRG mappings: 496 unique ICD mapping keys
- Procedure-to-G-DRG mappings: 339 procedure keys
- Procedure catalogue: 339 codes; all are represented in procedure mappings
- Every mapping's selected primary G-DRG is present in that mapping
- No diagnosis or procedure mapping references a G-DRG missing from the tariff catalogue
- No duplicate keys in either mapping table
- No diagnosis mapping keys that are absent from the diagnosis catalogue

These checks only validate code/link structure. They do **not** establish that every clinical grouping is correct according to NHIA Annex C.

## Diagnosis codes requiring Annex C cross-mapping (22 codes)

The diagnosis catalogue has these ICD-10 codes with no *direct* diagnosis-to-G-DRG mapping in our seed. This is **not evidence that NHIA has no applicable G-DRG for them**. Several conditions are grouped under broader G-DRGs, and must be mapped through the exact Annex C inclusion rows and specialty/procedure rules before being considered uncovered:

`A20.9, A21.9, A22.9, A23.9, A38.9, A66.9, B06.9, B27.9, H00.1, H33.2, J30.9, J91.8, J93.1, J96.9, K21.0, K21.9, K29.00, K29.50, R99, Z79.01, Z86.11, Z86.19`

K52.9 (non-infective acute gastroenteritis) has now been linked to MEDI26A and PAED34C, following the NHIA manual's inclusion of K52 under MEDI26 and the existing paediatric non-specific abdominal mapping pattern. The direct mapping-gap review queue is therefore reduced to 22 codes. The paediatric link is an inferred umbrella mapping from the existing mapping convention and remains subject to Annex C verification. These codes are tracked as a review queue, not asserted to be tariff gaps. The prior regression test that asserted this list as an unmapped-gap set was removed and replaced with a catalogue-presence check. Do not assign guessed codes. Map each diagnosis to the actual Annex C grouping and its applicable age/specialty/procedure conditions. Some history/status codes and brought-in-dead records may not be claim-driving diagnoses and require separate handling.

The manual explicitly confirms broader groupings—for example, Crohn's disease, ulcerative colitis and IBS in MEDI25 (Gastrointestinal Tract Bleeding); dyspepsia and chronic pancreatitis in MEDI26 (Non-Specific Abdominal Conditions); and STDs in MEDI31 (Localised Infections). These examples illustrate why absence of a direct ICD link cannot be equated with absence of a G-DRG. These group examples are not a substitute for validating each of the 22 remaining codes.

## Duplicate diagnosis catalogue entries

Repeated ICD codes (catalogue entries, not mapping keys):

- `C44.9`: basal cell carcinoma and squamous cell carcinoma of skin
- `A71.9`: duplicate trachoma unspecified
- `E11.319`: type 2 diabetes with retinopathy / diabetic retinopathy unspecified
- `E11.621`: type 2 diabetes with foot ulcer / diabetic foot ulcer
- `B02.9`: shingles labels
- `M10.9`: duplicate gout unspecified
- `M1A.9`: chronic gout / gouty arthropathy
- `F53.0`: duplicate postpartum depression
- `A33`: duplicate neonatal tetanus
- `R19.7`: duplicate diarrhea unspecified
- `K59.00`: duplicate constipation unspecified
- `R55`: syncope and collapse / transient loss of consciousness

These may be catalogue label variants or duplicates; they should be reconciled without deleting clinically meaningful entries or breaking existing references.

## Confirmed procedure linkage

- Thoracostomy/chest tube insertion is represented in the procedure mapping table as `ASUR03A` (adult) and `PSUR34C` (child). Both tariff entries exist in the current checked-in dataset. A focused regression test now asserts these links. NHIA manual Annex C associates pleural effusion/pneumothorax diagnoses with thoracostomy/chest tube procedure groups; the diagnosis itself must not be auto-assigned the procedure G-DRG unless the procedure was performed.

## Confirmed mapping added during review

- `K52.9` (Non-infective acute gastroenteritis) → `MEDI26A` (adult, Non-Specific Abdominal Conditions) and `PAED34C` (child, Non-Specific Abdominal Condition), with OPD fallback links retained. The NHIA manual explicitly includes K52 in MEDI26; paediatric grouping is aligned with existing mappings but marked for Annex C confirmation.

## Implementation work in this PR

- Corrected principal G-DRG scoring so a performed surgical procedure outranks a primary diagnosis mapping in surgical encounters.
- Added a regression case for a non-primary procedure mapping outranking a primary diagnosis.
- Added structural integrity tests for diagnosis/procedure mapping tariff references and primary codes.
- Replaced the direct-mapping gap test with a review-queue presence check; the queue now excludes K52.9 after its mapping was added.

## Next verification stages

1. Manually verify Annex C diagnosis and procedure groupings for all 23 review codes, including umbrella groupings (e.g. Localised Infections, Obstructive Airway Disease, and the relevant digestive/respiratory groupings); assign only exact Annex C-backed links.
2. Verify the code actually sent for each diagnosis/procedure in the generated e-claim payload against the NHIA XML specification.
3. Inspect the multi-procedure and additional-procedure reimbursement logic; the tariff manual's multiple-surgery rules must not be inferred from the G-DRG mapping alone.
4. Check specialty, case type, age, accreditation/facility level, and tariff-effective date interactions.
5. Run backend tests/CI and review the resulting changes before merging.

## Source references

- NHIA Downloads portal: https://www.nhis.gov.gh/downloads
- NHIA Tariffs Operation Manual v22: https://www.nhis.gov.gh/files/TARIFFS%20OPERATION%20MANUAL%20v22.pdf
- NHIA e-Claims XML standard v8.6: https://nhis.gov.gh/files/NHIA%20Standardized%20e-claims%20interface%28XML%29%20v8.6.pdf


## Complete diagnosis catalogue mapping coverage (PR branch update)

Static reconciliation of the current catalogue and mapping table:
- Diagnosis catalogue: **631 unique ICD codes**.
- Diagnosis-to-G-DRG mapping entries: **631 unique ICD keys** (complete catalogue coverage).
- Missing diagnosis mapping keys: **0**.
- Duplicate diagnosis mapping keys: **0**.
- Obsolete mapping keys not in catalogue: **0**.
- Invalid tariff references in diagnosis mappings: **0** (all referenced codes exist in the checked-in tariff dataset).

### Verification status
- **497 existing mapping entries** remain eligible for seed/automatic resolution, subject to the prior audit and the resolver's encounter/age/facility rules.
- **134 newly completed candidate mappings are marked `status: 'provisional'`** with explanatory notes. They are catalogue-complete but have not been verified code-by-code against the exact NHIA Annex C rows. The diagnosis seed now deliberately skips provisional mappings so they do not silently become automatic claim tariff links.
- This means mapping coverage is complete structurally, but tariff accuracy is **not** claimed to be 100% verified. The provisional list must be validated and status promoted only when official tariff evidence is confirmed.

### Resolver rules retained
- OPD attendance stays OPD; a completed procedure may carry its own ZOOM tariff line where the claim format supports it. Do not change the encounter principal solely because a minor ZOOM procedure was performed.
- Routine ANC/PNC attendance remains distinct and uses OPDC02A when non-admitted.
- Medical inpatient principal diagnosis uses the applicable medical/paediatric grouping; admitted OBGYN cases use the OBGY family where applicable.
- Surgical inpatient G-DRG selection requires a qualifying performed procedure and actual admission. A minor outpatient procedure must not trigger inpatient surgery grouping.
- Adult/child tariff selection follows the tariff age split and the actual available code.
- Observation/detention is ZOOM; procedure tariffs must remain distinct from diagnosis-only links.



## Follow-up audit status — 23 November 2026

- The diagnosis catalogue contains **631 unique codes**.
- The mapping table contains **630 active mapping records** plus one intentionally commented exclusion for **R99 (brought-in-dead)**. R99 is not a claim-driving diagnosis and should not be treated as a missing mapping.
- **112 candidate mapping records remain provisional** after 22 were verified against Annex C. One pre-existing K52.9 link was also corrected and marked verified. The other **496 legacy mapping records remain seed-eligible**, which is not the same as confirming every older link against Annex C.
- Initial CI identified three regressions: two OPD performed-procedure ZOOM links lost their origin during billability filtering, and the catalogue test treated intentionally excluded R99 as required. Those fixes were committed. A later resolver safeguard now also requires a completed procedure-origin link for surgical tariffs; full CI validation of the latest branch head remains outstanding.
- Annex C mapping verification remains in progress; no claim is made that all 112 remaining provisional or 496 legacy links are tariff-verified. Only mappings evidenced by Annex C or exact documented tariff rules should be promoted.


## Annex C verification pass — 23 November 2026

The following 22 provisional diagnosis records were checked against the exact diagnosis/indication rows in the official NHIA Tariffs Operation Manual v22 and promoted to verified. One additional pre-existing K52.9 record was corrected: its unsupported paediatric link was removed and its adult MEDI26 link was explicitly marked verified. Where the manual only listed an adult or paediatric grouping, the unlisted age-band candidate was removed rather than inferred.

| ICD-10 | Verified G-DRG link(s) | Annex C basis |
|---|---|---|
| A04.7 | MEDI23A, PAED31C | Diarrhoea/vomiting; necrotising enterocolitis |
| A66.9 | PAED43C | Yaws (paediatric) |
| E88.9 | PAED07C | Metabolic diseases (paediatric neonatal group) |
| K52.9 | MEDI26A | Other non-infective gastroenteritis/colitis; no PAED34 link is listed |
| I49.9 | MEDI07A | Other cardiac arrhythmias |
| K30 | MEDI26A | Dyspepsia |
| K62.5 | MEDI25A | K62 other diseases of anus and rectum |
| K70.10 | MEDI24A | K70 alcoholic liver disease |
| L23.9 | MEDI31A, PAED26C | Adult localised infections; paediatric skin/subcutaneous diseases |
| L30.9 | MEDI18A, PAED26C | Adult and paediatric skin/subcutaneous diseases |
| M25.50, M25.60, M25.40 | MEDI30A, PAED38C | M25 other joint disorders in both age-band tables |
| R10.84 | MEDI26A, PAED34C | R10.4/R10.8 abdominal pain groupings |
| S00.90XA | ORTH24A, ORTH24C | Superficial injury of head; conservative management |
| D57.00, D57.01 | MEDI16A, PAED24C | D57.0 haemoglobinopathy with crisis |
| N72 | OBGY09A | Inflammatory disease of cervix uteri/vulva |
| N95.1 | OBGY09A | Menopausal disorders |
| O12.1 | OBGY09A | Gestational oedema/proteinuria |
| O13.9 | OBGY09A | Gestational hypertension without significant proteinuria |
| O24.419 | OBGY09A | Diabetes in pregnancy |
| O30.003 | OBGY09A | Multiple gestation |

**Not yet complete:** 112 diagnosis candidates remain provisional and are still excluded from automatic seeding. The other 496 legacy mapping records have not yet been individually reconciled against every Annex C indication. Structural presence in the local tariff JSON is not proof of clinical mapping correctness. No claim of 100% mapping verification is made.

Source: NHIA Tariffs Operation Manual v22, Annex C, adult medicine and paediatrics (MEDI/PAED tables), and obstetrics/gynaecology (OBGY table). Official PDF: https://www.nhis.gov.gh/files/TARIFFS%20OPERATION%20MANUAL%20v22.pdf.


## Surgical G-DRG activation guard

A second resolver issue was identified during the audit: an Annex C diagnosis/indication link could select a surgical G-DRG even when the associated operation had not been performed. The resolver now rejects a tariff marked `isSurgical` when it arrives from a diagnosis link. It remains eligible when the tariff is linked from a completed procedure, and a performed inpatient surgical procedure outranks the primary diagnosis even when the attendance label itself is not 'surgery'. Non-surgical inpatient conservative-management tariffs remain eligible from diagnosis links.

The G-DRG tariff data already contains an explicit `isSurgical` boolean for all 444 tariff rows. The database model and seed now persist this field, with a migration adding the column and backfilling all 280 surgical tariff rows, so existing databases receive the correct flags immediately. Regression tests cover both the surgical-procedure requirement and the conservative-management exception. This enforces the agreed rule: an inpatient surgical G-DRG requires an actual admission and a performed qualifying procedure.

## Annex C follow-up — J90 pleural effusion

A further exact-code check of the official NHIA Tariffs Operation Manual v22, Annex C, confirmed that J90 (pleural effusion) is listed as an indication under:
- **ASUR03A** — adult thoracostomy and chest tube insertion.
- **PSUR34C** — paediatric thoracostomy and chest tube insertion.

The earlier provisional generic respiratory links (MEDI22A / PAED30C) were removed from this diagnosis mapping because J90 is explicitly listed under the thoracostomy groups in Annex C. The mapping is now marked verified and includes only the adult and paediatric tariff codes shown in the manual. This does not mean pleural effusion alone qualifies the claim for a surgical tariff: the principal-G-DRG resolver rejects surgical tariffs sourced only from a diagnosis link and requires the corresponding completed procedure-origin link. Regression coverage checks both age bands and that guard.

These follow-up verifications reduce the provisional diagnosis mapping queue from 112 to **110**. The remaining provisional mappings and the legacy mappings still require individual Annex C review; catalogue completeness is not clinical validation.

Source: NHIA Tariffs Operation Manual v22, Annex C, Adult Surgery ASUR03 and Paediatrics Surgery PSUR34 (official PDF: https://www.nhis.gov.gh/files/TARIFFS%20OPERATION%20MANUAL%20v22.pdf).

## Annex C follow-up — K21.9 gastro-oesophageal reflux

The Annex C paediatric surgery table explicitly lists K21.9 (gastro-oesophageal reflux) under **PSUR14C — Thoracotomy and oesophageal surgery**. The provisional generic abdominal links (MEDI26A / PAED34C) were removed from this diagnosis mapping. No adult K21.9 link is added because the checked Annex C rows do not list one.

PSUR14C is a surgical tariff. As with J90, a diagnosis link alone cannot select it: the resolver requires the completed oesophageal procedure-origin link. The regression test verifies the paediatric tariff and this procedure guard.

This verification reduces the remaining provisional diagnosis mapping queue to **110**. The rest of the provisional and legacy mappings remain subject to individual Annex C validation.

Source: NHIA Tariffs Operation Manual v22, Annex C, Paediatrics Surgery PSUR14 (official PDF: https://www.nhis.gov.gh/files/TARIFFS%20OPERATION%20MANUAL%20v22.pdf).


## Multiple-procedure reimbursement assessment — 26 November 2026

The NHIA Tariffs Operation Manual v22, section 3.5 (printed pages 9–10), states:
- Where multiple surgical procedures are conducted during one admission, the first major procedure is reimbursed at its full tariff and the second procedure at 20% of its tariff.
- For a bilateral procedure, 120% of that procedure's tariff is payable.
- For multiple dental procedures involving multiple teeth, the first tooth is paid in full and each additional tooth attracts 20% of its tariff.

### Current application behaviour

The NHIS claim-generation path currently selects one principal G-DRG and sets the claim amount to the principal tariff plus covered medicines. Supporting diagnosis, investigation and procedure rows are saved as zero-value itemised lines. There is no additional-procedure or bilateral adjustment in that calculation.

The current clinical data model also does not capture the information needed to apply these rules safely:
- Procedure records do not identify whether a procedure is the first/second *major* procedure for reimbursement.
- Procedure records do not capture laterality or indicate that the same procedure was performed bilaterally.
- Dental procedure lines do not capture the number of separately treated teeth.

### Decision / safe next step

Do **not** automatically add 20% to every second procedure or 120% to any repeated procedure. The manual's rule is conditional, and the current records cannot reliably distinguish major procedures, bilateral work, or additional teeth. Applying the percentage to every procedure would risk overclaiming.

A safe implementation requires structured, auditable procedure attributes (major-procedure designation, laterality/bilateral indicator, and tooth count where relevant), validation against the exact tariff/procedure configuration, and a single shared reimbursement calculator used by claim generation, editing, finalization, batch totals and exports. The calculation must use the existing tariff amounts supplied for this installation; tariff catalogue amounts must not be changed as part of this work.

This is an identified reimbursement-logic gap, not a diagnosis-mapping correction. No tariff amount or mapping was changed in this assessment.

Source: NHIA Tariffs Operation Manual v22, section 3.5, printed pages 9–10 (official PDF: https://www.nhis.gov.gh/files/TARIFFS%20OPERATION%20MANUAL%20v22.pdf).


## e-claims XML format compatibility check — 26 November 2026

The published NHIA standardized e-claims XML methodology v8.6 (2018-08-25) specifies a document rooted at `<batch>`, with `GeneralInformation`, `BatchInformation`, `ProviderInformation`, and `Patients/PatientData/Claims/Claim` structures. It uses fields such as `ClaimIdentificationNumber`, `MemberNumber`, `ServiceType`, `TotalCost`, `TreatmentsCount`, and `MedicinesCount`.

The facility's stored export sample `all(2).xml` uses a different `<claims>` root and a flatter per-claim structure (`claimid`, `memberInfo`, `serviceInfo`, `diagnoses`, `investigations`, `procedures`, and `medicines`). The current `NHISClaimXMLBuilder` and its tests are intentionally aligned with this facility sample.

These are materially different formats. The public v8.6 document is dated 2018, while the facility sample is a 2026 export. It would be unsafe to replace the live format with the older public schema without confirming which format the current NHIA submission channel accepts for this facility.

### Decision / next verification

- Preserve the current facility XML format for now; do not change the root, element names, nesting, or date conventions based only on the older public v8.6 PDF.
- Obtain the current accepted NHIA upload template or a recent successful/accepted export from the facility's portal.
- Compare that accepted document with `NHISClaimXMLBuilder` and add an automated structural/schema regression test against the confirmed current format.
- Keep CLAIM-it JSON/XML as a separate integration contract; do not mix its payload shape with the facility batch XML.

Sources:
- NHIA, *Standardized e-claims interface for health providers' Hospital Information Systems, XML Methodology v8.6*, document history and file structure (2018-08-25): https://nhis.gov.gh/files/NHIA%20Standardized%20e-claims%20interface%28XML%29%20v8.6.pdf.
- Facility sample: `all(2).xml` in the project Library.
