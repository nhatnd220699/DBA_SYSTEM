using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain
{
    public class DpaOptionsSystem
    {
        public List<DpaOptionSystemItem> Options { get; set; }
    }

    public class DpaOptionSystemItem
    {
        public string Name { get; set; }

        public string Description { get; set; }

        public string DefaultValue { get; set; }

        public string CurrentValue { get; set; }

        public string DataType { get; set; }

        public string TakesAffect { get; set; }

        public bool ReadOnly { get; set; }
    }
}
