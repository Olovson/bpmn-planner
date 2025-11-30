import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';

const StyleGuidePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleViewChange = (view: string) => {
    if (view === 'timeline') {
      navigate('/timeline');
    } else if (view === 'listvy') {
      navigate('/node-matrix');
    } else if (view === 'tree') {
      navigate('/process-explorer');
    } else if (view === 'tests') {
      navigate('/test-report');
    } else if (view === 'configuration') {
      navigate('/configuration');
    } else if (view === 'files') {
      navigate('/files');
    } else if (view === 'styleguide') {
      navigate('/styleguide');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeaderWithTabs
        userEmail={user?.email || null}
        currentView="styleguide"
        onViewChange={handleViewChange}
        onOpenVersions={() => {}}
        onSignOut={signOut}
      />
      <main className="ml-16 p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Styleguide</h1>
            <p className="text-muted-foreground">
              Design system och komponenter för BPMN Planner
            </p>
          </div>

          {/* Design Tokens */}
          <Card>
            <CardHeader>
              <CardTitle>Design Tokens</CardTitle>
              <CardDescription>
                Färger, typografi och spacing som används i appen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Färger</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="h-20 rounded-md bg-primary"></div>
                    <p className="text-sm font-medium">Primary</p>
                    <p className="text-xs text-muted-foreground">hsl(214, 95%, 45%)</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md bg-secondary"></div>
                    <p className="text-sm font-medium">Secondary</p>
                    <p className="text-xs text-muted-foreground">hsl(210, 20%, 92%)</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md bg-accent"></div>
                    <p className="text-sm font-medium">Accent</p>
                    <p className="text-xs text-muted-foreground">hsl(199, 89%, 48%)</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md bg-destructive"></div>
                    <p className="text-sm font-medium">Destructive</p>
                    <p className="text-xs text-muted-foreground">hsl(0, 84.2%, 60.2%)</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md bg-muted"></div>
                    <p className="text-sm font-medium">Muted</p>
                    <p className="text-xs text-muted-foreground">hsl(210, 20%, 94%)</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md bg-card border"></div>
                    <p className="text-sm font-medium">Card</p>
                    <p className="text-xs text-muted-foreground">hsl(0, 0%, 100%)</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md bg-background border"></div>
                    <p className="text-sm font-medium">Background</p>
                    <p className="text-xs text-muted-foreground">hsl(210, 20%, 98%)</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-md border-2 border-border"></div>
                    <p className="text-sm font-medium">Border</p>
                    <p className="text-xs text-muted-foreground">hsl(214.3, 30%, 80%)</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Border Radius</h3>
                <div className="flex gap-4 items-center">
                  <div className="space-y-2">
                    <div className="w-16 h-16 rounded-md bg-primary"></div>
                    <p className="text-sm">md (0.5rem)</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-16 h-16 rounded-lg bg-primary"></div>
                    <p className="text-sm">lg (var(--radius))</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-16 h-16 rounded-full bg-primary"></div>
                    <p className="text-sm">full</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle>Typografi</CardTitle>
              <CardDescription>
                Textstorlekar och vikter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">Heading 1 (4xl, bold)</h1>
                <h2 className="text-3xl font-semibold mb-2">Heading 2 (3xl, semibold)</h2>
                <h3 className="text-2xl font-semibold mb-2">Heading 3 (2xl, semibold)</h3>
                <h4 className="text-xl font-semibold mb-2">Heading 4 (xl, semibold)</h4>
                <p className="text-base mb-2">Body text (base, normal)</p>
                <p className="text-sm text-muted-foreground mb-2">Small text (sm, muted)</p>
                <p className="text-xs text-muted-foreground">Extra small text (xs, muted)</p>
              </div>
            </CardContent>
          </Card>

          {/* Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Knappar</CardTitle>
              <CardDescription>
                Olika varianter och storlekar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Varainter</h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Storlekar</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon">🔍</Button>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">States</h3>
                <div className="flex flex-wrap gap-3">
                  <Button disabled>Disabled</Button>
                  <Button>Normal</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Elements */}
          <Card>
            <CardHeader>
              <CardTitle>Formulärelement</CardTitle>
              <CardDescription>
                Input, Select, Checkbox
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Input</h3>
                <div className="space-y-3 max-w-md">
                  <Input placeholder="Placeholder text" />
                  <Input type="number" placeholder="Number input" />
                  <Input disabled placeholder="Disabled input" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Select</h3>
                <div className="max-w-md">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj ett alternativ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Alternativ 1</SelectItem>
                      <SelectItem value="option2">Alternativ 2</SelectItem>
                      <SelectItem value="option3">Alternativ 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Checkbox</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="check1" />
                    <label htmlFor="check1" className="text-sm">Unchecked</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="check2" checked />
                    <label htmlFor="check2" className="text-sm">Checked</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="check3" disabled />
                    <label htmlFor="check3" className="text-sm">Disabled</label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
              <CardDescription>
                Status och etiketter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Kort</CardTitle>
              <CardDescription>
                Container-komponenter för innehåll
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Detta är ett exempel på ett kort med CardHeader, CardTitle, CardDescription och CardContent.
              </p>
            </CardContent>
          </Card>

          {/* Tables */}
          <Card>
            <CardHeader>
              <CardTitle>Tabeller</CardTitle>
              <CardDescription>
                Strukturerad data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kolumn 1</TableHead>
                    <TableHead>Kolumn 2</TableHead>
                    <TableHead>Kolumn 3</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Rad 1, Cell 1</TableCell>
                    <TableCell>Rad 1, Cell 2</TableCell>
                    <TableCell>Rad 1, Cell 3</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Rad 2, Cell 1</TableCell>
                    <TableCell>Rad 2, Cell 2</TableCell>
                    <TableCell>Rad 2, Cell 3</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Spacing */}
          <Card>
            <CardHeader>
              <CardTitle>Spacing</CardTitle>
              <CardDescription>
                Tailwind spacing scale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-1 h-4 bg-primary"></div>
                  <span className="text-sm">1 (0.25rem / 4px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-4 bg-primary"></div>
                  <span className="text-sm">2 (0.5rem / 8px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 bg-primary"></div>
                  <span className="text-sm">4 (1rem / 16px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-4 bg-primary"></div>
                  <span className="text-sm">6 (1.5rem / 24px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-4 bg-primary"></div>
                  <span className="text-sm">8 (2rem / 32px)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Design System Info */}
          <Card>
            <CardHeader>
              <CardTitle>Design System</CardTitle>
              <CardDescription>
                Teknisk information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Komponentbibliotek</h3>
                <p className="text-sm text-muted-foreground">
                  shadcn/ui med Tailwind CSS
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Färgsystem</h3>
                <p className="text-sm text-muted-foreground">
                  HSL-baserat med CSS-variabler för enkel tematiserbarhet
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Responsiv design</h3>
                <p className="text-sm text-muted-foreground">
                  Mobile-first approach med Tailwind breakpoints
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StyleGuidePage;

