/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Atharva Mundhada
  Date: 20 May 2026

  Purpose:
  Permissions tab component for the Roles Management Dashboard.
  - Displays all dashboard permissions registered in the RBAC system.
  - Supports CRUD operations for custom (non-system) entries only.
  - Add Permission button and dialog are intentionally hidden (commented out).
  - In the Edit Permission dialog, the Permission Key field is read-only.
  - Supports search filtering within the tab independently.
*/

/* Marks this file as a client component so it can use hooks, state, and browser-side interactivity. */
"use client";

/* Imports Fluent UI styling utilities and components used to build the page, dialogs, and form controls. */
import {
  /* Creates scoped CSS-in-JS styles for this component. */
  makeStyles,
  /* Fluent design tokens for spacing, colors, typography, and other theme values. */
  tokens,
  /* Loading indicator used during permission loading or save operations. */
  Spinner,
  /* Search input used to filter table data locally. */
  SearchBox,
  /* Status/category badge component for compact visual labels. */
  Badge,
  /* Reusable clickable action button component. */
  Button,
  /* Root dialog component used for modal windows. */
  Dialog,
  /* Optional helper that wires a trigger element to dialog behavior. */
  DialogTrigger,
  /* Outer visual shell of the dialog. */
  DialogSurface,
  /* Dialog title/header text area. */
  DialogTitle,
  /* Wrapper for dialog body content. */
  DialogBody,
  /* Footer container for dialog action buttons. */
  DialogActions,
  /* Main content section inside the dialog. */
  DialogContent,
  /* Field wrapper that provides label, hint, and validation framing. */
  Field,
  /* Single-line text input control. */
  Input,
  /* Native-select styled Fluent UI select component. */
  Select,
  /* General-purpose text rendering component. */
  Text,
  /* Tooltip used to explain actions/icons. */
  Tooltip,
  /* Boolean on/off toggle control. */
  Switch,
  /* Multi-line text input used for descriptions. */
  Textarea,
} from "@fluentui/react-components";

/* Imports icons used in headings and action buttons. */
import {
  /* Edit icon used for the row-level edit action. */
  EditRegular,
  /* Lock icon used in the section header to represent permissions/security. */
  LockClosedRegular,
  /* Add icon retained in commented-out code for the hidden add feature. */
  AddRegular, // commented out — Add Permission button is hidden
} from "@fluentui/react-icons";

/* Imports a reusable help/info component shown next to the tab title. */
import { Help } from "@/components/ui/Help";

/* Imports React state hook for local state management. */
import { useState } from "react";

/* Imports reusable grid/table component and the matching column configuration type. */
import { DataGrid, ColumnConfig } from "@/components/ui/DataGrid";

/* Imports local types representing dashboard permission records and form payload structure. */
import { DashboardPermission, PermissionFormPayload } from "@/types/api";

/* Imports service functions used to update permission records via backend APIs. */
import { rolesManagementService } from "@/lib/services/rolesManagementService";

/* Imports data-fetching hook that retrieves dashboard permissions for the tab. */
import { useGetDashboardPermissions } from "@/hooks/useRolesManagement";

/* Imports global toast helper used to show success feedback. */
import { useGlobalToast } from "@/hooks/useToast";

/* Imports helper used to convert raw timestamps into user-friendly date/time strings. */
import { formatDateTime } from "@/lib/helper";

/* Imports permission hook used to control read/write access and loading state for this page. */
import { usePagePermissions } from "@/hooks/hasPagePermissions";


// ---------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------


/* Defines the default blank form object used to initialize or reset the permission form state. */
const EMPTY_PERMISSION_FORM: PermissionFormPayload = {
  /* Default permission key starts empty. */
  permission_key: "",
  /* Default category value used when the form is initialized. */
  category: "dashboard",
  /* Default description starts blank because it is optional. */
  description: "",
  /* New/edited permission defaults to active unless toggled otherwise. */
  is_active: true,
};


/* Lists the only valid category values allowed by the RBAC schema for dashboard permissions. */
const PERMISSION_CATEGORIES = ["dashboard_modules", "cluster"] as const;


// ---------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------


