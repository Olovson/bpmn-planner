import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Real XML parse test for mortgage BPMN fixtures.
// Syfte: säkerställa att de verkliga BPMN-filerna för mortgage
//  - går att läsa från repo:t,
//  - innehåller förväntade call activities / tasks,
//  - speglar root → internal-data-gathering → Stakeholder/Object/Household‑kedjan.

const loadBpmnXml = (fileName: string): string => {
  const filePath = path.resolve(__dirname, '..', 'fixtures', 'bpmn', fileName);
  return fs.readFileSync(filePath, 'utf8');
};

const findAttributeValues = (xml: string, tag: string, attr: string): string[] => {
  const results: string[] = [];
  const pattern = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    results.push(match[1]);
  }
  return results;
};

describe('Mortgage BPMN real XML parse (fixtures)', () => {
  it('mortgage-se-application.bpmn contains expected call activities and subprocess chain', () => {
    const xml = loadBpmnXml('mortgage-se-application.bpmn');

    // Root process id
    const processIds = findAttributeValues(xml, 'bpmn:process', 'id');
    expect(processIds).toContain('mortgage-se-application');

    // Call activities and subprocess-noder i applikationsprocessen.
    const callActivityIds = findAttributeValues(xml, 'bpmn:callActivity', 'id');
    expect(callActivityIds).toContain('internal-data-gathering');
    expect(callActivityIds).toContain('stakeholder');
    expect(callActivityIds).toContain('object');
    expect(callActivityIds).toContain('household');

    // Subprocess-container för per-stakeholder-flödet finns.
    const subProcessIds = findAttributeValues(xml, 'bpmn:subProcess', 'id');
    expect(subProcessIds).toContain('stakeholders');
  });

  it('mortgage-se-internal-data-gathering.bpmn contains expected tasks for internal data gathering', () => {
    const xml = loadBpmnXml('mortgage-se-internal-data-gathering.bpmn');

    const processIds = findAttributeValues(xml, 'bpmn:process', 'id');
    expect(processIds).toContain('mortgage-se-internal-data-gathering');

    // Verifiera att centrala tasks i internal-data-gathering-processen finns.
    const serviceTaskIds = findAttributeValues(xml, 'bpmn:serviceTask', 'id');
    const businessRuleTaskIds = findAttributeValues(xml, 'bpmn:businessRuleTask', 'id');

    expect(serviceTaskIds).toContain('fetch-party-information');
    expect(serviceTaskIds).toContain('fetch-engagements');
    expect(businessRuleTaskIds).toContain('pre-screen-party');
  });

  it('derives a simple mortgage hierarchy from XML (application → internal-data-gathering → Stakeholder/Object/Household)', () => {
    const appXml = loadBpmnXml('mortgage-se-application.bpmn');

    const processId = findAttributeValues(appXml, 'bpmn:process', 'id')[0];
    expect(processId).toBe('mortgage-se-application');

    const callActivityIds = findAttributeValues(appXml, 'bpmn:callActivity', 'id');

    // Enkel "graf": root-process plus call activities vi bryr oss om.
    const hierarchy = {
      rootProcess: processId,
      callActivities: callActivityIds,
    };

    expect(hierarchy.rootProcess).toBe('mortgage-se-application');
    expect(hierarchy.callActivities).toContain('internal-data-gathering');
    expect(hierarchy.callActivities).toContain('stakeholder');
    expect(hierarchy.callActivities).toContain('object');
    expect(hierarchy.callActivities).toContain('household');
  });
});

