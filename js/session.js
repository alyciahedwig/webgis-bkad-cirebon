/* =========================================================
   WEBGIS BKAD KABUPATEN CIREBON
   SESSION / ROLE MANAGEMENT
   ========================================================= */

const WEBGIS_ROLE_KEY =
    "webgis_role";

const WEBGIS_ADMIN_HINT =
    "webgis_admin_hint";


/* =========================================================
   MASUK SEBAGAI GUEST
   ========================================================= */

async function enterAsGuest() {

    /*
       Kalau sebelumnya ada session Admin di server,
       kita tutup dulu agar Guest benar-benar Guest.
    */

    try {

        await fetch(
            "api/logout.php",
            {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store"
            }
        );

    }

    catch (error) {

        console.warn(
            "Session server tidak dapat dibersihkan:",
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
       Hint hanya membantu ketika Admin membuka tab baru.

       Ini BUKAN pengaman utama.
       Otorisasi Admin tetap ditentukan PHP Session.
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
   Dipanggil setelah PHP berhasil login
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
   CEK SESSION ADMIN KE SERVER
   ========================================================= */

async function verifyAdminSession() {

    try {

        const response =
            await fetch(
                "api/session.php",
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
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


        return false;

    }

}



/* =========================================================
   CLEAR ADMIN ROLE
   ========================================================= */

function clearAdminRole() {

    if (
        sessionStorage.getItem(
            WEBGIS_ROLE_KEY
        ) === "admin"
    ) {

        sessionStorage.removeItem(
            WEBGIS_ROLE_KEY
        );

    }


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
            "api/logout.php",
            {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store"
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

   UI boleh membaca role dari browser,
   tetapi PHP tetap menjadi otoritas utama.
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
                           Kalau role browser mengatakan Admin
                           tetapi PHP session sudah mati,
                           jangan biarkan Admin palsu bertahan.
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