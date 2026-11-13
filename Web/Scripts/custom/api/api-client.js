const STATUS_MESSAGES = {
    400: "The request is invalid.",
    401: "You are not authenticated or your session has expired.",
    403: "You do not have permission to perform this action.",
    404: "The requested resource was not found.",
    405: "The HTTP method is not allowed for this endpoint.",
    409: "A conflict occurred while processing your request.",
    413: "The request payload exceeds the maximum allowed size.",
    415: "The request media type is not supported.",
    422: "The submitted data is invalid.",
    429: "Too many requests. Please try again later.",
    500: "An internal server error occurred.",
    502: "A bad gateway error occurred.",
    503: "The service is temporarily unavailable or overloaded.",
    504: "The server did not respond within the allowed time."
};

const ApiClient = {

    // --------------------------------------------------
    // URL & QUERY STRING
    // --------------------------------------------------
    buildUrl(url) {
        const appRoot =
            document.querySelector('meta[name="app-root"]')?.content?.trim() || "/";

        // Normalize the application root path.
        const rootPath = `/${appRoot.replace(/^\/+|\/+$/g, "")}`;

        // Ensure the application root always ends with a slash.
        const basePath = rootPath === "/" ? "/" : `${rootPath}/`;

        const baseUrl = new URL(basePath, window.location.origin);

        // Resolve the requested URL relative to the application root.
        return new URL(String(url).replace(/^\/+/, ""), baseUrl).toString();
    },


    buildQueryString(params) {
        if (!params || typeof params !== "object") {
            return "";
        }

        const query = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                return;
            }

            const values = Array.isArray(value) ? value : [value];

            values.forEach(item => {
                if (item !== null && item !== undefined) {
                    query.append(key, String(item));
                }
            });
        });

        return query.toString();
    },

    buildRequestUrl(url, params = null) {
        const requestUrl = new URL(this.buildUrl(url));
        const queryString = this.buildQueryString(params);

        if (queryString) {
            new URLSearchParams(queryString).forEach((value, key) => {
                requestUrl.searchParams.append(key, value);
            });
        }

        return requestUrl.toString();
    },

    // --------------------------------------------------
    // HEADERS & SECURITY
    // --------------------------------------------------

    getAntiForgeryToken() {
        return (
            document.querySelector('meta[name="csrf-formtoken"]')?.content ||
            document.querySelector(
                'input[name="__RequestVerificationToken"]'
            )?.value ||
            ""
        );
    },

    buildHeaders(isJson = true, customHeaders = {}) {
        const headers = new Headers(customHeaders);

        if (isJson && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }

        const token = this.getAntiForgeryToken();

        if (token && !headers.has("RequestVerificationToken")) {
            headers.set("RequestVerificationToken", token);
        }

        return headers;
    },

    // --------------------------------------------------
    // CORE REQUEST
    // --------------------------------------------------

    async send(method, url, options = {}) {
        const {
            params = null,
            data,
            headers = {},
            signal,
            isJson = true
        } = options;

        const requestOptions = {
            method,
            credentials: "same-origin",
            headers: this.buildHeaders(isJson, headers),
            signal
        };

        if (data !== undefined) {
            requestOptions.body = isJson
                ? JSON.stringify(data)
                : data;
        }

        const response = await fetch(
            this.buildRequestUrl(url, params),
            requestOptions
        );

        return this.handleResponse(response);
    },

    // --------------------------------------------------
    // HTTP METHODS
    // --------------------------------------------------

    get(url, params = null, options = {}) {
        return this.send("GET", url, {
            ...options,
            params,
            isJson: false
        });
    },

    post(url, data, options = {}) {
        return this.send("POST", url, {
            ...options,
            data,
            isJson: true
        });
    },

    put(url, data, options = {}) {
        return this.send("PUT", url, {
            ...options,
            data,
            isJson: true
        });
    },

    patch(url, data, options = {}) {
        return this.send("PATCH", url, {
            ...options,
            data,
            isJson: true
        });
    },

    delete(url, params = null, options = {}) {
        return this.send("DELETE", url, {
            ...options,
            params,
            isJson: false
        });
    },

    postForm(url, formData, options = {}) {
        return this.send("POST", url, {
            ...options,
            data: formData,
            isJson: false
        });
    },

    // --------------------------------------------------
    // RESPONSE HANDLER
    // --------------------------------------------------

    async handleResponse(response) {
        // Handle responses without a body.
        if (response.status === 204 || response.status === 205) {
            return null;
        }

        const body = await response.text();

        let data = null;

        if (body) {
            try {
                data = JSON.parse(body);
            } catch {
                data = body;
            }
        }

        if (!response.ok) {
            const serverMessage =
                typeof data === "object" && data !== null
                    ? data.message || data.Message || data.title
                    : typeof data === "string" &&
                        !data.trim().startsWith("<")
                        ? data.trim()
                        : null;

            const defaultMessage =
                STATUS_MESSAGES[response.status] ||
                (response.status >= 500
                    ? `Lỗi hệ thống (${response.status}).`
                    : `Yêu cầu không hợp lệ (${response.status}).`);

            const error = new Error(
                serverMessage || defaultMessage
            );

            error.status = response.status;
            error.data = data;
            error.response = response;

            throw error;
        }

        return data;
    },

    // --------------------------------------------------
    // FILE DOWNLOAD
    // --------------------------------------------------

    async download(url, params = null, options = {}) {
        const response = await fetch(
            this.buildRequestUrl(url, params),
            {
                method: "GET",
                credentials: "same-origin",
                headers: this.buildHeaders(false, options.headers || {}),
                signal: options.signal
            }
        );

        if (!response.ok) {
            return this.handleResponse(response);
        }

        const blob = await response.blob();

        const disposition =
            response.headers.get("Content-Disposition");

        const fileName = this.getFileName(disposition);

        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = downloadUrl;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        link.remove();

        // Delay revocation to ensure the browser starts the download.
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

        return {
            fileName,
            size: blob.size,
            contentType: blob.type
        };
    },

    getFileName(disposition) {
        if (!disposition) {
            return "download";
        }

        // Support UTF-8 encoded filenames.
        const encodedMatch = disposition.match(
            /filename\*\s*=\s*UTF-8''([^;]+)/i
        );

        if (encodedMatch) {
            try {
                return decodeURIComponent(
                    encodedMatch[1].trim().replace(/^["']|["']$/g, "")
                );
            } catch {
                // Fall back to the regular filename.
            }
        }

        // Support regular filenames.
        const regularMatch = disposition.match(
            /filename\s*=\s*(?:"([^"]+)"|([^;]+))/i
        );

        return regularMatch
            ? (regularMatch[1] || regularMatch[2]).trim()
            : "download";
    },

    // --------------------------------------------------
    // REQUEST WRAPPER
    // --------------------------------------------------

    async request(callback) {
        Popup.show("Loading...");

        try {
            return await callback();
        } catch (error) {
            Popup.error(error.message);
            throw error;
        } finally {
            Popup.hide();
        }
    }
};

