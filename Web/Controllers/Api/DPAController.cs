using Application.Features.DPA.ServerInfo;
using System.Threading.Tasks;
using System.Web.Http;

namespace Web.Controllers.Api
{
    //[Authorize]
    [RoutePrefix("api/dpa")]

    public class DpaController : BaseApiController
    {
        private readonly DpaService _dpaService;

        public DpaController()
        {
            _dpaService = new DpaService();
        }

        [HttpGet]
        [Route("options/database/{databaseId}")]
        public async Task<IHttpActionResult> GetOptionsDatabaseById(int databaseId)
        {
            if (databaseId < 0)
            {
                return Fail("databaseId must be greater than 0.");
            }

            var result = await _dpaService.GetOptionsDatabaseByIdAsync(databaseId);
            return Success(result, "Get database option successfully");
        }

        [HttpGet]
        [Route("options/system")]
        public async Task<IHttpActionResult> GetOptionsSystem()
        {
            var result = await _dpaService.GetOptionsSystemAsync();
            return Success(result, "Get system option successfully");
        }

        [HttpGet]
        [Route("alerts/templates")]
        public async Task<IHttpActionResult> GetAlertsTemplates()
        {
            var result = await _dpaService.GetAlertsTemplatesAsync();
            return Success(result, "Get alerts templates successfully");
        }

        [HttpGet]
        [Route("alerts/templates/{templateId}")]
        public async Task<IHttpActionResult> GetAlertsTemplates(int templateId)
        {
            var result = await _dpaService.GetAlertsTemplatesByIdAsync(templateId);
            return Success(result, "Get alerts template successfully");
        }

        [HttpGet]
        [Route("alert-groups")]
        public async Task<IHttpActionResult> GetAlertGroups()
        {
            var result = await _dpaService.GetAlertGroupsAsync();
            return Success(result, "Get alert groups successfully");
        }

        [HttpGet]
        [Route("alert-groups/{alertGroupId}")]
        public async Task<IHttpActionResult> GetAlertGroupsById(int alertGroupId)
        {
            var result = await _dpaService.GetAlertGroupsByIdAsync(alertGroupId);
            return Success(result, "Get alert group successfully");
        }

        [HttpGet]
        [Route("databases/{databaseId}/alert-groups")]
        public async Task<IHttpActionResult> GetAlertGroupsByDatabaseId(int databaseId)
        {
            if (databaseId <= 0)
            {
                return Fail("databaseId must be greater than 0.");
            }

            var result = await _dpaService.GetAlertGroupsByDatabaseIdAsync(databaseId);
            return Success(result, "Get alert groups of database successfully");
        }

        [HttpGet]
        [Route("alerts")]
        public async Task<IHttpActionResult> GetAlerts()
        {
            var result = await _dpaService.GetAlertsAsync();
            return Success(result, "Get alerts successfully");
        }

        [HttpGet]
        [Route("alerts/statuses")]
        public async Task<IHttpActionResult> GetALertsStatuses()
        {
            var result = await _dpaService.GetAlertsStatusesAsync();
            return Success(result, "Get alerts statuses successfully");
        }

        [HttpGet]
        [Route("alerts/{alertId}")]
        public async Task<IHttpActionResult> GetAlertsById(int alertId)
        {
            var result = await _dpaService.GetAlertsByIdAsync(alertId);
            return Success(result, "Get alert successfully");
        }

        [HttpGet]
        [Route("alerts/{alertId}/databases/{databaseId}/status")]
        public async Task<IHttpActionResult> GetAlertsById(
            int alertId, 
            int databaseId)
        {
            var result = await _dpaService.GetAlertsByIdByDatabaseIdAsync(
                alertId, 
                databaseId);
            return Success(result, "Get Status of specified alert.");
        }

        [HttpGet]
        [Route("databases/{databaseId}/alerts")]
        public async Task<IHttpActionResult> GetAlertsByDatabaseId(int databaseId)
        {
            var result = await _dpaService.GetAlertsByDatabaseIdAsync(databaseId);
            return Success(result, "Get alerts of database successfully");
        }

        [HttpGet]
        [Route("databases/{databaseId}/annotations")]
        public async Task<IHttpActionResult> GetAnnotations(
            int databaseId, 
            string startTime,
            string endTime)
        {
            var result = await _dpaService.GetAnnotationsAsync(
                databaseId, 
                startTime, 
                endTime);
            return Success(result, "Get alerts successfully");
        }


        [HttpGet]
        [Route("contacts")]
        public async Task<IHttpActionResult> GetContacts()
        {
            var result = await _dpaService.GetContactsAsync();
            return Success(result, "Get contacts successfully");
        }

        [HttpGet]
        [Route("contacts/groups")]
        public async Task<IHttpActionResult> GetContactsGroups()
        {
            var result = await _dpaService.GetContactsGroupsAsync();
            return Success(result, "Get contacts groups successfully");
        }

        [HttpGet]
        [Route("contacts/{contactid}")]
        public async Task<IHttpActionResult> GetContactsById(int contactId)
        {
            var result = await _dpaService.GetContactsByIdAsync(contactId);
            return Success(result, "Get contacts successfully");
        }

        [HttpGet]
        [Route("server-info")]
        public async Task<IHttpActionResult> GetServerInfo()
        {
            var result = await _dpaService.GetServerInfoAsync();
            return Success(result, "Get server information successfully");
        }

        [HttpGet]
        [Route("databases/monitor-information")]
        public async Task<IHttpActionResult> GetDatabaseMonitorInfo()
        {
            var result = await _dpaService.GetDatabaseMonitorInfoAsync();
            return Success(result, "Get database monitor information successfully");
        }

        [HttpGet]
        [Route("databases/{databaseId}/monitor-information")]
        public async Task<IHttpActionResult> GetDatabaseMonitorInfoByDatabaseId(int databaseId)
        {
            var result = await _dpaService.GetDatabaseMonitorInfoByDatabaseIdAsync(databaseId);
            return Success(result, "Get database monitor information by database ID successfully");
        }

        [HttpGet]
        [Route("encryption")]
        public async Task<IHttpActionResult> GetEncryption()
        {
            var result = await _dpaService.GetEncryptionAsync();
            return Success(result, "Get encryption information successfully");
        }

        [HttpGet]
        [Route("databases/licenses/installed")]
        public async Task<IHttpActionResult> GetDatbaseLicensesInstalled()
        {
            var result = await _dpaService.GetDatbaseLicensesInstalledAsync();
            return Success(result, "Get database licenses installed successfully");
        }

        [HttpGet]
        [Route("databases/{databaseId}/licenses")]
        public async Task<IHttpActionResult> GetDatabaseLicensesById(int databaseId)
        {
            var result = await _dpaService.GetDatabaseLicensesByIdAsync(databaseId);
            return Success(result, "Get database licenses by ID successfully");
        }

        [HttpGet]
        [Route("vsphere/monitor-information")]
        public async Task<IHttpActionResult> GetVSphereMonitorInfo()
        {
            var result = await _dpaService.GetVSphereMonitorInfoAsync();
            return Success(result, "Get vSphere monitor information successfully");
        }
    }
}