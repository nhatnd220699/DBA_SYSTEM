import { Popup, Toast, ActionLock, ApiClient, renderIcon, NumberUtils, StringUtils } from '../modules/app.js';

const
    DBA_ERRORLOG = 'dba_errorlog',
    DBA_JOB_ERRORLOG = 'dba_job_errorlog',
    DBA_DBLOCK_LOG = 'dba_dblock_log',
    DBA_DBBACKUP_LOG = 'dba_dbbackup_log';

const API_ENDPOINT = 'https://QMSAIPortal.quantacn.com/qmhapiportal/api/APIPortal/execute';
const API_CONTEXT = Object.freeze({ BU: 'MSSQL', Station: 'AIQuery' });
const REFRESH_INTERVAL_MS = 12 * 60 * 1000;
const SEARCH_DEBOUNCE_MS = 500;

const STEP = Object.freeze({
    DASHBOARD_SUMMARY: 'Get_Dashboard_Summary',
    INCIDENT_SUMMARY: 'Get_Incident_Summary',
    ALWAYS_ON_STATUS: 'Get_AlwaysOn_Status',
    LARGE_TABLE_STATUS: 'Get_LargeTable_Status',
    DISK_SPACE_STATUS: 'Get_DiskSpace_Status',
    INCIDENT_DETAIL: 'Get_Incident_Detail',
    UPDATE_INCIDENT_STATUS: 'Update_Incident_Status'
});

const CATEGORY_STEP = Object.freeze({
    [DBA_ERRORLOG]: 'Get_Monitor_ErrorLog',
    [DBA_JOB_ERRORLOG]: 'Get_Job_ErrorLog',
    [DBA_DBLOCK_LOG]: 'Get_DBLock_Log',
    [DBA_DBBACKUP_LOG]: 'Get_DBBackup_Log'
});

function buildApiParams(step, input) {
    return { ...API_CONTEXT, Step: step, InputStr: JSON.stringify(input) };
}
function parseApiData(result, fallback = null) {
    if (!result?.success) {
        console.error(
            result?.message || 'API request failed'
        );

        return fallback;
    }

    if (typeof result.data !== 'string') {
        return result.data ?? fallback;
    }

    try {
        return JSON.parse(result.data);
    } catch (error) {
        console.error(
            'Invalid API response:',
            error
        );

        return fallback;
    }
}

function debounce(callback, waitMs) {
    let timerId;
    return (...args) => {
        clearTimeout(timerId);
        timerId = setTimeout(() => callback(...args), waitMs);
    };
}
function escape(value) {
    return StringUtils.escapeHtml(String(value ?? ''));
}

const appState = {
    selectedCategory: '',
    selectedSeverities: [], //['critical', 'high', 'medium', 'low']
    searchQuery: '',
    expandedGroups: new Set(), //Group 1 expanded by default
    expandedIncidents: new Set(), // Error 1 expanded by default,
    expandedErrorLists: new Set(),
    expandedErrorMessages: new Set()

};

window.appState = appState;

let storageServers = [];

// Global UI & Filter State
const filterSummary = {
    categories: [
        { id: DBA_ERRORLOG, label: 'Error Logs', count: 0, icon: 'terminal' },
        { id: DBA_JOB_ERRORLOG, label: 'Agent Jobs', count: 0, icon: 'schedule' },
        { id: DBA_DBLOCK_LOG, label: 'Database Lock', count: 0, icon: 'lock_clock' },
        { id: DBA_DBBACKUP_LOG, label: 'Backup', count: 0, icon: 'cloud_done' },

    ],
    severities: [
        {
            id: 'critical',
            label: 'Critical',
            count: 0,
            dotColor: 'bg-red-400 dark:bg-red-400',
            textColor: 'text-red-800 dark:text-red-400',
            activeBg: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-500/40',
        },
        {
            id: 'high',
            label: 'High',
            count: 0,
            dotColor: 'bg-orange-400 dark:bg-orange-400',
            textColor: 'text-orange-800 dark:text-orange-400',
            activeBg: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-500/40',
        },
        {
            id: 'medium',
            label: 'Medium',
            count: 0,
            dotColor: 'bg-blue-400 dark:bg-blue-400',
            textColor: 'text-blue-800 dark:text-blue-400',
            activeBg: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-500/40',
        },
        {
            id: 'low',
            label: 'Low',
            count: 0,
            dotColor: 'bg-gray-400 dark:bg-gray-400',
            textColor: 'text-gray-800 dark:text-gray-400',
            activeBg: 'bg-gray-100 dark:bg-gray-500/30 border-gray-300 dark:border-gray-500/40',
        },
    ],
};

window.filterSummary = filterSummary;

async function getKpis() {
    try {

        const params = buildApiParams(STEP.DASHBOARD_SUMMARY, { Dept: dept });
        const result = await ApiClient.post(API_ENDPOINT, params);
        //const result = await ApiClient.get('/Content/temp/kpi.json');

        let data = parseApiData(result, []);

        if (!data || !Array.isArray(data) || data.length <= 0) return;

        //Prepare data
        data = data.reduce((acc, item) => {
            const { department, incident_type, incident_count } = item;
            if (!acc[department]) {
                acc[department] = {};
            }

            acc[department][incident_type] = incident_count;
            return acc;
        }, {});


        //View critical incidents to Navbar
        const renderIncident = (department, elementId) => {
            const el = document.getElementById(elementId);
            if (!el) return;

            const count = data?.[department]?.HIGH_LEVEL_COUNT ?? 0;

            el.textContent = count;

            const classes = (
                count > 0
                    ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                    : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
            ).split(/\s+/);

            el.classList.add(...classes);
        };
        renderIncident("FATP", "fatp-incident");
        renderIncident("CR", "cr-incident");
        renderIncident("SMT", "smt-incident");
        renderIncident("BOBCAT", "bobcat-incident");


        //Fill to KPI of the selected dept
        const kpiDataDept = data[dept] || {};
        const kpis = {
            "kpi-high": kpiDataDept.HIGH_LEVEL_COUNT ?? 0,
            "kpi-medium": (kpiDataDept.MEDIUM_LEVEL_COUNT ?? 0) + (kpiDataDept.LOW_LEVEL_COUNT ?? 0),
            "kpi-capacity": kpiDataDept.CAPACITY_ERROR_COUNT ?? 0,
            "kpi-backup": `${kpiDataDept.BACKUP_COMPLETED_PERCENT ?? 0}%`
        };

        Object.entries(kpis).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    } catch (err) {
        console.error(err);
        Toast.error('Unable to load KPI summary');
    }
}



function updateErrorSummary(element, count) {
    if (!element) return;

    const title = element.querySelector('.error-title');
    const countEl = element.querySelector('.error-count');
    const badge = element.querySelector('.error-badge');

    if (countEl) countEl.textContent = count;

    const isError = count > 0;

    title?.classList.add(...(isError
        ? 'group-hover:text-rose-700 dark:group-hover:text-rose-400'
        : 'group-hover:text-emerald-700 dark:group-hover:text-emerald-400').split(/\s+/));

    countEl?.classList.remove(...('text-slate-900 dark:text-white'.split(/\s+/)));
    countEl?.classList.add(...(isError
        ? 'text-rose-600 dark:text-rose-600'
        : 'text-emerald-600 dark:text-emerald-600').split(/\s+/));

    if (badge && isError) {
        badge.innerHTML = renderIcon(
            'error',
            'w-[26px] h-[26px] font-bold animate-[pulse_2s_ease-in-out_infinite] text-rose-600 dark:text-rose-600 shrink-0'
        );
    }
}

async function getErrorSummary() {
    try {
        const params = buildApiParams(STEP.INCIDENT_SUMMARY, { Dept: dept });
        const result = await ApiClient.post(API_ENDPOINT, params);
        let data = parseApiData(result, []);

        if (!data || !Array.isArray(data) || data.length <= 0) return;

        const countMap = {};
        data.forEach(item => {
            const count = item.incident_count || 0;
            const incidentType = item.incident_type;

            countMap[incidentType] = count;
            if (item?.incident_type) {
                const el = document.querySelector(`[data-error-type="${incidentType}"]`);
                updateErrorSummary(el, count || 0);
            }
        });

        //Update category info
        filterSummary.categories.forEach(category => {
            category.count = countMap[category.id] || 0;
        });

    } catch (err) {
        console.error(err.message);
    }
}


function formatConnectedState(state) {
    const value = String(state || '').toUpperCase();

    const styles = {
        CONNECTED: 'text-emerald-700 dark:text-emerald-400',
        DISCONNECTED: 'text-rose-700 dark:text-rose-400'
    };

    return `<span class="font-medium ${styles[value] || 'text-yellow-700 dark:text-yellow-400'}">${state || '-'}</span>`;
}

function formatSyncState(state) {
    const value = String(state || '').toUpperCase();

    const styles = {
        SYNCHRONIZED: 'text-emerald-700 dark:text-emerald-400',
        SYNCHRONIZING: 'text-amber-700 dark:text-amber-400',
        'NOT SYNCHRONIZING': 'text-rose-700 dark:text-rose-400',
        INITIALIZING: 'text-cyan-700 dark:text-cyan-400',
        REVERTING: 'text-orange-700 dark:text-orange-400'
    };

    return `<span class="font-medium ${styles[value] || 'text-slate-700 dark:text-slate-300'}">${state || '-'}</span>`;
}

