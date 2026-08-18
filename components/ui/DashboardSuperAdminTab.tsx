/*
Project Name : Teva Data Integrity
Business Owner, Team : Keerthi Pusuloori
Script Author, Team : Parthesh Patel
Date: 20 May 2026

Purpose:
Users tab component for the Roles Management Dashboard.

Responsibilities:
- Displays all dashboard users registered in the RBAC system.
- Allows admins to add and update users via dialogs.
- Actions column uses a 3-dot overflow menu: Edit User, Delete User.
- "Delete User" option opens a confirmation dialog; confirming calls the delete API immediately.
- In the Edit User dialog, the Email field is read-only to prevent primary identifier changes.
- Supports search filtering within the tab independently.

Business Value:
- Provides centralized management for dashboard super admins in the RBAC system.
- Allows administrators to add new super admins and remove them when needed.
- Protects controlled access by supporting confirmation flows when a user must be removed from other groups before promotion.
*/


// Marks this file as a client-side component in Next.js.
// This is required because the component uses React hooks like useState,
// browser-only interactions, dialogs, event handlers, and imperative navigation behavior. [web:137][web:54]
"use client";


// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @fluentui/react-components
  - What it is:
    Microsoft Fluent UI React component library used for enterprise-grade UI controls.
  - Why used:
    This component uses Fluent UI for:
    - styling through makeStyles and design tokens
    - loading spinners
    - search box
    - dialogs and dialog actions
    - form controls such as Input and Select
    - buttons, menus, badges, and text rendering
*/
import {
  makeStyles,
  tokens,
  Spinner,
  SearchBox,
  Badge,
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Field,
  Input,
  Select,
  Text,
  Tooltip,
  Switch,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from "@fluentui/react-components";

/*
  @fluentui/react-icons
  - What it is:
    Fluent UI icon library for consistent action and section iconography.
  - Why used:
    - PersonAdd20Filled represents the Add User action
    - EditRegular exists as part of the users management pattern
    - PeopleRegular visually identifies this tab as user/admin related
    - DeleteRegular is used for destructive remove/delete actions
    - MoreVerticalRegular supports overflow-menu style actions
*/
import {
  PersonAdd20Filled,
  EditRegular,
  PeopleRegular,
  DeleteRegular,
  MoreVerticalRegular,
} from "@fluentui/react-icons";

/*
  @/components/ui/Help
  - What it is:
    Reusable contextual help component.
  - Why used:
    Displays an informational tooltip near the section title to explain the purpose of this tab.
*/
import { Help } from "@/components/ui/Help";

/*
  react
  - What it is:
    Core React library.
  - Why used:
    `useState` is used throughout this component to manage:
    - dialog open/close state
    - selected user state
    - search text
    - submit and delete loading states
    - inline error messages
    - owner confirmation flow state [web:54]
*/
import { useState } from "react";

/*
  @/components/ui/DataGrid
  - What it is:
    Reusable grid component used across the application.
  - Why used:
    Renders the list of dashboard super admins in a configurable table layout.
*/
import { DataGrid, ColumnConfig } from "@/components/ui/DataGrid";

/*
  @/hooks/useRolesManagement
  - What it is:
    Custom hooks for fetching RBAC-related data.
  - Why used:
    - useGetDashboardOwners fetches the current dashboard super admins
    - useGetDashboardUsers fetches users available for selection in the Add User dialog
*/
import { useGetDashboardOwners, useGetDashboardUsers } from "@/hooks/useRolesManagement";

/*
  @/lib/services/rolesManagementService
  - What it is:
    Service layer for roles/users management API operations.
  - Why used:
    This component uses it to:
    - add a new dashboard owner
    - remove a dashboard owner
*/
import { rolesManagementService } from "@/lib/services/rolesManagementService";

/*
  @/lib/helper
  - What it is:
    Shared helper utilities.
  - Why used:
    `formatDateTime` formats raw timestamps for display in the DataGrid.
*/
import { formatDateTime } from "@/lib/helper";

/*
  ./types
  - What it is:
    Local type definitions for user-related payloads and records.
  - Why used:
    - `DashboardUser` describes a user row object
*/
import { DashboardUser } from "@/types/api";

/*
  @/hooks/useToast
  - What it is:
    Global toast notification hook.
  - Why used:
    Displays success messages after add/remove operations succeed.
*/
import { useGlobalToast } from "@/hooks/useToast";

/*
  @/hooks/hasPagePermissions
  - What it is:
    Page-level permission access hook.
  - Why used:
    Determines whether the current user can:
    - read this tab
    - write/remove/add users
    - see permission-loading state while access is being resolved
*/
import { usePagePermissions } from "@/hooks/hasPagePermissions";

// ---------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------

/*
  useStyles
  - What it is:
    Fluent UI CSS-in-JS style hook for component-scoped styling.
  - Why used:
    Centralizes layout and dialog styling for this tab.
*/
const useStyles = makeStyles({
  /*
    sectionTitle
    - Styles the section title row containing:
      - icon
      - title text
      - help tooltip
  */
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    fontWeight: tokens.fontWeightSemibold,
  },

  /*
    container
    - Adds bottom spacing to the content area.
  */
  container: {
    paddingBottom: tokens.spacingVerticalXL,
  },

  /*
    formField
    - Shared stacked layout for dialog form fields.
  */
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalM,
  },

  // ── Delete confirmation dialog ─────────────────────────────────────

  /*
    deleteConfirmText
    - Styles the main confirmation message inside the delete dialog.
  */
  deleteConfirmText: {
    display: "block",
    marginBottom: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground2,
  },

  /*
    deleteUserName
    - Styles the highlighted user name shown inside the delete confirmation text.
  */
  deleteUserName: {
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground2,
  },
});


