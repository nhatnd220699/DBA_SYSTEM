using Application.Feature.Dashboard;
using Dapper;
using Domain;
using Domain.Extensions;
using Infrastructure.Database;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repository
{
    public class DashboardRepository : BaseRepository, IDashboardRepository
    {
        public DashboardRepository(IDbConnectionFactory factory) : base(factory) { }

        public DynamicParameters BuilParameters(
            params (string Name, object Value)[] items)
        {
            var parameters = new DynamicParameters();

            foreach (var item in items)
            {
                parameters.Add(item.Name, item.Value ?? "");
            }

            return parameters;
        }

        public async Task<List<ProcessFlow>> GetProcessFlowAsync(string funcType)
        {
            var parameters = BuilParameters(("FuncType", funcType));

            using (var conn = CreateConnection())
            {
                using (var multi = await conn.QueryMultipleAsync(
                    "_DBA_Max_ForTest_20260928",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    commandTimeout: 120)
                )
                {
                    var status = multi.ReadFirstOrDefault<Result>();
                    if (!status.IResult.IsPass())
                    {
                        throw new DomainException(status.IMessage);
                    }

                    var data = multi.Read<ProcessFlow>().ToList();
                    return data;
                }

            }
        }
    }
}
