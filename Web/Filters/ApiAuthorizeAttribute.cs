using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.Controllers;

namespace Web.Filters
{
    public class ApiAuthorizeAttribute : AuthorizeAttribute
    {
        protected override void HandleUnauthorizedRequest(
            HttpActionContext actionContext)
        {
            var user = actionContext.RequestContext.Principal;

            if (user?.Identity?.IsAuthenticated == true)
            {
                // Return HTTP 403 for authenticated users without sufficient permissions.
                actionContext.Response = actionContext.Request.CreateResponse(
                    HttpStatusCode.Forbidden);

                return;
            }

            // Return HTTP 401 for unauthenticated users.
            base.HandleUnauthorizedRequest(actionContext);
        }
    }
}
