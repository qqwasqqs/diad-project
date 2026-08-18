/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines the Side Navigation (Sidenav) component for the Teva Data Integrity Automation Dashboard.
    - Nav items are sourced from the useDashboardModules() custom hook (no manual fetch needed).
    - Hook returns already-nested, permission-filtered, camelCase data.
    - sidenavItems only sorts top-level items by sortOrder (children pre-sorted by hook).
    - Icons are resolved at runtime using the ICON_MAP registry keyed on iconPath.
    - It highlights the active section based on the current route.
    - It allows toggling the sidenav's open/close state.
*/


//---------------------- Client Component Directive ----------------------//


/* Marks this file as a client component so it can use hooks such as usePathname, useState, useEffect, and browser-side interactivity. */
"use client";


//---------------------- Imports -------------------------//


/* Imports Fluent UI navigation primitives, styling helpers, theme tokens, and loading spinner for the side navigation UI. */
import {
  /* Represents a parent navigation category container. */
  NavCategory,
  /* Represents the clickable/expandable header of a navigation category. */
  NavCategoryItem,
  /* Main navigation drawer container used for inline side navigation. */
  NavDrawer,
  /* Body region inside the navigation drawer where nav items are rendered. */
  NavDrawerBody,
  /* Single top-level navigation item used when a parent has no children. */
  NavItem,
  /* Single child navigation item rendered under a category. */
  NavSubItem,
  /* Group wrapper for child navigation items within a category. */
  NavSubItemGroup,
  /* Creates component-scoped style hooks. */
  makeStyles,
  /* Fluent design tokens for color, spacing, radius, etc. */
  tokens,
  /* Loading indicator displayed while navigation data is being fetched. */
  Spinner,
} from "@fluentui/react-components";

/* Imports Next.js Link for client-side navigation between app routes. */
import Link from "next/link";

/* Imports the current pathname hook used to determine which nav item should be active. */
import { usePathname } from "next/navigation";

/* Imports React hooks used for lifecycle logic, memoization, refs, and component state. */
import { useEffect, useMemo, useRef, useState } from "react";

/* Imports runtime icon resolver that maps iconPath strings to actual icon components. */
import { resolveIcon } from "@/constants/iconMap";


/*
  useDashboardModules
    - Custom hook that fetches the flat list of module rows from the API.
    - Returns: { data, modules: data?.modules ?? [], isFetching }
    - `modules` is the flat ModuleRow[] we transform into the nav tree.
    - `isFetching` drives the loading spinner.
*/
/* Imports custom hook that provides permission-filtered dashboard module data for the sidenav. */
import { useDashboardModules } from "@/hooks/useAuthService";

/* Imports the shared home/base route constant used to construct navigation URLs and active-route matching. */
import { HOME_ROUTE } from "@/constants/routes";


//---------------------- Types -------------------------//


/**
 * ModuleChild
 * A child module as returned already-nested inside a parent by useDashboardModules().
 * Children do not have an iconPath (only parents do).
 *
 * @property moduleId             - UUID of this child module.
 * @property moduleSlug           - URL slug used as the href.
 * @property displayName          - Label shown in the sidenav menu.
 * @property sortOrder            - Numeric sort position within siblings.
 * @property requiredPermissions  - Permission strings needed to access this module.
 * @property matchedPermissions   - Permissions the current user actually holds.
 * @property requireAll           - Whether ALL permissions are required (vs ANY).
 * @property children             - Always an empty array for depth-1 items.
 */
/* Describes the shape of a child module entry returned inside a parent module. */
interface ModuleChild {
  /* Unique identifier of the child module. */
  moduleId: string;

  /* URL-safe slug used to build the child route. */
  moduleSlug: string;

  /* Human-readable label displayed in the side navigation. */
  displayName: string;

  /* Ordering value used to position this item among siblings. */
  sortOrder: number;

  /* List of permissions required to access this child module. */
  requiredPermissions: string[];

  /* Subset of required permissions that the current user actually has. */
  matchedPermissions: string[];

  /* Indicates whether all requiredPermissions must be satisfied instead of any one of them. */
  requireAll: boolean;

  /* Child items of a child module; per current design this is always an empty array. */
  children: [];
}


/**
 * ModuleRow
 * A parent module as returned by useDashboardModules().
 * Already nested — children are embedded directly in the object.
 * Already filtered to only modules the current user has access to.
 *
 * @property moduleId             - UUID of this parent module.
 * @property moduleSlug           - URL slug used as the href.
 * @property displayName          - Label shown in the sidenav menu.
 * @property iconPath             - Fluent UI icon name string (e.g. "Board20Regular").
 * @property sortOrder            - Numeric sort position among top-level items.
 * @property requiredPermissions  - Permission strings needed to access this module.
 * @property matchedPermissions   - Permissions the current user actually holds.
 * @property requireAll           - Whether ALL permissions are required (vs ANY).
 * @property children             - Pre-nested child modules (already sorted by the hook).
 */