export { ApiClient };



//export const ApiClient = {
//    buildUrl(url) {
//        const appRoot = document.querySelector('meta[name="app-root"]')?.content || '/';

//        url = url.replace(/^\/+/, '');
//        const baseUrl = window.location.origin + appRoot;
//        return new URL(url, baseUrl).toString();
//    },

//    get: async function (url, params = null) {

//        const queryString = this.buildQueryString(params);

//        const response = await fetch(queryString ? `${this.buildUrl(url)}?${queryString}` : this.buildUrl(url));

//        return this.handleResponse(response);
//    },

//    post: async function (url, data) {

//        const response = await fetch(this.buildUrl(url), {
//            method: "POST",
//            headers: this.buildHeaders(true),
//            body: JSON.stringify(data)
//        });

//        return this.handleResponse(response);
//    },

//    put: async function (url, data) {

//        const response = await fetch(this.buildUrl(url), {
//            method: "PUT",
//            headers: this.buildHeaders(true),
//            body: JSON.stringify(data)
//        });

//        return this.handleResponse(response);
//    },

//    patch: async function (url, data) {

//        const response = await fetch(this.buildUrl(url), {
//            method: "PATCH",
//            headers: this.buildHeaders(true),
//            body: JSON.stringify(data)
//        });

//        return this.handleResponse(response);
//    },

//    delete: async function (url, params = null) {

//        const queryString = this.buildQueryString(params);

//        const response = await fetch(queryString ? `${this.buildUrl(url)}?${queryString}` : this.buildUrl(url), {
//            method: "DELETE",
//            headers: this.buildHeaders(false),
//        });

//        return this.handleResponse(response);
//    },

