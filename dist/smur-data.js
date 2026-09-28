// Active SMUR rules, revised from the user's decisions of 26–28 September 2026.
// Historical source cells and their audit remain separately in catalog-data.js.
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
export const smurSources = freeze({
  "salbutamol": {
    "title": "BDPM · Salbutamol 5 mg/5 mL, RCP — charge IV pédiatrique",
    "url": "https://base-donnees-publique.medicaments.gouv.fr/medicament/63266758/extrait"
  },
  "isofundine": {
    "title": "BDPM · Isofundine, RCP",
    "url": "https://base-donnees-publique.medicaments.gouv.fr/medicament/66312310/extrait#tab-rcp"
  },
  "remplissage": {
    "title": "RCUK 2025 · Cristalloïde isotonique équilibré",
    "url": "https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/paediatric-basic-life-support-guidelines"
  },
  "calcium": {
    "title": "BDPM · Gluconate de calcium PROAMP 10 %",
    "url": "https://base-donnees-publique.medicaments.gouv.fr/medicament/68332774/extrait"
  },
  "morphine": {
    "title": "Pédiadol · Morphine IV continue",
    "url": "https://pediadol.org/morphine-en-iv-continu/"
  },
  "erc": {
    "title": "ERC 2025 · Paediatric Life Support, p. 24–25",
    "url": "https://doi.org/10.1016/j.resuscitation.2025.110767"
  },
  "magnesium": {
    "title": "BDPM · Sulfate de magnésium Lavoisier 15 %",
    "url": "https://base-donnees-publique.medicaments.gouv.fr/medicament/61106121/extrait"
  }
});
export const smurCategories = freeze([
  {
    "id": "acr",
    "label": "ACR"
  },
  {
    "id": "anaphylaxie",
    "label": "Anaphylaxie"
  },
  {
    "id": "remplissage",
    "label": "Remplissage"
  },
  {
    "id": "antibiotiques",
    "label": "Antibiotiques"
  },
  {
    "id": "cardio",
    "label": "Cardio"
  },
  {
    "id": "sedation",
    "label": "Sédation / curares"
  },
  {
    "id": "neuro",
    "label": "Neuro"
  },
  {
    "id": "antidotes",
    "label": "Antidotes / G10 / Exacyl"
  },
  {
    "id": "ivc",
    "label": "Perfusions IV continues"
  },
  {
    "id": "hyperkaliemie",
    "label": "Hyperkaliémie"
  },
  {
    "id": "transfusion",
    "label": "Transfusion"
  }
]);
export const smurRecords = freeze([
  {
    "id": "adrenaline-iv",
    "category": "acr",
    "name": "Adrénaline IV",
    "sourceCells": [
      "Adrénaline 1 mg/mL",
      "10 mcg/kg",
      "1 mL + 9 mL NaCl 0.9%",
      "1,0 mL",
      "",
      "100 mcg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 10,
      "unit": "mcg",
      "stock": {
        "amount": 1,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": null,
      "referenceVolume": 1,
      "decimals": 1,
      "referenceDose": 100,
      "maximumDose": 1000,
      "fixedDoseFromWeightKg": 50,
      "fixedDose": 1000,
      "weightMix": {
        "thresholdKg": 50,
        "below": {
          "takeMl": 1,
          "addMl": 9
        },
        "atOrAbove": null
      },
      "diluent": "NaCl 0,9 %"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "10 mcg/kg",
      "particulars": [
        "À partir de 50 kg : 1 mg de produit pur, sans dilution."
      ],
      "dilution": "1 mL de produit + 9 mL de diluant",
      "administration": "IVD flash, puis rincer avec 5 mL de NaCl 0,9 %",
      "questions": [],
      "route": "IVD",
      "durationMinutes": null,
      "administrationNote": "flash, puis rincer avec 5 mL de NaCl 0,9 %"
    },
    "sources": []
  },
  {
    "id": "adrenaline-im",
    "category": "anaphylaxie",
    "name": "Adrénaline IM",
    "sourceCells": [
      "Adrénaline 1 mg/mL",
      "10 mcg/kg",
      "non",
      "0,10 mL",
      "",
      "100 mcg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 10,
      "unit": "mcg",
      "stock": {
        "amount": 1,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": null,
      "referenceVolume": 0.1,
      "decimals": 2,
      "referenceDose": 100,
      "maximumDose": 500
    },
    "issues": [
      {
        "code": "im-in-acr",
        "message": "La voie IM figure dans la rubrique ACR. L’indication doit être explicitée séparément ; aucune indication ni séquence thérapeutique n’est déduite de ce classement.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "10 mcg/kg",
      "particulars": [
        "Dose maximale confirmée : 500 mcg (0,5 mg)."
      ],
      "dilution": "Sans dilution",
      "administration": "IM",
      "questions": [],
      "route": "IM",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "bicarbonate-acr",
    "category": "acr",
    "name": "Bicarbonate de sodium",
    "sourceCells": [
      "Bicarbonate 4,2%",
      "1 mmol/kg",
      "non",
      "20,0 mL",
      "",
      "10,0 mmol"
    ],
    "model": {
      "type": "dose",
      "coefficient": 1,
      "unit": "mmol",
      "stock": {
        "amount": 5,
        "unit": "mmol",
        "volumeMl": 10
      },
      "mix": null,
      "referenceVolume": 20,
      "decimals": 1,
      "referenceDose": 10
    },
    "issues": [
      {
        "code": "specific-indication",
        "message": "L’indication précise du bicarbonate dans cette rubrique doit être documentée ; ce classement ne signifie pas une administration systématique.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "1 mmol/kg",
      "particulars": [],
      "dilution": "Sans dilution",
      "administration": "IVL",
      "questions": [],
      "route": "IVL",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "calcium-chlorure",
    "category": "acr",
    "name": "Chlorure de calcium",
    "sourceCells": [
      "Chlorure de calcium 10%",
      "20 mg/kg",
      "non",
      "2,0 mL",
      "",
      "200 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 20,
      "unit": "mg",
      "stock": {
        "amount": 1000,
        "unit": "mg",
        "volumeMl": 10
      },
      "mix": null,
      "referenceVolume": 2,
      "decimals": 1,
      "referenceDose": 200,
      "maximumDose": 1000
    },
    "issues": [
      {
        "code": "calcium-basis",
        "message": "Le contrôle suppose des mg de chlorure de calcium, et non des mg de calcium élément. Confirmer cette expression de dose et l’indication.",
        "source": "calciumChlorure"
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "20 mg/kg de chlorure de calcium, maximum 1 g (10 mL)",
      "particulars": [
        "Dose exprimée en chlorure de calcium."
      ],
      "dilution": "Sans dilution",
      "administration": "IVD",
      "questions": [],
      "route": "IVD",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "cardioversion",
    "category": "acr",
    "name": "Cardioversion",
    "sourceCells": [
      "",
      "1 J/kg",
      "",
      "10 J",
      "",
      ""
    ],
    "model": {
      "type": "dose",
      "coefficient": 1,
      "unit": "J",
      "stock": null,
      "mix": null,
      "referenceVolume": null,
      "decimals": null,
      "referenceDose": 10,
      "maximumDose": null
    },
    "issues": [
      {
        "code": "procedure-context",
        "message": "Geste électrique, pas un médicament. Rythme, synchronisation, séquence de chocs et plafond d’énergie à documenter.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "1 J/kg",
      "particulars": [],
      "dilution": "Sans objet",
      "administration": "Mettre le défibrillateur en mode « Synchrone »",
      "questions": [],
      "route": "",
      "durationMinutes": null,
      "administrationNote": "Mettre le défibrillateur en mode « Synchrone »"
    },
    "sources": []
  },
  {
    "id": "defibrillation",
    "category": "acr",
    "name": "Défibrillation",
    "sourceCells": [
      "",
      "4 J/kg",
      "",
      "40 J",
      "",
      ""
    ],
    "model": {
      "type": "dose",
      "coefficient": 4,
      "unit": "J",
      "stock": null,
      "mix": null,
      "referenceVolume": null,
      "decimals": null,
      "referenceDose": 40,
      "maximumDose": 200
    },
    "issues": [
      {
        "code": "procedure-context",
        "message": "Geste électrique, pas un médicament. Rythme, séquence de chocs et plafond d’énergie à documenter.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "4 J/kg",
      "particulars": [],
      "dilution": "Sans objet",
      "administration": "Défibrillation",
      "questions": [],
      "route": "",
      "durationMinutes": null,
      "administrationNote": "Défibrillation"
    },
    "sources": []
  },
  {
    "id": "gentamicine",
    "category": "antibiotiques",
    "name": "Gentamicine",
    "sourceCells": [
      "",
      "5 mg/kg",
      "à passer en 30 min",
      "",
      "",
      "50,0 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 5,
      "unit": "mg",
      "stock": {
        "amount": 40,
        "unit": "mg",
        "volumeMl": 2
      },
      "mix": null,
      "referenceVolume": null,
      "decimals": null,
      "referenceDose": 50,
      "volumeKind": "withdrawal",
      "maximumDose": null,
      "administrationConcentration": null
    },
    "issues": [
      {
        "code": "antibiotic-context",
        "message": "Indication, dose par administration ou par jour, intervalle, dose maximale et concentration après reconstitution non précisés. Ne pas déduire une prescription de cette ligne.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "5 mg/kg/dose",
      "particulars": [],
      "dilution": "Dilution laissée à l’IDE",
      "administration": "IVL sur 30 min",
      "questions": [],
      "route": "IVL",
      "durationMinutes": 30.0,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "amoxicilline",
    "category": "antibiotiques",
    "name": "Amoxicilline",
    "sourceCells": [
      "",
      "100 mg/kg",
      "",
      "",
      "",
      "1000 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 100,
      "unit": "mg",
      "stock": null,
      "mix": null,
      "referenceVolume": null,
      "decimals": null,
      "referenceDose": 1000,
      "maximumDose": 2000
    },
    "issues": [
      {
        "code": "antibiotic-context",
        "message": "Indication, dose par administration ou par jour, intervalle, dose maximale et concentration après reconstitution non précisés. Ne pas déduire une prescription de cette ligne.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "100 mg/kg/dose — une seule dose",
      "particulars": [],
      "dilution": "",
      "administration": "IV",
      "questions": [],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "amoxicilline-clavulanique",
    "category": "antibiotiques",
    "name": "Amoxicilline / acide clavulanique",
    "sourceCells": [
      "Amoxicilline/acide clavulanique 500 mg/50 mg",
      "80 mg/kg/jour ÷ 3, arrondi supérieur à 10 mg",
      "",
      "",
      "",
      ""
    ],
    "model": {
      "type": "dose",
      "coefficient": 26.666666666666668,
      "unit": "mg",
      "stock": null,
      "mix": null,
      "referenceVolume": null,
      "decimals": null,
      "referenceDose": 800,
      "maximumDose": 2000,
      "dailyCoefficient": 80,
      "divisionsPerDay": 3,
      "roundDoseUpTo": 10
    },
    "issues": [
      {
        "code": "antibiotic-context",
        "message": "Indication, dose par administration ou par jour, intervalle, dose maximale et concentration après reconstitution non précisés. Ne pas déduire une prescription de cette ligne.",
        "source": null
      },
      {
        "code": "combination-basis",
        "message": "Préciser si les mg concernent l’amoxicilline et indiquer le rapport amoxicilline/acide clavulanique de la présentation.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "80 mg/kg/jour d’amoxicilline ÷ 3, puis arrondi à la dizaine de mg supérieure ; maximum 2 g par dose",
      "particulars": [
        "Présentation : 500 mg d’amoxicilline / 50 mg d’acide clavulanique. Dose exprimée en amoxicilline."
      ],
      "dilution": "",
      "administration": "IV",
      "questions": [],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "cefotaxime",
    "category": "antibiotiques",
    "name": "Céfotaxime",
    "sourceCells": [
      "",
      "75 mg/kg",
      "",
      "",
      "",
      "750 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 75,
      "unit": "mg",
      "stock": null,
      "mix": null,
      "referenceVolume": null,
      "decimals": null,
      "referenceDose": 750,
      "maximumDose": 3000
    },
    "issues": [
      {
        "code": "antibiotic-context",
        "message": "Indication, dose par administration ou par jour, intervalle, dose maximale et concentration après reconstitution non précisés. Ne pas déduire une prescription de cette ligne.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "75 mg/kg/dose — une seule dose",
      "particulars": [],
      "dilution": "",
      "administration": "IV",
      "questions": [],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "ceftriaxone",
    "category": "antibiotiques",
    "name": "Ceftriaxone",
    "sourceCells": [
      "",
      "100 mg/kg",
      "",
      "",
      "",
      "1000 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 100,
      "unit": "mg",
      "stock": null,
      "mix": null,
      "referenceVolume": null,
      "decimals": null,
      "referenceDose": 1000,
      "maximumDose": 4000
    },
    "issues": [
      {
        "code": "antibiotic-context",
        "message": "Indication, dose par administration ou par jour, intervalle, dose maximale et concentration après reconstitution non précisés. Ne pas déduire une prescription de cette ligne.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "100 mg/kg/dose — une seule dose",
      "particulars": [],
      "dilution": "",
      "administration": "IV",
      "questions": [],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "amiodarone",
    "category": "cardio",
    "name": "Amiodarone",
    "sourceCells": [
      "Cordarone 150 mg/3 mL",
      "5 mg/kg",
      "3 mL + 17 mL de G5%",
      "6,7 mL",
      "",
      "50,0 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 5,
      "unit": "mg",
      "stock": {
        "amount": 150,
        "unit": "mg",
        "volumeMl": 3
      },
      "mix": {
        "takeMl": 3,
        "addMl": 17
      },
      "referenceVolume": 6.7,
      "decimals": 1,
      "referenceDose": 50,
      "maximumDose": 300,
      "diluent": "G5 %"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "5 mg/kg",
      "particulars": [],
      "dilution": "3 mL de produit + 17 mL de diluant",
      "administration": "IVD, puis rincer avec 5 mL de NaCl 0,9 %",
      "questions": [],
      "route": "IVD",
      "durationMinutes": null,
      "administrationNote": "puis rincer avec 5 mL de NaCl 0,9 %"
    },
    "sources": []
  },
  {
    "id": "atropine",
    "category": "cardio",
    "name": "Atropine",
    "sourceCells": [
      "Atropine 0,25 mg/1 mL",
      "20 mcg/kg",
      "Sans dilution",
      "0,8 mL",
      "",
      "200 mcg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 20,
      "unit": "mcg",
      "stock": {
        "amount": 0.25,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": null,
      "referenceVolume": 0.8,
      "decimals": 1,
      "referenceDose": 200,
      "maximumDose": 2000
    },
    "issues": [
      {
        "code": "atropine-volume",
        "message": "Pour l’hypothèse de 10 kg : 200 mcg = 0,2 mg ; 0,2 ÷ 0,5 = 0,4 mL. Le tableau affiche 0,8 mL. La valeur d’origine reste conservée, sans correction clinique automatique.",
        "source": "atropine"
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "20 mcg/kg",
      "particulars": [],
      "dilution": "Sans dilution",
      "administration": "IVD",
      "questions": [],
      "route": "IVD",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "hydrocortisone",
    "category": "cardio",
    "name": "Hydrocortisone",
    "sourceCells": [
      "Hydrocort 100 mg/2 mL",
      "2 mg/kg",
      "2 mL + 8 mL NaCl 0.9%",
      "2,0 mL",
      "",
      "20,0 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 2,
      "unit": "mg",
      "stock": {
        "amount": 100,
        "unit": "mg",
        "volumeMl": 2
      },
      "mix": {
        "takeMl": 2,
        "addMl": 8
      },
      "referenceVolume": 2,
      "decimals": 1,
      "referenceDose": 20,
      "maximumDose": 100,
      "diluent": "NaCl 0,9 %"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "2 mg/kg",
      "particulars": [],
      "dilution": "2 mL de produit + 8 mL de diluant",
      "administration": "IVD",
      "questions": [],
      "route": "IVD",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "magnesium",
    "category": "cardio",
    "name": "Sulfate de magnésium",
    "sourceCells": [
      "Sulfate magnéisum 15%",
      "50 mg/kg",
      "non",
      "3,3 mL",
      "",
      "500 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 50,
      "unit": "mg",
      "stock": {
        "amount": 1500,
        "unit": "mg",
        "volumeMl": 10
      },
      "mix": null,
      "referenceVolume": 3.3,
      "decimals": 1,
      "referenceDose": 500,
      "maximumDose": 2000,
      "volumeKind": "withdrawal",
      "administrationConcentration": null
    },
    "issues": [
      {
        "code": "salt-basis",
        "message": "Le contrôle interprète 15 % comme 150 mg/mL de sel et la dose en mg de sulfate de magnésium. Confirmer l’expression de la dose, la présentation et la durée d’administration.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "50 mg/kg/dose de sulfate de magnésium, maximum 2 g",
      "particulars": [],
      "dilution": "Volume de produit à prélever ; dilution finale à préciser.",
      "administration": "IVL sur 20 min",
      "questions": [
        "Préciser la dilution finale pour l’administration sur 20 min."
      ],
      "route": "IVL",
      "durationMinutes": 20.0,
      "administrationNote": ""
    },
    "sources": [
      "magnesium"
    ]
  },
  {
    "id": "triphosadenine",
    "category": "cardio",
    "name": "Triphosadénine — 1re dose",
    "sourceCells": [
      "Striadyne 20 mg/2 mL",
      "1 mg/kg",
      "non",
      "1,0 mL",
      "",
      "10,0 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 1,
      "unit": "mg",
      "stock": {
        "amount": 20,
        "unit": "mg",
        "volumeMl": 2
      },
      "mix": null,
      "referenceVolume": 1,
      "decimals": 1,
      "referenceDose": 10,
      "maximumDose": 10
    },
    "issues": [
      {
        "code": "atp-not-adenosine",
        "message": "Vérifier le protocole propre à la triphosadénine (ATP), sans substitution par un schéma d’adénosine ; bolus, répétitions et dose maximale non précisés.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Première dose : 1 mg/kg, maximum 10 mg",
      "particulars": [],
      "dilution": "Sans dilution",
      "administration": "IV — modalités à préciser",
      "questions": [
        "Préciser les modalités d’administration."
      ],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": "modalités à préciser"
    },
    "sources": []
  },
  {
    "id": "triphosadenine-2",
    "category": "cardio",
    "name": "Triphosadénine — 2e dose",
    "sourceCells": [
      "Décision locale du 26 septembre 2026",
      "",
      "",
      "",
      "",
      ""
    ],
    "model": {
      "type": "dose",
      "coefficient": 2,
      "unit": "mg",
      "stock": {
        "amount": 20,
        "unit": "mg",
        "volumeMl": 2
      },
      "mix": null,
      "referenceVolume": 1,
      "decimals": 1,
      "referenceDose": 10,
      "maximumDose": 20
    },
    "issues": [],
    "kind": "reference",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Deuxième dose : 2 mg/kg, maximum 20 mg",
      "particulars": [],
      "dilution": "Sans dilution",
      "administration": "IV — modalités à préciser",
      "questions": [
        "Préciser les modalités d’administration."
      ],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": "modalités à préciser"
    },
    "sources": []
  },
  {
    "id": "etomidate",
    "category": "sedation",
    "name": "Étomidate",
    "sourceCells": [
      "Hypnomidate 20 mg/10 mL",
      "0,3 mg/kg",
      "non",
      "1,50 mL",
      "",
      "3,00 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 0.3,
      "unit": "mg",
      "stock": {
        "amount": 20,
        "unit": "mg",
        "volumeMl": 10
      },
      "mix": null,
      "referenceVolume": 1.5,
      "decimals": 2,
      "referenceDose": 3,
      "minimumAgeMonths": 24,
      "maximumDose": null,
      "noCeiling": true
    },
    "issues": [
      {
        "code": "age-restriction",
        "message": "Restriction transcrite : âge strictement supérieur à 2 ans. L’âge du cas de référence n’est pas fourni ; l’éligibilité n’est pas vérifiée.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "hideBelowAgeMonths": 24,
    "protocol": {
      "posology": "0,3 mg/kg",
      "particulars": [
        "Masqué avant 24 mois ; visible et calculable à partir de 24 mois inclus. Si l’âge manque, la fiche reste visible et le calcul attend l’âge."
      ],
      "dilution": "Sans dilution",
      "administration": "IVL",
      "questions": [],
      "route": "IVL",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "ketamine-analgesie",
    "category": "sedation",
    "name": "Kétamine (analgésie)",
    "sourceCells": [
      "Ketamine 250 mg/5 mL",
      "0,5 mg/kg",
      "1 mL + 9 mL NaCl 0,9%",
      "1,00 mL",
      "",
      "5,0 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 0.5,
      "unit": "mg",
      "stock": {
        "amount": 250,
        "unit": "mg",
        "volumeMl": 5
      },
      "mix": null,
      "referenceVolume": 1,
      "decimals": 2,
      "referenceDose": 5,
      "weightMix": {
        "thresholdKg": 15,
        "below": {
          "takeMl": 1,
          "addMl": 9
        },
        "atOrAbove": null
      },
      "diluent": "NaCl 0,9 %",
      "pendingCeiling": 80
    },
    "issues": [
      {
        "code": "ketamine-context",
        "message": "Confirmer le protocole pédiatrique, la voie et la vitesse d’administration pour l’analgésie.",
        "source": "ketamine"
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "0,5 mg/kg",
      "particulars": [],
      "dilution": "1 mL de produit + 9 mL de diluant",
      "administration": "IVL sur 2 à 3 min",
      "questions": [
        "Plafond proposé de 80 mg conservé en suspens ; non appliqué au calcul en attendant la validation collective."
      ],
      "route": "IVL",
      "durationMinutes": null,
      "administrationNote": "sur 2 à 3 min"
    },
    "sources": []
  },
  {
    "id": "ketamine-intubation",
    "category": "sedation",
    "name": "Kétamine (intubation)",
    "sourceCells": [
      "Ketamine 250 mg/5 mL",
      "4 mg/kg",
      "2 mL + 8 mL NaCl 0,9%",
      "4,0 mL",
      "",
      "40,0 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 4,
      "unit": "mg",
      "stock": {
        "amount": 250,
        "unit": "mg",
        "volumeMl": 5
      },
      "mix": {
        "takeMl": 2,
        "addMl": 8
      },
      "referenceVolume": 4,
      "decimals": 1,
      "referenceDose": 40,
      "tiers": [
        {
          "maxAgeMonthsExclusive": 18,
          "coefficient": 4
        },
        {
          "coefficient": 2
        }
      ],
      "diluent": "NaCl 0,9 %"
    },
    "issues": [
      {
        "code": "ketamine-route",
        "message": "La dose de 4 mg/kg est transcrite telle quelle. Confirmer la voie, le protocole d’induction et le contexte avant toute utilisation ; elle n’est pas validée par ce contrôle arithmétique.",
        "source": "ketamine"
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "4 mg/kg avant 18 mois ; 2 mg/kg à partir de 18 mois",
      "particulars": [
        "Palier d’âge confirmé à 18 mois."
      ],
      "dilution": "2 mL de produit + 8 mL de diluant",
      "administration": "IVL sur 2 à 3 min",
      "questions": [],
      "route": "IVL",
      "durationMinutes": null,
      "administrationNote": "sur 2 à 3 min"
    },
    "sources": []
  },
  {
    "id": "midazolam-iv",
    "category": "sedation",
    "name": "Midazolam",
    "sourceCells": [
      "Midazolam 5 mg/mL",
      "0,1 mg/kg",
      "non",
      "0,20 mL",
      "",
      "1,00 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 0.1,
      "unit": "mg",
      "stock": {
        "amount": 50,
        "unit": "mg",
        "volumeMl": 10
      },
      "mix": null,
      "referenceVolume": 0.2,
      "decimals": 2,
      "referenceDose": 1,
      "maximumDose": null,
      "weightMix": {
        "thresholdKg": 10,
        "below": {
          "takeMl": 1,
          "addMl": 9
        },
        "atOrAbove": null
      },
      "diluent": "NaCl 0,9 %"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "0,1 mg/kg",
      "particulars": [],
      "dilution": "non",
      "administration": "IVL",
      "questions": [],
      "route": "IVL",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "morphine-dc",
    "category": "sedation",
    "name": "Morphine (DC)",
    "sourceCells": [
      "Morphine 1 mg/mL",
      "0,1 mg/kg",
      "non",
      "1,00 mL",
      "",
      "1,00 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 0.1,
      "unit": "mg",
      "stock": {
        "amount": 10,
        "unit": "mg",
        "volumeMl": 10
      },
      "mix": null,
      "referenceVolume": 1,
      "decimals": 2,
      "referenceDose": 1,
      "maximumDose": 6,
      "weightMix": {
        "thresholdKg": 10,
        "below": {
          "takeMl": 1,
          "addMl": 9
        },
        "atOrAbove": null
      },
      "diluent": "NaCl 0,9 %"
    },
    "issues": [
      {
        "code": "dc-abbreviation",
        "message": "L’abréviation « DC », la voie et les modalités d’administration doivent être confirmées.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Dose de charge : 0,1 mg/kg, maximum 6 mg",
      "particulars": [
        "DC = dose de charge."
      ],
      "dilution": "Si poids < 10 kg : 1 mL de morphine 1 mg/mL + 9 mL de NaCl 0,9 % ; sinon sans dilution",
      "administration": "IVL",
      "questions": [],
      "route": "IVL",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "morphine-titration",
    "category": "sedation",
    "name": "Morphine (titration)",
    "sourceCells": [
      "Morphine 1 mg/mL",
      "0,025 mg/kg",
      "non",
      "0,25 mL",
      "",
      "0,25 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 0.025,
      "unit": "mg",
      "stock": {
        "amount": 1,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": null,
      "referenceVolume": 0.25,
      "decimals": 2,
      "referenceDose": 0.25,
      "weightMix": {
        "thresholdKg": 10,
        "below": {
          "takeMl": 1,
          "addMl": 9
        },
        "atOrAbove": null
      },
      "diluent": "NaCl 0,9 %"
    },
    "issues": [
      {
        "code": "titration",
        "message": "Intervalle de titration, critères d’arrêt et dose cumulée maximale absents du tableau.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "0,025 mg/kg toutes les 5 min après la dose de charge, jusqu’à analgésie",
      "particulars": [],
      "dilution": "Si poids < 10 kg : 1 mL de morphine 1 mg/mL + 9 mL de NaCl 0,9 % ; sinon sans dilution",
      "administration": "IV",
      "questions": [
        "Définir les critères locaux d’arrêt et de surveillance de la titration."
      ],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "propofol",
    "category": "sedation",
    "name": "Propofol",
    "sourceCells": [
      "Propofol 10 mg/mL",
      "2 mg/kg",
      "non",
      "2,0 mL",
      "",
      "20,0 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 2,
      "unit": "mg",
      "stock": {
        "amount": 200,
        "unit": "mg",
        "volumeMl": 20
      },
      "mix": null,
      "referenceVolume": 2,
      "decimals": 1,
      "referenceDose": 20,
      "maximumDose": null,
      "noCeiling": true
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "2 mg/kg",
      "particulars": [],
      "dilution": "Sans dilution",
      "administration": "IV",
      "questions": [],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "propofol-lisa",
    "category": "sedation",
    "name": "Propofol LISA",
    "sourceCells": [
      "Décision locale du 26 septembre 2026",
      "",
      "",
      "",
      "",
      ""
    ],
    "model": {
      "type": "dose",
      "coefficient": 0.5,
      "unit": "mg",
      "stock": {
        "amount": 200,
        "unit": "mg",
        "volumeMl": 20
      },
      "mix": null,
      "referenceVolume": 2,
      "decimals": 1,
      "referenceDose": 20,
      "maximumDose": null,
      "noCeiling": true
    },
    "issues": [],
    "kind": "reference",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "0,5 mg/kg",
      "particulars": [],
      "dilution": "Sans dilution",
      "administration": "IV — modalités à préciser",
      "questions": [
        "Préciser les modalités d’administration."
      ],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": "modalités à préciser"
    },
    "sources": []
  },
  {
    "id": "suxamethonium",
    "category": "sedation",
    "name": "Suxaméthonium (Célocurine)",
    "sourceCells": [
      "Celocurine 50 mg/mL",
      "2 mg/kg",
      "1 mL + 4 mL NaCl 0,9%",
      "2,0 mL",
      "",
      "20,0 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 2,
      "unit": "mg",
      "stock": {
        "amount": 100,
        "unit": "mg",
        "volumeMl": 2
      },
      "mix": {
        "takeMl": 1,
        "addMl": 4
      },
      "referenceVolume": 2,
      "decimals": 1,
      "referenceDose": 20,
      "tiers": [
        {
          "maxAgeMonthsExclusive": 18,
          "coefficient": 2
        },
        {
          "coefficient": 1
        }
      ],
      "maximumDose": null,
      "diluent": "NaCl 0,9 %"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "2 mg/kg avant 18 mois ; 1 mg/kg à partir de 18 mois",
      "particulars": [
        "Palier confirmé à 18 mois."
      ],
      "dilution": "1 mL de produit + 4 mL de diluant",
      "administration": "IVL",
      "questions": [],
      "route": "IVL",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "atracurium-bolus",
    "category": "sedation",
    "name": "Atracurium",
    "sourceCells": [
      "Atracurium 50 mg/5 mL",
      "0,6 mg/kg",
      "non",
      "0,6 mL",
      "",
      "6,0 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 0.5,
      "unit": "mg",
      "stock": {
        "amount": 50,
        "unit": "mg",
        "volumeMl": 5
      },
      "mix": {
        "takeMl": 1,
        "addMl": 9
      },
      "referenceVolume": 0.6,
      "decimals": 1,
      "referenceDose": 6,
      "diluent": "NaCl 0,9 %",
      "pendingCeiling": 30
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "0,5 mg/kg par dose, soit 0,5 mL/kg après dilution à 1 mg/mL",
      "particulars": [],
      "dilution": "1 mL (10 mg) + 9 mL de NaCl 0,9 % → 1 mg/mL",
      "administration": "IV",
      "questions": [
        "Confirmer le plafond de 30 mg."
      ],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "clonazepam-bolus",
    "category": "neuro",
    "name": "Clonazépam",
    "sourceCells": [
      "Rivotril 1 mg/mL",
      "0,05 mg/kg",
      "1 mL + 4 mL NaCl 0,9%",
      "2,5 mL",
      "",
      "0,500 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 0.05,
      "unit": "mg",
      "stock": {
        "amount": 1,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": {
        "takeMl": 1,
        "addMl": 4
      },
      "referenceVolume": 2.5,
      "decimals": 1,
      "referenceDose": 0.5,
      "diluent": "NaCl 0,9 %",
      "maximumDose": 1
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "0,05 mg/kg",
      "particulars": [
        "Ampoule de médicament seule : 1 mg/1 mL."
      ],
      "dilution": "1 mL de produit + 4 mL de diluant",
      "administration": "IVL sur 10 min",
      "questions": [],
      "route": "IVL",
      "durationMinutes": 10.0,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "midazolam-ij",
    "category": "neuro",
    "name": "Midazolam (IJ)",
    "sourceCells": [
      "Midazolam 5 mg/mL",
      "0,3 mg/kg",
      "non",
      "0,60 mL",
      "",
      "3,0 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 0.3,
      "unit": "mg",
      "stock": {
        "amount": 5,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": null,
      "referenceVolume": 0.6,
      "decimals": 2,
      "referenceDose": 3,
      "pendingCeiling": 10
    },
    "issues": [
      {
        "code": "ij-route",
        "message": "La voie « IJ » n’est pas développée dans la source. Confirmer son sens et la formulation adaptée ; aucune voie IV ou buccale n’a été déduite.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "0,3 mg/kg",
      "particulars": [
        "IJ = intergingivojugal."
      ],
      "dilution": "Sans dilution",
      "administration": "Intergingivojugale",
      "questions": [
        "Confirmer le plafond de 10 mg."
      ],
      "route": "Intergingivojugale",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "diazepam-ir",
    "category": "neuro",
    "name": "Diazépam (IR)",
    "sourceCells": [
      "Valium 10 mg/2 mL",
      "0,5 mg/kg",
      "non",
      "1,0 mL",
      "",
      "5,0 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 0.5,
      "unit": "mg",
      "stock": {
        "amount": 10,
        "unit": "mg",
        "volumeMl": 2
      },
      "mix": null,
      "referenceVolume": 1,
      "decimals": 1,
      "referenceDose": 5,
      "maximumDose": 10
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "0,5 mg/kg",
      "particulars": [],
      "dilution": "Sans dilution",
      "administration": "Intrarectale",
      "questions": [],
      "route": "Intrarectale",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "phenobarbital",
    "category": "neuro",
    "name": "Phénobarbital",
    "sourceCells": [
      "Gardenal 200 mg/4 mL",
      "20 mg/kg",
      "non",
      "4,0 mL",
      "",
      "200 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 20,
      "unit": "mg",
      "stock": {
        "amount": 200,
        "unit": "mg",
        "volumeMl": 4
      },
      "mix": null,
      "referenceVolume": 4,
      "decimals": 1,
      "referenceDose": 200,
      "volumeKind": "withdrawal",
      "tiers": [
        {
          "maxAgeMonthsExclusive": 1,
          "coefficient": 20
        },
        {
          "coefficient": 15
        }
      ],
      "maximumDose": 600,
      "administrationConcentration": null
    },
    "issues": [
      {
        "code": "reconstitution",
        "message": "Vérifier la reconstitution, la concentration utilisable et la vitesse d’administration ; « non » ne documente pas ces modalités.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "20 mg/kg avant 1 mois ; 15 mg/kg à partir de 1 mois",
      "particulars": [
        "Palier d’âge issu du tableau à confirmer."
      ],
      "dilution": "Présentation du tableau : 200 mg dans 4 mL. Reconstitution et éventuelle dilution supplémentaire à préciser.",
      "administration": "IVL sur 20 min",
      "questions": [
        "Confirmer le palier à 1 mois et la reconstitution/dilution finale."
      ],
      "route": "IVL",
      "durationMinutes": 20.0,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "levetiracetam",
    "category": "neuro",
    "name": "Lévétiracétam",
    "sourceCells": [
      "Keppra 100 mg/mL",
      "40 mg/kg",
      "non",
      "4,0 mL",
      "",
      "400 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 40,
      "unit": "mg",
      "stock": {
        "amount": 500,
        "unit": "mg",
        "volumeMl": 5
      },
      "mix": null,
      "referenceVolume": 4,
      "decimals": 1,
      "referenceDose": 400,
      "volumeKind": "withdrawal",
      "maximumDose": 3000,
      "administrationConcentration": null
    },
    "issues": [
      {
        "code": "levetiracetam-form",
        "message": "La forme pharmaceutique et la dilution pour administration ne sont pas précisées. Les 4 mL du tableau ne doivent pas être interprétés comme un volume à injecter directement.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "40 mg/kg, maximum 3 g",
      "particulars": [],
      "dilution": "Volume à prélever calculé à 100 mg/mL ; dilution finale à préciser.",
      "administration": "IVL sur 5 min",
      "questions": [
        "Préciser la dilution finale."
      ],
      "route": "IVL",
      "durationMinutes": 5.0,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "phenytoine",
    "category": "neuro",
    "name": "Phénytoïne",
    "sourceCells": [
      "Dilantin 250 mg/5 mL",
      "20 mg/kg",
      "5 mL + 5 mL NaCl 0.9%",
      "8,0 mL",
      "",
      "200 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 20,
      "unit": "mg",
      "stock": {
        "amount": 250,
        "unit": "mg",
        "volumeMl": 5
      },
      "mix": {
        "takeMl": 5,
        "addMl": 5
      },
      "referenceVolume": 8,
      "decimals": 1,
      "referenceDose": 200,
      "diluent": "NaCl 0,9 %",
      "maximumDose": 1000
    },
    "issues": [
      {
        "code": "phenytoin-preparation",
        "message": "Concentration finale calculée : 25 mg/mL. Faire confirmer la dilution, la compatibilité, la voie et le débit par le protocole du service.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "20 mg/kg",
      "particulars": [],
      "dilution": "5 mL de produit + 5 mL de diluant",
      "administration": "IVL sur 20 min",
      "questions": [],
      "route": "IVL",
      "durationMinutes": 20.0,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "ssh",
    "category": "neuro",
    "name": "SSH 7,5 %",
    "sourceCells": [
      "SSH 7,5 % préparé par la pharmacie",
      "3 mL/kg",
      "Préparation prête à l’emploi",
      "30,0 mL",
      "",
      ""
    ],
    "model": {
      "type": "dose",
      "coefficient": 3,
      "unit": "mL",
      "stock": null,
      "mix": null,
      "massPerMl": 75,
      "massUnit": "mg"
    },
    "issues": [
      {
        "code": "ssh-mixture",
        "message": "La mention « dont 10 mL de NaCl 10 % » ne permet pas de reconstituer une préparation finale documentée à 7,5 %. Composition complète et volume final à préciser ; aucun volume de préparation n’est calculé.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "3 mL/kg",
      "particulars": [],
      "dilution": "Aucune manipulation : préparation à 7,5 % fournie par la pharmacie",
      "administration": "IVL sur 20 min",
      "questions": [],
      "route": "IVL",
      "durationMinutes": 20.0,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "tranexamique-bolus",
    "category": "antidotes",
    "name": "Acide tranexamique",
    "sourceCells": [
      "Exacyl 0.5 g/5 mL",
      "10 mg/kg",
      "non",
      "1,0 mL",
      "",
      "100 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 20,
      "unit": "mg",
      "stock": {
        "amount": 0.5,
        "unit": "g",
        "volumeMl": 5
      },
      "mix": null,
      "referenceVolume": 1,
      "decimals": 1,
      "referenceDose": 100,
      "maximumDose": 1000,
      "fixedDoseFromAgeMonths": 120,
      "fixedDose": 1000,
      "volumeKind": "withdrawal",
      "administrationConcentration": null
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Avant 10 ans : dose de charge de 20 mg/kg ; dès 10 ans : 1 g",
      "particulars": [
        "Maximum 1 g conservé. Entretien dans les perfusions continues."
      ],
      "dilution": "NaCl 0,9 % — dilution finale à préciser",
      "administration": "IV",
      "questions": [
        "Préciser la dilution et la durée de la dose de charge."
      ],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "cafeine",
    "category": "antidotes",
    "name": "Caféine",
    "sourceCells": [
      "Citrate caféine 25 mg/mL",
      "20 mg/kg",
      "non",
      "8,00 mL",
      "",
      "200 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 20,
      "unit": "mg",
      "stock": {
        "amount": 25,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": null,
      "maximumDose": null,
      "noCeiling": true
    },
    "issues": [
      {
        "code": "caffeine-basis",
        "message": "Préciser si la dose est exprimée en caféine base ou en citrate de caféine, ainsi que la présentation exacte et la population. Le volume n’est pas recalculé tant que cette distinction n’est pas résolue.",
        "source": "cafeine"
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Dose de charge : 20 mg/kg de citrate de caféine",
      "particulars": [
        "Dose exprimée en citrate de caféine."
      ],
      "dilution": "Sans dilution",
      "administration": "IVL sur 20 min",
      "questions": [],
      "route": "IVL",
      "durationMinutes": 20.0,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "flumazenil",
    "category": "antidotes",
    "name": "Flumazénil",
    "sourceCells": [
      "Flumazenil 0,1 mg/mL",
      "10 mcg/kg",
      "non",
      "1,0 mL",
      "",
      "100 mcg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 10,
      "unit": "mcg",
      "stock": {
        "amount": 1,
        "unit": "mg",
        "volumeMl": 10
      },
      "mix": null,
      "referenceVolume": 1,
      "decimals": 1,
      "referenceDose": 100,
      "maximumDose": 200
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "10 mcg/kg",
      "particulars": [],
      "dilution": "Sans dilution",
      "administration": "IVD",
      "questions": [],
      "route": "IVD",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "sugammadex",
    "category": "antidotes",
    "name": "Sugammadex",
    "sourceCells": [
      "Bridion 100 mg/mL",
      "2 mg/kg",
      "1 mL + 9 mL NaCl 0,9%",
      "2,0 mL",
      "",
      "20,0 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 2,
      "unit": "mg",
      "stock": {
        "amount": 200,
        "unit": "mg",
        "volumeMl": 2
      },
      "mix": {
        "takeMl": 1,
        "addMl": 9
      },
      "referenceVolume": 2,
      "decimals": 1,
      "referenceDose": 20,
      "diluent": "NaCl 0,9 %",
      "maximumDose": null,
      "noCeiling": true
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "2 mg/kg",
      "particulars": [],
      "dilution": "1 mL de produit + 9 mL de diluant",
      "administration": "IVD",
      "questions": [],
      "route": "IVD",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "glucose10",
    "category": "antidotes",
    "name": "Glucose 10 %",
    "sourceCells": [
      "Glucose 10 %",
      "2 mL/kg",
      "non",
      "20,0 mL",
      "",
      "2000 mg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 2,
      "unit": "mL",
      "stock": null,
      "mix": null,
      "referenceVolume": 20,
      "decimals": 1,
      "referenceDose": null,
      "massPerMl": 100,
      "massUnit": "mg",
      "referenceMass": 2000,
      "maximumDose": null,
      "noCeiling": true
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "2 mL/kg",
      "particulars": [],
      "dilution": "Sans dilution",
      "administration": "IVD",
      "questions": [],
      "route": "IVD",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "naloxone",
    "category": "antidotes",
    "name": "Naloxone",
    "sourceCells": [
      "Naloxone 0,4 mg/mL",
      "10 mcg/kg",
      "1 mL + 19 mL NaCl 0.9%",
      "5,0 mL",
      "",
      "100 mcg"
    ],
    "model": {
      "type": "dose",
      "coefficient": 10,
      "unit": "mcg",
      "stock": {
        "amount": 0.4,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": {
        "takeMl": 1,
        "addMl": 19
      },
      "referenceVolume": 5,
      "decimals": 1,
      "referenceDose": 100,
      "diluent": "NaCl 0,9 %",
      "maximumDose": 2000
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "10 mcg/kg",
      "particulars": [],
      "dilution": "1 mL de produit + 19 mL de diluant",
      "administration": "IVD",
      "questions": [],
      "route": "IVD",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "tranexamique-ivc",
    "category": "ivc",
    "name": "Acide tranexamique",
    "sourceCells": [
      "Exacyl 0,5g/5 mL",
      "8,0 mL",
      "8,0 mL",
      "2 mL/h",
      "= 10 mg/kg/h pendant 8h",
      ""
    ],
    "model": {
      "type": "infusion",
      "coefficient": 2,
      "unit": "mg",
      "periodMinutes": 60,
      "stock": {
        "amount": 500,
        "unit": "mg",
        "volumeMl": 5
      },
      "mix": {
        "takeMl": 10,
        "addMl": 6
      },
      "referenceRate": 2,
      "maximumDose": null,
      "diluent": "NaCl 0,9 %",
      "fixedHourlyFromAgeMonths": 120,
      "fixedHourlyAmount": 125,
      "fixedDurationHours": 8,
      "preparationMinimumAgeMonths": 120,
      "doseStep": null,
      "adjustmentStatus": "fixed"
    },
    "issues": [
      {
        "code": "missing-diluent",
        "message": "Le diluant des 8 mL à ajouter n’est pas nommé. La vérification numérique du mélange ne valide pas sa préparation.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Avant 10 ans : 2 mg/kg/h ; dès 10 ans : 1 g sur 8 h (125 mg/h)",
      "particulars": [],
      "dilution": "NaCl 0,9 %. Avant 10 ans : concentration finale à préciser. Dès 10 ans : 1 g dans 16 mL, préparation existante conservée.",
      "administration": "IVSE",
      "questions": [
        "Préciser la concentration finale d’Exacyl en entretien avant 10 ans pour calculer le débit en mL/h."
      ],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": false
  },
  {
    "id": "adrenaline-ivc",
    "category": "ivc",
    "name": "Adrénaline",
    "sourceCells": [
      "Adrénaline 1 mg/mL",
      "1,0 mL",
      "49,0 mL NaCl 0.9%",
      "3,3 mL/h",
      "= 0,1 mcg/kg/min",
      ""
    ],
    "model": {
      "type": "infusion",
      "coefficient": 0.1,
      "unit": "mcg",
      "periodMinutes": 1,
      "stock": {
        "amount": 1,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": {
        "takeMl": 1,
        "addMl": 49
      },
      "referenceRate": 3.3,
      "diluent": "NaCl 0,9 %",
      "doseStep": 0.05,
      "warningCoefficient": 1,
      "adjustmentStatus": "enabled"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Départ 0.1 mcg/kg/min ; seuil d’avertissement 1 (dépassement après confirmation)",
      "particulars": [],
      "dilution": "Prélever 1 mL d’adrénaline 1 mg/mL puis compléter à un volume final de 50 mL",
      "administration": "IVSE ; débit arrondi à 0,1 mL/h",
      "questions": [],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": true
  },
  {
    "id": "alprostadil",
    "category": "ivc",
    "name": "Alprostadil",
    "sourceCells": [
      "Prostine 0,5 mg/mL",
      "1,0 mL",
      "49,00 mL de NaCl 0,9%",
      "3,0 mL/h",
      "= 50 ng/kg/min",
      ""
    ],
    "model": {
      "type": "infusion",
      "coefficient": 25,
      "unit": "ng",
      "periodMinutes": 1,
      "stock": {
        "amount": 0.5,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": {
        "takeMl": 1,
        "addMl": 49
      },
      "referenceRate": 3,
      "diluent": "NaCl 0,9 %",
      "doseStep": 5,
      "warningCoefficient": 100,
      "adjustmentStatus": "enabled"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Départ 25 ng/kg/min ; seuil d’avertissement 100 (dépassement après confirmation)",
      "particulars": [],
      "dilution": "1 mL de produit + 49 mL de diluant",
      "administration": "IVSE",
      "questions": [
        "Confirmer le plafond, la préparation et la plage de débit."
      ],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": true
  },
  {
    "id": "atracurium-ivc",
    "category": "ivc",
    "name": "Atracurium",
    "sourceCells": [
      "Atracurium 10 mg/mL",
      "5,0 mL",
      "45,0 mL de NaCl 0,9%",
      "5,0 mL/h",
      "= 0,5 mg/kg/h",
      ""
    ],
    "model": {
      "type": "infusion",
      "coefficient": 0.5,
      "unit": "mg",
      "periodMinutes": 60,
      "stock": {
        "amount": 10,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": {
        "takeMl": 5,
        "addMl": 45
      },
      "referenceRate": 5,
      "diluent": "NaCl 0,9 %",
      "maximumDose": null,
      "noCeiling": true,
      "doseStep": null,
      "adjustmentStatus": "fixed"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "0,5 mg/kg/h",
      "particulars": [],
      "dilution": "Concentration finale : 1 mg/mL (1 mL de produit à 10 mg/mL + 9 mL de NaCl 0,9 %)",
      "administration": "IVSE",
      "questions": [],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": false
  },
  {
    "id": "clonazepam-ivc",
    "category": "ivc",
    "name": "Clonazépam",
    "sourceCells": [
      "Rivotril 1 mg/mL",
      "1,0 mL",
      "5,0 mL de NaCl 0,9%",
      "1,0 mL/h",
      "= 0,1 mg/kg/6h",
      ""
    ],
    "model": {
      "type": "fixed-duration-mixture",
      "coefficient": 0.1,
      "unit": "mg",
      "periodMinutes": 360,
      "stock": {
        "amount": 1,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": null,
      "referenceRate": 1,
      "durationHours": 6,
      "maximumDose": 1,
      "finalVolumeMl": 6,
      "diluent": "NaCl 0,9 %",
      "preparedCoefficient": 0.1,
      "preparedMaximumDose": 1,
      "doseStep": null,
      "adjustmentStatus": "fixed"
    },
    "issues": [
      {
        "code": "six-hour-unit",
        "message": "La posologie source est exprimée par 6 heures. Le contrôle la divise par 6 pour obtenir la quantité horaire ; elle n’est pas traitée comme 0,1 mg/kg/h.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "0,1 mg/kg sur 6 h, maximum 1 mg",
      "particulars": [],
      "dilution": "Prélever la dose initiale puis compléter à 6 mL avec NaCl 0,9 % ; conserver cette concentration lors du réglage de dose",
      "administration": "IVSE sur 6 h",
      "questions": [],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": false
  },
  {
    "id": "dobutamine",
    "category": "ivc",
    "name": "Dobutamine",
    "sourceCells": [
      "Dobutamine 250 mg/20 mL",
      "4,0 mL",
      "46,0 mL de NaCl 0,9%",
      "3,3 mL/h",
      "= 5,0 mcg/kg/min",
      ""
    ],
    "model": {
      "type": "infusion",
      "coefficient": 5,
      "unit": "mcg",
      "periodMinutes": 1,
      "stock": {
        "amount": 250,
        "unit": "mg",
        "volumeMl": 20
      },
      "mix": {
        "takeMl": 4,
        "addMl": 46
      },
      "referenceRate": 3.3,
      "diluent": "NaCl 0,9 %",
      "doseStep": 1,
      "warningCoefficient": 20,
      "adjustmentStatus": "enabled"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Départ 5 mcg/kg/min ; seuil d’avertissement 20 (dépassement après confirmation)",
      "particulars": [],
      "dilution": "Prélever 4 mL de dobutamine 250 mg/20 mL (50 mg), puis compléter à un volume final de 50 mL",
      "administration": "IVSE ; débit arrondi à 0,1 mL/h",
      "questions": [],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": true
  },
  {
    "id": "dopamine",
    "category": "ivc",
    "name": "Dopamine",
    "sourceCells": [
      "Dopamine 50 mg/10 mL",
      "10,0 mL",
      "40,0 mL de NaCl 0,9%",
      "3,3 mL/h",
      "= 5,0 mcg/kg/min",
      ""
    ],
    "model": {
      "type": "infusion",
      "coefficient": 5,
      "unit": "mcg",
      "periodMinutes": 1,
      "stock": {
        "amount": 50,
        "unit": "mg",
        "volumeMl": 10
      },
      "mix": {
        "takeMl": 10,
        "addMl": 40
      },
      "referenceRate": 3.3,
      "diluent": "NaCl 0,9 %",
      "doseStep": 1,
      "warningCoefficient": 20,
      "adjustmentStatus": "enabled"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Départ 5 mcg/kg/min ; seuil d’avertissement 20 (dépassement après confirmation)",
      "particulars": [],
      "dilution": "Prélever 10 mL de dopamine 50 mg/10 mL, puis compléter à un volume final de 50 mL",
      "administration": "IVSE ; débit arrondi à 0,1 mL/h",
      "questions": [],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": true
  },
  {
    "id": "isoprenaline",
    "category": "ivc",
    "name": "Isoprénaline",
    "sourceCells": [
      "Isuprel 0,2 mg/mL",
      "2,0 mL",
      "38,0 mL de NaCl 0,9%",
      "3,0 mL/h",
      "= 0,05 mcg/kg/min",
      ""
    ],
    "model": {
      "type": "infusion",
      "coefficient": 0.02,
      "unit": "mcg",
      "periodMinutes": 1,
      "stock": {
        "amount": 0.2,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": {
        "takeMl": 2,
        "addMl": 38
      },
      "referenceRate": 3,
      "diluent": "NaCl 0,9 %",
      "doseStep": 0.02,
      "warningCoefficient": 1,
      "adjustmentStatus": "enabled"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Départ 0.02 mcg/kg/min ; seuil d’avertissement 1 (dépassement après confirmation)",
      "particulars": [],
      "dilution": "2 mL de produit + 38 mL de diluant",
      "administration": "IVSE",
      "questions": [],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": true
  },
  {
    "id": "midazolam-ivc",
    "category": "ivc",
    "name": "Midazolam",
    "sourceCells": [
      "Hypnovel 5 mg/mL",
      "4,0 mL",
      "16,0 mL de NaCl 0,9%",
      "1,2 mL/h",
      "= 2 mcg/kg/min",
      ""
    ],
    "model": {
      "type": "infusion",
      "coefficient": 2,
      "unit": "mcg",
      "periodMinutes": 1,
      "stock": {
        "amount": 5,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": {
        "takeMl": 4,
        "addMl": 16
      },
      "referenceRate": 1.2,
      "diluent": "NaCl 0,9 %",
      "maximumDose": null,
      "doseStep": 1,
      "warningCoefficient": 6,
      "adjustmentStatus": "enabled"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Départ 2 mcg/kg/min ; seuil d’avertissement 6 (dépassement après confirmation)",
      "particulars": [],
      "dilution": "4 mL de produit + 16 mL de diluant",
      "administration": "IVSE",
      "questions": [],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": true
  },
  {
    "id": "morphine-ivc",
    "category": "ivc",
    "name": "Morphine",
    "sourceCells": [
      "Morphine 1 mg/mL",
      "",
      "Pas de dilution",
      "0,1 mL/h",
      "= 10 mcg/kg/h",
      ""
    ],
    "model": {
      "type": "infusion",
      "coefficient": 20,
      "unit": "mcg",
      "periodMinutes": 60,
      "stock": {
        "amount": 10,
        "unit": "mg",
        "volumeMl": 10
      },
      "mix": null,
      "referenceRate": 0.1,
      "weightMix": {
        "thresholdKg": 10,
        "below": {
          "takeMl": 5,
          "addMl": 45
        },
        "atOrAbove": null
      },
      "diluent": "NaCl 0,9 %",
      "doseStep": null,
      "adjustmentStatus": "suspended"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "20 mcg/kg/h au départ, sans palier d’âge",
      "particulars": [
        "Concentration : 0,1 mg/mL sous 10 kg ; 1 mg/mL dès 10 kg."
      ],
      "dilution": "Si poids < 10 kg : 5 mL de morphine 1 mg/mL + 45 mL de NaCl 0,9 % ; si poids ≥ 10 kg : morphine 1 mg/mL non diluée",
      "administration": "PSE",
      "questions": [],
      "route": "PSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": false
  },
  {
    "id": "noradrenaline",
    "category": "ivc",
    "name": "Noradrénaline",
    "sourceCells": [
      "Noradrénaline 2 mg/mL",
      "1 mg",
      "Compléter à 50 mL de NaCl 0,9 %",
      "Poids/3 mL/h",
      "Protocole SMUR approché",
      ""
    ],
    "model": {
      "type": "infusion",
      "unit": "mcg",
      "stock": {
        "amount": 2,
        "unit": "mg",
        "volumeMl": 1
      },
      "mix": {
        "takeMl": 0.5,
        "addMl": 49.5
      },
      "diluent": "NaCl 0,9 %",
      "periodMinutes": 1,
      "coefficient": 0.1,
      "doseStep": 0.05,
      "warningCoefficient": 1,
      "adjustmentStatus": "enabled"
    },
    "issues": [
      {
        "code": "noradrenaline-basis",
        "message": "La spécialité et l’expression en base ou en tartrate ne sont pas précisées. Elles déterminent la concentration active. Le débit ne peut pas être validé ni recalculé sans cette information.",
        "source": "noradrenaline"
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Départ 0.1 mcg/kg/min ; seuil d’avertissement 1 (dépassement après confirmation)",
      "particulars": [
        "Concentration finale : 20 mcg/mL."
      ],
      "dilution": "Prélever 0,5 mL de noradrénaline 2 mg/mL (1 mg), puis compléter à un volume final de 50 mL",
      "administration": "IVSE ; débit arrondi à 0,1 mL/h",
      "questions": [],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": true
  },
  {
    "id": "nicardipine",
    "category": "ivc",
    "name": "Nicardipine — entretien",
    "sourceCells": [
      "Loxen 10 mg/10 mL",
      "Pas de dilution",
      "1,2 mL/h",
      "= 2 mcg/kg/min",
      "",
      ""
    ],
    "model": {
      "type": "infusion",
      "coefficient": 0.5,
      "unit": "mcg",
      "periodMinutes": 1,
      "stock": {
        "amount": 10,
        "unit": "mg",
        "volumeMl": 10
      },
      "mix": {
        "takeMl": 10,
        "addMl": 40
      },
      "referenceRate": 1.2,
      "minimumCoefficient": 0.5,
      "maximumDose": null,
      "diluent": "NaCl 0,9 %",
      "doseStep": 0.25,
      "warningCoefficient": 2,
      "adjustmentStatus": "enabled"
    },
    "issues": [
      {
        "code": "shifted-columns",
        "message": "La ligne comporte un décalage de colonnes. Pour le seul contrôle numérique, « 1,2 mL/h » est lu comme le débit et « 2 mcg/kg/min » comme la posologie. Les cellules originales sont conservées.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Départ 0.5 mcg/kg/min ; seuil d’avertissement 2 (dépassement après confirmation)",
      "particulars": [],
      "dilution": "10 mL (10 mg) + 40 mL de NaCl 0,9 % → 200 mcg/mL",
      "administration": "IVSE",
      "questions": [],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": true
  },
  {
    "id": "nicardipine-charge",
    "category": "ivc",
    "name": "Nicardipine — dose de charge",
    "sourceCells": [
      "Décision locale du 26 septembre 2026",
      "",
      "",
      "",
      "",
      ""
    ],
    "model": {
      "type": "dose",
      "coefficient": 10,
      "unit": "mcg",
      "stock": {
        "amount": 10,
        "unit": "mg",
        "volumeMl": 10
      },
      "mix": {
        "takeMl": 10,
        "addMl": 40
      },
      "referenceRate": 1.2,
      "minimumCoefficient": 10,
      "maximumCoefficient": 20,
      "maximumDose": null,
      "noCeiling": true,
      "diluent": "NaCl 0,9 %",
      "doseStep": null,
      "adjustmentStatus": "fixed"
    },
    "issues": [],
    "kind": "reference",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Dose de charge : 10 à 20 mcg/kg",
      "particulars": [],
      "dilution": "10 mL (10 mg) + 40 mL de NaCl 0,9 % → 200 mcg/mL",
      "administration": "IV — durée à préciser",
      "questions": [
        "Préciser la durée de la dose de charge."
      ],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": "durée à préciser"
    },
    "sources": [],
    "adjustable": false
  },
  {
    "id": "salbutamol-charge",
    "category": "ivc",
    "name": "Salbutamol — dose de charge",
    "sourceCells": [
      "Salbutamol 5 mg/5 mL",
      "5 mcg/kg",
      "Dose de charge",
      "Dilution selon le poids",
      "IVL 5 min",
      ""
    ],
    "model": {
      "type": "dose",
      "coefficient": 5,
      "unit": "mcg",
      "stock": {
        "amount": 5,
        "unit": "mg",
        "volumeMl": 5
      },
      "mix": null,
      "diluent": "NaCl 0,9 %",
      "weightMixes": [
        {
          "maxWeightKgExclusive": 21,
          "mix": {
            "takeMl": 5,
            "addMl": 45
          }
        },
        {
          "minWeightKg": 21,
          "maxWeightKgExclusive": 42,
          "mix": {
            "takeMl": 10,
            "addMl": 40
          }
        },
        {
          "minWeightKg": 42,
          "mix": {
            "takeMl": 15,
            "addMl": 35
          }
        }
      ],
      "adjustmentStatus": "fixed",
      "maximumDose": null
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "5 mcg/kg — dose de charge",
      "particulars": [
        "Dose de charge calculée avec les dilutions pondérales du salbutamol IVSE."
      ],
      "dilution": "Moins de 21 kg : 5 mg + 45 mL de NaCl 0,9 % ; de 21 à moins de 42 kg : 10 mg + 40 mL ; dès 42 kg : 15 mg + 35 mL. Volume final : 50 mL.",
      "administration": "IVL sur 5 min",
      "questions": [],
      "route": "IVL",
      "durationMinutes": 5.0,
      "administrationNote": ""
    },
    "sources": ["salbutamol"],
    "adjustable": false
  },
  {
    "id": "salbutamol-ivc",
    "category": "ivc",
    "name": "Salbutamol",
    "sourceCells": [
      "Salbutamol 5 mg/5 mL",
      "10 mL",
      "30,0 mL de NaCl 0,9 %",
      "0,2 mL/h",
      "= 0,1 mcg/kg/min",
      ""
    ],
    "model": {
      "type": "infusion",
      "coefficient": 0.1,
      "unit": "mcg",
      "periodMinutes": 1,
      "stock": {
        "amount": 5,
        "unit": "mg",
        "volumeMl": 5
      },
      "mix": null,
      "referenceRate": 0.2,
      "diluent": "NaCl 0,9 %",
      "minimumCoefficient": 0.1,
      "weightMixes": [
        {
          "maxWeightKgExclusive": 21,
          "mix": {
            "takeMl": 5,
            "addMl": 45
          }
        },
        {
          "minWeightKg": 21,
          "maxWeightKgExclusive": 42,
          "mix": {
            "takeMl": 10,
            "addMl": 40
          }
        },
        {
          "minWeightKg": 42,
          "mix": {
            "takeMl": 15,
            "addMl": 35
          }
        }
      ],
      "doseStep": 0.1,
      "warningCoefficient": 5,
      "adjustmentStatus": "enabled"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Départ 0.1 mcg/kg/min ; seuil d’avertissement 5 (dépassement après confirmation)",
      "particulars": [],
      "dilution": "Moins de 21 kg : 5 mg + 45 mL de NaCl 0,9 % ; de 21 à moins de 42 kg : 10 mg + 40 mL ; dès 42 kg : 15 mg + 35 mL. Volume final : 50 mL.",
      "administration": "IVSE",
      "questions": [],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": true
  },
  {
    "id": "sufentanil",
    "category": "ivc",
    "name": "Sufentanil",
    "sourceCells": [
      "Sufentanil 50 mcg/10 mL",
      "2 mL",
      "8,0 mL de NaCl 0,9%",
      "2,0 mL/h",
      "= 0,2 mcg/kg/h",
      ""
    ],
    "model": {
      "type": "infusion",
      "coefficient": 0.2,
      "unit": "mcg",
      "periodMinutes": 60,
      "stock": {
        "amount": 50,
        "unit": "mcg",
        "volumeMl": 10
      },
      "mix": {
        "takeMl": 2,
        "addMl": 8
      },
      "referenceRate": 2,
      "diluent": "NaCl 0,9 %",
      "maximumDose": null,
      "doseStep": 0.1,
      "warningCoefficient": 1,
      "adjustmentStatus": "enabled"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Départ 0.2 mcg/kg/h ; seuil d’avertissement 1 (dépassement après confirmation)",
      "particulars": [],
      "dilution": "2 mL de produit + 8 mL de diluant",
      "administration": "IVSE",
      "questions": [],
      "route": "IVSE",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": [],
    "adjustable": true
  },
  {
    "id": "arret-potassium",
    "category": "hyperkaliemie",
    "name": "Arrêt des apports en potassium",
    "sourceCells": [
      "",
      "",
      "",
      "",
      "",
      ""
    ],
    "model": {
      "type": "instruction"
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Arrêter tous les apports en potassium",
      "particulars": [],
      "dilution": "Sans objet",
      "administration": "Consigne",
      "questions": [],
      "route": "",
      "durationMinutes": null,
      "administrationNote": "Consigne"
    },
    "sources": []
  },
  {
    "id": "bicarbonate-hyperk",
    "category": "hyperkaliemie",
    "name": "Bicarbonate si acidose",
    "sourceCells": [
      "Bicarbonate 4,2 %",
      "1 mmol/kg",
      "Pas de dilution",
      "20 mL",
      "",
      "10 mmol"
    ],
    "model": {
      "type": "dose",
      "coefficient": 1,
      "unit": "mmol",
      "stock": {
        "amount": 5,
        "unit": "mmol",
        "volumeMl": 10
      },
      "mix": null,
      "referenceVolume": 20,
      "decimals": 0,
      "referenceDose": 10
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "1 mmol/kg",
      "particulars": [],
      "dilution": "Sans dilution",
      "administration": "IVL",
      "questions": [],
      "route": "IVL",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "salbutamol-nebulise",
    "category": "hyperkaliemie",
    "name": "Salbutamol nébulisé",
    "sourceCells": [
      "Salbutamol 2,5 mg/2,5mL",
      "",
      "",
      "2,5 mL",
      "",
      ""
    ],
    "model": {
      "type": "conditional-dose",
      "unit": "mg",
      "cases": [
        {
          "maxWeightKg": 16,
          "dose": 2.5
        },
        {
          "dose": 5
        }
      ],
      "stock": {
        "amount": 2.5,
        "unit": "mg",
        "volumeMl": 2.5
      }
    },
    "issues": [
      {
        "code": "nebulised-dose",
        "message": "Le volume est donné sans dose par kg, âge, fréquence ni indication détaillée. Il ne peut pas être extrapolé au poids.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "2,5 mg si poids ≤ 16 kg ; 5 mg si poids > 16 kg",
      "particulars": [
        "Le seuil de 16 kg provient du tableau local."
      ],
      "dilution": "Solution pour nébulisation 2,5 mg/2,5 mL",
      "administration": "Nébulisation",
      "questions": [],
      "route": "Nébulisation",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "calcium-gluconate",
    "category": "hyperkaliemie",
    "name": "Gluconate de calcium 10 %",
    "sourceCells": [
      "Gluconate de calcium 10 % · ampoule 10 mL",
      "0,5 mL/kg, maximum 20 mL",
      "Dilution à préciser",
      "",
      "",
      ""
    ],
    "model": {
      "type": "dose",
      "stock": null,
      "mix": null,
      "coefficient": 0.5,
      "unit": "mL",
      "maximumDose": 20,
      "volumeKind": "withdrawal",
      "administrationConcentration": null
    },
    "issues": [
      {
        "code": "gluconate-basis",
        "message": "Les mg de gluconate de calcium et les mg de calcium élément ne sont pas interchangeables. La présentation manque et 4 mL ne peut pas être rapproché sans ambiguïté de 20 mg/kg ; aucun volume n’est calculé.",
        "source": "calcium"
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "0,5 mL/kg de solution à 10 %, maximum 20 mL",
      "particulars": [
        "Volume de produit à 10 % avant dilution. La masse exacte dépend de la spécialité ; ce volume ne représente pas une dose en calcium élément."
      ],
      "dilution": "Dilution finale à préciser",
      "administration": "IVL — dilution et durée à préciser",
      "questions": [
        "Valider la dilution finale et la durée d’administration."
      ],
      "route": "IVL",
      "durationMinutes": null,
      "administrationNote": "dilution et durée à préciser"
    },
    "sources": [
      "calcium",
      "erc"
    ]
  },
  {
    "id": "insuline-glucose",
    "category": "hyperkaliemie",
    "name": "Insuline rapide + G10 %",
    "sourceCells": [
      "Insuline rapide + G10 %",
      "0,1 UI/kg (max. 10 UI) + 5 mL/kg (max. 250 mL)",
      "G10 %",
      "",
      "IV sur 30 min",
      ""
    ],
    "model": {
      "type": "insulin-glucose",
      "coefficient": 0.1,
      "unit": "UI",
      "stock": null,
      "mix": null,
      "maximumDose": 10,
      "glucoseMlPerKg": 5,
      "maximumGlucoseMl": 250,
      "durationHours": 0.5,
      "glucoseConcentrationMgMl": 100
    },
    "issues": [
      {
        "code": "insulin-mixture",
        "message": "Présentation de l’insuline, volume final, protocole insuline/glucose et surveillance à préciser. Ne pas déduire une préparation d’insuline de cette seule ligne.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "Insuline rapide : 0,1 UI/kg (maximum 10 UI) + G10 % : 5 mL/kg (maximum 250 mL), sur 30 min",
      "particulars": [
        "Les deux plafonds sont calculés séparément."
      ],
      "dilution": "G10 % ; volume d’insuline à prélever selon sa concentration",
      "administration": "IV sur 30 min",
      "questions": [
        "Renseigner la concentration de l’insuline rapide pour calculer son volume à prélever."
      ],
      "route": "IV",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "resikali-ir",
    "category": "hyperkaliemie",
    "name": "Resikali (IR)",
    "sourceCells": [
      "Resikali 20 g/c-m",
      "1 g/kg",
      "40 g + 150 mL de G5 %",
      "38 mL",
      "",
      "10,0 g"
    ],
    "model": {
      "type": "dose",
      "coefficient": 1,
      "unit": "g",
      "stock": null,
      "mix": null,
      "referenceVolume": null,
      "decimals": null,
      "referenceDose": 10,
      "maximumDose": 40,
      "volumePerDose": 3.75
    },
    "issues": [
      {
        "code": "suspension-final-volume",
        "message": "Le volume final après ajout de la poudre n’est pas précisé. « 40 g + 150 mL » n’équivaut pas nécessairement à 150 mL de suspension finale ; le volume n’est pas calculé.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "1 g/kg",
      "particulars": [
        "Maximum 40 g. Le déplacement de volume de la poudre est ignoré selon la convention locale."
      ],
      "dilution": "40 g + 150 mL de G5 %",
      "administration": "Intrarectale",
      "questions": [],
      "route": "Intrarectale",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "kayexalate-ir",
    "category": "hyperkaliemie",
    "name": "Kayexalate (IR)",
    "sourceCells": [
      "Kayexalate 15 g/c-m",
      "1 g/kg",
      "15 g + 100 mL de G10 %",
      "67 mL",
      "",
      "10,0 g"
    ],
    "model": {
      "type": "dose",
      "coefficient": 1,
      "unit": "g",
      "stock": null,
      "mix": null,
      "referenceVolume": null,
      "decimals": null,
      "referenceDose": 10,
      "maximumDose": 15,
      "volumePerDose": 6.666666666666667
    },
    "issues": [
      {
        "code": "suspension-final-volume",
        "message": "Le volume final après ajout de la poudre n’est pas précisé. « 15 g + 100 mL » n’équivaut pas nécessairement à 100 mL de suspension finale ; le volume n’est pas calculé.",
        "source": null
      }
    ],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "1 g/kg",
      "particulars": [
        "Maximum 15 g. Le déplacement de volume de la poudre est ignoré selon la convention locale."
      ],
      "dilution": "15 g + 100 mL de G10 %",
      "administration": "Intrarectale",
      "questions": [],
      "route": "Intrarectale",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "cgr",
    "category": "transfusion",
    "name": "CGR phénotypé",
    "sourceCells": [
      "",
      "10 mL/kg",
      "",
      "100 mL",
      "",
      ""
    ],
    "model": {
      "type": "dose",
      "coefficient": 10,
      "unit": "mL",
      "stock": null,
      "mix": null,
      "referenceVolume": 100,
      "decimals": 0,
      "referenceDose": null,
      "maximumDose": null,
      "limitToOneBag": true
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "10 mL/kg",
      "particulars": [
        "Poche de volume variable : transfuser le volume prescrit, au maximum le contenu d’une poche. Aucun maximum fixe en mL."
      ],
      "dilution": "Sans objet",
      "administration": "",
      "questions": [],
      "route": "",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "pfc",
    "category": "transfusion",
    "name": "PFC",
    "sourceCells": [
      "",
      "10 mL/kg",
      "",
      "100 mL",
      "",
      ""
    ],
    "model": {
      "type": "dose",
      "coefficient": 10,
      "unit": "mL",
      "stock": null,
      "mix": null,
      "referenceVolume": 100,
      "decimals": 0,
      "referenceDose": null,
      "maximumDose": null,
      "limitToOneBag": true
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "10 mL/kg",
      "particulars": [
        "Poche de volume variable : transfuser le volume prescrit, au maximum le contenu d’une poche. Aucun maximum fixe en mL."
      ],
      "dilution": "Sans objet",
      "administration": "",
      "questions": [],
      "route": "",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "cpa",
    "category": "transfusion",
    "name": "CPA",
    "sourceCells": [
      "",
      "5 mL/kg",
      "",
      "50 mL",
      "",
      ""
    ],
    "model": {
      "type": "dose",
      "coefficient": 5,
      "unit": "mL",
      "stock": null,
      "mix": null,
      "referenceVolume": 50,
      "decimals": 0,
      "referenceDose": null,
      "maximumDose": null,
      "limitToOneBag": true
    },
    "issues": [],
    "kind": "imported",
    "validation": "pending",
    "maximumDose": null,
    "protocol": {
      "posology": "5 mL/kg",
      "particulars": [
        "Poche de volume variable : transfuser le volume prescrit, au maximum le contenu d’une poche. Aucun maximum fixe en mL."
      ],
      "dilution": "Sans objet",
      "administration": "",
      "questions": [],
      "route": "",
      "durationMinutes": null,
      "administrationNote": ""
    },
    "sources": []
  },
  {
    "id": "isofundine",
    "category": "remplissage",
    "name": "Isofundine",
    "kind": "reference",
    "validation": "pending",
    "maximumDose": null,
    "sourceCells": [
      "Isofundine, solution pour perfusion — flacon de 1 L",
      "10 mL/kg",
      "Solution prête à l’emploi",
      "",
      "",
      ""
    ],
    "model": {
      "type": "dose",
      "coefficient": 10,
      "unit": "mL",
      "stock": null,
      "mix": null,
      "maximumDose": 500
    },
    "protocol": {
      "posology": "10 mL/kg par bolus, maximum 500 mL par bolus",
      "particulars": [],
      "dilution": "Solution prête à l’emploi",
      "administration": "IVD — à passer le plus rapidement possible",
      "questions": [],
      "route": "IVD",
      "durationMinutes": null,
      "administrationNote": "à passer le plus rapidement possible"
    },
    "sources": [
      "isofundine",
      "remplissage"
    ],
    "issues": []
  }
]);
export const isofundine = smurRecords.find(record => record.id === 'isofundine');
