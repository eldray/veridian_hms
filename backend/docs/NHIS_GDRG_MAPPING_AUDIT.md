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

## Diagnosis codes requiring Annex C cross-mapping (23 codes)

The diagnosis catalogue has these ICD-10 codes with no *direct* diagnosis-to-G-DRG mapping in our seed. This is **not evidence that NHIA has no applicable G-DRG for them**. Several conditions are grouped under broader G-DRGs, and must be mapped through the exact Annex C inclusion rows and specialty/procedure rules before being considered uncovered:

`A20.9, A21.9, A22.9, A23.9, A38.9, A66.9, B06.9, B27.9, H00.1, H33.2, J30.9, J91.8, J93.1, J96.9, K21.0, K21.9, K29.00, K29.50, K52.9, R99, Z79.01, Z86.11, Z86.19`

These 23 codes are now tracked as a review queue, not asserted to be tariff gaps. The prior regression test that asserted this list as an unmapped-gap set was removed and replaced with a catalogue-presence check. Do not assign guessed codes. Map each diagnosis to the actual Annex C grouping and its applicable age/specialty/procedure conditions. Some history/status codes and brought-in-dead records may not be claim-driving diagnoses and require separate handling.

The manual explicitly confirms broader groupings—for example, Crohn's disease, ulcerative colitis and IBS in MEDI25 (Gastrointestinal Tract Bleeding); dyspepsia and chronic pancreatitis in MEDI26 (Non-Specific Abdominal Conditions); and STDs in MEDI31 (Localised Infections). These examples illustrate why absence of a direct ICD link cannot be equated with absence of a G-DRG. These group examples are not a substitute for validating each of the 23 codes.

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

## Implementation work in this PR

- Corrected principal G-DRG scoring so a performed surgical procedure outranks a primary diagnosis mapping in surgical encounters.
- Added a regression case for a non-primary procedure mapping outranking a primary diagnosis.
- Added structural integrity tests for diagnosis/procedure mapping tariff references and primary codes.
- Added a test that pins the current list of diagnosis mapping gaps for explicit manual review.

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
