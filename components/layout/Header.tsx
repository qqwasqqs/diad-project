/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script defines the Header component used across the Teva Data Integrity Automation Dashboard.
    
    - The Header is responsible for displaying the top navigation section.
    - It includes the hamburger menu to toggle the side navigation and Teva Logo.
    - It also includes a profile avatar displaying the user's name.
    - It provides helpful tooltips for accessibility.
    - It handles navigation to the executive dashboard.
*/

//---------------------- Client Component Directive ----------------------//

// Ensures that this component uses client-side rendering (CSR)
"use client";

//---------------------- Imports and Types -------------------------//

/*
  next/image
    - What it is: Next.js optimized Image component that serves responsive, cached images.
    - Why used: Efficiently renders the Teva logo with automatic optimizations (responsive sizes, caching).
*/
import Image from "next/image";

/*
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives (Hamburger, Avatar, Tooltip).
    - Why used: Provides consistent, accessible controls and helpers for focus management used in the header.
*/
import {
  Hamburger,  // Side nav toggle button
  Tooltip,    // Displays additional info on hover
  Avatar,     // User profile image or initials
  useRestoreFocusTarget, // Hook to manage focus when side nav is toggled
  Button, // Triggers logout via Azure Easy Auth
} from "@fluentui/react-components";

/*
  next/link
    - What it is: Next.js Link component for client-side navigation between pages.
    - Why used: Wraps the logo so clicking it navigates to the executive dashboard without a full page reload.
*/
import Link from "next/link";

/*  
  @/store/userStore
    - What it is: A Zustand-based store providing global user state (e.g., current user profile).
    - Why used: Supplies `user` data so the header can show the user's display name in the avatar.
*/
import { useUserStore } from "@/store/userStore";

/*  
  @/constants/routes
    - What it is: A module containing route constants for navigation.
    - Why used: Provides a constant to log out the authenticated user via platform auth (e.g., Azure Easy Auth).
*/
import { LOGOUT_ROUTE, MY_PROFILE_ROUTE } from "@/constants/routes";

/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon library providing SVG icons as React components.
    - Why used: Provides icons for sign-out button.
*/
import { SignOut24Regular } from "@fluentui/react-icons";

//---------------------- Types -------------------------//

/**
 * HeaderProps
 * Defines the properties accepted by the Header component.
 */
interface HeaderProps {
  isSidenavOpen: boolean; // Boolean to track if sidenav is open or not
  onMenuChange: (isSidenavOpen: boolean) => void; // Function to handle sidenav open/close toggle
}

//---------------------- Header Component -------------------------//

/**
 * Header Component
 * This component serves as the top navigation for the Teva Data Integrity Dashboard.
 * It includes:
 * - A hamburger menu to toggle the sidenav.
 * - The Teva logo with a link to the executive dashboard.
 * - A user avatar displaying the profile name.
 * - Tooltips to enhance accessibility for the icons and buttons.
 *
 * Why this component is needed:
 * - It provides essential navigation and branding for the dashboard.
 * - It ensures that users can easily access the executive dashboard and their profile.
 *
 * @param isSidenavOpen - A boolean indicating if the sidenav is currently open.
 * @param onMenuChange - A function to toggle the sidenav open/close state.
 * @returns JSX.Element - The Header JSX markup including the navigation and profile section.
 */
export const Header = ({ isSidenavOpen, onMenuChange }: HeaderProps) => {
  //---------------------- State Management -------------------------//

  /**
   * User Data from Zustand Store
   * This fetches the currently authenticated user details from the global store.
   * It's used to display the user's name in the profile avatar.
   */
  const { user } = useUserStore();

  //---------------------- Focus Management -------------------------//

  /**
   * restoreFocusTargetAttributes
   * Tabster hook used to restore focus to the hamburger menu button when the side navigation opens/closes.
   * This ensures good accessibility practices for keyboard navigation.
   */
  const restoreFocusTargetAttributes = useRestoreFocusTarget();

  /**
   * Handles user sign-out by redirecting to the Azure App Service logout endpoint.
   *
   * This triggers platform-level logout via Easy Auth, which clears the user's
   * authentication session and optionally redirects to a post-logout URL.
   */
  const handleSignOut = () => {
    window.location.href = LOGOUT_ROUTE;
  };

  //---------------------- Render -------------------------//

  return (
    <header
      /* top-level header bar: flex layout, vertical centering, fixed height, padding, and bottom border */
      className="flex items-center justify-between h-12 px-6 border-b border-neutral-foreground-5 z-1 shadow-md"
    >
      {/* Left Section: Hamburger Menu and Teva Logo */}
      <div className="flex items-center gap-3">
        {/* Hamburger Button with Tooltip */}
        <Tooltip content="Toggle navigation pane" relationship="label">
          <Hamburger
            /* onClick: call parent's handler with the toggled sidenav state */
            onClick={() => onMenuChange(!isSidenavOpen)}
            /* spread attributes used by Tabster/Fluent to restore focus to the button when appropriate */
            {...restoreFocusTargetAttributes}
            /* aria-expanded: accessibility flag telling assistive tech whether the menu is open */
            aria-expanded={isSidenavOpen}
          />
        </Tooltip>

        {/* Teva Logo with Tooltip and Link to Executive Dashboard */}
        <Tooltip content="Teva Logo" relationship="label">
          {/* Link wraps the logo to navigate to the my profile page without a full page reload */}
          <Link href={MY_PROFILE_ROUTE}>
            <Image
              /* Path to the SVG asset used as the Teva logo */
              src="/icons/teva-logo.svg"
              /* alt text provides an accessible name for the image */
              alt="Teva Logo"
              /* width and height hint the browser to reserve layout space */
              width={60}
              height={32}
            />
          </Link>
        </Tooltip>
      </div>

      {/* Right Section: User Profile */}
      <div className="flex items-center gap-3">
        {/* Profile Avatar with Tooltip */}
        <Tooltip content="Profile" relationship="label">
          {/* Link wraps the avatar to navigate to the my profile page without a full page reload */}
          <Link href={MY_PROFILE_ROUTE}>
            <Avatar
              className="cursor-pointer" // Styling for hover effect
              /* name shown inside the avatar; fall back to 'N A' when user or name is missing */
              name={user && user?.name ? user?.name : "N A"}
              /* visual color token to match brand styling */
              color="brand"
            />
          </Link>
        </Tooltip>

        {/* Sign-out Button with Tooltip */}
        <Tooltip content="Sign out" relationship="label">
          {/* Tooltip: shows "Sign out" when hovering over the button */}
          <Button
            /* Uses a subtle visual style (minimal background, less emphasis) */
            appearance="subtle"
            /* Renders a sign-out icon inside the button */
            icon={<SignOut24Regular />}
            /* Calls the logout handler when the button is clicked */
            onClick={handleSignOut}
          />
        </Tooltip>
      </div>
    </header>
  );
};
