using Domain;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Feature.Dashboard
{
    public interface IDashboardRepository
    {
        Task<List<AlwaysOn>> GetAlwaysOnAsyc(string site = null, string department = null);
    }
}
