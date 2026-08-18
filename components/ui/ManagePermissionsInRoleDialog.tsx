/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Atharva Mundhada
  Date: 20 May 2026

  Purpose:
  Roles tab component for the Roles Management Dashboard.
  - Displays all dashboard roles registered in the RBAC system.
  - Roles tab supports CRUD operations for custom (non-system) entries only.
  - Add Role dialog includes a multi-select permissions dropdown with tag-based display and removal.
  - Edit Role dialog only allows adding or removing permissions assigned to the role; no field edits.
  - Supports search filtering within the tab independently.
*/


// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------


/*
  @fluentui/react-components

  Why used:
  Provides standardized UI components (text, spinners, badges, dialogs, buttons,
  popovers, checkboxes) to maintain consistency across the Teva Data Integrity application.
*/
import {
  makeStyles, // Fluent UI hook for creating custom styles.
  tokens, // Fluent UI design tokens for consistent spacing, colors, and typography.
  Spinner, // Fluent UI Spinner for loading indicators inside buttons.
  Badge, // Fluent UI Badge for status and type indicators in the table.
  Button, // Fluent UI Button for actions.
  Dialog, // Fluent UI Dialog for modal windows.
  DialogTrigger, // Fluent UI DialogTrigger to trigger the dialog.
  DialogSurface, // Fluent UI DialogSurface for the dialog content area.
  DialogTitle, // Fluent UI DialogTitle for the dialog header.
  DialogBody, // Fluent UI DialogBody for dialog content.
  DialogActions, // Fluent UI DialogActions for dialog action buttons.
  DialogContent, // Fluent UI DialogContent for dialog inner content.
  Field, // Fluent UI Field for form field wrappers.
  Input, // Fluent UI Input for the assigned permissions search box.
  Text, // Fluent UI Text for styled text.
  Tooltip, // Fluent UI Tooltip for hover descriptions.
  Combobox, // Fluent UI Combobox used for searchable selection of permissions.
  Option, // Fluent UI Option used as selectable items inside the Combobox.
  SearchBox, // Fluent UI SearchBox used to filter assigned permissions.
} from "@fluentui/react-components";


/*
  @fluentui/react-icons
    - What it is: A package of Fluent UI SVG icons packaged as React components.
    - Why used: The icons visually explain actions (edit, add, shield, dismiss)
      making the UI faster to scan for users.
*/
import {
  ShieldKeyholeRegular, // Icon for the Roles section title.
  AddRegular, // Icon for the Add Role button.
  DismissRegular, // Icon for removing a selected permission tag from the multi-select.
  DeleteRegular, // Icon used for destructive remove actions.
  SearchRegular, // Icon for the assigned permissions search input.
} from "@fluentui/react-icons";


/*
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and lifecycle.
*/
import { useState, useMemo, FC, useEffect } from "react"; // Import React hooks and FC typing for this component.



/*
  ./types
    - What it is: Shared TypeScript types for the Roles Management module.
    - Why used: Centralizes type definitions so DashboardRole and RoleFormPayload
      are consistent across all tabs and services.
*/
import { DashboardPermission, DashboardRole } from "@/types/api"; // Import permission and role data types used by this dialog.


/*
  @/lib/services/rolesManagementService
  - What it is: Service layer for RBAC management API calls.
  Why used:
  Provides functions to add, update, and assign permissions to roles via the backend API.
*/
import { rolesManagementService } from "@/lib/services/rolesManagementService"; // Import service used to assign and remove permissions from roles.


/*
  @/hooks/useRolesManagement
  - What it is: Custom React hooks for fetching roles and permissions data.
  Why used:
  - useGetDashboardRoles: fetches all registered roles from the backend.
  - useGetDashboardPermissions: fetches all available permissions for the multi-select dropdown.
  - useGetPermissionsInRole: fetches permissions already assigned to a specific role for the edit dialog.
*/
import {
  useGetDashboardPermissions, // Hook that fetches the full set of available dashboard permissions.
  useGetRolePermissions, // Hook that fetches the permissions currently assigned to a selected role.
} from "@/hooks/useRolesManagement";
import { useGlobalToast } from "@/hooks/useToast"; // Hook used to display toast notifications globally.
import { formatDateTime } from "@/lib/helper"; // Helper used to format created_at timestamps for display in the assigned-permissions list.
import { usePagePermissions } from "@/hooks/hasPagePermissions"; // Permission hook used to determine read/write access for this dialog and related features.


