// src/data/odqData.ts

export interface ODQField {
    id: string;
    label: string;
    placeholder: string;
    suggestions: string[];
    icon: string;
  }
  
  export const ONSET_SUGGESTIONS = [
    "Sudden onset",
    "Gradual onset",
    "Acute onset (less than 24 hours)",
    "Subacute onset (2-14 days)",
    "Chronic onset (more than 2 weeks)",
    "Insidious onset",
    "Paroxysmal onset",
    "Acute on chronic",
    "Present since birth",
    "Post-prandial (after meals)",
    "Post-exertional",
    "Nocturnal (worse at night)",
    "Morning onset",
    "Evening onset",
    "Intermittent",
    "Constant",
    "Episodic",
    "Progressive",
    "Sudden, severe",
    "Gradually worsening"
  ];
  
  export const DURATION_SUGGESTIONS = [
    "Less than 24 hours",
    "1-3 days",
    "4-7 days",
    "1-2 weeks",
    "2-4 weeks",
    "1-3 months",
    "3-6 months",
    "6-12 months",
    "More than 1 year",
    "Several years",
    "Lifelong",
    "Seconds to minutes",
    "Minutes to hours",
    "Hours to days",
    "Days to weeks",
    "Weeks to months",
    "Months to years",
    "Recurrent over past year",
    "Persistent",
    "Episodic over years"
  ];
  
  export const QUALITY_SUGGESTIONS = [
    "Sharp/stabbing",
    "Dull ache",
    "Burning",
    "Throbbing/pulsating",
    "Cramping",
    "Pressure/heaviness",
    "Tightness/constricting",
    "Shooting/radiating",
    "Tingling/pins and needles",
    "Numbness",
    "Itching/pruritic",
    "Scratchy/irritating",
    "Ripping/tearing",
    "Electric shock-like",
    "Colicky (waves of pain)",
    "Squeezing/crushing",
    "Gnawing",
    "Tender to touch",
    "Exquisite/hyperalgesic",
    "Deep aching",
    "Superficial/burning",
    "Intermittent sharp",
    "Continuous dull",
    "Pulsatile (beating with pulse)",
    "Radiating to arm/jaw/back",
    "Non-radiating/localized",
    "Generalized/whole body",
    "Migratory (moving around)",
    "Constant with exacerbations",
    "Worse with activity/rest/movement",
    "Better with rest/lying/sitting"
  ];
  
  export const SEVERITY_SUGGESTIONS = [
    "Mild (aware but easily tolerated)",
    "Moderate (distracting but can continue activities)",
    "Severe (difficult to concentrate, limits activities)",
    "Very severe (unable to do anything)",
    "Worst possible pain",
    "Rating 1-2/10 (Very mild)",
    "Rating 3-4/10 (Mild to moderate)",
    "Rating 5-6/10 (Moderate)",
    "Rating 7-8/10 (Severe)",
    "Rating 9-10/10 (Very severe)"
  ];
  
  export const ASSOCIATED_SYMPTOMS = [
    "Fever/chills",
    "Nausea/vomiting",
    "Diarrhea/constipation",
    "Dizziness/lightheadedness",
    "Shortness of breath",
    "Chest tightness",
    "Palpitations",
    "Sweating/night sweats",
    "Weight loss (unintentional)",
    "Weight gain",
    "Fatigue/malaise",
    "Loss of appetite",
    "Joint swelling/stiffness",
    "Muscle weakness",
    "Headache",
    "Vision changes",
    "Hearing changes",
    "Ringing in ears (tinnitus)",
    "Difficulty swallowing",
    "Hoarseness",
    "Changes in bowel habits",
    "Blood in stool/urine",
    "Changes in urination",
    "Skin rash/lesions",
    "Swelling (oedema)",
    "Confusion/disorientation",
    "Syncope (fainting)",
    "Seizures",
    "Anxiety/depression",
    "Sleep disturbances"
  ];
  
  export const AGGRAVATING_FACTORS = [
    "Activity/exercise",
    "Rest/sitting still",
    "Lying down",
    "Standing upright",
    "Bending forward",
    "Twisting/rotation",
    "Lifting heavy objects",
    "Prolonged sitting",
    "Prolonged standing",
    "Walking",
    "Climbing stairs",
    "Coughing/sneezing",
    "Deep breathing",
    "Eating/meals",
    "Empty stomach",
    "Specific foods (spicy, fatty, acidic)",
    "Stress/anxiety",
    "Cold environment",
    "Heat/humidity",
    "Night time/sleep",
    "Morning upon waking",
    "Menstrual cycle",
    "Sexual activity",
    "Palpation/touch",
    "Pressure on area",
    "Movement of specific joint",
    "Urination/defecation",
    "Alcohol consumption",
    "Smoking/tobacco use",
    "Medications"
  ];
  
  export const RELIEVING_FACTORS = [
    "Rest",
    "Lying down",
    "Sitting upright",
    "Changing position",
    "Medication (specify which)",
    "Heat application",
    "Cold/ice application",
    "Massage",
    "Distraction",
    "Deep breathing/relaxation",
    "Eating/drinking",
    "Empty stomach",
    "Avoiding certain foods",
    "Withdrawal of specific activity",
    "Sleep",
    "Stress reduction",
    "Physical therapy/exercise",
    "Stretching",
    "Splinting/immobilization",
    "Compression",
    "Elevation",
    "Urination/defecation",
    "Vomiting (if nausea)",
    "Nothing relieves",
    "Partial relief with (specify)",
    "Complete relief with (specify)"
  ];
  
  // Complete ODQ Template with all fields
  export const ODQ_TEMPLATES = {
    pain: {
      onset: ONSET_SUGGESTIONS,
      duration: DURATION_SUGGESTIONS,
      quality: QUALITY_SUGGESTIONS,
      severity: SEVERITY_SUGGESTIONS,
      associated: ASSOCIATED_SYMPTOMS,
      aggravating: AGGRAVATING_FACTORS,
      relieving: RELIEVING_FACTORS
    },
    general: {
      onset: ONSET_SUGGESTIONS,
      duration: DURATION_SUGGESTIONS,
      quality: QUALITY_SUGGESTIONS,
      associated: ASSOCIATED_SYMPTOMS,
      aggravating: AGGRAVATING_FACTORS,
      relieving: RELIEVING_FACTORS
    }
  };
  
  // Function to search ODQ suggestions
  export const searchODQSuggestions = (
    category: string,
    searchTerm: string,
    limit: number = 10
  ): string[] => {
    let suggestions: string[] = [];
    
    switch (category) {
      case 'onset':
        suggestions = ONSET_SUGGESTIONS;
        break;
      case 'duration':
        suggestions = DURATION_SUGGESTIONS;
        break;
      case 'quality':
        suggestions = QUALITY_SUGGESTIONS;
        break;
      case 'severity':
        suggestions = SEVERITY_SUGGESTIONS;
        break;
      case 'associated':
        suggestions = ASSOCIATED_SYMPTOMS;
        break;
      case 'aggravating':
        suggestions = AGGRAVATING_FACTORS;
        break;
      case 'relieving':
        suggestions = RELIEVING_FACTORS;
        break;
      default:
        suggestions = [];
    }
    
    if (!searchTerm.trim()) return suggestions.slice(0, limit);
    
    const term = searchTerm.toLowerCase();
    return suggestions
      .filter(s => s.toLowerCase().includes(term))
      .slice(0, limit);
  };
  
  // Helper to generate a formatted ODQ string
  export const formatODQ = (data: {
    onset?: string;
    duration?: string;
    quality?: string;
    severity?: string;
    associated?: string;
    aggravating?: string;
    relieving?: string;
  }): string => {
    const parts = [];
    if (data.onset) parts.push(`Onset: ${data.onset}`);
    if (data.duration) parts.push(`Duration: ${data.duration}`);
    if (data.quality) parts.push(`Quality: ${data.quality}`);
    if (data.severity) parts.push(`Severity: ${data.severity}`);
    if (data.associated) parts.push(`Associated: ${data.associated}`);
    if (data.aggravating) parts.push(`Aggravated by: ${data.aggravating}`);
    if (data.relieving) parts.push(`Relieved by: ${data.relieving}`);
    return parts.join('; ');
  };