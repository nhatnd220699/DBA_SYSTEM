using Npgsql;
using System.Data;

namespace Infrastructure.Database
{
    public class PostgreSqlConnectionFactory : IDbConnectionFactory
    {
        private readonly string _connectionString;

        public PostgreSqlConnectionFactory(
            string connectionString)
        {
            _connectionString = connectionString;
        }

        public IDbConnection CreateConnection()
        {
            return new NpgsqlConnection(_connectionString);
        }
    }
}
