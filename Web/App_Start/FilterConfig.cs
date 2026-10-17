using System.Web.Mvc;
//using Web.Filters;

namespace Web
{
    public class FilterConfig
    {
        public static void RegisterGlobalFilters(GlobalFilterCollection filters)
        {
            filters.Add(new HandleErrorAttribute());
            filters.Add(new AuthorizeAttribute());
            //filters.Add(new GlobalExceptionFilter());
        }
    }
}
