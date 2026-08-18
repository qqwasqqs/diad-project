/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script defines the global ToastProvider for the
    Teva Data Integrity Automation Dashboard.

    - It configures a centralized Fluent UI toaster instance.
    - It enables global toast notifications (success, error, warning, info).
    - It ensures a single toaster is used across the entire application.
    - It allows toast messages to be triggered from anywhere in the app.
*/

//---------------------- Imports ----------------------//

/*
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides the Toaster component for displaying toast notifications.
*/
import { Toaster } from "@fluentui/react-components";
// Importing the Fluent UI Toaster component used to display toast notifications

/*  
  react
    - What it is: The core React library for building user interfaces.
    - Why used: Provides hooks and utilities for component development.
*/
import { useId } from "react"; // Importing React hook for generating unique, stable IDs

//---------------------- Constants ----------------------//

/**
 * GLOBAL_TOASTER_ID
 * This constant defines a unique identifier for the global toaster.
 *
 * Why this is needed:
 * - Fluent UI uses toaster IDs to route toast messages correctly.
 * - Using a constant ensures the same toaster is referenced everywhere.
 * - Prevents accidental creation of multiple toaster instances.
 */
export const GLOBAL_TOASTER_ID = "teva-global-toaster";

//---------------------- ToastProvider Component ----------------------//

/**
 * ToastProvider Component
 * This component renders a global Fluent UI toaster instance.
 *
 * Why this component is needed:
 * - Provides a single, centralized toast notification system.
 * - Allows any component in the application to dispatch toast messages.
 * - Ensures consistent placement and behavior of notifications.
 *
 * @returns JSX.Element - The Fluent UI Toaster component bound to a global toaster ID.
 */
export const ToastProvider = () => {
  // Generating a unique React ID (kept for React tree consistency and future extensibility)
  const generatedReactId = useId();

  return (
    // Rendering the Fluent UI Toaster with a fixed global toaster ID
    // This toaster listens for all toast events dispatched with this ID
    <Toaster toasterId={GLOBAL_TOASTER_ID} />
  );
};
