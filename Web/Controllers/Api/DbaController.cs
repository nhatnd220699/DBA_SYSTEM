using Application.Features.Dashboard;
using Domain;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web.Http;
using System.Web.Http.Results;
using Web.Factories;
using Web.Models;

namespace Web.Controllers.Api
{
    [Authorize]
    [RoutePrefix("api/dba")]
    public class DbaController : BaseApiController
    {
        private readonly DashboardService _service;

        public DbaController() : this(ServiceFactory.CreateDashboardService())
        {
        }

        public DbaController(DashboardService service)
        {
            _service = service ?? throw new ArgumentNullException(nameof(service));
        }

        [HttpGet]
        [Route("alwayson")]
        public async Task<IHttpActionResult> GetAlwaysOn(
            string site = null, string department = null)
        {
            List<AlwaysOn> data = await _service.GetAlwaysOnAsync(site, department);
            return Success(data, "Get always on successfully");
        }

        [HttpGet]
        [Route("large-tables")]
        public async Task<IHttpActionResult> GetLargeTables(
            string site = null, string department = null)
        {
            List<LargeTable> data = await _service.GetLargeTablesAsync(site, department);
            return Success(data, "Get large table successfully");
        }

        [HttpGet]
        [Route("disk-space")]
        public async Task<IHttpActionResult> GetDiskSpace(
            string site = null, string department = null)
        {
            List<DiskSpace> data = await _service.GetDiskSpaceAsync(site, department);
            return Success(data, "Get disk space successfully");
        }
    }
}
