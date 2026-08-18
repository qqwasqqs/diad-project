/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 January 2026

  Purpose of the script:
    This script defines the Rules Management page of the
    Teva Data Integrity Automation Dashboard.

    Responsibilities:
    - Provides a UI for configuring and managing data integrity rules.
    - Allows users to define dataset-level validation rules.
    - Explains rule configuration purpose using contextual help.
    - Acts as an entry point for creating, updating, and maintaining rules.

    This page is a client component because:
    - It uses interactive UI elements.
    - It relies on client-side hooks and form state management.
*/

//---------------------- Client Component Directive ----------------------//

// Ensures that this component uses client-side rendering (CSR)
"use client";

// ---------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and lifecycle.
*/
import { use, useMemo, useState } from "react";

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, and styling utilities for consistent UI.
*/
import {
  makeStyles,   // Creates hook-based styles scoped to a component
  shorthands,   // Helper utilities for common CSS shorthand properties
  tokens,       // Design tokens (colors, spacing, typography, etc.)
  Text,         // Generic text component with Fluent typography
  Button,       // Fluent UI button component
  Spinner,      // Loading indicator / progress spinner
  Badge,        // Small status or count indicator
  Caption1,     // Predefined caption text style
  Title3,       // Predefined heading/title text style
  Tooltip,      // Hover or focus-based contextual info popup
  SearchBox     // Input field optimized for search interactions
} from "@fluentui/react-components";

/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon library providing SVG icons as React components.
    - Why used: Provides icons for copy buttons and status indicators.
*/
import {
  SparkleRegular,     // Decorative or highlight action icon
  EditRegular,        // Edit or modify action
  TableRegular,       // Table or grid view representation
  ColumnRegular,      // Column-related layout or settings
  AddRegular,         // Add or create new item
  RecordRegular,      // Data record or entry indicator
  PersonRegular,      // User or profile representation
  HistoryRegular,     // History, activity log, or timeline
  TimerRegular,       // Time-based action or duration
  LockClosedRegular,  // Locked, secured, or restricted state
} from "@fluentui/react-icons";

/*
  @/types/rule
    - What it is: // TypeScript type defined for rule management.
    - Why used:  Used for the expected structure of data returned by the API.
*/
import { Column, Rule } from "@/types/rule";

/*
  @/components/ui/AddRuleDrawer
    - What it is: Custom component which shows a dialog to add new rules.
    - Why used:  Used to add new rules to a dataset.
*/
import { AddRuleDrawer } from "@/components/ui/AddRuleDrawer";

// Shared helper to format timestamps into human-readable strings
// - What it does: converts raw timestamp values to friendly date/time text.
// - Why used here: to display the "timestamp" column and "lastUpdate" in readable format.
import { formatDateTime } from "@/lib/helper"; // Helper function to format date and time for display

/*
  @/components/ui/SuggestRulesModal
    - What it is: Custom component which shows suggested rules for a dataset.
    - Why used:  Used by user to get suggestions for adding rules to the dataset.
*/
import { SuggestRulesModal } from "@/components/ui/SuggestRulesModal";

/*  
  @/hooks/useGreatExpectations
    - What it is: A custom hook that fetches metadata of a dataset, configured rules, and receiver alert ids for rule management.
    - Why used: Fetches the datasets for managing rules in the system.
*/
import {
  useGetDataQualityDatasetMetadata, // Custom hook for fetching metadata of selected dataset.
  useGetDataQualityConfiguredRules, // Custom hook for fetching configured rules and their details for selected dataset.
} from "@/hooks/useGreatExpectations";


/**
 * `useSearchParams` is a custom hook provided by Next.js for accessing the URL's query parameters.
 * It allows you to read and manipulate the search parameters (query string) in the URL.
*/
import { useSearchParams } from "next/navigation";


/**
 * @/components/ui/ClusterControl
 *  - What it is: A custom component which shows the event stream of Databricks cluster.
 *  - Why used: Provide live stream of the Databricks cluster events.
 */
import { ClusterControl } from "@/components/ui/ClusterControl";

