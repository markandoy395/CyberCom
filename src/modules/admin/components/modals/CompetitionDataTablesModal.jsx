import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FiDownload, FiX } from "react-icons/fi";
import { apiGet, API_ENDPOINTS } from "../../../../utils/api";
import {
  COMPETITION_TABLE_BUTTONS,
  GLOBAL_TABLE_BUTTONS,
} from "../../overview/overviewConfig";
import "./CompetitionDataTablesModal.css";

const TABLE_TITLES = {
  categories: "Categories",
  challenges: "Challenges",
  competitions: "Competitions",
  "data-center": "Competition Data Center",
  history: "Login History",
  "live-monitor": "Live Monitor Activity",
  "practice-users": "Practice Users",
  members: "Team Members",
  rules: "Competition Rules",
  submissions: "Submissions",
  "team-rankings": "Team Rankings",
  teams: "Competition Teams",
  "member-rankings": "Member Rankings",
};
const SENSITIVE_FIELD_NAMES = new Set([
  "flag",
  "password",
  "password_hash",
  "session_token",
  "submitted_flag",
]);

const COMPETITION_SCOPED_TABLE_TYPES = new Set(
  COMPETITION_TABLE_BUTTONS.map(({ tableType }) => tableType)
);

const normalizeCompetitionId = value => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
};

const normalizeRows = rows => rows.map((row) => (
  row && typeof row === "object" && !Array.isArray(row)
    ? row
    : { value: row }
));
const sanitizeModalRow = row => {
  const sanitizedRow = { ...row };

  if ("flag" in sanitizedRow && !("hasFlag" in sanitizedRow)) {
    sanitizedRow.hasFlag = Boolean(sanitizedRow.flag);
  }

  if ("submitted_flag" in sanitizedRow && !("has_submitted_flag" in sanitizedRow)) {
    sanitizedRow.has_submitted_flag = Boolean(sanitizedRow.submitted_flag);
  }

  for (const fieldName of SENSITIVE_FIELD_NAMES) {
    delete sanitizedRow[fieldName];
  }

  return sanitizedRow;
};

const formatCellValue = (value, mode = "display") => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatCellValue(item, mode))
      .filter(Boolean)
      .join("; ");
  }

  if (typeof value === "object") {
    const hasResourceShape = ["type", "name", "url"].some((key) => key in value);

    if (hasResourceShape) {
      const label = value.name || value.type || "Resource";

      if (mode === "csv" && value.url) {
        return `${label}${value.type ? ` (${value.type})` : ""}: ${value.url}`;
      }

      return `${label}${value.type && !value.name ? ` (${value.type})` : ""}`;
    }

    return Object.entries(value)
      .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== "")
      .map(([key, entryValue]) => `${key}: ${formatCellValue(entryValue, mode)}`)
      .join(", ");
  }

  return String(value);
};

