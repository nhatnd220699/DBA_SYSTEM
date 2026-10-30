using System;

namespace Domain.DPA
{
    public class DpaAlertsStatuses
    {
        public int AlertId { get; set; }
        public string Status { get; set; }
        public string AlertName { get; set; }
        public string Category { get; set; }
        public string Type { get; set; }
        public DatabaseInstanceItem DatabaseInstance { get; set; }
        public DateTime LastRun { get; set; }
        public DateTime LastChange { get; set; }
        public string Acknowledge { get; set; }
    }

    public class DatabaseInstanceItem
    {
        public int DbId { get; set; }
        public string Name { get; set; }
    }
}
