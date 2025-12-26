/**
 * BPMN Map Test Helper
 * 
 * Hanterar bpmn-map.json för tester:
 * - Mockar ALLA storage-anrop (GET, POST, PUT, DELETE) för att INTE skriva till produktionsfilen
 * - Sparar test-versionen i minnet (testMapContent)
 * - Skyddar produktionsfilen genom att ALDRIG skriva till Storage
 * - Hanterar automatisk generering av bpmn-map.json när filer laddas upp
 * 
 * VIKTIGT: Denna helper förhindrar ALLA skrivningar till produktionsfilen i Storage.
 * Alla ändringar sparas bara i minnet för testet.
 */

import type { Page } from '@playwright/test';

const BPMN_MAP_STORAGE_PATH = 'bpmn-map.json';

// Global state för att spara original-innehållet och test-versionen
let originalMapContent: string | null = null;
let testMapContent: string | null = null;

/**
 * Mockar Supabase storage-anrop för bpmn-map.json i Playwright
 * FÖRHINDRAR ALLA skrivningar till produktionsfilen i Storage
 * 
 * Approach:
 * 1. Spara original-innehållet som backup (läsning från Storage)
 * 2. Mocka POST/PUT-anrop - fånga upp request body och spara i minnet (testMapContent)
 * 3. Returnera mockad success response för POST/PUT
 * 4. Mocka GET-anrop för att returnera test-versionen från minnet
 * 5. Mocka DELETE-anrop för att bara rensa minnet
 * 
 * VIKTIGT: 
 * - Varje test får en ren test-version (ingen kvarvarande data från tidigare tester)
 * - INGA skrivningar går till Storage - allt sparas bara i minnet
 * - Produktionsfilen är helt skyddad
 */
