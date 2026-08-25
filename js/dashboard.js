/*
==========================================
Scout Security Dashboard
dashboard.js
==========================================
*/

async function loadDashboardData() {

    try {

        console.log("Loading dashboard data...");

        /*
        ==========================================
        ANALYTICS SUMMARY
        ==========================================
        */

        const summary =
            await ScoutReportAPI.getAnalyticsSummary();

        console.log(
            "Analytics Summary:",
            summary
        );


        /*
        ==========================================
        DAILY TRENDS
        ==========================================
        */

        const daily =
            await ScoutReportAPI.getAnalyticsTrends(
                "daily"
            );

        console.log(
            "Daily Trends:",
            daily
        );


        /*
        ==========================================
        MONTHLY TRENDS
        ==========================================
        */

        const monthly =
            await ScoutReportAPI.getAnalyticsTrends(
                "monthly"
            );

        console.log(
            "Monthly Trends:",
            monthly
        );


        /*
        ==========================================
        QUARTERLY TRENDS
        ==========================================
        */

        const quarterly =
            await ScoutReportAPI.getAnalyticsTrends(
                "quarterly"
            );

        console.log(
            "Quarterly Trends:",
            quarterly
        );


        /*
        ==========================================
        REPORTS
        ==========================================
        */

        const reports =
            await ScoutReportAPI.getReports({
                page: 1,
                limit: 30
            });

        console.log(
            "Reports:",
            reports
        );


        /*
        ==========================================
        RENDER DASHBOARD
        ==========================================
        */

        renderSummary(
            summary
        );


        renderSeverity(
            summary
        );


        renderLatestReport(
            summary
        );
        renderSourceComparison(summary);

        renderRiskInsights(summary);


        /*
        ==========================================
        TREND CONTROLS
        ==========================================
        */

        initializeTrendControls(
            daily,
            monthly,
            quarterly
        );


        /*
        ==========================================
        RECENT REPORTS
        ==========================================
        */

        renderRecentReports(
            reports
        );
        initializeReportsPagination();

        /*
        ==========================================
        LAST UPDATED
        ==========================================
        */

        renderLastUpdated(
            summary
        );


        /*
        ==========================================
        STORE DASHBOARD DATA
        ==========================================
        */

        window.dashboardData = {

            summary,

            daily,

            monthly,

            quarterly,

            reports

        };


        console.log(
            "Dashboard data rendered successfully."
        );

    }
    catch (error) {

        console.error(
            "Dashboard rendering failed:",
            error
        );

        throw error;

    }

}

/*
==========================================
DAILY TREND CHART
==========================================
*/
/*
==========================================
ALERT TRENDS
==========================================
*/



function renderTrendChart(data) {

    const container =
        document.getElementById("trend-chart");

    if (!container) {
        console.warn("trend-chart container not found");
        return;
    }

    if (!data || !data.success) {

        container.innerHTML = `
            <div class="empty-state">
                No trend data available.
            </div>
        `;

        return;
    }


    const trends =
        data.data || [];


    if (!trends.length) {

        container.innerHTML = `
            <div class="empty-state">
                No trend data available.
            </div>
        `;

        return;
    }


    /*
    ------------------------------------------
    Prepare data
    ------------------------------------------
    */

    const labels =
        trends.map(item => {

            if (currentTrendPeriod === "daily") {
                return formatDate(item.date);
            }

            if (currentTrendPeriod === "monthly") {
                return item.month || "—";
            }

            if (currentTrendPeriod === "quarterly") {
                return item.quarter || "—";
            }

            return "—";

        });


    const total =
        trends.map(item =>
            Number(item.total || 0)
        );


    const cyera =
        trends.map(item =>
            Number(item.cyera || 0)
        );


    const purview =
        trends.map(item =>
            Number(item.purview || 0)
        );


    /*
    ------------------------------------------
    Find maximum value
    ------------------------------------------
    */

    const maxValue =
        Math.max(
            ...total,
            ...cyera,
            ...purview,
            1
        );


    /*
    ------------------------------------------
    Create chart
    ------------------------------------------
    */

    const width =
        Math.max(
            trends.length * 100,
            container.clientWidth
        );


    container.innerHTML = `

        <div class="trend-chart-inner">

            <svg
                viewBox="0 0 ${width} 320"
                preserveAspectRatio="none"
                class="trend-svg"
            >

                <!-- Grid -->

                <line
                    x1="50"
                    y1="40"
                    x2="${width - 30}"
                    y2="40"
                    class="chart-grid-line"
                />

                <line
                    x1="50"
                    y1="120"
                    x2="${width - 30}"
                    y2="120"
                    class="chart-grid-line"
                />

                <line
                    x1="50"
                    y1="200"
                    x2="${width - 30}"
                    y2="200"
                    class="chart-grid-line"
                />

                <line
                    x1="50"
                    y1="280"
                    x2="${width - 30}"
                    y2="280"
                    class="chart-grid-line"
                />


                <!-- Total -->

                <polyline
                    points="${createTrendPoints(
        total,
        width,
        maxValue
    )}"
                    class="trend-line trend-line-total"
                />


                <!-- Cyera -->

                <polyline
                    points="${createTrendPoints(
        cyera,
        width,
        maxValue
    )}"
                    class="trend-line trend-line-cyera"
                />


                <!-- Purview -->

                <polyline
                    points="${createTrendPoints(
        purview,
        width,
        maxValue
    )}"
                    class="trend-line trend-line-purview"
                />

            </svg>


            <div class="trend-x-axis">

                ${labels.map(label => `
                    <span>
                        ${escapeHTML(String(label))}
                    </span>
                `).join("")}

            </div>

        </div>
    `;
}


/*
==========================================
CREATE TREND POINTS
==========================================
*/

function createTrendPoints(
    values,
    width,
    maxValue
) {

    const chartLeft = 50;

    const chartRight =
        width - 30;

    const chartTop = 40;

    const chartBottom = 280;


    const usableWidth =
        chartRight - chartLeft;


    const usableHeight =
        chartBottom - chartTop;


    if (values.length === 1) {

        const x =
            chartLeft +
            usableWidth / 2;

        const y =
            chartBottom -
            (
                values[0] /
                maxValue
            ) *
            usableHeight;

        return `${x},${y}`;
    }


    return values
        .map((value, index) => {

            const x =
                chartLeft +
                (
                    index /
                    (values.length - 1)
                ) *
                usableWidth;


            const y =
                chartBottom -
                (
                    value /
                    maxValue
                ) *
                usableHeight;


            return `${x},${y}`;

        })
        .join(" ");
}


/*
==========================================
TREND PERIOD BUTTONS
==========================================
*/

function initializeTrendControls(
    dailyData,
    monthlyData,
    quarterlyData
) {

    const buttons =
        document.querySelectorAll(
            ".trend-period"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const period =
                    button.dataset.period;


                currentTrendPeriod =
                    period;


                buttons.forEach(
                    item =>
                        item.classList.remove(
                            "active"
                        )
                );


                button.classList.add(
                    "active"
                );


                let data;


                if (period === "daily") {

                    data =
                        dailyData;

                }
                else if (
                    period === "monthly"
                ) {

                    data =
                        monthlyData;

                }
                else {

                    data =
                        quarterlyData;

                }


                renderTrendChart(data);

            }
        );

    });


    /*
    Initial state
    */

    renderTrendChart(
        dailyData
    );
}

/*
==========================================
SUMMARY CARDS
==========================================
*/

function renderSummary(data) {

    if (!data || !data.success) {

        console.warn(
            "Invalid analytics summary:",
            data
        );

        return;
    }


    const totals =
        data.totals || {};


    /*
    ==========================================
    TOTAL ALERTS
    ==========================================
    */

    const totalAlerts =
        Number(
            totals.total ??
            (
                Number(totals.cyera || 0) +
                Number(totals.purview || 0)
            )
        );


    setText(
        "total-alerts",
        formatNumber(totalAlerts)
    );


    /*
    ==========================================
    CYERA
    ==========================================
    */

    const cyeraAlerts =
        Number(
            totals.cyera ??
            data.cyera?.total ??
            0
        );


    setText(
        "cyera-alerts",
        formatNumber(cyeraAlerts)
    );


    /*
    ==========================================
    PURVIEW
    ==========================================
    */

    const purviewAlerts =
        Number(
            totals.purview ??
            data.purview?.total ??
            0
        );


    setText(
        "purview-alerts",
        formatNumber(purviewAlerts)
    );


    /*
    ==========================================
    REPORT COUNT
    ==========================================
    */

    const reportCount =
        Number(
            totals.reports ??
            totals.totalReports ??
            data.totalReports ??
            data.reports?.total ??
            0
        );


    setText(
        "total-reports",
        formatNumber(reportCount)
    );

}



