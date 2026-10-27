namespace Application.Helpers
{
    public static class UrlHepler
    {
        public static string BuildDpaUrl(string baseUrl, string endpoint)
        {
            return string.Format(
                "{0}/{1}",
                baseUrl.TrimEnd('/'),
                endpoint.TrimStart('/'));
        }
    }
}
