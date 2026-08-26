/*
====================================================
SECURITY INTELLIGENCE PAGE
====================================================

Independent page. Calls:

    /api/v1/intelligence/summary

====================================================
*/


/*
====================================================
CONFIGURATION
====================================================
*/

const INTELLIGENCE_API =
    "https://dailyreportgenbackend.adityakumarsahu108.workers.dev/api/v1/intelligence/summary";


/*
====================================================
DOM HELPERS
====================================================
*/

function getElement(id) {
    return document.getElementById(id);
}


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function formatNumber(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString();

}


function formatPercentage(value, digits = 1) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0%";
    }

    return `${number.toFixed(digits)}%`;

}


function formatDate(value) {

    if (!value) {
        return "\u2014";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

}


// Report dates arrive as compact "YYYYMMDD" strings rather than ISO.
function formatReportDate(value) {

    if (!value) {
        return "\u2014";
    }

    const raw = String(value);

    if (/^\d{8}$/.test(raw)) {

        const year = raw.slice(0, 4);
        const month = raw.slice(4, 6);
        const day = raw.slice(6, 8);

        const date = new Date(`${year}-${month}-${day}T00:00:00`);

        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
        }

    }

    return formatDate(value);

}


function relativeTime(value) {

    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin < 1) return "just now";
    if (diffMin === 1) return "1 minute ago";
    if (diffMin < 60) return `${diffMin} minutes ago`;

    const diffHr = Math.round(diffMin / 60);

    if (diffHr === 1) return "1 hour ago";
    if (diffHr < 24) return `${diffHr} hours ago`;

    const diffDay = Math.round(diffHr / 24);

    return diffDay === 1 ? "1 day ago" : `${diffDay} days ago`;

}


function severityToTone(severity) {

    const s = String(severity || "").toLowerCase();

    if (s === "critical" || s === "high") return "red";
    if (s === "medium") return "amber";
    if (s === "low") return "green";

    return "grey";

}


function statusToTone(status) {

    const s = String(status || "").toLowerCase();

    if (s === "open" || s === "active" || s === "investigating") return "amber";
    if (s === "riskaccepted") return "blue";
    if (s === "resolved" || s === "closed") return "green";

    return "grey";

}


function priorityClass(priority) {

    const p = String(priority || "low").toLowerCase();

    if (p === "critical" || p === "high") return "priority-high";
    if (p === "medium") return "priority-medium";

    return "priority-low";

}


/*
====================================================
STATUS BANNER
====================================================
*/

function setStatus(message, type = "loading") {

    const status = getElement("status");

    if (!status) {
        return;
    }

    if (!message) {
        status.style.display = "none";
        return;
    }

    status.textContent = message;
    status.className = `status-banner ${type}`;

}


function setLive(state, label) {

    const dot = getElement("live-dot");
    const text = getElement("live-label");

    if (dot) {
        dot.classList.toggle("is-error", state === "error");
    }

    if (text) {
        text.textContent = label;
    }

}


/*
====================================================
LOAD INTELLIGENCE
====================================================
*/

async function loadIntelligence() {

    const refreshButton = getElement("refresh-button");

    try {

        setStatus("Loading security intelligence\u2026", "loading");
        setLive("loading", "Connecting\u2026");

        if (refreshButton) {
            refreshButton.classList.add("is-loading");
            refreshButton.disabled = true;
        }

        console.log("Loading intelligence from:", INTELLIGENCE_API);

        const response = await fetch(INTELLIGENCE_API, {
            method: "GET",
            headers: { "Accept": "application/json" },
            cache: "no-store"
        });

        console.log("Intelligence HTTP status:", response.status);

        if (!response.ok) {
            throw new Error(`Intelligence API returned HTTP ${response.status}`);
        }

        const result = await response.json();

        console.log("Intelligence API response:", result);

        const data = result?.data || result?.intelligence || result;

        if (!data) {
            throw new Error("Intelligence API returned an empty response.");
        }

        renderIntelligence(data);

        setStatus("");
        setLive("ok", data?.generatedAt ? `Updated ${relativeTime(data.generatedAt)}` : "Live");

    }
    catch (error) {

        console.error("Intelligence loading failed:", error);

        setStatus(`Unable to load intelligence: ${error.message}`, "error");
        setLive("error", "Connection failed");

        showPageError(error.message);

    }
    finally {

        if (refreshButton) {
            refreshButton.classList.remove("is-loading");
            refreshButton.disabled = false;
        }

    }

}


/*
====================================================
RENDER EVERYTHING
====================================================
*/

function renderIntelligence(data) {

    console.log("Rendering intelligence:", data);

    renderOverview(data);
    renderFindings(data);
    renderPriorityQueue(data);
    renderComparison(data);
    renderLifecycle(data);
    renderAlertBreakdown(data);
    renderReport(data);
    renderGeneratedAt(data);

}