/*
==========================================
ALERT TRENDS
==========================================
*/

let currentTrendPeriod = "daily";


function renderTrends(period = currentTrendPeriod) {

    const container =
        document.getElementById(
            "trend-chart"
        );


    if (!container) {

        return;

    }


    currentTrendPeriod =
        period;


    const dashboard =
        window.dashboardData;


    if (!dashboard) {

        container.innerHTML = `
            <div class="empty-state">
                Trend data unavailable.
            </div>
        `;

        return;

    }


    /*
    ==========================================
    Get selected dataset
    ==========================================
    */

    const response =
        dashboard[period];


    const data =
        response?.data || [];


    if (!data.length) {

        container.innerHTML = `
            <div class="empty-state">
                No ${period} trend data available.
            </div>
        `;

        return;

    }


    /*
    ==========================================
    Normalize data
    ==========================================
    */

    const points =
        data.map(item => ({

            label:
                item.date ??
                item.month ??
                item.quarter ??
                "—",

            total:
                Number(
                    item.total || 0
                ),

            cyera:
                Number(
                    item.cyera || 0
                ),

            purview:
                Number(
                    item.purview || 0
                )

        }));


    /*
    ==========================================
    Chart dimensions
    ==========================================
    */

    const width = 1000;

    const height = 330;

    const paddingLeft = 58;

    const paddingRight = 25;

    const paddingTop = 25;

    const paddingBottom = 55;


    const chartWidth =
        width -
        paddingLeft -
        paddingRight;


    const chartHeight =
        height -
        paddingTop -
        paddingBottom;


    /*
    ==========================================
    Maximum value
    ==========================================
    */

    const maxValue =
        Math.max(
            ...points.map(
                point =>
                    Math.max(
                        point.total,
                        point.cyera,
                        point.purview
                    )
            ),
            1
        );


    /*
    Round axis maximum
    ==========================================
    */

    const axisMax =
        getNiceMax(
            maxValue
        );


    /*
    ==========================================
    X coordinate
    ==========================================
    */

    const getX =
        index => {

            if (points.length === 1) {

                return (
                    paddingLeft +
                    chartWidth / 2
                );

            }


            return (
                paddingLeft +
                (
                    index /
                    (points.length - 1)
                ) *
                chartWidth
            );

        };


    /*
    ==========================================
    Y coordinate
    ==========================================
    */

    const getY =
        value =>
            paddingTop +
            chartHeight -
            (
                value /
                axisMax
            ) *
            chartHeight;


    /*
    ==========================================
    Grid lines
    ==========================================
    */

    const gridCount = 5;


    let gridHTML = "";


    for (
        let i = 0;
        i <= gridCount;
        i++
    ) {

        const value =
            (
                axisMax /
                gridCount
            ) *
            i;


        const y =
            getY(value);


        gridHTML += `

            <line
                x1="${paddingLeft}"
                y1="${y}"
                x2="${width - paddingRight}"
                y2="${y}"
                class="trend-grid-line"
            />

            <text
                x="${paddingLeft - 10}"
                y="${y + 4}"
                text-anchor="end"
                class="trend-axis-label"
            >
                ${formatNumber(
            Math.round(value)
        )}
            </text>

        `;

    }


    /*
    ==========================================
    Generate lines
    ==========================================
    */

    function createLine(
        key,
        cssClass
    ) {

        const pointsString =
            points
                .map(
                    (point, index) =>
                        `${getX(index)},${getY(point[key])}`
                )
                .join(" ");


        return `

            <polyline
                points="${pointsString}"
                class="trend-line ${cssClass}"
            />

        `;

    }


    /*
    ==========================================
    Generate points
    ==========================================
    */

    function createPoints(
        key,
        cssClass
    ) {

        return points
            .map(
                (point, index) => `

                    <circle
                        cx="${getX(index)}"
                        cy="${getY(point[key])}"
                        r="4"
                        class="trend-point ${cssClass}"
                    />

                `
            )
            .join("");

    }


    /*
    ==========================================
    X-axis labels
    ==========================================
    */

    const maxLabels = 8;

    const step =
        Math.max(
            1,
            Math.ceil(
                points.length /
                maxLabels
            )
        );


    let labelsHTML = "";


    points.forEach(
        (point, index) => {

            if (
                index % step !== 0 &&
                index !== points.length - 1
            ) {

                return;

            }


            const x =
                getX(index);


            labelsHTML += `

                <text
                    x="${x}"
                    y="${height - 18}"
                    text-anchor="middle"
                    class="trend-axis-label"
                >
                    ${escapeHTML(
                formatTrendLabel(
                    point.label,
                    period
                )
            )}
                </text>

            `;

        }
    );


    /*
    ==========================================
    SVG
    ==========================================
    */

    container.innerHTML = `

        <svg
            class="trend-svg"
            viewBox="
                0
                0
                ${width}
                ${height}
            "
            preserveAspectRatio="none"
        >

            ${gridHTML}


            ${createLine(
        "total",
        "trend-total"
    )}

            ${createLine(
        "cyera",
        "trend-cyera"
    )}

            ${createLine(
        "purview",
        "trend-purview"
    )}


            ${createPoints(
        "total",
        "trend-total-point"
    )}

            ${createPoints(
        "cyera",
        "trend-cyera-point"
    )}

            ${createPoints(
        "purview",
        "trend-purview-point"
    )}


            ${labelsHTML}

        </svg>

    `;

}


/*
==========================================
TREND AXIS MAX
==========================================
*/

function getNiceMax(value) {

    if (value <= 10) {

        return 10;

    }


    const magnitude =
        Math.pow(
            10,
            Math.floor(
                Math.log10(value)
            )
        );


    const normalized =
        value / magnitude;


    let nice;


    if (normalized <= 1) {

        nice = 1;

    }
    else if (normalized <= 2) {

        nice = 2;

    }
    else if (normalized <= 5) {

        nice = 5;

    }
    else {

        nice = 10;

    }


    return nice * magnitude;

}


/*
==========================================
TREND LABEL
==========================================
*/

function formatTrendLabel(
    value,
    period
) {

    if (!value) {

        return "—";

    }


    if (period === "daily") {

        if (
            /^\d{8}$/.test(
                String(value)
            )
        ) {

            const year =
                value.substring(0, 4);

            const month =
                value.substring(4, 6);

            const day =
                value.substring(6, 8);


            return `${day}/${month}`;

        }


        return String(value);

    }


    if (period === "monthly") {

        if (
            /^\d{6}$/.test(
                String(value)
            )
        ) {

            const year =
                value.substring(0, 4);

            const month =
                value.substring(4, 6);


            const date =
                new Date(
                    Number(year),
                    Number(month) - 1,
                    1
                );


            return date.toLocaleDateString(
                "en-US",
                {
                    month: "short",
                    year: "numeric"
                }
            );

        }


        return String(value);

    }


    return String(value);

}


/*
==========================================
TREND PERIOD SWITCHER
==========================================
*/

function initializeTrendControls() {

    const buttons =
        document.querySelectorAll(
            ".trend-period"
        );


    if (!buttons.length) {

        return;

    }


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const period =
                        button.dataset.period;


                    buttons.forEach(
                        item =>
                            item.classList.toggle(
                                "active",
                                item === button
                            )
                    );


                    renderTrends(
                        period
                    );

                }
            );

        }
    );

}
/*
==========================================
SEVERITY
==========================================
*/

