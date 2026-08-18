/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Atharva Mundhada
  Date: 20 May 2026

  Purpose:
  Users tab component for the Roles Management Dashboard.
  - Displays all dashboard users registered in the RBAC system.
  - Allows admins to add and update users via dialogs.
  - Actions column uses a 3-dot overflow menu: Edit User, Delete User.
  - "Delete User" option opens a confirmation dialog; confirming calls the delete API immediately.
  - In the Edit User dialog, the Email field is read-only to prevent primary identifier changes.
  - Supports search filtering within the tab independently.
*/

// Mark this file as a client component because it uses React hooks, UI event handlers, and browser-side navigation behavior.
"use client";

// Import Fluent UI styling utilities and UI components used throughout the Users tab.
import {
  makeStyles, // Creates component-scoped CSS-in-JS styles.
  tokens, // Fluent UI design tokens for spacing, color, typography, and other design values.
  Spinner, // Loading spinner component used during async operations and permission loading.
  SearchBox, // Search input component used to filter the users table.
  Badge, // Badge component used to display user status such as Active or Inactive.
  Button, // Reusable button component used for actions like Add, Save, Delete, and Cancel.
  Dialog, // Modal dialog container component.
  DialogTrigger, // Helper wrapper to connect buttons to dialog open/close behavior.
  DialogSurface, // The visible surface/container of a dialog.
  DialogTitle, // The title area of a dialog.
  DialogBody, // The structural body wrapper for dialog content.
  DialogActions, // The footer area that contains dialog action buttons.
  DialogContent, // The main content area of the dialog.
  Field, // Labeled form field wrapper used around inputs and selects.
  Input, // Text input component used for user form fields.
  Select, // Select/dropdown component used for principal type selection.
  Text, // Typography component used for styled text content.
  Tooltip, // Tooltip component used to explain icon/button actions.
  Switch, // Toggle switch component used for active/inactive status.
  Menu, // Menu container used for row action overflow menu.
  MenuItem, // Menu item component for edit/delete actions.
  MenuList, // Wrapper for the list of menu items.
  MenuPopover, // Popover container that visually renders the dropdown menu.
  MenuTrigger, // Trigger element wrapper that opens the menu.
} from "@fluentui/react-components";

// Import Fluent UI icons used in section headers and action buttons.
import {
  PersonAdd20Filled, // Icon used in the Add User button.
  EditRegular, // Icon used in the Edit User menu action.
  PeopleRegular, // Icon used in the section title.
  DeleteRegular, // Icon used in delete actions and destructive confirmations.
  MoreVerticalRegular, // Icon used for the 3-dot overflow actions menu.
} from "@fluentui/react-icons";

// Import shared Help component used to display contextual help text for the section.
import { Help } from "@/components/ui/Help";

// Import React state hook for local UI state management.
import { useState } from "react";

// Import the shared DataGrid component and its column configuration type.
import { DataGrid, ColumnConfig } from "@/components/ui/DataGrid";

// Import hook that fetches dashboard users for listing in the grid.
import { useGetDashboardUsers } from "@/hooks/useRolesManagement";

// Import service layer used for add, update, and delete user API calls.
import { rolesManagementService } from "@/lib/services/rolesManagementService";

// Import helper used to format timestamps into readable date/time strings.
import { formatDateTime } from "@/lib/helper";

// Import typed interfaces used by this component for user rows and user form state.
import { DashboardUser, UserFormPayload } from "@/types/api";

// Import toast helper used to show success messages after actions complete.
import { useGlobalToast } from "@/hooks/useToast";

// Import permission hook used to control read/write access to this tab.
import { usePagePermissions } from "@/hooks/hasPagePermissions";


// ---------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------


// Define the default empty form object used when opening the Add User dialog or resetting the form.
const EMPTY_USER_FORM: UserFormPayload = {
  email: "", // Default email value is empty.
  display_name: "", // Default display name value is empty.
  azure_oid: "", // Default Azure Object ID value is empty.
  is_active: true, // New users default to active status.
};


// ---------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------


