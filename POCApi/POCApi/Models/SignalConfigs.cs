using System.Text.Json.Serialization;

namespace POCApi.Models
{
    public class SignalConfigs
    {
        public string Id { get; set; }

        public string MachineId { get; set; }   // FK

        [JsonIgnore]
        public Machines Machine { get; set; }

        public string SignalName { get; set; }
        public int SlaveId { get; set; }
        public int RegisterAddress { get; set; }
        public string Unit { get; set; }
    }
}
