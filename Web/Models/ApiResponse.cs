namespace Web.Models
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }

        public string Message { get; set; }

        public string ErrorCode { get; set; }

        public T Data { get; set; }
    }

    public static class ApiResponse
    {
        public static ApiResponse<T> Ok<T>(
            T data,
            string message = "Success")
        {
            return new ApiResponse<T>
            {
                Success = true,
                Message = message,
                Data = data
            };
        }

        public static ApiResponse<T> Fail<T>(
            string message,
            string errorCode = null)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Message = message,
                ErrorCode = errorCode
            };
        }
    }
}