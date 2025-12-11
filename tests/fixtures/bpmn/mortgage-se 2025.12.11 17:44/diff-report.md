# BPMN Diff-rapport

**Från:** mortgage-se 2025.11.29
**Till:** mortgage-se 2025.12.11 17:44
**Genererad:** 2025-12-11T16:59:23.654Z

---

## 📊 Sammanfattning

- 🆕 **Nya filer:** 2
- 🗑️ **Borttagna filer:** 0
- 🔄 **Modifierade filer:** 17
- ✅ **Oförändrade filer:** 2

---

## 🆕 Nya filer

- `mortgage-se-object-control.bpmn`
- `mortgage-se-object-valuation.bpmn`

---

## 🔄 Modifierade filer

### 📄 mortgage-se-application.bpmn

**Sammanfattning:** 2 service tasks, 1 business rule, 5 gateways, 25 sequence flows

#### ⚙️ Service Tasks
**Tillagda (2):**
  - **KALP** (`Activity_0p3rqyp`)
  - **Fetch credit information** (`fetch-credit-information`)

#### 📋 Business Rule Tasks
**Tillagda (1):**
  - **Screen KALP** (`Activity_1mezc6h`)

#### 🔄 SubProcesses
**Ändrade (1):**
  - **Per stakeholder** (`stakeholders`): "Per stakeholder" → "Per household"

#### 🔀 Gateways
**Tillagda (3):**
  - **KALP OK?** (`Gateway_0fhav15`)
  - **Skip step?** (`skip-confirm-application`)
  - **Gateway_1nszp2i** (`Gateway_1nszp2i`)

**Borttagna (2):**
  - **Gateway_0n2ekt4** (`Gateway_0n2ekt4`)
  - **Gateway_1960pk9** (`Gateway_1960pk9`)

#### ➡️ Sequence Flows
**Tillagda (13):**
  13 nya sequence flows
  - **stakeholder → Event_0gupj82** (`Flow_0juj7si`)
  - **object → stakeholders** (`Flow_02jau0k`)
  - **Event_152muhg → Event_07jlrhu** (`Flow_0lxps1x`)
  - **Activity_0p3rqyp → Activity_1mezc6h** (`Flow_04bzpjt`)
  - **Activity_1mezc6h → Gateway_0fhav15** (`Flow_0i63pbb`)
  ... och 8 fler

**Borttagna (8):**
  - **internal-data-completed → Gateway_0n2ekt4** (`Flow_1lt398c`)
  - **Gateway_0n2ekt4 → household** (`Flow_0neqown`)
  - **Gateway_0n2ekt4 → stakeholders** (`Flow_0vbmqir`)
  - **household → Gateway_1960pk9** (`Flow_1xwl7et`)
  - **Gateway_1960pk9 → confirm-application** (`Flow_0l2vtb6`)
  - **confirm-application → Event_0j4buhs** (`Flow_0rpz5o9`)
  - **Event_152muhg → Event_07jlrhu** (`Flow_0ei70yq`)
  - **object → Event_0gupj82** (`Flow_1bki58p`)

---

### 📄 mortgage-se-credit-decision.bpmn

**Sammanfattning:** 2 business rules, 2 sequence flows

#### 📋 Business Rule Tasks
**Tillagda (1):**
  - **Determine decision escalation** (`determine-decision-escalation`)

**Borttagna (1):**
  - **Credit decision rules** (`evaluate-credit-decision-rules`)

---

### 📄 mortgage-se-credit-evaluation.bpmn

**Sammanfattning:** 1 service task, 4 business rules, 2 gateways, 11 sequence flows

#### ⚙️ Service Tasks
**Tillagda (1):**
  - **Fetch credit information** (`fetch-credit-information`)

#### 📋 Business Rule Tasks
**Tillagda (2):**
  - **Select product** (`select-product`)
  - **Determine amortisation** (`determine-amortisation`)

**Borttagna (2):**
  - **Fetch product** (`fetch-product`)
  - **Amortisation** (`evaluate-amortisation`)

