using System.Data;

namespace Infrastructure.Database
{
    public interface IDbConnectionFactory
    {
        IDbConnection CreateConnection();
    }
}
