namespace POCApi.Models
{
    public class MachineSignalcs
    {
        public int Id { get; set; }
        public string Machine { get; set; }
        public string Signal { get; set; }
        public double Value { get; set; }
        public string Unit { get; set; }
        public DateTime Timestamp { get; set; }
    }
}
