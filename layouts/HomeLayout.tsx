/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script defines the HomeLayout component for the
    Teva Data Integrity Automation Dashboard.

    - It provides the main structural layout for all `/home` routes.
    - It renders the global Header and Sidenav components.
    - It synchronizes authenticated user data with the global Zustand store.
    - It manages the open/close state of the Sidenav with persistence.
    - It ensures a responsive, scroll-safe dashboard layout.
*/

//---------------------- Client-side Directive -------------------//
// This component should be rendered on the client-side only, as it uses client-side hooks, and other React features.
"use client"; // Tells Next.js that this file should be treated as a client component

//---------------------- Imports and Types -------------------------//

/*
  @/components/layout/Header
    - What it is: Local Header component that renders the top navigation bar.
    - Why used: Provides consistent header UI and exposes props to toggle the sidenav.
*/
import { Header } from "@/components/layout/Header";

/*
  @/components/layout/Sidenav
    - What it is: Local Side Navigation component containing app navigation items.
    - Why used: Renders the collapsible navigation menu and highlights active routes.
*/
import { Sidenav } from "@/components/layout/Sidenav";

/*
  @/hooks/useAuthService
    - What it is: Custom hook that calls the backend to fetch the current authenticated user.
    - Why used: Retrieves user profile and token info to synchronize with global state.
*/
import { useFetchMe } from "@/hooks/useAuthService";

/*
  @/store/userStore
    - What it is: Zustand-based global store for user/session data.
    - Why used: Stores authenticated user details so any component can access them.
*/
import { useUserStore } from "@/store/userStore";

/*
  react
    - What it is: React core library providing `useEffect` and `useState` used in this file.
    - Why used: Manages component lifecycle (effects) and local UI state (sidenav open/close).
*/
import { useEffect, useState } from "react";

/*  
  @/hooks/useToast
    - What it is: A local hook that exposes a `showToast` helper for Fluent UI toaster notifications.
    - Why used: To show error messages to the user when REST API / backend calls fail.
*/
import { useGlobalToast } from "@/hooks/useToast";
import { JobStatusToaster } from "@/components/ui/JobStatusToaster";

//---------------------- Types -------------------------//

/**
 * HomeLayoutProps
 * Defines the props accepted by the HomeLayout component.
 */
interface HomeLayoutProps {
  children: React.ReactNode; // The main content to show inside the layout.
}

//---------------------- Constants -------------------------//

/**
 * LOCAL_STORAGE_SIDENAV_KEY
 * Key used to save and find the side menu's open/close state in the browser's storage.
 *
 * Why this is needed:
 * - Maintains user preference across page reloads.
 * - Improves user experience by remembering UI state.
 */
const LOCAL_STORAGE_SIDENAV_KEY = "isSidenavOpen";

//---------------------- Home Layout Component -------------------------//

/**
 * HomeLayout Component
 * This component acts as the primary layout wrapper for all `/home` routes.
 *
 * Why this component is needed:
 * - Centralizes layout logic (Header, Sidenav, main content).
 * - Synchronizes authenticated user data globally.
 * - Manages responsive layout behavior and scrolling.
 *
 * @param children - React node elements representing page-specific content.
 * @returns JSX.Element - Fully structured Home dashboard layout.
 */