/*
  @/components/ui/UpdateRuleDialog
    - What it is: Custom component which shows a dialog to update the configured rule.
    - Why used:  Used to update rules configured for a dataset.
*/
import { UpdateRuleDialog } from "@/components/ui/UpdateRuleDialog";
import { usePagePermissions } from "@/hooks/hasPagePermissions";

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------

/**
 * useStyles
 *
 * Defines component-scoped styles using Fluent UI's makeStyles.
 * Centralizes layout, spacing, and visual consistency.
 */
const useStyles = makeStyles({
  root: {
    display: "flex", // Sets the root element to use flexbox layout
    flexDirection: "column", // Arranges child elements vertically
    gap: "24px", // Adds 24px gap between child elements
    paddingTop: tokens.spacingHorizontalM, // Adds spacing at the top of the root div
  },
  header: {
    display: "flex", // Sets header to use flexbox layout
    justifyContent: "space-between", // Distributes space between child elements
    alignItems: "flex-start", // Aligns child elements at the start of the cross-axis
  },
  title: {
    fontWeight: tokens.fontWeightBold, // Makes the title text bold
    color: tokens.colorNeutralForeground1, // Sets the color of the title text
  },
  mainGrid: {
    display: "grid", // Sets the mainGrid to use grid layout
    gridTemplateColumns: "320px 1fr", // Defines two columns with fixed width for the first one
    gap: "24px", // Adds 24px gap between grid items
  },
  columnList: {
    display: "flex", // Sets columnList to use flexbox layout
    flexDirection: "column", // Arranges child elements vertically
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1), // Adds border with specified color and width
    ...shorthands.borderRadius(tokens.borderRadiusMedium), // Rounds the corners of the columnList
    backgroundColor: tokens.colorNeutralBackground1, // Sets background color for the columnList
    overflow: "hidden", // Prevents content from overflowing the container
    boxShadow: tokens.shadow4, // Adds shadow effect to the columnList
  },
  searchBox: {
    width: "20rem", // Defines a fixed width for the search box
  },
  sidebarHeader: {
    padding: "16px", // Adds padding to the sidebarHeader
    backgroundColor: tokens.colorNeutralBackground4, // Sets background color for the sidebarHeader
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2), // Adds border at the bottom
  },
  columnItem: {
    padding: "12px 16px", // Adds padding inside each column item
    cursor: "pointer", // Changes cursor to pointer on hover
    display: "flex", // Sets columnItem to use flexbox layout
    flexDirection: "column", // Arranges child elements vertically
    gap: "2px", // Adds 2px gap between child elements
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2), // Adds bottom border
    transitionProperty: "background-color, border-left", // Specifies which properties should transition
    transitionDuration: "200ms", // Sets duration of the transition effect
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover, // Changes background color on hover
    },
  },
  columnItemActive: {
    backgroundColor: tokens.colorBrandBackground2, // Changes background color for active column item
    ...shorthands.borderLeft("4px", "solid", tokens.colorBrandStroke1), // Adds a left border for active state
    ":hover": {
      backgroundColor: tokens.colorBrandBackground2, // Keeps background color the same on hover for active item
    },
  },
  // Refined Rule Card Styles
  ruleListContainer: {
    display: "flex", // Sets ruleListContainer to use flexbox layout
    flexDirection: "column", // Arranges child elements vertically
    gap: "12px", // Adds 12px gap between child elements
  },
  ruleEntry: {
    padding: "16px", // Adds padding to each rule entry
    display: "flex", // Sets ruleEntry to use flexbox layout
    flexDirection: "column", // Arranges child elements vertically
    gap: "8px", // Adds 8px gap between child elements
    backgroundColor: tokens.colorNeutralBackground1, // Sets background color for the rule entry
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1), // Adds border around the rule entry
    ...shorthands.borderRadius(tokens.borderRadiusMedium), // Rounds corners of the rule entry
    transitionProperty: "box-shadow, transform", // Specifies which properties should transition
    transitionDuration: "200ms", // Sets duration of the transition effect
    ":hover": {
      boxShadow: tokens.shadow8, // Adds shadow effect on hover
      transform: "translateY(-1px)", // Moves the entry slightly up on hover
      ...shorthands.borderColor(tokens.colorNeutralStroke1Hover), // Changes border color on hover
    },
  },
  metaGrid: {
    display: "grid", // Sets metaGrid to use grid layout
    gridTemplateColumns: "auto 1fr auto", // Defines three columns with flexible widths
    gap: "12px", // Adds 12px gap between grid items
    marginTop: "4px", // Adds 4px margin at the top
  },
  expressionContainer: {
    backgroundColor: tokens.colorNeutralBackground3, // Sets background color for expressionContainer
    ...shorthands.padding("8px", "12px"), // Adds padding inside the expression container
    ...shorthands.borderRadius(tokens.borderRadiusSmall), // Rounds the corners of the expression container
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2), // Adds border around the container
    fontSize: "12px", // Sets font size to 12px
    maxWidth: "100%", // Ensures the container doesn't exceed 100% width
    overflowWrap: "anywhere", // Allows text to wrap at any point if necessary
    wordBreak: "break-word", // Breaks words if necessary to prevent overflow
  },
});


