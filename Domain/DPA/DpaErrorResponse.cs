using System.Collections.Generic;

namespace Domain
{
    public class DpaErrorResponse
    {
        public string RequestId { get; set; }

        public List<DpaMessage> Messages { get; set; }
    }
}
