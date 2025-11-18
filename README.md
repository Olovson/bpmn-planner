# BPMN Process Viewer & Analysis Platform

Komplett BPMN-plattform för att visualisera, analysera och hantera affärsprocesser med integrerat stöd för testning, dokumentation och projektresurser.

## 🚀 Snabbstart

**Live-demo**: https://pangs-ci-access.lovable.app/

**Demo-inloggning**:
- Email: `demo@account.com`
- Lösenord: `testing`

## ⚡ Huvudfunktioner

### 📊 BPMN-Visualisering & Navigation
- **Interaktiv Diagram-Viewer**: Visa BPMN 2.0-processer med test status overlays
  - 🟢 Pass, 🔴 Fail, 🟡 Pending, ⚪ Skipped
- **Hierarkisk Navigation**: Automatisk detektering av root-processer
- **Element-Interaktion**:
  - Single-click för att markera och visa detaljer
  - Dubbelklick på CallActivity för subprocess-navigation
- **Historik**: Navigera bakåt genom besökta subprocesser
- **Smart Sök** (Cmd/Ctrl+K): Sök över alla BPMN-noder med auto-zoom

### 🌲 Processträd (D3-Visualisering)
- **Hierarkisk Struktur**: Interaktiv D3.js-visualisering av hela processlandskapet
- **Dynamisk Uppdatering**: Processträdet uppdateras automatiskt vid fil-ändringar
- **Artefakt-Indikatorer**: Se test-coverage, dokumentation och DoR/DoD-status direkt i trädet
- **Collapse/Expand**: Växla mellan kompakt och detaljerad vy
- **Click-Navigation**: Klicka på noder för att öppna motsvarande BPMN-fil

### 📁 Filhantering
- **Upload**: Ladda upp BPMN och DMN-filer direkt i UI:t
- **GitHub Sync**: Synkronisera filer från GitHub-repository
- **Dependency Management**: Automatisk tracking av subprocess-relationer
- **Artifact Coverage**: Se status för dokumentation, tester och DoR/DoD per fil
- **Bulk Operations**: Radera alla filer eller reset autogenererad data

### 🤖 AI-Driven Artefaktgenerering
Generera automatiskt med hierarkisk kontext:
- **Dokumentation**: Komplett HTML-dokumentation med subprocess-kontext
- **Playwright Tests**: 
  - Faktiska `.spec.ts`-filer skapas och lagras i Supabase Storage
  - Test-skelett med node-specifika exempel och best practices
  - Scenarier baserade på hela processflödet
  - Automatisk länkning till BPMN-noder via `node_test_links`
  - Ingen överskrivning av befintliga testfiler
- **DoR/DoD Checklistor**: Omfattande checklistor med 12 kategorier
- **Smart Generation**: "Generera saknade" eller "Regenerera" baserat på coverage-status
- **Jira Type Auto-Assignment**: 
  - CallActivity → "feature goal"
  - UserTask/ServiceTask/BusinessRuleTask → "epic"

### 🔗 Resurskoppling & Referenser
**Automatiska Mappningar** (från generator):
- Confluence-dokumentation
- Test reports
- Subprocesser (CallActivity → BPMN-fil)
- Jira Type (epic/feature goal)

**Manuella Referenser** (node_references):
- **Figma**: Design-länkar
- **Jira**: Issue tracking med type-kategorisering
- **Custom**: Valfria externa resurser
- Stöd för både fil-nivå och nod-nivå länkar

### 📋 Listvy (Node Matrix)
- **Tabellarisk Översikt**: Se alla BPMN-noder i en filtrerbar tabell
- **Filtrering**: Efter BPMN-fil, nodtyp och Jira-typ
- **Inline-Redigering**: 
  - Figma, Confluence och Test Report URLs
  - Jira Type (epic/feature goal/ingen)
- **Excel-Export**: Exportera filtrerad data med tidstämplade filnamn
- **Sortering**: Klicka på kolumnrubriker för att sortera
- **Direktlänkar**: Klicka på resurser för att öppna i ny flik

