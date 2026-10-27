using System.Collections.Generic;

namespace Domain
{
    public class DpaOptionsDatabase
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public List<DpaOptionsDatabaseItem> Options { get; set; }
    }

    public class DpaOptionsDatabaseItem
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string DefaultValue { get; set; }
        public string CurrentValue { get; set; }
        public string DataType { get; set; }
        public string TakesAffect { get; set; }
        public string ReadOnly { get; set; }
    }
}