/*
====================================================
OVERVIEW / READOUT STRIP
====================================================
*/

function renderOverview(data) {

    const alerts = data?.alerts || {};
    const change = data?.comparison?.change || {};
    const secIntel = data?.securityIntelligence || {};

    const total = alerts.total ?? data?.totalAlerts ?? 0;
    const cyera = alerts.cyera ?? 0;
    const purview = alerts.purview ?? 0;
    const unassigned = alerts.unassigned ?? 0;
    const highRisk = secIntel?.risk?.highOrCritical ?? 0;
    const insights = Array.isArray(data?.insights) ? data.insights.length : 0;

    getElement("total-alerts").textContent = formatNumber(total);
    getElement("cyera-alerts").textContent = formatNumber(cyera);
    getElement("purview-alerts").textContent = formatNumber(purview);
    getElement("highrisk-alerts").textContent = formatNumber(highRisk);
    getElement("unassigned-alerts").textContent = formatNumber(unassigned);
    getElement("insight-count").textContent = formatNumber(insights);

    renderDelta("total-delta", change.totalAlerts, change.totalPercentage);
    renderDelta("cyera-delta", change.cyera, change.cyeraPercentage);
    renderDelta("purview-delta", change.purview, change.purviewPercentage);

}


function renderDelta(elementId, changeValue, percentageValue) {

    const el = getElement(elementId);

    if (!el) {
        return;
    }

    const change = Number(changeValue);

    if (!Number.isFinite(change)) {
        el.textContent = "";
        return;
    }

    const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
    const arrow = change > 0 ? "\u2191" : change < 0 ? "\u2193" : "\u2013";
    const sign = change > 0 ? "+" : "";
    const pct = Number.isFinite(Number(percentageValue))
        ? ` (${sign}${Number(percentageValue).toFixed(1)}%)`
        : "";

    el.className = `readout-delta ${direction}`;
    el.textContent = `${arrow} ${sign}${formatNumber(change)}${pct} vs prior`;

}


/*
====================================================
INTELLIGENCE FINDINGS
====================================================
*/

function priorityRank(priority) {

    const p = String(priority || "low").toLowerCase();

    if (p === "critical") return 0;
    if (p === "high") return 1;
    if (p === "medium") return 2;

    return 3;

}


function renderFindings(data) {

    const container = getElement("insights-container");
    const meta = getElement("findings-meta");

    const insights = Array.isArray(data?.insights) ? [...data.insights] : [];

    if (meta) {
        meta.textContent = insights.length ? `${insights.length} observations` : "";
    }

    if (!insights.length) {
        container.innerHTML = `
            <div class="empty-state">
                No intelligence findings were generated for this report.
            </div>
        `;
        return;
    }

    insights.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

    container.innerHTML = insights
        .map(insight => {

            const priority = String(insight.priority || "low").toLowerCase();
            const pClass = priorityClass(priority);

            return `
                <div class="finding-row">

                    <div class="finding-bar ${pClass}"></div>

                    <div>

                        <div class="finding-top">
                            <span class="finding-type">
                                ${escapeHTML(formatInsightType(insight.type))}
                            </span>

                            <span class="badge ${pClass}">
                                ${escapeHTML(priority)}
                            </span>
                        </div>

                        <div class="finding-message">
                            ${escapeHTML(insight.message || "No description available.")}
                        </div>

                    </div>

                </div>
            `;

        })
        .join("");

}


function formatInsightType(type) {

    if (!type) {
        return "Observation";
    }

    return String(type)
        .replace(/_/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());

}


/*
====================================================
PRIORITY QUEUE
====================================================
*/

function renderPriorityQueue(data) {

    const container = getElement("queue-container");

    const alerts = Array.isArray(data?.prioritization?.alerts)
        ? [...data.prioritization.alerts]
        : [];

    if (!alerts.length) {
        container.innerHTML = `
            <div class="empty-state">
                No alerts are currently queued for review.
            </div>
        `;
        return;
    }

    alerts.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));

    const top = alerts.slice(0, 8);
    const maxScore = Math.max(...top.map(a => a.priorityScore ?? 0), 1);

    container.innerHTML = top
        .map((alert, index) => {

            const pClass = priorityClass(alert.priority);
            const sevTone = severityToTone(alert.severity);
            const scorePct = Math.max(4, Math.min(100, ((alert.priorityScore ?? 0) / maxScore) * 100));

            const reasons = Array.isArray(alert.reasons) ? alert.reasons.slice(0, 3) : [];

            const reasonChips = reasons
                .map(reason => `<span class="chip">${escapeHTML(reason)}</span>`)
                .join("");

            const statusChip = alert.status
                ? `<span class="chip">${escapeHTML(formatInsightType(alert.status))}</span>`
                : "";

            return `
                <div class="queue-row">

                    <div class="queue-rank">${String(index + 1).padStart(2, "0")}</div>

                    <div class="queue-main">

                        <div class="queue-name-row">
                            <span class="sev-dot sev-${escapeHTML(String(alert.severity || "unknown").toLowerCase())}"></span>
                            <span class="queue-name">${escapeHTML(alert.name || "Untitled alert")}</span>
                        </div>

                        <div class="queue-chips">
                            ${statusChip}
                            ${reasonChips}
                        </div>

                    </div>

                    <div class="queue-score">
                        <span class="queue-score-value">${formatNumber(alert.priorityScore ?? 0)}</span>
                        <div class="score-gauge">
                            <div class="score-gauge-fill ${pClass}" style="width:${scorePct}%;"></div>
                        </div>
                    </div>

                </div>
            `;

        })
        .join("");

}


