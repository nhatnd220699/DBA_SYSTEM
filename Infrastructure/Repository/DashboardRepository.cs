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

        public DynamicParameters BuildParameters(
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
                Department = string.IsNullOrWhiteSpace(department) ? string.Empty : department.Trim()
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
        }

        public async Task<List<LargeTable>> GetLargeTablesAsync(string site = null, string department = null)
        {
            const string sql = @"
                WITH latest AS (
                    SELECT t.*,
                           ROW_NUMBER() OVER (
                               PARTITION BY t.site, t.department, t.server_ip,
                                            t.database_name, t.table_name
                               ORDER BY NULLIF(BTRIM(t.inputdatetime), '') DESC NULLS LAST,
                                        t.id DESC
                           ) AS row_num
                    FROM qmhpu6.dba_largetable_status t
                    WHERE (@Site = '' OR t.site = @Site)
                      AND (@Department = '' OR t.department = @Department)
                )
                SELECT site, department, server_ip,
                       database_name, table_name, table_rows, warning_level,
                       reserved_mb, reserved_gb, status, inputdatetime
                FROM latest
                WHERE row_num = 1
                  AND table_rows >= 2500000
                ORDER BY table_rows DESC NULLS LAST, database_name, table_name
                LIMIT 2000";

            using (var connection = CreateConnection())
            {
                var rows = await connection.QueryAsync<LargeTable>(
                    sql, BuildFilters(site, department), commandTimeout: 30)
                    .ConfigureAwait(false);
                return rows.ToList();
            }
        }

        public async Task<List<DiskSpace>> GetDiskSpaceAsync(
           string site = null, string department = null)
        {
            const string sql = @"
                WITH latest AS (
                    SELECT d.*,
                           ROW_NUMBER() OVER (
                               PARTITION BY d.site, d.department, d.server_ip,
                                            d.server_name, d.volume_point
                               ORDER BY NULLIF(BTRIM(d.inputdatetime), '') DESC NULLS LAST,
                                        d.id DESC
                           ) AS row_num
                    FROM qmhpu6.dba_diskspace_status d
                    WHERE (@Site = '' OR d.site = @Site)
                      AND (@Department = '' OR d.department = @Department)
                )
                SELECT site, department, server_ip, server_name,
                       volume_point, volume_name, file_system_type,
                       total_space_gb, used_space_gb, free_space_gb, free_space_percent,
                       health_level, health_message, status, inputdatetime
                FROM latest
                WHERE row_num = 1
                ORDER BY site, department, server_ip, server_name, volume_point
                LIMIT 2000";

            using (var connection = CreateConnection())
            {
                var rows = await connection.QueryAsync<DiskSpace>(
                    sql, BuildFilters(site, department), commandTimeout: 30)
                    .ConfigureAwait(false);
                return rows.ToList();
            }
        }
    }
}