/* Creates a hook that returns generated class names for locally scoped styles. */
const useStyles = makeStyles({
  /* Styles the section header row containing icon, title, and help tooltip. */
  sectionTitle: {
    /* Places children in a horizontal line. */
    display: "flex",
    /* Vertically centers the icon, text, and help control. */
    alignItems: "center",
    /* Adds spacing between header items. */
    gap: tokens.spacingHorizontalS,
    /* Gives the section title a semibold visual weight. */
    fontWeight: tokens.fontWeightSemibold,
  },

  /* Styles the main tab content container. */
  container: {
    /* Adds bottom padding to keep content from feeling cramped. */
    paddingBottom: tokens.spacingVerticalXL,
  },

  /* Styles wrappers around each form field block in dialogs. */
  formField: {
    /* Uses flexbox layout for field content. */
    display: "flex",
    /* Stacks field label and control vertically. */
    flexDirection: "column",
    /* Adds a small gap inside each field wrapper. */
    gap: tokens.spacingVerticalXS,
    /* Adds space below each field block. */
    marginBottom: tokens.spacingVerticalM,
  },
});


// ---------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------


/**
 * DashboardPermissionsTab
 *
 * Renders the Permissions tab content including:
 * - Search box for filtering permissions by key, category, or description
 * - DataGrid showing all permissions with an Edit action per row
 * - Edit Permission dialog (Add Permission is intentionally hidden)
 * - Permission Key field is read-only in the Edit dialog to prevent key changes
 */

