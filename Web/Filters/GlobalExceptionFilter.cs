using System;
using System.ComponentModel.DataAnnotations;
using System.Data.SqlClient;
using System.Net;
using System.Net.Http;
using System.Web.Http.Filters;
using System.Web.Mvc;
using Web.Models;

namespace Web.Filters
{

    public class ApiExceptionFilter : ExceptionFilterAttribute
    {
        public override void OnException(HttpActionExecutedContext context)
        {
            var response = new
            {
                success = false,
                message = context.Exception.Message,
                data = (object)null
            };

            context.Response = context.Request.CreateResponse(
                HttpStatusCode.BadRequest,
                response);
        }
    }

    //public class GlobalExceptionFilter : FilterAttribute, IExceptionFilter
    //{
    //    public void OnException(ExceptionContext filterContext)
    //    {
    //        var ex = filterContext.Exception;

    //        var response = new ErrorResponse();

    //        if (ex is InvalidOperationException)
    //        {
    //            filterContext.HttpContext.Response.StatusCode = 400;

    //            response.Success = false;
    //            response.Message = ex.Message;
    //        }
    //        else if (ex is ValidationException)
    //        {
    //            filterContext.HttpContext.Response.StatusCode = 400;

    //            response.Success = false;
    //            response.Message = ex.Message;
    //        }
    //        else if (ex is UnauthorizedAccessException)
    //        {
    //            filterContext.HttpContext.Response.StatusCode = 401;

    //            response.Success = false;
    //            response.Message = ex.Message;
    //        }
    //        else if (ex is NotImplementedException)
    //        {
    //            filterContext.HttpContext.Response.StatusCode = 403;

    //            response.Success = false;
    //            response.Message = ex.Message;
    //        }
    //        else if (ex is SqlException)
    //        {
    //            filterContext.HttpContext.Response.StatusCode = 500;

    //            response.Success = false;
    //            response.Message =
    //                "Đã xảy ra lỗi trong khi truy cập cơ sở dữ liệu.";
    //        }
    //        else
    //        {
    //            filterContext.HttpContext.Response.StatusCode = 500;

    //            response.Success = false;
    //            response.Message =
    //                "Đã xảy ra lỗi trong quá trình xử lý yêu cầu.";
    //        }

    //        filterContext.Result = new JsonResult
    //        {
    //            Data = response,
    //            JsonRequestBehavior = JsonRequestBehavior.AllowGet
    //        };

    //        filterContext.ExceptionHandled = true;
    //    }
    //}
}