using Newtonsoft.Json;
using System.Web;
using System.Web.Security;
using Web.Models;

namespace Web.Helpers
{
    public static class CurrentUser
    {
        public static UserInfo Info
        {
            get
            {
                var cookie =
                HttpContext.Current.Request.Cookies[
                FormsAuthentication.FormsCookieName];

                if (cookie == null)
                    return null;

                var ticket =
                FormsAuthentication.Decrypt(
                cookie.Value);

                if (ticket == null ||
                string.IsNullOrEmpty(ticket.UserData))
                {
                    return null;
                }

                return JsonConvert.DeserializeObject<UserInfo>(
                ticket.UserData);
            }
        }
    }
}