//function formatHealthLevel(health) {
//    const value = String(health || '').toUpperCase();

//    const styles = {
//        HEALTHY: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
//        OK: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
//        PARTIALLY_HEALTHY: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
//        NOT_HEALTHY: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
//        CRITICAL: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
//        WARNING: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
//    };

//    return `
//        <span class="inline-block px-2 py-0.5 rounded font-bold text-[11px] ${styles[value] || 'bg-slate-200/20 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300'
//        }">
//            ${health || '-'}
//        </span>
//    `;
//}

function formatHealthLevel(health, message = '') {
    const value = String(health || '').toUpperCase();

    const styles = {
        HEALTHY: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        OK: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        PARTIALLY_HEALTHY: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
        NOT_HEALTHY: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
        CRITICAL: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
        WARNING: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
    };

    const isHealthy = ['HEALTHY', 'OK'].includes(value);

    const badge = `
        <span class="inline-block px-2 py-0.5 rounded font-bold text-[11px] ${!isHealthy ? 'underline': ''} ${styles[value] ||
        'bg-slate-200/20 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300'
        }">
            ${health || '-'}
        </span>
    `;

    if (isHealthy || !message) {
        return badge;
    }

    return `
        <div class="group relative inline-block cursor-pointer">
            ${badge}
            <div class="
                hidden group-hover:block
                absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2
                w-80 max-w-sm
                bg-slate-900 text-white text-xs
                p-3 rounded-lg shadow-lg
                whitespace-normal break-words
            ">
                ${message}
            </div>
        </div>
    `;
}


async function getAlwaysOnStatus() {
    let html = '';
    let data;
    const alwaysonBadge = document.getElementById('alwayson-badge');

    try {
        const params = buildApiParams(STEP.ALWAYS_ON_STATUS, { Dept: dept });
        const result = await ApiClient.post(API_ENDPOINT, params);
        data = parseApiData(result, []);

        html = (data || []).map(item => {
            return `
            <tr>
                <td class="px-3 py-2.5 whitespace-nowrap font-bold text-slate-900 dark:text-white">${item.database_name || ''}</td>
                <td class="px-3 py-2.5 whitespace-nowrap font-bold text-slate-900 dark:text-white">${item.replica_server_name || ''}</td>
                <td class="px-3 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-200">${item.replica_role || ''}</td>
                <td class="px-3 py-2.5 whitespace-nowrap font-medium">${formatConnectedState(item.connected_state)}</td>
                <td class="px-3 py-2.5 whitespace-nowrap">${formatSyncState(item.synchronization_state)}</td>
                <td class="px-3 py-2.5 whitespace-nowrap text-center">${formatHealthLevel(item.health_level)}</td>
                <td class="px-3 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-200 text-right">${item.log_send_queue_kb || ''}</td>
                <td class="px-3 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-200 text-right">${item.redo_queue_kb || ''}</td>
                <td class="px-3 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-200 text-right">${item.logsendrate_kb_persec || ''}</td>
                <td class="px-3 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-200 text-right">${item.redorate_kb_persec || ''}</td>
            <tr>
        `;
        }).join('');

        if (!html) {
            html = `<tr><td colspan="50" class="px-3 py-2.5 whitespace-nowrap font-bold text-rose-700 dark:text-rose-400">No data to display</td></tr>`;
        }
    } catch (err) {
        html = `<tr><td colspan="50" class="px-3 py-2.5 whitespace-nowrap font-bold text-rose-700 dark:text-rose-400">${err.message}</td></tr>`;
    }

    alwaysonBadge.textContent = data && data.length >= 0 ? data.length + ' REPLICAS' : 'REPLICAS';
    document.getElementById('table-alwayson').querySelector('tbody').innerHTML = html;
}


function formatTableRows(rowCount) {
    const value = Number(rowCount) || 0;

    let cssClass = 'text-slate-700 dark:text-slate-200';

    if (value >= 10000000) {
        cssClass = 'text-rose-700 dark:text-rose-400 font-bold';
    }
    else if (value >= 5000000) {
        cssClass = 'text-amber-700 dark:text-amber-400 font-bold';
    }

    return `
        <span class="${cssClass}">
            ${value.toLocaleString()}
        </span>
    `;
}

function formatWarningLevel(level) {
    const value = (level || '').toUpperCase();

    switch (value) {
        case 'CRITICAL':
            return `
                <span class="inline-block px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold text-[11px]">
                    ${level}
                </span>
            `;

        case 'WARNING':
            return `
                <span class="inline-block px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                    ${level}
                </span>
            `;

        default:
            return `
                <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                    ${level || 'NORMAL'}
                </span>
            `;
    }
}


async function getLargeTable() {
    let html = '';
    let data;
    const tableLargeBadge = document.getElementById('table-large-badge');
    const totalTablesCapacity = document.getElementById('total-tables-capacity');

    try {
        const params = buildApiParams(STEP.LARGE_TABLE_STATUS, { Dept: dept });
        const result = await ApiClient.post(API_ENDPOINT, params);
        data = parseApiData(result, []);

        html = (data || []).map(item => {
            return `
                <tr>
                    <td class="px-3 py-2.5 whitespace-nowrap font-bold text-slate-900 dark:text-white">${item.table_name || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-200">${item.database_name || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap font-medium">${formatTableRows(item.table_rows)}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap">${formatWarningLevel(item.warning_level)}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-center">${item.reserved_gb || ''} GB</td>
                <tr>
            `;
        }).join('');

        if (!html) {
            html = `<tr><td colspan="50" class="px-3 py-2.5 whitespace-nowrap font-bold text-rose-700 dark:text-rose-400">No data to display</td></tr>`;
        }
    } catch (err) {
        html = `<tr><td colspan="50" class="px-3 py-2.5 whitespace-nowrap font-bold text-rose-700 dark:text-rose-400">${err.message}</td></tr>`;
    }

    tableLargeBadge.textContent = data && data.length >= 0 ? data.length + ' LARGE TABLES' : 'LARGE TABLES';

    const totalCapacity = data?.reduce((acc, item) => { return acc += item.reserved_gb }, 0);
    totalTablesCapacity.textContent = data && data.length >= 0 ? 'TOTAL CAPACITY (' + data.length + ` TABLES): ${NumberUtils.formatNumber(totalCapacity)} GB` : 'TOTAL CAPACITY'
    document.getElementById('table-large').querySelector('tbody').innerHTML = html;
}

async function getDiskSpace() {
    try {
        const params = buildApiParams(STEP.DISK_SPACE_STATUS, { Dept: dept });
        const result = await ApiClient.post(API_ENDPOINT, params);
        let data = parseApiData(result, []);

        storageServers = Object.values(
            (data || []).reduce((acc, item) => {
                const key = `${item.server_ip}_${item.server_name}`;

                if (!acc[key]) {
                    acc[key] = {
                        server_ip: item.server_ip,
                        server_name: item.server_name,
                        count: 0
                    };
                }

                acc[key].count++;

                if (Number(item.free_space_percent) < 30) {
                    acc[key].alarm = true;
                }

                return acc;
            }, {})
        );

        const nameEl = document.getElementById('storage-active-server-name');
        const ipEl = document.getElementById('storage-active-server-ip');
        const multipathEl = document.getElementById('storage-active-server-multipath');

        if (nameEl) nameEl.textContent = storageServers[0].server_name;
        if (ipEl) ipEl.textContent = '[' + storageServers[0].server_ip + ']';
        if (multipathEl) multipathEl.textContent = 'SAN DISK: ' + storageServers[0].count + ' DISKS';


        const serverTabs = document.getElementById('san-server-tabs');
        const serverTabsHtml = (storageServers || []).map((server, idx) => {
            const isActive = idx === 0;
            const hasAlarm = server.alarm;
            const serverIp = server.server_ip.replace(/\./g, '_');
            return `
                <li role="presentation" class="shrink-0">
                    <button type="button"
                            role="tab"
                            aria-selected="${isActive}"
                            class="storage-server-tab flex items-center gap-1.5 py-2 px-3 border-b-2 ${isActive ? 'text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-400 hover:text-slate-900 dark:hover:text-white font-semibold' : 'text-slate-600 dark:text-slate-400 border-transparent dark:border-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 font-medium'} transition-all group"
                            data-action="switch-storage-server"
                            data-server-ip="${serverIp}"
                            id="tab-btn-${serverIp}">
                        <span class="w-2 h-2 rounded-full ${hasAlarm ? 'bg-rose-600 dark:bg-rose-600' : 'bg-emerald-600 dark:bg-emerald-600'} circle-badge ${isActive ? 'animate-pulse' : ''}"></span>
                        <span class="font-mono font-medium tracking-tight">${server.server_ip}</span>
                    </button>
                </li>
            `;
        }).join('');
        serverTabs.innerHTML = serverTabsHtml;


        const dataServer = (data || []).reduce((acc, item) => {
            if (!acc[item.server_ip]) {
                acc[item.server_ip] = [];
            }

            acc[item.server_ip].push(item);
            return acc;
        }, {});

        const storageTabs = document.getElementById('storage-tab-panes');
        let htmlStorageTabs = '';
        (storageServers || []).forEach((server, idx) => {
            const isActive = idx === 0;
            const serverIp = server.server_ip.replace(/\./g, '_');

            const storageData = dataServer[server.server_ip] || [];
            const storages = storageData.map(storage => {
                const freePercent = NumberUtils.formatNumber(storage?.free_space_percent) || 0;
                const hasFreeAlarm = freePercent <= 30;
                const usedPercent = NumberUtils.formatNumber(100 - freePercent);
                const progressColor =
                    usedPercent >= 90
                        ? 'bg-red-500'
                        : usedPercent >= 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500';
                return `
                    <div class="flex flex-col justify-between bg-white dark:bg-[#121c2d] hover:bg-slate-100 dark:hover:bg-[#18263e] shadow-md p-3.5 rounded-xl transition-all duration-200">
                        <div class="flex flex-col items-center w-full text-center">
                            <div class="relative mb-2.5 filter">
                                <img src="/Content/images/hdd_48.png" alt="disk" />
                            </div>
                            <!-- Drive Label & Role -->
                            <span class="font-mono font-bold text-slate-900 dark:text-white text-xs tracking-tight">Disk (${storage?.volume_point})</span>
                            <!-- <span class="mt-0.5 max-w-full font-sans text-[11px] text-slate-600 dark:text-slate-400 truncate"
                                >OS &amp; System Binaries</span
                            > -->
                        </div>

                        <!-- Capacity Metric & Progress Bar -->
                        <div class="space-y-1.5 mt-3 w-full">
                            <div class="font-mono text-base text-center">
                                <span class="font-semibold text-slate-900 dark:text-slate-100">${storage?.used_space_gb}</span>
                                <span class="text-slate-600 dark:text-slate-400">/ ${storage?.total_space_gb} GB</span>
                            </div>
                            <div class="w-full">
                                <div class="flex justify-between text-[11px] mb-1">
                                    <span class="text-slate-500">
                                        Used
                                    </span>
                                    <span class="font-semibold text-slate-700 dark:text-slate-300">
                                        ${usedPercent}%
                                    </span>
                                </div>

                                <div class="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        class="${progressColor} h-full transition-all duration-700"
                                        style="width:${usedPercent}%"
                                    ></div>
                                </div>
                            </div>
                            <div class="pt-1 text-center">
                                <span class="inline-block font-mono ${hasFreeAlarm ? 'font-bold text-rose-600 dark:text-rose-600' : 'font-medium text-slate-900 dark:text-slate-100'} text-[12px] tracking-wide">${freePercent}% Free</span> (${storage?.free_space_gb} GB)
                            </div>
                        </div>
                    </div>
                `
            }).join('');


            const gridColumns = storageData.length > 3 ? 4 : 3;

            htmlStorageTabs += `
                <div class="gap-3 grid grid-cols-2 md:grid-cols-${gridColumns} storage-pane transition-opacity duration-300 opacity-100 ${isActive ? 'opacity-100' : 'hidden opacity-0'}"
                        id="pane-${serverIp}">
                        ${storages}
                </div>
            `
        });
        storageTabs.innerHTML = htmlStorageTabs;

    } catch (err) {
        console.error(err.message);
    }
}

