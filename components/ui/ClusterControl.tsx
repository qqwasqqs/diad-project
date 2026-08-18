/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 02 February 2026
  
  Purpose of the script:
    This component manages and monitors Databricks cluster status and provides
    users with controls to start clusters and view real-time cluster activity logs.
  
    Real-world example: Similar to how a server control panel shows you whether 
    servers are running, stopped, or starting - this shows the status of your 
    Databricks cluster (a group of computing resources that process data).

    Key features:
    - Start Cluster Button: Lets users start the cluster and shows status (e.g., "Starting...", "Cluster running").
    - Status Badge: Displays current cluster status with color and icon (e.g., green checkmark for running, red X for error).
    - Activity Drawer: A side panel that opens to show real-time logs of cluster startup events (e.g., "Initializing worker nodes...").
    - Error Handling: Displays error messages if cluster fails to start or if there are connection issues.
    - Auto-Refresh: Automatically updates status and logs in real-time using server-sent events (SSE) from the backend.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/**
 * react
 *  - What is it: A JavaScript library for building user interfaces, developed by Facebook.
 *  - Why we use it: It allows us to create reusable UI components and manage complex state in a predictable way. We use React hooks like useState and useEffect to handle component state and side effects.
 */
import { useState, useEffect, useRef, useCallback, memo } from "react";
// - useState: Hook to manage component state (e.g., storing cluster status)
// - useEffect: Hook to run code when component mounts or state changes
// - useRef: Hook to create references to DOM elements and persist values
// - useCallback: Hook to optimize functions by memoizing them
// - memo: Hook to prevent unnecessary component re-renders when props don't change

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, and styling utilities for consistent UI.
*/
import {
  Button, // Interactive button component for user actions
  Drawer, // Side panel that slides in from the edge of screen
  DrawerBody, // Container for content inside the drawer
  DrawerHeader, // Header section of the drawer with title
  DrawerHeaderTitle, // Title text displayed in drawer header
  Badge, // Small visual indicator with color and icon (e.g., "Running")
  Spinner, // Loading animation shown while waiting for data
  Text, // Styled text component for displaying information
  makeStyles, // Function to create consistent CSS-in-JS styling
  shorthands, // Utility for writing cleaner CSS (e.g., padding shorthand)
  tokens, // Design tokens (colors, spacing, fonts) for UI consistency
  Tooltip, // Hover popup showing helpful information
  Title3, // Large heading text component
} from "@fluentui/react-components";
// Microsoft's Fluent Design System components - professional UI building blocks

/*
  @fluentui/react-icons
    - What it is: A library of SVG icons that match Fluent UI design language.
    - Why used: Provides visual symbols for actions and statuses (e.g., play icon for start, checkmark for success).
*/
import {
  PlayRegular, // "Play" icon - for start/play action
  DismissRegular, // "X" icon - for close/dismiss action
  ArrowClockwise24Regular, // Circular arrow icon - for refresh/reload action
  CircleRegular, // Empty circle - for unknown/neutral status
  CheckmarkCircle24Regular, // Checkmark in circle - for success/running status
  ErrorCircle24Regular, // Error symbol in circle - for error/failure status
} from "@fluentui/react-icons";
// SVG icons from Microsoft's icon library for visual representation:

/**
 * @/lib/services/greatExpectationsService
 * - What it is: A custom service module that provides functions to interact with the Great Expectations API.
 * - Why used: This service abstracts away the API calls to check cluster status and start clusters, allowing our component to easily fetch data and trigger actions without worrying about the underlying API details.
 */
import { greatExpectationsService } from "@/lib/services/greatExpectationsService";
// Service for communicating with Great Expectations (data quality tool):
// This service provides API calls to check cluster status and start clusters

/**
 * @/lib/helper
 * - What it is: A helper module that contains utility functions for formatting and data manipulation.
 * - Why used: We use the formatDateTime function from this module to convert raw timestamp strings into human-readable date and time formats for display in the cluster activity logs.
 */
import { formatDateTime } from "@/lib/helper";
// Helper function to format timestamps into readable date/time strings:
// Example: converts "2026-02-13T10:30:00Z" to "Feb 13, 2026 10:30 AM"

