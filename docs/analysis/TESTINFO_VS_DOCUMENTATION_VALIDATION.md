# Analys: Testinfo‑generering vs Dokumentationsgenerering (uppdaterad)

## Datum: 2026-01-03

## 🎯 Syfte

Validera att testinfo‑generering är konsekvent med dokumentationsflödet och lagring.

---

## 📊 Jämförelse: Dokumentation vs Testinfo

### 1. Storage Paths och Versioning

#### Dokumentation

- **Versioned path:** `docs/claude/{bpmnFile}/{versionHash}/{docFileName}`
- **Non‑versioned fallback:** `docs/claude/{docFileName}`

#### Testinfo (E2E)

- **Versioned path:** `e2e-scenarios/{bpmnFile}/{versionHash}/{baseName}-scenarios.json`
- ✅ E2E använder version hash (konsistent med dokumentation)

#### Testinfo (Feature Goals)

- Sparas i DB (`node_planned_scenarios`) via `upsert`
- Nycklar: `bpmn_file`, `bpmn_element_id`, `provider`, `origin`
- ✅ Dubblering undviks med `upsert`

---

### 2. Genereringsprocess

#### Dokumentation

1. `generateAllFromBpmnWithGraph()` skapar docs per fil
2. Varje doc laddas upp med version hash

#### Testinfo

1. **E2E** genereras endast för root‑filen enligt `bpmn-map.json`
2. **Feature Goal‑scenarier** genereras **direkt från Feature Goal‑dokumentation**
3. Ingen extraktion av Feature Goals från E2E

---

### 3. Specialfall

- **Filer utan callActivities**:
  - Feature Goal‑scenarier genereras ändå från processens Feature Goal‑doc
  - `bpmn_element_id = {baseName}`
- **Subprocess‑filer som saknas**:
  - E2E kan fortfarande genereras (root) men Feature Goals för saknade subprocesser uteblir

---

## ✅ Status

- ✅ E2E är versionerade och konsistenta med dokumentation
- ✅ E2E genereras endast för true root
- ✅ Feature Goal‑tester genereras per uppladdad fil, direkt från docs
