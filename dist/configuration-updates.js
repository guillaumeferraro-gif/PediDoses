// Corrections applied once when reading a v0.10 configuration. Unchanged fields are preserved.
export const retiredRecordIds=['triphosadenine-2','atracurium-bolus'];
export const configurationUpdates={
  "magnesium": {
    "model": {
      "set": {
        "preparationMode": "fixed-volume",
        "finalVolumeMl": 50,
        "diluent": "NaCl 0,9 %",
        "mix": null,
        "maximumDose": 2000
      },
      "remove": [
        "volumeKind",
        "weightMix",
        "weightMixes",
        "finalConcentration",
        "dilutionFactor",
        "volumePerDose"
      ]
    },
    "protocol": {
      "set": {
        "dilution": "Prélever la dose calculée, puis compléter avec du NaCl 0,9 % jusqu’à un volume final de 50 mL.",
        "questions": []
      },
      "remove": []
    }
  },
  "triphosadenine": {
    "model": {
      "set": {
        "secondCoefficient": 2,
        "secondMaximumDose": 20,
        "adjustmentStatus": "fixed"
      },
      "remove": []
    },
    "protocol": {
      "set": {
        "posology": "1re dose : 1 mg/kg (max. 10 mg) ; 2e dose : 2 mg/kg (max. 20 mg)"
      },
      "remove": []
    },
    "ampoule": {
      "set": {
        "name": "Triphosadénine",
        "presentation": "Triphosadénine",
        "expression": "Triphosadénine"
      },
      "remove": []
    },
    "name": "Triphosadénine"
  },
  "ketamine-analgesie": {
    "model": {
      "set": {
        "maximumDose": null,
        "noCeiling": true
      },
      "remove": [
        "pendingCeiling"
      ]
    },
    "protocol": {
      "set": {
        "questions": []
      },
      "remove": []
    }
  },
  "ketamine-intubation": {
    "model": {
      "set": {
        "maximumDose": null,
        "noCeiling": true
      },
      "remove": []
    },
    "ampoule": {
      "set": {
        "name": "Kétamine (sédation / intubation)",
        "expression": "Kétamine (sédation / intubation)"
      },
      "remove": []
    },
    "name": "Kétamine (sédation / intubation)"
  },
  "morphine-titration": {
    "protocol": {
      "set": {
        "posology": "0,025 mg/kg toutes les 5 min après la dose de charge",
        "administration": "IVL",
        "questions": [],
        "route": "IVL",
        "durationMinutes": null,
        "administrationNote": ""
      },
      "remove": []
    }
  },
  "propofol": {
    "protocol": {
      "set": {
        "administration": "IVL",
        "route": "IVL",
        "durationMinutes": null,
        "administrationNote": "",
        "questions": []
      },
      "remove": []
    }
  },
  "propofol-lisa": {
    "protocol": {
      "set": {
        "administration": "IVL",
        "questions": [],
        "route": "IVL",
        "administrationNote": "",
        "durationMinutes": null
      },
      "remove": []
    }
  },
  "midazolam-ij": {
    "model": {
      "set": {
        "maximumDose": 10
      },
      "remove": [
        "pendingCeiling"
      ]
    },
    "protocol": {
      "set": {
        "posology": "0,3 mg/kg, maximum 10 mg",
        "questions": []
      },
      "remove": []
    },
    "ampoule": {
      "set": {
        "presentation": "Midazolam — forme intergingivojugale adaptée",
        "volumeMl": 1,
        "amount": 5,
        "status": "confirmé",
        "comment": ""
      },
      "remove": []
    }
  },
  "phenobarbital": {
    "model": {
      "set": {
        "preparationMode": "dose-only",
        "mix": null,
        "tiers": [
          {
            "maxAgeMonthsExclusive": 1,
            "coefficient": 20
          },
          {
            "coefficient": 15
          }
        ]
      },
      "remove": [
        "volumeKind",
        "weightMix",
        "weightMixes",
        "finalConcentration",
        "dilutionFactor",
        "volumePerDose"
      ]
    },
    "protocol": {
      "set": {
        "particulars": [
          "Palier à 1 mois confirmé."
        ],
        "dilution": "",
        "questions": []
      },
      "remove": []
    },
    "ampoule": {
      "set": {
        "presentation": "Phénobarbital — poudre injectable",
        "volumeMl": null,
        "status": "confirmé",
        "declaredConcentration": null
      },
      "remove": []
    }
  },
  "levetiracetam": {
    "model": {
      "set": {
        "preparationMode": "concentration-range",
        "minimumFinalConcentration": 10,
        "targetFinalConcentration": 15,
        "diluentRoundingMl": 1,
        "fineDiluentRoundingMl": 0.1,
        "diluent": "NaCl 0,9 %",
        "mix": null
      },
      "remove": [
        "volumeKind",
        "weightMix",
        "weightMixes",
        "finalConcentration",
        "dilutionFactor",
        "volumePerDose"
      ]
    },
    "protocol": {
      "set": {
        "dilution": "NaCl 0,9 % : diluant arrondi au mL supérieur pour une concentration finale entre 10 et 15 mg/mL ; au dixième de mL si nécessaire pour les petits volumes.",
        "questions": []
      },
      "remove": []
    }
  }
};
