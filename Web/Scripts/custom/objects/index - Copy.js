import { Popup, ActionLock, ApiClient, renderIcon, NumberUtils } from '../modules/app.js';

//Bengin script 1
const appState = {
    selectedCategory: 'error-logs',
    selectedSeverity: 'all', // "all", "critical", "high", "medium"
    searchQuery: '',
    expandedGroups: new Set([]), // Group 1 expanded by default
    expandedIncidents: new Set([]), // Error 1 expanded by default
};
let serverIpArr = [];
let toastTimeout = null;

// Global UI & Filter State
const filterSummary = {
    categories: [
        //{ id: 'all', label: 'All Categories', count: 0, icon: 'terminal' },
        { id: 'error-logs', label: 'Error Logs', count: 0, icon: 'terminal' },
        { id: 'error-jobs', label: 'Agent Jobs', count: 0, icon: 'schedule' },
        { id: 'database-lock', label: 'Database Lock', count: 0, icon: 'lock_clock' },
        { id: 'backup', label: 'Backup SLA', count: 0, icon: 'cloud_done' },
    ],
    severities: [
        {
            id: 'critical',
            label: 'Critical',
            count: 28,
            dotColor: 'bg-red-400',
            textColor: 'text-red-400',
            activeBg: 'bg-red-500/20 border-red-500/40',
        },
        {
            id: 'high',
            label: 'High',
            count: 22,
            dotColor: 'bg-blue-400',
            textColor: 'text-blue-400',
            activeBg: 'bg-blue-500/20 border-blue-500/40',
        },
        {
            id: 'medium',
            label: 'Medium',
            count: 12,
            dotColor: 'bg-emerald-400',
            textColor: 'text-emerald-400',
            activeBg: 'bg-emerald-500/20 border-emerald-500/40',
        },
    ],
};

//// Lock/Unlock Scroll when modal is toggled
//function lockScroll() {
//    document.body.classList.add('overflow-hidden');
//}

//function unlockScroll() {
//    const sm = document.getElementById('subsystem-modal');
//    const sb = document.getElementById('sidebar-backdrop');
//    const anyOpen = (sm && !sm.classList.contains('hidden')) || (sb && !sb.classList.contains('hidden'));
//    if (!anyOpen) {
//        document.body.classList.remove('overflow-hidden');
//    }
//}

// Toast Notification
function showToast(message, type, duration = 3800) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    const toast = document.createElement('div');
    toast.className =
        'pointer-events-auto px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 ' +
        (type === 'success'
            ? 'bg-[#06201b] text-emerald-300 border border-emerald-500/40 shadow-emerald-950/50'
            : type === 'danger'
                ? 'bg-[#260a12] text-rose-300 border border-rose-500/40 shadow-rose-950/50'
                : 'bg-[#0a172a] text-cyan-300 border border-cyan-500/40 shadow-cyan-950/50');
    //toast.innerHTML =
    //    '<span class="material-symbols-outlined text-base">' +
    //    (type === 'success' ? 'check_circle' : type === 'danger' ? 'error' : 'info') +
    //    '</span><span>' +
    //    message +
    //    '</span>';

    toast.innerHTML =
        (type === 'success' ? renderIcon('check_circle', 'w-[16px] h-[16px]') : type === 'danger' ? renderIcon('error', 'w-[16px] h-[16px]') : renderIcon('info', 'w-[16px] h-[16px]')) +
        '<span>' +
        message +
        '</span>';
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
window.showToast = showToast;

let currentSubsystem = 'error-logs';

function closeSubsystemModal() {
    const modal = document.getElementById('subsystem-modal');
    if (modal) {
        modal.classList.add('hidden');
        unlockScroll();
    }
}
window.closeSubsystemModal = closeSubsystemModal;

function updateErrorSummary(element, count) {
    if (!element) return;

    const title = element.querySelector('.error-title');
    const countEl = element.querySelector('.error-count');
    const badge = element.querySelector('.error-badge');

    if (countEl) countEl.textContent = count;

    const isError = count > 0;

    title?.classList.add(
        isError
            ? 'group-hover:text-rose-400'
            : 'group-hover:text-emerald-400'
    );

    countEl?.classList.add(
        isError
            ? 'text-rose-600'
            : 'text-emerald-600'
    );

    if (badge && isError) {
        badge.innerHTML = renderIcon(
            'error',
            'w-[26px] h-[26px] font-bold animate-[pulse_2s_ease-in-out_infinite] text-rose-600 shrink-0'
        );
    }
}

async function getErrorSummary() {
    let html = '';

    try {
        const params = {
            "BU": "MSSQL",
            "Station": "AIQuery",
            "Step": "Get_Dashboard_Summary",
            "InputStr": `\{"Dept": "${dept}"\}`
        };

        const result = await ApiClient.post('https://QMSAIPortal.quantacn.com/qmhapiportal/api/APIPortal/execute', params);

        const data = JSON.parse(result.data);
        if (!result.success) return;

        if (data && data.length > 0) {
            const errorLogEl = document.getElementById('error-summary-logs');
            const errorJobEl = document.getElementById('error-summary-jobs');
            const errorLockEl = document.getElementById('error-summary-lock');
            const errorBackupEl = document.getElementById('error-summary-backup');

            const typeMap = {
                SP_Error: {
                    categoryId: 'error-logs',
                    elementId: 'error-summary-logs'
                },
                Job_Error: {
                    categoryId: 'error-jobs',
                    elementId: 'error-summary-jobs'
                },
                DBLock_Error: {
                    categoryId: 'database-lock',
                    elementId: 'error-summary-lock'
                },
                DBBackup_Error: {
                    categoryId: 'backup',
                    elementId: 'error-summary-backup'
                }
            };
            const countMap = {};

            data.forEach(item => {
                const config = typeMap[item.type];
                if (!config) return;

                countMap[config.categoryId] = item.error_count || 0;

                if (item?.type === "SP_Error") {
                    updateErrorSummary(errorLogEl, item.error_count || 0);
                } else if (item?.type === "Job_Error") {
                    updateErrorSummary(errorJobEl, item.error_count || 0);
                } else if (item?.type === "DBLock_Error") {
                    updateErrorSummary(errorLockEl, item.error_count || 0);
                } else if (item?.type === "DBBackup_Error") {
                    updateErrorSummary(errorBackupEl, item.error_count || 0);
                }
            });

            //Update arr
            filterSummary.categories.forEach(category => {
                category.count = countMap[category.id] || 0;
            });
        }

    } catch (err) {
        console.log(err.message);
    }
}