/*
====================================================
COMPARISON
====================================================
*/

function renderComparisonCard(label, current, previous, change, percentage) {

    const c = Number(change);
    const direction = c > 0 ? "up" : c < 0 ? "down" : "flat";
    const arrow = c > 0 ? "\u2191" : c < 0 ? "\u2193" : "\u2013";
    const sign = c > 0 ? "+" : "";

    return `
        <div class="compare-card">
            <div class="compare-label">${escapeHTML(label)}</div>
            <div class="compare-values">
                <span class="compare-current">${formatNumber(current)}</span>
                <span class="compare-previous">from ${formatNumber(previous)}</span>
            </div>
            <div class="compare-delta ${direction}">
                ${arrow} ${sign}${formatNumber(change)}
                (${sign}${formatPercentage(percentage)})
            </div>
        </div>
    `;

}


function renderComparison(data) {

    const container = getElement("comparison-container");
    const comparison = data?.comparison;

    if (!comparison) {
        container.innerHTML = `<div class="empty-state">No comparison data available.</div>`;
        return;
    }

    const currentReport = comparison.currentReport || {};
    const previousReport = comparison.previousReport || {};
    const change = comparison.change || {};

    container.innerHTML =
        renderComparisonCard(
            "Total Alerts",
            currentReport.totalAlerts ?? comparison.current ?? 0,
            previousReport.totalAlerts ?? comparison.previous ?? 0,
            change.totalAlerts ?? 0,
            change.totalPercentage ?? 0
        ) +
        renderComparisonCard(
            "Cyera",
            currentReport.cyera ?? 0,
            previousReport.cyera ?? 0,
            change.cyera ?? 0,
            change.cyeraPercentage ?? 0
        ) +
        renderComparisonCard(
            "Purview",
            currentReport.purview ?? 0,
            previousReport.purview ?? 0,
            change.purview ?? 0,
            change.purviewPercentage ?? 0
        );

}


/*
====================================================
LIFECYCLE
====================================================
*/

function renderLifecycle(data) {

    const container = getElement("lifecycle-container");
    const lifecycle = data?.lifecycle;

    if (!lifecycle) {
        container.innerHTML = `<div class="empty-state">No lifecycle data available.</div>`;
        return;
    }

    const total = Number(lifecycle.currentAlerts ?? lifecycle.total ?? 0);
    const newAlerts = Number(lifecycle.new ?? 0);
    const carriedOver = Number(lifecycle.carriedOver ?? 0);

    const newPercentage = Number(
        lifecycle.newPercentage ?? (total > 0 ? (newAlerts / total) * 100 : 0)
    );

    const carriedPercentage = Number(
        lifecycle.carriedOverPercentage ?? (total > 0 ? (carriedOver / total) * 100 : 0)
    );

    container.innerHTML = `

        <div class="lifecycle-bar">
            <div class="lifecycle-new" style="width:${Math.min(newPercentage, 100)}%;"></div>
            <div class="lifecycle-carried" style="width:${Math.min(carriedPercentage, 100)}%;"></div>
        </div>

        <div class="lifecycle-legend">

            <div class="lifecycle-legend-row">
                <span class="lifecycle-legend-key">
                    <span class="legend-swatch new"></span>
                    New this report
                </span>
                <span class="lifecycle-legend-value">
                    ${formatNumber(newAlerts)} (${formatPercentage(newPercentage)})
                </span>
            </div>

            <div class="lifecycle-legend-row">
                <span class="lifecycle-legend-key">
                    <span class="legend-swatch carried"></span>
                    Carried over
                </span>
                <span class="lifecycle-legend-value">
                    ${formatNumber(carriedOver)} (${formatPercentage(carriedPercentage)})
                </span>
            </div>

        </div>

    `;

}


