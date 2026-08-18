/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Atharva Mundhada
  Date: 24 June 2026

  Purpose of the script:
  Groups tab component for the Roles Management Dashboard.
  - Displays all dashboard groups registered in the RBAC system.
  - Allows admins to add and update groups via dialogs.
  - Actions column uses a 3-dot overflow menu: Edit Group, Manage Scope, Manage Permissions, Delete Group.
  - "Delete Group" option opens a confirmation dialog; confirming calls the delete API immediately.
  - "Manage Permissions" dialog:
      - Lists existing principal → permission assignments for the group.
      - Editing an existing row's permission level marks that row as "dirty" and shows
        a Save button ONLY on that specific row. Save persists the change; it disappears after.
      - Adding a new principal is a separate bottom section — no Save needed, Add fires immediately.
      - Delete fires immediately with no Save step.
  - "Manage Scope" dialog:
      - Manages L1 Business Unit access for the GROUP as a whole (not individual members).
      - Lists existing L1 BU grants for the group.
      - Revoking a BU grant fires immediately.
      - Adding a new L1 BU grant fires immediately via the Add button.
  - Supports search filtering within the tab independently.
*/

/* Marks this file as a client component so React hooks and browser-side interactivity can be used. */
"use client";

/* Imports Fluent UI styling utilities and UI building blocks used throughout the component. */
import {
  /* Creates component-scoped style hooks. */
  makeStyles,
  /* Provides Fluent design tokens such as spacing, colors, and font sizes. */
  tokens,
  /* Displays loading indicators during async operations. */
  Spinner,
  /* Search input control used for table filtering. */
  SearchBox,
  /* Compact visual status label used for status display. */
  Badge,
  /* Reusable clickable action button component. */
  Button,
  /* Root dialog component used for controlled modal rendering. */
  Dialog,
  /* Wrapper used to connect a trigger element with a dialog. */
  DialogTrigger,
  /* Outer visual surface of a dialog. */
  DialogSurface,
  /* Header title area inside a dialog. */
  DialogTitle,
  /* Main structural body wrapper inside a dialog. */
  DialogBody,
  /* Footer/action row inside a dialog. */
  DialogActions,
  /* Main content area inside a dialog. */
  DialogContent,
  /* Field wrapper that pairs labels, hints, and form controls. */
  Field,
  /* Standard single-line text input. */
  Input,
  /* General-purpose text rendering component. */
  Text,
  /* Hover/focus helper used to explain actions. */
  Tooltip,
  /* Toggle control for boolean active/inactive status. */
  Switch,
  /* Multi-line text input for descriptions. */
  Textarea,
  /* Root overflow menu container. */
  Menu,
  /* Clickable item inside the overflow menu. */
  MenuItem,
  /* List wrapper containing menu items. */
  MenuList,
  /* Floating popover surface for the menu. */
  MenuPopover,
  /* Trigger wrapper for opening the menu. */
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from "@fluentui/react-components";

/*
  @fluentui/react-icons
  - What it is:
    Fluent UI icon set for consistent iconography.
  - Why used:
    Icons visually reinforce the purpose of actions in the Groups tab:
    - EditRegular for editing a group
    - PeopleTeamRegular for the section title
    - PeopleSettingsRegular for scope management
    - KeyRegular for role management
    - AddRegular for the Add Group button
    - MoreVerticalRegular for the actions overflow menu
    - DeleteRegular for destructive delete action
    - ArrowSyncRegular for import AD groups
*/
import {
  /* Pencil/edit icon for updating a group. */
  EditRegular,
  /* Team/group icon used in the section heading. */
  PeopleTeamRegular,
  /* Scope/settings icon for group scope management. */
  PeopleSettingsRegular,
  /* Key icon used for roles/permissions management. */
  KeyRegular,
  /* Plus icon used for Add Group action. */
  AddRegular,
  /* Three-dot vertical overflow menu icon. */
  MoreVerticalRegular,
  /* Trash/delete icon used for destructive delete action. */
  DeleteRegular,
  ArrowSyncRegular,
} from "@fluentui/react-icons";

/*
  @/components/ui/Help
  - What it is:
    Custom reusable Help component used to show contextual help text.
  - Why used:
    Displays a concise explanation beside the section title so users understand
    what the table shows and how the actions behave.
*/
import { Help } from "@/components/ui/Help";

/*
  react
  - What it is:
    Core React library.
  - Why used:
    This component uses:
    - useState to manage:
    - dialog open/close states
    - form values
    - selected group references
    - loading states
    - error states
    - search filter value
    - useRef to keep the active EventSource connection without re-rendering
    - useEffect to close that EventSource connection when the component unmounts
*/
import { useEffect, useRef, useState } from "react";

/*
  @/components/ui/DataGrid
  - What it is:
    Reusable custom DataGrid component with column configuration support.
  - Why used:
    Renders the groups table in a standardized grid format and allows column-level
    customization such as custom rendering, sorting, copyability, and overflow behavior.
*/
import { DataGrid, ColumnConfig } from "@/components/ui/DataGrid";

/*
  @/lib/helper
  - What it is:
    Utility/helper library for common formatting functions.
  - Why used:
    `formatDateTime` is used to convert raw created_at timestamps into a readable format
    before displaying them in the grid.
*/
import { formatDateTime, formatRouteParam, toTitleCase } from "@/lib/helper";

/*
  @/types/api
  - What it is:
    TypeScript type definitions for API-driven entities and payloads.
  - Why used:
    - `DashboardGroup` describes a group record returned from the backend.
    - `GroupFormPayload` describes the request body shape used for add/edit operations.
*/
import { DashboardGroup, GroupFormPayload } from "@/types/api";

/*
  @/hooks/useRolesManagement
  - What it is:
    Custom hook collection for Roles Management module queries.
  - Why used:
    `useGetDashboardGroups` fetches all dashboard group records using React Query
    and provides normalized data, refetch capability, and loading state.
*/
import { useGetDashboardGroups } from "@/hooks/useRolesManagement";

/*
  @/lib/services/rolesManagementService
  - What it is:
    Service layer encapsulating all backend calls for Roles Management.
  - Why used:
    This component calls service methods directly for:
    - addDashboardGroup
    - updateDashboardGroup
    - removeDashboardGroup
*/
import { rolesManagementService } from "@/lib/services/rolesManagementService";

/*
  ./ManageRolesInGroup
  - What it is:
    Child dialog component responsible for managing user-role assignments within a group.
  - Why used:
    Opened from the per-row Actions menu when the user selects "Manage Roles".
*/
import ManageRolesInGroup from "./ManageRolesInGroup";

/*
  @/hooks/useToast
  - What it is:
    Global toast notification hook.
  - Why used:
    Displays success notifications after add, update, and delete operations complete successfully.
*/
import { useGlobalToast } from "@/hooks/useToast";

/*
  ./ManageScopeDialog
  - What it is:
    Child dialog component for viewing and managing group-level L1 Business Unit scope access.
  - Why used:
    Opened from the per-row Actions menu when the user selects "Manage Scope".
*/
import ManageScopeDialog from "./ManageScopeDialog";

/*
  @/hooks/hasPagePermissions
  - What it is:
    Permission-checking hook for page/module-level RBAC access.
  - Why used:
    Determines whether the current user can:
    - read the Groups tab
    - write group records
    - view/manage scope dialog
    - view/manage group-role dialog
*/
import { usePagePermissions } from "@/hooks/hasPagePermissions";

/*
  AzureAdImportJobUpdate
  - What it is:
      The status message shape sent by the backend SSE stream.
  - Why used:
      The UI reads these fields to show progress like "Merged 500 of 68000 groups".
  - Simple example:
      { jobId: "abc", status: "merging", message: "Merged 500 of 68000 Azure AD groups." }
*/
type AzureAdImportJobUpdate = {
  jobId: string; // Unique ID of the background import job.
  status: string; // Current job state, such as queued, fetching, merging, success, or failed.
  message?: string; // Human-readable status text sent by the backend.
  totalGroups?: number; // Total Azure AD groups found by the backend.
  processedGroups?: number; // Number of groups already merged into Databricks.
  totalChunks?: number; // Total Databricks merge batches.
  processedChunks?: number; // Databricks merge batches completed so far.
  error?: string; // Error text when the backend job fails.
};



// ---------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------

/*
  EMPTY_GROUP_FORM
  - What it is:
    Default initial state object for the Add/Edit Group form.
  - Why used:
    Ensures the form always starts from a known clean state.
  - Field meanings:
    - group_name: empty until user provides a value
    - description: optional description starts blank
    - is_active: defaults to true so newly created groups are active unless changed
*/
const EMPTY_GROUP_FORM: GroupFormPayload = {
  /* Initial group name is empty until the user enters a value. */
  group_name: "",
  /* Initial description is blank because it is optional. */
  description: "",
  /* New groups default to active status unless the user switches it off. */
  is_active: true,
};



// ---------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------

/*
  useStyles
  - What it is:
    Fluent UI CSS-in-JS style hook for this component.
  - Why used:
    Keeps component-specific styling centralized, typed, and reusable through generated class names.
*/
const useStyles = makeStyles({
  /*
    sectionTitle
    - Styles the title row at the top of the tab.
    - Aligns the icon, title text, and help icon horizontally.
  */
  sectionTitle: {
    /* Places heading elements in a horizontal row. */
    display: "flex",
    /* Vertically centers heading elements. */
    alignItems: "center",
    /* Adds spacing between the icon, text, and help widget. */
    gap: tokens.spacingHorizontalS,
    /* Makes the section title visually stronger. */
    fontWeight: tokens.fontWeightSemibold,
  },

  /*
    container
    - Adds bottom spacing to the tab section so content does not feel cramped.
  */
  container: {
    /* Adds extra bottom spacing below the content block. */
    paddingBottom: tokens.spacingVerticalXL,
  },

  /*
    formField
    - Shared vertical layout for each field block in Add/Edit dialogs.
    - Ensures a label + input stack with consistent spacing.
  */
  formField: {
    /* Uses flex layout to stack label and control content. */
    display: "flex",
    /* Stacks child elements vertically. */
    flexDirection: "column",
    /* Adds vertical spacing within the field wrapper. */
    gap: tokens.spacingVerticalXS,
    /* Adds spacing below each form field block. */
    marginBottom: tokens.spacingVerticalM,
  },


  // ── Shared dialog layout ───────────────────────────────────────────

  /*
    dialogSurface
    - Provides consistent sizing for dialog surfaces.
    - Useful when different dialogs in the tab should visually align.
  */
  dialogSurface: {
    /* Ensures dialogs are wide enough for admin form content. */
    minWidth: "560px",
    /* Prevents dialogs from expanding too wide on large screens. */
    maxWidth: "640px",
  },

  /*
    dialogHeaderMeta
    - Secondary text style for descriptive metadata beneath dialog titles.
  */
  dialogHeaderMeta: {
    /* Uses a subtle neutral color for secondary information. */
    color: tokens.colorNeutralForeground3,
    /* Uses compact text size for metadata. */
    fontSize: tokens.fontSizeBase200,
    /* Forces metadata text to occupy its own line. */
    display: "block",
    /* Adds space below the metadata line. */
    marginBottom: tokens.spacingVerticalXXS,
  },

  /*
    tableHeader
    - Shared grid layout for table-like dialog headers.
  */
  tableHeader: {
    /* Uses CSS grid for aligned header columns. */
    display: "grid",
    /* Adds spacing between grid columns. */
    gap: tokens.spacingHorizontalM,
    /* Adds padding below the header content. */
    paddingBottom: tokens.spacingVerticalXS,
    /* Draws a divider below the header row. */
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    /* Adds spacing below the divider before rows begin. */
    marginBottom: tokens.spacingVerticalS,
  },

  /*
    tableHeaderText
    - Styling for compact uppercase dialog table header labels.
  */
  tableHeaderText: {
    /* Uses a smaller compact font size for header labels. */
    fontSize: tokens.fontSizeBase200,
    /* Makes header labels semibold for emphasis. */
    fontWeight: tokens.fontWeightSemibold,
    /* Uses a muted neutral color for secondary emphasis. */
    color: tokens.colorNeutralForeground3,
    /* Converts header text to uppercase. */
    textTransform: "uppercase",
    /* Adds tracking so uppercase labels are easier to read. */
    letterSpacing: "0.04em",
  },

  /*
    tableRow
    - Shared layout for row-like structures inside dialogs.
  */
  tableRow: {
    /* Uses grid to align data cells. */
    display: "grid",
    /* Adds spacing between cells. */
    gap: tokens.spacingHorizontalM,
    /* Vertically centers row content. */
    alignItems: "center",
    /* Adds vertical padding to each row. */
    paddingBlock: tokens.spacingVerticalXS,
    /* Adds a row divider line. */
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },

  /*
    nameCell
    - Flex container used when a row cell contains an icon plus text content.
  */
  nameCell: {
    /* Uses flex for side-by-side alignment. */
    display: "flex",
    /* Vertically aligns icon and text. */
    alignItems: "center",
    /* Adds spacing between icon and text stack. */
    gap: tokens.spacingHorizontalS,
  },

  /*
    nameStack
    - Vertical stack for primary and secondary text within a name cell.
  */
  nameStack: {
    /* Uses flexbox for vertical stacking. */
    display: "flex",
    /* Stacks text lines top-to-bottom. */
    flexDirection: "column",
  },

  /*
    subText
    - Smaller secondary text style.
  */
  subText: {
    /* Uses a smaller font size for low-priority information. */
    fontSize: tokens.fontSizeBase100,
    /* Uses a muted text color for secondary information. */
    color: tokens.colorNeutralForeground3,
  },

  /*
    inheritedLabel
    - Italic subtext used where inherited or derived values need special distinction.
  */
  inheritedLabel: {
    /* Keeps the label visually small. */
    fontSize: tokens.fontSizeBase100,
    /* Uses a subtle foreground color. */
    color: tokens.colorNeutralForeground3,
    /* Italicizes the text to indicate inherited or derived state. */
    fontStyle: "italic",
  },

  /*
    addSectionLabel
    - Label styling for a lower dialog section that adds new entries.
  */
  addSectionLabel: {
    /* Uses a compact but readable section-label font size. */
    fontSize: tokens.fontSizeBase200,
    /* Makes the add-section label semibold. */
    fontWeight: tokens.fontWeightSemibold,
    /* Uses a slightly stronger neutral than faint metadata. */
    color: tokens.colorNeutralForeground2,
    /* Makes the label occupy a full line. */
    display: "block",
    /* Adds spacing above the section label. */
    marginTop: tokens.spacingVerticalL,
    /* Adds spacing below the section label. */
    marginBottom: tokens.spacingVerticalXS,
    /* Pushes the label away from previous content. */
    paddingTop: tokens.spacingVerticalM,
    /* Adds a divider above the section to visually separate it. */
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  /*
    addRow
    - Grid layout for controls placed in an "Add new item" row.
  */
  addRow: {
    /* Uses grid to line up inputs and buttons. */
    display: "grid",
    /* Adds spacing between add-row elements. */
    gap: tokens.spacingHorizontalS,
    /* Aligns the controls along their bottom edge. */
    alignItems: "flex-end",
    /* Adds top spacing before the add-row section begins. */
    marginTop: tokens.spacingVerticalS,
  },


  // ── Delete confirmation dialog ─────────────────────────────────────

  /*
    deleteConfirmText
    - Styles the main confirmation message in the delete dialog.
  */
  deleteConfirmText: {
    /* Renders the text as a block element. */
    display: "block",
    /* Adds spacing below the confirmation message. */
    marginBottom: tokens.spacingVerticalM,
    /* Uses the standard readable foreground color. */
    color: tokens.colorNeutralForeground1,
  },

  /*
    deleteGroupName
    - Styles the group name inside the delete confirmation sentence.
    - Bold emphasis helps the user see exactly which group is being deleted.
  */
  deleteGroupName: {
    /* Makes the group name bold enough to stand out. */
    fontWeight: tokens.fontWeightSemibold,
    /* Keeps the group name color consistent with surrounding text. */
    color: tokens.colorNeutralForeground1,
  },
});


// ---------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------

/**
 * DashboardGroupsTab
 *
 * Renders the Groups tab including:
 * - Search box + DataGrid with 3-dot overflow menu per row
 * - Permission Settings dialog (per-group):
 *     Existing rows: dropdown change → marks row dirty → per-row Save button appears
 *     Add section: immediate Add with no Save step
 *     Delete: immediate, no Save step
 * - Manage Scope dialog (per-group):
 *     Shows L1 BU access granted to the GROUP as a whole
 *     Revoke: immediate
 *     Add: immediate via Add button
 * - Add Group / Edit Group dialogs
 * - Delete Group confirmation dialog (new):
 *     Opens from the 3-dot menu → "Are you sure?" prompt → Yes deletes, Cancel closes
 */

/* Declares and exports the Groups tab component used in the Roles Management Dashboard. */
export const DashboardGroupsTab = () => {
  /* Retrieves generated class names for all local styles. */
  const styles = useStyles();

  /* Retrieves the global toast helper for success notifications. */
  const { showToast } = useGlobalToast();


  // Fetch page-level permission state for the "roles-management-groups" permission area.
  // Returned values control whether the user can read the tab, perform write actions,
  // or access dependent dialogs and actions.
  const {canRead, canWrite, hasPermission, isLoadingPermissions} = usePagePermissions("roles-management-groups");


  // Check whether the current user can read the Manage Group Scope dialog.
  const canViewGroupScopeDialog = hasPermission("roles-management-manage-group-scope:read");

  // Check whether the current user can read the Manage User Roles dialog.
  const canViewUserRoleDialog = hasPermission("roles-management-manage-user-roles:read");

  // Check whether the current user can import Azure AD groups.
  const canImportAzureADGroups = hasPermission("roles-management-import-ad-groups:write");


  // ── Group form state ─────────────────────────────────────────────────

  // Tracks whether Add Group or Edit Group submission is currently in progress.
  // Used to disable buttons and show tiny spinners to prevent duplicate submissions.
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tracks whether Azure AD Groups import are currently in progress.
  // Used to disable buttons and show tiny spinners to prevent duplicate imports.
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Stores the latest import progress message shown below the "Import AD Groups" button.
  const [importJobMessage, setImportJobMessage] = useState<string | null>(null);

  // Keeps the active SSE connection so it can be closed when a new import starts or the component unmounts.
  const importEventSourceRef = useRef<EventSource | null>(null);

  // Stores any add/edit submission error message to show inline inside the dialog.
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* Holds the current search term used to filter the groups table. */
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>("");

  /* Controls visibility of the Add Group dialog. */
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState<boolean>(false);

  /* Controls visibility of the Edit Group dialog. */
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState<boolean>(false);

  // Stores the current Add/Edit form payload object.
  // This same state object is reused by both Add and Edit dialogs.
  const [groupFormData, setGroupFormData] = useState<GroupFormPayload>(EMPTY_GROUP_FORM);

  // Stores the currently selected group for edit operations.
  // When null, no group is selected for editing.
  const [selectedGroup, setSelectedGroup] = useState<DashboardGroup | null>(null);


  // ── Permission Settings dialog state ────────────────────────────────

  // Controls whether the Manage Roles dialog is open.
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState<boolean>(false);

  // Stores the group whose roles are currently being managed.
  const [permissionsGroup, setPermissionsGroup] = useState<DashboardGroup | null>(null);


  // ── Manage Scope dialog state ────────────────────────────────────────

  // Controls whether the Manage Scope dialog is open.
  const [isScopeDialogOpen, setIsScopeDialogOpen] = useState<boolean>(false);

  // Stores the group whose scope is currently being managed.
  const [scopeGroup, setScopeGroup] = useState<DashboardGroup | null>(null);



  // ── Delete Group confirmation dialog state ───────────────────────────

  // Tracks whether the delete confirmation dialog is currently open.
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState<boolean>(false);


  // Stores the group selected for deletion.
  // This is used to:
  // - display the group name in the confirmation message
  // - pass the group_id to the delete service call
  const [groupToDelete, setGroupToDelete] = useState<DashboardGroup | null>(null);


  // Tracks whether the delete API call is currently running.
  // Used to disable dialog actions and show progress feedback.
  const [isDeletingGroup, setIsDeletingGroup] = useState<boolean>(false);

  // Stores any delete error shown inside the confirmation dialog.
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);

  // Tracks the current Azure AD import state.
  //
  // Used to control the MessageBar appearance:
  // - idle    → hide the MessageBar
  // - info    → show import-in-progress status
  // - success → show successful completion message
  // - error   → show failure message
  const [importStatus, setImportStatus] = useState<
    "idle" | "info" | "success" | "error"
  >("idle");

  // Fetch all dashboard groups using the custom React Query hook.
  // The query is enabled only when the user has read permission.
  const { dashboardGroups, refetch, isFetchingGroups } = useGetDashboardGroups(canRead);

  // Cleanup: close the live status stream if the user navigates away from this tab.
  useEffect(() => {
    // React calls this returned function when the component unmounts.
    return () => {
      importEventSourceRef.current?.close(); // Prevents a background browser connection from staying open.
    };
  }, []);



  // ── Column Definitions ──────────────────────────────────────────────

  /*
    Base grid columns shown for group records.
    These columns define:
    - visible label
    - width
    - sorting behavior
    - overflow behavior
    - custom rendering for certain values
  */
  const groupColumns: ColumnConfig<any>[] = [
    {
      // Maps to the group_name field in each DashboardGroup row.
      key: "group_name",

      // Human-readable column label shown in the DataGrid header.
      label: "Group Name",

      // Controls the relative width of this column.
      width: "20%",

      // Allows long values to use "show more" expansion behavior.
      showMore: true,

      // Allows value copy support in the DataGrid.
      copyable: true,

      // Allows sorting by this column.
      sortable: true,
    },
    {
      /* Binds the column to the description property. */
      key: "description",
      /* Label shown in the table header. */
      label: "Description",
      width: "25%",
      showMore: true,
      /* Sorting is intentionally disabled for description. */
      sortable: false,
    },
    {
      // Maps to the group_type field in the row data.
      key: "group_type",
      label: "Type",
      width: "9%",
      sortable: true,
      // Custom render function to display the type of group as a colored badge instead of raw text.
      render: (cellValue) => (
        <Badge
          appearance="outline"
          color={cellValue === "AZURE_AD" ? "warning" : "brand"}
        >
          {toTitleCase(formatRouteParam(cellValue))}
        </Badge>
      ),
    },
    {
      /* Binds the column to the created_by property. */
      key: "created_by",
      /* Label shown in the table header. */
      label: "Created By",
      width: "14%",
      showMore: true,
      /* Enables sorting on created_by. */
      sortable: true,
    },
    {
      /* Binds the column to the boolean active-status field. */
      key: "is_active",
      /* Label shown in the table header. */
      label: "Status",
      width: "9%",
      sortable: true,
      /* Custom renderer converts boolean status into a colored badge. */
      render: (value) => (
        /* Shows green badge when active and red badge when inactive. */
        <Badge appearance="filled" color={value ? "success" : "danger"}>
          {/* Converts raw boolean into readable text. */}
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      /* Binds the column to the created_at timestamp field. */
      key: "created_at",
      /* Label shown in the table header. */
      label: "Created At",
      /* Width allocated to this column. */
      width: "12%",
      /* Allows long formatted timestamps to be expanded. */
      showMore: true,
      /* Enables sorting by creation timestamp. */
      sortable: true,

      // Converts the raw date value into a user-friendly formatted string.
      // If no value exists, show a fallback dash.
      getValue: (value, row, index) => (value ? formatDateTime(value) : "-"),
    },
  ];


  /*
    Conditionally extend the base columns with an Actions column.

    Logic:
    - If the user can write OR can view group scope OR can view user roles,
      show the Actions menu column.
    - Otherwise, return only the base group columns.
  */
  const groupColumnsWithActions: ColumnConfig<any>[] = 
  canWrite|| canViewGroupScopeDialog || canViewUserRoleDialog ? 
  [
    // Include all base columns first.
    ...groupColumns,
    {
      // Synthetic key for actions column.
      key: "actions",

      // Header label for the action menu column.
      label: "Actions",

      // Fixed width for the overflow menu cell.
      width: "7%",

      // Custom renderer outputs a 3-dot Fluent UI Menu for each row.
      render: (value, row, index) => (
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Tooltip content="More actions" relationship="label">
              <Button
                appearance="subtle"
                icon={<MoreVerticalRegular />}
                size="small"
                aria-label="More actions"
              />
            </Tooltip>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {/* Edit Group — opens the Edit Group form dialog */}
              {canWrite && (
              <MenuItem icon={<EditRegular />} onClick={() => handleOpenEditGroupDialog(row)}>
                Edit Group
              </MenuItem>
              )}


              {/* Manage Scope — opens the L1 BU access management dialog */}
              {canViewGroupScopeDialog && (
              <MenuItem icon={<PeopleSettingsRegular />} onClick={() => handleOpenScopeDialog(row)}>
                Manage Scope
              </MenuItem>
              )}


              {/* Manage Roles — opens the user-role assignment dialog for the selected group */}
              {canViewUserRoleDialog && (
              <MenuItem icon={<KeyRegular />} onClick={() => handleOpenPermissionsDialog(row)}>
                Manage User Role
              </MenuItem>
              )}


              {/* Delete Group — opens the delete confirmation dialog */}
              {canWrite && (
              <MenuItem
                icon={<DeleteRegular />}
                onClick={() => handleOpenDeleteGroupDialog(row)}
              >
                Delete Group
              </MenuItem>
              )}
            </MenuList>
          </MenuPopover>
        </Menu>
      ),
    },
  ] : groupColumns;


  // ── Handlers — Group CRUD ────────────────────────────────────────────

  /*
    handleOpenAddGroupDialog
    - Resets the form to a clean default state.
    - Clears any prior submit error.
    - Opens the Add Group dialog.
  */
  const handleOpenAddGroupDialog = () => {
    /* Resets form data to the empty default object. */
    setGroupFormData(EMPTY_GROUP_FORM);
    /* Clears any prior submission error. */
    setSubmitError(null);
    /* Opens the Add Group dialog. */
    setIsAddGroupDialogOpen(true);
  };


  /*
    handleOpenEditGroupDialog
    - Receives the selected group row.
    - Stores that group as the current edit target.
    - Pre-fills the form with the group's existing values.
    - Clears any prior submit error.
    - Opens the Edit Group dialog.
  */
  const handleOpenEditGroupDialog = (group: DashboardGroup) => {
    /* Stores the selected group so it can be referenced elsewhere in the dialog. */
    setSelectedGroup(group);
    /* Populates the form with the selected group's current values. */
    setGroupFormData({
      /* Preserves group ID so the update request targets the correct record. */
      group_id: group.group_id,
      /* Copies current group name into the edit form. */
      group_name: group.group_name,
      /* Uses existing description or empty string if description is null/undefined. */
      description: group.description ?? "",
      /* Copies current active flag into the edit form. */
      is_active: group.is_active,
    });
    /* Clears any previous submission error before opening the dialog. */
    setSubmitError(null);
    /* Opens the Edit Group dialog. */
    setIsEditGroupDialogOpen(true);
  };


  /*
    handleGroupFormChange
    - Shared setter for group form fields.
    - Accepts:
      - field: the key to update inside GroupFormPayload
      - value: the new value for that key
    - Uses functional state update so it always works from the latest form state.
  */
  const handleGroupFormChange = (field: keyof GroupFormPayload, value: string | boolean) => {
    /* Uses functional state update to safely merge the changed field into prior form state. */
    setGroupFormData((previousGroupFormData) => ({ ...previousGroupFormData, [field]: value }));
  };


  /*
    handleAddGroup
    - Submits the Add Group form to the backend.
    - Shows loading state during submission.
    - On success:
      - refetches the groups list
      - shows success toast
      - closes the dialog
      - resets the form
    - On failure:
      - shows inline submit error
  */
  const handleAddGroup = async () => {
    /* Marks submission as in progress to disable controls and show spinner feedback. */
    setIsSubmitting(true);
    /* Clears any previous submit error before attempting the request. */
    setSubmitError(null);
    try {
      /* Calls the create-group API with the current form payload. */
      await rolesManagementService.addDashboardGroup(groupFormData).then((response) => {
        /* Reloads the groups table so the new group appears immediately. */
        refetch();
        /* Shows a success toast after a successful add operation. */
        showToast("Group added successfully.");
        /* Closes the Add Group dialog. */
        setIsAddGroupDialogOpen(false);
        /* Resets the form back to default blank values. */
        setGroupFormData(EMPTY_GROUP_FORM);
      });
    } catch {
      /* Stores an inline error message if the add request fails. */
      setSubmitError("Failed to add group. Please try again.");
    } finally {
      /* Clears submitting state regardless of success or failure. */
      setIsSubmitting(false);
    }
  };

  /**
   * Imports and syncs Active Directory (AD) groups into the application.
   * 
   * This function:
   * - Sets a loading state while the import is in progress
   * - Calls the backend service to import/sync AD groups
   * - Refreshes data after successful import
   * - Displays success or error notifications to the user
   *
   * @async
   * @function handleImportADGroups
   * @returns {Promise<void>} Does not return a value, but performs side effects (UI state updates, API call, toast messages)
   */
  const handleImportADGroups = async () => {
    // Set importing state to true to indicate loading (e.g., disable button or show spinner)
    setIsImporting(true);
    // Set AD Groups import messagebar status.
    setImportStatus("info");
    // Show an immediate message before the backend responds.
    setImportJobMessage("Queuing Azure AD group import...");

    try {
      // Call the service method to import AD groups (API call)
      const response = await rolesManagementService.importADGroups();
      // The backend returns a streamUrl so the browser can listen for live status updates.
      const streamUrl = response?.streamUrl;

      // If the backend accepted the job but did not provide a stream URL, the UI cannot monitor it.
      if (!streamUrl) {
        // Stop the loading spinner because there is no live job stream to follow.
        setIsImporting(false);
        // Set AD Groups import messagebar status.
        setImportStatus("error");
        // Set Import Job MessageBar message.
        setImportJobMessage(
          "AD group import was queued, but no status stream was returned."
        );
        // Tell the user that monitoring could not be started.
        showToast("AD group import was queued, but no status stream was returned.", "error");
        // Exit early because EventSource cannot be created without a URL.
        return;
      }

      // Let the user know the job has been accepted and background processing has started.
      showToast("AD group import started.");
      // Display the queued state while waiting for the first SSE message.
      setImportJobMessage("Azure AD group import queued.");

      // Close any previous import status stream before opening a new one.
      importEventSourceRef.current?.close();
      // Open a browser-native SSE connection to receive status events from the backend.
      const eventSource = new EventSource(streamUrl);
      // Store the connection so cleanup code can close it later.
      importEventSourceRef.current = eventSource;

      // "status" events arrive repeatedly while the job is queued, fetching, or merging.
      eventSource.addEventListener("status", (messageEvent: MessageEvent) => {
        // Parse the JSON job status sent by the backend SSE route.
        const job = JSON.parse(messageEvent.data) as AzureAdImportJobUpdate;
        // Set AD Groups import messagebar status.
        setImportStatus("info");
        // Show the latest backend message, or a simple fallback based on the job status.
        setImportJobMessage(job.message ?? `Azure AD import status: ${job.status}`);
      });

      // "done" is the final event, sent when the background job succeeds or fails.
      eventSource.addEventListener("done", (messageEvent: MessageEvent) => {
        // Parse the final job status.
        const job = JSON.parse(messageEvent.data) as AzureAdImportJobUpdate;

        // Close the live connection because the job is finished.
        eventSource.close();
        // Clear the saved connection reference.
        importEventSourceRef.current = null;
        // Stop the button spinner.
        setIsImporting(false);
        // On success, reload the groups table so newly synced Azure AD groups appear.
        if (job.status === "success") {
          // Re-fetch dashboard groups from the backend.
          refetch();
          // Show success notification.
          showToast("AD groups imported/synced successfully.");
          // Set AD Groups import messagebar status.
          setImportStatus("success");
        } else {
          // Show failure notification with backend error when available.
          showToast(job.error ?? "Failed to import/sync AD groups. Please try again.", "error");
          // Set AD Groups import messagebar status.
          setImportStatus("error");
        }
        // Keep the final message visible below the button.
        setImportJobMessage(job.message ?? null);
      });

      // Handles either backend SSE error events or browser connection failures.
      eventSource.addEventListener("error", (messageEvent: Event) => {
        // Default message used when the browser error event has no details.
        let errorMessage = "Unable to stream Azure AD import status.";
        // Some SSE error events include data; native connection errors usually do not.
        const eventData = "data" in messageEvent ? String(messageEvent.data) : "";

        // If the backend sent a JSON error payload, prefer that clearer message.
        if (eventData) {
          // Parse backend error payload.
          const job = JSON.parse(eventData) as AzureAdImportJobUpdate;
          // Use the best available backend message.
          errorMessage = job.message ?? job.error ?? errorMessage;
        }

        // Close the broken stream.
        eventSource.close();
        // Clear the saved connection reference.
        importEventSourceRef.current = null;
        // Stop the button spinner.
        setIsImporting(false);
        // Set AD Groups import messagebar status.
        setImportStatus("error");
        // Show the error below the button.
        setImportJobMessage(errorMessage);
        // Show the error in the global toast area.
        showToast(errorMessage, "error");
      });
    } catch {
      // If an error occurs, show an error message to the user
      // Stop the button spinner because the job could not be queued.
      setIsImporting(false);
      // Set AD Groups import messagebar status.
       setImportStatus("error");
      // Set the error message for Messagebar.
      setImportJobMessage("Failed to import/sync AD groups. Please try again.");
      // Show a user-friendly error toast.
      showToast("Failed to import/sync AD groups. Please try again.", "error");
    }
  };


  /*
    handleUpdateGroup
    - Submits the Edit Group form to the backend.
    - Shows loading state during submission.
    - On success:
      - refetches the groups list
      - shows success toast
      - closes the edit dialog
      - clears selected group reference
    - On failure:
      - shows inline submit error
  */
  const handleUpdateGroup = async () => {
    /* Marks submission as in progress. */
    setIsSubmitting(true);
    /* Clears any previous submit error before attempting the update. */
    setSubmitError(null);
    try {
      /* Calls the update-group API with the current edit form payload. */
      await rolesManagementService.updateDashboardGroup(groupFormData).then((response) => {
        /* Refreshes the groups table so updates appear immediately. */
        refetch();
        /* Shows a success toast after successful update. */
        showToast("Group updated successfully.");
        /* Closes the Edit Group dialog. */
        setIsEditGroupDialogOpen(false);
        /* Clears the selected group reference after successful update. */
        setSelectedGroup(null);
      });
    } catch {
      /* Stores an inline error message if the update request fails. */
      setSubmitError("Failed to update group. Please try again.");
    } finally {
      /* Clears submitting state whether the request succeeded or failed. */
      setIsSubmitting(false);
    }
  };


  /**
   * Opens the delete confirmation dialog for the selected group.
   * The chosen group is stored so its name and ID can be used during confirmation.
   */
  const handleOpenDeleteGroupDialog = (group: DashboardGroup) => {
    /* Stores the group that the user intends to delete. */
    setGroupToDelete(group);
    /* Clears any stale delete error before opening the dialog. */
    setDeleteGroupError(null);
    /* Opens the delete confirmation dialog. */
    setIsDeleteGroupDialogOpen(true);
  };


  /**
   * Confirms deletion of the currently selected group.
   * If deletion succeeds, the grid is refreshed and the dialog is closed.
   */
  const handleConfirmDeleteGroup = async () => {
    /* Stops execution immediately if no group is currently selected for deletion. */
    if (!groupToDelete) return;

    /* Marks deletion as in progress to prevent duplicate submits. */
    setIsDeletingGroup(true);
    /* Clears any previous delete error before making the API call. */
    setDeleteGroupError(null);

    try {
      /* Calls the delete-group API using the selected group's ID. */
      await rolesManagementService.removeDashboardGroup(groupToDelete.group_id).then((response) => {
        /* Refreshes the groups list so the deleted group disappears from the table. */
        refetch();
        /* Shows a success toast after successful deletion. */
        showToast("Group deleted successfully.");
        /* Closes the delete confirmation dialog. */
        setIsDeleteGroupDialogOpen(false);
        /* Clears the reference to the deleted group. */
        setGroupToDelete(null);
      });
    } catch {
      /* Displays inline dialog error if deletion fails. */
      setDeleteGroupError("Failed to delete group. Please try again.");
    } finally {
      /* Clears deletion loading state no matter what happened. */
      setIsDeletingGroup(false);
    }
  };


  // ── Handlers — Permission Settings ──────────────────────────────────

  /*
    handleOpenPermissionsDialog
    - Stores the selected group for Manage Roles dialog context.
    - Opens the dialog.
  */
  const handleOpenPermissionsDialog = (group: DashboardGroup) => {
    /* Stores which group's roles should be managed. */
    setPermissionsGroup(group);
    /* Opens the roles dialog. */
    setIsPermissionsDialogOpen(true);
  };


  // ── Handlers — Manage Scope ──────────────────────────────────────────

  /*
    handleOpenScopeDialog
    - Stores the selected group for Manage Scope dialog context.
    - Opens the dialog.
  */
  const handleOpenScopeDialog = (group: DashboardGroup) => {
    /* Stores which group's scope should be managed. */
    setScopeGroup(group);
    /* Opens the scope dialog. */
    setIsScopeDialogOpen(true);
  };


  // ── Filtered Data ─────────────────────────────────────────────────────

  /*
    filteredGroupsData
    - Derived dataset used by the DataGrid.
    - If the search box is empty after trimming whitespace, show all groups.
    - Otherwise, filter by:
      - group_name
      - description
    - Matching is case-insensitive.
  */
  const filteredGroupsData: DashboardGroup[] =
    /* If search is blank after trimming whitespace, show all groups. */
    groupSearchQuery.trim() === ""
      ? dashboardGroups ?? []
      : /* Otherwise filter groups by group name or description. */
        (dashboardGroups ?? []).filter((group: DashboardGroup) => {
          /* Normalizes the search keyword to lowercase for case-insensitive matching. */
          const keyword = groupSearchQuery.toLowerCase();
          /* Includes a row if the group name or description contains the keyword. */
          return (
            group.group_name?.toLowerCase().includes(keyword) ||
            group.description?.toLowerCase().includes(keyword)
          );
        });


  // ── Render ───────────────────────────────────────────────────────────

  /*
    While page permissions are still loading, render a centered loading spinner.
    This prevents the screen from flashing restricted content before permission checks finish.
  */
  if (isLoadingPermissions) {
    return (
      /* Full-height flex container centers the spinner vertically and horizontally. */
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        {/* Spinner tells the user permission data is still loading. */}
        <Spinner size="medium" label="Loading..." />
      </div>
    );
  };


  /* Redirects users without read permission to the forbidden page. */
  if (!isLoadingPermissions && !canRead) {
    /* Uses browser navigation because this is a client component. */
    window.location.href = "/forbidden";
  }


  /* Renders the full groups tab UI once permissions are loaded. */
  return (
    /* Root wrapper for the entire groups tab. */
    <div>
      {/* Main styled content container for section header, search, and data grid. */}
      <div className={styles.container}>
        {/* 
          Render the Azure AD import status banner only when:
          - a status other than "idle" exists, and
          - a status message is available to display
        */}
        {importStatus !== "idle" && importJobMessage && (
          <MessageBar
            /*
              Controls the visual styling of the MessageBar.
              - success → green success banner
              - error   → red error banner
              - info    → blue informational banner (used while import is running)
            */
            intent={
              importStatus === "success"
                ? "success"
                : importStatus === "error"
                ? "error"
                : "info"
            }
          >
            {/* Container for the MessageBar content. */}
            <MessageBarBody>

              {/* 
                Title shown at the top of the banner.
                Gives context about which background operation the message belongs to.
              */}
              <MessageBarTitle>
                Azure AD Import
              </MessageBarTitle>

              {/* 
                Displays the latest import status received from the backend.
                Examples:
                - "Azure AD group import queued."
                - "Fetching groups from Azure AD..."
                - "Merged 2,500 of 68,000 groups."
                - "Import completed successfully."
              */}
              <Text
                /* Makes the status message slightly more prominent. */
                weight="semibold"
                /* Uses a subtle foreground color to reduce visual noise. */
                className="text-neutral-foreground-2"
              >
                {/* Dynamic import progress/status text. */}
                {importJobMessage}
              </Text>

            </MessageBarBody>
          </MessageBar>
        )}

        {/* Header/search vertical stack above the grid. */}
        <div className="w-full flex flex-col gap-2 mt-4">
          {/* Horizontal row containing the section title and Add Group button. */}
          <div className="flex items-center justify-between">
            {/* Left side section title block. */}
            <div className={styles.sectionTitle}>
              {/* Visual icon for the Dashboard Groups section. */}
              <PeopleTeamRegular />
              {/* Main section title text. */}
              <Text size={400} weight="semibold">
                Dashboard Groups
              </Text>
              {/* Help tooltip explains the table and available row actions. */}
              <Help info="This table displays all groups registered in the RBAC system. Each group record includes its name, description, created by, active status, and creation date. Use the search box to filter. Click the 3-dot menu per row to Edit, Manage Scope (L1 BU access for the group), Manage Permissions, or Delete the group. Click Add Group to register a new group." />
            </div>

            <div className="flex items-center gap-4">
              {/* 
                Render the "Import AD Groups" button only if the user has permission 
                to import Azure AD groups (write access for import functionality).
              */}
              {canImportAzureADGroups && (
                <Button
                  appearance="primary"
                  // Show a loading spinner icon while importing, otherwise show the sync icon
                  icon={isImporting ? <Spinner size="tiny" /> : <ArrowSyncRegular />}
                  // Disable the button while the import operation is in progress
                  disabled={isImporting}
                  // Trigger the import handler when the button is clicked
                  onClick={handleImportADGroups}
                >
                  {/*
                    Display dynamic button text:
                    - "Importing..." while the operation is in progress
                    - "Import AD Groups" when idle
                  */}
                  {isImporting ? "Importing..." : "Import AD Groups"}
                </Button>
              )}

              {/* 
                Render the "Add Group" button only if the user has general write access 
                (permission to create new groups manually).
              */}
              {canWrite && (
                <Button 
                  appearance="primary" 
                  // Display a plus/add icon for visual indication
                  icon={<AddRegular />}
                  // Open the "Add Group" dialog when clicked
                  onClick={handleOpenAddGroupDialog}
                >
                  {/* Button label */}
                  Add Group
                </Button>
              )}
            </div>
          </div>


          <SearchBox
            /* Placeholder text explains what fields can be searched. */
            placeholder="Filter by group name or description..."
            /* Controlled value bound to component state. */
            value={groupSearchQuery}
            /* Updates search state whenever the search input changes. */
            onChange={(_, data) => setGroupSearchQuery(data.value ?? "")}
            /* Fixed width for a compact search input layout. */
            className="w-[20rem]"
          />
        </div>

        {/* Data grid displays filtered group data and row actions. */}
        <DataGrid
          /* Supplies column definitions, including actions when permitted. */
          columns={groupColumnsWithActions}
          /* Supplies filtered row data. */
          data={filteredGroupsData}
          /* Shows grid-level loading state while groups are being fetched. */
          loading={isFetchingGroups}
        />
      </div>

      {/* Dialog component used to manage roles/permissions for the selected group. */}
      <ManageRolesInGroup
        /* Passes the currently selected permissions group into the dialog. */
        permissionsGroup={permissionsGroup}
        /* Passes setter so child can update/clear the selected group if needed. */
        setPermissionsGroup={setPermissionsGroup}
        /* Passes setter so child can open/close the dialog. */
        setIsPermissionsDialogOpen={setIsPermissionsDialogOpen}
        /* Controlled visibility state for the permissions dialog. */
        isPermissionsDialogOpen={isPermissionsDialogOpen}
      />

      {/* Delete confirmation dialog for permanently removing a group. */}
      <Dialog
        /* Controlled open state for the delete dialog. */
        open={isDeleteGroupDialogOpen}
        /* Handles close attempts such as Escape key or dialog dismiss. */
        onOpenChange={(_, data) => {
          /* Allows closing only when deletion is not currently running. */
          if (!data.open && !isDeletingGroup) {
            /* Closes the dialog. */
            setIsDeleteGroupDialogOpen(false);
            /* Clears the currently targeted group. */
            setGroupToDelete(null);
            /* Clears any prior delete error message. */
            setDeleteGroupError(null);
          }
        }}
      >
        {/* Dialog surface defines the visible modal shell. */}
        <DialogSurface>
          {/* Dialog body wraps title, content, and footer actions. */}
          <DialogBody>
            {/* Title communicates the destructive nature of the operation. */}
            <DialogTitle>Delete Group</DialogTitle>

            {/* Main confirmation content area. */}
            <DialogContent>
              {/* Confirmation sentence with highlighted group name. */}
              <Text className={styles.deleteConfirmText}>
                {/* Introductory part of the confirmation sentence. */}
                Are you sure you want to delete the group{" "}
                {/* Highlights the specific group name being deleted. */}
                <span className={styles.deleteGroupName}>
                  {/* Safely shows the selected group's name if available. */}
                  {groupToDelete?.group_name}
                </span>
                {/* Warns the user that the action is irreversible. */}
                ? This action cannot be undone.
              </Text>

              {/* Displays an inline error message if deletion fails. */}
              {deleteGroupError && (
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {deleteGroupError}
                </Text>
              )}
            </DialogContent>

            {/* Footer action buttons for cancel and confirm delete. */}
            <DialogActions>
              {/* Cancel button closes the dialog with no destructive action. */}
              <Button
                /* Secondary styling keeps cancel visually less prominent. */
                appearance="secondary"
                /* Prevents interaction while delete is already running. */
                disabled={isDeletingGroup}
                /* Clears dialog state when cancel is clicked. */
                onClick={() => {
                  /* Closes the delete confirmation dialog. */
                  setIsDeleteGroupDialogOpen(false);
                  /* Clears selected delete target. */
                  setGroupToDelete(null);
                  /* Clears any delete error shown in the dialog. */
                  setDeleteGroupError(null);
                }}
              >
                {/* Visible label for the cancel button. */}
                Cancel
              </Button>

              {/* Confirmation button executes the actual delete request. */}
              <Button
                /* Primary styling keeps this as the main dialog action. */
                appearance="primary"
                /* Inline red background visually reinforces destructive action. */
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }}
                /* Triggers the delete confirmation handler. */
                onClick={handleConfirmDeleteGroup}
                /* Prevents double-click deletes while request is in progress. */
                disabled={isDeletingGroup}
                /* Shows a spinner icon while deletion is ongoing. */
                icon={isDeletingGroup ? <Spinner size="tiny" /> : undefined}
              >
                {/* Button text changes to reflect loading state. */}
                {isDeletingGroup ? "Deleting..." : "Yes"}
              </Button>
            </DialogActions>


          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Add Group dialog for creating a new group record. */}
      <Dialog
        /* Controlled open state for Add Group dialog. */
        open={isAddGroupDialogOpen}
        /* Updates open state when Fluent dialog requests a visibility change. */
        onOpenChange={(_, data) => setIsAddGroupDialogOpen(data.open)}
      >
        {/* Visible modal shell for the add dialog. */}
        <DialogSurface>
          {/* Structural body wrapper for add dialog contents. */}
          <DialogBody>
            {/* Title displayed at the top of the add dialog. */}
            <DialogTitle>Add New Group</DialogTitle>

            {/* Main content area containing form fields. */}
            <DialogContent>
              {/* Wrapper for group name field. */}
              <div className={styles.formField}>
                {/* Group Name field is required for submission. */}
                <Field label="Group Name" required>
                  {/* Controlled text input bound to groupFormData.group_name. */}
                  <Input
                    /* Example placeholder demonstrating expected naming style. */
                    placeholder="Enter group name (e.g. grp-us-finance-viewers)"
                    /* Controlled current value for group name. */
                    value={groupFormData.group_name}
                    /* Updates group_name field in form state when user types. */
                    onChange={(inputEvent) => handleGroupFormChange("group_name", inputEvent.target.value)}
                  />
                </Field>
              </div>

              {/* Wrapper for description field. */}
              <div className={styles.formField}>
                {/* Description field is optional and includes hint text. */}
                <Field label="Description" hint="Optional — describe the purpose of this group">
                  {/* Controlled textarea bound to description field. */}
                  <Textarea
                    /* Placeholder prompting the user to enter description text. */
                    placeholder="Enter a description for this group"
                    /* Controlled current value, safely defaulting to empty string. */
                    value={groupFormData.description ?? ""}
                    /* Updates description field in form state when user types. */
                    onChange={(inputEvent) => handleGroupFormChange("description", inputEvent.target.value)}
                    /* Renders a compact three-row textarea. */
                    rows={3}
                  />
                </Field>
              </div>

              {/* Wrapper for active/inactive switch field. */}
              <div className={styles.formField}>
                {/* Field label for the boolean status toggle. */}
                <Field label="Active Status">
                  {/* Controlled switch bound to is_active field. */}
                  <Switch
                    /* Current checked state derived from form data. */
                    checked={groupFormData.is_active}
                    /* Updates boolean active flag when toggled. */
                    onChange={(inputEvent) => handleGroupFormChange("is_active", inputEvent.target.checked)}
                    /* Dynamic label mirrors the current boolean state. */
                    label={groupFormData.is_active ? "Active" : "Inactive"}
                  />
                </Field>
              </div>

              {/* Displays add-group submission error if the request fails. */}
              {submitError && (
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {submitError}
                </Text>
              )}
            </DialogContent>

            {/* Footer action buttons for Add Group dialog. */}
            <DialogActions>
              {/* Wraps the cancel button as a dialog trigger helper. */}
              <DialogTrigger disableButtonEnhancement>
                {/* Cancel closes the dialog and clears any inline submit error. */}
                <Button
                  appearance="secondary"
                  onClick={() => {
                    setIsAddGroupDialogOpen(false);
                    setSubmitError(null);
                  }}
                >
                  Cancel
                </Button>
              </DialogTrigger>

              {/* Add Group button submits the create request. */}
              <Button
                /* Primary styling emphasizes create action. */
                appearance="primary"
                /* Triggers add handler. */
                onClick={handleAddGroup}
                /* Disabled while submitting or when required group name is blank. */
                disabled={isSubmitting || !groupFormData.group_name}
                /* Shows spinner while request is in progress. */
                icon={isSubmitting ? <Spinner size="tiny" /> : undefined}
              >
                {/* Dynamic button text reflects submission state. */}
                {isSubmitting ? "Adding..." : "Add Group"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Dialog component used to manage L1 Business Unit scope for the selected group. */}
      <ManageScopeDialog
        /* Controlled open state for scope dialog. */
        isScopeDialogOpen={isScopeDialogOpen}
        /* Setter used by child to open/close scope dialog. */
        setIsScopeDialogOpen={setIsScopeDialogOpen}
        /* Currently selected group for scope management. */
        scopeGroup={scopeGroup}
        /* Setter used by child to update/clear the selected scope group. */
        setScopeGroup={setScopeGroup}
      />

      {/* Edit Group dialog for updating an existing group record. */}
      <Dialog
        /* Controlled open state for Edit Group dialog. */
        open={isEditGroupDialogOpen}
        /* Updates dialog visibility based on Fluent UI close/open events. */
        onOpenChange={(_, data) => setIsEditGroupDialogOpen(data.open)}
      >
        {/* Visual shell of the edit dialog. */}
        <DialogSurface>
          {/* Structural body wrapper of the edit dialog. */}
          <DialogBody>
            {/* Title includes the selected group's name for clarity. */}
            <DialogTitle>Edit Group — {selectedGroup?.group_name}</DialogTitle>

            {/* Main edit form content area. */}
            <DialogContent>
              {/* Wrapper for editable group name field. */}
              <div className={styles.formField}>
                {/* Group Name remains required during edit. */}
                <Field label="Group Name" required>
                  {/* Controlled input tied to editable group name. */}
                  <Input
                    /* Placeholder shown when field is empty. */
                    placeholder="Enter group name"
                    /* Controlled value tied to form state. */
                    value={groupFormData.group_name}
                    /* Updates group_name in form state on input. */
                    onChange={(inputEvent) => handleGroupFormChange("group_name", inputEvent.target.value)}
                  />
                </Field>
              </div>

              {/* Wrapper for editable description field. */}
              <div className={styles.formField}>
                {/* Description remains optional during edit. */}
                <Field label="Description" hint="Optional — describe the purpose of this group">
                  {/* Controlled textarea tied to description in form state. */}
                  <Textarea
                    /* Placeholder shown when description is empty. */
                    placeholder="Enter a description for this group"
                    /* Controlled description value. */
                    value={groupFormData.description ?? ""}
                    /* Updates description value on change. */
                    onChange={(inputEvent) => handleGroupFormChange("description", inputEvent.target.value)}
                    /* Keeps textarea at compact three-row height. */
                    rows={3}
                  />
                </Field>
              </div>

              {/* Wrapper for editable active-status switch. */}
              <div className={styles.formField}>
                {/* Label for active/inactive switch. */}
                <Field label="Active Status">
                  {/* Controlled switch tied to active flag in form state. */}
                  <Switch
                    /* Current active value. */
                    checked={groupFormData.is_active}
                    /* Updates active boolean in form state on toggle. */
                    onChange={(inputEvent) => handleGroupFormChange("is_active", inputEvent.target.checked)}
                    /* Dynamic switch label mirrors current active value. */
                    label={groupFormData.is_active ? "Active" : "Inactive"}
                  />
                </Field>
              </div>

              {/* Displays inline update error if save fails. */}
              {submitError && (
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {submitError}
                </Text>
              )}
            </DialogContent>

            {/* Footer actions for edit dialog. */}
            <DialogActions>
              {/* Cancel helper wrapper for dialog action button. */}
              <DialogTrigger disableButtonEnhancement>
                {/* Cancel closes edit dialog and clears selected/edit error state. */}
                <Button
                  appearance="secondary"
                  onClick={() => {
                    setIsEditGroupDialogOpen(false);
                    setSelectedGroup(null);
                    setSubmitError(null);
                  }}
                >
                  Cancel
                </Button>
              </DialogTrigger>

              {/* Save Changes button submits the edit request. */}
              <Button
                /* Primary styling emphasizes save action. */
                appearance="primary"
                /* Triggers the update handler. */
                onClick={handleUpdateGroup}
                /* Disabled while submitting or when required group name is empty. */
                disabled={isSubmitting || !groupFormData.group_name}
                /* Shows spinner while save request is running. */
                icon={isSubmitting ? <Spinner size="tiny" /> : undefined}
              >
                {/* Dynamic text reflects whether save is currently running. */}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