// ---------------------------------------------------------------------
// STYLING CONFIGURATION
// ---------------------------------------------------------------------


/**
 * `useStyles`
 *
 * Centralized styling hook for the DashboardRolesTab component.
 * Defines layout, spacing, and interaction styles consistent with
 * the rest of the Roles Management page.
 */
const useStyles = makeStyles({
    dialogContainer: {
      width: "920px", // Fixed width for the dialog surface.
      maxWidth: "1120px", // Maximum width cap to prevent overflow on large screens.
      minHeight: "320px", // Minimum height to avoid a cramped dialog when little content is present.
    },
    dialogContent: {
      maxHeight: "400px", // Constrain dialog content area so it does not overflow the dialog surface.
    },
    dialogHeaderMeta: {
      color: tokens.colorNeutralForeground1, // Use primary neutral foreground color for the header metadata text.
      fontSize: tokens.fontSizeBase400, // Set a readable header metadata font size.
      display: "block", // Force the metadata text to occupy its own line.
    },
    memberCount: {
      display: "inline-flex", // Lay out the icon and count text inline using flexbox.
      alignItems: "center", // Vertically align icon and text in the count pill.
      gap: tokens.spacingHorizontalXS, // Add a small horizontal gap between icon and count text.
      fontSize: tokens.fontSizeBase100, // Use compact text sizing for supporting metadata.
      color: tokens.colorNeutralForeground1, // Use neutral foreground for consistent UI tone.
    },
    addSection: {
      display: "grid", // Use grid layout for the add-permission field and button.
      gridTemplateColumns: "1fr auto", // Make the field flexible and the button auto-sized.
      gap: tokens.spacingHorizontalS, // Add horizontal space between field and button.
      alignItems: "flex-end", // Align the bottom edges of the field and button.
      paddingBottom: tokens.spacingVerticalM, // Add spacing below the add section.
      marginBottom: tokens.spacingVerticalS, // Add bottom margin before the next block.
    },


    // ── Assigned permissions filter row ───────────────────────────────────
    // Sits below the Add section, right-aligned, half the dialog width.
    assignedFilterRow: {
      display: "flex", // Use flex layout for the assigned-permissions filter row.
      justifyContent: "flex-end", // Pin the filter input to the right side of the dialog.
      marginBottom: tokens.spacingVerticalS, // Add spacing below the filter row.
    },
    assignedFilterField: {
      width: "25%", // Quarter of the dialog width — compact, unobtrusive.
    },


    tableHeader: {
      display: "grid", // Use CSS grid so the header aligns with table body rows.
      gap: tokens.spacingHorizontalM, // Add spacing between grid columns.
      paddingBottom: tokens.spacingVerticalXS, // Add slight padding under the header row.
      borderBottom: `2px solid ${tokens.colorNeutralStroke2}`, // Draw a stronger divider below the table header.
      marginBottom: tokens.spacingVerticalXS, // Add spacing after the header row.
    },
    tableHeaderText: {
      display: "flex", // Use flex so text alignment can be customized if needed.
      fontSize: tokens.fontSizeBase100, // Use compact text size for table headers.
      fontWeight: tokens.fontWeightSemibold, // Make header labels semibold for emphasis.
      color: tokens.colorNeutralForeground1, // Use neutral foreground for standard header readability.
      textTransform: "uppercase", // Transform header labels to uppercase for table structure.
      letterSpacing: "0.05em", // Add slight tracking to the uppercase header text.
    },
    tableRow: {
      display: "grid", // Use grid so body rows align with the table header columns.
      gap: tokens.spacingHorizontalM, // Add spacing between row columns.
      alignItems: "center", // Vertically center the row contents.
      paddingBlock: tokens.spacingVerticalS, // Add vertical padding to each row.
      borderBottom: `1px solid ${tokens.colorNeutralStroke1}`, // Draw a subtle divider between rows.
      ":last-child": {
        borderBottom: "none", // Remove the border from the final row.
      },
    },
    tableRowHover: {
      ":hover": {
        backgroundColor: tokens.colorNeutralBackground2, // Apply a light hover background when this class is used.
        borderRadius: tokens.borderRadiusMedium, // Soften the hover state with rounded corners.
      },
    },
    nameCell: {
      display: "flex", // Use flex layout for name/icon combinations.
      alignItems: "center", // Vertically align child elements.
      gap: tokens.spacingHorizontalS, // Add spacing between elements in the cell.
    },
    nameStack: {
      display: "flex", // Use flexbox for stacked text layout.
      flexDirection: "column", // Stack the name and subtext vertically.
      color: tokens.colorNeutralForeground2, // Use a softer foreground tone for secondary content.
    },
    subText: {
      fontSize: tokens.fontSizeBase100, // Use smaller font size for supporting metadata.
      color: tokens.colorNeutralForeground2, // Use muted neutral color for less emphasis.
    },
    scrollableContent: {
      overflowY: "auto", // Enable vertical scrolling when content exceeds available height.
      overflowX: "hidden", // Prevent horizontal scrolling.
      marginRight: `-${tokens.spacingHorizontalM}`, // Pull the scrollable area slightly right for cleaner alignment.
      paddingRight: tokens.spacingHorizontalM, // Add right padding so content does not collide with the scrollbar.
    },
    emptyState: {
      display: "flex", // Use flex layout for the empty state container.
      flexDirection: "column", // Stack empty state items vertically.
      alignItems: "center", // Center empty state items horizontally.
      justifyContent: "center", // Center empty state items vertically.
      gap: tokens.spacingVerticalS, // Add spacing between empty state icon and text.
      paddingBlock: tokens.spacingVerticalXXL, // Add generous vertical padding around the empty state.
      color: tokens.colorNeutralForeground2, // Use muted text color for the empty state.
    },
    errorText: {
      color: tokens.colorPaletteRedForeground1, // Use red foreground to communicate an error state.
      fontSize: tokens.fontSizeBase200, // Make the error text slightly larger than helper text.
      display: "block", // Force the error message onto its own line.
      marginTop: tokens.spacingVerticalXS, // Add a small gap above the error text.
    },
  });