let incidentGroupsData_Beta = [];
let severityData_Beta = [];

async function getIncidentDetailsByCategory() {
    try {
        const step = CATEGORY_STEP[appState.selectedCategory];
        if (!step) return;

        const params = buildApiParams(step, { Dept: dept });
        const result = await ApiClient.post(API_ENDPOINT, params);
        let data = parseApiData(result, []);

        if (!data) return;

        severityData_Beta = (data?.Incident_Summary || []).reduce((acc, item) => {
            acc[item?.incident_level?.toLowerCase()] = item.incident_count;
            return acc;
        }, {});

        incidentGroupsData_Beta = appState.selectedCategory !== DBA_DBBACKUP_LOG ? (data?.Incident_Detail || []) : data ?? [];

        renderFilterBars(true);
        renderIncidentDetailByCategory(incidentGroupsData_Beta, appState);
    } catch (err) {
        console.error(err.message);
    }
}

function renderIncidentDetailByCategory(data, state) {

    const root = document.getElementById('accordion-root');
    if (!root) return;

    const query = (String(state.searchQuery) || '').trim().toLowerCase();

    data = data.filter((inc) => {
        // Severity filter
        const selectedSeverities = state.selectedSeverities || [];

        if (
            selectedSeverities.length > 0 &&
            !selectedSeverities.includes(
                String(inc.incident_level || '').toLowerCase()
            )
        ) {
            return false;
        }

        // Search filter
        if (query) {
            let combinedString;

            if (appState.selectedCategory !== DBA_DBBACKUP_LOG) {
                combinedString = [
                    inc.incidentid,
                    inc.incident_title,
                    inc.incident_level,
                    inc.status,
                    inc.department,
                    inc.incident_group,
                    inc.incident_type,
                    inc.source_id,
                    inc.system_name,
                    inc.server_ip,
                    inc.error_message,
                    inc.rootcause,
                    inc.recommendation
                ];
            } else {
                combinedString = [
                    inc.site,
                    inc.server_ip,
                    inc.database_name,
                    inc.id,
                    inc.message,
                    inc.bkserver_path,
                    inc.status,
                    inc.created_time
                ];
            }

            return combinedString
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(query);
        }

        return true;
    });

    if (data.length === 0) {
        root.innerHTML = `
            <div class="rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center gap-2">
                ${renderIcon('search_off', 'w-[36px] h-[36px] text-slate-600 dark:text-slate-500')}
                <div class="text-[15px] font-semibold text-slate-700 dark:text-slate-300">No incident diagnostic matches found</div>
                <div class="text-[12px] font-mono text-slate-600 dark:text-slate-500">Try adjusting your category tabs, severity filter, or search query.</div>
            </div >
        `;
        return;
    }

    const table = document.createElement('table');
    table.id = 'tbl-incident-details-by-category';
    table.className = `min-w-full border-collapse text-sm text-left text-gray-700 dark:text-gray-300`;

    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    if (!data?.length) {
        const colspan = Object.keys(columnMap).length;

        tbody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No data found
                </td>
            </tr>
        `;

        table.appendChild(tbody);
        root.innerHTML = '';
        root.appendChild(table);
        return;
    }

    let columnMap;

    if (appState.selectedCategory !== DBA_DBBACKUP_LOG) {
        columnMap = {
            ordinal: {
                title: 'No.',
                thClass: 'text-center',
                render: (value) => {
                    return `<span class="inline-block w-full text-center text-slate-400">${value}</span>`;
                }
            },
            source_id: {
                title: 'Source ID',
                thClass: 'text-center',
                render: (value) => {
                    return `<span class="w-full inline-block text-center font-semibold text-blue-500 dark:text-blue-300">${value}</span>`
                }
            },
            incidentid: {
                title: 'Incident ID',
                thClass: 'text-center',
                render: (value) => {
                    return `<span class="inline-block w-full font-semibold text-center">${value}</span>`;
                }
            },
            server_ip: {
                title: 'Server IP'
            },
            incident_title: {
                title: 'Incident title'
            },
            error_message: {
                title: 'Error message',
                render: (value, item) => {
                    const text = value || '';
                    const shortText =
                        text.length > 120
                            ? `${text.substring(0, 120)}...`
                            : text;

                    return `
                    <div class="max-w-[400px]">
                        <div class="line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
                            ${StringUtils.escapeHtml(shortText)}
                        </div>

                        ${text.length > 120
                            ? `
                            <button
                                class="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                data-action="show-error-message"
                                data-incident-id="${item.incidentid}"
                            >
                                View detail
                            </button>
                        `
                            : ''
                        }
                    </div>
                `;
                }
            },
            incident_level: {
                title: 'Severity',
                thClass: 'text-center',
                tdClass: 'text-center',
                render: (value) => {
                    const severity = String(value || '').toLowerCase();

                    const colorMap = {
                        critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                        high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
                        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                        medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                        low: 'bg-gray-100 dark:bg-gray-500/30 text-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-500/40'
                    };

                    return `
                        <span class=" inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold
                            ${colorMap[severity] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}
                        ">
                            ${value}
                        </span>
                    `;
                }
            },
            system_name: {
                title: 'System name'
            },
            incident_group: {
                title: "Incident group"
            }
        };
    } else {
        columnMap = {
            ordinal: {
                title: 'No.',
                thClass: 'text-center',
                render: (value) => {
                    return `<span class="inline-block w-full text-center text-slate-400 dark:text-slate-400">${value}</span>`;
                }
            },
            site: {
                title: 'Site',
            },
            server_ip: {
                title: 'Sever IP'
            },
            database_name: {
                title: 'Database name'
            },
            id: {
                title: 'ID',
                thClass: 'text-center',
                render: (value) => {
                    const id = String(value || '');
                    return `<span class="w-full inline-block text-center font-semibold text-blue-500 dark:text-blue-300">${id}</span>`
                }
            },
            message: {
                title: 'Message'
            },
            bkserver_path: {
                title: 'Backup Sever Path'
            },
            status: {
                title: 'Status'
            },
            created_time: {
                title: 'Created at'
            }
        };
    }


    thead.className = `sticky top-0 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100`;
    thead.innerHTML = `
        <tr>
            ${Object.entries(columnMap)
            .map(([key, col]) => `
                <th class="
                    px-4 py-3
                    border-b
                    border-gray-200
                    dark:border-gray-700
                    ${col.thClass || ''}
                ">
                    ${col.title}
                </th>
            `).join('')}
        </tr>
    `;

    data.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML =
            Object.entries(columnMap)
                .map(([key, col]) => {

                    const value = key === 'ordinal'
                        ? index + 1
                        : item[key];

                    const content = col.render
                        ? col.render(value, item, index)
                        : (value ?? '');

                    return `
                    <td class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 ${col.tdClass || ''}">
                        ${content}
                    </td>
                `;
                })
                .join('');

        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    root.innerHTML = '';
    root.appendChild(table);
}

async function getIncidentDetailByKpi() {
    try {
        const params = buildApiParams(STEP.INCIDENT_DETAIL, { Dept: dept });
        const result = await ApiClient.post(API_ENDPOINT, params);
        let data = parseApiData(result, []);

        if (!data) return;


        //Severity filterbar
        severityData_Beta = (data?.Incident_Summary || []).reduce((acc, item) => {
            acc[item?.incident_level?.toLowerCase()] = item.incident_count;
            return acc;
        }, {});
        //console.log('severityData_Beta: ', severityData_Beta);


        ////Incident details
        incidentGroupsData_Beta = Object.values(
            (data?.Incident_Detail || []).reduce((acc, item) => {
                const {
                    incident_group,
                    incident_level,
                    incidentid,
                    incident_type
                } = item;

                // Tránh key undefined/null
                const groupKey = incident_group || 'Unknown';
                const incidentKey = String(incidentid);

                // Tạo group trực tiếp, không chia theo incident_type
                acc[groupKey] ??= {
                    incident_group: groupKey,
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    incidentsById: {}
                };

                const group = acc[groupKey];

                // Thông tin chi tiết của từng lỗi
                const errorDetail = {
                    error_message: item.error_message ?? '',
                    source_id: item.source_id ?? '',
                    system_name: item.system_name ?? '',
                    server_ip: item.server_ip ?? '',

                    // Giữ nguồn phát sinh lỗi vì không còn chia theo incident_type
                    incident_type: incident_type ?? ''
                };

                // Nếu incidentid chưa tồn tại trong group
                if (!group.incidentsById[incidentKey]) {
                    const level = String(incident_level || '').toLowerCase();

                    group.incidentsById[incidentKey] = {
                        ...item,

                        // Không giữ một incident_type đơn lẻ
                        // vì incident có thể đến từ nhiều incident_type
                        incident_types: incident_type
                            ? [incident_type]
                            : [],

                        // error_message là danh sách object
                        error_message: [errorDetail]
                    };

                    // Xóa incident_type lấy từ ...item để tránh gây hiểu nhầm
                    delete group.incidentsById[incidentKey].incident_type;

                    // Chỉ đếm level một lần cho mỗi incidentid
                    if (level === 'critical') group.critical++;
                    if (level === 'high') group.high++;
                    if (level === 'medium') group.medium++;
                    if (level === 'low') group.low++;
                } else {
                    const existingIncident =
                        group.incidentsById[incidentKey];

                    // Lưu lại tất cả incident_type có liên quan
                    if (
                        incident_type &&
                        !existingIncident.incident_types.includes(incident_type)
                    ) {
                        existingIncident.incident_types.push(incident_type);
                    }

                    // Chống trùng error object
                    const isDuplicate =
                        existingIncident.error_message.some(error =>
                            error.error_message === errorDetail.error_message &&
                            error.source_id === errorDetail.source_id &&
                            error.system_name === errorDetail.system_name &&
                            error.server_ip === errorDetail.server_ip &&
                            error.incident_type === errorDetail.incident_type
                        );

                    if (!isDuplicate) {
                        existingIncident.error_message.push(errorDetail);
                    }
                }

                return acc;
            }, {})
        ).map(group => {
            const { incidentsById, ...groupData } = group;

            return {
                ...groupData,
                incidents: Object.values(incidentsById)
            };
        });


        //console.log('incidentGroupsData_Beta: ', incidentGroupsData_Beta);

        renderFilterBars();
        renderIncidentDirectory(incidentGroupsData_Beta, appState);

    } catch (err) {
        console.error(err.message);
    }
}

// 2. Filter Bar Renders
function renderFilterBars(hasCategory = false) {
    // Render Category Tabs
    if (appState.selectedCategory) {

        document.getElementById('btn-expand-all').classList.add('hidden');
        document.getElementById('btn-collapse-all').classList.add('hidden');

        if (appState.selectedCategory === DBA_DBBACKUP_LOG) {
            document.getElementById('severity-filter-bar').innerHTML = ''; //Reset
        }
    } else {
        document.getElementById('btn-expand-all').classList.remove('hidden');
        document.getElementById('btn-collapse-all').classList.remove('hidden');
    }
    const catContainer = document.getElementById('category-filter-bar');
    if (hasCategory && catContainer) {
        catContainer.innerHTML = filterSummary.categories
            .map((cat) => {
                const isActive = appState.selectedCategory === cat.id;
                const btnClasses = isActive
                    ? 'filter-tab px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-2 bg-blue-600 dark:bg-blue-600 text-white dark:text-white shadow-sm'
                    : 'filter-tab px-3 py-1.5 rounded-lg text-[12px] transition-all flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800';
                const badgeClasses = isActive
                    ? 'px-1.5 py-0.5 rounded-full font-mono text-[11px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-200'
                    : 'px-1.5 py-0.5 rounded-full font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';

                return `
                    <button class="${btnClasses}" data-category-id="${cat.id}" data-action="filter-category-offline" type="button">
                    <span>${cat.label}</span>
                    <!--<span class="${badgeClasses}">${cat.count}</span>-->
                    </button>
                `;
            })
            .join('');
    }

    if (appState.selectedCategory !== DBA_DBBACKUP_LOG) {

        // Render Severity Buttons
        const allSeveritySummary = severityData_Beta;
        filterSummary.severities = filterSummary.severities.map(severity => ({
            ...severity,
            count: allSeveritySummary?.[severity?.id?.toLocaleLowerCase()] ?? 0
        }));

        const sevContainer = document.getElementById('severity-filter-bar');
        if (sevContainer) {
            const sevButtons = filterSummary.severities
                .map((sev) => {
                    const isSelected = appState.selectedSeverities?.includes(sev.id);
                    let btnClass = '';
                    if (isSelected) {
                        btnClass = `${sev.activeBg} ${sev.textColor} font-semibold`;
                    } else {
                        btnClass =
                            'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 ' +
                            (sev.id === 'critical'
                                ? 'text-red-700 dark:text-red-400/80 border-slate-300 dark:border-slate-700'
                                : sev.id === 'high'
                                    ? 'text-orange-700 dark:text-orange-400/80 border-slate-300 dark:border-slate-700'
                                    : sev.id === 'medium'
                                        ? 'text-blue-700 dark:text-blue-400 border-slate-300 dark:border-slate-700'
                                        : 'text-gray-700 dark:text-gray-400 border-slate-300 dark:border-slate-700');
                    }
                    return `
                        <button data-severity-id="${sev?.id}" data-action="filter-severity" class="px-2.5 py-1 rounded font-mono text-[11px] flex items-center gap-1.5 border transition-colors ${btnClass}" type="button">
                            <span class="w-1.5 h-1.5 rounded-full ${sev.dotColor}"></span>
                            <span>${sev.label}</span>
                            <span>(${sev.count})</span>
                        </button>
                    `;
                })
                .join('');

            sevContainer.innerHTML = `<span class="font-mono text-[10px] text-slate-600 dark:text-slate-500 uppercase font-semibold">Filter Severity:</span>${sevButtons}`;
        }
    }

}
// 3. Dynamic 3-Level Accordion Renderer

function renderSeverityClass(sev) {
    sev = sev?.toLowerCase();

    if (sev.includes('critical')) {
        return `bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-500/40`;
    } else if (sev.includes('high')) {
        return `bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-300 dark:border-orange-500/40`;
    } else if (sev.includes('medium')) {
        return `bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-500/40`;
    } else if (sev.includes('low')) {
        return `bg-gray-100 dark:bg-gray-500/30 text-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-500/40`;
    }

    return '';
}

function renderIncidentStatusClass(status) {
    status = status?.toLowerCase();

    if (status.includes('open')) {
        return `bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] border border-slate-300 dark:border-slate-700`;
    } else if (status.includes('analyze')) {
        return `bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-400 font-mono text-[10px] border border-amber-300 dark:border-amber-700`;
    } else if (status.includes('doing')) {
        return `bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 font-mono text-[10px] border border-cyan-300 dark:border-cyan-800`;
    } else if (status.includes('done')) {
        return `bg-emeral-100 dark:bg-emeral-500/20 text-emeral-700 dark:text-emeral-400 font-mono text-[10px] border border-emeral-300 dark:border-emeral-500/30`;
    }

    return '';
}

function renderGroupSeverityBadge(criticalCount, highCount, mediumCount, lowCount) {
    const severities = [
        {
            count: Number(criticalCount),
            label: 'CRIT',
            color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-500/40'
        },
        {
            count: Number(highCount),
            label: 'HIGH',
            color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-500/40'
        },
        {
            count: Number(mediumCount),
            label: 'MED',
            color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-500/40'
        },
        {
            count: Number(lowCount),
            label: 'LOW',
            color: 'bg-gray-100 dark:bg-gray-500/30 text-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-500/40'
        }
    ];

    return severities
        .filter(item => item.count > 0)
        .map(item => `
            <span class="px-2 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider ${item.color}">
                ${item.count} ${item.label}
            </span>
        `)
        .join(' / ');
}

const renderErrorMessages = (errorMessages, incidentId) => {
    const messages = Array.isArray(errorMessages)
        ? errorMessages
        : errorMessages
            ? [{
                error_message: errorMessages,
                source_id: '',
                system_name: '',
                server_ip: ''
            }]
            : [];

    if (messages.length === 0) {
        return `
            <div class="px-3 py-4 text-center rounded-lg bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                No error messages available.
            </div>
        `;
    }

    const incidentKey = String(incidentId);

    const isExpanded = appState.expandedErrorLists.has(incidentKey);

    const visibleMessages = isExpanded ? messages : messages.slice(0, 2);

    const hiddenCount = Math.max( messages.length - 2, 0);

    return `
        <div
            class="error-list-container"
            data-incident-id="${StringUtils.escapeHtml(incidentKey)}"
        >
            <div class="space-y-3">
                ${visibleMessages.map((error, index) => {
                    const rawMessage = error?.error_message || 'No error message';

                    const escapedFullMessage = StringUtils.escapeHtml(rawMessage).replace(/\n/g, '<br>');

                    const expandedKey = `${incidentKey}_${index}`;

                    const isExpandedMessage = appState.expandedErrorMessages?.has(expandedKey);

                    const MAX_LENGTH = 100;

                    const isLongMessage = rawMessage.length > MAX_LENGTH;

                    const shortMessage = StringUtils.escapeHtml(rawMessage.substring(0, MAX_LENGTH)).replace(/\n/g, '<br>');

                    return `
                        <div
                            class="error-message-item copy-wrapper rounded-lg overflow-hidden border border-rose-200 dark:border-rose-500/20 bg-white dark:bg-[#0d1626]"
                        >

                            <!-- Header -->
                            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-2 px-3 py-2.5 bg-rose-50 dark:bg-rose-500/10 border-b border-rose-200 dark:border-rose-500/20">

                                <div class="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">

                                    <div class="flex items-center gap-2 shrink-0">
                                        <span class="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-rose-600 dark:bg-rose-500 text-white font-mono text-[11px] font-bold">
                                            #${index + 1}
                                        </span>

                                        <span class="font-mono text-xs font-bold text-rose-700 dark:text-rose-400">
                                            Error ${index + 1}
                                        </span>
                                    </div>

                                    <span class="hidden sm:block w-px h-5 bg-rose-200 dark:bg-rose-500/30"></span>

                                    <div class="flex items-center gap-1.5">
                                        <span class="font-mono text-[10px] uppercase text-slate-500">
                                            Source ID:
                                        </span>

                                        <span class="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                            ${StringUtils.escapeHtml(error?.source_id || 'N/A')}
                                        </span>
                                    </div>

                                    <div class="flex items-center gap-1.5 min-w-0">
                                        <span class="font-mono text-[10px] uppercase text-slate-500">
                                            Incident Type:
                                        </span>

                                        <span
                                            class="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 max-w-[260px] truncate"
                                            title="${StringUtils.escapeHtml(error?.incident_type || 'N/A')}"
                                        >
                                            ${StringUtils.escapeHtml(error?.incident_type || 'N/A')}
                                        </span>
                                    </div>

                                    <div class="flex items-center gap-1.5">
                                        <span class="font-mono text-[10px] uppercase text-slate-500">
                                            Server IP:
                                        </span>

                                        <span class="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                            ${StringUtils.escapeHtml(error?.server_ip || 'N/A')}
                                        </span>
                                    </div>

                                    <div class="flex items-center gap-1.5 min-w-0">
                                        <span class="font-mono text-[10px] uppercase text-slate-500">
                                            System:
                                        </span>

                                        <span
                                            class="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 max-w-[260px] truncate"
                                            title="${StringUtils.escapeHtml(error?.system_name || 'N/A')}"
                                        >
                                            ${StringUtils.escapeHtml(error?.system_name || 'N/A')}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    class="copy-btn flex items-center gap-1.5 shrink-0 self-end lg:self-auto text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 px-2 py-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-500/10"
                                    data-action="copy"
                                    title="Copy error message"
                                >
                                    ${renderIcon('content_copy', 'w-[15px] h-[15px] icon')}
                                    <span class="font-mono text-[10px]">
                                        Copy
                                    </span>
                                </button>
                            </div>

                            <!-- Error Content -->
                            <div class="px-4 py-3">

                                <div class="copy-message text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-normal break-words">
                                    ${isExpandedMessage || !isLongMessage ? escapedFullMessage : `${shortMessage}...`}
                                </div>

                                ${isLongMessage
                                        ? `
                                            <button
                                                type="button"
                                                data-action="toggle-error-message"
                                                data-error-key="${expandedKey}"
                                                class="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline
                                                "
                                            >
                                                ${isExpandedMessage ? 'Show less' : 'View detail'}
                                            </button>
                                        `
                                        : ''
                                }
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            ${messages.length > 2
            ? `
                    <div class="mt-3 flex justify-center">
                        <button
                            type="button"
                            data-action="toggle-error-list"
                            data-incident-id="${StringUtils.escapeHtml(incidentKey)}"
                            aria-expanded="${isExpanded}"
                            class="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 font-mono text-[11px] font-semibold transition-colors"
                        >
                            ${renderIcon(isExpanded ? 'expand_less': 'expand_more', 'w-[18px] h-[18px]')}

                            <span>
                                ${isExpanded ? 'Collapse error list' : `Show ${hiddenCount} more errors`}
                            </span>
                        </button>
                    </div>
                `
            : ''
        }
        </div>
    `;
};


function renderIncidentDirectory(data, state) {

    const root = document.getElementById('accordion-root');
    if (!root) return;


    ////Filter data by category
    //data = data.find(item => item.incident_type === state.selectedCategory)?.groups || [];


    // Filter Logic
    const query = (String(state.searchQuery) || '').trim().toLowerCase();

    const filteredGroups = data
        .map((group) => {
            // Filter incidents inside group
            const matchingIncidents = group.incidents.filter((inc) => {

                // Severity filter check
                const selectedSeverities = state.selectedSeverities || [];
                if (
                    selectedSeverities.length > 0 &&
                    !selectedSeverities.includes(inc.incident_level.toLowerCase())
                ) {
                    return false;
                }

                // Search Query check
                if (query) {
                    const errorMessagesText = Array.isArray(inc?.error_message)
                        ? inc.error_message
                            .map((error) => {
                                return [
                                    error?.error_message,
                                    error?.source_id,
                                    error?.server_ip,
                                    error?.system_name,
                                    error?.incident_type
                                ]
                                    .filter(Boolean)
                                    .join(' ');
                            })
                            .join(' ')
                        : String(inc?.error_message || '');

                    const combinedString = [
                        inc?.incidentid,
                        inc?.incident_title,
                        inc?.incident_level,
                        inc?.status,
                        inc?.department,
                        errorMessagesText,
                        inc?.rootcause,
                        inc?.recommendation
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();

                    return combinedString.includes(query);
                }

                return true;
            });

            // If category matches, or there is a query matching group title
            const groupMatchesQuery = query && (group.incident_group.toLowerCase().includes(query));

            if (matchingIncidents.length === 0 && !groupMatchesQuery && query) {
                return null;
            }

            return {
                ...group,
                filteredIncidents: matchingIncidents,
            };
        })
        .filter(Boolean);

    if (filteredGroups.length === 0) {
        root.innerHTML = `
            <div class="rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center gap-2">
                ${renderIcon('search_off', 'w-[36px] h-[36px] text-slate-600 dark:text-slate-500')}
                <div class="text-[15px] font-semibold text-slate-700 dark:text-slate-300">No incident diagnostic matches found</div>
                <div class="text-[12px] font-mono text-slate-600 dark:text-slate-500">Try adjusting your category tabs, severity filter, or search query.</div>
                <!-- <button data-action="reset-filters" class="mt-3 px-3 py-1.5 rounded bg-blue-600 dark:bg-blue-600 hover:bg-blue-500 dark:hover:bg-blue-500 text-white dark:text-white font-mono text-[11px] transition-colors">
                    Reset Filters
                </button> -->
            </div >
        `;
        return;
    }

    // Generate Accordion HTML
    const html = filteredGroups
        .map((group) => {
            const isGroupExpanded = state.expandedGroups.has(group.incident_group);
            const incidentsToRender = group.filteredIncidents;

            // Group trigger classes
            const arrowIconClass = isGroupExpanded
                ? 'lvl1-icon text-blue-700 dark:text-blue-400 w-[22px] h-[22px] text-[22px] transition-transform duration-200 rotate-90'
                : 'lvl1-icon text-slate-600 dark:text-slate-500 w-[22px] h-[22px] text-[22px] transition-transform duration-200';

            return `
            <!-- ================= LEVEL 1: GROUP ================= -->
            <div class="lvl1-card rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden" data-group-id="${group.incident_group}" data-category="${group.incident_group}">
                <!-- Level 1 Trigger Header -->
                <button aria-expanded="${isGroupExpanded}" data-group-id="${group.incident_group}" data-action="toggle-group" class="lvl1-trigger w-full px-4 py-3.5 bg-white/90 dark:bg-slate-900/90 flex flex-wrap md:flex-nowrap items-center   justify-between gap-3 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors focus:outline-none" type="button">
                    <div class="flex items-center gap-3 min-w-0">
                        ${renderIcon('expand_circle_right', arrowIconClass)}
                        <div class="flex flex-col min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">${group.incident_group}</span>
                                <!--<span class="px-2 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/20"></span>-->
                                ${renderGroupSeverityBadge(group?.critical, group?.high, group.medium, group?.low)}
                            </div>
                            <!--<span class="font-mono text-[12px] text-slate-600 dark:text-slate-400 truncate">${group?.description || 'NA'}</span>-->
                        </div>
                    </div>
                    <div class="flex items-center gap-4 shrink-0">
                        <span class="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-950 ${isGroupExpanded ? 'text-blue-700 dark:text-blue-400 font-bold' : 'text-slate-600 dark:text-slate-400 font-medium'} font-mono text-[12px] border border-slate-200 dark:border-slate-800">
                            ${incidentsToRender.length} Incidents
                        </span>
                    </div>
                </button>

                <!-- Level 1 Content Body -->
                <div class="lvl1-content p-3.5 space-y-3 bg-slate-50/60 dark:bg-slate-950/60 ${isGroupExpanded ? '' : 'hidden'}">
                    ${incidentsToRender.length === 0
                    ? `
                            <div class="p-4 text-center font-mono text-[12px] text-slate-600 dark:text-slate-500">
                                No incidents match severity '${appState?.selectedSeverities?.toString()}' in this group.
                            </div>
                            `
                    : incidentsToRender
                        .map((incident) => {
                            const isIncidentExpanded = state.expandedIncidents.has(incident?.incidentid?.toString());
                            const lvl2IconClass = isIncidentExpanded
                                ? 'lvl2-icon text-emerald-700 dark:text-emerald-400 w-[20px] h-[20px] text-[20px] transition-transform duration-200 rotate-90'
                                : 'lvl2-icon text-slate-600 dark:text-slate-500 w-[20px] h-[20px] text-[20px] transition-transform duration-200';

                            return `
                                    <!-- ---------- LEVEL 2: INCIDENT ROW ---------- -->
                                    <div class="lvl2-card rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden" data-incident-id="${incident.incidentid}">
                                        <button aria-expanded="${isIncidentExpanded}" data-incident-id="${incident.incidentid}" data-action="toggle-incident" class="lvl2-trigger w-full px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors flex flex-wrap md:flex-nowrap items-center justify-between gap-3 text-left focus:outline-none" type="button">
                                            <div class="flex items-center gap-2.5 min-w-0">
                                                ${renderIcon('arrow_right', lvl2IconClass)}
                                                <div class="flex flex-col min-w-0">
                                                    <div class="flex items-center gap-2 flex-wrap">
                                                        <span class="text-[14px] font-medium text-slate-900 dark:text-slate-100">${incident.incident_title}</span>
                                                        <span class="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${renderSeverityClass(incident.incident_level)}">${incident.incident_level}</span>
                                                    </div>
                                                    <div class="flex items-center gap-2 text-slate-600 dark:text-slate-500 font-mono text-[11px] mt-0.5 flex-wrap">
                                                        <span class="text-blue-700 dark:text-blue-400 font-medium">Dept: [${incident?.department}]</span>
                                                        <span>•</span>
                                                        <span>[Incident ID: ${incident?.incidentid}]</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-2.5 shrink-0">
                                                <span class="px-2 py-0.5 rounded ${renderIncidentStatusClass(incident?.status)}">Status: ${incident?.status}</span>
                                            </div>
                                        </button>

                                        <!-- LEVEL 3 DIAGNOSTIC COCKPIT DETAILS -->
                                        <div class="lvl2-content p-4 space-y-3 bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 ${isIncidentExpanded ? '' : 'hidden'}">
                                            <div class="grid grid-cols-1 gap-4">
                                                <div class="gap-3 grid grid-cols-1 md:grid-cols-2">
                                                    <!-- Proposed Action Plan (Giải pháp đề xuất) -->
                                                    <div class="md:col-span-1 p-3.5 bg-white dark:bg-[#0d1626] rounded-xl border border-emerald-300 dark:border-emerald-500/20 shadow-sm">
                                                        <div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-1.5">
                                                            ${renderIcon('lightbulb', 'w-[22px] h-[22px]')}
                                                            <span class="font-mono text-xs font-bold uppercase tracking-wider">Action Plan</span>
                                                        </div>
                                                        <p class="text-sm text-slate-700 px-3 dark:text-slate-200 leading-relaxed font-sans">
                                                                ${incident?.recommendation?.replace(/\n/g, '<br>')}
                                                        </p>
                                                        <div class="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                                            <span>Auto-generated action plan</span>
                                                        </div>
                                                    </div>

                                                    <!-- Root Cause -->
                                                    <div class="md:col-span-1 p-3.5 bg-white dark:bg-[#0d1626] rounded-xl border border-rose-300 dark:border-rose-500/20 shadow-sm">
                                                        <div class="copy-wrapper group/line">
                                                            <div class="flex items-center justify-between gap-2 text-rose-700 dark:text-rose-400 mb-1.5">
                                                                <div class="flex items-center gap-2">
                                                                    ${renderIcon('report_problem', 'w-[22px] h-[22px]')}
                                                                    <span class="font-mono text-xs font-bold uppercase tracking-wider">Root Cause</span>
                                                                </div>
                                                                <button class="copy-btn opacity-0 group-hover/line:opacity-100 text-slate-600 dark:text-slate-400 hover:cursor-pointer transition-opacity px-3 py-1" data-action="copy">
                                                                    ${renderIcon('content_copy', 'w-[16px] h-[16px] icon')}
                                                                </button>
                                                            </div>
                                                            <p class="text-sm text-slate-700 px-3 dark:text-slate-200 leading-relaxed font-sans copy-message">${(incident?.rootcause?.replace(/\n/g, '<br>'))}</p>
                                                        </div>
                                                        <div class="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                                            <span>Auto-generated root cause</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Error Message/Root Cause -->
                                                <div class="p-3.5 bg-white dark:bg-[#0d1626] rounded-xl border border-rose-300 dark:border-rose-500/20 shadow-sm">
                                                    <div class="copy-wrapper group/line">
                                                        <div class="flex items-center justify-between gap-2 text-rose-700 dark:text-rose-400 mb-1.5">
                                                            <div class="flex items-center gap-2">
                                                                ${renderIcon('error', 'w-[22px] h-[22px]')}
                                                                <span class="font-mono text-xs font-bold uppercase tracking-wider">Error Message</span>
                                                            </div>
                                                            <!--<button class="copy-btn opacity-0 group-hover/line:opacity-100 text-slate-600 dark:text-slate-400 hover:cursor-pointer transition-opacity px-3" data-action="copy">
                                                                ${renderIcon('content_copy', 'w-[16px] h-[16px] icon')}
                                                            </button>-->
                                                        </div>
                                                        <p class="text-sm text-slate-600 px-3 dark:text-slate-400 leading-relaxed font-sans mb-4 copy-message">
                                                            ${renderErrorMessages(incident?.error_message, incident?.incidentid)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="p-4 bg-slate-100 dark:bg-[#0a1220] rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-end justify-between gap-4">
                                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
                                                    <!-- Assignee / Handler (Người xử lý) -->
                                                    <div>
                                                        <label class="block text-sm font-mono text-slate-700 dark:text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                                                            ${renderIcon('person', 'w-[22px] h-[22px]')}
                                                            <span>Handler</span>
                                                        </label>
                                                        <input class="w-full bg-white dark:bg-[#060b14] border border-slate-300 dark:border-slate-700 font-sans text-sm px-3 py-2 rounded-lg outline-none focus:border-cyan-300 dark:focus:border-cyan-400 disabled:bg-gray-100" type="text" id="handler-${incident.incidentid}" value="${!incident.uid ? currentUser.employeeCode : incident.uid}" />
                                                    </div>

                                                    <!-- Processing Status (Trạng thái xử lý) -->
                                                    <div>
                                                        <label class="block text-sm font-mono text-slate-700 dark:text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                                                            ${renderIcon('target_check', 'w-[22px] h-[22px]')}
                                                            <span>Status</span>
                                                        </label>
                                                        <select class="w-full bg-white dark:bg-[#060b14] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-sans text-sm px-3 py-2 rounded-lg outline-none focus:border-cyan-300 dark:focus:border-cyan-400" id="status-${incident.incidentid}">
                                                            <option value="Open" ${(incident?.status).includes('OPEN', '') ? 'selected' : ''}>Open</option>
                                                            <option value="Analyzed" ${incident?.status?.toUpperCase() === 'ANALYZED' ? 'selected' : ''}>Analyzed</option>
                                                            <option value="Doing" ${incident?.status?.toUpperCase() === 'DOING' ? 'selected' : ''}>Doing</option>
                                                            <option value="Done" ${incident?.status?.toUpperCase() === 'DONE' ? 'selected' : ''}>Done</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <!-- Confirmation Button (Nút xác nhận) -->
                                                <button class="px-5 py-2 rounded-md bg-emerald-500 dark:bg-emerald-500 hover:bg-emerald-400 dark:hover:bg-emerald-400 text-slate-700 dark:text-[#040810] font-sans font-semibold text-sm transition-all shrink-0 shadow-lg shadow-emerald-200/30 dark:shadow-emerald-500/20 flex items-center justify-center gap-1.5 hover:scale-[1.02]" data-action="confirm-incident" data-incident-id="${incident.incidentid}">
                                                    ${renderIcon('check_circle', 'w-[18px] h-[18px]')}
                                                    <span>Confirm</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                        })
                        .join('')
                }
                </div>
            </div>
    `;
        })
        .join('');

    root.innerHTML = html;
}

async function copyTextToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

async function handleCopy(btn) {
    if (!btn) return;

    const text = btn.closest('.copy-wrapper').querySelector('.copy-message')?.textContent;

    if (!text) return;

    const success = await copyTextToClipboard(text);

    if (!success) return;

    Toast.success(`Copied: ${text.substring(0, 42)}...`, { position: 'bottom-right', duration: 1500 });
    const icon = btn.querySelector('.icon');

    btn.innerHTML = renderIcon('check', 'w-[16px] h-[16px] text-emerald-700 dark:text-emerald-400');
    setTimeout(() => {
        btn.innerHTML = renderIcon('content_copy', ' w-[16px] h-[16px]');
    }, 1800);
}

function handleToggleGroup(btn) {
    const groupId = btn?.dataset?.groupId;
    if (!groupId) return;

    if (appState.expandedGroups.has(groupId)) {
        appState.expandedGroups.delete(groupId);
    } else {
        appState.expandedGroups.add(groupId);
    }

    renderIncidentDirectory(incidentGroupsData_Beta, appState);
}

function handleToggleIncident(btn) {
    const incidentId = btn?.dataset?.incidentId;

    if (!incidentId) return;

    if (appState.expandedIncidents.has(incidentId)) {
        appState.expandedIncidents.delete(incidentId);
    } else {
        appState.expandedIncidents.add(incidentId);
    }
    renderIncidentDirectory(incidentGroupsData_Beta, appState);
}

function handleOpenErrorModal(selector) {
    const errorType = selector?.dataset.errorType;
    if (!errorType) return;

    const modal = document.getElementById('error-modal');
    if (modal) {
        modal.classList.remove('hidden');
        lockScroll();
        handleFilterByCategory(errorType);
    }
}

function handleCloseErrorModal(btnClose) {
    resetModalError();
    const modal = btnClose.closest('#error-modal');
    if (modal) {
        modal.classList.add('hidden');
        unlockScroll();
    }
}

function resetModalError() {
    appState.selectedCategory = '';
    appState.selectedSeverities.length = 0;
    appState.searchQuery = '';
    appState.expandedGroups = new Set();
    appState.expandedIncidents = new Set();
    appState.expandedErrorLists = new Set();
    document.getElementById('category-filter-bar').innerHTML = '';
    document.getElementById('severity-filter-bar').innerHTML = '';
    document.getElementById('incident-search').value = '';
    document.getElementById('accordion-root').innerHTML = '';
}

function handleSwitchStorageSever(tab) {
    const serverKey = tab?.dataset.serverIp;
    if (!serverKey) return;

    const server = storageServers.find(item => item.server_ip === serverKey.replace(/_/g, '.'));
    console.log(server)

    // 1. Update Bootstrap Tabs styling
    const tabButtons = document.querySelectorAll('.storage-server-tab');
    tabButtons.forEach((btn) => {
        btn.setAttribute('aria-selected', 'false');
        btn.className =
            'storage-server-tab flex items-center gap-2 py-2 px-3 text-slate-600 dark:text-slate-400 border-b-2 border-transparent dark:border-transparent transition-all hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 font-medium group';

        const circleBadge = btn.querySelector('.circle-badge');
        circleBadge?.classList.remove('animate-pulse');
    });

    const activeBtn = document.getElementById('tab-btn-' + serverKey);
    if (activeBtn) {
        activeBtn.setAttribute('aria-selected', 'true');
        activeBtn.className =
            'storage-server-tab flex items-center gap-2 py-2 px-3 text-cyan-700 dark:text-cyan-300 border-b-2 border-cyan-300 dark:border-cyan-400 font-semibold transition-all hover:text-slate-900 dark:hover:text-white group';
        const circleBadge = activeBtn.querySelector('.circle-badge');
        circleBadge?.classList.add('animate-pulse');
    }

    // 2. Update Server Info Metadata ribbon
    const nameEl = document.getElementById('storage-active-server-name');
    const ipEl = document.getElementById('storage-active-server-ip');
    const multipathEl = document.getElementById('storage-active-server-multipath');

    if (nameEl) nameEl.innerText = server.server_name;
    if (ipEl) ipEl.innerText = '[' + server.server_ip + ']';
    if (multipathEl) multipathEl.innerText = 'SAN DISK: ' + server.count + ' DISKS';

    // 3. Switch Disk Storage Panes with smooth fade transition
    const panes = document.querySelectorAll('.storage-pane');
    panes.forEach((pane) => {
        pane.classList.add('hidden', 'opacity-0');
        pane.classList.remove('opacity-100');
    });

    const activePane = document.getElementById('pane-' + serverKey);
    if (activePane) {
        activePane.classList.remove('hidden');
        setTimeout(() => {
            activePane.classList.add('opacity-100');
            activePane.classList.remove('opacity-0');
        }, 20);
    }

    //showToast('Switched to storage telemetry of ' + server.server_name + ' (' + server.server_ip + ')', 'info', 1000);
    Toast.info('Switched to storage telemetry of ' + server.server_name + ' (' + server.server_ip + ')', { position: 'bottom-right' })
}

function handleExpandAll() {
    //const groups = incidentGroupsData_Beta.find(item => item.incident_type === appState.selectedCategory)?.groups;
    const groups = incidentGroupsData_Beta;

    groups.forEach((g) => {
        appState.expandedGroups.add(g.incident_group); //mở group
        //g.incidents.forEach((inc) => appState.expandedIncidents.add(inc.incidentid.toString())); // mở incident
    });

    renderIncidentDirectory(incidentGroupsData_Beta, appState);
}

function handleCollapseAll() {
    appState.expandedGroups.clear();
    appState.expandedIncidents.clear();
    renderIncidentDirectory(incidentGroupsData_Beta, appState);
}

// Filtering Handlers
function handleFilterByCategory(catId, isOnline = true) {
    if (catId === null || catId === undefined || catId === '') return;

    appState.selectedCategory = catId;
    if (isOnline) {
        //getIncidentDetailByKpi();
        getIncidentDetailsByCategory();
    } else {
        renderFilterBars();
        renderIncidentDirectory(incidentGroupsData_Beta, appState);
    }
}

function handleFilterBySeverity(sevId) {
    const index = appState.selectedSeverities.indexOf(sevId);

    if (index > -1) {
        appState.selectedSeverities.splice(index, 1)
    } else {
        appState.selectedSeverities.push(sevId);
    }
    //if (appState.selectedSeverity === sevId) {
    //    appState.selectedSeverity = 'all'; // toggle off
    //} else {
    //    appState.selectedSeverity = sevId;
    //}
    renderFilterBars(appState.selectedCategory ? true : false);

    appState.selectedCategory
        ? renderIncidentDetailByCategory(incidentGroupsData_Beta, appState)
        : renderIncidentDirectory(incidentGroupsData_Beta, appState);
}

// Filter by query string
function handleFilterBySearch(query) {
    appState.searchQuery = query;
    appState.selectedCategory
        ? renderIncidentDetailByCategory(incidentGroupsData_Beta, appState)
        : renderIncidentDirectory(incidentGroupsData_Beta, appState);
}


// Reset filter
function handleResetFilters() {
    appState.selectedCategory = DBA_ERRORLOG
    appState.selectedSeverity = 'all';
    appState.searchQuery = '';
    const searchInput = document.getElementById('incident-search');
    if (searchInput) searchInput.value = '';
    renderFilterBars();
    renderIncidentDirectory(incidentGroupsData_Beta, appState);
}

async function handleConfirmIncident(btn) {
    try {
        const incidentId = btn?.dataset?.incidentId;
        if (!incidentId) return;

        const handler = document.getElementById('handler-' + incidentId)?.value?.trim();
        const status = document.getElementById('status-' + incidentId)?.value.trim();

        if (!handler) {
            Toast.error('Handler cannot be empty', { position: 'top-center' });
            return;
        }
        else if (!status) {
            Toast.error('Incident status cannot be empty', { position: 'top-center' });
            return;
        }

        const params = {
            "BU": "MSSQL",
            "Station": "AIQuery",
            "Step": "Update_Incident_Status",
            "InputStr": `\{ "IncidentID": "${incidentId}", "Status": "${status}", "UID": "${handler}"\ } `
        }

        const result = await ApiClient.post('https://QMSAIPortal.quantacn.com/qmhapiportal/api/APIPortal/execute', params);

        if (result.success) {
            Toast.success('Incident status updated successfully.', { position: 'top-center' });
            getKpis();
            getErrorSummary();
            getIncidentDetailByKpi();
        } else {
            Toast.error('Failed to update incident status', { position: 'top-center' });
        }
    } catch (err) {
        console.error(err.message)
    }
}

function handleToggleErrorList(btn) {
    const incidentId = String(btn.dataset.incidentId);

    if (!incidentId) return;

    if (
        appState.expandedErrorLists.has(incidentId)
    ) {
        appState.expandedErrorLists.delete(incidentId);
    } else {
        appState.expandedErrorLists.add(incidentId);
    }

    renderIncidentDirectory(incidentGroupsData_Beta, appState);

    return;
}

function handleKpi(el) {
    const severity = el?.dataset?.severity;
    if (!severity) return;

    appState.selectedSeverities.length = 0;

    if (severity.toLocaleLowerCase() === 'critical_high') {
        appState.selectedSeverities = ['critical', 'high'];
    } else if (severity.toLocaleLowerCase() === 'medium_low') {
        appState.selectedSeverities = ['medium', 'low'];
    }

    const modal = document.getElementById('error-modal');
    if (modal) {
        modal.classList.remove('hidden');
        lockScroll();
        getIncidentDetailByKpi()
    }

}

//function handleShowErrorMessageModal(incident) {
//    console.log(incident)
//    const modal = document.createElement('div');

//    modal.className = `
//        fixed inset-0 z-50
//        flex items-center justify-center
//        bg-black/50
//    `;

//    modal.innerHTML = `
//        <div class="w-[90%] max-w-4xl max-h-[80vh] bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden
//        ">
//            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
//                <h3 class="font-semibold">
//                    Error Message
//                </h3>

//                <button class="text-slate-500 hover:text-red-500" data-action="close-modal">✕</button>
//            </div>

//            <div class="p-4 overflow-auto max-h-[65vh]">
//                <div class="mb-3 text-sm">
//                    <strong>Incident:</strong>
//                    ${StringUtils.escapeHtml(incident.incident_title)}
//                </div>

//                <pre class="whitespace-pre-wrap break-words text-xs leading-6 bg-slate-100 dark:bg-slate-800 rounded-lg p-4 overflow-auto
//                ">${StringUtils.escapeHtml(incident.error_message || '')}</pre>
//            </div>
//        </div>
//    `;


function handleShowErrorMessageModal(incident) {
    const modal = document.createElement('div');

    const incidentTitle = incident?.incident_title || 'N/A';
    const errorMessage = incident?.error_message || 'No error message provided.';
    const actionPlan = incident?.recommendation || 'No action place provided.';
    const rootCause = incident?.rootcause || 'No root cause provided.';

    modal.className = `
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/50
        p-4
    `;

    modal.innerHTML = `
        <div
            class="
                w-full max-w-4xl max-h-[85vh]
                bg-white dark:bg-slate-900
                text-slate-900 dark:text-slate-100
                rounded-xl shadow-xl overflow-hidden
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="error-message-modal-title"
        >
            <div
                class="
                    flex items-center justify-between
                    px-5 py-4
                    border-b border-slate-200 dark:border-slate-700
                "
            >
                <h3
                    id="error-message-modal-title"
                    class="text-lg font-semibold"
                >
                    Incident Details
                </h3>

                <button
                    type="button"
                    class="
                        inline-flex items-center justify-center
                        w-8 h-8 rounded-lg
                        text-slate-500
                        hover:text-red-500
                        hover:bg-slate-100
                        dark:hover:bg-slate-800
                    "
                    data-action="close-modal"
                    aria-label="Close"
                >
                    ✕
                </button>
            </div>

            <div class="p-5 overflow-y-auto max-h-[72vh] space-y-5">
                <section>
                    <h4
                        class="
                            mb-2 text-xs font-semibold uppercase
                            tracking-wide text-slate-500
                            dark:text-slate-400
                        "
                    >
                        Incident
                    </h4>

                    <div
                        class="
                            rounded-lg border
                            border-slate-200 dark:border-slate-700
                            bg-slate-50 dark:bg-slate-800
                            px-4 py-3 text-sm
                        "
                    >
                        ${StringUtils.escapeHtml(incidentTitle)}
                    </div>
                </section>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <section>
                        <h4
                            class="
                                mb-2 text-xs font-semibold uppercase
                                tracking-wide text-slate-500
                                dark:text-slate-400
                            "
                        >
                            Action Plan
                        </h4>

                        <div
                            class="
                                min-h-[100px]
                                whitespace-pre-wrap break-words
                                rounded-lg border
                                border-blue-200 dark:border-blue-900
                                bg-blue-50 dark:bg-blue-950/30
                                px-4 py-3 text-sm
                                text-blue-900 dark:text-blue-200
                            "
                        >${StringUtils.escapeHtml(actionPlan)}</div>
                    </section>

                    <section>
                        <h4
                            class="
                                mb-2 text-xs font-semibold uppercase
                                tracking-wide text-slate-500
                                dark:text-slate-400
                            "
                        >
                            Root Cause
                        </h4>

                        <div
                            class="
                                min-h-[100px]
                                whitespace-pre-wrap break-words
                                rounded-lg border
                                border-amber-200 dark:border-amber-900
                                bg-amber-50 dark:bg-amber-950/30
                                px-4 py-3 text-sm
                                text-amber-900 dark:text-amber-200
                            "
                        >${StringUtils.escapeHtml(rootCause)}</div>
                    </section>
                </div>
                <section>
                    <h4
                        class="
                            mb-2 text-xs font-semibold uppercase
                            tracking-wide text-slate-500
                            dark:text-slate-400
                        "
                    >
                        Error Message
                    </h4>

                    <pre
                        class="
                            whitespace-pre-wrap break-words
                            text-xs leading-6
                            bg-red-50 dark:bg-red-950/30
                            text-red-800 dark:text-red-200
                            border border-red-200 dark:border-red-900
                            rounded-lg p-4 overflow-auto
                        "
                    >${StringUtils.escapeHtml(errorMessage)}</pre>
                </section>
            </div>
        </div>
    `;


    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (
            e.target === modal ||
            e.target.closest('[data-action="close-modal"]')
        ) {
            modal.remove();
        }
    });
}

async function handleClick(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl?.dataset?.action;

    switch (action) {
        case 'kpi-incident-details':
            handleKpi(actionEl);
            break;
        case 'copy':
            await handleCopy(actionEl);
            break;
        case 'toggle-group':
            handleToggleGroup(actionEl);
            break;
        case 'toggle-incident':
            handleToggleIncident(actionEl);
            break;
        case 'open-error-modal':
            handleOpenErrorModal(actionEl);
            break;
        case 'close-error-modal':
            handleCloseErrorModal(actionEl);
            break;
        case 'switch-storage-server':
            handleSwitchStorageSever(actionEl);
            break;
        case 'expand-all':
            handleExpandAll(actionEl);
            break;
        case 'collapse-all':
            handleCollapseAll(actionEl);
            break;
        case 'filter-category':
            var catId = actionEl?.dataset?.categoryId;
            handleFilterByCategory(catId);
            break;
        case 'filter-category-offline':
            var catId = actionEl?.dataset?.categoryId;
            //const isOnline = false;
            handleFilterByCategory(catId);
            break;
        case 'filter-severity':
            const sevId = actionEl?.dataset?.severityId;
            handleFilterBySeverity(sevId);
            break;
        case 'reset-filters':
            handleResetFilters();
            break;
        case 'confirm-incident':
            handleConfirmIncident(actionEl);
            break;
        case 'toggle-error-list':
            handleToggleErrorList(actionEl);
            break;
        case 'show-error-message':
            const incidentId = actionEl.dataset.incidentId;

            const incident = incidentGroupsData_Beta.find(
                x => String(x.incidentid) === incidentId
            );

            if (!incident) return;
            handleShowErrorMessageModal(incident);
            break;
        case 'toggle-error-message':
            const errorKey = actionEl.dataset.errorKey;

            if (
                appState.expandedErrorMessages.has(errorKey)
            ) {
                appState.expandedErrorMessages.delete(errorKey);
            } else {
                appState.expandedErrorMessages.add(errorKey);
            }

            renderIncidentDirectory(incidentGroupsData_Beta, appState);
            break;
        default:
            break;
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const REFRESH_INTERVAL = 12000 * 60 * 1000;
    let isRefreshing = false;

    async function refreshDashboard() {
        if (isRefreshing) {
            return;
        }

        isRefreshing = true;

        try {
            await Promise.allSettled([
                getKpis(),
                getErrorSummary(),
                getAlwaysOnStatus(),
                getLargeTable(),
                getDiskSpace(),
            ]);
        } catch (err) {
            console.error(err.message);
        } finally {
            isRefreshing = false;
        }
    }

    // Gọi ngay lập tức, không cần chờ 5 phút
    refreshDashboard();

    // Lần tiếp theo sẽ được gọi sau 5 phút
    const refreshTimer = setInterval(
        refreshDashboard,
        REFRESH_INTERVAL
    );

    document.getElementById('kpi-container')?.addEventListener('click', handleClick);
    document.getElementById('error-summary')?.addEventListener('click', handleClick);
    document.getElementById('san-server-tabs')?.addEventListener('click', handleClick);
    document.getElementById('error-modal')?.addEventListener('click', handleClick);

    // Search Input Realtime Listener
    const searchInput = document.getElementById('incident-search');
    if (searchInput) {
        const onSearchInput = debounce(
            (event) => handleFilterBySearch(event.target.value),
            SEARCH_DEBOUNCE_MS
        );
        searchInput.addEventListener('input', onSearchInput);
    }

    // Không bắt buộc khi F5, nhưng hữu ích nếu script được hủy thủ công
    window.addEventListener('beforeunload', () => {
        clearInterval(refreshTimer);
    });

    // Keyboard Shortcut Ctrl+K
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    });
});