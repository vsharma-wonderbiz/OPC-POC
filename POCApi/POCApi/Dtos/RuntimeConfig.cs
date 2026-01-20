namespace POCApi.Dtos
{
    public class RuntimeConfig
    {
        public Dictionary<string,MachineRuntimeConfig> Machines { get; set; }   
    }

    public class MachineRuntimeConfig
    {
        public Dictionary<string,SignalRuntimeConfig> Machines { get; set; }
    }

    public class SignalRuntimeConfig()
    {
        public int slave_id { get; set; }
        public int register {  get; set; }
        public string unit { get; set; }
    }
}
