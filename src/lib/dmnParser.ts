import DmnJS from 'dmn-js/lib/Modeler';

export interface DmnDecision {
  id: string;
  name: string;
  decisionLogic?: any;
}

export interface DmnInputColumn {
  id: string;
  label: string;
  inputExpression?: string;
  typeRef?: string;
}

export interface DmnOutputColumn {
  id: string;
  label: string;
  name?: string;
  typeRef?: string;
}

export interface DmnRule {
  id: string;
  inputEntries: string[];
  outputEntries: string[];
}

export interface DmnDecisionTable {
  id: string;
  name: string;
  inputs: DmnInputColumn[];
  outputs: DmnOutputColumn[];
  rules: DmnRule[];
  hitPolicy?: string;
}

export interface DmnParseResult {
  decisions: DmnDecision[];
  decisionTables: DmnDecisionTable[];
}

export class DmnParser {
  private modeler: DmnJS;

  constructor() {
    this.modeler = new DmnJS();
  }

  async parse(dmnXml: string): Promise<DmnParseResult> {
    try {
      await this.modeler.importXML(dmnXml);
      
      const decisions: DmnDecision[] = [];
      const decisionTables: DmnDecisionTable[] = [];

      // Get all views (decisions)
      const views = this.modeler.getViews();
      
      for (const view of views) {
        const decision: DmnDecision = {
          id: view.id,
          name: view.name || view.id,
        };
        decisions.push(decision);

        // Open the view to access its content
        await this.modeler.open(view);
        const activeView = this.modeler.getActiveView();
        
        if (activeView?.type === 'decisionTable') {
          const element = activeView.element;
          
          // Extract decision table info
          const decisionTable: DmnDecisionTable = {
            id: element.id,
            name: element.name || element.id,
            inputs: [],
            outputs: [],
            rules: [],
            hitPolicy: element.hitPolicy || 'UNIQUE',
          };

          // Extract inputs
          if (element.input) {
            element.input.forEach((input: any) => {
              decisionTable.inputs.push({
                id: input.id,
                label: input.label || '',
                inputExpression: input.inputExpression?.text || '',
                typeRef: input.inputExpression?.typeRef || 'string',
              });
            });
          }

          // Extract outputs
          if (element.output) {
            element.output.forEach((output: any) => {
              decisionTable.outputs.push({
                id: output.id,
                label: output.label || output.name || '',
                name: output.name || '',
                typeRef: output.typeRef || 'string',
              });
            });
          }

          // Extract rules
          if (element.rule) {
            element.rule.forEach((rule: any) => {
              const inputEntries: string[] = [];
              const outputEntries: string[] = [];

              // Get input entries
              if (rule.inputEntry) {
                rule.inputEntry.forEach((entry: any) => {
                  inputEntries.push(entry.text || '-');
                });
              }

              // Get output entries
              if (rule.outputEntry) {
                rule.outputEntry.forEach((entry: any) => {
                  outputEntries.push(entry.text || '-');
                });
              }

              decisionTable.rules.push({
                id: rule.id,
                inputEntries,
                outputEntries,
              });
            });
          }

          decisionTables.push(decisionTable);
        }
      }

      return {
        decisions,
        decisionTables,
      };
    } catch (error) {
      console.error('Error parsing DMN:', error);
      throw error;
    }
  }

  destroy() {
    this.modeler.destroy();
  }
}

// Cache parsed results
const dmnParseCache = new Map<string, DmnParseResult>();

export async function parseDmnFile(dmnFilePath: string): Promise<DmnParseResult> {
  // Check cache
  if (dmnParseCache.has(dmnFilePath)) {
    return dmnParseCache.get(dmnFilePath)!;
  }

  try {
    const response = await fetch(dmnFilePath);
    if (!response.ok) {
      throw new Error(`Failed to load DMN file: ${dmnFilePath}`);
    }
    
    const dmnXml = await response.text();
    const parser = new DmnParser();
    const result = await parser.parse(dmnXml);
    parser.destroy();

    // Cache result
    dmnParseCache.set(dmnFilePath, result);
    
    return result;
  } catch (error) {
    console.error(`Error parsing DMN file ${dmnFilePath}:`, error);
    throw error;
  }
}

// Match DMN file from BusinessRuleTask name
export function matchDmnFile(taskName: string, existingDmnFiles: string[]): string | null {
  const normalized = taskName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');

  // Try exact match
  const exactMatch = existingDmnFiles.find(f => 
    f.toLowerCase().replace('.dmn', '') === normalized
  );
  
  if (exactMatch) return exactMatch;

  // Try partial match
  const nameParts = normalized.split('-').filter(p => p.length > 3);
  
  for (const file of existingDmnFiles) {
    const fileLower = file.toLowerCase();
    const matchedParts = nameParts.filter(part => fileLower.includes(part));
    
    if (matchedParts.length >= Math.ceil(nameParts.length / 2)) {
      return file;
    }
  }

  // Suggest filename
  return `${normalized}.dmn`;
}

// Clear cache if needed
export function clearDmnParseCache() {
  dmnParseCache.clear();
}
