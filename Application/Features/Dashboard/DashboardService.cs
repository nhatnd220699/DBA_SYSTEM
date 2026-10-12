using Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Feature.Dashboard
{
    public class DashboardService
    {
        private readonly IDashboardRepository _repo;

        public DashboardService(IDashboardRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<ProcessFlow>> GetProcessFlowAsync(string funcType)
        {
            try
            {
                return await _repo.GetProcessFlowAsync(funcType);
            }
            catch
            {
                throw;
            }
        }
    }
}
