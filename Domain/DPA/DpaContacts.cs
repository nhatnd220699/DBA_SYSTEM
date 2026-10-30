using System.Collections.Generic;

namespace Domain.DPA
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
