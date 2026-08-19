(() => {

    "use strict";


    /* =====================================================
       ELEMENT
       ===================================================== */

    const form =
        document.querySelector(
            "form"
        );


    if (!form) {

        console.error(
            "Form login tidak ditemukan."
        );

        return;

    }


    const usernameInput =
        form.querySelector(
            "#username, " +
            "[name='username'], " +
            "input[type='text']"
        );


    const passwordInput =
        form.querySelector(
            "#password, " +
            "[name='password'], " +
            "input[type='password']"
        );


    const submitButton =
        form.querySelector(
            "button[type='submit'], " +
            "input[type='submit']"
        );


    if (
        !usernameInput ||
        !passwordInput ||
        !submitButton
    ) {

        console.error(
            "Elemen login belum lengkap."
        );

        return;

    }



    /* =====================================================
       MESSAGE
       ===================================================== */

    let messageBox =
        document.getElementById(
            "loginMessage"
        );


    if (!messageBox) {

        messageBox =
            document.createElement(
                "div"
            );


        messageBox.id =
            "loginMessage";


        messageBox.style.cssText = `

            display:none;

            margin-top:14px;

            padding:11px 13px;

            border-radius:6px;

            font-size:12px;

            line-height:1.5;

        `;


        submitButton
            .parentElement
            ?.insertBefore(
                messageBox,
                submitButton.nextSibling
            );

    }



    function showMessage(
        message,
        type = "error"
    ) {

        messageBox.textContent =
            message;


        messageBox.style.display =
            "block";


        if (
            type === "success"
        ) {

            messageBox.style.background =
                "#eaf6f1";


            messageBox.style.color =
                "#168a62";


            messageBox.style.border =
                "1px solid #cfe9de";

        }

        else {

            messageBox.style.background =
                "#fff1f1";


            messageBox.style.color =
                "#b42318";


            messageBox.style.border =
                "1px solid #f2cece";

        }

    }



    function hideMessage() {

        messageBox.style.display =
            "none";


        messageBox.textContent =
            "";

    }



    /* =====================================================
       LOGIN
       ===================================================== */

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            hideMessage();


            const username =
                usernameInput.value.trim();


            const password =
                passwordInput.value;


            if (
                !username ||
                !password
            ) {

                showMessage(
                    "Username dan password wajib diisi."
                );

                return;

            }


            const originalText =
                submitButton.tagName ===
                "INPUT"

                    ? submitButton.value

                    : submitButton.textContent;


            submitButton.disabled =
                true;


            if (
                submitButton.tagName ===
                "INPUT"
            ) {

                submitButton.value =
                    "Memeriksa...";

            }

            else {

                submitButton.textContent =
                    "Memeriksa...";

            }


            try {

                const response =
                    await fetch(
                        "api/login.php",
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
                                        username,
                                        password
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
                    result.success !== true ||
                    result.authenticated !== true ||
                    result.role !== "admin"
                ) {

                    throw new Error(
                        result.message ||
                        "Login gagal."
                    );

                }


                /*
                   PHP session = keamanan sebenarnya.
                   Browser role = untuk pengaturan UI.
                */

                if (
                    typeof setAdminRole ===
                    "function"
                ) {

                    setAdminRole();

                }

                else {

                    sessionStorage.setItem(
                        "webgis_role",
                        "admin"
                    );

                }


                showMessage(
                    "Login berhasil. Mengalihkan ke sistem...",
                    "success"
                );


                window.setTimeout(
                    () => {

                        window.location.href =
                            "beranda.html";

                    },
                    350
                );

            }

            catch (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );


                showMessage(
                    error.message ||
                    "Login tidak dapat diproses."
                );

            }

            finally {

                submitButton.disabled =
                    false;


                if (
                    submitButton.tagName ===
                    "INPUT"
                ) {

                    submitButton.value =
                        originalText;

                }

                else {

                    submitButton.textContent =
                        originalText;

                }

            }

        }
    );

})();