using System.Web.Mvc;

namespace Web.Controllers.Web
{
    public class ErrorController : Controller
    {
        public ActionResult NotFound()
        {
            Response.StatusCode = 404;
            return View();
        }

        public ActionResult Fobidden()
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