/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 26 December 2025
  Purpose of the script: 
    This script implements a reusable and highly configurable DataGrid component
    for the Teva Data Integrity Automation Dashboard. 

    Main features:
    - Renders tabular data with configurable columns.
    - Supports loading skeletons while fetching data.
    - Handles pagination with customizable page size.
    - Supports copy-to-clipboard for cells.
    - Handles long text truncation with "Show more/less".
    - Can parse and display JSON strings in an expandable key-value table format.
    - Provides a consistent UI using Fluent UI design tokens.
*/

//---------------------- Imports and Dependencies -------------------------//
/*  
  @/hooks/useToast
    - What it is: A local hook that exposes a `showToast` helper for brief notifications.
    - Why used: To show success/error messages to the user when copying to clipboard or other actions.
*/
import { useGlobalToast } from "@/hooks/useToast";
/*  
  @fluentui/react-components
    - What it is: Fluent UI's core React component library (Table, Button, tokens, etc.).
    - Why used: Provides consistent, accessible UI primitives used across the dashboard.
*/
import {
  Button, // Button component for copy and toggle actions
  makeStyles, // Fluent UI styling hook
  Table, // Table component for rendering tabular data
  TableBody, // Table body container
  TableCell, // Individual table cell
  TableHeader, // Table header container
  TableHeaderCell, // Individual header cell
  TableRow, // Individual table row
  tokens, // Fluent UI design tokens for consistent styling
  Text, // Typography component for text rendering
  Skeleton, // Skeleton component for loading state
  SkeletonItem, // Individual skeleton placeholder
  Select, // Dropdown select component for page size
  Input, // Input component for page number entry
  Label, // Label component for form elements
} from "@fluentui/react-components";
/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon components (chevrons, copy, checkmark).
    - Why used: Small, semantic icons used in pagination and copy actions for clarity.
*/
import {
  Checkmark16Filled, // Checkmark icon for success states
  Copy16Regular, // Copy icon for clipboard actions
  ChevronLeft20Filled, // Left chevron for pagination
  ChevronRight20Filled, // Right chevron for pagination
  ChevronDoubleLeft20Filled, // Double left chevron for pagination
  ChevronDoubleRight20Filled, // Double right chevron for pagination
} from "@fluentui/react-icons";
/*  
  react
    - What it is: The React library providing hooks and types used in this file.
    - Why used: Core framework for building this interactive component.
*/
import { FC, useState, useMemo } from "react";

