/* ======================================================
   ROLE / SESSION
   ====================================================== */

const role =
    getUserRole();


if (!role) {

    window.location.href =
        "index.html";

}


document
    .getElementById("roleBadge")
    .textContent =
        role || "guest";



/* ======================================================
   FIELD WAJIB
   ====================================================== */

const requiredFields = [

    "id_barang",
    "penggunaan",
    "nub",
    "luas_m2",
    "kecamatan",
    "desa",
    "status",
    "keterangan"

];


const fieldLabels = {

    id_barang:
        "NIB / ID Barang",

    penggunaan:
        "Penggunaan",

    nub:
        "NUB",

    luas_m2:
        "Luas",

    kecamatan:
        "Kecamatan",

    desa:
        "Desa/Kelurahan",

    status:
        "Status",

    keterangan:
        "Keterangan"

};



/* ======================================================
   BASIC HELPERS
   ====================================================== */

function isMissing(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return true;

    }


    const text =
        String(value).trim();


    return (
        text === "" ||
        text === "-"
    );

}



function displayValue(value) {

    return isMissing(value)

        ? "—"

        : String(value).trim();

}



function formatNumber(value) {

    const numeric =
        Number(value);


    if (
        !Number.isFinite(
            numeric
        )
    ) {

        return "—";

    }


    return new Intl.NumberFormat(
        "id-ID",
        {
            maximumFractionDigits:
                2
        }
    )
    .format(
        numeric
    );

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



function normalizedText(value) {

    return isMissing(value)

        ? ""

        : String(value)
            .trim()
            .toLowerCase();

}



/* ======================================================
   KELENGKAPAN
   ====================================================== */

function getCompleteness(feature) {

    const properties =
        feature?.properties ||
        {};


    const missingFields =
        requiredFields.filter(
            field =>
                isMissing(
                    properties[field]
                )
        );


    return {

        type:
            missingFields.length ===
            0

                ? "lengkap"

                : "kurang",

        missingFields:
            missingFields

    };

}



/* ======================================================
   FILTER / FOCUS DARI HALAMAN LAIN
   ====================================================== */

const initialCompletenessFilter =
    sessionStorage.getItem(
        "webgis_completeness_filter"
    );


sessionStorage.removeItem(
    "webgis_completeness_filter"
);



let pendingMapFocus =
    null;


try {

    const storedFocus =
        sessionStorage.getItem(
            "webgis_map_focus_asset"
        );


    if (
        storedFocus
    ) {

        pendingMapFocus =
            JSON.parse(
                storedFocus
            );

    }

}

catch (
    error
) {

    console.warn(
        "Focus asset tidak dapat dibaca:",
        error
    );

}


sessionStorage.removeItem(
    "webgis_map_focus_asset"
);



/* ======================================================
   MAP
   ====================================================== */

const map =
    L.map(
        "map",
        {
            zoomControl:
                true
        }
    )
    .setView(
        [-6.70, 108.56],
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


const cartoLight =
    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
            maxZoom:
                20,

            attribution:
                "&copy; OpenStreetMap contributors &copy; CARTO"
        }
    );


const esriSatellite =
    L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom:
                20,

            attribution:
                "Tiles &copy; Esri"
        }
    );


osm.addTo(
    map
);


L.control
    .layers(
        {
            "OpenStreetMap":
                osm,

            "CARTO Light":
                cartoLight,

            "Esri Satellite":
                esriSatellite
        },
        null,
        {
            position:
                "topleft"
        }
    )
    .addTo(
        map
    );



/* ======================================================
   SCALE BAR
   ====================================================== */

const metricScaleControl =
    L.control(
        {
            position:
                "bottomleft"
        }
    );


metricScaleControl.onAdd =
    function () {

        const container =
            L.DomUtil.create(
                "div",
                "metric-scale-control"
            );


        container.innerHTML = `

            <div
                class="metric-scale-dynamic"
                id="metricScaleDynamic"
            >

                <div
                    class="
                        metric-scale-labels
                        metric-scale-labels-top
                    "
                >

                    <span>
                        0
                    </span>

                    <span id="metricScaleKm">
                        — km
                    </span>

                </div>


                <div class="metric-scale-bars">

                    <div
                        class="
                            metric-scale-row
                            metric-scale-row-top
                        "
                    >

                        <span class="metric-scale-segment"></span>
                        <span class="metric-scale-segment"></span>
                        <span class="metric-scale-segment"></span>
                        <span class="metric-scale-segment"></span>

                    </div>


                    <div
                        class="
                            metric-scale-row
                            metric-scale-row-bottom
                        "
                    >

                        <span class="metric-scale-segment"></span>
                        <span class="metric-scale-segment"></span>
                        <span class="metric-scale-segment"></span>
                        <span class="metric-scale-segment"></span>

                    </div>

                </div>


                <div
                    class="
                        metric-scale-labels
                        metric-scale-labels-bottom
                    "
                >

                    <span>
                        0
                    </span>

                    <span id="metricScaleM">
                        — m
                    </span>

                </div>

            </div>

        `;


        return container;

    };


metricScaleControl.addTo(
    map
);



function getNiceScaleDistance(
    maxMeters
) {

    if (
        !Number.isFinite(
            maxMeters
        ) ||
        maxMeters <=
        0
    ) {

        return 1;

    }


    const exponent =
        Math.floor(
            Math.log10(
                maxMeters
            )
        );


    const base =
        Math.pow(
            10,
            exponent
        );


    const normalized =
        maxMeters /
        base;


    let factor =
        1;


    if (
        normalized >=
        5
    ) {

        factor =
            5;

    }

    else if (
        normalized >=
        2.5
    ) {

        factor =
            2.5;

    }

    else if (
        normalized >=
        2
    ) {

        factor =
            2;

    }


    return (
        factor *
        base
    );

}



/* ======================================================
   UPDATE SCALE
   ====================================================== */

function updateMetricScale() {

    const mapSize =
        map.getSize();


    const maximumWidth =
        Math.min(

            260,

            Math.max(
                120,
                mapSize.x *
                0.45
            )

        );


    const middleY =
        mapSize.y /
        2;


    const leftPoint =
        map.containerPointToLatLng(
            [
                0,
                middleY
            ]
        );


    const rightPoint =
        map.containerPointToLatLng(
            [
                maximumWidth,
                middleY
            ]
        );


    const maximumMeters =
        map.distance(
            leftPoint,
            rightPoint
        );


    const scaleMeters =
        getNiceScaleDistance(
            maximumMeters
        );


    const scaleWidth =
        Math.round(

            maximumWidth *

            (
                scaleMeters /
                maximumMeters
            )

        );


    const dynamicElement =
        document.getElementById(
            "metricScaleDynamic"
        );


    if (
        !dynamicElement
    ) {

        return;

    }


    dynamicElement.style.width =
        `${scaleWidth}px`;


    const kmElement =
        document.getElementById(
            "metricScaleKm"
        );


    const meterElement =
        document.getElementById(
            "metricScaleM"
        );


    if (
        kmElement
    ) {

        kmElement.textContent =

            new Intl.NumberFormat(
                "id-ID",
                {
                    maximumFractionDigits:
                        3
                }
            )
            .format(
                scaleMeters /
                1000
            ) +

            " km";

    }


    if (
        meterElement
    ) {

        meterElement.textContent =

            new Intl.NumberFormat(
                "id-ID",
                {
                    maximumFractionDigits:
                        0
                }
            )
            .format(
                scaleMeters
            ) +

            " m";

    }

}