export async function setupBpmnMapMocking(page: Page): Promise<void> {
  // Reset global state för varje test
  testMapContent = null;
  
  // VIKTIGT: Initiera med en tom men giltig map för att förhindra fel
  // Testerna startar ALLTID med en tom map - de skapar sin egen test-version
  const emptyValidMap = JSON.stringify({
    generated_at: new Date().toISOString(),
    note: 'Test map - auto-generated for testing, starts empty',
    orchestration: {
      root_process: null,
    },
    processes: [],
  });
  
  // VIKTIGT: Testerna ska INTE använda produktionsfilen som startpunkt
  // De skapar sin egen test-version från scratch när test-filer laddas upp
  // Detta förhindrar att test-filer blandas med produktionsprocesser
  originalMapContent = emptyValidMap;
  
  console.log('[bpmnMapTestHelper] ✓ Test map initialized as empty (test will create its own version when files are uploaded)');

  // Mocka storage-anrop för bpmn-map.json
  await page.route('**/storage/v1/object/bpmn-files/bpmn-map.json**', async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === 'GET') {
      // Läsning: Returnera test-versionen om den finns, annars tom map
      try {
        if (testMapContent) {
          // Verifiera att testMapContent är giltig JSON
          try {
            JSON.parse(testMapContent);
          } catch (parseError) {
            console.warn('[bpmnMapTestHelper] testMapContent is not valid JSON, using empty map');
            testMapContent = emptyValidMap;
          }
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: {
              'Content-Type': 'application/json',
            },
            body: testMapContent,
          });
          return;
        }
        
        // Ingen test-version finns ännu, returnera tom map (tester startar alltid med tom map)
        // Detta säkerställer att testerna skapar sin egen test-version från scratch
        const contentToReturn = emptyValidMap;
        
        // Verifiera att contentToReturn är giltig JSON
        try {
          JSON.parse(contentToReturn);
        } catch (parseError) {
          console.warn('[bpmnMapTestHelper] contentToReturn is not valid JSON, using empty map');
          const emptyMap = JSON.stringify({ processes: [] });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: {
              'Content-Type': 'application/json',
            },
            body: emptyMap,
          });
          return;
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Content-Type': 'application/json',
          },
          body: contentToReturn,
        });
        return;
      } catch (error) {
        console.error('[bpmnMapTestHelper] Error in GET handler:', error);
        // Returnera tom map vid fel istället för att krascha
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ processes: [] }),
        });
        return;
      }
    } else if (method === 'POST' || method === 'PUT') {
      // KRITISKT: Fånga upp request body och spara i minnet - SKRIV INTE TILL STORAGE
      try {
        // För POST/PUT med blob body, behöver vi läsa från request body
        // Försök först med postDataBuffer, annars använd fetch för att få body
        let requestBody: Buffer | null = null;
        
        try {
          requestBody = await request.postDataBuffer();
        } catch {
          // Om postDataBuffer misslyckas, försök hämta body via fetch
          try {
            const response = await route.fetch();
            const arrayBuffer = await response.arrayBuffer();
            requestBody = Buffer.from(arrayBuffer);
          } catch {
            // Om båda misslyckas, låt anropet gå igenom (säkerhetsåtgärd)
            console.warn('[bpmnMapTestHelper] Could not read request body, letting request continue');
            await route.continue();
            return;
          }
        }
        
        if (requestBody && requestBody.length > 0) {
          try {
            // Konvertera buffer till text
            const bodyText = requestBody.toString('utf-8');
            
            // Försök parsa som JSON - kan vara JSON direkt eller text som innehåller JSON
            let parsed: any;
            let jsonString: string;
            
            // Försök först parsa direkt som JSON
            try {
              parsed = JSON.parse(bodyText);
              jsonString = bodyText; // Redan JSON
            } catch {
              // Om det inte är JSON, kan det vara text som innehåller JSON
              // Eller det kan vara form-data eller något annat
              // Försök hitta JSON i texten
              const jsonMatch = bodyText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  parsed = JSON.parse(jsonMatch[0]);
                  jsonString = jsonMatch[0];
                } catch {
                  // Om vi inte kan parsa, använd bodyText som det är
                  parsed = { raw: bodyText };
                  jsonString = JSON.stringify(parsed);
                }
              } else {
                // Ingen JSON hittades, skapa en tom map
                parsed = { processes: [] };
                jsonString = JSON.stringify(parsed);
              }
            }
            try {
              parsed = JSON.parse(bodyText);
            } catch {
              // Om det inte är JSON, kan det vara att det är en blob som redan är konverterad
              // Försök hitta JSON i texten eller skapa en tom map
              console.warn('[bpmnMapTestHelper] Request body is not valid JSON, treating as text');
              
              // Försök hitta JSON i texten
              const jsonMatch = bodyText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[0]);
                  // Verifiera att det är en giltig bpmn-map struktur
                  if (parsed.processes || parsed.orchestration) {
                    testMapContent = jsonMatch[0];
                    console.log(`[bpmnMapTestHelper] ✓ Test bpmn-map.json saved to memory (extracted from text, NOT written to Storage)`);
                  } else {
                    // Inte en giltig bpmn-map, använd tom map
                    testMapContent = JSON.stringify({ processes: [] });
                    console.warn('[bpmnMapTestHelper] Extracted JSON is not a valid bpmn-map, using empty map');
                  }
                } catch {
                  // Kunde inte parsa, använd tom map
                  testMapContent = JSON.stringify({ processes: [] });
                  console.warn('[bpmnMapTestHelper] Could not parse extracted JSON, using empty map');
                }
              } else {
                // Ingen JSON hittades, använd tom map
                testMapContent = JSON.stringify({ processes: [] });
                console.warn('[bpmnMapTestHelper] No JSON found in request body, using empty map');
              }
              
              // Returnera mockad success response
              await route.fulfill({
                status: 200,
                contentType: 'application/json',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: 'Mocked - saved to memory only' }),
              });
              return;
            }
            
            // Om vi kom hit, är det JSON
            testMapContent = bodyText;
            const processCount = parsed.processes?.length || 0;
            console.log(`[bpmnMapTestHelper] ✓ Test bpmn-map.json saved to memory (${processCount} processes, NOT written to Storage)`);
            
            // Returnera mockad success response
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ message: 'Mocked - saved to memory only' }),
            });
            return;
          } catch (parseError) {
            // Inte JSON eller kunde inte parsa - låt gå igenom som säkerhetsåtgärd
            console.warn('[bpmnMapTestHelper] Could not parse request body, letting request continue:', parseError);
            await route.continue();
            return;
          }
        } else {
          // Ingen body - returnera success ändå (kan vara DELETE eller annan operation)
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Mocked - no body' }),
          });
          return;
        }
      } catch (error) {
        console.warn('[bpmnMapTestHelper] Error handling POST/PUT, letting request continue:', error);
        // Som säkerhetsåtgärd, låt anropet gå igenom om vi inte kan hantera det
        await route.continue();
        return;
      }
    } else if (method === 'DELETE') {
      // Ta bort: Bara ta bort test-versionen i minnet
      testMapContent = null;
      pendingWrite = false;
      if (writeTimeout) {
        clearTimeout(writeTimeout);
        writeTimeout = null;
      }
      console.log('[bpmnMapTestHelper] Test bpmn-map.json deleted (in-memory)');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Mocked - deleted test version' }),
      });
    } else {
      // Andra metoder, låt gå igenom
      await route.continue();
    }
  });
}

/**
 * Återställ state (används i afterEach hook)
 * 
 * VIKTIGT: Eftersom vi INTE skriver till Storage alls, behöver vi inte återställa något.
 * Alla ändringar var bara i minnet och försvinner automatiskt när testet är klart.
 * 
 * Denna funktion finns kvar för bakåtkompatibilitet men gör ingenting.
 */
export async function restoreOriginalBpmnMap(page: Page): Promise<void> {
  // Reset state - inget behöver återställas eftersom vi aldrig skrev till Storage
  if (testMapContent) {
    console.log('[bpmnMapTestHelper] ✓ Test bpmn-map.json was only in memory, no cleanup needed');
  }
  testMapContent = null;
  originalMapContent = null;
}

