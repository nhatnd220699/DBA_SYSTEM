using Application.Feature.Dashboard;
using System.Web.Http;

namespace Web.Controllers.Api
{
    [RoutePrefix("api/dba")]
    public class DbaController : ApiController
    {
        private readonly DashboardService _service;

        public DbaController()
        {
        }

        [HttpGet]
        [Route("get-process-flow")]
        public IHttpActionResult GetProcessFlow()
        {
            return Ok("DBA API is running.");
        }
    }
}