map.whenReady(
    updateMetricScale
);


map.on(
    "zoomend moveend resize",
    updateMetricScale
);



/* ======================================================
   KOORDINAT
   ====================================================== */

const coordinateValue =
    document.getElementById(
        "coordinateValue"
    );


map.on(
    "click",
    event => {

        const lat =
            event.latlng.lat;


        const lng =
            event.latlng.lng;


        coordinateValue.textContent =

            `${Math.abs(lng).toFixed(6)}° ${lng >= 0 ? "E" : "W"}` +

            " | " +

            `${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? "N" : "S"}` +

            " | EPSG:4326";

    }
);



/* ======================================================
   WFS
   ====================================================== */

const wfsUrl =

    "http://localhost:8080/geoserver/bkad_cirebon/ows" +

    "?service=WFS" +

    "&version=2.0.0" +

    "&request=GetFeature" +

    "&typeNames=bkad_cirebon:aset_pemda" +

    "&outputFormat=application/json" +

    "&srsName=EPSG:4326" +

    "&count=100000";



/* ======================================================
   GLOBAL STATE
   ====================================================== */

let asetLayer =
    null;


let allFeatures =
    [];


let featureLayerEntries =
    [];


let currentMapMode =

    initialCompletenessFilter

        ? "kelengkapan"

        : "penggunaan";


let activeCompletenessFilter =

    initialCompletenessFilter ||

    null;


let searchActive =
    false;


let searchResultIndexes =
    new Set();


let selectedEntry =
    null;



/* ======================================================
   COLORS
   ====================================================== */

const usageColors = {

    "Baperkam":
        "#8B6FA8",

    "Brandgang":
        "#8C7568",

    "Fasilitas Kesehatan":
        "#D95F59",

    "Fasilitas Sosial":
        "#59A6B8",

    "Fasilitas Umum":
        "#C77B70",

    "Gerbang":
        "#68758A",

    "Jalan":
        "#E08A32",

    "Jalur Hijau":
        "#8EBD52",

    "Pendidikan":
        "#E7B93E",

    "Pompa":
        "#2AA89A",

    "Pos":
        "#C45A7A",

    "RTH":
        "#4FAF68",

    "Saluran":
        "#3A9FD4",

    "Sarana Olahraga":
        "#A6C84B",

    "Sarana Peribadatan":
        "#A88345",

    "STK":
        "#6577C8",

    "Taman":
        "#33B47C",

    "TPS":
        "#765B46",

    "TPU":
        "#9B984D",

    "Tidak diketahui":
        "#9AA4B2"

};


const statusColors = {

    "Terukur":
        "#4C78A8",

    "Pembuatan PBT":
        "#E39C37",

    "Pembuatan Nomor GU":
        "#A66DB4",

    "Pemetaan":
        "#38A6A5",

    "Selesai (Informasi Spasial)":
        "#3D9C68",

    "Tidak diketahui":
        "#9AA4B2"

};


const completenessColors = {

    lengkap:
        "#168A62",

    kurang:
        "#C97A18"

};



/* ======================================================
   CATEGORY HELPERS
   ====================================================== */

function getUsageName(
    feature
) {

    const value =
        feature
            ?.properties
            ?.penggunaan;


    return isMissing(
        value
    )

        ? "Tidak diketahui"

        : String(value)
            .trim();

}



function getStatusName(
    feature
) {

    const value =
        feature
            ?.properties
            ?.status;


    return isMissing(
        value
    )

        ? "Tidak diketahui"

        : String(value)
            .trim();

}



/* ======================================================
   AUTO COLOR
   ====================================================== */

function stringToHue(
    text
) {

    let hash =
        0;


    for (
        let i =
            0;

        i <
            text.length;

        i++
    ) {

        hash =

            (
                hash *
                31 +

                text.charCodeAt(
                    i
                )
            ) %

            360;

    }


    return Math.abs(
        hash
    );

}



function hslToHex(
    h,
    s,
    l
) {

    s /=
        100;


    l /=
        100;


    const k =
        n =>
            (
                n +
                h /
                30
            ) %
            12;


    const a =
        s *
        Math.min(
            l,
            1 -
            l
        );


    const f =
        n =>
            l -
            a *
            Math.max(

                -1,

                Math.min(

                    k(n) -
                    3,

                    Math.min(
                        9 -
                        k(n),
                        1
                    )

                )

            );


    return (

        "#" +

        [
            f(0),
            f(8),
            f(4)
        ]

            .map(
                value =>
                    Math.round(
                        255 *
                        value
                    )
                    .toString(
                        16
                    )
                    .padStart(
                        2,
                        "0"
                    )
            )

            .join("")

    );

}



function getUsageColor(
    feature
) {

    const usage =
        getUsageName(
            feature
        );


    if (
        !usageColors[
            usage
        ]
    ) {

        usageColors[
            usage
        ] =

            hslToHex(

                stringToHue(
                    usage
                ),

                48,

                58

            );

    }


    return usageColors[
        usage
    ];

}



/* ======================================================
   DARKEN HEX
   ====================================================== */

function darkenHex(
    hex,
    amount = 0.25
) {

    const numeric =
        parseInt(

            hex.replace(
                "#",
                ""
            ),

            16

        );


    const factor =
        1 -
        amount;


    const r =
        Math.round(

            (
                (
                    numeric >>
                    16
                ) &
                255
            ) *

            factor

        );


    const g =
        Math.round(

            (
                (
                    numeric >>
                    8
                ) &
                255
            ) *

            factor

        );


    const b =
        Math.round(

            (
                numeric &
                255
            ) *

            factor

        );


    return (

        "#" +

        [
            r,
            g,
            b
        ]

            .map(
                value =>
                    value
                        .toString(
                            16
                        )
                        .padStart(
                            2,
                            "0"
                        )
            )

            .join("")

    );

}



/* ======================================================
   BASE STYLES
   ====================================================== */

function usageStyle(
    feature
) {

    const fillColor =
        getUsageColor(
            feature
        );


    return {

        color:
            darkenHex(
                fillColor,
                0.28
            ),

        weight:
            1,

        opacity:
            0.95,

        fillColor:
            fillColor,

        fillOpacity:
            0.66

    };

}



