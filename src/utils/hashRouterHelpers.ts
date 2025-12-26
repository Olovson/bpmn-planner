import { Location } from 'react-router-dom';

/**
 * Helper function to get the actual route from HashRouter.
 * In HashRouter, location.pathname is always '/', so we need to use location.hash instead.
 * 
 * @param location - The location object from useLocation()
 * @returns The actual route path (e.g., '/files', '/node-matrix') without the '#' prefix
 */
export function getHashRoute(location: Location): string {
  if (location.hash) {
    // Remove '#' and any query params
    const hash = location.hash.replace(/^#/, '');
    const path = hash.split('?')[0];
    return path || '/';
  }
  // Fallback to pathname if no hash (shouldn't happen in HashRouter, but just in case)
  return location.pathname;
}

/**
 * Check if the current route matches a given path in HashRouter.
 * 
 * @param location - The location object from useLocation()
 * @param path - The path to check (e.g., '/files', '/node-matrix')
 * @returns True if the route matches the path
 */
export function isHashRoute(location: Location, path: string): boolean {
  const currentRoute = getHashRoute(location);
  return currentRoute === path || currentRoute.startsWith(path + '/');
}

