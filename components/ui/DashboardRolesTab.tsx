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
  - Edit Role dialog allows editing role name, description, and active status for custom roles.
  - Manage Permissions dialog allows adding or removing permissions assigned to the role.
  - Delete Role option opens a confirmation dialog; confirming calls the delete API immediately.
  - Actions column uses a 3-dot overflow menu for custom roles: Edit Role, Manage Permissions, Delete Role.
  - System roles show a disabled button with an explanatory tooltip.
  - Supports search filtering within the tab independently.
*/


// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------


/* Imports Fluent UI styling utilities, feedback controls, forms, overlays, menus, and layout primitives used throughout the Roles tab. */
import {
  /* Creates scoped CSS-in-JS styles for the component. */
  makeStyles,
  /* Fluent UI design tokens used for spacing, color, radius, and typography. */
  tokens,
  /* Loading indicator used during page, form, and delete operations. */
  Spinner,
  /* Search input used to filter roles in the table. */
  SearchBox,
  /* Compact visual label used for type/status badges. */
  Badge,
  /* Reusable button component for actions like Add, Save, Cancel, etc. */
  Button,
  /* Root dialog component used for modal windows. */
  Dialog,
  /* Optional helper that enhances buttons as dialog triggers. */
  DialogTrigger,
  /* Surface wrapper for the dialog visual shell. */
  DialogSurface,
  /* Dialog title/header content. */
  DialogTitle,
  /* Container for title, content, and actions. */
  DialogBody,
  /* Footer area containing dialog buttons. */
  DialogActions,
  /* Main content area inside a dialog. */
  DialogContent,
  /* Field wrapper that provides label, required state, and hint. */
  Field,
  /* Single-line text input component. */
  Input,
  /* General-purpose text rendering component. */
  Text,
  /* Tooltip for hints on hover/focus. */
  Tooltip,
  /* Toggle switch for active/inactive state fields. */
  Switch,
  /* Multi-line input for descriptions. */
  Textarea,
  /* Checkbox used in the permissions multi-select list. */
  Checkbox,
  /* Overlay container used for custom dropdown-like permission picker. */
  Popover,
  /* Trigger wrapper for opening the popover. */
  PopoverTrigger,
  /* Surface that renders the popover content. */
  PopoverSurface,
  /* Divider component imported for possible section separation. */
  Divider,
  /* Root overflow/menu component for row actions. */
  Menu,
  /* Individual action inside the overflow menu. */
  MenuItem,
  /* Container holding the menu items. */
  MenuList,
  /* Positioned menu popup wrapper. */
  MenuPopover,
  /* Trigger wrapper for opening the row actions menu. */
  MenuTrigger,
} from "@fluentui/react-components";


/* Imports Fluent UI icons used in headers, buttons, tags, and action menus. */
import {
  /* Pencil/edit icon for the Edit Role action. */
  EditRegular,
  /* Shield/role icon shown in the Roles section title. */
  ShieldKeyholeRegular,
  /* Add/plus icon shown on the Add Role button. */
  AddRegular,
  /* Dismiss/close icon used on selected permission tags. */
  DismissRegular,
  /* Chevron icon used in the permissions popover trigger. */
  ChevronDownRegular,
  /* Vertical ellipsis icon used for row overflow actions. */
  MoreVerticalRegular,
  /* Key icon used for Manage Permissions action. */
  KeyRegular,
  /* Trash/delete icon used for Delete Role action. */
  DeleteRegular,
} from "@fluentui/react-icons";


/* Imports reusable help/info component displayed beside the section title. */
import { Help } from "@/components/ui/Help";

/* Imports React hooks used for local state management and memoized derived values. */
import { useState, useMemo } from "react";

/* Imports reusable grid component and matching column type used to render the roles table. */
import { DataGrid, ColumnConfig } from "@/components/ui/DataGrid";

/* Imports helper used to format timestamps for display in the table. */
import { formatDateTime } from "@/lib/helper";

/* Imports local types representing role records and role form payload structure. */
import { DashboardRole, RoleFormPayload } from "@/types/api";

/* Imports service layer functions used for role CRUD and role-permission assignment. */
import { rolesManagementService } from "@/lib/services/rolesManagementService";

/* Imports role and permission fetching hooks used by this tab. */
import {
  /* Fetches dashboard roles. */
  useGetDashboardRoles,
  /* Fetches dashboard permissions. */
  useGetDashboardPermissions,
  /* Imported but not used directly in this file; likely kept for nearby dialog or future use. */
  useGetRolePermissions,
} from "@/hooks/useRolesManagement";

/* Imports the dedicated dialog component that manages permissions assigned to a role. */
import { ManagePermissionsInRoleDialog } from "./ManagePermissionsInRoleDialog";

/* Imports global toast helper used to show success feedback. */
import { useGlobalToast } from "@/hooks/useToast";

/* Imports permission helper used to determine what the current user can read/write/manage. */
import { usePagePermissions } from "@/hooks/hasPagePermissions";


// ---------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------


/* Defines the local shape of a dashboard permission record used by this tab. */
type DashboardPermission = {
  /* Unique identifier of the permission. */
  permission_id: string;

  /* Machine-readable permission key such as module.action. */
  permission_key: string;

  /* Permission grouping/category value. */
  category: string;

  /* Optional human-readable description. */
  description?: string;

  /* Whether the permission is currently active and assignable. */
  is_active: boolean;
};


// ---------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------


/* Defines the default blank form object used when opening or resetting role forms. */
const EMPTY_ROLE_FORM: RoleFormPayload = {
  /* Default role name starts empty. */
  role_name: "",
  /* Default description starts blank because it is optional. */
  description: "",
  /* New roles default to active unless changed by the user. */
  is_active: true,
};


// ---------------------------------------------------------------------
// STYLING CONFIGURATION
// ---------------------------------------------------------------------