function statusStyle(
    feature
) {

    const fillColor =

        statusColors[
            getStatusName(
                feature
            )
        ] ||

        statusColors[
            "Tidak diketahui"
        ];


    return {

        color:
            darkenHex(
                fillColor
            ),

        weight:
            1,

        opacity:
            0.95,

        fillColor:
            fillColor,

        fillOpacity:
            0.68

    };

}



function completenessStyle(
    feature
) {

    const type =
        getCompleteness(
            feature
        ).type;


    const fillColor =
        completenessColors[
            type
        ];


    return {

        color:
            darkenHex(
                fillColor
            ),

        weight:
            1.1,

        opacity:
            0.95,

        fillColor:
            fillColor,

        fillOpacity:
            0.70

    };

}



/* ======================================================
   DISPLAY STYLE
   ====================================================== */

function getBaseStyle(
    feature
) {

    if (
        currentMapMode ===
        "status"
    ) {

        return statusStyle(
            feature
        );

    }


    if (
        currentMapMode ===
        "kelengkapan"
    ) {

        return completenessStyle(
            feature
        );

    }


    return usageStyle(
        feature
    );

}



function getDisplayStyle(
    feature
) {

    const baseStyle =
        getBaseStyle(
            feature
        );


    const index =
        feature.__webgisIndex;



    /* FILTER DASHBOARD */

    if (
        activeCompletenessFilter
    ) {

        const selected =

            getCompleteness(
                feature
            ).type ===

            activeCompletenessFilter;


        if (
            !selected
        ) {

            return {

                ...baseStyle,

                color:
                    "#ABB5C1",

                weight:
                    0.6,

                opacity:
                    0.5,

                fillColor:
                    "#CBD2DA",

                fillOpacity:
                    0.08

            };

        }


        return {

            ...baseStyle,

            weight:
                1.6,

            fillOpacity:
                0.78

        };

    }



    /* SEARCH */

    if (
        searchActive
    ) {

        const isResult =
            searchResultIndexes.has(
                index
            );


        if (
            !isResult
        ) {

            return {

                ...baseStyle,

                color:
                    "#AEB8C5",

                weight:
                    0.5,

                opacity:
                    0.45,

                fillOpacity:
                    0.08

            };

        }


        return {

            ...baseStyle,

            color:
                "#0097A7",

            weight:
                3,

            opacity:
                1,

            fillOpacity:
                Math.max(
                    baseStyle.fillOpacity,
                    0.70
                )

        };

    }



    /* SELECTED */

    if (
        selectedEntry &&

        selectedEntry.index ===
        index
    ) {

        return {

            ...baseStyle,

            color:
                "#0F2747",

            weight:
                4,

            opacity:
                1,

            fillOpacity:
                Math.max(
                    baseStyle.fillOpacity,
                    0.78
                )

        };

    }


    return baseStyle;

}



/* ======================================================
   REFRESH STYLE
   ====================================================== */

function refreshAssetStyles() {

    if (
        !asetLayer
    ) {

        return;

    }


    asetLayer.setStyle(
        getDisplayStyle
    );


    if (
        selectedEntry
            ?.layer
    ) {

        selectedEntry
            .layer
            .bringToFront();

    }

}



/* ======================================================
   MODE UI
   ====================================================== */

const modeButtons =
    Array.from(
        document.querySelectorAll(
            ".map-style-button"
        )
    );


function updateModeButtons() {

    modeButtons.forEach(
        button => {

            button.classList.toggle(

                "active",

                button.dataset.mode ===
                currentMapMode

            );

        }
    );

}



/* ======================================================
   LEGEND
   ====================================================== */

const mapLegend =
    document.getElementById(
        "mapLegend"
    );


const legendToggle =
    document.getElementById(
        "legendToggle"
    );


const legendToggleIcon =
    document.getElementById(
        "legendToggleIcon"
    );


const legendTitle =
    document.getElementById(
        "legendTitle"
    );


const legendItems =
    document.getElementById(
        "legendItems"
    );



function addLegendItem(
    name,
    color
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "legend-item";


    item.innerHTML = `

        <span
            class="legend-color"
            style="background:${escapeHtml(color)}"
        ></span>

        <span class="legend-name">
            ${escapeHtml(name)}
        </span>

    `;


    legendItems.appendChild(
        item
    );

}



/* ======================================================
   BUILD LEGEND
   ====================================================== */