/* Describes the shape of a parent/top-level module entry returned by the dashboard-modules hook. */
interface ModuleRow {
  /* Unique identifier of the parent module. */
  moduleId: string;

  /* URL-safe slug used to build the parent route. */
  moduleSlug: string;

  /* Human-readable label displayed for the parent item. */
  displayName: string;

  /* String key used to resolve the icon component at runtime; may be null if not provided. */
  iconPath: string | null;

  /* Ordering value used to sort top-level navigation items. */
  sortOrder: number;

  /* List of permissions required to access this parent module. */
  requiredPermissions: string[];

  /* Subset of required permissions that the current user actually has. */
  matchedPermissions: string[];

  /* Indicates whether all required permissions are required instead of any one. */
  requireAll: boolean;

  /* Pre-nested child modules under this parent. */
  children: ModuleChild[];
}


/**
 * SidenavProps
 * Expected props for the Sidenav component.
 */
/* Defines the props accepted by the Sidenav component. */
interface SidenavProps {
  /* Whether the side navigation drawer is currently open. */
  isSidenavOpen: boolean;

  /* Optional callback used to notify the parent when the drawer open state changes. */
  onSidenavChange?: (isOpen: boolean) => void;
}



//---------------------- Styles -------------------------//


/* Creates scoped CSS-in-JS styles used by the Sidenav component. */
const useStyles = makeStyles({
  /* Styles the outer navigation drawer surface. */
  root: {
    /* Rounds the top-right corner of the sidenav. */
    borderTopRightRadius: tokens.borderRadiusLarge,
    /* Rounds the bottom-right corner of the sidenav. */
    borderBottomRightRadius: tokens.borderRadiusLarge,
    /* Establishes a minimum width so labels have enough room. */
    minWidth: "12.5rem",
    /* Sets the preferred width of the navigation drawer. */
    width: "15rem",
    /* Keeps the sidenav visually layered above nearby content when necessary. */
    zIndex: 1,
  },

  /* Styles top-level category items and top-level single items. */
  categoryItem: {
    /* Uses a neutral foreground color for default non-active state. */
    color: tokens.colorNeutralForeground3,
    /* Adds spacing below each category item. */
    marginBottom: tokens.spacingVerticalS,

    /* Applies active/expanded styling either when the item matches the current page or when its category is expanded. */
    '&[aria-current="page"], &[data-expanded="true"]': {
      /* Uses stronger background color for selected or expanded category items. */
      backgroundColor: tokens.colorNeutralForeground3,
      /* Uses stronger foreground for contrast against the active background. */
      color: tokens.colorNeutralForeground1,
    },
  },

  /* Styles child/sub-navigation items. */
  subItem: {
    /* Uses a neutral foreground color for child items in default state. */
    color: tokens.colorNeutralForeground3,

    /* Applies selected styling when the child corresponds to the current route. */
    '&[aria-current="page"]': {
      /* Highlights the selected child item. */
      backgroundColor: tokens.colorNeutralForeground3,
      /* Ensures text remains readable on the highlighted background. */
      color: tokens.colorNeutralForeground1,
    },
  },

  /* Styles the wrapper shown while navigation modules are still loading. */
  spinnerWrapper: {
    /* Uses flexbox so the spinner can be positioned cleanly. */
    display: "flex",
    /* Aligns the spinner to the start horizontally. */
    justifyContent: "start",
    /* Aligns the spinner to the start vertically. */
    alignItems: "start",
    /* Makes the wrapper consume the full drawer body height. */
    height: "100%",
    /* Adds padding around the spinner for visual breathing room. */
    padding: tokens.spacingVerticalL,
  },
});


//---------------------- Sidenav Component -------------------------//


/**
 * Sidenav Component
 * Renders a collapsible navigation drawer whose items come from useDashboardModules().
 * Icons are resolved dynamically from iconPath via resolveIcon().
 *
 * @param isSidenavOpen   - Whether the drawer is currently open.
 * @param onSidenavChange - Callback to notify the parent of open/close changes.
 */
