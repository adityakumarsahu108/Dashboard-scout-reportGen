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

// How often the "Updated X ago" label re-ticks without refetching data.
const RELATIVE_TIME_TICK_MS = 30000;


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
PRESENTATION HELPERS
(purely cosmetic — do not touch data shape or logic)
====================================================
*/

// Returns an inline animation-delay so rows stagger in on render
// instead of popping in all at once. Pair with class="row-anim".
function rowDelay(index, stepMs = 40) {
    return `animation-delay:${index * stepMs}ms;`;
}

// After inserting bars/gauges with an inline target width, animate
// them from 0 -> target so the panel feels alive instead of static.
function animateFills(root) {

    if (!root) {
        return;
    }

    const fills = root.querySelectorAll(
        ".score-gauge-fill, .lifecycle-new, .lifecycle-carried, .bar-fill"
    );

    fills.forEach(el => {
        const target = el.style.width;
        if (!target) return;
        el.style.width = "0%";
        // Force reflow so the browser registers the 0% start state.
        // eslint-disable-next-line no-unused-expressions
        el.offsetWidth;
        requestAnimationFrame(() => {
            el.style.width = target;
        });
    });

}


function emptyState(message, options = {}) {

    const icon = options.icon || "\u25CB";
    const showRetry = Boolean(options.retry);

    return `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            ${escapeHTML(message)}
            ${showRetry ? `<div style="margin-top:12px;"><button class="btn-refresh" style="display:inline-flex; padding:7px 12px; font-size:12px;" onclick="loadIntelligence()">Try again</button></div>` : ""}
        </div>
    `;

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

    const showRetry = type === "error";

    status.innerHTML = `
        <span class="status-banner-text">${escapeHTML(message)}</span>
        ${showRetry ? `<button class="status-retry" type="button" onclick="loadIntelligence()">Retry</button>` : ""}
    `;
    status.className = `status-banner ${type}`;

}


