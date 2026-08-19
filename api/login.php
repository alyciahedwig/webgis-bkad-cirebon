<?php

declare(strict_types=1);


require_once
    __DIR__ . '/config.php';


startAppSession();


/* =========================================================
   METHOD
   ========================================================= */

if (
    $_SERVER['REQUEST_METHOD'] !==
    'POST'
) {

    jsonResponse(
        [
            'success' => false,
            'message' => 'Method tidak diizinkan.'
        ],
        405
    );

}


/* =========================================================
   READ BODY
   ========================================================= */

$rawBody =
    file_get_contents(
        'php://input'
    );


$data =
    json_decode(
        $rawBody ?: '',
        true
    );


if (!is_array($data)) {

    $data =
        $_POST;

}


/* =========================================================
   INPUT
   ========================================================= */

$username =
    trim(
        (string) (
            $data['username'] ??
            ''
        )
    );


$password =
    (string) (
        $data['password'] ??
        ''
    );


/* =========================================================
   VALIDASI
   ========================================================= */

if (
    $username === '' ||
    $password === ''
) {

    jsonResponse(
        [
            'success' => false,
            'message' => 'Username dan password wajib diisi.'
        ],
        422
    );

}


/* =========================================================
   LOGIN
   ========================================================= */

$usernameValid =
    hash_equals(
        ADMIN_USERNAME,
        $username
    );


$passwordValid =
    password_verify(
        $password,
        ADMIN_PASSWORD_HASH
    );


if (
    !$usernameValid ||
    !$passwordValid
) {

    /*
       Delay kecil agar percobaan password
       berulang tidak terlalu murah.
    */

    usleep(
        300000
    );


    jsonResponse(
        [
            'success' => false,
            'message' => 'Username atau password tidak sesuai.'
        ],
        401
    );

}


/* =========================================================
   LOGIN BERHASIL
   ========================================================= */

session_regenerate_id(
    true
);


$_SESSION['authenticated'] =
    true;


$_SESSION['role'] =
    'admin';


$_SESSION['username'] =
    ADMIN_USERNAME;


$_SESSION['login_at'] =
    time();


$_SESSION['last_activity'] =
    time();


jsonResponse(
    [
        'success' => true,
        'authenticated' => true,
        'role' => 'admin',
        'username' => ADMIN_USERNAME,
        'message' => 'Login berhasil.'
    ]
);