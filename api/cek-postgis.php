<?php

declare(strict_types=1);

header(
    'Content-Type: text/plain; charset=utf-8'
);

require_once
    __DIR__ . '/db.php';


echo "=== DIAGNOSTIK POSTGIS WEBGIS BKAD ===\n\n";


/* =========================================================
   PHP
   ========================================================= */

echo "PHP Version     : "
    . PHP_VERSION
    . "\n";


$drivers =
    PDO::getAvailableDrivers();


echo "PDO Drivers     : "
    . (
        $drivers
            ? implode(', ', $drivers)
            : 'tidak ada'
    )
    . "\n";


if (
    !in_array(
        'pgsql',
        $drivers,
        true
    )
) {

    echo "\nHASIL: GAGAL\n";
    echo "Driver PDO PostgreSQL belum aktif.\n";

    echo "\nAktifkan di C:\\xampp\\php\\php.ini:\n";
    echo "extension=pdo_pgsql\n";
    echo "extension=pgsql\n";

    exit;
}


/* =========================================================
   CONFIG
   ========================================================= */

echo "\n--- KONFIGURASI ---\n";

echo "Host            : "
    . DB_HOST
    . "\n";

echo "Port            : "
    . DB_PORT
    . "\n";

echo "Database        : "
    . DB_NAME
    . "\n";

echo "User            : "
    . DB_USER
    . "\n";

echo "Schema          : "
    . DB_SCHEMA
    . "\n";

echo "Table           : "
    . DB_ASSET_TABLE
    . "\n";


/* =========================================================
   CONNECTION
   ========================================================= */

try {

    $pdo = db();

    echo "\nKONEKSI DATABASE: BERHASIL\n";

}

catch (Throwable $error) {

    echo "\nKONEKSI DATABASE: GAGAL\n\n";

    echo $error->getMessage();

    exit;
}


/* =========================================================
   POSTGIS
   ========================================================= */

try {

    $version =
        $pdo
            ->query(
                'SELECT PostGIS_Version()'
            )
            ->fetchColumn();


    echo "PostGIS          : "
        . $version
        . "\n";

}

catch (Throwable $error) {

    echo "PostGIS          : GAGAL\n";
    echo $error->getMessage();
    echo "\n";

}


/* =========================================================
   TABLE
   ========================================================= */

try {

    $statement =
        $pdo->prepare(
            "
            SELECT EXISTS (

                SELECT 1

                FROM information_schema.tables

                WHERE table_schema = :schema
                  AND table_name = :table

            )
            "
        );


    $statement->execute(
        [
            ':schema' =>
                DB_SCHEMA,

            ':table' =>
                DB_ASSET_TABLE
        ]
    );


    $exists =
        (bool) $statement
            ->fetchColumn();


    echo "\nTabel "
        . DB_SCHEMA
        . "."
        . DB_ASSET_TABLE
        . " : "
        . (
            $exists
                ? "DITEMUKAN"
                : "TIDAK DITEMUKAN"
        )
        . "\n";


    if (!$exists) {

        echo "\nDaftar tabel pada schema public:\n";


        $tables =
            $pdo
                ->query(
                    "
                    SELECT table_name

                    FROM information_schema.tables

                    WHERE table_schema = 'public'

                    ORDER BY table_name
                    "
                )
                ->fetchAll();


        foreach ($tables as $table) {

            echo "- "
                . $table['table_name']
                . "\n";

        }


        exit;
    }

}

catch (Throwable $error) {

    echo "\nPengecekan tabel gagal:\n";
    echo $error->getMessage();
    echo "\n";

    exit;
}


/* =========================================================
   COLUMNS
   ========================================================= */

echo "\n--- KOLOM TABEL ---\n";


try {

    $statement =
        $pdo->prepare(
            "
            SELECT
                column_name,
                data_type

            FROM information_schema.columns

            WHERE table_schema = :schema
              AND table_name = :table

            ORDER BY ordinal_position
            "
        );


    $statement->execute(
        [
            ':schema' =>
                DB_SCHEMA,

            ':table' =>
                DB_ASSET_TABLE
        ]
    );


    $columns =
        $statement->fetchAll();


    foreach ($columns as $column) {

        echo str_pad(
            $column['column_name'],
            18
        );

        echo " : ";

        echo $column['data_type'];

        echo "\n";
    }

}

catch (Throwable $error) {

    echo $error->getMessage();
    echo "\n";

}


/* =========================================================
   GEOMETRY
   ========================================================= */

echo "\n--- GEOMETRI ---\n";


try {

    $schema =
        '"' . DB_SCHEMA . '"';


    $table =
        '"' . DB_ASSET_TABLE . '"';


    $geom =
        '"' . DB_ASSET_GEOM . '"';


    $sql = "

        SELECT
            COUNT(*) AS jumlah,
            ST_SRID({$geom}) AS srid,
            ST_GeometryType({$geom}) AS tipe

        FROM {$schema}.{$table}

        GROUP BY
            ST_SRID({$geom}),
            ST_GeometryType({$geom})

    ";


    $rows =
        $pdo
            ->query($sql)
            ->fetchAll();


    if (!$rows) {

        echo "Tabel belum memiliki geometri.\n";

    }

    else {

        foreach ($rows as $row) {

            echo "Jumlah          : "
                . $row['jumlah']
                . "\n";

            echo "SRID            : "
                . $row['srid']
                . "\n";

            echo "Tipe            : "
                . $row['tipe']
                . "\n\n";

        }

    }

}

catch (Throwable $error) {

    echo "Pemeriksaan geometri gagal:\n";
    echo $error->getMessage();
    echo "\n";

}


echo "\n=== SELESAI ===\n";