### 📊 Test Coverage & Reporting
- **Faktiska Testfiler**: 
  - Playwright `.spec.ts`-filer lagras i Supabase Storage (`bpmn-files/tests/`)
  - Automatisk generering vid artefakt-skapande
  - Public URLs för åtkomst via UI
- **Test-koppling**: `node_test_links` kopplar BPMN-noder till test-filer
- **Coverage Status**: Visuell indikation av test-täckning (none/partial/full)
- **Detaljerad Report**: Se alla tester per nod med status och senaste körning
- **Test Status Overlays**: Badge-indikatorer direkt på BPMN-diagram
- **Deep-linking**: Navigera direkt till specifika test-rapporter
- **Nedladdningsbara**: Alla testfiler kan öppnas och laddas ner

### 🔄 Versionshantering
- **Automatisk Historik**: Alla ändringar sparas automatiskt
- **Manuella Snapshots**: Skapa namngivna versioner
- **Återställning**: Återgå till tidigare versioner
- **Diff-View**: Jämför versioner

### 🛡️ Admin & Dathantering
- **Reset Funktionalitet**: Rensa all autogenererad data (docs, tests, DoR/DoD)
- **GitHub Cleanup**: Automatisk rensning av genererade filer i GitHub
- **Storage Cleanup**: Rensa Supabase Storage
- **Registry Status**: Översikt av all data i systemet

## 🛠️ Teknisk Stack

### Frontend
- **Framework**: React 18 med TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS med semantic design tokens
- **Routing**: React Router v6 (HashRouter för GitHub Pages)
- **State**: React Query för server state
- **BPMN/DMN**: bpmn-js, dmn-js
- **Visualisering**: D3.js för processträd

### Backend (Lovable Cloud)
- **Database**: PostgreSQL via Supabase
- **Storage**: Supabase Storage för BPMN/DMN-filer
- **Edge Functions**: Serverless functions för:
  - Filhantering (upload, list, delete)
  - GitHub sync
  - Artefaktgenerering
  - Process tree building
  - Test result submission
- **Auth**: Supabase Auth med email/password

### Testing & CI/CD
- **E2E Testing**: Playwright
- **GitHub Actions**: Automatisk deployment till GitHub Pages

## 📖 Användning

### Grundläggande Arbetsflöde

1. **Logga in** med demo-konto eller skapa eget
2. **Ladda upp BPMN-filer** via "Filer"-sidan
3. **Synka från GitHub** (optional) för automatisk filimport
4. **Generera artefakter** per fil (dokumentation, tester, DoR/DoD)
   - Faktiska Playwright-testfiler skapas automatiskt i `bpmn-files/tests/`
   - Jira Type assigneras automatiskt (epic/feature goal)
5. **Navigera processer** via diagram-view eller processträd
6. **Koppla resurser** genom att klicka på noder i diagrammet
7. **Hantera noder** via Listvy:
   - Filtrera efter fil, nodtyp eller Jira-typ
   - Redigera metadata inline (Figma, Confluence, Jira Type)
   - Exportera till Excel med tidstämplade filnamn
8. **Spåra test-coverage** via test report-sidan
9. **Följ DoR/DoD** via dashboard

### Keyboard Shortcuts
- **Cmd/Ctrl+K**: Öppna smart-sök
- **Browser Back**: Navigera tillbaka i processhistorik

### Navigation
- **/** - Index/BPMN viewer (dynamisk root-fil)
- **/bpmn/:filename** - Specifik BPMN-fil
- **/node-matrix** - Listvy med tabellarisk översikt av alla noder
- **/files** - Filhantering
- **/test-report** - Test coverage översikt
- **/node-tests** - Detaljerade test-resultat per nod
- **/dor-dod** - DoR/DoD dashboard
- **/subprocess/:name** - DoR/DoD för specifik subprocess
- **/registry-status** - System-översikt
- **/admin** - Admin-funktioner (reset, cleanup)

