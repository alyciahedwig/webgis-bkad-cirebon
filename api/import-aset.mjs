import crypto from "node:crypto";
import proj4 from "proj4";


/* =========================================================
   SIGAP CIREBON
   IMPORT ASET ONLINE - VERCEL FUNCTION

   Production:
   Admin -> Vercel Function -> GitHub GeoJSON -> Vercel Deploy

   Tidak mengakses PostGIS lokal.
   ========================================================= */


/* =========================================================
   KONFIGURASI
   ========================================================= */

const COOKIE_NAME =
    "bkad_admin_session";

const GITHUB_OWNER =
    "alyciahedwig";

const GITHUB_REPO =
    "webgis-bkad-cirebon";

const GITHUB_BRANCH =
    "main";

const GEOJSON_PATH =
    "data/aset_pemda.geojson";

const MAX_FEATURES_PER_REQUEST =
    150;


/* =========================================================
   DEFINISI CRS
   ========================================================= */

/*
   EPSG:23835
   DGN95 / Indonesia TM-3 zone 49.1
*/

proj4.defs(
    "EPSG:23835",
    "+proj=tmerc +lat_0=0 +lon_0=109.5 +k=0.9999 " +
    "+x_0=200000 +y_0=1500000 +ellps=WGS84 " +
    "+towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
);


/*
   EPSG:32749
   WGS 84 / UTM zone 49S
*/

proj4.defs(
    "EPSG:32749",
    "+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs"
);


/* =========================================================
   RESPONSE JSON
   ========================================================= */

function sendJson(
    response,
    status,
    data
) {

    response.statusCode =
        status;


    response.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
    );


    response.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
    );


    response.end(
        JSON.stringify(data)
    );

}


/* =========================================================
   SAFE STRING COMPARISON
   ========================================================= */

function safeEqual(
    a,
    b
) {

    const hashA =
        crypto
            .createHash("sha256")
            .update(String(a))
            .digest();


    const hashB =
        crypto
            .createHash("sha256")
            .update(String(b))
            .digest();


    return crypto.timingSafeEqual(
        hashA,
        hashB
    );

}


/* =========================================================
   COOKIE
   ========================================================= */

function getCookie(
    request,
    name
) {

    const header =
        request.headers.cookie || "";


    const cookies =
        header.split(";");


    for (
        const cookie
        of cookies
    ) {

        const parts =
            cookie
                .trim()
                .split("=");


        const key =
            parts.shift();


        const value =
            parts.join("=");


        if (
            key === name
        ) {

            return value;

        }

    }


    return null;

}


/* =========================================================
   VERIFIKASI TOKEN ADMIN
   HARUS SAMA DENGAN auth.mjs
   ========================================================= */

function verifyAdminToken(
    token,
    secret
) {

    try {

        if (
            !token ||
            !secret
        ) {

            return false;

        }


        const parts =
            String(token)
                .split(".");


        if (
            parts.length !== 2
        ) {

            return false;

        }


        const [
            payload,
            signature
        ] = parts;


        const expectedSignature =
            crypto
                .createHmac(
                    "sha256",
                    secret
                )
                .update(payload)
                .digest("base64url");


        if (
            !safeEqual(
                signature,
                expectedSignature
            )
        ) {

            return false;

        }


        const decoded =
            JSON.parse(
                Buffer
                    .from(
                        payload,
                        "base64url"
                    )
                    .toString("utf8")
            );


        if (
            decoded.role !== "admin" ||
            !decoded.exp ||
            decoded.exp <= Date.now()
        ) {

            return false;

        }


        return true;

    }

    catch {

        return false;

    }

}


/* =========================================================
   BACA BODY
   ========================================================= */

