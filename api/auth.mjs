import crypto from "node:crypto";

/* =========================================================
   AUTH ONLINE - WEBGIS BKAD KABUPATEN CIREBON
   Vercel Function
   ========================================================= */

const COOKIE_NAME = "bkad_admin_session";
const SESSION_AGE_SECONDS = 8 * 60 * 60;


/* =========================================================
   RESPONSE JSON
   ========================================================= */

function sendJson(response, status, data) {
    response.statusCode = status;

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

function safeEqual(a, b) {
    const hashA = crypto
        .createHash("sha256")
        .update(String(a))
        .digest();

    const hashB = crypto
        .createHash("sha256")
        .update(String(b))
        .digest();

    return crypto.timingSafeEqual(
        hashA,
        hashB
    );
}


/* =========================================================
   SESSION TOKEN
   ========================================================= */

function createToken(secret) {
    const payloadObject = {
        role: "admin",
        exp:
            Date.now() +
            SESSION_AGE_SECONDS * 1000
    };

    const payload = Buffer
        .from(
            JSON.stringify(payloadObject)
        )
        .toString("base64url");

    const signature = crypto
        .createHmac(
            "sha256",
            secret
        )
        .update(payload)
        .digest("base64url");

    return `${payload}.${signature}`;
}


function verifyToken(token, secret) {
    try {
        if (!token) {
            return false;
        }

        const parts =
            String(token).split(".");

        if (parts.length !== 2) {
            return false;
        }

        const [
            payload,
            signature
        ] = parts;

        const expectedSignature = crypto
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

        const decoded = JSON.parse(
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

    } catch {
        return false;
    }
}


/* =========================================================
   COOKIE
   ========================================================= */

function getCookie(request, name) {
    const header =
        request.headers.cookie || "";

    const cookies =
        header.split(";");

    for (const cookie of cookies) {
        const parts =
            cookie.trim().split("=");

        const key =
            parts.shift();

        const value =
            parts.join("=");

        if (key === name) {
            return value;
        }
    }

    return null;
}


/* =========================================================
   REQUEST BODY
   ========================================================= */

async function readBody(request) {
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
        } catch {
            return {};
        }
    }

    let raw = "";

    try {
        for await (
            const chunk
            of request
        ) {
            raw += chunk;
        }
    } catch {
        return {};
    }

    if (!raw) {
        return {};
    }

    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}


/* =========================================================
   MAIN
   ========================================================= */

export default async function handler(
    request,
    response
) {
    const secret =
        process.env.SESSION_SECRET;

    const adminUsername =
        process.env.ADMIN_USERNAME;

    const adminPassword =
        process.env.ADMIN_PASSWORD;


    if (
        !secret ||
        !adminUsername ||
        !adminPassword
    ) {
        return sendJson(
            response,
            500,
            {
                success: false,
                authenticated: false,
                role: null,
                message:
                    "Konfigurasi autentikasi belum tersedia."
            }
        );
    }


    const url =
        new URL(
            request.url || "/",
            "https://webgis.local"
        );

    const action =
        url.searchParams.get("action");


    /* =====================================================
       LOGIN
       ===================================================== */

    if (action === "login") {
        if (
            request.method !== "POST"
        ) {
            return sendJson(
                response,
                405,
                {
                    success: false,
                    authenticated: false,
                    role: null,
                    message:
                        "Method tidak diizinkan."
                }
            );
        }

        const body =
            await readBody(request);

        const username =
            String(
                body.username || ""
            ).trim();

        const password =
            String(
                body.password || ""
            );


        const validUsername =
            safeEqual(
                username,
                adminUsername
            );

        const validPassword =
            safeEqual(
                password,
                adminPassword
            );


        if (
            !validUsername ||
            !validPassword
        ) {
            return sendJson(
                response,
                200,
                {
                    success: false,
                    authenticated: false,
                    role: null,
                    message:
                        "Username atau password salah."
                }
            );
        }


        const token =
            createToken(secret);


        response.setHeader(
            "Set-Cookie",
            `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_AGE_SECONDS}`
        );


        return sendJson(
            response,
            200,
            {
                success: true,
                authenticated: true,
                role: "admin",
                message:
                    "Login berhasil."
            }
        );
    }


    /* =====================================================
       CEK SESSION
       ===================================================== */

    if (action === "session") {
        const token =
            getCookie(
                request,
                COOKIE_NAME
            );

        const authenticated =
            verifyToken(
                token,
                secret
            );


        return sendJson(
            response,
            200,
            {
                success: true,
                authenticated,
                role:
                    authenticated
                        ? "admin"
                        : null
            }
        );
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    if (action === "logout") {
        response.setHeader(
            "Set-Cookie",
            `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
        );


        return sendJson(
            response,
            200,
            {
                success: true,
                authenticated: false,
                role: null,
                message:
                    "Logout berhasil."
            }
        );
    }


    return sendJson(
        response,
        404,
        {
            success: false,
            message:
                "Endpoint autentikasi tidak ditemukan."
        }
    );
}