/*
====================================================
ALERT BREAKDOWN
====================================================
*/

function renderBarGroup(title, entries, toneFn) {

    if (!entries.length) {
        return "";
    }

    const max = Math.max(...entries.map(e => e.value), 1);

    const rows = entries
        .map(entry => {

            const width = Math.max(4, Math.min(100, (entry.value / max) * 100));
            const tone = toneFn ? toneFn(entry.label) : "grey";

            return `
                <div class="bar-row">
                    <span class="bar-label" title="${escapeHTML(entry.label)}">${escapeHTML(entry.label)}</span>
                    <div class="bar-track">
                        <div class="bar-fill tone-${tone}" style="width:${width}%;"></div>
                    </div>
                    <span class="bar-value">${formatNumber(entry.value)}</span>
                </div>
            `;

        })
        .join("");

    return `
        <div class="breakdown-group">
            <div class="breakdown-group-title">${escapeHTML(title)}</div>
            ${rows}
        </div>
    `;

}


function objectToEntries(obj) {

    if (!obj || typeof obj !== "object") {
        return [];
    }

    return Object.entries(obj)
        .map(([key, value]) => ({
            label: key,
            value: typeof value === "object" ? (value?.count ?? value?.total ?? 0) : Number(value) || 0
        }))
        .filter(entry => entry.value > 0)
        .sort((a, b) => b.value - a.value);

}


function distributionToEntries(list) {

    if (!Array.isArray(list)) {
        return [];
    }

    return list
        .map(item => ({ label: item.value, value: item.count ?? 0 }))
        .filter(entry => entry.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

}


function renderAlertBreakdown(data) {

    const container = getElement("alert-breakdown");
    const alerts = data?.alerts || {};
    const distributions = data?.securityIntelligence?.distributions || {};

    const severityEntries = objectToEntries(alerts.severity);
    const statusEntries = objectToEntries(alerts.status);
    const channelEntries = distributionToEntries(distributions.channel);
    const policyEntries = distributionToEntries(distributions.policy).map((entry, index) => ({
        label: `Policy ${index + 1}`,
        value: entry.value
    }));

    const html = [
        renderBarGroup("Severity", severityEntries, severityToTone),
        renderBarGroup("Status", statusEntries, statusToTone),
        renderBarGroup("Channel", channelEntries, () => "blue"),
        renderBarGroup("Policy Volume", policyEntries, () => "grey")
    ].join("");

    container.innerHTML = html || `<div class="empty-state">No breakdown data available.</div>`;

}


/*
====================================================
LATEST REPORT
====================================================
*/

function renderReport(data) {

    const container = getElement("report-container");
    const report = data?.report;

    if (!report) {
        container.innerHTML = `<div class="empty-state">No report information available.</div>`;
        return;
    }

    container.innerHTML = `

        <div class="report-grid">

            <div class="report-item">
                <span>Report ID</span>
                <strong>${escapeHTML(report.reportId ?? "\u2014")}</strong>
            </div>

            <div class="report-item">
                <span>Report Date</span>
                <strong>${formatReportDate(report.reportDate)}</strong>
            </div>

            <div class="report-item" style="grid-column: 1 / -1;">
                <span>Generated</span>
                <strong>${formatDate(report.generatedAt)}</strong>
            </div>

        </div>

    `;

}


/*
====================================================
GENERATED TIME
====================================================
*/

function renderGeneratedAt(data) {

    const container = getElement("generated-container");
    const generatedAt = data?.generatedAt;

    if (!generatedAt) {
        container.innerHTML = `
            <div class="status-footer-dot" style="background:var(--text-tertiary); box-shadow:none;"></div>
            <div class="status-footer-text">
                <strong>Intelligence timestamp unavailable</strong>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="status-footer-dot"></div>
        <div class="status-footer-text">
            <strong>Intelligence generated</strong>
            <span>${formatDate(generatedAt)}</span>
        </div>
    `;

}


/*
====================================================
ERROR STATE
====================================================
*/

function showPageError(message) {

    const containers = [
        "insights-container",
        "queue-container",
        "comparison-container",
        "lifecycle-container",
        "alert-breakdown",
        "report-container"
    ];

    containers.forEach(id => {

        const element = getElement(id);

        if (!element) {
            return;
        }

        element.innerHTML = `
            <div class="empty-state">
                Unable to load intelligence.
                <small>${escapeHTML(message)}</small>
            </div>
        `;

    });

}


/*
====================================================
REFRESH BUTTON
====================================================
*/

const refreshButton = getElement("refresh-button");

if (refreshButton) {
    refreshButton.addEventListener("click", loadIntelligence);
}


/*
====================================================
INITIAL LOAD
====================================================
*/

document.addEventListener("DOMContentLoaded", () => {
    loadIntelligence();
});