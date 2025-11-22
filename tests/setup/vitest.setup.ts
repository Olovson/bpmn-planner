import { vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOW_LLM_IN_TESTS =
  String(process.env.VITE_ALLOW_LLM_IN_TESTS ?? '').trim().toLowerCase() === 'true';

// Polyfill for CSS.escape (needed by bpmn-js/diagram-js)
if (typeof globalThis.CSS === 'undefined' || typeof globalThis.CSS.escape !== 'function') {
  // Simple CSS.escape polyfill
  globalThis.CSS = {
    escape: (str: string): string => {
      // Basic CSS.escape implementation
      return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    },
  } as CSS;
}

// Polyfill for SVGElement.getBBox(), transform, and SVGMatrix (needed by bpmn-js/diagram-js)
if (typeof window !== 'undefined') {
  // Polyfill getBBox
  if (!SVGElement.prototype.getBBox || typeof SVGElement.prototype.getBBox !== 'function') {
    SVGElement.prototype.getBBox = function() {
      return {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      } as DOMRect;
    };
  }

  // Polyfill SVGElement.transform for elements that need it
  Object.defineProperty(SVGElement.prototype, 'transform', {
    get() {
      if (!this._transform) {
        this._transform = {
          baseVal: {
            numberOfItems: 0,
            getItem: () => null,
            appendItem: () => null,
            insertItemBefore: () => null,
            replaceItem: () => null,
            removeItem: () => null,
            consolidate: () => null,
          },
          animVal: {
            numberOfItems: 0,
            getItem: () => null,
          },
        };
      }
      return this._transform;
    },
    configurable: true,
  });

  // Polyfill SVGMatrix creation (needed by tiny-svg)
  if (typeof window.SVGElement !== 'undefined') {
    const createSVGMatrix = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      multiply: (other: any) => createSVGMatrix(),
      inverse: () => createSVGMatrix(),
      translate: (x: number, y: number) => createSVGMatrix(),
      scale: (scaleFactor: number) => createSVGMatrix(),
      scaleNonUniform: (scaleFactorX: number, scaleFactorY: number) => createSVGMatrix(),
      rotate: (angle: number) => createSVGMatrix(),
      rotateFromVector: (x: number, y: number) => createSVGMatrix(),
      flipX: () => createSVGMatrix(),
      flipY: () => createSVGMatrix(),
      skewX: (angle: number) => createSVGMatrix(),
      skewY: (angle: number) => createSVGMatrix(),
    });

    // Polyfill createSVGTransform (needed by tiny-svg)
    const createSVGTransform = () => ({
      type: 0, // SVG_TRANSFORM_UNKNOWN
      matrix: createSVGMatrix(),
      angle: 0,
      setMatrix: () => {},
      setTranslate: () => {},
      setScale: () => {},
      setRotate: () => {},
      setSkewX: () => {},
      setSkewY: () => {},
    });

    // Helper to add SVG methods to an element
    const addSvgMethods = (element: Element) => {
      if (element instanceof SVGElement) {
        (element as any).createSVGMatrix = createSVGMatrix;
        (element as any).createSVGTransform = createSVGTransform;
      }
    };

    // Add createSVGMatrix and createSVGTransform to SVG elements
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = function(tagName: string, options?: ElementCreationOptions) {
      const element = originalCreateElement(tagName, options);
      if (tagName === 'svg' || tagName.startsWith('svg:')) {
        addSvgMethods(element);
      }
      return element;
    };

    // Also add to existing SVG elements
    if (document.createElementNS) {
      const originalCreateElementNS = document.createElementNS.bind(document);
      document.createElementNS = function(namespaceURI: string, qualifiedName: string) {
        const element = originalCreateElementNS(namespaceURI, qualifiedName);
        if (namespaceURI === 'http://www.w3.org/2000/svg') {
          addSvgMethods(element);
        }
        return element;
      };
    }
  }
}

if (!('localStorage' in globalThis)) {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    length: 0,
  });
}

// Helper to load BPMN fixtures for fetch stub
function loadBpmnFixture(fileName: string): string | null {
  try {
    const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'bpmn', fileName);
    if (fs.existsSync(fixturePath)) {
      return fs.readFileSync(fixturePath, 'utf8');
    }
  } catch (err) {
    // File doesn't exist or can't be read
  }
  return null;
}

beforeEach(() => {
  // Provide a minimal localStorage for supabase client usage in tests
  if (!('localStorage' in globalThis)) {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      length: 0,
    });
  }

  // Setup fetch stub that reads from fixtures for BPMN files
  // När vi ska köra real-LLM-tester måste global fetch få vara "riktig",
  // annars kan inte OpenAI-klienten anropa nätverket. I det läget hoppar
  // vi över BPMN-fetch-stubben här.
  if (ALLOW_LLM_IN_TESTS) {
    vi.restoreAllMocks();
    return;
  }

  const originalFetch = globalThis.fetch;
  const fetchStub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    // Check if this is a BPMN file request (from /bpmn/ path or .bpmn extension)
    if (url.includes('/bpmn/') || url.endsWith('.bpmn')) {
      const fileName = url.split('/').pop() || url;
      const xml = loadBpmnFixture(fileName);

      if (xml) {
        return new Response(xml, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml',
          },
        });
      }
    }

    // Fallback to original fetch or reject if not mocked
    if (originalFetch && originalFetch !== fetchStub) {
      return originalFetch(input, init);
    }

    return Promise.reject(new Error(`fetch not mocked for: ${url}`));
  });

  // Ensure previous mocks don't leak between tests
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', fetchStub);
});