function setLive(state, label) {

    const dot = getElement("live-dot");
    const text = getElement("live-label");

    if (dot) {
        dot.classList.toggle("is-error", state === "error");
        dot.classList.toggle("is-loading", state === "loading");
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

// Remembers the last successful payload's generatedAt so the
// "Updated X ago" pill can keep re-ticking between fetches.
let lastGeneratedAt = null;
let relativeTimeInterval = null;

function startRelativeTimeTicker() {

    if (relativeTimeInterval) {
        clearInterval(relativeTimeInterval);
    }

    relativeTimeInterval = setInterval(() => {
        if (lastGeneratedAt) {
            setLive("ok", `Updated ${relativeTime(lastGeneratedAt)}`);
        }
    }, RELATIVE_TIME_TICK_MS);

}


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

        lastGeneratedAt = data?.generatedAt || null;
        setLive("ok", lastGeneratedAt ? `Updated ${relativeTime(lastGeneratedAt)}` : "Live");
        startRelativeTimeTicker();

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

    // New security intelligence sections
    renderCaseOutcome(data);
    renderRiskAcceptance(data);
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

    // Quiet pulse on the headline number when there's something to act on —
    // draws the eye without a popup or sound.
    const highRiskEl = getElement("highrisk-alerts");
    if (highRiskEl) {
        highRiskEl.classList.toggle("is-alert", Number(highRisk) > 0);
    }

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
        container.innerHTML = emptyState("No intelligence findings were generated for this report.", { icon: "\u2713" });
        return;
    }

    insights.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

    container.innerHTML = insights
        .map((insight, index) => {

            const priority = String(insight.priority || "low").toLowerCase();
            const pClass = priorityClass(priority);

            return `
                <div class="finding-row row-anim" style="${rowDelay(index)}">

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
        container.innerHTML = emptyState("No alerts are currently queued for review.", { icon: "\u2713" });
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
            const extraReasons = Array.isArray(alert.reasons) ? alert.reasons.length - reasons.length : 0;

            const reasonChips = reasons
                .map(reason => `<span class="chip">${escapeHTML(reason)}</span>`)
                .join("") + (extraReasons > 0 ? `<span class="chip">+${extraReasons} more</span>` : "");

            const statusChip = alert.status
                ? `<span class="chip chip-status">${escapeHTML(formatInsightType(alert.status))}</span>`
                : "";

            return `
                <div class="queue-row row-anim" style="${rowDelay(index, 30)}">

                    <div class="queue-rank">${String(index + 1).padStart(2, "0")}</div>

                    <div class="queue-main">

                        <div class="queue-name-row">
                            <span class="sev-dot sev-${escapeHTML(String(alert.severity || "unknown").toLowerCase())}"></span>
                            <span class="queue-name" title="${escapeHTML(alert.name || "Untitled alert")}">${escapeHTML(alert.name || "Untitled alert")}</span>
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

    animateFills(container);

}


/*
====================================================
COMPARISON
====================================================
*/

function renderComparisonCard(label, current, previous, change, percentage, index = 0) {

    const c = Number(change);
    const direction = c > 0 ? "up" : c < 0 ? "down" : "flat";
    const arrow = c > 0 ? "\u2191" : c < 0 ? "\u2193" : "\u2013";
    const sign = c > 0 ? "+" : "";

    return `
        <div class="compare-card row-anim" style="${rowDelay(index, 60)}">
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
        container.innerHTML = emptyState("No comparison data available.");
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
            change.totalPercentage ?? 0,
            0
        ) +
        renderComparisonCard(
            "Cyera",
            currentReport.cyera ?? 0,
            previousReport.cyera ?? 0,
            change.cyera ?? 0,
            change.cyeraPercentage ?? 0,
            1
        ) +
        renderComparisonCard(
            "Purview",
            currentReport.purview ?? 0,
            previousReport.purview ?? 0,
            change.purview ?? 0,
            change.purviewPercentage ?? 0,
            2
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
        container.innerHTML = emptyState("No lifecycle data available.");
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

    animateFills(container);

}

/*
====================================================
CASE OUTCOME
====================================================
*/

function renderCaseOutcome(data) {

    const container = getElement("case-outcome-container");

    if (!container) {
        return;
    }

    /*
    Support both:

        data.caseOutcome

    and:

        data.securityIntelligence.caseOutcome

    This keeps the frontend tolerant of either API shape.
    */
    const caseOutcome =
        data?.caseOutcome ||
        data?.securityIntelligence?.caseOutcome;

    if (!caseOutcome) {
        container.innerHTML =
            emptyState("No case outcome data available.");

        return;
    }

    const totalCases =
        Number(caseOutcome.totalCases ?? 0);

    const outcomes =
        caseOutcome.outcomes || {};

    const disposition =
        caseOutcome.disposition || {};

    const active =
        caseOutcome.active || {};

    const riskAcceptance =
        caseOutcome.riskAcceptance || {};

    const formalClosure =
        caseOutcome.formalClosure || {};

    const dispositioned =
        Number(disposition.total ?? 0);

    const activeCases =
        Number(active.total ?? 0);

    const riskAccepted =
        Number(riskAcceptance.total ?? 0);

    const closure =
        Number(formalClosure.total ?? 0);

    const outcomeEntries = [
        {
            label: "Open",
            value: Number(outcomes.open ?? 0),
            tone: "amber"
        },
        {
            label: "Risk accepted",
            value: Number(outcomes.riskAccepted ?? 0),
            tone: "blue"
        },
        {
            label: "False positive",
            value: Number(outcomes.falsePositive ?? 0),
            tone: "green"
        },
        {
            label: "Resolved",
            value: Number(outcomes.resolved ?? 0),
            tone: "green"
        },
        {
            label: "Closed",
            value: Number(outcomes.closed ?? 0),
            tone: "green"
        }
    ].filter(item => item.value > 0);

    const maxOutcome =
        Math.max(
            ...outcomeEntries.map(item => item.value),
            1
        );

    const severityDispositioned =
        caseOutcome.severity?.dispositioned || {};

    const severityActive =
        caseOutcome.severity?.active || {};

    const severityRows = [
        {
            label: "Critical",
            dispositioned: Number(severityDispositioned.critical ?? 0),
            active: Number(severityActive.critical ?? 0)
        },
        {
            label: "High",
            dispositioned: Number(severityDispositioned.high ?? 0),
            active: Number(severityActive.high ?? 0)
        },
        {
            label: "Medium",
            dispositioned: Number(severityDispositioned.medium ?? 0),
            active: Number(severityActive.medium ?? 0)
        },
        {
            label: "Low",
            dispositioned: Number(severityDispositioned.low ?? 0),
            active: Number(severityActive.low ?? 0)
        }
    ].filter(
        row =>
            row.dispositioned > 0 ||
            row.active > 0
    );

    container.innerHTML = `

        <!-- SUMMARY -->

        <div class="intel-summary-grid">

            <div class="intel-stat">
                <span>All Cases</span>
                <strong>${formatNumber(totalCases)}</strong>
            </div>

            <div class="intel-stat">
                <span>Active</span>
                <strong class="accent-amber">
                    ${formatNumber(activeCases)}
                </strong>
                <small>
                    ${formatPercentage(active.rate)}
                </small>
            </div>

            <div class="intel-stat">
                <span>Dispositioned</span>
                <strong>
                    ${formatNumber(dispositioned)}
                </strong>
                <small>
                    ${formatPercentage(disposition.rate)}
                </small>
            </div>

            <div class="intel-stat">
                <span>Risk Accepted</span>
                <strong class="accent-blue">
                    ${formatNumber(riskAccepted)}
                </strong>
                <small>
                    ${formatPercentage(riskAcceptance.rate)}
                </small>
            </div>

        </div>


        <!-- OUTCOME DISTRIBUTION -->

        <div class="intel-subsection">

            <div class="intel-subsection-title">
                Outcome distribution
            </div>

            <div class="intel-bars">

                ${outcomeEntries.length
            ? outcomeEntries.map((item, index) => {

                const width =
                    Math.max(
                        4,
                        Math.min(
                            100,
                            (item.value / maxOutcome) * 100
                        )
                    );

                return `
                                <div
                                    class="intel-bar-row row-anim"
                                    style="${rowDelay(index, 35)}"
                                >
                                    <span class="intel-bar-label">
                                        ${escapeHTML(item.label)}
                                    </span>

                                    <div class="intel-bar-track">
                                        <div
                                            class="intel-bar-fill tone-${item.tone}"
                                            style="width:${width}%"
                                        ></div>
                                    </div>

                                    <span class="intel-bar-value">
                                        ${formatNumber(item.value)}
                                    </span>
                                </div>
                            `;

            }).join("")

            : emptyState("No outcome distribution available.")
        }

            </div>

        </div>


        <!-- SEVERITY -->

        <div class="intel-subsection">

            <div class="intel-subsection-title">
                Severity profile
            </div>

            <div class="case-severity-table">

                <div class="case-severity-header">
                    <span>Severity</span>
                    <span>Active</span>
                    <span>Dispositioned</span>
                </div>

                ${severityRows.length
            ? severityRows.map((row, index) => `
                            <div
                                class="case-severity-row row-anim"
                                style="${rowDelay(index, 35)}"
                            >
                                <span class="case-severity-name">
                                    <span class="sev-dot sev-${row.label.toLowerCase()}"></span>
                                    ${escapeHTML(row.label)}
                                </span>

                                <span class="case-severity-value">
                                    ${formatNumber(row.active)}
                                </span>

                                <span class="case-severity-value">
                                    ${formatNumber(row.dispositioned)}
                                </span>
                            </div>
                        `).join("")

            : `
                            <div class="intel-empty-inline">
                                No severity data available.
                            </div>
                        `
        }

            </div>

        </div>


        <!-- CLOSURE STATUS -->

        <div class="intel-footnote">

            <span>
                Formal closure
            </span>

            <strong>
                ${formatNumber(closure)}
                (${formatPercentage(formalClosure.rate)})
            </strong>

        </div>

    `;

    animateFills(container);
}
/*
====================================================
RISK ACCEPTANCE
====================================================
*/

function renderRiskAcceptance(data) {

    const container =
        getElement("risk-acceptance-container");

    if (!container) {
        return;
    }

    const riskAcceptance =
        data?.riskAcceptance ||
        data?.securityIntelligence?.riskAcceptance;

    if (!riskAcceptance) {
        container.innerHTML =
            emptyState("No risk acceptance data available.");

        return;
    }

    const total =
        Number(riskAcceptance.totalRiskAccepted ?? 0);

    const highRisk =
        riskAcceptance.highRisk || {};

    const aging =
        riskAcceptance.aging || {};

    const severity =
        riskAcceptance.severity || {};

    const concentration =
        riskAcceptance.concentration || {};

    const topPatterns =
        Array.isArray(concentration.topAlertPatterns)
            ? concentration.topAlertPatterns
            : [];

    const topOwners =
        Array.isArray(concentration.topOwners)
            ? concentration.topOwners
            : [];

    const agingBuckets =
        aging.buckets || {};

    const severityEntries = [
        {
            label: "Critical",
            value: Number(severity.critical ?? 0),
            tone: "red"
        },
        {
            label: "High",
            value: Number(severity.high ?? 0),
            tone: "red"
        },
        {
            label: "Medium",
            value: Number(severity.medium ?? 0),
            tone: "amber"
        },
        {
            label: "Low",
            value: Number(severity.low ?? 0),
            tone: "green"
        }
    ].filter(item => item.value > 0);

    const maxSeverity =
        Math.max(
            ...severityEntries.map(item => item.value),
            1
        );

    container.innerHTML = `

        <!-- HERO METRICS -->

        <div class="risk-hero">

            <div class="risk-total">

                <span>
                    Total risk accepted
                </span>

                <strong>
                    ${formatNumber(total)}
                </strong>

            </div>

            <div class="risk-high">

                <span>
                    High / Critical
                </span>

                <strong>
                    ${formatNumber(highRisk.total ?? 0)}
                </strong>

                <small>
                    ${formatPercentage(highRisk.rate)}
                </small>

            </div>

        </div>


        <!-- AGING -->

        <div class="intel-subsection">

            <div class="intel-subsection-title">
                Acceptance aging
            </div>

            <div class="aging-metrics">

                <div>
                    <span>Average age</span>
                    <strong>
                        ${Number(aging.averageDays ?? 0).toFixed(1)}d
                    </strong>
                </div>

                <div>
                    <span>Oldest</span>
                    <strong>
                        ${Number(aging.oldestDays ?? 0).toFixed(1)}d
                    </strong>
                </div>

                <div>
                    <span>Over 30d</span>
                    <strong>
                        ${formatNumber(aging.over30Days ?? 0)}
                    </strong>
                </div>

                <div>
                    <span>Over 90d</span>
                    <strong>
                        ${formatNumber(aging.over90Days ?? 0)}
                    </strong>
                </div>

            </div>


            <div class="aging-buckets">

                ${[
            ["0-7", agingBuckets["0-7"] ?? 0],
            ["8-30", agingBuckets["8-30"] ?? 0],
            ["31-90", agingBuckets["31-90"] ?? 0],
            ["90+", agingBuckets["90+"] ?? 0]
        ].map(([label, value]) => `
                    <div class="aging-bucket">

                        <span>${escapeHTML(label)} days</span>

                        <strong>
                            ${formatNumber(value)}
                        </strong>

                    </div>
                `).join("")}

            </div>

        </div>


        <!-- SEVERITY -->

        <div class="intel-subsection">

            <div class="intel-subsection-title">
                Accepted risk by severity
            </div>

            ${severityEntries.length
            ? severityEntries.map((item, index) => {

                const width =
                    Math.max(
                        4,
                        Math.min(
                            100,
                            (item.value / maxSeverity) * 100
                        )
                    );

                return `
                            <div
                                class="intel-bar-row row-anim"
                                style="${rowDelay(index, 35)}"
                            >
                                <span class="intel-bar-label">
                                    ${escapeHTML(item.label)}
                                </span>

                                <div class="intel-bar-track">
                                    <div
                                        class="intel-bar-fill tone-${item.tone}"
                                        style="width:${width}%"
                                    ></div>
                                </div>

                                <span class="intel-bar-value">
                                    ${formatNumber(item.value)}
                                </span>
                            </div>
                        `;

            }).join("")

            : `
                        <div class="intel-empty-inline">
                            No severity data available.
                        </div>
                    `
        }

        </div>


        <!-- CONCENTRATION -->

        <div class="intel-subsection">

            <div class="intel-subsection-title">
                Top accepted-risk patterns
            </div>

            <div class="risk-list">

                ${topPatterns.length
            ? topPatterns.slice(0, 5).map((item, index) => `
                            <div
                                class="risk-list-row row-anim"
                                style="${rowDelay(index, 35)}"
                            >
                                <div class="risk-list-main">

                                    <span class="risk-list-name"
                                        title="${escapeHTML(item.name)}">
                                        ${escapeHTML(item.name)}
                                    </span>

                                </div>

                                <div class="risk-list-count">

                                    <strong>
                                        ${formatNumber(item.count)}
                                    </strong>

                                    <span>
                                        ${formatPercentage(item.rate)}
                                    </span>

                                </div>

                            </div>
                        `).join("")

            : `
                            <div class="intel-empty-inline">
                                No recurring patterns identified.
                            </div>
                        `
        }

            </div>

        </div>


        <!-- OWNERS -->

        <div class="intel-subsection">

            <div class="intel-subsection-title">
                Risk acceptance owners
            </div>

            <div class="risk-list">

                ${topOwners.length
            ? topOwners.slice(0, 5).map((item, index) => `
                            <div
                                class="risk-list-row row-anim"
                                style="${rowDelay(index, 35)}"
                            >
                                <div class="risk-list-main">

                                    <span class="risk-list-name"
                                        title="${escapeHTML(item.name)}">
                                        ${escapeHTML(item.name)}
                                    </span>

                                </div>

                                <div class="risk-list-count">

                                    <strong>
                                        ${formatNumber(item.count)}
                                    </strong>

                                    <span>
                                        ${formatPercentage(item.rate)}
                                    </span>

                                </div>

                            </div>
                        `).join("")

            : `
                            <div class="intel-empty-inline">
                                No owner concentration data available.
                            </div>
                        `
        }

            </div>

        </div>

    `;

    animateFills(container);
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
        .map((entry, index) => {

            const width = Math.max(4, Math.min(100, (entry.value / max) * 100));
            const tone = toneFn ? toneFn(entry.label) : "grey";

            return `
                <div class="bar-row row-anim" style="${rowDelay(index, 40)}">
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

    container.innerHTML = html || emptyState("No breakdown data available.");

    animateFills(container);

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
        container.innerHTML = emptyState("No report information available.");
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
        "case-outcome-container",
        "risk-acceptance-container",
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
                <div class="empty-icon">\u26A0</div>
                Unable to load intelligence.
                <small>${escapeHTML(message)}</small>
                <div style="margin-top:12px;">
                    <button class="btn-refresh" style="display:inline-flex; padding:7px 12px; font-size:12px;" onclick="loadIntelligence()">Try again</button>
                </div>
            </div>
        `;

    });

}


/*
====================================================
REFRESH BUTTON + SHORTCUT
====================================================
*/

const refreshButton = getElement("refresh-button");

if (refreshButton) {
    refreshButton.addEventListener("click", loadIntelligence);
}

// Quiet power-user affordance: "R" refreshes, same as the button.
// Ignored while typing in a form field (none exist on this page today,
// but this keeps the shortcut safe if one is ever added).
document.addEventListener("keydown", (event) => {

    const tag = (event.target?.tagName || "").toLowerCase();
    const isTyping = tag === "input" || tag === "textarea" || event.target?.isContentEditable;

    if (isTyping || event.metaKey || event.ctrlKey || event.altKey) {
        return;
    }

    if (event.key === "r" || event.key === "R") {
        loadIntelligence();
    }

});


/*
====================================================
INITIAL LOAD
====================================================
*/

document.addEventListener("DOMContentLoaded", () => {
    loadIntelligence();
});