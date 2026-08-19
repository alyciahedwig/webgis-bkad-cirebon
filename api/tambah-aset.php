<?php

declare(strict_types=1);


/* =========================================================
   WEBGIS BKAD KABUPATEN CIREBON
   IMPORT / TAMBAH DATA ASET

   Database : bkad_cirebon
   Schema   : public
   Table    : aset_pemda
   PK       : id
   Geometry : geom
   SRID     : 23835
   ========================================================= */


require_once
    __DIR__ . '/config.php';


require_once
    __DIR__ . '/db.php';



/* =========================================================
   ADMIN ONLY
   ========================================================= */

requireAdmin();



/* =========================================================
   HANYA POST
   ========================================================= */

if (
    ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST'
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
   BACA JSON
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

    jsonResponse(
        [
            'success' => false,
            'message' => 'Data JSON tidak valid.'
        ],
        400
    );

}



/* =========================================================
   PARAMETER
   ========================================================= */

$sourceSrid =
    (int) (
        $data['source_srid']
        ?? 4326
    );


/*
   CRS yang kita izinkan dari halaman import.
*/

$allowedSrids = [
    4326,
    23835,
    32749
];


if (
    !in_array(
        $sourceSrid,
        $allowedSrids,
        true
    )
) {

    jsonResponse(
        [
            'success' => false,
            'message' => 'CRS sumber tidak didukung.'
        ],
        422
    );

}



$duplicateMode =
    strtolower(
        trim(
            (string) (
                $data['duplicate_mode']
                ?? 'skip'
            )
        )
    );


if (
    !in_array(
        $duplicateMode,
        [
            'skip',
            'update'
        ],
        true
    )
) {

    jsonResponse(
        [
            'success' => false,
            'message' => 'Mode penanganan duplikasi tidak valid.'
        ],
        422
    );

}



$features =
    $data['features']
    ?? [];


if (
    !is_array($features) ||
    count($features) === 0
) {

    jsonResponse(
        [
            'success' => false,
            'message' => 'Tidak ada feature yang dikirim.'
        ],
        422
    );

}


/*
   Frontend mengirim batch 100.
   Server kita batasi 150 per request.
*/

if (
    count($features) > 150
) {

    jsonResponse(
        [
            'success' => false,
            'message' => 'Maksimal 150 feature per permintaan.'
        ],
        413
    );

}



/* =========================================================
   HELPER STRING
   ========================================================= */

function assetRequiredString(
    mixed $value
): string {

    $value =
        trim(
            (string) (
                $value ?? ''
            )
        );


    if (
        function_exists(
            'mb_substr'
        )
    ) {

        return mb_substr(
            $value,
            0,
            254
        );

    }


    return substr(
        $value,
        0,
        254
    );

}



function assetOptionalString(
    mixed $value
): ?string {

    $value =
        trim(
            (string) (
                $value ?? ''
            )
        );


    if ($value === '') {

        return null;

    }


    if (
        function_exists(
            'mb_substr'
        )
    ) {

        return mb_substr(
            $value,
            0,
            254
        );

    }


    return substr(
        $value,
        0,
        254
    );

}



/* =========================================================
   SAFE DATABASE IDENTIFIER
   ========================================================= */

$schema =
    dbIdentifier(
        DB_SCHEMA
    );


$table =
    dbIdentifier(
        DB_ASSET_TABLE
    );


$pk =
    dbIdentifier(
        DB_ASSET_PK
    );


$geom =
    dbIdentifier(
        DB_ASSET_GEOM
    );


$fullTable =
    $schema
    . '.'
    . $table;



/* =========================================================
   DATABASE CONNECTION
   ========================================================= */

try {

    $pdo =
        db();

}

catch (Throwable $error) {

    jsonResponse(
        [
            'success' => false,
            'message' => 'Koneksi PostGIS gagal.',
            'detail' => $error->getMessage()
        ],
        500
    );

}



/* =========================================================
   CEK NUB DUPLIKAT

   BTRIM:
   mengabaikan spasi depan / belakang.

   LOWER:
   14519-A dan 14519-a dianggap sama.
   ========================================================= */

$duplicateSql = "

    SELECT
        {$pk} AS existing_id

    FROM {$fullTable}

    WHERE
        LOWER(
            BTRIM(nub)
        )
        =
        LOWER(
            BTRIM(:nub)
        )

    LIMIT 1

";


$duplicateStatement =
    $pdo->prepare(
        $duplicateSql
    );



/* =========================================================
   GEOMETRY EXPRESSION

   Alur:

   GeoJSON
      ↓
   ST_GeomFromGeoJSON
      ↓
   Set SRID sumber
      ↓
   Transform → EPSG:23835
      ↓
   Force 2D
      ↓
   MakeValid
      ↓
   Ambil polygon
      ↓
   MultiPolygon
   ========================================================= */

