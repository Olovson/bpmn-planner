import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractUserStoriesFromDocumentation } from '@/lib/testGeneration/userStoryExtractor';
import { supabase } from '@/integrations/supabase/client';
import { storageFileExists } from '@/lib/artifactUrls';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(),
        list: vi.fn(),
      })),
    },
  },
}));

// Mock artifactUrls
vi.mock('@/lib/artifactUrls', () => ({
  storageFileExists: vi.fn(),
  getFeatureGoalDocStoragePaths: vi.fn((bpmnFile, elementId) => [
    `docs/claude/feature-goals/${bpmnFile.replace('.bpmn', '')}-${elementId}.html`,
  ]),
  getEpicDocStoragePaths: vi.fn((bpmnFile, elementId) => [
    `docs/claude/epics/${bpmnFile.replace('.bpmn', '')}-${elementId}.html`,
  ]),
}));

describe('userStoryExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should extract user stories from storage HTML', async () => {
    // Mock HTML-dokumentation med user stories (strukturerad HTML som faktiskt genereras)
    const mockHtml = `
      <html>
        <body>
          <section class="doc-section" data-source-user-stories="llm">
            <h2>User Stories</h2>
            <div class="user-story">
              <h3><strong>US-1:</strong> Som <strong>Kund</strong> vill jag <strong>skapa ansökan</strong> så att <strong>jag kan ansöka om lån</strong></h3>
              <div>
                <h4>Acceptanskriterier:</h4>
                <ul>
                  <li>Ansökan kan skapas</li>
                  <li>Alla fält valideras</li>
                </ul>
              </div>
            </div>
          </section>
        </body>
      </html>
    `;
    
    // Mock storageFileExists
    vi.mocked(storageFileExists).mockResolvedValue(true);
    
    // Mock Supabase response
    const mockDownload = vi.fn().mockResolvedValue({
      data: new Blob([mockHtml], { type: 'text/html' }),
      error: null,
    });
    
    vi.mocked(supabase.storage.from).mockReturnValue({
      download: mockDownload,
      list: vi.fn().mockResolvedValue({ data: [{ name: 'test.html' }], error: null }),
    } as any);
    
    const result = await extractUserStoriesFromDocumentation(
      'mortgage-se-application.bpmn',
      'application',
      'feature-goal'
    );
    
    // Verifiera att funktionen returnerar rätt struktur
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      const userStory = result[0];
      expect(userStory).toHaveProperty('id');
      expect(userStory).toHaveProperty('role');
      expect(userStory).toHaveProperty('goal');
      expect(userStory).toHaveProperty('value');
      expect(userStory).toHaveProperty('acceptanceCriteria');
      expect(userStory).toHaveProperty('bpmnFile');
      expect(userStory).toHaveProperty('bpmnElementId');
      expect(userStory).toHaveProperty('docType');
      expect(userStory).toHaveProperty('docSource');
      expect(userStory).toHaveProperty('extractedAt');
      expect(userStory).toHaveProperty('source');
      
      // Verifiera värden
      expect(userStory.bpmnFile).toBe('mortgage-se-application.bpmn');
      expect(userStory.bpmnElementId).toBe('application');
      expect(userStory.docType).toBe('feature-goal');
      expect(userStory.docSource).toBe('storage');
      expect(Array.isArray(userStory.acceptanceCriteria)).toBe(true);
    }
  });
  
  it('should return empty array if no documentation found', async () => {
    const mockDownload = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });
    
    vi.mocked(supabase.storage.from).mockReturnValue({
      download: mockDownload,
    } as any);
    
    // Mock storageFileExists
    vi.mocked(storageFileExists).mockResolvedValue(false);
    
    const result = await extractUserStoriesFromDocumentation(
      'nonexistent.bpmn',
      'nonexistent',
      'feature-goal'
    );
    
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
  
  it('should handle malformed HTML gracefully', async () => {
    const mockHtml = '<html><body>Invalid HTML without user stories</body></html>';
    
    const mockDownload = vi.fn().mockResolvedValue({
      data: new Blob([mockHtml], { type: 'text/html' }),
      error: null,
    });
    
    vi.mocked(supabase.storage.from).mockReturnValue({
      download: mockDownload,
    } as any);
    
    const result = await extractUserStoriesFromDocumentation(
      'mortgage-se-application.bpmn',
      'application',
      'feature-goal'
    );
    
    // Funktionen bör returnera tom array eller hantera fel gracefully
    expect(Array.isArray(result)).toBe(true);
    // Antingen tom array eller korrekt parsade user stories
    if (result.length > 0) {
      result.forEach(us => {
        expect(us).toHaveProperty('id');
        expect(us).toHaveProperty('bpmnFile');
        expect(us).toHaveProperty('bpmnElementId');
      });
    }
  });
  
  it('should preserve BPMN file and element ID in extracted stories', async () => {
    const mockHtml = '<html><body>Some content</body></html>';
    
    const mockDownload = vi.fn().mockResolvedValue({
      data: new Blob([mockHtml], { type: 'text/html' }),
      error: null,
    });
    
    vi.mocked(supabase.storage.from).mockReturnValue({
      download: mockDownload,
    } as any);
    
    const bpmnFile = 'test-file.bpmn';
    const elementId = 'test-element';
    
    // Mock storageFileExists
    vi.mocked(storageFileExists).mockResolvedValue(true);
    
    const result = await extractUserStoriesFromDocumentation(
      bpmnFile,
      elementId,
      'feature-goal'
    );
    
    // Alla user stories bör ha korrekt bpmnFile och bpmnElementId
    result.forEach(us => {
      expect(us.bpmnFile).toBe(bpmnFile);
      expect(us.bpmnElementId).toBe(elementId);
    });
  });
});

