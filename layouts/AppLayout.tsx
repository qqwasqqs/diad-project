/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script defines the `AppLayout` component which serves as a wrapper for the application layout.
    - It provides global functionality for theme management, toasts (notifications), and query management.
    - It uses `ThemeProvider` to manage and apply the theme across the entire application.
    - It integrates the `ToastProvider` for handling global notifications (toast messages).
    - It uses `QueryClientProvider` to provide a React Query client for API data fetching and caching.
    - The layout receives and renders its child components (pages/content) dynamically inside the application.

*/

//---------------------- Client-side Directive -------------------//
// This component should be rendered on the client-side only, as it uses client-side hooks, context, and other React features.
"use client"; // Tells Next.js that this file should be treated as a client component

//---------------------- Imports and Providers ----------------------//

// Importing the required providers and components for global functionality
import ThemeProvider from "@/providers/ThemeProvider"; // Theme provider to manage global theme (light/dark)
import { ToastProvider } from "@/providers/ToastProvider"; // Toast provider to manage global toast notifications
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // React Query providers for handling API requests and caching

//---------------------- Initialization ----------------------------//

// Creating a new instance of the QueryClient, which will manage the cache and fetching logic for React Query
const queryClient = new QueryClient();

//---------------------- Type Definition --------------------------//

// Interface defining the expected property types for the `AppLayout` component
interface AppLayoutProps {
  children: React.ReactNode; // This property represents the child elements or page content that will be rendered inside the layout
}

//---------------------- AppLayout Component ----------------------//

/**
 * AppLayout Component
 * This component serves as the main layout wrapper for the entire application.
 * It integrates multiple providers for global functionality and applies them across all child components.
 * The `AppLayout` ensures that the theme, toasts, and query management are consistent throughout the app.
 *
 * @param children - React node elements that will be rendered inside this layout component. These are the child components passed dynamically when the layout is used.
 * @returns JSX.Element - The JSX markup for rendering the layout, including wrapped components (providers) and children content.
 */
export default function AppLayout({
  children, // The content of the current page passed as `children` prop
}: Readonly<AppLayoutProps>) {
  return (
    // Wrapping the children with global providers for theme, toasts, and query management
    <QueryClientProvider client={queryClient}> {/* React Query provider that allows data fetching and caching */}
      <ThemeProvider> {/* ThemeProvider allows global theme management across the app */}
        {children} {/* Render the children content passed to this layout */}
        <ToastProvider /> {/* Global Toast notifications (e.g., success, error messages) */}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
