using Application.Feature.Dashboard;
using Domain;
using Infrastructure.Database;
using Infrastructure.Repository;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Net;
using System.Threading.Tasks;
using System.Web.Http;
using Web.Models;

namespace Web.Controllers.Api
{
    [Authorize]
    [RoutePrefix("api/dba")]
    public class DbaController : ApiController
    {
        private readonly DashboardService _service;

        // Web API co the tao Controller bang constructor nay.
        public DbaController() : this(CreateDashboardService())
        {
        }

        public DbaController(DashboardService service)
        {
            if (service == null)
            {
                throw new ArgumentNullException(nameof(service));
            }

            _service = service;
        }

        private static DashboardService CreateDashboardService()
        {
            const string connectionName = "DbaPostgres";

            var connectionString = ConfigurationManager.ConnectionStrings[connectionName]?.ConnectionString;

            if (string.IsNullOrWhiteSpace(connectionString) || connectionString.IndexOf("CHANGE_ME", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                throw new ConfigurationErrorsException($"The \"{connectionName}\" connection has not been configured in Web.config");
            }

            // Factory nay tao NpgsqlConnection: ket noi PostgreSQL.
            var factory = new PostgreSqlConnectionFactory(connectionString);

            var repository = new DashboardRepository(factory);

            return new DashboardService(repository);
        }

        private PostgreSqlDashboardRepository CreatePgRepository()
        {
            var settings = ConfigurationManager.ConnectionStrings["DbaPostgres"];
            var connectionString = settings == null ? null : settings.ConnectionString;

            if (String.IsNullOrWhiteSpace(connectionString) ||
                connectionString.IndexOf("CHANGE_ME", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                throw new InvalidOperationException(
                    "Chua cau hinh ket noi DbaPostgres trong Web.config.");
            }

            return new PostgreSqlDashboardRepository(
                new PostgreSqlConnectionFactory(connectionString));
        }

        [HttpGet]
        [Route("test-pg-connection")]
        public async Task<IHttpActionResult> TestPgConnection()
        {
            try
            {
                var status = await CreatePgRepository().TestConnectionAsync();
                return Ok(new
                {
                    success = true,
                    message = "PostgreSQL connected (SELECT 1 OK)",
                    data = status
                });
            }
            catch (Exception ex)
            {
                return PgError(ex);
            }
        }

        // Optional query filters: ?site=QMH&department=FATP
        // Without filters, APIs return data for all site/department values.
        [HttpGet]
        [Route("alwayson")]
        public async Task<IHttpActionResult> AlwaysOn(
            string site = null, string department = null)
        {
            try
            {
                var rows = await CreatePgRepository().GetAlwaysOnAsync(site, department);
                return Ok(new { success = true, data = rows });
            }
            catch (Exception ex)
            {
                return PgError(ex);
            }
        }

        [HttpGet]
        [Route("alwayson2")]
        public async Task<IHttpActionResult> GetAlwaysOn(
            string site = null, string department = null)
        {
            List<AlwaysOn> data = await _service.GetAlwaysOnAsync(site, department);
            return Ok(ApiResponse<List<AlwaysOn>>.Ok(data, "Load data successfully"));
        }

        [HttpGet]
        [Route("large-tables")]
        public async Task<IHttpActionResult> LargeTables(
            string site = null, string department = null)
        {
            try
            {
                var rows = await CreatePgRepository().GetLargeTablesAsync(site, department);
                return Ok(new { success = true, data = rows });
            }
            catch (Exception ex)
            {
                return PgError(ex);
            }
        }

        [HttpGet]
        [Route("disk-space")]
        public async Task<IHttpActionResult> DiskSpace(
            string site = null, string department = null)
        {
            try
            {
                var rows = await CreatePgRepository().GetDiskSpaceAsync(site, department);
                return Ok(new { success = true, data = rows });
            }
            catch (Exception ex)
            {
                return PgError(ex);
            }
        }

        [HttpGet]
        [Route("get-process-flow")]
        public IHttpActionResult GetProcessFlow()
        {
            return Ok("DBA API is running.");
        }

        private IHttpActionResult PgError(Exception ex)
        {
            // The dashboard is a secured internal page. No stack traces or connection
            // strings are ever returned; keep a short actionable error for testing.
            var root = ex.GetBaseException();
            var message = root.Message;
            if (message.IndexOf("does not exist", StringComparison.OrdinalIgnoreCase) >= 0)
                message = "Khong tim thay bang hoac cot PostgreSQL: " + message;
            else if (ex is InvalidOperationException)
                message = ex.Message;
            else
                message = "Loi truy van PostgreSQL: " + message;

            return Content(HttpStatusCode.ServiceUnavailable,
                new { success = false, message = message });
        }
    }
}
