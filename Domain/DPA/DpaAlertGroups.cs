using System.Collections.Generic;

namespace Domain
{
    public class DpaAlertGroups
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public List<int> AlertIds { get; set; }
        public List<int> DatabaseIds { get; set; }
    }
}
