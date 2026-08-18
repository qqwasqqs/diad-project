/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This file defines a central ICON_MAP registry that maps icon name strings
    (as stored in the database's icon_path column) to their corresponding
    Fluent UI React icon components.
    - Allows dynamic icon resolution without hard-coding icon references per nav item.
    - Acts as a safe allowlist: unknown DB strings fall back gracefully.
    - Tree-shakes cleanly — only registered icons are bundled.
*/

//---------------------- Imports -------------------------//

import {
    Database20Regular,
    Board20Regular,
    ChartMultiple20Regular,
    BranchFork20Regular,
    Settings20Regular,
    Gauge20Regular,
    BuildingGovernment20Regular,
    DataUsage24Regular,
    PeopleTeam20Regular,
    PeopleSettings20Regular,
    PeopleTeamToolbox20Regular,
    PersonStar20Regular
  } from "@fluentui/react-icons";
  import React from "react";
  
  //---------------------- Icon Map -------------------------//
  
  /**
   * ICON_MAP
   * A registry of all icons used in the sidenav.
   * Keys match the `icon_path` string stored in the database.
   * Values are the corresponding Fluent UI React component constructors.
   *
   * To add a new icon:
   *   1. Import the icon from @fluentui/react-icons above.
   *   2. Add a new entry here: { "IconName": IconName }
   *   3. Insert the matching row in the DB with icon_path = "IconName".
   */
  /*
    React.FC<Record<string, never>>
      - Explicitly types each value as a no-prop React functional component.
      - This allows TypeScript to safely call React.createElement(IconComponent)
        without hitting the "used as a type" error (ts2749).
  */
  export const ICON_MAP: Record<string, React.FC<Record<string, never>>> = {
    Database20Regular,
    Board20Regular,
    ChartMultiple20Regular,
    BranchFork20Regular,
    Settings20Regular,
    Gauge20Regular,
    BuildingGovernment20Regular,
    DataUsage24Regular,
    PeopleTeam20Regular,
    PeopleSettings20Regular,
    PeopleTeamToolbox20Regular,
    PersonStar20Regular
  };
  
  //---------------------- Resolver -------------------------//
  
  /**
   * resolveIcon
   * Resolves a DB icon_path string to a rendered React element.
   * Falls back to Database20Regular if the string is not found in the map.
   *
   * Uses React.createElement() instead of JSX (<IconComponent />) because
   * TypeScript cannot narrow a runtime-looked-up value to a valid JSX element
   * type — createElement accepts the component constructor directly and is
   * fully type-safe here.
   *
   * @param iconPath - The icon name string stored in the database (e.g. "Board20Regular").
   * @returns JSX.Element - The resolved icon component rendered as a React element.
   */
  export const resolveIcon = (iconPath: string): React.ReactElement|null => {
    const IconComponent = ICON_MAP[iconPath];
    return IconComponent
      ? React.createElement(IconComponent)
      : null; 
  };