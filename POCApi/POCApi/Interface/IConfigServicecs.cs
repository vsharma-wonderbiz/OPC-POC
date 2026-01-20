using POCApi.Dtos;

namespace POCApi.Interface
{
    public interface IConfigServicecs
    {
        Task AddConfigOnMachine(SignalConfigDto dto);
        Task<Dictionary<string, object>> BuildOpcRuntimeConfig();
    }
}
