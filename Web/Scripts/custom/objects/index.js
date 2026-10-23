import { Popup, Toast, ActionLock, ApiClient, renderIcon, NumberUtils } from '../modules/app.js';

const
    DBA_ERRORLOG = 'dba_errorlog',
    DBA_JOB_ERRORLOG = 'dba_job_errorlog',
    DBA_DBLOCK_LOG = 'dba_dblock_log',
    DBA_DBBACKUP_LOG = 'dba_dbbackup_log';

const appState = {
    selectedCategory: DBA_ERRORLOG,
    selectedSeverity: 'all', // "all", "critical", "high", "medium"
    searchQuery: '',
    expandedGroups: new Set([]), // Group 1 expanded by default
    expandedIncidents: new Set([]), // Error 1 expanded by default
};
let serverIpArr = [];
let toastTimeout = null

// Global UI & Filter State
const filterSummary = {
    categories: [
        //{ id: 'all', label: 'All Categories', count: 0, icon: 'terminal' },
        { id: DBA_ERRORLOG, label: 'Error Logs', count: 0, icon: 'terminal' },
        { id: DBA_JOB_ERRORLOG, label: 'Agent Jobs', count: 0, icon: 'schedule' },
        { id: DBA_DBLOCK_LOG, label: 'Database Lock', count: 0, icon: 'lock_clock' },
        { id: DBA_DBBACKUP_LOG, label: 'Backup SLA', count: 0, icon: 'cloud_done' },

    ],
    severities: [
        {
            id: 'critical',
            label: 'Critical',
            count: 0,
            dotColor: 'bg-red-400 dark:bg-red-400',
            textColor: 'text-red-700 dark:text-red-400',
            activeBg: 'bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500/40',
        },
        {
            id: 'high',
            label: 'High',
            count: 0,
            dotColor: 'bg-rose-400 dark:bg-rose-400',
            textColor: 'text-rose-700 dark:text-rose-400',
            activeBg: 'bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/40',
        },
        {
            id: 'medium',
            label: 'Medium',
            count: 0,
            dotColor: 'bg-amber-400 dark:bg-amber-400',
            textColor: 'text-amber-700 dark:text-amber-400',
            activeBg: 'bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40',
        },
        {
            id: 'low',
            label: 'Low',
            count: 0,
            dotColor: 'bg-gray-400 dark:bg-gray-400',
            textColor: 'text-gray-700 dark:text-gray-400',
            activeBg: 'bg-gray-100 dark:bg-gray-500/20 border-gray-300 dark:border-gray-500/40',
        },
    ],
};

// Toast Notification
function showToast(message, type, duration = 3800) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    const toast = document.createElement('div');
    toast.className =
        'pointer-events-auto px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 ' +
        (type === 'success'
            ? 'bg-emerald-50 dark:bg-[#06201b] text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 shadow-emerald-200/30 dark:shadow-emerald-950/50'
            : type === 'danger'
                ? 'bg-rose-50 dark:bg-[#260a12] text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 shadow-rose-200/30 dark:shadow-rose-950/50'
                : 'bg-sky-50 dark:bg-[#0a172a] text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 shadow-cyan-200/30 dark:shadow-cyan-950/50');

    toast.innerHTML =
        (type === 'success'
            ? renderIcon('check_circle', 'w-[16px] h-[16px]')
            : type === 'danger' ? renderIcon('error', 'w-[16px] h-[16px]') : renderIcon('info', 'w-[16px] h-[16px]')
        ) +
        `<span>${message}</span>`;

    container.appendChild(toast);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}


