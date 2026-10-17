using System.Web;
using System.Web.Mvc;

namespace Web.Controllers.Web
{
    public class BaseController : Controller
    {
        protected override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            Response.Cache.SetCacheability(HttpCacheability.NoCache);
            Response.Cache.SetNoStore();

            base.OnActionExecuting(filterContext);
        }
    }
}