/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script defines the global ThemeProvider used by the
    Teva Data Integrity Automation Dashboard.

    - It integrates Fluent UI v9 theming with Next.js 16.
    - It ensures proper Server-Side Rendering (SSR) of styles.
    - It injects Fluent UI styles during server rendering to prevent FOUC.
    - It wraps the application with required Fluent UI context providers.
    - It applies the Teva light theme consistently across all components.
*/

//---------------------- Client Component Directive ----------------------//

// Marks this component as a client component because it uses React hooks
// and Next.js client-side rendering utilities
"use client";

//---------------------- Imports and Types ----------------------//

// Importing the custom Teva Fluent UI light theme
import { tevaLightTheme } from "@/constants/theme";

// Importing Fluent UI providers and SSR utilities
import {
  SSRProvider,               // Ensures consistent ID generation during SSR
  RendererProvider,          // Provides the Fluent UI renderer context
  createDOMRenderer,         // Creates a DOM-based style renderer
  renderToStyleElements,     // Converts rendered styles to <style> elements
  FluentProvider,            // Applies Fluent UI theme and context
} from "@fluentui/react-components";

// Importing Next.js hook to inject HTML during server rendering
import { useServerInsertedHTML } from "next/navigation";

// Importing React hooks for state and mutable references
import { useRef, useState } from "react";

//---------------------- ThemeProvider Component ----------------------//

/**
 * ThemeProvider Component
 * This component provides Fluent UI theming and SSR support for the application.
 *
 * Why this component is needed:
 * - Fluent UI requires a renderer to generate and inject styles.
 * - Next.js Server-Side Rendering(SSR) requires explicit insertion of generated styles to avoid
 *   hydration mismatches and flash of unstyled content (FOUC).
 * - This component ensures styles are rendered once and reused safely.
 *
 * @param children - React node elements that represent the application UI.
 * @returns JSX.Element - The wrapped application with Fluent UI and SSR support.
 */
export default function ThemeProvider({
  children, // Child components that will consume the Fluent UI theme
}: {
  children: React.ReactNode;
}) {
  // Creating and storing a single DOM renderer instance
  // useState ensures the renderer is created only once per request
  const [domRenderer] = useState(() => createDOMRenderer());

  // Ref to track whether styles have already been injected into the HTML
  // Prevents duplicate style injection during re-renders
  const hasInjectedStylesRef = useRef(false);

  // Hook to insert Fluent UI styles during server-side rendering
  useServerInsertedHTML(() => {
    // Prevent injecting styles more than once
    if (hasInjectedStylesRef.current) {
      return null;
    }

    // Mark styles as injected
    hasInjectedStylesRef.current = true;

    // Convert rendered styles into <style> elements
    return <>{renderToStyleElements(domRenderer)}</>;
  });

  return (
    // Provides the Fluent UI renderer to all child components
    <RendererProvider renderer={domRenderer}>
      {/* Ensures consistent ID generation between server and client */}
      <SSRProvider>
        {/* Applies the Teva Fluent UI light theme */}
        <FluentProvider theme={tevaLightTheme}>
          {children}
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
