using Application.Exceptions;
using Domain;
using System;
using System.Collections.Generic;
using System.Linq;
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
    }
}
