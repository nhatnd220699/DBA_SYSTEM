using Application.Helpers;
using Domain.DPA;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Application.Features.DPA.DpaAuth
{
    public class DpaAuthService
    {
        private static readonly SemaphoreSlim _tokenLock = new SemaphoreSlim(1, 1);

        private static string _accessToken;
        private static DateTime _expiredTime;
        private readonly string _baseUrl;
        private readonly string _refreshToken;

        const int ExpirationBufferSeconds = 60;

        public DpaAuthService()
        {
            _baseUrl = ConfigurationManager.AppSettings["DPA_BaseUrl"];
            _refreshToken = ConfigurationManager.AppSettings["DPA_RefreshToken"];
        }

        public void ClearToken()
        {
            _accessToken = null;
            _expiredTime = DateTime.MinValue;
        }

        /// <summary>
        /// Returns a valid access token.
        ///
        /// If the cached token is still valid, it is returned immediately.
        /// If the token has expired, only one thread is allowed to refresh it,
        /// while other concurrent requests wait and then reuse the refreshed token.
        ///
        /// Uses SemaphoreSlim to prevent multiple simultaneous token refresh requests.
        /// </summary>
        /// <returns>A valid access token.</returns>
        public async Task<string> GetAccessTokenAsync()
        {
            if (!string.IsNullOrEmpty(_accessToken) && DateTime.UtcNow < _expiredTime)
            {
                return _accessToken;
            }

            await _tokenLock.WaitAsync();

            try
            {
                if (!string.IsNullOrEmpty(_accessToken)
                    && DateTime.UtcNow < _expiredTime)
                {
                    return _accessToken;
                }

                return await RefreshAccessTokenAsync();
            }
            finally
            {
                _tokenLock.Release();
            }
        }


        /// <summary>
        /// Requests a new access token from DPA using the configured refresh token.
        ///
        /// After a successful refresh:
        /// - Updates the cached access token.
        /// - Updates the token expiration time.
        /// - Applies a 60-second buffer before expiration to avoid using a token
        ///   that is about to expire during an API call.
        ///
        /// The token is cached and shared across the application using static fields.
        /// </summary>
        /// <returns>A newly generated access token.</returns>
        /// <exception cref="HttpRequestException">
        /// Thrown when the application cannot connect to the DPA service.
        /// </exception>
        /// <exception cref="TaskCanceledException">
        /// Thrown when the token request times out.
        /// </exception>
        /// <exception cref="Exception">
        /// Thrown when DPA returns an error response or an invalid token payload.
        /// </exception>
        public async Task<string> RefreshAccessTokenAsync()
        {
            ///*ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;*/
            ServicePointManager.ServerCertificateValidationCallback += (sender, cert, chain, sslPolicyErrors) => true;
            var tokenUrl = UrlHepler.BuildDpaUrl(_baseUrl, "security/oauth/token");

            try
            {

                using (var client = new HttpClient())
                {
                    var postData = new FormUrlEncodedContent(
                        new[]
                        {
                    new KeyValuePair<string, string>("grant_type", "refresh_token"),
                    new KeyValuePair<string, string>("refresh_token", _refreshToken)
                        });

                    var response = await client.PostAsync(tokenUrl, postData);

                    var responseText = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        throw new Exception(
                            $"DPA returned a error. StatusCode: {(int)response.StatusCode} " +
                            $"({response.StatusCode}). Response: {responseText}");
                    }

                    var tokenResponse = JsonConvert.DeserializeObject<DpaToken>(responseText) ?? throw new Exception(
                            $"Failed to deseriallize token response. Response: {responseText}");
                    if (string.IsNullOrWhiteSpace(tokenResponse.access_token))
                    {
                        throw new Exception(
                            $"DPA did not return an access token. Response: {responseText}");
                    }

                    _accessToken = tokenResponse.access_token;

                    _expiredTime = DateTime.UtcNow.AddSeconds(Math.Max(tokenResponse.expires_in - ExpirationBufferSeconds, 0));

                    return _accessToken;
                }
            }
            catch (HttpRequestException ex)
            {
                throw new Exception(
                    $"Failed to connect to DPA. URL: {tokenUrl}. Details: {ex.Message}",
                    ex);
            }
            catch (TaskCanceledException ex)
            {
                throw new Exception(
                    $"Request to DPA timed out. URL: {tokenUrl}",
                    ex);
            }
            catch (Exception ex)
            {
                throw new Exception(
                    $"Failed to refresh access token. URL: {tokenUrl}. Details: {ex.Message}",
                    ex);
            }
        }
    }
}
