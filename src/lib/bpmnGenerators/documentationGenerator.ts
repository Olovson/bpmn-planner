import type { BpmnElement } from '@/lib/bpmnParser';
import { getBpmnFileUrl } from '@/hooks/useDynamicBpmnFiles';
import { parseBpmnFile } from '@/lib/bpmnParser';
import type { DorDodCriterion } from './types';

/**
 * Subprocess summary information
 */
export interface SubprocessSummary {
  fileName: string;
  totalNodes: number;
  userTasks: number;
  serviceTasks: number;
  businessRuleTasks: number;
  gateways: number;
  keyNodes: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

/**
 * Generate documentation HTML for a BPMN element
 */
export function generateDocumentationHTML(
  element: BpmnElement, 
  subprocessFile?: string,
  subprocessSummary?: SubprocessSummary,
  dorDodCriteria: DorDodCriterion[] = [],
): string {
  const nodeType = element.type.replace('bpmn:', '');
  const documentation = element.businessObject.documentation?.[0]?.text || 'Ingen dokumentation tillgänglig.';

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${element.name || element.id} - ${nodeType}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            min-height: 100vh;
        }
        
        header {
            border-bottom: 3px solid #0066cc;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        h1 {
            color: #0066cc;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 1.2rem;
        }
        
        .meta {
            display: flex;
            gap: 20px;
            margin-top: 15px;
            flex-wrap: wrap;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 5px 12px;
            background: #f0f0f0;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .meta-label {
            font-weight: 600;
            color: #0066cc;
        }
        
        section {
            margin-bottom: 40px;
        }
        
        h2 {
            color: #0066cc;
            font-size: 1.8rem;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }
        