//---------------------- Styling -------------------------//
// Using makeStyles hook to create CSS-in-JS styles. This keeps styles
// close to components and applies them only when component is used.

const useStyles = makeStyles({
  // Main container for the cluster control interface
  root: {
    display: "flex", // Use flexbox layout for flexible alignment
    flexDirection: "column", // Stack child elements vertically
    height: "100%", // Take full height of parent
    gap: tokens.spacingVerticalS, // Add small vertical spacing between elements
  },

  // Styling for the terminal/log display area (shows cluster events)
  terminal: {
    flexGrow: 1, // Grow to fill available space
    overflowY: "auto", // Allow vertical scrolling when content exceeds height
    backgroundColor: "#0d1117", // Very dark background color (like a command terminal)
    color: "#c9d1d9", // Light gray text color for contrast
    fontFamily: "Consolas, 'Courier New', monospace", // Monospace font like code editors
    fontSize: "13px", // Small but readable font size
    lineHeight: "1.5", // Space between lines for readability
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM), // Padding around content
    ...shorthands.borderRadius(tokens.borderRadiusMedium), // Slightly rounded corners
    position: "relative", // Positioning context for absolute positioned children
    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)", // Inner shadow to create depth effect
  },

  // Styling for individual log messages in the terminal
  message: {
    color: tokens.colorNeutralForeground2, // Neutral color for secondary text
    fontWeight: tokens.fontWeightBold, // Bold text for emphasis
    flex: 1, // Take all available space
  },

  // Styling for empty state (when no logs exist yet)
  emptyState: {
    display: "flex", // Use flexbox for centering
    flexDirection: "column", // Stack items vertically
    alignItems: "center", // Center items horizontally
    justifyContent: "center", // Center items vertically
    height: "100%", // Take full height of parent
    color: tokens.colorNeutralForeground3, // Slightly lighter gray for secondary content
    textAlign: "center", // Center align text
    gap: tokens.spacingVerticalS, // Small vertical spacing between elements
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// Configuration object that maps cluster statuses to their visual representations
// This eliminates repetition and makes it easy to modify status displays
const STATUS_CONFIG = {
  // Unknown status - shown when we haven't checked yet or can't determine status
  UNKNOWN: { color: "subtle", icon: <CircleRegular />, text: "Unknown" },

  // Pending status - cluster is queued to start
  PENDING: { color: "brand", icon: <Spinner size="tiny" />, text: "Starting" },

  // Starting status - cluster is initializing (can take minutes)
  STARTING: { color: "brand", icon: <Spinner size="tiny" />, text: "Starting" },

  // Running status - cluster is fully operational and ready to use
  RUNNING: {
    color: "success",
    icon: <CheckmarkCircle24Regular />,
    text: "Running",
  },

  // Terminating status - cluster is shutting down
  TERMINATING: {
    color: "severe",
    icon: <Spinner size="tiny" />,
    text: "Terminating",
  },

  // Terminated status - cluster is completely shut down
  TERMINATED: {
    color: "neutral",
    icon: <DismissRegular />,
    text: "Terminated",
  },

  // Error status - something went wrong
  ERROR: { color: "danger", icon: <ErrorCircle24Regular />, text: "Error" },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

// Type that represents any valid cluster status (the keys from STATUS_CONFIG)
// This ensures we only use valid status values throughout the component
type ClusterStatus = keyof typeof STATUS_CONFIG;

// Interface defining the structure of cluster events (log entries from the server)
interface ClusterEvent {
  cluster_id: string; // Unique identifier for the cluster
  timestamp: string; // When the event occurred (ISO format)
  type: string; // Event type (e.g., "startup", "error", "log")
  details?: Record<string, any>; // Additional event information (optional key-value pairs)
}

// Type defining the props this component accepts from its parent
type ClusterControlProps = {
  // Optional callback function to notify parent when cluster running status changes
  // If not provided, component uses a no-op function
  setIsClusterRunning?: (isRunning: boolean) => void;
};

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**  
  ClusterControl Component:
    - Purpose: Manages Databricks cluster status and provides UI for starting cluster and viewing logs.
    - Key features:
      - Start Cluster Button: Shows current status and allows user to start cluster.
      - Status Badge: Displays current cluster status with color and icon.
      - Activity Drawer: Side panel that shows real-time logs of cluster startup events.
    - Error Handling: Displays error messages if cluster fails to start or if there are connection issues.

  memo() prevents component from re-rendering if props haven't changed
  This improves performance when parent component re-renders but passes same props

  @param setIsClusterRunning: Optional callback function that parent component can provide to be notified when cluster running status changes. This allows parent to know when cluster is ready for operations.
  @returns JSX element that renders the cluster control interface.
*/
export const ClusterControl = memo(function ClusterControl({
  setIsClusterRunning = (isRunning: boolean) => {},
}: ClusterControlProps) {
  // Apply the styles created above to this component
  const styles = useStyles();

  // ────── STATE MANAGEMENT ──────────────────────────────────────────────────
  // All these useState hooks manage different aspects of the cluster control UI:

  // Controls visibility of the side drawer that shows cluster activity logs
  // Default: false (drawer is closed)
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Stores the current cluster status (e.g., "RUNNING", "STARTING", "ERROR")
  // Default: "UNKNOWN" (status hasn't been checked yet)
  const [status, setStatus] = useState<ClusterStatus>("UNKNOWN");

  // Tracks whether we're currently fetching cluster status from the API
  // Used to show "Checking status..." UI while waiting
  // Default: true (we check status when component first loads)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Tracks whether we've triggered cluster startup and are waiting for it to complete
  // Used to show "Starting cluster..." UI while waiting
  // Default: false (cluster isn't being started initially)
  const [isStartingCluster, setIsStartingCluster] = useState(false);

  // Stores array of cluster events (log entries) from the server
  // Each event shows something that happened during cluster startup
  // Example: {timestamp: "2026-02-13T10:30:00Z", type: "startup", details: {...}}
  // Default: [] (no events yet)
  const [events, setEvents] = useState<ClusterEvent[]>([]);

  // Stores any error message to display to the user
  // Example: "Failed to fetch cluster status" or "Connection lost"
  // Default: null (no error)
  const [error, setError] = useState<string | null>(null);

  // Tracks whether log terminal should automatically scroll to bottom for new events
  // Set to false if user manually scrolls up to see old logs
  // Default: true (automatically show latest logs)
  const [autoScroll, setAutoScroll] = useState(true);

  // ────── REFERENCES ────────────────────────────────────────────────────────
  // useRef keeps references to DOM elements and values that persist across renders:

  // Reference to the terminal/log display div (used for checking scroll position)
  const terminalRef = useRef<HTMLDivElement>(null);

  // Reference to a hidden div at the bottom of terminal (used for auto-scrolling)
  // When scrollIntoView is called on this, terminal scrolls to show latest content
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reference to EventSource connection (streams events from server)
  // EventSource is like a continuous connection that server can push updates through
  // Similar real-world example: A Slack connection that receives new messages instantly
  const eventSourceRef = useRef<EventSource | null>(null);

  // ────── UTILITY FUNCTIONS ──────────────────────────────────────────────────
  // These are helper functions defined with useCallback for performance optimization
  // useCallback prevents these functions from being recreated on every render

  // Function to scroll the terminal to the bottom (shows latest logs)
  // behavior: "auto" means scroll instantly (not smoothly)
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, []);

  // Function to check if user has scrolled to near the bottom of terminal
  // Returns true if less than 100px from bottom, false otherwise
  // This determines if we should auto-scroll when new logs arrive
  // Real-world: Like a chat app that only auto-scrolls if you're viewing latest messages
  const shouldAutoScroll = useCallback(() => {
    if (!terminalRef.current) return false;
    // scrollTop: how far down user has scrolled
    // scrollHeight: total height of content
    // clientHeight: visible height of terminal
    // Formula: if difference between end of content and current scroll position is < 100px,
    // user is near the bottom
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  // Function to fetch and update current cluster status
  // This calls the API to ask "Is the cluster running?"
  const refreshStatus = useCallback(async () => {
    // Show loading state while checking
    setIsCheckingStatus(true);
    try {
      // Call API to get cluster status
      const data = await greatExpectationsService.getDatabricksClusterStatus();
      // Extract status value, or use "UNKNOWN" if not available
      const newStatus = (data?.state as ClusterStatus) ?? "UNKNOWN";
      setStatus(newStatus);
      // Clear any previous errors since we got fresh data
      setError(null);
    } catch (err: any) {
      // If API call fails, display error message
      setError(err.message || "Failed to fetch cluster status");
      // Set status to ERROR to show error visual state
      setStatus("ERROR");
    } finally {
      // Stop showing loading state (runs regardless of success/failure)
      setIsCheckingStatus(false);
    }
  }, []);

  // ────── SIDE EFFECTS (useEffect) ───────────────────────────────────────────
  // useEffect runs code in response to state changes or component mounting

  // Effect: Check cluster status when component first loads
  // Empty dependency array [] means this runs only once on mount
  // Real-world: Like checking if your TV is on when you first enter the room
  useEffect(() => {
    refreshStatus();
  }, []);

  // Effect: Notify parent component when cluster running status changes
  // This enables parent to know whether cluster is ready for operations
  // Dependency array [status, setIsClusterRunning] means run when these change
  useEffect(() => {
    // If status is "RUNNING", tell parent the cluster is ready
    if (status === "RUNNING") {
      setIsClusterRunning(true);
    } else {
      // If status is anything else, tell parent cluster is NOT ready
      setIsClusterRunning(false);
    }
  }, [status, setIsClusterRunning]);

  // Effect: Set up real-time event streaming when drawer opens
  // This listens for cluster startup events and displays them in the log terminal
  // Complex effect with multiple event listeners and cleanup
  useEffect(() => {
    // If drawer is closed, close the event stream to save resources
    if (!drawerOpen) {
      // If there's an active EventSource connection, close it
      eventSourceRef.current?.close();
      // Clear the reference to this event source since it's no longer active
      eventSourceRef.current = null;
      // Return early since we don't need to set up event listeners when drawer is closed
      return;
    }

    // Open EventSource connection to get real-time cluster events from server
    // EventSource is a browser API for Server-Sent Events (SSE)
    // The server continuously sends events through /api/great-expectations/cluster/stream-events
    const es = new EventSource("/api/great-expectations/cluster/stream-events");
    eventSourceRef.current = es;

    // When connection opens, clear any previous error messages
    es.onopen = () => setError(null);

    // If connection has an error, show error message to user
    es.onerror = () => {
      setError("Connection lost. Attempting to reconnect...");
    };

    // Handler for "log" events (cluster startup messages)
    // These are typical progress messages like "Initializing worker nodes..."
    const onLog = (messageEvent: MessageEvent) => {
      try {
        // Parse the JSON event data from server
        const event = JSON.parse(messageEvent.data) as ClusterEvent;
        // Add new event to list of events (spread operator ... preserves existing events)
        setEvents((prev) => [...prev, event]);
        // If auto-scroll is on and user is near bottom, scroll to show new event
        if (autoScroll && shouldAutoScroll()) {
          // setTimeout delay of 20ms lets DOM update before scrolling
          setTimeout(scrollToBottom, 20);
        }
      } catch (error) {
        // If event data isn't valid JSON, log error to browser console
        console.error("Invalid log event:", error);
      }
    };

    // Handler for "success" event (cluster startup completed successfully)
    const onSuccess = () => {
      setStatus("RUNNING"); // Mark cluster as running
      setError(null); // Clear any error messages
      setIsStartingCluster(false); // Stop showing "starting" UI
      es.close(); // Close this event stream (startup is done)
    };

    // Handler for "error" event (cluster startup encountered an error)
    // Server sends this when something goes wrong during startup
    // Example error: "Node initialization failed on 3 machines"
    const onServerError = (messageEvent: MessageEvent) => {
      try {
        // Try to parse the error message sent by server
        const { message } = JSON.parse(messageEvent.data);
        // Display error message to user (with fallback message if not provided)
        setError(message || "Server reported an error");
      } catch {
        // If error data isn't valid JSON, show generic error message
        setError("Received malformed error event");
      }
      // Mark cluster in error state
      setStatus("ERROR");
      // Stop showing "starting" UI since startup failed
      setIsStartingCluster(false);
      // Close event stream (we're done trying to start)
      es.close();
    };

    // Register the event handlers so EventSource calls them when events arrive
    // es.addEventListener works like addEventListener but specifically for EventSource messages
    es.addEventListener("log", onLog); // Listen for "log" events
    es.addEventListener("success", onSuccess); // Listen for "success" events
    es.addEventListener("error", onServerError); // Listen for "error" events

    // Return cleanup function: called when effect re-runs or component unmounts
    // Cleanup is important to prevent memory leaks and disconnect the event source
    return () => {
      // Remove all event listeners to stop responding to server events
      es.removeEventListener("log", onLog);
      es.removeEventListener("success", onSuccess);
      es.removeEventListener("error", onServerError);
      // Close the EventSource connection to server
      es.close();
      // Clear the reference to this event source
      eventSourceRef.current = null;
    };
  }, [drawerOpen]); // Re-run effect when these change

  // ────── EVENT HANDLERS ─────────────────────────────────────────────────────
  // Handlers for user interactions (button clicks, etc.)

  // Function to handle when user clicks "Start Cluster" button
  const handleStartCluster = async () => {
    // If cluster is already running, don't try to start it again
    if (status === "RUNNING") return;

    // If cluster is already starting or pending, just open drawer to show progress
    // Don't call start API again since it's already being started
    if (status === "PENDING" || status === "STARTING") {
      setDrawerOpen(true); // Open drawer to show cluster activity
      setIsStartingCluster(true); // Show "starting" state
      return;
    }

    // Cluster is not running and not already starting, so send start request to API
    setIsStartingCluster(true); // Show "starting" UI immediately
    try {
      // Call API to start the Databricks cluster
      await greatExpectationsService.startDatabricksCluster();
      // Update status to STARTING (will change to RUNNING when server confirms)
      setStatus("STARTING");
      // Open drawer to show live startup logs
      setDrawerOpen(true);
      // Clear any previous error messages
      setError(null);
    } catch (err: any) {
      // If start request fails, display error to user
      setError(err.message || "Failed to start cluster");
    }
  };

  // ────── DERIVED STATE & BUTTON CONFIGURATION ───────────────────────────────
  // These variables determine what the button displays based on current status

  // Get the configuration (color, icon, text) for the current status
  // Falls back to "UNKNOWN" config if status isn't in STATUS_CONFIG
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNKNOWN;

  // Default button text and icon (if none of the conditions below match)
  let buttonText = "Start Cluster";
  // Default icon is "Play" to indicate starting action
  let buttonIcon = <PlayRegular />;
  // By default, the button is enabled (not disabled) since user can start cluster
  let isDisabled = false;

  // If we're currently checking cluster status, show loading state
  if (isCheckingStatus) {
    // While checking status, we show "Checking status..." with a spinner and disable the button
    buttonText = "Checking status…";
    // Spinner icon indicates we're waiting for data from the server
    buttonIcon = <Spinner size="tiny" appearance="inverted" />;
    // Disable the button while we're checking status to prevent user from clicking it
    isDisabled = true; // Disable button while checking
  }
  // If cluster is starting or already in starting state, show progress
  else if (isStartingCluster || status === "STARTING" || status === "PENDING") {
    // While cluster is starting, we show "Starting cluster..." with a spinner
    buttonText = "Starting cluster…";
    // Spinner icon indicates that the cluster is in the process of starting up
    buttonIcon = <Spinner size="tiny" appearance="inverted" />;
    isDisabled = false; // Allow clicking to open drawer to see progress
  }
  // If cluster is running, show success state and disable button
  else if (status === "RUNNING") {
    // When cluster is running, we show "Cluster running" with a checkmark icon and disable the button since no action is needed
    buttonText = "Cluster running";
    // Checkmark icon indicates success and that the cluster is ready for use
    buttonIcon = <CheckmarkCircle24Regular />;
    isDisabled = true; // Disable button since cluster is already running
  }

  // Function to generate helpful tooltip text based on current state
  // Tooltips appear when user hovers over the button with mouse
  // These explain what will happen when button is clicked
  const getTooltipContent = () => {
    // Show status message while checking current cluster status
    if (isCheckingStatus) {
      return "Fetching the current cluster status... This usually takes just a few seconds.";
    }
    // Show time estimate if cluster is starting
    if (isStartingCluster || status === "STARTING" || status === "PENDING") {
      return "Starting the Databricks cluster... This may take 3–5 minutes depending on size and configuration.";
    }
    // Show confirmation that cluster is ready
    if (status === "RUNNING") {
      return "The cluster is active and ready for use.";
    }
    // Show error state message directing user to logs
    if (status === "ERROR") {
      return "Cluster is in an error state — check the event log drawer for details.";
    }
    // Default message shown when cluster is stopped and ready to start
    return "Start the Databricks cluster to run Great Expectations jobs.";
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // JSX RENDER (HTML/Components)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      {/* START CLUSTER BUTTON - Shows status and allows user to start cluster */}
      {/* Tooltip displays helpful text when user hovers over button */}
      <Tooltip content={getTooltipContent()} relationship="label" withArrow>
        {/* Main button for starting cluster - appearance="primary" makes it blue and prominent */}
        {/* icon displays play icon, spinner, or checkmark depending on status */}
        {/* disabled prevents clicking if button is disabled (e.g., cluster already running) */}
        {/* onClick triggers handleStartCluster function when clicked */}
        <Button
          appearance="primary" // Makes the button visually stand out as the main action
          icon={buttonIcon} // Shows appropriate icon based on current status (play, spinner, checkmark)
          disabled={isDisabled} // Disables button when action is not allowed (e.g., while checking status or if cluster is already running)
          onClick={handleStartCluster} // Calls function to start cluster when button is clicked
        >
          {buttonText}
        </Button>
      </Tooltip>

      {/* CLUSTER ACTIVITY DRAWER - Side panel showing cluster startup logs and status */}
      {/* open: controls visibility | position="end" draws from right | size="medium" sets width */}
      {/* onOpenChange is callback that updates drawerOpen state when opened/closed */}
      <Drawer
        open={drawerOpen} // Controls whether the drawer is visible (true = open, false = closed)
        position="end" // Drawer slides in from the right side of the screen
        size="medium" // Sets the width of the drawer to a medium size (not too narrow, not full screen)
        onOpenChange={(_, { open }) => setDrawerOpen(open)}
      >
        {/* Drawer header with title and close button */}
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              // Close button - allows user to dismiss drawer
              // aria-label: accessibility label for screen readers
              <Button
                appearance="subtle" // Makes the button less visually prominent (just an icon)
                aria-label="Close" // Accessibility label for screen readers to describe the button's purpose
                icon={<DismissRegular />} // "X" icon indicates this button will close the drawer
                onClick={() => setDrawerOpen(false)} // When clicked, sets drawerOpen to false, which closes the drawer
              />
            }
          >
            {/* Large heading displayed in drawer header */}
            <Title3>Cluster Activity</Title3>
          </DrawerHeaderTitle>
        </DrawerHeader>

        {/* Main content area of drawer */}
        <DrawerBody className={styles.root}>
          {/* Row showing status badge and refresh button */}
          <div className="flex gap-4">
            {/* Badge shows current cluster status with color and icon from STATUS_CONFIG */}
            {/* size="extra-large" makes badge bigger for visibility */}
            {/* color determines badge color (success=green, danger=red, etc.) */}
            <Badge
              size="extra-large" // Makes the badge larger to stand out and clearly indicate status
              color={config.color as any} // Sets the badge color based on current status (e.g., green for running, red for error)
              icon={config.icon} // Displays the appropriate icon for the current status (e.g., checkmark for running, spinner for starting, error symbol for error)
            >
              {config.text}
            </Badge>

            {/* Show spinner while checking status, otherwise show refresh button */}
            {isCheckingStatus ? (
              // Loading spinner - shown while fetching current cluster status
              <Spinner size="tiny" label="Loading status..." />
            ) : (
              // Refresh button - allows user to manually check cluster status
              <Tooltip content="Refresh status" relationship="label">
                <Button
                  icon={<ArrowClockwise24Regular />} // Circular arrow icon indicates this button will refresh/reload the status
                  appearance="subtle" // Makes the button less visually prominent since it's a secondary action
                  onClick={refreshStatus} // When clicked, calls refreshStatus function to fetch the latest cluster status from the API
                >
                  Refresh
                </Button>
              </Tooltip>
            )}
          </div>

          {/* Error message display - only shown if error state is not null */}
          {error && (
            // Red error box (bg-red-600 = dark red background, p-4 = padding, rounded-lg = rounded corners)
            <div className="bg-red-600 p-4 rounded-lg">
              {/* Error message displayed in white bold text */}
              <Text weight="semibold" className="text-white">
                {error}
              </Text>
            </div>
          )}

          {/* Terminal/log display area showing cluster startup events */}
          {/* ref={terminalRef} lets us check scroll position */}
          {/* onScroll updates autoScroll state based on user scroll position */}
          <div
            ref={terminalRef} // Reference to this div allows us to check how far the user has scrolled and determine if we should auto-scroll when new logs arrive
            className={styles.terminal} // Applies terminal styling (dark background, monospace font, padding, etc.)
            onScroll={() => setAutoScroll(shouldAutoScroll())}
            // When user scrolls, we check if they're near the bottom. If they are, we keep autoScroll on so new logs will scroll into view. If they scroll up away from the bottom, we turn autoScroll off so they can read old logs without being pulled back down by new ones.
          >
            {/* Show empty state or list of events depending on whether events exist */}
            {events.length === 0 ? (
              // Empty state shown when no events yet
              <div className={styles.emptyState}>
                <Text size={400}>
                  {/* Show appropriate message based on error state */}
                  {error
                    ? "Connection issue..."
                    : "Waiting for cluster events..."}
                </Text>
                {/* Show loading spinner if cluster startup is in progress */}
                {isStartingCluster && (
                  <Spinner size="tiny" label="Loading..." />
                )}
              </div>
            ) : (
              // Display each cluster event as a log entry
              // map() iterates through events array and creates visual elements for each
              events.map((ev, idx) => (
                // Container for each event log entry
                // key combines timestamp and index to uniquely identify each item for React
                <div key={`${ev.timestamp}-${idx}`}>
                  {/* Event header showing timestamp and event type */}
                  {/* formatDateTime converts ISO timestamp to readable format (e.g., "Feb 13, 2026 10:30") */}
                  {/* .toUpperCase() converts event type to all capital letters */}
                  <Text className="text-neutral-foreground-1" weight="bold">
                    [{formatDateTime(ev.timestamp)}] {ev.type.toUpperCase()}:
                  </Text>
                  {/* Event details formatted as JSON with 2-space indentation for readability */}
                  {/* ?? {} provides empty object if details is undefined */}
                  {/* JSON.stringify(obj, null, 2) = convert obj to formatted text string */}
                  <div className={styles.message}>
                    {JSON.stringify(ev.details ?? {}, null, 2)}
                  </div>
                </div>
              ))
            )}

            {/* Loading spinner shown at bottom while cluster is starting and events exist */}
            {/* mt-2 = margin-top spacing, only shown if both conditions true */}
            {isStartingCluster && events?.length !== 0 && (
              <Spinner className="mt-2" size="tiny" label="Loading..." />
            )}

            {/* Hidden div at bottom - used as target for auto-scrolling */}
            {/* ref={bottomRef} lets scrollToBottom() function scroll to this element */}
            {/* When scrollIntoView() is called on this, terminal shows latest logs */}
            <div ref={bottomRef} />
          </div>
        </DrawerBody>
      </Drawer>
    </>
  );
});
