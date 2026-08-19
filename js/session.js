/* =========================================================
   WEBGIS BKAD KABUPATEN CIREBON
   SESSION / ROLE MANAGEMENT
   VERCEL VERSION
   ========================================================= */

const WEBGIS_ROLE_KEY =
    "webgis_role";

const WEBGIS_ADMIN_HINT =
    "webgis_admin_hint";


/* =========================================================
   API ENDPOINT
   ========================================================= */

const WEBGIS_AUTH_API =
    "/api/auth";


/* =========================================================
   MASUK SEBAGAI GUEST
   ========================================================= */

async function enterAsGuest() {

    /*
       Kalau sebelumnya ada session Admin online,
       bersihkan terlebih dahulu.
    */

    try {

        await fetch(
            `${WEBGIS_AUTH_API}?action=logout`,
            {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store"
            }
        );

    }

    catch (error) {

        console.warn(
            "Session Admin tidak dapat dibersihkan:",
            error
        );

    }


    localStorage.removeItem(
        WEBGIS_ADMIN_HINT
    );


    sessionStorage.setItem(
        WEBGIS_ROLE_KEY,
        "guest"
    );


    window.location.href =
        "beranda.html";

}


/* =========================================================
   GET ROLE
   ========================================================= */

function getUserRole() {

    const sessionRole =
        sessionStorage.getItem(
            WEBGIS_ROLE_KEY
        );


    if (sessionRole) {

        return sessionRole;

    }


    /*
       Membantu mempertahankan tampilan Admin
       ketika membuka tab baru.

       Validasi sebenarnya tetap dilakukan
       ke Vercel Function.
    */

    if (
        localStorage.getItem(
            WEBGIS_ADMIN_HINT
        ) === "1"
    ) {

        return "admin";

    }


    return null;

}


/* =========================================================
   SET ADMIN ROLE
   ========================================================= */

function setAdminRole() {

    sessionStorage.setItem(
        WEBGIS_ROLE_KEY,
        "admin"
    );


    localStorage.setItem(
        WEBGIS_ADMIN_HINT,
        "1"
    );

}


/* =========================================================
   CEK SESSION ADMIN KE VERCEL
   ========================================================= */

async function verifyAdminSession() {

    try {

        const response =
            await fetch(
                `${WEBGIS_AUTH_API}?action=session`,
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const result =
            await response.json();


        if (
            result.success === true &&
            result.authenticated === true &&
            result.role === "admin"
        ) {

            sessionStorage.setItem(
                WEBGIS_ROLE_KEY,
                "admin"
            );


            localStorage.setItem(
                WEBGIS_ADMIN_HINT,
                "1"
            );


            return true;

        }


        clearAdminRole();

        return false;

    }

    catch (error) {

        console.warn(
            "Tidak dapat memverifikasi session Admin:",
            error
        );


        clearAdminRole();

        return false;

    }

}


/* =========================================================
   CLEAR ADMIN ROLE
   ========================================================= */

function clearAdminRole() {

    sessionStorage.removeItem(
        WEBGIS_ROLE_KEY
    );


    localStorage.removeItem(
        WEBGIS_ADMIN_HINT
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutWebGIS() {

    try {

        await fetch(
            `${WEBGIS_AUTH_API}?action=logout`,
            {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );

    }

    catch (error) {

        console.warn(
            "Logout server gagal:",
            error
        );

    }

    finally {

        sessionStorage.removeItem(
            WEBGIS_ROLE_KEY
        );


        localStorage.removeItem(
            WEBGIS_ADMIN_HINT
        );


        window.location.href =
            "index.html";

    }

}


/* =========================================================
   VERIFIKASI OTOMATIS ADMIN
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (
            getUserRole() ===
            "admin"
        ) {

            verifyAdminSession()
                .then(
                    valid => {

                        /*
                           Kalau browser menyimpan role Admin
                           tetapi session server sudah tidak valid,
                           baru kembali ke landing page.
                        */

                        if (!valid) {

                            const page =
                                window.location.pathname
                                    .split("/")
                                    .pop();


                            if (
                                page !== "index.html" &&
                                page !== "login.html"
                            ) {

                                window.location.href =
                                    "index.html";

                            }

                        }

                    }
                );

        }

    }
);


/* =========================================================
   GLOBAL
   ========================================================= */

window.enterAsGuest =
    enterAsGuest;

window.getUserRole =
    getUserRole;

window.setAdminRole =
    setAdminRole;

window.verifyAdminSession =
    verifyAdminSession;

window.logoutWebGIS =
    logoutWebGIS;
