/**
 *
 * Project Name: Teva Data Integrity
 * Business Owner, Team: Keerthi Pusuloori
 * Script Author, Team: Radhe Raman Tiwari
 * Date: 02 February 2026
 *
 * Purpose of the script:
 *   This component displays a floating notification (toast) to users showing
 *   real-time status of Databricks notebook job runs. Similar to how Gmail
 *   shows "Sending email..." notifications in the corner of your screen,
 *   this shows job progress and completion status.
 *
 * Key Features:
 *  - Real-time updates: Uses EventSource to receive live status updates from the server as jobs run.
 *  - Persistent tracking: Stores job IDs in localStorage so it can restore tracking if user refreshes the page.
 *  - User-friendly UI: Shows clear status icons, progress bars, and messages to keep users informed about their jobs.
 *  - Automatic cleanup: Closes connections and clears storage when jobs complete or user dismisses the notification.
 *
 * User Experience:
 *  - Shows multiple job runs with their current status (Running, Complete, Failed)
 *  - Updates in real-time as notebook job runs progress
 *  - Closes automatically when all jobs complete
 *  - User can manually dismiss the notification
 */

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  react
   - What is it: A JavaScript library for building user interfaces, developed by Facebook.
   - Why we use it: It allows us to create reusable UI components and manage complex state in a predictable way. We use React hooks like useState and useEffect to handle component state and side effects.
 */
import React, { useEffect, useState, useCallback, useMemo } from "react";
// - React: Base React library needed for JSX/components
// - useEffect: Hook to run code when component mounts/unmounts or dependencies change
// - useState: Hook to manage component state (e.g., list of jobs being tracked)
// - useCallback: Hook to optimize functions by memoizing them (prevents unnecessary re-renders)
// - useMemo: Hook to cache computed values (only recalculate when dependencies change)

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, and styling utilities for consistent UI.
*/
import {
  Badge, // Small colored label (e.g., "SUCCESS" in green badge)
  Button, // Interactive button for user actions (e.g., close button)
  Spinner, // Loading animation while waiting for data
  Text, // Styled text component for displaying information
  Divider, // Horizontal line separator between sections
  ProgressBar, // Visual progress indicator showing job progress
} from "@fluentui/react-components";

/*
  @fluentui/react-icons
    - What it is: Fluent UI's icon library with a wide range of icons.
    - Why used: Provides clear visual indicators of job status (e.g., checkmark for success, error symbol for failure).
*/
import {
  DismissRegular, // "X" icon - for closing/dismissing the notification
  CheckmarkCircleRegular, // Checkmark in circle - indicates success/completion
  ErrorCircleRegular, // Error symbol in circle - indicates failure
  ClockRegular, // Clock icon - indicates pending/waiting state
  PlayRegular, // Play icon - indicates currently running state
} from "@fluentui/react-icons";

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

// Interface describing the current state of a data processing job
interface JobState {
  life_cycle_state: string; // Main job state: PENDING (waiting), RUNNING (active), TERMINATED (complete), ERROR (failed)
  result_state?: string; // Final result if terminated: SUCCESS (completed successfully) or FAILED (job failed)
}

// Interface tracking a single job run with its status and real-time connection
interface RunStatus {
  runId: string; // Unique identifier for this job (e.g., "run_123456")
  state: JobState | null; // Current state of job (null = not yet received from server)
  eventSource: EventSource | null; // Real-time connection to server for live status updates
  // EventSource is like a Slack connection that pushes updates instantly
}

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE CONSTANTS & UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Key used to save job IDs in browser's localStorage (persistent storage)
// localStorage persists data even after user closes/reopens browser
// Real-world: Like writing on a sticky note that stays on your desk
const STORAGE_KEY = "databricksRunIds";

/**
 * Retrieves list of job run IDs from browser's local storage
 * Used to restore job tracking when component remounts
 * Real-world example: Like checking your notebook to remember which tasks you were tracking
 */
