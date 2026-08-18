/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script defines the Login page for the Teva Data Integrity Automation Dashboard.
    - It renders a simple authentication entry point for users.
    - It provides a button-based navigation to redirect users to the Executive Dashboard.
    - It uses Next.js client-side navigation for faster routing.
    - The page is marked as a client component because it uses hooks and browser-based navigation.
*/

//---------------------- Client Component Directive ----------------------//
// Marks this page as a client-side component because it uses React hooks
// and Next.js client-side navigation (`useRouter`)
"use client";

//---------------------- Imports ----------------------//

// Importing Button component from Fluent UI for consistent UI styling
import { Button } from "@fluentui/react-components";

// Importing Next.js router hook for client-side navigation
import { useRouter } from "next/navigation";

// Importing route constant to avoid hard-coded paths
import { EXECUTIVE_DASHBOARD_ROUTE } from "@/constants/routes";

//---------------------- Login Page Component ----------------------//

/**
 * LoginPage Component
 * This component renders the login page UI for the application.
 * 
 * Why this component is needed:
 * - Acts as an entry point for authenticated users.
 * - Provides navigation to the Executive Dashboard after login.
 * - Uses client-side routing to improve performance and user experience.
 *
 * @returns JSX.Element - Renders the login page with a centered navigation button.
 */
export default function Login() {
  // Initializing Next.js router for programmatic navigation
  const navigationRouter = useRouter();

  return (
    // Outer container to center the login content vertically and horizontally
    <div className="flex h-screen items-center justify-center bg-neutral-background-3">
      
      {/* 
        Button component used to navigate users to the Executive Dashboard.
        On click, it triggers client-side routing using Next.js router.
      */}
      <Button
        onClick={() => navigationRouter.push(EXECUTIVE_DASHBOARD_ROUTE)}
      >
        Go to Home
      </Button>

    </div>
  );
}
