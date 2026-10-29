using Infrastructure.Database;
using System;
using System.Data;

namespace Infrastructure.Repository
{
    public abstract class BaseRepository
    {
        protected readonly IDbConnectionFactory _factory;

        protected BaseRepository(
            IDbConnectionFactory factory)
        {
            _factory = factory ?? throw new ArgumentNullException(nameof(factory));
        }

        protected IDbConnection CreateConnection()
        {
            return _factory.CreateConnection();
        }
    }
}
