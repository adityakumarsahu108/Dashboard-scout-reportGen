/*
==========================================
Scout Security Dashboard
intelligence.js

Renders the deterministic security
intelligence report produced by the
backend's /api/v1/intelligence/summary
endpoint (see intelligence.js on the
backend) on a new "Intelligence" page.

Also includes a defensive sidebar
navigation initializer: the Reports /
Analytics buttons were reported as
not switching pages, and app.js was
not available to audit, so this file
wires up robust, idempotent page
switching for every .nav-item so the
new Intelligence tab (and the existing
tabs) work regardless of app.js's state.
==========================================
*/

const INTELLIGENCE_API_URL =
    "https://dailyreportgenbackend.adityakumarsahu108.workers.dev/api/v1/intelligence/summary";

let intelligenceData = null;
let intelligenceLoading = false;

/*
==========================================
DEFENSIVE NAVIGATION
==========================================

Idempotent: safe to run even if app.js
already has its own (working) handler,
because it only sets classes to the
correct end state rather than toggling.
*/

function switchToPage(pageKey) {

    const navItems =
        document.querySelectorAll(".nav-item[data-page]");

    const pages =
        document.querySelectorAll(".page[id$='-page']");

    navItems.forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === pageKey
        );
    });

    pages.forEach(page => {
        page.classList.toggle(
            "hidden",
            page.id !== `${pageKey}-page`
        );
    });

    const titles = {
        dashboard: [
            "Security Dashboard",
            "Overview of security alerts and reports"
        ],
        reports: [
            "Reports",
            "Report history and pagination"
        ],
        analytics: [
            "Analytics",
            "Daily, monthly and quarterly analytics"
        ],
        intelligence: [
            "Intelligence Report",
            "Deterministic risk analysis, lifecycle and prioritization"
        ]
    };

    const pageTitle =
        document.getElementById("page-title");

    const pageDescription =
        document.getElementById("page-description");

    if (titles[pageKey]) {

        if (pageTitle) {
            pageTitle.textContent = titles[pageKey][0];
        }

        if (pageDescription) {
            pageDescription.textContent = titles[pageKey][1];
        }
    }

    if (pageKey === "intelligence" && !intelligenceData && !intelligenceLoading) {
        loadIntelligenceData();
    }
}

function initializeIntelligenceNavigation() {

    const navItems =
        document.querySelectorAll(".nav-item[data-page]");

    navItems.forEach(item => {

        item.addEventListener("click", () => {
            switchToPage(item.dataset.page);
        });

    });

    const refreshButton =
        document.getElementById("intel-refresh");

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            loadIntelligenceData(true);
        });
    }
}

/*
==========================================
DATA LOADING
==========================================
*/

async function loadIntelligenceData(forceRefresh = false) {

    if (intelligenceLoading) {
        return;
    }

    if (intelligenceData && !forceRefresh) {
        renderIntelligence(intelligenceData);
        return;
    }

    intelligenceLoading = true;

    try {

        const response = await fetch(INTELLIGENCE_API_URL);

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        intelligenceData = data;

        renderIntelligence(data);

    } catch (error) {

        console.error("Failed to load intelligence summary:", error);
        renderIntelligenceError();

    } finally {

        intelligenceLoading = false;

    }
}

function renderIntelligenceError() {

    const target =
        document.getElementById("intel-findings-list");

    if (target) {
        target.innerHTML =
            `<div class="empty-state">Couldn't reach the intelligence API. Try refreshing.</div>`;
    }
}

/*
==========================================
MAIN RENDER
==========================================
*/

function renderIntelligence(data) {

    if (!data || !data.report) {

        const grid = document.getElementById("intel-stats-grid");

        if (grid) {
            grid.innerHTML =
                `<div class="empty-state">No intelligence data is available yet.</div>`;
        }

        return;
    }

    setText(
        document.getElementById("intel-generated-at"),
        `Report ${escapeHTML(data.report.reportId || "—")} · Generated ${formatDateTime(data.generatedAt)}`
    );

    renderIntelSummary(data);
    renderIntelComparison(data.comparison);

    const findingsData =
        (data.securityIntelligence?.findings && data.securityIntelligence.findings.length > 0)
            ? data.securityIntelligence.findings
            : (data.insights || []);

    renderIntelFindings(findingsData);
    renderIntelLifecycle(data.lifecycle);
    renderIntelAging(data.aging);
    renderIntelPriorityTable(data.prioritization);
    renderIntelDistributions(data.securityIntelligence?.distributions);
}

/*
==========================================
SUMMARY STATS
==========================================
*/

