/**
 * Debug logger för att spåra exakt vad som händer i testerna
 */

export class DebugLogger {
  private static stepCounter = 0;
  private static startTime = Date.now();

  static log(step: string, details?: Record<string, unknown>) {
    this.stepCounter++;
    const elapsed = Date.now() - this.startTime;
    const timestamp = new Date().toISOString();
    
    console.log(`\n[${timestamp}] [STEP ${this.stepCounter}] ${step}`);
    if (details) {
      console.log(`  Details:`, JSON.stringify(details, null, 2));
    }
    console.log(`  Elapsed: ${elapsed}ms\n`);
  }

  static logUrl(page: { url(): string }) {
    const url = page.url();
    console.log(`  Current URL: ${url}`);
    return url;
  }

  static logElement(page: { locator(selector: string): { count(): Promise<number> } }, selector: string, name: string) {
    return page.locator(selector).count().then(count => {
      console.log(`  ${name} (${selector}): ${count} found`);
      return count;
    });
  }

  static logPageContent(page: { textContent(selector: string): Promise<string | null> }, selector: string = 'body') {
    return page.textContent(selector).then(content => {
      const preview = content ? content.substring(0, 200) : 'null';
      console.log(`  Page content preview (${selector}): ${preview}...`);
      return content;
    });
  }

  static reset() {
    this.stepCounter = 0;
    this.startTime = Date.now();
  }
}

