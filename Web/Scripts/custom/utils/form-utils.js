//Convert value for the fields in form
function convertValue(value, type) {
    if (value === "")
        return null;

    switch (type) {
        case "number":
            return Number(value);

        case "boolean":
            return value === true || value === "true";

        default:
            return value.trim();
    }
}

export const FormUtils = {

    // Fill data into form
    setData(form, data, fieldTypes = {}) {
        form.querySelectorAll("[name]").forEach(el => {
            const key = el.name;
            const config = fieldTypes[key] ?? { type: "string" };

            if (!(key in data))
                return;

            const value = data[key];

            // Checkbox boolean
            if (el.type === "checkbox" && config.type === "boolean") {
                el.checked = !!value;
                return;
            }

            // Checkbox multiple
            if (el.type === "checkbox" && config.multiple) {
                const values = Array.isArray(value) ? value : [];
                el.checked = values.includes(
                    convertValue(el.value, config.type)
                );

                return;
            }

            // Radio
            if (el.type === "radio") {
                el.checked = convertValue(el.value, config.type) == value;

                return;
            }

            // Select multiple
            if (el.tagName === "SELECT" && el.multiple) {
                const values = Array.isArray(value) ? value : [];

                [...el.options].forEach(option => {
                    option.selected = values.includes(
                        convertValue(option.value, config.type)
                    );
                });

                return;
            }

            // Date
            if (el.type === "date") {
                if (!value) {
                    el.value = "";
                }
                else if (value instanceof Date) {
                    el.value = value.toISOString().slice(0, 10);
                }
                else {
                    el.value = value.toString().slice(0, 10);
                }

                return;
            }

            // Default (input, textarea, select...)
            el.value = value ?? "";
        });
    },

    //Collection data in form
    getData(form, fieldTypes = {}) {
        const data = {};

        form.querySelectorAll("[name]").forEach(el => {
            const key = el.name;
            const config = fieldTypes[key] ?? { type: "string" };

            // checkbox boolean
            if (el.type === "checkbox" && config.type === "boolean") {
                data[key] = el.checked;
                return;
            }

            // checkbox multiple
            if (el.type === "checkbox" && config.multiple) {
                data[key] ??= [];

                if (el.checked) {
                    data[key].push(convertValue(el.value, config.type));
                }

                return;
            }

            // radio
            if (el.type === "radio") {
                if (el.checked) {
                    data[key] = convertValue(el.value, config.type)
                }

                return;
            }

            // select multiple
            if (
                el.tagName === "SELECT" &&
                el.multiple
            ) {
                data[key] = [...el.selectedOptions].map(x =>
                    convertValue(x.value, config.type)
                );

                return;
            }

            // normal input/select
            data[key] = convertValue(
                el.value,
                config.type
            );
        });

        return data;
    }
};