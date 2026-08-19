<?php

declare(strict_types=1);


require_once
    __DIR__ . '/config.php';


if (
    $_SERVER['REQUEST_METHOD'] !==
    'GET'
) {

    jsonResponse(
        [
            'success' => false,
            'message' => 'Method tidak diizinkan.'
        ],
        405
    );

}


$authenticated =
    isAdminSession();


if (!$authenticated) {

    jsonResponse(
        [
            'success' => true,
            'authenticated' => false,
            'role' => null
        ]
    );

}


jsonResponse(
    [
        'success' => true,
        'authenticated' => true,
        'role' => 'admin',

        'username' =>
            $_SESSION['username'] ??
            ADMIN_USERNAME
    ]
);