        .card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #0066cc;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .badge-primary {
            background: #0066cc;
            color: white;
        }
        
        .badge-warning {
            background: #ff9800;
            color: white;
        }
        
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }
        
        code {
            font-family: 'Courier New', monospace;
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${element.name || element.id}</h1>
            <p class="subtitle">${nodeType}</p>
            <div class="meta">
                <div class="meta-item">
                    <span class="meta-label">Node ID:</span>
                    <code>${element.id}</code>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Type:</span>
                    <span class="badge badge-primary">${nodeType}</span>
                </div>
                ${subprocessFile ? `
                <div class="meta-item">
                    <span class="meta-label">Subprocess:</span>
                    <a href="${subprocessFile}.html">${subprocessFile}</a>
                </div>
                ` : ''}
            </div>
        </header>

        <section>
            <h2>📋 Beskrivning</h2>
            <div class="card">
                <p>${documentation}</p>
            </div>
        </section>

        ${nodeType === 'UserTask' ? `
        <section>
            <h2>👤 User Task Information</h2>
            <div class="card">
                <p><strong>Användare:</strong> Interaktiv uppgift som kräver manuell input</p>
                <p><strong>Typ av interaktion:</strong> Formulär, godkännande eller datainmatning</p>
            </div>
        </section>
        ` : ''}

        ${nodeType === 'ServiceTask' ? `
        <section>
            <h2>⚙️ Service Task Information</h2>
            <div class="card">
                <p><strong>Typ:</strong> Automatisk systemuppgift</p>
                <p><strong>Utförs av:</strong> Backend-service eller API-anrop</p>
            </div>
        </section>
        ` : ''}

        ${nodeType === 'BusinessRuleTask' ? `
        <section>
            <h2>📊 Business Rule Task Information</h2>
            <div class="card">
                <p><strong>Typ:</strong> Regelbaserad beslutspunkt</p>
                <p><strong>Utförs av:</strong> Affärsregelmotor eller beslutslogik</p>
                ${subprocessFile ? `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                    <h3>📋 DMN Decision Table: ${subprocessFile}</h3>
                    ${subprocessSummary ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0;">
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #0066cc;">${subprocessSummary.totalNodes}</div>
                            <div style="font-size: 0.9rem; color: #666;">Antal regler</div>
                        </div>
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${subprocessSummary.userTasks}</div>
                            <div style="font-size: 0.9rem; color: #666;">Input-kolumner</div>
                        </div>
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">${subprocessSummary.serviceTasks}</div>
                            <div style="font-size: 0.9rem; color: #666;">Output-kolumner</div>
                        </div>
                    </div>
                    
                    ${subprocessSummary.keyNodes.length > 0 ? `
                    <div style="margin-top: 20px;">
                        <h4>📥 Input-kolumner:</h4>
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                            ${subprocessSummary.keyNodes.slice(0, subprocessSummary.userTasks).map(node => `
                                <div class="card" style="display: flex; justify-content: between; align-items: center;">
                                    <strong>${node.name}</strong>
                                    <span style="font-size: 0.85rem; color: #666;">${node.type}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="margin-top: 20px;">
                        <p style="color: #666; font-size: 0.9rem;">
                            💡 DMN-tabellen visas automatiskt i BPMN-viewern när du väljer denna nod
                        </p>
                    </div>
                    ` : `
                    <p><span class="badge badge-warning">⚠️ DMN-fil ej hittad</span></p>
                    <p style="font-size: 0.9rem; color: #666; margin-top: 10px;">
                        Förväntad fil: <code>${subprocessFile}</code>
                    </p>
                    `}
                </div>
                ` : ''}
            </div>
        </section>
        ` : ''}

        ${nodeType === 'CallActivity' ? `
        <section>
            <h2>🔄 Call Activity Information</h2>
            <div class="card">
                <p><strong>Typ:</strong> Anropar subprocess</p>
                ${subprocessFile ? `<p><strong>Subprocess fil:</strong> <a href="${subprocessFile}.html">${subprocessFile}</a></p>` : '<p><span class="badge badge-warning">⚠️ Subprocess ej specificerad</span></p>'}
                
                ${subprocessSummary ? `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                    <h3>📊 Subprocess-översikt: ${subprocessSummary.fileName}</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0;">
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #0066cc;">${subprocessSummary.totalNodes}</div>
                            <div style="font-size: 0.9rem; color: #666;">Totalt antal noder</div>
                        </div>
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${subprocessSummary.userTasks}</div>
                            <div style="font-size: 0.9rem; color: #666;">User Tasks</div>
                        </div>
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">${subprocessSummary.serviceTasks}</div>
                            <div style="font-size: 0.9rem; color: #666;">Service Tasks</div>
                        </div>
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${subprocessSummary.businessRuleTasks}</div>
                            <div style="font-size: 0.9rem; color: #666;">Business Rules</div>
                        </div>
                        <div class="card" style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">${subprocessSummary.gateways}</div>
                            <div style="font-size: 0.9rem; color: #666;">Gateways</div>
                        </div>
                    </div>
                    
                    ${subprocessSummary.keyNodes.length > 0 ? `
                    <div style="margin-top: 20px;">
                        <h4>🔑 Viktiga noder i subprocess:</h4>
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                            ${subprocessSummary.keyNodes.map(node => `
                                <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <strong>${node.name || node.id}</strong>
                                        <div style="font-size: 0.85rem; color: #666; font-family: monospace;">${node.id}</div>
                                    </div>
                                    <span class="badge badge-primary">${node.type.replace('bpmn:', '')}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="margin-top: 20px;">
                        <a href="${subprocessFile}.html" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                            📄 Visa fullständig subprocess-dokumentation →
                        </a>
                    </div>
                </div>
                ` : ''}
            </div>
        </section>
        ` : ''}

        <section>
            <h2>🔗 Länkar och Resurser</h2>
            <div class="card">
                <p><em>Länkar till Figma, Jira, Confluence och tester läggs till via BPMN-viewern</em></p>
            </div>
        </section>

        ${dorDodCriteria.length ? `
        <section>
            <h2>✅ Definition of Ready / Definition of Done – krav</h2>
            <div class="card">
                <p style="margin-bottom: 10px;">
                    Nedan listas statiska DoR/DoD-krav kopplade till denna nods typ och sammanhang. 
                    Dessa är avsedda som stöd vid planering, utveckling och kvalitetssäkring.
                </p>
                <ul style="margin-left: 1.5rem; margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
                    ${dorDodCriteria.map((criterion) => `
                        <li>
                            <strong>[${criterion.criterion_type.toUpperCase()} – ${criterion.criterion_category}]</strong>
                            &nbsp;${criterion.criterion_text}
                        </li>
                    `).join('')}
                </ul>
            </div>
        </section>
        ` : ''}
    </div>
</body>
</html>`;

  return html;
}

/**
 * Parse subprocess file and return summary
 */
export async function parseSubprocessFile(fileName: string): Promise<SubprocessSummary | null> {
  try {
    const url = await getBpmnFileUrl(fileName);
    const result = await parseBpmnFile(url);
    
    // Count different node types
    const userTasks = result.elements.filter(e => e.type === 'bpmn:UserTask').length;
    const serviceTasks = result.elements.filter(e => e.type === 'bpmn:ServiceTask').length;
    const businessRuleTasks = result.elements.filter(e => e.type === 'bpmn:BusinessRuleTask').length;
    const gateways = result.elements.filter(e => 
      e.type.includes('Gateway') && 
      !e.type.includes('EventBased')
    ).length;
    
    // Get key nodes (UserTasks, ServiceTasks, BusinessRuleTasks)
    const keyNodeTypes = ['bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:BusinessRuleTask'];
    const keyNodes = result.elements
      .filter(e => keyNodeTypes.includes(e.type))
      .slice(0, 10) // Limit to first 10 key nodes
      .map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
      }));
    
    return {
      fileName,
      totalNodes: result.elements.filter(e => 
        !e.type.includes('Process') && 
        !e.type.includes('Collaboration') &&
        e.type !== 'label'
      ).length,
      userTasks,
      serviceTasks,
      businessRuleTasks,
      gateways,
      keyNodes,
    };
  } catch (error) {
    console.error(`Error parsing subprocess ${fileName}:`, error);
  return null;
  }
}

/**
 * Parse DMN file and return summary
 */
export async function parseDmnSummary(fileName: string): Promise<SubprocessSummary | null> {
  try {
    const response = await fetch(`/dmn/${fileName}`);
    if (!response.ok) return null;
    
    const xml = await response.text();
    const { parseDmnFile } = await import('../dmnParser');
    const result = await parseDmnFile(`/dmn/${fileName}`);
    
    if (result.decisionTables.length === 0) return null;
    
    const table = result.decisionTables[0]; // Use first decision table
    
    // Map DMN data to SubprocessSummary format
    // totalNodes = number of rules
    // userTasks = input columns
    // serviceTasks = output columns
    // keyNodes = input column details
    
    const keyNodes = table.inputs.map(input => ({
      id: input.id,
      name: input.label || input.inputExpression || 'Input',
      type: input.typeRef || 'string',
    }));
    
    return {
      fileName,
      totalNodes: table.rules.length,
      userTasks: table.inputs.length,
      serviceTasks: table.outputs.length,
      businessRuleTasks: 0,
      gateways: 0,
      keyNodes,
    };
  } catch (error) {
    console.error(`Error parsing DMN ${fileName}:`, error);
    return null;
  }
}

