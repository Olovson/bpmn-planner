import type { NavigateFunction } from 'react-router-dom';
import type { ViewKey } from '@/components/AppHeaderWithTabs';

/**
 * Central navigation routes mapping
 * All navigation should use these routes to ensure consistency
 */
export const NAVIGATION_ROUTES: Record<ViewKey, string> = {
  'diagram': '/',
  'tree': '/process-explorer',
  'listvy': '/node-matrix',
  'tests': '/test-report',
  'test-coverage': '/test-coverage',
  'e2e-quality-validation': '/e2e-quality-validation',
  'timeline': '/timeline',
  'configuration': '/configuration',
  'files': '/files',
  'styleguide': '/styleguide',
  'bpmn-folder-diff': '/bpmn-folder-diff',
};

/**
 * Navigate to a specific view
 * This ensures all navigation uses the same routes consistently
 */
export function navigateToView(navigate: NavigateFunction, view: ViewKey): void {
  const route = NAVIGATION_ROUTES[view];
  if (route) {
    navigate(route);
  } else {
    console.warn(`[navigation] Unknown view: ${view}, navigating to home`);
    navigate('/');
  }
}

/**
 * Get ViewKey from a route path
 * Used to determine currentView based on the actual route
 */
export function getViewFromRoute(route: string): ViewKey {
  // Remove leading slash and normalize
  const normalizedRoute = route.replace(/^\/+/, '') || '/';
  
  // Check each route mapping
  for (const [view, routePath] of Object.entries(NAVIGATION_ROUTES)) {
    const normalizedRoutePath = routePath.replace(/^\/+/, '') || '/';
    if (normalizedRoute === normalizedRoutePath || normalizedRoute.startsWith(normalizedRoutePath + '/')) {
      return view as ViewKey;
    }
  }
  
  // Default to diagram if no match
  return 'diagram';
}