//---------------------- Styles using Fluent UI tokens --------------------//
const useDataGridStyles = makeStyles({
  // Root container styling for the entire DataGrid component
  root: {
    // Light neutral background color for the main container
    backgroundColor: tokens.colorNeutralBackground3,
    // Rounded corners using Fluent UI's large border radius token
    borderRadius: tokens.borderRadiusLarge,
    // Subtle shadow effect to add depth and separation from the page
    boxShadow: tokens.shadow4,
    // Top margin spacing between the grid and elements above it
    marginTop: tokens.spacingVerticalM,
  },
  // Header row styling
  header: {
    // Slightly lighter background to distinguish header from data rows
    backgroundColor: tokens.colorNeutralBackground1,
  },
  // Individual header cell styling
  headerCell: {
    // Bold text weight to emphasize column titles
    fontWeight: tokens.fontWeightBold,
    // Darker text color for better contrast and readability
    color: tokens.colorNeutralForeground1,
    // Standard font size for header text
    fontSize: tokens.fontSizeBase200,
  },
  // Data row styling
  row: {
    // Default text color for row content
    color: tokens.colorNeutralForeground2,
    // Hover effect to provide visual feedback when user hovers over a row
    "&:hover": {
      // Light background on hover
      backgroundColor: tokens.colorNeutralBackground1,
      // Darker text color on hover for better contrast
      color: tokens.colorNeutralForeground1,
    },
    // Underline all anchor links within table cells
    "& > td a": {
      textDecorationLine: "underline",
    },
    // Remove bottom border from the last row to clean up the table appearance
    "&:last-child": {
      borderBottom: "none",
    },
  },
  // Individual cell styling
  cell: {
    // Allow text to wrap to multiple lines instead of overflowing
    whiteSpace: "normal",
    // Break long words at any character to prevent overflow
    wordBreak: "break-word",
    // Wrap overflow text to the next line
    overflowWrap: "break-word",
    // Enable hyphenation for better text wrapping
    hyphens: "auto",
    // Style for links within cells on hover
    "& a:hover": {
      // Slightly darker color when hovering over links
      color: tokens.colorNeutralForeground3Hover,
    },
  },
  // Styling for the "no data" message cell
  noData: {
    // Center align the text
    textAlign: "center",
    // Muted text color for empty state message
    color: tokens.colorNeutralForeground2,
  },
  // Pagination footer container styling
  pagination: {
    // Use flexbox for layout
    display: "flex",
    // Vertically center all pagination elements
    alignItems: "center",
    // Distribute pagination info to left and controls to right
    justifyContent: "space-between",
    // Add padding around the pagination area
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXXL}`,
    // Top border to separate pagination from the table above
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    // Light background matching the header
    backgroundColor: tokens.colorNeutralBackground1,
    // Allow pagination elements to wrap on smaller screens
    flexWrap: "wrap",
    // Spacing between wrapped pagination elements
    gap: tokens.spacingHorizontalM,
  },
  // Text showing the current data range (e.g., "Showing 1-10 of 100")
  paginationInfo: {
    // Muted text color for secondary information
    color: tokens.colorNeutralForeground2,
    // Standard font size for pagination text
    fontSize: tokens.fontSizeBase200,
  },
  // Container for pagination control buttons
  pageControls: {
    // Use flexbox for button alignment
    display: "flex",
    // Vertically center the buttons
    alignItems: "center",
    // Small gap between pagination buttons
    gap: tokens.spacingHorizontalS,
  },
  // Input field for direct page number entry
  pageInput: {
    // Fixed width to accommodate page numbers
    width: "60px",
  },
  // Styling for the "Key" column in the JSON expansion table
  jsonKeyCell: {
    // Standard font size for JSON keys
    fontSize: tokens.fontSizeBase200,
    // Allocate 30% of the table width to the key column
    width: "30%",
  },
  // Styling for the "Value" column in the JSON expansion table
  jsonValueCell: {
    // Standard font size for JSON values
    fontSize: tokens.fontSizeBase200,
    // Break long JSON values to prevent horizontal overflow
    wordBreak: "break-word",
  },
  // Container for truncated text with "Show more/less" functionality
  truncatedText: {
    // Maximum height before scrolling within the cell
    maxHeight: "80px",
    // Show scrollbar when content exceeds max height
    overflowY: "auto",
  },
});

//---------------------- Column Configuration Interface ------------------//
export interface ColumnConfig<T> {
  /** Key of the property in the data row */
  key: keyof T;

  /** Column header label */
  label: string;

  /** Optional column width */
  width?: string;

  /** Optional header alignment */
  headerAlign?: "left" | "center" | "right";

  /** Optional cell text alignment */
  align?: "left" | "center" | "right";

  /** Enable copy-to-clipboard for this column */
  copyable?: boolean;

  /** Enable "Show more/less" truncation for long text */
  showMore?: boolean;

  /** Enable JSON string expansion for this column */
  expandableJson?: boolean;

  /** Optional custom render function for the column */
  // /**
  //  * Example:
  //  * You can define a custom `render` function for a column to display HTML elements or custom React components 
  //  * inside a table cell. For example, using the `render` function to display a clickable link inside the table cell:
  //  *
  //  * ```tsx
  //  * render: (value: any, row: T, index: number) => {
  //  *   // For each row, we render a link based on the value of the cell
  //  *   return (
  //  *     <Link
  //  *       href={`${DATA_QUALITY_DASHBOARD_SUMMARY_VIEW_ROUTE}/l1-business-unit/${value}`}
  //  *       target="_blank" // Opens the link in a new tab
  //  *       rel="noopener noreferrer" // For security purposes
  //  *     >
  //  *       {value} // Display the value as clickable text */
  // *     </Link>
  // *   );
  // * }
  // * ```
  // * In this example:
  // * - `value` represents the data from the column cell.
  // * - `row` contains the full data for the row.
  // * - `index` is the position of the row in the dataset.
  // *
  // * This custom render will create a clickable link inside the cell, where the link URL is dynamically built based on the column's value.
  // */
  render?: (value: any, row: T, index: number) => React.ReactNode;

  /** Optional function to transform the raw value before rendering */
  getValue?: (value: any, row: T, index: number) => any;

  /** Enable sorting for this column */
  sortable?: boolean, // When true, users can sort the table by this column.

  /** Optional comparison function for sorting */
  /** 
   * Example:
   * You can define a custom `compare` function for a column to implement custom sorting logic.
   * For example, the `compare` function below sorts the rows based on numeric values in a column,
   * but in descending order (larger values appear first).
   *
   * ```tsx
   * compare: (rowA: T, rowB: T) => {
   *   const valueA = rowA[columnKey]; // Extract the value from the column in rowA
   *   const valueB = rowB[columnKey]; // Extract the value from the column in rowB
   *
   *   // Compare the values in descending order
   *   if (valueA > valueB) return -1;  // Larger values come first (descending)
   *   if (valueA < valueB) return 1;   // Smaller values come after (descending)
   *   return 0;  // Values are equal
   * }
   * ```
   * In this example:
   * - `columnKey` represents the key for the column being sorted.
   * - The `compare` function returns `-1`, `1`, or `0` to indicate whether rowA should come before, after, or remain the same as rowB based on the sorting logic.
   * - This `compare` function sorts values in descending order.
   */
  compare?: (rowA: T, rowB: T) => number;
}

//---------------------- DataGrid Props Interface ------------------------//
interface DataGridProps {
  columns: ColumnConfig<any>[]; // List of column configurations
  data: any[]; // Array of data rows
  size?: "small" | "medium" | "extra-small"; // Table size
  loading?: boolean; // Flag to show loading skeletons
  loadingRows?: number; // Number of skeleton rows to display
  pageSizeOptions?: number[]; // Dropdown options for page size
  defaultPageSize?: number; // Default page size
}

//---------------------- Skeleton Row Component --------------------------//
/**
 * Renders a single row of skeleton placeholders while data is loading.
 * @param columns - Column configuration array to determine the number of cells
 * @returns JSX.Element representing a skeleton row
 */
const DataGridSkeletonRow: FC<{ columns: ColumnConfig<any>[] }> = ({
  columns,
}) => {
  // Get styles for the DataGrid component
  const styles = useDataGridStyles();
  return (
    // Table row with skeleton cells
    <TableRow className={styles.row}>
      {/* Skeleton cells for each column */}
      {columns.map((_, index) => (
        // Individual skeleton cell
        <TableCell key={index} className={styles.cell}>
          {/* Skeleton placeholder for cell content */}
          <Skeleton>
            {/* Skeleton item for cell content */}
            <SkeletonItem shape="rectangle" style={{ height: 20 }} />
          </Skeleton>
        </TableCell>
      ))}
    </TableRow>
  );
};

//---------------------- Main DataGrid Component -------------------------//
/**
 * DataGrid Component
 * Renders tabular data with pagination, copy-to-clipboard, JSON expansion, and long text truncation.
 *
 * @param props - DataGridProps
 * @example
 * <DataGrid
 *   columns={[{ key: 'id', label: 'ID', copyable: true }]}
 *   data={[{ id: '123' }, { id: '456' }]}
 * />
 */
export const DataGrid: FC<DataGridProps> = ({
  columns, // Column configurations
  data, // Data rows
  size, // Table size
  loading = false, // Loading state flag
  loadingRows = 3, // Number of skeleton rows to show when loading
  pageSizeOptions = [5, 10, 25, 50, 100], // Page size dropdown options
  defaultPageSize = 5, // Default number of rows per page
}) => {
  // Get styles for the DataGrid component
  const styles = useDataGridStyles();
  // Get the global toast notification function
  const { showToast } = useGlobalToast();

  //---------------------- State Management ---------------------------//
  // Current active page in pagination
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Number of rows to show per page
  const [rowsPerPage, setRowsPerPage] = useState<number>(defaultPageSize);

  // Stores which cells are expanded for "Show more/less" or JSON display
  const [expandedCells, setExpandedCells] = useState<
    Record<number, Record<string, boolean>>
  >({});

  // Tracks which row was last copied
  const [lastCopiedRowIndex, setLastCopiedRowIndex] = useState<number | null>(
    null
  );

  // State to track the column currently being sorted. It's initially undefined (no sorting).
  const [activeSortColumn, setActiveSortColumn] = useState<string | undefined>(undefined);

  // State to track the sorting direction. Default is ascending.
  const [currentSortDirection, setCurrentSortDirection] = useState<'ascending' | 'descending'>('ascending');

  /**
   * Handles the sorting logic when a column header is clicked.
   * 
   * @param columnKey - The key of the column to sort by.
   * If the column is already being sorted, it toggles the sort direction.
   * Otherwise, it sets the new column and defaults to ascending order.
   */
  const handleColumnSort = (columnKey: string) => {
    if (activeSortColumn === columnKey) {
      // If the same column is already being sorted, toggle the sort direction.
      setCurrentSortDirection(prevDirection =>
        prevDirection === 'ascending' ? 'descending' : 'ascending'
      );
    } else {
      // If a new column is clicked, set it as the active sort column and default to ascending.
      setActiveSortColumn(columnKey);
      setCurrentSortDirection('ascending');
    }
  };

  /**
   * Memoized function to sort the data based on the selected column and direction.
   * 
   * @returns The sorted data based on the column and direction.
   */
  const sortedData = useMemo(() => {
    // If no column is selected to sort, return the original data.
    if (!activeSortColumn) return data;

    // Find the column definition based on the active sort column key.
    const columnDefinition = columns.find((column) => column.key === activeSortColumn);

    // Defensive check: if no column definition is found, return the data as-is.
    if (!columnDefinition) return data;

    // Check if a custom `compare` function is provided for sorting.
    if (!columnDefinition?.compare) {
      // If no custom compare function is provided, use a default comparison.

      return [...data].sort((rowA, rowB) => {
        let valueA = rowA[activeSortColumn]; // Get the value for sorting from rowA
        let valueB = rowB[activeSortColumn]; // Get the value for sorting from rowB

        // Handle null or undefined values by putting them at the end of the sorted list.
        if (valueA == null) return 1;  // Consider null/undefined as greater
        if (valueB == null) return -1; // Consider null/undefined as smaller

        // Optionally, perform a case-insensitive comparison if the values are strings.
        if (typeof valueA === 'string') {
          valueA = valueA.toLowerCase();
          valueB = (valueB as string).toLowerCase();
        }

        // Compare the values and return the result based on the sort direction.
        if (valueA < valueB) return currentSortDirection === 'ascending' ? -1 : 1;  // Ascending: smaller values first
        if (valueA > valueB) return currentSortDirection === 'ascending' ? 1 : -1;  // Descending: larger values first
        return 0;  // If values are equal, return 0 to maintain their order
      });
    }

    // If the `compare` function is provided, use it to sort the rows.
    return [...data].sort((rowA, rowB) => {
      if (columnDefinition.compare) {
        // Multiply by -1 or 1 depending on sort direction
        return columnDefinition.compare(rowA, rowB) * (currentSortDirection === 'ascending' ? -1 : 1);
      }
      return 0;  // Fallback in case `compare` is unexpectedly undefined
    });
  }, [data, activeSortColumn, currentSortDirection, columns]); // Dependencies for memoization


  //---------------------- Memoized Paginated Data --------------------//
  const paginatedData = useMemo(() => {
    // Calculate start and end indices for slicing the data array
    const startIndex = (currentPage - 1) * rowsPerPage;
    // Slice the data array to get only the rows for the current page
    const endIndex = startIndex + rowsPerPage;
    // Return the sliced data for the current page
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, rowsPerPage]); // Recompute when data, currentPage, or rowsPerPage change

  // Total number of pages based on data length and rows per page
  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  // Calculate the range of items currently being displayed
  const startItemIndex =
    data.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  // Ensure end index does not exceed total data length
  const endItemIndex = Math.min(currentPage * rowsPerPage, data.length);

  // Ensure current page is within bounds
  if (currentPage > totalPages && totalPages > 0) {
    // If current page exceeds total pages, reset to last page
    setCurrentPage(totalPages);
  }

  //---------------------- Event Handlers -----------------------------//
  /**
   * Copies a text value to clipboard and shows a toast notification.
   * @param text - Text to copy
   * @param rowIndex - Row index of the copied cell
   */
  const handleCopyToClipboard = async (text: string, rowIndex: number) => {
    try {
      // Use the Clipboard API to write text to the clipboard
      await navigator.clipboard.writeText(text);
      // Update state to reflect the last copied row
      setLastCopiedRowIndex(rowIndex);
      // Show success toast notification
      showToast("Copied to clipboard!");
      // Reset the last copied state after 1.5 seconds
      setTimeout(() => setLastCopiedRowIndex(null), 1500);
    } catch {
      // Show error toast notification if copy fails
      showToast("Copy failed", "error");
    }
  };

  /**
   * Toggles expanded state of a specific cell for "Show more/less" or JSON display.
   * @param rowIndex - Index of the row
   * @param columnKey - Key of the column
   */
  const toggleCellExpansion = (rowIndex: number, columnKey: string) => {
    // Toggle the expanded state for the specified cell
    setExpandedCells((prev) => ({
      ...prev, // preserve existing expanded states
      [rowIndex]: {
        ...(prev[rowIndex] || {}), // preserve existing column states for the row
        [columnKey]: !(prev[rowIndex]?.[columnKey] ?? false), // toggle the specific cell
      },
    }));
  };

  /**
   * Navigates to a specific page in pagination.
   * @param pageNumber - Target page number
   */
  const goToPage = (pageNumber: number) => {
    // Ensure the target page number is within valid bounds
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      // Update the current page state
      setCurrentPage(pageNumber);
    }
  };

  /**
   * Handles manual page input changes.
   * @param event - Change event from input
   */
  const handlePageInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // Parse the input value to an integer
    const pageNumber = parseInt(event.target.value);
    // If the parsed page number is valid, navigate to that page
    if (!isNaN(pageNumber)) goToPage(pageNumber);
  };

  //---------------------- JSON Rendering -----------------------------//
  /**
   * Renders a nested JSON object as a table of key-value pairs.
   * @param jsonObject - The JSON object to render
   * @returns JSX.Element representing the JSON table
   */
  const renderJsonTable = (jsonObject: any): React.ReactNode => {
    // Array to hold flattened key-value pairs
    const rows: { key: string; value: any }[] = [];

    // Flatten nested JSON objects into key-value rows
    const flattenJson = (obj: any, parentKey: string = "") => {
      // Handle null or undefined values
      if (obj === null || obj === undefined) {
        // Push a null value row
        rows.push({ key: parentKey, value: "null" });
        // Exit recursion
        return;
      }

      // Handle arrays and objects recursively
      if (Array.isArray(obj)) {
        // Handle empty arrays
        if (obj.length === 0) rows.push({ key: parentKey, value: "[]" });
        // Recurse into each array item with indexed keys
        else
          obj.forEach((item, idx) => flattenJson(item, `${parentKey}[${idx}]`)); // Recurse into array items
      } else if (typeof obj === "object") {
        // Handle nested objects
        // Handle empty objects
        if (Object.keys(obj).length === 0)
          rows.push({ key: parentKey, value: "{}" }); // Push empty object row
        // Recurse into each property of the object
        else
          Object.entries(obj).forEach(([k, v]) => {
            // Construct new key path
            const newKey = parentKey ? `${parentKey}.${k}` : k;
            // Recurse into the property value
            flattenJson(v, newKey);
          });
      } else {
        // Base case: primitive value
        rows.push({ key: parentKey, value: String(obj) });
      }
    };
    // Start flattening from the root of the JSON object
    flattenJson(jsonObject);

    return (
      // Table to display key-value pairs
      <Table size="small">
        {/* Table header for key-value pairs */}
        <TableHeader>
          {/* Header row for key and value columns */}
          <TableRow>
            {/* Header cell for the key column */}
            <TableHeaderCell className={styles.headerCell}>Key</TableHeaderCell>
            {/* Header cell for the value column */}
            <TableHeaderCell className={styles.headerCell}>
              Value
            </TableHeaderCell>
          </TableRow>
        </TableHeader>
        {/* Table body for key-value pairs */}
        <TableBody>
          {/* Rows of key-value pairs */}
          {rows.map((row, index) => (
            // Individual table row for each key-value pair
            <TableRow key={index} className={styles.row}>
              {/* Key cell */}
              <TableCell className={styles.jsonKeyCell}>{row.key}</TableCell>
              {/* Value cell with truncated text */}
              <TableCell className={styles.jsonValueCell} title={row.value}>
                {row.value
                  ? row.value.slice(0, 80) +
                  (row.value.length > 80 ? "..." : "")
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  //---------------------- Cell Content Rendering ----------------------//
  /**
   * Renders a single cell's content based on column configuration.
   * Handles copyable cells, truncation, custom rendering, and JSON expansion.
   * @param column - Column configuration
   * @param cellValue - Value to render
   * @param row - Full row data
   * @param globalIndex - The position of this row within the entire data, starting from 0.
   *                      For example, if the data has 100 rows, `globalIndex` will range from 0 to 99.
   *                      It represents the row's overall order in the full list of data,
   *                      which can be useful for tasks like pagination or keeping track of the row's place.
   * @param columnKey - Key of the column
   * @returns JSX.Element representing the cell content
   */
  const renderCellContent = (
    column: ColumnConfig<any>, // Column configuration
    cellValue: any, // Value to render
    row: any, // Full row data
    globalIndex: number, // Absolute index in data
    columnKey: string // Key of the column
  ) => {
    // Determine if the column is marked as expandable JSON
    const isJsonExpandable =
      column.expandableJson && typeof cellValue === "string";
    // Initialize variables for parsed JSON and validity
    let parsedJson: any = null;
    // Initialize validity flag
    let isValidJson = false;

    // Parse JSON string if applicable
    if (isJsonExpandable) {
      try {
        // Attempt to parse the JSON string
        parsedJson = JSON.parse(cellValue);
        // Mark as valid JSON if parsing succeeds
        isValidJson = true;
      } catch {
        // If parsing fails, mark as invalid JSON
        isValidJson = false;
      }
    }

    // Determine if the cell content should be truncated
    const shouldTruncate =
      column.showMore && typeof cellValue === "string" && cellValue.length > 80;
    // Check if the cell is currently expanded
    const isExpanded = expandedCells[globalIndex]?.[columnKey] ?? false;

    // Copy button: Only render when the column is marked copyable and the cell has a value other than '-' (placeholder)
    const copyButton = column.copyable && cellValue !== "-" && (
      <Button
        /* subtle appearance keeps the button low-visual-weight next to cell text */
        appearance="subtle"
        /* small size to fit within table cell */
        size="small"
        /* swap icon to a check when recently copied to provide feedback */
        icon={
          lastCopiedRowIndex === globalIndex ? (
            <Checkmark16Filled />
          ) : (
            <Copy16Regular />
          )
        }
        /* clicking copies the displayed text to the system clipboard */
        onClick={() => handleCopyToClipboard(String(cellValue), globalIndex)}
        /* accessibility label for screen readers */
        aria-label="Copy to clipboard"
      />
    );

    // Custom render function overrides default behavior
    if (column.render) {
      return (
        <div className="flex items-center gap-1">
          {/* optional copy button (may be undefined) shown left of custom content */}
          {copyButton}
          {/* call the column-specific render function to produce the cell's content */}
          {column.render(cellValue, row, globalIndex)}
        </div>
      );
    }

    // JSON expandable rendering
    if (isJsonExpandable && isValidJson) {
      // Create a short preview of the JSON string when collapsed
      const previewText =
        cellValue.slice(0, 120) + (cellValue.length > 120 ? "..." : "");
      return (
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1">
            {/* copy icon and a short preview of the JSON string when collapsed */}
            {copyButton}
            {!isExpanded && <Text size={200}>{previewText}</Text>}
          </div>
          {/* when expanded, render the parsed JSON as a key/value table for readability */}
          {isExpanded && <div>{renderJsonTable(parsedJson)}</div>}
          {/* toggle button to expand/collapse the JSON view */}
          <Button
            appearance="subtle" // subtle appearance for low visual weight
            size="small" // small size to fit in table cell
            onClick={() => toggleCellExpansion(globalIndex, columnKey)} // toggle expansion state
          >
            {isExpanded ? "Show less" : "Show more"}
          </Button>
        </div>
      );
    }

    // Generic truncation for long text
    if (shouldTruncate) {
      // Determine the text to display based on expansion state
      const displayText = isExpanded
        ? cellValue
        : cellValue.slice(0, 80) + "...";
      return (
        <div className="flex items-center gap-1">
          {/* copy icon to the left of truncated text */}
          {copyButton}
          <div className={styles.truncatedText}>
            {/* truncated or full text depending on expansion state */}
            <Text size={200}>{displayText}</Text>
          </div>
          {/* button to toggle between truncated and full view */}
          <Button
            appearance="subtle" // subtle appearance for low visual weight
            size="small" // small size to fit in table cell
            onClick={() => toggleCellExpansion(globalIndex, columnKey)} // toggle expansion state
          >
            {isExpanded ? "Show less" : "Show more"}
          </Button>
        </div>
      );
    } else if (column.showMore) {
      // If showMore is enabled but content is short, just show the full text
      return (
        <div className="flex items-center gap-1">
          {/* copy icon to the left of truncated text */}
          {copyButton}
          {/* simple, non-truncated text when showMore is enabled but content is short */}
          <Text size={200}>{cellValue ?? "-"}</Text>
        </div>
      );
    }

    // Default rendering
    return (
      <div className="flex items-center gap-1">
        {/* copy icon to the left of cell value */}
        {copyButton}
        {/* cell value */}
        {cellValue ?? "-"}
      </div>
    );
  };

  //---------------------- Render Loading Skeleton ----------------------//
  if (loading) {
    return (
      // Table component with a `className` for custom styles and a `size` prop to define the table size (e.g., small, medium, large)
      <Table className={styles.root} size={size}>

        {/* TableHeader contains the column headers */}
        <TableHeader>
          <TableRow className={styles.header}>
            {/* Map over the `columns` array to render each header cell dynamically */}
            {columns.map((col, idx) => (
              <TableHeaderCell
                key={idx}  // `key` prop for each header cell to uniquely identify them
                className={styles.headerCell}  // Custom styles for the header cell
                /* Inline styles: `width` is set based on the column definition, and `justifyContent` aligns the text as per the column settings */
                style={{ width: col.width, justifyContent: col.headerAlign }}
              >
                {/* `col.label` renders the human-readable name of the column in the header */}
                {col.label}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>

        {/* TableBody holds the actual data rows */}
        <TableBody>
          {/* Map over `loadingRows` to render a skeleton loader for each row while data is loading */}
          {Array.from({ length: loadingRows }).map((_, idx) => (
            // Render a skeleton row for each loading row 
            <DataGridSkeletonRow key={idx} columns={columns} />
          ))}
        </TableBody>
      </Table>
    );
  }

  //---------------------- Render Main Table ---------------------------//
  return (
    <div className={styles.root}>
      {/* Table component with `sortable` to enable sorting by column header and `size` to define its size (e.g., small, medium, large). */}
      <Table sortable size={size}>

        {/* TableHeader defines the header row */}
        <TableHeader>
          <TableRow className={styles.header}>
            {/* Dynamically map through each column in the columns array to render header cells */}
            {columns.map((col, idx) => (
              <TableHeaderCell
                sortDirection={activeSortColumn === col.key ? currentSortDirection : undefined} // Sets sort direction if the column is the currently sorted one
                onClick={col.sortable ? () => handleColumnSort(col.key as string) : undefined} // Handles sorting when a sortable column header is clicked
                key={idx}  // `key` helps React identify which items have changed, are added, or are removed
                className={styles.headerCell} // Apply custom styles to the header cell
                style={{ width: col.width, justifyContent: col.headerAlign }} // Inline styles for width and header text alignment
              >
                {/* Render the label (header name) for each column */}
                {col.label}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>

        {/* TableBody contains the actual data rows */}
        <TableBody>
          {/* If no data exists, show a 'No data available' message */}
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className={styles.noData}>
                {/* Display message if no data is available */}
                <Text size={300}>No data available</Text>
              </TableCell>
            </TableRow>
          ) : (
            // If there is data, map over paginatedData and render each row
            paginatedData.map((row, rowIndex) => {
              // Calculate the global index for each row based on the current page and row index
              const globalIndex = (currentPage - 1) * rowsPerPage + rowIndex;
              return (
                <TableRow key={globalIndex} className={styles.row}>
                  {/* Loop through columns to render each cell for the row */}
                  {columns.map((col, colIndex) => {
                    const rawValue = row[col.key]; // Get the raw data value for the current column
                    // Check if a custom value function (`getValue`) exists; if so, apply it
                    const cellValue = col.getValue
                      ? col.getValue(rawValue, row, globalIndex) // Apply transformation function
                      : rawValue ?? "-"; // If there's no value, display a hyphen ("-")
                    return (
                      <TableCell
                        key={colIndex}  // `key` for identifying the cell in the loop
                        className={styles.cell}  // Custom styles for table cells
                        style={{ width: col.width, textAlign: col.align }}  // Inline styles for column width and alignment
                      >
                        {/* Call `renderCellContent` to handle how the cell content is displayed (e.g., truncation, copy button, etc.) */}
                        {renderCellContent(
                          col,
                          cellValue,
                          row,
                          globalIndex,
                          String(col.key)
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination footer: displays pagination controls and current page info */}
      {data.length > 0 && (
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            {/* Show current range of items and total items */}
            Showing {startItemIndex}–{endItemIndex} of {data?.length?.toLocaleString()} results
          </div>

          {/* Container for rows per page selector and page controls */}
          <div className="flex items-center gap-6">

            {/* Rows per page selection dropdown */}
            <div className="flex items-center gap-3">
              <Label size="small">Rows per page</Label>  {/* Label for the rows per page selector */}
              <Select
                value={rowsPerPage}  // `value` prop binds the select dropdown to `rowsPerPage`
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));  // Update rows per page value
                  setCurrentPage(1);  // Reset to first page when rows per page changes
                }}
                size="small"  // `size` defines the size of the select component (small in this case)
              >
                {/* Map through the `pageSizeOptions` array to generate options for rows per page */}
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}  {/* Display the option value in the dropdown */}
                  </option>
                ))}
              </Select>
            </div>

            {/* Pagination controls for navigating between pages */}
            <div className={styles.pageControls}>

              {/* First page button */}
              <Button
                icon={<ChevronDoubleLeft20Filled />}  // Left arrow icon for first page
                appearance="subtle"  // `appearance` sets the style of the button (subtle here)
                size="small"  // `size` controls the button size (small)
                onClick={() => goToPage(1)}  // Navigates to the first page when clicked
                disabled={currentPage === 1}  // Disable if already on the first page
                aria-label="First page"  // Accessibility label for screen readers
              />

              {/* Previous page button */}
              <Button
                icon={<ChevronLeft20Filled />}  // Left arrow icon for previous page
                appearance="subtle"  // Button style (subtle)
                size="small"  // Button size
                onClick={() => goToPage(currentPage - 1)}  // Navigate to previous page
                disabled={currentPage === 1}  // Disable if already on the first page
                aria-label="Previous page"  // Accessibility label for screen readers
              />

              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600">Page</span>
                {/* Numeric input to allow users to directly enter the page number */}
                <Input
                  type="number"  // Input type is a number to allow direct page entry
                  value={`${currentPage}`}  // Current page value displayed
                  onChange={handlePageInputChange}  // Handle change in page input
                  className={styles.pageInput}  // Custom styles for the input
                  size="small"  // Small input size
                  min={1}  // Minimum page number (cannot go below 1)
                  max={totalPages}  // Maximum page number (cannot go above the total pages)
                />
                <span className="text-sm text-neutral-600">
                  of {totalPages?.toLocaleString()}  {/* Display the total number of pages */}
                </span>
              </div>

              {/* Next page button */}
              <Button
                icon={<ChevronRight20Filled />}  // Right arrow icon for next page
                appearance="subtle"  // Subtle appearance
                size="small"  // Small button size
                onClick={() => goToPage(currentPage + 1)}  // Navigate to the next page
                disabled={currentPage === totalPages}  // Disable if already on the last page
                aria-label="Next page"  // Accessibility label for next page button
              />

              {/* Last page button */}
              <Button
                icon={<ChevronDoubleRight20Filled />}  // Double right arrow for the last page
                appearance="subtle"  // Subtle appearance style
                size="small"  // Small button size
                onClick={() => goToPage(totalPages)}  // Navigate to the last page
                disabled={currentPage === totalPages}  // Disable if already on the last page
                aria-label="Last page"  // Accessibility label for last page button
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