/* Creates component-scoped styles used across the Roles tab, dialogs, tags, and popovers. */
const useStyles = makeStyles({
  /* Styles the section title row in the header. */
  sectionTitle: {
    /* Aligns icon, heading text, and help icon in a row. */
    display: "flex",
    /* Vertically centers header content. */
    alignItems: "center",
    /* Adds spacing between the icon, title, and help component. */
    gap: tokens.spacingHorizontalS,
    /* Gives the title group semibold emphasis. */
    fontWeight: tokens.fontWeightSemibold,
  },

  /* Styles the main tab content container. */
  container: {
    /* Adds bottom spacing so content does not feel cramped. */
    paddingBottom: tokens.spacingVerticalXL,
  },

  /* Styles individual form field wrappers in dialogs. */
  formField: {
    /* Uses flex layout for inner field content. */
    display: "flex",
    /* Stacks label and input vertically. */
    flexDirection: "column",
    /* Adds a small gap inside each field block. */
    gap: tokens.spacingVerticalXS,
    /* Adds space below each field group. */
    marginBottom: tokens.spacingVerticalM,
  },

  /* Styles the custom popover trigger that behaves like a multi-select input. */
  permissionsTrigger: {
    /* Lays out selected tags and chevron horizontally. */
    display: "flex",
    /* Vertically centers content inside the trigger. */
    alignItems: "center",
    /* Pushes tags to the left and chevron to the right. */
    justifyContent: "space-between",
    /* Ensures the trigger keeps a minimum clickable height. */
    minHeight: "32px",
    /* Adds internal spacing around the trigger content. */
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    /* Draws a standard neutral border around the trigger. */
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    /* Applies medium radius for consistent form styling. */
    borderRadius: tokens.borderRadiusMedium,
    /* Uses the default neutral surface background. */
    backgroundColor: tokens.colorNeutralBackground1,
    /* Shows a pointer cursor to indicate clickability. */
    cursor: "pointer",
    /* Allows selected tags to wrap to multiple lines. */
    flexWrap: "wrap",
    /* Adds spacing between wrapped elements. */
    gap: tokens.spacingHorizontalXS,
    /* Makes the trigger fill the available field width. */
    width: "100%",
  },

  /* Styles each selected permission tag shown inside the trigger. */
  permissionTag: {
    /* Renders each tag as inline-flex for text and dismiss icon alignment. */
    display: "inline-flex",
    /* Centers tag content vertically. */
    alignItems: "center",
    /* Adds tight spacing between tag text and dismiss icon. */
    gap: "2px",
    /* Uses a subtle brand-colored background. */
    backgroundColor: tokens.colorBrandBackground2,
    /* Uses brand foreground text color. */
    color: tokens.colorBrandForeground1,
    /* Applies small border radius to the tag. */
    borderRadius: tokens.borderRadiusSmall,
    /* Adds compact inner spacing. */
    padding: `2px ${tokens.spacingHorizontalXS}`,
    /* Uses a compact base font size. */
    fontSize: tokens.fontSizeBase200,
    /* Uses regular font weight to keep the tag readable but not heavy. */
    fontWeight: tokens.fontWeightRegular,
    /* Sets line-height for compact vertical balance. */
    lineHeight: "1.4",
  },

  /* Styles the small dismiss button inside each permission tag. */
  permissionTagDismiss: {
    /* Aligns dismiss icon cleanly inside the button. */
    display: "inline-flex",
    /* Vertically centers the dismiss icon. */
    alignItems: "center",
    /* Horizontally centers the dismiss icon. */
    justifyContent: "center",
    /* Removes default button background. */
    background: "none",
    /* Removes default button border. */
    border: "none",
    /* Removes default button padding for compact layout. */
    padding: "0",
    /* Shows pointer cursor to indicate removability. */
    cursor: "pointer",
    /* Uses a softer brand foreground by default. */
    color: tokens.colorBrandForeground2,

    /* Intensifies color on hover for clear affordance. */
    ":hover": {
      color: tokens.colorBrandForeground1,
    },
  },

  /* Styles the popover panel that contains searchable permissions and checkboxes. */
  permissionsPopoverSurface: {
    /* Sets a fixed comfortable width for the permission picker. */
    width: "380px",
    /* Caps height so the list scrolls instead of growing too tall. */
    maxHeight: "280px",
    /* Enables vertical scrolling when many permissions are present. */
    overflowY: "auto",
    /* Adds internal spacing around the popover content. */
    padding: tokens.spacingVerticalS,
  },

  /* Styles the search box wrapper inside the permissions popover. */
  permissionSearchBox: {
    /* Adds space below the search field before the checkbox list starts. */
    marginBottom: tokens.spacingVerticalXS,
    /* Makes the search field span the available width. */
    width: "100%",
  },

  /* Styles each permission option row that wraps a checkbox and category meta text. */
  permissionCheckboxRow: {
    /* Uses flex layout to stack checkbox and metadata. */
    display: "flex",
    /* Places label and metadata vertically. */
    flexDirection: "column",
    /* Uses standard neutral text color. */
    color: tokens.colorNeutralForeground1,
    /* Adds inner spacing so rows are easier to click. */
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalXS}`,
    /* Rounds each option row slightly. */
    borderRadius: tokens.borderRadiusMedium,
    /* Shows pointer cursor because the whole row is clickable. */
    cursor: "pointer",

    /* Adds hover background feedback when the user points at a row. */
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },

  /* Styles the metadata line under each permission checkbox label. */
  permissionCheckboxMeta: {
    /* Uses smaller text for secondary information like category. */
    fontSize: tokens.fontSizeBase100,
    /* Uses neutral foreground color for metadata. */
    color: tokens.colorNeutralForeground1,
    /* Indents metadata so it visually aligns under the checkbox label text. */
    paddingLeft: "28px",
  },

  /* Styles the placeholder text shown when no permissions are selected. */
  noPermissionsPlaceholder: {
    /* Uses neutral text color for placeholder. */
    color: tokens.colorNeutralForeground1,
    /* Uses compact readable text size. */
    fontSize: tokens.fontSizeBase200,
  },

  /* Styles a row representing an assigned permission, reused by supporting UI if needed. */
  assignedPermissionRow: {
    /* Aligns row content horizontally. */
    display: "flex",
    /* Centers content vertically. */
    alignItems: "center",
    /* Pushes left and right content apart. */
    justifyContent: "space-between",
    /* Adds internal spacing. */
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalXS}`,
    /* Applies medium rounding to the row container. */
    borderRadius: tokens.borderRadiusMedium,
    /* Uses a slightly offset neutral background. */
    backgroundColor: tokens.colorNeutralBackground3,
    /* Adds spacing below each assigned-permission row. */
    marginBottom: tokens.spacingVerticalXS,
  },

  /* Styles the delete confirmation message text. */
  deleteConfirmText: {
    /* Ensures the text behaves as a block element. */
    display: "block",
    /* Adds spacing below the message. */
    marginBottom: tokens.spacingVerticalM,
    /* Uses a softer neutral foreground color for the paragraph. */
    color: tokens.colorNeutralForeground2,
  },

  /* Styles the role name highlighted inside the delete confirmation message. */
  deleteRoleName: {
    /* Makes the role name stand out with bold weight. */
    fontWeight: tokens.fontWeightBold,
    /* Uses neutral foreground color for consistency with the surrounding message. */
    color: tokens.colorNeutralForeground2,
  },
});