## 💻 Utveckling

### Installation
```bash
# Klona repo
git clone https://github.com/Olovson/pangs-ci-access.git
cd pangs-ci-access

# Installera dependencies
npm install

# Konfigurera .env (skapas automatiskt av Lovable Cloud)
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_PUBLISHABLE_KEY=...
```

### Utveckling
```bash
# Starta dev server (port 8080)
npm run dev

# Kör Playwright tester
npx playwright test

# Kör tester i UI-läge
npx playwright test --ui

# Bygg för produktion
npm run build

# Preview production build
npm run preview
```

### Edge Functions (Supabase)
```bash
# Edge functions finns i supabase/functions/
# Deployas automatiskt via Lovable Cloud

# Testa lokalt (kräver Supabase CLI)
supabase functions serve
```

## 🔄 GitHub Integration

### Automatisk Synkning
- **Bidirectional Sync**: Ändringar i Lovable → GitHub och GitHub → Lovable
- **Real-time**: Ingen manuell push/pull nödvändig
- **CI/CD**: GitHub Actions för automatisk deployment

### Filstruktur
```
├── public/
│   ├── bpmn/              # BPMN-filer (legacy, använd Supabase Storage)
│   ├── docs/              # Genererad HTML-dokumentation
│   └── dmn/               # DMN-filer
├── src/
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── pages/             # Sidor/routes
│   ├── lib/               # Utilities & helpers
│   └── integrations/      # Supabase integration
├── supabase/
│   ├── functions/         # Edge functions
│   └── migrations/        # Database migrations
└── tests/                 # Playwright tests (autogenererade)
```

### Supabase Storage Struktur
```
bpmn-files/
├── *.bpmn                 # BPMN-processfiler
├── *.dmn                  # DMN-beslutsfiler
├── docs/
│   └── *.html             # Genererad dokumentation
└── tests/
    └── *.spec.ts          # Genererade Playwright-testfiler
```

## 📊 Databasschema

### Core Tables

**bpmn_files**
- Metadata för alla BPMN/DMN-filer
- Storage paths, GitHub sync-status
- `has_structure_changes` flagga för dependency-updates

**bpmn_dependencies**
- Hierarkiska relationer mellan BPMN-filer
- `parent_file`, `child_process`, `child_file`
- Möjliggör dynamisk processträdsbyggning

**bpmn_node_index**
- Index över alla BPMN-noder per fil
- Möjliggör snabb coverage-beräkning
- Node types: UserTask, ServiceTask, BusinessRuleTask, CallActivity, SubProcess

**bpmn_element_mappings**
- Kopplar BPMN-noder till resurser
- Confluence URL, Figma URL, DMN-filer
- Subprocess BPMN-filer
- Jira issues (JSON array)
- **Jira Type**: epic/feature goal (auto-assigned vid generering)

### Test & Coverage

**node_test_links**
- Kopplar BPMN-noder till test-filer i Supabase Storage
- `bpmn_file`, `bpmn_element_id`, `test_file_path` (ex: `tests/node-name.spec.ts`)
- `test_name` för display
- Används för coverage-beräkning (oberoende av test_results)
- Public URLs via `getTestFileUrl()` helper

**test_results**
- Test-körningar och resultat från GitHub Actions
- Status, duration, scenarios, error messages
- GitHub run URL för traceability

### Documentation & Quality

**bpmn_docs**
- Metadata för genererad HTML-dokumentation
- `bpmn_file`, `created_at`

**dor_dod_status**
- Definition of Ready/Done-kriterier
- 12 kategorier (process_krav, data_input_output, design, etc.)
- User tracking: `completed_by`, `completed_at`
- Orphan-flagging för borttagna processer

**node_references**
- Manuella länkar (Figma, Jira, custom)
- Stöd för både fil-nivå och nod-nivå
- `ref_type`, `ref_label`, `ref_url`
- Persisterar vid data-reset

