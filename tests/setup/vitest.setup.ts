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
        const items: any[] = [];
        this._transform = {
          baseVal: {
            numberOfItems: 0,
            clear() {
              items.length = 0;
              this.numberOfItems = 0;
            },
            getItem: (index: number) => items[index] ?? null,
            appendItem: (item: any) => {
              items.push(item);
              this.numberOfItems = items.length;
              return item;
            },
            insertItemBefore: (item: any, index: number) => {
              items.splice(index, 0, item);
              this.numberOfItems = items.length;
              return item;
            },
            replaceItem: (item: any, index: number) => {
              items[index] = item;
              return item;
            },
            removeItem: (index: number) => {
              const removed = items.splice(index, 1)[0] ?? null;
              this.numberOfItems = items.length;
              return removed;
            },
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
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
      multiply: (_other: any) => createSVGMatrix(),
      inverse: () => createSVGMatrix(),
      translate: (_x: number, _y: number) => createSVGMatrix(),
      scale: (_scaleFactor: number) => createSVGMatrix(),
      scaleNonUniform: (_scaleFactorX: number, _scaleFactorY: number) => createSVGMatrix(),
      rotate: (_angle: number) => createSVGMatrix(),
      rotateFromVector: (_x: number, _y: number) => createSVGMatrix(),
      flipX: () => createSVGMatrix(),
      flipY: () => createSVGMatrix(),
      skewX: (_angle: number) => createSVGMatrix(),
      skewY: (_angle: number) => createSVGMatrix(),
    });

    if (typeof (globalThis as any).SVGMatrix === 'undefined') {
      class SVGMatrixPolyfill {
        a = 1;
        b = 0;
        c = 0;
        d = 1;
        e = 0;
        f = 0;

        multiply(_other: any) {
          return new SVGMatrixPolyfill();
        }
        inverse() {
          return new SVGMatrixPolyfill();
        }
        translate(_x: number, _y: number) {
          return new SVGMatrixPolyfill();
        }
        scale(_scaleFactor: number) {
          return new SVGMatrixPolyfill();
        }
        scaleNonUniform(_scaleFactorX: number, _scaleFactorY: number) {
          return new SVGMatrixPolyfill();
        }
        rotate(_angle: number) {
          return new SVGMatrixPolyfill();
        }
        rotateFromVector(_x: number, _y: number) {
          return new SVGMatrixPolyfill();
        }
        flipX() {
          return new SVGMatrixPolyfill();
        }
        flipY() {
          return new SVGMatrixPolyfill();
        }
        skewX(_angle: number) {
          return new SVGMatrixPolyfill();
        }
        skewY(_angle: number) {
          return new SVGMatrixPolyfill();
        }
      }
      (globalThis as any).SVGMatrix = SVGMatrixPolyfill;
    }

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

  // OBS: Vi använder inte längre fetch-stubbar för BPMN-filer.
  // Testerna använder faktisk kod med data URLs (samma approach som appen använder för versioned files).
  // Se tests/helpers/bpmnTestHelpers.ts för hur BPMN-filer laddas i testerna.
});
