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

        window.location.href =
            "index.html";

        return;

    }


    const $ = id =>
        document.getElementById(id);



    /* ======================================================
       FIELD
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
       ELEMENTS
       ====================================================== */

    const els = {

        roleBadge:
            $("roleBadge"),

        addAssetButton:
            $("addAssetButton"),

        assetTotalBadge:
            $("assetTotalBadge"),

        assetSearch:
            $("assetSearch"),

        filterKecamatan:
            $("filterKecamatan"),

        filterPenggunaan:
            $("filterPenggunaan"),

        filterKelengkapan:
            $("filterKelengkapan"),

        filterResetButton:
            $("filterResetButton"),

        resultCount:
            $("resultCount"),

        activeFilterText:
            $("activeFilterText"),

        assetTableBody:
            $("assetTableBody"),

        loadingState:
            $("loadingState"),

        emptyState:
            $("emptyState"),

        errorState:
            $("errorState"),

        paginationInfo:
            $("paginationInfo"),

        paginationPages:
            $("paginationPages"),

        previousPageButton:
            $("previousPageButton"),

        nextPageButton:
            $("nextPageButton"),

        detailBackdrop:
            $("detailBackdrop"),

        detailDrawer:
            $("detailDrawer"),

        detailCloseButton:
            $("detailCloseButton"),

        detailTitle:
            $("detailTitle"),

        detailDrawerBody:
            $("detailDrawerBody"),

        detailMapButton:
            $("detailMapButton"),

        downloadPdfButton:
            $("downloadPdfButton")

    };


    els.roleBadge.textContent =
        role;


    if (role === "admin") {

        els.addAssetButton.hidden =
            false;

    }


    els.addAssetButton
    .addEventListener(
        "click",
        async () => {

            const valid =
                typeof verifyAdminSession === "function"
                    ? await verifyAdminSession()
                    : false;


            if (!valid) {

                alert(
                    "Session Admin tidak valid. Silakan login kembali."
                );

                window.location.href =
                    "login.html";

                return;

            }


            window.location.href =
                "admin-tambah.html";

        }
    );



    /* ======================================================
       HELPERS
       ====================================================== */

    function isMissing(value) {

        return (
            value === null ||
            value === undefined ||
            String(value).trim() === "" ||
            String(value).trim() === "-"
        );

    }


    function displayValue(value) {

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


    function formatNumber(value) {

        const number =
            Number(value);


        if (!Number.isFinite(number)) {
            return "—";
        }


        return new Intl.NumberFormat(
            "id-ID",
            {
                maximumFractionDigits:
                    2
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


    function sanitizeFilename(value) {

        return String(
            value ||
            "bidang-aset"
        )
        .trim()
        .replace(
            /[\\/:*?"<>|]+/g,
            "-"
        )
        .replace(
            /\s+/g,
            "-"
        )
        .replace(
            /-+/g,
            "-"
        )
        .replace(
            /^-|-$/g,
            ""
        ) || "bidang-aset";

    }



    /* ======================================================
       IDENTITAS BIDANG
       HARUS SAMA DENGAN alat.js
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



    /* ======================================================
       RADIUS CONTEXT
       ====================================================== */

    let radiusContext = null;


    try {

        const raw =
            sessionStorage.getItem(
                "webgis_radius_results"
            );


        if (raw) {

            radiusContext =
                JSON.parse(raw);

        }

    }

    catch (error) {

        console.warn(
            "Hasil radius tidak dapat dibaca:",
            error
        );

    }


    /*
       Ini hanya tiket dari Alat → Data Aset.
       Setelah dibaca, hapus agar Data Aset normal
       tidak terus menerus terfilter radius.
    */

    sessionStorage.removeItem(
        "webgis_radius_results"
    );



    /* ======================================================
       KELENGKAPAN
       ====================================================== */

    function getCompleteness(feature) {

        const properties =
            feature?.properties || {};


        const missingFields =
            requiredFields.filter(
                field =>
                    isMissing(
                        properties[field]
                    )
            );


        return {

            type:
                missingFields.length
                    ? "kurang"
                    : "lengkap",

            missingFields

        };

    }

    /* ======================================================
   DATA GEOJSON PUBLIK
   ====================================================== */

const DATA_URL =
    "/data/aset_pemda.geojson";


    /* ======================================================
       STATE
       ====================================================== */

    let allFeatures =
        [];


    /*
       baseFeatures = kumpulan data utama
       yang boleh muncul.

       Normal: 1.541
       Radius: misalnya hanya 112.
    */

    let baseFeatures =
        [];


    let filteredFeatures =
        [];


    let currentPage =
        1;


    const pageSize =
        25;


    let activeDetailFeature =
        null;



    /* ======================================================
       DASHBOARD FILTER
       ====================================================== */

    const initialCompletenessFilter =
        sessionStorage.getItem(
            "webgis_data_completeness_filter"
        );


    sessionStorage.removeItem(
        "webgis_data_completeness_filter"
    );



    /* ======================================================
       SELECT OPTIONS
       ====================================================== */

    function resetFilterOptions() {

        els.filterKecamatan.innerHTML = `

            <option value="">
                Semua Kecamatan
            </option>

        `;


        els.filterPenggunaan.innerHTML = `

            <option value="">
                Semua Penggunaan
            </option>

        `;

    }



    function populateSelect(
        select,
        values
    ) {

        const fragment =
            document.createDocumentFragment();


        values.forEach(
            value => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    value;


                option.textContent =
                    value;


                fragment.appendChild(
                    option
                );

            }
        );


        select.appendChild(
            fragment
        );

    }



    function buildFilterOptions() {

        resetFilterOptions();


        const kecamatan =
            [
                ...new Set(
                    baseFeatures
                        .map(
                            feature =>
                                feature
                                    .properties
                                    ?.kecamatan
                        )
                        .filter(
                            value =>
                                !isMissing(value)
                        )
                        .map(
                            value =>
                                String(value).trim()
                        )
                )
            ]
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "id"
                    )
            );


        const penggunaan =
            [
                ...new Set(
                    baseFeatures
                        .map(
                            feature =>
                                feature
                                    .properties
                                    ?.penggunaan
                        )
                        .filter(
                            value =>
                                !isMissing(value)
                        )
                        .map(
                            value =>
                                String(value).trim()
                        )
                )
            ]
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "id"
                    )
            );


        populateSelect(
            els.filterKecamatan,
            kecamatan
        );


        populateSelect(
            els.filterPenggunaan,
            penggunaan
        );

    }



    /* ======================================================
       RADIUS CONTEXT CARD
       ====================================================== */

    function removeRadiusCard() {

        document
            .getElementById(
                "radiusContextCard"
            )
            ?.remove();

    }



    function renderRadiusContextCard() {

        removeRadiusCard();


        if (!radiusContext) {
            return;
        }


        const pageHeader =
            document.querySelector(
                ".page-header"
            );


        const center =
            radiusContext.center || {};


        const card =
            document.createElement(
                "section"
            );


        card.id =
            "radiusContextCard";


        /*
           Inline style sengaja dipakai agar
           data-aset.css yang sekarang sudah stabil
           tidak perlu diubah lagi.
        */

        card.style.cssText = `
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:24px;
            margin:-4px 0 20px;
            padding:16px 18px;
            border:1px solid #dce5ea;
            border-left:4px solid #1c9ba4;
            border-radius:9px;
            background:#ffffff;
        `;


        card.innerHTML = `

            <div
                style="
                    min-width:0;
                "
            >

                <span
                    style="
                        display:block;
                        margin-bottom:5px;
                        color:#1c9ba4;
                        font-size:8px;
                        font-weight:800;
                        letter-spacing:1.2px;
                    "
                >
                    HASIL ANALISIS RADIUS
                </span>


                <strong
                    style="
                        display:block;
                        color:#0f2747;
                        font-size:13px;
                        line-height:1.4;
                    "
                >
                    ${escapeHtml(
                        displayValue(
                            center.id_barang
                        )
                    )}
                    ·
                    ${escapeHtml(
                        displayValue(
                            center.penggunaan
                        )
                    )}
                </strong>


                <span
                    style="
                        display:block;
                        margin-top:4px;
                        color:#667085;
                        font-size:9px;
                    "
                >
                    Radius
                    ${Number(radiusContext.radiusMeters || 0).toLocaleString("id-ID")}
                    m
                    ·
                    <strong id="radiusMatchedCount">
                        ${baseFeatures.length.toLocaleString("id-ID")}
                    </strong>
                    aset hasil analisis
                </span>

            </div>


            <div
                style="
                    display:flex;
                    align-items:center;
                    gap:8px;
                    flex:0 0 auto;
                "
            >

                <button
                    type="button"
                    id="exitRadiusModeButton"
                    style="
                        min-height:38px;
                        padding:0 13px;
                        border:1px solid #e4e7ec;
                        border-radius:6px;
                        background:#ffffff;
                        color:#0f2747;
                        font-family:inherit;
                        font-size:8px;
                        font-weight:700;
                        cursor:pointer;
                    "
                >
                    Tampilkan Semua Data
                </button>


                <button
                    type="button"
                    id="backToRadiusButton"
                    style="
                        min-height:38px;
                        padding:0 14px;
                        border:1px solid #0f2747;
                        border-radius:6px;
                        background:#0f2747;
                        color:#ffffff;
                        font-family:inherit;
                        font-size:8px;
                        font-weight:700;
                        cursor:pointer;
                    "
                >
                    ← Kembali ke Analisis
                </button>

            </div>

        `;


        pageHeader.insertAdjacentElement(
            "afterend",
            card
        );



        $("backToRadiusButton")
            .addEventListener(
                "click",
                () => {

                    sessionStorage.setItem(
                        "webgis_restore_radius_analysis",
                        JSON.stringify(
                            {
                                center:
                                    radiusContext.center,

                                radiusMeters:
                                    radiusContext.radiusMeters
                            }
                        )
                    );


                    window.location.href =
                        "alat.html";

                }
            );



        $("exitRadiusModeButton")
            .addEventListener(
                "click",
                () => {

                    radiusContext =
                        null;


                    baseFeatures =
                        allFeatures;


                    els.assetSearch.value =
                        "";


                    els.filterKecamatan.value =
                        "";


                    els.filterPenggunaan.value =
                        "";


                    els.filterKelengkapan.value =
                        "";


                    removeRadiusCard();


                    buildFilterOptions();


                    updateTotalBadge();


                    applyFilters();

                }
            );

    }



    /* ======================================================
       TOTAL BADGE
       ====================================================== */

    function updateTotalBadge() {

        if (radiusContext) {

            els.assetTotalBadge.textContent =
                `${baseFeatures.length.toLocaleString("id-ID")} ` +
                `dari ${allFeatures.length.toLocaleString("id-ID")} bidang`;

        }

        else {

            els.assetTotalBadge.textContent =
                `${allFeatures.length.toLocaleString("id-ID")} bidang`;

        }

    }



    /* ======================================================
       ACTIVE FILTER TEXT
       ====================================================== */

    function updateActiveFilterText() {

        const labels =
            [];


        if (radiusContext) {

            labels.push(
                `Radius ${Number(radiusContext.radiusMeters || 0).toLocaleString("id-ID")} m`
            );

        }


        if (
            els.assetSearch
                .value
                .trim()
        ) {

            labels.push(
                `NIB: ${els.assetSearch.value.trim()}`
            );

        }


        if (
            els.filterKecamatan.value
        ) {

            labels.push(
                els.filterKecamatan.value
            );

        }


        if (
            els.filterPenggunaan.value
        ) {

            labels.push(
                els.filterPenggunaan.value
            );

        }


        if (
            els.filterKelengkapan.value ===
            "lengkap"
        ) {

            labels.push(
                "Data Lengkap"
            );

        }


        if (
            els.filterKelengkapan.value ===
            "kurang"
        ) {

            labels.push(
                "Data Belum Lengkap"
            );

        }


        els.activeFilterText.textContent =
            labels.length
                ? labels.join(" · ")
                : "Semua data";

    }



    /* ======================================================
       FILTER
       ====================================================== */

    function applyFilters(
        resetPage = true
    ) {

        const query =
            normalize(
                els.assetSearch.value
            );


        const kecamatan =
            normalize(
                els.filterKecamatan.value
            );


        const penggunaan =
            normalize(
                els.filterPenggunaan.value
            );


        const kelengkapan =
            els.filterKelengkapan.value;


        filteredFeatures =
            baseFeatures.filter(
                feature => {

                    const p =
                        feature.properties || {};


                    const searchMatch =
                        !query ||
                        normalize(
                            p.id_barang
                        ).includes(query) ||
                        normalize(
                            p.nub
                        ).includes(query);


                    const kecamatanMatch =
                        !kecamatan ||
                        normalize(
                            p.kecamatan
                        ) === kecamatan;


                    const penggunaanMatch =
                        !penggunaan ||
                        normalize(
                            p.penggunaan
                        ) === penggunaan;


                    const completenessMatch =
                        !kelengkapan ||
                        getCompleteness(feature)
                            .type ===
                        kelengkapan;


                    return (
                        searchMatch &&
                        kecamatanMatch &&
                        penggunaanMatch &&
                        completenessMatch
                    );

                }
            );


        if (resetPage) {

            currentPage =
                1;

        }


        updateActiveFilterText();

        renderTable();

    }



    /* ======================================================
       COMPLETENESS BADGE
       ====================================================== */

    function completenessBadge(feature) {

        const complete =
            getCompleteness(feature)
                .type ===
            "lengkap";


        return `

            <span
                class="
                    completeness-badge
                    ${
                        complete
                            ? "complete"
                            : "incomplete"
                    }
                "
            >
                ${
                    complete
                        ? "Lengkap"
                        : "Belum Lengkap"
                }
            </span>

        `;

    }



    /* ======================================================
       TABLE
       ====================================================== */

    function renderTable() {

        els.loadingState.hidden =
            true;


        els.errorState.hidden =
            true;


        const total =
            filteredFeatures.length;


        els.resultCount.textContent =
            total.toLocaleString(
                "id-ID"
            );


        if (!total) {

            els.assetTableBody.innerHTML =
                "";


            els.emptyState.hidden =
                false;


            els.paginationInfo.textContent =
                "0 bidang";


            els.paginationPages.innerHTML =
                "";


            els.previousPageButton.disabled =
                true;


            els.nextPageButton.disabled =
                true;


            return;

        }


        els.emptyState.hidden =
            true;


        const totalPages =
            Math.ceil(
                total /
                pageSize
            );


        currentPage =
            Math.min(
                currentPage,
                totalPages
            );


        const start =
            (
                currentPage -
                1
            ) *
            pageSize;


        const end =
            Math.min(
                start +
                pageSize,
                total
            );


        const currentFeatures =
            filteredFeatures.slice(
                start,
                end
            );


        els.assetTableBody.innerHTML =
            currentFeatures
                .map(
                    feature => {

                        const p =
                            feature.properties || {};


                        const index =
                            feature.__webgisIndex;


                        const luas =
                            Number.isFinite(
                                Number(p.luas_m2)
                            )
                                ? `${formatNumber(p.luas_m2)} m²`
                                : "—";


                        return `

                            <tr>

                                <td>

                                    <span class="asset-id">
                                        ${escapeHtml(displayValue(p.id_barang))}
                                    </span>

                                </td>

                                <td>
                                    ${escapeHtml(displayValue(p.penggunaan))}
                                </td>

                                <td>
                                    ${escapeHtml(displayValue(p.nub))}
                                </td>

                                <td class="numeric-column">
                                    ${luas}
                                </td>

                                <td>
                                    ${escapeHtml(displayValue(p.kecamatan))}
                                </td>

                                <td>
                                    ${escapeHtml(displayValue(p.desa))}
                                </td>

                                <td>
                                    ${escapeHtml(displayValue(p.status))}
                                </td>

                                <td>
                                    ${completenessBadge(feature)}
                                </td>

                                <td class="action-column">

                                    <div class="row-actions">

                                        <button
                                            type="button"
                                            class="
                                                row-action-button
                                                map-row-button
                                            "
                                            data-index="${index}"
                                        >
                                            Lihat di Peta
                                        </button>


                                        <button
                                            type="button"
                                            class="
                                                row-action-button
                                                primary
                                                detail-row-button
                                            "
                                            data-index="${index}"
                                        >
                                            Detail
                                        </button>

                                    </div>

                                </td>

                            </tr>

                        `;

                    }
                )
                .join("");


        els.paginationInfo.textContent =
            `Menampilkan ${(start + 1).toLocaleString("id-ID")}–` +
            `${end.toLocaleString("id-ID")} dari ` +
            `${total.toLocaleString("id-ID")} bidang`;


        renderPagination(
            totalPages
        );


        bindRowEvents();

    }



    /* ======================================================
       PAGINATION
       ====================================================== */

    function renderPagination(
        totalPages
    ) {

        els.previousPageButton.disabled =
            currentPage === 1;


        els.nextPageButton.disabled =
            currentPage ===
            totalPages;


        els.paginationPages.innerHTML =
            "";


        let start =
            Math.max(
                1,
                currentPage - 2
            );


        let end =
            Math.min(
                totalPages,
                start + 4
            );


        start =
            Math.max(
                1,
                end - 4
            );


        for (
            let page = start;
            page <= end;
            page++
        ) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "pagination-page-button" +
                (
                    page === currentPage
                        ? " active"
                        : ""
                );


            button.textContent =
                page;


            button.addEventListener(
                "click",
                () => {

                    currentPage =
                        page;


                    renderTable();

                    scrollToTable();

                }
            );


            els.paginationPages
                .appendChild(
                    button
                );

        }

    }



    function scrollToTable() {

        document
            .querySelector(
                ".table-card"
            )
            ?.scrollIntoView(
                {
                    behavior:
                        "smooth",

                    block:
                        "start"
                }
            );

    }



    function getFeatureByIndex(index) {

        return allFeatures.find(
            feature =>
                feature.__webgisIndex ===
                index
        );

    }



    /* ======================================================
       ROW EVENT
       ====================================================== */

    function bindRowEvents() {

        document
            .querySelectorAll(
                ".detail-row-button"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            openDetail(
                                getFeatureByIndex(
                                    Number(
                                        button.dataset.index
                                    )
                                )
                            );

                        }
                    );

                }
            );


        document
            .querySelectorAll(
                ".map-row-button"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            openFeatureOnMap(
                                getFeatureByIndex(
                                    Number(
                                        button.dataset.index
                                    )
                                )
                            );

                        }
                    );

                }
            );

    }



    /* ======================================================
       DETAIL
       ====================================================== */

    function detailRow(
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



    function openDetail(feature) {

        if (!feature) {
            return;
        }


        activeDetailFeature =
            feature;


        const p =
            feature.properties || {};


        const completeness =
            getCompleteness(feature);


        els.detailTitle.textContent =
            displayValue(
                p.penggunaan
            );


        let html =
            "";


        html +=
            detailRow(
                "NIB / ID Barang",
                displayValue(
                    p.id_barang
                )
            );


        html +=
            detailRow(
                "Penggunaan",
                displayValue(
                    p.penggunaan
                )
            );


        html +=
            detailRow(
                "NUB",
                displayValue(
                    p.nub
                )
            );


        html +=
            detailRow(
                "Luas",
                Number.isFinite(
                    Number(
                        p.luas_m2
                    )
                )
                    ? `${formatNumber(p.luas_m2)} m²`
                    : "—"
            );


        html +=
            detailRow(
                "Kecamatan",
                displayValue(
                    p.kecamatan
                )
            );


        html +=
            detailRow(
                "Desa/Kelurahan",
                displayValue(
                    p.desa
                )
            );


        html +=
            detailRow(
                "Status",
                displayValue(
                    p.status
                )
            );


        html +=
            detailRow(
                "Keterangan",
                displayValue(
                    p.keterangan
                )
            );


        const complete =
            completeness.type ===
            "lengkap";


        html += `

            <div class="detail-row">

                <span class="detail-label">
                    Kelengkapan Data
                </span>

                <div class="detail-value">

                    <span class="detail-completeness">

                        <span
                            class="detail-completeness-dot"
                            style="
                                background:
                                ${
                                    complete
                                        ? "#168a62"
                                        : "#c97a18"
                                }
                            "
                        ></span>

                        ${
                            complete
                                ? "Lengkap"
                                : "Belum Lengkap"
                        }

                    </span>

                </div>

        `;


        if (!complete) {

            html += `

                <ul class="detail-missing-fields">

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


        els.detailDrawerBody.innerHTML =
            html;


        els.detailBackdrop
            .classList
            .add(
                "visible"
            );


        els.detailDrawer
            .classList
            .add(
                "open"
            );


        els.detailDrawer
            .setAttribute(
                "aria-hidden",
                "false"
            );

    }



    function closeDetail() {

        els.detailBackdrop
            .classList
            .remove(
                "visible"
            );


        els.detailDrawer
            .classList
            .remove(
                "open"
            );


        els.detailDrawer
            .setAttribute(
                "aria-hidden",
                "true"
            );


        setTimeout(
            () => {

                activeDetailFeature =
                    null;

            },
            220
        );

    }



    /* ======================================================
       LIHAT DI PETA
       ====================================================== */

    function openFeatureOnMap(feature) {

        if (!feature) {
            return;
        }


        const p =
            feature.properties || {};


        sessionStorage.setItem(
            "webgis_map_focus_asset",
            JSON.stringify(
                {
                    index:
                        feature.__webgisIndex,

                    id_barang:
                        p.id_barang ?? null,

                    nub:
                        p.nub ?? null,

                    penggunaan:
                        p.penggunaan ?? null
                }
            )
        );


        window.location.href =
            "map.html";

    }



    /* ======================================================
       CQL
       ====================================================== */

    function cqlEscape(value) {

        return String(value)
            .replaceAll(
                "'",
                "''"
            );

    }



    /* ======================================================
   GET SATU GEOMETRY UNTUK PDF
   GEOJSON PUBLIK SUDAH MEMUAT GEOMETRI
   ====================================================== */

async function fetchGeometryForFeature(
    feature
) {

    if (
        feature &&
        feature.geometry
    ) {

        return feature;

    }


    const properties =
        feature?.properties || {};


    const matchedFeature =
        allFeatures.find(
            item => {

                const p =
                    item?.properties || {};


                return (
                    normalize(p.id_barang) ===
                        normalize(properties.id_barang) &&

                    normalize(p.nub) ===
                        normalize(properties.nub)
                );

            }
        );


    if (
        !matchedFeature ||
        !matchedFeature.geometry
    ) {

        throw new Error(
            "Geometri bidang tidak ditemukan."
        );

    }


    return matchedFeature;

}

    /* ======================================================
       GEOMETRY → CANVAS
       ====================================================== */

    function geometryToCanvasDataUrl(
        feature
    ) {

        const canvas =
            document.createElement(
                "canvas"
            );


        canvas.width =
            1200;


        canvas.height =
            620;


        const ctx =
            canvas.getContext(
                "2d"
            );


        ctx.fillStyle =
            "#f7f9fb";


        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );


        ctx.strokeStyle =
            "#e4e7ec";


        ctx.strokeRect(
            1,
            1,
            canvas.width - 2,
            canvas.height - 2
        );


        const geometry =
            feature.geometry;


        const polygons =
            geometry?.type ===
            "Polygon"
                ? [geometry.coordinates]
                : geometry?.type ===
                  "MultiPolygon"
                    ? geometry.coordinates
                    : [];


        const points =
            [];


        polygons.forEach(
            polygon =>
                polygon.forEach(
                    ring =>
                        ring.forEach(
                            coordinate => {

                                if (
                                    Array.isArray(coordinate) &&
                                    Number.isFinite(Number(coordinate[0])) &&
                                    Number.isFinite(Number(coordinate[1]))
                                ) {

                                    points.push(
                                        [
                                            Number(coordinate[0]),
                                            Number(coordinate[1])
                                        ]
                                    );

                                }

                            }
                        )
                )
        );


        if (!points.length) {

            throw new Error(
                "Geometri tidak dapat digambar."
            );

        }


        const xs =
            points.map(
                point =>
                    point[0]
            );


        const ys =
            points.map(
                point =>
                    point[1]
            );


        const minX =
            Math.min(...xs);

        const maxX =
            Math.max(...xs);

        const minY =
            Math.min(...ys);

        const maxY =
            Math.max(...ys);


        const spanX =
            Math.max(
                maxX - minX,
                1e-12
            );


        const spanY =
            Math.max(
                maxY - minY,
                1e-12
            );


        const padding =
            70;


        const scale =
            Math.min(
                (
                    canvas.width -
                    padding * 2
                ) / spanX,
                (
                    canvas.height -
                    padding * 2
                ) / spanY
            );


        const drawingWidth =
            spanX * scale;


        const drawingHeight =
            spanY * scale;


        const offsetX =
            (
                canvas.width -
                drawingWidth
            ) / 2;


        const offsetY =
            (
                canvas.height -
                drawingHeight
            ) / 2;


        const project =
            coordinate => [

                offsetX +
                (
                    Number(coordinate[0]) -
                    minX
                ) * scale,

                canvas.height -
                (
                    offsetY +
                    (
                        Number(coordinate[1]) -
                        minY
                    ) * scale
                )

            ];


        ctx.fillStyle =
            "#e08a32";


        ctx.strokeStyle =
            "#0f2747";


        ctx.lineWidth =
            5;


        ctx.lineJoin =
            "round";


        polygons.forEach(
            polygon => {

                ctx.beginPath();


                polygon.forEach(
                    ring => {

                        ring.forEach(
                            (
                                coordinate,
                                index
                            ) => {

                                const [
                                    x,
                                    y
                                ] =
                                    project(
                                        coordinate
                                    );


                                if (index === 0) {

                                    ctx.moveTo(
                                        x,
                                        y
                                    );

                                }

                                else {

                                    ctx.lineTo(
                                        x,
                                        y
                                    );

                                }

                            }
                        );


                        ctx.closePath();

                    }
                );


                ctx.globalAlpha =
                    0.58;


                ctx.fill(
                    "evenodd"
                );


                ctx.globalAlpha =
                    1;


                ctx.stroke();

            }
        );


        ctx.fillStyle =
            "#0f2747";


        ctx.font =
            "700 25px Arial";


        ctx.textAlign =
            "center";


        ctx.fillText(
            displayValue(
                feature
                    .properties
                    ?.penggunaan
            ),
            canvas.width / 2,
            canvas.height - 25
        );


        return canvas.toDataURL(
            "image/png"
        );

    }



    /* ======================================================
       LOGO
       ====================================================== */

    async function loadLogoDataUrl() {

        const image =
            new Image();


        image.src =
            "assets/img/logokabcirebon.jpg";


        await image.decode();


        const canvas =
            document.createElement(
                "canvas"
            );


        canvas.width =
            image.naturalWidth;


        canvas.height =
            image.naturalHeight;


        canvas
            .getContext(
                "2d"
            )
            .drawImage(
                image,
                0,
                0
            );


        return canvas.toDataURL(
            "image/jpeg",
            0.92
        );

    }



    /* ======================================================
       PDF
       ====================================================== */

    async function downloadPdf(feature) {

        if (!feature) {
            return;
        }


        if (
            !window.jspdf?.jsPDF
        ) {

            alert(
                "Komponen PDF belum dimuat."
            );

            return;

        }


        const oldText =
            els.downloadPdfButton
                .textContent;


        els.downloadPdfButton.disabled =
            true;


        els.downloadPdfButton.textContent =
            "Menyiapkan...";


        try {

            const geometryFeature =
                await fetchGeometryForFeature(
                    feature
                );


            geometryFeature.properties = {
                ...geometryFeature.properties,
                ...feature.properties
            };


            const imageData =
                geometryToCanvasDataUrl(
                    geometryFeature
                );


            let logoData =
                null;


            try {

                logoData =
                    await loadLogoDataUrl();

            }

            catch (error) {

                console.warn(
                    "Logo PDF gagal dimuat:",
                    error
                );

            }


            const {
                jsPDF
            } =
                window.jspdf;


            const pdf =
                new jsPDF(
                    {
                        orientation:
                            "portrait",

                        unit:
                            "mm",

                        format:
                            "a4"
                    }
                );


            const p =
                feature.properties || {};


            const complete =
                getCompleteness(feature)
                    .type ===
                "lengkap";


            const pageWidth =
                pdf.internal
                    .pageSize
                    .getWidth();


            const pageHeight =
                pdf.internal
                    .pageSize
                    .getHeight();


            const marginX =
                18;



            if (logoData) {

                pdf.addImage(
                    logoData,
                    "JPEG",
                    marginX,
                    13,
                    13,
                    13
                );

            }


            pdf.setTextColor(
                15,
                39,
                71
            );


            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.setFontSize(
                13
            );


            pdf.text(
                "BKAD Kabupaten Cirebon",
                logoData
                    ? marginX + 18
                    : marginX,
                18
            );


            pdf.setFontSize(
                9
            );


            pdf.setTextColor(
                80,
                90,
                105
            );


            pdf.text(
                "Laporan Bidang Tanah Aset",
                logoData
                    ? marginX + 18
                    : marginX,
                23
            );


            pdf.setDrawColor(
                225,
                229,
                234
            );


            pdf.line(
                marginX,
                31,
                pageWidth - marginX,
                31
            );


            pdf.setTextColor(
                15,
                39,
                71
            );


            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.setFontSize(
                8
            );


            pdf.text(
                "GAMBAR BIDANG",
                marginX,
                39
            );


            pdf.addImage(
                imageData,
                "PNG",
                marginX,
                43,
                pageWidth -
                    marginX * 2,
                72
            );


            pdf.text(
                "INFORMASI BIDANG",
                marginX,
                125
            );


            pdf.line(
                marginX,
                129,
                pageWidth - marginX,
                129
            );


            const rows = [

                [
                    "ID Barang",
                    displayValue(
                        p.id_barang
                    )
                ],

                [
                    "NUB",
                    displayValue(
                        p.nub
                    )
                ],

                [
                    "Penggunaan",
                    displayValue(
                        p.penggunaan
                    )
                ],

                [
                    "Luas (m²)",
                    Number.isFinite(
                        Number(p.luas_m2)
                    )
                        ? formatNumber(
                            p.luas_m2
                        )
                        : "—"
                ],

                [
                    "Kecamatan",
                    displayValue(
                        p.kecamatan
                    )
                ],

                [
                    "Desa/Kelurahan",
                    displayValue(
                        p.desa
                    )
                ],

                [
                    "Status",
                    displayValue(
                        p.status
                    )
                ],

                [
                    "Keterangan",
                    displayValue(
                        p.keterangan
                    )
                ],

                [
                    "Kelengkapan",
                    complete
                        ? "Lengkap"
                        : "Belum Lengkap"
                ],

                [
                    "Geometri",
                    "Tersedia (lihat sistem peta)"
                ]

            ];


            let y =
                137;


            const labelX =
                marginX;


            const valueX =
                marginX + 48;


            const valueWidth =
                pageWidth -
                marginX -
                valueX;


            for (
                const [
                    label,
                    value
                ] of rows
            ) {

                const wrapped =
                    pdf.splitTextToSize(
                        String(value),
                        valueWidth
                    );


                const rowHeight =
                    Math.max(
                        7,
                        wrapped.length * 4 + 3
                    );


                if (
                    y + rowHeight >
                    pageHeight - 28
                ) {

                    pdf.addPage();

                    y =
                        22;

                }


                pdf.setFont(
                    "helvetica",
                    "bold"
                );


                pdf.setFontSize(
                    7.4
                );


                pdf.setTextColor(
                    30,
                    38,
                    50
                );


                pdf.text(
                    label,
                    labelX,
                    y
                );


                pdf.setFont(
                    "helvetica",
                    "normal"
                );


                pdf.setTextColor(
                    45,
                    55,
                    70
                );


                pdf.text(
                    wrapped,
                    valueX,
                    y
                );


                pdf.setDrawColor(
                    241,
                    243,
                    246
                );


                pdf.line(
                    marginX,
                    y + rowHeight - 3,
                    pageWidth - marginX,
                    y + rowHeight - 3
                );


                y +=
                    rowHeight;

            }


            const printedAt =
                new Intl.DateTimeFormat(
                    "id-ID",
                    {
                        dateStyle:
                            "short",

                        timeStyle:
                            "medium"
                    }
                )
                .format(
                    new Date()
                );


            pdf.setDrawColor(
                225,
                229,
                234
            );


            pdf.line(
                marginX,
                pageHeight - 18,
                pageWidth - marginX,
                pageHeight - 18
            );


            pdf.setFont(
                "helvetica",
                "normal"
            );


            pdf.setFontSize(
                6.5
            );


            pdf.setTextColor(
                120,
                128,
                140
            );


            pdf.text(
                `Dicetak: ${printedAt}`,
                marginX,
                pageHeight - 11
            );


            pdf.text(
                "Sistem Basis Data Spasial Tanah Aset",
                pageWidth - marginX,
                pageHeight - 11,
                {
                    align:
                        "right"
                }
            );


            pdf.save(
                `Laporan-Bidang-Aset-${sanitizeFilename(
                    p.id_barang ||
                    p.nub ||
                    feature.__webgisIndex
                )}.pdf`
            );

        }

        catch (error) {

            console.error(
                "PDF ERROR:",
                error
            );


            alert(
                error.message ||
                "PDF tidak dapat dibuat."
            );

        }

        finally {

            els.downloadPdfButton.disabled =
                false;


            els.downloadPdfButton.textContent =
                oldText;

        }

    }



    /* ======================================================
       DETAIL EVENTS
       ====================================================== */

    els.detailCloseButton
        .addEventListener(
            "click",
            closeDetail
        );


    els.detailBackdrop
        .addEventListener(
            "click",
            closeDetail
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeDetail();

            }

        }
    );


    els.detailMapButton
        .addEventListener(
            "click",
            () => {

                openFeatureOnMap(
                    activeDetailFeature
                );

            }
        );


    els.downloadPdfButton
        .addEventListener(
            "click",
            () => {

                downloadPdf(
                    activeDetailFeature
                );

            }
        );



    /* ======================================================
       FILTER EVENTS
       ====================================================== */

    let searchTimer =
        null;


    els.assetSearch
        .addEventListener(
            "input",
            () => {

                clearTimeout(
                    searchTimer
                );


                searchTimer =
                    setTimeout(
                        () => {

                            applyFilters();

                        },
                        180
                    );

            }
        );


    els.filterKecamatan
        .addEventListener(
            "change",
            () => {

                applyFilters();

            }
        );


    els.filterPenggunaan
        .addEventListener(
            "change",
            () => {

                applyFilters();

            }
        );


    els.filterKelengkapan
        .addEventListener(
            "change",
            () => {

                applyFilters();

            }
        );


    els.filterResetButton
        .addEventListener(
            "click",
            () => {

                /*
                   Kalau sedang mode radius,
                   Reset hanya membersihkan
                   search/filter.

                   Tidak keluar dari 112 hasil radius.
                */

                els.assetSearch.value =
                    "";


                els.filterKecamatan.value =
                    "";


                els.filterPenggunaan.value =
                    "";


                els.filterKelengkapan.value =
                    "";


                applyFilters();

            }
        );



    els.previousPageButton
        .addEventListener(
            "click",
            () => {

                if (
                    currentPage > 1
                ) {

                    currentPage--;

                    renderTable();

                    scrollToTable();

                }

            }
        );


    els.nextPageButton
        .addEventListener(
            "click",
            () => {

                const totalPages =
                    Math.ceil(
                        filteredFeatures.length /
                        pageSize
                    );


                if (
                    currentPage <
                    totalPages
                ) {

                    currentPage++;

                    renderTable();

                    scrollToTable();

                }

            }
        );



    /* ======================================================
       APPLY RADIUS RESULT
       ====================================================== */

    function configureBaseFeatures() {

        if (
            !radiusContext ||
            !Array.isArray(
                radiusContext.resultKeys
            )
        ) {

            radiusContext =
                null;


            baseFeatures =
                allFeatures;

            return;

        }


        const keySet =
            new Set(
                radiusContext.resultKeys
            );


        baseFeatures =
            allFeatures.filter(
                feature =>
                    keySet.has(
                        assetKey(
                            feature.properties || {}
                        )
                    )
            );


        /*
           Kalau karena data berubah tidak ada
           satu pun kecocokan, jangan tampilkan
           tabel kosong secara membingungkan.
        */

        if (
            !baseFeatures.length &&
            radiusContext.resultKeys.length
        ) {

            console.warn(
                "Hasil radius tidak cocok dengan data tabel terbaru."
            );


            radiusContext =
                null;


            baseFeatures =
                allFeatures;

        }

    }



    /* ======================================================
       LOAD DATA
       ====================================================== */

    async function loadTableData() {

        try {

            els.loadingState.hidden =
                false;


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


            allFeatures =
                data.features;


            allFeatures.forEach(
                (
                    feature,
                    index
                ) => {

                    feature.__webgisIndex =
                        index;

                }
            );


            /*
               Tentukan apakah halaman normal
               atau mode hasil radius.
            */

            configureBaseFeatures();


            updateTotalBadge();


            buildFilterOptions();


            renderRadiusContextCard();



            /*
               Filter Dashboard tetap bekerja
               jika halaman dibuka dari Dashboard.
            */

            if (
                !radiusContext &&
                (
                    initialCompletenessFilter ===
                    "lengkap" ||
                    initialCompletenessFilter ===
                    "kurang"
                )
            ) {

                els.filterKelengkapan.value =
                    initialCompletenessFilter;

            }


            applyFilters();

        }

        catch (error) {

            console.error(
                "DATA ASET ERROR:",
                error
            );


            els.loadingState.hidden =
                true;


            els.emptyState.hidden =
                true;


            els.errorState.hidden =
                false;


            els.assetTableBody.innerHTML =
                "";


            els.resultCount.textContent =
                "—";


            els.assetTotalBadge.textContent =
                "— bidang";


            els.previousPageButton.disabled =
                true;


            els.nextPageButton.disabled =
                true;

        }

    }



    /* ======================================================
       START
       ====================================================== */

    loadTableData();


})();
