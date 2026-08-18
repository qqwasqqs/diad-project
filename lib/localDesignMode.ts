/*
  Local design-mode helpers.
  This module centralizes how the app decides whether local mock mode is active.
*/

function isEnabledFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function normalizeEnvironment(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

// Shared toggle based on public env var so client-side code can read it.
export function isLocalDesignModeEnabled(): boolean {
  return isEnabledFlag(process.env.NEXT_PUBLIC_LOCAL_DESIGN_MODE);
}

// Server-side safety check: design mode is only valid in ENVIRONMENT=local.
export function isLocalDesignModeServer(): boolean {
  return (
    isLocalDesignModeEnabled() &&
    normalizeEnvironment(process.env.ENVIRONMENT) === "local"
  );
}

// Client-side check: optionally constrained by NEXT_PUBLIC_ENVIRONMENT when provided.
export function isLocalDesignModeClient(): boolean {
  if (!isLocalDesignModeEnabled()) {
    return false;
  }

  const publicEnvironment = normalizeEnvironment(process.env.NEXT_PUBLIC_ENVIRONMENT);
  return publicEnvironment ? publicEnvironment === "local" : true;
}
