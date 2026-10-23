using Application.Feature.Dashboard;
using Infrastructure.Database;
using Infrastructure.Repository;
using System.Configuration;


namespace Web.Factories
{
    public static class ServiceFactory
    {
        private static readonly string ConnectionString;

        static ServiceFactory()
        {
            const string connectionName = "DbaPostgres";

            ConnectionString =
                ConfigurationManager
                    .ConnectionStrings[connectionName]
                    ?.ConnectionString;

            if (string.IsNullOrWhiteSpace(ConnectionString))
            {
                throw new ConfigurationErrorsException(
                    $"Connection string {connectionName} not found.");
            }
        }

        private static PostgreSqlConnectionFactory CreateConnectionFactory()
        {
            return new PostgreSqlConnectionFactory(ConnectionString);
        }

        public static DashboardService CreateDashboardService()
        {
            return new DashboardService(
                new DashboardRepository(
                    CreateConnectionFactory()));
        }
    }
}