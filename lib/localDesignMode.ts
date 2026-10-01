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

export type DashboardRuntimeEnvironment = "local" | "dev" | "prod";

export class UnsupportedDashboardEnvironmentError extends Error {
  constructor(value: string) {
    super(
      `Unsupported ENVIRONMENT value "${value}". Expected local, dev, prod, or an empty value for local.`,
    );
    this.name = "UnsupportedDashboardEnvironmentError";
  }
}

/*
  Dashboard endpoint source selection is independent from the UI design-mode
  flag. An unset value is local; deployed environments always use Splunk.
*/
export function getDashboardRuntimeEnvironment(): DashboardRuntimeEnvironment {
  const environment = normalizeEnvironment(process.env.ENVIRONMENT);

  if (!environment || environment === "local") {
    return "local";
  }

  if (environment === "dev" || environment === "prod") {
    return environment;
  }

  throw new UnsupportedDashboardEnvironmentError(environment);
}

// Shared toggle based on public env var so client-side code can read it.
export function isLocalDesignModeEnabled(): boolean {
  return isEnabledFlag(process.env.NEXT_PUBLIC_LOCAL_DESIGN_MODE);
}

// Server-side safety check: design mode is only valid in ENVIRONMENT=local.
export function isLocalDesignModeServer(): boolean {
  return isLocalDesignModeEnabled() && getDashboardRuntimeEnvironment() === "local";
}

// Client-side check: optionally constrained by NEXT_PUBLIC_ENVIRONMENT when provided.
export function isLocalDesignModeClient(): boolean {
  if (!isLocalDesignModeEnabled()) {
    return false;
  }

  const publicEnvironment = normalizeEnvironment(process.env.NEXT_PUBLIC_ENVIRONMENT);
  return publicEnvironment ? publicEnvironment === "local" : true;
}
