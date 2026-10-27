using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using Web.Models;

namespace Web.Controllers.Base
{
    public class BaseApiController : ApiController
    {
        protected IHttpActionResult Success<T>(T data, string message = null)
        {
            return Ok(ApiResponse<T>.Ok(data, message));
        }

        protected IHttpActionResult Fail(string message)
        {
            return Content(
                HttpStatusCode.BadRequest,
                ApiResponse<object>.Fail(message)
            );
        }

        protected IHttpActionResult NotFoundResponse(string message)
        {
            return Content(
                HttpStatusCode.NotFound,
                ApiResponse<object>.Fail(message)
            );
        }
    }
}
