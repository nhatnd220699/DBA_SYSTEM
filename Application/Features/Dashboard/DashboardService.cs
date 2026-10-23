using Application.Exceptions;
using Domain;
using System.Collections.Generic;
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

        public async Task<List<AlwaysOn>> GetAlwaysOnAsync(string site = null, string department = null)
        {
            try
            {
                List<AlwaysOn> data = await _repo.GetAlwaysOnAsyc(site, department);
                return data;
            }
            catch
            {
                throw;
            }
        }

        public async Task<List<LargeTable>> GetLargeTablesAsync(string site = null, string department = null)
        {
            try
            {
                List<LargeTable> data = await _repo.GetLargeTablesAsync(site, department);
                return data;
            }
            catch
            {
                throw;
            }
        }

        public async Task<List<DiskSpace>> GetDiskSpaceAsync(string site = null, string department = null)
        {
            try
            {
                List<DiskSpace> data = await _repo.GetDiskSpaceAsync(site, department);
                return data;
            }
            catch
            {
                throw;
            }
        }
    }
}