/* Declares and exports the Sidenav component. */
export const Sidenav = ({
  /* Controlled open/closed state of the sidenav passed from the parent. */
  isSidenavOpen,

  /* Optional callback for notifying the parent when drawer open state changes; defaults to a no-op function. */
  onSidenavChange = () => {},
}: SidenavProps) => {


  //---------------------- Hooks -------------------------//


  /* Reads the current route pathname so the matching nav item can be highlighted. */
  const pathname = usePathname();

  /* Resolves the local generated CSS class names. */
  const styles = useStyles();


  /*
    useDashboardModules()
      - `modules`    : flat ModuleRow[] (already defaulted to [] if data is undefined)
      - `isFetching` : true while the request is in-flight — drives the spinner
      - `data`       : raw response (not used directly here)
   */
  /* Fetches permission-filtered dashboard module data for the current user. */
  const { modules, isFetching } = useDashboardModules();


  /*
    sidenavItems
    The hook already returns a nested, permission-filtered tree.
    We only need to sort top-level items by sortOrder — children
    are already sorted by the hook.
    useMemo stabilises the array reference so the useEffect that reads
    it via ref does not trigger unnecessary re-renders.
   */
  /* Memoizes a sorted copy of the top-level module list so sorting only recalculates when modules change. */
  const sidenavItems: ModuleRow[] = useMemo(
    /* Copies the modules array and sorts only the top-level parent entries by sortOrder. */
    () => [...(modules as ModuleRow[])].sort((leftModule, rightModule) => leftModule.sortOrder - rightModule.sortOrder),

    /* Recompute the sorted array only when the source modules array changes. */
    [modules]
  );


  //---------------------- State -------------------------//


  /* Stores the href/slug of the currently selected nav item for active highlighting. */
  const [selectedValue, setSelectedValue] = useState<string>("");


  /* Stores the set of parent module slugs that should currently appear expanded. */
  const [expandedValues, setExpandedValues] = useState<Set<string>>(new Set());


  //---------------------- Active Item Detection -------------------------//


  /*
    sidenavItemsRef
    Keeps a stable, always-current reference to sidenavItems so the useEffect
    below can read it WITHOUT listing it as a dependency.

    Why: sidenavItems is a useMemo value. Even with memoisation, listing it as
    a useEffect dependency creates a cycle:
      sidenavItems changes → effect runs → setState → re-render → sidenavItems
      ref changes → effect runs again → infinite loop.

    The ref is updated on every render (before the effect fires) so the effect
    always reads the latest tree, but the effect itself only re-runs when
    `pathname` changes — which is the only trigger we actually need.
   */
  /* Holds the latest sidenavItems array in a stable ref so effects can read up-to-date data without depending on the whole array. */
  const sidenavItemsRef = useRef<ModuleRow[]>(sidenavItems);

  /* Keeps the ref synchronized with the latest memoized sidenav items on every render. */
  sidenavItemsRef.current = sidenavItems;


  /*
    computeSelection
    Extracted as a plain function (not a hook) so it can be called both:
      1. Inside useEffect when pathname changes.
      2. Directly when sidenavItems first loads (via the sidenavItems.length effect).
    This avoids the need to list sidenavItems as a useEffect dependency
    (which caused the infinite loop) while still reacting to it loading.
   */
  /* Computes which nav item should be selected and which parent categories should be expanded for the current pathname. */
  const computeSelection = () => {
    /* Tracks the slug of the item that should be marked as selected. */
    let selected = "";

    /* Tracks which parent categories should be expanded based on route matching. */
    const newExpanded = new Set<string>();


    /* Iterates through each top-level parent item in the current sidenav tree. */
    for (const parentModule of sidenavItemsRef.current) {
      /* If the current pathname exactly matches a top-level parent route, select the parent and stop searching. */
      if (pathname === HOME_ROUTE + parentModule.moduleSlug) {
        selected = parentModule.moduleSlug;
        break;
      }

      /* If the parent has children, inspect them for a route match. */
      if (parentModule.children?.length) {
        /* Attempts to find the first child whose route matches the current pathname prefix. */
        const matchingChild = parentModule.children.find((childModule) => {
          pathname.startsWith(HOME_ROUTE + childModule.moduleSlug);
        });

        /* If a matching child is found, select it and expand its parent category. */
        if (matchingChild) {
          selected = matchingChild.moduleSlug;
          newExpanded.add(parentModule.moduleSlug);
          break;
        }

        /* If no child matched but the pathname starts with the parent route, keep the parent selected and expanded. */
        if (pathname.startsWith(HOME_ROUTE + parentModule.moduleSlug)) {
          selected = parentModule.moduleSlug;
          newExpanded.add(parentModule.moduleSlug);
        }
      }
    }


    /* Commits the selected nav item into state so Fluent Nav can highlight it. */
    setSelectedValue(selected);

    /* Commits the expanded parent categories into state so the UI opens the right sections. */
    setExpandedValues(newExpanded);
  };


  /* Recomputes the active selection and expansion whenever the current route pathname changes. */
  useEffect(() => {
    computeSelection();
  }, [pathname]);


  /* Recomputes selection once the sidenav items first become available after async loading. */
  useEffect(() => {
    /* Only recompute when there is at least one top-level nav item available. */
    if (sidenavItems.length > 0) computeSelection();
  }, [sidenavItems.length]);


  //---------------------- Render Helpers -------------------------//


  /* Renders a single top-level parent item, either as a direct link or as an expandable category with child links. */
  const renderParent = (item: ModuleRow) => {
    /* Determines whether the current parent has child routes underneath it. */
    const hasChildren = !!item.children?.length;

    /* Determines whether this parent category should appear expanded. */
    const isExpanded = expandedValues.has(item.moduleSlug);

    /* Determines whether this parent item itself is the currently selected route. */
    const isSelected = selectedValue === item.moduleSlug;


    /* Resolves an icon component only for parent items that provide an iconPath. */
    const icon = item.iconPath ? resolveIcon(item.iconPath) : null;


    /* When the parent has no children, render it as a direct single nav link. */
    if (!hasChildren) {
      return (
        /* Wraps the NavItem in a Next.js Link for client-side route navigation. */
        <Link key={item.moduleId} href={`${HOME_ROUTE}${item.moduleSlug}`} passHref>
          <NavItem
            /* Sets Fluent Nav's value identity for this item. */
            value={item.moduleSlug}
            /* Supplies the resolved icon when available. */
            icon={icon ?? undefined}
            /* Applies shared top-level nav item styling. */
            className={styles.categoryItem}
            /* Marks the item as the current page for accessibility when selected. */
            aria-current={isSelected ? "page" : undefined}
          >
            {/* Shows the parent module's display label. */}
            {item.displayName}
          </NavItem>
        </Link>
      );
    }


    /* When the parent has children, render it as an expandable category with nested sub-items. */
    return (
      <NavCategory key={item.moduleId} value={item.moduleSlug}>
        <NavCategoryItem
          /* Supplies the resolved parent icon when available. */
          icon={icon ?? undefined}
          /* Applies top-level category styling. */
          className={styles.categoryItem}
          /* Marks the parent as current when it is directly selected. */
          aria-current={isSelected ? "page" : undefined}
          /* Passes the expansion state into a data attribute used by custom styling. */
          data-expanded={isExpanded}
        >
          {/* Shows the parent module display name. */}
          {item.displayName}
        </NavCategoryItem>

        <NavSubItemGroup>
          {/* Iterates through each child module and renders it as a nested nav sub-item. */}
          {item.children.map((child) => {
            /* Determines whether this child item is the currently selected route. */
            const childSelected = selectedValue === child.moduleSlug;

            return (
              /* Wraps the child sub-item in a Next.js Link for client-side route changes. */
              <Link key={child.moduleId} href={`${HOME_ROUTE}/${child.moduleSlug}`} passHref>
                <NavSubItem
                  /* Sets Fluent Nav's identity value for the child item. */
                  value={child.moduleSlug}
                  /* Applies child-item styling. */
                  className={styles.subItem}
                  /* Marks the child as current when it matches the active route. */
                  aria-current={childSelected ? "page" : undefined}
                >
                  {/* Shows the child module's display label. */}
                  {child.displayName}
                </NavSubItem>
              </Link>
            );
          })}
        </NavSubItemGroup>
      </NavCategory>
    );
  };


  //---------------------- Return JSX -------------------------//


  /* Renders the inline Fluent UI navigation drawer and its body content. */
  return (
    <NavDrawer
      /* Controls whether the sidenav drawer is open. */
      open={isSidenavOpen}
      /* Uses inline drawer mode so the sidenav occupies layout space instead of overlaying content. */
      type="inline"
      /* Applies custom drawer styling. */
      className={styles.root}
      /* Tells the nav which item slug is currently selected. */
      selectedValue={selectedValue}
      /* Allows only one category to be expanded at a time. */
      multiple={false}
      /* Notifies the parent component whenever the drawer open state changes. */
      onOpenChange={(_, { open }) => onSidenavChange(open)}
    >
      <NavDrawerBody>
        {isFetching ? (
          /* While dashboard modules are loading, show a spinner instead of nav items. */
          <div className={styles.spinnerWrapper}>
            <Spinner
              /* Keeps the loading indicator compact inside the sidenav. */
              size="small"
              /* Renders a custom label with explicit inline color styling. */
              label={<span style={{ color: tokens.colorNeutralBackground1 }}>Loading navigation...</span>}
            />
          </div>
        ) : (
          /* Once modules are available, render the sorted top-level nav tree. */
          sidenavItems.map(renderParent)
        )}
      </NavDrawerBody>
    </NavDrawer>
  );
};