function buildLegend() {

    legendItems.innerHTML =
        "";


    if (
        currentMapMode ===
        "penggunaan"
    ) {

        legendTitle.textContent =
            "Legenda Penggunaan";


        const names =
            Array.from(
                new Set(
                    allFeatures.map(
                        feature =>
                            getUsageName(
                                feature
                            )
                    )
                )
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


        names.forEach(
            name => {

                addLegendItem(

                    name,

                    getUsageColor(
                        {
                            properties:
                                {
                                    penggunaan:
                                        name
                                }
                        }
                    )

                );

            }
        );


        return;

    }



    if (
        currentMapMode ===
        "status"
    ) {

        legendTitle.textContent =
            "Legenda Status";


        const preferredOrder = [

            "Terukur",
            "Pembuatan PBT",
            "Pembuatan Nomor GU",
            "Pemetaan",
            "Selesai (Informasi Spasial)",
            "Tidak diketahui"

        ];


        const names =
            Array.from(
                new Set(
                    allFeatures.map(
                        feature =>
                            getStatusName(
                                feature
                            )
                    )
                )
            );


        names.sort(
            (
                a,
                b
            ) => {

                const aIndex =
                    preferredOrder.indexOf(
                        a
                    );


                const bIndex =
                    preferredOrder.indexOf(
                        b
                    );


                if (
                    aIndex !==
                    -1 &&
                    bIndex !==
                    -1
                ) {

                    return (
                        aIndex -
                        bIndex
                    );

                }


                if (
                    aIndex !==
                    -1
                ) {

                    return -1;

                }


                if (
                    bIndex !==
                    -1
                ) {

                    return 1;

                }


                return a.localeCompare(
                    b,
                    "id"
                );

            }
        );


        names.forEach(
            name => {

                addLegendItem(

                    name,

                    statusColors[
                        name
                    ] ||

                    statusColors[
                        "Tidak diketahui"
                    ]

                );

            }
        );


        return;

    }



    legendTitle.textContent =
        "Legenda Kelengkapan";


    addLegendItem(
        "Data Lengkap",
        completenessColors.lengkap
    );


    addLegendItem(
        "Data Belum Lengkap",
        completenessColors.kurang
    );

}



/* ======================================================
   LEGEND TOGGLE
   ====================================================== */

legendToggle.addEventListener(
    "click",
    () => {

        const expanded =
            mapLegend.classList.toggle(
                "expanded"
            );


        legendToggle.setAttribute(
            "aria-expanded",
            String(
                expanded
            )
        );


        legendToggleIcon.textContent =

            expanded

                ? "−"

                : "+";


        window.setTimeout(
            renderRepresentativeLabels,
            70
        );

    }
);



/* ======================================================
   DASHBOARD INFO
   ====================================================== */

const infoPanel =
    document.getElementById(
        "mapInfoPanel"
    );


const infoTitle =
    document.getElementById(
        "mapInfoTitle"
    );


const infoCount =
    document.getElementById(
        "mapInfoCount"
    );


const infoDescription =
    document.getElementById(
        "mapInfoDescription"
    );


const viewFilteredData =
    document.getElementById(
        "viewFilteredData"
    );



/* ======================================================
   SEARCH UI
   ====================================================== */

const searchControl =
    document.getElementById(
        "searchControl"
    );


const searchToggleButton =
    document.getElementById(
        "searchToggleButton"
    );


const searchCloseButton =
    document.getElementById(
        "searchCloseButton"
    );


const assetSearchForm =
    document.getElementById(
        "assetSearchForm"
    );


const searchNib =
    document.getElementById(
        "searchNib"
    );


const searchKecamatan =
    document.getElementById(
        "searchKecamatan"
    );


const searchPenggunaan =
    document.getElementById(
        "searchPenggunaan"
    );


const searchResetButton =
    document.getElementById(
        "searchResetButton"
    );


const searchResultInfo =
    document.getElementById(
        "searchResultInfo"
    );



function setSearchPanelOpen(
    open
) {

    searchControl.classList.toggle(
        "open",
        open
    );


    searchToggleButton.setAttribute(
        "aria-expanded",
        String(
            open
        )
    );


    window.setTimeout(
        renderRepresentativeLabels,
        70
    );

}



searchToggleButton.addEventListener(
    "click",
    () => {

        setSearchPanelOpen(

            !searchControl
                .classList
                .contains(
                    "open"
                )

        );

    }
);



searchCloseButton.addEventListener(
    "click",
    () => {

        setSearchPanelOpen(
            false
        );

    }
);



/* ======================================================
   SEARCH OPTIONS
   ====================================================== */

function buildSearchOptions() {

    const kecamatanValues =
        Array.from(
            new Set(
                allFeatures
                    .map(
                        feature =>
                            feature
                                ?.properties
                                ?.kecamatan
                    )
                    .filter(
                        value =>
                            !isMissing(
                                value
                            )
                    )
                    .map(
                        value =>
                            String(value)
                                .trim()
                    )
            )
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


    kecamatanValues.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                value;


            option.textContent =
                value;


            searchKecamatan.appendChild(
                option
            );

        }
    );


    const usageValues =
        Array.from(
            new Set(
                allFeatures.map(
                    feature =>
                        getUsageName(
                            feature
                        )
                )
            )
        )
        .filter(
            value =>
                value !==
                "Tidak diketahui"
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


    usageValues.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                value;


            option.textContent =
                value;


            searchPenggunaan.appendChild(
                option
            );

        }
    );

}



/* ======================================================
   RUN SEARCH
   ====================================================== */

function runSearch() {

    const nibQuery =
        searchNib
            .value
            .trim()
            .toLowerCase();


    const kecamatanQuery =
        searchKecamatan
            .value
            .trim()
            .toLowerCase();


    const penggunaanQuery =
        searchPenggunaan
            .value
            .trim()
            .toLowerCase();


    activeCompletenessFilter =
        null;


    infoPanel.classList.remove(
        "visible"
    );


    mapLegend.classList.remove(
        "hidden"
    );


    searchResultIndexes =
        new Set();


    featureLayerEntries.forEach(
        entry => {

            const properties =
                entry.feature
                    .properties ||
                {};


            const idBarang =
                String(
                    properties.id_barang ??
                    ""
                )
                .trim()
                .toLowerCase();


            const nib =
                String(
                    properties.nib ??
                    ""
                )
                .trim()
                .toLowerCase();


            const kecamatan =
                String(
                    properties.kecamatan ??
                    ""
                )
                .trim()
                .toLowerCase();


            const penggunaan =
                String(
                    properties.penggunaan ??
                    ""
                )
                .trim()
                .toLowerCase();


            const nibMatch =

                !nibQuery ||

                idBarang.includes(
                    nibQuery
                ) ||

                nib.includes(
                    nibQuery
                );


            const kecamatanMatch =

                !kecamatanQuery ||

                kecamatan ===
                kecamatanQuery;


            const penggunaanMatch =

                !penggunaanQuery ||

                penggunaan ===
                penggunaanQuery;


            if (
                nibMatch &&
                kecamatanMatch &&
                penggunaanMatch
            ) {

                searchResultIndexes.add(
                    entry.index
                );

            }

        }
    );


    searchActive =
        true;


    selectedEntry =
        null;


    closeAssetDetail();


    map.closePopup();


    refreshAssetStyles();


    const resultEntries =
        featureLayerEntries.filter(
            entry =>
                searchResultIndexes.has(
                    entry.index
                )
        );


    const count =
        resultEntries.length;


    searchResultInfo.textContent =

        count >
        0

            ? `${count.toLocaleString("id-ID")} bidang ditemukan`

            : "Tidak ada bidang ditemukan";


    if (
        count >
        0
    ) {

        const bounds =
            L.latLngBounds();


        resultEntries.forEach(
            entry => {

                try {

                    const layerBounds =
                        entry.layer.getBounds();


                    if (
                        layerBounds.isValid()
                    ) {

                        bounds.extend(
                            layerBounds
                        );

                    }

                }

                catch (
                    error
                ) {

                }

            }
        );


        if (
            bounds.isValid()
        ) {

            map.fitBounds(
                bounds,
                {
                    padding:
                        [55, 55],

                    maxZoom:
                        18
                }
            );

        }

    }


    renderRepresentativeLabels();

}



assetSearchForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        runSearch();

    }
);



/* ======================================================
   RESET SEARCH
   ====================================================== */

function resetSearch() {

    searchNib.value =
        "";


    searchKecamatan.value =
        "";


    searchPenggunaan.value =
        "";


    searchActive =
        false;


    searchResultIndexes.clear();


    selectedEntry =
        null;


    searchResultInfo.textContent =

        `${allFeatures.length.toLocaleString("id-ID")} bidang tersedia`;


    map.closePopup();


    closeAssetDetail();


    refreshAssetStyles();


    if (
        asetLayer
    ) {

        const bounds =
            asetLayer.getBounds();


        if (
            bounds.isValid()
        ) {

            map.fitBounds(
                bounds,
                {
                    padding:
                        [20, 20]
                }
            );

        }

    }


    renderRepresentativeLabels();

}



