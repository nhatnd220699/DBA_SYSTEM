export const FileUtils = {

    // Validate excel file
    async validateExcel(file) {
        if (!file) return false;

        const extension = file.name
            .substring(file.name.lastIndexOf("."))
            .toLowerCase();

        if (![".xlsx", ".xls"].includes(extension)) {
            throw new Error("Chỉ được tải lên Excel.");
        }

        const mimeTypes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
        ];

        if (file.type && !mimeTypes.includes(file.type)) {
            throw new Error("MIME type không hợp lệ.");
        }

        const buffer = await file.slice(0, 8).arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // XLSX (ZIP)
        const isXlsx =
            bytes[0] === 0x50 &&
            bytes[1] === 0x4B &&
            bytes[2] === 0x03 &&
            bytes[3] === 0x04;

        // XLS (OLE Compound File)
        const isXls =
            bytes[0] === 0xD0 &&
            bytes[1] === 0xCF &&
            bytes[2] === 0x11 &&
            bytes[3] === 0xE0 &&
            bytes[4] === 0xA1 &&
            bytes[5] === 0xB1 &&
            bytes[6] === 0x1A &&
            bytes[7] === 0xE1;

        if (
            (extension === ".xlsx" && !isXlsx) ||
            (extension === ".xls" && !isXls)
        ) {
            throw new Erorr("Tập tin không phải Excel hợp lệ.");
        }

        return true;
    },

    // Validate file size
    validateSize(file, maxSize) {

        // Fize size
        const MAX_FILE_SIZE = maxSize * 1024 * 1024;

        if (!file) {
            throw new Error("Vui lòng chọn tập tin.");
        }

        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`Kích thước tập tin không được vượt quá ${maxSize} MB.`);
        }

        return true;
    }
};