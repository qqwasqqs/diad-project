/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Atharva Mundhada
  Date: 20 May 2026

  Purpose:
  ManageRolesInGroup component for the Groups tab in the Roles Management Dashboard.
  - Lists existing user→role assignments for a selected group (Databricks-style table).
  - Allows admins to assign a new user+role to the group via an inline Add section.
  - Existing rows support per-row role change (marks dirty → per-row Save button appears).
  - Delete fires immediately with no Save step.
  - User search filters from the pre-fetched dashboardUsers list (client-side).
  - Role list comes from the useGetDashboardRoles hook.
  - Payload shape for assignRoleToUserInAGroup: { user_id, group_id, role_id, added_by }
*/

// Import Fluent UI styling helpers, controls, and dialog building blocks used by this component.
import {
  makeStyles, // Fluent UI utility used to create component-scoped CSS-in-JS styles.
  tokens, // Fluent UI design tokens used for spacing, colors, font sizes, borders, and more.
  Spinner, // Loading indicator component used during async operations and fetch states.
  Button, // Button component used for add, save, close, cancel, and delete actions.
  Dialog, // Root dialog container component used to render modal windows.
  DialogSurface, // The visible dialog panel/surface shown inside the dialog overlay.
  DialogTitle, // Title section of the dialog where heading and top actions are placed.
  DialogBody, // Main wrapper for the dialog content structure.
  DialogActions, // Footer action area used in confirmation dialogs for buttons like Cancel/Remove.
  DialogContent, // Content area of the dialog where table rows and informational text are rendered.
  DialogTrigger, // Trigger wrapper used by Fluent UI for close/open interaction slots.
  Field, // Form field wrapper used to associate labels and controls cleanly.
  Text, // Typography component for rendering styled text with Fluent UI semantics.
  Tooltip, // Tooltip component used to explain disabled actions or user intent.
  Select, // Native-style dropdown selection control used for role selection.
  Combobox, // Searchable combo input used for selecting users from a list.
  Option, // Individual option item used inside the Combobox component.
  Badge, // Visual status pill used to show active/inactive state and other metadata.
} from "@fluentui/react-components";

// Import Fluent UI icons used throughout the dialog UI.
import {
  PersonRegular, // Icon used in each table row to represent an individual user.
  PeopleRegular, // Icon used near the member count to represent multiple assigned users.
  DeleteRegular, // Icon used for delete/remove actions.
  SaveRegular, // Icon used for per-row save actions.
  DismissRegular, // Icon used for closing the dialog.
  AddRegular, // Icon used on the add button.
  ShieldPersonRegular, // Icon used in the empty state to represent role/user protection management.
} from "@fluentui/react-icons";

// Import React types and hooks required by this functional component.
import { FC, useState, useMemo, useRef, useCallback, useEffect } from "react";

// Import custom hooks for fetching dashboard users and group-specific user-role assignments.
import { useGetDashboardUsers, useGetGroupUserRoles } from "@/hooks/useRolesManagement";

// Import custom hook for fetching available dashboard roles.
// The inline note indicates that this hook is expected to exist in the project.
import { useGetDashboardRoles } from "@/hooks/useRolesManagement"; // assumes this hook exists

// Import service layer methods used to assign, update, and remove roles from users in groups.
import { rolesManagementService } from "@/lib/services/rolesManagementService";

// Import backend/API TypeScript types used by this component for strong typing.
import { DashboardGroup, DashboardUser, DashboardRole } from "@/types/api";

// Import shared helper for converting raw date strings into human-readable timestamps.
import { formatDateTime } from "@/lib/helper";

// Import global toast hook used to show success feedback messages after operations.
import { useGlobalToast } from "@/hooks/useToast";

// Import permission hook used to determine read/write access for this page and related resources.
import { usePagePermissions } from "@/hooks/hasPagePermissions";


// ---------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------


// Define the shape of a single row shown in the permissions table.
interface PermissionEntry {
  /** Unique mapping ID from the backend (user_role_mapping id) */
  mapping_id: string; // Unique identifier for the user-role-group mapping row.
  user_id: string; // Unique identifier of the user assigned to the group.
  group_id: string; // Unique identifier of the group for this mapping.
  role_id: string; // Currently persisted role identifier assigned to the user for this group.
  /** Display name of the user */
  display_name: string; // Human-readable user name shown in the table.
  email?: string; // Optional user email shown as subtext if available.
  /** Display name of the currently persisted role */
  role_name: string; // Human-readable role name corresponding to the persisted role_id.
  added_by: string; // Name or identifier of the user/admin who created the mapping.
  added_at?: string; // Optional timestamp indicating when the mapping was created.
  /** Pending role_id if admin changed the dropdown but hasn't saved yet */
  pendingRoleId?: string; // Temporary role ID selected in the UI but not yet persisted.
  /** Pending role display name matching pendingRoleId */
  pendingRoleName?: string; // Temporary role name matching the unsaved pendingRoleId.
}


// ---------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------


