namespace Domain
{
    public sealed class AlwaysOn
    {
        public string site { get; set; }
        public string department { get; set; }
        public string server_ip { get; set; }
        public string availability_group_name { get; set; }
        public string database_name { get; set; }
        public string replica_server_name { get; set; }
        public string replica_role { get; set; }
        public string connected_state { get; set; }
        public string synchronization_state { get; set; }
        public string health_level { get; set; }
        public string health_message { get; set; }
        public string status { get; set; }
        public string inputdatetime { get; set; }
        public long? log_send_queue_kb { get; set; }
        public long? redo_queue_kb { get; set; }
        public long? logsendrate_kb_persec { get; set; }
        public long? redorate_kb_persec { get; set; }
    }
}
