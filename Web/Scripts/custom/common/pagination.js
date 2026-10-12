import { renderIcon } from "../core/admin.js";

class TableRenderer {
    constructor({ tableId, renderRow }) {
        this.table = document.getElementById(tableId);

        if (!this.table) {
            throw new Error(`Bảng ${tableId} không tìm thấy.`);
        }

        this.renderRow = renderRow;

        this.tbody = this.table.querySelector('tbody') || this.table.appendChild(document.createElement('tbody'));

    }

    render(items, startIndex = 0) {
        this.clear();

        if (!items.length) {
            this.tbody.innerHTML = `<tr><td colspan="${999}">Không có dữ liệu.</td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        items.forEach((item, idx) => {
            const tr = document.createElement('tr');

            tr.innerHTML = this.renderRow({ ...item, ordinal: startIndex + idx + 1 });

            fragment.appendChild(tr);
        });

        this.tbody.appendChild(fragment);
    }

    clear() {
        this.tbody.innerHTML = '';
    }
}


class SearchManager {
    constructor({ selector, callback, delay = 300 }) {
        this.input = document.querySelector(selector);

        this.callback = callback;

        this.delay = delay;

        if (!this.input)
            return;

        this.listener = this.debounce(event => {
            callback(event.target.value.trim().toLowerCase());
        }, delay);

        this.input.addEventListener('input', this.listener);
    }

    debounce(fn, delay) {
        let timer;

        return (...args) => {
            clearTimeout(timer);

            timer = setTimeout(() => {
                fn(...args);
            }, delay);
        }
    }

    destroy() {
        if (this.input && this.listener) {
            this.input.removeEventListener('input', this.listener);
        }
    }
}

class ExportManager {
    static exportTable({ table, data = [], renderRow, filename = 'export.xls' }) {

        const rowsHTML = data.map((item, idx) => {
            const tr = document.createElement('tr');

            tr.innerHTML = renderRow({ ...item, ordinal: idx + 1 });

            return tr.outerHTML;
        }).join('');

        const html = `
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    table {
                        border-collapse: collapse;
                    }

                    td,th {
                        border:1px solid #000;
                        padding:4px;
                    }
                </style>
            </head>
            <body>
                <table>
                    <thead>
                        ${table.querySelector("thead")?.innerHTML || ''}
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob(
            [html],
            {
                type: "application/vnd.ms-excel",
            }
        );

        const a = document.createElement("a");

        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }
}


class Pagination {
    constructor({
        mode = 'front',
        pageSize = 20,
        paginationSelector,
        data = [],
        fetchData = null,
        tableId,
        renderRow,
        searchInput,
        exportBtn,
        showJumpInput = false,
        onRendered = null
    }) {
        this.mode = mode;
        this.data = data;
        this.tableId = tableId;
        this.originData = [...data];
        this.fetchData = fetchData;
        this.pageSize = pageSize;
        this.currentPage = 1;
        this.paginationContainer = document.querySelector(paginationSelector);;
        this.totalItems = data.length;
        this.showJumpInput = showJumpInput;
        this.renderer = new TableRenderer({ tableId, renderRow });
        this.table = this.renderer.table;
        this.renderRow = renderRow;
        this.onrendered = onRendered;

        if (searchInput && mode === 'front') {
            this.SearchManager = new SearchManager({
                selector: searchInput,
                callback: keywork => {
                    if (!keywork) {
                        this.data = [...this.originData];
                    } else {
                        this.data = this.originData.filter(item => JSON.stringify(item).toLowerCase().includes(keywork));
                    }

                    this.totalItems = this.data.length;

                    this.loadPage(1);
                }
            });
        }

        if (exportBtn && mode === 'front') {
            document.querySelector(exportBtn).addEventListener('click', () => {
                ExportManager.exportTable({
                    table: this.table,
                    data: this.data,
                    renderRow: this.renderRow,
                    filename: `${tableId}.xls`
                });
            });
        }

        this.loadPage(1);
    }

    get startIndex() {
        return (this.currentPage - 1) * this.pageSize;
    }

    get totalPages() {
        return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    }