// Create component-scoped styles using Fluent UI's makeStyles helper.
const useStyles = makeStyles({
  dialogHeader: {
    alignItems: "center", // Vertically center header content.
    display: "flex", // Use horizontal flex layout for title and header elements.
    justifyContent: "space-between", // Keep header content spread across available width.
  },
  dialogHeaderMeta: {
    color: tokens.colorNeutralForeground1, // Use primary neutral foreground color for header metadata text.
    fontSize: tokens.fontSizeBase400, // Set a readable medium font size for the dialog heading text.
    display: "block", // Render the text as a block-level element.
  },
  dialogContainer: {
    width: "1080px", // Keep the dialog at a wide fixed width for table readability.
    maxWidth: "1280px", // Prevent the dialog from growing too wide on larger screens.
    minHeight: "250px" // Ensure a minimum dialog height even when little content exists.
  },
  dialogContent: {
    gap: "0", // Remove extra content gap so the table layout remains tight and aligned.
    maxHeight: "400px" // Constrain the content area height so long content scrolls instead of overflowing.
  },
  // ── Table ───────────────────────────────────────────────────────────
  tableHeader: {
    display: "grid", // Render the table header as a CSS grid for column alignment.
    gap: tokens.spacingHorizontalM, // Add consistent horizontal spacing between grid columns.
    paddingBottom: tokens.spacingVerticalXS, // Add a small bottom padding below the header row.
    borderBottom: `2px solid ${tokens.colorNeutralStroke2}`, // Add a strong bottom border to visually separate the header.
    marginBottom: tokens.spacingVerticalXS, // Add a small gap below the header before table rows begin.
  },
  tableHeaderText: {
    fontSize: tokens.fontSizeBase100, // Use smaller text size for compact column labels.
    fontWeight: tokens.fontWeightSemibold, // Make the header labels semibold for emphasis.
    color: tokens.colorNeutralForeground1, // Use strong neutral text color for readability.
    textTransform: "uppercase", // Display header labels in uppercase for a table-style look.
    letterSpacing: "0.05em", // Increase letter spacing slightly for visual distinction.
  },
  tableRow: {
    display: "grid", // Render each data row as a grid to align with the header columns.
    gap: tokens.spacingHorizontalM, // Match the header column spacing for alignment consistency.
    alignItems: "center", // Vertically center the row content in each cell.
    paddingBlock: tokens.spacingVerticalS, // Add vertical padding to make each row easier to scan.
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`, // Add a subtle dividing line between rows.
    ":last-child": {
      borderBottom: "none", // Remove the bottom border from the last row for a cleaner ending edge.
    },
  },
  tableRowHover: {
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2, // Change background slightly on hover for row feedback.
      borderRadius: tokens.borderRadiusMedium, // Add rounded corners during hover for a polished look.
    },
  },
  nameCell: {
    display: "flex", // Use flexbox so icon and text stack can sit horizontally.
    alignItems: "center", // Vertically align the icon and text content.
    gap: tokens.spacingHorizontalS, // Add spacing between the user icon and the name stack.
  },
  nameStack: {
    display: "flex", // Use flexbox to stack name and subtext vertically.
    flexDirection: "column", // Arrange name and email one above the other.
    color: tokens.colorNeutralForeground2 // Apply softer neutral foreground color to secondary stack content.
  },
  subText: {
    fontSize: tokens.fontSizeBase100, // Use smaller font size for secondary text like email and timestamps.
    color: tokens.colorNeutralForeground2, // Apply muted text color for subtext.
  },
  // ── Add section ─────────────────────────────────────────────────────
  addSectionLabel: {
    fontSize: tokens.fontSizeBase200, // Use slightly larger text for the add section label.
    fontWeight: tokens.fontWeightSemibold, // Make the label semibold for section emphasis.
    color: tokens.colorNeutralForeground2, // Use muted color so it doesn't compete with the dialog title.
    display: "block", // Render as a block element so margins behave predictably.
    marginTop: tokens.spacingVerticalL, // Add space above the add section.
    marginBottom: tokens.spacingVerticalS, // Add a small space below the label.
    paddingTop: tokens.spacingVerticalM, // Create breathing room above the section content.
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`, // Separate the add section from content above with a border.
  },
  addRow: {
    display: "grid", // Layout the add controls using a three-column grid.
    gridTemplateColumns: "1fr 1fr auto", // Allocate space for user field, role field, and add button.
    gap: tokens.spacingHorizontalS, // Add spacing between the add section controls.
    alignItems: "flex-end", // Align fields and button along their bottom edge for a tidy form row.
    marginTop: tokens.spacingVerticalXS, // Add a small top margin above the add row.
    marginBottom: tokens.spacingVerticalM // Add spacing below the add row before other content starts.
  },
  // ── Empty / info states ─────────────────────────────────────────────
  emptyState: {
    display: "flex", // Use flexbox to center the empty state content.
    flexDirection: "column", // Stack icon and text vertically.
    alignItems: "center", // Center-align empty state children horizontally.
    justifyContent: "center", // Center the empty state content vertically in its area.
    gap: tokens.spacingVerticalS, // Add spacing between empty state elements.
    paddingBlock: tokens.spacingVerticalXXL, // Provide generous vertical space so the empty state feels intentional.
    color: tokens.colorNeutralForeground2 // Use muted foreground color for empty state messaging.
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1, // Use red text to indicate errors clearly.
    fontSize: tokens.fontSizeBase200, // Use readable text size for error messages.
    display: "block", // Render the error text as a block element.
    marginTop: tokens.spacingVerticalS, // Add space above the error message.
  },
  roleBadge: {
    display: "inline-flex", // Make the badge size itself to content while aligning inner elements with flexbox.
    alignItems: "center", // Vertically center badge content.
    gap: tokens.spacingHorizontalXS, // Add small spacing between any inner badge items.
    padding: `2px ${tokens.spacingHorizontalS}`, // Give the badge a compact pill-like internal padding.
    borderRadius: tokens.borderRadiusMedium, // Round the badge corners.
    backgroundColor: tokens.colorBrandBackground2, // Use brand-tinted background for the badge.
    color: tokens.colorBrandForeground2, // Use matching brand foreground color for text contrast.
    fontSize: tokens.fontSizeBase100, // Keep badge text compact.
    fontWeight: tokens.fontWeightSemibold, // Make badge text semibold for clarity.
  },
  dirtyIndicator: {
    width: "6px", // Set the width of the unsaved-change indicator dot.
    height: "6px", // Set the height of the unsaved-change indicator dot.
    borderRadius: "50%", // Make the indicator perfectly circular.
    backgroundColor: tokens.colorPaletteYellowForeground1, // Use yellow to indicate pending/unsaved state.
    display: "inline-block", // Render the indicator inline next to the user name.
    marginLeft: tokens.spacingHorizontalXS, // Add small spacing before the indicator dot.
  },
  scrollableContent: {
    overflowY: "auto", // Allow vertical scrolling when the table grows taller than the content area.
    overflowX: "hidden", // Prevent horizontal scrolling in the content region.
    marginRight: `-${tokens.spacingHorizontalM}`, // Offset right margin to visually align with dialog padding.
    paddingRight: tokens.spacingHorizontalM, // Add matching internal right padding to preserve content spacing.
  },
  memberCount: {
    display: "inline-flex", // Keep icon and text on one line while sizing to content.
    alignItems: "center", // Vertically align the icon and member count text.
    gap: tokens.spacingHorizontalXS, // Add small spacing between the icon and text.
    fontSize: tokens.fontSizeBase100, // Keep the member count text compact.
    color: tokens.colorNeutralForeground1 // Use neutral foreground color for count visibility.
  },
});