function formatConnectedState(state) {
    const value = (state || '').toUpperCase();

    const styles = {
        CONNECTED: 'text-emerald-400',
        DISCONNECTED: 'text-rose-400'
    };

    return `<span class="font-medium ${styles[value] || 'text-yellow-400'}">${state || '-'}</span>`;
}

function formatSyncState(state) {
    const value = (state || '').toUpperCase();

    const styles = {
        SYNCHRONIZED: 'text-emerald-400',
        SYNCHRONIZING: 'text-amber-400',
        'NOT SYNCHRONIZING': 'text-rose-400',
        INITIALIZING: 'text-cyan-400',
        REVERTING: 'text-orange-400'
    };

    return `<span class="font-medium ${styles[value] || 'text-slate-300'}">${state || '-'}</span>`;
}

function formatHealthLevel(health) {
    const value = (health || '').toUpperCase();

    const styles = {
        HEALTHY: 'bg-emerald-500/20 text-emerald-400',
        OK: 'bg-emerald-500/20 text-emerald-400',
        PARTIALLY_HEALTHY: 'bg-amber-500/20 text-amber-400',
        NOT_HEALTHY: 'bg-rose-500/20 text-rose-400',
        CRITICAL: 'bg-rose-500/20 text-rose-400',
        WARNING: 'bg-amber-500/20 text-amber-400',
    };

    return `
        <span class="inline-block px-2 py-0.5 rounded font-bold text-[11px] ${styles[value] || 'bg-slate-500/20 text-slate-300'
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
                    <td class="px-3 py-2.5 whitespace-nowrap font-bold text-white">${item.database_name || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap font-bold text-white">${item.replica_server_name || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-slate-200">${item.replica_role || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap font-medium">${formatConnectedState(item.connected_state)}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap">${formatSyncState(item.synchronization_state)}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-center">${formatHealthLevel(item.health_level)}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-slate-200 text-right">${item.log_send_queue_kb || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-slate-200 text-right">${item.redo_queue_kb || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-slate-200 text-right">${item.logsendrate_kb_persec || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-slate-200 text-right">${item.redorate_kb_persec || ''}</td>
                <tr>
            `;
                }).join('');
            }
            else {
                html = `<tr><td colspan="50">No data to available</td></tr>`;
            }

        } else {
            html = `<tr><td colspan="50" class="px-3 py-2.5 whitespace-nowrap font-bold text-rose-400">${result.message}</td></tr>`;
        }
    } catch (err) {
        html = `<tr><td colspan="50" class="px-3 py-2.5 whitespace-nowrap font-bold text-rose-400">${err.message}</td></tr>`;
    }

    alwaysonBadge.textContent = data && data.length >= 0 ? data.length + ' REPLICAS' : 'REPLICAS';
    document.getElementById('table-alwayson').querySelector('tbody').innerHTML = html;
}


