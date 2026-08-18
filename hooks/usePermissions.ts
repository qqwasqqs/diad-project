/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 03 June 2026
  Purpose:
    Base permission hook that reads the current user's effective permissions
    from useFetchMe() and exposes a fast O(1) lookup helper.

    - Builds a Set<string> from user.permissions once on mount.
    - Handles the wildcard "*" permission (super admin — has everything).
    - Exposes hasPermission(permission) for single checks.
*/

"use client";

import { useMemo } from "react";
import { useFetchMe } from "@/hooks/useAuthService";
import { isLocalDesignModeClient } from "@/lib/localDesignMode";

// ---------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------

export interface UsePermissionsReturn {
  /**
   * Returns true if the current user holds the given permission string.
   * Also returns true if the user has the wildcard "*" permission (super admin).
   *
   * @param permission - e.g. "data-refresh:read", "data-refresh-cluster:manage"
   */
  hasPermission: (permission: string) => boolean;

  /** True while /me is still fetching — use to avoid flashing forbidden UI. */
  isLoadingPermissions: boolean;
}

// ---------------------------------------------------------------------
// HOOK
// ---------------------------------------------------------------------

/**
 * usePermissions
 *
 * Reads user.permissions from useFetchMe() and exposes hasPermission().
 * Safe to call in multiple components — useFetchMe() uses React Query so
 * the network request is made only once and the result is cached.
 *
 * Usage:
 *   const { hasPermission, isLoadingPermissions } = usePermissions();
 *   if (hasPermission("data-refresh:read")) { ... }
 */
export function usePermissions(): UsePermissionsReturn {
  const isDesignMode = isLocalDesignModeClient();
  const { data: meData, isFetching } = useFetchMe();

  /*
    Build a Set<string> from the permissions array so every hasPermission()
    call is O(1) instead of O(n). Recomputed only when meData changes.
  */
  const permissionSet = useMemo<Set<string>>(() => {
    const perms: string[] = meData?.user?.permissions ?? [];
    return new Set(perms);
  }, [meData]);

  const hasPermission = (permission: string): boolean => {
    // In local design mode, bypass page-level ACL checks for faster UI iteration.
    if (isDesignMode) return true;

    // Wildcard — super admin has access to everything
    if (permissionSet.has("*")) return true;
    return permissionSet.has(permission);
  };

  return {
    hasPermission,
    isLoadingPermissions: isDesignMode ? false : isFetching,
  };
}