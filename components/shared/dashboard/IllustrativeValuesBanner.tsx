import type { ReactNode } from "react";
import { Text } from "@fluentui/react-components";
import { Warning24Regular } from "@fluentui/react-icons";

/*
  Full-width notice stating that the values on the page are illustrative.

  It describes a standing property of the page's data rather than an event, so it
  is intentionally not dismissible and is not announced as an alert. A page whose
  values are validated omits the banner instead of softening its wording.
*/

const DEFAULT_MESSAGE =
  "ILLUSTRATIVE VALUES — TARGETS AND THRESHOLDS PENDING VALIDATION";

export interface IllustrativeValuesBannerProps {
  message?: string;
  icon?: ReactNode;
  className?: string;
}

export default function IllustrativeValuesBanner({
  message = DEFAULT_MESSAGE,
  icon,
  className = "",
}: IllustrativeValuesBannerProps) {
  return (
    <div
      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 ${className}`.trim()}
      style={{ backgroundColor: "var(--color-warning-bg)" }}
    >
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center"
        style={{ color: "var(--color-warning-content)" }}
      >
        {icon ?? <Warning24Regular />}
      </span>

      <Text
        size={300}
        weight="semibold"
        className="uppercase tracking-[0.04em]"
        style={{ color: "var(--color-warning-content)" }}
      >
        {message}
      </Text>
    </div>
  );
}
