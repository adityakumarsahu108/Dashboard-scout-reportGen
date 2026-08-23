/*
==========================================
Scout Report Generator
Frontend Application
==========================================
*/


/*
==========================================
START APPLICATION
==========================================
*/

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Dashboard application started"
        );

        initializeDashboard();
        initializeReportExplorerFilters();
        initializeAlertDetail();
    }
);


/*
==========================================
INITIALIZE DASHBOARD
==========================================
*/

async function initializeDashboard() {

    try {

        /*
        --------------------------------------
        Backend Health Check
        --------------------------------------
        */

        await checkBackend();

        console.log(
            "Backend connection successful"
        );


        /*
        --------------------------------------
        Load + Render Dashboard
        --------------------------------------

        IMPORTANT:

        loadDashboardData() comes from
        dashboard.js.

        Do NOT define another
        loadDashboardData() here.
        --------------------------------------
        */

        await loadDashboardData();


        console.log(
            "Dashboard initialization completed"
        );

    }
    catch (error) {

        console.error(
            "Dashboard initialization failed:",
            error
        );

        showError(
            error?.message ||
            "Failed to initialize dashboard."
        );

    }

}


/*
==========================================
BACKEND HEALTH CHECK
==========================================
*/

async function checkBackend() {

    const response =
        await fetch(
            "https://dailyreportgenbackend.adityakumarsahu108.workers.dev/"
        );


    if (!response.ok) {

        throw new Error(
            `Backend health check failed (${response.status})`
        );

    }


    const result =
        await response.json();


    if (!result.success) {

        throw new Error(
            "Backend health check failed"
        );

    }


    return result;

}


/*
==========================================
ERROR HANDLING
==========================================
*/

function showError(message) {

    console.error(
        "Dashboard Error:",
        message
    );


    const errorElement =
        document.getElementById(
            "dashboardError"
        );


    if (errorElement) {

        errorElement.textContent =
            message;

        errorElement.style.display =
            "block";

    }

}


/*
==========================================
EXPORT
==========================================
*/

window.initializeDashboard =
    initializeDashboard;

window.checkBackend =
    checkBackend;

window.showError =
    showError;