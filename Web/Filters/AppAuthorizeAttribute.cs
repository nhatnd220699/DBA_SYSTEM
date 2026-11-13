using System.Web.Mvc;
using System.Web.Routing;

namespace Web.Filters
{
    public class AppAuthorizeAttribute : AuthorizeAttribute
    {
        protected override void HandleUnauthorizedRequest(
            AuthorizationContext filterContext)
        {
            var user = filterContext.HttpContext.User;

            if (user.Identity.IsAuthenticated)
            {
                // Redirect authenticated users who lack the required role.
                filterContext.Result = new RedirectToRouteResult(
                    new RouteValueDictionary
                    {
                        { "controller", "Error" },
                        { "action", "Forbidden" }
                    });

                return;
            }

            // Redirect unauthenticated users to the login page.
            base.HandleUnauthorizedRequest(filterContext);
        }
    }
}
