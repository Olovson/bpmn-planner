import { useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useDorDodStatus, CriterionType, CriterionCategory, DorDodCriterion } from "@/hooks/useDorDodStatus";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { useUserProfile, getUserInitials } from "@/hooks/useUserProfile";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface DorDodChecklistProps {
  subprocessName: string;
  type: CriterionType;
  title: string;
  description: string;
}

const CATEGORY_LABELS: Record<CriterionCategory, string> = {
  process_krav: 'Process & krav',
  data_input_output: 'Data, input & output',
  design: 'Design (Figma / UX / UI)',
  teknik_arkitektur: 'Teknik & arkitektur',
  test_kvalitet: 'Test & kvalitet',
  planering_beroenden: 'Planering & beroenden',
  team_alignment: 'Team-alignment',
  funktion_krav: 'Funktion & krav',
  data_api: 'Data & API',
  teknik_drift: 'Teknik & drift',
  dokumentation: 'Dokumentation',
  overlamning: 'Överlämning',
};

// Component to show who completed a criterion and when
const CompletedByInfo = ({ criterion }: { criterion: DorDodCriterion }) => {
  const { data: profile } = useUserProfile(criterion.completed_by);
  
  if (!criterion.is_completed || !criterion.completed_at) {
    return null;
  }

  const initials = getUserInitials(profile);
  const formattedDate = format(new Date(criterion.completed_at), "d MMM yyyy", { locale: sv });

  return (
    <div className="text-xs text-muted-foreground ml-7 mt-1">
      ✓ av {initials} {formattedDate}
    </div>
  );
};

const DOR_CRITERIA = {
  process_krav: [
    'BPMN-diagrammet för subprocessen är uppdaterat och godkänt av produktägare, business lead och arkitekt.',
    'Syfte, start- och slutvillkor för subprocessen är tydligt beskrivna.',
    'Alla beslutspunkter (inkl. eventuella DMN-beslut) är identifierade och beskrivna på denna sida.',
  ],
  data_input_output: [
    'Alla inputs är definierade med namn, datatyp, källa och vilka som är obligatoriska.',
    'Alla outputs är definierade med namn, datatyp och konsument(er).',
    'Minst ett JSON-exempel för request och response finns dokumenterat.',
  ],
  design: [
    'Relevanta Figma-sidor är länkade från dokumentationen.',
    'Formulärfält, felmeddelanden och grundläggande valideringsregler är beskrivna.',
  ],
  teknik_arkitektur: [
    'Arkitektoniska beroenden är identifierade (interna/externa system, API:er, meddelandeflöden).',
    'Eventuella error boundary events, retries och fallback-beteenden är beskrivna på en övergripande nivå.',
  ],
  test_kvalitet: [
    'Happy path och viktigaste edge cases är listade.',
    'Övergripande acceptanskriterier är formulerade och förstådda av teamet.',
  ],
  planering_beroenden: [
    'Eventuella externa beroenden (andra team, beslut, tredjepart) är identifierade och hanterade eller tydligt markerade.',
    'Story/epic är skapad och estimerad enligt överenskommen Jira-struktur.',
  ],
  team_alignment: [
    'Utvecklare, testare och produktägare har gått igenom denna sida tillsammans.',
    'Inga öppna kritiska frågetecken återstår som blockerar start av utveckling.',
  ],
};