async function getKpis() {
    try {
        const params = {
            "BU": "MSSQL",
            "Station": "AIQuery",
            "Step": "Get_Dashboard_Summary",
            "InputStr": `\{"Dept": "${dept}"\}`
        };

        const result = await ApiClient.post('https://QMSAIPortal.quantacn.com/qmhapiportal/api/APIPortal/execute', params);

        if (!result.success) return;

        let data = JSON.parse(result.data);
        if (data && data.length > 0) {

            data = data.reduce((acc, item) => {
                const { department, incident_type, incident_count } = item;
                if (!acc[department]) {
                    acc[department] = {};
                }

                acc[department][incident_type] = incident_count;
                return acc;
            }, {});


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



            // KPI của department đang chọn
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
        }
    } catch (err) {
        console.error(err.message);
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
    let html = '';

    try {
        const params = {
            "BU": "MSSQL",
            "Station": "AIQuery",
            "Step": "Get_Incident_Summary",
            "InputStr": `\{"Dept": "${dept}"\}`
        };

        const result = await ApiClient.post('https://QMSAIPortal.quantacn.com/qmhapiportal/api/APIPortal/execute', params);
        //const result = await ApiClient.get('/Content/tempdata/summary.json');

        const data = JSON.parse(result.data);
        //console.log(data)

        if (!result.success) return;

        if (data && data.length > 0) {
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

            //Update arr
            filterSummary.categories.forEach(category => {
                category.count = countMap[category.id] || 0;
            });
        }

    } catch (err) {
        console.error(err.message);
    }
}


function formatConnectedState(state) {
    const value = (state || '').toUpperCase();

    const styles = {
        CONNECTED: 'text-emerald-700 dark:text-emerald-400',
        DISCONNECTED: 'text-rose-700 dark:text-rose-400'
    };

    return `<span class="font-medium ${styles[value] || 'text-yellow-700 dark:text-yellow-400'}">${state || '-'}</span>`;
}

function formatSyncState(state) {
    const value = (state || '').toUpperCase();

    const styles = {
        SYNCHRONIZED: 'text-emerald-700 dark:text-emerald-400',
        SYNCHRONIZING: 'text-amber-700 dark:text-amber-400',
        'NOT SYNCHRONIZING': 'text-rose-700 dark:text-rose-400',
        INITIALIZING: 'text-cyan-700 dark:text-cyan-400',
        REVERTING: 'text-orange-700 dark:text-orange-400'
    };

    return `<span class="font-medium ${styles[value] || 'text-slate-700 dark:text-slate-300'}">${state || '-'}</span>`;
}

function formatHealthLevel(health) {
    const value = (health || '').toUpperCase();

    const styles = {
        HEALTHY: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        OK: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        PARTIALLY_HEALTHY: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
        NOT_HEALTHY: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
        CRITICAL: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
        WARNING: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
    };

    return `
        <span class="inline-block px-2 py-0.5 rounded font-bold text-[11px] ${styles[value] || 'bg-slate-200/20 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300'
        }">
            ${health || '-'}
        </span>
    `;
}

async function getAlwaysOnStatus() {
    let html = '';
    const alwaysonBadge = document.getElementById('alwayson-badge');

    try {
        const params = {
            "BU": "MSSQL",
            "Station": "AIQuery",
            "Step": "Get_AlwaysOn_Status",
            "InputStr": `\{"Dept": "${dept}"\}`
        };

        const result = await ApiClient.post('https://QMSAIPortal.quantacn.com/qmhapiportal/api/APIPortal/execute', params);

        var data = JSON.parse(result.data);

        if (result.success) {
            if (data && data.length > 0) {
                html = data.map(item => {
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
            }
            else {
                html = `<tr><td colspan="50">No data to available</td></tr>`;
            }

        } else {
            html = `<tr><td colspan="50" class="px-3 py-2.5 whitespace-nowrap font-bold text-rose-700 dark:text-rose-400">${result.message}</td></tr>`;
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
    const tableLargeBadge = document.getElementById('table-large-badge');
    const totalTablesCapacity = document.getElementById('total-tables-capacity');

    try {
        const params = {
            "BU": "MSSQL",
            "Station": "AIQuery",
            "Step": "Get_LargeTable_Status",
            "InputStr": `\{"Dept": "${dept}"\}`
        }
        const result = await ApiClient.post('https://QMSAIPortal.quantacn.com/qmhapiportal/api/APIPortal/execute', params);

        var data = JSON.parse(result.data);

        if (result.success) {
            if (data && data.length > 0) {
                html = data.map(item => {
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
            }
            else {
                html = `<tr><td colspan="50">No data to available</td></tr>`;
            }
        } else {
            html = `<tr><td colspan="50" class="px-3 py-2.5 whitespace-nowrap font-bold text-rose-700 dark:text-rose-400">${result.message}</td></tr>`;
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
        const params = {
            "BU": "MSSQL",
            "Station": "AIQuery",
            "Step": "Get_DiskSpace_Status",
            "InputStr": `\{"Dept": "${dept}"\}`
        }

        const result = await ApiClient.post('https://QMSAIPortal.quantacn.com/qmhapiportal/api/APIPortal/execute', params);

        var data = JSON.parse(result.data);
        if (result.success) {
            if (data && data.length > 0) {
                //const serverIpArr = [...new Map(data.map(item => [`${item?.server_ip}_${item?.server_name}`, { server_ip: item.server_ip, server_name: item.server_name }])).values()];
                serverIpArr = Object.values(
                    data.reduce((acc, item) => {
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

                if (nameEl) nameEl.textContent = serverIpArr[0].server_name;
                if (ipEl) ipEl.textContent = '[' + serverIpArr[0].server_ip + ']';
                if (multipathEl) multipathEl.textContent = 'SAN DISK: ' + serverIpArr[0].count + ' DISKS';


                const serverTabs = document.getElementById('san-server-tabs');
                const htmlSeverTabs = serverIpArr.map((server, idx) => {
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
                serverTabs.innerHTML = htmlSeverTabs;


                const dataServer = data.reduce((acc, item) => {
                    if (!acc[item.server_ip]) {
                        acc[item.server_ip] = [];
                    }

                    acc[item.server_ip].push(item);
                    return acc;
                }, {});

                const storageTabs = document.getElementById('storage-tab-panes');
                let htmlStorageTabs = '';
                serverIpArr.forEach((server, idx) => {
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
            }
        }
    } catch (err) {
        console.error(err.message);
    }
}

let incidentGroupsData_Beta = [];
let severityData_Beta = [];

async function getIncidentDetailByCategory() {
    try {
        const params = {
            "BU": "MSSQL",
            "Station": "AIQuery",
            "Step": "Get_Incident_Detail",
            "InputStr": `\{"Dept": "${dept}"\}`
        }

        const result = await ApiClient.post('https://QMSAIPortal.quantacn.com/qmhapiportal/api/APIPortal/execute', params);
        //const result = await ApiClient.get('/Content/tempdata/errors.json');

        if (!result.success) return;

        const data = JSON.parse(result.data);
        //console.log(data);
        if (data) {

            //Severity filterbar
            severityData_Beta = (data.Incident_Summary || []).reduce((acc, item) => {
                let group = acc.find(x => x.incident_type === item.incident_type);

                if (!group) {
                    group = {
                        incident_type: item.incident_type,
                        severities: {
                            critical: 0,
                            high: 0,
                            medium: 0,
                            low: 0
                        }
                    };
                    acc.push(group);
                }

                group.severities[item.incident_level.toLowerCase()] = item.incident_count;

                return acc;
            }, []);
            //console.log(severityData_Beta);


            //Incident details
            incidentGroupsData_Beta = Object.values(
                (data.Incident_Detail || []).reduce((acc, item) => {
                    const { incident_type, incident_group, incident_level } = item;

                    acc[incident_type] ??= {
                        incident_type,
                        groups: {}
                    };

                    acc[incident_type].groups[incident_group] ??= {
                        incident_group,
                        critical: 0,
                        high: 0,
                        medium: 0,
                        low: 0,
                        incidents: []
                    };

                    const group = acc[incident_type].groups[incident_group];

                    if (incident_level.toLowerCase() === 'critical') group.high++;
                    if (incident_level.toLowerCase() === 'high') group.high++;
                    if (incident_level.toLowerCase() === 'medium') group.medium++;
                    if (incident_level.toLowerCase() === 'low') group.low++;

                    group.incidents.push(item);

                    return acc;
                }, {})
            ).map(type => ({
                ...type,
                groups: Object.values(type.groups)
            }));

            //console.log(incidentGroupsData_Beta);

            renderFilterBars();
            renderIncidentDirectory(incidentGroupsData_Beta, appState);
        }

    } catch (err) {
        console.error(err.message);
    }
}

// 2. Filter Bar Renders
function renderFilterBars() {
    // Render Category Tabs
    const catContainer = document.getElementById('category-filter-bar');
    if (catContainer) {
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
                    <span class="${badgeClasses}">${cat.count}</span>
                    </button>
                `;
            })
            .join('');
    }

    // Render Severity Buttons
    const allSeveritySummary = severityData_Beta.find(item => item.incident_type === appState.selectedCategory);
    filterSummary.severities = filterSummary.severities.map(severity => ({
        ...severity,
        count: allSeveritySummary?.severities?.[severity.id] ?? 0
    }));

    const sevContainer = document.getElementById('severity-filter-bar');
    if (sevContainer) {
        const sevButtons = filterSummary.severities
            .map((sev) => {
                const isSelected = appState.selectedSeverity === sev.id;
                let btnClass = '';
                if (isSelected) {
                    btnClass = `${sev.activeBg} ${sev.textColor} font-semibold`;
                } else {
                    btnClass =
                        'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 ' +
                        (sev.id === 'critical'
                            ? 'text-red-700 dark:text-red-400/80 border-slate-300 dark:border-slate-700'
                            : sev.id === 'high'
                                ? 'text-rose-700 dark:text-rose-400/80 border-slate-300 dark:border-slate-700'
                                : sev.id === 'medium'
                                    ? 'text-amber-600 dark:text-amber-400 border-slate-300 dark:border-slate-700'
                                    : 'text-gray-600 dark:text-gray-400 border-slate-300 dark:border-slate-700');
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

        sevContainer.innerHTML = `
        <span class="font-mono text-[10px] text-slate-600 dark:text-slate-500 uppercase font-semibold">Filter Severity:</span>
        ${sevButtons}
        `;
    }
}
// 3. Dynamic 3-Level Accordion Renderer

function renderSeverityClass(sev) {
    sev = sev?.toLowerCase();

    if (sev.includes('critical')) {
        return `bg-red-600 dark:bg-red-600 text-white dark:text-white font-bold`;
    } else if (sev.includes('high')) {
        return `bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold border border-rose-300 dark:border-rose-500/30`;
    } else if (sev.includes('medium')) {
        return `bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-300 dark:border-amber-500/30`;
    } else if (sev.includes('low')) {
        return `bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 font-bold border border-gray-300 dark:border-gray-500/30`;
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
        return `bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 font-mono text-[10px] font-mono border border-cyan-300 dark:border-cyan-800`;
    } else if (status.includes('done')) {
        return `bg-emeral-100 dark:bg-emeral-500/20 text-emeral-700 dark:text-emeral-400 font-bold border border-emeral-300 dark:border-emeral-500/30`;
    }

    return '';
}

function renderStatusRadio(incidentId, value, currentStatus) {
    const statusConfig = {
        Open: {
            icon: 'radio_button_unchecked',
            selectedClass: `
                peer-checked:border-slate-500
                peer-checked:bg-slate-100
                peer-checked:text-slate-900
                peer-checked:ring-2
                peer-checked:ring-slate-200
                dark:peer-checked:border-slate-400
                dark:peer-checked:bg-slate-700
                dark:peer-checked:text-white
                dark:peer-checked:ring-slate-700
            `
        },

        Analyze: {
            icon: 'search',
            selectedClass: `
                peer-checked:border-amber-500
                peer-checked:bg-amber-50
                peer-checked:text-amber-800
                peer-checked:ring-2
                peer-checked:ring-amber-100
                dark:peer-checked:border-amber-400
                dark:peer-checked:bg-amber-500/15
                dark:peer-checked:text-amber-300
                dark:peer-checked:ring-amber-500/20
            `
        },

        Doing: {
            icon: 'sync',
            selectedClass: `
                peer-checked:border-blue-500
                peer-checked:bg-blue-50
                peer-checked:text-blue-800
                peer-checked:ring-2
                peer-checked:ring-blue-100
                dark:peer-checked:border-blue-400
                dark:peer-checked:bg-blue-500/15
                dark:peer-checked:text-blue-300
                dark:peer-checked:ring-blue-500/20
            `
        },

        Done: {
            icon: 'check_circle',
            selectedClass: `
                peer-checked:border-emerald-500
                peer-checked:bg-emerald-50
                peer-checked:text-emerald-800
                peer-checked:ring-2
                peer-checked:ring-emerald-100
                dark:peer-checked:border-emerald-400
                dark:peer-checked:bg-emerald-500/15
                dark:peer-checked:text-emerald-300
                dark:peer-checked:ring-emerald-500/20
            `
        }
    };

    const config = statusConfig[value];

    const normalizedCurrentStatus = currentStatus
        ?.toString()
        .trim()
        .toLowerCase();

    const normalizedValue = value.toLowerCase();

    const isChecked =
        normalizedValue === 'open'
            ? normalizedCurrentStatus?.includes('open', '')
            : normalizedCurrentStatus === normalizedValue;

    return `
        <label class="relative block cursor-pointer select-none">
            <input
                type="radio"
                name="status-${incidentId}"
                value="${value}"
                data-field="status"
                class="peer sr-only"
                ${isChecked ? 'checked' : ''}
            />

            <span
                class="
                    px-3 py-2
                    flex items-center justify-center gap-1.5
                    rounded-lg
                    border border-slate-300
                    dark:border-slate-700
                    bg-white
                    dark:bg-[#060b14]
                    text-slate-600
                    dark:text-slate-400
                    font-sans text-sm font-medium
                    transition-all duration-200
                    hover:border-slate-400
                    hover:bg-slate-50
                    dark:hover:bg-slate-800
                    peer-focus-visible:ring-2
                    peer-focus-visible:ring-cyan-500
                    peer-focus-visible:ring-offset-2
                    ${config.selectedClass}
                "
            >
                ${renderIcon(
        config.icon,
        'w-[17px] h-[17px]'
    )}

                <span>${value}</span>
            </span>
        </label>
    `;
}

function renderIncidentDirectory(data, state) {
    const root = document.getElementById('accordion-root');
    if (!root) return;

    data = data.find(item => item.incident_type === state.selectedCategory)?.groups || [];

    // Filter Logic
    const query = state.searchQuery.trim().toLowerCase();

    const filteredGroups = data
        .map((group) => {
            //// Category filter check
            //if (state.selectedCategory !== 'all' && group.category !== state.selectedCategory) {
            //    return null;
            //}

            // Filter incidents inside group
            const matchingIncidents = group.incidents.filter((inc) => {
                // Severity filter check
                if (
                    state.selectedSeverity !== 'all' &&
                    inc.incident_level.toLowerCase() !== state.selectedSeverity.toLowerCase()
                ) {
                    return false;
                }

                // Search Query check
                if (query) {
                    const combinedString = `
                         ${inc.incidentid} ${inc.incident_title} ${inc.status} ${inc.system_name} ${inc.server_ip}
                         ${inc.error_message} ${inc.rootcause} ${inc.recommendation}
                        `.toLowerCase();
                    return combinedString.includes(query);
                }

                return true;
            });

            // If category matches, or there is a query matching group title
            const groupMatchesQuery =
                query &&
                (group.incident_group.toLowerCase().includes(query));

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
                <button data-action="reset-filters" class="mt-3 px-3 py-1.5 rounded bg-blue-600 dark:bg-blue-600 hover:bg-blue-500 dark:hover:bg-blue-500 text-white dark:text-white font-mono text-[11px] transition-colors">
                    Reset Filters
                </button>
                </div>
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
                                <span class="px-2 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/20">${(Number(group?.high) + Number(group?.critical)) || 0} CRITICAL/HIGH</span>
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
                                No incidents match severity '${state.selectedSeverity}' in this group.
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
                                                        <span class="text-blue-700 dark:text-blue-400 font-medium">Server IP: [${incident?.server_ip}]</span>
                                                        <span>•</span>
                                                        <span>[INDCIDENT ID: ${incident?.incidentid}]</span>
                                                        <span>•</span>
                                                        <span class="text-rose-700 dark:text-rose-400 font-semibold">System Name: ${incident?.system_name}</span>
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
                                                <!-- Error Message/Root Cause -->
                                                <div class="p-3.5 bg-white dark:bg-[#0d1626] rounded-xl border border-rose-300 dark:border-rose-500/20 shadow-sm">
                                                    <div class="copy-wrapper group/line">
                                                        <div class="flex items-center justify-between gap-2 text-rose-700 dark:text-rose-400 mb-1.5">
                                                            <div class="flex items-center gap-2">
                                                                ${renderIcon('error', 'w-[22px] h-[22px]')}
                                                                <span class="font-mono text-xs font-bold uppercase tracking-wider">Error Message</span>
                                                            </div>
                                                            <button class="copy-btn opacity-0 group-hover/line:opacity-100 text-slate-600 dark:text-slate-400 hover:cursor-pointer transition-opacity px-3" data-action="copy">
                                                                ${renderIcon('content_copy', 'w-[16px] h-[16px] icon')}
                                                            </button>
                                                        </div>
                                                        <p class="text-sm text-slate-600 px-3 dark:text-slate-400 leading-relaxed font-sans mb-4 copy-message">
                                                            ${incident?.error_message?.replace(/\n/g, '<br>')}
                                                        </p>
                                                    </div>
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

                                                <!-- Proposed Action Plan (Giải pháp đề xuất) -->
                                                <div class="p-3.5 bg-white dark:bg-[#0d1626] rounded-xl border border-emerald-300 dark:border-emerald-500/20 shadow-sm">
                                                    <div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-1.5">
                                                        ${renderIcon('lightbulb', 'w-[22px] h-[22px]')}
                                                        <span class="font-mono text-xs font-bold uppercase tracking-wider">Action Plan</span>
                                                    </div>
                                                    <p class="text-sm text-slate-700 px-3 dark:text-slate-200 leading-relaxed font-sans">
                                                            ${incident?.recommendation?.replace(/\n/g, '<br>')}
                                                    </p>
                                                    <div class="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                                        <span>Automated remediation available</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="p-4 bg-slate-50 dark:bg-[#0a1220] rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-end justify-between gap-4">
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
                                                            ${renderIcon('sync_saved_locally', 'w-[22px] h-[22px]')}
                                                            <span>Status</span>
                                                        </label>
                                                        <select class="w-full bg-white dark:bg-[#060b14] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-sans text-sm px-3 py-2 rounded-lg outline-none focus:border-cyan-300 dark:focus:border-cyan-400" id="status-${incident.incidentid}">
                                                            <option value="Open" ${incident?.status?.includes('Open', '') ? 'selected' : ''}>Open</option>
                                                            <option value="Analyze" ${incident?.status === 'Analyze' ? 'selected' : ''}>Analyze</option>
                                                            <option value="Doing" ${incident?.status === 'Doing' ? 'selected' : ''}>Doing</option>
                                                            <option value="Done" ${incident?.status === 'Done' ? 'selected' : ''}>Done</option>
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

    //appState.selectedCategory = errorType || 'error-logs';

    const modal = document.getElementById('error-modal');
    if (modal) {
        modal.classList.remove('hidden');
        lockScroll();
        handleFilterByCategory(errorType);
    }
}

function handleCloseErrorModal(btnClose) {
    const modal = btnClose.closest('#error-modal');
    if (modal) {
        modal.classList.add('hidden');
        unlockScroll();
    }
}

function handleSwitchStorageSever(tab) {
    const serverKey = tab?.dataset.serverIp;

    if (!serverKey) return;

    const server = serverIpArr.find(item => item.server_ip === serverKey.replace(/_/g, '.'));

    // 1. Update Bootstrap Tabs styling
    const tabButtons = document.querySelectorAll('.storage-server-tab');
    tabButtons.forEach((btn) => {
        btn.setAttribute('aria-selected', 'false');
        btn.className =
            'storage-server-tab flex items-center gap-2 py-2 px-3 text-slate-600 dark:text-slate-400 border-b-2 border-transparent dark:border-transparent transition-all hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 font-medium group';

        const circleBadge = btn.querySelector('.circle-badge');
        circleBadge.classList.remove('animate-pulse');
    });

    const activeBtn = document.getElementById('tab-btn-' + serverKey);
    if (activeBtn) {
        activeBtn.setAttribute('aria-selected', 'true');
        activeBtn.className =
            'storage-server-tab flex items-center gap-2 py-2 px-3 text-cyan-700 dark:text-cyan-300 border-b-2 border-cyan-300 dark:border-cyan-400 font-semibold transition-all hover:text-slate-900 dark:hover:text-white group';
        const circleBadge = activeBtn.querySelector('.circle-badge');
        circleBadge.classList.add('animate-pulse');
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
    Toast.info('Switched to storage telemetry of ' + server.server_name + ' (' + server.server_ip + ')', { position: 'bottom-right'})
}

function handleExpandAll() {
    const groups = incidentGroupsData_Beta.find(item => item.incident_type === appState.selectedCategory)?.groups;

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
        getIncidentDetailByCategory();
    } else {
        renderFilterBars();
        renderIncidentDirectory(incidentGroupsData_Beta, appState);
    }
}

function handleFilterBySeverity(sevId) {
    if (appState.selectedSeverity === sevId) {
        appState.selectedSeverity = 'all'; // toggle off
    } else {
        appState.selectedSeverity = sevId;
    }
    renderFilterBars();
    renderIncidentDirectory(incidentGroupsData_Beta, appState);
}

// Filter by query string
function handlefilterBySearch(query) {
    appState.searchQuery = query;
    renderIncidentDirectory(incidentGroupsData_Beta, appState);
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

        if (!handler) showToast('Handler cannot be empty', 'error');
        else if (!status) showToast('Incident status acnnot be empty', 'error');

        const params = {
            "BU": "MSSQL",
            "Station": "AIQuery",
            "Step": "Update_Incident_Status",
            "InputStr": `\{"IncidentID": "${incidentId}", "Status": "${status}", "UID": "${handler}"\}`
        }

        const result = await ApiClient.post('https://QMSAIPortal.quantacn.com/qmhapiportal/api/APIPortal/execute', params);

        if (result.success) {
            Toast.success('Incident status updated successfully.', { position: 'top-center' });
            getKpis();
            getErrorSummary();
            getIncidentDetailByCategory();
        } else {
            Toast.error('Failed to update incident status', { position: 'top-center' });
        }
    } catch (err) {
        console.error(err.message)
    }
}

async function handleClick(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl?.dataset?.action;

    switch (action) {
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
            const isOnline = false;
            handleFilterByCategory(catId, isOnline);
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
        default:
            break;
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const REFRESH_INTERVAL = 120 * 60 * 1000;
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

    document.getElementById('error-summary').addEventListener('click', handleClick);
    document.getElementById('san-server-tabs').addEventListener('click', handleClick);
    document.getElementById('error-modal').addEventListener('click', handleClick);

    // Search Input Realtime Listener
    const searchInput = document.getElementById('incident-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            handlefilterBySearch(e.target.value);
        });
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