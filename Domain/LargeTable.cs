namespace Domain
{
    public class LargeTable
    {
        public string site { get; set; }
        public string department { get; set; }
        public string server_ip { get; set; }
        public string database_name { get; set; }
        public string table_name { get; set; }
        public long? table_rows { get; set; }
        public string warning_level { get; set; }
        public decimal? reserved_mb { get; set; }
        public decimal? reserved_gb { get; set; }
        public string status { get; set; }
        public string inputdatetime { get; set; }
    }
}