const getStoredRunIds = (): string[] => {
  // Get JSON string from localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  // Parse JSON string to array, or return empty array if nothing stored
  return stored ? JSON.parse(stored) : [];
};

/**
 * Saves list of job run IDs to browser's local storage
 * Triggers 'runIdsUpdated' event so other components can react to changes
 */
const setStoredRunIds = (runIds: string[]) => {
  // Convert array to JSON string and save to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runIds));
  // Dispatch custom event to notify other parts of app that job IDs changed
  // Similar to a bell that rings to notify everyone about the change
  window.dispatchEvent(new Event("runIdsUpdated"));
};

/**
 * Public function to add a new job run ID for tracking
 * Called from other components when a job is submitted (e.g., data quality check starts)
 * @param newRunId - Unique identifier of the new job to track
 */
export const addRunId = (newRunId: string) => {
  // Get current list of tracked job IDs
  const current = getStoredRunIds();
  // Only add if not already being tracked (avoid duplicates)
  if (!current.includes(newRunId)) {
    setStoredRunIds([...current, newRunId]);
  }
};

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * Main component that displays a floating toast notification with job status updates
 * This renders in the bottom-right corner of the screen and shows:
 *   - List of all tracked jobs with their current status
 *   - Real-time progress updates as jobs run
 *   - Results when jobs complete or fail
 *   - Automatically hides when all jobs are done and user dismisses it
 * @returns JSX element that renders the job status toaster notification
 */
