using Dapper;
using Infrastructure.Database;
using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

namespace Infrastructure.Repository
{
    /// <summary>
    /// Reads collected SQL Server telemetry stored in PostgreSQL schema qmhpu6.
    /// Does not connect directly to monitored SQL Server instances.
    /// All filters are Dapper parameters, never concatenated into SQL.
    /// </summary>
    public sealed class PostgreSqlDashboardRepository : BaseRepository
    {
        public PostgreSqlDashboardRepository(IDbConnectionFactory factory) : base(factory) { }

        public async Task<PgConnectionStatus> TestConnectionAsync()
        {
            var watch = Stopwatch.StartNew();
            using (var connection = CreateConnection() as DbConnection)
            {
                if (connection == null)
                    throw new InvalidOperationException("PostgreSQL connection factory did not create a DbConnection.");

                await connection.OpenAsync().ConfigureAwait(false);
                using (var command = connection.CreateCommand())
                {
                    command.CommandText =
                        "SELECT current_database(), current_user, current_setting('server_version'), 1";
                    command.CommandTimeout = 15;
                    using (var reader = await command.ExecuteReaderAsync().ConfigureAwait(false))
                    {
                        if (!await reader.ReadAsync().ConfigureAwait(false) || reader.GetInt32(3) != 1)
                            throw new InvalidOperationException("PostgreSQL SELECT 1 did not return 1.");

                        watch.Stop();
                        return new PgConnectionStatus
                        {
                            database = reader.GetString(0),
                            db_user = reader.GetString(1),
                            pg_version = reader.GetString(2),
                            elapsed_ms = watch.ElapsedMilliseconds
                        };
                    }
                }
            }
        }

        /// <summary>
        /// Latest record PER (site, department, source server, AG, replica, database).
        /// inputdatetime is a varchar of format yyyyMMddHHmmss; lexical sorting works
        /// for valid values of this format. id breaks ties when timestamps match.
        /// </summary>
        public async Task<List<AlwaysOnStatusRow>> GetAlwaysOnAsync(
            string site = null, string department = null)
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
                var rows = await connection.QueryAsync<AlwaysOnStatusRow>(
                    sql, BuildFilters(site, department), commandTimeout: 30)
                    .ConfigureAwait(false);
                return rows.ToList();
            }
        }

        /// <summary>
        /// Latest record per monitored physical table. Threshold is applied AFTER
        /// latest-row selection so an old alert is not accidentally retained.
        /// </summary>
        public async Task<List<LargeTableStatusRow>> GetLargeTablesAsync(
            string site = null, string department = null)
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
                var rows = await connection.QueryAsync<LargeTableStatusRow>(
                    sql, BuildFilters(site, department), commandTimeout: 30)
                    .ConfigureAwait(false);
                return rows.ToList();
            }
        }

        /// <summary>
        /// Latest record per monitored volume on each server.
        /// Do not filter status, since sample disk/AlwaysOn records have blank status.
        /// </summary>
        public async Task<List<DiskSpaceStatusRow>> GetDiskSpaceAsync(
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
                var rows = await connection.QueryAsync<DiskSpaceStatusRow>(
                    sql, BuildFilters(site, department), commandTimeout: 30)
                    .ConfigureAwait(false);
                return rows.ToList();
            }
        }

        private static object BuildFilters(string site, string department)
        {
            // Empty strings are used as "no filter" (instead of SQL NULL)
            // to avoid indeterminate PostgreSQL parameter type errors.
            return new
            {
                Site = String.IsNullOrWhiteSpace(site) ? String.Empty : site.Trim(),
                Department = String.IsNullOrWhiteSpace(department) ? String.Empty : department.Trim()
            };
        }
    }

    public sealed class PgConnectionStatus
    {
        public string database { get; set; }
        public string db_user { get; set; }
        public string pg_version { get; set; }
        public long elapsed_ms { get; set; }
    }

    // Keep snake_case property names because FE index.js consumes this exact JSON.
    public sealed class AlwaysOnStatusRow
    {
        public string site { get; set; }
        public string department { get; set; }
        public string server_ip { get; set; }
        public string availability_group_name { get; set; }
        public string database_name { get; set; }
        public string replica_server_name { get; set; }
        public string replica_role { get; set; }
        public string connected_state { get; set; }
        public string synchronization_state { get; set; }
        public string health_level { get; set; }
        public string health_message { get; set; }
        public string status { get; set; }
        public string inputdatetime { get; set; }
        public long? log_send_queue_kb { get; set; }
        public long? redo_queue_kb { get; set; }
        public long? logsendrate_kb_persec { get; set; }
        public long? redorate_kb_persec { get; set; }
    }

    public sealed class LargeTableStatusRow
    {
        public string site { get; set; }
        public string department { get; set; }
        public string server_ip { get; set; }
        public string database_name { get; set; }
        public string table_name { get; set; }
        public long? table_rows { get; set; }
        public string warning_level { get; set; }
        public decimal? reserved_mb { get; set; }
        public decimal? reserved_gb { get; set; }
        public string status { get; set; }
        public string inputdatetime { get; set; }
    }

    public sealed class DiskSpaceStatusRow
    {
        public string site { get; set; }
        public string department { get; set; }
        public string server_ip { get; set; }
        public string server_name { get; set; }
        public string volume_point { get; set; }
        public string volume_name { get; set; }
        public string file_system_type { get; set; }
        public decimal? total_space_gb { get; set; }
        public decimal? used_space_gb { get; set; }
        public decimal? free_space_gb { get; set; }
        public decimal? free_space_percent { get; set; }
        public string health_level { get; set; }
        public string health_message { get; set; }
        public string status { get; set; }
        public string inputdatetime { get; set; }
    }
}
