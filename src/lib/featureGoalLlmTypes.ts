// Domänmodell för Feature Goal-dokumentation.
// Denna struktur används både av det lokala generatorflödet och som målbilde
// för strukturerad LLM-output.
import type { ScenarioPersona, ScenarioRiskLevel, ScenarioAssertionType, ScenarioUiStep } from './epicDocTypes';

export interface FeatureGoalDocModel {
  // Kort, ren sammanfattning av Feature Goalet – 2–5 meningar om syfte, värde och kontext.
  summary: string;
  // Effektmål på affärsnivå – vilka beteenden/värden som ska förbättras (t.ex. automatisering, kvalitet, kundupplevelse).
  effectGoals: string[];
  // Lista med "Ingår:"-punkter (omfattning, vad som täcks).
  scopeIncluded: string[];
  // Lista med "Ingår inte:"-punkter och explicita avgränsningar.
  scopeExcluded: string[];
  // Ingående epics som stödjer Feature Goalet.
  epics: {
    // Valfritt ID eller etikett för epiken (kan vara genererat).
    id: string;
    // Namn på epiken.
    name: string;
    // Kort beskrivning av epikens syfte/roll i flödet.
    description: string;
    // Ägande team eller ansvarig funktion (kan lämnas tomt).
    team: string;
  }[];
  // Översiktliga flödessteg på Feature Goal-nivå (kund/system/handläggare).
  flowSteps: string[];
  // Viktiga beroenden, t.ex. "Beroende: ...; Id: ...; Beskrivning: ...".
  dependencies: string[];
  // Relaterade feature goals, epics, regler eller subprocesser (bullets).
  relatedItems: string[];
}

export type FeatureGoalLlmSections = FeatureGoalDocModel;