export const JobStatusToaster: React.FC = () => {
  // State tracking all job runs currently being monitored
  // Each RunStatus contains job ID, current state, and EventSource connection
  const [runStatuses, setRunStatuses] = useState<RunStatus[]>([]);

  // Controls whether the toast notification popup is visible
  // Automatically hidden when no jobs are being tracked
  const [visible, setVisible] = useState(false);

  // ──── DERIVED COMPUTED STATE ──────────────────────────────────────────────
  // These values are calculated from runStatuses and only update when needed
  // useMemo prevents expensive calculations from running on every render

  /**
   * Checks if all tracked jobs have completed or failed
   * Used to show "All done!" message and close button
   * Returns true only if ALL jobs are in terminal state (TERMINATED, ERROR, INTERNAL_ERROR, or FAILED)
   */
  const allDone = useMemo(
    () =>
      // Only consider it "all done" if we have at least one job and all are in a terminal state
      runStatuses.length > 0 &&
      // Check that every job is either TERMINATED (finished) or in an error state
      runStatuses.every(
        (s) =>
          // Job is terminated (finished successfully or with failure)
          s.state?.life_cycle_state === "TERMINATED" || // Job finished successfully or with failure
          s.state?.life_cycle_state === "ERROR" || // Job encountered an error
          s.state?.life_cycle_state === "INTERNAL_ERROR" || // Server-side error occurred
          s.state?.result_state === "FAILED", // Job finished but failed (result state indicates failure)
      ),
    [runStatuses], // Only recalculate when runStatuses changes
  );

  /**
   * Checks if at least one job is currently running
   * Used to show "Working on it..." message while jobs are active
   */
  const hasRunning = useMemo(
    () => runStatuses.some((s) => s.state?.life_cycle_state === "RUNNING"),
    [runStatuses], // Only recalculate when runStatuses changes
  );

  // ──── CORE STATE UPDATE FUNCTIONS ──────────────────────────────────────────

  /**
   * Updates the status of a specific job run
   * Called whenever server sends a status update via EventSource
   * Uses functional update to ensure we're working with latest state
   *
   * Real-world: Like updating a task in your to-do list when status changes
   */
  const updateRunStatus = useCallback((runId: string, newState: JobState) => {
    setRunStatuses((prev) =>
      prev.map((status) =>
        // If this is the job we're updating, replace its state
        status.runId === runId ? { ...status, state: newState } : status,
      ),
    );
  }, []);

  /**
   * Removes a specific job run from tracking
   * Called when job completes and user dismisses it or service cleans up old jobs
   * Also updates localStorage to persist the change
   */
  const removeRun = useCallback((runId: string) => {
    setRunStatuses((prev) => {
      // Filter out the run with matching runId
      const updated = prev.filter((s) => s.runId !== runId);
      // If something was actually removed, update storage
      if (updated.length !== prev.length) {
        setStoredRunIds(updated.map((s) => s.runId));
      }
      return updated;
    });
  }, []);

  /**
   * Sets up a real-time connection to server for a specific job
   * Creates EventSource that receives instant status updates
   * Similar to subscribing to notifications for a specific job
   */
  const setupEventSource = useCallback(
    (runId: string) => {
      // Create EventSource - opens persistent connection to server
      // Server streams job status updates through this connection
      const es = new EventSource(
        `/api/great-expectations/cluster/stream-job-run-status?runId=${runId}`,
      );

      // Listen for 'status' events - regular progress updates
      // Example: "Job is 50% complete" or "Processing data..."
      es.addEventListener("status", (messageEvent: MessageEvent) => {
        const data = JSON.parse(messageEvent.data) as JobState;
        updateRunStatus(runId, data); // Update our state with new status
      });

      // Listen for 'done' event - job has finished (success or failure)
      // This is the final status update before connection closes
      es.addEventListener("done", (messageEvent: MessageEvent) => {
        const data = JSON.parse(messageEvent.data) as JobState;
        updateRunStatus(runId, data); // Update with final status
        es.close(); // Close connection since job is complete
      });

      // Listen for connection errors
      es.addEventListener("error", () => {
        // Mark job as ERROR state if connection fails
        updateRunStatus(runId, { life_cycle_state: "ERROR" });
        es.close(); // Close broken connection
      });

      return es; // Return the EventSource so we can close it later
    },
    [updateRunStatus, removeRun], // Dependencies needed in function
  );

  // ──── LOAD AND INITIALIZE JOBS ─────────────────────────────────────────────

  /**
   * Loads tracked job IDs from storage and initializes real-time connections
   * Called:
   *   - When component first mounts
   *   - When 'runIdsUpdated' event fires (new job added from another component)
   *   - When browser storage changes across tabs
   */
  const loadAndShow = useCallback(() => {
    // Get list of job IDs to track
    const ids = getStoredRunIds();

    // Clean up old connections before loading new ones
    // Closes any EventSource connections that are still open
    setRunStatuses((prev) => {
      prev.forEach((source) => source.eventSource?.close());
      return [];
    });

    // If no jobs to track, hide the toast
    if (ids.length === 0) {
      setVisible(false);
      return;
    }

    // Create a RunStatus object for each job
    // This includes the job ID and opens a new EventSource connection
    const newStatuses = ids.map((runId) => ({
      runId, // Unique identifier for this job run
      state: null, // State will be loaded from server via EventSource
      eventSource: setupEventSource(runId), // Open real-time connection
    }));

    // Update state with new jobs and make toast visible
    setRunStatuses(newStatuses);
    setVisible(true);
  }, [setupEventSource]);

  // ──── SIDE EFFECTS (COMPONENT LIFECYCLE) ──────────────────────────────────

  /**
   * useEffect: Runs when component mounts and sets up event listeners
   * Manages component lifecycle: initialization, listening for changes, cleanup
   */
  useEffect(() => {
    // Initialize jobs when component first loads
    loadAndShow();

    // Create handler function for storage/job ID changes
    // Called when: other tabs add jobs, jobs list changes, etc.
    const onUpdate = () => loadAndShow();

    // Listen for storage changes (when jobs added/removed from other browser tabs)
    window.addEventListener("storage", onUpdate);

    // Listen for custom 'runIdsUpdated' event (when jobs added from same tab)
    window.addEventListener("runIdsUpdated", onUpdate);

    // Cleanup function - runs when component unmounts
    // Removes listeners and closes all EventSource connections to free resources
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("runIdsUpdated", onUpdate);
      runStatuses.forEach((source) => source.eventSource?.close()); // Close all connections
    };
  }, [loadAndShow]);

  // ──── CONDITIONAL RENDERING ──────────────────────────────────────────────

  // Don't show toast if it's not supposed to be visible or no jobs to show
  if (!visible || runStatuses.length === 0) return null;

  // ──── JSX RENDER (HTML/COMPONENTS) ───────────────────────────────────────

  return (
    /* Outer container - floating box in bottom-right corner of screen */
    /* Fixed positioning keeps it visible even when scrolling */
    /* z-[1000] puts it above other elements (high z-index) */
    /* max-w-sm limits width to small/medium size */
    /* Animation: fades in and slides up from bottom when it appears */
    <div
      className={`
                fixed bottom-6 right-6 z-[1000] w-full max-w-sm
                animate-in fade-in slide-in-from-bottom-5 duration-300
            `}
    >
      {/* Main notification box - styled with rounded corners, white background, shadow */}
      {/* backdrop-blur creates frosted glass effect */}
      {/* border adds thin border, shadow-xl adds drop shadow for depth */}
      {/* divide-y adds horizontal lines between sections */}
      <div
        className={`
                    rounded-xl bg-white/95
                    backdrop-blur-lg
                    border border-neutral-200/70
                    shadow-xl shadow-black/8
                    divide-y divide-neutral-100
                `}
      >
        {/* HEADER SECTION - Shows title and close button */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          {/* Title with job count */}
          {/* Example text: "Job Runs (3)" showing 3 jobs being tracked */}
          <Text weight="semibold" size={300}>
            Job Runs ({runStatuses.length})
          </Text>

          {/* Close button - only shown when all jobs are done */}
          {allDone && (
            // Button to dismiss/close the notification
            // Closes all event sources, clears storage, and hides Toast
            <Button
              appearance="subtle" // Low-prominence button style
              icon={<DismissRegular fontSize={20} />} // X icon
              onClick={() => {
                // Close all event sources (stops streaming updates)
                runStatuses.forEach((s) => s.eventSource?.close());
                // Clear stored job IDs from localStorage
                setStoredRunIds([]);
                // Clear from component state
                setRunStatuses([]);
                // Hide the toast notification
                setVisible(false);
              }}
            />
          )}
        </div>

        {/* Horizontal divider line separating header from body */}
        <Divider />

        {/* BODY SECTION - Shows list of jobs */}
        {/* max-h-[280px] and overflow-y-auto allows scrolling if many jobs */}
        <div className="max-h-[280px] overflow-y-auto px-3 py-2">
          {/* Conditional: show loading spinner if jobs haven't loaded yet */}
          {runStatuses.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              {/* Loading spinner with "Loading jobs..." label */}
              <Spinner size="tiny" label="Loading jobs..." />
            </div>
          ) : (
            // Display each job in a runStatuses array
            // map() loops through each job and creates a RunRow component for each
            runStatuses.map((status) => (
              // Render RunRow component for each job (see code below)
              <RunRow key={status.runId} status={status} />
            ))
          )}
        </div>

        {/* Horizontal divider line separating body from footer */}
        <Divider />

        {/* FOOTER SECTION - Shows status message */}
        <div className="px-4 pb-3 pt-1 text-center">
          {/* Message shown while jobs are running */}
          {hasRunning && (
            <Text
              size={200} // Smaller text size for status message
              weight="semibold" // Semi-bold weight to make it stand out
              className="text-neutral-foreground-2" // Light gray color for less emphasis
            >
              Working on it... this may take few minutes.
            </Text>
          )}

          {/* Message shown when all jobs are complete */}
          {allDone && (
            <Text
              size={200} // Smaller text size for status message
              weight="semibold" // Semi-bold weight to make it stand out
              className="text-neutral-foreground-2" // Light gray color for less emphasis
            >
              All jobs are complete! Refresh the page to see the latest updates.
            </Text>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// RUNROW SUB-COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Component that displays a single job run with its status
 * This is repeated for each job in the main toaster
 * Shows:
 *   - Job ID (unique identifier)
 *   - Current status (Running, Complete, Failed, Error)
 *   - Status icon (spinner, play, checkmark, error symbol)
 *   - Progress bar (if job is running)
 *
 * Props:
 *   status - RunStatus object containing job info and current state
 */
const RunRow: React.FC<{ status: RunStatus }> = ({ status }) => {
  // Destructure runId and state from the status prop for easier access
  const { runId, state } = status;

  // ──── DETERMINE STATUS ICON AND COLOR ─────────────────────────────────

  // Default icon and color (used if status not loaded yet)
  let icon = <ClockRegular />; // Clock icon = pending/waiting
  let color: "success" | "danger" | "informative" | "important" | "warning" =
    "important"; // default color

  // Update icon and color based on job state
  if (!state) {
    // No state data received yet - show loading spinner
    icon = <Spinner size="tiny" />;
  } else if (state.life_cycle_state === "RUNNING") {
    // Job is currently running
    icon = <PlayRegular />; // Play icon indicates active/running
    color = "success"; // Blue color for active jobs
  } else if (state.life_cycle_state === "TERMINATED") {
    // Job has finished - check result to show success or failure
    icon =
      state.result_state === "SUCCESS" ? (
        // Show green checkmark for successful completion
        <CheckmarkCircleRegular className="text-emerald-600" />
      ) : (
        // Show red error symbol for failed job
        <ErrorCircleRegular className="text-rose-600" />
      );
    color = state.result_state === "SUCCESS" ? "success" : "danger";
  } else if (
    // Job is in an error state (couldn't complete due to server error or other issue)
    state.life_cycle_state === "ERROR" ||
    state.life_cycle_state === "INTERNAL_ERROR"
  ) {
    // Server error - show error icon
    icon = <ErrorCircleRegular className="text-rose-600" />;
    color = "danger"; // Red color indicates error
  }

  // ──── RENDER JOB ROW ──────────────────────────────────────────────────

  return (
    /* Container for a single job row */
    <div className="py-2">
      {/* Flex container: icon | job info | badge */}
      <div className="flex items-center gap-3">
        {/* Status icon (clock, spinner, play, checkmark, or error) */}
        {/* flex-shrink-0 prevents icon from shrinking if content is long */}
        <div className="flex-shrink-0 w-5">{icon}</div>

        {/* Job information section */}
        {/* flex-1 takes remaining space, min-w-0 allows text overflow */}
        <div className="flex-1 min-w-0">
          {/* Job ID - unique identifier for this job run */}
          {/* Example: "Run ID: run_12345abc" */}
          {/* weight="semibold" makes it bold, block makes it take full width */}
          <Text weight="semibold" size={200} block>
            Run ID: {runId}
          </Text>

          {/* Current job state in human-readable format */}
          {/* Shows "Running", "Completed", "Error", etc. */}
          {/* className="text-neutral-foreground-2" makes text light gray */}
          <Text size={100} block className="text-neutral-foreground-2">
            {state?.life_cycle_state ?? "Loading..."}
          </Text>
        </div>

        {/* Status badge - colored label showing final result */}
        {/* appearance="filled" makes badge fully opaque */}
        {/* color chosen above based on job state (green for success, red for failure) */}
        {/* flex-shrink-0 prevents badge from shrinking */}
        <Badge
          appearance="filled"
          color={color}
          size="small"
          className="flex-shrink-0"
        >
          {/* Badge text: shows result state (SUCCESS/FAILED) or life cycle state */}
          {/* Defaults to "..." while loading */}
          {state?.result_state ?? state?.life_cycle_state ?? "..."}
        </Badge>
      </div>

      {/* Progress bar - shown only while job is active (not completed or error) */}
      {/* This gives visual feedback that job is in progress */}
      {/* Disappears when job finishes or fails */}
      {state?.life_cycle_state !== "TERMINATED" &&
        state?.life_cycle_state !== "ERROR" &&
        state?.result_state !== "FAILED" && (
          <ProgressBar thickness="large" className="my-1.5" />
        )}
    </div>
  );
};
