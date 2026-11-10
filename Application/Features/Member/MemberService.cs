using Domain;
using Domain.APIPortal;
using Domain.DPA;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
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
            //Member member = await _repo.GetMemberByIdAsync(memberCode);
            //if (member == null || member.Password != password)
            //{
            //    return null;
            //}
            //return member;


            try
            {
                //Check user login by APIPortal
                using (var client = new HttpClient())
                {
                    var request = new
                    {
                        BU = "QMH",
                        Station = "AIQuery",
                        Step = "Get_User_Login",
                        InputStr = JsonConvert.SerializeObject(new
                        {
                            UserID = memberCode,
                            Password = password
                        })
                    };

                    var content = new StringContent(
                        JsonConvert.SerializeObject(request), Encoding.UTF8, "application/json");

                    var response = await client.PostAsync("https://QMSAIPortal.quantacn.com/qmhapiportal/api/APIPortal/execute", content);

                    if (!response.IsSuccessStatusCode)
                    {
                        return null;
                    }

                    var json = await response.Content.ReadAsStringAsync();

                    var result = JsonConvert.DeserializeObject<ApiPortalResponse>(json);

                    if (result is null || !result.Success)
                    {
                        return null;
                    }

                    var members = JsonConvert.DeserializeObject<List<Member>>(result?.Data);

                    var member = members?.FirstOrDefault();

                    if (member is null)
                    {
                        return null;
                    }

                    return new Member
                    {
                        Id = member.Id,
                        Username = member.Username,
                        Fullname = member.Fullname,
                        Email = member.Email,
                        Department = member.Department,
                        Role = member.Role
                    };
                }
            }
            catch (HttpRequestException ex)
            {
                throw new Exception(
                    "Unable to connect to the authentication server. Please connect to the company network.",
                    ex);
            }
            catch (TaskCanceledException ex)
            {
                throw new Exception(
                    "The connection to the authentication service timed out. Please try again later.",
                    ex);
            }
            catch (WebException ex)
            {
                throw new Exception(
                    "Authentication service is unreachable. Please ensure you are connected to the corporate network.",
                    ex);
            }
        }
    }
}