function renderSeverity(data) {

    const container =
        document.getElementById(
            "severity-container"
        );


    if (!container) {

        return;

    }


    let severity =
        data?.severity ||
        data?.severityBreakdown ||
        data?.cyera?.severity ||
        data?.cyera?.severityBreakdown;


    if (!severity) {

        container.innerHTML = `
            <div class="empty-state">
                No severity data available.
            </div>
        `;

        return;

    }


    /*
    ==========================================
    Convert severity object to array
    ==========================================
    */

    let items = [];


    if (Array.isArray(severity)) {

        items = severity;

    }
    else if (
        typeof severity === "object"
    ) {

        items =
            Object.entries(severity)
                .map(
                    ([key, value]) => ({

                        name: key,

                        count:
                            typeof value === "object"
                                ? (
                                    value.count ??
                                    value.total ??
                                    0
                                )
                                : value

                    })
                );

    }


    if (!items.length) {

        container.innerHTML = `
            <div class="empty-state">
                No severity data available.
            </div>
        `;

        return;

    }


    /*
    ==========================================
    Maximum value for bar width
    ==========================================
    */

    const max =
        Math.max(
            ...items.map(
                item =>
                    Number(
                        item.count || 0
                    )
            ),
            1
        );


    /*
    ==========================================
    Render severity rows
    ==========================================
    */

    container.innerHTML =
        items
            .map(item => {

                const name =
                    item.name ??
                    item.severity ??
                    "Unknown";


                const count =
                    Number(
                        item.count ??
                        item.total ??
                        0
                    );


                const percentage =
                    Math.round(
                        (
                            count / max
                        ) * 100
                    );


                return `

                    <div class="severity-row">

                        <div class="severity-info">

                            <span>
                                ${escapeHTML(name)}
                            </span>

                            <strong>
                                ${formatNumber(count)}
                            </strong>

                        </div>

                        <div class="severity-bar">

                            <div
                                class="severity-bar-fill"
                                style="width:${percentage}%"
                            ></div>

                        </div>

                    </div>

                `;

            })
            .join("");

}


/*
==========================================
LATEST REPORT
==========================================
*/

function renderLatestReport(data) {

    const container =
        document.getElementById(
            "latest-report"
        );


    if (!container) {

        return;

    }


    const report =
        data?.latestReport;


    if (!report) {

        container.innerHTML = `
            <div class="empty-state">
                No reports available.
            </div>
        `;

        return;

    }


    /*
    ==========================================
    REPORT ID
    ==========================================
    */

    const reportId =
        report.reportId ??
        report.report_id ??
        "—";


    /*
    ==========================================
    REPORT DATE
    ==========================================
    */

    const reportDate =
        report.reportDate ??
        report.report_date ??
        "—";


    /*
    ==========================================
    CYERA
    ==========================================
    */

    const cyera =
        Number(
            report.cyera ??
            report.cyeraCount ??
            report.cyera_count ??
            0
        );


    /*
    ==========================================
    PURVIEW
    ==========================================
    */

    const purview =
        Number(
            report.purview ??
            report.purviewCount ??
            report.purview_count ??
            0
        );


    /*
    ==========================================
    TOTAL
    ==========================================
    */

    const total =
        Number(
            report.total ??
            report.totalAlerts ??
            report.total_alerts ??
            (
                cyera +
                purview
            )
        );


    /*
    ==========================================
    RENDER
    ==========================================
    */

    container.innerHTML = `

        <div class="latest-report-id">

            <span>
                Report
            </span>

            <strong>
                ${escapeHTML(reportId)}
            </strong>

        </div>


        <div class="latest-report-date">

            ${formatDate(reportDate)}

        </div>


        <div class="latest-report-stats">

            <div>

                <span>
                    Cyera
                </span>

                <strong>
                    ${formatNumber(cyera)}
                </strong>

            </div>


            <div>

                <span>
                    Purview
                </span>

                <strong>
                    ${formatNumber(purview)}
                </strong>

            </div>


            <div>

                <span>
                    Total
                </span>

                <strong>
                    ${formatNumber(total)}
                </strong>

            </div>

        </div>

    `;

}
/*
==========================================
RECENT REPORTS
==========================================
*/

/*
==========================================
RECENT REPORTS
==========================================
*/

let currentReportsPage = 1;

const reportsPageLimit = 30;


function renderRecentReports(data) {

    const tbody =
        document.getElementById(
            "recent-reports"
        );

    if (!tbody) {
        return;
    }


    /*
    ==========================================
    INVALID RESPONSE
    ==========================================
    */

    if (!data || !data.success) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    Unable to load reports.
                </td>
            </tr>
        `;

        updateReportsPagination(null);

        return;
    }


    /*
    ==========================================
    GET REPORTS
    ==========================================
    */

    const reports =
        data.data ||
        data.reports ||
        [];


    /*
    ==========================================
    EMPTY STATE
    ==========================================
    */

    if (!reports.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    No reports found.
                </td>
            </tr>
        `;

        updateReportsPagination(
            data.pagination
        );

        return;
    }


    /*
    ==========================================
    RENDER REPORTS
    ==========================================
    */

    tbody.innerHTML =
        reports
            .map(report => {

                const reportId =
                    report.reportId ??
                    report.report_id ??
                    "—";


                const reportDate =
                    report.reportDate ??
                    report.report_date ??
                    "—";


                const cyera =
                    Number(
                        report.cyera ??
                        report.cyeraCount ??
                        report.cyera_count ??
                        0
                    );


                const purview =
                    Number(
                        report.purview ??
                        report.purviewCount ??
                        report.purview_count ??
                        0
                    );


                const total =
                    Number(
                        report.total ??
                        report.totalAlerts ??
                        report.total_alerts ??
                        (
                            cyera +
                            purview
                        )
                    );


                return `

                    <tr
                        class="report-row"
                        data-report-id="${escapeHTML(
                    String(reportId)
                )}"
                    >

                        <td>

                            <button
                                type="button"
                                class="report-link"
                                data-report-id="${escapeHTML(
                    String(reportId)
                )}"
                            >
                                ${escapeHTML(
                    String(reportId)
                )}
                            </button>

                        </td>


                        <td>

                            ${escapeHTML(
                    String(
                        formatDate(
                            reportDate
                        )
                    )
                )}

                        </td>


                        <td>

                            ${formatNumber(
                    cyera
                )}

                        </td>


                        <td>

                            ${formatNumber(
                    purview
                )}

                        </td>


                        <td>

                            <strong>
                                ${formatNumber(
                    total
                )}
                            </strong>

                        </td>

                    </tr>

                `;

            })
            .join("");


    /*
    ==========================================
    PAGINATION
    ==========================================
    */

    updateReportsPagination(
        data.pagination
    );


    /*
    ==========================================
    REPORT CLICK
    ==========================================
    */

    tbody
        .querySelectorAll(
            ".report-link"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    /*
                    Prevent the button click
                    from triggering the row click
                    if row click is added later.
                    */

                    event.stopPropagation();


                    const reportId =
                        button.dataset.reportId;


                    /*
                    Find the complete report
                    object that belongs to this
                    report ID.
                    */

                    const report =
                        reports.find(
                            item => {

                                const id =
                                    item.reportId ??
                                    item.report_id;

                                return String(id) ===
                                    String(reportId);

                            }
                        );


                    if (!report) {

                        console.warn(
                            "Report not found:",
                            reportId
                        );

                        return;
                    }


                    /*
                    Open the new Report Explorer
                    */

                    openReportExplorer(
                        report
                    );

                }
            );

        });


    /*
    ==========================================
    OPTIONAL ROW CLICK
    ==========================================
    
    Allows clicking anywhere on the row,
    not only the report ID.
    ==========================================
    */

    tbody
        .querySelectorAll(
            ".report-row"
        )
        .forEach(row => {

            row.addEventListener(
                "click",
                () => {

                    const reportId =
                        row.dataset.reportId;


                    const report =
                        reports.find(
                            item => {

                                const id =
                                    item.reportId ??
                                    item.report_id;

                                return String(id) ===
                                    String(reportId);

                            }
                        );


                    if (!report) {
                        return;
                    }


                    openReportExplorer(
                        report
                    );

                }
            );

        });

}
async function openReportExplorer(report) {

    window.reportExplorerState = {

        reportId:
            report.reportId ??
            report.report_id,

        reportDate:
            report.reportDate ??
            report.report_date,

        source: "cyera",

        page: 1,

        limit: 50,

        severity: "",

        status: "",

        assignedUser: "",

        search: "",

        total: 0,

        totalPages: 1

    };


    /*
    ==========================================
    UPDATE REPORT CONTEXT
    ==========================================
    */

    const reportIdElement =
        document.getElementById(
            "explorer-report-id"
        );

    if (reportIdElement) {

        reportIdElement.textContent =
            window.reportExplorerState.reportId;

    }


    const reportDateElement =
        document.getElementById(
            "explorer-report-date"
        );

    if (reportDateElement) {

        reportDateElement.textContent =
            formatDate(
                window.reportExplorerState.reportDate
            );

    }


    const sourceElement =
        document.getElementById(
            "explorer-source-name"
        );

    if (sourceElement) {

        sourceElement.textContent =
            "Cyera";

    }


    /*
    ==========================================
    RESET FILTER UI
    ==========================================
    */

    const searchInput =
        document.getElementById(
            "alert-search"
        );

    const severitySelect =
        document.getElementById(
            "alert-severity"
        );

    const statusSelect =
        document.getElementById(
            "alert-status"
        );

    const assignedUserInput =
        document.getElementById(
            "alert-assigned-user"
        );


    if (searchInput) {
        searchInput.value = "";
    }

    if (severitySelect) {
        severitySelect.value = "";
    }

    if (statusSelect) {
        statusSelect.value = "";
    }

    if (assignedUserInput) {
        assignedUserInput.value = "";
    }


    /*
    Reset source buttons
    */

    document
        .querySelectorAll(
            ".explorer-source"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.source === "cyera"
            );

        });


    /*
    ==========================================
    SHOW EXPLORER
    ==========================================
    */

    const explorer =
        document.getElementById(
            "report-explorer"
        );

    if (explorer) {

        explorer.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }


    /*
    ==========================================
    LOAD ALERTS
    ==========================================
    */

    await loadReportAlerts();

}
/* ==========================================
   LOAD REPORT ALERTS
========================================== */