// ---------------------------------------------------------------------
// PROPS
// Note: renderPermissionTags removed — not needed in this component.
// The parent can still pass it to other components that use it.
// ---------------------------------------------------------------------


// Define the props accepted by the ManagePermissionsInRoleDialog component.
interface ManagePermissionsInRoleDialogProps {
  selectedRole: DashboardRole | null; // The currently selected role whose permissions are being managed.
  setSelectedRole: (role: DashboardRole | null) => void; // Setter used to update or clear the selected role in the parent.
  setIsEditRolePermissionsDialogOpen: (open: boolean) => void; // Setter used to open or close the main permission-management dialog.
  isEditRolePermissionsDialogOpen: boolean; // Boolean state indicating whether the main permission-management dialog is open.
}


// ---------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------


// Declare the permission-management dialog as a typed functional React component.
export const ManagePermissionsInRoleDialog: FC<ManagePermissionsInRoleDialogProps> = ({
  selectedRole, // The role currently selected for permission management.
  setSelectedRole, // Parent setter used to clear or replace the selected role.
  setIsEditRolePermissionsDialogOpen, // Parent setter used to close the edit-permissions dialog.
  isEditRolePermissionsDialogOpen, // Parent-controlled open state for the main dialog.
}) => {
  const styles = useStyles(); // Resolve generated class names from the styling hook.


  const { showToast } = useGlobalToast(); // Get toast helper used to show success notifications.


  const { canRead, canWrite, hasPermission, isLoadingPermissions } = usePagePermissions("roles-management-manage-permissions"); // Resolve page-level permissions and helper methods for this dialog.
  const canViewPermissions = hasPermission("roles-management-permissions:read"); // Determine whether the user can view the full permission catalog.


  // ── Add section state ─────────────────────────────────────────────────
  const [permSearch, setPermSearch] = useState<string>(""); // Stores the current text typed into the Add Permission combobox.
  const [selectedPermission, setSelectedPermission] = useState<DashboardPermission | null>(null); // Stores the currently selected permission to add.
  const [isAdding, setIsAdding] = useState<boolean>(false); // Tracks whether the assign-permission API call is in progress.
  const [addError, setAddError] = useState<string | null>(null); // Stores any add-permission error to display inline.


  // ── Assigned permissions filter state ────────────────────────────────
  // Drives the client-side search over the already-assigned permissions table.
  const [assignedPermSearch, setAssignedPermSearch] = useState<string>(""); // Stores the search text used to filter assigned permissions.


  // ── Remove confirmation state ─────────────────────────────────────────
  // The permission the admin wants to remove; null = confirmation dialog closed
  const [pendingRemovePermission, setPendingRemovePermission] = useState<DashboardPermission | null>(null); // Stores the permission pending removal confirmation.
  const [isRemoving, setIsRemoving] = useState<boolean>(false); // Tracks whether the remove-permission API call is in progress.
  const [removeError, setRemoveError] = useState<string | null>(null); // Stores any remove-permission error to display in the confirmation dialog.


  // ── Data hooks ────────────────────────────────────────────────────────
  const { permissionsInRole, refetch, isFetchingPermissionsInRole } = useGetRolePermissions(
    selectedRole?.role_id, // Pass the selected role ID so the hook fetches permissions for that role.
    canRead // Pass read permission flag so the hook respects access control.
  );


  const { dashboardPermissions, isFetchingPermissions } = useGetDashboardPermissions(canViewPermissions); // Fetch the full permission catalog when the user has permission to view it.


  // ── Derived ───────────────────────────────────────────────────────────


  // useEffect(() => {
  //   if(!isLoadingPermissions && !canRead) {
  //     window.location.href = "/forbidden";
  //   }
  // }, [isLoadingPermissions, canRead]);


  const assignedPermissionIds: string[] = useMemo(
    () => (permissionsInRole ?? []).map((assignedPermission: DashboardPermission) => assignedPermission.permission_id), // Build a list of permission IDs already assigned to the selected role.
    [permissionsInRole] // Recompute only when assigned permissions change.
  );


  const activePermissions: DashboardPermission[] = useMemo(
    () => (dashboardPermissions ?? []).filter((dashboardPermission: DashboardPermission) => dashboardPermission.is_active), // Keep only active permissions from the global permission catalog.
    [dashboardPermissions] // Recompute only when the dashboard permission list changes.
  );


  // Permissions that are active AND not yet assigned to this role
  const availableToAdd: DashboardPermission[] = useMemo(
    () => activePermissions.filter((activePermission) => !assignedPermissionIds.includes(activePermission.permission_id)), // Exclude already-assigned permissions so only valid add options remain.
    [activePermissions, assignedPermissionIds] // Recompute when active permissions or assigned IDs change.
  );


  // Client-side filtered list for the Add combobox based on the search query
  const filteredAvailable: DashboardPermission[] = useMemo(() => {
    const searchQuery = permSearch.trim().toLowerCase(); // Normalize the add-permission search query for case-insensitive matching.
    if (!searchQuery) return availableToAdd; // If no search text is provided, return all addable permissions.
    return availableToAdd.filter(
      (availablePermission) =>
        availablePermission.permission_key.toLowerCase().includes(searchQuery) || // Match by permission key.
        availablePermission.category.toLowerCase().includes(searchQuery) // Match by category.
    );
  }, [availableToAdd, permSearch]); // Recompute when available options or search text change.


  // Client-side filter for the already-assigned permissions table.
  // Matches against both permission_key and category so admins can search either.
  const filteredAssigned: DashboardPermission[] = useMemo(() => {
    const searchQuery = assignedPermSearch.trim().toLowerCase(); // Normalize the assigned-permissions search query.
    if (!searchQuery) return permissionsInRole ?? []; // If there is no search term, return all assigned permissions.
    return (permissionsInRole ?? []).filter(
      (assignedPermission: DashboardPermission) =>
        assignedPermission.permission_key.toLowerCase().includes(searchQuery) || // Match assigned permission by key.
        assignedPermission.category.toLowerCase().includes(searchQuery) // Match assigned permission by category.
    );
  }, [permissionsInRole, assignedPermSearch]); // Recompute when assigned permissions or search text change.


  // ── Column grid: Permission | Category | Action ───────────────────────
  const GRID = "400px 260px 100px 32px"; // Shared CSS grid template used by the assigned-permissions header and rows.


  // ── Handlers ──────────────────────────────────────────────────────────


  /** Fires the assign API immediately when admin clicks Add */
  const handleAdd = async () => {
    if (!selectedPermission || !selectedRole) return; // Exit early if no permission or no role is selected.
    setIsAdding(true); // Enable loading state for the Add action.
    setAddError(null); // Clear any previous add error before making the API call.
    try {
      await rolesManagementService.assignPermissionstoRole({
        role_id: selectedRole?.role_id, // Send the selected role ID in the API request.
        permission_id: selectedPermission.permission_id, // Send the selected permission ID in the API request.
      })
      .then((serviceResponse) => {
        refetch(); // Refresh the assigned-permissions list after successful assignment.
        showToast(`${selectedPermission.permission_key} added successfully to ${selectedRole.role_name}.`); // Show success message naming the permission and role.
      });
      // Clear the combobox after successful add
      setSelectedPermission(null); // Clear the selected permission after a successful add.
      setPermSearch(""); // Reset the combobox search text after a successful add.
    } catch {
      setAddError("Failed to add permission. Please try again."); // Show inline error if the API call fails.
    } finally {
      setIsAdding(false); // Clear loading state regardless of success or failure.
    }
  };


  /** Opens the remove confirmation dialog for the clicked row */
  const handleRemoveClick = (assignedPermission: DashboardPermission) => {
    setPendingRemovePermission(assignedPermission); // Store the clicked permission so the confirmation dialog can reference it.
    setRemoveError(null); // Clear any previous remove error before opening the confirmation dialog.
  };


  /** Fires the remove API immediately after admin confirms */
  const handleConfirmRemove = async () => {
    if (!pendingRemovePermission) return; // Exit early if no permission is pending removal.
    setIsRemoving(true); // Enable loading state for the remove action.
    setRemoveError(null); // Clear any previous remove error before making the API call.
    try {
      await rolesManagementService.removePermissionFromRole(
        (pendingRemovePermission as any).mapping_id // Use the mapping ID from the assigned permission record to remove the mapping.
      );
      refetch(); // Refresh the assigned-permissions list after successful removal.
      showToast(`Successfully Removed ${pendingRemovePermission.permission_key}`); // Show success toast naming the removed permission.
      setPendingRemovePermission(null); // Close the confirmation dialog on success by clearing the pending permission.
    } catch {
      setRemoveError("Failed to remove permission. Please try again."); // Show inline error if the remove API call fails.
    } finally {
      setIsRemoving(false); // Clear loading state regardless of success or failure.
    }
  };


  /** Resets all local state and closes the main dialog */
  const handleClose = () => {
    setIsEditRolePermissionsDialogOpen(false); // Close the main dialog.
    setSelectedRole(null); // Clear the selected role in parent state.
    setSelectedPermission(null); // Clear the currently selected permission-to-add value.
    setPermSearch(""); // Reset the add-permission combobox search text.
    setAssignedPermSearch(""); // Reset the assigned permissions filter on close.
    setAddError(null); // Clear any add-permission error.
    setPendingRemovePermission(null); // Clear any pending remove confirmation state.
    setRemoveError(null); // Clear any remove-permission error.
  };


  // ── Render ────────────────────────────────────────────────────────────


  return (
    <>
      {/* ================================================================
          MAIN DIALOG — Manage Permissions
      ================================================================ */}
      <Dialog
        open={isEditRolePermissionsDialogOpen} // Control the visibility of the main permission-management dialog.
        onOpenChange={(_, dialogState) => {
          if (!dialogState.open) handleClose(); // When the dialog closes, reset local and parent-linked state.
        }}
      >
        <DialogSurface className={styles.dialogContainer}> {/* Apply the custom dialog container styling. */}
          {!isLoadingPermissions && canRead && ( // Only render the dialog body after permissions finish loading and read access is granted.
          <DialogBody>
            {/* ── Title + × close button ────────────────────────────────── */}
            <DialogTitle
              action={
                // Fluent UI DialogTitle action slot — idiomatic × button top-right
                <DialogTrigger action="close">
                  <Button
                    appearance="subtle" // Use subtle styling for the close button.
                    aria-label="Close dialog" // Accessibility label for the close button.
                    icon={<DismissRegular />} // Use dismiss icon as the close button icon.
                    onClick={handleClose} // Close and reset the dialog state when clicked.
                  />
                </DialogTrigger>
              }
            >
              <Text className={styles.dialogHeaderMeta}>Manage Permissions for Role:
                <Text weight="bold" className="text-neutral-foreground-2">&nbsp;{selectedRole?.role_name ?? ""}</Text>
              </Text>


              {/* ── Member count pill ── */}
              <div className={styles.memberCount}>
              {!isFetchingPermissionsInRole && ( // Show the permission count only after assigned permissions finish loading.
                <>
                  <ShieldKeyholeRegular className="text-neutral-foreground-2"/> {/* Icon indicating protected role permissions context. */}
                  <Text size={200} weight="semibold" className="text-neutral-foreground-2">
                    {permissionsInRole?.length}{" "} {/* Show the number of permissions assigned to the role. */}
                    {permissionsInRole?.length === 1 ? "permission" : "permissions"} assigned {/* Use singular or plural label based on count. */}
                </Text>
                </>
              )}
              </div>


              {/* ── ADD PERMISSION (top) ──────────────────────────────────
                  Combobox to pick a permission + Add button.
                  Fires the assign API immediately on click — same pattern
                  as the "Add User to Group" section in ManageRolesInGroup.
              ──────────────────────────────────────────────────────────── */}
              {canWrite && ( // Only show the add-permission section when the user has write access.
              <div className={styles.addSection}>
                <Field label="Add Permission" required> {/* Label the combobox as a required field. */}
                  {/* Tooltip appears on the Combobox when the user lacks access to view permissions */}
                  <Tooltip
                    content="You don't have access to this" // Tooltip message shown when access is restricted.
                    relationship="label" // Associate tooltip content with the combobox label relationship.
                    visible={(!canViewPermissions || availableToAdd.length === 0) ? undefined : false} // Let Fluent UI decide visibility when disabled/restricted, otherwise hide tooltip.
                  >
                    <Combobox
                      size="small" // Use compact sizing to match dialog density.
                      placeholder="Select or Search by permission to add permission..." // Prompt text shown before selection/input.
                      value={permSearch} // Bind combobox text to search state.
                      onInput={(comboboxInputEvent) => {
                        setPermSearch((comboboxInputEvent.target as HTMLInputElement).value); // Update combobox search text as the user types.
                        // Clear selection if admin retypes after picking
                        if (selectedPermission) setSelectedPermission(null); // Clear selected permission if the user edits the freeform text after a prior selection.
                      }}
                      onOptionSelect={(_, optionSelectionData) => {
                        const selectedAvailablePermission = availableToAdd.find(
                          (availablePermission) => availablePermission.permission_id === optionSelectionData.optionValue // Find the selected permission object by matching the selected option value.
                        );
                        if (selectedAvailablePermission) {
                          setSelectedPermission(selectedAvailablePermission); // Store the selected permission object in state.
                          setPermSearch(selectedAvailablePermission.permission_key); // Reflect the selected permission key inside the combobox text.
                        }
                      }}
                      freeform // Allow typing arbitrary text for search behavior.
                      disabled={isFetchingPermissions || availableToAdd.length === 0 || !canViewPermissions} // Disable the combobox while loading, when nothing can be added, or when access is denied.
                    >
                      {isFetchingPermissions ? ( // Show loading option while permission catalog is being fetched.
                        <Option value="" text="Loading..." disabled>
                          <Spinner size="tiny" /> Loading permissions...
                        </Option>
                      ) : filteredAvailable.length === 0 ? ( // Show empty-state option when no results exist.
                        <Option value="" text="No results" disabled>
                          {availableToAdd.length === 0
                            ? "All permissions are already assigned." // Message when no addable permissions remain.
                            : "No permissions match your search."} {/* Message when filter returns no matches. */}
                        </Option>
                      ) : (
                        filteredAvailable.map((availablePermission) => ( // Render each permission that matches the add search filter.
                          <Option
                            key={availablePermission.permission_id} // Unique key for React list rendering.
                            value={availablePermission.permission_id} // Value used by the Combobox selection callback.
                            text={availablePermission.permission_key} // Text metadata for the option.
                          >
                            <div style={{ display: "flex", flexDirection: "column" }}> {/* Stack permission key and category vertically inside the option. */}
                              <Text size={300} weight="medium" style={{ fontFamily: "monospace" }}>
                                {availablePermission.permission_key} {/* Show permission key prominently using monospace styling. */}
                              </Text>
                              <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                                {availablePermission.category} {/* Show permission category as secondary text. */}
                              </Text>
                            </div>
                          </Option>
                        ))
                      )}
                    </Combobox>
                  </Tooltip>
                </Field>


                {/* Add button — fires API immediately */}
                <Button
                  appearance="primary" // Use primary styling for the add action.
                  size="small" // Use compact size to align with the Combobox.
                  icon={isAdding ? <Spinner size="tiny" /> : <AddRegular />} // Show loading spinner while adding, otherwise show add icon.
                  disabled={!selectedPermission || isAdding} // Disable until a permission is selected or while add request is in progress.
                  onClick={handleAdd} // Trigger permission assignment when clicked.
                  style={{ alignSelf: "flex-end" }} // Align the button to the bottom of the field row.
                >
                  {isAdding ? "Adding..." : "Add"} {/* Show progress text during add operation, otherwise default label. */}
                </Button>
              </div>
              )}



              {/* Add error */}
              {addError && <Text className={styles.errorText}>{addError}</Text>} {/* Show inline add error when permission assignment fails. */}
            </DialogTitle>


            <DialogContent className={styles.dialogContent}>
              {/* ── FILTER ASSIGNED PERMISSIONS ───────────────────────────
                  Quarter-width Input, right-aligned, no label — minimal footprint.
                  Filters the assigned permissions table client-side only.
              ──────────────────────────────────────────────────────────── */}
              <div className={styles.assignedFilterRow}>
                {/* Tooltip appears on the SearchBox when the user lacks read access */}
                <Tooltip
                  content="You don't have access to this" // Tooltip message shown when read access is missing.
                  relationship="label" // Associate tooltip content with the SearchBox label relationship.
                  visible={!canRead ? undefined : false} // Let Fluent decide visibility when disabled, otherwise keep it hidden.
                >
                  <SearchBox
                    size="small" // Use compact size for the filter field.
                    placeholder="Filter permissions..." // Placeholder text guiding the filter behavior.
                    value={assignedPermSearch} // Bind SearchBox value to assigned-permissions filter state.
                    onChange={(_, searchBoxData) => setAssignedPermSearch(searchBoxData.value)} // Update the assigned-permissions filter as the user types.
                    contentBefore={<SearchRegular />} // Render search icon inside the SearchBox.
                    className={styles.assignedFilterField} // Apply compact width styling.
                    disabled={!canRead} // Disable SearchBox when read access is not granted.
                  />
                </Tooltip>
              </div>


              {/* ── ASSIGNED PERMISSIONS TABLE ────────────────────────────
                  Same tabular style as ManageRolesInGroup.
                  Columns: Permission | Category | Action (Remove icon)
              ──────────────────────────────────────────────────────────── */}


              {/* Table header */}
              <div className={styles.tableHeader} style={{ gridTemplateColumns: GRID }}>
                <Text className={styles.tableHeaderText}>Permission</Text> {/* Header label for permission key column. */}
                <Text className={styles.tableHeaderText}>Added By</Text> {/* Header label for creator/timestamp column. */}
                <Text className={styles.tableHeaderText}
                style={{alignItems: "center", justifyContent: "center"}}>Category</Text> {/* Header label for category badge column, centered. */}
                <span /> {/* Action column — no label needed. */}
              </div>


              {/* Table body */}
              <div className={styles.scrollableContent}>
                {isFetchingPermissionsInRole ? ( // Show loading state while assigned permissions are being fetched.
                  <div className={styles.emptyState}>
                    <Spinner size="small" label="Loading assigned permissions..." /> {/* Loading indicator for assigned permission rows. */}
                  </div>
                ) : filteredAssigned.length === 0 ? ( // Show empty state when no assigned permissions exist or search has no matches.
                  // Empty state covers both "none assigned yet" and "no search match"
                  <div className={styles.emptyState}>
                    <ShieldKeyholeRegular style={{ fontSize: "32px" }} /> {/* Empty-state icon representing permissions/security. */}
                    <Text size={300}>
                      {assignedPermSearch.trim()
                        ? "No permissions match your search." // Empty-state message when the filter yields no results.
                        : "No permissions assigned to this role yet."} {/* Empty-state message when role has no assigned permissions. */}
                    </Text>
                    {!assignedPermSearch.trim() && (
                      <Text size={200}>Use the section above to assign the first permission.</Text> // Helper message shown only when the role truly has no permissions.
                    )}
                  </div>
                ) : (
                  // Render only the rows that pass the assigned permissions filter
                  filteredAssigned.map((assignedPermissionRow: any) => (
                    <div
                      key={assignedPermissionRow.permission_id} // Unique React key for each assigned permission row.
                      className={styles.tableRow} // Apply row styling.
                      style={{ gridTemplateColumns: GRID }} // Use the shared grid template so columns align with the header.
                    >
                      {/* Permission key */}
                      <div>
                        <Text>{assignedPermissionRow.permission_key}</Text> {/* Display the assigned permission key. */}
                      </div>


                      {/* ── Added By ── */}
                      <div className={styles.nameStack}>
                        <Text size={200}>{assignedPermissionRow.created_by}</Text> {/* Show who added/created this role-permission mapping. */}
                        {assignedPermissionRow.created_at && (
                          <Text className={styles.subText}>
                            {formatDateTime(assignedPermissionRow.created_at)} {/* Show formatted creation timestamp when available. */}
                          </Text>
                        )}
                      </div>


                      {/* Category badge */}
                      <Badge appearance="tint" color="informative" size="small">
                        {assignedPermissionRow.category} {/* Display the permission category inside an informative badge. */}
                      </Badge>


                      {/* Remove icon — opens confirmation dialog */}
                      {canWrite && ( // Only show remove action when the user has write permission.
                      <div style={{ textAlign: "right" }}>
                        {/* Tooltip shows "no access" when user lacks write permission */}
                        <Tooltip
                          content={!canWrite ? "You don't have access to this" : "Remove permission from role"} // Explain the action or lack of access.
                          relationship="label" // Associate tooltip content with the button label relationship.
                        >
                          <Button
                            appearance="subtle" // Use subtle styling for row-level destructive icon action.
                            size="small" // Keep the button compact for table layout.
                            icon={<DeleteRegular />} // Use delete icon to indicate remove action.
                            onClick={() => handleRemoveClick(assignedPermissionRow)} // Open confirmation dialog for this assigned permission.
                            aria-label={`Remove ${assignedPermissionRow.permission_key}`} // Accessible label naming the specific permission to remove.
                            style={{ color: tokens.colorPaletteRedForeground1 }} // Use red foreground to visually indicate destructive action.
                            disabled={!canWrite} // Disable the button if write access is not available.
                          />
                        </Tooltip>
                      </div>
                    )}
                    </div>
                  ))
                )}
              </div>


            </DialogContent>


          </DialogBody>
          )}
        </DialogSurface>
      </Dialog>


      {/* ================================================================
          CONFIRMATION DIALOG — Remove Permission
          Opens when admin clicks the delete icon on a row.
      ================================================================ */}
      <Dialog
        open={!!pendingRemovePermission} // Open the confirmation dialog whenever a permission is pending removal.
        onOpenChange={(_, dialogState) => {
          if (!dialogState.open) {
            setPendingRemovePermission(null); // Clear the pending permission when the dialog closes.
            setRemoveError(null); // Clear any remove error when the dialog closes.
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Remove Permission</DialogTitle> {/* Confirmation dialog title. */}


            <DialogContent>
              <Text size={300} className="text-neutral-foreground-2">
                Are you sure you want to remove{" "} {/* Opening confirmation prompt text. */}
                <Text size={300} weight="bold" style={{ fontFamily: "monospace" }}>
                  {pendingRemovePermission?.permission_key} {/* Show the permission key being removed. */}
                </Text>{" "}
                from the role{" "} {/* Text connecting permission and role names. */}
                <Text size={300} weight="bold">
                  {selectedRole?.role_name} {/* Show the target role name. */}
                </Text>
                ? {/* End the confirmation question. */}
              </Text>
              <Text
                size={200} // Use smaller text for the supporting note.
                style={{
                  color: tokens.colorNeutralForeground3, // Use muted text color for secondary note.
                  display: "block", // Force the note onto its own line.
                  marginTop: tokens.spacingVerticalS, // Add spacing above the note.
                }}
              >
                This will take effect immediately. {/* Inform the admin that the removal is immediate. */}
              </Text>


              {/* Error shown inside confirmation dialog if the API call fails */}
              {removeError && (
                <Text className={styles.errorText}>{removeError}</Text> // Show inline error if the remove request fails.
              )}
            </DialogContent>


            <DialogActions>
              {/* Cancel — closes confirmation, no API call made */}
              <Button
                appearance="secondary" // Use secondary styling for the cancel action.
                onClick={() => {
                  setPendingRemovePermission(null); // Close the confirmation dialog by clearing the pending permission.
                  setRemoveError(null); // Clear any remove error when cancelling.
                }}
                disabled={isRemoving} // Prevent cancellation while the remove request is in progress.
              >
                Cancel {/* Cancel button label. */}
              </Button>
              {/* Confirm — fires remove API immediately */}
              <Button
                appearance="primary" // Use primary styling for the confirm remove action.
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }} // Apply red background to signal destructive intent.
                onClick={handleConfirmRemove} // Trigger the remove API call.
                disabled={isRemoving} // Disable the button while removal is in progress.
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