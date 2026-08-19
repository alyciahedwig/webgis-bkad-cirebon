<?php

declare(strict_types=1);


/* =========================================================
   DATABASE CONFIGURATION
   WEBGIS BKAD KABUPATEN CIREBON
   ========================================================= */


/* =========================================================
   LOCAL CONFIG
   ========================================================= */

$localConfig = [];


$localSecretFile =
    __DIR__ . '/local-secret.php';


if (
    is_file(
        $localSecretFile
    )
) {

    $loadedConfig =
        require $localSecretFile;


    if (
        is_array(
            $loadedConfig
        )
    ) {

        $localConfig =
            $loadedConfig;

    }

}



/* =========================================================
   CONFIG HELPER

   Prioritas:
   1. Environment Variable (production/Vercel)
   2. local-secret.php (localhost)
   3. default value jika tersedia
   ========================================================= */

function databaseConfig(
    string $key,
    ?string $default = null
): string {

    global $localConfig;


    /* PRODUCTION ENVIRONMENT */

    $environmentValue =
        getenv(
            $key
        );


    if (
        $environmentValue !== false &&
        trim($environmentValue) !== ''
    ) {

        return trim(
            $environmentValue
        );

    }


    /* LOCAL SECRET */

    if (
        isset(
            $localConfig[$key]
        ) &&
        trim(
            (string) $localConfig[$key]
        ) !== ''
    ) {

        return trim(
            (string) $localConfig[$key]
        );

    }


    /* DEFAULT */

    if (
        $default !== null
    ) {

        return $default;

    }


    throw new RuntimeException(
        "Konfigurasi {$key} belum tersedia."
    );

}



/* =========================================================
   DATABASE CONSTANTS

   Tetap menggunakan konstanta supaya kompatibel
   dengan seluruh kode WebGIS yang sudah ada.
   ========================================================= */

define(
    'DB_HOST',
    databaseConfig(
        'DB_HOST',
        'localhost'
    )
);


define(
    'DB_PORT',
    databaseConfig(
        'DB_PORT',
        '5432'
    )
);


define(
    'DB_NAME',
    databaseConfig(
        'DB_NAME',
        'bkad_cirebon'
    )
);


define(
    'DB_USER',
    databaseConfig(
        'DB_USER',
        'postgres'
    )
);


define(
    'DB_PASSWORD',
    databaseConfig(
        'DB_PASSWORD'
    )
);



/* =========================================================
   ASSET TABLE
   ========================================================= */

const DB_SCHEMA =
    'public';


const DB_ASSET_TABLE =
    'aset_pemda';


const DB_ASSET_PK =
    'id';


const DB_ASSET_GEOM =
    'geom';


const DB_ASSET_SRID =
    23835;



/* =========================================================
   DATABASE CONNECTION
   ========================================================= */

function db(): PDO
{

    static $pdo =
        null;


    if (
        $pdo instanceof PDO
    ) {

        return $pdo;

    }


    $dsn =
        'pgsql:' .
        'host=' . DB_HOST .
        ';port=' . DB_PORT .
        ';dbname=' . DB_NAME;


    $pdo =
        new PDO(
            $dsn,
            DB_USER,
            DB_PASSWORD,
            [

                PDO::ATTR_ERRMODE =>
                    PDO::ERRMODE_EXCEPTION,

                PDO::ATTR_DEFAULT_FETCH_MODE =>
                    PDO::FETCH_ASSOC,

                PDO::ATTR_EMULATE_PREPARES =>
                    false

            ]
        );


    return $pdo;

}



/* =========================================================
   SAFE SQL IDENTIFIER
   ========================================================= */

function dbIdentifier(
    string $value
): string {

    if (
        !preg_match(
            '/^[A-Za-z_][A-Za-z0-9_]*$/',
            $value
        )
    ) {

        throw new RuntimeException(
            'Identifier database tidak valid.'
        );

    }


    return '"' . $value . '"';

}