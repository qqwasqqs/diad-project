/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script defines a reusable custom React hook for displaying
    global toast notifications in the Teva Data Integrity Automation Dashboard.

    - It provides a centralized API for triggering toast messages.
    - It integrates with the global Fluent UI toaster instance.
    - It supports different toast intents such as success, error, warning, and info.
    - It allows configuration of toast timeout and screen position.
    - It ensures consistent toast behavior across the application.
*/

//---------------------- Client Component Directive ----------------------//
// Inform Next.js that this component should be rendered on the client
// (in the user's browser) because it uses React hooks and interactive UI.
"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @/providers/ToastProvider
    - What it is: A local module defining the global toaster instance.
    - Why used: Provides the global toaster ID to ensure all toasts are routed correctly.
*/
import { GLOBAL_TOASTER_ID } from "@/providers/ToastProvider"; // Importing the global toaster ID to ensure all toasts are routed correctly

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides toast notification utilities and components for consistent UI.
*/
import {
  useToastController, // Hook to dispatch toast notifications
  Toast,              // Container component for a toast message
  ToastTitle,         // Component to render the toast title/message
  ToastPosition,      // Type defining valid toast positions
} from "@fluentui/react-components"; // Importing Fluent UI toast utilities and components

//---------------------- Type Definitions ----------------------//

/**
 * ToastIntent
 * Defines the supported intent types for toast notifications.
 *
 * Why this is needed:
 * - Restricts toast intents to valid Fluent UI options.
 * - Improves type safety and developer experience.
 */
type ToastIntent = "success" | "error" | "warning" | "info";

//---------------------- Custom Hook ----------------------//

/**
 * useGlobalToast Hook
 * This custom hook provides a simple API to trigger global toast notifications.
 *
 * Why this hook is needed:
 * - Avoids duplicating toast logic across components.
 * - Ensures all toasts use the same global toaster instance.
 * - Standardizes toast appearance, behavior, and configuration.
 *
 * @returns An object containing the `showToast` function.
 */
export const useGlobalToast = () => {
  // Initializing the toast controller using the global toaster ID
  // This ensures all dispatched toasts appear in the same toaster
  const { dispatchToast } = useToastController(GLOBAL_TOASTER_ID);

  /**
   * showToast Function
   * Dispatches a toast notification with configurable options.
   *
   * @param message - The text message to be displayed in the toast.
   * @param intent - The visual intent of the toast (success, error, warning, info).
   * @param timeout - Duration (in milliseconds) before the toast auto-dismisses.
   * @param position - Screen position where the toast should appear.
   */
  const showToast = (
    message: string,
    intent: ToastIntent = "success",           // Default intent is success
    timeout: number = 3000,                    // Default auto-dismiss time (3 seconds)
    position: ToastPosition = "bottom-end"     // Default toast position
  ) => {
    // Dispatching the toast using Fluent UI's toast controller
    dispatchToast(
      <Toast>
        {/* Rendering the toast message */}
        <ToastTitle>{message}</ToastTitle>
      </Toast>,
      {
        intent,   // Visual intent of the toast
        timeout,  // Auto-dismiss duration
        position, // Screen position of the toast
      }
    );
  };

  // Exposing the toast trigger function to consumers of the hook
  return { showToast };
};
