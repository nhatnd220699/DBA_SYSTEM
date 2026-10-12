using System.Data;
using System.Data.SqlClient;

namespace Infrastructure.Database
{
    public class SqlServerConnectionFactory : IDbConnectionFactory
    {
        private readonly string _connectionString;

        public SqlServerConnectionFactory(
            string connectionString)
        {
            _connectionString = connectionString;
        }

        public IDbConnection CreateConnection()
        {
            return new SqlConnection(_connectionString);
        }
    }
}