function renderIntelSummary(data) {

    const alerts = data.alerts || {};
    const lifecycle = data.lifecycle || {};

    setText(document.getElementById("intel-total"), formatNumber(alerts.total));
    setText(document.getElementById("intel-unassigned"), formatNumber(alerts.unassigned));

    setText(document.getElementById("intel-new"), formatNumber(lifecycle.new));
    setText(
        document.getElementById("intel-new-pct"),
        `${lifecycle.newPercentage ?? 0}% of current volume`
    );

    setText(document.getElementById("intel-carried-over"), formatNumber(lifecycle.carriedOver));
    setText(
        document.getElementById("intel-carried-pct"),
        `${lifecycle.carriedOverPercentage ?? 0}% of current volume`
    );
}

/*
==========================================
COMPARISON
==========================================
*/

function deltaBadge(change, percentage) {

    if (!change || change === 0) {
        return `<span class="intel-delta flat">– 0%</span>`;
    }

    const direction = change > 0 ? "up" : "down";
    const arrow = change > 0 ? "▲" : "▼";
    const pct = Math.abs(percentage ?? 0);

    return `<span class="intel-delta ${direction}">${arrow} ${pct}%</span>`;
}

function renderIntelComparison(comparison) {

    const container =
        document.getElementById("intel-comparison-grid");

    if (!container) {
        return;
    }

    if (!comparison) {
        container.innerHTML =
            `<div class="empty-state">No previous report is available for comparison yet.</div>`;
        return;
    }

    const rows = [
        {
            label: "Total Alerts",
            current: comparison.currentReport.totalAlerts,
            previous: comparison.previousReport.totalAlerts,
            change: comparison.change.totalAlerts,
            pct: comparison.change.totalPercentage
        },
        {
            label: "Cyera",
            current: comparison.currentReport.cyera,
            previous: comparison.previousReport.cyera,
            change: comparison.change.cyera,
            pct: comparison.change.cyeraPercentage
        },
        {
            label: "Purview",
            current: comparison.currentReport.purview,
            previous: comparison.previousReport.purview,
            change: comparison.change.purview,
            pct: comparison.change.purviewPercentage
        }
    ];

    container.innerHTML = rows.map(row => `
        <div class="intel-compare-card">
            <span>${escapeHTML(row.label)}</span>
            <div class="intel-compare-figures">
                <strong>${formatNumber(row.current)}</strong>
                <small>vs ${formatNumber(row.previous)} previously</small>
            </div>
            ${deltaBadge(row.change, row.pct)}
        </div>
    `).join("");
}

/*
==========================================
KEY FINDINGS
==========================================
*/

function renderIntelFindings(findings) {

    const container =
        document.getElementById("intel-findings-list");

    if (!container) {
        return;
    }

    if (!findings || findings.length === 0) {
        container.innerHTML =
            `<div class="empty-state">No notable findings in the current report.</div>`;
        return;
    }

    container.innerHTML = findings.map(finding => {

        const severity =
            String(finding.severity || finding.priority || "low").toLowerCase();

        const severityClass =
            severity === "high" || severity === "critical"
                ? "high"
                : severity === "medium"
                    ? "medium"
                    : "low";

        const icon =
            severityClass === "high" ? "!" : severityClass === "medium" ? "•" : "i";

        const title =
            finding.title ||
            (finding.type ? finding.type.replace(/_/g, " ") : "Observation");

        const description =
            finding.description || finding.message || "";

        const action = finding.recommendedAction
            ? `<div class="finding-action"><strong>Recommended:</strong> ${escapeHTML(finding.recommendedAction)}</div>`
            : "";

        return `
            <div class="finding-item ${severityClass}">
                <div class="finding-indicator">${icon}</div>
                <div class="finding-body">
                    <div class="finding-title-row">
                        <strong>${escapeHTML(capitalize(title))}</strong>
                        <span class="alert-badge ${severityClass === "high" ? "critical" : severityClass}">${severity}</span>
                    </div>
                    <div class="finding-desc">${escapeHTML(description)}</div>
                    ${action}
                </div>
            </div>
        `;

    }).join("");
}

/*
==========================================
LIFECYCLE
==========================================
*/

function renderIntelLifecycle(lifecycle) {

    const container =
        document.getElementById("intel-lifecycle-summary");

    if (!container) {
        return;
    }

    if (!lifecycle || !lifecycle.previousReportId) {
        container.innerHTML =
            `<div class="empty-state">Lifecycle tracking needs at least two reports.</div>`;
        return;
    }

    const rows = [
        { label: "New alerts", count: lifecycle.new, pct: lifecycle.newPercentage },
        { label: "Carried over", count: lifecycle.carriedOver, pct: lifecycle.carriedOverPercentage }
    ];

    container.innerHTML = rows.map(row => `
        <div class="lifecycle-bar-row severity-row">
            <div class="severity-info">
                <span>${escapeHTML(row.label)}</span>
                <strong>${formatNumber(row.count)} · ${row.pct ?? 0}%</strong>
            </div>
            <div class="severity-bar">
                <div class="severity-bar-fill" style="width:${Math.min(row.pct ?? 0, 100)}%"></div>
            </div>
        </div>
    `).join("");
}

