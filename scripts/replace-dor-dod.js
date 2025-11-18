const fs = require('fs');
const path = require('path');

const files = [
  { file: 'public/docs/credit-evaluation.html', subprocess: 'credit-evaluation', title: 'Credit Evaluation' },
  { file: 'public/docs/stakeholder.html', subprocess: 'stakeholder', title: 'Stakeholder' },
  { file: 'public/docs/household.html', subprocess: 'household', title: 'Household' },
  { file: 'public/docs/object.html', subprocess: 'object', title: 'Object' },
  { file: 'public/docs/object-information.html', subprocess: 'object-information', title: 'Object Information' },
  { file: 'public/docs/internal-data-gathering.html', subprocess: 'internal-data-gathering', title: 'Internal Data Gathering' },
  { file: 'public/docs/application.html', subprocess: 'application', title: 'Application' },
];

const replacementTemplate = (subprocess, title) => `
        <section id="dor">
            <h2>Definition of Ready</h2>
            <div class="card">
                <p>DoR och DoD för denna subprocess finns nu i det interaktiva DoR/DoD-systemet.</p>
                <p style="margin-top: 15px;">
                    <a href="/#/subprocess/${subprocess}" class="link-box" target="_blank">
                        Öppna DoR/DoD för ${title}
                    </a>
                </p>
                <p style="margin-top: 10px; color: #666; font-size: 0.9rem;">
                    I DoR/DoD-systemet kan du bocka av kriterier och spåra framsteg i realtid. Alla ändringar loggas automatiskt i versionshistoriken.
                </p>
            </div>
        </section>

        <section id="dod">
            <h2>Definition of Done</h2>
            <div class="card">
                <p>DoR och DoD för denna subprocess finns nu i det interaktiva DoR/DoD-systemet.</p>
                <p style="margin-top: 15px;">
                    <a href="/#/subprocess/${subprocess}" class="link-box" target="_blank">
                        Öppna DoR/DoD för ${title}
                    </a>
                </p>
            </div>
        </section>
`;

files.forEach(({ file, subprocess, title }) => {
  try {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Find the start of DoR section
    const dorStart = content.indexOf('<section id="dor">');
    if (dorStart === -1) {
      console.log(`No DoR section found in ${file}`);
      return;
    }
    
    // Find the end of DoD section (look for next <section or <footer)
    const dodStart = content.indexOf('<section id="dod">', dorStart);
    if (dodStart === -1) {
      console.log(`No DoD section found in ${file}`);
      return;
    }
    
    // Find where DoD section ends - look for next section or footer
    let dodEnd = content.indexOf('</section>', dodStart);
    dodEnd = content.indexOf('</section>', dodEnd + 1); // Skip the first closing tag (inside DoD)
    dodEnd += '</section>'.length;
    
    // Move forward to find the actual end (after all nested sections)
    let searchPos = dodEnd;
    let nestedLevel = 0;
    let done = false;
    
    while (!done && searchPos < content.length) {
      const nextSectionStart = content.indexOf('<section', searchPos);
      const nextSectionEnd = content.indexOf('</section>', searchPos);
      const nextFooter = content.indexOf('<footer', searchPos);
      const nextChangelog = content.indexOf('<section id="changelog">', searchPos);
      
      // If we find footer or changelog first, that's our endpoint
      if ((nextFooter !== -1 && (nextFooter < nextSectionStart || nextSectionStart === -1)) ||
          (nextChangelog !== -1 && (nextChangelog < nextSectionStart || nextSectionStart === -1))) {
        dodEnd = Math.min(
          nextFooter !== -1 ? nextFooter : Infinity,
          nextChangelog !== -1 ? nextChangelog : Infinity
        );
        done = true;
      } else {
        searchPos = nextSectionEnd + '</section>'.length;
      }
    }
    
    // Replace the content
    const beforeDor = content.substring(0, dorStart);
    const afterDod = content.substring(dodEnd);
    const replacement = replacementTemplate(subprocess, title);
    
    const newContent = beforeDor + replacement + '\n' + afterDod;
    
    fs.writeFileSync(file, newContent, 'utf-8');
    console.log(`✅ Updated ${file}`);
    
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log('\nAll files processed!');
