using Domain;
using System.Threading.Tasks;

namespace Application.Features.User
{
    public interface IMemberRepository
    {
        Task<Member> GetMemberByIdAsync(string memberCode);
    }
}
