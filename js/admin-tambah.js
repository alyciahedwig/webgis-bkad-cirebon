(() => {

    "use strict";


    /* ======================================================
       ADMIN PROTECTION
       ====================================================== */

    async function protectAdminPage() {

        const valid =
            typeof verifyAdminSession ===
            "function"

                ? await verifyAdminSession()

                : false;


        if (!valid) {

            alert(
                "Session Admin tidak valid. Silakan login kembali."
            );


            window.location.href =
                "login.html";


            return false;

        }


        return true;

    }



    const $ =
        id =>
            document.getElementById(id);



    /* ======================================================
       ELEMENT
       ====================================================== */

    const els = {

        spatialFile:
            $("spatialFile"),

        uploadBox:
            $("uploadBox"),

        uploadTitle:
            $("uploadTitle"),

        uploadSubtitle:
            $("uploadSubtitle"),

        geojsonText:
            $("geojsonText"),

        readGeoJsonButton:
            $("readGeoJsonButton"),

        sourceStatus:
            $("sourceStatus"),

        crsOptions:
            $("crsOptions"),

        crsNote:
            $("crsNote"),

        mapIdBarang:
            $("mapIdBarang"),

        mapPenggunaan:
            $("mapPenggunaan"),

        mapNub:
            $("mapNub"),

        mapKecamatan:
            $("mapKecamatan"),

        mapDesa:
            $("mapDesa"),

        mapStatus:
            $("mapStatus"),

        mapKeterangan:
            $("mapKeterangan"),

        previewSummary:
            $("previewSummary"),

        previewBody:
            $("previewBody"),

        importButton:
            $("importButton"),

        progressLabel:
            $("progressLabel"),

        progressBar:
            $("progressBar"),

        importResult:
            $("importResult")

    };



    /* ======================================================
       STATE
       ====================================================== */

    const state = {

        sourceType:
            null,

        /*
           shpjs menghasilkan SHP sebagai
           GeoJSON WGS84.
        */

        shpGeometrySrid:
            4326,

        collection:
            null,

        fields:
            [],

        readyFeatures:
            []

    };



    /* ======================================================
       CONFIG
       ====================================================== */

    const MAX_FILE_SIZE =
        25 * 1024 * 1024;


    const MAX_FEATURES =
        5000;


    const PREVIEW_LIMIT =
        100;


    const IMPORT_BATCH_SIZE =
        100;

    /* ======================================================
   IMPORT API

   Localhost:
   tetap menggunakan PHP + PostGIS.

   Production Vercel:
   menggunakan Vercel Function + GitHub GeoJSON.
   ====================================================== */

const IMPORT_API =

    (
        window.location.hostname ===
            "localhost" ||

        window.location.hostname ===
            "127.0.0.1"
    )

        ? "api/tambah-aset.php"

        : "/api/import-aset";

    (
        window.location.hostname ===
            "localhost" ||

        window.location.hostname ===
            "127.0.0.1"
    )

        ? "api/tambah-aset.php"

        : "/api/tambah-aset";


    const mappingConfig = [

        {
            element:
                els.mapIdBarang,

            canonical:
                "id_barang",

            aliases: [
                "id_barang",
                "idbarang",
                "kode_barang",
                "kd_barang",
                "kodebarang"
            ]
        },

        {
            element:
                els.mapPenggunaan,

            canonical:
                "penggunaan",

            aliases: [
                "penggunaan",
                "fungsi",
                "jenis",
                "jenis_aset"
            ]
        },

        {
            element:
                els.mapNub,

            canonical:
                "nub",

            aliases: [
                "nub",
                "no_nub",
                "nomor_nub"
            ]
        },

        {
            element:
                els.mapKecamatan,

            canonical:
                "kecamatan",

            aliases: [
                "kecamatan",
                "kec",
                "nama_kecamatan"
            ]
        },

        {
            element:
                els.mapDesa,

            canonical:
                "desa",

            aliases: [
                "desa",
                "kelurahan",
                "desa_kelurahan",
                "desa_kel",
                "nama_desa"
            ]
        },

        {
            element:
                els.mapStatus,

            canonical:
                "status",

            aliases: [
                "status",
                "sts",
                "status_aset"
            ]
        },

        {
            element:
                els.mapKeterangan,

            canonical:
                "keterangan",

            aliases: [
                "keterangan",
                "ket",
                "catatan"
            ]
        }

    ];



    /* ======================================================
       HELPER
       ====================================================== */

    function escapeHtml(value) {

        return String(
            value ?? ""
        )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

    }



    function normalizeFieldName(value) {

        return String(
            value ?? ""
        )
        .trim()
        .toLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ""
        );

    }



    function cleanValue(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)
            .trim();

    }



    function getSelectedCrs() {

        return Number(
            document.querySelector(
                "input[name='sourceCrs']:checked"
            )?.value ||
            4326
        );

    }



    function getDuplicateMode() {

        return (
            document.querySelector(
                "input[name='duplicateMode']:checked"
            )?.value ||
            "skip"
        );

    }



    function setStatus(
        text,
        type = ""
    ) {

        els.sourceStatus.hidden =
            false;


        els.sourceStatus.textContent =
            text;


        els.sourceStatus.className =
            "source-status";


        if (type) {

            els.sourceStatus
                .classList
                .add(type);

        }

    }



    /* ======================================================
       GEOMETRY VALIDATION
       ====================================================== */

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
            typeof coordinates[0] === "number" &&
            typeof coordinates[1] === "number"
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



    function validateGeometry(
        geometry
    ) {

        if (!geometry) {

            return {
                valid: false,
                message: "Geometri kosong"
            };

        }


        if (
            geometry.type !== "Polygon" &&
            geometry.type !== "MultiPolygon"
        ) {

            return {
                valid: false,
                message: `Tipe ${geometry.type || "tidak diketahui"}`
            };

        }


        if (
            !coordinatesAreFinite(
                geometry.coordinates
            )
        ) {

            return {
                valid: false,
                message: "Koordinat tidak valid"
            };

        }


        return {
            valid: true,
            message: "OK"
        };

    }



    /* ======================================================
       NORMALIZE COLLECTION
       ====================================================== */

    function normalizeCollection(
        data
    ) {

        /*
           SHP ZIP dapat mengandung beberapa layer.
           Gunakan layer polygon pertama.
        */

        if (
            Array.isArray(data)
        ) {

            const polygonLayer =
                data.find(
                    collection =>
                        collection?.type ===
                        "FeatureCollection" &&
                        collection.features?.some(
                            feature =>
                                feature?.geometry?.type ===
                                    "Polygon" ||
                                feature?.geometry?.type ===
                                    "MultiPolygon"
                        )
                );


            if (!polygonLayer) {

                throw new Error(
                    "Tidak ditemukan layer polygon pada file ZIP."
                );

            }


            data =
                polygonLayer;

        }


        if (
            data?.type !==
            "FeatureCollection" ||
            !Array.isArray(
                data.features
            )
        ) {

            throw new Error(
                "Data harus berupa GeoJSON FeatureCollection."
            );

        }


        if (
            !data.features.length
        ) {

            throw new Error(
                "File tidak memiliki feature."
            );

        }


        if (
            data.features.length >
            MAX_FEATURES
        ) {

            throw new Error(
                `Maksimal ${MAX_FEATURES.toLocaleString("id-ID")} feature per file.`
            );

        }


        return data;

    }



    /* ======================================================
       EXTRACT FIELDS
       ====================================================== */

    function extractFields(
        collection
    ) {

        const fields =
            new Set();


        collection.features
            .slice(
                0,
                500
            )
            .forEach(
                feature => {

                    Object.keys(
                        feature.properties ||
                        {}
                    )
                    .forEach(
                        field =>
                            fields.add(field)
                    );

                }
            );


        return Array.from(
            fields
        )
        .sort(
            (
                a,
                b
            ) =>
                a.localeCompare(
                    b,
                    "id"
                )
        );

    }



    /* ======================================================
       MAPPING SELECT
       ====================================================== */

    function populateMappings() {

        mappingConfig.forEach(
            config => {

                const required =
                    config.canonical ===
                        "id_barang" ||
                    config.canonical ===
                        "nub";


                config.element.innerHTML = `

                    <option value="">

                        ${
                            required
                                ? "Pilih kolom..."
                                : "Tidak dipetakan"
                        }

                    </option>

                `;


                state.fields.forEach(
                    field => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            field;


                        option.textContent =
                            field;


                        config.element
                            .appendChild(
                                option
                            );

                    }
                );



                const normalizedAliases =
                    config.aliases.map(
                        normalizeFieldName
                    );


                const match =
                    state.fields.find(
                        field =>
                            normalizedAliases.includes(
                                normalizeFieldName(
                                    field
                                )
                            )
                    );


                if (match) {

                    config.element.value =
                        match;

                }

            }
        );


        renderPreview();

    }



    /* ======================================================
       MAPPED PROPERTIES
       ====================================================== */

    function mappedProperties(
        feature
    ) {

        const source =
            feature.properties ||
            {};


        const output =
            {};


        mappingConfig.forEach(
            config => {

                const sourceField =
                    config.element.value;


                output[
                    config.canonical
                ] =
                    sourceField
                        ? cleanValue(
                            source[
                                sourceField
                            ]
                        )
                        : "";

            }
        );


        return output;

    }



    /* ======================================================
       PREVIEW
       ====================================================== */

    function renderPreview() {

        state.readyFeatures =
            [];


        if (
            !state.collection
        ) {

            els.previewSummary.textContent =
                "Belum ada data";


            els.previewBody.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        class="empty-preview"
                    >
                        Unggah atau tempel data GeoJSON
                        untuk menampilkan pratinjau.
                    </td>

                </tr>

            `;


            els.importButton.disabled =
                true;


            return;

        }



        let ready =
            0;


        const rows =
            [];



        state.collection.features
            .forEach(
                (
                    feature,
                    index
                ) => {

                    const properties =
                        mappedProperties(
                            feature
                        );


                    const geometryStatus =
                        validateGeometry(
                            feature.geometry
                        );


                    const notes =
                        [];


                    if (
                        !properties.id_barang
                    ) {

                        notes.push(
                            "ID Barang kosong"
                        );

                    }


                    if (
                        !properties.nub
                    ) {

                        notes.push(
                            "NUB kosong"
                        );

                    }


                    if (
                        !geometryStatus.valid
                    ) {

                        notes.push(
                            geometryStatus.message
                        );

                    }


                    const isReady =
                        notes.length ===
                        0;


                    if (isReady) {

                        ready++;


                        state.readyFeatures.push(
                            {
                                properties:
                                    properties,

                                geometry:
                                    feature.geometry
                            }
                        );

                    }



                    if (
                        index <
                        PREVIEW_LIMIT
                    ) {

                        rows.push(`

                            <tr>

                                <td>
                                    ${
                                        index +
                                        1
                                    }
                                </td>


                                <td class="preview-id">
                                    ${escapeHtml(properties.nub || "—")}
                                </td>


                                <td>
                                    ${escapeHtml(properties.id_barang || "—")}
                                </td>


                                <td>
                                    ${escapeHtml(properties.penggunaan || "—")}
                                </td>


                                <td>
                                    ${escapeHtml(properties.kecamatan || "—")}
                                </td>


                                <td
                                    class="${
                                        geometryStatus.valid
                                            ? "geom-ok"
                                            : "geom-error"
                                    }"
                                >
                                    ${
                                        geometryStatus.valid
                                            ? "OK"
                                            : "Tidak valid"
                                    }
                                </td>


                                <td>
                                    ${
                                        notes.length
                                            ? escapeHtml(
                                                notes.join(
                                                    "; "
                                                )
                                            )
                                            : "—"
                                    }
                                </td>

                            </tr>

                        `);

                    }

                }
            );



        const total =
            state.collection
                .features
                .length;


        els.previewSummary.textContent =
            `${ready.toLocaleString("id-ID")} siap dari ` +
            `${total.toLocaleString("id-ID")} baris`;


        els.previewBody.innerHTML =
            rows.join("");


        if (
            total >
            PREVIEW_LIMIT
        ) {

            els.previewBody
                .insertAdjacentHTML(
                    "beforeend",
                    `

                        <tr>

                            <td
                                colspan="7"
                                class="empty-preview"
                                style="
                                    height:auto;
                                    padding:14px;
                                "
                            >
                                Pratinjau dibatasi hingga
                                ${PREVIEW_LIMIT} baris.
                                Seluruh data valid tetap akan
                                diproses saat impor.
                            </td>

                        </tr>

                    `
                );

        }


        const requiredMapped =
            Boolean(
                els.mapIdBarang.value &&
                els.mapNub.value
            );


        els.importButton.disabled =
            !requiredMapped ||
            ready ===
            0;


        els.progressLabel.textContent =
            ready
                ? `${ready.toLocaleString("id-ID")} data siap disimpan`
                : "Belum ada data yang siap disimpan";


        els.progressBar.style.width =
            "0%";

    }



    /* ======================================================
       LOAD COLLECTION
       ====================================================== */

    function finishLoading(
        collection,
        sourceType,
        sourceLabel
    ) {

        state.collection =
            normalizeCollection(
                collection
            );


        state.sourceType =
            sourceType;


        state.fields =
            extractFields(
                state.collection
            );


        populateMappings();


        setStatus(
            `${sourceLabel} · ` +
            `${state.collection.features.length.toLocaleString("id-ID")} feature terbaca.`,
            "success"
        );

    }



    /* ======================================================
       FILE
       ====================================================== */

    async function readFile(
        file
    ) {

        if (!file) {
            return;
        }


        if (
            file.size >
            MAX_FILE_SIZE
        ) {

            throw new Error(
                "Ukuran file maksimal 25 MB."
            );

        }


        const name =
            file.name.toLowerCase();



        if (
            name.endsWith(
                ".zip"
            )
        ) {

            if (
                typeof window.shp !==
                "function"
            ) {

                throw new Error(
                    "Parser Shapefile belum dimuat."
                );

            }


            els.uploadTitle.textContent =
                file.name;


            els.uploadSubtitle.textContent =
                "Membaca Shapefile ZIP...";


            const buffer =
                await file.arrayBuffer();


            const parsed =
                await window.shp(
                    buffer
                );


            /*
               shpjs melakukan proyeksi
               hasil SHP ke WGS84.
            */

            setCrsLockedForShp();


            finishLoading(
                parsed,
                "shp",
                `Shapefile ZIP: ${file.name}`
            );


            els.uploadSubtitle.textContent =
                "Shapefile berhasil dibaca";


            return;

        }



        if (
            name.endsWith(
                ".geojson"
            ) ||
            name.endsWith(
                ".json"
            )
        ) {

            const content =
                await file.text();


            const parsed =
                JSON.parse(
                    content
                );


            unlockCrs();


            els.uploadTitle.textContent =
                file.name;


            els.uploadSubtitle.textContent =
                "GeoJSON berhasil dibaca";


            finishLoading(
                parsed,
                "geojson",
                `GeoJSON: ${file.name}`
            );


            return;

        }



        throw new Error(
            "Gunakan file ZIP, GeoJSON, atau JSON."
        );

    }



    /* ======================================================
       CRS LOCK UNTUK SHP
       ====================================================== */

    function setCrsLockedForShp() {

        document
            .querySelectorAll(
                "input[name='sourceCrs']"
            )
            .forEach(
                radio => {

                    radio.disabled =
                        true;


                    radio.checked =
                        radio.value ===
                        "4326";

                }
            );


        els.crsNote.textContent =
            "Shapefile telah dibaca berdasarkan proyeksi file dan dinormalisasi ke WGS 84 (EPSG:4326).";

    }



    function unlockCrs() {

        document
            .querySelectorAll(
                "input[name='sourceCrs']"
            )
            .forEach(
                radio => {

                    radio.disabled =
                        false;

                }
            );


        updateCrsNote();

    }



    function updateCrsNote() {

        const srid =
            getSelectedCrs();


        const labelMap = {

            4326:
                "WGS 84 (EPSG:4326)",

            23835:
                "TM-3 zona 49.1 (EPSG:23835)",

            32749:
                "WGS 84 / UTM zona 49S (EPSG:32749)"

        };


        els.crsNote.textContent =
            `Terpilih: ${labelMap[srid]}`;

    }



    /* ======================================================
       FILE EVENTS
       ====================================================== */

    els.spatialFile
        .addEventListener(
            "change",
            async () => {

                try {

                    await readFile(
                        els.spatialFile
                            .files[0]
                    );

                }

                catch (error) {

                    console.error(
                        "FILE ERROR:",
                        error
                    );


                    setStatus(
                        error.message,
                        "error"
                    );

                }

            }
        );



    /* ======================================================
       DRAG DROP
       ====================================================== */

    [
        "dragenter",
        "dragover"
    ]
    .forEach(
        eventName => {

            els.uploadBox
                .addEventListener(
                    eventName,
                    event => {

                        event.preventDefault();


                        els.uploadBox
                            .classList
                            .add(
                                "dragover"
                            );

                    }
                );

        }
    );


    [
        "dragleave",
        "drop"
    ]
    .forEach(
        eventName => {

            els.uploadBox
                .addEventListener(
                    eventName,
                    event => {

                        event.preventDefault();


                        els.uploadBox
                            .classList
                            .remove(
                                "dragover"
                            );

                    }
                );

        }
    );


    els.uploadBox
        .addEventListener(
            "drop",
            async event => {

                const file =
                    event
                        .dataTransfer
                        ?.files?.[0];


                if (!file) {
                    return;
                }


                try {

                    await readFile(
                        file
                    );

                }

                catch (error) {

                    setStatus(
                        error.message,
                        "error"
                    );

                }

            }
        );



    /* ======================================================
       PASTE GEOJSON
       ====================================================== */

    els.readGeoJsonButton
        .addEventListener(
            "click",
            () => {

                try {

                    const raw =
                        els.geojsonText
                            .value
                            .trim();


                    if (!raw) {

                        throw new Error(
                            "Tempel GeoJSON terlebih dahulu."
                        );

                    }


                    const parsed =
                        JSON.parse(
                            raw
                        );


                    unlockCrs();


                    finishLoading(
                        parsed,
                        "geojson",
                        "GeoJSON dari teks"
                    );

                }

                catch (error) {

                    setStatus(
                        error.message,
                        "error"
                    );

                }

            }
        );



    /* ======================================================
       MAPPING EVENTS
       ====================================================== */

    mappingConfig.forEach(
        config => {

            config.element
                .addEventListener(
                    "change",
                    renderPreview
                );

        }
    );


    document
        .querySelectorAll(
            "input[name='sourceCrs']"
        )
        .forEach(
            radio => {

                radio.addEventListener(
                    "change",
                    updateCrsNote
                );

            }
        );



    /* ======================================================
       IMPORT
       ====================================================== */

    async function sendBatch(
        features,
        sourceSrid,
        duplicateMode
    ) {

        const response =
            await fetch(
                IMPORT_API,
                {
                    method:
                        "POST",

                    credentials:
                        "same-origin",

                    cache:
                        "no-store",

                    headers:
                        {
                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json"
                        },

                    body:
                        JSON.stringify(
                            {
                                source_srid:
                                    sourceSrid,

                                duplicate_mode:
                                    duplicateMode,

                                features:
                                    features
                            }
                        )
                }
            );


        let result;


        try {

            result =
                await response.json();

        }

        catch {

            throw new Error(
                "Respons server tidak valid."
            );

        }


        if (
            !response.ok ||
            result.success !==
            true
        ) {

            throw new Error(
                result.message ||
                "Data gagal disimpan."
            );

        }


        return result;

    }



    async function importData() {

        if (
            !state.readyFeatures.length
        ) {

            return;

        }


        const adminValid =
            await verifyAdminSession();


        if (!adminValid) {

            alert(
                "Session Admin berakhir. Silakan login kembali."
            );


            window.location.href =
                "login.html";


            return;

        }



        const sourceSrid =
            state.sourceType ===
            "shp"

                ? state.shpGeometrySrid

                : getSelectedCrs();



        const duplicateMode =
            getDuplicateMode();



        els.importButton.disabled =
            true;


        els.importButton.textContent =
            "Menyimpan...";


        els.importResult.hidden =
            true;


        const total =
            state.readyFeatures.length;


        let processed =
            0;


        const summary = {

            inserted:
                0,

            updated:
                0,

            skipped:
                0,

            failed:
                0

        };


        try {

            for (
                let start = 0;
                start < total;
                start += IMPORT_BATCH_SIZE
            ) {

                const batch =
                    state.readyFeatures.slice(
                        start,
                        start +
                        IMPORT_BATCH_SIZE
                    );


                const result =
                    await sendBatch(
                        batch,
                        sourceSrid,
                        duplicateMode
                    );


                summary.inserted +=
                    Number(
                        result.inserted ||
                        0
                    );


                summary.updated +=
                    Number(
                        result.updated ||
                        0
                    );


                summary.skipped +=
                    Number(
                        result.skipped ||
                        0
                    );


                summary.failed +=
                    Number(
                        result.failed ||
                        0
                    );


                processed +=
                    batch.length;


                const percent =
                    Math.round(
                        (
                            processed /
                            total
                        ) *
                        100
                    );


                els.progressBar
                    .style
                    .width =
                        `${percent}%`;


                els.progressLabel
                    .textContent =
                        `Memproses ${processed.toLocaleString("id-ID")} dari ${total.toLocaleString("id-ID")} data`;

            }



            els.importResult.hidden =
                false;


            els.importResult.className =
                "import-result";


            els.importResult.innerHTML = `

                <strong>
                    Import selesai.
                </strong>

                <br>

                ${summary.inserted.toLocaleString("id-ID")} data baru disimpan,
                ${summary.updated.toLocaleString("id-ID")} diperbarui,
                ${summary.skipped.toLocaleString("id-ID")} dilewati,
                dan ${summary.failed.toLocaleString("id-ID")} gagal diproses.

                <br><br>

                <a
                    href="data-aset.html"
                    style="
                        color:inherit;
                        font-weight:700;
                    "
                >
                    Lihat Data Aset →
                </a>

            `;


            els.progressLabel.textContent =
                "Proses import selesai";


            els.progressBar.style.width =
                "100%";

        }

        catch (error) {

            console.error(
                "IMPORT ERROR:",
                error
            );


            els.importResult.hidden =
                false;


            els.importResult.className =
                "import-result error";


            els.importResult.textContent =
                error.message ||
                "Import data gagal.";


            els.progressLabel.textContent =
                "Import dihentikan";

        }

        finally {

            els.importButton.disabled =
                false;


            els.importButton.textContent =
                "Simpan ke Basis Data";

        }

    }



    els.importButton
        .addEventListener(
            "click",
            importData
        );



    /* ======================================================
       START
       ====================================================== */

    protectAdminPage();


})();
