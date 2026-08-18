/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Atharva Mundhada
  Date: 20 May 2026

  Purpose:
  ManageScopeDialog component for the Groups tab in the Roles Management Dashboard.
  - Lists existing L1 Business Unit grants for a selected group.
  - Allows admins to grant a new BU to the group via an inline Add section at the top.
  - Revoke fires immediately with no Save step.
  - Mirrors the layout/structure of ManageRolesInGroup.
*/

// Mark this file as a client component because it uses React hooks, event handlers, and interactive UI state.
"use client";

// Import Fluent UI styling utilities and UI components used by this dialog.
import {
  makeStyles, // Fluent UI helper used to create component-scoped CSS-in-JS styles.
  tokens, // Fluent design tokens used for colors, spacing, typography, and sizing.
  Spinner, // Loading indicator component used during async operations.
  Button, // Reusable button component for actions like add, close, cancel, and remove.
  Dialog, // Root modal dialog component.
  DialogSurface, // Visual surface/container of a dialog.
  DialogTitle, // Header/title area of the dialog.
  DialogBody, // Main wrapper for dialog content structure.
  DialogContent, // Content area inside the dialog body.
  DialogTrigger, // Fluent UI wrapper for dialog open/close trigger behavior.
  Field, // Labeled form field wrapper used for accessibility and layout.
  Text, // Typography component used for styled text rendering.
  Tooltip, // Hover/focus tooltip component for guidance and permission messaging.
  Select, // Dropdown input component for choosing a business unit.
  DialogActions, // Footer action area used in the revoke confirmation dialog.
  Badge, // Small status indicator used for Active/Inactive labels.
} from "@fluentui/react-components";

// Import Fluent UI icons used in the dialog UI.
import {
  BuildingRegular, // Building icon used to represent Business Units and scope counts.
  DeleteRegular, // Delete icon used for revoke/remove actions.
  DismissRegular, // Dismiss/close icon used in the dialog title action button.
  AddRegular, // Add icon used on the add-scope button.
  ShieldRegular, // Shield icon used in the empty state to represent access/scope management.
} from "@fluentui/react-icons";

// Import React types and hooks required by this functional component.
import { FC, useEffect, useState } from "react";

// Import the DashboardGroup type used to strongly type the selected group prop.
import { DashboardGroup } from "@/types/api";

// Import shared helper used to format granted timestamps into readable text.
import { formatDateTime } from "@/lib/helper";

// Import service methods used to add and remove group scope grants.
import { rolesManagementService } from "@/lib/services/rolesManagementService";

// Import hook used to fetch available business unit names.
import { useGetBusinessUnitNames } from "@/hooks/useQualityDashboard";

// Import hook used to fetch scope values already granted to the selected group.
import { useGetGroupScope } from "@/hooks/useRolesManagement";

// Import global toast hook used to show success feedback to the user.
import { useGlobalToast } from "@/hooks/useToast";

// Import page permission hook used to determine whether the current user can read/write this module.
import { usePagePermissions } from "@/hooks/hasPagePermissions";



// ---------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------