#### 🔄 SubProcesses
**Tillagda (1):**
  - **For each stakeholder** (`loop-stakeholder`)

#### 🔀 Gateways
**Tillagda (2):**
  - **Needs updated Credit information** (`needs-updated-credit-information`)
  - **Gateway_1r0yv3x** (`Gateway_1r0yv3x`)

#### ➡️ Sequence Flows
**Tillagda (7):**
  - **Event_05bicys → needs-updated-credit-information** (`Flow_1dwj1bm`)
  - **No** (`needs-updated-credit-information-no`)
  - **Gateway_1r0yv3x → Event_1qi3hs3** (`Flow_0p3tk8d`)
  - **Yes** (`Flow_1wowqvd`)
  - **fetch-credit-information → Gateway_1r0yv3x** (`Flow_0hdn4pg`)
  - **determine-amortisation → loop-stakeholder** (`Flow_0fbo1lt`)
  - **loop-stakeholder → loop-household** (`Flow_00jhae7`)

**Borttagna (1):**
  - **evaluate-amortisation → loop-household** (`Flow_0pzwjpn`)

---

### 📄 mortgage-se-disbursement.bpmn

**Sammanfattning:** 2 service tasks, 3 user tasks, 1 business rule, 9 gateways, 26 sequence flows

#### ⚙️ Service Tasks
**Tillagda (1):**
  - **Handle disbursement** (`handle-disbursement`)

**Borttagna (1):**
  - **Disburse loan** (`disburse-loan`)

#### 👤 User Tasks
**Borttagna (3):**
  - **Disbursement control** (`disbursement-control`)
  - **Verify disbursement details** (`verify-disbursement-details`)
  - **Control purchase disbusement requirements** (`control-purchase-disbursement-requirements`)

#### 📋 Business Rule Tasks
**Borttagna (1):**
  - **Evaluate disbursement rules** (`evaluate-disbursement-rules`)

#### 🔀 Gateways
**Tillagda (1):**
  - **Gateway_15wjsxm** (`Gateway_15wjsxm`)

**Borttagna (8):**
  - **Gateway_03iwqyj** (`Gateway_03iwqyj`)
  - **Needs manual control?** (`needs-control`)
  - **Needs four eyes verification?** (`needs-four-eyes-verification`)
  - **Changes requested?** (`changes-requested`)
  - **Gateway_0883twg** (`Gateway_0883twg`)
  - **Gateway_0u8ncuu** (`Gateway_0u8ncuu`)
  - **Is purpose purchase?** (`is-purpose-purchase`)
  - **Gateway_1mumwn0** (`Gateway_1mumwn0`)

#### ➡️ Sequence Flows
**Tillagda (7):**
  - **start-event → handle-disbursement** (`Flow_1o0uuwd`)
  - **handle-disbursement → Gateway_15wjsxm** (`Flow_0geszxp`)
  - **Gateway_15wjsxm → disbursement-completed** (`Flow_178gpcv`)
  - **Gateway_15wjsxm → disbursement-cancelled** (`Flow_0l5s06k`)
  - **disbursement-completed → archive-documents** (`Flow_11bdea0`)
  - **archive-documents → Event_0gubmbi** (`Flow_0qzovsm`)
  - **disbursement-cancelled → disbursement-cancelled-escalate** (`Flow_0apx5zn`)

**Borttagna (19):**
  19 borttagna sequence flows
  - **control-purchase-disbursement-requirements → Gateway_1mumwn0** (`Flow_0blxdbj`)
  - **Yes** (`Flow_1pukfql`)
  - **No** (`Flow_0bskgqd`)
  - **Yes** (`needs-control-yes`)
  - **Gateway_03iwqyj → disbursement-control** (`Flow_0s8459j`)
  ... och 14 fler

---

### 📄 mortgage-se-document-generation.bpmn

**Sammanfattning:** 1 service task, 3 sequence flows

#### ⚙️ Service Tasks
**Tillagda (1):**
  - **Prepare loan** (`Activity_1qsvac1`)