function formatTableRows(rowCount) {
    const value = Number(rowCount) || 0;

    let cssClass = 'text-slate-200';

    if (value >= 10000000) {
        cssClass = 'text-rose-400 font-bold';
    }
    else if (value >= 5000000) {
        cssClass = 'text-amber-400 font-bold';
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
                <span class="inline-block px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold text-[11px]">
                    ${level}
                </span>
            `;

        case 'WARNING':
            return `
                <span class="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[11px]">
                    ${level}
                </span>
            `;

        default:
            return `
                <span class="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
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
                        <td class="px-3 py-2.5 whitespace-nowrap font-bold text-white">${item.database_name || ''}</td>
                        <td class="px-3 py-2.5 whitespace-nowrap font-bold text-white">${item.table_name || ''}</td>
                        <td class="px-3 py-2.5 whitespace-nowrap text-slate-200">${item.database_name || ''}</td>
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
            html = `<tr><td colspan="50" class="px-3 py-2.5 whitespace-nowrap font-bold text-rose-400">${result.message}</td></tr>`;
        }
    } catch (err) {
        html = `<tr><td colspan="50" class="px-3 py-2.5 whitespace-nowrap font-bold text-rose-400">${err.message}</td></tr>`;
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
                                    class="storage-server-tab flex items-center gap-1.5 py-2 px-3 border-b-2 ${isActive ? 'text-cyan-300 border-cyan-400 hover:text-white font-semibold' : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700 font-medium'} transition-all group"
                                    data-action="switch-storage-server"
                                    data-server-ip="${serverIp}"
                                    id="tab-btn-${serverIp}">
                                <span class="w-2 h-2 rounded-full ${hasAlarm ? 'bg-rose-600' : 'bg-emerald-600'} circle-badge ${isActive ? 'animate-pulse' : ''}"></span>
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
                        const hasFreeAlarm = Number(storage?.free_space_percent) <= 30;
                        return `
                            <div class="flex flex-col justify-between bg-[#121c2d] hover:bg-[#18263e] shadow-md p-3.5 rounded-xl transition-all duration-200">
                                <div class="flex flex-col items-center w-full text-center">
                                    <div class="relative mb-2.5 filter">
                                        <img src="./Content/images/hdd_48.png" alt="disk" />
                                    </div>
                                    <!-- Drive Label & Role -->
                                    <span class="font-mono font-bold text-white text-xs tracking-tight">Disk (${storage?.volume_point})</span>
                                    <!-- <span class="mt-0.5 max-w-full font-sans text-[11px] text-slate-400 truncate"
                                        >OS &amp; System Binaries</span
                                    > -->
                                </div>

                                <!-- Capacity Metric & Progress Bar -->
                                <div class="space-y-1.5 mt-3 w-full">
                                    <div class="font-mono text-base text-center">
                                        <span class="font-semibold text-slate-100">${storage?.used_space_gb}</span>
                                        <span class="text-slate-400">/ ${storage?.total_space_gb} GB</span>
                                    </div>
                                    <div class="pt-1 text-center">
                                        <span class="inline-block font-mono ${hasFreeAlarm ? 'font-bold text-rose-600' : 'font-medium text-slate-100'} text-[12px] tracking-wide">${storage?.free_space_percent}% Free</span> (${storage?.free_space_gb} GB)
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
        console.log(err.message);
    }
}

// Core Clipboard Copy with Fallback
async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fall back
        }
    }
    // Fallback method
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        textArea.remove();
        return successful;
    } catch (err) {
        textArea.remove();
        return false;
    }
}

async function handleCopy(btn) {
    const text = btn.closest('.copy-wrapper').querySelector('.copy-message')?.textContent;

    if (!text) return;

    const success = await copyTextToClipboard(text);

    if (!success) return;

    showToast(`Đã sao chép: ${text.substring(0, 42)}...`, 'success');
    const icon = btn.querySelector('.icon');
    if (icon) {
        icon.textContent = 'check';
        icon.classList.add('text-emerald-400');
        setTimeout(() => {
            icon.textContent = 'content_copy';
            icon.classList.remove('text-emerald-400');
        }, 1800);
    }
}

function handleToggleGroup(btn) {
    const groupId = btn?.dataset?.groupId;
    if (!groupId) return;

    if (appState.expandedGroups.has(groupId)) {
        appState.expandedGroups.delete(groupId);
    } else {
        appState.expandedGroups.add(groupId);
    }
    renderIncidentDirectory(incidentGroupsData, appState);
}

function handleToggleIncident(btn) {
    const incidentId = btn?.dataset?.incidentId;

    if (!incidentId) return;

    if (appState.expandedIncidents.has(incidentId)) {
        appState.expandedIncidents.delete(incidentId);
    } else {
        appState.expandedIncidents.add(incidentId);
    }
    renderIncidentDirectory(incidentGroupsData, appState);
}

function handleOpenErrorModal(selector) {
    const errorType = selector?.dataset.errorType;
    if (!errorType) return;

    currentSubsystem = errorType || 'error-logs';

    const modal = document.getElementById('subsystem-modal');
    if (modal) {
        modal.classList.remove('hidden');
        lockScroll();
        filterByCategory(errorType);
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
            'storage-server-tab flex items-center gap-2 py-2 px-3 text-slate-400 border-b-2 border-transparent transition-all hover:text-slate-200 hover:border-slate-700 font-medium group';

        const circleBadge = btn.querySelector('.circle-badge');
        circleBadge.classList.remove('animate-pulse');
    });

    const activeBtn = document.getElementById('tab-btn-' + serverKey);
    if (activeBtn) {
        activeBtn.setAttribute('aria-selected', 'true');
        activeBtn.className =
            'storage-server-tab flex items-center gap-2 py-2 px-3 text-cyan-300 border-b-2 border-cyan-400 font-semibold transition-all hover:text-white group';
        const circleBadge = activeBtn.querySelector('.circle-badge');
        circleBadge.classList.add('animate-pulse');
    }

    // 2. Update Server Info Metadata ribbon
    const nameEl = document.getElementById('storage-active-server-name');
    const ipEl = document.getElementById('storage-active-server-ip');
    // const roleEl = document.getElementById('storage-active-server-role');
    // const statusEl = document.getElementById('storage-active-server-status');
    const multipathEl = document.getElementById('storage-active-server-multipath');

    if (nameEl) nameEl.innerText = server.server_name;
    if (ipEl) ipEl.innerText = '[' + server.server_ip + ']';
    //// if (roleEl) roleEl.innerText = conf.role;
    //// if (statusEl) {
    ////     statusEl.innerText = conf.status;
    ////     statusEl.className = conf.statusClass;
    //// }
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

    showToast('Switched to storage telemetry of ' + server.server_name + ' (' + server.server_ip + ')', 'info', 1000);
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
        case 'switch-storage-server':
            handleSwitchStorageSever(actionEl);
            break;
        default:
            break;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    getErrorSummary();
    getAlwaysOnStatus();
    getLargeTable();
    getDiskSpace();

    document.getElementById('accordion-root').addEventListener('click', handleClick);
    document.getElementById('error-summary').addEventListener('click', handleClick);
    document.getElementById('san-server-tabs').addEventListener('click', handleClick);
});
//End script 1



//Begin script 3
// 1. Comprehensive Mock Data Model
const incidentGroupsData = [
    {
        id: 'grp-1',
        category: 'error-logs',
        title: 'Group 1: Execution & Runtime Failures (Error execute)',
        description: 'Query engine exceptions, deadlock victims, memory grant aborts',
        errorCount: 28,
        criticalCount: 12,
        fleetPercentage: 42.8,
        progressColor: 'bg-rose-500',
        percentageColor: 'text-rose-400',
        criticalBadgeClass: 'bg-red-500/10 text-red-400 border border-red-500/20',
        incidents: [
            {
                id: 'INC-14201',
                title: 'Error 1: Deadlock trên dbo.sp_CalculateFATP_CycleTime',
                severity: 'Critical',
                sevBadge: 'Critical SEV-1',
                sevBadgeClass: 'bg-red-600 text-white font-bold',
                database: 'FATP_Prod',
                spid: '142',
                latency: '42.8s',
                victimThread: '0x7FA91024',
                waitType: 'LCK_M_X',
                status: 'UNRESOLVED',
                statusClass:
                    'bg-slate-800 text-slate-200 font-mono text-[10px] font-semibold border border-slate-700',
                errorMessage: {
                    badge: 'ERROR MESSAGE',
                    code: 'Code 1205',
                    severityState: 'SQL Server Error 1205 (Severity 13, State 51)',
                    details:
                        'Transaction (Process ID 142) was deadlocked on resources with another process and has been chosen as the deadlock victim. Rerun the transaction.',
                    batch: 'EXEC dbo.sp_CalculateFATP_CycleTime @@LotId=9821',
                },
                rootCause: {
                    badge: 'ROOT CAUSE',
                    type: 'Lock Graph Cycle',
                    summary:
                        'Deadlock cycle identified between SPID 142 (dbo.sp_CalculateFATP_CycleTime) holding Exclusive lock (X) on Page 1:49281 in FATP_Prod while requesting Intent Exclusive (IX) lock on index IX_Serial_Timestamp. Concurrently, SPID 89 held an update lock (U) and requested lock conversion, creating an unresolvable cyclic graph.',
                    resourceKey: 'KEY 7:72057594054',
                },
                actionPlan: {
                    badge: 'ACTION PLAN',
                    stepCount: '3 Recommended Steps',
                    steps: [
                        'Reorder index access hierarchy in dbo.sp_CalculateFATP_CycleTime to query IX_Serial_Timestamp prior to acquiring table lock.',
                        'Implement NOLOCK / READPAST hints on read-only aggregations.',
                        'Rebuild index IX_Serial_Timestamp with ONLINE=ON, MAXDOP=4.',
                    ],
                    estimatedRecovery: 'ESTIMATED RECOVERY: 4 MIN',
                },
                assignee: {
                    initials: 'TQ',
                    name: 'Trần Minh Quân',
                    role: 'Tier-1 DBA Lead',
                },
                currentState: 'Under Active Triage',
                stateOptions: [
                    'Under Active Triage',
                    'Assigned to SRE Guild',
                    'Fix Applied (Monitoring)',
                    'Resolved / Closed',
                ],
            },
            {
                id: 'INC-8902',
                title: 'Error 2: Memory Grant Timeout trên usp_Inventory_RealtimeSync',
                severity: 'High',
                sevBadge: 'High SEV-2',
                sevBadgeClass: 'bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30',
                database: 'SMT_Core',
                spid: '89',
                latency: '18.4s',
                victimThread: null,
                extraMeta: 'Grant Wait: 15,200ms',
                waitType: 'RESOURCE_SEMAPHORE',
                status: 'QUEUED',
                statusClass: 'bg-slate-800 text-slate-400 font-mono text-[10px] border border-slate-700',
                errorMessage: {
                    badge: 'ERROR MESSAGE',
                    code: 'Code 8645',
                    severityState: 'SQL Server Error 8645 (Severity 17, State 1)',
                    details:
                        "A timeout occurred while waiting for memory resources to execute the query in resource pool 'default' (18400 ms). Rerun query with OPTION (MAX_GRANT_PERCENT = 10).",
                    batch: 'EXEC dbo.usp_Inventory_RealtimeSync @@BatchLimit=50000',
                },
                rootCause: {
                    badge: 'ROOT CAUSE',
                    type: 'Memory Grater',
                    summary:
                        'SPID #89 requested 14.8 GB workspace memory grant due to cardinal estimation skew in nested hash joins across InventoryAuditLog (1.4B rows without stats update).',
                    resourceKey: 'MEM_WORKSPACE 14812MB',
                },
                actionPlan: {
                    badge: 'ACTION PLAN',
                    stepCount: '2 Recommended Steps',
                    steps: [
                        'Execute UPDATE STATISTICS InventoryAuditLog WITH FULLSCAN.',
                        'Cap Resource Governor workgroup to 25% max memory grant.',
                    ],
                    estimatedRecovery: 'ESTIMATED RECOVERY: 2 MIN',
                },
                assignee: {
                    initials: 'LN',
                    name: 'Lê Nhật Nam',
                    role: 'DBA Performance Eng',
                },
                currentState: 'Assigned to SRE Guild',
                stateOptions: [
                    'Under Active Triage',
                    'Assigned to SRE Guild',
                    'Fix Applied (Monitoring)',
                    'Resolved / Closed',
                ],
            },
            {
                id: 'INC-30403',
                title: 'Error 3: Query Execution Aborted trên dbo.fn_ParticleCounterAggregate',
                severity: 'Medium',
                sevBadge: 'Medium SEV-3',
                sevBadgeClass: 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30',
                database: 'CR_Telemetry',
                spid: '304',
                latency: '30.1s',
                victimThread: null,
                extraMeta: 'Worker Thread Limit: 98%',
                waitType: 'THREADPOOL',
                status: 'STANDBY',
                statusClass: 'bg-slate-800 text-slate-400 font-mono text-[10px] border border-slate-700',
                errorMessage: {
                    badge: 'ERROR MESSAGE',
                    code: 'Code 701',
                    severityState: 'SQL Server Error 701 (Severity 17, State 123)',
                    details:
                        'SQL Server Worker thread pool reached exhaustion limit (512/512 active). Execution abandoned by client gateway with query timeout (CommandTimeout = 30s).',
                    batch: "SELECT * FROM dbo.fn_ParticleCounterAggregate('SN-441')",
                },
                rootCause: {
                    badge: 'ROOT CAUSE',
                    type: 'Thread Starvation',
                    summary:
                        'Worker thread exhaustion caused by non-yielding microservices holding long synchronous telemetry pipelines under sudden surge load.',
                    resourceKey: 'WORKER_POOL max:512',
                },
                actionPlan: {
                    badge: 'ACTION PLAN',
                    stepCount: '2 Recommended Steps',
                    steps: [
                        'Enable read-scale connection routing to offload analytical aggregation workloads.',
                        'Tune maximum worker threads limit or configure connection pool queue threshold.',
                    ],
                    estimatedRecovery: 'ESTIMATED RECOVERY: 6 MIN',
                },
                assignee: {
                    initials: 'HA',
                    name: 'Hoàng Anh',
                    role: 'Site Reliability Eng',
                },
                currentState: 'Under Active Triage',
                stateOptions: [
                    'Under Active Triage',
                    'Assigned to SRE Guild',
                    'Fix Applied (Monitoring)',
                    'Resolved / Closed',
                ],
            },
        ],
    },
    {
        id: 'grp-2',
        category: 'error-jobs',
        title: 'Group 2: Connection & Pool Timeouts (Error Connection)',
        description: 'TCP handshake resets, TLS negotiation timeouts, ephemeral port exhaust',
        errorCount: 14,
        criticalCount: 6,
        fleetPercentage: 22.5,
        progressColor: 'bg-blue-600',
        percentageColor: 'text-blue-400',
        criticalBadgeClass: 'bg-red-500/10 text-red-400 border border-red-500/20',
        incidents: [
            {
                id: 'INC-21044',
                title: 'Sub-Incident: Gateway Proxy Pool Starvation (Socket reset by peer)',
                severity: 'Critical',
                sevBadge: 'Critical SEV-1',
                sevBadgeClass: 'bg-red-600 text-white font-bold',
                database: 'SMT-GW-04',
                spid: '512',
                latency: '15.0s',
                victimThread: null,
                extraMeta: '[TCP:1433] [Max Pool: 500 reached]',
                waitType: 'ASYNC_NETWORK_IO',
                status: 'FAILED',
                statusClass:
                    'bg-red-950 text-red-400 font-mono text-[10px] font-semibold border border-red-800',
                errorMessage: {
                    badge: 'ERROR MESSAGE',
                    code: 'Code 10054',
                    severityState: 'Network Transport Error 10054',
                    details:
                        'An existing connection was forcibly closed by the remote host. Connection pool exhaustion on gateway gateway-proxy-smt-04.',
                    batch: 'TDS Handshake Client IP 10.24.120.4',
                },
                rootCause: {
                    badge: 'ROOT CAUSE',
                    type: 'TCP Socket Leak',
                    summary:
                        'Backend node microservices failed to release connection handles back to HikariCP pool on unhandled HTTP 504 gateway response.',
                    resourceKey: 'PORT_RANGE 49152-65535',
                },
                actionPlan: {
                    badge: 'ACTION PLAN',
                    stepCount: '2 Recommended Steps',
                    steps: [
                        'Purge leaked socket handles via netsh and restart gateway pooling daemon.',
                        'Adjust idle connection eviction timeout down to 10000ms.',
                    ],
                    estimatedRecovery: 'ESTIMATED RECOVERY: 3 MIN',
                },
                assignee: {
                    initials: 'ND',
                    name: 'Nguyễn Dũng',
                    role: 'Network Infra DBA',
                },
                currentState: 'Under Active Triage',
                stateOptions: [
                    'Under Active Triage',
                    'Assigned to SRE Guild',
                    'Fix Applied (Monitoring)',
                    'Resolved / Closed',
                ],
            },
        ],
    },
    {
        id: 'grp-3',
        category: 'database-lock',
        title: 'Group 3: Resource Contention & Locking (Deadlock & Lock)',
        description: 'Schema modification locks (Sch-M), latch contention on tempdb allocation bitmaps',
        errorCount: 12,
        criticalCount: 8,
        fleetPercentage: 19.3,
        progressColor: 'bg-rose-400',
        percentageColor: 'text-rose-400',
        criticalBadgeClass: 'bg-red-500/10 text-red-400 border border-red-500/20',
        incidents: [
            {
                id: 'INC-33201',
                title: 'Sub-Incident: TempDB GAM/SGAM Page Allocation Contention',
                severity: 'High',
                sevBadge: 'High SEV-2',
                sevBadgeClass: 'bg-blue-600 text-white font-bold',
                database: 'TempDB',
                spid: '248',
                latency: '9.2s',
                victimThread: '0x3BF2010A',
                extraMeta: '[Page 2:1:1] [Wait: PAGELATCH_UP 248ms]',
                waitType: 'PAGELATCH_UP',
                status: 'ELEVATED',
                statusClass:
                    'bg-amber-950 text-amber-400 font-mono text-[10px] font-semibold border border-amber-800',
                errorMessage: {
                    badge: 'ERROR MESSAGE',
                    code: 'Code 5028',
                    severityState: 'SQL Server Warning 5028 (Allocation Stall)',
                    details:
                        'Intense latch contention on Page 2:1:1 (Global Allocation Map). High concurrency temp table creations causing PFS/GAM allocation bottlenecks.',
                    batch: 'CREATE TABLE #AuditBatchTemp (Id BIGINT PRIMARY KEY, Val NVARCHAR(128))',
                },
                rootCause: {
                    badge: 'ROOT CAUSE',
                    type: 'Allocation Latch Contention',
                    summary:
                        'Only 4 TempDB data files allocated across 32 logical cores. Multi-threaded batch ingestion continuously colliding on shared GAM tracking pages.',
                    resourceKey: 'PAGE 2:1:1 (GAM)',
                },
                actionPlan: {
                    badge: 'ACTION PLAN',
                    stepCount: '3 Recommended Steps',
                    steps: [
                        'Add 4 additional TempDB secondary data files with equal autogrowth sizing.',
                        'Enable trace flag -T1117 and -T1118 across cluster startup params.',
                        'Refactor stored procedures to utilize memory-optimized table variables where possible.',
                    ],
                    estimatedRecovery: 'ESTIMATED RECOVERY: 5 MIN',
                },
                assignee: {
                    initials: 'VL',
                    name: 'Vũ Long',
                    role: 'Tier-2 DBA Specialist',
                },
                currentState: 'Fix Applied (Monitoring)',
                stateOptions: [
                    'Under Active Triage',
                    'Assigned to SRE Guild',
                    'Fix Applied (Monitoring)',
                    'Resolved / Closed',
                ],
            },
        ],
    },
    {
        id: 'grp-4',
        category: 'backup',
        title: 'Group 4: Storage & Maintenance SLA (Backup & Disk)',
        description: 'Differential backup lag breaches, transaction log write stalls, VLF fragmentation',
        errorCount: 8,
        criticalCount: 2,
        fleetPercentage: 12.9,
        progressColor: 'bg-emerald-500',
        percentageColor: 'text-emerald-400',
        criticalBadgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        incidents: [
            {
                id: 'INC-49110',
                title: 'Sub-Incident: T-Log Truncation Delayed (ACTIVE_TRANSACTION)',
                severity: 'Critical',
                sevBadge: 'Critical SEV-1',
                sevBadgeClass: 'bg-red-600 text-white font-bold',
                database: 'Drive L:\\Log',
                spid: '602',
                latency: '62.4s',
                victimThread: null,
                extraMeta: '[Disk Full Alert 94.2%]',
                waitType: 'WRITELOG',
                status: 'BREACHED',
                statusClass:
                    'bg-red-950 text-red-400 font-mono text-[10px] font-semibold border border-red-800',
                errorMessage: {
                    badge: 'ERROR MESSAGE',
                    code: 'Code 9002',
                    severityState: 'SQL Server Error 9002 (Severity 17, State 2)',
                    details:
                        "The transaction log for database 'FATP_Prod' is full due to 'ACTIVE_TRANSACTION'. Differential backup checkpoint aborted.",
                    batch: "BACKUP LOG [FATP_Prod] TO DISK = N'L:\\LogBackup\\FATP_Prod_Log.trn'",
                },
                rootCause: {
                    badge: 'ROOT CAUSE',
                    type: 'Uncommitted Long Transaction',
                    summary:
                        'Orphaned distributed transaction from unacknowledged SAP ETL batch holding oldest open LSN for 4 hours 12 minutes.',
                    resourceKey: 'LOGSPACE_USED 94.2%',
                },
                actionPlan: {
                    badge: 'ACTION PLAN',
                    stepCount: '2 Recommended Steps',
                    steps: [
                        'Inspect open transaction via DBCC OPENTRAN and terminate hanging SPID #602.',
                        'Run emergency log truncation and initiate immediate incremental backup cycle.',
                    ],
                    estimatedRecovery: 'ESTIMATED RECOVERY: 3 MIN',
                },
                assignee: {
                    initials: 'TQ',
                    name: 'Trần Minh Quân',
                    role: 'Tier-1 DBA Lead',
                },
                currentState: 'Under Active Triage',
                stateOptions: [
                    'Under Active Triage',
                    'Assigned to SRE Guild',
                    'Fix Applied (Monitoring)',
                    'Resolved / Closed',
                ],
            },
        ],
    },
];

// 2. Filter Bar Renders
function renderFilterBars() {
    // Render Category Tabs
    const catContainer = document.getElementById('category-filter-bar');
    if (catContainer) {
        catContainer.innerHTML = filterSummary.categories
            .map((cat) => {
                const isActive = appState.selectedCategory === cat.id;
                const btnClasses = isActive
                    ? 'filter-tab px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-2 bg-blue-600 text-white shadow-sm'
                    : 'filter-tab px-3 py-1.5 rounded-lg text-[12px] transition-all flex items-center gap-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800';
                const badgeClasses = isActive
                    ? 'px-1.5 py-0.5 rounded-full font-mono text-[11px] bg-blue-950 text-blue-200'
                    : 'px-1.5 py-0.5 rounded-full font-mono text-[11px] bg-slate-800 text-slate-300';

                return `
                              <button class="${btnClasses}" onclick="filterByCategory('${cat.id}')" type="button">
                                <span>${cat.label}</span>
                                <span class="${badgeClasses}">${cat.count}</span>
                              </button>
                            `;
            })
            .join('');
    }

    // Render Severity Buttons
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
                        'bg-slate-900 hover:bg-slate-800 ' +
                        (sev.id === 'critical'
                            ? 'text-red-400/80 border-slate-700'
                            : sev.id === 'high'
                                ? 'text-blue-400/80 border-slate-700'
                                : 'text-slate-400 border-slate-700');
                }
                return `
        <button onclick="filterBySeverity('${sev.id}')" class="px-2.5 py-1 rounded font-mono text-[11px] flex items-center gap-1.5 border transition-colors ${btnClass}" type="button">
            <span class="w-1.5 h-1.5 rounded-full ${sev.dotColor}"></span>
            <span>${sev.label}</span>
        </button>
        `;
            })
            .join('');

        sevContainer.innerHTML = `
        <span class="font-mono text-[10px] text-slate-500 uppercase pl-2 font-semibold">Filter Severity:</span>
        ${sevButtons}
        `;
    }
}

// 3. Dynamic 3-Level Accordion Renderer
function renderIncidentDirectory(data, state) {
    const root = document.getElementById('accordion-root');
    if (!root) return;

    // Filter Logic
    const query = state.searchQuery.trim().toLowerCase();

    const filteredGroups = data
        .map((group) => {
            // Category filter check
            if (state.selectedCategory !== 'all' && group.category !== state.selectedCategory) {
                return null;
            }

            // Filter incidents inside group
            const matchingIncidents = group.incidents.filter((inc) => {
                // Severity filter check
                if (
                    state.selectedSeverity !== 'all' &&
                    inc.severity.toLowerCase() !== state.selectedSeverity.toLowerCase()
                ) {
                    return false;
                }

                // Search Query check
                if (query) {
                    const combinedString = `
        ${inc.title} ${inc.id} ${inc.database} ${inc.spid} ${inc.waitType}
        ${inc.errorMessage.code} ${inc.errorMessage.details}
        ${inc.rootCause.summary} ${inc.rootCause.type}
        `.toLowerCase();
                    return combinedString.includes(query);
                }

                return true;
            });

            // If category matches, or there is a query matching group title
            const groupMatchesQuery =
                query &&
                (group.title.toLowerCase().includes(query) ||
                    group.description.toLowerCase().includes(query));

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
                <div class="rounded-xl bg-slate-900/60 border border-slate-800 p-12 text-center flex flex-col items-center justify-center gap-2">
                ${renderIcon('search_off', 'w-[36px] h-[36px] text-slate-500')}
                <div class="text-[15px] font-semibold text-slate-300">No incident diagnostic matches found</div>
                <div class="text-[12px] font-mono text-slate-500">Try adjusting your category tabs, severity filter, or search query.</div>
                <button onclick="resetFilters()" class="mt-3 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-[11px] transition-colors">
                    Reset Filters
                </button>
                </div>
            `;
        return;
    }

    // Generate Accordion HTML
    const html = filteredGroups
        .map((group) => {
            const isGroupExpanded = state.expandedGroups.has(group.id);
            const incidentsToRender = group.filteredIncidents;

            // Group trigger classes
            const arrowIconClass = isGroupExpanded
                ? 'lvl1-icon text-blue-400 w-[22px] h-[22px] text-[22px] transition-transform duration-200 rotate-90'
                : 'lvl1-icon text-slate-500 w-[22px] h-[22px] text-[22px] transition-transform duration-200';

            return `
        <!-- ================= LEVEL 1: GROUP ================= -->
        <div class="lvl1-card rounded-xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden" data-group-id="${group.id}" data-category="${group.category}">
            <!-- Level 1 Trigger Header -->
            <button aria-expanded="${isGroupExpanded}" data-group-id="${group.id}" data-action="toggle-group" class="lvl1-trigger w-full px-4 py-3.5 bg-slate-900/90 flex flex-wrap md:flex-nowrap items-center   justify-between gap-3 text-left hover:bg-slate-800/80 transition-colors focus:outline-none" type="button">
                <div class="flex items-center gap-3 min-w-0">
                    ${renderIcon('expand_circle_right', arrowIconClass)}
                    <div class="flex flex-col min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-[15px] font-semibold text-slate-100 truncate">${group.title}</span>
                            <span class="px-2 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider ${group.criticalBadgeClass}">${group.criticalCount} CRITICAL</span>
                        </div>
                        <!--<span class="font-mono text-[12px] text-slate-400 truncate">${group.description}</span>-->
                    </div>
                </div>
                <div class="flex items-center gap-4 shrink-0">
                    <!--<div class="hidden sm:flex flex-col items-end">
                        <div class="flex items-center gap-1.5">
                            <span class="font-mono text-[12px] text-slate-200 font-semibold">${group.errorCount} Total Errors</span>
                            <span class="font-mono text-[12px] ${group.percentageColor} font-semibold">(${group.fleetPercentage}% fleet)</span>
                        </div>
                        <div class="w-32 bg-slate-950 h-1.5 rounded-full mt-1 overflow-hidden border border-slate-800">
                            <div class="${group.progressColor} h-full rounded-full" style="width: ${group.fleetPercentage}%;"></div>
                        </div>
                    </div>-->
                    <span class="px-2.5 py-1 rounded bg-slate-950 ${isGroupExpanded ? 'text-blue-400 font-bold' : 'text-slate-400 font-medium'} font-mono text-[12px] border border-slate-800">
                        ${incidentsToRender.length} Incidents
                    </span>
                </div>
            </button>

            <!-- Level 1 Content Body -->
            <div class="lvl1-content p-3.5 space-y-3 bg-slate-950/60 ${isGroupExpanded ? '' : 'hidden'}">
                ${incidentsToRender.length === 0
                    ? `
                        <div class="p-4 text-center font-mono text-[12px] text-slate-500">
                            No incidents match severity '${state.selectedSeverity}' in this group.
                        </div>
                        `
                    : incidentsToRender
                        .map((incident) => {
                            const isIncidentExpanded = state.expandedIncidents.has(incident.id);
                            const lvl2IconClass = isIncidentExpanded
                                ? 'lvl2-icon text-emerald-400 w-[20px] h-[20px] text-[20px] transition-transform duration-200 rotate-90'
                                : 'lvl2-icon text-slate-500 w-[20px] h-[20px] text-[20px] transition-transform duration-200';

                            return `
                                <!-- ---------- LEVEL 2: INCIDENT ROW ---------- -->
                                <div class="lvl2-card rounded-lg bg-slate-900 border border-slate-800 shadow-sm overflow-hidden" data-incident-id="${incident.id}">
                                    <button aria-expanded="${isIncidentExpanded}" data-incident-id="${incident.id}" data-action="toggle-incident" class="lvl2-trigger w-full px-4 py-3 bg-slate-900 hover:bg-slate-800/80 transition-colors flex flex-wrap md:flex-nowrap items-center justify-between gap-3 text-left focus:outline-none" type="button">
                                        <div class="flex items-center gap-2.5 min-w-0">
                                            ${renderIcon('arrow_right', lvl2IconClass)}
                                            <div class="flex flex-col min-w-0">
                                                <div class="flex items-center gap-2 flex-wrap">
                                                    <span class="text-[14px] font-medium text-slate-100">${incident.title}</span>
                                                    <span class="px-2 py-0.5 rounded font-mono text-[10px] uppercase ${incident.sevBadgeClass}">${incident.sevBadge}</span>
                                                </div>
                                                <div class="flex items-center gap-2 text-slate-500 font-mono text-[11px] mt-0.5 flex-wrap">
                                                    <span class="text-blue-400 font-medium">DB: [${incident.database}]</span>
                                                    <span>•</span>
                                                    <span>[SPID #${incident.spid}]</span>
                                                    <span>•</span>
                                                    <span class="text-rose-400 font-semibold">Latency: ${incident.latency}</span>
                                                    ${incident.victimThread ? `<span>•</span><span>Victim thread: ${incident.victimThread}</span>` : ''}
                                                    ${incident.extraMeta ? `<span>•</span><span>${incident.extraMeta}</span>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2.5 shrink-0">
                                            <span class="px-2 py-0.5 rounded ${incident.statusClass}">${incident.status}</span>
                                        </div>
                                    </button>

                                    <!-- LEVEL 3 DIAGNOSTIC COCKPIT DETAILS -->
                                    <div class="lvl2-content p-4 space-y-3 bg-slate-950/80 border-t border-slate-800 ${isIncidentExpanded ? '' : 'hidden'}">
                                        <div class="grid grid-cols-1 gap-4">
                                            <!-- Error Message/Root Cause -->
                                            <div class="p-3.5 bg-[#0d1626] rounded-xl border border-rose-500/20 shadow-sm">
                                                <div class="copy-wrapper group/line">
                                                    <div class="flex items-center justify-between gap-2 text-rose-400 mb-1.5">
                                                        <div class="flex items-center gap-2">
                                                            ${renderIcon('error', 'w-[22px] h-[22px]')}
                                                            <span class="font-mono text-sm font-bold uppercase tracking-wider">Error Message</span>
                                                        </div>
                                                        <button class="copy-btn opacity-0 group-hover/line:opacity-100 text-slate-400 hover:cursor-pointer transition-opacity px-3" data-action="copy">
                                                            ${renderIcon('content_copy', 'w-[16px] h-[16px] icon')}
                                                        </button>
                                                    </div>
                                                    <p class="text-sm text-slate-400 leading-relaxed font-sans mb-4 copy-message">
                                                        ${incident.errorMessage.details}
                                                    </p>
                                                </div>
                                                <div class="copy-wrapper group/line">
                                                    <div class="flex items-center justify-between gap-2 text-rose-400 mb-1.5">
                                                        <div class="flex items-center gap-2">
                                                            ${renderIcon('report_problem', 'w-[22px] h-[22px]')}
                                                            <span class="font-mono text-sm font-bold uppercase tracking-wider">Root Cause</span>
                                                        </div>
                                                        <button class="copy-btn opacity-0 group-hover/line:opacity-100 text-slate-400 hover:cursor-pointer transition-opacity px-3 py-1" data-action="copy">
                                                            ${renderIcon('content_copy', 'w-[16px] h-[16px] icon')}
                                                        </button>
                                                    </div>
                                                    <p class="text-sm text-slate-200 leading-relaxed font-sans copy-message">${(incident.rootCause.summary)}</p>
                                                </div>
                                                <div class="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                                                    <span>Auto-generated root cause</span>
                                                </div>
                                            </div>

                                            <!-- Proposed Action Plan (Giải pháp đề xuất) -->
                                            <div class="p-3.5 bg-[#0d1626] rounded-xl border border-emerald-500/20 shadow-sm">
                                                <div class="flex items-center gap-2 text-emerald-400 mb-1.5">
                                                    ${renderIcon('lightbulb', 'w-[22px] h-[22px]')}
                                                    <span class="font-mono text-sm font-bold uppercase tracking-wider">Action Plan</span>
                                                </div>
                                                <p class="text-sm text-slate-200 leading-relaxed font-sans">
                                                        ${incident.actionPlan.steps
                                    .map(
                                        (st, sidx) => `
                                                            <div class="flex items-start gap-1.5">
                                                                <span class="text-emerald-400 font-bold font-mono">${sidx + 1}.</span>
                                                                <span>${(st)}</span>
                                                            </div>
                                                            `,
                                    )
                                    .join('')}
                                                </p>
                                                <div class="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                                                    <span>Automated remediation available</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="p-4 bg-[#0a1220] rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-end justify-between gap-4">
                                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
                                                <!-- Assignee / Handler (Người xử lý) -->
                                                <div>
                                                    <label class="block text-sm font-mono text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                                                        ${renderIcon('person', 'w-[22px] h-[22px]')}
                                                        <span>Handler</span>
                                                    </label>
                                                    <select class="w-full bg-[#060b14] border border-slate-700 font-sans text-sm px-3 py-2 rounded-lg outline-none focus:border-cyan-400" id="assignee-${incident.id}">
                                                        <option value=""></option>
                                                        <option value="Trần Minh Quân">Trần Minh Quân</option>
                                                        <option value="Nguyễn Văn Hưng">Nguyễn Văn Hưng</option>
                                                        <option value="Lê Hoàng Long">Lê Hoàng Long</option>
                                                        <option value="Phạm Đức Thắng">Phạm Đức Thắng</option>
                                                    </select>
                                                </div>

                                                <!-- Processing Status (Trạng thái xử lý) -->
                                                <div>
                                                    <label class="block text-sm font-mono text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                                                        ${renderIcon('sync_saved_locally', 'w-[22px] h-[22px]')}
                                                        <span>Status</span>
                                                    </label>
                                                    <select class="w-full bg-[#060b14] border border-slate-700 text-white font-sans text-sm px-3 py-2 rounded-lg outline-none focus:border-cyan-400" id="status-${incident.id}">
                                                        <option value=""></option>
                                                        <option value="Investigating">Investigating</option>
                                                        <option value="In Progress">In Progress</option>
                                                        <option value="Resolved">Resolved</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <!-- Confirmation Button (Nút xác nhận) -->
                                            <button class="px-5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#040810] font-sans font-bold text-sm transition-all shrink-0 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 hover:scale-[1.02]" onclick="submitIncidentUpdate('${incident.id}', ${incident.id})">
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
            d;
        })
        .join('');

    root.innerHTML = html;
}

//// 4. Utility Text Formatters
//function escapeAttr(str) {
//    if (!str) return '';
//    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
//}

//function formatRootCauseSummary(text) {
//    return text
//        .replace(/SPID (\d+)/g, '<strong class="text-slate-100 font-mono">SPID $1</strong>')
//        .replace(/\(dbo\.[\w_]+\)/g, '<code class="text-blue-400 font-mono">$&</code>')
//        .replace(/\(X\)/g, '<strong class="text-rose-400 font-mono">(X)</strong>')
//        .replace(/\(IX\)/g, '<strong class="text-rose-400 font-mono">(IX)</strong>')
//        .replace(/\(U\)/g, '<strong class="text-rose-400 font-mono">(U)</strong>')
//        .replace(
//            /(FATP_Prod|SMT_Core|CR_Telemetry|TempDB)/g,
//            '<span class="text-slate-100 font-semibold">$1</span>',
//        )
//        .replace(/(IX_\w+)/g, '<code class="text-blue-400 font-mono">$1</code>');
//}

//function formatCodeWords(text) {
//    return text.replace(
//        /(sp_CalculateFATP_CycleTime|IX_Serial_Timestamp|NOLOCK|READPAST|ONLINE=ON|MAXDOP=4|UPDATE STATISTICS|InventoryAuditLog|WITH FULLSCAN|-T1117|-T1118|DBCC OPENTRAN)/g,
//        '<code class="text-blue-400 font-mono">$1</code>',
//    );
//}

// 5. Accordion State Controllers


function expandAll() {
    incidentGroupsData.forEach((g) => {
        appState.expandedGroups.add(g.id);
        g.incidents.forEach((inc) => appState.expandedIncidents.add(inc.id));
    });
    renderIncidentDirectory(incidentGroupsData, appState);
}
window.expandAll = expandAll;

function collapseAll() {
    appState.expandedGroups.clear();
    appState.expandedIncidents.clear();
    renderIncidentDirectory(incidentGroupsData, appState);
}
window.collapseAll = collapseAll;

// 6. Filtering Handlers
function filterByCategory(catId) {
    appState.selectedCategory = catId;
    renderFilterBars();
    renderIncidentDirectory(incidentGroupsData, appState);
}
window.filterByCategory = filterByCategory;

function filterBySeverity(sevId) {
    if (appState.selectedSeverity === sevId) {
        appState.selectedSeverity = 'all'; // toggle off
    } else {
        appState.selectedSeverity = sevId;
    }
    renderFilterBars();
    renderIncidentDirectory(incidentGroupsData, appState);
}
window.filterBySeverity = filterBySeverity

function filterBySearch(query) {
    appState.searchQuery = query;
    renderIncidentDirectory(incidentGroupsData, appState);
}
window.filterBySearch = filterBySearch;

function resetFilters() {
    appState.selectedCategory = 'all';
    appState.selectedSeverity = 'all';
    appState.searchQuery = '';
    const searchInput = document.getElementById('incident-search');
    if (searchInput) searchInput.value = '';
    renderFilterBars();
    renderIncidentDirectory(incidentGroupsData, appState);
}
window.resetFilters = resetFilters;

// 8. Initialization and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Render Filter Bar
    renderFilterBars();

    // Initial Accordion Render from Mock
    //  Data
    renderIncidentDirectory(incidentGroupsData, appState);

    // Search Input Realtime Listener
    const searchInput = document.getElementById('incident-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterBySearch(e.target.value);
        });
    }

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
//End script 3