async function readBody(
    request
) {

    if (
        request.body &&
        typeof request.body === "object"
    ) {

        return request.body;

    }


    if (
        typeof request.body === "string"
    ) {

        try {

            return JSON.parse(
                request.body
            );

        }

        catch {

            return {};

        }

    }


    let raw =
        "";


    try {

        for await (
            const chunk
            of request
        ) {

            raw +=
                chunk;

        }

    }

    catch {

        return {};

    }


    if (
        !raw
    ) {

        return {};

    }


    try {

        return JSON.parse(
            raw
        );

    }

    catch {

        return {};

    }

}


/* =========================================================
   STRING
   ========================================================= */

function cleanRequiredString(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .slice(
            0,
            254
        );

}


function cleanOptionalString(
    value
) {

    const text =
        String(
            value ?? ""
        )
            .trim()
            .slice(
                0,
                254
            );


    return (
        text === ""
            ? null
            : text
    );

}


function normalizeNub(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();

}


/* =========================================================
   VALIDASI KOORDINAT
   ========================================================= */

function coordinatesAreFinite(
    coordinates
) {

    if (
        !Array.isArray(
            coordinates
        )
    ) {

        return false;

    }


    if (
        coordinates.length >= 2 &&
        typeof coordinates[0] ===
            "number" &&
        typeof coordinates[1] ===
            "number"
    ) {

        return (
            Number.isFinite(
                coordinates[0]
            ) &&
            Number.isFinite(
                coordinates[1]
            )
        );

    }


    return coordinates.every(
        coordinatesAreFinite
    );

}


/* =========================================================
   VALIDASI GEOMETRI
   ========================================================= */

function validateGeometry(
    geometry
) {

    if (
        !geometry ||
        typeof geometry !==
            "object"
    ) {

        throw new Error(
            "Geometri tidak tersedia."
        );

    }


    if (
        geometry.type !==
            "Polygon" &&
        geometry.type !==
            "MultiPolygon"
    ) {

        throw new Error(
            "Geometri harus Polygon atau MultiPolygon."
        );

    }


    if (
        !coordinatesAreFinite(
            geometry.coordinates
        )
    ) {

        throw new Error(
            "Koordinat geometri tidak valid."
        );

    }

}


/* =========================================================
   TRANSFORMASI POSISI
   ========================================================= */

function transformPosition(
    position,
    sourceSrid,
    targetSrid
) {

    const source =
        `EPSG:${sourceSrid}`;


    const target =
        `EPSG:${targetSrid}`;


    if (
        sourceSrid ===
        targetSrid
    ) {

        return [
            Number(
                position[0]
            ),
            Number(
                position[1]
            )
        ];

    }


    const result =
        proj4(
            source,
            target,
            [
                Number(
                    position[0]
                ),
                Number(
                    position[1]
                )
            ]
        );


    if (
        !Array.isArray(
            result
        ) ||
        !Number.isFinite(
            result[0]
        ) ||
        !Number.isFinite(
            result[1]
        )
    ) {

        throw new Error(
            "Transformasi koordinat gagal."
        );

    }


    return [
        result[0],
        result[1]
    ];

}


/* =========================================================
   TRANSFORMASI ARRAY KOORDINAT REKURSIF
   ========================================================= */

function transformCoordinates(
    coordinates,
    sourceSrid,
    targetSrid
) {

    if (
        Array.isArray(
            coordinates
        ) &&
        coordinates.length >= 2 &&
        typeof coordinates[0] ===
            "number" &&
        typeof coordinates[1] ===
            "number"
    ) {

        return transformPosition(
            coordinates,
            sourceSrid,
            targetSrid
        );

    }


    return coordinates.map(
        item =>
            transformCoordinates(
                item,
                sourceSrid,
                targetSrid
            )
    );

}


/* =========================================================
   TRANSFORMASI GEOMETRI
   ========================================================= */

function transformGeometry(
    geometry,
    sourceSrid,
    targetSrid
) {

    return {

        type:
            geometry.type,

        coordinates:
            transformCoordinates(
                geometry.coordinates,
                sourceSrid,
                targetSrid
            )

    };

}