// Create component-scoped styles used by the Users tab and its dialogs.
const useStyles = makeStyles({
  sectionTitle: {
    display: "flex", // Use flex layout so icon, title text, and help icon appear in one row.
    alignItems: "center", // Vertically align all title row items.
    gap: tokens.spacingHorizontalS, // Add spacing between icon, title, and help component.
    fontWeight: tokens.fontWeightSemibold, // Apply semibold weight to the section title container.
  },
  container: {
    paddingBottom: tokens.spacingVerticalXL, // Add bottom padding below the entire tab content.
  },
  formField: {
    display: "flex", // Use flexbox for field layout.
    flexDirection: "column", // Stack each field's content vertically.
    gap: tokens.spacingVerticalXS, // Add a small gap between field elements.
    marginBottom: tokens.spacingVerticalM, // Add spacing below each form field.
  },


  // ── Delete confirmation dialog ─────────────────────────────────────
  deleteConfirmText: {
    // Body text inside the delete confirmation dialog
    display: "block", // Render the confirmation text as a block-level element.
    marginBottom: tokens.spacingVerticalM, // Space below the question text.
    color: tokens.colorNeutralForeground2, // Standard foreground color for readability.
  },
  deleteUserName: {
    // Highlighted user name inside the delete confirmation message
    fontWeight: tokens.fontWeightBold, // Bold to draw attention to what will be deleted.
    color: tokens.colorNeutralForeground2, // Same foreground as surrounding text.
  },
});


// ---------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------


/**
 * DashboardUsersTab
 *
 * Renders the Users tab content including:
 * - Search box for filtering users by display name or email
 * - DataGrid showing all users with a 3-dot overflow menu per row
 * - 3-dot menu options: Edit User (opens edit dialog), Delete User (opens confirmation dialog)
 * - Add User and Edit User dialogs (unchanged from original)
 * - In the Edit User dialog, the Email field is read-only
 * - Delete User confirmation dialog:
 *     Opens from the 3-dot menu → "Are you sure?" prompt → Yes deletes, Cancel closes
 */