/*
==========================================
AGING / PERSISTENCE
==========================================
*/

function renderIntelAging(aging) {

    const statsContainer =
        document.getElementById("intel-aging-stats");

    const listContainer =
        document.getElementById("intel-aging-list");

    if (!statsContainer || !listContainer) {
        return;
    }

    if (!aging) {
        statsContainer.innerHTML =
            `<div class="empty-state">No aging data available.</div>`;
        listContainer.innerHTML = "";
        return;
    }

    statsContainer.innerHTML = `
        <div class="aging-stat">
            <span>2+ reports</span>
            <strong>${formatNumber(aging.persistent2Plus)}</strong>
        </div>
        <div class="aging-stat">
            <span>3+ reports</span>
            <strong>${formatNumber(aging.persistent3Plus)}</strong>
        </div>
        <div class="aging-stat">
            <span>High/critical, persistent</span>
            <strong>${formatNumber(aging.highOrCriticalPersistent)}</strong>
        </div>
    `;

    const alerts = aging.longestRunningAlerts || [];

    if (alerts.length === 0) {
        listContainer.innerHTML =
            `<div class="empty-state">No alerts have persisted across multiple reports.</div>`;
        return;
    }

    listContainer.innerHTML = alerts.slice(0, 8).map(alert => `
        <div class="insight-list-row">
            <div class="insight-rank">${alert.reportsSeen ?? "—"}×</div>
            <div class="insight-item-main">
                <span class="insight-item-name">${escapeHTML(alert.name || "Unnamed alert")}</span>
                <span class="insight-item-meta">${escapeHTML(alert.assignedUser || "Unassigned")} · first seen ${formatDate(alert.firstSeenAt)}</span>
            </div>
            <span class="alert-badge ${severityToClass(alert.severity)}">${escapeHTML(alert.severity || "unknown")}</span>
        </div>
    `).join("");
}

/*
==========================================
PRIORITIZED ALERTS
==========================================
*/

function renderIntelPriorityTable(prioritization) {

    const tbody =
        document.getElementById("intel-priority-table");

    if (!tbody) {
        return;
    }

    const alerts = prioritization?.alerts || [];

    if (alerts.length === 0) {
        tbody.innerHTML =
            `<tr><td colspan="5" class="empty-state">No prioritized alerts to show.</td></tr>`;
        return;
    }

    tbody.innerHTML = alerts.slice(0, 12).map(alert => `
        <tr>
            <td class="alert-name">${escapeHTML(alert.name || "Unnamed alert")}</td>
            <td><span class="alert-badge ${severityToClass(alert.priority)}">${escapeHTML(alert.priority || "—")}</span></td>
            <td class="priority-score">${formatNumber(alert.priorityScore)}</td>
            <td>${escapeHTML(alert.assignedUser || "Unassigned")}</td>
            <td>
                <div class="reasons-list">
                    ${(alert.reasons || []).map(reason => `<span class="reason-tag">${escapeHTML(reason)}</span>`).join("")}
                </div>
            </td>
        </tr>
    `).join("");
}

/*
==========================================
DISTRIBUTIONS
==========================================
*/

function renderDistList(containerId, items, valueLabelFn) {

    const container =
        document.getElementById(containerId);

    if (!container) {
        return;
    }

    if (!items || items.length === 0) {
        container.innerHTML =
            `<div class="empty-state">No distribution data available.</div>`;
        return;
    }

    const maxCount =
        Math.max(...items.map(item => item.count || 0), 1);

    container.innerHTML = items.slice(0, 8).map(item => `
        <div class="dist-row">
            <span class="dist-label">${escapeHTML(valueLabelFn ? valueLabelFn(item.value) : item.value)}</span>
            <div class="dist-track">
                <div class="dist-fill" style="width:${Math.max((item.count / maxCount) * 100, 4)}%"></div>
            </div>
            <span class="dist-count">${formatNumber(item.count)}</span>
        </div>
    `).join("");
}

function renderIntelDistributions(distributions) {

    if (!distributions) {

        renderDistList("intel-channel-dist", []);
        renderDistList("intel-policy-dist", []);
        return;
    }

    renderDistList("intel-channel-dist", distributions.channel);
    renderDistList("intel-policy-dist", distributions.policy);
}

/*
==========================================
HELPERS
==========================================
*/

function severityToClass(value) {

    const normalized =
        String(value || "").toLowerCase();

    if (["critical", "high", "medium", "low"].includes(normalized)) {
        return normalized;
    }

    return "medium";
}

function capitalize(value) {

    const text = String(value || "");

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function setText(element, value) {

    if (!element) {
        return;
    }

    element.textContent = value;
}

/*
==========================================
INIT
==========================================
*/

document.addEventListener("DOMContentLoaded", () => {
    initializeIntelligenceNavigation();
});