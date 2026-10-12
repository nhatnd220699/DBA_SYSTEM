const exportTable = (table, fileName = "table.xls") => {

    const cleanTable = table.cloneNode(true);

    // remove class bootstrap
    cleanTable.removeAttribute("class");

    // force thin border
    cleanTable.querySelectorAll("*").forEach(el => {
        el.style.border = "1px solid #000";
    });

    const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
                <meta charset="UTF-8">
                <style>
                    table {
                        border-collapse: collapse;
                    }

                    th, td {
                        border: 0.5pt solid #000 !important;
                        mso-border-alt: 0.5pt solid #000 !important;

                        vertical-align: middle;
                        text-align: center;
                        color: #212529;
                    }
                </style>
            </head>
            <body>
                ${table.outerHTML}
            </body>
        </html>
    `;

    const blob = new Blob(
        ['\ufeff', html],
        { type: 'application/vnd.ms-excel;charset=utf-8;' }
    );

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}