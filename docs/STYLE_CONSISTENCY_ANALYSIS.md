# Analys: Stilens enhetlighet i BPMN Planner

## Sammanfattning

Appen använder shadcn/ui och Tailwind CSS konsekvent, men det finns **inkonsistenser** i layout, spacing och typografi mellan sidor.

## ✅ Vad som är enhetligt

1. **Komponentbibliotek**: Alla sidor använder shadcn/ui komponenter (Card, Button, Table, Input, etc.)
2. **Färgsystem**: Alla sidor använder CSS-variabler från `index.css` (primary, secondary, muted, etc.)
3. **Sidebar-kompensering**: Alla sidor använder `ml-16` för att kompensera för vänstermenyn
4. **AppHeaderWithTabs**: Alla sidor använder samma header-komponent
5. **Background**: Alla sidor använder `bg-background`

## ⚠️ Inkonsistenser

### 1. Max-width varierar

- **ConfigurationPage**: `max-w-4xl`
- **IntegrationsPage**: `max-w-7xl`
- **StyleGuidePage**: `max-w-6xl`
- **TimelinePage**: Ingen max-width (full width)

**Rekommendation**: Standardisera till `max-w-6xl` för de flesta sidor, eller `max-w-7xl` för tabell-tunga sidor.

### 2. Rubrikstorlekar varierar

- **ConfigurationPage**: `text-2xl font-bold`
- **StyleGuidePage**: `text-4xl font-bold`
- **IntegrationsPage**: `text-2xl font-bold`

**Rekommendation**: Använd `text-2xl font-bold` för huvudsidor, `text-4xl` endast för landing pages.

### 3. Header-struktur varierar

**ConfigurationPage**:
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold">Projektkonfiguration</h1>
    <p className="text-sm text-muted-foreground mt-1">Beskrivning</p>
  </div>
  <Button>Åtgärd</Button>
</div>
```

**IntegrationsPage**:
```tsx
<div className="mb-6">
  <h1 className="text-2xl font-bold">Integrationer</h1>
  <p className="text-sm text-muted-foreground mt-1">Beskrivning</p>
</div>
```

**StyleGuidePage**:
```tsx
<div>
  <h1 className="text-4xl font-bold mb-2">Styleguide</h1>
  <p className="text-muted-foreground">Beskrivning</p>
</div>
```

**Rekommendation**: Standardisera till ConfigurationPage-strukturen med flex och optional action button.

### 4. Spacing varierar

- **ConfigurationPage**: `space-y-6`
- **StyleGuidePage**: `space-y-8`
- **IntegrationsPage**: `mb-6` för header, sedan ingen space-y

**Rekommendation**: Använd `space-y-6` konsekvent för card-containers.

### 5. Padding i main varierar

- De flesta: `ml-16 p-6`
- **Index**: `flex-1 min-w-0` (ingen padding, annan layout)

**Rekommendation**: Behåll `ml-16 p-6` för alla sidor utom Index (som har speciallayout).

## 📋 Föreslagen standard

### Page Layout Template

```tsx
<div className="min-h-screen bg-background">
  <AppHeaderWithTabs
    userEmail={user?.email || null}
    currentView="page-name"
    onViewChange={handleViewChange}
    onOpenVersions={() => {}}
    onSignOut={signOut}
  />
  <main className="ml-16 p-6">
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sidtitel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Beskrivning av sidan
          </p>
        </div>
        {/* Optional action button */}
        <Button variant="outline">Åtgärd</Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Sektion</CardTitle>
          <CardDescription>Beskrivning</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Innehåll */}
        </CardContent>
      </Card>
    </div>
  </main>
</div>
```

### Typografi-standard

- **Huvudrubrik (H1)**: `text-2xl font-bold`
- **Sektionsrubrik (H2)**: `text-lg font-semibold` (i CardTitle)
- **Beskrivningstext**: `text-sm text-muted-foreground`
- **Body text**: `text-base` (default)

### Spacing-standard

- **Mellan sektioner**: `space-y-6`
- **Inuti cards**: `space-y-4` eller `space-y-6` beroende på innehåll
- **Mellan header och content**: Inbyggt i `space-y-6` på container

### Max-width-standard

- **Standard-sidor**: `max-w-6xl`
- **Tabell-tunga sidor**: `max-w-7xl`
- **Full-width sidor** (t.ex. Timeline): Ingen max-width

## 🎯 Prioriterade åtgärder

1. **Hög prioritet**: Standardisera max-width och header-struktur
2. **Medel prioritet**: Standardisera rubrikstorlekar
3. **Låg prioritet**: Standardisera spacing (mindre märkbar skillnad)

## Exempel på sidor som behöver uppdateras

1. **IntegrationsPage**: Lägg till flex-header med optional button
2. **StyleGuidePage**: Ändra från `text-4xl` till `text-2xl` och standardisera header
3. **TimelinePage**: Behåll full-width men standardisera header om möjligt

