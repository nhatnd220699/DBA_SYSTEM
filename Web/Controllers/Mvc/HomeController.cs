using System.Web.Mvc;

namespace Web.Controllers.Mvc
{
    [Authorize]
    public class HomeController : BaseController
    {
        public ActionResult Index()
        {
            return View();
        }
    }
}