export const DashboardUsersTab = () => {
  const styles = useStyles(); // Generate the scoped class names from the style definitions above.
  const { showToast } = useGlobalToast(); // Get the shared toast function for success notifications.


  const { canRead, canWrite, isLoadingPermissions } = usePagePermissions("roles-management-users"); // Resolve page-level permissions for the Users tab.


  // ── Existing state (unchanged) ───────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Tracks whether add/update form submission is currently in progress.
  const [submitError, setSubmitError] = useState<string | null>(null); // Stores any add/update form error to display in dialogs.


  const [userSearchQuery, setUserSearchQuery] = useState<string>(""); // Stores the current search text used to filter the users list.
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState<boolean>(false); // Controls visibility of the Add User dialog.
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState<boolean>(false); // Controls visibility of the Edit User dialog.
  const [userFormData, setUserFormData] = useState<UserFormPayload>(EMPTY_USER_FORM); // Stores the current user form data for add/edit operations.
  const [selectedUser, setSelectedUser] = useState<DashboardUser | null>(null); // Stores the currently selected user for editing.


  const { dashboardUsers, refetch, isFetchingUsers } = useGetDashboardUsers(canRead); // Fetch the list of dashboard users and expose refetch/loading state.


  // ── Delete User confirmation dialog state ────────────────────────────
  // Track whether the delete confirmation dialog is open or closed
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState<boolean>(false); // Controls visibility of the delete confirmation dialog.


  // Store the user selected for deletion so the confirmation dialog can display their name
  // and pass their ID to the delete API call
  const [userToDelete, setUserToDelete] = useState<DashboardUser | null>(null); // Stores the selected user pending deletion.


  // Track whether the delete API call is in progress to show a spinner and prevent double clicks
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false); // Tracks whether the delete API request is currently running.


  // Store any error that occurs during deletion so the user can be notified inside the dialog
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null); // Stores any deletion error message to show in the confirmation dialog.


  // ── Column Definitions ──────────────────────────────────────────────


  const userColumns: ColumnConfig<any>[] = [
    {
      key: "display_name", // Key that maps to the display name field in each user row.
      label: "Display Name", // Header label shown for the display name column.
      width: "16%", // Width assigned to the display name column.
      showMore: true, // Allow expanded viewing for truncated content.
      sortable: true, // Allow sorting on this column.
    },
    {
      key: "email", // Key that maps to the email field in each user row.
      label: "Email", // Header label shown for the email column.
      width: "16%", // Width assigned to the email column.
      showMore: true, // Allow expanded viewing for long email values.
      copyable: true, // Allow email values to be copied from the grid.
      sortable: true, // Allow sorting on this column.
    },
    {
      key: "created_by", // Key that maps to the created_by/principal field in each user row.
      label: "Created By", // Header label shown for the created_by column.
      width: "12%", // Width assigned to the created_by column.
      showMore: true, // Allow expanded viewing if content is truncated.
      sortable: true, // Allow sorting on this column.
    },
    {
      key: "is_active", // Key that maps to the active status field in each user row.
      label: "Status", // Header label shown for the status column.
      width: "8%", // Width assigned to the status column.
      sortable: true, // Allow sorting on this column.
      render: (statusValue) => ( // Use a custom render function to display a visual badge instead of raw boolean text.
        <Badge appearance="filled" color={statusValue ? "success" : "danger"}>
          {statusValue ? "Active" : "Inactive"} {/* Show a friendly status label based on the boolean value. */}
        </Badge>
      ),
    },
    {
      key: "created_at", // Key that maps to the created_at timestamp field.
      label: "Created At", // Header label shown for the created_at column.
      width: "12%", // Width assigned to the created_at column.
      showMore: true, // Allow expanded viewing for formatted date strings.
      sortable: true, // Allow sorting on this column.
      getValue: (createdAtValue) => (createdAtValue ? formatDateTime(createdAtValue) : "-"), // Format the timestamp for display or show a fallback dash.
    },
  ];


  const userColumnsWithActions: ColumnConfig<any>[] = canWrite ? [ // If the user has write permission, append an Actions column.
    ...userColumns, // Start with the base set of user columns.
    {
      key: "actions", // Synthetic key for the row actions column.
      label: "Actions", // Header label shown for the actions column.
      width: "5%", // Width assigned to the actions column.
      render: (cellValue, userRow) => { 
        // Render an overflow menu for each row.
        return (
        <Menu>
          <MenuTrigger disableButtonEnhancement> 
            <Tooltip content="More actions" relationship="label"> 
              <Button
                appearance="subtle" // Subtle visual style for compact row action button.
                icon={<MoreVerticalRegular />} // 3-dot overflow icon.
                size="small" // Compact size for row action affordance.
                aria-label="More actions" // Accessible label for screen readers.
              />
            </Tooltip>
          </MenuTrigger>
          <MenuPopover> 
            <MenuList> 
              {canWrite && (
              <MenuItem
                icon={<EditRegular />} // Show edit icon beside the menu item.
                onClick={() => handleOpenEditUserDialog(userRow)} // Open edit dialog for the clicked user row.
              >
                Edit User {/* Menu label for editing a user. */}
              </MenuItem>
              )}

              {canWrite && (
              <MenuItem
                icon={<DeleteRegular />} // Show delete icon beside the menu item.
                onClick={() => handleOpenDeleteUserDialog(userRow)} // Open delete confirmation dialog for the clicked user row.
              >
                Delete User
              </MenuItem>
              )}
            </MenuList>
          </MenuPopover>
        </Menu>
      )},
    },
  ]
  : userColumns; // If the user does not have write permission, use the read-only columns without actions.


  // ── Handlers — existing (unchanged) ─────────────────────────────────


  const handleOpenAddUserDialog = () => {
    setUserFormData(EMPTY_USER_FORM); // Reset the form to its default empty state.
    setSubmitError(null); // Clear any previous form submission error.
    setIsAddUserDialogOpen(true); // Open the Add User dialog.
  };


  const handleOpenEditUserDialog = (userRecord: DashboardUser) => {
    setSelectedUser(userRecord); // Store the selected user for editing context.
    setUserFormData({
      user_id: userRecord.user_id, // Preserve the user ID so the update call targets the correct record.
      email: userRecord.email, // Prefill the form with the user's email.
      display_name: userRecord.display_name, // Prefill the form with the user's display name.
      azure_oid: userRecord.azure_oid ?? "", // Prefill Azure OID or fallback to empty string.
      is_active: userRecord.is_active, // Prefill the active status toggle.
    });
    setSubmitError(null); // Clear any previous submission error before opening the edit dialog.
    setIsEditUserDialogOpen(true); // Open the Edit User dialog.
  };


  const handleUserFormChange = (field: keyof UserFormPayload, value: string | boolean) => {
    setUserFormData((previousFormData) => ({ ...previousFormData, [field]: value })); // Update only the targeted field while preserving the rest of the form state.
  };


  const handleAddUser = async () => {
    setIsSubmitting(true); // Mark form submission as in progress.
    setSubmitError(null); // Clear previous submission errors before attempting the add call.
    try {
      await rolesManagementService.addDashboardUser(userFormData) // Call backend service to create a new dashboard user.
      .then((response) => {
        refetch(); // Refresh the users table after a successful add.
        showToast("User added successfully."); // Show success feedback to the user.
        setIsAddUserDialogOpen(false); // Close the Add User dialog after successful completion.
        setUserFormData(EMPTY_USER_FORM); // Reset the form back to default values.
      });
    } catch (error) {
      setSubmitError("Failed to add user. Please try again."); // Show friendly error text if the add request fails.
    } finally {
      setIsSubmitting(false); // Clear submission loading state regardless of success or failure.
    }
  };


  const handleUpdateUser = async () => {
    setIsSubmitting(true); // Mark edit submission as in progress.
    setSubmitError(null); // Clear any previous submission error before attempting the update.
    try {
      await rolesManagementService.updateDashboardUser(userFormData) // Call backend service to update the selected dashboard user.
      .then((response) => {
        refetch(); // Refresh the users table after a successful update.
        showToast("User updated successfully."); // Show success feedback to the user.
        setIsEditUserDialogOpen(false); // Close the Edit User dialog after successful update.
        setSelectedUser(null); // Clear the selected user after finishing the update.
      });
    } catch (error) {
      setSubmitError("Failed to update user. Please try again."); // Show friendly error text if the update request fails.
    } finally {
      setIsSubmitting(false); // Clear submission loading state regardless of success or failure.
    }
  };


  // ── Handlers — Delete User ────────────────────────────────────────────


  const handleOpenDeleteUserDialog = (userRecord: DashboardUser) => {
    setUserToDelete(userRecord); // Store the selected user so the confirmation dialog knows which record to delete.
    setDeleteUserError(null); // Clear any previous delete error before opening the dialog.
    setIsDeleteUserDialogOpen(true); // Open the delete confirmation dialog.
  };


  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return; // Exit early if no user has been selected for deletion.


    setIsDeletingUser(true); // Mark delete operation as in progress.
    setDeleteUserError(null); // Clear any previous delete error before attempting the API call.


    try {
      await rolesManagementService.removeDashboardUser(userToDelete.user_id) // Call backend service to delete the selected user by ID.
      .then((response) => {
        refetch(); // Refresh the users table after successful deletion.
        showToast("User deleted successfully."); // Show success feedback after the delete completes.
        setIsDeleteUserDialogOpen(false); // Close the delete confirmation dialog.
        setUserToDelete(null); // Clear the selected user after successful deletion.
      });
    } catch {
      setDeleteUserError("Failed to delete user. Please try again."); // Show friendly error text if the delete request fails.
    } finally {
      setIsDeletingUser(false); // Clear delete loading state regardless of success or failure.
    }
  };


  // ── Filtered Data ────────────────────────────────────────────────────


  const filteredUsersData =
    userSearchQuery.trim() === "" // If the search box is effectively empty,
      ? dashboardUsers ?? [] // show all fetched dashboard users.
      : (dashboardUsers ?? []).filter((dashboardUser: DashboardUser) => { // Otherwise filter the list client-side.
          const normalizedKeyword = userSearchQuery.toLowerCase(); // Normalize search text for case-insensitive comparison.
          return (
            dashboardUser.display_name?.toLowerCase().includes(normalizedKeyword) || // Match against display name when present.
            dashboardUser.email?.toLowerCase().includes(normalizedKeyword) // Match against email when present.
          );
        });


  // ── Render ───────────────────────────────────────────────────────────


  if (isLoadingPermissions) {
    return (
        <div className="flex h-full min-h-[50vh] items-center justify-center"> {/* Full-height centered container shown while permission data is loading. */}
            <Spinner size="medium" label="Loading..." /> {/* Spinner displayed during permission loading. */}
        </div>
    );
  };


  if (!isLoadingPermissions
    && !canRead
    ) {
      window.location.href = "/forbidden"; // Redirect users without read permission to the forbidden page.
    };


  return (
    <div> {/* Root wrapper for the entire Users tab. */}
      <div className={styles.container}> {/* Main content container with bottom spacing. */}
        <div className="w-full flex flex-col gap-2 mt-4"> {/* Header section containing title row and search box. */}
          {/* Section title row */}
          <div className="flex items-center justify-between"> {/* Flex row to place title on the left and Add button on the right. */}
            <div className={styles.sectionTitle}> {/* Styled title group containing icon, title, and help info. */}
              <PeopleRegular /> {/* Icon representing the users section. */}
              <Text size={400} weight="semibold">Dashboard Users</Text> {/* Visible section title text. */}
              <Help info="This table displays all users registered in the RBAC system. Each user record includes their display name, email, principal type (user or service principal), source (Azure AD or local), active status, last login, and creation date. Use the search box to filter by name or email. Click the 3-dot menu per row to Edit or Delete a user. Use the Add User button to register a new user in the system." /> {/* Contextual help explaining the purpose and capabilities of the tab. */}
            </div>
            {canWrite && ( // Only show the Add User button when the user has write permission.
            <Button
              appearance="primary" // Use primary styling because this is the main call-to-action of the section.
              icon={<PersonAdd20Filled />} // Add-person icon for visual clarity.
              onClick={handleOpenAddUserDialog} // Open the Add User dialog when clicked.
            >
              Add User {/* Button label. */}
            </Button>
            )}
          </div>


          {/* Search box */}
          <SearchBox
            placeholder="Filter by display name or email..." // Guide the user on which fields can be searched.
            value={userSearchQuery} // Bind the search input to component state.
            onChange={(_, searchBoxData) => setUserSearchQuery(searchBoxData.value ?? "")} // Update search state as the user types.
            className="w-[20rem]" // Apply fixed width styling to the search box.
          />
        </div>


        {/* Data grid */}
        <DataGrid
          columns={userColumnsWithActions} // Pass the configured columns, including actions when allowed.
          data={filteredUsersData} // Pass the filtered users dataset to render.
          loading={isFetchingUsers} // Let the grid show a loading state while users are being fetched.
        />
      </div>


      {/* ════════════════════════════════════════════════════════════════
          DELETE USER CONFIRMATION DIALOG
      ════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={isDeleteUserDialogOpen} // Bind dialog visibility to delete confirmation state.
        onOpenChange={(_, dialogState) => {
          if (!dialogState.open && !isDeletingUser) { // Only allow dialog close when a delete operation is not actively running.
            setIsDeleteUserDialogOpen(false); // Close the delete dialog.
            setUserToDelete(null); // Clear the selected user pending deletion.
            setDeleteUserError(null); // Clear any existing delete error when the dialog closes.
          }
        }}
      >
        <DialogSurface> {/* Visible container for the delete confirmation dialog. */}
          <DialogBody> {/* Structural wrapper for dialog title, content, and actions. */}
            <DialogTitle>Delete User</DialogTitle> {/* Title shown at the top of the confirmation dialog. */}


            <DialogContent> {/* Main confirmation dialog content. */}
              <Text className={styles.deleteConfirmText}>
                Are you sure you want to delete the user{" "} {/* Introductory confirmation question text. */}
                <span className={styles.deleteUserName}>
                  {userToDelete?.display_name} {/* Show the selected user's display name inside the confirmation message. */}
                </span>
                ? This action cannot be undone. {/* Destructive warning message. */}
              </Text>


              {deleteUserError && (
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {deleteUserError} {/* Render delete error text if the delete API call fails. */}
                </Text>
              )}
            </DialogContent>


            <DialogActions> {/* Footer buttons for cancel and confirm actions. */}
              <Button
                appearance="secondary" // Use secondary styling for the cancel action.
                disabled={isDeletingUser} // Prevent cancellation while deletion is actively processing.
                onClick={() => {
                  setIsDeleteUserDialogOpen(false); // Close the delete dialog.
                  setUserToDelete(null); // Clear the selected user to delete.
                  setDeleteUserError(null); // Clear any delete error on cancel.
                }}
              >
                Cancel {/* Cancel button label. */}
              </Button>


              <Button
                appearance="primary" // Use primary styling for the destructive confirm action.
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }} // Apply a red-toned background to indicate destructive action.
                onClick={handleConfirmDeleteUser} // Trigger the delete confirmation handler.
                disabled={isDeletingUser} // Disable the button while deletion is in progress.
                icon={isDeletingUser ? <Spinner size="tiny" /> : undefined} // Show spinner during delete, otherwise no icon.
              >
                {isDeletingUser ? "Deleting..." : "Yes"} {/* Show progress text while deleting, otherwise show confirmation label. */}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>


      {/* ── ADD USER DIALOG ──────────────────────────────────────────── */}
      <Dialog
        open={isAddUserDialogOpen} // Bind Add User dialog visibility to state.
        onOpenChange={(_, dialogState) => setIsAddUserDialogOpen(dialogState.open)} // Sync dialog open/close changes back into component state.
      >
        <DialogSurface> {/* Visible container for the Add User dialog. */}
          <DialogBody> {/* Structural wrapper for add dialog content. */}
            <DialogTitle>Add New User</DialogTitle> {/* Add dialog title text. */}
            <DialogContent> {/* Main add dialog content area. */}


              <div className={styles.formField}> {/* Form field block for Email input. */}
                <Field label="Email" required> {/* Email field label with required indicator. */}
                  <Input
                    type="email" // Use email input type for browser-level validation/behavior.
                    placeholder="Enter user email address" // Placeholder guiding the admin on what to enter.
                    value={userFormData.email} // Bind input to the email value in form state.
                    onChange={(inputEvent) => handleUserFormChange("email", inputEvent.target.value)} // Update form state when email changes.
                  />
                </Field>
              </div>


              <div className={styles.formField}> {/* Form field block for Display Name input. */}
                <Field label="Display Name" required> {/* Display Name field label with required indicator. */}
                  <Input
                    placeholder="Enter full name" // Placeholder guiding the admin to enter the user's full name.
                    value={userFormData.display_name} // Bind input to the display_name value in form state.
                    onChange={(inputEvent) => handleUserFormChange("display_name", inputEvent.target.value)} // Update form state when display name changes.
                  />
                </Field>
              </div>


              <div className={styles.formField}> {/* Form field block for Azure OID input. */}
                <Field label="Azure OID" hint="Required only for Azure AD users"> {/* Azure OID label with explanatory hint. */}
                  <Input
                    placeholder="Enter Azure AD Object ID (optional)" // Placeholder guiding optional Azure Object ID entry.
                    value={userFormData.azure_oid ?? ""} // Bind input to Azure OID or fallback to empty string.
                    onChange={(inputEvent) => handleUserFormChange("azure_oid", inputEvent.target.value)} // Update form state when Azure OID changes.
                  />
                </Field>
              </div>


              <div className={styles.formField}> {/* Form field block for Active Status switch. */}
                <Field label="Active Status"> {/* Active status field label. */}
                  <Switch
                    checked={userFormData.is_active} // Bind switch checked state to form's active flag.
                    onChange={(switchEvent) => handleUserFormChange("is_active", switchEvent.target.checked)} // Update form state when switch value changes.
                    label={userFormData.is_active ? "Active" : "Inactive"} // Show a text label that reflects the current switch state.
                  />
                </Field>
              </div>


              {submitError && (
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {submitError} {/* Render form submission error if add request fails. */}
                </Text>
              )}


            </DialogContent>
            <DialogActions> {/* Footer buttons for the Add User dialog. */}
              <DialogTrigger disableButtonEnhancement>
                <Button
                  appearance="secondary" // Secondary styling for cancel action.
                  onClick={() => { setIsAddUserDialogOpen(false); setSubmitError(null); }} // Close add dialog and clear any submission error.
                >
                  Cancel {/* Cancel button label. */}
                </Button>
              </DialogTrigger>
              <Button
                appearance="primary" // Primary styling for the Add User action.
                onClick={handleAddUser} // Trigger the add-user API call.
                disabled={isSubmitting || !userFormData.email || !userFormData.display_name} // Disable when already submitting or required fields are missing.
                icon={isSubmitting ? <Spinner size="tiny" /> : undefined} // Show spinner while add request is in progress.
              >
                {isSubmitting ? "Adding..." : "Add User"} {/* Show progress text during submit, otherwise default button text. */}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>


      {/* ── EDIT USER DIALOG ─────────────────────────────────────────── */}
      <Dialog
        open={isEditUserDialogOpen} // Bind Edit User dialog visibility to state.
        onOpenChange={(_, dialogState) => setIsEditUserDialogOpen(dialogState.open)} // Sync dialog open/close events back to component state.
      >
        <DialogSurface> {/* Visible container for the Edit User dialog. */}
          <DialogBody> {/* Structural wrapper for edit dialog sections. */}
            <DialogTitle>Edit User — {selectedUser?.display_name}</DialogTitle> {/* Edit dialog title showing the selected user's name. */}
            <DialogContent> {/* Main content area of the Edit User dialog. */}


              {/* Email — read-only; email is the primary login identifier and must not change */}
              <div className={styles.formField}> {/* Form field block for the read-only email field. */}
                <Field
                  label="Email" // Field label for the email value.
                  hint="Email cannot be changed after registration" // Hint explaining why the field is read-only.
                >
                  <Input
                    type="email" // Use email input type for proper semantic meaning.
                    value={userFormData.email} // Displays the current email address.
                    readOnly // Prevents the admin from typing in this field.
                    style={{
                      // Subtle visual treatment to reinforce that this field is non-editable
                      backgroundColor: tokens.colorNeutralBackground3, // Use muted background color to indicate non-editable state.
                      color: tokens.colorNeutralForeground3, // Use softer text color for read-only appearance.
                      cursor: "not-allowed", // Show not-allowed cursor to reinforce that editing is disabled.
                    }}
                  />
                </Field>
              </div>


              <div className={styles.formField}> {/* Form field block for editable display name. */}
                <Field label="Display Name" required> {/* Display Name field label with required indicator. */}
                  <Input
                    placeholder="Enter full name" // Placeholder text guiding the admin to enter a full name.
                    value={userFormData.display_name} // Bind the input to the display_name field in form state.
                    onChange={(inputEvent) => handleUserFormChange("display_name", inputEvent.target.value)} // Update display name in form state when changed.
                  />
                </Field>
              </div>

              <div className={styles.formField}> {/* Form field block for Azure OID input. */}
                <Field label="Azure OID" hint="Required only for Azure AD users"> {/* Azure OID field label with explanatory hint. */}
                  <Input
                    placeholder="Enter Azure AD Object ID (optional)" // Placeholder text for optional Azure Object ID entry.
                    value={userFormData.azure_oid ?? ""} // Bind input to Azure OID or fallback to empty string.
                    onChange={(inputEvent) => handleUserFormChange("azure_oid", inputEvent.target.value)} // Update Azure OID in form state when changed.
                  />
                </Field>
              </div>


              <div className={styles.formField}> {/* Form field block for active/inactive switch. */}
                <Field label="Active Status"> {/* Label for active status control. */}
                  <Switch
                    checked={userFormData.is_active} // Bind checked state to the form's active flag.
                    onChange={(switchEvent) => handleUserFormChange("is_active", switchEvent.target.checked)} // Update active flag in form state when switch changes.
                    label={userFormData.is_active ? "Active" : "Inactive"} // Show label text that matches the current switch state.
                  />
                </Field>
              </div>


              {submitError && (
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {submitError} {/* Render submission error if update request fails. */}
                </Text>
              )}


            </DialogContent>
            <DialogActions> {/* Footer buttons for the Edit User dialog. */}
              <DialogTrigger disableButtonEnhancement>
                <Button
                  appearance="secondary" // Secondary styling for cancel action.
                  onClick={() => { setIsEditUserDialogOpen(false); setSelectedUser(null); setSubmitError(null); }} // Close dialog and clear selected user and submit error.
                >
                  Cancel {/* Cancel button label. */}
                </Button>
              </DialogTrigger>
              <Button
                appearance="primary" // Primary styling for saving user changes.
                onClick={handleUpdateUser} // Trigger the update-user API call.
                disabled={isSubmitting || !userFormData.display_name} // Disable while submitting or when required display name is missing; email is excluded because it is read-only.
                icon={isSubmitting ? <Spinner size="tiny" /> : undefined} // Show spinner while update request is in progress.
              >
                {isSubmitting ? "Saving..." : "Save Changes"} {/* Show progress text during update, otherwise default save label. */}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}