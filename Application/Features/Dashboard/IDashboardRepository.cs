using Domain;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Features.Dashboard
{
    public interface IDashboardRepository
    {
        Task<List<AlwaysOn>> GetAlwaysOnAsync(string site = null, string department = null);
        Task<List<LargeTable>> GetLargeTablesAsync(string site = null, string department = null);
        Task<List<DiskSpace>> GetDiskSpaceAsync(string site = null, string department = null);
    }
}
