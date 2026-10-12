using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Web.Models
{
    public class ErrorResponse
    {
        public bool Success { get; set; }

        public string Message { get; set; } = string.Empty;

        public IEnumerable<string> Errors { get; set; }

        public ErrorResponse()
        {
            Message = string.Empty;
            Errors = new List<string>();
        }
    }
}