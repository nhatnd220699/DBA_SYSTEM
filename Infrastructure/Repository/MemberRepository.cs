using Application.Features.User;
using Dapper;
using Domain;
using Infrastructure.Database;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Infrastructure.Repository
{
    public class MemberRepository : BaseRepository, IMemberRepository
    {
        public MemberRepository(IDbConnectionFactory factory) : base(factory) { }

        public DynamicParameters BuildParameters(
            params (string Name, object Value)[] items)
        {
            var parameters = new DynamicParameters();

            foreach (var (Name, Value) in items)
            {
                parameters.Add(Name, Value ?? "");
            }

            return parameters;
        }

        public async Task<Member> GetMemberByIdAsync(string memberCode)
        {
            const string sql = @"
                SELECT id, username, password, email, department, role, fullname
                FROM qmhpu6.dba_user_login
                where username = @MemberCode
                LIMIT 1";

            using (var connection = CreateConnection())
            {
                var rows = await connection.QueryAsync<Member>(
                    sql, BuildParameters(("MemberCode", memberCode)), commandTimeout: 30)
                    .ConfigureAwait(false);
                return rows.FirstOrDefault();
            }
        }
    }
}