const DOD_CRITERIA = {
  funktion_krav: [
    'Implementerad funktionalitet överensstämmer med BPMN-diagrammet för subprocessen.',
    'Alla beskrivna affärsregler (inkl. DMN där det är relevant) är implementerade.',
    'Start- och slutvillkor för subprocessen fungerar som beskrivet i dokumentationen.',
  ],
  data_api: [
    'Alla dokumenterade inputs och outputs är implementerade enligt specifikation.',
    'JSON-strukturer (request/response) matchar dokumentationen.',
    'Felkoder och felmeddelanden är implementerade som beskrivet (inkl. edge cases).',
  ],
  design: [
    'Implementerad UI överensstämmer med länkat Figma-underlag.',
    'Eventuella avvikelser mot design är dokumenterade och godkända.',
    'Alla relevanta Figma-filer/skärmar är uppdaterade och refererade i dokumentationen.',
  ],
  test_kvalitet: [
    'Automatiska tester (t.ex. Playwright/unit/integration) finns för happy path.',
    'Automatiska tester finns för definierade edge cases.',
    'Automatiska tester finns för relevant felhantering.',
    'Tester körs grönt i CI.',
    'Acceptanskriterierna för denna subprocess / feature är uppfyllda och godkända av produktägare.',
  ],
  teknik_drift: [
    'Loggning, monitorering och eventuella larm är implementerade enligt överenskommen standard.',
    'Eventuella feature toggles/konfigurationsflaggor är dokumenterade.',
  ],
  dokumentation: [
    'Denna dokumentationssida är uppdaterad med datum och versionsnummer.',
    'Eventuella ändringar i flöde, regler eller payloads är dokumenterade.',
    'Eventuella beroenden till andra subprocesser är uppdaterade i respektive sida.',
  ],
  overlamning: [
    'Teamet (utveckling, test, produktägare) har gemensamt bekräftat att DoD är uppfylld.',
    'Eventuella kvarvarande kända begränsningar eller framtida förbättringar är noterade som uppgifter / backlog-items.',
  ],
};

export const DorDodChecklist = ({ 
  subprocessName, 
  type, 
  title, 
  description 
}: DorDodChecklistProps) => {
  const { criteria, toggleCriterion, initializeCriteria, getProgress } = useDorDodStatus(subprocessName);
  const progress = getProgress(type);

  // Initialize criteria on first load
  useEffect(() => {
    const criteriaData = type === 'dor' ? DOR_CRITERIA : DOD_CRITERIA;
    const flatCriteria = Object.entries(criteriaData).flatMap(([category, texts]) =>
      texts.map((text, index) => ({
        criterion_type: type,
        criterion_category: category as CriterionCategory,
        criterion_key: `${category}_${index}`,
        criterion_text: text,
      }))
    );

    // Only initialize if criteria for this specific type don't exist
    const typeCriteria = criteria.filter(c => c.criterion_type === type);
    if (typeCriteria.length === 0 && flatCriteria.length > 0) {
      initializeCriteria.mutate(flatCriteria);
    }
  }, [type, subprocessName]); // Only depend on type and subprocessName, not criteria

  const typeCriteria = criteria.filter(c => c.criterion_type === type);
  const groupedCriteria = typeCriteria.reduce((acc, criterion) => {
    if (!acc[criterion.criterion_category]) {
      acc[criterion.criterion_category] = [];
    }
    acc[criterion.criterion_category].push(criterion);
    return acc;
  }, {} as Record<CriterionCategory, typeof typeCriteria>);

  const handleToggle = (criterionKey: string, criterionType: CriterionType, currentStatus: boolean) => {
    toggleCriterion.mutate({
      criterionKey,
      criterionType,
      isCompleted: !currentStatus,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {progress === 100 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant={progress === 100 ? "default" : "secondary"}>
            {progress}%
          </Badge>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {Object.entries(groupedCriteria).map(([category, items]) => {
            const completed = items.filter(i => i.is_completed).length;
            const total = items.length;
            
            return (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>{CATEGORY_LABELS[category as CriterionCategory]}</span>
                    <Badge variant="outline">
                      {completed}/{total}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {items.map((criterion) => (
                      <div key={criterion.id}>
                        <div
                          className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <Checkbox
                            id={criterion.id}
                            checked={criterion.is_completed}
                            onCheckedChange={() =>
                              handleToggle(criterion.criterion_key, criterion.criterion_type, criterion.is_completed)
                            }
                            className="mt-1"
                          />
                          <label
                            htmlFor={criterion.id}
                            className={`text-sm leading-relaxed cursor-pointer flex-1 ${
                              criterion.is_completed
                                ? 'text-muted-foreground line-through'
                                : ''
                            }`}
                          >
                            {criterion.criterion_text}
                          </label>
                        </div>
                        <CompletedByInfo criterion={criterion} />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};
