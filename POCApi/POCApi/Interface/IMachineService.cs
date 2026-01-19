using POCApi.Models;

namespace POCApi.Interface
{
    public interface IMachineService
    {
        Task<List<Machines>> GetAllMachines();
        Task AddMachine(string machineName);
    }
}
    