export default function HomeLayout({
  children, // Page-specific content rendered inside the Home layout
}: Readonly<HomeLayoutProps>) {
  //---------------------- Data Fetching -------------------------//

  /**
   * Fetching authenticated user information from the backend.
   * The data is later synchronized with the global Zustand store.
   */
  const { data: authenticatedUserData } = useFetchMe();

  /**
   * Extracting the `setUser` action from the global user store.
   * Used to store authenticated user details application-wide.
   */
  const { setUser } = useUserStore();

  //---------------------- State Management -------------------------//

  /**
   * isSidenavOpen
   * Controls whether the Sidenav is open or collapsed.
   *
   * Important:
   * - Initialized with a fixed default (`false`) to avoid
   *   server/client hydration mismatches.
   */
  const [isSidenavOpen, setIsSidenavOpen] = useState<boolean>(false);

  // Get the global toast notification function
  const { showToast } = useGlobalToast();

  //---------------------- Effects -------------------------//

  /**
   * Effect: Restore Sidenav state from localStorage after mount.
   *
   * Why this is needed:
   * - localStorage is only available in the browser.
   * - Prevents hydration errors by running only after client mount.
   */
  useEffect(() => {
    // Only run this in the browser, not on the server.
    if (typeof window === "undefined") return;

    // Get the saved side menu state from the browser.
    const storedValue = localStorage.getItem(LOCAL_STORAGE_SIDENAV_KEY);

    // If there is a saved value, use it to set the menu state.
    if (storedValue !== null) {
      // Convert the saved text value into a real true/false value.
      // Example: localStorage value "true" becomes true, so the sidenav opens again.
      const savedSidenavState = Boolean(JSON.parse(storedValue));
      // Schedule the UI update after the current browser task to keep React lint rules happy.
      queueMicrotask(() => setIsSidenavOpen(savedSidenavState));
    }
  }, []);

  /**
   * Effect: Synchronize authenticated user data with Zustand store.
   *
   * Why this is needed:
   * - Ensures user information is globally accessible.
   * - Keeps user session data in sync across the app.
   */
  useEffect(() => {
    // If there is no user data, do nothing.
    if (!authenticatedUserData) return;

    // userRecord contains dashboard RBAC data such as dashboard user id, groups, roles, and scopes.
    const userRecord = authenticatedUserData.user;
    // principal contains identity data received from EasyAuth, such as email and Azure object id.
    const principal = authenticatedUserData.principal;
    // Prefer the dashboard RBAC user id; fall back to the EasyAuth id if RBAC did not provide one.
    const userId = userRecord.userId ?? principal.id;
    // Prefer the dashboard email; fall back to EasyAuth email; finally fall back to user id.
    const email = userRecord.email ?? principal.email ?? userId;
    // Prefer a friendly display name; otherwise use the part before @ in the email.
    // Example: "radhe.tiwari@company.com" becomes "radhe.tiwari".
    const name =
      userRecord.displayName ??
      principal.displayName ??
      email.split("@")[0] ??
      userId;

    // Save the user's details in the app-wide store for use everywhere.
    setUser({
      provider: principal.provider ?? "easyauth", // Where the user logged in from (e.g., Azure App Service EasyAuth)
      userId, // User's unique ID (e.g., "example@tevapharm.com")
      email, // User's email (e.g., "example@tevapharm.com")
      name, // User's display name or part of their email
      oid: userRecord.azureOid ?? principal.azureOid ?? "", // User's Azure object ID
    });
  }, [authenticatedUserData, setUser]);

  /**
   * Effect: Listen for "app-notification" events and show error messages as toasts.
   *
   * Why this is needed:
   * - Ensures that error messages from the backend are displayed to the user.
   * - Keeps the UI in sync with any errors triggered by API calls or other app actions.
   * - Ensures error notifications are removed correctly when the component is unmounted, preventing memory leaks.
   */
  useEffect(() => {

    // This function will handle the notification event
    // It extracts the error message and displays it using the showToast function
    const handleNotification = (event: Event) => {

      // Type-cast the event to a CustomEvent so we can access the "message" property
      // This ensures the event is treated correctly and we can read the message safely
      const localEvent = event as CustomEvent<{ message: string; }>

      // Get the message from the event's "detail" field (this is where the message is stored)
      const { message } = localEvent.detail;

      // Show the message as an error toast (a small popup on the screen)
      // "showToast" displays the message, and "error" specifies that it is an error message
      showToast(message, "error");
    }

    // Listen for the 'app-notification' event
    // Whenever this event is triggered, the "handleNotification" function will run
    window.addEventListener('app-notification', handleNotification);

    // Return a cleanup function that will remove the event listener when the component is unmounted
    // This prevents memory leaks or unwanted event handling after the component is gone
    return () => {
      window.removeEventListener('app-notification', handleNotification);
    };
  })


  //---------------------- Event Handlers -------------------------//

  /**
   * handleSidenavToggle
   * Handles opening and closing of the Sidenav.
   *
   * Why this is needed:
   * - Updates both state and localStorage.
   * - Keeps UI state persistent across reloads.
   *
   * @param isOpen - Boolean indicating desired sidenav state.
   */
  const handleSidenavToggle = (isOpen: boolean): void => {
    // Save the user's choice in the browser.
    localStorage.setItem(LOCAL_STORAGE_SIDENAV_KEY, JSON.stringify(isOpen));
    // Update the menu's open/close state.
    setIsSidenavOpen(isOpen);
  };

  //---------------------- Render -------------------------//

  return (
    // Root container occupying full viewport height
    <div className="flex h-screen flex-col overflow-hidden">
      {/* The fixed application header that stays at the top of the page. */}
      <Header
        /* whether the side navigation is currently open (controls hamburger state) */
        isSidenavOpen={isSidenavOpen}
        /* handler called when header hamburger toggles the sidenav */
        onMenuChange={handleSidenavToggle}
      />

      {/* The area below the header, split into side menu and main content. */}
      <div className="flex flex-1 overflow-hidden">
        {/* The side menu for navigation, can be open or closed. */}
        {/* isSidenavOpen: controls whether the drawer is visible */}
        <Sidenav isSidenavOpen={isSidenavOpen} />

        {/* The main area where the page's content is shown, scrollable if needed. */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>

        <JobStatusToaster />
      </div>
    </div>
  );
}
