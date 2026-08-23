/*
==========================================
Scout Report Generator
Frontend API Service
==========================================
*/

const API_BASE_URL =
    "https://dailyreportgenbackend.adityakumarsahu108.workers.dev";


/*
==========================================
Generic API Request
==========================================
*/

async function apiRequest(
    endpoint,
    options = {}
) {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}${endpoint}`,
                {
                    ...options,

                    headers: {
                        "Content-Type":
                            "application/json",

                        ...(options.headers || {})
                    }
                }
            );


        let data;

        try {

            data =
                await response.json();

        } catch {

            throw new Error(
                "Server returned an invalid response."
            );
        }


        if (
            !response.ok ||
            data.success === false
        ) {

            throw new Error(
                data.error ||
                `Request failed with status ${response.status}`
            );
        }


        return data;

    } catch (error) {

        throw new Error(
            error?.message ||
            "Unable to connect to the API."
        );
    }
}


/*
==========================================
GET REPORTS
==========================================

Supports:

?page=1
?limit=20
?from=20260801
?to=20260831
==========================================
*/

async function getReports({
    page = 1,
    limit = 20,
    from = null,
    to = null
} = {}) {

    const params =
        new URLSearchParams();


    params.set(
        "page",
        page
    );


    params.set(
        "limit",
        limit
    );


    if (from) {

        params.set(
            "from",
            from
        );
    }


    if (to) {

        params.set(
            "to",
            to
        );
    }


    return apiRequest(
        `/api/v1/reports?${params.toString()}`
    );
}


/*
==========================================
GET SINGLE REPORT
==========================================
*/

async function getReport(
    reportId
) {

    return apiRequest(
        `/api/v1/reports/${encodeURIComponent(reportId)}`
    );
}


/*
==========================================
GET REPORT ALERTS
==========================================

Supports:

source
severity
status
assignedUser
search
page
limit
==========================================
*/

async function getReportAlerts(
    reportId,
    {
        source = null,
        severity = null,
        status = null,
        assignedUser = null,
        search = null,
        page = 1,
        limit = 50
    } = {}
) {

    const params =
        new URLSearchParams();


    if (source) {

        params.set(
            "source",
            source
        );
    }


    if (severity) {

        params.set(
            "severity",
            severity
        );
    }


    if (status) {

        params.set(
            "status",
            status
        );
    }


    if (assignedUser) {

        params.set(
            "assignedUser",
            assignedUser
        );
    }


    if (search) {

        params.set(
            "search",
            search
        );
    }


    params.set(
        "page",
        page
    );


    params.set(
        "limit",
        limit
    );


    return apiRequest(
        `/api/v1/reports/${encodeURIComponent(reportId)}/alerts?${params.toString()}`
    );
}


/*
==========================================
ANALYTICS SUMMARY
==========================================
*/

async function getAnalyticsSummary() {

    return apiRequest(
        "/api/v1/analytics/summary"
    );
}


/*
==========================================
ANALYTICS TRENDS
==========================================

period:

daily
monthly
quarterly
==========================================
*/

async function getAnalyticsTrends(
    period = "daily"
) {

    const params =
        new URLSearchParams();


    params.set(
        "period",
        period
    );


    return apiRequest(
        `/api/v1/analytics/trends?${params.toString()}`
    );
}


/*
==========================================
CREATE REPORT
==========================================

Used later when the frontend
uploads/creates a daily report.
==========================================
*/

async function createReport(
    reportData
) {

    return apiRequest(
        "/api/v1/reports",
        {
            method: "POST",

            body:
                JSON.stringify(
                    reportData
                )
        }
    );
}

window.ScoutReportAPI = {
    createReport,
    getReports,
    getReport,
    getReportAlerts,
    getAnalyticsSummary,
    getAnalyticsTrends
};