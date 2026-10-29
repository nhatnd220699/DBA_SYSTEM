using System.Web.Mvc;

namespace Web.Controllers.Mvc
{
    [AllowAnonymous]
    public class ErrorController : Controller
    {
        public ActionResult NotFound()
        {
            Response.StatusCode = 404;
            return View();
        }

        public ActionResult Forbidden()
        {
            Response.StatusCode = 403;
            return View();

        }

        public ActionResult InternalServer()
        {
            Response.StatusCode = 500;
            return View();
        }
    }
}