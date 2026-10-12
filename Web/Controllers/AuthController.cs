using System;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;
using Newtonsoft.Json;
using Web.Models;

namespace Web.Controllers
{
    public class AuthController : Controller
    {
        [HttpGet]
        [AllowAnonymous]
        public ActionResult Login(string returnUrl)
        {
            if (User.Identity.IsAuthenticated)
            {
                return RedirectToAction("Index", "Home");
            }
            ViewBag.ReturnUrl = returnUrl;
            return View();
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public ActionResult Login(
            string username,
            string password,
            string returnUrl)
        {
            if (username == "V5120002" && password == "123")
            {
                //FormsAuthentication.SetAuthCookie( username, false);

                UserInfo userInfo = new UserInfo
                {
                    EmployeeCode = "V5120002",
                    EmployeeName = "Max Nguyen",
                    Department = "QMS",
                    Email = "Max.Nguyen1@quantaqmh.com"
                };

                // Ghép dữ liệu cần lưu
                var userData = JsonConvert.SerializeObject(userInfo);

                var ticket = new FormsAuthenticationTicket(
                    1,
                    username, // User.Identity.Name
                    DateTime.Now,
                    DateTime.Now.AddMinutes(FormsAuthentication.Timeout.TotalMinutes),
                    false,
                    userData);

                string encryptedTicket = FormsAuthentication.Encrypt(ticket);

                var cookie = new HttpCookie(
                    FormsAuthentication.FormsCookieName,
                    encryptedTicket);

                cookie.HttpOnly = true;

                if (Request.IsSecureConnection)
                {
                    cookie.Secure = true;
                }

                Response.Cookies.Add(cookie);

                if (!string.IsNullOrEmpty(returnUrl)
                    && Url.IsLocalUrl(returnUrl))
                {
                    return Redirect(returnUrl);
                }

                return RedirectToAction("Index", "Home");
            }

            ViewBag.ReturnUrl = returnUrl;
            ViewBag.Error = "Sai tài khoản hoặc mật khẩu";

            return View();
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public ActionResult Logout()
        {
            FormsAuthentication.SignOut();

            Session.Clear();
            Session.Abandon();

            return RedirectToAction("Login", "Auth");
        }
    }
}