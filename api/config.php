<?php

declare(strict_types=1);


/* =========================================================
   WEBGIS BKAD KABUPATEN CIREBON
   KONFIGURASI AUTENTIKASI
   ========================================================= */


/*
   AKUN ADMIN DEVELOPMENT

   Username:
   admin

   Password:
   AdminBKAD!2026

   WAJIB diganti sebelum sistem dipublikasikan.
*/

const ADMIN_USERNAME = 'admin';


/*
   Hash dari:
   AdminBKAD!2026

   Password asli TIDAK disimpan.
*/

const ADMIN_PASSWORD_HASH =
    '$2y$12$L12H05SkMnipf.zmaZDsSO/kvyjOGzyojbhVSXg2BCbyNlSLr5xaO';


/*
   Session Admin berlaku maksimal
   8 jam sejak aktivitas terakhir.
*/

const ADMIN_SESSION_TTL =
    28800;


/* =========================================================
   START SESSION
   ========================================================= */

function startAppSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }


    ini_set(
        'session.use_strict_mode',
        '1'
    );


    ini_set(
        'session.cookie_httponly',
        '1'
    );


    $isHttps =
        isset($_SERVER['HTTPS']) &&
        $_SERVER['HTTPS'] !== 'off';


    session_name(
        'webgis_bkad_session'
    );


    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);


    session_start();
}


/* =========================================================
   JSON RESPONSE
   ========================================================= */

function jsonResponse(
    array $data,
    int $status = 200
): never
{
    http_response_code(
        $status
    );


    header(
        'Content-Type: application/json; charset=utf-8'
    );


    header(
        'Cache-Control: no-store, no-cache, must-revalidate'
    );


    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );


    exit;
}


/* =========================================================
   CEK ADMIN
   ========================================================= */

function isAdminSession(): bool
{
    startAppSession();


    if (
        empty($_SESSION['authenticated']) ||
        $_SESSION['authenticated'] !== true ||
        ($_SESSION['role'] ?? null) !== 'admin'
    ) {

        return false;
    }


    $lastActivity =
        (int) (
            $_SESSION['last_activity'] ??
            0
        );


    if (
        $lastActivity <= 0 ||
        time() - $lastActivity >
        ADMIN_SESSION_TTL
    ) {

        destroyAppSession();

        return false;
    }


    $_SESSION['last_activity'] =
        time();


    return true;
}


/* =========================================================
   REQUIRE ADMIN

   Nanti fungsi ini dipakai endpoint:
   Tambah / Edit / Hapus data.
   ========================================================= */

function requireAdmin(): void
{
    if (!isAdminSession()) {

        jsonResponse(
            [
                'success' => false,
                'message' => 'Akses Admin diperlukan.'
            ],
            401
        );

    }
}


/* =========================================================
   DESTROY SESSION
   ========================================================= */

function destroyAppSession(): void
{
    if (
        session_status() !==
        PHP_SESSION_ACTIVE
    ) {

        startAppSession();

    }


    $_SESSION = [];


    if (
        ini_get(
            'session.use_cookies'
        )
    ) {

        $params =
            session_get_cookie_params();


        setcookie(
            session_name(),
            '',
            [
                'expires' => time() - 42000,
                'path' => $params['path'],
                'domain' => $params['domain'],
                'secure' => $params['secure'],
                'httponly' => $params['httponly'],
                'samesite' => 'Lax'
            ]
        );

    }


    session_destroy();
}