using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain
{
    public class DpaDatabaseMonitorInfo
    {
        public int DbId { get; set; }

        public string Name { get; set; }

        public string Ip { get; set; }

        public string Port { get; set; }

        public string JdbcUrlProperties { get; set; }

        public string ConnectionProperties { get; set; }

        public string DatabaseType { get; set; }

        public string DatabaseVersion { get; set; }

        public string DatabaseEdition { get; set; }

        public string MonitoringUser { get; set; }

        public string DefaultDbLicenseCategory { get; set; }

        public string AssignedDbLicenseCategory { get; set; }

        public string AssignedVmLicenseCategory { get; set; }

        public string MonitorState { get; set; }

        public DateTimeOffset OldestMonitoringDate { get; set; }

        public DateTimeOffset LatestMonitoringDate { get; set; }

        public string Deployment { get; set; }

        public string AgListenerName { get; set; }

        public string AgClusterName { get; set; }

        public string AgName { get; set; }

        public object RacInfo { get; set; }

        public object CredentialsRequest { get; set; }

        public bool Rac { get; set; }

        public bool LinkedToVirtualMachine { get; set; }

        public bool Pdb { get; set; }

        public bool Ebusiness { get; set; }
    }
}