const escapeCsvValue = value => {
  const formattedValue = formatCellValue(value, "csv").replace(/"/g, "\"\"");

  return /[",\n]/.test(formattedValue) ? `"${formattedValue}"` : formattedValue;
};

const normalizeTableResponse = (tableType, payload) => {
  if (Array.isArray(payload)) {
    return normalizeRows(payload).map(sanitizeModalRow);
  }

  if (tableType === "rules" && Array.isArray(payload?.rules)) {
    return normalizeRows(payload.rules.map((rule_text, index) => ({
      display_order: index + 1,
      rule_text,
    }))).map(sanitizeModalRow);
  }

  if (tableType === "team-rankings" && Array.isArray(payload?.teams)) {
    return normalizeRows(payload.teams.map(({ members: _members, ...team }) => team)).map(sanitizeModalRow);
  }

  if (tableType === "member-rankings" && Array.isArray(payload?.members)) {
    return normalizeRows(payload.members).map(sanitizeModalRow);
  }

  return [];
};

const getTableTitle = tableType => TABLE_TITLES[tableType] || "Data";

const CompetitionDataTablesModal = ({
  competitions = [],
  isOpen,
  onClose,
  onSelectTable,
  selectedCompetitionId,
  tableType,
}) => {
  const [data, setData] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const normalizedCompetitionId = normalizeCompetitionId(selectedCompetitionId);
  const isDataCenterView = tableType === "data-center";
  const isCompetitionScoped = COMPETITION_SCOPED_TABLE_TYPES.has(tableType);
  const selectedCompetition = useMemo(
    () => competitions.find(competition => Number(competition.id) === normalizedCompetitionId) || null,
    [competitions, normalizedCompetitionId]
  );
  const columns = useMemo(() => {
    const columnSet = new Set();

    data.forEach((row) => {
      Object.keys(row || {}).forEach((key) => columnSet.add(key));
    });

    return Array.from(columnSet);
  }, [data]);

  const filteredData = useMemo(() => {
    if (!filterText) return data;
    const lowerFilter = filterText.toLowerCase();
    return data.filter(row => 
      columns.some(col => {
        const val = formatCellValue(row[col]);
        return String(val).toLowerCase().includes(lowerFilter);
      })
    );
  }, [data, filterText, columns]);

  const loadTableData = useCallback(async ({ silent = false } = {}) => {
    if (isDataCenterView || !tableType) {
      return;
    }

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      let endpoint = "";
      const competitionsBasePath = API_ENDPOINTS.COMPETITIONS_LIST;

      if (isCompetitionScoped && !normalizedCompetitionId) {
        const missingCompetitionMessage = competitions.length === 0
          ? "Create a competition before viewing competition-scoped data."
          : `Select a competition before loading ${getTableTitle(tableType).toLowerCase()}.`;

        setData([]);
        setError(missingCompetitionMessage);
        return;
      }

      switch (tableType) {
        case "practice-users":
          endpoint = API_ENDPOINTS.ADMIN_PRACTICE_USERS_LIST;
          break;
        case "competitions":
          endpoint = API_ENDPOINTS.COMPETITIONS_LIST;
          break;
        case "teams":
          endpoint = API_ENDPOINTS.COMPETITIONS_TEAMS(normalizedCompetitionId);
          break;
        case "members":
          endpoint = `${competitionsBasePath}/${normalizedCompetitionId}/members`;
          break;
        case "challenges":
          endpoint = `${API_ENDPOINTS.CHALLENGES_LIST}?sanitize=1`;
          break;
        case "categories":
          endpoint = API_ENDPOINTS.CHALLENGES_CATEGORIES;
          break;
        case "submissions":
          endpoint = `${API_ENDPOINTS.SUBMISSIONS_LIST}?sanitize=1`;
          break;
        case "rules":
          endpoint = `${competitionsBasePath}/${normalizedCompetitionId}/rules`;
          break;
        case "team-rankings":
          endpoint = `${competitionsBasePath}/${normalizedCompetitionId}/team-rankings`;
          break;
        case "member-rankings":
          endpoint = `${competitionsBasePath}/${normalizedCompetitionId}/member-rankings`;
          break;
        case "history":
          endpoint = `${competitionsBasePath}/${normalizedCompetitionId}/login-history`;
          break;
        case "live-monitor":
          endpoint = `${competitionsBasePath}/${normalizedCompetitionId}/live-monitor`;
          break;
        default:
          return;
      }

      const response = await apiGet(endpoint);

      if (response.success) {
        setData(normalizeTableResponse(tableType, response.data));
        setFilterText("");
        setError(null);
      } else if (!silent || data.length === 0) {
        setError(response.message || "Failed to load data");
      }
    } catch (err) {
      if (!silent || data.length === 0) {
        setError(err.message || "An error occurred while loading data");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [
    competitions.length,
    data.length,
    isCompetitionScoped,
    isDataCenterView,
    normalizedCompetitionId,
    tableType,
  ]);

  useEffect(() => {
    if (!isOpen || !tableType || isDataCenterView) {
      return undefined;
    }

    void loadTableData();

    const intervalId = window.setInterval(() => {
      void loadTableData({ silent: true });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [isDataCenterView, isOpen, loadTableData, tableType]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleEsc = event => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

    const sidebarToggle = document.querySelector(".sidebar-toggle-btn");
    let originalDisplay = "";

    if (sidebarToggle) {
      originalDisplay = sidebarToggle.style.display;
      sidebarToggle.style.display = "none";
    }

    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "auto";
      document.body.style.position = "static";
      document.body.style.width = "auto";

      if (sidebarToggle) {
        sidebarToggle.style.display = originalDisplay || "";
      }

      window.removeEventListener("keydown", handleEsc);
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, onClose]);

  const exportToCSV = () => {
    if (filteredData.length === 0) {
      return;
    }

    const csvContent = [
      columns.join(","),
      ...filteredData.map(row => columns.map(header => escapeCsvValue(row[header])).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${tableType}-export.csv`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  const handleCompetitionChange = event => {
    if (typeof onSelectTable !== "function") {
      return;
    }

    const nextCompetitionId = normalizeCompetitionId(event.target.value);
    onSelectTable(isDataCenterView ? "data-center" : tableType, nextCompetitionId);
  };

  const handleOpenTable = nextTableType => {
    if (typeof onSelectTable !== "function") {
      return;
    }

    onSelectTable(nextTableType, normalizedCompetitionId);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="data-tables-modal-backdrop">
      <div className="modal-content data-tables-modal">
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-copy">
              <h2>{getTableTitle(tableType)}</h2>
              {isCompetitionScoped && (
                <p>
                  {selectedCompetition
                    ? `Scoped to ${selectedCompetition.name}`
                    : "Choose a competition to scope this table."}
                </p>
              )}
            </div>
          </div>
          <div className="modal-actions">
            {!isDataCenterView && data.length > 0 && (
              <>
                <input
                  type="text"
                  className="table-filter-input"
                  placeholder="Filter data..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
                <button
                  className="modal-btn-icon export-btn"
                  onClick={exportToCSV}
                  title="Export to CSV"
                  type="button"
                >
                  <FiDownload />
                </button>
              </>
            )}
            <button
              className="modal-btn-close"
              onClick={onClose}
              title="Close modal"
              type="button"
            >
              <FiX />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {isDataCenterView ? (
            <div className="data-center-layout">
              <section className="data-center-section">
                <div className="data-center-section-header">
                  <div>
                    <h3>Global Tables</h3>
                    <p>Platform-wide tables that are safe to open without choosing a competition.</p>
                  </div>
                </div>
                <div className="data-center-button-grid">
                  {GLOBAL_TABLE_BUTTONS.map(item => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.key}
                        className="data-center-btn"
                        onClick={() => handleOpenTable(item.tableType)}
                        title={item.title}
                        type="button"
                      >
                        <span className="data-center-btn-icon">
                          <Icon />
                        </span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="data-center-section">
                <div className="data-center-section-header">
                  <div>
                    <h3>Competition Tables</h3>
                    <p>Select a competition first, then open team, rules, rankings, history, and live monitor data.</p>
                  </div>
                  <div className="data-center-selector">
                    <label htmlFor="data-center-competition">Competition</label>
                    <select
                      className="form-select data-center-select"
                      id="data-center-competition"
                      onChange={handleCompetitionChange}
                      value={normalizedCompetitionId ? String(normalizedCompetitionId) : ""}
                    >
                      <option value="">Select competition</option>
                      {competitions.map(competition => (
                        <option key={competition.id} value={competition.id}>
                          {competition.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {competitions.length === 0 ? (
                  <div className="data-center-empty">
                    <p>Create a competition before opening competition-scoped tables.</p>
                  </div>
                ) : (
                  <div className="data-center-button-grid">
                    {COMPETITION_TABLE_BUTTONS.map(item => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.key}
                          className="data-center-btn data-center-btn--competition"
                          disabled={!normalizedCompetitionId}
                          onClick={() => handleOpenTable(item.tableType)}
                          title={item.title}
                          type="button"
                        >
                          <span className="data-center-btn-icon">
                            <Icon />
                          </span>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <>
              {isCompetitionScoped && (
                <div className="table-context-bar">
                  <div className="table-context-copy">
                    <span className="table-context-label">Competition scope</span>
                    <strong>{selectedCompetition?.name || "No competition selected"}</strong>
                  </div>
                  <div className="data-center-selector">
                    <label htmlFor="table-competition-select">Competition</label>
                    <select
                      className="form-select data-center-select"
                      id="table-competition-select"
                      onChange={handleCompetitionChange}
                      value={normalizedCompetitionId ? String(normalizedCompetitionId) : ""}
                    >
                      <option value="">Select competition</option>
                      {competitions.map(competition => (
                        <option key={competition.id} value={competition.id}>
                          {competition.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading data...</p>
                </div>
              ) : error ? (
                <div className="error-state">
                  <p className="error-message">{error}</p>
                  <button
                    className="btn-retry"
                    onClick={() => void loadTableData()}
                    type="button"
                  >
                    Retry
                  </button>
                </div>
              ) : data.length === 0 ? (
                <div className="empty-state">
                  <p>No data available</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {columns.map(key => (
                          <th key={key}>{key.replace(/_/g, " ").toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.length > 0 ? (
                        filteredData.map((row, index) => (
                          <tr key={index}>
                            {columns.map(column => (
                              <td key={column}>
                                {formatCellValue(row[column])}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columns.length} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontStyle: "italic" }}>
                            No rows matched your filter
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <p className="record-count">
            {!isDataCenterView && data.length > 0 ? `Showing ${filteredData.length} of ${data.length} records` : ""}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompetitionDataTablesModal;
