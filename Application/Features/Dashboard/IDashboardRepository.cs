using Domain;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Feature.Dashboard
{
    public interface IDashboardRepository
    {
        Task<List<ProcessFlow>> GetProcessFlowAsync(string funcType);
    }
}