async function loadReportAlerts() {

    const state =
        window.reportExplorerState;


    /*
    ==========================================
    VALIDATE STATE
    ==========================================
    */

    if (!state || !state.reportId) {

        console.warn(
            "Report Explorer state is missing."
        );

        return;

    }


    /*
    ==========================================
    GET TABLE
    ==========================================
    */

    const tbody =
        document.getElementById(
            "report-alerts"
        );


    if (!tbody) {

        console.warn(
            "report-alerts table body not found."
        );

        return;

    }


    /*
    ==========================================
    LOADING STATE
    ==========================================
    */

    tbody.innerHTML = `
        <tr>
            <td
                colspan="5"
                class="loading-state"
            >
                Loading alerts...
            </td>
        </tr>
    `;


    try {

        console.log(
            "Loading report alerts:",
            state
        );


        /*
        ==========================================
        API REQUEST
        ==========================================
        */

        const response =
            await ScoutReportAPI.getReportAlerts(
                state.reportId,
                {
                    source:
                        state.source,

                    severity:
                        state.severity,

                    status:
                        state.status,

                    assignedUser:
                        state.assignedUser,

                    search:
                        state.search,

                    page:
                        state.page,

                    limit:
                        state.limit
                }
            );


        console.log(
            "Report Alerts:",
            response
        );


        /*
        ==========================================
        STORE PAGINATION
        ==========================================
        */

        if (response?.pagination) {

            state.total =
                Number(
                    response.pagination.total || 0
                );

            state.totalPages =
                Number(
                    response.pagination.totalPages || 1
                );

        }


        /*
        ==========================================
        RENDER
        ==========================================
        */

        renderReportAlerts(
            response
        );


    }
    catch (error) {

        console.error(
            "Failed to load report alerts:",
            error
        );


        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    Failed to load alerts.
                </td>
            </tr>
        `;

    }

}
function renderReportAlerts(data) {

    const tbody =
        document.getElementById("report-alerts");

    if (!tbody) {
        console.warn(
            "Report alerts table not found."
        );
        return;
    }


    /*
    ==========================================
    INVALID RESPONSE
    ==========================================
    */

    if (!data || !data.success) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    Unable to load alerts.
                </td>
            </tr>
        `;

        if (
            typeof updateAlertsPagination ===
            "function"
        ) {
            updateAlertsPagination(
                data?.pagination
            );
        }

        return;
    }


    /*
    ==========================================
    GET ALERTS
    ==========================================
    */

    const alerts =
        Array.isArray(data.alerts)
            ? data.alerts
            : [];


    console.log(
        "Rendering alerts:",
        alerts
    );


    /*
    ==========================================
    UPDATE STATE
    ==========================================
    */

    if (window.reportExplorerState) {

        window.reportExplorerState.total =
            Number(
                data.pagination?.total || 0
            );

        window.reportExplorerState.totalPages =
            Number(
                data.pagination?.totalPages || 1
            );

    }


    /*
    ==========================================
    EMPTY
    ==========================================
    */

    if (alerts.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    No alerts found.
                </td>
            </tr>
        `;

        if (
            typeof updateAlertsPagination ===
            "function"
        ) {
            updateAlertsPagination(
                data.pagination
            );
        }

        return;
    }


    /*
    ==========================================
    RENDER
    ==========================================
    */

    tbody.innerHTML = alerts
        .map(alert => {

            /*
            ----------------------------------
            Alert name
            ----------------------------------
            */

            const alertName =
                alert?.name ??
                alert?.alert_name ??
                alert?.alertName ??
                alert?.alert_id ??
                "—";


            /*
            ----------------------------------
            Severity
            ----------------------------------
            */

            const severity =
                alert?.severity ??
                "—";


            /*
            ----------------------------------
            Status
            ----------------------------------
            */

            const status =
                alert?.status ??
                "—";


            /*
            ----------------------------------
            Assigned user
            ----------------------------------
            */

            const assignedUser =
                alert?.assigned_user_email ??
                alert?.assignedUserEmail ??
                alert?.assigned_user ??
                alert?.user ??
                "Unassigned";


            /*
            ----------------------------------
            Timestamp
            ----------------------------------
            */

            const timestamp =
                alert?.timestamp ??
                alert?.time_detected ??
                alert?.created_at ??
                alert?.updated_at ??
                "—";


            /*
            ----------------------------------
            CSS classes
            ----------------------------------
            */

            const severityClass =
                String(severity)
                    .toLowerCase()
                    .replace(/\s+/g, "-");


            const statusClass =
                String(status)
                    .toLowerCase()
                    .replace(/\s+/g, "-");


            /*
            ----------------------------------
            Alert ID
            ----------------------------------
            */

            const alertId =
                alert?.id ??
                alert?.alert_id ??
                alert?.alertId ??
                "";


            /*
            ----------------------------------
            RETURN ROW
            ----------------------------------
            */

            return `
                <tr
                    class="alert-row"
                    data-alert-id="${escapeHTML(
                        String(alertId)
                    )}"
                >

                    <td>

                        <div
                            class="alert-name"
                            title="${escapeHTML(
                                String(alertName)
                            )}"
                        >
                            ${escapeHTML(
                                String(alertName)
                            )}
                        </div>

                    </td>


                    <td>

                        <span
                            class="alert-badge ${escapeHTML(
                                severityClass
                            )}"
                        >
                            ${escapeHTML(
                                String(severity)
                            )}
                        </span>

                    </td>


                    <td>

                        <span
                            class="alert-badge ${escapeHTML(
                                statusClass
                            )}"
                        >
                            ${escapeHTML(
                                String(status)
                            )}
                        </span>

                    </td>


                    <td>

                        ${escapeHTML(
                            String(assignedUser)
                        )}

                    </td>


                    <td>

                        ${
                            typeof formatDateTime ===
                            "function"
                                ? escapeHTML(
                                    String(
                                        formatDateTime(
                                            timestamp
                                        )
                                    )
                                )
                                : escapeHTML(
                                    String(timestamp)
                                )
                        }

                    </td>

                </tr>
            `;

        })
        .join("");


    /*
    ==========================================
    PAGINATION
    ==========================================
    */

    if (
        typeof updateAlertsPagination ===
        "function"
    ) {

        updateAlertsPagination(
            data.pagination
        );

    }


    /*
    ==========================================
    ROW EVENTS
    ==========================================
    */

    tbody
        .querySelectorAll(".alert-row")
        .forEach(row => {

            row.addEventListener(
                "click",
                () => {

                    const alertId =
                        row.dataset.alertId;


                    const alert =
                        alerts.find(
                            item =>
                                String(
                                    item?.id ??
                                    item?.alert_id ??
                                    item?.alertId ??
                                    ""
                                ) ===
                                String(alertId)
                        );


                    if (!alert) {
                        return;
                    }


                    if (
                        typeof openAlertDetail ===
                        "function"
                    ) {

                        openAlertDetail(
                            alert
                        );

                    }

                }
            );

        });

}
/* ==========================================
   REPORT EXPLORER FILTERS
========================================== */

function initializeReportExplorerFilters() {

    const searchInput =
        document.getElementById("alert-search");

    const severitySelect =
        document.getElementById("alert-severity");

    const statusSelect =
        document.getElementById("alert-status");

    const assignedUserInput =
        document.getElementById("alert-assigned-user");

    const resetButton =
        document.getElementById("alert-filter-reset");


    /*
    ==========================================
    SOURCE TOGGLE
    ==========================================
    */

    document
        .querySelectorAll(".explorer-source")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const source =
                        button.dataset.source;

                    if (!source) {
                        return;
                    }


                    /*
                    Update active button
                    */

                    document
                        .querySelectorAll(
                            ".explorer-source"
                        )
                        .forEach(item => {

                            item.classList.toggle(
                                "active",
                                item === button
                            );

                        });


                    /*
                    Update state
                    */

                    if (
                        !window.reportExplorerState
                    ) {
                        return;
                    }

                    window.reportExplorerState.source =
                        source;

                    window.reportExplorerState.page =
                        1;


                    /*
                    Update source label
                    */

                    const sourceLabel =
                        document.getElementById(
                            "explorer-source-name"
                        );

                    if (sourceLabel) {

                        sourceLabel.textContent =
                            source === "cyera"
                                ? "Cyera"
                                : "Purview";

                    }


                    /*
                    Load filtered data
                    */

                    await loadReportAlerts();

                }
            );

        });


    /*
    ==========================================
    SEVERITY
    ==========================================
    */

    if (severitySelect) {

        severitySelect.addEventListener(
            "change",
            async () => {

                if (
                    !window.reportExplorerState
                ) {
                    return;
                }


                window.reportExplorerState.severity =
                    severitySelect.value;

                window.reportExplorerState.page =
                    1;


                await loadReportAlerts();

            }
        );

    }


    /*
    ==========================================
    STATUS
    ==========================================
    */

    if (statusSelect) {

        statusSelect.addEventListener(
            "change",
            async () => {

                if (
                    !window.reportExplorerState
                ) {
                    return;
                }


                window.reportExplorerState.status =
                    statusSelect.value;

                window.reportExplorerState.page =
                    1;


                await loadReportAlerts();

            }
        );

    }


    /*
    ==========================================
    ASSIGNED USER
    ==========================================
    */

    if (assignedUserInput) {

        assignedUserInput.addEventListener(
            "change",
            async () => {

                if (
                    !window.reportExplorerState
                ) {
                    return;
                }


                window.reportExplorerState.assignedUser =
                    assignedUserInput.value.trim();

                window.reportExplorerState.page =
                    1;


                await loadReportAlerts();

            }
        );

    }


    /*
    ==========================================
    SEARCH
    ==========================================
    */

    if (searchInput) {

        searchInput.addEventListener(
            "keydown",
            async event => {

                if (event.key !== "Enter") {
                    return;
                }


                if (
                    !window.reportExplorerState
                ) {
                    return;
                }


                window.reportExplorerState.search =
                    searchInput.value.trim();

                window.reportExplorerState.page =
                    1;


                await loadReportAlerts();

            }
        );

    }


    /*
    ==========================================
    RESET
    ==========================================
    */

    if (resetButton) {

        resetButton.addEventListener(
            "click",
            async () => {

                if (
                    !window.reportExplorerState
                ) {
                    return;
                }


                /*
                Reset inputs
                */

                if (searchInput) {
                    searchInput.value = "";
                }

                if (severitySelect) {
                    severitySelect.value = "";
                }

                if (statusSelect) {
                    statusSelect.value = "";
                }

                if (assignedUserInput) {
                    assignedUserInput.value = "";
                }


                /*
                Reset state
                */

                window.reportExplorerState.severity =
                    "";

                window.reportExplorerState.status =
                    "";

                window.reportExplorerState.assignedUser =
                    "";

                window.reportExplorerState.search =
                    "";

                window.reportExplorerState.page =
                    1;


                /*
                Reload everything
                */

                await loadReportAlerts();

            }
        );

    }


    /*
    ==========================================
    PAGINATION
    ==========================================
    */

    const previousButton =
        document.getElementById(
            "alerts-prev"
        );

    const nextButton =
        document.getElementById(
            "alerts-next"
        );


    if (previousButton) {

        previousButton.addEventListener(
            "click",
            async () => {

                const state =
                    window.reportExplorerState;

                if (!state) {
                    return;
                }


                if (state.page <= 1) {
                    return;
                }


                state.page--;

                await loadReportAlerts();

            }
        );

    }


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            async () => {

                const state =
                    window.reportExplorerState;

                if (!state) {
                    return;
                }


                const currentPage =
                    state.page || 1;


                const totalPages =
                    state.totalPages || 1;


                if (
                    currentPage >= totalPages
                ) {
                    return;
                }


                state.page++;

                await loadReportAlerts();

            }
        );

    }

}
/* ==========================================
   REPORT ALERTS RENDERER
========================================== */

function renderReportAlerts(data) {

    const tbody =
        document.getElementById(
            "report-alerts"
        );

    if (!tbody) {
        return;
    }


    /*
    ==========================================
    INVALID RESPONSE
    ==========================================
    */

    if (!data || !data.success) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    Unable to load alerts.
                </td>
            </tr>
        `;

        if (
            typeof updateAlertsPagination ===
            "function"
        ) {
            updateAlertsPagination(null);
        }

        return;
    }


    /*
    ==========================================
    GET ALERTS
    ==========================================
    */

    const alerts =
        Array.isArray(data.alerts)
            ? data.alerts
            : Array.isArray(data.data)
                ? data.data
                : [];


    /*
    ==========================================
    UPDATE EXPLORER STATE
    ==========================================
    */

    if (window.reportExplorerState) {

        window.reportExplorerState.total =
            Number(
                data.pagination?.total || 0
            );

        window.reportExplorerState.totalPages =
            Number(
                data.pagination?.totalPages || 1
            );

    }


    /*
    ==========================================
    EMPTY STATE
    ==========================================
    */

    if (!alerts.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    No alerts found for this report.
                </td>
            </tr>
        `;

        if (
            typeof updateAlertsPagination ===
            "function"
        ) {
            updateAlertsPagination(
                data.pagination
            );
        }

        return;
    }


    /*
    ==========================================
    RENDER ALERTS
    ==========================================
    */

    tbody.innerHTML =
        alerts
            .map(
                (alert, index) => {

                    /*
                    ----------------------------------
                    Alert name
                    ----------------------------------
                    */

                    const alertName =
                        alert?.name ??
                        alert?.alert_name ??
                        alert?.alertName ??
                        alert?.alert_id ??
                        "—";


                    /*
                    ----------------------------------
                    Severity
                    ----------------------------------
                    */

                    const severity =
                        alert?.severity ??
                        "Unknown";


                    /*
                    ----------------------------------
                    Status
                    ----------------------------------
                    */

                    const status =
                        alert?.status ??
                        "Unknown";


                    /*
                    ----------------------------------
                    Assigned user

                    Cyera:
                    assigned_user_email

                    Purview:
                    user
                    ----------------------------------
                    */

                    const assignedUser =
                        alert?.assigned_user_email ??
                        alert?.assignedUser ??
                        alert?.user ??
                        "Unassigned";


                    /*
                    ----------------------------------
                    Timestamp

                    Cyera:
                    timestamp

                    Purview:
                    time_detected
                    ----------------------------------
                    */

                    const timestamp =
                        alert?.timestamp ??
                        alert?.time_detected ??
                        alert?.created_at ??
                        alert?.updated_at ??
                        "—";


                    /*
                    ----------------------------------
                    Badge classes
                    ----------------------------------
                    */

                    const severityClass =
                        String(severity)
                            .toLowerCase()
                            .replace(
                                /\s+/g,
                                "-"
                            );


                    const statusClass =
                        String(status)
                            .toLowerCase()
                            .replace(
                                /\s+/g,
                                "-"
                            );


                    /*
                    ----------------------------------
                    RETURN ROW
                    ----------------------------------
                    */

                    return `

                        <tr
                            class="alert-detail-row"
                            data-alert-index="${index}"
                        >

                            <td>

                                <div
                                    class="alert-name"
                                    title="${escapeHTML(
                                        String(
                                            alertName
                                        )
                                    )}"
                                >
                                    ${escapeHTML(
                                        String(
                                            alertName
                                        )
                                    )}
                                </div>

                            </td>


                            <td>

                                <span
                                    class="alert-badge ${escapeHTML(
                                        severityClass
                                    )}"
                                >
                                    ${escapeHTML(
                                        String(
                                            severity
                                        )
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="alert-badge ${escapeHTML(
                                        statusClass
                                    )}"
                                >
                                    ${escapeHTML(
                                        String(
                                            status
                                        )
                                    )}
                                </span>

                            </td>


                            <td>

                                ${escapeHTML(
                                    String(
                                        assignedUser
                                    )
                                )}

                            </td>


                            <td>

                                ${escapeHTML(
                                    String(
                                        typeof formatDate ===
                                            "function"
                                            ? formatDate(
                                                timestamp
                                            )
                                            : timestamp
                                    )
                                )}

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    /*
    ==========================================
    PAGINATION
    ==========================================
    */

    if (
        typeof updateAlertsPagination ===
        "function"
    ) {

        updateAlertsPagination(
            data.pagination
        );

    }


    /*
    ==========================================
    ALERT CLICK
    ==========================================
    */

    tbody
        .querySelectorAll(
            ".alert-detail-row"
        )
        .forEach(row => {

            row.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            row.dataset
                                .alertIndex
                        );


                    const alert =
                        alerts[index];


                    if (!alert) {
                        return;
                    }


                    /*
                    Open alert details
                    only if the function exists.
                    */

                    if (
                        typeof openAlertDetails ===
                        "function"
                    ) {

                        openAlertDetails(
                            alert
                        );

                    }

                }
            );

        });

}
function formatDateTime(value) {

    if (!value) {
        return "—";
    }

    try {

        return new Date(value)
            .toLocaleString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

    } catch {

        return String(value);

    }

}