searchResetButton.addEventListener(
    "click",
    resetSearch
);



/* ======================================================
   POPUP
   ====================================================== */

function buildPopupContent(
    entry
) {

    const properties =
        entry.feature
            .properties ||
        {};


    const usage =
        getUsageName(
            entry.feature
        );


    return `

        <div class="asset-popup">

            <h3 class="asset-popup-title">
                ${escapeHtml(usage)}
            </h3>


            <div class="asset-popup-grid">

                <div class="asset-popup-row">

                    <small>
                        NIB / ID Barang
                    </small>

                    <strong>

                        ${escapeHtml(
                            displayValue(
                                properties.id_barang
                            )
                        )}

                    </strong>

                </div>


                <div class="asset-popup-row">

                    <small>
                        NUB
                    </small>

                    <strong>

                        ${escapeHtml(
                            displayValue(
                                properties.nub
                            )
                        )}

                    </strong>

                </div>


                <div class="asset-popup-row">

                    <small>
                        Luas
                    </small>

                    <strong>

                        ${formatNumber(properties.luas_m2)} m²

                    </strong>

                </div>

            </div>


            <button
                type="button"
                class="asset-popup-detail-button"
                data-entry-index="${entry.index}"
            >
                Selengkapnya
            </button>

        </div>

    `;

}



/* ======================================================
   DETAIL PANEL MAP
   ====================================================== */

const mapRightStack =
    document.getElementById(
        "mapRightStack"
    );


const assetDetailClose =
    document.getElementById(
        "assetDetailClose"
    );


const detailUsage =
    document.getElementById(
        "detailUsage"
    );


const assetDetailContent =
    document.getElementById(
        "assetDetailContent"
    );



function createDetailRow(
    label,
    value
) {

    return `

        <div class="detail-row">

            <span class="detail-label">
                ${escapeHtml(label)}
            </span>

            <div class="detail-value">
                ${escapeHtml(value)}
            </div>

        </div>

    `;

}



/* ======================================================
   OPEN MAP DETAIL
   ====================================================== */

function openAssetDetail(
    entry
) {

    if (
        !entry
    ) {

        return;

    }


    selectedEntry =
        entry;


    refreshAssetStyles();


    const properties =
        entry.feature
            .properties ||
        {};


    const completeness =
        getCompleteness(
            entry.feature
        );


    detailUsage.textContent =
        getUsageName(
            entry.feature
        );


    let html =
        "";


    html +=
        createDetailRow(
            "NIB / ID Barang",
            displayValue(
                properties.id_barang
            )
        );


    html +=
        createDetailRow(
            "Penggunaan",
            displayValue(
                properties.penggunaan
            )
        );


    html +=
        createDetailRow(
            "NUB",
            displayValue(
                properties.nub
            )
        );


    html +=
        createDetailRow(
            "Luas",

            Number.isFinite(
                Number(
                    properties.luas_m2
                )
            )

                ? `${formatNumber(properties.luas_m2)} m²`

                : "—"
        );


    html +=
        createDetailRow(
            "Kecamatan",
            displayValue(
                properties.kecamatan
            )
        );


    html +=
        createDetailRow(
            "Desa/Kelurahan",
            displayValue(
                properties.desa
            )
        );


    html +=
        createDetailRow(
            "Status",
            displayValue(
                properties.status
            )
        );


    html +=
        createDetailRow(
            "Keterangan",
            displayValue(
                properties.keterangan
            )
        );


    const completenessColor =

        completeness.type ===
        "lengkap"

            ? completenessColors.lengkap

            : completenessColors.kurang;


    html += `

        <div class="detail-row">

            <span class="detail-label">
                Kelengkapan Data
            </span>

            <div class="detail-value">

                <span class="detail-status">

                    <span
                        class="detail-status-dot"
                        style="background:${completenessColor}"
                    ></span>

                    ${
                        completeness.type ===
                        "lengkap"

                            ? "Lengkap"

                            : "Belum Lengkap"
                    }

                </span>

            </div>

    `;


    if (
        completeness.type ===
        "kurang"
    ) {

        html += `

            <ul class="detail-missing">

                ${
                    completeness
                        .missingFields
                        .map(
                            field =>
                                `<li>${escapeHtml(fieldLabels[field] || field)}</li>`
                        )
                        .join("")
                }

            </ul>

        `;

    }


    html +=
        "</div>";


    assetDetailContent.innerHTML =
        html;


    mapRightStack.classList.add(
        "detail-open"
    );


    window.setTimeout(
        renderRepresentativeLabels,
        80
    );

}



/* ======================================================
   CLOSE MAP DETAIL
   ====================================================== */

function closeAssetDetail() {

    mapRightStack.classList.remove(
        "detail-open"
    );


    if (
        selectedEntry
    ) {

        selectedEntry =
            null;


        refreshAssetStyles();

    }


    window.setTimeout(
        renderRepresentativeLabels,
        80
    );

}



assetDetailClose.addEventListener(
    "click",
    closeAssetDetail
);



/* ======================================================
   POPUP BUTTON
   ====================================================== */

map.on(
    "popupopen",
    event => {

        const popupElement =
            event.popup
                .getElement();


        if (
            !popupElement
        ) {

            return;

        }


        const button =
            popupElement.querySelector(
                ".asset-popup-detail-button"
            );


        if (
            !button
        ) {

            return;

        }


        button.addEventListener(
            "click",
            () => {

                const index =
                    Number(
                        button
                            .dataset
                            .entryIndex
                    );


                const entry =
                    featureLayerEntries.find(
                        item =>
                            item.index ===
                            index
                    );


                openAssetDetail(
                    entry
                );


                map.closePopup();

            }
        );

    }
);



/* ======================================================
   FEATURE CLICK
   ====================================================== */

function handleFeatureClick(
    entry,
    event
) {

    selectedEntry =
        entry;


    refreshAssetStyles();


    L.popup(
        {
            maxWidth:
                260,

            closeButton:
                true,

            autoPan:
                true
        }
    )

        .setLatLng(
            event.latlng
        )

        .setContent(
            buildPopupContent(
                entry
            )
        )

        .openOn(
            map
        );

}



/* ======================================================
   LABEL ENGINE
   ====================================================== */

const labelMinZoom =
    17;


const labelMarkerGroup =
    L.layerGroup()
        .addTo(
            map
        );



function getFeatureAnchor(
    layer
) {

    try {

        if (
            typeof layer.getCenter ===
            "function"
        ) {

            const center =
                layer.getCenter();


            if (
                center
            ) {

                return center;

            }

        }

    }

    catch (
        error
    ) {

    }


    try {

        const bounds =
            layer.getBounds();


        if (
            bounds &&
            bounds.isValid()
        ) {

            return bounds.getCenter();

        }

    }

    catch (
        error
    ) {

    }


    return null;

}



