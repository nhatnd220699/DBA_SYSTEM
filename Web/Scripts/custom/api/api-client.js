export const ApiClient = {
    buildUrl(url) {
        const appRoot = document.querySelector('meta[name="app-root"]')?.content || '/';

        url = url.replace(/^\/+/, '');
        const baseUrl = window.location.origin + appRoot;
        return new URL(url, baseUrl).toString();
    },

    get: async function (url, params = null) {

        const queryString = this.buildQueryString(params);

        const response = await fetch(queryString ? `${this.buildUrl(url)}?${queryString}` : this.buildUrl(url));

        return this.handleResponse(response);
    },

    post: async function (url, data) {

        const response = await fetch(this.buildUrl(url), {
            method: "POST",
            headers: this.buildHeaders(true),
            body: JSON.stringify(data)
        });

        return this.handleResponse(response);
    },

    put: async function (url, data) {

        const response = await fetch(this.buildUrl(url), {
            method: "PUT",
            headers: this.buildHeaders(true),
            body: JSON.stringify(data)
        });

        return this.handleResponse(response);
    },

    patch: async function (url, data) {

        const response = await fetch(this.buildUrl(url), {
            method: "PATCH",
            headers: this.buildHeaders(true),
            body: JSON.stringify(data)
        });

        return this.handleResponse(response);
    },

    delete: async function (url, params = null) {

        const queryString = this.buildQueryString(params);

        const response = await fetch(queryString ? `${this.buildUrl(url)}?${queryString}` : this.buildUrl(url), {
            method: "DELETE",
            headers: this.buildHeaders(false),
        });

        return this.handleResponse(response);
    },

    postForm: async function (url, formData) {
        const response = await fetch(this.buildUrl(url), {
            method: "POST",
            headers: this.buildHeaders(false),
            body: formData
        });

        return this.handleResponse(response);
    },

    download: async function (url, params = null) {

        const queryString = this.buildQueryString(params);

        const response = await fetch(
            queryString
                ? `${this.buildUrl(url)}?${queryString}`
                : this.buildUrl(url),
            {
                method: "GET",
                credentials: "same-origin"
            });

        if (!response.ok) {

            let message = `HTTP ${response.status}`;

            try {

                const errorData = await response.json();

                message = errorData.message || message;

            } catch {

            }

            throw new Error(message);
        }

        const blob = await response.blob();

        const disposition = response.headers.get("Content-Disposition");

        let fileName = "download";

        if (disposition) {

            // filename*=UTF-8''...
            let match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

            if (match) {

                fileName = decodeURIComponent(match[1]);
            }
            else {

                // filename="..."
                match = disposition.match(/filename="?([^"]+)"?/i);

                if (match) {
                    fileName = match[1];
                }
            }
        }

        const downloadUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = downloadUrl;
        a.download = fileName;

        document.body.appendChild(a);

        a.click();

        a.remove();

        URL.revokeObjectURL(downloadUrl);

        return {
            fileName,
            size: blob.size,
            contentType: blob.type
        };
    },

    handleResponse: async function (response) {

        if (!response.ok) {

            let message = null;

            try {
                const errorData = await response.json();
                message = errorData.message;
            } catch { }

            switch (response.status) {
                case 400:
                    message = message || "Yêu cầu không hợp lệ.";
                    break;

                case 401:
                    message = message || "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.";
                    break;

                case 403:
                    message = message || "Bạn không có quyền thực hiện chức năng này.";
                    break;

                case 404:
                    message = message || "Không tìm thấy dữ liệu.";
                    break;

                case 405:
                    message = message || "Endpoint tồn tại nhưng phương thức không được phép.";
                    break;

                case 409:
                    message = message || "Dữ liệu bị xung đột.";
                    break;

                case 422:
                    message = message || "Dữ liệu không hợp lệ.";
                    break;

                case 500:
                    message = message || "Hệ thống đang gặp lỗi nội bộ.";
                    break;

                case 502:
                    message = message || "Lỗi Gateway.";
                    break;

                case 503:
                    message = message || "Hệ thống đang bảo trì hoặc quá tải.";
                    break;

                default:
                    if (response.status >= 500) {
                        message = `Lỗi hệ thống (${response.status}).`;
                    }
                    else if (response.status >= 400) {
                        message = `Yêu cầu không hợp lệ (${response.status}).`;
                    }
                    break;
            }

            const error = new Error(message);
            error.status = response.status;

            throw error;
        }

        return await response.json();
    },

    buildQueryString: function (params) {

        if (!params) return "";

        const query = new URLSearchParams();

        const filtered = Object.entries(params)
            .forEach(([key, value]) => {

                if (value === undefined || value === null) {
                    return;
                }

                if (Array.isArray(value) || value instanceof Array) {
                    value.forEach(item =>
                        query.append(key, item)
                    );
                }
                else {
                    query.append(key, value);
                }
            });

        return query.toString();
    },

    getAntiForgeryToken: function () {

        let token = document.querySelector('meta[name="csrf-formtoken"]')?.content;

        if (token) return token;

        token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;

        return token ? token : "";

    },

    buildHeaders: function (isJson = true) {

        const headers = {};

        if (isJson) {
            headers["Content-Type"] = "application/json";
        }

        const token = this.getAntiForgeryToken();

        if (token) {
            headers["RequestVerificationToken"] = token;
        }

        return headers;
    },

    request: async function (callback) {

        Popup.show("Loading...");

        try {

            return await callback();

        } catch (e) {

            Popup.error(e.message);

            throw e;

        } finally {

            Popup.hide();
        }
    }
}