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
SPA NAVIGATION
==========================================
*/

document.addEventListener("DOMContentLoaded", () => {

    initializeNavigation();

});


function initializeNavigation() {

    const navItems =
        document.querySelectorAll(".nav-item");

    const pages =
        document.querySelectorAll(".page");

    const pageTitle =
        document.getElementById("page-title");

    const pageDescription =
        document.getElementById("page-description");


    navItems.forEach((navItem) => {

        navItem.addEventListener("click", () => {

            const targetPage =
                navItem.dataset.page;


            if (!targetPage) {
                return;
            }


            /*
            --------------------------------------
            UPDATE ACTIVE NAVIGATION
            --------------------------------------
            */

            navItems.forEach((item) => {

                item.classList.remove("active");

            });


            navItem.classList.add("active");


            /*
            --------------------------------------
            HIDE ALL PAGES
            --------------------------------------
            */

            pages.forEach((page) => {

                page.classList.add("hidden");

            });


            /*
            --------------------------------------
            SHOW SELECTED PAGE
            --------------------------------------
            */

            const selectedPage =
                document.getElementById(
                    `${targetPage}-page`
                );


            if (!selectedPage) {

                console.error(
                    `Page not found: ${targetPage}-page`
                );

                return;

            }


            selectedPage.classList.remove("hidden");


            /*
            --------------------------------------
            UPDATE HEADER
            --------------------------------------
            */

            updatePageHeader(
                targetPage,
                pageTitle,
                pageDescription
            );


            /*
            --------------------------------------
            LOAD INTELLIGENCE
            --------------------------------------
            */

            if (
                targetPage === "intelligence" &&
                typeof loadIntelligence === "function"
            ) {

                loadIntelligence();

            }

        });

    });

}


/*
==========================================
PAGE HEADER
==========================================
*/

function updatePageHeader(
    page,
    titleElement,
    descriptionElement
) {

    const pageInfo = {

        dashboard: {

            title:
                "Security Dashboard",

            description:
                "Overview of security alerts and reports"

        },

        reports: {

            title:
                "Reports",

            description:
                "Security report history and details"

        },

        analytics: {

            title:
                "Analytics",

            description:
                "Security trends and analytics"

        },

        intelligence: {

            title:
                "Security Intelligence",

            description:
                "AI-powered security intelligence summary"

        }

    };


    const info =
        pageInfo[page];


    if (!info) {
        return;
    }


    if (titleElement) {

        titleElement.textContent =
            info.title;

    }


    if (descriptionElement) {

        descriptionElement.textContent =
            info.description;

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