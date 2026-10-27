namespace Domain
{
    public class DpaLicenses
    {
        public string ServerName { get; set; }
        public string PerformanceLicenseProduct  { get; set; }
        public string VmLicenseProduct { get; set; }
        public bool OverLicensed { get; set; }
    }
}
