namespace Domain.DPA
{
    public class DpaVSphereMonitorInfo
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Uuid { get; set; }
        public string Type { get; set; }
        public string Host { get; set; }
        public int Port { get; set; }
        public string User { get; set; }
        public string CyberArkQuery { get; set; }
        public bool IgnoreCerts { get; set; }
        public string Version { get; set; }
        public bool Enabled { get; set; }
        public string Command { get; set; }
        public string Status { get; set; }
    }
}