/* ======================================================
   LABEL SIZE
   ====================================================== */

function estimateLabelSize(
    text
) {

    return {

        width:
            Math.max(

                28,

                Math.min(

                    155,

                    text.length *
                    5.7 +
                    10

                )

            ),

        height:
            18

    };

}



function makeRect(
    x,
    y,
    width,
    height
) {

    return {

        left:
            x -
            width /
            2,

        right:
            x +
            width /
            2,

        top:
            y -
            height /
            2,

        bottom:
            y +
            height /
            2

    };

}



function rectsOverlap(
    a,
    b,
    margin = 3
) {

    return !(

        a.right +
        margin <
        b.left ||

        a.left -
        margin >
        b.right ||

        a.bottom +
        margin <
        b.top ||

        a.top -
        margin >
        b.bottom

    );

}



/* ======================================================
   UI OBSTACLES
   ====================================================== */

function getUIObstacleRects() {

    const mapElement =
        document.getElementById(
            "map"
        );


    const mapRect =
        mapElement.getBoundingClientRect();


    const selectors = [

        ".map-right-stack",
        ".search-toggle-button",
        ".search-control.open .search-panel",
        ".coordinate-box",
        ".metric-scale-control",
        ".leaflet-top.leaflet-left",
        ".leaflet-control-attribution"

    ];


    const obstacles =
        [];


    selectors.forEach(
        selector => {

            document
                .querySelectorAll(
                    selector
                )
                .forEach(
                    element => {

                        const rect =
                            element.getBoundingClientRect();


                        if (
                            rect.width <=
                            0 ||
                            rect.height <=
                            0
                        ) {

                            return;

                        }


                        obstacles.push(
                            {
                                left:
                                    rect.left -
                                    mapRect.left,

                                right:
                                    rect.right -
                                    mapRect.left,

                                top:
                                    rect.top -
                                    mapRect.top,

                                bottom:
                                    rect.bottom -
                                    mapRect.top
                            }
                        );

                    }
                );

        }
    );


    return obstacles;

}



/* ======================================================
   REPRESENTATIVE LABEL SPACING
   ====================================================== */

function getBaseRepresentativeSpacing(
    usage
) {

    const spacing = {

        "Jalan":
            155,

        "Saluran":
            130,

        "Brandgang":
            120,

        "RTH":
            105,

        "Jalur Hijau":
            105,

        "Fasilitas Umum":
            95,

        "Sarana Peribadatan":
            95

    };


    return (
        spacing[
            usage
        ] ||
        85
    );

}



function getRepresentativeSpacing(
    usage
) {

    const base =
        getBaseRepresentativeSpacing(
            usage
        );


    const zoom =
        map.getZoom();


    if (
        zoom >=
        19
    ) {

        return (
            base *
            0.62
        );

    }


    if (
        zoom >=
        18
    ) {

        return (
            base *
            0.80
        );

    }


    return base;

}



/* ======================================================
   LABEL OFFSETS
   ====================================================== */

const labelOffsets = [

    [0, 0],

    [0, -20],
    [22, 0],
    [0, 20],
    [-22, 0],

    [18, -18],
    [18, 18],
    [-18, 18],
    [-18, -18],

    [0, -34],
    [34, 0],
    [0, 34],
    [-34, 0]

];



/* ======================================================
   FIND LABEL POSITION
   ====================================================== */

function findLabelPosition(

    anchorPoint,

    labelSize,

    occupiedRects,

    obstacleRects

) {

    const mapSize =
        map.getSize();


    const edgePadding =
        8;


    for (
        const [
            dx,
            dy
        ]
        of labelOffsets
    ) {

        const x =
            anchorPoint.x +
            dx;


        const y =
            anchorPoint.y +
            dy;


        const rect =
            makeRect(

                x,

                y,

                labelSize.width,

                labelSize.height

            );


        if (

            rect.left <
            edgePadding ||

            rect.right >
            mapSize.x -
            edgePadding ||

            rect.top <
            edgePadding ||

            rect.bottom >
            mapSize.y -
            edgePadding

        ) {

            continue;

        }


        const hitsLabel =
            occupiedRects.some(
                occupied =>
                    rectsOverlap(
                        rect,
                        occupied,
                        4
                    )
            );


        if (
            hitsLabel
        ) {

            continue;

        }


        const hitsUi =
            obstacleRects.some(
                obstacle =>
                    rectsOverlap(
                        rect,
                        obstacle,
                        6
                    )
            );


        if (
            hitsUi
        ) {

            continue;

        }


        return {

            x:
                x,

            y:
                y,

            rect:
                rect

        };

    }


    return null;

}



/* ======================================================
   FEATURE SCREEN AREA
   ====================================================== */

function getLayerScreenArea(
    layer
) {

    try {

        const bounds =
            layer.getBounds();


        if (
            !bounds ||
            !bounds.isValid()
        ) {

            return 0;

        }


        const nw =
            map.latLngToContainerPoint(
                bounds.getNorthWest()
            );


        const se =
            map.latLngToContainerPoint(
                bounds.getSouthEast()
            );


        return (

            Math.abs(
                se.x -
                nw.x
            ) *

            Math.abs(
                se.y -
                nw.y
            )

        );

    }

    catch (
        error
    ) {

        return 0;

    }

}



/* ======================================================
   REPRESENTATIVE TEST
   ====================================================== */

function isRepresentativeFarEnough(

    usage,

    point,

    categoryPoints

) {

    const previousPoints =

        categoryPoints.get(
            usage
        ) ||

        [];


    const spacing =
        getRepresentativeSpacing(
            usage
        );


    return previousPoints.every(
        previous =>
            point.distanceTo(
                previous
            ) >=
            spacing
    );

}



/* ======================================================
   RENDER LABELS
   ====================================================== */

