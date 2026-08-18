/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 February 2026 

  Purpose of the script: 
    This script defines the `FailedPipelineDetailsDialog` component.

    Key Responsibilities:
    - Displays a modal dialog showing failed pipeline run details.
    - Fetches pipeline trend + failure data based on:
        • Selected pipeline
        • Selected trigger
        • Selected date range
    - Renders a data grid (`FailedPipelinesGrid`) with failure details.
    - Handles dialog open/close state and cleanup.

    Features:
    - Fully controlled dialog (state passed from parent)
    - Dynamic data fetching using custom hook
    - Graceful cleanup when dialog closes
    - Responsive and scrollable UI

    Typical Use Case:
    - User clicks on a failed pipeline in dashboard
    - Dialog opens with detailed failure information
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, dialog, accordion, and styling
      utilities for consistent UI across the dashboard.
*/
import { 
    Text,           // Fluent UI Text component for displaying text with various styles
    makeStyles,     // Fluent UI hook for creating custom styles
    tokens,         // Fluent UI design tokens for consistent spacing, colors, and typography
    Dialog,         // Fluent UI Dialog component for modal/non-modal overlay windows
    DialogSurface,  // Fluent UI DialogSurface component for the dialog's outer container/backdrop
    DialogBody,     // Fluent UI DialogBody component wrapping title and content
    DialogTitle,    // Fluent UI DialogTitle component for the dialog heading area
    DialogContent,  // Fluent UI DialogContent component for the dialog's scrollable body
    Button,         // Fluent UI Button component for dialog box cancel button
} from "@fluentui/react-components";

/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon library providing SVG icons as React components.
    - Why used: Provides icons for copy buttons and status indicators.
*/
import { Dismiss24Filled } from "@fluentui/react-icons"; // Fluent UI icon for close action

/*
  @/hooks/usePipelineDashboard
    - What it is: Custom React hooks for fetching data for visuals in UI.
    - Why used: Provides data for visualising donut chart and trend chart of selected pipeline.
*/
import { useGetPipelineTrendDetails } from "@/hooks/usePipelineDashboard"; // Custom data-fetching hook to get donut + trend details for a pipeline.

/*
  @/components/ui/FailedPipelinesGrid
    - What it is: A data grid that displays failed run details of a selected pipeline
    - Why used: To display the failed pipeline details when we click on the dialog
 */
import FailedPipelinesGrid from "@/components/ui/FailedPipelinesGrid";


const useStyles = makeStyles({
    title: {
        fontWeight: tokens.fontWeightBold,          // Making the title bold
        color: tokens.colorNeutralForeground1,      // Setting the title color to neutral
        marginBottom: tokens.spacingVerticalS,      // Adding space below the title
    },
    subtitle: {
        fontSize: tokens.fontSizeBase500,           // Larger font size for section subtitles
        fontWeight: tokens.fontWeightSemibold,      // Semi-bold weight for visual hierarchy
        color: tokens.colorNeutralForeground1,      // Neutral foreground color for the subtitle
    },
    dialogContainer: {
        padding: "12px",
        width:"1080px",         // Fixed width for the dialog surface
        maxWidth:"1280px",      // Maximum width cap to prevent overflow on large screens
        maxHeight:"550px",      // Maximum height cap to keep the dialog within the viewport
        minHeight: "150px"
    },
    dialogContent: {
        maxHeight: "400px"      // Constrain dialog content area so it does not overflow the dialog surface
    }
});

// ---------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------

/**
 * FailedPipelineDetailsDialogProps
 * 
 * Defines props required by the dialog component.
 * This is a controlled component → parent manages state.
 */
interface FailedPipelineDetailsDialogProps {

    /** Controls whether dialog is open or closed */
    isFailedPipelineDetailsDialogOpen:boolean;

    /** Setter to toggle dialog visibility */
    setIsFailedPipelineDetailsDialogOpen: (value: boolean) => void;

