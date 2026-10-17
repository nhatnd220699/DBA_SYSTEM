namespace Web.Models
{

    public class ApiResponse<T>
    {
        public bool success { get; set; }
        public string message { get; set; }
        public T data { get; set; }

        public static ApiResponse<T> Ok(T data, string message = "")
        {
            return new ApiResponse<T>
            {
                success = true,
                message = message,
                data = data
            };
        }

        public static ApiResponse<T> Fail(string message)
        {
            return new ApiResponse<T>
            {
                success = false,
                message = message,
                data = default(T)
            };
        }
    }
}