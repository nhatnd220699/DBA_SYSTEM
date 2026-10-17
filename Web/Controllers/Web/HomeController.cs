using System.Web.Mvc;

namespace Web.Controllers.Web
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