/* ==========================================
   ALERT DETAIL EVENTS
========================================== */

function initializeAlertDetail() {

    const closeButton =
        document.getElementById(
            "alert-detail-close"
        );

    const overlay =
        document.querySelector(
            ".alert-detail-overlay"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeAlertDetails
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeAlertDetails
        );

    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeAlertDetails();

            }

        }
    );

}
/* ==========================================
   ALERT PAGINATION
========================================== */

function updateAlertsPagination(pagination) {

    const pageElement =
        document.getElementById(
            "alerts-page"
        );

    const previousButton =
        document.getElementById(
            "alerts-prev"
        );

    const nextButton =
        document.getElementById(
            "alerts-next"
        );


    if (!pagination) {

        if (pageElement) {
            pageElement.textContent =
                "Page 1";
        }

        if (previousButton) {
            previousButton.disabled = true;
        }

        if (nextButton) {
            nextButton.disabled = true;
        }

        return;
    }


    const page =
        Number(
            pagination.page || 1
        );

    const totalPages =
        Number(
            pagination.totalPages || 1
        );


    if (pageElement) {

        pageElement.textContent =
            `Page ${page} of ${totalPages}`;

    }


    if (previousButton) {

        previousButton.disabled =
            !pagination.hasPreviousPage;

    }


    if (nextButton) {

        nextButton.disabled =
            !pagination.hasNextPage;

    }

}

