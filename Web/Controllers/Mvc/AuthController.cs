using Application.Features.User;
using Domain;
using Newtonsoft.Json;
using System;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;
using Web.Factories;
using Web.Models;

namespace Web.Controllers.Mvc
{
    public class AuthController : Controller
    {

        private readonly MemberService _service;

        public AuthController() : this(ServiceFactory.CreateMemberService())
        {
        }

        public AuthController(MemberService service)
        {
            _service = service ?? throw new ArgumentNullException(nameof(service));
        }

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
        public async Task<ActionResult> Login(
            string username,
            string password,
            string returnUrl)
        {

            Member member = await _service.GetMemberByIdAsync(username, password);

            if (member == null)
            {
                ViewBag.ReturnUrl = returnUrl;
                ViewBag.Error = "The account information or password is incorrect";
                return View();
            }

            // Validate password
            UserInfo userInfo = new UserInfo
            {
                EmployeeId = member.Id,
                EmployeeCode = member.Username,
                EmployeeName = member.Fullname,
                Email = member.Email,
                Department = member.Department,
                Role = member.Role
            };

            // Tạo FormsAuthenticationTicket
            //FormsAuthentication.SetAuthCookie( username, false);

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

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public ActionResult Logout()
        {
            FormsAuthentication.SignOut();

            Session.Clear();
            Session.Abandon();

            var cookie = new HttpCookie(FormsAuthentication.FormsCookieName, "")
            {
                Expires = DateTime.Now.AddYears(-1)
            };

            Response.Cookies.Add(cookie);

            return RedirectToAction("Login", "Auth");
        }
    }
}