/* =========================================================
   HITUNG LUAS RING
   Koordinat harus meter.
   ========================================================= */

function ringArea(
    ring
) {

    if (
        !Array.isArray(
            ring
        ) ||
        ring.length < 3
    ) {

        return 0;

    }


    let sum =
        0;


    for (
        let i = 0;
        i < ring.length;
        i++
    ) {

        const current =
            ring[i];


        const next =
            ring[
                (
                    i + 1
                ) %
                ring.length
            ];


        sum +=
            (
                Number(
                    current[0]
                ) *
                Number(
                    next[1]
                )
            )
            -
            (
                Number(
                    next[0]
                ) *
                Number(
                    current[1]
                )
            );

    }


    return Math.abs(
        sum / 2
    );

}


/* =========================================================
   HITUNG LUAS POLYGON
   ========================================================= */

function polygonArea(
    polygon
) {

    if (
        !Array.isArray(
            polygon
        ) ||
        !polygon.length
    ) {

        return 0;

    }


    let area =
        ringArea(
            polygon[0]
        );


    for (
        let i = 1;
        i < polygon.length;
        i++
    ) {

        area -=
            ringArea(
                polygon[i]
            );

    }


    return Math.max(
        0,
        area
    );

}


/* =========================================================
   HITUNG LUAS GEOMETRI DALAM M2

   Dibawa ke EPSG:23835 terlebih dahulu,
   sehingga sesuai konsep perhitungan
   PostGIS sebelumnya.
   ========================================================= */

function calculateAreaM2(
    geometry,
    sourceSrid
) {

    const projected =
        transformGeometry(
            geometry,
            sourceSrid,
            23835
        );


    let area =
        0;


    if (
        projected.type ===
        "Polygon"
    ) {

        area =
            polygonArea(
                projected.coordinates
            );

    }


    else if (
        projected.type ===
        "MultiPolygon"
    ) {

        area =
            projected.coordinates
                .reduce(
                    (
                        total,
                        polygon
                    ) =>
                        total +
                        polygonArea(
                            polygon
                        ),
                    0
                );

    }


    if (
        !Number.isFinite(
            area
        ) ||
        area <= 0
    ) {

        throw new Error(
            "Luas geometri tidak dapat dihitung."
        );

    }


    return Math.round(
        area * 100
    ) / 100;

}


/* =========================================================
   HEADER GITHUB
   ========================================================= */

function githubHeaders(
    token
) {

    return {

        "Accept":
            "application/vnd.github+json",

        "Authorization":
            `Bearer ${token}`,

        "X-GitHub-Api-Version":
            "2022-11-28",

        "User-Agent":
            "sigapcirebon-vercel"

    };

}


/* =========================================================
   AMBIL FILE GEOJSON TERBARU DARI GITHUB
   ========================================================= */

async function getCurrentGeoJson(
    token
) {

    const apiUrl =
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GEOJSON_PATH}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;


    const metadataResponse =
        await fetch(
            apiUrl,
            {
                method:
                    "GET",

                headers:
                    githubHeaders(
                        token
                    ),

                cache:
                    "no-store"
            }
        );


    if (
        !metadataResponse.ok
    ) {

        const detail =
            await metadataResponse
                .text();


        throw new Error(
            `Gagal membaca data GitHub (${metadataResponse.status}). ${detail.slice(0, 200)}`
        );

    }


    const metadata =
        await metadataResponse
            .json();


    if (
        !metadata ||
        !metadata.sha ||
        !metadata.download_url
    ) {

        throw new Error(
            "Metadata aset_pemda.geojson dari GitHub tidak lengkap."
        );

    }


    /*
       download_url digunakan agar file GeoJSON
       yang cukup besar tetap dapat dibaca dengan aman.
    */

    const rawResponse =
        await fetch(
            metadata.download_url,
            {
                method:
                    "GET",

                cache:
                    "no-store"
            }
        );


    if (
        !rawResponse.ok
    ) {

        throw new Error(
            `Gagal mengambil isi GeoJSON (${rawResponse.status}).`
        );

    }


    const rawText =
        await rawResponse
            .text();


    let geojson;


    try {

        geojson =
            JSON.parse(
                rawText
            );

    }

    catch {

        throw new Error(
            "aset_pemda.geojson di GitHub bukan JSON yang valid."
        );

    }


    if (
        geojson?.type !==
            "FeatureCollection" ||
        !Array.isArray(
            geojson.features
        )
    ) {

        throw new Error(
            "Format aset_pemda.geojson di GitHub tidak sesuai."
        );

    }


    return {

        sha:
            metadata.sha,

        geojson:
            geojson

    };

}


