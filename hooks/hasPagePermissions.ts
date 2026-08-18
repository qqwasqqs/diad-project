/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 03 June 2026
  Purpose:
    Convenience hook built on top of usePermissions().
    Given a module slug (e.g. "data-refresh"), derives and checks the
    standard read/write permission strings for that page.

    Permission naming convention: "{module-slug}:read" / "{module-slug}:write"
    Example: usePagePermissions("data-refresh")
              → checks "data-refresh:read" and "data-refresh:write"
*/

"use client";

import { usePermissions } from "./usePermissions";

// ---------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------

export interface UsePagePermissionsReturn {
  /** True if the user can view this page. Redirect to ForbiddenAccessDialog if false. */
  canRead: boolean;

  /** True if the user can perform write/mutate actions on this page. */
  canWrite: boolean;

  canManage: boolean;
  /**
   * Checks any arbitrary permission string — useful for cluster buttons
   * and other feature-level permissions that don't follow the read/write pattern.
   * e.g. hasPermission("data-refresh-cluster:manage")
   */
  hasPermission: (permission: string) => boolean;

  /** True while /me is still loading — use to avoid flashing forbidden UI prematurely. */
  isLoadingPermissions: boolean;
}

// ---------------------------------------------------------------------
// HOOK
// ---------------------------------------------------------------------

/**
 * usePagePermissions
 *
 * Derives canRead and canWrite for a given module slug, plus exposes
 * hasPermission() for feature-level checks (e.g. cluster buttons).
 *
 * @param moduleSlug - The slug of the page, matching the permission naming
 *                     convention. E.g. "data-refresh", "roles-management".
 *                     Do NOT include leading slash.
 *
 * Usage:
 *   const { canRead, canWrite, hasPermission, isLoadingPermissions } =
 *     usePagePermissions("data-refresh");
 *
 *   // Page-level guard
 *   if (!isLoadingPermissions && !canRead) return <ForbiddenAccessDialog ... />;
 *
 *   // Feature-level guard (cluster button)
 *   {hasPermission("data-refresh-cluster:manage") && <ClusterControl />}
 */
export function usePagePermissions(moduleSlug: string): UsePagePermissionsReturn {
  const { hasPermission, isLoadingPermissions } = usePermissions();

  return {
    canRead:              hasPermission(`${moduleSlug}:read`),
    canWrite:             hasPermission(`${moduleSlug}:write`),
    canManage:            hasPermission(`${moduleSlug}-cluster:manage`),
    hasPermission,        // pass-through for feature-level checks
    isLoadingPermissions,
  };
}