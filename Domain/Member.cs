namespace Domain
{
    public sealed class Member
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Fullname { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; }
        public string Department { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }
}