function renderRepresentativeLabels() {

    labelMarkerGroup.clearLayers();


    if (
        currentMapMode !==
        "penggunaan"
    ) {

        return;

    }


    if (
        map.getZoom() <
        labelMinZoom
    ) {

        return;

    }


    if (
        activeCompletenessFilter
    ) {

        return;

    }


    const mapBounds =
        map
            .getBounds()
            .pad(
                0.03
            );


    let visibleEntries =
        featureLayerEntries.filter(
            entry => {

                try {

                    return entry
                        .layer
                        .getBounds()
                        .intersects(
                            mapBounds
                        );

                }

                catch (
                    error
                ) {

                    return false;

                }

            }
        );


    if (
        searchActive
    ) {

        visibleEntries =
            visibleEntries.filter(
                entry =>
                    searchResultIndexes.has(
                        entry.index
                    )
            );

    }


    visibleEntries.sort(
        (
            a,
            b
        ) =>

            getLayerScreenArea(
                b.layer
            ) -

            getLayerScreenArea(
                a.layer
            )
    );


    const occupiedRects =
        [];


    const obstacleRects =
        getUIObstacleRects();


    const categoryPoints =
        new Map();


    visibleEntries.forEach(
        entry => {

            const usage =
                getUsageName(
                    entry.feature
                );


            const anchorLatLng =
                getFeatureAnchor(
                    entry.layer
                );


            if (
                !anchorLatLng
            ) {

                return;

            }


            const anchorPoint =
                map.latLngToContainerPoint(
                    anchorLatLng
                );


            if (
                !isRepresentativeFarEnough(

                    usage,

                    anchorPoint,

                    categoryPoints

                )
            ) {

                return;

            }


            const labelSize =
                estimateLabelSize(
                    usage
                );


            const placement =
                findLabelPosition(

                    anchorPoint,

                    labelSize,

                    occupiedRects,

                    obstacleRects

                );


            if (
                !placement
            ) {

                return;

            }


            occupiedRects.push(
                placement.rect
            );


            if (
                !categoryPoints.has(
                    usage
                )
            ) {

                categoryPoints.set(
                    usage,
                    []
                );

            }


            categoryPoints
                .get(
                    usage
                )
                .push(
                    anchorPoint
                );


            const labelLatLng =
                map.containerPointToLatLng(
                    [
                        placement.x,
                        placement.y
                    ]
                );


            const icon =
                L.divIcon(
                    {
                        className:
                            "asset-label-icon",

                        html:
                            `<span class="asset-label">${escapeHtml(usage)}</span>`,

                        iconSize:
                            [
                                labelSize.width,
                                labelSize.height
                            ],

                        iconAnchor:
                            [
                                labelSize.width /
                                2,

                                labelSize.height /
                                2
                            ]
                    }
                );


            L.marker(
                labelLatLng,
                {
                    icon:
                        icon,

                    interactive:
                        false,

                    keyboard:
                        false,

                    zIndexOffset:
                        1000
                }
            )
            .addTo(
                labelMarkerGroup
            );

        }
    );

}



/* ======================================================
   MODE
   ====================================================== */

function setMapMode(
    mode
) {

    if (
        ![
            "penggunaan",
            "status",
            "kelengkapan"
        ]
        .includes(
            mode
        )
    ) {

        return;

    }


    currentMapMode =
        mode;


    activeCompletenessFilter =
        null;


    infoPanel.classList.remove(
        "visible"
    );


    mapLegend.classList.remove(
        "hidden"
    );


    updateModeButtons();


    buildLegend();


    refreshAssetStyles();


    renderRepresentativeLabels();

}



modeButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                setMapMode(
                    button.dataset.mode
                );

            }
        );

    }
);



/* ======================================================
   DASHBOARD COMPLETENESS FILTER
   ====================================================== */

function applyDashboardCompletenessFilter(
    filterType
) {

    currentMapMode =
        "kelengkapan";


    activeCompletenessFilter =
        filterType;


    searchActive =
        false;


    searchResultIndexes.clear();


    updateModeButtons();


    mapLegend.classList.add(
        "hidden"
    );


    refreshAssetStyles();


    labelMarkerGroup.clearLayers();


    const selectedFeatures =
        allFeatures.filter(
            feature =>
                getCompleteness(
                    feature
                ).type ===
                filterType
        );


    if (
        selectedFeatures.length
    ) {

        const bounds =
            L.geoJSON(
                {
                    type:
                        "FeatureCollection",

                    features:
                        selectedFeatures
                }
            )
            .getBounds();


        if (
            bounds.isValid()
        ) {

            map.fitBounds(
                bounds,
                {
                    padding:
                        [35, 35]
                }
            );

        }

    }


    infoPanel.classList.add(
        "visible"
    );


    if (
        filterType ===
        "lengkap"
    ) {

        infoTitle.textContent =
            "Data Lengkap";


        infoCount.textContent =

            `${selectedFeatures.length.toLocaleString("id-ID")} bidang`;


        infoDescription.style.display =
            "none";


        viewFilteredData.textContent =
            "Tampilkan Data Aset Lengkap";


        viewFilteredData.dataset.filter =
            "lengkap";

    }

    else {

        infoTitle.textContent =
            "Data Belum Lengkap";


        infoCount.textContent =

            `${selectedFeatures.length.toLocaleString("id-ID")} bidang`;


        infoDescription.textContent =
            "Terdapat atribut wajib yang belum terisi.";


        infoDescription.style.display =
            "block";


        viewFilteredData.textContent =
            "Tampilkan Data Aset Belum Lengkap";


        viewFilteredData.dataset.filter =
            "kurang";

    }

}



/* ======================================================
   DATA ASET BUTTON
   ====================================================== */

viewFilteredData.addEventListener(
    "click",
    () => {

        const filterType =
            viewFilteredData
                .dataset
                .filter;


        if (
            ![
                "lengkap",
                "kurang"
            ]
            .includes(
                filterType
            )
        ) {

            return;

        }


        sessionStorage.setItem(

            "webgis_data_completeness_filter",

            filterType

        );


        window.location.href =
            "data-aset.html";

    }
);



/* ======================================================
   FIND FOCUS ENTRY
   ====================================================== */

function findFocusEntry(
    payload
) {

    if (
        !payload
    ) {

        return null;

    }


    const targetId =
        normalizedText(
            payload.id_barang
        );


    const targetNub =
        normalizedText(
            payload.nub
        );



    /*
       1. Prioritas paling aman:
       ID Barang + NUB harus sama.
    */

    if (
        targetId &&
        targetNub
    ) {

        const exact =
            featureLayerEntries.find(
                entry => {

                    const p =
                        entry.feature
                            .properties ||
                        {};


                    return (

                        normalizedText(
                            p.id_barang
                        ) ===
                        targetId &&

                        normalizedText(
                            p.nub
                        ) ===
                        targetNub

                    );

                }
            );


        if (
            exact
        ) {

            return exact;

        }

    }



    /*
       2. ID Barang
    */

    if (
        targetId
    ) {

        const byId =
            featureLayerEntries.find(
                entry =>
                    normalizedText(
                        entry.feature
                            ?.properties
                            ?.id_barang
                    ) ===
                    targetId
            );


        if (
            byId
        ) {

            return byId;

        }

    }



    /*
       3. NUB
    */

    if (
        targetNub
    ) {

        const byNub =
            featureLayerEntries.find(
                entry =>
                    normalizedText(
                        entry.feature
                            ?.properties
                            ?.nub
                    ) ===
                    targetNub
            );


        if (
            byNub
        ) {

            return byNub;

        }

    }



    /*
       4. Index hanya fallback.
    */

    const targetIndex =
        Number(
            payload.index
        );


    if (
        Number.isInteger(
            targetIndex
        )
    ) {

        return (

            featureLayerEntries.find(
                entry =>
                    entry.index ===
                    targetIndex
            ) ||

            null

        );

    }


    return null;

}