//---------------------- Component: RuleManager -------------------------//

/**
 * Interface defining the props for the RuleManager component.
 * These props provide the data from parameters required in the page.
 */
interface RuleManagerProps {
  params: Promise<{ dataset: string[] }>; // URL parameter containing dataset id info 
}

/**
 * `RuleManager` Component
 * This component is responsible for managing rules in a data quality system.
 * - Fetches and displays metadata and alerts related to a dataset.
 * - Allows for updating or adding new rules and managing column-level configurations.
 * - Handles rule suggestions via AI and offers a UI for adding, updating, and deleting rules.
 * - The component uses React hooks to manage state and interact with external data fetching services.
 * 
 * @param {RuleManagerProps} props - The component props containing the dataset ID information.
 * @returns JSX.Element - The rendered component for managing rules.
 */
export default function RuleManager({ params }: RuleManagerProps) {

  // Using the `useSearchParams` hook to access and manipulate URL search parameters
  const searchParams = useSearchParams();

  const {canRead, canWrite, isLoadingPermissions} = usePagePermissions("rules-management-manage-rules");

  // Decoding the dataset IDs from the `params` promise, which contains URL parameters
  // The `decodeURIComponent` is used to handle any encoded characters in the dataset names
  const decodedParams = use(params).dataset.map(decodeURIComponent);

  // Declaring local variables to store extracted dataset information
  let businessUnit = ''; // variable to set business unit
  let catalogName = null; // variable to set catalog name
  let schemaName = null; // variable to set schema name
  let datasetName = ''; // variable to set dataset name

  // Parsing the decodedParams to extract values for business unit, catalog, schema, and dataset
  // If only one parameter is passed, it assigns the business unit and dataset name
  if (decodedParams.length === 1) {
    datasetName = searchParams.get("datasetName") ?? '';  // Get dataset name from search params
    [businessUnit] = decodedParams;  // Assign the first decoded parameter as business unit
  } else {
    // If multiple parameters exist, assign them to business unit, catalog, schema, and dataset name
    [businessUnit, catalogName, schemaName, datasetName] = decodedParams;
  }

  // Getting custom styles for the component using `useStyles` hook
  const styles = useStyles();

  // Fetching metadata for the dataset using custom hook `useGetDataQualityDatasetMetadata`
  // The hook takes parameters like business unit, catalog, schema, and dataset name
  const { datasetMetadata, isFetchingDatasetMetadata } = useGetDataQualityDatasetMetadata(
    businessUnit, // business unit of dataset
    catalogName, // catalog name of dataset
    schemaName, // schema name of dataset
    datasetName // dataset name to fetch metadata
  );

  // State to store the currently selected column for which rules are to be fetched or updated
  const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);

  // Fetching the global rules configured for the dataset and selected column
  const { configuredRules, isFetchingConfiguredRules } = useGetDataQualityConfiguredRules(
    businessUnit, // business unit of dataset
    catalogName, // catalog name of dataset
    schemaName, // schema name of dataset
    datasetName, // dataset name to fetch configured rules
    selectedColumn?.column_name  // Fetch rules for the selected column (if available)
  );

  // States for checking whether cluster is running or not
  const [isClusterRunning, setIsClusterRunning] = useState(false);
  // States for Suggestion Modal
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  // State to track the search input value
  // - `search`: Stores the current value of the search field for filtering configured rules
  const [search, setSearch] = useState("");
  // States for managing the Edit/Add drawer for rules
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);  // State for the visibility of the rule edit/add drawer
  // const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);  // Optional state for rule deletion dialog (commented out)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);  // State for rule update dialog visibility
  // const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null);  // Optional state for rule to delete (commented out)
  const [ruleToUpdate, setRuleToUpdate] = useState<any>({});  // State to hold the rule that is being updated

  /**
   * Opens the drawer for adding a new item or configuration.
   * This function sets the `isDrawerOpen` state to `true` to display the drawer.
   */
  const handleOpenAddDrawer = () => {
    setIsDrawerOpen(true); // Set the state to open the drawer.
  };

  /**
   * Handles the rule suggestion generation process.
   * It simulates loading the suggestions, sets the loading state, 
   * and then opens the suggestions view once the loading is complete.
   */
  const handleGenerateSuggestions = async () => {
    setIsSuggestionOpen(true); // Open the suggestion modal or dialog.
  };

  /**
   * Confirms the rule update by setting the rule to update and opening the update dialog.
   * This function is triggered when the user selects a rule to modify.
   *
   * @param {Rule} rule - The rule that the user selected for updating.
   */
  const confirmUpdate = (rule: Rule) => {
    setRuleToUpdate(rule); // Set the selected rule to the state `ruleToUpdate`.
    setIsUpdateDialogOpen(true); // Open the update dialog to allow the user to modify the rule.
  };

  /**
   * Maps the column details from the dataset metadata to create an array of column names and their data types.
   * This array is useful for displaying column details or configuring updates based on column information.
   *
   * @returns {Array<{column_name: string, data_type: string}>} - An array of objects with column names and data types.
   */
  const Columns = (datasetMetadata?.columns_details || [])?.map((column: Column) => (
    { column_name: column.column_name, data_type: column.data_type } // map column_name and ata_type from dataset metadata to columns list
    ));

  /**
   * Filters the configured rules based on the search query.
   * - `useMemo` is used to memoize the filtered rules results to optimize performance.
   * - The filtering logic checks if the rule name or rule type of any of the configured rules include the search text.
   * Example:
   *  search = Dataset Uniqueness
   *  then it will be transformed into lowercase and remove whitespace.
   *  search = datasetuniqueness
   * 
   *  we have a rule name = dataset_uniqueness_check
   *  then it will be transformed into lowercase and remove any whitespace.
   *  rule name = datasetuniquenesscheck.
   * 
   *  Since, rulename has datasetuniqueness, it will match and get added to filteredConfiguredRules.
   *  Similarly it will be done for all the rules in configuredRules.
   */
  const filteredConfiguredRules = useMemo(() => {
      const searchValue = search
      .toLowerCase()  // convert search input to lower case
      .replace(/[\s_]/g, "") // remove whitespaces and underscores
      return configuredRules?.filter(
        (rule: Rule) =>
          (
            rule.RULE_NAME
            .toLowerCase() // convert rule name to lower case
            .replace(/[\s_]/g, "") // remove whitespaces and underscores
          ).includes(
            searchValue // Check if the rule has searchValue characters.
          )
          ||
          (
            rule.RULE_TYPE
            .toLowerCase() // convert rule type to lower case
            .replace(/[\s_]/g, "") // remove whitespaces and underscores
          ).includes(
            search
            .toLowerCase()  // convert search input to lower case
            .replace(/[\s_]/g, "") // remove whitespaces and underscores
          )
          ) // Check if rule name or rule type matches the search.
  }, [configuredRules, search]); // Recompute whenever `configuredRules` or `search` changes

  if(isLoadingPermissions) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
          <Spinner size="medium" label="Loading..." />
      </div>
  );
  }

  if(!isLoadingPermissions && !canRead){
    window.location.href = "/forbidden";
  }

  return (
    <div>
      {/* Root container for the page */}
      <div className={styles.root}>

        {/* Header section containing title and action buttons */}
        <div className={styles.header}>

          {/* Title and metadata about the dataset */}
          <div className="flex items-center gap-1">
            {/* display title of the page */}
            <Title3 className={styles.title}>
              Manage Rules
              {/* Conditionally display dataset name based on the dataset type */}
              {datasetMetadata?.dataset_type !== "FILE" && (
                // display dataset name
                <span className="text-neutral-foreground-2">
                  ({datasetName})
                </span>
              )}
            </Title3>

            {/* Only show the Badge when dataset metadata is not being fetched */}
            {isFetchingDatasetMetadata ? <></> :
            // badge to show rule count for the dataset
              <Badge appearance="tint" color="brand">
                {/* Display the total number of rules defined */}
                {datasetMetadata?.total_rule_count} Rules Defined
              </Badge>
            }
          </div>

          {/* Action buttons for managing rules */}
          {canWrite &&(
          <div className="flex items-center gap-3">

            {/* ClusterControl component, passing the function to set cluster running state */}
            <ClusterControl
              setIsClusterRunning={setIsClusterRunning} // set it for enabling/disabling the add rule and suggest rule buttons
            />

            {/* Tooltip for the 'Suggest Rules' button, showing different content based on cluster state only if dataset type is not "FILE" */}
            {datasetMetadata?.dataset_type !== "FILE" && (
              <Tooltip
                content={isClusterRunning 
                         ? "Click to Suggest Rules" // If cluster is running show this string.
                         : "The Databricks cluster is down. Please start the cluster first." // Cluster has been stopped show this string.
                        }
                relationship="label" // define the relationship of the component
                withArrow // show an arrow linking to the button inside it
              >
                <Button
                  icon={isClusterRunning 
                        ? <SparkleRegular /> // show this icon when cluster is running
                        : <LockClosedRegular /> // Show this icon if cluster is down
                      }
                  appearance="secondary" // secondary style of the button
                  onClick={handleGenerateSuggestions} // Open the rule suggestion drawer
                  disabled={!isClusterRunning} // Disable button if cluster is not running
                >
                  {/* button label  */}
                  Suggest Rules
                </Button>
              </Tooltip>
            )}

            {/* Tooltip for the 'Add Rule' button, showing different content based on cluster state */}
            <Tooltip
              content={isClusterRunning // content of tooltip
                       ? "Click to Add Rule" // If cluster is running show this
                       : "The Databricks cluster is down. Please start the cluster first." // If cluster is down show this
                      }
              relationship="label" // relationship with the component
              withArrow // display an arrow pointing to the button
            >
              <Button
                icon={isClusterRunning 
                      ? <AddRegular /> // If cluster is running show this icon
                      : <LockClosedRegular /> // If cluster is down show this icon.
                    }
                appearance="primary" // set primary style of the button
                onClick={handleOpenAddDrawer} // Open the rule drawer when clicked
                disabled={!isClusterRunning} // Disable button if cluster is not running
              >
                {/* button label  */}
                Add Rule
              </Button>
            </Tooltip>
          </div>
          )}
        </div>

        {/* Main content grid for displaying rules and sidebar */}
        <div className={styles.mainGrid}>

          {/* Display a loading spinner if dataset metadata is being fetched */}
          {isFetchingDatasetMetadata 
          
          ? <div className="flex h-[60vh] items-center justify-center"><Spinner size="medium" label="Loading metadata..." /> </div> // loading state
            // if loading state is false then render below items 
          : <div className={styles.columnList}>
              {/* Sidebar header for column navigator */}
              <div className={styles.sidebarHeader}>
                {/* Navigator label  */}
                <Text size={300} weight="bold" className="text-white">
                  Navigator
                </Text>
              </div>

              {/* Sidebar item for Global Rules with conditional active state */}
              <div
                className={`${styles.columnItem} ${selectedColumn === null ? styles.columnItemActive : ""}`} // set style of div according to selected column
                onClick={() => setSelectedColumn(null)} // set to null when global rules is selected
              >
                {/* header div for column navigator at the top of side panel  */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TableRegular />
                    {/* show global rule label */}
                    <Text weight="semibold" size={300}>
                      Global Rules
                    </Text>
                  </div>
                  {/* display number of rules defined globally */}
                  <Badge size="small" appearance="outline">
                    {datasetMetadata?.row_rule_count}
                  </Badge>
                </div>
                {/* Display a label for dataset/row level rules if dataset type is not "FILE" */}
                {datasetMetadata?.dataset_type !== "FILE" && (
                  // Display label for dataset/row level rule
                  <Caption1 className="text-neutral-foreground-2">
                    Dataset/Row level rules
                  </Caption1>
                )}
              </div>

              {/* Display column inspector if dataset type is not "FILE" */}
              {datasetMetadata?.dataset_type !== "FILE" && (
                <>
                  {/* heading of the columns list  */}
                  <div className="p-3 bg-gray-50 font-bold text-[10px] uppercase text-neutral-foreground-2 tracking-widest border-y border-neutral-foreground-2">
                    Column Inspector
                  </div>
                  {/* Scrollable list of columns with individual column selection */}
                  <div className="overflow-y-auto h-[calc(100vh-362px)] scrollbar-custom">
                    {/* map the metadata of the dataset for providing information about configured rules */}
                    {datasetMetadata?.columns_details?.map((column: Column) => (
                      <div
                        key={column.column_name} // key for each column
                        // highlight the selected column
                        className={`${styles.columnItem} ${selectedColumn?.column_name === column.column_name ? styles.columnItemActive : ""}`}
                        onClick={() => setSelectedColumn(column)} // set the column name to show configured rules of the same
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <ColumnRegular className={selectedColumn?.column_name === column.column_name ? "" : "text-neutral-foreground-2"} />
                            {/* display the column name */}
                            <Text weight="semibold" size={300} className={selectedColumn?.column_name === column.column_name ? "" : "text-neutral-foreground-2"}>
                              {column.column_name}
                            </Text>
                          </div>
                          {/* display the number of rules applied on the column */}
                          <Badge size="small" appearance="outline">
                            {column.rule_count}
                          </Badge>
                        </div>
                        {/* display dataset type of the column */}
                        <Caption1 className="text-gray-400 font-mono pl-6">
                          {column.data_type}
                        </Caption1>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          }

          {/* Display a loading spinner if global rules or dataset metadata are being fetched */}
          {isFetchingConfiguredRules || isFetchingDatasetMetadata 
          
          ? <div className="flex h-[60vh] items-center justify-center"><Spinner size="medium" label="Loading configured rules..." /> </div> 
          
          : <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                {/* display header for the configured rules section  */}
                  <Text size={400} weight="bold">
                    {selectedColumn
                      ? `Configured Rules for ${selectedColumn?.column_name}` // If a column is selected
                      : "Configured Global Rules" // If global is selected
                    }
                  </Text>
                  {/* display search box for helping to find the configured rule */}
                  <SearchBox
                    className={styles.searchBox} // Apply style to the searchBox component
                    placeholder="Filter by rule name or type..." // placeholder if no value is entered, hinting what to enter
                    value={search} // value of the searchbox
                    onChange={(_, data) => {
                      setSearch(data.value); // set the search value 
                    }}
                  />
              </div>

              {/* Display message if no rules are defined */}
              {filteredConfiguredRules?.length === 0 ? (
                <div className="p-30 border-2 border-dashed border-gray-200 rounded-lg text-center bg-gray-50 mt-4">
                  {/* display the icon for the record */}
                  <RecordRegular className="text-gray-300 w-12 h-12 mb-2" />
                  {/* display the user message when no rule found while searching.*/}
                  <Text size={400} className="text-gray-400 block">
                    {search !== ""
                    ?
                    `No data quality rules found with name ${search}.` // if no rules are defined with the name as search value then show this
                    : 
                    "No data quality rules found." // If no rules defined at all for the column.
                    }
                  </Text>
                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-y-auto h-[calc(100vh-238px)] pt-1 pr-2 scrollbar-custom">
                  {/* Display list of rules */}
                  {filteredConfiguredRules?.map((rule: Rule) => (
                    <div key={rule?.CONFIG_ID} className={`${styles.ruleEntry} ${!rule?.ENABLED? 'bg-neutral-background-5!': ''}`}> {/* if rule is enabled change the background */}
                        {/* container to display each rule  */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* display rule name */}
                          <Text weight="bold" size={400}>{rule?.RULE_NAME}</Text>
                          {/* display rule type  */}
                          <Badge appearance="filled" size="small">{rule?.RULE_TYPE}</Badge>
                          {/* display rule category  */}
                          <Badge appearance="tint" size="small">{rule?.RULE_CATEGORY}</Badge>
                          {/* display column names on which the rule is applied  */}
                          {rule?.TARGET_COLUMN && <Caption1 className="text-neutral-foreground-2">Column Name: <b>{rule?.TARGET_COLUMN ?? '-'}</b></Caption1>}
                        </div>
                        {/* Tooltip and Button to edit the rule parameters */}
                        {canWrite && (
                        <Tooltip
                          content={isClusterRunning 
                            ? "Click to Update Rule Parameters" //display this when cluster is running
                            : "The Databricks cluster is down. Please start the cluster first." // display this when cluster is stopped
                          }
                          relationship="label" // relationship with the button
                          withArrow // arrow pointing to the button
                        >
                          <Button
                            appearance="subtle" // pre-defined css applied to the button
                            size="small" // set size of button
                            icon={<EditRegular />} // set icon of the button
                            onClick={() => confirmUpdate(rule)} // if update button is clicked open the update rule dialog.
                            disabled={!isClusterRunning} // Disable button if cluster is not running
                          />
                        </Tooltip>
                        )}
                      </div>

                      {/* Display rule value if it exists */}
                      {rule?.RULE_VALUE && <div className={styles.expressionContainer}>
                        {/* display rule value of the rule */}
                        <div className="mb-1">
                          {/* display title for the value  */}
                          <Text weight="bold" size={200} className="text-neutral-foreground-1 uppercase">Rule Value</Text>
                        </div>
                        {/* display rule value  */}
                        <code className="text-neutral-foreground-2">{rule?.RULE_VALUE}</code>
                      </div>}

                      {/* Display additional rule thresholds and baselines if available */}
                      <div className="flex flex-wrap gap-5 mt-1">
                        {/* display threshold unit if available  */}
                        {rule?.THRESHOLD_UNIT && (
                          // display rule parameter name and it's value
                          <Caption1 className="text-neutral-foreground-2">
                            Threshold Unit: <b>{rule?.THRESHOLD_UNIT ?? '-'}</b>
                          </Caption1>
                        )}
                        {/* display threshold derivation type if available  */}
                        {rule?.THRESHOLD_DERIVATION_TYPE && (
                          // display rule parameter name and it's value
                          <Caption1 className="text-neutral-foreground-2">
                            Threshold Derivation Type: <b>{rule?.THRESHOLD_DERIVATION_TYPE ?? '-'}</b>
                          </Caption1>
                        )}
                        {/* display threshold lookback unit if available  */}
                        {rule?.THRESHOLD_LOOKBACK_UNIT && (
                          // display rule parameter name and it's value
                          <Caption1 className="text-neutral-foreground-2">
                            Threshold Lookback Unit: <b>{rule?.THRESHOLD_LOOKBACK_UNIT ?? '-'}</b>
                          </Caption1>
                        )}
                        {/* display threshold lookback value if available  */}
                        {rule?.THRESHOLD_LOOKBACK_VALUE && (
                          // display rule parameter name and it's value
                          <Caption1 className="text-neutral-foreground-2">
                            Threshold Lookback Value: <b>{rule?.THRESHOLD_LOOKBACK_VALUE ?? '-'}</b>
                          </Caption1>
                        )}
                        {/* display baseline derivation type if available  */}
                        {rule?.BASELINE_DERIVATION_TYPE && (
                          // display rule parameter name and it's value
                          <Caption1 className="text-neutral-foreground-2">
                            Baseline Derivation Type: <b>{rule?.BASELINE_DERIVATION_TYPE ?? '-'}</b>
                          </Caption1>
                        )}
                        {/* display baseline lookback unit if available  */}
                        {rule?.BASELINE_LOOKBACK_UNIT && (
                          // display rule parameter name and it's value
                          <Caption1 className="text-neutral-foreground-2">
                            Baseline Lookback Unit: <b>{rule?.BASELINE_LOOKBACK_UNIT ?? '-'}</b>
                          </Caption1>
                        )}
                        {/* display baseline lookback value if available  */}
                        {rule?.BASELINE_LOOKBACK_VALUE && (
                          // display rule parameter name and it's value
                          <Caption1 className="text-neutral-foreground-2">
                            Baseline Lookback Value: <b>{rule?.BASELINE_LOOKBACK_VALUE ?? '-'}</b>
                          </Caption1>
                        )}
                        {/* display baseline value if available  */}
                        {rule?.BASELINE_VALUE && (
                          // display rule parameter name and it's value
                          <Caption1 className="text-neutral-foreground-2">
                            Baseline Value: <b>{rule?.BASELINE_VALUE ?? '-'}</b>
                          </Caption1>
                        )}
                      </div>

                      {/* Display rule metadata like frequency, last update details */}
                      <div className={styles.metaGrid}>
                        <div className="flex items-center gap-1 text-neutral-foreground-2">
                          {/* Display icon for run frequency*/}
                          <TimerRegular />
                          {/* display run frequency  */}
                          <Caption1>Frequency: {rule?.RUN_FREQUENCY}</Caption1>
                        </div>
                        <div className="flex items-center gap-1 text-neutral-foreground-2">
                          {/* display icon for updated by */}
                          <PersonRegular />
                          {/* display updated by value  */}
                          <Caption1 className="truncate">By: {rule?.UPDATED_BY}</Caption1>
                        </div>
                        <div className="flex items-center gap-1 text-neutral-foreground-2">
                          {/* display icon for updated at */}
                          <HistoryRegular />
                          {/* display updated at value  */}
                          <Caption1>At: {formatDateTime(rule?.UPDATED_AT || new Date().toISOString())}</Caption1>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          }
        </div>
      </div>

      {/* Suggest Rule Modal - allows users to generate rule suggestions based on dataset */}
      {canWrite && (
        <>
      <SuggestRulesModal
        // provide appropriate props required for the component 
        open={isSuggestionOpen} // provide this as props to handle opening and closing of the drawer
        businessUnit={businessUnit} // provides business unit of the dataset as props
        catalogName={catalogName ?? ''} // provides catalog name of the dataset as props
        schemaName={schemaName ?? ''} // provides schema name of the dataset as props
        datasetName={datasetName} // provides name of the dataset as props
        datasetType={datasetMetadata?.dataset_type ?? ''} // provides type of the dataset as props
        onOpenChange={(open) => setIsSuggestionOpen(open)} // provide the state handler to handle opening and closing of the drawer
      />

      {/* Add Rule Drawer - allows users to add a new rule to the dataset */}
      <AddRuleDrawer
        // provide appropriate props required for the component 
        open={isDrawerOpen} // provide this as props to handle opening and closing of the drawer
        businessUnit={businessUnit} // provides business unit of the dataset as props
        catalogName={catalogName ?? ''} // provides catalog name of the dataset as props
        schemaName={schemaName ?? ''} // provides schema name of the dataset as props
        datasetName={datasetName} // provides name of the dataset as props
        datasetType={datasetMetadata?.dataset_type ?? ''} // provides type of the dataset as props
        columns={Columns} // send the column names list as props to select the columns on which rules can be applied
        onOpenChange={(open) => setIsDrawerOpen(open)} // provide the state handler to handle opening and closing of the drawer
      />

      <UpdateRuleDialog
        // provide appropriate props required for the component 
        open={isUpdateDialogOpen} // provide this as props to handle opening and closing of the dialog
        ruleToUpdate={ruleToUpdate} // provides rule data that needs to be updated
        onOpenChange={(open) => setIsUpdateDialogOpen(open)} // provide the state handler to handle opening and closing of the dialog
        setRuleToUpdate={(rule) => setRuleToUpdate(rule)} // used to set the updated data of the rule 
      />
      </>
      )}

    </div>
  );

}

