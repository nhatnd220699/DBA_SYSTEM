namespace Domain
{
    public class DiskSpace
    {
        public string site { get; set; }
        public string department { get; set; }
        public string server_ip { get; set; }
        public string server_name { get; set; }
        public string volume_point { get; set; }
        public string volume_name { get; set; }
        public string file_system_type { get; set; }
        public decimal? total_space_gb { get; set; }
        public decimal? used_space_gb { get; set; }
        public decimal? free_space_gb { get; set; }
        public decimal? free_space_percent { get; set; }
        public string health_level { get; set; }
        public string health_message { get; set; }
        public string status { get; set; }
        public string inputdatetime { get; set; }
    }
}
