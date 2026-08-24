import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

/** Light-blue, low-chrome grid styling that matches the CarPilot cards. */
export const carPilotGridTheme = themeQuartz.withParams({
  accentColor: "#2563eb",
  backgroundColor: "#ffffff",
  borderColor: "#eaf1fb",
  browserColorScheme: "light",
  fontFamily: "inherit",
  fontSize: 13,
  foregroundColor: "#1e293b",
  headerBackgroundColor: "#f4f9ff",
  headerFontSize: 12,
  headerFontWeight: 600,
  headerTextColor: "#64748b",
  rowHoverColor: "#f5faff",
  rowVerticalPaddingScale: 1.1,
  selectedRowBackgroundColor: "#eff6ff",
  spacing: 7,
  wrapperBorder: false,
  wrapperBorderRadius: 0,
});

export const defaultColDef: ColDef = {
  sortable: true,
  resizable: true,
  suppressMovable: true,
  flex: 1,
  minWidth: 110,
  cellClass: "flex items-center",
};