#### ➡️ Sequence Flows
**Tillagda (2):**
  - **StartEvent_1 → Activity_1qsvac1** (`Flow_1lqf7ht`)
  - **Activity_1qsvac1 → select-documents** (`Flow_0dwbnq2`)

**Borttagna (1):**
  - **StartEvent_1 → select-documents** (`Flow_03k8jlw`)

---

### 📄 mortgage-se-documentation-assessment.bpmn

**Sammanfattning:** 1 user task, 6 gateways, 13 sequence flows

#### 👤 User Tasks
**Tillagda (1):**
  - **Review changes** (`review-changes`)

#### 🔀 Gateways
**Tillagda (5):**
  - **Gateway_09bzv5v** (`Gateway_09bzv5v`)
  - **Stakeholder review?** (`stakeholder-review`)
  - **Changes accepted?** (`changes-accepted`)
  - **Gateway_0qnt8qq** (`Gateway_0qnt8qq`)
  - **Any documentation incomplete?** (`any-documentation-incomplete`)

**Borttagna (1):**
  - **Economy information changed?** (`economy-information-changed`)

#### ➡️ Sequence Flows
**Tillagda (9):**
  - **No** (`changes-accepted-no`)
  - **Gateway_09bzv5v → assess-documentation** (`Flow_0xtpzwu`)
  - **stakeholder-review → review-changes** (`Flow_18eeaae`)
  - **stakeholder-review → Gateway_0qnt8qq** (`Flow_07tlcfk`)
  - **review-changes → changes-accepted** (`Flow_1kau0fc`)
  - **Yes** (`changes-accepted-yes`)
  - **Gateway_0qnt8qq → any-documentation-incomplete** (`Flow_1n00hxf`)
  - **No** (`any-documentation-incomplete-no`)
  - **Yes** (`Flow_1xuakc2`)

**Borttagna (2):**
  - **Yes** (`economy-information-changed-yes`)
  - **No** (`economy-information-changed-no`)

---

### 📄 mortgage-se-household.bpmn

**Sammanfattning:** 2 gateways, 5 sequence flows

#### 🔀 Gateways
**Tillagda (2):**
  - **Gateway_1v71ek3** (`Gateway_1v71ek3`)
  - **Skip step?** (`skip-register-household-economy-information`)

#### ➡️ Sequence Flows
**Tillagda (3):**
  - **No** (`skip-register-household-economy-information-no`)
  - **Gateway_1v71ek3 → Event_10dekgp** (`Flow_03gb7d6`)
  - **Yes** (`skip-register-household-economy-information-yes`)

---

### 📄 mortgage-se-internal-data-gathering.bpmn

**Sammanfattning:** 2 business rules, 2 gateways, 6 sequence flows

#### 📋 Business Rule Tasks
**Tillagda (1):**
  - **Screen party** (`screen-party`)

**Borttagna (1):**
  - **Pre-screen party** (`pre-screen-party`)

#### 🔀 Gateways
**Tillagda (1):**
  - **Party rejected?** (`is-party-rejected`)

**Borttagna (1):**
  - **Approved?** (`is-approved`)

#### ➡️ Sequence Flows
**Tillagda (2):**
  - **Yes** (`is-party-rejected-yes`)
  - **No** (`is-party-rejected-no`)

**Borttagna (2):**
  - **No** (`is-approved-no`)
  - **Yes** (`is-approved-yes`)

---

### 📄 mortgage-se-kyc.bpmn

**Sammanfattning:** 1 service task, 2 gateways, 6 sequence flows

#### ⚙️ Service Tasks
**Tillagda (1):**
  - **Fetch KYC** (`fetch-kyc`)

#### 🔀 Gateways
**Tillagda (2):**
  - **KYC questions needed?** (`kyc-questions-needed`)
  - **Gateway_0204xp6** (`Gateway_0204xp6`)

