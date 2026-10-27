namespace Domain
{
    public class DpaServerInfo
    {
        public string DpaVersion { get; set; }
        public string OsVersion { get; set; }
        public string DeploymentLocationType { get; set; }
        public string LicenseModel { get; set; }
        public string RepoType { get; set; }
        public string RepoEdition { get; set; }
        public int RegisteredInstances { get; set; }
        public string RepoSize { get; set; }
    }
}