// ---------------------------------------------------------------------
// PROPS
// ---------------------------------------------------------------------


// Define the props accepted by the ManageRolesInGroup component.
interface ManageRolesInGroupProps {
  isPermissionsDialogOpen: boolean; // Controls whether the main permissions dialog is visible.
  setIsPermissionsDialogOpen: (open: boolean) => void; // Setter used to open or close the main permissions dialog.
  /** The group whose permissions we are managing */
  permissionsGroup: DashboardGroup | null; // The currently selected group whose user-role mappings are being managed.
  setPermissionsGroup: (group: DashboardGroup | null) => void; // Setter used to clear or replace the currently selected group.
  /** The current user's ID — used as `added_by` in the payload */
}


// ---------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------


// Define the component as a typed React functional component.
export const ManageRolesInGroup: FC<ManageRolesInGroupProps> = ({
  isPermissionsDialogOpen, // Current open/closed state of the permissions dialog.
  setIsPermissionsDialogOpen, // Setter used to toggle the permissions dialog state.
  permissionsGroup, // Current target group being managed.
  setPermissionsGroup, // Setter used to clear or update the target group.
}) => {
  const styles = useStyles(); // Generate the component's CSS class names from the style definitions above.


  // Get the global toast notification function for showing success/error messages.
  const { showToast } = useGlobalToast();


  // Read page-level permissions relevant to managing user roles inside groups.
  const {
    canRead: canReadUserRoles, // Whether the current user can read group user-role mappings.
    canWrite: canWriteUserRoles, // Whether the current user can modify group user-role mappings.
    hasPermission, // Helper function used to test additional fine-grained permissions.
    isLoadingPermissions: isLoadingUserRolePermissions // Whether the permission state is still loading.
  } = usePagePermissions("roles-management-manage-user-roles");


  // Determine whether the current user can view dashboard users for the add-user combobox.
  const canViewUsers = hasPermission("roles-management-users:read");

  // Determine whether the current user can view dashboard roles for role dropdowns.
  const canViewRoles = hasPermission("roles-management-roles:read");


  // ── Data hooks ──────────────────────────────────────────────────────
  const { dashboardUsers, isFetchingUsers } = useGetDashboardUsers(canViewUsers); // Fetch all dashboard users only if the viewer has permission.
  const { dashboardRoles, isFetchingRoles } = useGetDashboardRoles(canViewRoles); // Fetch all available dashboard roles only if the viewer has permission.
  const { userRolesInGroup, refetch, isFetchingUserRolesInGroup } = useGetGroupUserRoles(permissionsGroup?.group_id || "", canReadUserRoles) // Fetch all role assignments for the selected group when read permission exists.


  // ── Existing entries table state ─────────────────────────────────────
  const [entries, setEntries] = useState<PermissionEntry[]>(); // Local editable copy of group role mappings used for dirty tracking.
  const [savingMappingId, setSavingMappingId] = useState<string | null>(null); // Tracks which mapping row is currently being saved.
  const [deletingMappingId, setDeletingMappingId] = useState<any | null>(null); // Stores the row currently selected for delete confirmation.
  const [tableError, setTableError] = useState<string | null>(null); // Stores any table-level error such as save/remove failure.


  // ── Add-new-entry state ─────────────────────────────────────────────
  const [userSearchQuery, setUserSearchQuery] = useState<string>(""); // Current freeform search value inside the user combobox.
  const [selectedUser, setSelectedUser] = useState<DashboardUser | null>(null); // Currently selected user to be added to the group.
  const [selectedRoleId, setSelectedRoleId] = useState<string>(""); // Currently selected role ID for the new assignment.
  const [addingEntry, setAddingEntry] = useState<boolean>(false); // Tracks whether a new assignment API call is currently in progress.
  const [addError, setAddError] = useState<string | null>(null); // Stores any error related to adding a new assignment.


  const [isRemoving, setIsRemoving] = useState<boolean>(false); // Tracks whether the confirmed delete/remove operation is currently running.


  // Synchronize local editable entries whenever fresh group role data finishes loading.
  useEffect(() => {
    if (!isFetchingUserRolesInGroup) { // Only update local state after the fetch is complete.
      setEntries(userRolesInGroup); // Copy the latest backend data into local state for table editing.
    }
  }, [isFetchingUserRolesInGroup, userRolesInGroup]); // Re-run when fetch status or fetched group role data changes.


  // This redirect logic is currently intentionally disabled/commented out.
  // useEffect(() => {
  //   if(!isLoadingUserRolePermissions && !canReadUserRoles) {
  //     window.location.href = "/forbidden";
  //   }
  // }, [isLoadingUserRolePermissions, canReadUserRoles]);


  // ── Sync entries when initialEntries change (dialog re-opens) ────────
  // Track the previously selected group so the component can detect group changes.
  const prevGroupRef = useRef<string | null>(null);

  // Compare current selected group ID against the previously stored group ID.
  if (permissionsGroup?.group_id !== prevGroupRef.current) {
    prevGroupRef.current = permissionsGroup?.group_id ?? null; // Update the tracked group reference whenever the target group changes.
    // Intentional: reset on group change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }


  // ── Filtered user list for search combobox ───────────────────────────
  const filteredUsers = useMemo<DashboardUser[]>(() => { // Memoize filtered users so the list recalculates only when dependencies change.
    if (!dashboardUsers) return []; // If users are not loaded yet, return an empty list.
    const normalizedQuery = userSearchQuery.toLowerCase().trim(); // Normalize the search text for case-insensitive matching.
    if (!normalizedQuery) return dashboardUsers; // If search is empty, return the full available user list.
    return dashboardUsers.filter( // Filter the pre-fetched users client-side based on search text.
      (dashboardUser: DashboardUser) => // Evaluate each dashboard user entry against the search query.
        dashboardUser.display_name?.toLowerCase().includes(normalizedQuery) || // Match against display name when available.
        dashboardUser.email?.toLowerCase().includes(normalizedQuery) || // Match against email when available.
        dashboardUser.user_id?.toLowerCase().includes(normalizedQuery) // Match against user ID when available.
    );
  }, [dashboardUsers, userSearchQuery]); // Recompute only when the user list or the search query changes.


  // ── Handlers — existing row role change (mark dirty) ─────────────────
  const handleRoleDropdownChange = useCallback( // Memoize this handler so stable references can be reused across renders.
    (mappingId: string, newRoleId: string) => { // Accept the mapping row being changed and the newly selected role ID.
      const selectedRole = (dashboardRoles ?? []).find((dashboardRole: DashboardRole) => dashboardRole.role_id === newRoleId); // Find the full role object for the selected role ID.
      setEntries((previousEntries: any) => // Update entries using the previous state snapshot.
        previousEntries.map((permissionEntry: any) => { // Iterate through each existing table row.
          if (permissionEntry.mapping_id !== mappingId) return permissionEntry; // Leave all unrelated rows unchanged.
          // Revert to clean if user picks the already-persisted role
          if (newRoleId === permissionEntry.role_id) return { ...permissionEntry, pendingRoleId: undefined, pendingRoleName: undefined }; // Clear dirty state if the selected role matches the original persisted role.
          return { ...permissionEntry, pendingRoleId: newRoleId, pendingRoleName: selectedRole?.role_name ?? newRoleId }; // Mark the row as dirty with pending role data.
        })
      );
    },
    [dashboardRoles] // Recreate the callback only if the available roles change.
  );


  // ── Handlers — save a single dirty row ──────────────────────────────
  const handleSaveRow = async (mappingId: string) => { // Save a single modified row to the backend.
    const entryToSave = entries?.find((permissionEntry) => permissionEntry.mapping_id === mappingId); // Locate the row that matches the requested mapping ID.
    if (!entryToSave?.pendingRoleId || !permissionsGroup) return; // Exit early if there is nothing pending to save or no group is selected.
 
    setSavingMappingId(mappingId); // Mark this row as currently being saved.
    setTableError(null); // Clear any previous table-level error before attempting save.
    try {
      const payload = { // Build the payload expected by the update API.
        mapping_id: mappingId, // Include the mapping identifier so the backend knows which assignment to update.
        user_id: entryToSave.user_id, // Include the user ID for the assignment being updated.
        group_id: permissionsGroup.group_id, // Include the selected group ID.
        role_id: entryToSave.pendingRoleId, // Persist the newly selected pending role.
      };
      await rolesManagementService.updateRoleToUserInAGroup(payload).then((response) => { // Call the service to update the user's role in the group.
        refetch(); // Refresh backend data after a successful update.
        showToast("Role updated successfully."); // Show a success toast to the user.
        setEntries((previousEntries: any) => // Update local state so the saved row becomes clean immediately.
          previousEntries?.map((permissionEntry: any) => // Iterate through all rows in local state.
            permissionEntry.mapping_id === mappingId // Find the row that was just saved.
              ? { // Replace the saved row with updated persisted values.
                  ...permissionEntry, // Preserve all existing row fields.
                  role_id: entryToSave.pendingRoleId!, // Update the persisted role ID to the newly saved value.
                  role_name: entryToSave.pendingRoleName ?? entryToSave.pendingRoleId!, // Update the persisted role name to the pending role name when available.
                  pendingRoleId: undefined, // Clear the unsaved pending role ID because save is complete.
                  pendingRoleName: undefined, // Clear the unsaved pending role name because save is complete.
                }
              : permissionEntry // Keep non-target rows unchanged.
          )
        );
      });
    } catch {
      setTableError("Failed to update role. Please try again."); // Show a user-friendly error if the update fails.
    } finally {
      setSavingMappingId(null); // Clear row saving state regardless of success or failure.
    }
  };


  // ── Handlers — delete a row immediately ─────────────────────────────
  const handleDeleteRow = async (userRole: any) => { // Open the confirmation dialog for the selected user-role mapping.
    setDeletingMappingId(userRole); // Store the selected mapping row so the confirmation dialog can display its details.
  }


  const handleConfirmDelete = async () => { // Perform the actual remove operation after user confirmation.
    setIsRemoving(true); // Mark the confirmation dialog action as in progress.
    setTableError(null); // Clear any previous table-level error before attempting removal.
    try {
      // TODO: wire up actual delete endpoint when available
      await rolesManagementService.removeUserFromGroup(deletingMappingId.mapping_id) // Call the service to remove the selected mapping from the group.
      .then((response) => { // Handle successful remove response.
        refetch(); // Refresh backend data after removal succeeds.
        showToast("User removed successfully."); // Show success feedback to the user.
      })
    } catch {
      setTableError("Failed to remove user. Please try again."); // Show a friendly error message if removal fails.
    } finally {
      setDeletingMappingId(null); // Close the confirmation dialog by clearing the selected mapping.
      setIsRemoving(false); // Clear the removal loading state.
    }
  };


  // ── Handlers — add new entry ─────────────────────────────────────────
  const handleAddEntry = async () => { // Add a new user-role assignment for the currently selected group.
    if (!selectedUser || !selectedRoleId || !permissionsGroup) return; // Do nothing unless user, role, and group are all selected.


    // Guard: already assigned?
    if (entries?.some((permissionEntry) => permissionEntry.user_id === selectedUser.user_id)) { // Prevent duplicate user assignment within the same group.
      setAddError("This user already has a role assigned in this group."); // Show a friendly duplicate-assignment error.
      return; // Stop the add operation if the user is already assigned.
    }


    setAddingEntry(true); // Mark add operation as in progress.
    setAddError(null); // Clear any previous add-section error.
    try {
      const payload = { // Build the payload expected by the add-assignment API.
        user_id: selectedUser.user_id, // Include selected user ID.
        group_id: permissionsGroup.group_id, // Include the selected group ID.
        role_id: selectedRoleId, // Include the selected role ID.
      };
      await rolesManagementService.assignRoleToUserInAGroup(payload) // Call the service to create the new user-role assignment.
      .then((response) => { // Handle successful add response.
        refetch(); // Refresh backend data so the new row appears in the table.
        setSelectedUser(null); // Clear the selected user after successful add.
        setUserSearchQuery(""); // Reset the combobox input after successful add.
        setSelectedRoleId(""); // Clear the selected role after successful add.
        showToast("User added successfully."); // Show success feedback to the user.
      })
    } catch (error) {
      setAddError("Failed to assign role."); // Show a user-friendly error if the add operation fails.
    } finally {
      setAddingEntry(false); // Clear add loading state regardless of success or failure.
    }
  };


  // ── Close / reset ────────────────────────────────────────────────────
  const handleClose = () => { // Close the dialog and reset local transient UI state.
    setIsPermissionsDialogOpen(false); // Close the main permissions dialog.
    setPermissionsGroup(null); // Clear the selected group context.
    setTableError(null); // Clear any table-level error.
    setAddError(null); // Clear any add-section error.
    setSelectedUser(null); // Clear any selected user in the add form.
    setUserSearchQuery(""); // Reset the user search input.
    setSelectedRoleId(""); // Reset the selected role dropdown.
  };


  // ── Column grid template ─────────────────────────────────────────────
  // User | Role | Added By | Save | Delete
  const GRID = "0.8fr 200px 0.2fr 250px 70px 36px 32px"; // Shared grid column definition used by both header and body rows for alignment.


  // ── Render ───────────────────────────────────────────────────────────
  return ( // Return the full UI for the group role management dialog and delete confirmation dialog.
    <> {/* Use a fragment because the component returns two dialog roots side by side. */}
    <Dialog // Main dialog for viewing and managing users/roles inside a group.
      open={isPermissionsDialogOpen} // Bind dialog visibility to the prop-driven open state.
      onOpenChange={(_, data) => { // React when Fluent UI requests an open state change.
        if (!data.open) handleClose(); // If the dialog is being closed, run shared close/reset logic.
      }}
    >
      <DialogSurface className={styles.dialogContainer}> {/* Main dialog surface container with fixed width styling. */}
        {!isLoadingUserRolePermissions && canReadUserRoles && ( // Only render the dialog body once permissions have loaded and read access is granted.


        <DialogBody> {/* Main dialog body container. */}
          {/* ── Title ── */}
          <DialogTitle // Dialog title area containing close button, heading, member count, and add controls.
              action={ // Fluent UI action slot shown in the title bar, usually top-right.
                // Fluent UI DialogTitle action slot — idiomatic × button top-right
                <DialogTrigger action="close">
                  <Button // Close icon button shown at the top-right of the dialog.
                    appearance="subtle" // Use subtle button style so the close button is visually lightweight.
                    aria-label="Close dialog" // Provide accessible label for screen readers.
                    icon={<DismissRegular />} // Render dismiss/close icon inside the button.
                    onClick={handleClose} // Run shared close/reset logic when the user clicks close.
                  />
                </DialogTrigger>
              }            
          >
            <Text className={styles.dialogHeaderMeta}>Manage User Roles for Group: {/* Dialog heading label for the selected group. */}
              <Text weight="bold" className="text-neutral-foreground-2">&nbsp;{permissionsGroup?.group_name ?? ""}</Text> {/* Show the selected group name in bold, or empty text if not available. */}
            </Text>


            {/* ── Member count pill ── */}
            <div className={styles.memberCount}> {/* Container for the assigned member count summary. */}
            {!isFetchingUserRolesInGroup && ( // Show member count only after the group-role data has loaded.
              <> {/* Group icon and count text together without adding extra DOM wrapper. */}
                <PeopleRegular className="text-neutral-foreground-2"/> {/* Icon representing assigned members in the group. */}
                <Text size={200} weight="semibold" className="text-neutral-foreground-2"> {/* Compact semibold text for member count. */}
                  {userRolesInGroup?.length}{" "} {/* Show the number of assigned users. */}
                  {userRolesInGroup?.length === 1 ? "member" : "members"} assigned {/* Use singular/plural label based on count. */}
              </Text>
              </>
            )}
            </div>



            {/* ══════════════════════════════════════════════════════════
                ADD NEW PRINCIPAL — no Save needed, Add fires immediately
            ══════════════════════════════════════════════════════════ */}
            {canWriteUserRoles && ( // Only show add controls if the current user has write access.
            <div className={styles.addRow}> {/* Grid row containing user selector, role selector, and add button. */}
              {/* User search combobox */}
              <Field label="User" required> {/* Form field for selecting a user to assign. */}
                {/* Tooltip appears on the Combobox when the user lacks access to view users */}
                <Tooltip // Tooltip used to explain why the combobox may be inaccessible.
                  content="You don't have access to this" // Tooltip message shown when access is missing.
                  relationship="label" // Associate the tooltip semantically with the labeled control.
                  visible={!canViewUsers ? undefined : false} // Show tooltip only when user-view permission is missing.
                >
                  <Combobox // Searchable combobox for selecting a dashboard user.
                    size="small" // Use compact size to fit neatly in the inline add row.
                    placeholder="Search by name or email..." // Placeholder guiding the user on searchable fields.
                    value={userSearchQuery} // Bind combobox text input to the search query state.
                    onInput={(event) => { // Update the search query as the user types.
                      setUserSearchQuery((event.target as HTMLInputElement).value); // Store the typed combobox value in state.
                      // Clear selection if user re-types after picking
                      if (selectedUser) setSelectedUser(null); // Clear selected user if typing resumes after a prior selection.
                    }}
                    onOptionSelect={(_, data) => { // Handle selection of a user from the dropdown options.
                      const user = (dashboardUsers ?? []).find( // Find the selected dashboard user object by selected option value.
                        (dashboardUser: DashboardUser) => dashboardUser.user_id === data.optionValue // Match option value against each user ID.
                      );
                      if (user) { // Proceed only if a matching user was found.
                        setSelectedUser(user); // Save the full selected user object in state.
                        setUserSearchQuery(user.display_name ?? user.email ?? user.user_id); // Populate the combobox input with the best available user label.
                      }
                    }}
                    freeform // Allow free typing in the combobox input.
                    disabled={!canViewUsers} // Disable the combobox if the user is not allowed to view users.
                  >
                    {isFetchingUsers ? ( // Render loading option while user data is being fetched.
                      <Option value="" text="Loading..." disabled> {/* Disabled placeholder option during loading. */}
                        <Spinner size="tiny" /> Loading users... {/* Tiny spinner and loading label inside the dropdown. */}
                      </Option>
                    ) : filteredUsers.length === 0 ? ( // Render empty result option if filtering produced no users.
                      <Option value="" text="No results" disabled> {/* Disabled placeholder option for no search results. */}
                        No users found {/* Human-readable no-results text. */}
                      </Option>
                    ) : ( // Otherwise render the filtered list of users.
                      filteredUsers.map((user: DashboardUser) => ( // Map each filtered user into a combobox option.
                        <Option
                          key={user.user_id} // Use stable user ID as the React key.
                          value={user.user_id} // Store user ID as the selectable option value.
                          text={user.display_name ?? user.email ?? user.user_id} // Use best available label text for filtering and display.
                        >
                          <div style={{ display: "flex", flexDirection: "column" }}> {/* Stack display name and email vertically inside each option. */}
                            <Text size={300} weight="medium"> {/* Primary user label inside the option. */}
                              {user.display_name ?? user.user_id} {/* Show display name, falling back to user ID if needed. */}
                            </Text>
                            {user.email && ( // Show email only when available.
                              <Text
                                size={200} // Use smaller text for secondary email information.
                                style={{ color: tokens.colorNeutralForeground1 }} // Apply muted neutral styling to email text.
                              >
                                {user.email} {/* Render the user's email inside the option. */}
                              </Text>
                            )}
                          </div>
                        </Option>
                      ))
                    )}
                  </Combobox>
                </Tooltip>
              </Field>


              {/* Role select */}
              <Field label="Role" required> {/* Form field for selecting the role for the new assignment. */}
                {/* Tooltip appears on the Select when the user lacks access to view roles */}
                <Tooltip // Tooltip used to explain disabled role selection access.
                  content="You don't have access to this" // Tooltip message shown when role read access is missing.
                  relationship="label" // Associate the tooltip semantically with the field label.
                  visible={!canViewRoles ? undefined : false} // Show tooltip only when role-view permission is missing.
                >
                  <Select // Dropdown for selecting which role to assign to the selected user.
                    size="small" // Use compact control size to fit the inline add row.
                    value={selectedRoleId} // Bind the selected role dropdown value to state.
                    disabled={isFetchingRoles || !canViewRoles} // Disable while roles load or when role view access is missing.
                    onChange={(event) => setSelectedRoleId(event.target.value)} // Save the newly selected role ID into state.
                  >
                    <option value="" disabled> {/* Placeholder option shown before a role is selected. */}
                      {isFetchingRoles ? "Loading roles..." : "Select a role..."} {/* Show context-aware placeholder text. */}
                    </option>
                    {(dashboardRoles ?? []).map((role: DashboardRole) => ( // Render each available dashboard role as an option.
                      <option key={role.role_id} value={role.role_id}> {/* Use role ID as both key and option value. */}
                        {role.role_name} {/* Show role name as the option label. */}
                      </option>
                    ))}
                  </Select>
                </Tooltip>
              </Field>


              {/* Add button */}
              <Button // Button that submits the new user-role-group assignment.
                appearance="primary" // Use primary appearance because this is the main action in the add row.
                size="small" // Keep the button compact to align with other add controls.
                icon={addingEntry ? <Spinner size="tiny" /> : <AddRegular />} // Show spinner while adding, otherwise show add icon.
                disabled={!selectedUser || !selectedRoleId || addingEntry} // Enable only when both selections exist and no add operation is in progress.
                onClick={handleAddEntry} // Trigger the add-entry handler when clicked.
                style={{ alignSelf: "flex-end" }} // Align the button to the bottom of the form row.
              >
                {addingEntry ? "Adding..." : "Add"} {/* Show operation-specific label depending on add state. */}
              </Button>
            </div>
            )}


            {/* Add-section error */}
            {addError && <Text className={styles.errorText}>{addError}</Text>} {/* Show add-form error message when present. */}
          </DialogTitle>
          <DialogContent className={styles.dialogContent}> {/* Main dialog content containing table header, rows, and errors. */}


            {/* ══════════════════════════════════════════════════════════
                EXISTING ENTRIES TABLE
            ══════════════════════════════════════════════════════════ */}
            <div
              className={styles.tableHeader} // Apply shared table header styling.
              style={{ gridTemplateColumns: GRID }} // Reuse the same grid column template as the data rows.
            >
              <Text className={styles.tableHeaderText}>User</Text> {/* Header label for the user column. */}
              <Text className={styles.tableHeaderText}>Role</Text> {/* Header label for the role column. */}
              <span/> {/* Intentional spacer column matching the row layout. */}
              <Text className={styles.tableHeaderText}>Added By</Text> {/* Header label for the added-by metadata column. */}
              <Text className={styles.tableHeaderText}>Status</Text> {/* Header label for the active/inactive status column. */}
              <span /> {/* Save column */}
              <span /> {/* Delete column */}
            </div>


            <div className={styles.scrollableContent}> {/* Scrollable area containing either empty state, loading state, or data rows. */}
              {!isFetchingUserRolesInGroup && (userRolesInGroup?.length === 0 && ( // Show empty state only after load completes and there are no assignments.
                <div className={styles.emptyState}> {/* Centered empty state container. */}
                  <ShieldPersonRegular style={{ fontSize: "32px" }} /> {/* Large icon representing protected role/group management. */}
                  <Text size={300}>No users assigned to this group yet.</Text> {/* Primary empty state message. */}
                  <Text size={200}>Use the section above to assign the first user.</Text> {/* Secondary empty state guidance. */}
                </div>
              ))}


              {!isFetchingUserRolesInGroup ? // If row data is loaded, render rows; otherwise render loading indicator.
              ( entries?.map((entry: any) => { // Render each permission entry row from local editable state.
                const isSaving = savingMappingId === entry.mapping_id; // Determine whether this specific row is currently being saved.
                const isDeleting = deletingMappingId?.mapping_id === entry.mapping_id; // Determine whether this specific row is selected for deletion/removal.
                const isDirty = !!entry.pendingRoleId; // A row is dirty when a pending unsaved role exists.
                const displayedRoleId = entry.pendingRoleId ?? entry.role_id; // Show pending role ID when present, otherwise show persisted role ID.
                const displayedRoleName = entry.pendingRoleName ?? entry.role_name; // Keep derived display role name available for future use or debugging.


                return ( // Return the JSX for one table row.
                  <div
                    key={entry.mapping_id} // Use mapping ID as stable React key for the row.
                    className={styles.tableRow} // Apply shared table row grid styling.
                    style={{ gridTemplateColumns: GRID }} // Align the row to the exact same grid as the header.
                  >
                    {/* ── User cell ── */}
                    <div className={styles.nameCell}> {/* Container for user icon and user text stack. */}
                      <PersonRegular
                        style={{
                          fontSize: "18px", // Set user icon size for visual balance.
                          color: tokens.colorNeutralForeground2, // Use muted neutral color for the user icon.
                          flexShrink: 0, // Prevent the icon from shrinking in narrower layouts.
                        }}
                      />
                      <div className={styles.nameStack}> {/* Vertical stack for display name and optional email. */}
                        <Text size={300} weight="medium"> {/* Primary user display name text. */}
                          {entry.display_name} {/* Render the user's display name. */}
                          {isDirty && <span className={styles.dirtyIndicator} title="Unsaved change" />} {/* Show unsaved-change indicator when the role selection has been modified but not saved. */}
                        </Text>
                        {entry.email && ( // Render email only if it exists.
                          <Text className={styles.subText}>{entry.email}</Text> // Show the user's email as muted secondary text.
                        )}
                      </div>
                    </div>


                    {/* ── Role dropdown ── */}
                    {/* Tooltip appears on the per-row role Select when the user lacks write or role-view access */}
                    <Tooltip
                      content="You don't have access to this" // Tooltip message explaining lack of access.
                      relationship="label" // Associate tooltip with the dropdown control.
                      visible={(!canWriteUserRoles || !canViewRoles) ? undefined : false} // Show tooltip only when role changing is not allowed.
                    >
                      <Select
                        size="small" // Use compact dropdown size for dense table row layout.
                        value={displayedRoleId} // Bind the dropdown to pending role when present, else persisted role.
                        disabled={isSaving || isDeleting || isFetchingRoles || !canWriteUserRoles || !canViewRoles} // Disable while saving/deleting/loading or lacking permission.
                        onChange={(event) =>
                          handleRoleDropdownChange(entry.mapping_id, event.target.value) // Update row dirty state with the newly selected role.
                        }
                      >
                        {(dashboardRoles ?? []).map((role: DashboardRole) => ( // Render each available role as a selectable option.
                          <option key={role.role_id} value={role.role_id}> {/* Use role ID for key and value. */}
                            {role.role_name} {/* Show role name to the user. */}
                          </option>
                        ))}
                      </Select>
                    </Tooltip>


                    <span/> {/* Spacer column kept to preserve grid alignment. */}


                    {/* ── Added By ── */}
                    <div className={styles.nameStack}> {/* Stack for metadata about who added the mapping and when. */}
                      <Text size={200}>{entry.added_by}</Text> {/* Show who created the mapping. */}
                      {entry.added_at && ( // Only show added timestamp if available.
                        <Text className={styles.subText}> {/* Muted subtext for timestamp formatting. */}
                          {formatDateTime(entry.added_at)} {/* Format backend timestamp into human-readable date/time. */}
                        </Text>
                      )}
                    </div>


                    <Badge appearance="filled" size="small" color={entry?.is_active ? "success" : "danger"}> {/* Show current active/inactive status with semantic badge color. */}
                      {entry?.is_active ? "Active" : "Inactive"} {/* Render status label based on is_active flag. */}
                    </Badge>


                    {/* ── Per-row Save (only when dirty) ── */}
                    {canWriteUserRoles && ( // Only show write actions if the current user can modify assignments.
                    <>
                    <div
                      style={{
                        display: "flex", // Use flexbox to center the save button container.
                        alignItems: "center", // Vertically center save button inside the cell.
                        justifyContent: "center", // Horizontally center save button inside the cell.
                      }}
                    >
                      {isDirty && ( // Only render the save button when the row contains unsaved role changes.
                        <Tooltip content="Save role change" relationship="label">
                          <Button
                            appearance="primary" // Use primary styling because save is the key row-level action.
                            size="small" // Keep the button compact within the table row.
                            icon={isSaving ? <Spinner size="tiny" /> : <SaveRegular />} // Show spinner during save, otherwise save icon.
                            disabled={isSaving || isDeleting} // Disable while save or delete operation is active for the row.
                            onClick={() => handleSaveRow(entry.mapping_id)} // Save this specific dirty row when clicked.
                            aria-label={`Save role change for ${entry.display_name}`} // Provide accessible label describing which row is being saved.
                          />
                        </Tooltip>
                      )}
                    </div>


                    {/* ── Delete (immediate) ── */}
                    <Tooltip
                      content={!canWriteUserRoles ? "You don't have access to this" : "Remove user from group"} // Show permission warning or delete description based on access.
                      relationship="label" // Associate tooltip with the delete button.
                    >
                      <Button
                        appearance="subtle" // Use subtle styling because delete is destructive but secondary to row content.
                        size="small" // Keep delete button compact within the table row.
                        icon={isDeleting ? <Spinner size="extra-tiny" /> : <DeleteRegular style={{color:"red"}}/>} // Show tiny spinner during delete selection/loading, otherwise red delete icon.
                        disabled={isSaving || isDeleting || !canWriteUserRoles} // Disable during row save/delete or when write access is missing.
                        onClick={() => handleDeleteRow(entry)} // Open delete confirmation for this specific row.
                        aria-label={`Remove ${entry.display_name}`} // Provide accessible label describing which user will be removed.
                      />
                    </Tooltip>
                    </>
                    )}
                  </div>
                );
              })
              ) : ( // Render loading state when user-role mappings are still being fetched.
                <Spinner size="medium" label="Loading..."/> // Generic loading indicator shown in table content area.
              )}
            </div>


            {/* Table-level error */}
            {tableError && ( // Only render table-level error section when an error exists.
              <Text className={styles.errorText}>{tableError}</Text> // Display table-level error message below the content.
            )}
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
        open={!!deletingMappingId} // Open confirmation dialog whenever a row has been selected for deletion.
        onOpenChange={(_, data) => { // React to Fluent UI dialog open-state changes.
          if (!data.open) { // If the dialog is being closed manually or programmatically,
            setDeletingMappingId(null); // clear the selected row slated for deletion,
            setTableError(null); // and clear any related error message.
          }
        }}
      >
        <DialogSurface> {/* Surface for the remove-confirmation dialog. */}
          <DialogBody> {/* Body wrapper for confirmation dialog content. */}
            <DialogTitle>Remove User From Group</DialogTitle> {/* Confirmation dialog heading. */}


            <DialogContent> {/* Main explanatory content for the confirmation dialog. */}
              <Text size={300} className="text-neutral-foreground-2"> {/* Main confirmation sentence with highlighted user and group names. */}
                Are you sure you want to remove{" "} {/* Confirmation text before the user name. */}
                <Text size={300} weight="bold" style={{ fontFamily: "monospace" }}> {/* Emphasize the user name in bold monospace. */}
                  {deletingMappingId?.display_name} {/* Show the name of the user being removed. */}
                </Text>{" "} {/* Preserve natural spacing around nested text components. */}
                from the group{" "} {/* Confirmation text before the group name. */}
                <Text size={300} weight="bold"> {/* Emphasize the group name in bold. */}
                  {permissionsGroup?.group_name} {/* Show the selected group name. */}
                </Text>
                ? {/* End of confirmation question. */}
              </Text>
              <Text
                size={200} // Smaller text size for supporting warning message.
                style={{
                  color: tokens.colorNeutralForeground1, // Use neutral foreground color for supporting warning text.
                  display: "block", // Render the helper text on its own line.
                  marginTop: tokens.spacingVerticalS, // Add space above the helper message.
                }}
              >
                This will take effect immediately. {/* Warn that deletion/removal is immediate once confirmed. */}
              </Text>


              {/* Error shown inside confirmation dialog if the API call fails */}
              {tableError && ( // Only show error section when a remove failure occurred.
                <Text className={styles.errorText}>{tableError}</Text> // Display the remove error inside the confirmation dialog.
              )}
            </DialogContent>


            <DialogActions> {/* Footer action buttons for confirmation dialog. */}
              {/* Cancel — closes confirmation, no API call made */}
              <Button
                appearance="secondary" // Use secondary styling because cancel is the non-destructive option.
                onClick={() => { // Close the confirmation dialog without making an API call.
                  setDeletingMappingId(null); // Clear selected row so the dialog closes.
                  setTableError(null); // Clear any existing delete-related error.
                }}
                disabled={isRemoving} // Prevent cancel interaction while remove request is in progress.
              >
                Cancel {/* Label for non-destructive cancel action. */}
              </Button>              
              {/* Confirm — fires remove API immediately */}
              <Button
                appearance="primary" // Use primary styling for the confirmation action.
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }} // Override button background to a red destructive color.
                onClick={handleConfirmDelete} // Trigger the confirmed remove operation.
                disabled={isRemoving}  // Disable button while removal is already in progress.
                icon={isRemoving ? <Spinner size="tiny" /> : <DeleteRegular />} // Show spinner during removal, otherwise delete icon.
              >
                {isRemoving ? "Removing..." : "Remove"} {/* Show progress label during remove operation, otherwise default label. */}
              </Button>
            </DialogActions>


          </DialogBody>
        </DialogSurface>
      </Dialog>
      </>
 );
};


// Export this component as the default export from the file.
export default ManageRolesInGroup;