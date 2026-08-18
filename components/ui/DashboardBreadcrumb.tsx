/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script provides a reusable DashboardBreadcrumb component for the
    Teva Data Integrity Automation Dashboard.

    Key Responsibilities:
    - Dynamically generates a breadcrumb navigation based on the current URL path.
    - Converts URL segments into human-readable labels.
    - Handles custom segment renaming (e.g., "summary-view" → "dashboard").
    - Provides proper accessibility with aria-labels.
    - Ensures the last segment is rendered as plain text (current page) and others as links.
*/

//---------------------- Client Component Directive ----------------------//
// Inform Next.js that this component should be rendered on the client
// (in the user's browser) because it uses React hooks and interactive UI.
// Ensures that this component uses client-side rendering (CSR)
"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*  
  react 
    - What it is: React library for building user interfaces.
    - Why used: We use React to define our functional component and its props.
*/
import { FC, Suspense } from "react";
/*  
  next/link
    - What it is: Next.js Link component for client-side navigation.
    - Why used: Enables navigation to detailed views for each business unit.
*/
import Link from "next/link";

/*  
  next/navigation 
    - What it is: Next.js navigation utilities for client-side routing.
    - Why used: Enables access to the current path for breadcrumb generation.
*/
import { usePathname, useSearchParams } from "next/navigation"; // hook to get current route

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  makeStyles,
  tokens,
} from "@fluentui/react-components";

/*  @/lib/helper  
    - What it is: Local helper functions for common tasks.
    - Why used: We use `formatRouteParam` to convert URL segments into
      human-readable labels for the breadcrumb.
*/
import { formatRouteParam } from "@/lib/helper"; // helper to format segment labels

/*
  @/constants/routes
    - What it is: Local module exporting route constants for the application.
    - Why used: Centralizes route strings so navigation items reference stable constants rather than hard-coded URLs.
*/
import { RULES_MANAGEMENT_ROUTE } from "@/constants/routes"; // Route for the rules management page

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------

/**
 * useBreadcrumbStyles
 *
 * Styles for the breadcrumb buttons and dividers
 */
const useBreadcrumbStyles = makeStyles({
  button: {
    color: tokens.colorNeutralForeground2, // default text color
    ":hover": {
      color: tokens.colorNeutralForeground3Hover, // change color on hover
    },
  },
});

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

/**
 * DashboardBreadcrumbProps
 *
 * Props for the DashboardBreadcrumb component.
 * - rootRoute: The root path prefix for breadcrumb URLs (e.g., "/home/data-quality-dashboard/")
 */
interface DashboardBreadcrumbProps {
  rootRoute: string;
}

/**
 * BreadcrumbItemData
 *
 * Internal type representing a breadcrumb segment.
 */
interface BreadcrumbItemData {
  key: string; // unique key for React rendering
  href: string; // href link for navigation
  label: string; // human-readable segment label
  isLast: boolean; // indicates current page segment
}

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * DashboardBreadcrumb Component
 *
 * Dynamically generates a breadcrumb navigation based on the current URL path.
 *
 * @param rootRoute - Base path for breadcrumb links
 * @returns JSX.Element - Rendered breadcrumb navigation
 *
 * Sample Input:
 *  rootRoute = "/home/data-quality-dashboard/"
 * Current URL = "/home/data-quality-dashboard/summary-view/l1-business-unit"
 *
 * Sample Output:
 *  Home / Dashboard / L1 Business Unit
 */