// Create component-scoped styles using Fluent UI's makeStyles helper.
const useStyles = makeStyles({
  dialogSurface: {
    minWidth: "680px", // Ensure the scope dialog stays wide enough for the table layout.
    maxWidth: "780px", // Prevent the dialog from expanding too much on larger screens.
    minHeight: "380px" // Ensure a comfortable minimum height even when content is short.
  },
  dialogBody: {
    display: "flex", // Use flexbox so inner content can stretch vertically.
    flexDirection: "column", // Stack title and content vertically.
    height: "100%", // Make the body fill the available dialog height.
    overflow: "hidden", // Prevent child overflow from breaking the dialog layout.
  },
  dialogContent: {
    display: "flex", // Use flexbox for vertical content layout.
    flexDirection: "column", // Stack count summary, add form, table header, and table body vertically.
    flex: 1, // Allow the content section to expand and consume available space.
    maxHeight: "400px", // Constrain dialog content area so it does not overflow the dialog surface.
    gap: tokens.spacingVerticalS, // Add consistent vertical spacing between content sections.
  },
  dialogHeaderMeta: {
    color: tokens.colorNeutralForeground1, // Use primary neutral text color for header metadata.
    fontSize: tokens.fontSizeBase400, // Use readable medium font sizing for the dialog heading.
    display: "block", // Render header text as a block element.
  },
  // ── Add row ─────────────────────────────────────────────────────────
  addRow: {
    display: "grid", // Use grid layout for the add form row.
    gridTemplateColumns: "1fr auto", // Allocate most space to the select field and auto width to the add button.
    gap: tokens.spacingHorizontalS, // Add spacing between the select field and the button.
    alignItems: "flex-end", // Align form controls along the bottom edge for a clean inline form look.
    marginTop: tokens.spacingVerticalXS, // Add a small top margin above the add row.
    marginBottom: tokens.spacingVerticalXS, // Add a small bottom margin below the add row.
  },
  // ── Table ────────────────────────────────────────────────────────────
  tableHeader: {
    display: "grid", // Use grid layout so header columns align exactly with body rows.
    gap: tokens.spacingHorizontalM, // Add spacing between grid columns.
    paddingBottom: tokens.spacingVerticalXS, // Add small spacing below header labels.
    borderBottom: `2px solid ${tokens.colorNeutralStroke2}`, // Add a strong divider beneath the table header.
    marginBottom: tokens.spacingVerticalXS, // Add slight space between the header and the first row/body.
  },
  tableHeaderText: {
    fontSize: tokens.fontSizeBase100, // Use compact text size for column headers.
    fontWeight: tokens.fontWeightSemibold, // Make header labels semibold for readability.
    color: tokens.colorNeutralForeground1, // Use strong neutral color for header text.
    textTransform: "uppercase", // Render labels in uppercase for a structured table appearance.
    letterSpacing: "0.05em", // Increase letter spacing slightly for header clarity.
  },
  tableRow: {
    display: "grid", // Use grid layout for each row to align with the header.
    gap: tokens.spacingHorizontalM, // Use the same column gap as the table header.
    alignItems: "center", // Vertically center each cell's content.
    paddingBlock: tokens.spacingVerticalS, // Add vertical spacing to make each row easier to scan.
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`, // Add a subtle divider between rows.
    ":last-child": { borderBottom: "none" }, // Remove the divider from the final row for cleaner visuals.
  },
  nameCell: {
    display: "flex", // Use flexbox to align the icon and text horizontally.
    alignItems: "center", // Vertically center the icon and text.
    gap: tokens.spacingHorizontalS, // Add spacing between icon and text.
  },
  nameStack: {
    display: "flex", // Use flexbox to stack text vertically.
    flexDirection: "column", // Place primary and secondary text one above the other.
    color: tokens.colorNeutralForeground2, // Use slightly muted text for the metadata stack.
  },
  subText: {
    fontSize: tokens.fontSizeBase100, // Use smaller text size for secondary metadata.
    color: tokens.colorNeutralForeground2, // Use muted color for timestamps and secondary text.
  },
  // ── Scrollable table body ────────────────────────────────────────────
  scrollableContent: {
    overflowY: "auto", // Allow vertical scrolling when many scope rows exist.
    overflowX: "hidden", // Prevent horizontal scrolling from appearing.
    marginRight: `-${tokens.spacingHorizontalM}`, // Compensate visually for right padding and scrollbar alignment.
    paddingRight: tokens.spacingHorizontalM, // Add right padding so content does not touch the scrollbar.
  },
  // ── Empty state ──────────────────────────────────────────────────────
  emptyState: {
    display: "flex", // Use flexbox for centered empty state layout.
    flexDirection: "column", // Stack icon and text vertically.
    alignItems: "center", // Center children horizontally.
    justifyContent: "center", // Center children vertically inside available area.
    gap: tokens.spacingVerticalS, // Add spacing between empty state elements.
    paddingBlock: tokens.spacingVerticalXXL, // Add generous vertical breathing room for the empty state.
    color: tokens.colorNeutralForeground2, // Use muted text color for empty state messaging.
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1, // Use red foreground color for errors.
    fontSize: tokens.fontSizeBase200, // Use readable error text size.
    display: "block", // Render the error text as a block element.
    marginTop: tokens.spacingVerticalXS, // Add a small gap above the error message.
  },
  memberCount: {
    display: "inline-flex", // Keep the icon and count text on a single inline row.
    alignItems: "center", // Vertically center the icon and text.
    gap: tokens.spacingHorizontalXS, // Add compact spacing between icon and text.
    fontSize: tokens.fontSizeBase100, // Use small text sizing for the grant count summary.
    color: tokens.colorNeutralForeground1, // Use neutral foreground for visibility.
  },
});


// ---------------------------------------------------------------------
// PROPS
// ---------------------------------------------------------------------


// Define the props required by the ManageScopeDialog component.
interface ManageScopeDialogProps {
  isScopeDialogOpen: boolean; // Controls whether the main scope dialog is open.
  setIsScopeDialogOpen: (open: boolean) => void; // Setter used to open/close the scope dialog.
  scopeGroup: DashboardGroup | null; // The selected group whose granted scope is being managed.
  setScopeGroup: (group: DashboardGroup | null) => void; // Setter used to clear or change the selected group.
}


// ---------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------


// Define the component as a typed React functional component.
export const ManageScopeDialog: FC<ManageScopeDialogProps> = ({
  isScopeDialogOpen, // Open/closed state of the scope dialog.
  setIsScopeDialogOpen, // Setter used to control the scope dialog visibility.
  scopeGroup, // Current group selected for scope management.
  setScopeGroup, // Setter used to clear or update the selected group.
}) => {
  const styles = useStyles(); // Generate scoped class names from the style definitions.


  const { showToast } = useGlobalToast(); // Get the toast helper used to show success notifications after add/remove operations.


  const {
    canRead: canReadScope, // Whether the current user can read/manage group scope data.
    canWrite: canWriteScope, // Whether the current user can modify group scope data.
    isLoadingPermissions: isLoadingScopePermissions, // Whether page permissions are still loading.
    hasPermission, // Helper function available for checking additional permissions if needed.
  } = usePagePermissions("roles-management-manage-group-scope"); // Resolve access for the group scope management feature.


  const { businessUnitNames } = useGetBusinessUnitNames(); // Fetch the list of available business units that can be granted.
  const { scopeInGroup, refetch, isFetchingGroupScope } = useGetGroupScope(scopeGroup?.group_id ?? ""); // Fetch granted scope entries for the selected group and expose a refetch function.


  // ── Local state ──────────────────────────────────────────────────────
  const [isRemoving, setIsRemoving] = useState<boolean>(false); // Tracks whether a revoke/remove confirmation is currently being processed.
  const [newBuId, setNewBuId] = useState<string>(""); // Stores the selected Business Unit value to be granted.
  const [addingScope, setAddingScope] = useState<boolean>(false); // Tracks whether a new Business Unit grant is currently being added.
  const [revokingScopeId, setRevokingScopeId] = useState<any>(null); // Stores the scope row selected for revoke confirmation.
  const [addError, setAddError] = useState<string | null>(null); // Stores any error related to granting a new Business Unit.
  const [tableError, setTableError] = useState<string | null>(null); // Stores any error related to revoke/remove actions or table-level failures.


  // ── Handlers ─────────────────────────────────────────────────────────


  // This redirect block is intentionally left commented out to preserve the current implementation behavior exactly.
  // useEffect(() => {
  //   if(!isLoadingScopePermissions && !canReadScope) {
  //     window.location.href = "/forbidden";
  //   }
  // }, [isLoadingScopePermissions, canReadScope]);


  const handleAddScope = async () => { // Handler that grants a new Business Unit scope to the selected group.
    if (!newBuId.trim() || !scopeGroup) return; // Exit early if no Business Unit is selected or no group context exists.


    // Guard: already granted?
    if (scopeInGroup?.some((scopeEntry: any) => scopeEntry.scope_value === newBuId.trim())) { // Prevent duplicate Business Unit grants for the same group.
      setAddError("This Business Unit has already been granted to this group."); // Show a friendly validation message if the scope already exists.
      return; // Stop the add action when a duplicate is detected.
    }


    setAddingScope(true); // Mark the add-scope operation as in progress.
    setAddError(null); // Clear any previous add error before attempting the API call.
    try {
      const payload = { // Build the payload expected by the addGroupScope service.
        group_id: scopeGroup.group_id, // Include the currently selected group ID.
        scope_value: newBuId, // Include the selected Business Unit value.
        scope_type: "business_unit" // Explicitly identify the type of scope being granted.
      }
      // TODO: replace with actual API call
      await rolesManagementService.addGroupScope(payload) // Call the service method that grants scope to the group.
      .then((response) => { // Handle the successful API response.
        refetch(); // Refresh the group's granted scope list after successful addition.
        showToast(`Successfully granted scope of ${newBuId}`) // Show success feedback to the user.
        setNewBuId(""); // Reset the selected Business Unit field after success.
      })
    } catch {
      setAddError("Failed to grant Business Unit access. Please try again."); // Show a friendly error message if the add operation fails.
    } finally {
      setAddingScope(false); // Clear the add loading state whether the API call succeeds or fails.
    }
  };


  const handleRevokeScope = (scopeEntry: any) => { // Handler that opens the confirmation flow for revoking an existing scope entry.
    if (!scopeGroup) return; // Exit if there is no selected group.
    setRevokingScopeId(scopeEntry); // Store the selected scope entry so the confirmation dialog can reference it.
    setTableError(null); // Clear any previous table error before starting a new revoke flow.
  }


  const handleConfirmDelete = async () => { // Handler that performs the actual revoke/remove action after confirmation.
    setIsRemoving(true); // Mark the revoke operation as in progress.
    try {
      // TODO: replace with actual API call
      await rolesManagementService.removeGroupScope(revokingScopeId.scope_id) // Call the service to remove the selected scope entry.
      .then((response) => { // Handle successful remove response.
        refetch(); // Refresh the scope list after a successful revoke.
        showToast(`Successfully revoked ${revokingScopeId.scope_value} scope access`) // Show success feedback to the user.
      })
    } catch {
      setTableError("Failed to revoke access. Please try again."); // Show a user-friendly error if the revoke fails.
    } finally {
      setRevokingScopeId(null); // Clear the selected scope entry so the confirmation dialog closes.
      setIsRemoving(false); // Clear the remove loading state.
    }
  };


  const handleClose = () => { // Shared close/reset handler for the main scope dialog.
    setIsScopeDialogOpen(false); // Close the main scope dialog.
    setScopeGroup(null); // Clear the selected group context.
    setNewBuId(""); // Reset the add-scope Business Unit selection.
    setIsRemoving(false); // Reset the removing state in case a prior flow was interrupted.
    setAddError(null); // Clear any add-section error.
    setTableError(null); // Clear any table-level error.
  };


  // ── Column grid: BU Name | BU ID | Granted By | Revoke ──────────────
  const GRID = "200px 240px 100px 100px 32px"; // Shared grid definition used by both the table header and each scope row.
 


  // ── Render ────────────────────────────────────────────────────────────
  return (
    <> {/* Use a fragment because this component renders the main scope dialog and a separate confirmation dialog. */}
    <Dialog
      open={isScopeDialogOpen} // Bind the main dialog visibility to the prop-controlled open state.
      onOpenChange={(_, data) => { // Handle Fluent UI open-state changes.
        if (!data.open) handleClose(); // When the dialog closes, run the shared close/reset handler.
      }}
    >
      <DialogSurface className={styles.dialogSurface}> {/* Main dialog surface with fixed sizing styles. */}
        <DialogBody> {/* Main dialog body container. */}


          {/* ── Title ── */}
          <DialogTitle
            action={ // Provide top-right close action in the dialog title area.
              <DialogTrigger action="close">
                <Button
                  appearance="subtle" // Use subtle button styling for the close action.
                  aria-label="Close dialog" // Add accessible screen-reader label for the close button.
                  icon={<DismissRegular />} // Show the dismiss icon in the close button.
                  onClick={handleClose} // Run the shared dialog close/reset logic when clicked.
                />
              </DialogTrigger>
            }
          >
            <Text className={styles.dialogHeaderMeta}>Manage Scope for Group: {/* Main title text for the selected group's scope management dialog. */}
              <Text weight="bold" className="text-neutral-foreground-2">&nbsp;{scopeGroup?.group_name ?? ""}</Text> {/* Show the selected group name in bold next to the title. */}
            </Text>
          </DialogTitle>


            {canReadScope && ( // Only render the dialog content if the current user has read access to group scope.
            // ? 
            //   <div className="flex h-full min-h-[50vh] items-center justify-center">
            //     <Spinner size="medium" label="Loading..." />
            //   </div>  
            // :
          <DialogContent className={styles.dialogContent}> {/* Main dialog content area containing counts, add form, table, and errors. */}
            <div className={styles.memberCount}> {/* Compact summary row showing how many Business Units are granted. */}
                {!isFetchingGroupScope && ( // Only show the count summary after scope data has loaded.
                  <>  
                    <BuildingRegular className="text-neutral-foreground-2"/> {/* Building icon representing Business Unit scope grants. */}
                    <Text size={200} weight="semibold" className="text-neutral-foreground-2"> {/* Summary text for the current number of granted Business Units. */}
                      {scopeInGroup?.length}{" "} {/* Show the number of granted scope rows. */}
                      {scopeInGroup?.length === 1 ? "Business Unit" : "Business Units"} granted {/* Use singular/plural wording based on count. */}
                    </Text>
                  </>


                )}
            </div>


            {/* ══════════════════════════════════════════════════════════
                ADD NEW BU — fires immediately on Add
            ══════════════════════════════════════════════════════════ */}


            {canWriteScope && ( // Only show the add-scope form when the current user has write permission.
            <div className={styles.addRow}> {/* Inline add row containing the Business Unit dropdown and add button. */}
              <Field label="Business Unit" required> {/* Labeled field wrapper for the Business Unit selection control. */}
                {/* Tooltip appears on the Select when the user lacks write access */}
                <Tooltip
                  content="You don't have access to this" // Tooltip message explaining why the control is unavailable.
                  relationship="label" // Semantically associate the tooltip with the field label.
                  visible={!canWriteScope ? undefined : false} // Show tooltip only when write permission is missing.
                >
                  <Select
                    size="small" // Use a compact select control to match the inline add-row layout.
                    value={newBuId} // Bind the selected Business Unit value to component state.
                    onChange={(event) => { // Handle a newly selected Business Unit option.
                      setNewBuId(event.target.value); // Save the selected Business Unit value into state.
                      if (addError) setAddError(null); // Clear any prior add error once the selection changes.
                    }}
                    disabled={!canWriteScope} // Disable selection when write permission is missing.
                  >
                    {(businessUnitNames ?? []).map((businessUnit: any, index: number) => ( // Render each available Business Unit as a dropdown option.
                      <option key={index} value={businessUnit?.L1_BUSINESS_UNIT}> {/* Use the mapped index as key and Business Unit value as the option value. */}
                        {businessUnit?.L1_BUSINESS_UNIT} {/* Show the Business Unit name in the dropdown. */}
                      </option>
                    ))}
                  </Select>
                </Tooltip>
              </Field>
              <Button
                appearance="primary" // Use primary styling because add is the main action in this row.
                size="small" // Use compact button size to fit inline with the form.
                icon={addingScope ? <Spinner size="tiny" /> : <AddRegular />} // Show spinner while adding, otherwise show add icon.
                disabled={!newBuId.trim() || addingScope} // Enable only when a Business Unit is selected and no add is in progress.
                onClick={handleAddScope} // Trigger the add-scope handler when clicked.
                style={{ alignSelf: "flex-end" }} // Align the button with the bottom of the form control row.
              >
                {addingScope ? "Adding..." : "Add"} {/* Show progress text while adding, otherwise show default Add label. */}
              </Button>
            </div>
            )}


            {/* Add error */}
            {addError && <Text className={styles.errorText}>{addError}</Text>} {/* Show add-section error if one exists. */}


            {/* ══════════════════════════════════════════════════════════
                EXISTING BU TABLE
            ══════════════════════════════════════════════════════════ */}
            <div className={styles.tableHeader} style={{ gridTemplateColumns: GRID }}> {/* Table header row aligned to the shared grid. */}
              <Text className={styles.tableHeaderText}>Business Unit</Text> {/* Header label for Business Unit column. */}
              <Text className={styles.tableHeaderText}>Granted By</Text> {/* Header label for Granted By column. */}
              <Text className={styles.tableHeaderText}>Scope Type</Text> {/* Header label for Scope Type column. */}
              <Text className={styles.tableHeaderText}>Status</Text> {/* Header label for Status column. */}
              <span /> {/* Revoke column */}
            </div>


            {isFetchingGroupScope ? ( // Show a loading indicator while the group scope list is still being fetched.
              <div>
                <Spinner size="medium" label="Loading..."/> {/* Loading spinner shown while table data is loading. */}
              </div>
            ) : (
            <div className={styles.scrollableContent}> {/* Scrollable container holding the empty state or scope rows. */}
              {scopeInGroup?.length === 0 && ( // Show empty state when the selected group has no granted Business Units.
                
                <div className={styles.emptyState}> {/* Centered empty state for no granted scope. */}
                  <ShieldRegular style={{ fontSize: "32px" }} /> {/* Shield icon representing access/scope management. */}
                  <Text size={300}>No Business Units granted to this group yet.</Text> {/* Primary empty state message. */}
                  <Text size={200}>Use the field above to grant the first one.</Text> {/* Secondary instructional text. */}
                </div>
              )}


              {scopeInGroup?.map((scopeEntry: any) => { // Render each granted scope row.
                return (
                  <div
                    key={scopeEntry.scope_id} // Use scope ID as stable React key for each row.
                    className={styles.tableRow} // Apply shared row grid styling.
                    style={{ gridTemplateColumns: GRID }} // Align row columns with the shared header grid.
                  >
                    {/* ── BU Name ── */}
                    <div className={styles.nameCell}> {/* Cell containing the Business Unit icon and Business Unit name. */}
                      <BuildingRegular
                        style={{
                          fontSize: "18px", // Set icon size for visual consistency with the table layout.
                          color: tokens.colorNeutralForeground2, // Use muted neutral color for the icon.
                          flexShrink: 0, // Prevent the icon from shrinking when space is tight.
                        }}
                      />
                      <Text size={300} weight="medium">
                        {scopeEntry.scope_value} {/* Display the granted Business Unit value. */}
                      </Text>
                    </div>


                    {/* ── Granted By + date ── */}
                    <div className={styles.nameStack}> {/* Stack of grant metadata showing who granted access and when. */}
                      <Text size={200}>{scopeEntry.granted_by}</Text> {/* Show the user/admin who granted the scope. */}
                      {scopeEntry.granted_at && ( // Only show the grant timestamp if it exists.
                        <Text className={styles.subText}>
                          {formatDateTime(scopeEntry.granted_at)} {/* Format and display the granted timestamp in human-readable form. */}
                        </Text>
                      )}
                    </div>
                    
                    {/* ── BU ID ── */}
                    <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                      {scopeEntry.scope_type} {/* Show the scope type, which is expected to be business_unit. */}
                    </Text>


                    <Badge appearance="filled" size="small" color={scopeEntry?.is_active ? "success" : "danger"}> {/* Show status badge with semantic color based on active state. */}
                      {scopeEntry?.is_active ? "Active" : "Inactive"} {/* Render Active or Inactive based on the scope row status. */}
                    </Badge>



                    {/* ── Revoke ── */}
                    {canWriteScope && ( // Only show revoke action when the current user has write access.
                    <Tooltip
                      content={!canWriteScope ? "You don't have access to this" : "Revoke access"} // Show permission message or revoke action hint.
                      relationship="label" // Associate tooltip with the revoke button.
                    >
                      <Button
                        appearance="subtle" // Use subtle button styling because this is a row-level destructive action.
                        size="small" // Keep the button compact for the table layout.
                        icon={
                          scopeEntry.scope_id === revokingScopeId?.scope_id ? ( // If this row is currently selected for revoke flow,
                            <Spinner size="extra-tiny" /> // show a tiny spinner in the button,
                          ) : ( // otherwise,
                            <DeleteRegular style={{ color: "red" }} /> // show the red delete icon.
                          )
                        }
                        disabled={scopeEntry.scope_id === revokingScopeId?.scope_id || !canWriteScope} // Disable while this row is in revoke flow or when write permission is missing.
                        onClick={() => handleRevokeScope(scopeEntry)} // Open revoke confirmation for the selected scope row.
                        aria-label={`Revoke access to ${scopeEntry.bu_name}`} // Accessibility label describing the revoke action target.
                      />
                    </Tooltip>
                    )}
                  </div>
                );
              })}
            </div>
            )}


            {/* Table error */}
            {tableError && <Text className={styles.errorText}>{tableError}</Text>} {/* Show table-level error below the table content if present. */}
          </DialogContent>
          )}
        </DialogBody>
      </DialogSurface>
    </Dialog>


    <Dialog
        open={!!revokingScopeId} // Open confirmation dialog whenever a scope row is selected for revoke.
        onOpenChange={(_, data) => { // Handle dialog close/open changes.
          if (!data.open) { // If the confirmation dialog is closed,
            setRevokingScopeId(null); // clear the selected revoke target,
            setTableError(null); // and clear any existing table error.
          }
        }}
      >
        <DialogSurface> {/* Surface for the revoke confirmation dialog. */}
          <DialogBody> {/* Body wrapper for confirmation content and actions. */}
            <DialogTitle>Remove Group Scope</DialogTitle> {/* Confirmation dialog title. */}


            <DialogContent> {/* Main explanatory content for the confirmation dialog. */}
              <Text size={300} className="text-neutral-foreground-2"> {/* Main revoke confirmation text. */}
                Are you sure you want to remove{" "} {/* Leading confirmation sentence. */}
                <Text size={300} weight="bold" style={{ fontFamily: "monospace" }}> {/* Emphasize the scope value in bold monospace text. */}
                  {revokingScopeId?.scope_value} {/* Show the Business Unit/scope value being removed. */}
                </Text>{" "} {/* Preserve spacing around nested text components. */}
                from the group{" "} {/* Continue the confirmation message with group context. */}
                <Text size={300} weight="bold"> {/* Emphasize the group name. */}
                  {scopeGroup?.group_name} {/* Show the selected group name. */}
                </Text>
                ? {/* End the confirmation question. */}
              </Text>
              <Text
                size={200} // Use smaller text for the supporting warning message.
                style={{
                  color: tokens.colorNeutralForeground1, // Use neutral foreground color for the supporting warning text.
                  display: "block", // Render on its own line.
                  marginTop: tokens.spacingVerticalS, // Add spacing above the warning line.
                }}
              >
                This will take effect immediately. {/* Warn the user that revocation is immediate upon confirmation. */}
              </Text>


              {/* Error shown inside confirmation dialog if the API call fails */}
              {tableError && ( // Only show this error section if revoke fails.
                <Text className={styles.errorText}>{tableError}</Text> // Display the revoke failure message.
              )}
            </DialogContent>


            <DialogActions> {/* Footer action area for confirmation dialog buttons. */}
              {/* Cancel — closes confirmation, no API call made */}
              <Button
                appearance="secondary" // Use secondary styling for the cancel action.
                onClick={() => { // Close the confirmation dialog without revoking anything.
                  setRevokingScopeId(null); // Clear the selected revoke target.
                  setTableError(null); // Clear any error message.
                }}
                disabled={isRemoving} // Prevent cancellation while the remove operation is actively in progress.
              >
                Cancel {/* Label for the non-destructive cancel action. */}
              </Button>              
              {/* Confirm — fires remove API immediately */}
              <Button
                appearance="primary" // Use primary styling for the confirm action.
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }} // Override the button color with a destructive red background.
                onClick={handleConfirmDelete} // Execute the confirmed revoke/remove action.
                disabled={isRemoving} // Disable while the remove operation is already in progress.
                icon={isRemoving ? <Spinner size="tiny" /> : <DeleteRegular />} // Show spinner during removal, otherwise show delete icon.
              >
                {isRemoving ? "Removing..." : "Remove"} {/* Show progress text while removing, otherwise default label. */}
              </Button>
            </DialogActions>


          </DialogBody>
        </DialogSurface>
      </Dialog>
  </>
  );
};


// Export the component as the default export of this file.
export default ManageScopeDialog;