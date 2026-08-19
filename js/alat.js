(() => {

    "use strict";


    /* ======================================================
       SESSION
       ====================================================== */

    const role =
        typeof getUserRole === "function"
            ? getUserRole()
            : null;


    if (!role) {
        window.location.href = "index.html";
        return;
    }


    const $ = id =>
        document.getElementById(id);


    $("roleBadge").textContent =
        role;



    /* ======================================================
       SESSION RADIUS RESTORE
       ====================================================== */

    let restoreRadiusPayload = null;


    try {

        const raw =
            sessionStorage.getItem(
                "webgis_restore_radius_analysis"
            );


        if (raw) {
            restoreRadiusPayload =
                JSON.parse(raw);
        }

    }

    catch (error) {

        console.warn(
            "Data restore radius tidak dapat dibaca:",
            error
        );

    }


    sessionStorage.removeItem(
        "webgis_restore_radius_analysis"
    );

/* ======================================================
   DATA GEOJSON PUBLIK
   ====================================================== */

const DATA_URL =
    "/data/aset_pemda.geojson";


    /* ======================================================
       STATE
       ====================================================== */

    const state = {

        features: [],
        entries: [],

        activeTool:
            "radius",

        radiusCenterIndex:
            null,

        radiusMeters:
            100,

        radiusFeature:
            null,

        radiusResults:
            [],

        radiusResultIndexes:
            new Set(),

        distanceAIndex:
            null,

        distanceBIndex:
            null,

        distanceResult:
            null

    };



    /* ======================================================
       ELEMENT
       ====================================================== */

    const els = {

        loadingOverlay:
            $("loadingOverlay"),

        loadingText:
            $("loadingText"),

        dataStatus:
            $("dataStatus"),

        toolTabs:
            Array.from(
                document.querySelectorAll(
                    ".tool-tab"
                )
            ),

        panels:
            Array.from(
                document.querySelectorAll(
                    ".tool-panel"
                )
            ),

        radiusAsset:
            $("radiusAsset"),

        radiusMeters:
            $("radiusMeters"),

        runRadiusButton:
            $("runRadiusButton"),

        resetRadiusButton:
            $("resetRadiusButton"),

        radiusResultCard:
            $("radiusResultCard"),

        radiusResultCount:
            $("radiusResultCount"),

        radiusResultText:
            $("radiusResultText"),

        radiusResultList:
            $("radiusResultList"),

        statEmpty:
            $("statEmpty"),

        statContent:
            $("statContent"),

        statCount:
            $("statCount"),

        statArea:
            $("statArea"),

        statDominant:
            $("statDominant"),

        statRadius:
            $("statRadius"),

        statBreakdown:
            $("statBreakdown"),

        openRadiusToolButton:
            $("openRadiusToolButton"),

        distanceAssetA:
            $("distanceAssetA"),

        distanceAssetB:
            $("distanceAssetB"),

        runDistanceButton:
            $("runDistanceButton"),

        resetDistanceButton:
            $("resetDistanceButton"),

        distanceResultCard:
            $("distanceResultCard"),

        distanceValue:
            $("distanceValue"),

        distanceDescription:
            $("distanceDescription"),

        resetAllButton:
            $("resetAllButton")

    };



    /* ======================================================
       HELPER
       ====================================================== */

    function isMissing(value) {

        return (
            value === null ||
            value === undefined ||
            String(value).trim() === "" ||
            String(value).trim() === "-"
        );

    }


    function text(value) {

        return isMissing(value)
            ? "—"
            : String(value).trim();

    }


    function normalize(value) {

        return isMissing(value)
            ? ""
            : String(value)
                .trim()
                .toLowerCase();

    }


    function formatNumber(
        value,
        digits = 2
    ) {

        const number =
            Number(value);


        if (!Number.isFinite(number)) {
            return "0";
        }


        return new Intl.NumberFormat(
            "id-ID",
            {
                maximumFractionDigits:
                    digits
            }
        ).format(number);

    }


    function escapeHtml(value) {

        return String(value)

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



    /* ======================================================
       IDENTITAS BIDANG

       Dipakai agar hasil radius tetap cocok
       dengan Data Aset walaupun urutan WFS berubah.
       ====================================================== */

    function assetKey(properties = {}) {

        const id =
            normalize(
                properties.id_barang
            );

        const nub =
            normalize(
                properties.nub
            );


        if (id || nub) {

            return (
                `id=${id}|nub=${nub}`
            );

        }


        return (
            `p=${normalize(properties.penggunaan)}` +
            `|k=${normalize(properties.kecamatan)}` +
            `|d=${normalize(properties.desa)}` +
            `|l=${normalize(properties.luas_m2)}`
        );

    }



    function featureReference(feature) {

        const p =
            feature?.properties || {};


        return {

            key:
                assetKey(p),

            id_barang:
                p.id_barang ?? null,

            nub:
                p.nub ?? null,

            penggunaan:
                p.penggunaan ?? null,

            kecamatan:
                p.kecamatan ?? null,

            desa:
                p.desa ?? null

        };

    }



    function featureLabel(feature) {

        const p =
            feature?.properties || {};


        const identity =
            !isMissing(p.id_barang)
                ? p.id_barang
                : !isMissing(p.nub)
                    ? `NUB ${p.nub}`
                    : `Bidang ${feature.__toolIndex + 1}`;


        return (
            `${identity} — ` +
            `${text(p.penggunaan)} — ` +
            `${text(p.desa)}`
        );

    }



    function shortFeatureLabel(feature) {

        const p =
            feature?.properties || {};


        const identity =
            !isMissing(p.id_barang)
                ? p.id_barang
                : !isMissing(p.nub)
                    ? `NUB ${p.nub}`
                    : `Bidang ${feature.__toolIndex + 1}`;


        return (
            `${identity} · ` +
            `${text(p.penggunaan)}`
        );

    }



    function getFeature(index) {

        return (
            state.features[index] ||
            null
        );

    }


    function getEntry(index) {

        return (
            state.entries[index] ||
            null
        );

    }



    function setLoading(
        show,
        message =
            "Memuat data aset..."
    ) {

        els.loadingText.textContent =
            message;


        els.loadingOverlay.hidden =
            !show;

    }



    /* ======================================================
       MAP
       ====================================================== */

    const map =
        L.map(
            "analysisMap",
            {
                zoomControl:
                    true,

                preferCanvas:
                    true
            }
        )
        .setView(
            [
                -6.72,
                108.55
            ],
            11
        );



    /* ======================================================
       BASEMAP
       ====================================================== */

    const osm =
        L.tileLayer(
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom:
                    19,

                attribution:
                    "&copy; OpenStreetMap contributors"
            }
        );


    const carto =
        L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            {
                maxZoom:
                    20,

                attribution:
                    "&copy; OpenStreetMap contributors &copy; CARTO"
            }
        );


    const esri =
        L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                maxZoom:
                    20,

                attribution:
                    "Tiles &copy; Esri"
            }
        );


    carto.addTo(map);


    L.control
        .layers(
            {
                "CARTO Light":
                    carto,

                "OpenStreetMap":
                    osm,

                "Esri Satellite":
                    esri
            },
            null,
            {
                position:
                    "topleft"
            }
        )
        .addTo(map);



    /* ======================================================
       ANALYSIS LAYERS
       ====================================================== */

    const radiusLayer =
        L.geoJSON(
            null,
            {
                style: {
                    color:
                        "#1c9ba4",

                    weight:
                        2,

                    dashArray:
                        "8 6",

                    fillColor:
                        "#1c9ba4",

                    fillOpacity:
                        0.12
                },

                interactive:
                    false
            }
        )
        .addTo(map);


    const distanceLayer =
        L.layerGroup()
            .addTo(map);


    let assetLayer =
        null;



    /* ======================================================
       STYLE ASSET
       ====================================================== */

    function getAssetStyle(feature) {

        const index =
            feature.__toolIndex;


        if (
            index ===
            state.distanceAIndex
        ) {

            return {
                color:
                    "#0f2747",

                weight:
                    3,

                fillColor:
                    "#0f2747",

                fillOpacity:
                    0.58
            };

        }


        if (
            index ===
            state.distanceBIndex
        ) {

            return {
                color:
                    "#1c9ba4",

                weight:
                    3,

                fillColor:
                    "#1c9ba4",

                fillOpacity:
                    0.58
            };

        }


        if (
            index ===
            state.radiusCenterIndex
        ) {

            return {
                color:
                    "#0f2747",

                weight:
                    3,

                fillColor:
                    "#0f2747",

                fillOpacity:
                    0.62
            };

        }


        if (
            state
                .radiusResultIndexes
                .has(index)
        ) {

            return {
                color:
                    "#b76518",

                weight:
                    2,

                fillColor:
                    "#e08a32",

                fillOpacity:
                    0.68
            };

        }


        return {
            color:
                "#53657b",

            weight:
                0.8,

            fillColor:
                "#8fa1b5",

            fillOpacity:
                0.35
        };

    }



    function refreshStyles() {

        if (!assetLayer) {
            return;
        }


        assetLayer.setStyle(
            getAssetStyle
        );


        [
            state.radiusCenterIndex,
            state.distanceAIndex,
            state.distanceBIndex
        ]
        .forEach(
            index => {

                if (
                    index === null ||
                    index === undefined
                ) {
                    return;
                }


                getEntry(index)
                    ?.layer
                    ?.bringToFront();

            }
        );

    }



    /* ======================================================
       ZOOM
       ====================================================== */

    function zoomToFeature(
        index,
        maxZoom = 18
    ) {

        const entry =
            getEntry(index);


        if (!entry?.layer) {
            return;
        }


        try {

            const bounds =
                entry.layer.getBounds();


            if (bounds.isValid()) {

                map.fitBounds(
                    bounds,
                    {
                        padding:
                            [70, 70],

                        maxZoom:
                            maxZoom
                    }
                );

            }

        }

        catch (error) {

            console.warn(
                "Zoom bidang gagal:",
                error
            );

        }

    }



    /* ======================================================
       TAB
       ====================================================== */

    function setActiveTool(tool) {

        state.activeTool =
            tool;


        els.toolTabs.forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.tool ===
                    tool
                );

            }
        );


        els.panels.forEach(
            panel => {

                panel.hidden =
                    panel.dataset.panel !==
                    tool;

            }
        );


        if (
            tool ===
            "statistik"
        ) {

            renderStatistics();

        }


        setTimeout(
            () =>
                map.invalidateSize(),
            50
        );

    }



    els.toolTabs.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    setActiveTool(
                        button.dataset.tool
                    );

                }
            );

        }
    );


    els.openRadiusToolButton
        .addEventListener(
            "click",
            () => {

                setActiveTool(
                    "radius"
                );

            }
        );



    /* ======================================================
       DROPDOWN
       ====================================================== */

    function populateAssetSelect(select) {

        const fragment =
            document.createDocumentFragment();


        state.features.forEach(
            feature => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    feature.__toolIndex;


                option.textContent =
                    featureLabel(feature);


                fragment.appendChild(
                    option
                );

            }
        );


        select.appendChild(
            fragment
        );

    }



    /* ======================================================
       RADIUS SELECTION
       ====================================================== */

    function applyRadiusSelection(
        index,
        zoom = true
    ) {

        let parsed = null;


        if (
            index !== "" &&
            index !== null &&
            index !== undefined
        ) {

            const numeric =
                Number(index);


            if (
                Number.isInteger(numeric)
            ) {

                parsed =
                    numeric;

            }

        }


        state.radiusCenterIndex =
            parsed;


        state.radiusResults =
            [];


        state.radiusResultIndexes =
            new Set();


        state.radiusFeature =
            null;


        radiusLayer.clearLayers();


        els.radiusResultCard.hidden =
            true;


        renderStatistics();

        refreshStyles();


        if (
            parsed !== null
        ) {

            els.radiusAsset.value =
                String(parsed);


            if (zoom) {

                zoomToFeature(
                    parsed
                );

            }

        }

        else {

            els.radiusAsset.value =
                "";

        }

    }



    els.radiusAsset
        .addEventListener(
            "change",
            () => {

                applyRadiusSelection(
                    els.radiusAsset.value,
                    true
                );

            }
        );



    /* ======================================================
       BBOX PREFILTER
       ====================================================== */

    function bboxIntersects(a, b) {

        return !(
            a[2] < b[0] ||
            a[0] > b[2] ||
            a[3] < b[1] ||
            a[1] > b[3]
        );

    }



    /* ======================================================
       RUN RADIUS
       ====================================================== */

    function runRadiusAnalysis() {

        const index =
            Number(
                els.radiusAsset.value
            );


        const meters =
            Number(
                els.radiusMeters.value
            );


        if (
            !Number.isInteger(index)
        ) {

            alert(
                "Pilih aset pusat terlebih dahulu."
            );

            return;

        }


        if (
            !Number.isFinite(meters) ||
            meters <= 0 ||
            meters > 10000
        ) {

            alert(
                "Masukkan radius antara 1 sampai 10.000 meter."
            );

            return;

        }


        const centerFeature =
            getFeature(index);


        if (
            !centerFeature?.geometry
        ) {

            alert(
                "Geometri aset pusat tidak tersedia."
            );

            return;

        }


        setLoading(
            true,
            "Menghitung radius dan aset di sekitarnya..."
        );


        window.setTimeout(
            () => {

                try {

                    const bufferFeature =
                        turf.buffer(
                            centerFeature,
                            meters / 1000,
                            {
                                units:
                                    "kilometers",

                                steps:
                                    32
                            }
                        );


                    if (!bufferFeature) {

                        throw new Error(
                            "Buffer tidak dapat dibuat."
                        );

                    }


                    const bufferBox =
                        turf.bbox(
                            bufferFeature
                        );


                    const results =
                        [];


                    state.features.forEach(
                        feature => {

                            if (
                                feature.__toolIndex ===
                                index ||
                                !feature.geometry
                            ) {

                                return;

                            }


                            try {

                                const featureBox =
                                    turf.bbox(
                                        feature
                                    );


                                if (
                                    !bboxIntersects(
                                        bufferBox,
                                        featureBox
                                    )
                                ) {

                                    return;

                                }


                                if (
                                    turf.booleanIntersects(
                                        bufferFeature,
                                        feature
                                    )
                                ) {

                                    results.push(
                                        feature
                                    );

                                }

                            }

                            catch (error) {

                                console.warn(
                                    "Feature dilewati:",
                                    error
                                );

                            }

                        }
                    );


                    state.radiusCenterIndex =
                        index;


                    state.radiusMeters =
                        meters;


                    state.radiusFeature =
                        bufferFeature;


                    state.radiusResults =
                        results;


                    state.radiusResultIndexes =
                        new Set(
                            results.map(
                                feature =>
                                    feature.__toolIndex
                            )
                        );


                    radiusLayer.clearLayers();


                    radiusLayer.addData(
                        bufferFeature
                    );


                    refreshStyles();

                    renderRadiusResults();

                    renderStatistics();


                    const layers = [

                        getEntry(index)
                            ?.layer,

                        ...radiusLayer
                            .getLayers(),

                        ...results
                            .map(
                                feature =>
                                    getEntry(
                                        feature.__toolIndex
                                    )
                                    ?.layer
                            )
                            .filter(Boolean)

                    ]
                    .filter(Boolean);


                    if (layers.length) {

                        const group =
                            L.featureGroup(
                                layers
                            );


                        const bounds =
                            group.getBounds();


                        if (bounds.isValid()) {

                            map.fitBounds(
                                bounds,
                                {
                                    padding:
                                        [50, 50],

                                    maxZoom:
                                        17
                                }
                            );

                        }

                    }

                }

                catch (error) {

                    console.error(
                        "RADIUS ERROR:",
                        error
                    );


                    alert(
                        "Analisis radius belum dapat dijalankan."
                    );

                }

                finally {

                    setLoading(false);

                }

            },
            30
        );

    }



    /* ======================================================
       BUKA SEMUA HASIL DI DATA ASET
       ====================================================== */

    function openAllRadiusResults() {

        if (
            !state.radiusFeature ||
            state.radiusCenterIndex === null
        ) {

            return;

        }


        const center =
            getFeature(
                state.radiusCenterIndex
            );


        const payload = {

            version:
                1,

            radiusMeters:
                state.radiusMeters,

            center:
                featureReference(
                    center
                ),

            resultCount:
                state.radiusResults.length,

            resultKeys:
                state.radiusResults.map(
                    feature =>
                        assetKey(
                            feature.properties || {}
                        )
                ),

            createdAt:
                Date.now()

        };


        sessionStorage.setItem(
            "webgis_radius_results",
            JSON.stringify(payload)
        );


        window.location.href =
            "data-aset.html";

    }



    /* ======================================================
       RENDER RADIUS RESULTS
       ====================================================== */

    function renderRadiusResults() {

        const center =
            getFeature(
                state.radiusCenterIndex
            );


        const total =
            state.radiusResults.length;


        els.radiusResultCard.hidden =
            false;


        els.radiusResultCount.textContent =
            `${total.toLocaleString("id-ID")} aset`;


        els.radiusResultText.textContent =
            `beririsan dengan radius ` +
            `${formatNumber(state.radiusMeters, 0)} m ` +
            `dari ${shortFeatureLabel(center)}.`;



        if (!total) {

            els.radiusResultList.innerHTML = `

                <div class="result-empty-small">

                    Tidak ada aset lain
                    yang masuk radius ini.

                </div>

            `;

            return;

        }



        const shown =
            state.radiusResults.slice(
                0,
                12
            );


        let html =
            shown
                .map(
                    feature => {

                        const p =
                            feature.properties || {};


                        return `

                            <button
                                class="result-item"
                                type="button"
                                data-result-index="${feature.__toolIndex}"
                            >

                                <span>

                                    <strong>
                                        ${escapeHtml(shortFeatureLabel(feature))}
                                    </strong>

                                    <small>
                                        ${escapeHtml(text(p.kecamatan))}
                                        ·
                                        ${escapeHtml(text(p.desa))}
                                    </small>

                                </span>


                                <b>
                                    ${formatNumber(p.luas_m2)} m²
                                </b>

                            </button>

                        `;

                    }
                )
                .join("");



        if (
            total > shown.length
        ) {

            html += `

                <div class="result-more">

                    +${(
                        total -
                        shown.length
                    ).toLocaleString("id-ID")}
                    aset lainnya

                </div>

            `;

        }



        /*
           Tombol utama untuk melihat SELURUH
           hasil radius di Data Aset.
        */

        html += `

            <button
                type="button"
                id="openAllRadiusResultsButton"
                class="primary-button"
                style="
                    width:100%;
                    margin-top:12px;
                    min-height:40px;
                "
            >
                Lihat Semua
                ${total.toLocaleString("id-ID")}
                Aset →
            </button>

        `;



        els.radiusResultList.innerHTML =
            html;



        els.radiusResultList
            .querySelectorAll(
                ".result-item"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            zoomToFeature(
                                Number(
                                    button.dataset.resultIndex
                                ),
                                19
                            );

                        }
                    );

                }
            );



        $("openAllRadiusResultsButton")
            ?.addEventListener(
                "click",
                openAllRadiusResults
            );

    }



    els.runRadiusButton
        .addEventListener(
            "click",
            runRadiusAnalysis
        );



    /* ======================================================
       RESET RADIUS
       ====================================================== */

    function resetRadius() {

        state.radiusCenterIndex =
            null;


        state.radiusMeters =
            100;


        state.radiusFeature =
            null;


        state.radiusResults =
            [];


        state.radiusResultIndexes =
            new Set();


        els.radiusAsset.value =
            "";


        els.radiusMeters.value =
            "100";


        els.radiusResultCard.hidden =
            true;


        radiusLayer.clearLayers();


        renderStatistics();

        refreshStyles();

    }



    els.resetRadiusButton
        .addEventListener(
            "click",
            resetRadius
        );



    /* ======================================================
       STATISTIK
       ====================================================== */

    function renderStatistics() {

        const hasAnalysis =
            Boolean(
                state.radiusFeature &&
                state.radiusCenterIndex !==
                null
            );


        els.statEmpty.hidden =
            hasAnalysis;


        els.statContent.hidden =
            !hasAnalysis;


        if (!hasAnalysis) {
            return;
        }


        const results =
            state.radiusResults;


        const total =
            results.length;


        const totalArea =
            results.reduce(
                (
                    sum,
                    feature
                ) => {

                    const value =
                        Number(
                            feature
                                ?.properties
                                ?.luas_m2
                        );


                    return (
                        sum +
                        (
                            Number.isFinite(value)
                                ? value
                                : 0
                        )
                    );

                },
                0
            );


        const usageCounts =
            new Map();


        results.forEach(
            feature => {

                const usage =
                    text(
                        feature
                            ?.properties
                            ?.penggunaan
                    );


                usageCounts.set(
                    usage,
                    (
                        usageCounts.get(
                            usage
                        ) || 0
                    ) + 1
                );

            }
        );


        const sortedUsage =
            Array.from(
                usageCounts.entries()
            )
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


        els.statCount.textContent =
            total.toLocaleString(
                "id-ID"
            );


        els.statArea.textContent =
            `${formatNumber(totalArea)} m²`;


        els.statDominant.textContent =
            sortedUsage.length
                ? sortedUsage[0][0]
                : "—";


        els.statRadius.textContent =
            `${formatNumber(state.radiusMeters, 0)} m`;



        if (!sortedUsage.length) {

            els.statBreakdown.innerHTML = `

                <div class="stat-empty-line">
                    Belum ada kategori aset
                    di dalam radius.
                </div>

            `;

            return;

        }



        els.statBreakdown.innerHTML =
            sortedUsage
                .map(
                    ([usage, count]) => {

                        const percent =
                            total
                                ? (
                                    count /
                                    total
                                ) * 100
                                : 0;


                        return `

                            <div class="breakdown-row">

                                <div class="breakdown-head">

                                    <span>
                                        ${escapeHtml(usage)}
                                    </span>

                                    <strong>
                                        ${count.toLocaleString("id-ID")}
                                        ·
                                        ${formatNumber(percent, 1)}%
                                    </strong>

                                </div>


                                <div class="breakdown-track">

                                    <span
                                        style="
                                            width:
                                            ${Math.max(percent, 2)}%
                                        "
                                    ></span>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }



    /* ======================================================
       JARAK SELECTION
       ====================================================== */

    function applyDistanceSelection(
        which,
        index,
        zoom = true
    ) {

        let parsed = null;


        if (
            index !== "" &&
            index !== null &&
            index !== undefined
        ) {

            const numeric =
                Number(index);


            if (
                Number.isInteger(numeric)
            ) {

                parsed =
                    numeric;

            }

        }


        if (which === "A") {

            state.distanceAIndex =
                parsed;


            els.distanceAssetA.value =
                parsed === null
                    ? ""
                    : String(parsed);

        }

        else {

            state.distanceBIndex =
                parsed;


            els.distanceAssetB.value =
                parsed === null
                    ? ""
                    : String(parsed);

        }


        state.distanceResult =
            null;


        distanceLayer.clearLayers();


        els.distanceResultCard.hidden =
            true;


        refreshStyles();


        if (
            zoom &&
            parsed !== null
        ) {

            zoomToFeature(parsed);

        }

    }



    els.distanceAssetA
        .addEventListener(
            "change",
            () => {

                applyDistanceSelection(
                    "A",
                    els.distanceAssetA.value,
                    true
                );

            }
        );


    els.distanceAssetB
        .addEventListener(
            "change",
            () => {

                applyDistanceSelection(
                    "B",
                    els.distanceAssetB.value,
                    true
                );

            }
        );



    /* ======================================================
       POLYGON BOUNDARY
       ====================================================== */

    function boundaryLines(feature) {

        const geometry =
            feature?.geometry;


        if (!geometry) {
            return [];
        }


        const polygons =
            geometry.type === "Polygon"
                ? [geometry.coordinates]
                : geometry.type === "MultiPolygon"
                    ? geometry.coordinates
                    : [];


        const lines = [];


        polygons.forEach(
            polygon => {

                polygon.forEach(
                    ring => {

                        if (
                            Array.isArray(ring) &&
                            ring.length >= 2
                        ) {

                            lines.push(
                                turf.lineString(ring)
                            );

                        }

                    }
                );

            }
        );


        return lines;

    }



    function boundaryVertices(feature) {

        const geometry =
            feature?.geometry;


        if (!geometry) {
            return [];
        }


        const polygons =
            geometry.type === "Polygon"
                ? [geometry.coordinates]
                : geometry.type === "MultiPolygon"
                    ? geometry.coordinates
                    : [];


        const vertices = [];


        polygons.forEach(
            polygon => {

                polygon.forEach(
                    ring => {

                        ring.forEach(
                            (
                                coordinate,
                                index
                            ) => {

                                if (
                                    index ===
                                    ring.length - 1 &&
                                    ring.length > 1
                                ) {
                                    return;
                                }


                                vertices.push(
                                    coordinate
                                );

                            }
                        );

                    }
                );

            }
        );


        return vertices;

    }



    /* ======================================================
       JARAK TERPENDEK
       ====================================================== */

    function nearestBoundaryDistance(
        featureA,
        featureB
    ) {

        if (
            turf.booleanIntersects(
                featureA,
                featureB
            )
        ) {

            return {
                meters:
                    0,

                from:
                    null,

                to:
                    null
            };

        }


        const linesA =
            boundaryLines(featureA);


        const linesB =
            boundaryLines(featureB);


        const verticesA =
            boundaryVertices(featureA);


        const verticesB =
            boundaryVertices(featureB);


        if (
            !linesA.length ||
            !linesB.length ||
            !verticesA.length ||
            !verticesB.length
        ) {

            throw new Error(
                "Batas polygon tidak tersedia."
            );

        }


        let best = {
            meters:
                Infinity,

            from:
                null,

            to:
                null
        };


        function test(
            vertices,
            lines,
            reverse = false
        ) {

            vertices.forEach(
                coordinate => {

                    const point =
                        turf.point(
                            coordinate
                        );


                    lines.forEach(
                        line => {

                            const snapped =
                                turf.nearestPointOnLine(
                                    line,
                                    point,
                                    {
                                        units:
                                            "kilometers"
                                    }
                                );


                            const meters =
                                Number(
                                    snapped
                                        .properties
                                        ?.dist
                                ) * 1000;


                            if (
                                Number.isFinite(meters) &&
                                meters < best.meters
                            ) {

                                best =
                                    reverse
                                        ? {
                                            meters,
                                            from:
                                                snapped
                                                    .geometry
                                                    .coordinates,
                                            to:
                                                coordinate
                                        }
                                        : {
                                            meters,
                                            from:
                                                coordinate,
                                            to:
                                                snapped
                                                    .geometry
                                                    .coordinates
                                        };

                            }

                        }
                    );

                }
            );

        }


        test(
            verticesA,
            linesB,
            false
        );


        test(
            verticesB,
            linesA,
            true
        );


        return best;

    }



    /* ======================================================
       HITUNG JARAK
       ====================================================== */

    function runDistanceAnalysis() {

        const aIndex =
            Number(
                els.distanceAssetA.value
            );


        const bIndex =
            Number(
                els.distanceAssetB.value
            );


        if (
            !Number.isInteger(aIndex) ||
            !Number.isInteger(bIndex)
        ) {

            alert(
                "Pilih Aset A dan Aset B terlebih dahulu."
            );

            return;

        }


        if (aIndex === bIndex) {

            alert(
                "Aset A dan Aset B harus berbeda."
            );

            return;

        }


        const featureA =
            getFeature(aIndex);


        const featureB =
            getFeature(bIndex);


        setLoading(
            true,
            "Menghitung jarak terpendek antar-aset..."
        );


        window.setTimeout(
            () => {

                try {

                    const result =
                        nearestBoundaryDistance(
                            featureA,
                            featureB
                        );


                    state.distanceAIndex =
                        aIndex;


                    state.distanceBIndex =
                        bIndex;


                    state.distanceResult =
                        result;


                    distanceLayer.clearLayers();


                    if (
                        result.meters > 0 &&
                        result.from &&
                        result.to
                    ) {

                        const line =
                            L.polyline(
                                [
                                    [
                                        result.from[1],
                                        result.from[0]
                                    ],
                                    [
                                        result.to[1],
                                        result.to[0]
                                    ]
                                ],
                                {
                                    color:
                                        "#e08a32",

                                    weight:
                                        3,

                                    dashArray:
                                        "8 6"
                                }
                            )
                            .addTo(
                                distanceLayer
                            );


                        L.circleMarker(
                            [
                                result.from[1],
                                result.from[0]
                            ],
                            {
                                radius:
                                    5,

                                color:
                                    "#0f2747",

                                fillColor:
                                    "#ffffff",

                                fillOpacity:
                                    1,

                                weight:
                                    2
                            }
                        )
                        .addTo(
                            distanceLayer
                        );


                        L.circleMarker(
                            [
                                result.to[1],
                                result.to[0]
                            ],
                            {
                                radius:
                                    5,

                                color:
                                    "#1c9ba4",

                                fillColor:
                                    "#ffffff",

                                fillOpacity:
                                    1,

                                weight:
                                    2
                            }
                        )
                        .addTo(
                            distanceLayer
                        );


                        line.bindTooltip(
                            `${formatNumber(result.meters)} m`,
                            {
                                permanent:
                                    true,

                                direction:
                                    "center",

                                className:
                                    "distance-tooltip"
                            }
                        );

                    }


                    refreshStyles();


                    renderDistanceResult(
                        featureA,
                        featureB,
                        result
                    );


                    const layers = [

                        getEntry(aIndex)
                            ?.layer,

                        getEntry(bIndex)
                            ?.layer,

                        ...distanceLayer
                            .getLayers()

                    ]
                    .filter(Boolean);


                    const group =
                        L.featureGroup(
                            layers
                        );


                    const bounds =
                        group.getBounds();


                    if (bounds.isValid()) {

                        map.fitBounds(
                            bounds,
                            {
                                padding:
                                    [70, 70],

                                maxZoom:
                                    19
                            }
                        );

                    }

                }

                catch (error) {

                    console.error(
                        "DISTANCE ERROR:",
                        error
                    );


                    alert(
                        "Jarak antar-aset belum dapat dihitung."
                    );

                }

                finally {

                    setLoading(false);

                }

            },
            30
        );

    }



    function renderDistanceResult(
        featureA,
        featureB,
        result
    ) {

        els.distanceResultCard.hidden =
            false;


        els.distanceValue.textContent =
            `${formatNumber(result.meters)} m`;


        els.distanceDescription.textContent =
            result.meters === 0
                ? (
                    `${shortFeatureLabel(featureA)} dan ` +
                    `${shortFeatureLabel(featureB)} ` +
                    `saling beririsan/bersinggungan.`
                )
                : (
                    `Jarak terpendek batas bidang ` +
                    `${shortFeatureLabel(featureA)} ` +
                    `ke ${shortFeatureLabel(featureB)}.`
                );

    }



    els.runDistanceButton
        .addEventListener(
            "click",
            runDistanceAnalysis
        );



    function resetDistance() {

        state.distanceAIndex =
            null;


        state.distanceBIndex =
            null;


        state.distanceResult =
            null;


        els.distanceAssetA.value =
            "";


        els.distanceAssetB.value =
            "";


        els.distanceResultCard.hidden =
            true;


        distanceLayer.clearLayers();

        refreshStyles();

    }



    els.resetDistanceButton
        .addEventListener(
            "click",
            resetDistance
        );



    /* ======================================================
       RESET ALL
       ====================================================== */

    function resetAll() {

        resetRadius();

        resetDistance();


        setActiveTool(
            "radius"
        );


        if (assetLayer) {

            const bounds =
                assetLayer.getBounds();


            if (bounds.isValid()) {

                map.fitBounds(
                    bounds,
                    {
                        padding:
                            [20, 20]
                    }
                );

            }

        }

    }



    els.resetAllButton
        .addEventListener(
            "click",
            resetAll
        );



    /* ======================================================
       CLICK MAP
       ====================================================== */

    function handleMapFeatureClick(entry) {

        if (
            state.activeTool ===
            "radius"
        ) {

            applyRadiusSelection(
                entry.index,
                false
            );


            zoomToFeature(
                entry.index,
                18
            );

            return;

        }


        if (
            state.activeTool ===
            "jarak"
        ) {

            if (
                state.distanceAIndex === null ||
                state.distanceBIndex !== null
            ) {

                applyDistanceSelection(
                    "A",
                    entry.index,
                    false
                );


                applyDistanceSelection(
                    "B",
                    null,
                    false
                );

            }

            else if (
                entry.index !==
                state.distanceAIndex
            ) {

                applyDistanceSelection(
                    "B",
                    entry.index,
                    false
                );

            }


            zoomToFeature(
                entry.index,
                18
            );

        }

    }



    /* ======================================================
       RESTORE ANALISIS
       ====================================================== */

    function restoreRadiusAnalysis() {

        if (
            !restoreRadiusPayload
        ) {
            return;
        }


        const targetKey =
            restoreRadiusPayload
                ?.center
                ?.key;


        if (!targetKey) {
            return;
        }


        const index =
            state.features.findIndex(
                feature =>
                    assetKey(
                        feature.properties || {}
                    ) ===
                    targetKey
            );


        if (index < 0) {

            console.warn(
                "Aset pusat radius lama tidak ditemukan."
            );

            return;

        }


        setActiveTool(
            "radius"
        );


        els.radiusMeters.value =
            String(
                restoreRadiusPayload
                    .radiusMeters ||
                100
            );


        applyRadiusSelection(
            index,
            false
        );


        /*
           Jalankan ulang analisis,
           sehingga buffer dan statistik kembali.
        */

        window.setTimeout(
            runRadiusAnalysis,
            120
        );

    }



    /* ======================================================
       LOAD DATA
       ====================================================== */

    async function loadData() {

        setLoading(
            true,
            "Memuat geometri aset untuk analisis..."
        );


        try {

            const response =
                await fetch(
                    DATA_URL,
                    {
                        cache:
                            "no-store"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Data aset merespons ${response.status}.`
                );

            }


            const data =
                await response.json();


            if (
                !Array.isArray(
                    data.features
                )
            ) {

                throw new Error(
                    "Format GeoJSON tidak sesuai."
                );

            }


            state.features =
                data.features.filter(
                    feature =>
                        feature?.geometry
                );


            state.entries =
                new Array(
                    state.features.length
                );


            state.features.forEach(
                (
                    feature,
                    index
                ) => {

                    feature.__toolIndex =
                        index;

                }
            );


            assetLayer =
                L.geoJSON(
                    {
                        type:
                            "FeatureCollection",

                        features:
                            state.features
                    },
                    {
                        style:
                            getAssetStyle,


                        onEachFeature(
                            feature,
                            layer
                        ) {

                            const entry = {

                                index:
                                    feature.__toolIndex,

                                feature,
                                layer

                            };


                            state.entries[
                                entry.index
                            ] =
                                entry;


                            layer.on(
                                "click",
                                () => {

                                    handleMapFeatureClick(
                                        entry
                                    );

                                }
                            );


                            layer.bindTooltip(
                                () =>
                                    shortFeatureLabel(
                                        feature
                                    ),
                                {
                                    sticky:
                                        true,

                                    direction:
                                        "top",

                                    className:
                                        "asset-hover-tooltip"
                                }
                            );

                        }
                    }
                )
                .addTo(map);


            populateAssetSelect(
                els.radiusAsset
            );


            populateAssetSelect(
                els.distanceAssetA
            );


            populateAssetSelect(
                els.distanceAssetB
            );


            els.dataStatus.textContent =
                `${state.features.length.toLocaleString("id-ID")} ` +
                `aset siap dianalisis`;


            const bounds =
                assetLayer.getBounds();


            if (bounds.isValid()) {

                map.fitBounds(
                    bounds,
                    {
                        padding:
                            [20, 20]
                    }
                );

            }


            refreshStyles();


            /*
               Kalau datang kembali dari Data Aset,
               kembalikan analisis radius.
            */

            restoreRadiusAnalysis();

        }

        catch (error) {

            console.error(
                "ALAT DATA ERROR:",
                error
            );


            els.dataStatus.textContent =
                "Data aset gagal dimuat";


            alert(
                "Data aset tidak dapat dimuat dari GeoServer."
            );

        }

        finally {

            setLoading(false);


            setTimeout(
                () =>
                    map.invalidateSize(),
                50
            );

        }

    }



    /* ======================================================
       START
       ====================================================== */

    loadData();


})();
