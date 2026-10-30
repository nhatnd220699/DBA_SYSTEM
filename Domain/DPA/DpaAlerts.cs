using System.Collections.Generic;

namespace Domain.DPA
{
    public class DpaAlerts
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public List<string> SupportedDatabaseTypes { get; set; }
        public List<int> DatabaseIds { get; set; }
        public bool Enabled { get; set; }
    }
}