//    postForm: async function (url, formData) {
//        const response = await fetch(this.buildUrl(url), {
//            method: "POST",
//            headers: this.buildHeaders(false),
//            body: formData
//        });

//        return this.handleResponse(response);
//    },

//    download: async function (url, params = null) {

//        const queryString = this.buildQueryString(params);

//        const response = await fetch(
//            queryString
//                ? `${this.buildUrl(url)}?${queryString}`
//                : this.buildUrl(url),
//            {
//                method: "GET",
//                credentials: "same-origin"
//            });

//        if (!response.ok) {

//            let message = `HTTP ${response.status}`;

//            try {

//                const errorData = await response.json();

//                message = errorData.message || message;

//            } catch {

//            }

//            throw new Error(message);
//        }

//        const blob = await response.blob();

//        const disposition = response.headers.get("Content-Disposition");

//        let fileName = "download";

//        if (disposition) {

//            // filename*=UTF-8''...
//            let match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

//            if (match) {

//                fileName = decodeURIComponent(match[1]);
//            }
//            else {

//                // filename="..."
//                match = disposition.match(/filename="?([^"]+)"?/i);

//                if (match) {
//                    fileName = match[1];
//                }
//            }
//        }

//        const downloadUrl = URL.createObjectURL(blob);

//        const a = document.createElement("a");

//        a.href = downloadUrl;
//        a.download = fileName;

//        document.body.appendChild(a);

//        a.click();

//        a.remove();

//        URL.revokeObjectURL(downloadUrl);

//        return {
//            fileName,
//            size: blob.size,
//            contentType: blob.type
//        };
//    },

//    handleResponse: async function (response) {

//        if (!response.ok) {

//            let message = null;

//            try {
//                const errorData = await response.json();
//                message = errorData.message;
//            } catch { }

//            switch (response.status) {
//                case 400:
//                    message = message || "Yêu cầu không hợp lệ.";
//                    break;

//                case 401:
//                    message = message || "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.";
//                    break;

//                case 403:
//                    message = message || "Bạn không có quyền thực hiện chức năng này.";
//                    break;

//                case 404:
//                    message = message || "Không tìm thấy dữ liệu.";
//                    break;

//                case 405:
//                    message = message || "Endpoint tồn tại nhưng phương thức không được phép.";
//                    break;

//                case 409:
//                    message = message || "Dữ liệu bị xung đột.";
//                    break;

//                case 422:
//                    message = message || "Dữ liệu không hợp lệ.";
//                    break;

//                case 500:
//                    message = message || "Hệ thống đang gặp lỗi nội bộ.";
//                    break;

//                case 502:
//                    message = message || "Lỗi Gateway.";
//                    break;

//                case 503:
//                    message = message || "Hệ thống đang bảo trì hoặc quá tải.";
//                    break;

//                default:
//                    if (response.status >= 500) {
//                        message = `Lỗi hệ thống (${response.status}).`;
//                    }
//                    else if (response.status >= 400) {
//                        message = `Yêu cầu không hợp lệ (${response.status}).`;
//                    }
//                    break;
//            }

//            const error = new Error(message);
//            error.status = response.status;

//            throw error;
//        }

//        return await response.json();
//    },

//    buildQueryString: function (params) {

//        if (!params) return "";

//        const query = new URLSearchParams();

//        Object.entries(params)
//            .forEach(([key, value]) => {

//                if (value === undefined || value === null) {
//                    return;
//                }

//                if (Array.isArray(value) || value instanceof Array) {
//                    value.forEach(item =>
//                        query.append(key, item)
//                    );
//                }
//                else {
//                    query.append(key, value);
//                }
//            });

//        return query.toString();
//    },

//    getAntiForgeryToken: function () {

//        let token = document.querySelector('meta[name="csrf-formtoken"]')?.content;

//        if (token) return token;

//        token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;

//        return token ? token : "";

//    },

//    buildHeaders: function (isJson = true) {

//        const headers = {};

//        if (isJson) {
//            headers["Content-Type"] = "application/json";
//        }

//        const token = this.getAntiForgeryToken();

//        if (token) {
//            headers["RequestVerificationToken"] = token;
//        }

//        return headers;
//    },

//    request: async function (callback) {

//        Popup.show("Loading...");

//        try {

//            return await callback();

//        } catch (e) {

//            Popup.error(e.message);

//            throw e;

//        } finally {

//            Popup.hide();
//        }
//    }
//}