/* =========================================================
   SIMPAN GEOJSON KE GITHUB
   ========================================================= */

async function saveGeoJsonToGitHub(
    token,
    sha,
    geojson,
    summary
) {

    const apiUrl =
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GEOJSON_PATH}`;


    const contentText =
        JSON.stringify(
            geojson
        );


    const encoded =
        Buffer
            .from(
                contentText,
                "utf8"
            )
            .toString(
                "base64"
            );


    const commitMessage =
        `Admin import aset: +${summary.inserted} update ${summary.updated} skip ${summary.skipped}`;


    const saveResponse =
        await fetch(
            apiUrl,
            {
                method:
                    "PUT",

                headers:
                    {
                        ...githubHeaders(
                            token
                        ),

                        "Content-Type":
                            "application/json"
                    },

                body:
                    JSON.stringify(
                        {
                            message:
                                commitMessage,

                            content:
                                encoded,

                            sha:
                                sha,

                            branch:
                                GITHUB_BRANCH
                        }
                    )
            }
        );


    const result =
        await saveResponse
            .json()
            .catch(
                () => ({})
            );


    if (
        !saveResponse.ok
    ) {

        throw new Error(
            result?.message ||
            `GitHub menolak penyimpanan data (${saveResponse.status}).`
        );

    }


    return {

        commitSha:
            result
                ?.commit
                ?.sha ||
            null,

        fileSha:
            result
                ?.content
                ?.sha ||
            null

    };

}


/* =========================================================
   BENTUK FEATURE FINAL UNTUK WEB
   ========================================================= */

function buildPublicFeature(
    feature,
    sourceSrid
) {

    const inputProperties =
        (
            feature &&
            typeof feature.properties ===
                "object" &&
            feature.properties
        )
            ? feature.properties
            : {};


    const idBarang =
        cleanRequiredString(
            inputProperties.id_barang
        );


    const nub =
        cleanRequiredString(
            inputProperties.nub
        );


    if (
        !idBarang
    ) {

        throw new Error(
            "ID Barang kosong."
        );

    }


    if (
        !nub
    ) {

        throw new Error(
            "NUB kosong."
        );

    }


    const geometry =
        feature?.geometry;


    validateGeometry(
        geometry
    );


    /*
       GeoJSON publik HARUS EPSG:4326
       agar Leaflet dapat membaca langsung.
    */

    const publicGeometry =
        transformGeometry(
            geometry,
            sourceSrid,
            4326
        );


    validateGeometry(
        publicGeometry
    );


    const luasM2 =
        calculateAreaM2(
            geometry,
            sourceSrid
        );


    return {

        type:
            "Feature",

        properties:
            {

                id_barang:
                    idBarang,

                penggunaan:
                    cleanOptionalString(
                        inputProperties
                            .penggunaan
                    ),

                nub:
                    nub,

                luas_m2:
                    luasM2,

                kecamatan:
                    cleanOptionalString(
                        inputProperties
                            .kecamatan
                    ),

                desa:
                    cleanOptionalString(
                        inputProperties
                            .desa
                    ),

                status:
                    cleanOptionalString(
                        inputProperties
                            .status
                    ),

                keterangan:
                    cleanOptionalString(
                        inputProperties
                            .keterangan
                    )

            },

        geometry:
            publicGeometry

    };

}


/* =========================================================
   MAIN HANDLER
   ========================================================= */

export default async function handler(
    request,
    response
) {

    /* =====================================================
       HANYA POST
       ===================================================== */

    if (
        request.method !==
        "POST"
    ) {

        return sendJson(
            response,
            405,
            {
                success:
                    false,

                message:
                    "Method tidak diizinkan."
            }
        );

    }


    /* =====================================================
       KONFIGURASI SECRET
       ===================================================== */

    const sessionSecret =
        process.env
            .SESSION_SECRET;


    const githubToken =
        process.env
            .GITHUB_TOKEN;


    if (
        !sessionSecret
    ) {

        return sendJson(
            response,
            500,
            {
                success:
                    false,

                message:
                    "SESSION_SECRET belum tersedia."
            }
        );

    }


    if (
        !githubToken
    ) {

        return sendJson(
            response,
            500,
            {
                success:
                    false,

                message:
                    "GITHUB_TOKEN belum tersedia di Vercel."
            }
        );

    }


    /* =====================================================
       ADMIN ONLY
       ===================================================== */

    const token =
        getCookie(
            request,
            COOKIE_NAME
        );


    const authenticated =
        verifyAdminToken(
            token,
            sessionSecret
        );


    if (
        !authenticated
    ) {

        return sendJson(
            response,
            401,
            {
                success:
                    false,

                message:
                    "Session Admin tidak valid atau sudah berakhir."
            }
        );

    }


    /* =====================================================
       BACA INPUT
       ===================================================== */

    const body =
        await readBody(
            request
        );


    const sourceSrid =
        Number(
            body.source_srid ||
            4326
        );


    const allowedSrids =
        [
            4326,
            23835,
            32749
        ];


    if (
        !allowedSrids.includes(
            sourceSrid
        )
    ) {

        return sendJson(
            response,
            422,
            {
                success:
                    false,

                message:
                    "CRS sumber tidak didukung."
            }
        );

    }


    const duplicateMode =
        String(
            body.duplicate_mode ||
            "skip"
        )
            .trim()
            .toLowerCase();


    if (
        duplicateMode !==
            "skip" &&
        duplicateMode !==
            "update"
    ) {

        return sendJson(
            response,
            422,
            {
                success:
                    false,

                message:
                    "Mode duplikasi tidak valid."
            }
        );

    }


    const incomingFeatures =
        Array.isArray(
            body.features
        )
            ? body.features
            : [];


    if (
        !incomingFeatures.length
    ) {

        return sendJson(
            response,
            422,
            {
                success:
                    false,

                message:
                    "Tidak ada feature yang dikirim."
            }
        );

    }


    if (
        incomingFeatures.length >
        MAX_FEATURES_PER_REQUEST
    ) {

        return sendJson(
            response,
            413,
            {
                success:
                    false,

                message:
                    `Maksimal ${MAX_FEATURES_PER_REQUEST} feature per permintaan.`
            }
        );

    }


    try {

        /* =================================================
           AMBIL DATABASE GEOJSON TERBARU
           ================================================= */

        const current =
            await getCurrentGeoJson(
                githubToken
            );


        const geojson =
            current.geojson;


        /*
           Jangan ubah struktur FeatureCollection lain
           yang mungkin sudah ada.
        */

        geojson.type =
            "FeatureCollection";


        geojson.features =
            Array.isArray(
                geojson.features
            )
                ? geojson.features
                : [];


        /* =================================================
           INDEX NUB EXISTING
           ================================================= */

        const nubIndex =
            new Map();


        geojson.features
            .forEach(
                (
                    feature,
                    index
                ) => {

                    const nub =
                        normalizeNub(
                            feature
                                ?.properties
                                ?.nub
                        );


                    if (
                        nub &&
                        !nubIndex.has(
                            nub
                        )
                    ) {

                        nubIndex.set(
                            nub,
                            index
                        );

                    }

                }
            );


        const summary =
            {

                inserted:
                    0,

                updated:
                    0,

                skipped:
                    0,

                failed:
                    0

            };


        const errors =
            [];


        /* =================================================
           PROSES FEATURE
           ================================================= */

        for (
            let i = 0;
            i <
            incomingFeatures.length;
            i++
        ) {

            const incoming =
                incomingFeatures[i];


            let nub =
                "";


            try {

                nub =
                    cleanRequiredString(
                        incoming
                            ?.properties
                            ?.nub
                    );


                const nubKey =
                    normalizeNub(
                        nub
                    );


                /*
                   Duplicate dicek SEBELUM transformasi
                   seperti alur PHP lama.
                */

                const existingIndex =
                    nubKey
                        ? nubIndex.get(
                            nubKey
                        )
                        : undefined;


                if (
                    existingIndex !==
                        undefined &&
                    duplicateMode ===
                        "skip"
                ) {

                    summary.skipped++;

                    continue;

                }


                const finalFeature =
                    buildPublicFeature(
                        incoming,
                        sourceSrid
                    );


                /* ================= UPDATE ================= */

                if (
                    existingIndex !==
                        undefined &&
                    duplicateMode ===
                        "update"
                ) {

                    geojson.features[
                        existingIndex
                    ] =
                        finalFeature;


                    summary.updated++;

                    continue;

                }


                /* ================= INSERT ================= */

                geojson.features.push(
                    finalFeature
                );


                nubIndex.set(
                    normalizeNub(
                        finalFeature
                            .properties
                            .nub
                    ),
                    geojson.features.length -
                        1
                );


                summary.inserted++;

            }

            catch (
                error
            ) {

                summary.failed++;


                if (
                    errors.length <
                    30
                ) {

                    errors.push(
                        {

                            row:
                                i + 1,

                            nub:
                                nub ||
                                null,

                            message:
                                error
                                    ?.message ||
                                "Feature gagal diproses."

                        }
                    );

                }

            }

        }


        /* =================================================
           SEMUA GAGAL
           ================================================= */

        if (
            summary.failed > 0 &&
            summary.inserted === 0 &&
            summary.updated === 0 &&
            summary.skipped === 0
        ) {

            return sendJson(
                response,
                422,
                {
                    success:
                        false,

                    message:
                        "Seluruh data gagal diproses.",

                    ...summary,

                    errors:
                        errors
                }
            );

        }


        /* =================================================
           TIDAK ADA PERUBAHAN
           SEMUA DUPLIKAT + SKIP
           ================================================= */

        if (
            summary.inserted === 0 &&
            summary.updated === 0
        ) {

            return sendJson(
                response,
                200,
                {
                    success:
                        true,

                    message:
                        "Tidak ada perubahan pada data. Seluruh NUB yang ditemukan dilewati.",

                    ...summary,

                    errors:
                        errors,

                    deployment_pending:
                        false
                }
            );

        }


        /* =================================================
           SIMPAN KE GITHUB
           ================================================= */

        const saved =
            await saveGeoJsonToGitHub(
                githubToken,
                current.sha,
                geojson,
                summary
            );


        /* =================================================
           RESPONSE BERHASIL
           ================================================= */

        return sendJson(
            response,
            200,
            {
                success:
                    true,

                message:
                    "Data berhasil disimpan. Vercel sedang memperbarui data publik.",

                ...summary,

                errors:
                    errors,

                commit_sha:
                    saved.commitSha,

                deployment_pending:
                    true
            }
        );

    }

    catch (
        error
    ) {

        console.error(
            "IMPORT ONLINE ERROR:",
            error
        );


        return sendJson(
            response,
            500,
            {
                success:
                    false,

                message:
                    error
                        ?.message ||
                    "Terjadi kesalahan saat menyimpan data."
            }
        );

    }

}
