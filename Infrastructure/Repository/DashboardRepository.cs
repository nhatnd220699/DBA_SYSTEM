using Application.Feature.Dashboard;
using Dapper;
using Domain;
using Infrastructure.Database;
using System;
using System.Collections.Generic;
using System.Linq;
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

        private static object BuildFilters(string site, string department)
        {
            // Empty strings are used as "no filter" (instead of SQL NULL)
            // to avoid indeterminate PostgreSQL parameter type errors.
            return new
            {
                Site = string.IsNullOrWhiteSpace(site)? string.Empty: site.Trim(),
                Department = string.IsNullOrWhiteSpace(department) ? String.Empty : department.Trim()
            };
        }

        public async Task<List<AlwaysOn>> GetAlwaysOnAsyc(string site = null, string department = null)
        {
            const string sql = @"
                WITH latest AS (
                    SELECT a.*,
                           ROW_NUMBER() OVER (
                               PARTITION BY a.site, a.department, a.server_ip,
                                            a.availability_group_name, a.replica_server_name,
                                            a.database_name
                               ORDER BY NULLIF(BTRIM(a.inputdatetime), '') DESC NULLS LAST,
                                        a.id DESC
                           ) AS row_num
                    FROM qmhpu6.dba_alwayson_status a
                    WHERE (@Site = '' OR a.site = @Site)
                      AND (@Department = '' OR a.department = @Department)
                )
                SELECT site, department, server_ip, availability_group_name,
                       database_name, replica_server_name, replica_role, connected_state,
                       synchronization_state, health_level, health_message, status, inputdatetime,
                       log_send_queue_kb, redo_queue_kb,
                       logsendrate_kb_persec, redorate_kb_persec
                FROM latest
                WHERE row_num = 1
                ORDER BY site, department, database_name, replica_server_name
                LIMIT 2000";

            using (var connection = CreateConnection())
            {
                var rows = await connection.QueryAsync<AlwaysOn>(
                    sql, BuildFilters(site, department), commandTimeout: 30)
                    .ConfigureAwait(false);
                return rows.ToList();
            }

            //var parameters = BuilParameters(("FuncType", funcType));

            //using (var conn = CreateConnection())
            //{
            //    using (var multi = await conn.QueryMultipleAsync(
            //        "_DBA_Max_ForTest_20260928",
            //        parameters,
            //        commandType: CommandType.StoredProcedure,
            //        commandTimeout: 120)
            //    )
            //    {
            //        var status = multi.ReadFirstOrDefault<Result>();
            //        if (!status.IResult.IsPass())
            //        {
            //            throw new DomainException(status.IMessage);
            //        }

            //        var data = multi.Read<ProcessFlow>().ToList();
            //        return data;
            //    }

            //}
        }
    }
}
