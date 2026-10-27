namespace Domain
{
    public class DpaLicensesInstalled
    {
        public string LicenseProduct { get; set; }
        public string LicenseCategory { get; set; }
        public int LicensesAvailable { get; set; }
        public int LicensesConsumed { get; set; }
    }
}
