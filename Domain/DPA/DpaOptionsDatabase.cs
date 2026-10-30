using System.Collections.Generic;

namespace Domain.DPA
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
        public string TakesAffect { get; set; }
        public bool ReadOnly { get; set; }
        public string DataType { get; set; }
        public List<string> ValidValues { get; set; }
        public decimal MaxValue { get; set; }
        public decimal MinValue { get; set; }
    }
}