$geometryExpression = "

    ST_Multi(

        ST_CollectionExtract(

            ST_MakeValid(

                ST_Force2D(

                    ST_Transform(

                        ST_SetSRID(

                            ST_GeomFromGeoJSON(
                                CAST(
                                    :geometry
                                    AS jsonb
                                )
                            ),

                            :source_srid

                        ),

                        " . DB_ASSET_SRID . "

                    )

                )

            ),

            3

        )

    )

";



/* =========================================================
   INSERT DATA BARU
   ========================================================= */

$insertSql = "

    WITH processed_geometry AS (

        SELECT
            {$geometryExpression}
            AS geom

    )

    INSERT INTO {$fullTable} (

        id_barang,
        penggunaan,
        nub,
        kecamatan,
        desa,
        status,
        keterangan,
        luas_m2,
        {$geom}

    )

    SELECT

        :id_barang,
        :penggunaan,
        :nub,
        :kecamatan,
        :desa,
        :status,
        :keterangan,

        ROUND(
            ST_Area(
                geom
            )::numeric,
            2
        )::double precision,

        geom

    FROM processed_geometry

    WHERE

        geom IS NOT NULL

        AND NOT ST_IsEmpty(
            geom
        )

        AND ST_IsValid(
            geom
        )

    RETURNING
        {$pk} AS id,
        luas_m2

";


$insertStatement =
    $pdo->prepare(
        $insertSql
    );



/* =========================================================
   UPDATE DATA YANG SUDAH ADA
   ========================================================= */

$updateSql = "

    WITH processed_geometry AS (

        SELECT
            {$geometryExpression}
            AS geom

    )

    UPDATE {$fullTable}
    AS asset

    SET

        id_barang =
            :id_barang,

        penggunaan =
            :penggunaan,

        nub =
            :nub,

        kecamatan =
            :kecamatan,

        desa =
            :desa,

        status =
            :status,

        keterangan =
            :keterangan,

        luas_m2 =
            ROUND(
                ST_Area(
                    processed_geometry.geom
                )::numeric,
                2
            )::double precision,

        {$geom} =
            processed_geometry.geom

    FROM processed_geometry

    WHERE

        asset.{$pk} =
            :asset_id

        AND processed_geometry.geom
            IS NOT NULL

        AND NOT ST_IsEmpty(
            processed_geometry.geom
        )

        AND ST_IsValid(
            processed_geometry.geom
        )

    RETURNING

        asset.{$pk} AS id,
        asset.luas_m2

";


$updateStatement =
    $pdo->prepare(
        $updateSql
    );



/* =========================================================
   HASIL
   ========================================================= */

$inserted =
    0;


$updated =
    0;


$skipped =
    0;


$failed =
    0;


$errors =
    [];



/* =========================================================
   TRANSACTION
   ========================================================= */

