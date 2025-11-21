import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

/**
 * Central navigation helper to keep BPMN viewer state in the URL.
 * Encodes current BPMN file and selected element in query params so back/refresh/deep links are stable.
 */
export function useAppNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentFile = searchParams.get('file') || null;
  const selectedElement = searchParams.get('el') || null;

  const setFile = (file: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (file) next.set('file', file);
    else next.delete('file');
    setSearchParams(next, { replace: false });
  };

  const setElement = (element: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (element) next.set('el', element);
    else next.delete('el');
    setSearchParams(next, { replace: false });
  };

  const goToNodeMatrix = () => navigate('/node-matrix');
  const goToFiles = () => navigate('/files');
  const goToDocViewer = (docId: string) => navigate(`/doc-viewer/${encodeURIComponent(docId)}`);

  return {
    path: location.pathname,
    searchParams,
    currentFile,
    selectedElement,
    setFile,
    setElement,
    goToNodeMatrix,
    goToFiles,
    goToDocViewer,
    navigate,
  };
}

