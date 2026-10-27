namespace Domain
{
    public class DpaResponse<T>
    {
        public T Data { get; set; }

        public string RequestId { get; set; }
    }
}
