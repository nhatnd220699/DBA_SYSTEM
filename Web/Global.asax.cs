using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;

namespace Web
{
    public class MvcApplication : System.Web.HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();
            GlobalConfiguration.Configure(WebApiConfig.Register);
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            BundleConfig.RegisterBundles(BundleTable.Bundles);
        }

        protected void Application_Error()
        {
            var ex = Server.GetLastError();

            if (ex is HttpException httpEx &&
                httpEx.GetHttpCode() == 404)
            {
                // API
                if (Request.Path.StartsWith("/api/",
                    StringComparison.OrdinalIgnoreCase))
                {
                    Server.ClearError();

                    Response.Clear();
                    Response.StatusCode = 404;
                    Response.TrySkipIisCustomErrors = true;

                    return;
                }

                // MVC
                Response.Clear();
                Server.ClearError();

                Response.StatusCode = 404;

                Server.TransferRequest("~/Error/NotFound");
            }
        }
    }
}
