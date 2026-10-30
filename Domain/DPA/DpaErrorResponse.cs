using System.Collections.Generic;

namespace Domain.DPA
{
    public class DpaErrorResponse
    {
        public string RequestId { get; set; }

        public List<DpaMessage> Messages { get; set; }
    }
}
