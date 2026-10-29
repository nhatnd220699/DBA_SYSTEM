using Domain;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Features.Dashboard
{
    public class DashboardService
    {
        private readonly IDashboardRepository _repo;

        public DashboardService(IDashboardRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<AlwaysOn>> GetAlwaysOnAsync(string site = null, string department = null)
        {
            return await _repo.GetAlwaysOnAsync(site, department);
        }

        public async Task<List<LargeTable>> GetLargeTablesAsync(string site = null, string department = null)
        {
            return await _repo.GetLargeTablesAsync(site, department);
        }

        public async Task<List<DiskSpace>> GetDiskSpaceAsync(string site = null, string department = null)
        {
            return await _repo.GetDiskSpaceAsync(site, department);
        }
    }
}