#### ➡️ Sequence Flows
**Tillagda (4):**
  - **fetch-kyc → kyc-questions-needed** (`Flow_0y06b65`)
  - **Gateway_0204xp6 → fetch-aml-kyc-risk** (`Flow_04f9npa`)
  - **Yes** (`kyc-questions-needed-yes`)
  - **No** (`kyc-questions-needed-no`)

---

### 📄 mortgage-se-manual-credit-evaluation.bpmn

**Sammanfattning:** 1 service task, 2 user tasks, 1 business rule, 3 call activities, 8 gateways, 32 sequence flows

#### ⚙️ Service Tasks
**Tillagda (1):**
  - **Fetch credit information** (`fetch-credit-information`)

#### 👤 User Tasks
**Tillagda (1):**
  - **Upload documentation** (`auw-upload-documentation`)

**Borttagna (1):**
  - **Determine object value** (`decide-object-value`)

#### 📋 Business Rule Tasks
**Borttagna (1):**
  - **Evaluate requirements** (`evaluate-requirements`)

#### 📞 Call Activities
**Tillagda (2):**
  - **Object control** (`object-control`)
  - **Automatic Credit Evaluation** (`Activity_1gzlxx4`)
    - calledElement: credit-evaluation

**Borttagna (1):**
  - **Automatic Credit Evaluation** (`credit-evaluation`)

#### 🔀 Gateways
**Tillagda (4):**
  - **All documentation complete?** (`all-documentation-complete`)
  - **Gateway_1o1bs0l** (`Gateway_1o1bs0l`)
  - **Gateway_0ibu5sd** (`Gateway_0ibu5sd`)
  - **New documentation requirement?** (`new-documentation-requirement`)

**Borttagna (3):**
  - **Gateway_096uqrh** (`Gateway_096uqrh`)
  - **Gateway_02p0qya** (`Gateway_02p0qya`)
  - **All documentation approved?** (`all-documentation-approved`)

**Ändrade (1):**
  - **Gateway_0q79pdz** (`Gateway_0q79pdz`): "Gateway_0q79pdz" → "Gateway_0q79pdz"

#### ➡️ Sequence Flows
**Tillagda (16):**
  16 nya sequence flows
  - **Object control** (`needs-object-control-yes`)
  - **object-control → Gateway_0q79pdz** (`Flow_0trdg4o`)
  - **elevate-to-advanced-underwriting → Gateway_1o1bs0l** (`Flow_1sj1g62`)
  - **Gateway_1o1bs0l → Gateway_0q79pdz** (`Flow_0tholeg`)
  - **Gateway_0q79pdz → Activity_1gzlxx4** (`Flow_17bq3hb`)
  ... och 11 fler

**Borttagna (12):**
  12 borttagna sequence flows
  - **Object valuation** (`requirements-object-valuation`)
  - **decide-object-value → Gateway_02p0qya** (`Flow_1ggt9w5`)
  - **evaluate-requirements → Gateway_096uqrh** (`Flow_12r1b3x`)
  - **event-request-additional-documentation → Gateway_096uqrh** (`Flow_0nrbth9`)
  - **Gateway_096uqrh → requirements** (`Flow_0191n4i`)
  ... och 7 fler

---

### 📄 mortgage-se-mortgage-commitment.bpmn

**Sammanfattning:** 1 gateway, 22 sequence flows

#### 🔄 SubProcesses
**Tillagda (1):**
  - **Activity_1xrvxr3** (`Activity_1xrvxr3`)

#### 🔀 Gateways
**Ändrade (1):**
  - **Object accepted?** (`is-object-approved`): "Object accepted?" → "Object rejected?"

#### ➡️ Sequence Flows
**Tillagda (12):**
  12 nya sequence flows
  - **documentation-assessment → Event_08klgt4** (`Flow_14iefmj`)
  - **Event_18rlgin → decide-mortgage-commitment** (`Flow_03g2l11`)
  - **decide-mortgage-commitment → Event_09xxhnw** (`Flow_0ael636`)
  - **Event_0o7mt0k → documentation-assessment** (`Flow_0l4v39q`)
  - **Yes** (`is-mortgage-commitment-approved-yes`)
  ... och 7 fler