// ---------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------

/**
 * DashboardUsersTab
 *
 * Renders the Dashboard Super Admins tab content including:
 * - Search box for filtering users by display name or email
 * - DataGrid showing all owners with an action column
 * - Remove owner confirmation dialog
 * - Add owner dialog
 * - Additional confirmation dialog when the user must be removed from groups first
 *
 * Important behavior:
 * - Read/write access is permission-controlled.
 * - The delete/remove flow is confirmed before API execution.
 * - Search filtering is local to this tab.
 */
export default function DashboardSuperAdminTab() {
  // Get generated class names from the Fluent UI style hook.
  const styles = useStyles();

  // Get global toast helper for success notifications.
  const { showToast } = useGlobalToast();


  // Resolve current user's page-level read/write access for this tab.
  const {canRead, canWrite, isLoadingPermissions} = usePagePermissions("roles-management-admins");


  // ── Existing state (unchanged) ───────────────────────────────────────

  // Tracks whether an add/confirm flow is currently submitting.
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);


  // Stores the search text used to filter owners by display name or email.
  const [ownerSearchQuery, setOwnerSearchQuery] = useState<string>("");

  // Controls whether the Add Owner dialog is open.
  const [isAddOwnerDialogOpen, setIsAddOwnerDialogOpen] = useState<boolean>(false);

  // Controls whether the secondary confirmation dialog for adding an owner is open.
  const [confirmAddOwner, setConfirmAddOwner] = useState<boolean>(false);

  // Stores the list of groups the selected user must be removed from before becoming a super admin.
  const [userToRemoveFromGroups, setUserToRemoveFromGroups] = useState<[]>([]);

  // Stores the currently selected user for add-owner flow.
  const [selectedOwner, setSelectedOwner] = useState<DashboardUser | null>(null);


  // Fetch current dashboard owners/super admins.
  // Provides:
  // - dashboardOwners: owner list
  // - refetch: reload function
  // - isFetchingDashboardOwners: loading state for grid
  const { dashboardOwners, refetch, isFetchingDashboardOwners} = useGetDashboardOwners();


  // Fetch all dashboard users available for selection in the Add User dialog.
  const {dashboardUsers, isFetchingUsers } = useGetDashboardUsers(true);


  // ── Delete User confirmation dialog state ────────────────────────────

  // Track whether the delete confirmation dialog is open or closed.
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState<boolean>(false);

  // Store the selected user targeted for deletion/removal.
  // This is used to show the user's display name in the dialog and pass their ID to the API.
  const [userToDelete, setUserToDelete] = useState<DashboardUser | null>(null);

  // Track whether the delete API call is in progress.
  // Used to show a spinner and prevent duplicate clicks.
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  // Store any error that occurs during deletion so it can be shown inline in the dialog.
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);


  // ── Column Definitions ──────────────────────────────────────────────

  /*
    ownerColumns
    - Base DataGrid column configuration for dashboard super admins.
    - Includes display name, email, added by, status, and added at.
  */
  const ownerColumns: ColumnConfig<any>[] = [
    {
      key: "display_name",
      label: "Display Name",
      width: "18%",
      showMore: true,
      sortable: true,
    },
    {
      key: "email",
      label: "Email",
      width: "22%",
      showMore: true,
      copyable: true,
      sortable: true,
    },
    {
      key: "added_by",
      label: "Added By",
      width: "12%",
      sortable: true,
      showMore: true,
    },
    {
      key: "is_active",
      label: "Status",
      width: "8%",
      sortable: true,

      // Display status as a badge instead of raw boolean text.
      render: (value) => (
        <Badge appearance="filled" color={value ? "success" : "danger"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "added_at",
      label: "Added At",
      width: "12%",
      sortable: true,
      showMore: true,

      // Format the added timestamp for display, or show a dash when absent.
      getValue: (value) => (value ? formatDateTime(value) : "-"),
    },
  ];


  /*
    ownerColumnsWithAction
    - Extends base columns with an Actions column only when the user has write permission.
    - If write access is absent, only the read-only base columns are shown.
  */
  const ownerColumnsWithAction: ColumnConfig<any>[] = canWrite ? [
    ...ownerColumns,
    {
      key: "actions",
      label: "Actions",
      width: "5%",

      // Render a remove-user button with destructive red styling.
      render: (value, row) => (
            <Tooltip content="Remove Admin" relationship="label">
              <Button
              style={{color:tokens.colorPaletteRedForeground1}}
              appearance="subtle"
                icon={<DeleteRegular />}
                onClick={() => handleOpenDeleteOwnerDialog(row)}
              />
            </Tooltip>
      ),
    },
  ] : ownerColumns;


  // ── Handlers — existing (unchanged) ─────────────────────────────────

  /*
    handleOpenAddOwnerDialog
    - Clears selected owner and prior submit errors.
    - Opens the Add Owner dialog.
  */
  const handleOpenAddOwnerDialog = () => {
    setSelectedOwner(null);
    setSubmitError(null);
    setIsAddOwnerDialogOpen(true);
  };


  /*
    handleAddNewOwner
    - Receives a selected user_id from the dropdown.
    - Finds the matching user object from dashboardUsers.
    - Stores the full selected user object in component state.
  */
  const handleAddNewOwner = (user_id:string) => {
    
    const selected = dashboardUsers?.find(
      (dashboardUser: any) => dashboardUser.user_id === user_id
    );
    setSelectedOwner(selected ?? null);  
  }


  /*
    handleAddOwner
    - Adds the selected user as a dashboard owner/super admin.
    - If backend indicates the user belongs to existing groups:
      - opens a confirmation flow
      - shows the groups that will be removed
    - Otherwise:
      - refetches owners
      - shows success toast
      - resets add flow state
  */
  const handleAddOwner = async (confirmRemoveUserFromGroups:boolean) => {
    setIsAddingUser(true);
    setSubmitError(null);

    // Build the payload expected by the add owner service.
    const payload = {
      user_id:selectedOwner?.user_id,
      is_active: true,
      confirmRemoveUser: confirmRemoveUserFromGroups
    }

      await rolesManagementService.addNewDashboardOwner(payload)
      .then((serviceResponse) => {
        if(serviceResponse.isUserInAGroup){
          setConfirmAddOwner(true);
          setUserToRemoveFromGroups(serviceResponse.userInGroup);
        }
        else{
          refetch();
          showToast("Made Admin successfully.");
          setIsAddOwnerDialogOpen(false);
          setSelectedOwner(null);
          setIsAddingUser(false);
          setIsSubmitting(false);
          setConfirmAddOwner(false);
        }
      })
      .catch((error) => {
        setSubmitError("Failed to make admin. Please try again.");
        setIsSubmitting(false);
        setConfirmAddOwner(false);
      })
  };

  const handleDiscard = () => {
    setIsAddOwnerDialogOpen(false); 
    setSubmitError(null); 
    setIsSubmitting(false); 
    setIsAddingUser(false);
  }

  // ── Handlers — Delete Owner ────────────────────────────────────────────

  /*
    handleOpenDeleteOwnerDialog
    - Stores the selected owner for deletion/removal.
    - Clears prior delete error.
    - Opens the delete confirmation dialog.
  */
  const handleOpenDeleteOwnerDialog = (user: DashboardUser) => {
    setUserToDelete(user);
    setDeleteUserError(null);
    setIsDeleteUserDialogOpen(true);
  };


  /*
    handleConfirmDeleteUser
    - Executes when admin confirms owner removal.
    - Calls the remove owner service with the selected user's ID.
    - On success:
      - refetches owner list
      - shows success toast
      - closes dialog
      - clears selected user
    - On failure:
      - shows inline error in the dialog
  */
  const handleConfirmDeleteUser = async () => {
    // Guard clause: do nothing if no user is selected.
    if (!userToDelete) return;

    // Enter deleting state to prevent repeated clicks.
    setIsDeletingUser(true);
    setDeleteUserError(null);

    try {
      await rolesManagementService.removeDashboardOwners(userToDelete.user_id)
      .then((serviceResponse) => {
        refetch();
        showToast("Admin removed successfully.");
        setIsDeleteUserDialogOpen(false);
        setUserToDelete(null);
      });
    } catch {
      setDeleteUserError("Failed to remove admin. Please try again.");
    } finally {
      setIsDeletingUser(false);
    }
  };


  // ── Filtered Data ────────────────────────────────────────────────────

  /*
    filteredOwnerData
    - Derived dataset used by the DataGrid.
    - If search input is empty after trimming, show all owners.
    - Otherwise filter owners by:
      - display_name
      - email
    - Filtering is case-insensitive.
  */
  const filteredOwnerData =
    ownerSearchQuery.trim() === ""
      ? dashboardOwners ?? []
      : (dashboardOwners ?? []).filter((user: DashboardUser) => {
          const keyword = ownerSearchQuery.toLowerCase();
          return (
            user.display_name?.toLowerCase().includes(keyword) ||
            user.email?.toLowerCase().includes(keyword)
          );
        });


  // ── Render ───────────────────────────────────────────────────────────

  // While page permission access is still loading, show a centered loading indicator.
  if (isLoadingPermissions) {
    return (
        <div className="flex h-full min-h-[50vh] items-center justify-center">
            <Spinner size="medium" label="Loading..." />
        </div>
    );
  };


  // If permission loading is complete and the user lacks read access,
  // redirect them to the forbidden page.
  if(!isLoadingPermissions
    && !canRead
    ) {
      window.location.href = "/forbidden";
    };


  // Render the Dashboard Super Admins tab UI.
  return (
    <div>
      <div className={styles.container}>
        <div className="w-full flex flex-col gap-2 mt-4">
          {/* Section title row */}
          <div className="flex items-center justify-between">
            <div className={styles.sectionTitle}>
              <PeopleRegular />
              <Text size={400} weight="semibold">Dashboard Admins</Text>
              <Help info="This table displays all dashboard admins registered in the RBAC system. Each admin record includes their display name, email, active status, added by and added date. Use the search box to filter by display name or email. Click the Remove Admin icon per row to Remove a admin. Use the Make Admin button to register a new admin in the system." />
            </div>

            {/* Show Make Admin button only when user has write permission */}
            {canWrite && (
            <Button
              appearance="primary"
              icon={<PersonAdd20Filled />}
              onClick={handleOpenAddOwnerDialog}
            >
              Make Admin
            </Button>
            )}
          </div>

          {/* Search box */}
          <SearchBox
            placeholder="Filter by display name or email..."
            value={ownerSearchQuery}
            onChange={(_, searchBoxChangeData) => setOwnerSearchQuery(searchBoxChangeData.value ?? "")}
            className="w-[20rem]"
          />
        </div>

        {/* Data grid */}
        <DataGrid
          columns={ownerColumnsWithAction}
          data={filteredOwnerData}
          loading={isFetchingDashboardOwners}
        />
      </div>


      {/* ════════════════════════════════════════════════════════════════
          DELETE USER CONFIRMATION DIALOG
      ════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={isDeleteUserDialogOpen}
        onOpenChange={(_, dialogOpenChangeData) => {
          if (!dialogOpenChangeData.open && !isDeletingUser) {
            setIsDeleteUserDialogOpen(false);
            setUserToDelete(null);
            setDeleteUserError(null);
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Remove Admin</DialogTitle>

            <DialogContent>
              <Text className={styles.deleteConfirmText}>
                Are you sure you want to remove the admin{" "}
                <span className={styles.deleteUserName}>
                  {userToDelete?.display_name}
                </span>
                ? This action cannot be undone.
              </Text>

              {deleteUserError && (
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {deleteUserError}
                </Text>
              )}
            </DialogContent>

            <DialogActions>
              <Button
                appearance="secondary"
                disabled={isDeletingUser}
                onClick={() => {
                  setIsDeleteUserDialogOpen(false);
                  setUserToDelete(null);
                  setDeleteUserError(null);
                }}
              >
                Cancel
              </Button>

              <Button
                appearance="primary"
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }}
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                icon={isDeletingUser ? <Spinner size="tiny" /> : undefined}
              >
                {isDeletingUser ? "Removing..." : "Yes"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>


      {/* ── ADD USER DIALOG ──────────────────────────────────────────── */}
      <Dialog
        open={isAddOwnerDialogOpen}
        onOpenChange={(_, dialogOpenChangeData) => setIsAddOwnerDialogOpen(dialogOpenChangeData.open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Make Dashboard Admin</DialogTitle>
            <DialogContent>

              {/* User selection dropdown */}
              <div className={styles.formField}>
              <Field label="Select User" required>
                <Select
                    value={selectedOwner?.user_id ?? ""}
                    onChange={(selectChangeEvent) => {handleAddNewOwner(selectChangeEvent.target.value)}}
                  >
                    {isFetchingUsers ? (
                      <div><Spinner size="medium" label="Loading Users..." /></div>
                    ) : (
                      <>
                      <option value="" disabled>
                      {isFetchingUsers? "Loading users..." : "Select a user..."}
                      </option>
                      {dashboardUsers?.map((dashboardUser: any) => (
                        <option key={dashboardUser.user_id} value={dashboardUser.user_id}> 
                          {dashboardUser.display_name}
                        </option>
                      ))};
                      </>
                    )}
                  </Select>
                </Field>
              </div>

              {/* Inline add-user error message */}
              {submitError && (
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {submitError}
                </Text>
              )}

            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button
                  appearance="secondary"
                  onClick={() => {handleDiscard}}
                >
                  Cancel
                </Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={() => {handleAddOwner(false)}}
                disabled={isAddingUser || !selectedOwner}
                icon={isAddingUser ? <Spinner size="tiny" /> : undefined}
              >
                {isAddingUser ? "Processing..." : "Make Admin"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>


      {/* ================================================================
          CONFIRMATION DIALOG — Add owner
          Opens when admin clicks the add user button.
      ================================================================ */}
      <Dialog
        open={!!confirmAddOwner}
        onOpenChange={(_, dialogOpenChangeData) => {
          if (!dialogOpenChangeData.open) {
            setConfirmAddOwner(false);
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Make Dashboard Admin</DialogTitle>

            <DialogContent>
              <Text
                size={200}
                style={{
                  color: tokens.colorNeutralForeground2,
                  display: "block",
                }}
              >
                Are you sure you want to make{" "}
                <Text size={300} weight="bold">
                  {selectedOwner?.display_name}
                </Text>{" "}
                as dashboard admin?, Click "Confirm" to remove user from all groups and assigned dashboard admin role.
              </Text>
              
              {userToRemoveFromGroups.length===0 
              ? <Text style={{color: tokens.colorNeutralForeground2}}>Use is currently not in any group.</Text>
              :
              <div style={{color: tokens.colorNeutralForeground2, display:"flex", flexDirection:"column", gap:3, marginTop:tokens.spacingVerticalS}}>
                <Text size={300}>User will be removed from following groups:</Text>
              {
                userToRemoveFromGroups?.map((ownerGroup:any, groupIndex)=>
                <Text key={`group-${groupIndex}`} size={300} weight="semibold">{groupIndex+1}. {ownerGroup.group_name}</Text>
                )
              }
              </div>
              }
            </DialogContent>

            <DialogActions>
              {/* Cancel — closes confirmation, no API call made */}
              <Button
                appearance="secondary"
                onClick={() => {
                  setConfirmAddOwner(false);
                  setIsSubmitting(false);
                  setIsAddingUser(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              
              {/* Confirm — fires remove API immediately */}
              <Button
                appearance="primary"
                style={{ backgroundColor: tokens.colorNeutralForeground1}}
                onClick={()=>{handleAddOwner(true); setIsSubmitting(true);}}
                disabled={isSubmitting}
                icon={isSubmitting ? <Spinner size="tiny" /> : <DeleteRegular />}
              >
                {isSubmitting?"Processing...":"Confirm"}
              </Button>
            </DialogActions>

          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}