### Version Management

**versions**
- Versionshistorik med snapshots
- `snapshot_data` (JSON) med hela systemets state
- User-driven och automatiska snapshots

### Auth

**profiles**
- Utökad user-information
- Kopplas till Supabase Auth users

## 🏗️ Arkitektur

### Hierarkisk Process-Analys
Systemet använder en hierarkisk analysmotor (`buildBpmnProcessGraph`) som:
1. Identifierar root-processer automatiskt
2. Bygger komplett dependency-träd
3. Hanterar saknade subprocess-filer med placeholders
4. Möjliggör context-aware artefaktgenerering

### Dynamic Root Detection
`useRootBpmnFile` hook:
- Analyserar `bpmn_dependencies` för att hitta root-fil
- Root = fil som är parent men aldrig child
- Fallback till 'mortgage.bpmn' vid tomma dependencies

### Artifact Generation Flow
1. **Hierarchical Analysis**: Bygg process graph från root
2. **Context Gathering**: Samla in information från alla subprocesser
3. **Generation**: Skapa dokumentation/tester/DoR-DoD med fullständig kontext
4. **Persistence**: Spara till databas och storage
5. **UI Update**: Invalidera queries för omedelbar UI-uppdatering

### Coverage Calculation
- **Total Nodes**: Räknas från `bpmn_node_index`
- **Covered Nodes**: Antal noder med entries i respektive tabell
  - Tests: `node_test_links`
  - Docs: `bpmn_docs`
  - DoR/DoD: `dor_dod_status`
- **Status**: none (0%), partial (1-99%), full (100%), noApplicableNodes (0 total nodes)

## 🔐 Security & RLS

### Row Level Security Policies
- Alla tabeller använder RLS för att skydda data
- User-baserade policies för:
  - node_references (skapad av user)
  - versions (user-owned)
  - profiles (user = id)
- Public read för metadata-tabeller
- Admin-only write för system-tabeller

### Storage Security
- BPMN/DMN-filer: Public bucket för enkel access
- Genererade docs: Public för delning
- Private buckets för känslig data (om applicerbart)

## 🐛 Troubleshooting

### BPMN Viewer Visar Inte Diagram
1. Kontrollera att filer finns i Supabase Storage
2. Verifiera att `bpmn_files` tabell är populerad
3. Se browser console för laddningsfel
4. Testa med hård refresh (Ctrl+Shift+R)

### GitHub Sync Fungerar Inte
1. Kontrollera environment variables i edge function
2. Verifiera GitHub token-permissions
3. Se edge function logs i Lovable Cloud

### Test Coverage Visar Fel Status
1. Verifiera att `node_test_links` är uppdaterad
2. Regenerera test-kopplingar via filhantering
3. Kontrollera att `bpmn_node_index` är aktuell

### Process Tree Visar Inte Alla Filer
1. Kör "Sync från GitHub" för att uppdatera dependencies
2. Verifiera `bpmn_dependencies` innehåller alla relationer
3. Ladda om sidan för att trigga ny tree-build

## 📝 Contributing

Vi välkomnar contributions! För större ändringar:
1. Öppna ett issue för diskussion
2. Skapa en branch från `main`
3. Implementera ändring med tester
4. Skapa Pull Request

## 📄 License

MIT License - se LICENSE-fil för detaljer

## 🙏 Credits

Byggt med:
- [Lovable](https://lovable.dev) - AI-driven development platform
- [Supabase](https://supabase.com) - Backend infrastructure
- [bpmn-js](https://bpmn.io) - BPMN rendering
- [D3.js](https://d3js.org) - Data visualization
- [Playwright](https://playwright.dev) - E2E testing

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/Olovson/pangs-ci-access/issues)
- **Docs**: [Lovable Docs](https://docs.lovable.dev)
- **Community**: [Lovable Discord](https://discord.com/channels/1119885301872070706)