**Borttagna (10):**
  - **Yes** (`Flow_02mkamw`)
  - **No** (`cleared-for-proof-of-finance-no`)
  - **Gateway_0upjuan → decide-mortgage-commitment** (`Flow_18v51vt`)
  - **credit-reevaluation-required → Gateway_17kvnul** (`Flow_0roaxxj`)
  - **upload-documentation → documentation-assessment** (`Flow_1lggrca`)
  - **decide-mortgage-commitment → mortgage-commitment-decision** (`Flow_1cacoao`)
  - **Event_0z4ifsl → Event_070mrn1** (`Flow_06aberg`)
  - **Yes** (`is-object-accepted-yes`)
  - **No** (`is-object-accepted-no`)
  - **documentation-assessment → Event_1bpe1s7** (`Flow_04jnoez`)

---

### 📄 mortgage-se-object-information.bpmn

**Sammanfattning:** 2 service tasks, 2 sequence flows

#### ⚙️ Service Tasks
**Borttagna (1):**
  - **Fetch bostadsrätts-information** (`fetch-bostadsratts-information`)

**Ändrade (1):**
  - **Fetch BRF-information** (`fetch-brf-information`)
    - Namn: "Fetch BRF-information" → "Fetch BRF information"

#### ➡️ Sequence Flows
**Borttagna (1):**
  - **fetch-bostadsratts-information → fetch-brf-information** (`Flow_0cyaggu`)

---

### 📄 mortgage-se-object.bpmn

**Sammanfattning:** 2 gateways, 5 sequence flows

#### 🔀 Gateways
**Tillagda (2):**
  - **Skip step?** (`skip-register-source-of-equity`)
  - **Gateway_0box6jw** (`Gateway_0box6jw`)

#### ➡️ Sequence Flows
**Tillagda (3):**
  - **No** (`skip-register-source-of-equity-no`)
  - **Gateway_0box6jw → Gateway_1uyee92** (`Flow_0tljfm9`)
  - **Yes** (`skip-register-source-of-equity-yes`)

---

### 📄 mortgage-se-offer.bpmn

**Sammanfattning:** 2 user tasks, 2 call activities, 5 gateways, 17 sequence flows

#### 👤 User Tasks
**Tillagda (2):**
  - **Upload sales contract** (`upload-sales-contract`)
  - **Perform advanced underwriting** (`sales-contract-advanced-underwriting`)

#### 📞 Call Activities
**Tillagda (2):**
  - **Documentation assessment** (`documentation-assessment`)
  - **Credit decision** (`sales-contract-credit-decision`)

#### 🔀 Gateways
**Tillagda (5):**
  - **Sales contract assessed?** (`sales-contract-assessed`)
  - **Gateway_18jx4nb** (`Gateway_18jx4nb`)
  - **Sales contract uploaded?** (`sales-contract-uploaded`)
  - **Gateway_0ldnqm0** (`Gateway_0ldnqm0`)
  - **Gateway_0m9hox9** (`Gateway_0m9hox9`)

#### ➡️ Sequence Flows
**Tillagda (15):**
  15 nya sequence flows
  - **Yes** (`sales-contract-assessed-yes`)
  - **Gateway_0hrcun3 → decide-offer** (`Flow_16n2ck3`)
  - **start-event → sales-contract-assessed** (`Flow_07iil1n`)
  - **Gateway_0m9hox9 → Gateway_0hrcun3** (`Flow_1xqs76i`)
  - **No** (`sales-contract-assessed-no`)
  ... och 10 fler

**Borttagna (2):**
  - **Gateway_0hrcun3 → decide-offer** (`Flow_0g7258d`)
  - **start-event → Gateway_0hrcun3** (`Flow_0lzkd3s`)

---

### 📄 mortgage-se-signing.bpmn

**Sammanfattning:** 1 gateway, 3 sequence flows

#### 🔀 Gateways
**Tillagda (1):**
  - **Gateway_0s6m51u** (`Gateway_0s6m51u`)

