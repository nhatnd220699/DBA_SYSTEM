using Application.Exceptions;
using System;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http.Filters;


namespace Web.Filters
{
    public class ApiExceptionFilter : ExceptionFilterAttribute
    {
        public override void OnException(HttpActionExecutedContext context)
        {
            var exception = context.Exception;

            var statusCode = GetStatusCode(exception);
            var message = GetErrorMessage(exception, statusCode);

            // Log the full exception for troubleshooting.
            Trace.TraceError(
                "API Exception: {0}\n{1}",
                exception.GetType().FullName,
                exception);

            var response = new
            {
                success = false,
                message,
                data = (object)null
            };

            context.Response = context.Request.CreateResponse(
                statusCode,
                response);
        }

        private static HttpStatusCode GetStatusCode(Exception exception)
        {
            if (FindException<ValidationException>(exception) != null)
                return HttpStatusCode.BadRequest;

            if (FindException<NotFoundException>(exception) != null)
                return HttpStatusCode.NotFound;

            if (FindException<ConflictException>(exception) != null)
                return HttpStatusCode.Conflict;

            if (FindException<ForbiddenException>(exception) != null)
                return HttpStatusCode.Forbidden;

            if (FindException<UnauthorizedException>(exception) != null)
                return HttpStatusCode.Unauthorized;

            if (FindException<TimeoutException>(exception) != null ||
                FindException<TaskCanceledException>(exception) != null)
                return HttpStatusCode.GatewayTimeout;

            if (FindException<HttpRequestException>(exception) != null)
                return HttpStatusCode.BadGateway;

            if (FindException<SqlException>(exception) != null)
                return HttpStatusCode.InternalServerError;

            // Return 500 for all unexpected exceptions.
            return HttpStatusCode.InternalServerError;
        }

        private static string GetErrorMessage(
            Exception exception,
            HttpStatusCode statusCode)
        {
            switch (statusCode)
            {
                case HttpStatusCode.BadRequest:
                    return FindException<ValidationException>(exception).Message;

                case HttpStatusCode.NotFound:
                    return FindException<NotFoundException>(exception).Message;

                case HttpStatusCode.Conflict:
                    return FindException<ConflictException>(exception).Message;

                case HttpStatusCode.Forbidden:
                    return FindException<ForbiddenException>(exception).Message;

                case HttpStatusCode.Unauthorized:
                    return FindException<UnauthorizedException>(exception).Message;

                case HttpStatusCode.BadGateway:
                    return "An error occurred while communicating with an external service.";

                case HttpStatusCode.GatewayTimeout:
                    return "The external service did not respond within the allowed time.";

                default:
                    return "An unexpected error occurred while processing your request.";
            }
        }

        private static T FindException<T>(Exception exception)
            where T : Exception
        {
            while (exception != null)
            {
                if (exception is T matchedException)
                    return matchedException;

                exception = exception.InnerException;
            }

            return null;
        }

        //public override void OnException(HttpActionExecutedContext context)
        //{
        //    HttpStatusCode statusCode = HttpStatusCode.BadRequest;

        //    if (context.Exception is ConflictException)
        //    {
        //        statusCode = HttpStatusCode.Conflict;
        //    }
        //    else if (context.Exception is NotFoundException)
        //    {
        //        statusCode = HttpStatusCode.NotFound;
        //    }
        //    else if (context.Exception is ValidationException)
        //    {
        //        statusCode = HttpStatusCode.BadRequest;
        //    }
        //    else if (context.Exception is ForbiddenException)
        //    {
        //        statusCode = HttpStatusCode.Forbidden;
        //    }
        //    else if (context.Exception is UnauthorizedException)
        //    {
        //        statusCode = HttpStatusCode.Unauthorized;
        //    }

        //    var response = new
        //    {
        //        success = false,
        //        message = context.Exception.Message,
        //        data = (object)null
        //    };

        //    context.Response = context.Request.CreateResponse(
        //        statusCode,
        //        response);
        //}
    }
}