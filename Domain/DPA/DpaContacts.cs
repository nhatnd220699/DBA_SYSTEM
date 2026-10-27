using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain
{
    public class DpaContacts
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public List<object> GroupMembership { get; set; }
        public string Email { get; set; }
    }
}
