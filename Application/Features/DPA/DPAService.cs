using Application.Features.DPA.DpaAuth;
using Domain;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Features.DPA.ServerInfo
{
    public class DPAService
    {
        private readonly DPApiClient _dpaApiClient;

        public DPAService()
        {
            _dpaApiClient = new DPApiClient();
        }

        public async Task<DpaOptionsSystem> GetOptionsSystemAsync()
        {
            var result = await _dpaApiClient.GetAsync<DpaOptionsSystem>("options/system");
            return result;
        }

        public async Task<DpaOptionsSystem> GetOptionsDatabaseByIdAsync(int databaseId)
        {
            var result = await _dpaApiClient.GetAsync<DpaOptionsSystem>($"options/databases/{databaseId}");
            return result;
        }

        public async Task<List<DpaAlertsTemplates>> GetAlertsTemplatesAsync()
        {
            var result = await _dpaApiClient.GetAsync<List<DpaAlertsTemplates>>("alerts/templates");
            return result;
        }

        public async Task<DpaAlertsTemplates> GetAlertsTemplatesByIdAsync(int templateId)
        {
            var result = await _dpaApiClient.GetAsync<DpaAlertsTemplates>($"alerts/templates/{templateId}");
            return result;
        }

        public async Task<List<DpaAlertGroups>> GetAlertGroupsAsync()
        {
            var result = await _dpaApiClient.GetAsync<List<DpaAlertGroups>>("alert-groups");
            return result;
        }

        public async Task<DpaAlertGroups> GetAlertGroupsByIdAsync(int alertGroupId)
        {
            var result = await _dpaApiClient.GetAsync<DpaAlertGroups>($"alert-groups/{alertGroupId}");
            return result;
        }

        public async Task<List<DpaAlertGroups>> GetAlertGroupsByDatabaseIdAsync(int databaseId)
        {
            var result = await _dpaApiClient.GetAsync<List<DpaAlertGroups>>($"databases/{databaseId}/alert-groups");
            return result;
        }

        public async Task<List<DpaAlerts>> GetAlertsAsync()
        {
            var result = await _dpaApiClient.GetAsync<List<DpaAlerts>>("alerts");
            return result;
        }

        public async Task<List<DpaAlertsStatuses>> GetAlertsStatusesAsync()
        {
            var result = await _dpaApiClient.GetAsync<List<DpaAlertsStatuses>>("alerts/statuses");
            return result;
        }

        public async Task<DpaAlerts> GetAlertsByIdAsync(int alertId)
        {
            var result = await _dpaApiClient.GetAsync<DpaAlerts>($"alerts/{alertId}");
            return result;
        }

        public async Task<string> GetAlertsByIdByDatabaseIdAsync(int alertId, int databaseId)
        {
            var result = await _dpaApiClient.GetAsync<string>($"alerts/{alertId}/databases/{databaseId}/status");
            return result;
        }

        public async Task<List<DpaAlerts>> GetAlertsByDatabaseIdAsync(int databaseId)
        {
            var result = await _dpaApiClient.GetAsync<List<DpaAlerts>>($"databases/{databaseId}/alerts");
            return result;
        }

        public async Task<List<DpaAnnotations>> GetAnnotationsAsync(int databaseId, string startTime, string endTime)
        {
            var result = await _dpaApiClient.GetAsync<List<DpaAnnotations>>($"databases/{databaseId}/annotations?endTime={Uri.EscapeDataString(endTime)}&startTime={Uri.EscapeDataString(startTime)}");
            return result;
        }

        public async Task<List<DpaContacts>> GetContactsAsync()
        {
            var result = await _dpaApiClient.GetAsync<List<DpaContacts>>("contacts");
            return result;
        }

        public async Task<List<DpaContactsGroups>> GetContactsGroupsAsync()
        {
            var result = await _dpaApiClient.GetAsync<List<DpaContactsGroups>>("contacts/groups");
            return result;
        }

        public async Task<List<DpaContacts>> GetContactsByIdAsync(int contactId)
        {
            var result = await _dpaApiClient.GetAsync<List<DpaContacts>>($"contacts/{contactId}");
            return result;
        }

        public async Task<DpaServerInfo> GetServerInfoAsync()
        {
            var result = await _dpaApiClient.GetAsync<DpaServerInfo>("server-info");
            return result;
        }

        public async Task<List<DpaDatabaseMonitorInfo>> GetDatabaseMonitorInfoAsync()
        {
            var result = await _dpaApiClient.GetAsync<List<DpaDatabaseMonitorInfo>>("databases/monitor-information");
            return result;
        }

        public async Task<DpaDatabaseMonitorInfo> GetDatabaseMonitorInfoByDatabaseIdAsync(int databaseId)
        {
            var result = await _dpaApiClient.GetAsync<DpaDatabaseMonitorInfo>($"databases/{databaseId}/monitor-information");
            return result;
        }

        public async Task<DpaEncryption> GetEncryptionAsync()
        {
            var result = await _dpaApiClient.GetAsync<DpaEncryption>("encryption");
            return result;
        }

        public async Task<List<DpaLicensesInstalled>> GetDatbaseLicensesInstalledAsync()
        {
            var result = await _dpaApiClient.GetAsync<List<DpaLicensesInstalled>>("databases/licenses/installed");
            return result;
        }

        public async Task<DpaLicenses> GetDatbaseLicensesByIdAsync(int databaseId)
        {
            var result = await _dpaApiClient.GetAsync<DpaLicenses>($"databases/{databaseId}/licenses");
            return result;
        }

        public async Task<List<DpaVSphereMonitorInfo>> GetVSphereMonitorInfoAsync()
        {
            var result = await _dpaApiClient.GetAsync<List<DpaVSphereMonitorInfo>>("vsphere/monitor-information");
            return result;
        }
    }
}