// ---------------------------------------------------------------------
// COMPONENT DEFINITION
// ---------------------------------------------------------------------


/* Declares and exports the Roles tab component used inside the Roles Management Dashboard. */
export const DashboardRolesTab = () => {
  /* Retrieves generated class names from the local style hook. */
  const styles = useStyles();

  /* Retrieves the global toast function used for success notifications. */
  const { showToast } = useGlobalToast();


  /* Resolves page-level read/write permission flags and permission-check helper for this tab. */
  const { canRead, canWrite, hasPermission, isLoadingPermissions } = usePagePermissions("roles-management-roles");

  /* Determines whether the current user can access permission-management functionality. */
  const canViewPermissionsTab = hasPermission("roles-management-manage-permissions:read");


  /* Tracks whether any submit-style operation is currently in progress. */
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  /* Stores an inline error message for add/edit operations when a request fails. */
  const [submitError, setSubmitError] = useState<string | null>(null);


  // =======================================================================
  // ROLES TABLE STATE
  // =======================================================================


  /* Stores the current search value used to filter the roles table locally. */
  const [roleSearchQuery, setRoleSearchQuery] = useState<string>("");


  // =======================================================================
  // ADD ROLE DIALOG STATE
  // =======================================================================


  /* Controls whether the Add Role dialog is open. */
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState<boolean>(false);

  /* Stores the form data entered in the Add Role dialog. */
  const [roleFormData, setRoleFormData] = useState<RoleFormPayload>(EMPTY_ROLE_FORM);

  /* Stores the IDs of permissions selected for the new role. */
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);

  /* Stores the search string used inside the permissions dropdown. */
  const [permissionDropdownSearch, setPermissionDropdownSearch] = useState<string>("");

  /* Controls whether the permissions popover inside Add Role is open. */
  const [isPermissionsPopoverOpen, setIsPermissionsPopoverOpen] = useState<boolean>(false);


  // =======================================================================
  // EDIT ROLE DIALOG STATE (role name / description / active status)
  // =======================================================================


  /* Tracks whether the Edit Role dialog is currently open. */
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState<boolean>(false);


  /* Stores the role currently selected for editing. */
  const [roleToEdit, setRoleToEdit] = useState<DashboardRole | null>(null);


  /* Stores the editable form data shown inside the Edit Role dialog. */
  const [editRoleFormData, setEditRoleFormData] = useState<RoleFormPayload>(EMPTY_ROLE_FORM);


  // =======================================================================
  // MANAGE PERMISSIONS DIALOG STATE
  // =======================================================================


  /* Controls whether the Manage Permissions dialog is open. */
  const [isEditRolePermissionsDialogOpen, setIsEditRolePermissionsDialogOpen] = useState<boolean>(false);

  /* Stores the role currently selected for permission management. */
  const [selectedRole, setSelectedRole] = useState<DashboardRole | null>(null);

  // =======================================================================
  // DELETE ROLE DIALOG STATE
  // =======================================================================


  /* Tracks whether the delete confirmation dialog is currently open. */
  const [isDeleteRoleDialogOpen, setIsDeleteRoleDialogOpen] = useState<boolean>(false);


  /* Stores the role currently targeted for deletion. */
  const [roleToDelete, setRoleToDelete] = useState<DashboardRole | null>(null);


  /* Tracks whether the delete API request is currently in progress. */
  const [isDeletingRole, setIsDeletingRole] = useState<boolean>(false);


  /* Stores any error message that occurs during delete operation. */
  const [deleteRoleError, setDeleteRoleError] = useState<string | null>(null);


  // =======================================================================
  // DATA FETCHING
  // =======================================================================


  /* Fetches dashboard roles based on the current user's read access and exposes refetch/loading helpers. */
  const { dashboardRoles, refetch, isFetchingRoles } = useGetDashboardRoles(canRead);

  /* Fetches dashboard permissions only when the user can view the permissions tab. */
  const { dashboardPermissions, isFetchingPermissions } = useGetDashboardPermissions(canViewPermissionsTab);


  // =======================================================================
  // DERIVED / COMPUTED VALUES
  // =======================================================================


  /* Memoizes the list of active permissions so inactive ones are excluded from assignment UI. */
  const activePermissions: DashboardPermission[] = useMemo(
    /* Filters the fetched permissions down to only active entries. */
    () => (dashboardPermissions ?? []).filter((permission: DashboardPermission) => permission.is_active),

    /* Recompute activePermissions only when the source permissions change. */
    [dashboardPermissions]
  );


  /* Memoizes the permission list filtered by the popover search text. */
  const filteredDropdownPermissions: DashboardPermission[] = useMemo(() => {
    /* Normalizes the search query for case-insensitive matching. */
    const keyword = permissionDropdownSearch.trim().toLowerCase();

    /* If no search term is entered, return all active permissions. */
    if (!keyword) return activePermissions;

    /* Otherwise return permissions whose key or category matches the keyword. */
    return activePermissions.filter(
      (permission: DashboardPermission) =>
        permission.permission_key.toLowerCase().includes(keyword) ||
        permission.category.toLowerCase().includes(keyword)
    );
  }, [activePermissions, permissionDropdownSearch]);


  // =======================================================================
  // COLUMN DEFINITIONS
  // =======================================================================


  /* Defines the base columns shown in the roles table. */
  const roleColumns: ColumnConfig<any>[] = [
    {
      /* Binds this column to the role_name field. */
      key: "role_name",
      /* Header label shown for the role name column. */
      label: "Role Name",
      /* Width allocated to this column. */
      width: "15%",
      /* Allows expanded display for long values if supported by DataGrid. */
      showMore: true,
      /* Enables sorting by role name. */
      sortable: true,
    },
    {
      /* Binds this column to the description field. */
      key: "description",
      /* Header label shown for description. */
      label: "Description",
      /* Width allocated to description. */
      width: "25%",
      /* Allows expanded display for long descriptions. */
      showMore: true,
      /* Sorting is disabled for description. */
      sortable: false,
    },
    {
      /* Binds this column to the is_system flag. */
      key: "is_system",
      /* Header label shown for role type. */
      label: "Type",
      /* Width allocated to the type column. */
      width: "6%",
      /* Enables sorting by role type. */
      sortable: true,
      /* Renders System/Custom as an outline badge with color coding. */
      render: (value) => (
        <Badge
          appearance="outline"
          color={value ? "warning" : "brand"}
        >
          {value ? "System" : "Custom"}
        </Badge>
      ),
    },
    {
      /* Binds this column to the created_by field. */
      key: "created_by",
      /* Header label shown for creator. */
      label: "Created By",
      /* Width allocated to creator column. */
      width: "14%",
      /* Allows long creator values to expand if needed. */
      showMore: true,
      /* Enables sorting by creator. */
      sortable: true,
    },
    {
      /* Binds this column to the active-status flag. */
      key: "is_active",
      /* Header label shown for status. */
      label: "Status",
      /* Width allocated to status column. */
      width: "6%",
      /* Enables sorting by active/inactive. */
      sortable: true,
      /* Renders Active/Inactive as a filled badge with semantic coloring. */
      render: (value) => (
        <Badge
          appearance="filled"
          color={value ? "success" : "danger"}
        >
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      /* Binds this column to the created_at timestamp. */
      key: "created_at",
      /* Header label shown for the created date/time. */
      label: "Created At",
      /* Width allocated to the timestamp column. */
      width: "12%",
      /* Allows long formatted timestamps to expand if needed. */
      showMore: true,
      /* Enables sorting by created_at. */
      sortable: true,
      /* Formats the raw timestamp or falls back to a hyphen if missing. */
      getValue: (value) => (value ? formatDateTime(value) : "-"),
    },
  ];


  /* Adds an Actions column only when the user can edit roles or manage permissions. */
  const roleColumnsWithActions: ColumnConfig<any>[] = canViewPermissionsTab || canWrite
    ? [
        /* Includes all base role columns first. */
        ...roleColumns,
        {
          /* Unique key for the actions column. */
          key: "actions",
          /* Header label shown for actions. */
          label: "Actions",
          /* Width allocated to the actions column. */
          width: "5%",
          /* Renders either a disabled button for system roles or an overflow menu for custom roles. */
          render: (value, row) => {
            /* System roles are immutable, so show a disabled actions button with explanation. */
            if (row.is_system) {
              return (
                <Tooltip content="System roles cannot be edited" relationship="label">
                  <Button
                    /* Subtle button keeps visual weight low. */
                    appearance="subtle"
                    /* Uses the 3-dot vertical icon to imply additional actions. */
                    icon={<MoreVerticalRegular />}
                    /* Compact action button size. */
                    size="small"
                    /* Disabled because system roles are not editable. */
                    disabled
                    /* Accessible label for screen readers. */
                    aria-label="More actions"
                  />
                </Tooltip>
              );
            }

            /* Custom roles use a 3-dot overflow menu with role-specific actions. */
            return (
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <Tooltip content="More actions" relationship="label">
                    <Button
                      /* Subtle styling for row overflow actions. */
                      appearance="subtle"
                      /* Shows the vertical ellipsis icon. */
                      icon={<MoreVerticalRegular />}
                      /* Compact size to fit table rows. */
                      size="small"
                      /* Accessible label for the trigger button. */
                      aria-label="More actions"
                    />
                  </Tooltip>
                </MenuTrigger>

                <MenuPopover>
                  <MenuList>
                    {/* Edit Role menu item, shown only to users with write access. */}
                    {canWrite && (
                      <MenuItem
                        icon={<EditRegular />}
                        onClick={() => handleOpenEditRoleDialog(row)}
                      >
                        Edit Role
                      </MenuItem>
                    )}

                    {/* Manage Permissions menu item, shown only when permission-management access exists. */}
                    {canViewPermissionsTab && (
                      <MenuItem
                        icon={<KeyRegular />}
                        onClick={() => handleOpenManagePermissionsDialog(row)}
                      >
                        Manage Permissions
                      </MenuItem>
                    )}

                    {/* Delete Role menu item, shown only to users with write access. */}
                    {canWrite && (
                      <MenuItem
                        icon={<DeleteRegular />}
                        onClick={() => handleOpenDeleteRoleDialog(row)}
                      >
                        Delete Role
                      </MenuItem>
                    )}
                  </MenuList>
                </MenuPopover>
              </Menu>
            );
          },
        },
      ]
    : /* If the user has neither write nor permission-management access, show only the base columns. */
      roleColumns;


  // =======================================================================
  // HANDLER FUNCTIONS — ADD ROLE DIALOG
  // =======================================================================


  /* Opens the Add Role dialog and resets all related form and selection state. */
  const handleOpenAddRoleDialog = () => {
    /* Resets the add-role form to default blank values. */
    setRoleFormData(EMPTY_ROLE_FORM);

    /* Clears previously selected permissions. */
    setSelectedPermissionIds([]);

    /* Clears the permissions dropdown search string. */
    setPermissionDropdownSearch("");

    /* Ensures the permissions popover starts closed. */
    setIsPermissionsPopoverOpen(false);

    /* Clears any prior add/edit submit error. */
    setSubmitError(null);

    /* Opens the Add Role dialog. */
    setIsAddRoleDialogOpen(true);
  };


  /* Updates a single field inside the Add Role form state. */
  const handleRoleFormChange = (field: keyof RoleFormPayload, value: string | boolean) => {
    /* Merges the updated field into the existing role form state. */
    setRoleFormData((previousRoleFormData) => ({ ...previousRoleFormData, [field]: value }));
  };


  /* Adds or removes a permission ID from the selected permissions list. */
  const handleTogglePermission = (permissionId: string) => {
    /* Uses previous state to safely toggle membership in the selectedPermissionIds array. */
    setSelectedPermissionIds((previousSelectedPermissionIds) =>
      previousSelectedPermissionIds.includes(permissionId)
        ? previousSelectedPermissionIds.filter((selectedPermissionId) => selectedPermissionId !== permissionId)
        : [...previousSelectedPermissionIds, permissionId]
    );
  };


  /* Removes a selected permission tag without triggering the parent popover click behavior. */
  const handleRemovePermissionTag = (permissionId: string, clickEvent: React.MouseEvent) => {
    /* Prevents the tag-dismiss click from bubbling to the trigger container. */
    clickEvent.stopPropagation();

    /* Removes the specified permission ID from the selected list. */
    setSelectedPermissionIds((previousSelectedPermissionIds) =>
      previousSelectedPermissionIds.filter((selectedPermissionId) => selectedPermissionId !== permissionId)
    );
  };


  /* Creates a new role, then assigns any selected permissions to it if applicable. */
  const handleAddRole = async () => {
    /* Enables submit/loading state for the Add Role dialog. */
    setIsSubmitting(true);

    /* Clears any previous submit error. */
    setSubmitError(null);


    try {
      /* Calls the service to create the new role and expects a new role identifier in return. */
      const newRole = await rolesManagementService.addDashboardRole(roleFormData);

      /* Refreshes the roles table after successful role creation. */
      refetch();


      /* If permissions were selected and a new role ID was returned, assign each selected permission to the role. */
      if (selectedPermissionIds.length > 0 && newRole) {
        await Promise.all(
          selectedPermissionIds.map((selectedPermissionId: string) => {
            /* Calls the service to assign a permission to the new role. */
            const assignPermissionResponse = rolesManagementService.assignPermissionstoRole({
              /* Newly created role ID. */
              role_id: newRole,
              /* Permission being assigned to the role. */
              permission_id: selectedPermissionId,
            });
          })
        );
      }


      /* Closes the Add Role dialog after successful role creation and assignments. */
      setIsAddRoleDialogOpen(false);

      /* Resets the add-role form to default values. */
      setRoleFormData(EMPTY_ROLE_FORM);

      /* Clears selected permission tags after success. */
      setSelectedPermissionIds([]);
    } catch (error) {
      /* Shows an inline error if the add-role flow fails. */
      setSubmitError("Failed to add role. Please try again.");
    } finally {
      /* Clears submit/loading state regardless of success or failure. */
      setIsSubmitting(false);
    }
  };


  // =======================================================================
  // HANDLER FUNCTIONS — EDIT ROLE DIALOG
  // =======================================================================


  /**
   * handleOpenEditRoleDialog
   *
   * Opens the Edit Role dialog pre-populated with the selected role's current values.
   * Allows editing role name, description, and active status for custom roles.
   */
  /* Opens the Edit Role dialog and preloads it with the selected role's values. */
  const handleOpenEditRoleDialog = (role: DashboardRole) => {
    /* Stores the selected role for dialog title/context purposes. */
    setRoleToEdit(role);

    /* Copies the selected role fields into the editable form state. */
    setEditRoleFormData({
      /* Preserves the role identifier for the update API. */
      role_id: role.role_id,
      /* Copies current role name into the form. */
      role_name: role.role_name,
      /* Copies description or falls back to an empty string. */
      description: role.description ?? "",
      /* Copies current active/inactive state. */
      is_active: role.is_active,
    });

    /* Clears any prior submit error. */
    setSubmitError(null);

    /* Opens the Edit Role dialog. */
    setIsEditRoleDialogOpen(true);
  };


  /* Updates a single field inside the Edit Role form state. */
  const handleEditRoleFormChange = (field: keyof RoleFormPayload, value: string | boolean) => {
    /* Safely merges the changed field into the existing edit form data. */
    setEditRoleFormData((previousEditRoleFormData) => ({ ...previousEditRoleFormData, [field]: value }));
  };


  /**
   * handleUpdateRole
   *
   * Calls the update API with the edited role form data, then closes the dialog on success.
   */
  /* Sends the edited role data to the update API and refreshes the table on success. */
  const handleUpdateRole = async () => {
    /* Enables submit/loading state for the Edit Role dialog. */
    setIsSubmitting(true);

    /* Clears any previous submit error. */
    setSubmitError(null);

    try {
      /* Calls the service to update the role using the current edit form payload. */
      await rolesManagementService.updateDashboardRole(editRoleFormData).then((response) => {
        /* Refreshes the roles list after successful update. */
        refetch();

        /* Shows a success toast to the user. */
        showToast("Role Updated successfully.");

        /* Closes the Edit Role dialog. */
        setIsEditRoleDialogOpen(false);

        /* Clears the selected role reference after save completes. */
        setRoleToEdit(null);
      });
    } catch {
      /* Displays an inline error if the update request fails. */
      setSubmitError("Failed to update role. Please try again.");
    } finally {
      /* Clears submit/loading state after the request finishes. */
      setIsSubmitting(false);
    }
  };


  // =======================================================================
  // HANDLER FUNCTIONS — MANAGE PERMISSIONS DIALOG
  // =======================================================================


  /**
   * handleOpenManagePermissionsDialog
   *
   * Opens the ManagePermissionsInRoleDialog for the given role.
   */
  /* Opens the permission-management dialog for a selected role. */
  const handleOpenManagePermissionsDialog = (role: DashboardRole) => {
    /* Stores the selected role so the child dialog knows which role to manage. */
    setSelectedRole(role);

    /* Clears any prior submit error. */
    setSubmitError(null);

    /* Opens the Manage Permissions dialog. */
    setIsEditRolePermissionsDialogOpen(true);
  };


  // =======================================================================
  // HANDLER FUNCTIONS — DELETE ROLE DIALOG
  // =======================================================================


  /**
   * handleOpenDeleteRoleDialog
   *
   * Opens the delete confirmation dialog for the given role.
   */
  /* Opens the delete confirmation dialog for the selected role. */
  const handleOpenDeleteRoleDialog = (role: DashboardRole) => {
    /* Stores the role that the user intends to delete. */
    setRoleToDelete(role);

    /* Clears any prior delete error. */
    setDeleteRoleError(null);

    /* Opens the delete confirmation dialog. */
    setIsDeleteRoleDialogOpen(true);
  };


  /**
   * handleConfirmDeleteRole
   *
   * Called when the admin clicks "Yes" in the delete confirmation dialog.
   * Calls the delete API via rolesManagementService, then closes the dialog on success.
   */
  /* Deletes the selected role after the user confirms the destructive action. */
  const handleConfirmDeleteRole = async () => {
    /* If, for any reason, no role is selected, exit early. */
    if (!roleToDelete) return;


    /* Enables delete-specific loading state. */
    setIsDeletingRole(true);

    /* Clears any previous delete error. */
    setDeleteRoleError(null);


    try {
      /* Calls the service to remove the selected role by ID. */
      await rolesManagementService.removeDashboardRole(roleToDelete.role_id).then((response) => {
        /* Refreshes the roles list after deletion. */
        refetch();

        /* Shows a success toast after delete completes. */
        showToast("Role Deleted successfully.");

        /* Closes the delete dialog. */
        setIsDeleteRoleDialogOpen(false);

        /* Clears the role targeted for deletion. */
        setRoleToDelete(null);
      });
    } catch {
      /* Displays an inline error if the delete request fails. */
      setDeleteRoleError("Failed to delete role. Please try again.");
    } finally {
      /* Clears delete loading state after the request finishes. */
      setIsDeletingRole(false);
    }
  };


  // =======================================================================
  // FILTERED DATA DERIVATIONS
  // =======================================================================


  /* Filters the roles table locally using the current search query. */
  const filteredRolesData: DashboardRole[] =
    /* If search is blank after trimming, show all roles. */
    roleSearchQuery.trim() === ""
      ? dashboardRoles ?? []
      : /* Otherwise filter by role name or description. */
        (dashboardRoles ?? []).filter((role: DashboardRole) => {
          /* Normalizes the search query for case-insensitive matching. */
          const keyword = roleSearchQuery.toLowerCase();

          /* Includes a role when its name or description contains the search keyword. */
          return (
            role.role_name?.toLowerCase().includes(keyword) ||
            role.description?.toLowerCase().includes(keyword)
          );
        });


  // =======================================================================
  // RENDER HELPERS
  // =======================================================================


  /* Renders selected permission tags or a placeholder when none are selected. */
  const renderPermissionTags = (
    /* Array of selected permission IDs to render. */
    ids: string[],
    /* Callback invoked when a tag's dismiss button is clicked. */
    onRemove: (id: string, clickEvent: React.MouseEvent) => void,
    /* Placeholder text shown when no permissions are selected. */
    placeholderText: string
  ) => {
    /* If there are no selected IDs, show placeholder text instead of tags. */
    if (ids.length === 0) {
      return (
        <span className={styles.noPermissionsPlaceholder}>
          {placeholderText}
        </span>
      );
    }

    /* Otherwise render one removable tag per selected permission. */
    return ids.map((permissionId) => {
      /* Finds the full permission object for the current selected ID. */
      const matchedPermission = activePermissions.find((permission) => permission.permission_id === permissionId);

      /* If the permission is no longer present in activePermissions, render nothing for that ID. */
      if (!matchedPermission) return null;

      return (
        <span key={permissionId} className={styles.permissionTag}>
          {/* Shows the permission key inside the tag. */}
          {matchedPermission.permission_key}

          <button
            /* Applies compact dismiss-button styling. */
            className={styles.permissionTagDismiss}
            /* Removes the tag when clicked. */
            onClick={(clickEvent) => onRemove(permissionId, clickEvent)}
            /* Accessible label describing which permission will be removed. */
            aria-label={`Remove ${matchedPermission.permission_key}`}
          >
            {/* Small dismiss icon shown inside the tag button. */}
            <DismissRegular fontSize={10} />
          </button>
        </span>
      );
    });
  };


  // =======================================================================
  // RENDER
  // =======================================================================


  /* Shows a centered page-level loading state while permission access is still being resolved. */
  if (isLoadingPermissions) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Spinner size="medium" label="Loading..." />
      </div>
    );
  }


  /* Redirects the user to the forbidden page if read permission is not granted once loading finishes. */
  if (!isLoadingPermissions && !canRead) {
    window.location.href = "/forbidden";
  }


  /* Renders the full Roles tab UI, dialogs, and permission-management child dialog. */
  return (
    <div>
      {/* Main roles-tab content wrapper. */}
      <div className={styles.container}>

        {/* Header and search area stacked vertically. */}
        <div className="w-full flex flex-col gap-2 mt-4">
          {/* Header row containing section title and optional Add Role button. */}
          <div className="flex items-center justify-between">

            {/* Left-side section title group. */}
            <div className={styles.sectionTitle}>
              {/* Security/roles icon. */}
              <ShieldKeyholeRegular />
              {/* Section title text. */}
              <Text size={400} weight="semibold">Dashboard Roles</Text>
              {/* Help text explaining the purpose and behavior of the roles table. */}
              <Help info="This table displays all roles registered in the RBAC system. System roles (viewer, editor, rbac_admin, owner) are built-in and cannot be edited. Custom roles can be created and updated by admins. Each role record includes its name, description, type (System or Custom), active status, and creation date. Use the search box to filter by role name or description. Click Add Role to create a new custom role. Click the 3-dot menu per row to Edit Role, Manage Permissions, or Delete the role." />
            </div>

            {/* Add Role button is shown only when the current user has write access. */}
            {canWrite && (
              <Button
                appearance="primary"
                icon={<AddRegular />}
                onClick={handleOpenAddRoleDialog}
              >
                Add Role
              </Button>
            )}
          </div>

          {/* Search field for client-side table filtering. */}
          <SearchBox
            placeholder="Filter by role name or description..."
            value={roleSearchQuery}
            onChange={(_, data) => setRoleSearchQuery(data.value ?? "")}
            className="w-[20rem]"
          />
        </div>

        {/* Roles data grid showing filtered data and optional row actions. */}
        <DataGrid
          columns={roleColumnsWithActions}
          data={filteredRolesData}
          loading={isFetchingRoles}
        />
      </div>


      {/* Add Role dialog used to create a new custom role and optionally assign permissions. */}
      <Dialog
        /* Controlled open state for the Add Role dialog. */
        open={isAddRoleDialogOpen}
        /* Syncs dialog visibility changes and closes nested popover when the dialog closes. */
        onOpenChange={(_, data) => {
          setIsAddRoleDialogOpen(data.open);
          if (!data.open) setIsPermissionsPopoverOpen(false);
        }}
      >
        <DialogSurface>
          <DialogBody>
            {/* Add Role dialog title. */}
            <DialogTitle>Add New Role</DialogTitle>

            <DialogContent>

              {/* Role Name field. */}
              <div className={styles.formField}>
                <Field label="Role Name" required>
                  <Input
                    placeholder="Enter role name (e.g. data_steward)"
                    value={roleFormData.role_name}
                    onChange={(inputEvent) => handleRoleFormChange("role_name", inputEvent.target.value)}
                  />
                </Field>
              </div>

              {/* Description field. */}
              <div className={styles.formField}>
                <Field label="Description" hint="Optional — describe what this role is for">
                  <Textarea
                    placeholder="Enter a description for this role"
                    value={roleFormData.description ?? ""}
                    onChange={(inputEvent) => handleRoleFormChange("description", inputEvent.target.value)}
                    rows={3}
                  />
                </Field>
              </div>

              {/* Active-status toggle field. */}
              <div className={styles.formField}>
                <Field label="Active Status">
                  <Switch
                    checked={roleFormData.is_active}
                    onChange={(inputEvent) => handleRoleFormChange("is_active", inputEvent.target.checked)}
                    label={roleFormData.is_active ? "Active" : "Inactive"}
                  />
                </Field>
              </div>

              {/* Permissions multi-select field implemented using a popover and tag display. */}
              <div className={styles.formField}>
                <Field
                  label="Permissions"
                  hint="Optional — select permissions to assign to this role"
                >
                  <Popover
                    /* Controlled open state for the permissions popover. */
                    open={isPermissionsPopoverOpen}
                    /* Updates popover visibility state. */
                    onOpenChange={(_, data) => setIsPermissionsPopoverOpen(data.open)}
                    /* Positions the popover below the trigger and aligned to the start. */
                    positioning="below-start"
                    /* Keeps focus trapped while the popover is active. */
                    trapFocus
                  >
                    <PopoverTrigger disableButtonEnhancement>
                      <div
                        /* Styled trigger that looks like a custom multi-select control. */
                        className={styles.permissionsTrigger}
                        /* Indicates this element behaves like a button. */
                        role="button"
                        /* Announces that activating this control opens a popup. */
                        aria-haspopup="true"
                        /* Announces current expanded/collapsed state to assistive tech. */
                        aria-expanded={isPermissionsPopoverOpen}
                      >
                        {/* Left side of the trigger containing tags or placeholder text. */}
                        <div className="flex flex-wrap gap-1 flex-1">
                          {renderPermissionTags(
                            selectedPermissionIds,
                            handleRemovePermissionTag,
                            isFetchingPermissions
                              ? "Loading permissions..."
                              : "Select permissions..."
                          )}
                        </div>

                        {/* Chevron icon rotates to indicate popover open/closed state. */}
                        <ChevronDownRegular
                          fontSize={14}
                          style={{
                            flexShrink: 0,
                            color: tokens.colorNeutralForeground1,
                            transform: isPermissionsPopoverOpen ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.15s ease",
                          }}
                        />
                      </div>
                    </PopoverTrigger>

                    <PopoverSurface className={styles.permissionsPopoverSurface}>

                      {/* Search field inside the permissions dropdown popover. */}
                      <div className={styles.permissionSearchBox}>
                        <Input
                          placeholder="Search permissions..."
                          value={permissionDropdownSearch}
                          onChange={(inputEvent) => setPermissionDropdownSearch(inputEvent.target.value)}
                          size="small"
                          style={{ width: "100%" }}
                        />
                      </div>

                      {/* Shows spinner, empty state, or permission checkbox list depending on fetch/search results. */}
                      {isFetchingPermissions ? (
                        <div className="flex items-center justify-center py-4">
                          <Spinner size="small" label="Loading permissions..." />
                        </div>
                      ) : filteredDropdownPermissions.length === 0 ? (
                        <Text size={200} style={{ color: tokens.colorNeutralForeground1, padding: tokens.spacingHorizontalS }}>
                          No permissions found.
                        </Text>
                      ) : (
                        filteredDropdownPermissions.map((permission) => (
                          <div
                            key={permission.permission_id}
                            className={styles.permissionCheckboxRow}
                            onClick={() => handleTogglePermission(permission.permission_id)}
                          >
                            <Checkbox
                              checked={selectedPermissionIds.includes(permission.permission_id)}
                              onChange={() => handleTogglePermission(permission.permission_id)}
                              label={permission.permission_key}
                              onClick={(clickEvent) => clickEvent.stopPropagation()}
                              style={{
                                color: tokens.colorNeutralForeground1,
                              }}
                            />
                            <span className={styles.permissionCheckboxMeta}>
                              {permission.category}
                            </span>
                          </div>
                        ))
                      )}

                    </PopoverSurface>
                  </Popover>
                </Field>
              </div>

              {/* Inline error shown when add-role submission fails. */}
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
                  onClick={() => {
                    setIsAddRoleDialogOpen(false);
                    setIsPermissionsPopoverOpen(false);
                    setSubmitError(null);
                  }}
                >
                  Cancel
                </Button>
              </DialogTrigger>

              <Button
                appearance="primary"
                onClick={handleAddRole}
                disabled={isSubmitting || !roleFormData.role_name}
                icon={isSubmitting ? <Spinner size="tiny" /> : undefined}
              >
                {isSubmitting ? "Adding..." : "Add Role"}
              </Button>
            </DialogActions>

          </DialogBody>
        </DialogSurface>
      </Dialog>


      {/* Edit Role dialog used to update role name, description, and active status for a custom role. */}
      <Dialog
        /* Controlled open state for the Edit Role dialog. */
        open={isEditRoleDialogOpen}
        /* Clears transient edit state when the dialog closes, unless a submit is still running. */
        onOpenChange={(_, data) => {
          if (!data.open && !isSubmitting) {
            setIsEditRoleDialogOpen(false);
            setRoleToEdit(null);
            setSubmitError(null);
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            {/* Dialog title includes the selected role name for context. */}
            <DialogTitle>Edit Role — {roleToEdit?.role_name}</DialogTitle>

            <DialogContent>

              {/* Role Name field. */}
              <div className={styles.formField}>
                <Field label="Role Name" required>
                  <Input
                    placeholder="Enter role name"
                    value={editRoleFormData.role_name}
                    onChange={(inputEvent) => handleEditRoleFormChange("role_name", inputEvent.target.value)}
                  />
                </Field>
              </div>

              {/* Description field. */}
              <div className={styles.formField}>
                <Field label="Description" hint="Optional — describe what this role is for">
                  <Textarea
                    placeholder="Enter a description for this role"
                    value={editRoleFormData.description ?? ""}
                    onChange={(inputEvent) => handleEditRoleFormChange("description", inputEvent.target.value)}
                    rows={3}
                  />
                </Field>
              </div>

              {/* Active Status toggle. */}
              <div className={styles.formField}>
                <Field label="Active Status">
                  <Switch
                    checked={editRoleFormData.is_active}
                    onChange={(inputEvent) => handleEditRoleFormChange("is_active", inputEvent.target.checked)}
                    label={editRoleFormData.is_active ? "Active" : "Inactive"}
                  />
                </Field>
              </div>

              {/* Inline error shown when update fails. */}
              {submitError && (
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {submitError}
                </Text>
              )}

            </DialogContent>

            <DialogActions>
              {/* Cancel button closes the dialog without saving changes. */}
              <Button
                appearance="secondary"
                disabled={isSubmitting}
                onClick={() => {
                  setIsEditRoleDialogOpen(false);
                  setRoleToEdit(null);
                  setSubmitError(null);
                }}
              >
                Cancel
              </Button>

              {/* Save button submits role updates to the backend. */}
              <Button
                appearance="primary"
                onClick={handleUpdateRole}
                disabled={isSubmitting || !editRoleFormData.role_name}
                icon={isSubmitting ? <Spinner size="tiny" /> : undefined}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogActions>

          </DialogBody>
        </DialogSurface>
      </Dialog>


      {/* Delete Role confirmation dialog used for destructive deletion of custom roles. */}
      <Dialog
        /* Controlled open state for the delete confirmation dialog. */
        open={isDeleteRoleDialogOpen}
        /* Clears delete dialog state when closed, unless a delete request is still running. */
        onOpenChange={(_, data) => {
          if (!data.open && !isDeletingRole) {
            setIsDeleteRoleDialogOpen(false);
            setRoleToDelete(null);
            setDeleteRoleError(null);
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            {/* Dialog title makes the destructive operation explicit. */}
            <DialogTitle>Delete Role</DialogTitle>

            <DialogContent>
              {/* Confirmation message includes the targeted role name for clarity. */}
              <Text className={styles.deleteConfirmText}>
                Are you sure you want to delete the role{" "}
                <span className={styles.deleteRoleName}>
                  {roleToDelete?.role_name}
                </span>
                ? This action cannot be undone.
              </Text>

              {/* Inline error shown when delete fails. */}
              {deleteRoleError && (
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {deleteRoleError}
                </Text>
              )}
            </DialogContent>

            <DialogActions>
              {/* Cancel button closes the delete dialog with no action. */}
              <Button
                appearance="secondary"
                disabled={isDeletingRole}
                onClick={() => {
                  setIsDeleteRoleDialogOpen(false);
                  setRoleToDelete(null);
                  setDeleteRoleError(null);
                }}
              >
                Cancel
              </Button>

              {/* Yes button confirms deletion and calls the delete API. */}
              <Button
                appearance="primary"
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }}
                onClick={handleConfirmDeleteRole}
                disabled={isDeletingRole}
                icon={isDeletingRole ? <Spinner size="tiny" /> : undefined}
              >
                {isDeletingRole ? "Deleting..." : "Yes"}
              </Button>
            </DialogActions>

          </DialogBody>
        </DialogSurface>
      </Dialog>


      {/* Child dialog component used to manage permissions already assigned to the selected role. */}
      <ManagePermissionsInRoleDialog
        /* Currently selected role for which permissions are being managed. */
        selectedRole={selectedRole}
        /* Setter used by the child dialog to clear or change selected role. */
        setSelectedRole={setSelectedRole}
        /* Controlled open state for the manage-permissions dialog. */
        isEditRolePermissionsDialogOpen={isEditRolePermissionsDialogOpen}
        /* Setter for controlling manage-permissions dialog visibility. */
        setIsEditRolePermissionsDialogOpen={setIsEditRolePermissionsDialogOpen}
      />
    </div>
  );
};