/* ==========================================
   ALERT DETAIL
========================================== */

function openAlertDetails(alert) {

    const modal =
        document.getElementById(
            "alert-detail-modal"
        );

    const content =
        document.getElementById(
            "alert-detail-content"
        );

    const title =
        document.getElementById(
            "alert-detail-title"
        );


    if (!modal || !content) {
        return;
    }


    /*
    ==========================================
    SOURCE
    ==========================================
    */

    const source =
        String(
            alert?.source ??
            window.reportExplorerState?.source ??
            "cyera"
        ).toLowerCase();


    /*
    ==========================================
    ALERT NAME
    ==========================================
    */

    const alertName =
        alert?.name ??
        alert?.alert_name ??
        alert?.alertName ??
        "Alert";


    if (title) {

        title.textContent =
            String(alertName);

    }


    /*
    ==========================================
    CYERA
    ==========================================
    */

    if (source === "cyera") {

        content.innerHTML = `

            ${createDetailSection(
                "Overview",
                [

                    [
                        "Alert ID",
                        alert?.alert_id
                    ],

                    [
                        "Severity",
                        createBadge(
                            alert?.severity
                        )
                    ],

                    [
                        "Status",
                        createBadge(
                            alert?.status
                        )
                    ],

                    [
                        "Detected",
                        alert?.timestamp
                    ],

                    [
                        "Updated",
                        alert?.updated_at
                    ],

                    [
                        "Status Updated",
                        alert?.status_updated_at
                    ]

                ],
                true
            )}


            ${createDetailSection(
                "Assignment",
                [

                    [
                        "Assigned User",
                        alert?.assigned_user_email
                    ],

                    [
                        "Assigned User ID",
                        alert?.assigned_user_id
                    ]

                ]
            )}


            ${createDetailSection(
                "Users",
                [

                    [
                        "Triggering User",
                        alert?.triggering_user
                    ],

                    [
                        "Authenticated User",
                        alert?.authenticated_user
                    ]

                ]
            )}


            ${createDetailSection(
                "Policy",
                [

                    [
                        "Policy ID",
                        alert?.policy_id
                    ],

                    [
                        "Policy Name",
                        alert?.policy_name
                    ],

                    [
                        "Policy Type",
                        alert?.policy_type
                    ],

                    [
                        "Policy Action",
                        alert?.policy_action
                    ]

                ]
            )}


            ${createDetailSection(
                "Activity",
                [

                    [
                        "Channel",
                        alert?.channel
                    ],

                    [
                        "Source Activity",
                        alert?.source_activity
                    ],

                    [
                        "Actual Action",
                        alert?.actual_action
                    ],

                    [
                        "Configured Action",
                        alert?.configured_action
                    ],

                    [
                        "Data Type",
                        alert?.data_type
                    ]

                ]
            )}

        `;

    }


    /*
    ==========================================
    PURVIEW
    ==========================================
    */

    else {

        content.innerHTML = `

            ${createDetailSection(
                "Overview",
                [

                    [
                        "Alert Name",
                        alert?.alert_name
                    ],

                    [
                        "Severity",
                        createBadge(
                            alert?.severity
                        )
                    ],

                    [
                        "Status",
                        createBadge(
                            alert?.status
                        )
                    ],

                    [
                        "Detected",
                        alert?.time_detected
                    ]

                ],
                true
            )}


            ${createDetailSection(
                "User",
                [

                    [
                        "User",
                        alert?.user
                    ],

                    [
                        "Location",
                        alert?.location
                    ]

                ]
            )}

        `;

    }


    /*
    ==========================================
    SHOW MODAL
    ==========================================
    */

    modal.classList.add(
        "visible"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

}

/* ==========================================
   CLOSE ALERT DETAILS
========================================== */

function closeAlertDetails() {

    const modal =
        document.getElementById(
            "alert-detail-modal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "visible"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );

}


/* ==========================================
   DETAIL SECTION
========================================== */

function createDetailSection(
    title,
    rows,
    allowHTML = false
) {

    return `

        <section class="detail-section">

            <div class="detail-section-title">
                ${escapeHTML(
                    String(title)
                )}
            </div>


            <div class="detail-grid">

                ${rows
                    .map(row => {

                        const label =
                            row?.[0] ??
                            "—";

                        const value =
                            row?.[1] ??
                            "—";


                        return `

                            <div class="detail-item">

                                <div class="detail-label">
                                    ${escapeHTML(
                                        String(label)
                                    )}
                                </div>

                                <div class="detail-value">

                                    ${
                                        allowHTML &&
                                        typeof value === "string" &&
                                        value.trim().startsWith("<")
                                            ? value
                                            : escapeHTML(
                                                String(value)
                                            )
                                    }

                                </div>

                            </div>

                        `;

                    })
                    .join("")}

            </div>

        </section>

    `;
}

/* ==========================================
   BADGE
========================================== */

function createBadge(value) {

    const text =
        value ??
        "Unknown";


    const className =
        String(text)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-");


    return `
        <span class="alert-badge ${escapeHTML(className)}">
            ${escapeHTML(
                String(text)
            )}
        </span>
    `;
}

/* ==========================================
   RISK & ANALYST INSIGHTS
========================================== */

function renderRiskInsights(data) {

    if (!data || !data.success) {
        console.warn(
            "Invalid analytics data for insights:",
            data
        );
        return;
    }

    const cyera =
        data.cyera || {};

    const purview =
        data.purview || {};


    /*
    ==========================================
    HELPERS
    ==========================================
    */

    function getCount(items, name, field) {

        if (!Array.isArray(items)) {
            return 0;
        }

        const item =
            items.find(entry =>
                String(
                    entry?.[field] ?? ""
                ).toLowerCase() ===
                String(name).toLowerCase()
            );

        return Number(
            item?.count ?? 0
        );
    }


    /*
    ==========================================
    SEVERITY COUNTS
    ==========================================
    */

    const cyeraCritical =
        getCount(
            cyera.severity,
            "critical",
            "severity"
        );

    const cyeraHigh =
        getCount(
            cyera.severity,
            "high",
            "severity"
        );

    const purviewHigh =
        getCount(
            purview.severity,
            "high",
            "severity"
        );

    const purviewMedium =
        getCount(
            purview.severity,
            "medium",
            "severity"
        );

    const purviewLow =
        getCount(
            purview.severity,
            "low",
            "severity"
        );


    const totalCritical =
        cyeraCritical;

    const totalHigh =
        cyeraHigh +
        purviewHigh;


    /*
    ==========================================
    STATUS COUNTS
    ==========================================
    */

    const cyeraOpen =
        getCount(
            cyera.status,
            "open",
            "status"
        );

    const purviewActive =
        getCount(
            purview.status,
            "active",
            "status"
        );

    const purviewInvestigating =
        getCount(
            purview.status,
            "investigating",
            "status"
        );

    const purviewResolved =
        getCount(
            purview.status,
            "resolved",
            "status"
        );


    const totalOpen =
        cyeraOpen +
        purviewActive +
        purviewInvestigating;


    /*
    ==========================================
    RISK ACCEPTED
    ==========================================

    Current API response does not expose
    Risk Accepted status.

    Therefore we explicitly show 0
    rather than guessing.
    */

    const riskAccepted = 0;


    /*
    ==========================================
    SUMMARY CARDS
    ==========================================
    */

    setText(
        "insight-critical",
        formatNumber(
            totalCritical
        )
    );


    setText(
        "insight-high",
        formatNumber(
            totalHigh
        )
    );


    setText(
        "insight-open",
        formatNumber(
            totalOpen
        )
    );


    setText(
        "insight-risk-accepted",
        formatNumber(
            riskAccepted
        )
    );


    /*
    ==========================================
    TOP USERS
    ==========================================
    */

    renderTopUsers(
        cyera.assignedUsers
    );


    /*
    ==========================================
    POLICIES

    No policy information is currently
    returned by the analytics endpoint.
    ==========================================
    */

    renderTopPolicies(
        null
    );


    /*
    ==========================================
    ATTENTION REQUIRED
    ==========================================
    */

    renderAttentionInsights({

        totalCritical,

        totalHigh,

        totalOpen,

        riskAccepted,

        cyeraOpen,

        purviewActive,

        purviewInvestigating,

        purviewResolved,

        cyeraCritical,

        cyeraHigh,

        purviewHigh,

        purviewMedium,

        purviewLow

    });

}
function renderSourceComparison(data) {

    const container =
        document.getElementById(
            "source-comparison"
        );

    if (!container) {
        return;
    }


    if (!data || !data.success) {

        container.innerHTML = `
            <div class="empty-state">
                Source data unavailable.
            </div>
        `;

        return;
    }


    const cyeraTotal =
        Number(
            data.cyera?.total ??
            data.totals?.cyera ??
            0
        );


    const purviewTotal =
        Number(
            data.purview?.total ??
            data.totals?.purview ??
            0
        );


    /*
    ==========================================
    SEVERITY
    ==========================================
    */

    const getSeverityCount =
        (
            severityData,
            severityName
        ) => {

            const item =
                severityData.find(
                    entry =>
                        String(
                            entry.severity || ""
                        ).toLowerCase() ===
                        severityName
                );

            return Number(
                item?.count || 0
            );
        };


    const cyeraSeverity =
        data.cyera?.severity || [];

    const purviewSeverity =
        data.purview?.severity || [];


    const cyeraCritical =
        getSeverityCount(
            cyeraSeverity,
            "critical"
        );


    const cyeraHigh =
        getSeverityCount(
            cyeraSeverity,
            "high"
        );


    const purviewCritical =
        getSeverityCount(
            purviewSeverity,
            "critical"
        );


    const purviewHigh =
        getSeverityCount(
            purviewSeverity,
            "high"
        );


    const cyeraHighCritical =
        cyeraCritical +
        cyeraHigh;


    const purviewHighCritical =
        purviewCritical +
        purviewHigh;


    /*
    ==========================================
    STATUS
    ==========================================
    */

    const getStatusCount =
        (
            statusData,
            statusNames
        ) => {

            return statusData
                .filter(entry =>
                    statusNames.includes(
                        String(
                            entry.status || ""
                        ).toLowerCase()
                    )
                )
                .reduce(
                    (total, entry) =>
                        total +
                        Number(
                            entry.count || 0
                        ),
                    0
                );

        };


    const cyeraActive =
        getStatusCount(
            data.cyera?.status || [],
            [
                "open",
                "active",
                "investigating"
            ]
        );


    const purviewActive =
        getStatusCount(
            data.purview?.status || [],
            [
                "open",
                "active",
                "investigating"
            ]
        );


    /*
    ==========================================
    TOTAL SHARE
    ==========================================
    */

    const total =
        cyeraTotal +
        purviewTotal;


    const cyeraShare =
        total > 0
            ? Math.round(
                (
                    cyeraTotal /
                    total
                ) * 100
            )
            : 0;


    const purviewShare =
        total > 0
            ? Math.round(
                (
                    purviewTotal /
                    total
                ) * 100
            )
            : 0;


    /*
    ==========================================
    RENDER
    ==========================================
    */

    container.innerHTML = `

        <!-- CYERA -->

        <div class="source-column cyera">

            <div class="source-column-header">

                <div>

                    <span class="source-name">
                        Cyera
                    </span>

                    <span class="source-share">
                        ${cyeraShare}% of alerts
                    </span>

                </div>

                <strong>
                    ${formatNumber(cyeraTotal)}
                </strong>

            </div>


            <div class="source-progress">

                <div
                    class="source-progress-fill cyera"
                    style="width:${cyeraShare}%"
                ></div>

            </div>


            <div class="source-metrics">

                <div class="source-metric">

                    <span>
                        High / Critical
                    </span>

                    <strong>
                        ${formatNumber(
                            cyeraHighCritical
                        )}
                    </strong>

                </div>


                <div class="source-metric">

                    <span>
                        Active
                    </span>

                    <strong>
                        ${formatNumber(
                            cyeraActive
                        )}
                    </strong>

                </div>

            </div>

        </div>


        <!-- PURVIEW -->

        <div class="source-column purview">

            <div class="source-column-header">

                <div>

                    <span class="source-name">
                        Purview
                    </span>

                    <span class="source-share">
                        ${purviewShare}% of alerts
                    </span>

                </div>

                <strong>
                    ${formatNumber(purviewTotal)}
                </strong>

            </div>


            <div class="source-progress">

                <div
                    class="source-progress-fill purview"
                    style="width:${purviewShare}%"
                ></div>

            </div>


            <div class="source-metrics">

                <div class="source-metric">

                    <span>
                        High / Critical
                    </span>

                    <strong>
                        ${formatNumber(
                            purviewHighCritical
                        )}
                    </strong>

                </div>


                <div class="source-metric">

                    <span>
                        Active
                    </span>

                    <strong>
                        ${formatNumber(
                            purviewActive
                        )}
                    </strong>

                </div>

            </div>

        </div>

    `;

}

/* ==========================================
   TOP USERS
========================================== */

function renderTopUsers(users) {

    const container =
        document.getElementById(
            "top-users"
        );

    if (!container) {
        return;
    }


    if (!Array.isArray(users) ||
        !users.length) {

        container.innerHTML = `
            <div class="empty-state">
                No user assignment data available.
            </div>
        `;

        return;
    }


    const sorted =
        [...users]
            .sort(
                (a, b) =>
                    Number(b.count ?? 0) -
                    Number(a.count ?? 0)
            )
            .slice(0, 5);


    container.innerHTML =
        sorted
            .map((item, index) => {

                const user =
                    item.assigned_user ??
                    item.assignedUser ??
                    "Unassigned";

                const count =
                    Number(
                        item.count ?? 0
                    );


                return `

                    <div class="insight-list-row">

                        <div class="insight-rank">
                            ${index + 1}
                        </div>

                        <div class="insight-item-main">

                            <span class="insight-item-name">
                                ${escapeHTML(
                                    String(user)
                                )}
                            </span>

                            <span class="insight-item-meta">
                                Assigned alerts
                            </span>

                        </div>

                        <strong class="insight-item-count">
                            ${formatNumber(count)}
                        </strong>

                    </div>

                `;

            })
            .join("");
}


/* ==========================================
   TOP POLICIES
========================================== */

function renderTopPolicies(policies) {

    const container =
        document.getElementById(
            "top-policies"
        );

    if (!container) {
        return;
    }


    /*
    The current analytics endpoint
    does not return policy information.
    */

    if (!Array.isArray(policies) ||
        !policies.length) {

        container.innerHTML = `

            <div class="insight-unavailable">

                <span class="insight-unavailable-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.6 8.7 8 10 4.4-1.3 8-5 8-10V6l-8-3Z"/><path d="M9.5 12l1.8 1.8L15 10"/></svg></span>

                <div>

                    <strong>
                        Policy analytics unavailable
                    </strong>

                    <span>
                        Policy-level data is not included
                        in the current analytics response.
                    </span>

                </div>

            </div>

        `;

        return;
    }
}


/* ==========================================
   ATTENTION REQUIRED
========================================== */

function renderAttentionInsights(stats) {

    const container =
        document.getElementById(
            "attention-required"
        );

    if (!container) {
        return;
    }


    const insights = [];


    /*
    Critical alerts
    */

    if (stats.totalCritical > 0) {

        insights.push({

            type: "critical",

            title:
                `${formatNumber(
                    stats.totalCritical
                )} critical alerts require attention`,

            description:
                "Critical severity alerts are currently present in the environment."

        });

    }


    /*
    High severity
    */

    if (stats.totalHigh > 0) {

        insights.push({

            type: "high",

            title:
                `${formatNumber(
                    stats.totalHigh
                )} high-severity alerts identified`,

            description:
                `Cyera: ${formatNumber(
                    stats.cyeraHigh
                )} · Purview: ${formatNumber(
                    stats.purviewHigh
                )}`

        });

    }


    /*
    Open / active workload
    */

    if (stats.totalOpen > 0) {

        insights.push({

            type: "open",

            title:
                `${formatNumber(
                    stats.totalOpen
                )} alerts remain active`,

            description:
                `Cyera open: ${formatNumber(
                    stats.cyeraOpen
                )} · Purview active/investigating: ${formatNumber(
                    stats.purviewActive +
                    stats.purviewInvestigating
                )}`

        });

    }


    /*
    Purview workflow
    */

    if (stats.purviewInvestigating > 0) {

        insights.push({

            type: "investigating",

            title:
                `${formatNumber(
                    stats.purviewInvestigating
                )} Purview alerts are under investigation`,

            description:
                `${formatNumber(
                    stats.purviewResolved
                )} Purview alerts are already resolved.`

        });

    }


    /*
    Empty state
    */

    if (!insights.length) {

        container.innerHTML = `

            <div class="attention-empty">

                No immediate attention items.

            </div>

        `;

        return;
    }


    container.innerHTML =
        insights
            .map(item => `

                <div
                    class="attention-item ${escapeHTML(
                        item.type
                    )}"
                >

                    <span class="attention-indicator"></span>

                    <div class="attention-content">

                        <strong>
                            ${escapeHTML(
                                item.title
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                item.description
                            )}
                        </span>

                    </div>

                </div>

            `)
            .join("");
}

/* ==========================================
   DATE / TIME FORMATTER
========================================== */

function formatDateTime(value) {

    if (!value || value === "—") {
        return "—";
    }

    try {

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(value);

        }

        return date.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    } catch (error) {

        return String(value);

    }

}
/*
==========================================
REPORT PAGINATION
==========================================
*/

function updateReportsPagination(
    pagination
) {

    const previousButton =
        document.getElementById(
            "reports-prev"
        );

    const nextButton =
        document.getElementById(
            "reports-next"
        );

    const pageInfo =
        document.getElementById(
            "reports-page-info"
        );


    if (
        !previousButton ||
        !nextButton ||
        !pageInfo
    ) {

        return;

    }


    if (!pagination) {

        previousButton.disabled = true;

        nextButton.disabled = true;

        pageInfo.textContent =
            "Page 1";

        return;

    }


    const page =
        Number(
            pagination.page ||
            currentReportsPage
        );


    const totalPages =
        Number(
            pagination.totalPages ||
            1
        );


    currentReportsPage =
        page;


    previousButton.disabled =
        !pagination.hasPreviousPage;


    nextButton.disabled =
        !pagination.hasNextPage;


    pageInfo.textContent =
        `Page ${page} of ${totalPages}`;

}
/*
==========================================
LOAD REPORT PAGE
==========================================
*/

async function loadReportsPage(
    page
) {

    try {

        const reports =
            await ScoutReportAPI.getReports({

                page,

                limit:
                    reportsPageLimit

            });


        console.log(
            `Reports Page ${page}:`,
            reports
        );


        renderRecentReports(
            reports
        );


    }
    catch (error) {

        console.error(
            "Failed to load reports:",
            error
        );

    }

}
/*
==========================================
REPORT PAGINATION CONTROLS
==========================================
*/

function initializeReportsPagination() {

    const previousButton =
        document.getElementById(
            "reports-prev"
        );

    const nextButton =
        document.getElementById(
            "reports-next"
        );


    if (previousButton) {

        previousButton.addEventListener(
            "click",
            () => {

                if (
                    currentReportsPage > 1
                ) {

                    loadReportsPage(
                        currentReportsPage - 1
                    );

                }

            }
        );

    }


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            () => {

                loadReportsPage(
                    currentReportsPage + 1
                );

            }
        );

    }

}
/*
==========================================
LAST UPDATED
==========================================
*/

function renderLastUpdated(data) {

    const element =
        document.getElementById(
            "last-updated"
        );

    if (!element) {

        return;

    }


    const date =
        data?.generatedAt;


    if (!date) {

        element.textContent =
            "Updated just now";

        return;

    }


    element.textContent =
        `Updated ${formatDateTime(date)}`;

}


/*
==========================================
HELPERS
==========================================
*/

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (!element) {

        return;

    }

    element.textContent =
        value;

}


function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString("en-US");

}


function formatDate(value) {

    if (!value) {

        return "—";

    }


    const text =
        String(value);


    /*
    YYYYMMDD
    */

    if (
        /^\d{8}$/.test(text)
    ) {

        return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return text;

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


function formatDateTime(value) {

    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleString(
        "en-IN",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );

}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/*
==========================================
EXPORT
==========================================
*/

window.loadDashboardData =
    loadDashboardData;

window.renderSummary =
    renderSummary;

window.renderSeverity =
    renderSeverity;

window.renderLatestReport =
    renderLatestReport;

window.renderRecentReports =
    renderRecentReports;