try {

    $pdo->beginTransaction();



    foreach (
        $features
        as $index =>
        $feature
    ) {


        /*
           Tiap feature punya savepoint sendiri.

           Kalau satu feature error,
           feature lain tetap diproses.
        */

        $pdo->exec(
            'SAVEPOINT import_feature'
        );


        try {


            /* =================================================
               PROPERTIES
               ================================================= */

            $properties =
                is_array(
                    $feature['properties']
                    ?? null
                )

                    ? $feature['properties']

                    : [];



            $idBarang =
                assetRequiredString(
                    $properties['id_barang']
                    ?? ''
                );


            $nub =
                assetRequiredString(
                    $properties['nub']
                    ?? ''
                );



            /* =================================================
               REQUIRED FIELD
               ================================================= */

            if ($idBarang === '') {

                throw new RuntimeException(
                    'ID Barang kosong.'
                );

            }


            if ($nub === '') {

                throw new RuntimeException(
                    'NUB kosong.'
                );

            }



            /* =================================================
               CEK DUPLIKAT TERLEBIH DAHULU

               Ini dilakukan SEBELUM proses geometri.
               Jadi jika pilih SKIP, data langsung
               dilewati secara bersih.
               ================================================= */

            $duplicateStatement->execute(
                [
                    ':nub' =>
                        $nub
                ]
            );


            $existing =
                $duplicateStatement
                    ->fetch();



            /* =================================================
               SKIP
               ================================================= */

            if (
                $existing &&
                $duplicateMode === 'skip'
            ) {

                $skipped++;


                $pdo->exec(
                    'RELEASE SAVEPOINT import_feature'
                );


                continue;

            }



            /* =================================================
               GEOMETRY
               ================================================= */

            $geometry =
                $feature['geometry']
                ?? null;


            if (
                !is_array(
                    $geometry
                )
            ) {

                throw new RuntimeException(
                    'Geometri tidak tersedia.'
                );

            }



            $geometryType =
                (string) (
                    $geometry['type']
                    ?? ''
                );


            if (
                !in_array(
                    $geometryType,
                    [
                        'Polygon',
                        'MultiPolygon'
                    ],
                    true
                )
            ) {

                throw new RuntimeException(
                    'Geometri harus Polygon atau MultiPolygon.'
                );

            }



            if (
                !isset(
                    $geometry['coordinates']
                ) ||
                !is_array(
                    $geometry['coordinates']
                )
            ) {

                throw new RuntimeException(
                    'Koordinat geometri tidak tersedia.'
                );

            }



            $geometryJson =
                json_encode(
                    $geometry,
                    JSON_UNESCAPED_UNICODE |
                    JSON_UNESCAPED_SLASHES |
                    JSON_PRESERVE_ZERO_FRACTION
                );


            if (
                $geometryJson === false
            ) {

                throw new RuntimeException(
                    'Geometri gagal dikonversi menjadi JSON.'
                );

            }



            /* =================================================
               PARAMETER UMUM
               ================================================= */

            $parameters = [

                ':geometry' =>
                    $geometryJson,

                ':source_srid' =>
                    $sourceSrid,

                ':id_barang' =>
                    $idBarang,

                ':penggunaan' =>
                    assetOptionalString(
                        $properties['penggunaan']
                        ?? null
                    ),

                ':nub' =>
                    $nub,

                ':kecamatan' =>
                    assetOptionalString(
                        $properties['kecamatan']
                        ?? null
                    ),

                ':desa' =>
                    assetOptionalString(
                        $properties['desa']
                        ?? null
                    ),

                ':status' =>
                    assetOptionalString(
                        $properties['status']
                        ?? null
                    ),

                ':keterangan' =>
                    assetOptionalString(
                        $properties['keterangan']
                        ?? null
                    )

            ];



            /* =================================================
               UPDATE EXISTING
               ================================================= */

            if (
                $existing &&
                $duplicateMode === 'update'
            ) {

                $updateParameters =
                    $parameters;


                $updateParameters[
                    ':asset_id'
                ] =
                    (int) (
                        $existing[
                            'existing_id'
                        ]
                    );


                $updateStatement->execute(
                    $updateParameters
                );


                $updatedRow =
                    $updateStatement
                        ->fetch();


                if (!$updatedRow) {

                    throw new RuntimeException(
                        'Data tidak dapat diperbarui karena geometri hasil proses kosong atau tidak valid.'
                    );

                }


                $updated++;


                $pdo->exec(
                    'RELEASE SAVEPOINT import_feature'
                );


                continue;

            }



            /* =================================================
               INSERT DATA BARU
               ================================================= */

            $insertStatement->execute(
                $parameters
            );


            $insertedRow =
                $insertStatement
                    ->fetch();


            if (!$insertedRow) {

                throw new RuntimeException(
                    'Data tidak dapat disimpan karena geometri hasil proses kosong atau tidak valid.'
                );

            }


            $inserted++;


            $pdo->exec(
                'RELEASE SAVEPOINT import_feature'
            );


        }

        catch (Throwable $featureError) {


            /*
               Batalkan hanya feature ini.
            */

            $pdo->exec(
                'ROLLBACK TO SAVEPOINT import_feature'
            );


            $pdo->exec(
                'RELEASE SAVEPOINT import_feature'
            );


            $failed++;



            /*
               Simpan maksimal 30 detail error
               agar response tidak terlalu berat.
            */

            if (
                count($errors) < 30
            ) {

                $errors[] = [

                    'row' =>
                        $index + 1,

                    'nub' =>
                        isset($nub)
                            ? $nub
                            : null,

                    'message' =>
                        $featureError
                            ->getMessage()

                ];

            }

        }

    }



    $pdo->commit();


}

catch (Throwable $error) {


    if (
        $pdo->inTransaction()
    ) {

        $pdo->rollBack();

    }


    jsonResponse(
        [
            'success' => false,
            'message' => 'Proses import dibatalkan karena terjadi kesalahan pada transaksi database.',
            'detail' => $error->getMessage()
        ],
        500
    );

}



/* =========================================================
   STATUS AKHIR
   ========================================================= */

/*
   Jika seluruh data gagal,
   jangan beri kesan import berhasil.
*/

if (
    $failed > 0 &&
    $inserted === 0 &&
    $updated === 0 &&
    $skipped === 0
) {

    jsonResponse(
        [
            'success' => false,

            'message' =>
                'Seluruh data gagal diproses.',

            'inserted' =>
                0,

            'updated' =>
                0,

            'skipped' =>
                0,

            'failed' =>
                $failed,

            'errors' =>
                $errors
        ],
        422
    );

}



/* =========================================================
   RESPONSE BERHASIL
   ========================================================= */

jsonResponse(
    [
        'success' => true,

        'message' =>
            'Proses import selesai.',

        'inserted' =>
            $inserted,

        'updated' =>
            $updated,

        'skipped' =>
            $skipped,

        'failed' =>
            $failed,

        'errors' =>
            $errors
    ]
);