    /** Selected pipeline object containing pipeline + trigger details */
    selectedFailedPipeline:any;

    /** Setter to reset selected pipeline */
    setSelectedFailedPipeline: (value: any) => void;

    /** Selected date range for filtering pipeline runs */
    selectedDateRange: any;
}


// ---------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------

/**
 * FailedPipelineDetailsDialog
 * 
 * @description
 * Displays a modal dialog containing failed pipeline run details.
 * Fetches data dynamically based on selected pipeline and date range.
 * 
 * @param {FailedPipelineDetailsDialogProps} props
 * 
 * @returns JSX.Element
 * 
 * @example
 * <FailedPipelineDetailsDialog
 *   isFailedPipelineDetailsDialogOpen={true}
 *   setIsFailedPipelineDetailsDialogOpen={setOpen}
 *   selectedFailedPipeline={{
 *      failedPipelineName: "Pipeline_A",
 *      failedTriggerId: "Trigger_1"
 *   }}
 *   setSelectedFailedPipeline={setPipeline}
 *   selectedDateRange={{
 *      startDate: "2026-03-01",
 *      endDate: "2026-03-25"
 *   }}
 * />
 * 
 * @behavior
 * - Opens when `isFailedPipelineDetailsDialogOpen` is true
 * - Fetches data via API hook
 * - Displays loader while fetching
 * - Resets state when dialog is closed
 */
export default function FailedPipelineDetailsDialog({

    // Destructuring props for easier usage
    isFailedPipelineDetailsDialogOpen,
    setIsFailedPipelineDetailsDialogOpen,
    selectedFailedPipeline,
    setSelectedFailedPipeline,
    selectedDateRange

}: FailedPipelineDetailsDialogProps) {

    // Initialize styles
    const styles = useStyles()

    /**
     * Fetch pipeline trend + failure details
     * 
     * Dependencies:
     * - Pipeline name
     * - Date range
     * - Trigger ID
     * 
     * Returns:
     * - data → API response used in grid
     * - isFetching → loading state
     */
    const { data, isFetching } = useGetPipelineTrendDetails(
        selectedFailedPipeline?.failedPipelineName,  // Pipeline identifier
        selectedDateRange.startDate,                 // Start date filter
        selectedDateRange.endDate,                   // End date filter
        selectedFailedPipeline?.failedTriggerId      // Trigger identifier
    );

    /**
     * handleDiscard
     * 
     * Closes dialog and resets selected pipeline.
     * Ensures no stale state is retained.
     */
    const handleDiscard = () => {

        setIsFailedPipelineDetailsDialogOpen(false); // Close dialog
        setSelectedFailedPipeline(null);             // Reset selected pipeline

    }

    return (
        <Dialog

            // Controls dialog visibility
            open={isFailedPipelineDetailsDialogOpen}

            // Triggered on any open/close change
            onOpenChange={() => handleDiscard()}

            // Modal blocks background interaction
            modalType="modal"
        >
            <DialogSurface className={styles.dialogContainer}>
                <DialogBody>

                    <DialogTitle

                        // Close button in top-right corner
                        action={
                            <Button
                                appearance="subtle"
                                icon={<Dismiss24Filled />}
                                aria-label="Close"
                                onClick={() => handleDiscard()} // Close dialog on click
                            />
                        }
                    >
                        <Text className={styles.subtitle}>
                            {/* Title with dynamic pipeline name */}
                            Failed Run Details
                            <span className="text-sm text-neutral-foreground-2">
                                ({selectedFailedPipeline?.failedPipelineName})
                            </span>
                        </Text>
                    </DialogTitle>

                    <DialogContent>

                        {/* Scrollable container */}
                        <div className={styles.dialogContent}>

                            <FailedPipelinesGrid

                                // Data fetched from API
                                data={data}

                                // Controls loading spinner
                                isFetching={isFetching}

                            />

                        </div>

                    </DialogContent>

                </DialogBody>
            </DialogSurface>
        </Dialog>
    )
}