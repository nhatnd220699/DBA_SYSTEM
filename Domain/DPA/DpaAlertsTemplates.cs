using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain
{
    public class DpaAlertsTemplates
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string EmailTextFormat { get; set; }
        public string Subject { get; set; }
        public string Body { get; set; }
    }
}
