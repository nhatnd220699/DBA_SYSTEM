using Application.Features.DPA.DpaAuth;
using Domain;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Features.DPA.ServerInfo
{
    public class DpaService
    {
        private readonly DpaClient _dpaApiClient;

        public DpaService()
        {
            _dpaApiClient = new DpaClient();
        }

        public async Task<DpaOptionsSystem> GetOptionsSystemAsync()
        {
            return await _dpaApiClient.GetAsync<DpaOptionsSystem>("options/system");
        }

        public async Task<DpaOptionsDatabase> GetOptionsDatabaseByIdAsync(int databaseId)
        {
            return await _dpaApiClient.GetAsync<DpaOptionsDatabase>($"options/databases/{databaseId}");
        }

        public async Task<List<DpaAlertsTemplates>> GetAlertsTemplatesAsync()
        {
            return await _dpaApiClient.GetAsync<List<DpaAlertsTemplates>>("alerts/templates");
        }

        public async Task<DpaAlertsTemplates> GetAlertsTemplatesByIdAsync(int templateId)
        {
            return await _dpaApiClient.GetAsync<DpaAlertsTemplates>($"alerts/templates/{templateId}");
        }

        public async Task<List<DpaAlertGroups>> GetAlertGroupsAsync()
        {
            return await _dpaApiClient.GetAsync<List<DpaAlertGroups>>("alert-groups");
        }

        public async Task<DpaAlertGroups> GetAlertGroupsByIdAsync(int alertGroupId)
        {
            return await _dpaApiClient.GetAsync<DpaAlertGroups>($"alert-groups/{alertGroupId}");
        }

        public async Task<List<DpaAlertGroups>> GetAlertGroupsByDatabaseIdAsync(int databaseId)
        {
            return await _dpaApiClient.GetAsync<List<DpaAlertGroups>>($"databases/{databaseId}/alert-groups");
        }

        public async Task<List<DpaAlerts>> GetAlertsAsync()
        {
            return await _dpaApiClient.GetAsync<List<DpaAlerts>>("alerts");
        }

        public async Task<List<DpaAlertsStatuses>> GetAlertsStatusesAsync()
        {
            return await _dpaApiClient.GetAsync<List<DpaAlertsStatuses>>("alerts/statuses");
        }

        public async Task<DpaAlerts> GetAlertsByIdAsync(int alertId)
        {
            return await _dpaApiClient.GetAsync<DpaAlerts>($"alerts/{alertId}");
        }

        public async Task<string> GetAlertsByIdByDatabaseIdAsync(int alertId, int databaseId)
        {
            return await _dpaApiClient.GetAsync<string>($"alerts/{alertId}/databases/{databaseId}/status");
        }

        public async Task<List<DpaAlerts>> GetAlertsByDatabaseIdAsync(int databaseId)
        {
            return await _dpaApiClient.GetAsync<List<DpaAlerts>>($"databases/{databaseId}/alerts");
        }

        public async Task<List<DpaAnnotations>> GetAnnotationsAsync(int databaseId, string startTime, string endTime)
        {
            return await _dpaApiClient.GetAsync<List<DpaAnnotations>>($"databases/{databaseId}/annotations?endTime={Uri.EscapeDataString(endTime)}&startTime={Uri.EscapeDataString(startTime)}");
        }

        public async Task<List<DpaContacts>> GetContactsAsync()
        {
            return await _dpaApiClient.GetAsync<List<DpaContacts>>("contacts");
        }

        public async Task<List<DpaContactsGroups>> GetContactsGroupsAsync()
        {
            return await _dpaApiClient.GetAsync<List<DpaContactsGroups>>("contacts/groups");
        }

        public async Task<List<DpaContacts>> GetContactsByIdAsync(int contactId)
        {
            return await _dpaApiClient.GetAsync<List<DpaContacts>>($"contacts/{contactId}");
        }

        public async Task<DpaServerInfo> GetServerInfoAsync()
        {
            return await _dpaApiClient.GetAsync<DpaServerInfo>("server-info");
        }

        public async Task<List<DpaDatabaseMonitorInfo>> GetDatabaseMonitorInfoAsync()
        {
            return await _dpaApiClient.GetAsync<List<DpaDatabaseMonitorInfo>>("databases/monitor-information");
        }

        public async Task<DpaDatabaseMonitorInfo> GetDatabaseMonitorInfoByDatabaseIdAsync(int databaseId)
        {
            return await _dpaApiClient.GetAsync<DpaDatabaseMonitorInfo>($"databases/{databaseId}/monitor-information");
        }

        public async Task<DpaEncryption> GetEncryptionAsync()
        {
            return await _dpaApiClient.GetAsync<DpaEncryption>("encryption");
        }

        public async Task<List<DpaLicensesInstalled>> GetDatbaseLicensesInstalledAsync()
        {
            return await _dpaApiClient.GetAsync<List<DpaLicensesInstalled>>("databases/licenses/installed");
        }

        public async Task<DpaLicenses> GetDatabaseLicensesByIdAsync(int databaseId)
        {
            return await _dpaApiClient.GetAsync<DpaLicenses>($"databases/{databaseId}/licenses");
        }

        public async Task<List<DpaVSphereMonitorInfo>> GetVSphereMonitorInfoAsync()
        {
            return await _dpaApiClient.GetAsync<List<DpaVSphereMonitorInfo>>("vsphere/monitor-information");
        }
    }
}
