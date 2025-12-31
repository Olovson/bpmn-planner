/**
 * Parser för att extrahera user stories från HTML-dokumentation.
 * 
 * Detta är en ren parser som inte har några dependencies på Supabase eller andra externa tjänster.
 * Den kan användas både i browser och i Node.js-miljöer.
 */

export interface ParsedUserStory {
  id: string;
  role: 'Kund' | 'Handläggare' | 'Processägare';
  goal: string;
  value: string;
  acceptanceCriteria: string[];
}

/**
 * Parsar user stories från HTML-dokumentation.
 * 
 * Förväntat format i HTML:
 * - User stories finns i en sektion med class "doc-section" och data-source-user-stories
 * - Varje user story är i en div med class "user-story"
 * - Format: "Som {role} vill jag {goal} så att {value}"
 * - Acceptanskriterier finns i en lista under user story
 * 
 * @param html - HTML-dokumentation som sträng
 * @returns Array av parsade user stories
 */
export function parseUserStoriesFromHtml(html: string): ParsedUserStory[] {
  const userStories: ParsedUserStory[] = [];
  
  // Skapa en DOM-parser (fungerar i både browser och Node.js med jsdom)
  let doc: Document;
  if (typeof window !== 'undefined' && window.document) {
    // Browser-miljö
    const parser = new DOMParser();
    doc = parser.parseFromString(html, 'text/html');
  } else {
    // Node.js-miljö - använd jsdom om tillgängligt, annars regex-fallback
    try {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(html);
      doc = dom.window.document;
    } catch (error) {
      // Fallback till regex-parsing om jsdom inte är tillgängligt
      return parseUserStoriesFromHtmlRegex(html);
    }
  }
  
  // Hitta alla user story-sektioner
  const userStorySections = doc.querySelectorAll('.doc-section[data-source-user-stories], section.doc-section');
  
  for (const section of userStorySections) {
    // Hitta alla user story-divs
    const userStoryDivs = section.querySelectorAll('.user-story, div.user-story');
    
    for (const div of userStoryDivs) {
      const userStory = parseUserStoryFromDiv(div);
      if (userStory) {
        userStories.push(userStory);
      }
    }
  }
  
  // Om inga user stories hittades med DOM-parsing, försök med regex
  if (userStories.length === 0) {
    return parseUserStoriesFromHtmlRegex(html);
  }
  
  return userStories;
}

/**
 * Parsar en user story från en div-element.
 */
function parseUserStoryFromDiv(div: Element): ParsedUserStory | null {
  // Hitta ID (kan vara i h3 eller i en span)
  const idMatch = div.textContent?.match(/(?:US-|FG-US-)(\d+)/i);
  const id = idMatch ? `US-${idMatch[1]}` : `US-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Hitta huvudtexten (Som X vill jag Y så att Z)
  const heading = div.querySelector('h3, h4, strong');
  const headingText = heading?.textContent || div.textContent || '';
  
  // Parse user story-format: "Som {role} vill jag {goal} så att {value}"
  const userStoryMatch = headingText.match(/Som\s+(\w+)\s+vill\s+jag\s+(.+?)\s+så\s+att\s+(.+)/i);
  if (!userStoryMatch) {
    return null;
  }
  
  const [, roleStr, goal, value] = userStoryMatch;
  
  // Normalisera roll
  const role = normalizeRole(roleStr);
  
  // Hitta acceptanskriterier
  const acceptanceCriteria: string[] = [];
  
  // Försök hitta en lista med acceptanskriterier
  const criteriaList = div.querySelector('ul, ol');
  if (criteriaList) {
    const items = criteriaList.querySelectorAll('li');
    for (const item of items) {
      const text = item.textContent?.trim();
      if (text && text.length > 0) {
        acceptanceCriteria.push(text);
      }
    }
  }
  
  // Om inga acceptanskriterier hittades, försök hitta dem i texten
  if (acceptanceCriteria.length === 0) {
    const criteriaMatch = div.textContent?.match(/Acceptanskriterier[:\s]+(.*?)(?:\n\n|\n$|$)/is);
    if (criteriaMatch) {
      const criteriaText = criteriaMatch[1];
      // Dela upp på radbrytningar eller punktlistor
      const criteria = criteriaText.split(/\n|•|[-*]/).map(c => c.trim()).filter(c => c.length > 0);
      acceptanceCriteria.push(...criteria);
    }
  }
  
  return {
    id,
    role,
    goal: goal.trim(),
    value: value.trim(),
    acceptanceCriteria,
  };
}

/**
 * Normaliserar roll-sträng till en av de tillåtna rollerna.
 */
function normalizeRole(roleStr: string): 'Kund' | 'Handläggare' | 'Processägare' {
  const normalized = roleStr.trim().toLowerCase();
  
  if (normalized.includes('kund') || normalized.includes('customer') || normalized.includes('applicant')) {
    return 'Kund';
  }
  
  if (normalized.includes('handläggare') || normalized.includes('advisor') || normalized.includes('case handler')) {
    return 'Handläggare';
  }
  
  if (normalized.includes('processägare') || normalized.includes('process owner') || normalized.includes('owner')) {
    return 'Processägare';
  }
  
  // Default till Kund om ingen matchning
  return 'Kund';
}

/**
 * Fallback: Parsar user stories med regex om DOM-parsing inte fungerar.
 */
function parseUserStoriesFromHtmlRegex(html: string): ParsedUserStory[] {
  const userStories: ParsedUserStory[] = [];
  
  // Regex för att hitta user stories
  // Format: "Som {role} vill jag {goal} så att {value}"
  const userStoryRegex = /Som\s+(\w+)\s+vill\s+jag\s+(.+?)\s+så\s+att\s+(.+?)(?=\n|$|Som\s+\w+\s+vill)/gis;
  
  let match;
  let index = 1;
  
  while ((match = userStoryRegex.exec(html)) !== null) {
    const [, roleStr, goal, value] = match;
    
    // Hitta acceptanskriterier efter user story
    const afterMatch = html.substring(match.index + match[0].length);
    const criteriaMatch = afterMatch.match(/Acceptanskriterier[:\s]+(.*?)(?=\n\n|$|Som\s+\w+\s+vill)/is);
    
    const acceptanceCriteria: string[] = [];
    if (criteriaMatch) {
      const criteriaText = criteriaMatch[1];
      // Dela upp på radbrytningar eller punktlistor
      const criteria = criteriaText.split(/\n|•|[-*]/).map(c => c.trim()).filter(c => c.length > 0);
      acceptanceCriteria.push(...criteria);
    }
    
    userStories.push({
      id: `US-${index}`,
      role: normalizeRole(roleStr),
      goal: goal.trim(),
      value: value.trim(),
      acceptanceCriteria,
    });
    
    index++;
  }
  
  return userStories;
}











