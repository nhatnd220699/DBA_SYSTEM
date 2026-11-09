using Domain;
using System.Threading.Tasks;

namespace Application.Features.User
{
    public class MemberService
    {
        private readonly IMemberRepository _repo;

        public MemberService(IMemberRepository repo)
        {
            _repo = repo;
        }

        public async Task<Member> GetMemberByIdAsync(string memberCode, string password)
        {
            Member member = await _repo.GetMemberByIdAsync(memberCode);
            if (member == null || member.Password != password)
            {
                return null;
            }
            return member;
        }
    }
}
