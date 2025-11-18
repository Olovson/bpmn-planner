import { createContext, useContext, useState, ReactNode } from 'react';

interface BpmnSelectionContextType {
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
}

const BpmnSelectionContext = createContext<BpmnSelectionContextType | undefined>(undefined);

export const BpmnSelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  return (
    <BpmnSelectionContext.Provider value={{ selectedElementId, setSelectedElementId }}>
      {children}
    </BpmnSelectionContext.Provider>
  );
};

export const useBpmnSelection = () => {
  const context = useContext(BpmnSelectionContext);
  if (!context) {
    throw new Error('useBpmnSelection must be used within BpmnSelectionProvider');
  }
  return context;
};