export const DashboardBreadcrumbMain: FC<DashboardBreadcrumbProps> = ({
  rootRoute,
}) => {
  // -------------------------------------------------------------------
  // Hooks
  // -------------------------------------------------------------------

  const pathname = usePathname(); // get the current path from Next.js router
  // Example: 
  // pathname = "http://localhost:3000/home/data-quality-dashboard/summary-view/l1-business-unit/US%20Commercial/rule-category/metadata"

  const styles = useBreadcrumbStyles(); // scoped styles

  // -------------------------------------------------------------------
  // Convert path into segments
  // -------------------------------------------------------------------

  /**
   * segments
   *
   * Array of URL segments for breadcrumb creation
   * - Filters out empty strings (leading/trailing slashes)
   * - Removes the first two segments ("/home/data-quality-dashboard") to avoid duplication
   * - Decodes URI components
   */
  const segments: string[] = pathname
    .split("/") // 1. Split the URL by "/"
    // Example: 
    // pathname = "http://localhost:3000/home/data-quality-dashboard/summary-view/l1-business-unit/US%20Commercial/rule-category/metadata"
    // After split, we get:
    // ["http:", "", "localhost:3000", "home", "data-quality-dashboard", "summary-view", "l1-business-unit", "US%20Commercial", "rule-category", "metadata"]

    .filter(Boolean) // 2. Remove empty strings (leading/trailing slashes)
    // Example: 
    // After filtering out the empty strings, the array becomes:
    // ["http:", "localhost:3000", "home", "data-quality-dashboard", "summary-view", "l1-business-unit", "US%20Commercial", "rule-category", "metadata"]

    .slice(2) // 3. Remove the first two segments ("/home/data-quality-dashboard")
    // Example:
    // After slicing from index 2, the array becomes:
    // ["home", "data-quality-dashboard", "summary-view", "l1-business-unit", "US%20Commercial", "rule-category", "metadata"]

    .map(decodeURIComponent); // 4. Decode URI components (to handle encoded characters like %20 for space)
  // Example: 
  // After decoding the "US%20Commercial" segment, it will become "US Commercial"
  // The final segments array after processing is:
  // ["home", "data-quality-dashboard", "summary-view", "l1-business-unit", "US Commercial", "rule-category", "metadata"]

  // -------------------------------------------------------------------
  // Generate breadcrumb items
  // -------------------------------------------------------------------

  const breadcrumbItems: BreadcrumbItemData[] =
    segments.length >= 2 // 1. Ensure there are at least 2 segments to create breadcrumbs
      ? segments.map((segment, idx) => { // 2. Iterate over segments to create individual breadcrumb items

        // Compute href by joining path segments up to current index
        const pairEnd = Math.floor(idx / 2) * 2;
        // Example:
        // For idx = 0, pairEnd = 0
        // For idx = 1, pairEnd = 0
        // For idx = 2, pairEnd = 2
        // For idx = 3, pairEnd = 2
        // For idx = 4, pairEnd = 4, etc.

        // Compute href by joining path segments up to current index
        const hrefSegments = segments.slice(0, pairEnd + 1); // accumulate path
        // Example:
        // For idx = 0: hrefSegments = ["home"]
        // For idx = 2: hrefSegments = ["home", "data-quality-dashboard", "summary-view"]
        // For idx = 4: hrefSegments = ["home", "data-quality-dashboard", "summary-view", "l1-business-unit", "US Commercial"]

        // Construct the full `href` by appending `hrefSegments` to the `rootRoute`
        // If `rootRoute` is equal to the `RULES_MANAGEMENT_ROUTE`, use `rootRoute` as is.
        // Otherwise, concatenate `rootRoute` with `hrefSegments` joined by "/".
        const href = rootRoute === RULES_MANAGEMENT_ROUTE ? rootRoute : rootRoute + hrefSegments.join("/");
        // Example:
        // Assuming rootRoute = "http://localhost:3000/", for idx = 2:
        // href = "http://localhost:3000/home/data-quality-dashboard/summary-view"

        // Determine if this is the last segment (current page)
        const isLast = idx === segments.length - 1;
        // Example:
        // For idx = 6 (last segment "metadata"): isLast = true
        // For idx = 0 (first segment "home"): isLast = false

        // Rename specific segments for better UX (e.g., rename "summary-view" to "dashboard")
        const normalizedSegment =
          segment === "summary-view" ? "dashboard" : segment;
        // Example:
        // If the segment is "summary-view", normalizedSegment = "dashboard"
        // Otherwise, it remains unchanged, e.g., "home" stays "home"

        // Format segment for display (human-readable)
        const label = formatRouteParam(normalizedSegment);
        // Example:
        // "data-quality-dashboard" -> "Data Quality Dashboard"
        // "l1-business-unit" -> "L1 Business Unit"
        // "US Commercial" -> "US Commercial" (no change needed)

        // Return breadcrumb item data
        return { key: href, href, label, isLast };
      })
      : []; // If there are fewer than 2 segments, return an empty array 
  /* 
  Example: 
    The resulting `breadcrumbItems` array might look like this:
    [
      {
        key: "http://localhost:3000/home",
        href: "http://localhost:3000/home",
        label: "Home",
        isLast: false
      },
      {
        key: "http://localhost:3000/home/data-quality-dashboard",
        href: "http://localhost:3000/home/data-quality-dashboard",
        label: "Data Quality Dashboard",
        isLast: false
      },
      {
        key: "http://localhost:3000/home/data-quality-dashboard/summary-view",
        href: "http://localhost:3000/home/data-quality-dashboard/summary-view",
        label: "Dashboard", // 'summary-view' renamed to 'dashboard'
        isLast: false
      },
      {
        key: "http://localhost:3000/home/data-quality-dashboard/summary-view/l1-business-unit",
        href: "http://localhost:3000/home/data-quality-dashboard/summary-view/l1-business-unit",
        label: "L1 Business Unit",
        isLast: false
      },
      {
        key: "http://localhost:3000/home/data-quality-dashboard/summary-view/l1-business-unit/US Commercial",
        href: "http://localhost:3000/home/data-quality-dashboard/summary-view/l1-business-unit/US Commercial",
        label: "US Commercial",
        isLast: false
      },
      {
        key: "http://localhost:3000/home/data-quality-dashboard/summary-view/l1-business-unit/US Commercial/rule-category",
        href: "http://localhost:3000/home/data-quality-dashboard/summary-view/l1-business-unit/US Commercial/rule-category",
        label: "Rule Category",
        isLast: false
      },
      {
        key: "http://localhost:3000/home/data-quality-dashboard/summary-view/l1-business-unit/US Commercial/rule-category/metadata",
        href: "http://localhost:3000/home/data-quality-dashboard/summary-view/l1-business-unit/US Commercial/rule-category/metadata",
        label: "Metadata",
        isLast: true
      }
    ] 
  */

  // Using the `useSearchParams` hook to read query parameters from the URL
  // Example URL:
  // http://localhost:3000/home/data-quality-dashboard/summary-view?datasetName=Customer_Metadata
  const searchParams = useSearchParams();

  // Retrieve the value of the "datasetName" query parameter from the URL
  // Example:
  // If URL = "...?datasetName=Customer_Metadata"
  // datasetName = "Customer_Metadata"
  // If URL does NOT contain datasetName
  // datasetName = null
  const datasetName = searchParams.get("datasetName");

  // Check if the "datasetName" query parameter exists in the URL
  // This ensures breadcrumbs are only modified when datasetName is present
  if (datasetName) {

    // Push a breadcrumb item representing the base/root route
    // Example breadcrumb:
    // Home / Data Quality Dashboard
    breadcrumbItems.push({
      key: rootRoute,        // Unique key for React rendering
      href: rootRoute,       // Navigation URL (e.g., "/home/data-quality-dashboard/")
      label: segments[0],    // Label derived from the first path segment
      // Example: "home" → "Home"
      isLast: false          // Not the current page
    });

    // Push a breadcrumb item for the dataset name obtained from query params
    // Example breadcrumb:
    // Home / Data Quality Dashboard / Customer Metadata
    breadcrumbItems.push({
      key: rootRoute,        // Key associated with the dataset breadcrumb
      href: rootRoute,       // Dataset breadcrumb is not navigable to a new route
      label: datasetName,    // Display dataset name from query parameter
      // Example: "Customer_Metadata" → "Customer_Metadata"
      isLast: true           // Marks this as the current page
    });
  }

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    // Breadcrumb container with aria-label for accessibility
    <Breadcrumb aria-label="Dashboard Breadcrumb">
      {breadcrumbItems.map((item, idx) => (
        // Container for each breadcrumb item and divider(>)
        <div className="flex items-center" key={idx}>
          <BreadcrumbItem key={item.key} className={styles.button}>
            {item.isLast ? (
              // Current page – rendered as plain text
              <span className="font-semibold text-neutral-foreground-2 ml-2">
                {item.label}
              </span>
            ) : (
              // Clickable breadcrumb link
              <BreadcrumbButton className={styles.button}>
                <Link href={item.href}>{item.label}</Link>
              </BreadcrumbButton>
            )}
          </BreadcrumbItem>

          {/* Render divider(>) for all except last item */}
          {!item.isLast && <BreadcrumbDivider className={styles.button} />}
        </div>
      ))}
    </Breadcrumb>
  );
};

// ---------------------------------------------------------------------
// Suspense Wrapper Component
// ---------------------------------------------------------------------

/**
 * DashboardBreadcrumb
 *
 * Lightweight wrapper component that provides a Suspense boundary
 * around DashboardBreadcrumbMain.
 *
 * Purpose:
 * - Required by Next.js 16 when using `useSearchParams()`
 * - Safe to render inside layouts and pages
 * - Prevents static rendering errors and CSR bailouts
 */
export const DashboardBreadcrumb: FC<DashboardBreadcrumbProps> = ({
  rootRoute,
}) => {
  // Suspense delays rendering of DashboardBreadcrumbMain
  // until client-side routing information (search params) is available
  return (
    <Suspense>
      {/* Main breadcrumb component containing routing and URL logic */}
      <DashboardBreadcrumbMain rootRoute={rootRoute} />
    </Suspense>
  );
};