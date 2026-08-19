<?php

declare(strict_types=1);


require_once
    __DIR__ . '/config.php';


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


startAppSession();


destroyAppSession();


jsonResponse(
    [
        'success' => true,
        'authenticated' => false,
        'message' => 'Logout berhasil.'
    ]
);