/* Declares and exports the Permissions tab component used in the Roles Management Dashboard. */
export const DashboardPermissionsTab = () => {
  /* Retrieves scoped CSS class names generated from the local styles. */
  const styles = useStyles();

  /* Retrieves the global toast helper used for success notifications. */
  const { showToast } = useGlobalToast();


  /* Resolves read/write permission flags and loading state for this page. */
  const { canRead, canWrite, isLoadingPermissions } = usePagePermissions("roles-management-permissions");


  /* Tracks whether a submit action, such as update, is currently in progress. */
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  /* Stores an inline error message when a submit action fails. */
  const [submitError, setSubmitError] = useState<string | null>(null);


  /* Holds the current search term used to filter the permissions table. */
  const [permissionSearchQuery, setPermissionSearchQuery] = useState<string>("");

  /* Controls whether the Edit Permission dialog is currently open. */
  const [isEditPermissionDialogOpen, setIsEditPermissionDialogOpen] = useState<boolean>(false);

  /* Stores the current editable permission form data. */
  const [permissionFormData, setPermissionFormData] = useState<PermissionFormPayload>(EMPTY_PERMISSION_FORM);

  /* Stores the permission row currently selected for editing. */
  const [selectedPermission, setSelectedPermission] = useState<DashboardPermission | null>(null);


  /* Fetches permissions data and exposes refetch/loading helpers for the grid. */
  const { dashboardPermissions, refetch, isFetchingPermissions } = useGetDashboardPermissions(canRead);


  // ── Column Definitions ──────────────────────────────────────────────


  /* Defines the base set of columns shown in the permissions data grid. */
  const permissionColumns: ColumnConfig<any>[] = [
    {
      /* Binds this column to the permission_key field. */
      key: "permission_key",
      /* Header label shown for the permission key column. */
      label: "Permission Key",
      /* Width allocated to this column. */
      width: "20%",
      /* Allows long values to be expanded/shown fully if supported by DataGrid. */
      showMore: true,
      /* Enables copy behavior for this cell's content. */
      copyable: true,
      /* Enables sorting by permission key. */
      sortable: true,
    },
    {
      /* Binds this column to the category field. */
      key: "category",
      /* Header label shown for the category column. */
      label: "Category",
      /* Width allocated to this column. */
      width: "10%",
      /* Enables sorting by category. */
      sortable: true,
      /* Renders category values as branded outline badges. */
      render: (value) => (
        <Badge appearance="outline" color="brand">
          {value}
        </Badge>
      ),
    },
    {
      /* Binds this column to the description field. */
      key: "description",
      /* Header label shown for the description column. */
      label: "Description",
      /* Width allocated to this column. */
      width: "25%",
      /* Allows long descriptions to be expanded if supported by the grid. */
      showMore: true,
      /* Sorting is intentionally disabled for description. */
      sortable: false,
    },
    {
      /* Binds this column to the created_by field. */
      key: "created_by",
      /* Header label shown for the creator column. */
      label: "Created By",
      /* Width allocated to this column. */
      width: "14%",
      /* Allows long creator values to be expanded. */
      showMore: true,
      /* Enables sorting by creator. */
      sortable: true,
    },
    {
      /* Binds this column to the active-status field. */
      key: "is_active",
      /* Header label shown for the status column. */
      label: "Status",
      /* Width allocated to this column. */
      width: "8%",
      /* Enables sorting by active/inactive state. */
      sortable: true,
      /* Renders a green or red badge based on boolean active status. */
      render: (value) => (
        <Badge appearance="filled" color={value ? "success" : "danger"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      /* Binds this column to the created_at timestamp. */
      key: "created_at",
      /* Header label currently says "Created By" exactly as in the source code. */
      label: "Created By",
      /* Width allocated to this column. */
      width: "12%",
      /* Allows long formatted dates to be expanded if needed. */
      showMore: true,
      /* Enables sorting by created_at timestamp. */
      sortable: true,
      /* Formats the timestamp for display, or returns a hyphen if empty. */
      getValue: (value) => (value ? formatDateTime(value) : "-"),
    },
  ];


  /* Adds the Edit action column only when the current user has write permission. */
  const permissionColumnsWithActions: ColumnConfig<any>[] = canWrite
    ? [
        /* Includes all of the base columns first. */
        ...permissionColumns,
        {
          /* Unique key for the actions column. */
          key: "actions",
          /* Header label shown for the actions column. */
          label: "Actions",
          /* Width allocated to the actions column. */
          width: "5%",
          /* Renders the row-level edit action button. */
          render: (value, row) => (
            <Tooltip content="Edit Permission" relationship="label">
              <Button
                /* Uses subtle styling so the action stays visually lightweight. */
                appearance="subtle"
                /* Shows the edit icon to represent update action. */
                icon={<EditRegular />}
                /* Keeps the action button compact. */
                size="small"
                /* Opens the Edit Permission dialog for this row. */
                onClick={() => handleOpenEditPermissionDialog(row)}
              />
            </Tooltip>
          ),
        },
      ]
    : /* If user cannot write, show only base columns with no actions. */
      permissionColumns;


  // ── Handlers ────────────────────────────────────────────────────────


  /* Add Permission dialog opener is intentionally kept commented out because the Add UI is hidden. */
  // const handleOpenAddPermissionDialog = () => {
  //   setPermissionFormData(EMPTY_PERMISSION_FORM);
  //   setSubmitError(null);
  //   setIsAddPermissionDialogOpen(true);
  // };


  /* Opens the Edit Permission dialog and preloads it with the selected permission's values. */
  const handleOpenEditPermissionDialog = (permission: DashboardPermission) => {
    /* Stores the selected permission record for dialog context and title rendering. */
    setSelectedPermission(permission);

    /* Populates the editable form state using values from the selected permission row. */
    setPermissionFormData({
      /* Preserves the permission ID so update targets the correct record. */
      permission_id: permission.permission_id,
      /* Copies the immutable permission key into the form for read-only display. */
      permission_key: permission.permission_key,
      /* Copies the permission category into the editable form field. */
      category: permission.category,
      /* Uses description or falls back to empty string if missing. */
      description: permission.description ?? "",
      /* Copies the active/inactive state. */
      is_active: permission.is_active,
    });

    /* Clears any prior submit error before showing the dialog. */
    setSubmitError(null);

    /* Opens the Edit Permission dialog. */
    setIsEditPermissionDialogOpen(true);
  };


  /* Updates a single field inside the permission form state while preserving all others. */
  const handlePermissionFormChange = (field: keyof PermissionFormPayload, value: string | boolean) => {
    /* Uses a functional state update to safely merge the changed field into existing form state. */
    setPermissionFormData((previousPermissionFormData) => ({
      ...previousPermissionFormData,
      [field]: value,
    }));
  };

  /* Sends the updated permission details to the backend and closes the edit dialog on success. */
  const handleUpdatePermission = async () => {
    /* Marks submit state as active to disable the save button and show loading feedback. */
    setIsSubmitting(true);

    /* Clears any prior submit error before attempting the update. */
    setSubmitError(null);

    try {
      /* Calls the backend update API using the current permission form payload. */
      await rolesManagementService.updateDashboardPermission(permissionFormData).then((response) => {
        /* Refetches permissions so the grid shows the latest values. */
        refetch();
        /* Shows a success toast after a successful update. */
        showToast("Permission Updated successfully.");
        /* Closes the Edit Permission dialog. */
        setIsEditPermissionDialogOpen(false);
        /* Clears the selected permission once save is complete. */
        setSelectedPermission(null);
      });
    } catch (error) {
      /* Stores an inline error message if the update request fails. */
      setSubmitError("Failed to update permission. Please try again.");
    } finally {
      /* Clears submitting state whether the request succeeds or fails. */
      setIsSubmitting(false);
    }
  };


  // ── Filtered Data ────────────────────────────────────────────────────


  /* Filters the permission dataset locally using the current search query. */
  const filteredPermissionsData: DashboardPermission[] =
    /* If the trimmed search string is empty, show all permissions. */
    permissionSearchQuery.trim() === ""
      ? dashboardPermissions ?? []
      : /* Otherwise filter by permission key, category, or description. */
        (dashboardPermissions ?? []).filter((permission: DashboardPermission) => {
          /* Converts the search term to lowercase for case-insensitive matching. */
          const keyword = permissionSearchQuery.toLowerCase();

          /* Includes a permission row when any searchable field contains the keyword. */
          return (
            permission.permission_key?.toLowerCase().includes(keyword) ||
            permission.category?.toLowerCase().includes(keyword) ||
            permission.description?.toLowerCase().includes(keyword)
          );
        });


  // ── Render ───────────────────────────────────────────────────────────


  /* Shows a centered loading state while page-level permissions are still being resolved. */
  if (isLoadingPermissions) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Spinner size="medium" label="Loading..." />
      </div>
    );
  }


  /* Redirects the user away if permission loading is complete and read access is denied. */
  if (!isLoadingPermissions && !canRead) {
    window.location.href = "/forbidden";
  }


  /* Renders the full Permissions tab UI. */
  return (
    <div>
      {/* Main content container for header, search, and grid. */}
      <div className={styles.container}>
        {/* Vertical layout block for header row and search box. */}
        <div className="w-full flex flex-col gap-2 mt-4">
          {/* Header row containing section title on the left and optional action button on the right. */}
          <div className="flex items-center justify-between">
            {/* Left-side title group containing icon, title text, and help tooltip. */}
            <div className={styles.sectionTitle}>
              {/* Lock icon visually represents permissions/security. */}
              <LockClosedRegular />
              {/* Main section title text. */}
              <Text size={400} weight="semibold">
                Dashboard Permissions
              </Text>
              {/* Help tooltip explains what the table contains and how to use it. */}
              <Help info="This table displays all atomic permissions registered in the RBAC system. Each permission record includes its dot-notation key (e.g. dashboard.read, data.write), category, description, and active status. Use the search box to filter by permission key, category, or description. Click the edit icon to update a permission's details." />
            </div>

            {/* Add Permission button is intentionally hidden by leaving it commented out. */}
            {/* <Button
              appearance="primary"
              icon={<AddRegular />}
              onClick={handleOpenAddPermissionDialog}
            >
              Add Permission
            </Button> */}
          </div>

          {/* Search input used to filter permission rows locally. */}
          <SearchBox
            /* Placeholder explains which fields can be searched. */
            placeholder="Filter by permission key, category, or description..."
            /* Controlled value bound to local search state. */
            value={permissionSearchQuery}
            /* Updates the local search query when the user types. */
            onChange={(_, data) => setPermissionSearchQuery(data.value ?? "")}
            /* Fixed width to keep the search box compact and consistent. */
            className="w-[24rem]"
          />
        </div>

        {/* Data grid displays filtered permission rows and optional edit action column. */}
        <DataGrid
          /* Supplies either base columns or base-plus-actions columns. */
          columns={permissionColumnsWithActions}
          /* Supplies the locally filtered permission data set. */
          data={filteredPermissionsData}
          /* Shows loading state while permission data is being fetched. */
          loading={isFetchingPermissions}
        />
      </div>

      {/* Edit Permission dialog allows updates to mutable fields of the selected permission. */}
      <Dialog
        /* Controlled open state for the edit dialog. */
        open={isEditPermissionDialogOpen}
        /* Updates dialog visibility when Fluent UI requests open/close changes. */
        onOpenChange={(_, data) => setIsEditPermissionDialogOpen(data.open)}
      >
        {/* Visual shell of the dialog. */}
        <DialogSurface>
          {/* Structural wrapper for title, content, and actions. */}
          <DialogBody>
            {/* Dialog title includes the currently selected permission key for context. */}
            <DialogTitle>Edit Permission — {selectedPermission?.permission_key}</DialogTitle>

            {/* Main dialog form content. */}
            <DialogContent>

              {/* Read-only permission key field shown for reference but not editable. */}
              <div className={styles.formField}>
                <Field
                  /* Label shown above the immutable key input. */
                  label="Permission Key"
                  /* Hint explains why the field cannot be changed. */
                  hint="Permission key cannot be changed after creation"
                >
                  <Input
                    /* Placeholder shown if, for any reason, the key were empty. */
                    placeholder="Permission key"
                    /* Shows the current permission key in the input. */
                    value={permissionFormData.permission_key}
                    /* Applies a subtle disabled-style visual treatment. */
                    style={{
                      /* Soft background reinforces non-editable state. */
                      backgroundColor: tokens.colorNeutralBackground3,
                      /* Muted text color visually de-emphasizes the field. */
                      color: tokens.colorNeutralForeground3,
                      /* Cursor indicates the input cannot be modified. */
                      cursor: "not-allowed",
                    }}
                    /* Disables the field so it cannot be edited. */
                    disabled={true}
                  />
                </Field>
              </div>

              {/* Editable category field. */}
              <div className={styles.formField}>
                <Field label="Category" required>
                  <Select
                    /* Controlled select value bound to permission form state. */
                    value={permissionFormData.category}
                    /* Updates category when the user selects a different option. */
                    onChange={(inputEvent) => handlePermissionFormChange("category", inputEvent.target.value)}
                  >
                    {/* Renders one option per allowed permission category. */}
                    {PERMISSION_CATEGORIES.map((permissionCategory) => (
                      <option key={permissionCategory} value={permissionCategory}>
                        {permissionCategory.charAt(0).toUpperCase() + permissionCategory.slice(1)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {/* Editable description field. */}
              <div className={styles.formField}>
                <Field label="Description" hint="Optional — describe what this permission grants">
                  <Textarea
                    /* Placeholder shown when description is blank. */
                    placeholder="Enter a description for this permission"
                    /* Controlled value bound to description state. */
                    value={permissionFormData.description ?? ""}
                    /* Updates description on user input. */
                    onChange={(inputEvent) => handlePermissionFormChange("description", inputEvent.target.value)}
                    /* Keeps textarea compact but usable. */
                    rows={3}
                  />
                </Field>
              </div>

              {/* Editable active/inactive state field. */}
              <div className={styles.formField}>
                <Field label="Active Status">
                  <Switch
                    /* Controlled checked state bound to is_active. */
                    checked={permissionFormData.is_active}
                    /* Updates active flag when the switch is toggled. */
                    onChange={(inputEvent) => handlePermissionFormChange("is_active", inputEvent.target.checked)}
                    /* Dynamic label mirrors the boolean state. */
                    label={permissionFormData.is_active ? "Active" : "Inactive"}
                  />
                </Field>
              </div>

              {/* Inline error shown if the update operation fails. */}
              {submitError && (
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {submitError}
                </Text>
              )}

            </DialogContent>

            {/* Footer actions for canceling or saving dialog changes. */}
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button
                  /* Secondary styling keeps cancel visually less dominant. */
                  appearance="secondary"
                  /* Closes the dialog and clears transient edit state. */
                  onClick={() => {
                    setIsEditPermissionDialogOpen(false);
                    setSelectedPermission(null);
                    setSubmitError(null);
                  }}
                >
                  Cancel
                </Button>
              </DialogTrigger>

              <Button
                /* Primary styling emphasizes save/update action. */
                appearance="primary"
                /* Triggers the permission update request. */
                onClick={handleUpdatePermission}
                /* Disabled during submit or when required category value is missing. */
                disabled={isSubmitting || !permissionFormData.category}
                /* Shows a spinner while the save operation is running. */
                icon={isSubmitting ? <Spinner size="tiny" /> : undefined}
              >
                {/* Dynamic button text reflects current submit state. */}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};