using POCApi.Dtos;

namespace POCApi.Interface
{
    public interface ISignalService
    {
        Task<List<string>> GetMachinesAsync();
        Task<List<string>> GetSignalsByMachineAsync(string machine);
        Task<List<SignalDataDto>> GetSignalDataAsync(
            string machine,
            string signal,
            DateTime from,
            DateTime to
        );

        Task<List<SignalAverageDto>> GetAverageByMachineAsync(string machine, int days);
    }
}
