using System.Web;
using System.Web.Http.Routing;
using System.Web.Mvc;
using UrlHelper = System.Web.Mvc.UrlHelper;

namespace Web.Helpers
{
    public static class SvgIconHelper
    {
        public static IHtmlString Icon(
            this HtmlHelper html,
            string name,
            string cssClass = "")
        {
            var request = html.ViewContext.HttpContext.Request;

            var svg = new TagBuilder("svg");

            if (!string.IsNullOrWhiteSpace(cssClass))
            {
                svg.AddCssClass(cssClass);
            }

            var urlHelper = new UrlHelper(html.ViewContext.RequestContext);
            var use = new TagBuilder("use");

            use.MergeAttribute(
                "href",
                urlHelper.Content($"~/Content/icons/sprite.svg#{name}")
            );

            //string pathBase = request.ApplicationPath;

            //if (pathBase == "/")
            //{
            //    pathBase = string.Empty;
            //}

            //use.MergeAttribute(
            //    "href",
            //    $"{pathBase}/icons/sprite.svg#{name}"
            //);

            svg.InnerHtml = use.ToString(TagRenderMode.Normal);

            return new HtmlString(svg.ToString(TagRenderMode.Normal));
        }
    }
}