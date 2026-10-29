using Application.Helpers;
using Domain;
using Newtonsoft.Json;
using System;
using System.Configuration;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace Application.Features.DPA.DpaAuth
{
    public class DpaClient
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        private readonly DpaAuthService _authService;
        private readonly string _baseUrl;

        public DpaClient()
        {
            _authService = new DpaAuthService();
            _baseUrl = ConfigurationManager.AppSettings["DPA_BaseUrl"];
        }

        //private async Task AddAuthorizationHeader()
        //{
        //    var token = await _authService.GetAccessTokenAsync();

        //    _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        //}

        /// <summary>
        /// Sends an authenticated HTTP request to the DPA API.
        ///
        /// A valid Bearer access token is automatically attached to the request.
        /// If DPA returns 401 (Unauthorized), the cached token is cleared,
        /// a new access token is requested, and the original request is retried once.
        ///
        /// The final response is returned to the caller regardless of whether
        /// the retry succeeds or fails.
        /// </summary>
        /// <param name="method">
        /// The HTTP method to execute.
        /// </param>
        /// <param name="endpoint">
        /// The relative DPA API endpoint.
        /// </param>
        /// <param name="content">
        /// Optional request content.
        /// </param>
        /// <returns>
        /// The HTTP response returned by DPA.
        /// </returns>
        public async Task<HttpResponseMessage> SendAsync(
            HttpMethod method,
            string endpoint,
            HttpContent content = null)
        {
            var token = await _authService.GetAccessTokenAsync();

            var request = new HttpRequestMessage(method, UrlHepler.BuildDpaUrl(_baseUrl, endpoint));

            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            if (content != null)
            {
                request.Content = content;
            }

            var response = await _httpClient.SendAsync(request);

            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                _authService.ClearToken();

                var newToken = await _authService.RefreshAccessTokenAsync();

                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", newToken);

                request = new HttpRequestMessage(method, UrlHepler.BuildDpaUrl(_baseUrl, endpoint));

                if (content != null)
                {
                    request.Content = content;
                }

                response = await _httpClient.SendAsync(request);
            }

            return response;
        }

        /// <summary>
        /// Executes a GET request against a DPA endpoint and
        /// deserializes the response payload into the specified type.
        ///
        /// Business errors returned by DPA are converted into
        /// descriptive exceptions containing the response status,
        /// request identifier and error message.
        /// </summary>
        /// <typeparam name="T">
        /// Expected response data type.
        /// </typeparam>
        /// <param name="endpoint">
        /// Relative DPA endpoint path.
        /// </param>
        /// <returns>
        /// Deserialized response data.
        /// </returns>
        /// <exception cref="Exception">
        /// Thrown when the DPA request fails or the response
        /// cannot be processed successfully.
        /// </exception>
        public async Task<T> GetAsync<T>(string endpoint)
        {
            try
            {
                var response = await SendAsync(HttpMethod.Get, endpoint);

                var json = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    var error = JsonConvert.DeserializeObject<DpaErrorResponse>(json);
                    var message = error?.Messages?.FirstOrDefault();
                    var errorMessage = message != null ? $"Description: {message.Description} (Reason: {message.Reason})" : "Unknown error.";

                    throw new Exception(
                        $"DPA API failed. " +
                        $"StatusCode: {response.StatusCode}. " +
                        $"RequestId: {error?.RequestId}. " +
                        $"Message: {errorMessage}");
                }

                var result =
                    JsonConvert.DeserializeObject<DpaResponse<T>>(json);

                return result.Data;
            }
            catch
            {
                throw;
            }
        }
    }
}