    async loadPage(page) {

        if (page < 1) page = 1;

        if (page > this.totalPages)
            page = this.totalPages;

        this.currentPage = page;

        let items = [];

        if (this.mode === "front") {
            items =
                this.data.slice(
                    this.startIndex,
                    this.startIndex +
                    this.pageSize
                );
        }
        else {
            const result = await this.fetchData(page, this.pageSize);

            items = result.items || [];

            this.totalItems = result.total || items.length;
        }

        this.renderer.render(
            items,
            this.startIndex
        );

        this.onrendered?.(this);

        this.renderPagination();
    }

    renderPagination() {

        //if (
        //    !this.paginationContainer
        //) {

        //    this.paginationContainer = document.getElementById(this.tableId).nextElementSibling?.querySelector('.pagination');

        //    //this.paginationContainer =
        //    //    document.createElement(
        //    //        "div"
        //    //    );

        //    //this.paginationContainer.className =
        //    //    "pagination";

        //    //this.table.insertAdjacentElement(
        //    //    "afterend",
        //    //    this
        //    //        .paginationContainer
        //    //);
        //}

        const div = this.paginationContainer;

        if (!div) return;

        div.innerHTML = "";

        div.appendChild(
            this.createBtn(
                // '<span class="material-symbols-outlined text-[14px]">chevron_left</span>',
                renderIcon("chevron_left", "w-[14px] h-[14px] shrink-0"),
                this.currentPage - 1,
                this.currentPage === 1
            )
        );

        const pages = this.buildPages();

        pages.forEach(p => {

            if (p === "...") {

                const span = document.createElement("span");

                span.innerHTML = "...";
                span.className = "text-[10px] px-1";

                div.appendChild(
                    span
                );

                return;
            }

            const btn =
                this.createBtn(
                    p,
                    p
                );

            if (p === this.currentPage) {
                btn.classList.add(
                    'bg-primary', 'text-white', 'font-bold', 'shadow-sm'
                );
            } else {
                btn.classList.add(
                    'border', 'border-outline-variant', 'text-on-surface-variant', 'hover:bg-surface-container-low'
                );
            }

            div.appendChild(btn);

        });

        div.appendChild(
            this.createBtn(
                // '<span class="material-symbols-outlined text-[14px]">chevron_right</span>',
                renderIcon("chevron_right", "w-[14px] h-[14px] shrink-0"),
                this.currentPage + 1,
                this.currentPage === this.totalPages
            )
        );

        if (
            this.showJumpInput
        ) {

            div.appendChild(
                this.createJump()
            );
        }
    }

    createBtn(
        text,
        page,
        disabled = false
    ) {

        const btn = document.createElement("button");

        btn.innerHTML = text;

        btn.className = 'w-6 h-6 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant disabled:opacity-30';

        btn.disabled = disabled;

        btn.onclick =
            () => {
                this.loadPage(
                    page
                );
            }

        return btn;
    }

    createJump() {

        const wrapper = document.createElement("div");

        const input = document.createElement("input");

        input.type = "number";

        input.id = "inputJump";

        input.value = this.currentPage;

        input.className = 'border border-outline-variant rounded text-[10px] px-2 py-0 focus:ring-primary bg-surface-container-lowest w-[70px]';

        const btn = document.createElement("button");

        btn.innerHTML = "Go";

        btn.onclick =
            () =>
                this.loadPage(
                    Number(
                        input.value
                    )
                );

        wrapper.append(
            input,
            btn
        );

        return wrapper;
    }

    buildPages() {

        const total =
            this.totalPages;

        const current =
            this.currentPage;

        if (total <= 7) {

            return Array.from(
                {
                    length: total,
                },
                (_, i) => i + 1
            );
        }

        if (current <= 3) {
            return [
                1,
                2,
                3,
                4,
                "...",
                total,
            ];
        }

        if (
            current >=
            total - 2
        ) {
            return [
                1,
                "...",
                total - 3,
                total - 2,
                total - 1,
                total,
            ];
        }

        return [
            1,
            "...",
            current - 1,
            current,
            current + 1,
            "...",
            total,
        ];
    }

    refresh() {
        this.loadPage(
            this.currentPage
        );
    }

    destroy() {

        this.searchManager?.destroy();

        this.paginationContainer?.remove();

        this.renderer.clear();
    }
}


export {
    Pagination
};