using System.Web.Mvc;
using Web.Filters;

namespace Web.Controllers.Mvc
{
    [AppAuthorize]
    public class HomeController : BaseController
    {
        //[AppAuthorize(Roles = "admin")]
        public ActionResult Index()
        {
            return View();
        }
    }
}