/* ======================================================
   FOCUS BIDANG DARI DATA ASET
   ====================================================== */

function focusAssetFromDataTable(
    payload
) {

    const entry =
        findFocusEntry(
            payload
        );


    if (
        !entry
    ) {

        console.warn(

            "Bidang yang dipilih dari Data Aset tidak ditemukan.",

            payload

        );


        return false;

    }



    /*
       Kembalikan peta ke mode Penggunaan
       supaya target terlihat natural.
    */

    currentMapMode =
        "penggunaan";


    activeCompletenessFilter =
        null;


    searchActive =
        false;


    searchResultIndexes.clear();



    searchNib.value =
        "";


    searchKecamatan.value =
        "";


    searchPenggunaan.value =
        "";


    searchResultInfo.textContent =

        `${allFeatures.length.toLocaleString("id-ID")} bidang tersedia`;



    setSearchPanelOpen(
        false
    );


    infoPanel.classList.remove(
        "visible"
    );


    mapLegend.classList.remove(
        "hidden"
    );


    mapRightStack.classList.remove(
        "detail-open"
    );


    selectedEntry =
        entry;


    updateModeButtons();


    buildLegend();


    refreshAssetStyles();



    /* ================= ZOOM TARGET ================= */

    let bounds =
        null;


    try {

        bounds =
            entry.layer.getBounds();

    }

    catch (
        error
    ) {

    }


    if (
        bounds &&
        bounds.isValid()
    ) {

        map.fitBounds(
            bounds,
            {
                padding:
                    [100, 100],

                maxZoom:
                    19,

                animate:
                    true
            }
        );

    }



    /* ================= POPUP OTOMATIS ================= */

    const openSelectedPopup =
        () => {

            let popupLatLng =
                null;


            try {

                const entryBounds =
                    entry.layer.getBounds();


                if (
                    entryBounds.isValid()
                ) {

                    popupLatLng =
                        entryBounds.getCenter();

                }

            }

            catch (
                error
            ) {

            }


            if (
                !popupLatLng
            ) {

                popupLatLng =
                    getFeatureAnchor(
                        entry.layer
                    );

            }


            if (
                !popupLatLng
            ) {

                return;

            }


            selectedEntry =
                entry;


            refreshAssetStyles();


            L.popup(
                {
                    maxWidth:
                        260,

                    closeButton:
                        true,

                    autoPan:
                        true
                }
            )

                .setLatLng(
                    popupLatLng
                )

                .setContent(
                    buildPopupContent(
                        entry
                    )
                )

                .openOn(
                    map
                );


            entry.layer.bringToFront();


            renderRepresentativeLabels();

        };


    window.setTimeout(

        openSelectedPopup,

        420

    );


    return true;

}



/* ======================================================
   LABEL REFRESH
   ====================================================== */

let labelRefreshTimer =
    null;


function scheduleLabelRefresh() {

    if (
        labelRefreshTimer
    ) {

        window.clearTimeout(
            labelRefreshTimer
        );

    }


    labelRefreshTimer =
        window.setTimeout(
            () => {

                renderRepresentativeLabels();


                labelRefreshTimer =
                    null;

            },
            85
        );

}


map.on(
    "zoomend moveend resize",
    scheduleLabelRefresh
);



/* ======================================================
   LOAD DATA
   ====================================================== */

fetch(
    wfsUrl
)

    .then(
        response => {

            if (
                !response.ok
            ) {

                throw new Error(
                    "Gagal mengambil data dari GeoServer."
                );

            }


            return response.json();

        }
    )


    .then(
        data => {

            if (
                !data ||
                !Array.isArray(
                    data.features
                )
            ) {

                throw new Error(
                    "Format GeoJSON tidak sesuai."
                );

            }


            allFeatures =
                data.features;


            featureLayerEntries =
                [];


            allFeatures.forEach(
                (
                    feature,
                    index
                ) => {

                    feature.__webgisIndex =
                        index;

                }
            );


            console.log(
                "Jumlah aset:",
                allFeatures.length
            );


            asetLayer =
                L.geoJSON(
                    data,
                    {

                        style:
                            getDisplayStyle,


                        onEachFeature:
                            function (
                                feature,
                                layer
                            ) {

                                const index =
                                    feature
                                        .__webgisIndex;


                                const entry =
                                    {
                                        index:
                                            index,

                                        feature:
                                            feature,

                                        layer:
                                            layer
                                    };


                                featureLayerEntries.push(
                                    entry
                                );


                                layer.on(
                                    "click",
                                    event => {

                                        handleFeatureClick(
                                            entry,
                                            event
                                        );

                                    }
                                );

                            }

                    }
                )
                .addTo(
                    map
                );


            buildSearchOptions();


            searchResultInfo.textContent =

                `${allFeatures.length.toLocaleString("id-ID")} bidang tersedia`;



            /*
               PRIORITAS PERTAMA:
               target dari halaman Data Aset.
            */

            if (
                pendingMapFocus
            ) {

                focusAssetFromDataTable(
                    pendingMapFocus
                );

            }


            /*
               PRIORITAS KEDUA:
               filter dari Dashboard.
            */

            else if (

                initialCompletenessFilter ===
                "lengkap" ||

                initialCompletenessFilter ===
                "kurang"

            ) {

                applyDashboardCompletenessFilter(
                    initialCompletenessFilter
                );

            }


            /*
               NORMAL
            */

            else {

                currentMapMode =
                    "penggunaan";


                updateModeButtons();


                buildLegend();


                refreshAssetStyles();


                const bounds =
                    asetLayer
                        .getBounds();


                if (
                    bounds.isValid()
                ) {

                    map.fitBounds(
                        bounds,
                        {
                            padding:
                                [20, 20]
                        }
                    );

                }

            }


            window.setTimeout(
                renderRepresentativeLabels,
                180
            );

        }
    )


    .catch(
        error => {

            console.error(
                "MAP ERROR:",
                error
            );


            mapLegend.classList.add(
                "hidden"
            );


            const mapStylePanel =
                document.getElementById(
                    "mapStylePanel"
                );


            if (
                mapStylePanel
            ) {

                mapStylePanel.style.display =
                    "none";

            }


            infoPanel.classList.add(
                "visible"
            );


            infoTitle.textContent =
                "Data tidak dapat dimuat";


            infoCount.textContent =
                "—";


            infoDescription.style.display =
                "block";


            infoDescription.textContent =
                "Terjadi kendala saat mengambil data aset dari GeoServer.";


            viewFilteredData.style.display =
                "none";

        }
    );