#### ➡️ Sequence Flows
**Tillagda (2):**
  - **Gateway_0s6m51u → Gateway_0ymo975** (`Flow_1au354b`)
  - **Event_00w320y → Gateway_0s6m51u** (`Flow_1xzq7z3`)

---

### 📄 mortgage-se-stakeholder.bpmn

**Sammanfattning:** 1 service task, 3 business rules, 1 call activity, 3 gateways, 17 sequence flows

#### ⚙️ Service Tasks
**Borttagna (1):**
  - **Fetch credit information** (`fetch-credit-information`)

#### 📋 Business Rule Tasks
**Tillagda (1):**
  - **Screen personal information** (`screen-personal-information`)

**Borttagna (2):**
  - **Evaluate personal information** (`evaluate-personal-information`)
  - **Assess stakeholder** (`assess-stakeholder`)

#### 📞 Call Activities
**Tillagda (1):**
  - **Internal data gathering** (`internal-data-gathering`)

#### 🔀 Gateways
**Tillagda (2):**
  - **Skip step?** (`skip-register-personal-economy-information`)
  - **Gateway_01phbhw** (`Gateway_01phbhw`)

**Borttagna (1):**
  - **Stakeholder rejected?** (`is-stakeholder-rejected`)

#### ➡️ Sequence Flows
**Tillagda (7):**
  - **No** (`skip-register-personal-economy-information-no`)
  - **Gateway_01phbhw → Event_13fkti6** (`Flow_0166pil`)
  - **Yes** (`skip-register-personal-economy-information-yes`)
  - **is-personal-information-rejected → skip-register-personal-economy-information** (`Flow_1bscoy3`)
  - **Event_0e92ljp → Event_0qqc0uo** (`Flow_0nuzgc2`)
  - **consent-to-credit-check → did-consent-to-credit-check** (`Flow_0tme64f`)
  - **internal-data-gathering → Gateway_1wz6vo3** (`Flow_045d2pn`)

**Borttagna (6):**
  - **consent-to-credit-check → did-consent-to-credit-check** (`Flow_1ij3gto`)
  - **No** (`is-stakeholder-rejected-no`)
  - **No** (`is-personal-information-rejected-no`)
  - **fetch-credit-information → assess-stakeholder** (`Flow_0oh24ut`)
  - **assess-stakeholder → is-stakeholder-rejected** (`Flow_1uudmff`)
  - **Yes** (`is-stakeholder-rejected-yes`)

---

### 📄 mortgage.bpmn

**Sammanfattning:** 2 call activities, 2 gateways, 10 sequence flows

#### 📞 Call Activities
**Tillagda (1):**
  - **Object valuation** (`object-valuation`)

**Ändrade (1):**
  - **Offer** (`offer`)
    - Namn: "Offer" → "Offer preparation"

#### 🔀 Gateways
**Tillagda (2):**
  - **Gateway_142qegf** (`Gateway_142qegf`)
  - **Gateway_13402dj** (`Gateway_13402dj`)

#### ➡️ Sequence Flows
**Tillagda (6):**
  - **object-valuation → credit-evaluation** (`Flow_1st6mta`)
  - **event-loan-ready → document-generation** (`Flow_0qnrs78`)
  - **Gateway_142qegf → offer** (`Flow_01fkfe6`)
  - **Event_0gsqkjv → Gateway_13402dj** (`Flow_166m865`)
  - **Event_11ksdj8 → Gateway_13402dj** (`Flow_02hvs5z`)
  - **Gateway_13402dj → Gateway_142qegf** (`Flow_1l1mmjk`)

**Borttagna (2):**
  - **Event_111bwbu → offer** (`Flow_1m7kido`)
  - **event-loan-ready → document-generation** (`Flow_1micci3`)

---

---

## ✅ Oförändrade filer

- `mortgage-se-appeal.bpmn`
- `mortgage-se-collateral-registration.bpmn`

---

*Rapporten genereras automatiskt av generate-diff-report.ts*