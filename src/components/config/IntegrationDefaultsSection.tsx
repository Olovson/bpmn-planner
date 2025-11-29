import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGlobalProjectConfig } from '@/contexts/GlobalProjectConfigContext';
import { VALIDATION } from '@/types/globalProjectConfig';
import { Plug, Building2 } from 'lucide-react';

export const IntegrationDefaultsSection: React.FC = () => {
  const {
    staccIntegrationWorkItems,
    bankIntegrationWorkItems,
    setStaccIntegrationWorkItems,
    setBankIntegrationWorkItems,
  } = useGlobalProjectConfig();

  const handleStaccChange = (field: keyof typeof staccIntegrationWorkItems, value: string) => {
    const weeks = parseFloat(value);
    if (!isNaN(weeks) && weeks >= VALIDATION.MIN_WEEKS && weeks <= VALIDATION.MAX_WEEKS) {
      setStaccIntegrationWorkItems({
        ...staccIntegrationWorkItems,
        [field]: weeks,
      });
    }
  };

  const handleBankChange = (field: keyof typeof bankIntegrationWorkItems, value: string) => {
    const weeks = parseFloat(value);
    if (!isNaN(weeks) && weeks >= VALIDATION.MIN_WEEKS && weeks <= VALIDATION.MAX_WEEKS) {
      setBankIntegrationWorkItems({
        ...bankIntegrationWorkItems,
        [field]: weeks,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default-tider per implementation-typ</CardTitle>
        <CardDescription>
          Konfigurera standard-tider som appliceras på alla integrationer baserat på om de implementeras av Stacc eller Banken.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stacc defaults */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Stacc-implementerade integrationer</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Default-tider som appliceras på alla Stacc-integrationer
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stacc-analysis">Analys</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="stacc-analysis"
                  type="number"
                  step="0.5"
                  min={VALIDATION.MIN_WEEKS}
                  max={VALIDATION.MAX_WEEKS}
                  value={staccIntegrationWorkItems.analysisWeeks}
                  onChange={(e) => handleStaccChange('analysisWeeks', e.target.value)}
                  className="w-24"
                />
                <Label>veckor</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stacc-implementation">Implementering</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="stacc-implementation"
                  type="number"
                  step="0.5"
                  min={VALIDATION.MIN_WEEKS}
                  max={VALIDATION.MAX_WEEKS}
                  value={staccIntegrationWorkItems.implementationWeeks}
                  onChange={(e) => handleStaccChange('implementationWeeks', e.target.value)}
                  className="w-24"
                />
                <Label>veckor</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stacc-testing-validation">Testning & Validering</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="stacc-testing-validation"
                  type="number"
                  step="0.5"
                  min={VALIDATION.MIN_WEEKS}
                  max={VALIDATION.MAX_WEEKS}
                  value={staccIntegrationWorkItems.testingWeeks + staccIntegrationWorkItems.validationWeeks}
                  onChange={(e) => {
                    const total = parseFloat(e.target.value);
                    if (!isNaN(total) && total >= VALIDATION.MIN_WEEKS && total <= VALIDATION.MAX_WEEKS) {
                      setStaccIntegrationWorkItems({
                        ...staccIntegrationWorkItems,
                        testingWeeks: total,
                        validationWeeks: 0,
                      });
                    }
                  }}
                  className="w-24"
                />
                <Label>veckor</Label>
              </div>
            </div>
          </div>
        </div>

        {/* Bank defaults */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Bank-implementerade integrationer</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Default-tider som appliceras på alla bank-implementerade integrationer
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank-analysis">Analys</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="bank-analysis"
                  type="number"
                  step="0.5"
                  min={VALIDATION.MIN_WEEKS}
                  max={VALIDATION.MAX_WEEKS}
                  value={bankIntegrationWorkItems.analysisWeeks}
                  onChange={(e) => handleBankChange('analysisWeeks', e.target.value)}
                  className="w-24"
                />
                <Label>veckor</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-implementation">Implementering</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="bank-implementation"
                  type="number"
                  step="0.5"
                  min={VALIDATION.MIN_WEEKS}
                  max={VALIDATION.MAX_WEEKS}
                  value={bankIntegrationWorkItems.implementationWeeks}
                  onChange={(e) => handleBankChange('implementationWeeks', e.target.value)}
                  className="w-24"
                />
                <Label>veckor</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-testing-validation">Testning & Validering</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="bank-testing-validation"
                  type="number"
                  step="0.5"
                  min={VALIDATION.MIN_WEEKS}
                  max={VALIDATION.MAX_WEEKS}
                  value={bankIntegrationWorkItems.testingWeeks + bankIntegrationWorkItems.validationWeeks}
                  onChange={(e) => {
                    const total = parseFloat(e.target.value);
                    if (!isNaN(total) && total >= VALIDATION.MIN_WEEKS && total <= VALIDATION.MAX_WEEKS) {
                      setBankIntegrationWorkItems({
                        ...bankIntegrationWorkItems,
                        testingWeeks: total,
                        validationWeeks: 0,
                      });
                    }
                  }}
                  className="w-24"
                />
                <Label>veckor</Label>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

