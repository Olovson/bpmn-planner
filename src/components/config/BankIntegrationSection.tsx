import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGlobalProjectConfig } from '@/contexts/GlobalProjectConfigContext';
import { Building2 } from 'lucide-react';
import { useMemo } from 'react';

export const BankIntegrationSection = () => {
  const { bankIntegrationWorkItems, setBankIntegrationWorkItems } = useGlobalProjectConfig();

  const totalWeeks = useMemo(() => {
    return (
      bankIntegrationWorkItems.analysisWeeks +
      bankIntegrationWorkItems.implementationWeeks +
      bankIntegrationWorkItems.testingWeeks +
      bankIntegrationWorkItems.validationWeeks
    );
  }, [bankIntegrationWorkItems]);

  const handleChange = (field: keyof typeof bankIntegrationWorkItems, value: string) => {
    const weeks = parseFloat(value);
    if (!isNaN(weeks) && weeks >= 0.5 && weeks <= 52) {
      setBankIntegrationWorkItems({
        ...bankIntegrationWorkItems,
        [field]: weeks,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <CardTitle>Bank-implementerade integrationer</CardTitle>
        </div>
        <CardDescription>
          Extra tid för integrationer som banken implementerar (avcheckade på integrationssidan)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="analysis-weeks">Analys</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="analysis-weeks"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="52"
                  value={bankIntegrationWorkItems.analysisWeeks}
                  onChange={(e) => handleChange('analysisWeeks', e.target.value)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">veckor</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="implementation-weeks">Implementering</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="implementation-weeks"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="52"
                  value={bankIntegrationWorkItems.implementationWeeks}
                  onChange={(e) => handleChange('implementationWeeks', e.target.value)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">veckor</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testing-weeks">Testing</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="testing-weeks"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="52"
                  value={bankIntegrationWorkItems.testingWeeks}
                  onChange={(e) => handleChange('testingWeeks', e.target.value)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">veckor</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validation-weeks">Validering</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="validation-weeks"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="52"
                  value={bankIntegrationWorkItems.validationWeeks}
                  onChange={(e) => handleChange('validationWeeks', e.target.value)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">veckor</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm font-medium">
              💡 Totalt: <span className="text-primary">{totalWeeks} veckor</span> extra per integration
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

